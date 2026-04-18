-- =====================================================================
-- Test Branch + seed_test PDKS Cleanup
-- Pazartesi 28 Nis 2026, 16:00-17:00
-- =====================================================================
-- AMAÇ:
-- 1. "Test Branch" ve "Örnek Şube" soft-delete (sidebar'da görünmesin)
-- 2. seed_test prefix'li 704 PDKS kaydı temizlik (pilot verilerini bozmasın)
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- ADIM 1: Test branch'leri tespit + soft-delete
-- ─────────────────────────────────────────────────────────────────────
-- Önce listele (uygulamadan önce kontrol)
SELECT id, name, code, deleted_at
FROM branches
WHERE LOWER(name) LIKE '%test%'
   OR LOWER(name) LIKE '%örnek%'
   OR LOWER(code) LIKE 'test%'
   OR LOWER(code) LIKE 'sample%';

-- Soft-delete (isim eşleşmesine göre)
UPDATE branches
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE (
    LOWER(name) LIKE '%test%'
    OR LOWER(name) LIKE '%örnek%'
    OR LOWER(code) LIKE 'test%'
    OR LOWER(code) LIKE 'sample%'
  )
  AND deleted_at IS NULL
  -- ⚠️ Pilot 4 lokasyonu KORU
  AND id NOT IN (
    SELECT id FROM branches WHERE code IN ('HQ', 'FAB', 'ISI', 'LAR')
  );

-- ─────────────────────────────────────────────────────────────────────
-- ADIM 2: Test user'ları deaktive (pilot dışı)
-- ─────────────────────────────────────────────────────────────────────
-- Soft-deleted branch'lerin user'larını da pasifle
UPDATE users
SET status = 'inactive',
    updated_at = NOW()
WHERE branch_id IN (
  SELECT id FROM branches WHERE deleted_at IS NOT NULL
)
AND status = 'active';

-- ─────────────────────────────────────────────────────────────────────
-- ADIM 3: seed_test PDKS kayıtları
-- ─────────────────────────────────────────────────────────────────────
-- Önce sayım (beklenen ~704)
SELECT COUNT(*) as seed_test_count,
       MIN(date) as oldest,
       MAX(date) as newest
FROM pdks_excel_records
WHERE notes LIKE 'seed_test%'
   OR file_name LIKE 'seed_test%'
   OR (employee_code LIKE 'TEST%' AND date < '2026-04-01');

-- Soft-delete (deleted_at varsa) veya hard-delete (yoksa)
DELETE FROM pdks_excel_records
WHERE notes LIKE 'seed_test%'
   OR file_name LIKE 'seed_test%'
   OR (employee_code LIKE 'TEST%' AND date < '2026-04-01');

-- İlgili daily_summary ve monthly_stats temizlik
DELETE FROM pdks_daily_summary
WHERE branch_id IN (
  SELECT id FROM branches WHERE deleted_at IS NOT NULL
)
AND date < '2026-04-01';

DELETE FROM pdks_monthly_stats
WHERE branch_id IN (
  SELECT id FROM branches WHERE deleted_at IS NOT NULL
)
AND year_month < '2026-04';

-- ─────────────────────────────────────────────────────────────────────
-- DOĞRULAMA
-- ─────────────────────────────────────────────────────────────────────
SELECT 'branches_active' as metric, COUNT(*) FROM branches WHERE deleted_at IS NULL
UNION ALL
SELECT 'users_active' as metric, COUNT(*) FROM users WHERE status = 'active' AND deleted_at IS NULL
UNION ALL
SELECT 'pdks_records_total' as metric, COUNT(*) FROM pdks_excel_records
UNION ALL
SELECT 'pdks_records_seed_test' as metric, COUNT(*) FROM pdks_excel_records WHERE notes LIKE 'seed_test%';

-- Beklenen:
-- branches_active = 22 (orijinal) - test sayısı (genelde 22-25)
-- users_active = ~270-372 (deactivate edilen user kadar düşmeli)
-- pdks_records_seed_test = 0 (temizlendi)

COMMIT;
-- Rollback için: ROLLBACK;
