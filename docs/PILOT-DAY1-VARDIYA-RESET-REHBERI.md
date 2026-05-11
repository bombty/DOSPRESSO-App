# 🔄 Pilot Day-1 Vardiya Sıfırlama Rehberi (13 May 2026)

> **Bu döküman**, pilot 13 May 15:00'da temiz sayfa açmak için Replit Agent'a verilecek SQL talimatlarını içerir.

**Tarih:** 13 May 2026 Çarşamba sabah (pilot başlangıcından ÖNCE)
**Yapacak:** Replit Agent (Aslan onayı ile)
**Süre:** ~10 dakika
**Etkilenecek lokasyonlar:** Işıklar #5, Lara #8, HQ #23, Fabrika #24

---

## ⚠️ ÖNEMLİ ÖN UYARI

Bu SQL'ler pilot Day-1'in **temiz başlangıcı** içindir. Pilot başladıktan SONRA çalıştırılırsa **veri kaybı olur.** Sadece 13 May Çarşamba sabah 09-14 arası bir kez yapılır.

**Tüm SQL'ler önce `BEGIN; ... ROLLBACK;` ile test edilmeli, sonuçlar Aslan onayı ile `COMMIT;` yapılmalı.**

---

## 📋 ADIM 1: Pre-Reset Backup (Replit Agent yapacak)

```bash
# Replit Shell'den çalıştır:
pg_dump $DATABASE_URL > backup-pre-pilot-2026-05-13.sql
ls -lh backup-pre-pilot-2026-05-13.sql
# Beklenen: 50+ MB
```

Backup başarılı değilse durup Aslan'a bildir.

---

## 📋 ADIM 2: Pre-Reset Sayım Raporu

Reset öncesi mevcut durum:

```sql
BEGIN;

-- Pilot 4 şubedeki mevcut vardiya/attendance verileri
SELECT
  'shifts (planned)' as tablo,
  COUNT(*) as toplam,
  COUNT(*) FILTER (WHERE shift_date >= CURRENT_DATE) as gelecek,
  COUNT(*) FILTER (WHERE shift_date < CURRENT_DATE) as gecmis
FROM shifts WHERE branch_id IN (5, 8, 23, 24);

SELECT
  'shift_attendance' as tablo,
  COUNT(*) as toplam,
  COUNT(*) FILTER (WHERE check_in_time >= CURRENT_DATE) as bugun,
  COUNT(*) FILTER (WHERE check_out_time IS NULL) as aktif_oturum
FROM shift_attendance sa
INNER JOIN users u ON u.id = sa.user_id
WHERE u.branch_id IN (5, 8, 23, 24);

SELECT
  'branch_shift_sessions' as tablo,
  COUNT(*) as toplam,
  COUNT(*) FILTER (WHERE status = 'active') as aktif,
  COUNT(*) FILTER (WHERE status = 'completed') as tamamlanan
FROM branch_shift_sessions WHERE branch_id IN (5, 8, 23, 24);

SELECT
  'hq_shift_sessions' as tablo,
  COUNT(*) as toplam,
  COUNT(*) FILTER (WHERE status = 'active') as aktif
FROM hq_shift_sessions;

SELECT
  'factory_shift_sessions' as tablo,
  COUNT(*) as toplam,
  COUNT(*) FILTER (WHERE status = 'active') as aktif
FROM factory_shift_sessions;

SELECT
  'pdks_records' as tablo,
  COUNT(*) as toplam
FROM pdks_records pr
INNER JOIN users u ON u.id = pr.user_id
WHERE u.branch_id IN (5, 8, 23, 24);

SELECT
  'employee_warnings' as tablo,
  COUNT(*) as toplam,
  COUNT(*) FILTER (WHERE notes LIKE '%shift_compliance%') as otomatik
FROM employee_warnings ew
INNER JOIN users u ON u.id = ew.user_id
WHERE u.branch_id IN (5, 8, 23, 24);

ROLLBACK;
```

Bu rakamları Aslan'a göster, onay al, sonra ADIM 3'e geç.

---

## 📋 ADIM 3: Vardiya Sıfırlama (Test) — ROLLBACK ile

```sql
BEGIN;

-- 3.1: Geçmiş ve gelecek tüm vardiya planlamalarını sil
DELETE FROM shifts WHERE branch_id IN (5, 8, 23, 24);
SELECT COUNT(*) as silinen_shift FROM shifts WHERE branch_id IN (5, 8, 23, 24);

-- 3.2: Aktif vardiya oturumlarını kapat (5 May test datalar)
UPDATE branch_shift_sessions
SET status = 'cancelled',
    check_out_time = COALESCE(check_out_time, CURRENT_TIMESTAMP),
    notes = COALESCE(notes, '') || ' [SISTEM: Pilot pre-reset 13 May 2026]'
WHERE branch_id IN (5, 8, 23, 24)
  AND status IN ('active', 'on_break');

UPDATE hq_shift_sessions
SET status = 'cancelled',
    check_out_time = COALESCE(check_out_time, CURRENT_TIMESTAMP),
    notes = COALESCE(notes, '') || ' [SISTEM: Pilot pre-reset 13 May 2026]'
WHERE status IN ('active', 'on_break');

UPDATE factory_shift_sessions
SET status = 'cancelled',
    check_out_time = COALESCE(check_out_time, CURRENT_TIMESTAMP),
    notes = COALESCE(notes, '') || ' [SISTEM: Pilot pre-reset 13 May 2026]'
WHERE status IN ('active', 'on_break');

-- 3.3: shift_attendance'da aktif olanları kapat
UPDATE shift_attendance sa
SET status = 'cancelled',
    check_out_time = COALESCE(sa.check_out_time, CURRENT_TIMESTAMP),
    notes = COALESCE(sa.notes, '') || ' [SISTEM: Pilot pre-reset]'
FROM users u
WHERE sa.user_id = u.id
  AND u.branch_id IN (5, 8, 23, 24)
  AND sa.check_out_time IS NULL;

-- Doğrulama:
SELECT COUNT(*) as aktif_kalan FROM branch_shift_sessions 
  WHERE branch_id IN (5,8,23,24) AND status IN ('active','on_break');
-- Beklenen: 0

ROLLBACK; -- Test sonucunu gör, gerçek için ADIM 4
```

---

## 📋 ADIM 4: Vardiya Sıfırlama (CANLI) — COMMIT

ADIM 3 başarılıysa ve Aslan onay verirse:

```sql
BEGIN;

-- ADIM 3'teki tüm SQL'leri TEKRAR çalıştır
-- (yukarıdaki blokları kopyala)

-- En sonda:
COMMIT;
```

**COMMIT'ten sonra geri dönüş YOK. Backup'ı sakla.**

---

## 📋 ADIM 5: Post-Reset Doğrulama

```sql
SELECT 
  branch_id,
  COUNT(*) FILTER (WHERE status IN ('active', 'on_break')) as aktif_oturum,
  COUNT(*) as toplam_oturum
FROM branch_shift_sessions
WHERE branch_id IN (5, 8, 23, 24)
GROUP BY branch_id;
-- Beklenen: aktif_oturum = 0

SELECT COUNT(*) as planli_vardiya FROM shifts WHERE branch_id IN (5, 8, 23, 24);
-- Beklenen: 0

SELECT 
  username, role, is_active 
FROM users 
WHERE branch_id IN (5, 8, 23, 24) 
  AND is_active = true 
ORDER BY branch_id, role;
-- Sayım Aslan'a göster, "tüm pilot personel aktif" doğrula
```

---

## 🚫 NE YAPILMAYACAK (KORUNAN VERİ)

**SİLİNMEYECEK** (geçmiş kalır):
- `users` tablosu (personel listesi)
- `pdks_records` (Excel import geçmişi - Mahmut için)
- `monthly_payroll`, `monthly_payrolls` (bordro geçmişi)
- `employee_warnings` (tutanak geçmişi - İK için)
- `leave_requests` (izin talepleri geçmişi)
- `recipes`, `products`, raw materials (üretim verisi)
- Audit log, notifications

**SİLİNECEK** (sıfırlanır):
- `shifts` (planlı vardiyalar — yeni pilot dönemi için)
- Aktif/on_break vardiya oturumları (cancelled'a alınır)
- Aktif shift_attendance kayıtları (cancelled)

---

## ✅ Pilot Day-1 Akış (13 May 15:00 sonrası)

Reset tamamlandıktan sonra:

1. **15:00**: Pilot resmi başlangıç
2. **Personel kioska gelir**, PIN girer
3. **Vardiya başlat** butonuna basar → branch_shift_sessions'da yeni kayıt
4. **Mola al / Vardıya bitir** akışı normal şekilde işler
5. **Mahmut /pdks-merkezi**'den gerçek zamanlı takip eder
6. **Compliance score otomatik hesaplanır** (Sprint 15.4 — geç giriş > 5 dk → tutanak)

---

## 🚨 EĞER PROBLEM ÇIKARSA

Rollback prosedürü:

```bash
# Replit Shell:
psql $DATABASE_URL < backup-pre-pilot-2026-05-13.sql
```

Backup geri yükleme ~5 dakika. Tüm pre-reset durum geri gelir.

---

**Son güncelleme:** 11 May 2026
**Yazan:** Claude (Anthropic) — Aslan onayı için
**Pilot tarihi:** 13 May 2026 Çarşamba 15:00
