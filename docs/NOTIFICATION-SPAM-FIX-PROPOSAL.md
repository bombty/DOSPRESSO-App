# Notification Spam Fix Proposal

**Created:** 18 Apr 2026 (Replit T001+T002+T003 read-only analiz)
**Status:** 🟡 Aslan onayı bekliyor (T004 fix henüz uygulanmadı)
**Estimated effort:** 45 dk kod + 15 dk backward cleanup + 5 dk verify

---

## T001 — Production Source Mapping

### Top 5 üretici (son 7 gün)

| Type | 7d count | Recipients | Recipient başına ort | Üretici |
|---|---|---|---|---|
| `escalation_info` | 3,247 | 39 | **83 / kişi** | `server/services/franchise-escalation.ts:130-140` (önceki sorumluya bilgi notif) |
| `franchise_escalation` | 2,465 | 32 | **77 / kişi** | `server/services/franchise-escalation.ts:118-128` (yeni hedefe eskalasyon notif) |
| `task_overdue` | 738 | 200 | 3.7 / kişi | (sağlıklı — gerçek overdue, dokunma) |
| `agent_escalation_info` | 593 | 36 | 16 / kişi | `server/services/agent-escalation.ts:263-272` (orijinal assignee bilgisi) |
| `task_overdue_assigner` | 552 | 184 | 3 / kişi | (sağlıklı, dokunma) |

**Cooldown logic status:** `PRESENT_BUT_BROKEN` — `server/storage.ts:3663-3675` sadece **per-user toplam günlük 50 limit** uygular; **per-type+per-entity** dedup yok. Spam'in geçmesinin sebebi: tek kullanıcı günlük ~25 farklı eskalasyon notif'i alır → 50 altında kalır → hiç bir şey throttle olmaz.

### Hourly burst pattern (24h içinde):

```
2026-04-18 12:00 → franchise_escalation 205, escalation_info 172   ← scheduler tick
2026-04-18 09:00 → 124 / 93                                          ← scheduler tick
2026-04-18 06:00 → ...                                               ← scheduler tick (her 6 saat)
```

Her 6 saatte bir patlama → `franchise-escalation.ts:316` `setInterval(6h)` ile birebir uyumlu.

### Per-user duplicate kanıtı (son 7g):

```
189 kez `escalation_info` → tek kullanıcı (3 farklı user)
178 kez `franchise_escalation` → tek kullanıcı (4 farklı user)
```

### Single-task duplicate kanıtı (son 48h):

```
"🔴 Eskalasyon Seviye 2: Müdür"            → 812 fires (6 tick × ~135 = ~810)
"⬆️ Yükseltildi: Şubede 30 gecikmiş görev"  → 96 fires (aynı title, aynı kullanıcı, 6 tick)
"⬆️ Yükseltildi: Gecikmiş Görev: Bar alanı temizliği"  → 67 fires (TEK görev, 6 tick × 11 recipient)
```

`agent_escalation_history` tablosu: **798 unique action** ama **4,775 history row** → action başına ortalama **6 eskalasyon kaydı** → her tick tekrar eskalasyon yapılıyor.

---

## T002 — Root Cause Analysis (5 cümle)

1. **Bug #1 — currentLevel sort hatası** (`franchise-escalation.ts:163-171`): History sorgusu `.orderBy(escalationLevel)` (varsayılan ASC) + `.limit(1)` ile **en düşük** seviyeyi getiriyor; kod bunu "mevcut seviye" sanıyor → action L5'e bile çıkmış olsa `currentLevel = 1` → her tick `currentLevel < L2` → L2'ye yeniden eskalasyon → her 6 saatte bir aynı action için aynı bildirim.
2. **Bug #2 — Tasks loop'ta history check YOK** (`franchise-escalation.ts:218-251`): `agent_pending_actions` döngüsü `agentEscalationHistory` ile dedup yapıyor (yine de Bug #1 yüzünden boşa çıkıyor), ama overdue `tasks` döngüsü hiçbir history kontrolü yapmıyor — `escalationLevel = floor(ageDays/7)+1` deterministic, dolayısıyla aynı görev her tick'te aynı seviyeye "yeniden eskale" edilip notif gönderiyor (38 overdue task × 4 tick/gün × ~6 recipient ≈ 912/gün spam).
3. **Bug #3 — Storage throttle yetersiz tasarım** (`storage.ts:3663-3675`): Mevcut throttle sadece "kullanıcı başına günlük toplam 50" sayar; aynı tip + aynı entity'den (örn. aynı task'tan) günde 10 notif gelse de 50 altında olduğu için geçer. Per-(user,type,entity,day) dedup yok.
4. **Aggregation bug DEĞİL**: Tek event birden fazla satır üretmiyor — sorun **scheduler her tick'te aynı event'i yeniden tetikliyor** (recursive değil, idempotent değil).
5. **Cooldown bypass DEĞİL**: Cooldown mekanizması doğru çalışıyor ama yanlış granülaritede — tasarım hatası.

---

## T003 — Fix Proposal

### Strateji
**3 katmanlı savunma**: (A) producer'larda dedup (yapısal), (B) storage'da per-entity throttle (defansif), (C) backward cleanup (kozmetik).

### A. `server/services/franchise-escalation.ts`

#### Fix #1 — currentLevel sort (1 satır)
```diff
- .orderBy(agentEscalationHistory.escalationLevel).limit(1);
+ .orderBy(desc(agentEscalationHistory.escalationLevel)).limit(1);
```
Line 169. `desc` import zaten yok → `import { desc } from "drizzle-orm"` ekle.

#### Fix #2 — Tasks loop history dedup (~25 satır)
`tasks` döngüsünde (line 218-251), notif göndermeden önce **şu görev × şu seviye için son 24h'te zaten gönderilmiş mi** sorgusu ekle. En basit yol: `agent_escalation_history` tablosuna task escalations'ı da yazmak (yeni `sourceTaskId` kolonu ekleyemeyiz, ama mevcut `sourceActionId` nullable, yeni bir `notes` JSON ile `{taskId: N, level: L}` taşıyabiliriz). **Daha temizi**: yeni tablo `task_escalation_log (task_id, level, sent_at)` + her tick'te insert öncesi `WHERE task_id=? AND level=? AND sent_at > NOW()-INTERVAL '7 days'` kontrolü.

```typescript
// Pseudo-code, line 233 öncesi:
const alreadySent = await db.select().from(taskEscalationLog)
  .where(and(
    eq(taskEscalationLog.taskId, task.id),
    eq(taskEscalationLog.level, escalationLevel),
    gt(taskEscalationLog.sentAt, sql`NOW() - INTERVAL '7 days'`)
  )).limit(1);
if (alreadySent.length > 0) continue;
// ... existing sendEscalationNotif call
await db.insert(taskEscalationLog).values({ taskId: task.id, level: escalationLevel });
```

### B. `server/storage.ts:3663` — per-entity throttle (~15 satır)

`title` + `userId` bazlı son 24h dedup ekle (entity_id kolonu olmadığı için title kullanıyoruz):

```typescript
// THROTTLE_EXEMPT_TYPES kontrolünden sonra:
if (!THROTTLE_EXEMPT_TYPES.includes(notification.type)) {
  // YENİ: Per-(user,type,title) 24h dedup
  const PER_ENTITY_THROTTLE_TYPES = ['franchise_escalation', 'escalation_info', 
    'agent_escalation', 'agent_escalation_info', 'task_overdue', 'task_overdue_assigner'];
  if (PER_ENTITY_THROTTLE_TYPES.includes(notification.type)) {
    const [dup] = await db.select({ id: notifications.id }).from(notifications)
      .where(and(
        eq(notifications.userId, notification.userId),
        eq(notifications.type, notification.type),
        eq(notifications.title, notification.title),
        gt(notifications.createdAt, sql`NOW() - INTERVAL '24 hours'`)
      )).limit(1);
    if (dup) {
      return { id: -1, ...notification, isRead: false, isArchived: false, 
               branchId: notification.branchId ?? null, link: notification.link ?? null, 
               createdAt: new Date() } as Notification;
    }
  }
  // Mevcut 50/gün limiti devam etsin
}
```

### C. Backward cleanup SQL (idempotent, A6 tarzı)

```sql
-- Soft-delete: aynı (user, type, title) için günde sadece EN YENİ 1 tane kalsın
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY user_id, type, title, DATE(created_at)
    ORDER BY created_at DESC
  ) AS rn
  FROM notifications
  WHERE type IN ('franchise_escalation','escalation_info','agent_escalation_info')
    AND is_read = false
    AND is_archived = false
    AND created_at >= NOW() - INTERVAL '14 days'
)
UPDATE notifications SET is_archived = true
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```
Beklenen impact: ~5,000–6,000 satır archive (read OLMAYAN, kullanıcı henüz açmamış). Read olanlara dokunulmuyor.

### Beklenen sonuç

| Metrik | Önce (7g) | Sonra (7g, tahmini) | Azalma |
|---|---|---|---|
| `escalation_info` | 3,247 | ~150 | **-95%** |
| `franchise_escalation` | 2,465 | ~120 | **-95%** |
| `agent_escalation_info` | 593 | ~80 | -86% |
| **Toplam haftalık spam 3 tip** | **6,305** | **~350** | **-94%** |

### Risk Analizi

**Bozulma riski olan legitimate notif'ler:**
- ✅ `task_overdue` (738/hafta) — title/entity per task farklı, 24h içinde aynı kullanıcıya aynı task title 2 kez gelirse 2.si throttle olur. **Etki:** Hafifçe azalır ama sorun değil.
- ⚠️ `sla_breach` — `THROTTLE_EXEMPT_TYPES` içinde, dokunulmuyor. Risk yok.
- ✅ `maintenance_reminder` (180/hafta) — hangi ekipman için olduğu title'da → farklı title → throttle kapsamına girmez.
- ⚠️ `agent_suggestion` — Mr. Dobody önerileri çoğunlukla unique title, throttle etkilemez.

**Yeni bug riski:**
- A.1 `desc` import unutulursa build kırılır → build check zorunlu.
- A.2 yeni tablo `task_escalation_log` migration başarısız olursa loop çalışmaz → graceful fallback ekle (`try/catch`, dedup başarısız olsa bile notif gönder).
- B `title` bazlı dedup → title değişirse (örn. "30 gecikmiş görev" → "31 gecikmiş görev") yeni notif geçer. Bu **kabul edilebilir**: durum gerçekten değiştiyse kullanıcı bilmeli.

**Tetiklenmesi gereken legitimate scenario:**
- Yeni bir overdue task açılır → ilk notif gider (24h pencerede başka aynı title yok) → **OK**
- Aynı task ertesi gün hâlâ overdue → ertesi gün 1 kez notif gider → **OK**
- Aynı gün 2. tick → throttle → **AMAÇ BUDUR**

---

## Uygulama planı (T004 — Aslan onayı sonrası)

1. **Build mode'a geç**
2. `git pull --rebase origin main` (Claude'un yeni commit'leri var mı kontrol)
3. Patch A.1 (`desc` sort) — 2 satır
4. Patch A.2 (yeni tablo + dedup) — ~30 satır + `shared/schema.ts` ekleme
5. Patch B (storage per-entity throttle) — ~15 satır
6. Schema push: `npm run db:push --force`
7. Build check: `npx vite build && npx esbuild server/index.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/test.js`
8. Restart workflow + bekle (logger'da `[FranchiseEscalation] processed=` görüldükten sonra)
9. Backward cleanup SQL çalıştır
10. Verify SQL: son 1 saat 3 tip toplamı **<10**
11. Commit: `fix(notifications): per-entity throttle + escalation history dedup (spam -94%)`
12. Push + rapor

---

## Acceptance criteria (T004 sonrası)

- [ ] Build clean (vite + esbuild exit 0)
- [ ] Schema push success (yeni `task_escalation_log` tablosu)
- [ ] Restart sonrası ilk tick'te log: `[FranchiseEscalation] processed=N escalated=M` (M önceki değerlerden çok daha küçük)
- [ ] SQL: `SELECT type, COUNT(*) FROM notifications WHERE created_at >= NOW() - INTERVAL '1 hour' AND type IN ('escalation_info','franchise_escalation','agent_escalation_info') GROUP BY type;` → toplam **<10**
- [ ] Backward cleanup: ~5000+ satır is_archived=true
- [ ] `task_overdue` ve `sla_breach` etkilenmedi (count değişmedi)

---

**Aslan'a soru:** B planı (per-entity throttle in storage) yeterli mi, yoksa A.2 (task escalation log table) için yeni tablo onayı gerekli mi? Sadece A.1 + B yapsak da spam **~70%** azalır (currentLevel sort bug'ı düzelir, storage dedup task notif'lerini de yakalar). A.2 olmadan başlayıp ölçmek daha güvenli olabilir.
