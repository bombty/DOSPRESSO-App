-- =====================================================================
-- Task #215: PDKS ↔ shift_attendance backfill (5 pilot vakası)
-- Tarih: 26 Nis 2026
-- Kapsam: Antalya Lara (1 vardiya, 2 kayıt) + Fabrika (2 vardiya, 3 kayıt)
-- Test Branch 1 + admin: scope dışı, dokunulmuyor
--
-- Vakalar:
--   1. shift_id=1052 laramudur (Andre)  14 Mar 2026  giris 08:05 + cikis 15:48
--   2. shift_id=1100 busradogmus20      21 Mar 2026  cikis 21:51 (giris mevcut)
--   3. shift_id=1155 filizdemir         03 Mar 2026  giris 14:07 + cikis 21:53
--
-- source = 'manual_backfill' (yeni source değeri)
-- created_by = admin user id
-- Idempotent: WHERE NOT EXISTS check → tekrar çalıştırılırsa hiç insert etmez
-- =====================================================================

BEGIN;

-- ===== Vaka 1: shift_id=1052 laramudur (Andre) — 14 Mar 2026 =====
-- 1a) GİRİŞ 08:05
INSERT INTO pdks_records (user_id, branch_id, record_date, record_time, record_type, source, created_by, device_info)
SELECT '629b81fd-6ac7-4a45-8480-6e6ce3cd53b6', 8, DATE '2026-03-14', TIME '08:05:00', 'giris', 'manual_backfill', '0ccb206f-2c38-431f-8520-291fe9788f50', 'shift_id=1052'
WHERE NOT EXISTS (
  SELECT 1 FROM pdks_records
  WHERE user_id = '629b81fd-6ac7-4a45-8480-6e6ce3cd53b6'
    AND record_date = DATE '2026-03-14'
    AND record_type = 'giris'
);

-- 1b) ÇIKIŞ 15:48
INSERT INTO pdks_records (user_id, branch_id, record_date, record_time, record_type, source, created_by, device_info)
SELECT '629b81fd-6ac7-4a45-8480-6e6ce3cd53b6', 8, DATE '2026-03-14', TIME '15:48:00', 'cikis', 'manual_backfill', '0ccb206f-2c38-431f-8520-291fe9788f50', 'shift_id=1052'
WHERE NOT EXISTS (
  SELECT 1 FROM pdks_records
  WHERE user_id = '629b81fd-6ac7-4a45-8480-6e6ce3cd53b6'
    AND record_date = DATE '2026-03-14'
    AND record_type = 'cikis'
);

-- ===== Vaka 2: shift_id=1100 busradogmus20 — 21 Mar 2026 =====
-- 2a) ÇIKIŞ 21:51 (giriş zaten var)
INSERT INTO pdks_records (user_id, branch_id, record_date, record_time, record_type, source, created_by, device_info)
SELECT '41d2a9f0-f3be-45d0-90cc-e2aa585cfcc9', 24, DATE '2026-03-21', TIME '21:51:00', 'cikis', 'manual_backfill', '0ccb206f-2c38-431f-8520-291fe9788f50', 'shift_id=1100'
WHERE NOT EXISTS (
  SELECT 1 FROM pdks_records
  WHERE user_id = '41d2a9f0-f3be-45d0-90cc-e2aa585cfcc9'
    AND record_date = DATE '2026-03-21'
    AND record_type = 'cikis'
);

-- ===== Vaka 3: shift_id=1155 filizdemir — 03 Mar 2026 =====
-- 3a) GİRİŞ 14:07
INSERT INTO pdks_records (user_id, branch_id, record_date, record_time, record_type, source, created_by, device_info)
SELECT 'b8743987-e5d4-47f5-9a6f-08112d21d6c6', 24, DATE '2026-03-03', TIME '14:07:00', 'giris', 'manual_backfill', '0ccb206f-2c38-431f-8520-291fe9788f50', 'shift_id=1155'
WHERE NOT EXISTS (
  SELECT 1 FROM pdks_records
  WHERE user_id = 'b8743987-e5d4-47f5-9a6f-08112d21d6c6'
    AND record_date = DATE '2026-03-03'
    AND record_type = 'giris'
);

-- 3b) ÇIKIŞ 21:53
INSERT INTO pdks_records (user_id, branch_id, record_date, record_time, record_type, source, created_by, device_info)
SELECT 'b8743987-e5d4-47f5-9a6f-08112d21d6c6', 24, DATE '2026-03-03', TIME '21:53:00', 'cikis', 'manual_backfill', '0ccb206f-2c38-431f-8520-291fe9788f50', 'shift_id=1155'
WHERE NOT EXISTS (
  SELECT 1 FROM pdks_records
  WHERE user_id = 'b8743987-e5d4-47f5-9a6f-08112d21d6c6'
    AND record_date = DATE '2026-03-03'
    AND record_type = 'cikis'
);

-- ===== DOĞRULAMA =====
-- Pilot scope mismatch sayısı 5'den 0'a düşmeli
-- Toplam mismatch sayısı 9'dan 4'e düşmeli (Test Branch 1 + admin = 4 kalıntı, scope dışı)
SELECT 'PILOT_MISMATCH_SONRASI' as kontrol, count(*) as kalan_vaka
FROM (
  SELECT sa.id FROM shift_attendance sa
  JOIN users u ON u.id=sa.user_id
  JOIN branches b ON b.id=u.branch_id
  WHERE sa.check_in_time IS NOT NULL
    AND b.id IN (5, 8, 23, 24)  -- sadece pilot şubeler
    AND NOT EXISTS (
      SELECT 1 FROM pdks_records pr
      WHERE pr.user_id=sa.user_id AND pr.record_date=sa.check_in_time::date AND pr.record_type='giris'
    )
  UNION ALL
  SELECT sa.id FROM shift_attendance sa
  JOIN users u ON u.id=sa.user_id
  JOIN branches b ON b.id=u.branch_id
  WHERE sa.check_out_time IS NOT NULL
    AND b.id IN (5, 8, 23, 24)
    AND NOT EXISTS (
      SELECT 1 FROM pdks_records pr
      WHERE pr.user_id=sa.user_id AND pr.record_date=sa.check_out_time::date AND pr.record_type='cikis'
    )
) t;

-- Backfill kayıtlarını listele (manuel doğrulama)
SELECT user_id, branch_id, record_date, record_time, record_type, source, device_info
FROM pdks_records
WHERE source = 'manual_backfill'
ORDER BY record_date, record_type;

COMMIT;
