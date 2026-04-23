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

-- 1) HQ (branch 23) PIN'ini deaktive et (idempotent: zaten false ise no-op)
--    Kapsam: sadece HQ branch'i; başka şubelerde aktif PIN varsa ayrı bir
--    karar konusu olur (politika gereği HQ user'ın diğer şubelerde PIN'i
--    olmamalıdır; varsa ilgili task ile temizlenir).
UPDATE branch_staff_pins
SET is_active = false
WHERE user_id = '1e189abc-37b2-46f5-90ce-413163a662ea'
  AND branch_id = 23
  AND is_active = true;

-- 2) Soft delete (idempotent: zaten silinmişse dokunma)
UPDATE users
SET deleted_at = NOW()
WHERE id = '1e189abc-37b2-46f5-90ce-413163a662ea'
  AND deleted_at IS NULL;

-- 3) Sonuç durumu
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
WHERE u.id = '1e189abc-37b2-46f5-90ce-413163a662ea';

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
