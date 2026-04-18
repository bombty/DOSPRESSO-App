-- =====================================================================
-- F01 ROLLBACK — Module Flags Pilot Toggle Geri Alma
-- ACİL DURUM: 01-f01-module-flags-toggle.sql uygulandıktan sonra
-- smoke test başarısız olursa veya pilot yarıda kesilirse çalıştır.
-- =====================================================================
-- KULLANIM:
--   psql "$DATABASE_URL" < scripts/pilot/01-f01-rollback.sql
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- Bölüm A Rollback: 3 modülü tekrar KAPAT
-- ─────────────────────────────────────────────────────────────────────
UPDATE module_flags
SET is_enabled = false,
    disabled_at = NOW(),
    disabled_by = 'rollback_2026_04_28',
    enabled_at = NULL,
    enabled_by = NULL,
    updated_at = NOW()
WHERE scope = 'global'
  AND module_key IN ('delegasyon', 'iletisim_merkezi', 'dobody.flow')
  AND deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- Doğrulama
-- ─────────────────────────────────────────────────────────────────────
SELECT module_key, is_enabled, disabled_by, disabled_at
FROM module_flags
WHERE scope = 'global'
  AND module_key IN ('delegasyon', 'iletisim_merkezi', 'dobody.flow');
-- Beklenen: 3 satır, hepsi is_enabled=false

-- ─────────────────────────────────────────────────────────────────────
-- AUDIT LOG
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO audit_logs (user_id, action, target_type, target_id, details, created_at)
VALUES (
  (SELECT id FROM users WHERE username = 'adminhq' LIMIT 1),
  'F01_ROLLBACK_EXECUTED',
  'module_flags',
  'multiple',
  jsonb_build_object(
    'rolled_back_modules', ARRAY['delegasyon', 'iletisim_merkezi', 'dobody.flow'],
    'reason', 'Pilot smoke test failure veya manuel iptal'
  ),
  NOW()
);

COMMIT;

-- =====================================================================
-- NOT: Bu rollback SADECE F01 (3 enable) için.
-- F02 fabrika.* migration ayrı dosyada — onun rollback'i:
--   scripts/pilot/02-f02-fabrika-naming-rollback.sql
-- =====================================================================
