-- ═══════════════════════════════════════════════════════════════════
-- TASK-#347: Personel Veri Senkronizasyon (Excel → DB)
-- ═══════════════════════════════════════════════════════════════════
-- Tarih:    5 May 2026
-- Sprint:   5 / Personel Data Sync
-- Kaynak:   PERSONEL_o_zlu_k_app.xlsx (27 kişi tam kadro)
-- 
-- Bağlam: Mahmut Bey'in elindeki Excel master veri.
-- DB'deki users tablosu güncel değil. Bu migration:
--   1. hire_date senkronize eder (kıdem hesabı için kritik)
--   2. birth_date senkronize eder
--   3. net_salary, mealAllowance, bonusBase günceller (hakediş)
--   4. leave_balances 2026 yılı için Excel verileriyle re-seed eder
--      (Sprint 1'deki varsayılan 14 değil, gerçek değerler)
-- 
-- DEPARTMENT → BRANCH ID mapping:
--   İMALATHANE → branch_id 24 (Fabrika)
--   OFİS       → branch_id 23 (HQ)
--   IŞIKLAR    → branch_id 5  (Işıklar şube)
-- 
-- ÖNEMLİ: Bu SQL idempotent — aynı isim eşleşmesi olduğu sürece
-- yeniden çalıştırılabilir.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Dry-run hazırlık: değişecek kayıtları görmek için
-- (EXECUTE öncesi manuel çalıştırılabilir)
-- SELECT id, first_name, last_name, branch_id, hire_date, net_salary 
-- FROM users 
-- WHERE deleted_at IS NULL
-- ORDER BY first_name;


-- ═══════════════════════════════════════════════════════════════════
-- 1) USERS UPDATE — hire_date, birth_date, salary fields
-- ═══════════════════════════════════════════════════════════════════

-- 1. ARİFE YILDIRIM (İMALATHANE) — Hakediş: 33,500 TL
UPDATE users SET
  hire_date = '2025-05-23',
  birth_date = '2000-11-26',
  branch_id = 24,
  net_salary = 3350000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 400000,
  meal_allowance = 0,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('ARİFE YILDIRIM', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('ARİFE YILDIRIM')
  );

-- 2. ATİYE KAR (İMALATHANE) — Hakediş: 50,000 TL
UPDATE users SET
  hire_date = '2017-02-24',
  birth_date = '1970-02-01',
  branch_id = 24,
  net_salary = 5000000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 800000,
  meal_allowance = 0,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('ATİYE KAR', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('ATİYE KAR')
  );

-- 3. BÜŞRA DOĞMUŞ (İMALATHANE) — Hakediş: 35,000 TL
UPDATE users SET
  hire_date = '2023-08-08',
  birth_date = '2000-01-01',
  branch_id = 24,
  net_salary = 3500000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 400000,
  meal_allowance = 0,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('BÜŞRA DOĞMUŞ', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('BÜŞRA DOĞMUŞ')
  );

-- 4. DIANA NAYFONOVA (OFİS) — Hakediş: 47,500 TL
UPDATE users SET
  hire_date = '2025-01-20',
  birth_date = '1981-11-03',
  branch_id = 23,
  net_salary = 4750000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 800000,
  meal_allowance = 0,
  transport_allowance = 250000,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('DIANA NAYFONOVA', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('DIANA NAYFONOVA')
  );

-- 5. EREN ELMAS (OFİS) — Hakediş: 60,000 TL
UPDATE users SET
  hire_date = '2021-05-25',
  birth_date = '1994-04-22',
  branch_id = 23,
  net_salary = 6000000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 800000,
  meal_allowance = 0,
  transport_allowance = 600000,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('EREN ELMAS', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('EREN ELMAS')
  );

-- 6. FİLİZ KARALİ (İMALATHANE) — Hakediş: 38,500 TL
UPDATE users SET
  hire_date = '2018-07-25',
  birth_date = '1970-06-01',
  branch_id = 24,
  net_salary = 3850000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 800000,
  meal_allowance = 0,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('FİLİZ KARALİ', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('FİLİZ KARALİ')
  );

-- 7. GALİP CAN BORAN (İMALATHANE) — Hakediş: 34,500 TL
UPDATE users SET
  hire_date = '2024-03-18',
  birth_date = '2003-06-27',
  branch_id = 24,
  net_salary = 3450000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 300000,
  meal_allowance = 0,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('GALİP CAN BORAN', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('GALİP CAN BORAN')
  );

-- 8. HATİCE KOCABAŞ (İMALATHANE) — Hakediş: 32,500 TL
UPDATE users SET
  hire_date = '2025-07-21',
  birth_date = '1978-10-20',
  branch_id = 24,
  net_salary = 3250000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 150000,
  meal_allowance = 0,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('HATİCE KOCABAŞ', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('HATİCE KOCABAŞ')
  );

-- 10. LEYLA SÖNMEZ (İMALATHANE) — Hakediş: 32,500 TL
UPDATE users SET
  hire_date = '2025-10-01',
  birth_date = '1990-01-01',
  branch_id = 24,
  net_salary = 3250000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 250000,
  meal_allowance = 0,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('LEYLA SÖNMEZ', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('LEYLA SÖNMEZ')
  );

-- 11. MAHMUT ALTUNAY (OFİS) — Hakediş: 65,000 TL
UPDATE users SET
  hire_date = '2025-11-24',
  birth_date = '1992-09-05',
  branch_id = 23,
  net_salary = 6500000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 1000000,
  meal_allowance = 0,
  transport_allowance = 600000,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('MAHMUT ALTUNAY', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('MAHMUT ALTUNAY')
  );

-- 12. MİHRİCAN VEZİROĞLU (İMALATHANE) — Hakediş: 35,000 TL
UPDATE users SET
  hire_date = '2023-05-29',
  birth_date = '1990-04-12',
  branch_id = 24,
  net_salary = 3500000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 400000,
  meal_allowance = 0,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('MİHRİCAN VEZİROĞLU', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('MİHRİCAN VEZİROĞLU')
  );

-- 13. MUSTAFA CAN HORZUM (İMALATHANE) — Hakediş: 47,000 TL
UPDATE users SET
  hire_date = '2024-01-22',
  birth_date = '1997-07-09',
  branch_id = 24,
  net_salary = 4700000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 800000,
  meal_allowance = 0,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('MUSTAFA CAN HORZUM', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('MUSTAFA CAN HORZUM')
  );

-- 14. ŞEVKET SAMET KARA (OFİS) — Hakediş: 50,000 TL
UPDATE users SET
  hire_date = '2024-04-15',
  birth_date = '1988-11-23',
  branch_id = 23,
  net_salary = 5000000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 800000,
  meal_allowance = 0,
  transport_allowance = 500000,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('ŞEVKET SAMET KARA', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('ŞEVKET SAMET KARA')
  );

-- 15. UTKU DERNEK (OFİS) — Hakediş: 75,000 TL
UPDATE users SET
  hire_date = '2015-09-08',
  birth_date = '1991-06-21',
  branch_id = 23,
  net_salary = 7500000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 1000000,
  meal_allowance = 0,
  transport_allowance = 600000,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('UTKU DERNEK', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('UTKU DERNEK')
  );

-- 17. ÜMÜT KOŞAR (İMALATHANE) — Hakediş: 85,000 TL
UPDATE users SET
  hire_date = '2025-11-17',
  birth_date = '1978-04-10',
  branch_id = 24,
  net_salary = 8500000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 1000000,
  meal_allowance = 0,
  transport_allowance = 500000,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('ÜMÜT KOŞAR', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('ÜMÜT KOŞAR')
  );

-- 18. AHMET HAMİT DOĞAN (IŞIKLAR) — Hakediş: 36,000 TL
UPDATE users SET
  hire_date = '2025-10-08',
  birth_date = '2000-01-01',
  branch_id = 5,
  net_salary = 3600000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 300000,
  meal_allowance = 200000,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('AHMET HAMİT DOĞAN', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('AHMET HAMİT DOĞAN')
  );

-- 19. ATEŞ GÜNEY YILMAZ (IŞIKLAR) — Hakediş: 42,000 TL
UPDATE users SET
  hire_date = '2023-12-27',
  birth_date = '1999-09-17',
  branch_id = 5,
  net_salary = 4200000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 800000,
  meal_allowance = 200000,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('ATEŞ GÜNEY YILMAZ', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('ATEŞ GÜNEY YILMAZ')
  );

-- 20. BASRİ ŞEN (IŞIKLAR) — Hakediş: 45,000 TL
UPDATE users SET
  hire_date = '2022-09-01',
  birth_date = '1994-02-12',
  branch_id = 5,
  net_salary = 4500000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 800000,
  meal_allowance = 200000,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('BASRİ ŞEN', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('BASRİ ŞEN')
  );

-- 21. CİHAN KOLAKAN (IŞIKLAR) — Hakediş: 42,000 TL
UPDATE users SET
  hire_date = '2025-11-24',
  birth_date = '1996-06-01',
  branch_id = 5,
  net_salary = 4200000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 800000,
  meal_allowance = 200000,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('CİHAN KOLAKAN', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('CİHAN KOLAKAN')
  );

-- 22. ECE ÖZ (IŞIKLAR) — Hakediş: 52,000 TL
UPDATE users SET
  hire_date = '2022-09-06',
  birth_date = '1994-02-11',
  branch_id = 5,
  net_salary = 5200000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 800000,
  meal_allowance = 200000,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('ECE ÖZ', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('ECE ÖZ')
  );

-- 23. EFE KADİR KOCAKAYA (IŞIKLAR) — Hakediş: 36,000 TL
UPDATE users SET
  hire_date = '2025-09-18',
  birth_date = '1999-09-17',
  branch_id = 5,
  net_salary = 3600000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 300000,
  meal_allowance = 200000,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('EFE KADİR KOCAKAYA', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('EFE KADİR KOCAKAYA')
  );

-- 24. KEMAL HÜSEYİNOĞLU (IŞIKLAR) — Hakediş: 42,000 TL
UPDATE users SET
  hire_date = '2023-08-18',
  birth_date = '2001-10-20',
  branch_id = 5,
  net_salary = 4200000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 800000,
  meal_allowance = 200000,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('KEMAL HÜSEYİNOĞLU', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('KEMAL HÜSEYİNOĞLU')
  );

-- 25. YAVUZ KOLAKAN (IŞIKLAR) — Hakediş: 56,000 TL
UPDATE users SET
  hire_date = '2021-02-19',
  birth_date = '1995-06-25',
  branch_id = 5,
  net_salary = 5600000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 800000,
  meal_allowance = 200000,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('YAVUZ KOLAKAN', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('YAVUZ KOLAKAN')
  );

-- 26. SÜLEYMAN OLGUN (IŞIKLAR) — Hakediş: 42,000 TL
UPDATE users SET
  hire_date = '2026-01-13',
  birth_date = birth_date,
  branch_id = 5,
  net_salary = 4200000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 800000,
  meal_allowance = 200000,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('SÜLEYMAN OLGUN', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('SÜLEYMAN OLGUN')
  );

-- 27. İSMAİL SİVRİ (IŞIKLAR) — Hakediş: 33,000 TL
UPDATE users SET
  hire_date = '2026-02-09',
  birth_date = birth_date,
  branch_id = 5,
  net_salary = 3300000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 0,
  meal_allowance = 200000,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('İSMAİL SİVRİ', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('İSMAİL SİVRİ')
  );

-- 28. HÜLYA TÜZÜN (IŞIKLAR) — Hakediş: 33,000 TL
UPDATE users SET
  hire_date = '2026-02-17',
  birth_date = '1977-01-05',
  branch_id = 5,
  net_salary = 3300000,  -- kuruş cinsinden (TL × 100)
  bonus_base = 200000,
  meal_allowance = 0,
  transport_allowance = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')) 
     = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('HÜLYA TÜZÜN', 'ı','i'),'İ','i'),'ş','s'),'Ş','s'),'ğ','g'),'Ğ','g')))
    OR LOWER(first_name||' '||last_name) ILIKE LOWER('HÜLYA TÜZÜN')
  );


-- ═══════════════════════════════════════════════════════════════════
-- 2) LEAVE_BALANCES RE-SEED — 2026 gerçek bakiyeler
-- ═══════════════════════════════════════════════════════════════════
-- Sprint 1'de varsayılan 14 koymuştuk. Excel'deki gerçek değerler farklı.
-- carried_over_days = 2025'ten kalan, annual_entitlement_days = 2026 hak
-- used_days = leave_requests'ten otomatik hesaplanacak

-- 1. ARİFE YILDIRIM: 2025 kalan 0 + 2026 hak 14.0 = 0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 0,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('ARİFE YILDIRIM')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('ARİFE YILDIRIM', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 2. ATİYE KAR: 2025 kalan 0.5 + 2026 hak 20.0 = 20.5
UPDATE leave_balances SET
  annual_entitlement_days = 20,
  carried_over_days = 0,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('ATİYE KAR')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('ATİYE KAR', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 3. BÜŞRA DOĞMUŞ: 2025 kalan 7.0 + 2026 hak 14.0 = 7.0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 7,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('BÜŞRA DOĞMUŞ')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('BÜŞRA DOĞMUŞ', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 4. DIANA NAYFONOVA: 2025 kalan 0 + 2026 hak 14.0 = 14.0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 0,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('DIANA NAYFONOVA')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('DIANA NAYFONOVA', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 5. EREN ELMAS: 2025 kalan 11.0 + 2026 hak 14.0 = 11.0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 11,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('EREN ELMAS')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('EREN ELMAS', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 6. FİLİZ KARALİ: 2025 kalan 11.0 + 2026 hak 14.0 = 11.0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 11,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('FİLİZ KARALİ')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('FİLİZ KARALİ', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 7. GALİP CAN BORAN: 2025 kalan 3.5 + 2026 hak 14.0 = 17.5
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 3,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('GALİP CAN BORAN')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('GALİP CAN BORAN', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 8. HATİCE KOCABAŞ: 2025 kalan 0 + 2026 hak 14.0 = 0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 0,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('HATİCE KOCABAŞ')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('HATİCE KOCABAŞ', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 10. LEYLA SÖNMEZ: 2025 kalan 0 + 2026 hak 14.0 = 0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 0,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('LEYLA SÖNMEZ')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('LEYLA SÖNMEZ', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 11. MAHMUT ALTUNAY: 2025 kalan 0 + 2026 hak 14.0 = 0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 0,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('MAHMUT ALTUNAY')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('MAHMUT ALTUNAY', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 12. MİHRİCAN VEZİROĞLU: 2025 kalan 2.0 + 2026 hak 14.0 = 2.0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 2,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('MİHRİCAN VEZİROĞLU')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('MİHRİCAN VEZİROĞLU', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 13. MUSTAFA CAN HORZUM: 2025 kalan 0 + 2026 hak 14.0 = 14.0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 0,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('MUSTAFA CAN HORZUM')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('MUSTAFA CAN HORZUM', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 14. ŞEVKET SAMET KARA: 2025 kalan 0.5 + 2026 hak 14.0 = 14.5
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 0,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('ŞEVKET SAMET KARA')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('ŞEVKET SAMET KARA', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 15. UTKU DERNEK: 2025 kalan 56.5 + 2026 hak 14.0 = 56.5
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 56,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('UTKU DERNEK')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('UTKU DERNEK', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 17. ÜMÜT KOŞAR: 2025 kalan 0 + 2026 hak 14.0 = 0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 0,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('ÜMÜT KOŞAR')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('ÜMÜT KOŞAR', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 18. AHMET HAMİT DOĞAN: 2025 kalan 0 + 2026 hak 14.0 = 0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 0,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('AHMET HAMİT DOĞAN')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('AHMET HAMİT DOĞAN', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 19. ATEŞ GÜNEY YILMAZ: 2025 kalan 16.0 + 2026 hak 14.0 = 16.0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 16,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('ATEŞ GÜNEY YILMAZ')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('ATEŞ GÜNEY YILMAZ', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 20. BASRİ ŞEN: 2025 kalan 9.0 + 2026 hak 14.0 = 9.0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 9,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('BASRİ ŞEN')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('BASRİ ŞEN', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 21. CİHAN KOLAKAN: 2025 kalan 0 + 2026 hak 14.0 = 0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 0,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('CİHAN KOLAKAN')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('CİHAN KOLAKAN', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 22. ECE ÖZ: 2025 kalan 11.0 + 2026 hak 3.0 = 14.0
UPDATE leave_balances SET
  annual_entitlement_days = 3,
  carried_over_days = 11,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('ECE ÖZ')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('ECE ÖZ', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 23. EFE KADİR KOCAKAYA: 2025 kalan 0 + 2026 hak 14.0 = 0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 0,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('EFE KADİR KOCAKAYA')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('EFE KADİR KOCAKAYA', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 24. KEMAL HÜSEYİNOĞLU: 2025 kalan 7.0 + 2026 hak 14.0 = 7.0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 7,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('KEMAL HÜSEYİNOĞLU')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('KEMAL HÜSEYİNOĞLU', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 25. YAVUZ KOLAKAN: 2025 kalan 18.0 + 2026 hak 23.0 = 41.0
UPDATE leave_balances SET
  annual_entitlement_days = 23,
  carried_over_days = 18,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('YAVUZ KOLAKAN')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('YAVUZ KOLAKAN', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 26. SÜLEYMAN OLGUN: 2025 kalan 0 + 2026 hak 14.0 = 0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 0,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('SÜLEYMAN OLGUN')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('SÜLEYMAN OLGUN', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 27. İSMAİL SİVRİ: 2025 kalan 0 + 2026 hak 14.0 = 0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 0,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('İSMAİL SİVRİ')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('İSMAİL SİVRİ', 'ı','i'),'İ','i'),'Ş','s')))
  );

-- 28. HÜLYA TÜZÜN: 2025 kalan 0 + 2026 hak 14.0 = 0
UPDATE leave_balances SET
  annual_entitlement_days = 14,
  carried_over_days = 0,
  notes = 'Excel master sync (5 May 2026) — Mahmut master file',
  last_calculated_at = NOW(),
  updated_at = NOW()
WHERE period_year = 2026
  AND user_id IN (
    SELECT id FROM users 
    WHERE deleted_at IS NULL
      AND (LOWER(first_name||' '||last_name) ILIKE LOWER('HÜLYA TÜZÜN')
           OR LOWER(REPLACE(REPLACE(REPLACE(first_name||' '||last_name, 'ı','i'),'İ','i'),'Ş','s')) 
              = LOWER(REPLACE(REPLACE(REPLACE('HÜLYA TÜZÜN', 'ı','i'),'İ','i'),'Ş','s')))
  );



-- ═══════════════════════════════════════════════════════════════════
-- 3) DOĞRULAMA SORGULARI (manuel çalıştır, EXECUTE'a dahil değil)
-- ═══════════════════════════════════════════════════════════════════

-- Eşleşmeyen Excel kayıtlarını bulmak için:
-- (Aşağıdaki isimlerin DB'de olması beklenir)

-- - ARİFE YILDIRIM (İMALATHANE)
-- - ATİYE KAR (İMALATHANE)
-- - BÜŞRA DOĞMUŞ (İMALATHANE)
-- - DIANA NAYFONOVA (OFİS)
-- - EREN ELMAS (OFİS)
-- - FİLİZ KARALİ (İMALATHANE)
-- - GALİP CAN BORAN (İMALATHANE)
-- - HATİCE KOCABAŞ (İMALATHANE)
-- - LEYLA SÖNMEZ (İMALATHANE)
-- - MAHMUT ALTUNAY (OFİS)
-- - MİHRİCAN VEZİROĞLU (İMALATHANE)
-- - MUSTAFA CAN HORZUM (İMALATHANE)
-- - ŞEVKET SAMET KARA (OFİS)
-- - UTKU DERNEK (OFİS)
-- - ÜMÜT KOŞAR (İMALATHANE)
-- - AHMET HAMİT DOĞAN (IŞIKLAR)
-- - ATEŞ GÜNEY YILMAZ (IŞIKLAR)
-- - BASRİ ŞEN (IŞIKLAR)
-- - CİHAN KOLAKAN (IŞIKLAR)
-- - ECE ÖZ (IŞIKLAR)
-- - EFE KADİR KOCAKAYA (IŞIKLAR)
-- - KEMAL HÜSEYİNOĞLU (IŞIKLAR)
-- - YAVUZ KOLAKAN (IŞIKLAR)
-- - SÜLEYMAN OLGUN (IŞIKLAR)
-- - İSMAİL SİVRİ (IŞIKLAR)
-- - HÜLYA TÜZÜN (IŞIKLAR)

-- Güncellenmiş users sayısı:
-- SELECT COUNT(*) FROM users 
-- WHERE updated_at >= NOW() - INTERVAL '5 minutes' 
--   AND net_salary > 0;

-- 2026 leave_balances özet:
-- SELECT 
--   COUNT(*) AS total_records,
--   SUM(annual_entitlement_days) AS total_entitlement,
--   SUM(carried_over_days) AS total_carried_over,
--   SUM(remaining_days) AS total_remaining,
--   AVG(remaining_days)::DECIMAL(10,2) AS avg_remaining
-- FROM leave_balances 
-- WHERE period_year = 2026;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- ROLLBACK (gerekirse):
-- 
-- BEGIN;
-- UPDATE leave_balances 
-- SET annual_entitlement_days = 14, carried_over_days = 0, used_days = 0,
--     notes = 'Restored to Sprint 1 default (5 May rollback)'
-- WHERE notes LIKE 'Excel master sync%';
-- COMMIT;
-- ═══════════════════════════════════════════════════════════════════
