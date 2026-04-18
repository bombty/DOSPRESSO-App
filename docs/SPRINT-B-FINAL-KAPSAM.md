# Sprint B — Attendance Pipeline Repair (FINAL KAPSAM)

**Tarih:** 18 Nisan 2026 (Cumartesi — Replit DB doğrulaması sonrası)
**Replit raporu:** 18 Nisan 2026 commit `1d3e4acf6` pull sonrası
**Durum:** Kapsam netleşti, Pazartesi 21 Nisan başlayacak

---

## 🔄 Önceki Plan vs Yeni Plan

### ❌ Önceki Hedef (RESMİ OLARAK YANLIŞ)
> "3 izin tablosu → 1, 2 onboarding → 1, 3 puantaj → 1 konsolidasyon"

### ✅ Yeni Hedef (Kod + DB Doğrulaması Sonrası)
> "PDKS → Shift Attendance Aggregate Pipeline Onarımı + 2 Scheduler Debug"

**Sebep:** Kod analizi "konsolidasyona gerek yok, tasarım zaten temiz" dedi. DB analizi "ama aggregate pipeline bozuk, scheduler'lar çalışmıyor" dedi. İkisinin birleşimi gerçek Sprint B'yi oluşturdu.

---

## 🔴 Kritik Bulgu: Attendance Pipeline Bozuk

### Durum (Replit DB Doğrulaması — 18 Nis 2026)

| Tablo | Kayıt | Beklenen | Durum |
|-------|:--:|:--:|:--:|
| `pdks_records` | 1,282 | Ham event log — aktif ✅ | Çalışıyor |
| `shift_attendance` | 175 | Aggregate — ~1,282 yakın olmalı | 🔴 **GAP!** |
| `monthly_attendance_summaries` | 0 | Aylık özet | 🔴 Scheduler yok/bozuk |
| `branch_weekly_attendance_summary` | 0 | Haftalık özet | 🔴 PDKS-B2 logda var ama DB'ye yazmıyor |
| `factory_weekly_attendance_summary` | 7 | Fabrika haftalık | ✅ Çalışıyor |

### Son 7 Gün Gap Örneği

```
record_date   | users_in_pdks | users_in_shift_attendance | missing
2026-04-17    | 4             | 0                         | 4
2026-04-15    | 4             | 0                         | 4
```

**4 kullanıcı check-in yapmış ama hiçbiri vardiya tablosunda görünmüyor.**

### İş Etkisi

Bu pilot için **kritik** çünkü:
- Bordro `shift_attendance` üzerinden hesaplanıyor
- `pdks_records` → `shift_attendance` akmıyorsa, **maaşlar yanlış hesaplanır**
- Bordro endpoint'leri zaten 0 kayıt (`payroll_records`=0), bu akış düzelmeden bordro test edilemez

---

## 🎯 Sprint B Yeni Plan — "Attendance Pipeline Repair"

### Süre: 2-3 gün (Pazartesi-Çarşamba)

### B.1: PDKS → Shift Aggregate Job (1 gün)

**Kaynak:** `pdks_records` tablosu (her check-in bir satır)  
**Hedef:** `shift_attendance` tablosu (her vardiya bir özet satır)

**İş akışı:**
```
Her gün 00:10 (Türkiye saati) aggregate job çalışır:
1. Dünkü pdks_records'u al (user_id, shift_id gruplu)
2. Her (user, shift) için:
   - Giriş saati (record_type='in' MIN)
   - Çıkış saati (record_type='out' MAX)  
   - Mola toplamı (record_type='break_start'/'break_end' farkları)
   - Mesai süresi
3. shift_attendance'a INSERT veya UPDATE
4. Audit trail (yeni aggregate kayıt sayısı)
```

**Teknik yer:** `server/index.ts` master 10-min tick içine eklenir (03:00 composite score job gibi).

### B.2: Scheduler Debug — Monthly Summaries (0.5 gün)

`monthly_attendance_summaries` tablosu 0 kayıt. Scheduler kodunu incele:

1. Hangi dosyada? (`server/schedulers/` muhtemel)
2. Trigger nasıl? (cron? worker?)
3. Neden yazmıyor? (query hatası? permission? empty data?)
4. Log'da görünüyor mu? (silent fail olabilir)

### B.3: Scheduler Debug — Branch Weekly Summaries (0.5 gün)

Replit bulgusu: "PDKS-B2 scheduler logda görünüyor (Pazar 23:00) ama `branch_weekly_attendance_summary` tamamen boş."

Aynı pattern, log var ama DB'ye yazmıyor. Muhtemelen:
- Aggregate hesabı çalışıyor
- INSERT query'sinde bir hata (silent exception)
- Veya conditional INSERT (eğer X varsa yaz — X hiç oluşmuyor)

### B.4: Backfill Migration (1 gün)

Son 30 gün için retroaktif aggregate:

```sql
-- migrations/sprint-b-backfill-attendance.sql
WITH daily_pdks AS (
  SELECT 
    user_id,
    record_date,
    MIN(CASE WHEN record_type='in' THEN record_time END) as check_in,
    MAX(CASE WHEN record_type='out' THEN record_time END) as check_out,
    COUNT(CASE WHEN record_type='break_start' THEN 1 END) as break_count
  FROM pdks_records
  WHERE record_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY user_id, record_date
)
INSERT INTO shift_attendance (...)
SELECT ... FROM daily_pdks
WHERE NOT EXISTS (
  SELECT 1 FROM shift_attendance sa
  WHERE sa.user_id = daily_pdks.user_id
    AND DATE(sa.created_at) = daily_pdks.record_date
);
```

### B.5: (Opsiyonel) Test Seed Temizlik

21 vardiya/gün kullanıcılar gerçekçi değil — muhtemelen test seed:
- 11 kullanıcı × 1 gün (2026-04-03) × 18-22 vardiya
- Eğer test seed'se: soft delete + reason="test-data-cleanup"
- Eğer gerçekse: `(user_id, shift_id)` UNIQUE constraint ekle

---

## 📋 Sprint B Acceptance Kriterleri

| # | Kriter | Hedef |
|:-:|--------|-------|
| 1 | Aggregate job çalışıyor | Son 7 gün pdks_records → shift_attendance gap = 0 |
| 2 | Monthly scheduler aktif | `monthly_attendance_summaries` > 0 kayıt |
| 3 | Weekly scheduler aktif | `branch_weekly_attendance_summary` > 0 kayıt |
| 4 | Backfill tamam | Son 30 günün vardiya kayıtları doldu |
| 5 | Duplicate uyarısı | 21 vardiya/gün kullanıcılar raporlandı (karar beklemede) |

---

## 📦 Commit Stratejisi (Sprint B sırasında)

Her adım ayrı commit:
- `feat(attendance): Sprint B.1 — PDKS→Shift aggregate daily job`
- `fix(scheduler): Sprint B.2 — monthly_attendance_summaries scheduler restore`
- `fix(scheduler): Sprint B.3 — branch_weekly_summary silent failure fix`
- `chore(data): Sprint B.4 — 30-day attendance backfill migration`
- `chore(data): Sprint B.5 — 21-shift/day anomaly flag (optional)`

Her commit öncesi Quality Gate kontrol (Madde 36).

---

## 🚧 Sprint C Ertelendi (Önceliği Değişti)

Replit raporu gösterdi ki:
- Akademi v1/v2/v3 konsolidasyon **gerçekten gereksiz** (Claude kod analizi doğru)
- Gate sistemi ve webinar **dormant** (Aslan onayı: pilot sonrası)
- CRM tabloları için Replit cevap vermedi (ayrı task)

**Sprint C (Hafta 3) yeniden planlanacak:**
- Belki C = Audit v1/v2 + CRM naming standardization (daha küçük kapsam)
- Belki C = Doğrudan Sprint D'ye geçiş (Satınalma + Bordro — pilot için kritik)

Bu karar Sprint B bittiğinde Aslan ile netleşecek.
