-- =====================================================================
-- O13 — Pilot 4 Lokasyon Branch Onboarding Bypass
-- Pazartesi 28 Nis 2026, 08:00-10:00 (2 saat)
-- =====================================================================
-- AMAÇ: Pilot 4 lokasyonun (HQ + FAB + ISI + LAR) onboarding wizard
--       atlamaları için setup_complete=true atama.
-- ETKİ: Müdürler login'de wizard görmeyecek, doğrudan dashboard'a girecek.
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- ADIM 1: Mevcut durum tespit
-- ─────────────────────────────────────────────────────────────────────
SELECT id, code, name, setup_complete, deleted_at
FROM branches
WHERE code IN ('HQ', 'FAB', 'ISI', 'LAR')
ORDER BY code;
-- Beklenen: 4 satır, hepsi setup_complete=false

-- ─────────────────────────────────────────────────────────────────────
-- ADIM 2: setup_complete=true atama
-- ─────────────────────────────────────────────────────────────────────
UPDATE branches
SET setup_complete = true,
    updated_at = NOW()
WHERE code IN ('HQ', 'FAB', 'ISI', 'LAR')
  AND deleted_at IS NULL
  AND setup_complete = false;

-- ─────────────────────────────────────────────────────────────────────
-- ADIM 3: Audit log
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO audit_logs (user_id, action, target_type, target_id, details, created_at)
SELECT
  (SELECT id FROM users WHERE username = 'adminhq' LIMIT 1),
  'O13_BRANCH_SETUP_BYPASS',
  'branches',
  b.id::text,
  jsonb_build_object(
    'code', b.code,
    'name', b.name,
    'reason', 'Pilot 4 lokasyon onboarding bypass — pilot başlangıç hızlandırma'
  ),
  NOW()
FROM branches b
WHERE b.code IN ('HQ', 'FAB', 'ISI', 'LAR');

-- ─────────────────────────────────────────────────────────────────────
-- ADIM 4: İlgili modül aktivasyon checklist'leri "completed" işaretle
-- ─────────────────────────────────────────────────────────────────────
-- Eğer module_activation_checklist tablosu varsa
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'module_activation_checklist') THEN
    UPDATE module_activation_checklist
    SET completed = true,
        completed_at = NOW(),
        completed_by = (SELECT id FROM users WHERE username = 'adminhq' LIMIT 1)
    WHERE branch_id IN (
      SELECT id FROM branches WHERE code IN ('HQ', 'FAB', 'ISI', 'LAR')
    )
    AND completed = false;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- DOĞRULAMA
-- ─────────────────────────────────────────────────────────────────────
SELECT id, code, name, setup_complete, updated_at
FROM branches
WHERE code IN ('HQ', 'FAB', 'ISI', 'LAR')
ORDER BY code;
-- Beklenen: 4 satır, setup_complete=true, updated_at=bugün

-- Şube müdürlerinin onboarding wizard görmeyeceğini doğrula
SELECT u.username, u.role, b.code, b.setup_complete
FROM users u
JOIN branches b ON b.id = u.branch_id
WHERE b.code IN ('HQ', 'FAB', 'ISI', 'LAR')
  AND u.role IN ('mudur', 'supervisor', 'fabrika_mudur')
ORDER BY b.code, u.role;

COMMIT;
-- Rollback için: ROLLBACK;
