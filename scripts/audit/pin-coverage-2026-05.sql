-- ===============================================================
-- PIN COVERAGE AUDIT (Bundle 2 / Task #306 / F36) — READ-ONLY
-- Üretim: 3 May 2026 | Owner: Aslan
-- Amaç: Pilot Day-1 öncesi 176 aktif user'ın PIN kapsama oranını
--       hangi rolün hangi PIN tablosuna ihtiyacı olduğuna göre raporla.
-- HİÇBİR DB WRITE YOK. Çıktı owner kararı için.
-- ===============================================================

-- 1) Genel özet
SELECT
  '=== ÖZET ===' AS section,
  (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND is_active = true) AS aktif_user,
  (SELECT COUNT(DISTINCT user_id) FROM branch_staff_pins WHERE is_active = true) AS branch_pin_unique_user,
  (SELECT COUNT(DISTINCT user_id) FROM factory_staff_pins WHERE is_active = true) AS factory_pin_unique_user;

-- 2) Branch PIN ihtiyacı olan roller × eksik PIN
-- BRANCH_ROLES: stajyer, bar_buddy, barista, supervisor_buddy, supervisor, mudur, sube_kiosk
-- (yatirimci_branch hariç — read-only, kiosk login etmiyor)
WITH branch_pin_users AS (
  SELECT u.id, u.username, COALESCE(u.first_name,'')||' '||COALESCE(u.last_name,'') AS full_name, u.role, u.branch_id
  FROM users u
  WHERE u.deleted_at IS NULL
    AND u.is_active = true
    AND u.role IN ('stajyer','bar_buddy','barista','supervisor_buddy','supervisor','mudur','sube_kiosk')
)
SELECT
  '=== BRANCH PIN EKSİĞİ (rol bazında) ===' AS section,
  bpu.role,
  COUNT(*) AS toplam_user,
  COUNT(bsp.user_id) AS pin_var,
  COUNT(*) - COUNT(bsp.user_id) AS pin_eksik
FROM branch_pin_users bpu
LEFT JOIN branch_staff_pins bsp
  ON bsp.user_id = bpu.id
 AND bsp.branch_id = bpu.branch_id
 AND bsp.is_active = true
GROUP BY bpu.role
ORDER BY pin_eksik DESC;

-- 3) Factory PIN ihtiyacı olan roller × eksik PIN
-- FACTORY_ROLES: fabrika_mudur, uretim_sefi, fabrika_operator, fabrika_sorumlu,
-- fabrika_personel, fabrika_depo, sef, recete_gm, gida_muhendisi, kalite_kontrol
WITH factory_pin_users AS (
  SELECT u.id, u.username, COALESCE(u.first_name,'')||' '||COALESCE(u.last_name,'') AS full_name, u.role
  FROM users u
  WHERE u.deleted_at IS NULL
    AND u.is_active = true
    AND u.role IN ('fabrika_mudur','uretim_sefi','fabrika_operator','fabrika_sorumlu',
                    'fabrika_personel','fabrika_depo','sef','recete_gm',
                    'gida_muhendisi','kalite_kontrol')
)
SELECT
  '=== FACTORY PIN EKSİĞİ (rol bazında) ===' AS section,
  fpu.role,
  COUNT(*) AS toplam_user,
  COUNT(fsp.user_id) AS pin_var,
  COUNT(*) - COUNT(fsp.user_id) AS pin_eksik
FROM factory_pin_users fpu
LEFT JOIN factory_staff_pins fsp
  ON fsp.user_id = fpu.id
 AND fsp.is_active = true
GROUP BY fpu.role
ORDER BY pin_eksik DESC;

-- 4) Eksik branch PIN olan kullanıcı listesi (CSV-ready)
SELECT
  'BRANCH_MISSING' AS pin_type,
  u.id AS user_id,
  u.username,
  COALESCE(u.first_name,'')||' '||COALESCE(u.last_name,'') AS full_name,
  u.role,
  u.branch_id,
  b.name AS branch_name
FROM users u
LEFT JOIN branches b ON b.id = u.branch_id
WHERE u.deleted_at IS NULL
  AND u.is_active = true
  AND u.role IN ('stajyer','bar_buddy','barista','supervisor_buddy','supervisor','mudur','sube_kiosk')
  AND NOT EXISTS (
    SELECT 1 FROM branch_staff_pins bsp
    WHERE bsp.user_id = u.id
      AND bsp.branch_id = u.branch_id
      AND bsp.is_active = true
  )
ORDER BY u.branch_id, u.role, u.username;

-- 5) Eksik factory PIN olan kullanıcı listesi (CSV-ready)
SELECT
  'FACTORY_MISSING' AS pin_type,
  u.id AS user_id,
  u.username,
  COALESCE(u.first_name,'')||' '||COALESCE(u.last_name,'') AS full_name,
  u.role
FROM users u
WHERE u.deleted_at IS NULL
  AND u.is_active = true
  AND u.role IN ('fabrika_mudur','uretim_sefi','fabrika_operator','fabrika_sorumlu',
                  'fabrika_personel','fabrika_depo','sef','recete_gm',
                  'gida_muhendisi','kalite_kontrol')
  AND NOT EXISTS (
    SELECT 1 FROM factory_staff_pins fsp
    WHERE fsp.user_id = u.id
      AND fsp.is_active = true
  )
ORDER BY u.role, u.username;

-- ===============================================================
-- KULLANIM:
--   psql "$DATABASE_URL" -f scripts/audit/pin-coverage-2026-05.sql > docs/security/pin-coverage-2026-05-report.txt
-- SONRAKİ ADIM (ayrı task, Plan mode + isolated agent + backup + GO):
--   - Eksik PIN'lere bcrypt hash + 4-6 haneli random PIN üret
--   - Owner-only kapalı zarf CSV (docs/security/pin-seed-2026-05-PRIVATE.csv)
--   - branch_staff_pins / factory_staff_pins INSERT (branch_id zorunlu, branch role'leri için)
-- ===============================================================
