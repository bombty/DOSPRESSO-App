-- ============================================================================
-- DOSPRESSO Kiosk PDKS Phase 1 — PIN Seed + Kiosk Setup PREVIEW
-- ============================================================================
-- Tarih:     2026-04-28
-- Actor:     adminhq (18e0cb39-87aa-4862-8f08-f52df6ee01b1)
-- Hedef:     Işıklar (5), Lara (8), HQ (23), Fabrika (24)
-- Modu:      ROLLBACK ONLY — bu dosya kalıcı yazma yapmaz.
--            COMMIT için ayrı bir _COMMIT.sql oluşturulup actor onayı alınır.
-- Placeholder:
--   :BCRYPT_0000_PIN  — bcrypt('0000', 10) hash. Çalıştırma öncesi sed ile değişir.
-- ============================================================================
-- KAPSAM:
--   1. HQ kiosk user oluştur (sube_kiosk role + branch_id=23 + username=hqkiosk)
--   2. PIN seed → branch_staff_pins (b5, b8, b23 — 26 yeni satır)
--   3. PIN seed → factory_staff_pins (b24 — 11 yeni satır, kiosk hariç)
--   4. Işıklar (b5) kiosk_mode QR → PIN (allow_qr=true KORUNUR, geri dönüşlü)
--   5. users.must_change_password=true (yeni 36 user, kiosk hariç)
-- ============================================================================
-- HARİÇ TUTULAN ROL/USER'LAR (V6 doğrulanır):
--   - role IN ('sube_kiosk', 'yatirimci_branch', 'yatirimci_hq',
--              'yatirimci', 'admin', 'super_admin')
--   - is_active = false
--   - deleted_at IS NOT NULL
--   - Fabrika için ayrıca: username = 'fabrika' (kiosk user)
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

\echo ''
\echo '========================================'
\echo '  PRE-SNAPSHOT (transaction içi)'
\echo '========================================'
SELECT 'pre_branch_pins_total'  AS chk, COUNT(*)::text AS val FROM branch_staff_pins
UNION ALL SELECT 'pre_factory_pins_total', COUNT(*)::text FROM factory_staff_pins
UNION ALL SELECT 'pre_users_4branch',      COUNT(*)::text FROM users WHERE branch_id IN (5,8,23,24)
UNION ALL SELECT 'pre_must_change_true',   COUNT(*)::text FROM users WHERE must_change_password = true
UNION ALL SELECT 'pre_kiosk_mode_b5',      kiosk_mode    FROM branch_kiosk_settings WHERE branch_id=5
UNION ALL SELECT 'pre_hqkiosk_exists',     COUNT(*)::text FROM users WHERE username = 'hqkiosk'
;

-- ============================================================================
-- (1) HQ KIOSK USER OLUŞTUR
-- ============================================================================
-- Sistem'de hq_kiosk rolü yok → sube_kiosk + branch_id=23 ile oluşturuluyor.
-- account_status='active', cihaz hesabı (gerçek kişi değil).
-- ID: gen_random_uuid()::text (users.id varchar tipinde — "PRESERVE existing ID type").
-- ON CONFLICT (username) → idempotent (daha önce oluşturulmuşsa skip).

INSERT INTO users (
  id, username, hashed_password, first_name, last_name,
  role, branch_id, is_active, must_change_password,
  account_status, created_at, updated_at, approved_by, approved_at
) VALUES (
  gen_random_uuid()::text,
  'hqkiosk',
  ':BCRYPT_0000_PIN',
  'HQ', 'Kiosk',
  'sube_kiosk', 23, true, false,
  'active',
  now(), now(),
  '18e0cb39-87aa-4862-8f08-f52df6ee01b1',
  now()
);

\echo ''
\echo '========================================'
\echo '  (1) HQ kiosk user — INSERT yapıldı'
\echo '========================================'

-- ============================================================================
-- (2) PIN SEED — branch_staff_pins (b5, b8, b23)
-- ============================================================================
-- Tek INSERT-SELECT, tüm 3 şube birlikte. Kiosk/yatırımcı/admin/soft-del hariç.
-- ON CONFLICT (user_id, branch_id) DO NOTHING → idempotent.
-- Mevcut PIN'i olan user'lar (mudur5, laramudur, vb.) ATLANIR — şifre değiştirilmez.

INSERT INTO branch_staff_pins (user_id, branch_id, hashed_pin, is_active, created_at, updated_at)
SELECT u.id, u.branch_id, ':BCRYPT_0000_PIN', true, now(), now()
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
\echo '========================================'
\echo '  (2) branch_staff_pins INSERT yapıldı'
\echo '========================================'

-- ============================================================================
-- (3) PIN SEED — factory_staff_pins (b24, kiosk user hariç!)
-- ============================================================================
-- factory_staff_pins.user_id UNIQUE → ON CONFLICT (user_id) DO NOTHING.
-- Mevcut PIN'i olan user'lar (eren, atiyekar0706, fabrika) ATLANIR.
-- username='fabrika' explicit hariç (kiosk user, her ihtimale karşı).

INSERT INTO factory_staff_pins (user_id, hashed_pin, is_active, created_at, updated_at)
SELECT u.id, ':BCRYPT_0000_PIN', true, now(), now()
FROM users u
WHERE u.branch_id = 24
  AND u.is_active = true
  AND u.deleted_at IS NULL
  AND u.username != 'fabrika'
  AND u.role NOT IN ('admin', 'super_admin')
ON CONFLICT (user_id) DO NOTHING;

\echo ''
\echo '========================================'
\echo '  (3) factory_staff_pins INSERT yapıldı'
\echo '========================================'

-- ============================================================================
-- (4) IŞIKLAR (b5) KIOSK MODE: QR → PIN (allow_qr=true KORUNUR)
-- ============================================================================
-- WHERE kiosk_mode='qr' → idempotent (zaten 'pin' ise no-op).
-- allow_qr=true bırakılır → QR'a geri dönmek için tek satır UPDATE yeterli.

UPDATE branch_kiosk_settings
SET kiosk_mode = 'pin',
    updated_at = now()
WHERE branch_id = 5
  AND kiosk_mode = 'qr';

\echo ''
\echo '========================================'
\echo '  (4) Işıklar (b5) kiosk_mode → pin'
\echo '========================================'

-- ============================================================================
-- (5) must_change_password = true (yeni 36 user, kiosk hariç)
-- ============================================================================
-- Phase 1'de eklenen yeni user'lar 10. günde PIN/şifre değiştirmek zorunda.
-- created_at >= '2026-04-28 21:54:00' (Phase 1 import marker)
-- role != 'sube_kiosk' (kiosk hesabı şifre değiştirmek zorunda değil)

UPDATE users
SET must_change_password = true,
    updated_at = now()
WHERE created_at >= '2026-04-28 21:54:00'
  AND must_change_password = false
  AND role != 'sube_kiosk';

\echo ''
\echo '========================================'
\echo '  (5) must_change_password=true UPDATE'
\echo '========================================'

-- ============================================================================
-- ============================================================================
-- VERIFICATION SELECTS — V1...V6
-- ============================================================================
-- ============================================================================

\echo ''
\echo '========================================'
\echo '  V1: PIN eklenecek/eklenen kişi sayısı'
\echo '========================================'
SELECT 'V1a_branch_pins_per_branch' AS chk, branch_id::text AS branch, COUNT(*)::text AS pin_count
FROM branch_staff_pins
WHERE branch_id IN (5,8,23)
GROUP BY branch_id
UNION ALL
SELECT 'V1b_factory_pins_total', '24', COUNT(*)::text FROM factory_staff_pins
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
\echo '  V3: HQ kiosk user oluştu mu'
\echo '========================================'
SELECT id, username, role, branch_id, is_active, account_status,
       must_change_password, created_at::date AS created
FROM users
WHERE username = 'hqkiosk';

\echo ''
\echo '========================================'
\echo '  V4: Kiosk/yatırımcı/admin PIN listesinde KARIŞMADI mı (0 olmalı)'
\echo '========================================'
-- V4a: branch_staff_pins'te kiosk/yatırımcı/admin role var mı (0 olmalı)
SELECT 'V4a_branch_pins_kiosk_yatirimci' AS chk, COUNT(*)::text AS olmamali_0
FROM branch_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE u.role IN (
  'sube_kiosk', 'yatirimci_branch', 'yatirimci_hq',
  'yatirimci', 'admin', 'super_admin'
)
UNION ALL
-- V4b: factory_staff_pins'te yeni kayıt eklenirken kiosk user (fabrika) hariç tutuldu mu
-- Mevcut DB'de fabrika user'ın PIN'i ZATEN VAR (Phase 1 öncesi). Bu sayım PRE-EXISTING.
-- Beklenen: 1 (mevcut), preview yeni 0 ekledi.
SELECT 'V4b_factory_pins_kiosk_fabrika', COUNT(*)::text
FROM factory_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'fabrika'
UNION ALL
-- V4c: factory_staff_pins'te admin/super_admin (0 olmalı)
SELECT 'V4c_factory_pins_admin', COUNT(*)::text
FROM factory_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE u.role IN ('admin', 'super_admin');

\echo ''
\echo '========================================'
\echo '  V5: PIN tablo dağılımı (toplam vs delta)'
\echo '========================================'
SELECT 'V5_branch_staff_pins_total' AS chk, COUNT(*)::text AS val FROM branch_staff_pins
UNION ALL SELECT 'V5_factory_staff_pins_total', COUNT(*)::text FROM factory_staff_pins
UNION ALL SELECT 'V5_branch_pins_b5',  COUNT(*)::text FROM branch_staff_pins WHERE branch_id=5
UNION ALL SELECT 'V5_branch_pins_b8',  COUNT(*)::text FROM branch_staff_pins WHERE branch_id=8
UNION ALL SELECT 'V5_branch_pins_b23', COUNT(*)::text FROM branch_staff_pins WHERE branch_id=23
;

\echo ''
\echo '========================================'
\echo '  V6: Soft-deleted/inactive PIN listesinde mi (0 olmalı)'
\echo '========================================'
SELECT 'V6a_branch_pins_softdel_or_inactive' AS chk, COUNT(*)::text AS olmamali_0
FROM branch_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE u.deleted_at IS NOT NULL OR u.is_active = false
UNION ALL
SELECT 'V6b_factory_pins_softdel_or_inactive', COUNT(*)::text
FROM factory_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE u.deleted_at IS NOT NULL OR u.is_active = false
;

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
\echo '  POST-SNAPSHOT (rollback öncesi son durum)'
\echo '========================================'
SELECT 'post_branch_pins_total'  AS chk, COUNT(*)::text AS val FROM branch_staff_pins
UNION ALL SELECT 'post_factory_pins_total', COUNT(*)::text FROM factory_staff_pins
UNION ALL SELECT 'post_users_4branch',      COUNT(*)::text FROM users WHERE branch_id IN (5,8,23,24)
UNION ALL SELECT 'post_must_change_true',   COUNT(*)::text FROM users WHERE must_change_password = true
UNION ALL SELECT 'post_kiosk_mode_b5',      kiosk_mode    FROM branch_kiosk_settings WHERE branch_id=5
UNION ALL SELECT 'post_hqkiosk_exists',     COUNT(*)::text FROM users WHERE username = 'hqkiosk'
;

\echo ''
\echo '========================================'
\echo '  ROLLBACK — DB değişikliği YAPILMAZ'
\echo '========================================'

ROLLBACK;

\echo ''
\echo 'ROLLBACK OK — gerçek COMMIT için actor onayı gerekli.'
