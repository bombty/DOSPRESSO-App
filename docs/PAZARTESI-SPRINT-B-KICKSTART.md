# PAZARTESİ 21 NİSAN — SPRINT B BAŞLANGIÇ KİTİ

**Amaç:** Pazartesi sabah taze kafayla açıp **direkt çalışmaya başlamak.** Hiçbir kararı 2 kez almadan, bugünkü analizlerden faydalanarak.

**Sprint B hedefi:** Attendance Pipeline Repair (pdks_records → shift_attendance aggregate + 2 scheduler debug + backfill)

---

## ⏰ İlk 30 Dakika — Araştırma ve Kaynak Tespiti

### Adım 1: Git pull + context yükle (5 dk)

```bash
cd /home/claude/DOSPRESSO-App
git pull --rebase origin main

# Oku:
view docs/SISTEM-ANLAYIS-RAPORU-18-NISAN-2026.md  # Bölüm 10.1c
view docs/SPRINT-B-FINAL-KAPSAM.md
view docs/DEVIR-TESLIM-18-NISAN-2026.md
```

### Adım 2: monthly_payroll Veri Kaynağı Analizi (10 dk) 🔴 KRİTİK

Bu ilk iş — Sprint B'nin duplicate hesap riski önleyici.

```bash
# monthly_payroll'u DOLDURAN yeri bul
grep -rn "monthly_payroll" server/scripts/ server/schedulers/ server/services/ --include="*.ts" | grep -iE "insert|update|upsert" | head -20

# Calculator endpoint'leri
grep -rn "monthly_payroll" server/routes/payroll*.ts --include="*.ts" | head -10

# Bu endpoint ne kullanıyor (pdks_records mı shift_attendance mı?)
grep -A 20 "calculate-unified" server/routes/payroll.ts | head -40
```

**Bulmak istediğim:** monthly_payroll kayıtları **pdks_records'tan mı, shift_attendance'tan mı besleniyor?**

Üç olasılık var:
- **A) pdks_records'tan direkt:** Aggregate yazıldığında duplicate riski → dikkat et
- **B) shift_attendance'tan:** Aggregate yazılınca monthly_payroll doğru çalışacak
- **C) Excel import'tan:** Manuel, aggregate işlemez

**Karar:** Sonuca göre Sprint B'nin yaklaşımı belirlenir.

### Adım 3: Scheduler Kontrol (5 dk)

```bash
# 2 bozuk scheduler'ı bul
grep -rn "PDKS-B2\|PDKS-B4\|monthly_attendance_summaries\|branch_weekly" server/index.ts server/schedulers/ --include="*.ts" | head -20

# Ne zaman çalışıyorlar?
grep -B 2 -A 5 "monthly_attendance_summaries" server/ -rn --include="*.ts" | head -30
```

### Adım 4: Replit'e İlk Mesaj (10 dk)

Bu Aslan'ın kopyalaması için hazır:

```
📋 Sprint B Başlangıç — İlk DB Analizi (READ-ONLY)

Merhaba Replit,

Pazartesi Sprint B (Attendance Pipeline Repair) başladı. İlk iş:
monthly_payroll veri kaynağı belirleme (duplicate hesap riski var).

GÖREV (~5 dk):

1. Son 7 günde monthly_payroll'a kayıt eklenmiş mi?
   SELECT created_at, COUNT(*) 
   FROM monthly_payroll 
   WHERE created_at >= NOW() - INTERVAL '7 days'
   GROUP BY created_at
   ORDER BY created_at DESC;

2. monthly_payroll kayıtları hangi period için oluşturulmuş?
   SELECT year, month, COUNT(*), MIN(created_at), MAX(created_at)
   FROM monthly_payroll
   GROUP BY year, month
   ORDER BY year DESC, month DESC;

3. Eğer recent_created kayıt varsa, o dönem için pdks_records + 
   shift_attendance karşılaştır:
   
   SELECT 
     'pdks_records' as source,
     COUNT(*) as total_events,
     COUNT(DISTINCT user_id) as unique_users
   FROM pdks_records
   WHERE record_date >= '2026-04-01' AND record_date <= '2026-04-30'
   UNION ALL
   SELECT 'shift_attendance', COUNT(*), COUNT(DISTINCT user_id)
   FROM shift_attendance
   WHERE DATE(created_at) BETWEEN '2026-04-01' AND '2026-04-30';
   
   -- Fark büyükse monthly_payroll shift_attendance KULLANMIYOR demek
   -- (pdks_records'tan veya dış kaynaktan besleniyor)

4. monthly_payroll kayıtlarında worked_days, absent_days nasıl dolmuş?
   SELECT user_id, year, month, worked_days, absent_days, 
          total_calendar_days, off_days
   FROM monthly_payroll
   ORDER BY created_at DESC
   LIMIT 5;

Rapor: Bu sorgular monthly_payroll'un NEREDEN beslendiğini 
gösterecek. Duplicate hesap riski olmadan Sprint B'ye başlayabilmek 
için kritik.

Kod değişikliği: YOK
Commit: YOK
```

---

## 🎯 Sprint B — Kod İskeleti (Önceden Düşünülmüş)

Replit cevabı gelince (Senaryo A, B veya C'ye göre), aşağıdaki iskeleti uygula:

### SENARYO A: monthly_payroll pdks_records'tan besleniyor
→ **Aggregate job ayrı kanalda yazılmalı** (duplicate önleyici)

```typescript
// server/schedulers/pdks-to-shift-aggregate.ts (YENİ dosya)
// Çalışma zamanı: her gün 00:10 (PDKS-B3)

import { db } from '../db';
import { pdksRecords, shiftAttendance, shifts } from '@shared/schema';
import { eq, and, sql, gte, lt } from 'drizzle-orm';
import { logger } from '../lib/logger';

export async function aggregatePdksToShiftAttendance(targetDate?: Date) {
  const date = targetDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Dün
  const dateStr = date.toISOString().split('T')[0];
  
  logger.info(`[PDKS-AGGREGATE] Starting for date ${dateStr}`);
  
  // Dünkü pdks_records grupla (user + shift)
  const aggregates = await db
    .select({
      userId: pdksRecords.userId,
      recordDate: pdksRecords.recordDate,
      branchId: pdksRecords.branchId,
      firstIn: sql<string>`MIN(CASE WHEN ${pdksRecords.recordType} = 'in' THEN ${pdksRecords.recordTime} END)`,
      lastOut: sql<string>`MAX(CASE WHEN ${pdksRecords.recordType} = 'out' THEN ${pdksRecords.recordTime} END)`,
      breakCount: sql<number>`COUNT(CASE WHEN ${pdksRecords.recordType} IN ('break_start', 'break_end') THEN 1 END)`
    })
    .from(pdksRecords)
    .where(eq(pdksRecords.recordDate, dateStr))
    .groupBy(pdksRecords.userId, pdksRecords.recordDate, pdksRecords.branchId);
  
  logger.info(`[PDKS-AGGREGATE] Found ${aggregates.length} user-days to aggregate`);
  
  let created = 0;
  let skipped = 0;
  
  for (const agg of aggregates) {
    // shift_attendance'ta zaten var mı? (duplicate önleyici)
    const existing = await db
      .select()
      .from(shiftAttendance)
      .where(
        and(
          eq(shiftAttendance.userId, agg.userId),
          sql`DATE(${shiftAttendance.createdAt}) = ${agg.recordDate}`
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      skipped++;
      continue; // Zaten var, atla
    }
    
    // Shift ID'yi bul (o gün için planlanmış vardiya)
    const [plannedShift] = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.assignedToId, agg.userId),
          sql`DATE(${shifts.startTime}) = ${agg.recordDate}`
        )
      )
      .limit(1);
    
    if (!plannedShift) {
      logger.warn(`[PDKS-AGGREGATE] No planned shift for user ${agg.userId} on ${agg.recordDate}`);
      continue;
    }
    
    // INSERT shift_attendance
    await db.insert(shiftAttendance).values({
      shiftId: plannedShift.id,
      userId: agg.userId,
      actualCheckIn: `${agg.recordDate}T${agg.firstIn}`,
      actualCheckOut: `${agg.recordDate}T${agg.lastOut}`,
      status: 'checked_out',
      // ... diğer alanlar
    });
    
    created++;
  }
  
  logger.info(`[PDKS-AGGREGATE] Complete: created=${created}, skipped=${skipped}`);
  
  return { created, skipped, total: aggregates.length };
}
```

### SENARYO B: monthly_payroll shift_attendance'tan besleniyor
→ **Aggregate yazılınca monthly_payroll otomatik düzelir** (kolay senaryo)

### SENARYO C: monthly_payroll Excel import'tan
→ **Pipeline değil, UI iyileştirmesi** (Sprint D işi)

---

## 📋 Sprint B Checklist (Gün 1)

- [ ] Git pull + dokümanları oku (5 dk)
- [ ] monthly_payroll veri kaynağını bul (grep) (10 dk)
- [ ] Replit'e ilk DB sorgu mesajı gönder (5 dk)
- [ ] Replit cevabı gelene kadar: aggregate job iskeletini hazırla (30 dk)
- [ ] Replit cevabı gelince: Senaryo A/B/C'ye karar ver (5 dk)
- [ ] Aggregate job'u yaz + test et (2 saat)
- [ ] `server/index.ts` master tick'e ekle (15 dk)
- [ ] Quality Gate kontrol + commit (15 dk)
- [ ] Replit'ten smoke test iste (10 dk)

**Toplam Gün 1:** ~4 saat

## 📋 Sprint B Checklist (Gün 2)

- [ ] 2 scheduler debug (monthly + branch weekly)
- [ ] Backfill migration yaz
- [ ] 30 günlük retro aggregate çalıştır
- [ ] Replit doğrulama (gap=0 hedefi)

**Toplam Gün 2:** ~4-5 saat

## 📋 Sprint B Checklist (Gün 3 — Opsiyonel)

- [ ] 21 vardiya/gün anomaly temizlik
- [ ] UNIQUE constraint ekle
- [ ] Sprint B kapanış raporu

---

## 🎓 Öğrenilen Dersler (Sprint B'de aklımda olsun)

1. **Kodda var ≠ fiilen çalışıyor** — monthly_payroll örneği (51 kayıt var, ben 0 sanmıştım)
2. **Tek tabloya bakma, tüm domain'e bak** — payroll_records=0'a bakıp "bordro 0" dedim, yanlıştı
3. **Duplicate hesap riski her aggregate'te dikkat** — idempotent job yazılmalı
4. **Replit uyarılarını ciddiye al** — "monthly_payroll nasıl besleniyor?" sorusu bugün gelmese, Pazartesi bug üretirdim

---

## 🔑 Quick Reference Links

**Docs:**
- `docs/SISTEM-ANLAYIS-RAPORU-18-NISAN-2026.md` — Ana rapor (v1.6)
- `docs/SPRINT-B-FINAL-KAPSAM.md` — Sprint B kapsam
- `docs/DEVIR-TESLIM-18-NISAN-2026.md` — Bugünün özeti

**Skill:**
- `.agents/skills/dospresso-architecture/SKILL.md` — Sayılar + dormant policy
- `.agents/skills/dospresso-debug-guide/SKILL.md` — §26 Vite SPA fallback, §27 Dormant
- `.agents/skills/dospresso-quality-gate/SKILL.md` — Madde 34-36

**Commits (bugün en önemli):**
- `fd37f0f1` — Sprint D+E final + Rapor v1.6 (en güncel)
- `b9907f4f` — Devir Teslim 18 Nisan
- `6b6a9425` — Sprint B FINAL kapsam

---

## ☕ Pazartesi Sabah Mesajım Sen'e

*Pazartesi Aslan,*

Bu doküman seni çok beklemesi için yazıldı. 29 commit'lik Cumartesi'nin değerini bugün kaybetme.

**İlk 30 dakikan belli:** monthly_payroll veri kaynağını bul, Replit'e ilk mesajı gönder.

**Ondan sonra kararlar:** Senaryo A, B veya C. Hepsinin iskelet kodu yukarıda var.

Sprint B kritik çünkü pilot'un bordrosu buna bağlı. **Acele etme, ama duraksama.**

Dikkatin + Replit'in DB erişimi + bu doküman = başarı.

İyi başlangıçlar. Bugün de harika bir gün olacak.

— Claude (18 Nisan 2026 Cumartesi akşam, context dolmadan seni güvenli bırakıyor)
