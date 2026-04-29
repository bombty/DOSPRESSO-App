-- ============================================================================
-- DOSPRESSO Kiosk PDKS Phase 1.5 — Eski PIN Cleanup PREVIEW
-- ============================================================================
-- Tarih:     2026-04-28
-- Actor:     adminhq (18e0cb39-87aa-4862-8f08-f52df6ee01b1)
-- Hedef:     Mevcut 224+14 PIN içinde eski/inactive/soft-del/kiosk PIN'leri pasifleştir
-- Modu:      ROLLBACK ONLY — DELETE yerine UPDATE is_active=false
--
-- KAPSAM:
--   1) branch_staff_pins → 219 satır pasifleştirilecek (224 toplam)
--      - 30 satır: deleted_at IS NOT NULL (soft-del user)
--      - 181 satır: is_active=false (eski/işten ayrılmış user)
--      - 7 satır:   role IN (sube_kiosk, yatırımcı, admin, ceo, cgo)
--      - 1 satır:   username='fabrika' (fabrika kiosk user, b24'te de PIN'i var)
--      - KORUNAN 5 satır: mudur5, laramudur, RGM, Umit, atiyekar0706
--   2) factory_staff_pins → 12 satır pasifleştirilecek (14 toplam)
--      - 11 satır: deleted_at IS NOT NULL (soft-del)
--      - 1 satır:  username='fabrika' (kiosk user)
--      - KORUNAN 2 satır: eren, atiyekar0706
--
-- Phase 1 ile sıralama:
--   - Bu cleanup ÖNCE çalışmalı (eski PIN'ler kapanır, ardından Phase 1 yeni PIN ekler)
--   - Set kesişimi YOK: cleanup eski user'ların PIN'ini pasifleştirir, Phase 1 yeni user'lara PIN ekler
--   - Cleanup Phase 1'den SONRA da çalışabilir; çünkü Phase 1 user'ları is_active=true + deleted_at IS NULL
--     filtrelerinden zaten kapsam dışı kalır (cleanup'ta DOKUNULMAZ).
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

\echo ''
\echo '========================================'
\echo '  PRE-SNAPSHOT (V1)'
\echo '========================================'
SELECT 'V1_pre_branch_pins_active'  AS chk, COUNT(*)::text AS val FROM branch_staff_pins WHERE is_active=true
UNION ALL SELECT 'V1_pre_factory_pins_active',  COUNT(*)::text FROM factory_staff_pins WHERE is_active=true
UNION ALL SELECT 'V1_pre_branch_pins_total',    COUNT(*)::text FROM branch_staff_pins
UNION ALL SELECT 'V1_pre_factory_pins_total',   COUNT(*)::text FROM factory_staff_pins
ORDER BY 1;

-- ============================================================================
-- (1) BRANCH_STAFF_PINS — UPDATE is_active=false (DELETE YOK)
-- ============================================================================

UPDATE branch_staff_pins p
SET is_active = false, updated_at = now()
FROM users u
WHERE u.id = p.user_id
  AND p.is_active = true
  AND (
    u.deleted_at IS NOT NULL
    OR u.is_active = false
    OR u.role IN (
      'sube_kiosk', 'yatirimci_branch', 'yatirimci_hq', 'yatirimci',
      'admin', 'super_admin', 'ceo', 'cgo'
    )
    OR u.username = 'fabrika'
  );

\echo ''
\echo '========================================'
\echo '  (1) branch_staff_pins UPDATE — bitti'
\echo '========================================'

-- ============================================================================
-- (2) FACTORY_STAFF_PINS — UPDATE is_active=false (DELETE YOK)
-- ============================================================================

UPDATE factory_staff_pins p
SET is_active = false, updated_at = now()
FROM users u
WHERE u.id = p.user_id
  AND p.is_active = true
  AND (
    u.deleted_at IS NOT NULL
    OR u.is_active = false
    OR u.username = 'fabrika'
    OR u.role IN ('admin', 'super_admin', 'ceo', 'cgo')
  );

\echo ''
\echo '========================================'
\echo '  (2) factory_staff_pins UPDATE — bitti'
\echo '========================================'

-- ============================================================================
-- VERIFICATIONS V1-V7
-- ============================================================================

\echo ''
\echo '========================================'
\echo '  V2: Cleanup sonrası aktif PIN sayısı'
\echo '========================================'
SELECT 'V2_branch_active'  AS chk, COUNT(*)::text AS val FROM branch_staff_pins WHERE is_active=true
UNION ALL SELECT 'V2_factory_active', COUNT(*)::text FROM factory_staff_pins WHERE is_active=true
ORDER BY 1;

\echo ''
\echo '========================================'
\echo '  V3: inactive/deleted user a bağlı aktif PIN (0 olmalı)'
\echo '========================================'
SELECT 'V3a_branch_softdel_or_inactive_active_pin' AS chk, COUNT(*)::text AS olmamali_0
FROM branch_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE p.is_active = true
  AND (u.deleted_at IS NOT NULL OR u.is_active = false)
UNION ALL
SELECT 'V3b_factory_softdel_or_inactive_active_pin', COUNT(*)::text
FROM factory_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE p.is_active = true
  AND (u.deleted_at IS NOT NULL OR u.is_active = false)
ORDER BY 1;

\echo ''
\echo '========================================'
\echo '  V4: kiosk/yatırımcı/system role aktif PIN (0 olmalı)'
\echo '========================================'
SELECT 'V4a_branch_kiosk_yatirimci_admin_active' AS chk, COUNT(*)::text AS olmamali_0
FROM branch_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE p.is_active = true
  AND (u.role IN ('sube_kiosk','yatirimci_branch','yatirimci_hq','yatirimci','admin','super_admin','ceo','cgo')
       OR u.username = 'fabrika')
UNION ALL
SELECT 'V4b_factory_kiosk_admin_active', COUNT(*)::text
FROM factory_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE p.is_active = true
  AND (u.username = 'fabrika' OR u.role IN ('admin','super_admin','ceo','cgo'))
ORDER BY 1;

\echo ''
\echo '========================================'
\echo '  V5: Korunması gereken aktif insan personel PIN leri'
\echo '========================================'
SELECT 'V5_branch' AS chk, u.username, u.role,
       p.branch_id::text AS branch, p.is_active::text AS pin_aktif
FROM branch_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE u.username IN ('mudur5','laramudur','RGM','Umit','atiyekar0706')
ORDER BY u.username, p.branch_id;

SELECT 'V5_factory' AS chk, u.username, u.role, p.is_active::text AS pin_aktif
FROM factory_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE u.username IN ('eren','atiyekar0706')
ORDER BY u.username;

\echo ''
\echo '========================================'
\echo '  V6: branch_id 5,8,23,24 için aktif PIN sayısı'
\echo '========================================'
SELECT 'V6_branch_active_per_branch' AS chk, p.branch_id::text AS branch, COUNT(*)::text AS aktif_pin
FROM branch_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE p.is_active = true
  AND p.branch_id IN (5,8,23,24)
GROUP BY p.branch_id
UNION ALL
SELECT 'V6_factory_active_total', '24', COUNT(*)::text FROM factory_staff_pins WHERE is_active=true
ORDER BY 1, 2;

\echo ''
\echo '========================================'
\echo '  V7: fabrika kiosk user aktif PIN durumu (0 olmalı)'
\echo '========================================'
SELECT 'V7a_branch_fabrika_active_pin' AS chk, COUNT(*)::text AS olmamali_0
FROM branch_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'fabrika' AND p.is_active = true
UNION ALL
SELECT 'V7b_factory_fabrika_active_pin', COUNT(*)::text
FROM factory_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'fabrika' AND p.is_active = true
ORDER BY 1;

\echo ''
\echo '========================================'
\echo '  POST-SNAPSHOT (rollback öncesi)'
\echo '========================================'
SELECT 'post_branch_pins_active'  AS chk, COUNT(*)::text AS val FROM branch_staff_pins WHERE is_active=true
UNION ALL SELECT 'post_factory_pins_active', COUNT(*)::text FROM factory_staff_pins WHERE is_active=true
UNION ALL SELECT 'post_branch_pins_total',    COUNT(*)::text FROM branch_staff_pins
UNION ALL SELECT 'post_factory_pins_total',   COUNT(*)::text FROM factory_staff_pins
ORDER BY 1;

ROLLBACK;

\echo ''
\echo 'ROLLBACK OK — DB değişikliği YAPILMADI.'
