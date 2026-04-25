-- Task #127: Test hesabını pilot sonrası temizle (test-employee coach kiosk PIN'i)
--
-- Tarih: 23 Nisan 2026
-- Hedef kullanıcı: test-employee (coach), id = 1e189abc-37b2-46f5-90ce-413163a662ea
-- Branch: 23 (HQ)
--
-- İşlemler (idempotent):
--   1) branch_staff_pins.is_active = false  (test-employee'nin HQ kiosk PIN'i)
--   2) users.deleted_at = NOW()             (soft delete)
--   3) Doğrulama: cross-branch HQ-rol aktif PIN sayısı = 0
--
-- Kullanım:
--   psql "$DATABASE_URL" -f scripts/pilot/19-test-employee-cleanup.sql
--
-- Politika referansı: docs/pilot/hq-kiosk-pin-politikasi.md

BEGIN;

-- ─── PRECONDITION: test-employee + HQ branch lookup (Task #214) ────
-- Sabit UUID/branch_id yerine username + branch name lookup
DO $$
DECLARE
  test_user_id   varchar;
  hq_branch_id   integer;
BEGIN
  SELECT id INTO test_user_id FROM users WHERE username = 'test-employee' LIMIT 1;
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'test-employee kullanıcısı bulunamadı (zaten silinmiş olabilir) — script no-op';
    RETURN;
  END IF;

  SELECT id INTO hq_branch_id FROM branches WHERE name = 'Merkez Ofis (HQ)' LIMIT 1;
  IF hq_branch_id IS NULL THEN
    RAISE EXCEPTION 'HQ branch (Merkez Ofis) bulunamadı — script güvenli çalışamaz';
  END IF;

  -- 1) HQ kiosk PIN'ini deaktive et (idempotent)
  UPDATE branch_staff_pins
  SET is_active = false
  WHERE user_id = test_user_id
    AND branch_id = hq_branch_id
    AND is_active = true;

  -- 2) Soft delete (idempotent)
  UPDATE users
  SET deleted_at = NOW()
  WHERE id = test_user_id
    AND deleted_at IS NULL;
END $$;

-- 3) Sonuç durumu (test-employee artık deleted)
SELECT
  u.id,
  u.username,
  u.role,
  u.deleted_at,
  bsp.id   AS pin_id,
  bsp.branch_id AS pin_branch,
  bsp.is_active AS pin_active
FROM users u
LEFT JOIN branch_staff_pins bsp ON bsp.user_id = u.id
WHERE u.username = 'test-employee';

-- 4) Politika doğrulama sorgusu — beklenen: 0 satır
SELECT bsp.branch_id, b.name AS branch_name, u.username, u.role
FROM branch_staff_pins bsp
JOIN users u    ON u.id = bsp.user_id
JOIN branches b ON b.id = bsp.branch_id
WHERE bsp.is_active = true
  AND bsp.branch_id != 23
  AND u.role IN ('admin','ceo','cgo','ceo_observer','muhasebe_ik','satinalma',
                 'kalite_kontrol','marketing','teknik','trainer','coach','destek',
                 'yatirimci_hq');

COMMIT;
