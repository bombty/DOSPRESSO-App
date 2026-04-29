-- ============================================================================
-- DOSPRESSO Kiosk PDKS Phase 1 — PIN Seed + Kiosk Setup COMMIT
-- ============================================================================
-- Tarih:     2026-04-29
-- Actor:     adminhq (18e0cb39-87aa-4862-8f08-f52df6ee01b1)
-- Hedef:     Işıklar (5), Lara (8), HQ (23), Fabrika (24)
-- Modu:      COMMIT (kalıcı uygulama, DELETE değil — INSERT/UPDATE)
--
-- Önkoşul:   Phase 1.5 cleanup tamamlanmış olmalı.
--            Backup'lar mevcut:
--              DB içi:  branch_staff_pins_pre_phase1_20260429 (224)
--                       factory_staff_pins_pre_phase1_20260429 (14)
--                       users_pre_phase1_20260429 (82)
--                       branch_kiosk_settings_pre_phase1_20260429 (7)
--              Dosya:   docs/audit/backups/phase1-pre-seed-backup-20260429-123337.sql
--
-- KAPSAM:
--   1. PRE-GUARD — pre durum doğrulama (uyumsuzsa abort)
--   2. HQ kiosk user oluştur (sube_kiosk + branch_id=23 + username=hqkiosk)
--   3. PIN seed → branch_staff_pins (b5/b8/b23 — 26 yeni satır beklenen)
--   4. PIN seed → factory_staff_pins (b24 — 11 yeni satır beklenen, kiosk hariç)
--   5. Işıklar (b5) kiosk_mode QR → PIN (allow_qr=true KORUNUR, geri dönüşlü)
--   6. users.must_change_password=true (yeni 36 user, kiosk hariç)
--   7. POST-GUARD — beklenen tam sayılarla doğrulama (uyumsuzsa RAISE→ROLLBACK)
--
-- HARİÇ TUTULAN ROL/USER'LAR (V4 doğrulanır):
--   - role IN ('sube_kiosk', 'yatirimci_branch', 'yatirimci_hq',
--              'yatirimci', 'admin', 'super_admin')
--   - is_active = false
--   - deleted_at IS NOT NULL
--   - Fabrika için ayrıca: username = 'fabrika' (kiosk user)
--
-- PIN HASH:
--   bcrypt('0000', cost=10) — initial PIN, kullanıcı 1. girişte değiştirecek.
--   Hash bu dosyaya gömülü (single-shot, çalıştırma anında üretilmedi).
--
-- Geri alma (eğer commit sonrası geri dönmek gerekirse):
--   -- Yeni PIN'leri sil (sadece bugün eklenenler):
--   DELETE FROM branch_staff_pins
--     WHERE created_at >= '2026-04-29 00:00:00' AND branch_id IN (5,8,23);
--   DELETE FROM factory_staff_pins
--     WHERE created_at >= '2026-04-29 00:00:00';
--   -- HQ kiosk user'ı sil:
--   DELETE FROM users WHERE username='hqkiosk';
--   -- Işıklar mod geri al:
--   UPDATE branch_kiosk_settings SET kiosk_mode='qr' WHERE branch_id=5;
--   -- must_change_password geri al:
--   UPDATE users SET must_change_password=false
--     FROM users_pre_phase1_20260429 b
--     WHERE users.id=b.id AND b.must_change_password=false;
--   -- Veya tam restore (pre_phase1 backup tablolarından):
--   UPDATE branch_staff_pins p SET is_active=b.is_active
--     FROM branch_staff_pins_pre_phase1_20260429 b WHERE p.id=b.id;
--   ...
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

\echo ''
\echo '========================================'
\echo '  PRE-SNAPSHOT (transaction içi)'
\echo '========================================'
SELECT 'pre_branch_pins_total'   AS chk, COUNT(*)::text AS val FROM branch_staff_pins
UNION ALL SELECT 'pre_branch_pins_active',  COUNT(*)::text FROM branch_staff_pins WHERE is_active=true
UNION ALL SELECT 'pre_factory_pins_total',  COUNT(*)::text FROM factory_staff_pins
UNION ALL SELECT 'pre_factory_pins_active', COUNT(*)::text FROM factory_staff_pins WHERE is_active=true
UNION ALL SELECT 'pre_users_4branch',       COUNT(*)::text FROM users WHERE branch_id IN (5,8,23,24)
UNION ALL SELECT 'pre_must_change_true',    COUNT(*)::text FROM users WHERE must_change_password = true
UNION ALL SELECT 'pre_kiosk_mode_b5',       kiosk_mode    FROM branch_kiosk_settings WHERE branch_id=5
UNION ALL SELECT 'pre_hqkiosk_exists',      COUNT(*)::text FROM users WHERE username = 'hqkiosk'
ORDER BY 1;

-- ============================================================================
-- (0) PRE-GUARD — Pre durum bekleneni karşılıyor mu? Değilse abort.
-- ============================================================================
DO $$
DECLARE
  pre_branch_active   INT;
  pre_factory_active  INT;
  pre_hqkiosk_exists  INT;
  pre_kiosk_mode_b5   TEXT;
  pre_softdel_active  INT;
BEGIN
  SELECT COUNT(*) INTO pre_branch_active  FROM branch_staff_pins WHERE is_active=true;
  SELECT COUNT(*) INTO pre_factory_active FROM factory_staff_pins WHERE is_active=true;
  SELECT COUNT(*) INTO pre_hqkiosk_exists FROM users WHERE username='hqkiosk';
  SELECT kiosk_mode INTO pre_kiosk_mode_b5 FROM branch_kiosk_settings WHERE branch_id=5;

  SELECT COUNT(*) INTO pre_softdel_active
  FROM (
    SELECT p.id FROM branch_staff_pins p JOIN users u ON u.id=p.user_id
      WHERE p.is_active=true AND (u.deleted_at IS NOT NULL OR u.is_active=false)
    UNION ALL
    SELECT p.id FROM factory_staff_pins p JOIN users u ON u.id=p.user_id
      WHERE p.is_active=true AND (u.deleted_at IS NOT NULL OR u.is_active=false)
  ) x;

  RAISE NOTICE 'PRE-GUARD: branch_active=% (5), factory_active=% (2), hqkiosk_exists=% (0), kiosk_mode_b5=% (qr), softdel_active=% (0)',
    pre_branch_active, pre_factory_active, pre_hqkiosk_exists, pre_kiosk_mode_b5, pre_softdel_active;

  IF pre_branch_active != 5 THEN
    RAISE EXCEPTION 'PRE-GUARD FAIL: branch_active=% beklenen 5 (Phase 1.5 cleanup eksik)', pre_branch_active;
  END IF;
  IF pre_factory_active != 2 THEN
    RAISE EXCEPTION 'PRE-GUARD FAIL: factory_active=% beklenen 2', pre_factory_active;
  END IF;
  IF pre_hqkiosk_exists != 0 THEN
    RAISE EXCEPTION 'PRE-GUARD FAIL: hqkiosk zaten var (% adet)', pre_hqkiosk_exists;
  END IF;
  IF pre_kiosk_mode_b5 IS DISTINCT FROM 'qr' THEN
    RAISE EXCEPTION 'PRE-GUARD FAIL: kiosk_mode_b5=% beklenen qr', pre_kiosk_mode_b5;
  END IF;
  IF pre_softdel_active != 0 THEN
    RAISE EXCEPTION 'PRE-GUARD FAIL: soft-deleted/inactive aktif PIN kalmış (%)', pre_softdel_active;
  END IF;

  RAISE NOTICE 'PRE-GUARD PASS: tüm pre durum kontrolleri geçti.';
END $$;

-- ============================================================================
-- (1) HQ KIOSK USER OLUŞTUR
-- ============================================================================
INSERT INTO users (
  id, username, hashed_password, first_name, last_name,
  role, branch_id, is_active, must_change_password,
  account_status, created_at, updated_at, approved_by, approved_at
) VALUES (
  gen_random_uuid()::text,
  'hqkiosk',
  '$2b$10$tG6h8YNozBL7lT0scQGdjeod6ba4yNS4CQQ5xs8Bk3FS14OQ17042',
  'HQ', 'Kiosk',
  'sube_kiosk', 23, true, false,
  'active',
  now(), now(),
  '18e0cb39-87aa-4862-8f08-f52df6ee01b1',
  now()
);

\echo ''
\echo '(1) HQ kiosk user — INSERT yapıldı'

-- ============================================================================
-- (2) PIN SEED — branch_staff_pins (b5, b8, b23)
-- ============================================================================
INSERT INTO branch_staff_pins (user_id, branch_id, hashed_pin, is_active, created_at, updated_at)
SELECT u.id, u.branch_id,
       '$2b$10$tG6h8YNozBL7lT0scQGdjeod6ba4yNS4CQQ5xs8Bk3FS14OQ17042',
       true, now(), now()
FROM users u
WHERE u.branch_id IN (5, 8, 23)
  AND u.is_active = true
  AND u.deleted_at IS NULL
  AND u.role NOT IN (
    'sube_kiosk', 'yatirimci_branch', 'yatirimci_hq',
    'yatirimci', 'admin', 'super_admin'
  )
ON CONFLICT (user_id, branch_id) DO NOTHING;

\echo ''
\echo '(2) branch_staff_pins INSERT yapıldı'

-- ============================================================================
-- (3) PIN SEED — factory_staff_pins (b24, kiosk user hariç)
-- ============================================================================
INSERT INTO factory_staff_pins (user_id, hashed_pin, is_active, created_at, updated_at)
SELECT u.id,
       '$2b$10$tG6h8YNozBL7lT0scQGdjeod6ba4yNS4CQQ5xs8Bk3FS14OQ17042',
       true, now(), now()
FROM users u
WHERE u.branch_id = 24
  AND u.is_active = true
  AND u.deleted_at IS NULL
  AND u.username != 'fabrika'
  AND u.role NOT IN ('admin', 'super_admin')
ON CONFLICT (user_id) DO NOTHING;

\echo ''
\echo '(3) factory_staff_pins INSERT yapıldı'

-- ============================================================================
-- (4) IŞIKLAR (b5) KIOSK MODE: QR → PIN
-- ============================================================================
UPDATE branch_kiosk_settings
SET kiosk_mode = 'pin',
    updated_at = now()
WHERE branch_id = 5
  AND kiosk_mode = 'qr';

\echo ''
\echo '(4) Işıklar (b5) kiosk_mode → pin'

-- ============================================================================
-- (5) must_change_password = true (yeni 36 user, kiosk hariç)
-- ============================================================================
UPDATE users
SET must_change_password = true,
    updated_at = now()
WHERE created_at >= '2026-04-28 21:54:00'
  AND must_change_password = false
  AND role != 'sube_kiosk';

\echo ''
\echo '(5) must_change_password=true UPDATE'

-- ============================================================================
-- (6) POST-GUARD — Beklenen tam sayılar uyumlu mu? Değilse RAISE→ROLLBACK
-- ============================================================================
DO $$
DECLARE
  post_branch_active     INT;
  post_factory_active    INT;
  post_hqkiosk_count     INT;
  post_hqkiosk_role      TEXT;
  post_hqkiosk_branch    INT;
  post_kiosk_mode_b5     TEXT;
  post_softdel_active    INT;
  post_kiosk_in_pins     INT;
  post_keep_branch_count INT;
  post_keep_factory_count INT;
  post_must_change_36    INT;
BEGIN
  SELECT COUNT(*) INTO post_branch_active  FROM branch_staff_pins WHERE is_active=true;
  SELECT COUNT(*) INTO post_factory_active FROM factory_staff_pins WHERE is_active=true;
  SELECT COUNT(*), MAX(role), MAX(branch_id)
    INTO post_hqkiosk_count, post_hqkiosk_role, post_hqkiosk_branch
    FROM users WHERE username='hqkiosk';
  SELECT kiosk_mode INTO post_kiosk_mode_b5
    FROM branch_kiosk_settings WHERE branch_id=5;

  -- Soft-deleted/inactive aktif PIN'i (0 olmalı)
  SELECT COUNT(*) INTO post_softdel_active
  FROM (
    SELECT p.id FROM branch_staff_pins p JOIN users u ON u.id=p.user_id
      WHERE p.is_active=true AND (u.deleted_at IS NOT NULL OR u.is_active=false)
    UNION ALL
    SELECT p.id FROM factory_staff_pins p JOIN users u ON u.id=p.user_id
      WHERE p.is_active=true AND (u.deleted_at IS NOT NULL OR u.is_active=false)
  ) x;

  -- Kiosk/yatırımcı/admin aktif PIN'i (0 olmalı, hqkiosk dahil!)
  SELECT COUNT(*) INTO post_kiosk_in_pins
  FROM (
    SELECT p.id FROM branch_staff_pins p JOIN users u ON u.id=p.user_id
      WHERE p.is_active=true
        AND (u.role IN ('sube_kiosk','yatirimci_branch','yatirimci_hq','yatirimci','admin','super_admin')
             OR u.username='fabrika')
    UNION ALL
    SELECT p.id FROM factory_staff_pins p JOIN users u ON u.id=p.user_id
      WHERE p.is_active=true
        AND (u.username='fabrika' OR u.role IN ('admin','super_admin','sube_kiosk','yatirimci_branch','yatirimci_hq','yatirimci'))
  ) x;

  -- Korunan eski 7 PIN aktif mi?
  SELECT COUNT(*) INTO post_keep_branch_count
    FROM branch_staff_pins p JOIN users u ON u.id=p.user_id
    WHERE p.is_active=true
      AND u.username IN ('mudur5','laramudur','RGM','Umit','atiyekar0706');

  SELECT COUNT(*) INTO post_keep_factory_count
    FROM factory_staff_pins p JOIN users u ON u.id=p.user_id
    WHERE p.is_active=true
      AND u.username IN ('eren','atiyekar0706');

  -- must_change_password=true sayısı (created_at >= marker, kiosk hariç)
  SELECT COUNT(*) INTO post_must_change_36
    FROM users
    WHERE created_at >= '2026-04-28 21:54:00'
      AND must_change_password = true
      AND role != 'sube_kiosk';

  RAISE NOTICE 'POST-GUARD: branch_active=% (31), factory_active=% (13)',
    post_branch_active, post_factory_active;
  RAISE NOTICE 'POST-GUARD: hqkiosk_count=% (1), role=% (sube_kiosk), branch=% (23)',
    post_hqkiosk_count, post_hqkiosk_role, post_hqkiosk_branch;
  RAISE NOTICE 'POST-GUARD: kiosk_mode_b5=% (pin)', post_kiosk_mode_b5;
  RAISE NOTICE 'POST-GUARD: softdel_active=% (0), kiosk_in_pins=% (0)',
    post_softdel_active, post_kiosk_in_pins;
  RAISE NOTICE 'POST-GUARD: keep_branch=% (5), keep_factory=% (2)',
    post_keep_branch_count, post_keep_factory_count;
  RAISE NOTICE 'POST-GUARD: must_change_marker=% (36)', post_must_change_36;

  IF post_branch_active != 31 THEN
    RAISE EXCEPTION 'POST-GUARD FAIL: branch_active=% beklenen 31 (5+26)', post_branch_active;
  END IF;
  IF post_factory_active != 13 THEN
    RAISE EXCEPTION 'POST-GUARD FAIL: factory_active=% beklenen 13 (2+11)', post_factory_active;
  END IF;
  IF post_hqkiosk_count != 1 THEN
    RAISE EXCEPTION 'POST-GUARD FAIL: hqkiosk_count=% beklenen 1', post_hqkiosk_count;
  END IF;
  IF post_hqkiosk_role IS DISTINCT FROM 'sube_kiosk' THEN
    RAISE EXCEPTION 'POST-GUARD FAIL: hqkiosk role=% beklenen sube_kiosk', post_hqkiosk_role;
  END IF;
  IF post_hqkiosk_branch IS DISTINCT FROM 23 THEN
    RAISE EXCEPTION 'POST-GUARD FAIL: hqkiosk branch=% beklenen 23', post_hqkiosk_branch;
  END IF;
  IF post_kiosk_mode_b5 IS DISTINCT FROM 'pin' THEN
    RAISE EXCEPTION 'POST-GUARD FAIL: kiosk_mode_b5=% beklenen pin', post_kiosk_mode_b5;
  END IF;
  IF post_softdel_active != 0 THEN
    RAISE EXCEPTION 'POST-GUARD FAIL: softdel/inactive aktif PIN kaldı (%)', post_softdel_active;
  END IF;
  IF post_kiosk_in_pins != 0 THEN
    RAISE EXCEPTION 'POST-GUARD FAIL: kiosk/yatırımcı/admin aktif PIN var (%)', post_kiosk_in_pins;
  END IF;
  IF post_keep_branch_count != 5 THEN
    RAISE EXCEPTION 'POST-GUARD FAIL: korunan branch PIN sayısı=% beklenen 5', post_keep_branch_count;
  END IF;
  IF post_keep_factory_count != 2 THEN
    RAISE EXCEPTION 'POST-GUARD FAIL: korunan factory PIN sayısı=% beklenen 2', post_keep_factory_count;
  END IF;
  IF post_must_change_36 != 36 THEN
    RAISE EXCEPTION 'POST-GUARD FAIL: must_change_password=true sayısı=% beklenen 36', post_must_change_36;
  END IF;

  RAISE NOTICE 'POST-GUARD PASS: 11 kontrol geçti, COMMIT için güvenli.';
END $$;

-- ============================================================================
-- VERIFICATION SELECTS — V1...V7 (kayıt için)
-- ============================================================================

\echo ''
\echo '========================================'
\echo '  V1: PIN dağılımı (branch + factory)'
\echo '========================================'
SELECT 'V1_branch_per_branch' AS chk, branch_id::text AS branch, COUNT(*)::text AS aktif_pin
FROM branch_staff_pins WHERE is_active=true
GROUP BY branch_id
UNION ALL SELECT 'V1_factory_total', '24', COUNT(*)::text FROM factory_staff_pins WHERE is_active=true
ORDER BY 1, 2;

\echo ''
\echo '========================================'
\echo '  V2: 4 birim kiosk settings'
\echo '========================================'
SELECT branch_id, kiosk_mode, allow_pin, allow_qr, is_kiosk_enabled,
       default_shift_start_time AS shift_start, default_shift_end_time AS shift_end,
       late_tolerance_minutes AS late_tol
FROM branch_kiosk_settings
WHERE branch_id IN (5,8,23,24)
ORDER BY branch_id;

\echo ''
\echo '========================================'
\echo '  V3: HQ kiosk user'
\echo '========================================'
SELECT username, role, branch_id, is_active, account_status, must_change_password
FROM users WHERE username='hqkiosk';

\echo ''
\echo '========================================'
\echo '  V4: Korunan eski 7 PIN'
\echo '========================================'
SELECT 'V4_branch' AS chk, u.username, u.role, p.branch_id::text AS branch, p.is_active::text AS aktif
FROM branch_staff_pins p JOIN users u ON u.id=p.user_id
WHERE u.username IN ('mudur5','laramudur','RGM','Umit','atiyekar0706')
ORDER BY u.username, p.branch_id;

SELECT 'V4_factory' AS chk, u.username, u.role, p.is_active::text AS aktif
FROM factory_staff_pins p JOIN users u ON u.id=p.user_id
WHERE u.username IN ('eren','atiyekar0706')
ORDER BY u.username;

\echo ''
\echo '========================================'
\echo '  V5: Yeni PIN sahipleri (özet, ilk 5+5)'
\echo '========================================'
SELECT 'V5_branch_new' AS chk, u.username, u.role, p.branch_id::text AS branch
FROM branch_staff_pins p JOIN users u ON u.id=p.user_id
WHERE p.created_at >= '2026-04-29 00:00:00'
ORDER BY p.branch_id, u.username
LIMIT 30;

SELECT 'V5_factory_new' AS chk, u.username, u.role
FROM factory_staff_pins p JOIN users u ON u.id=p.user_id
WHERE p.created_at >= '2026-04-29 00:00:00'
ORDER BY u.username;

\echo ''
\echo '========================================'
\echo '  V6: Yasaklı rol/user PIN almadı (0 olmalı)'
\echo '========================================'
SELECT 'V6_kiosk_yatirimci_admin' AS chk, COUNT(*)::text AS olmamali_0
FROM (
  SELECT p.id FROM branch_staff_pins p JOIN users u ON u.id=p.user_id
    WHERE p.is_active=true
      AND (u.role IN ('sube_kiosk','yatirimci_branch','yatirimci_hq','yatirimci','admin','super_admin')
           OR u.username='fabrika')
  UNION ALL
  SELECT p.id FROM factory_staff_pins p JOIN users u ON u.id=p.user_id
    WHERE p.is_active=true
      AND (u.username='fabrika' OR u.role IN ('admin','super_admin','sube_kiosk'))
) x;

\echo ''
\echo '========================================'
\echo '  V7: must_change_password durumu'
\echo '========================================'
SELECT
  CASE WHEN must_change_password THEN 'must_change=true' ELSE 'must_change=false' END AS chk,
  COUNT(*) AS adet,
  string_agg(DISTINCT role, ',' ORDER BY role) AS roles
FROM users
WHERE created_at >= '2026-04-28 21:54:00'
GROUP BY must_change_password
ORDER BY 1;

\echo ''
\echo '========================================'
\echo '  POST-SNAPSHOT'
\echo '========================================'
SELECT 'post_branch_pins_total'   AS chk, COUNT(*)::text AS val FROM branch_staff_pins
UNION ALL SELECT 'post_branch_pins_active',  COUNT(*)::text FROM branch_staff_pins WHERE is_active=true
UNION ALL SELECT 'post_factory_pins_total',  COUNT(*)::text FROM factory_staff_pins
UNION ALL SELECT 'post_factory_pins_active', COUNT(*)::text FROM factory_staff_pins WHERE is_active=true
UNION ALL SELECT 'post_users_4branch',       COUNT(*)::text FROM users WHERE branch_id IN (5,8,23,24)
UNION ALL SELECT 'post_must_change_true',    COUNT(*)::text FROM users WHERE must_change_password = true
UNION ALL SELECT 'post_kiosk_mode_b5',       kiosk_mode    FROM branch_kiosk_settings WHERE branch_id=5
UNION ALL SELECT 'post_hqkiosk_exists',      COUNT(*)::text FROM users WHERE username = 'hqkiosk'
ORDER BY 1;

COMMIT;

\echo ''
\echo '✅ COMMIT TAMAMLANDI — DB değişiklikleri kalıcı.'
\echo ''
\echo 'PIN: 0000 (tüm yeni 37 + hqkiosk için bcrypt hash gömülü)'
\echo 'Kullanıcılar 1. girişte PIN/şifre değiştirmek zorunda (must_change_password=true).'
