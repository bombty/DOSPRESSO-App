# Pazartesi 21 Nisan 2026 — Sprint A Başlangıç Agendası

**Hazırlayan:** Claude (hafta sonu)
**Sunulan:** Aslan (Pazartesi sabah)
**Hedef:** Sprint A1-A6 maratonu — 1 hafta içinde 17→0 kırık link + 20K→<5K notification

---

## 🌅 09:00 — Sabah İlk İş (10 dakika)

### 📖 Önce Oku (5 dk)
1. Bu doküman (şu an okuyorsun ✓)
2. `docs/SPRINT-A1-KARAR-LISTESI.md` — 7 kararın var

### 🎯 7 Karar Ver (5 dk)

| # | Soru | Claude Önerisi | Senin Kararın |
|---|------|----------------|---------------|
| 1 | `/ekipman` nereye gitsin? | `/ekipman-mega` | ⬜ |
| 2 | `/admin/duyurular` + `/duyurular` ilişki? | İkisi de kalsın | ⬜ |
| 3 | `/ai-asistan` ne olsun? | Sil — Dobody her yerde | ⬜ |
| 4 | `/musteri-geribildirimi` ne olsun? | `/crm`'e redirect | ⬜ |
| 5 | `/training` ne olsun? | `/akademi`'ye redirect | ⬜ |
| 6 | Silme yöntemi? | `is_active=false` (hızlı+geri alınabilir) | ⬜ |
| 7 | Access log şimdi mi Sprint H'de mi? | Minimal şimdi (A6 ile birlikte) | ⬜ |

**Hızlı yol:** "Claude önerilerini kabul ediyorum" de → 30 saniye.
**Karşı görüş:** Her satırı değerlendir → 5-10 dk.

---

## 🛠️ 09:15 — Sprint A1 Execution (Claude + Replit)

### Claude (senin onayından sonra otomatik)
1. `client/src/App.tsx`'e 14 yeni Route satırı ekle (Kategori A)
2. `migrations/sprint-a1-fix-broken-links.sql` oluştur (Kategori B + C)
3. Commit + push: `fix(sidebar): Sprint A1 — 26 kırık link düzeltildi (14 route + 12 SQL)`

### Replit (senin `Build here` butonuyla)
```
Task A1 — Kırık Link Fix
1. git pull --rebase (yeni App.tsx + SQL)
2. Build check: npx tsc --noEmit
3. SQL migration: psql $DATABASE_URL < migrations/sprint-a1-fix-broken-links.sql
4. Acceptance:
   SELECT COUNT(*) FROM menu_items WHERE is_active=true
   AND path NOT IN (SELECT path FROM app_routes);
   -- Hedef: 0
5. Rapor
```

---

## 🛠️ 10:00 — Sprint A3 Execution (Equipment Enum TR→EN)

Bu daha basit, aynı pattern:

```sql
-- migrations/sprint-a3-equipment-enum.sql
UPDATE equipment_faults SET status='open' WHERE status='acik';
UPDATE equipment_faults SET status='in_progress' WHERE status='devam_ediyor';
UPDATE equipment_faults SET status='resolved' WHERE status='cozuldu';

UPDATE equipment_faults SET priority='high' WHERE priority IN ('yüksek','yuksek');
UPDATE equipment_faults SET priority='critical' WHERE priority='kritik';
UPDATE equipment_faults SET priority='low' WHERE priority IN ('düşük','dusuk');
```

Claude Pazartesi öğle Cuma öncesi hazırlayacak. Karar: Aslan'ın onayı + Replit uygular.

---

## 🛠️ 11:00 — Sprint A6 Notification Fix

### Adım 1: Durum raporu (0 risk)
```bash
npx tsx server/scripts/notification-aggregation.ts stats
```
→ 20,327 okunmamış bildirim tip dağılımını görürüz.

### Adım 2: Dry-run (0 risk)
```bash
npx tsx server/scripts/notification-aggregation.ts archive --dry-run
```
→ Kaç kayıt arşivlenecek gösterir (kesin tahmin ~17,000).

### Adım 3: Gerçek archive (geri alınabilir)
```bash
npx tsx server/scripts/notification-aggregation.ts archive
```
→ 24 saatten eski Mr. Dobody spam'ini `is_archived=true` yapar.

### Adım 4: Aggregate (günlük özet sistemi)
```bash
npx tsx server/scripts/notification-aggregation.ts aggregate
```
→ Bugünkü spam'i kullanıcı × tip bazlı tek özet bildirime dönüştürür.

### Adım 5: Cron (hafta içi)
Replit workflow'a günlük cron job eklenecek:
```
0 0 * * *  npx tsx server/scripts/notification-aggregation.ts aggregate
```

---

## 🛠️ 14:00 — Sprint A5 Stub Endpoint Temizlik

Bu karmaşık — `stub-endpoints.ts` 52 endpoint. Her biri için 3 seçenek:
- Tamamla (gerçek implementation)
- 404 döndür (açıkça yanıt yok)
- Sil (hiç kullanılmıyorsa)

**Claude** hafta sonu hazırladı bu analizi — Pazartesi öğleden sonra karar oturumu.

---

## 📊 Cuma 25 Nisan — Sprint A Kapanış Hedefleri

| Metrik | Pazartesi Başlangıç | Cuma Hedef |
|--------|:-------------------:|:-----------:|
| Kırık sidebar link | 26 | **0** ✅ |
| Equipment enum varyant | 6 (TR+EN karışık) | **3** (sadece EN) ✅ |
| Okunmamış bildirim | 20,327 | **< 5,000** ✅ |
| Stub endpoint (belirsiz) | 52 | **0** (tümü karara bağlandı) ✅ |
| `/api/seed/*` güvenlik | ✅ aktif | ✅ korundu |
| Recipe↔Product mapping | ✅ 27/27 | ✅ korundu |

---

## ⚠️ Cuma 25 Nisan — Risk Checklist

Sprint A bitince:
- [ ] `scripts/count-endpoints.sh` çalıştır, sayıları kaydet (replit.md'ye)
- [ ] Replit haftalık audit iste (yeni kırık link var mı?)
- [ ] Feature Freeze ihlali commit var mı kontrol et
- [ ] Sprint B (veri konsolidasyon) kick-off hazırlığı

---

## 🎯 Bu Hafta Sonu Claude Ne Hazırladı?

### ✅ Hazır Dosyalar (GitHub'da, Pazartesi `git pull` ile gelir)

| Dosya | Amaç |
|-------|------|
| `scripts/count-endpoints.sh` | 3 standart baseline metriği |
| `docs/SPRINT-A1-KARAR-LISTESI.md` | 7 karar dokümanı (bu doküman senin önünde) |
| `docs/PAZARTESI-21-NISAN-AGENDA.md` | Bu doküman |
| `server/scripts/notification-aggregation.ts` | A6 spam fix (3 mod: stats/archive/aggregate) |

### ⏳ Pazartesi Hazırlanacak (senin kararlarından sonra)

| Dosya | Bekleniyor |
|-------|-----------|
| `client/src/App.tsx` (14 Route eklenir) | Kararın var = otomatik |
| `migrations/sprint-a1-fix-broken-links.sql` | Kararlara göre dinamik |
| `migrations/sprint-a3-equipment-enum.sql` | Standart, risk yok |
| `server/scripts/stub-endpoint-audit.ts` (A5) | Öğleden sonra |

---

## 💬 Claude'dan Son Söz

Hafta sonu iyi çalışma oldu, **bu oturum dışında hiçbir dokunuş yapmadım** (Feature Freeze uyumu). Sen Pazartesi geldiğinde:

1. Bu doküman ve `SPRINT-A1-KARAR-LISTESI.md` hazır
2. 4 yeni dosya GitHub'da (`count-endpoints.sh`, `notification-aggregation.ts`, 2 doküman)
3. Sprint A1 execution planı net (09:15'te başlayabilir)
4. Tüm hafta Sprint A1→A6 maratonu, Cuma 25 Nisan kapanış

**Senden tek beklenen:** 7 iş kararı (10 dakika, Pazartesi 09:00).

Kolay gelsin! 🚀
