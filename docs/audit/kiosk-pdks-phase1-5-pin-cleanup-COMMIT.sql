-- ============================================================================
-- DOSPRESSO Kiosk PDKS Phase 1.5 — Eski PIN Cleanup COMMIT
-- ============================================================================
-- Tarih:     2026-04-29
-- Actor:     adminhq (18e0cb39-87aa-4862-8f08-f52df6ee01b1)
-- Modu:      COMMIT (kalıcı uygulama, DELETE değil — UPDATE is_active=false)
-- Önkoşul:   Backup alınmış olmalı:
--              DB içi:  branch_staff_pins_bk_20260429 (224)
--                       factory_staff_pins_bk_20260429 (14)
--              Dosya:   docs/audit/backups/pin-cleanup-backup-20260429-120545.sql
--
-- Beklenen UPDATE sayıları:
--   branch_staff_pins:  219 satır → is_active=false
--   factory_staff_pins: 12 satır  → is_active=false
--   Aktif kalacak:      branch=5, factory=2 (5 anahtar + 2 fabrika personeli)
--
-- Safety: DO bloğu beklenen sayıları doğrular; uyumsuzluk halinde RAISE EXCEPTION
--         ile transaction otomatik rollback olur. ROLLBACK garanti edilemiyorsa
--         COMMIT çalışmaz.
--
-- Geri alma (eğer commit sonrası geri dönmek gerekirse):
--   UPDATE branch_staff_pins p SET is_active = b.is_active
--   FROM branch_staff_pins_bk_20260429 b WHERE p.id = b.id;
--   UPDATE factory_staff_pins p SET is_active = b.is_active
--   FROM factory_staff_pins_bk_20260429 b WHERE p.id = b.id;
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

\echo ''
\echo '========================================'
\echo '  PRE-SNAPSHOT'
\echo '========================================'
SELECT 'pre_branch_pins_active'  AS chk, COUNT(*)::text AS val FROM branch_staff_pins WHERE is_active=true
UNION ALL SELECT 'pre_factory_pins_active', COUNT(*)::text FROM factory_staff_pins WHERE is_active=true
UNION ALL SELECT 'pre_branch_pins_total',   COUNT(*)::text FROM branch_staff_pins
UNION ALL SELECT 'pre_factory_pins_total',  COUNT(*)::text FROM factory_staff_pins
ORDER BY 1;

-- ============================================================================
-- (1) BRANCH_STAFF_PINS — UPDATE is_active=false
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
\echo '(1) branch_staff_pins UPDATE — bitti'

-- ============================================================================
-- (2) FACTORY_STAFF_PINS — UPDATE is_active=false
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
\echo '(2) factory_staff_pins UPDATE — bitti'

-- ============================================================================
-- SAFETY GUARD — Beklenen sayılar uyumlu mu? Değilse otomatik ROLLBACK
-- ============================================================================
DO $$
DECLARE
  branch_active INT;
  factory_active INT;
  branch_softdel_active INT;
  factory_softdel_active INT;
  branch_kiosk_active INT;
  factory_kiosk_active INT;
  branch_fabrika_user_active INT;
  factory_fabrika_user_active INT;
  branch_keep_count INT;
  factory_keep_count INT;
BEGIN
  SELECT COUNT(*) INTO branch_active FROM branch_staff_pins WHERE is_active=true;
  SELECT COUNT(*) INTO factory_active FROM factory_staff_pins WHERE is_active=true;

  SELECT COUNT(*) INTO branch_softdel_active
    FROM branch_staff_pins p JOIN users u ON u.id=p.user_id
    WHERE p.is_active=true AND (u.deleted_at IS NOT NULL OR u.is_active=false);

  SELECT COUNT(*) INTO factory_softdel_active
    FROM factory_staff_pins p JOIN users u ON u.id=p.user_id
    WHERE p.is_active=true AND (u.deleted_at IS NOT NULL OR u.is_active=false);

  SELECT COUNT(*) INTO branch_kiosk_active
    FROM branch_staff_pins p JOIN users u ON u.id=p.user_id
    WHERE p.is_active=true
      AND (u.role IN ('sube_kiosk','yatirimci_branch','yatirimci_hq','yatirimci','admin','super_admin','ceo','cgo')
           OR u.username='fabrika');

  SELECT COUNT(*) INTO factory_kiosk_active
    FROM factory_staff_pins p JOIN users u ON u.id=p.user_id
    WHERE p.is_active=true
      AND (u.username='fabrika' OR u.role IN ('admin','super_admin','ceo','cgo'));

  SELECT COUNT(*) INTO branch_fabrika_user_active
    FROM branch_staff_pins p JOIN users u ON u.id=p.user_id
    WHERE p.is_active=true AND u.username='fabrika';

  SELECT COUNT(*) INTO factory_fabrika_user_active
    FROM factory_staff_pins p JOIN users u ON u.id=p.user_id
    WHERE p.is_active=true AND u.username='fabrika';

  SELECT COUNT(*) INTO branch_keep_count
    FROM branch_staff_pins p JOIN users u ON u.id=p.user_id
    WHERE p.is_active=true
      AND u.username IN ('mudur5','laramudur','RGM','Umit','atiyekar0706');

  SELECT COUNT(*) INTO factory_keep_count
    FROM factory_staff_pins p JOIN users u ON u.id=p.user_id
    WHERE p.is_active=true
      AND u.username IN ('eren','atiyekar0706');

  RAISE NOTICE 'GUARD: branch_active=% (5 olmali)', branch_active;
  RAISE NOTICE 'GUARD: factory_active=% (2 olmali)', factory_active;
  RAISE NOTICE 'GUARD: branch_softdel_active=% (0 olmali)', branch_softdel_active;
  RAISE NOTICE 'GUARD: factory_softdel_active=% (0 olmali)', factory_softdel_active;
  RAISE NOTICE 'GUARD: branch_kiosk_active=% (0 olmali)', branch_kiosk_active;
  RAISE NOTICE 'GUARD: factory_kiosk_active=% (0 olmali)', factory_kiosk_active;
  RAISE NOTICE 'GUARD: branch_fabrika_user_active=% (0 olmali)', branch_fabrika_user_active;
  RAISE NOTICE 'GUARD: factory_fabrika_user_active=% (0 olmali)', factory_fabrika_user_active;
  RAISE NOTICE 'GUARD: branch_keep_count=% (5 olmali)', branch_keep_count;
  RAISE NOTICE 'GUARD: factory_keep_count=% (2 olmali)', factory_keep_count;

  IF branch_active != 5 THEN
    RAISE EXCEPTION 'GUARD FAIL: branch_active=% beklenen 5', branch_active;
  END IF;
  IF factory_active != 2 THEN
    RAISE EXCEPTION 'GUARD FAIL: factory_active=% beklenen 2', factory_active;
  END IF;
  IF branch_softdel_active != 0 OR factory_softdel_active != 0 THEN
    RAISE EXCEPTION 'GUARD FAIL: softdel/inactive aktif PIN kaldi (b=%, f=%)',
      branch_softdel_active, factory_softdel_active;
  END IF;
  IF branch_kiosk_active != 0 OR factory_kiosk_active != 0 THEN
    RAISE EXCEPTION 'GUARD FAIL: kiosk/yatirimci/admin aktif PIN kaldi (b=%, f=%)',
      branch_kiosk_active, factory_kiosk_active;
  END IF;
  IF branch_fabrika_user_active != 0 OR factory_fabrika_user_active != 0 THEN
    RAISE EXCEPTION 'GUARD FAIL: fabrika kiosk user aktif PIN kaldi (b=%, f=%)',
      branch_fabrika_user_active, factory_fabrika_user_active;
  END IF;
  IF branch_keep_count != 5 THEN
    RAISE EXCEPTION 'GUARD FAIL: korunan branch personel sayisi=% beklenen 5', branch_keep_count;
  END IF;
  IF factory_keep_count != 2 THEN
    RAISE EXCEPTION 'GUARD FAIL: korunan factory personel sayisi=% beklenen 2', factory_keep_count;
  END IF;

  RAISE NOTICE 'GUARD PASS: tum kontroller bekleneni karsiladi.';
END $$;

\echo ''
\echo '========================================'
\echo '  V2: Cleanup sonrası aktif PIN sayısı'
\echo '========================================'
SELECT 'V2_branch_active'  AS chk, COUNT(*)::text AS val FROM branch_staff_pins WHERE is_active=true
UNION ALL SELECT 'V2_factory_active', COUNT(*)::text FROM factory_staff_pins WHERE is_active=true
ORDER BY 1;

\echo ''
\echo '========================================'
\echo '  V5: Korunan personel PIN listesi'
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
\echo '  V6: Branch/factory bazında aktif PIN'
\echo '========================================'
SELECT 'V6_branch_active_per_branch' AS chk, p.branch_id::text AS branch, COUNT(*)::text AS aktif_pin
FROM branch_staff_pins p
WHERE p.is_active = true
GROUP BY p.branch_id
UNION ALL
SELECT 'V6_factory_active_total', '24', COUNT(*)::text FROM factory_staff_pins WHERE is_active=true
ORDER BY 1, 2;

\echo ''
\echo '========================================'
\echo '  POST-SNAPSHOT (commit öncesi son durum)'
\echo '========================================'
SELECT 'post_branch_pins_active'  AS chk, COUNT(*)::text AS val FROM branch_staff_pins WHERE is_active=true
UNION ALL SELECT 'post_factory_pins_active', COUNT(*)::text FROM factory_staff_pins WHERE is_active=true
UNION ALL SELECT 'post_branch_pins_total',   COUNT(*)::text FROM branch_staff_pins
UNION ALL SELECT 'post_factory_pins_total',  COUNT(*)::text FROM factory_staff_pins
ORDER BY 1;

COMMIT;

\echo ''
\echo '✅ COMMIT TAMAMLANDI — DB değişiklikleri kalıcı.'
\echo ''
\echo 'Geri alma yöntemleri:'
\echo '  UPDATE branch_staff_pins p SET is_active=b.is_active'
\echo '    FROM branch_staff_pins_bk_20260429 b WHERE p.id=b.id;'
\echo '  UPDATE factory_staff_pins p SET is_active=b.is_active'
\echo '    FROM factory_staff_pins_bk_20260429 b WHERE p.id=b.id;'
