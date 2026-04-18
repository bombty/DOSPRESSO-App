-- =====================================================================
-- F02 ROLLBACK — Fabrika Naming Migration Geri Alma
-- =====================================================================

BEGIN;

-- 3 soft-deleted modülü geri restore et
UPDATE module_flags
SET deleted_at = NULL,
    updated_at = NOW()
WHERE scope = 'global'
  AND module_key IN ('fabrika.kalite', 'fabrika.kavurma', 'fabrika.sevkiyat')
  AND deleted_at IS NOT NULL;

-- fabrika.stok'u tekrar disabled yap
UPDATE module_flags
SET is_enabled = false,
    disabled_at = NOW(),
    disabled_by = 'rollback_2026_04_28',
    enabled_at = NULL,
    enabled_by = NULL,
    updated_at = NOW()
WHERE scope = 'global'
  AND module_key = 'fabrika.stok'
  AND deleted_at IS NULL;

-- Audit
INSERT INTO audit_logs (user_id, action, target_type, target_id, details, created_at)
VALUES (
  (SELECT id FROM users WHERE username = 'adminhq' LIMIT 1),
  'F02_ROLLBACK_EXECUTED',
  'module_flags',
  'multiple',
  jsonb_build_object('reason', 'Pilot smoke test failure veya manuel iptal'),
  NOW()
);

-- Doğrulama
SELECT module_key, is_enabled, deleted_at
FROM module_flags
WHERE scope = 'global' AND module_key LIKE 'fabrika%'
ORDER BY module_key;

COMMIT;
