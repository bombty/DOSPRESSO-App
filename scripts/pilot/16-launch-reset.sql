-- ═══════════════════════════════════════════════════════════════════
-- PILOT LAUNCH-RESET (27 Nis 2026 Pazar 22:30)
-- ═══════════════════════════════════════════════════════════════════
--
-- AMAÇ: Pilot go-live öncesi temiz durum:
--   1. Bildirim temizleme (21,951 unread gereksiz)
--   2. Eski shift_sessions (pilot öncesi test) temizle
--   3. Skor snapshot'lar korunur (historik veri)
--   4. Pilot lokasyonlar dışındaki rapor/analytics etkilenmez
--
-- ÇALIŞTIRMA:
--   27 Nis Pazar 22:30'da (8.5 saat önce go-live):
--   psql "$DATABASE_URL" -f scripts/pilot/16-launch-reset.sql
--
-- YEDEK:
--   Önce pg_dump backup:
--   pg_dump $DATABASE_URL > /tmp/pre-launch-backup-27nis.sql
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── ÖZELLİK 1: Pilot Lokasyonlar İçin Eski Bildirim Temizle ──
-- Son 7 gün öncesi okunmamış bildirimleri sil (pilot 4 lokasyon + HQ scope)

DO $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM notifications
  WHERE is_read = false
    AND created_at < NOW() - INTERVAL '7 days'
    AND (
      branch_id IN (5, 8, 23, 24)
      OR user_id IN (
        SELECT id FROM users
        WHERE is_active = true
          AND (branch_id IN (5, 8, 23, 24) OR role IN (
            'admin','ceo','cgo','coach','trainer',
            'muhasebe_ik','satinalma','kalite_kontrol',
            'gida_muhendisi','fabrika_mudur','marketing',
            'teknik','destek','yatirimci_hq'
          ))
      )
    );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eski bildirim silindi: % kayıt', deleted_count;
END $$;

-- ─── ÖZELLİK 2: Test Vardiya Kayıtları Temizle ──
-- 2099-01-01 gibi test kayıtları pilot öncesi silinsin

DELETE FROM shifts
WHERE shift_date = '2099-01-01'
  AND branch_id IN (5, 8, 23, 24);

-- ─── ÖZELLİK 3: Pilot 4 Lokasyon İçin Aktif Session Kapat ──
-- Eğer bir barista test sırasında vardiya açık bıraktıysa
-- Go-live temiz başlamalı

UPDATE branch_shift_sessions
SET status = 'abandoned',
    check_out_time = NOW(),
    notes = COALESCE(notes || ' | ', '') || 'launch-reset: pilot öncesi otomatik kapatıldı'
WHERE status IN ('active', 'on_break')
  AND branch_id IN (5, 8, 23, 24)
  AND check_in_time < NOW() - INTERVAL '8 hours';

-- ─── ÖZELLİK 4: Pilot Flag'i AÇ ──
-- site_settings tablosunda pilot_launched = true

INSERT INTO site_settings (key, value, type, category, updated_at)
VALUES ('pilot_launched', 'true', 'boolean', 'general', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = 'true',
  updated_at = NOW();

INSERT INTO site_settings (key, value, type, category, updated_at)
VALUES ('pilot_start_date', '2026-04-28', 'string', 'general', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = '2026-04-28',
  updated_at = NOW();

-- ─── ÖZELLİK 5: Pilot 4 Lokasyon Sağlık Kontrolü ──

DO $$
DECLARE
  r RECORD;
  pilot_ok BOOLEAN := true;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'PILOT LAUNCH-RESET TAMAMLANDI';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Pilot 4 Lokasyon Sağlık Durumu:';
  RAISE NOTICE '';

  FOR r IN
    SELECT
      b.id,
      b.name,
      b.manager_name,
      CASE
        WHEN b.shift_corner_latitude IS NULL OR b.shift_corner_longitude IS NULL
        THEN 'NULL'
        ELSE 'SET'
      END as gps_status,
      b.setup_complete,
      (SELECT COUNT(*) FROM shifts s
       WHERE s.branch_id = b.id
         AND s.shift_date BETWEEN '2026-04-28' AND '2026-05-04') as week_shifts,
      (SELECT COUNT(*) FROM branch_shift_sessions bss
       WHERE bss.branch_id = b.id AND bss.status IN ('active','on_break')) as open_sessions
    FROM branches b
    WHERE b.id IN (5, 8, 23, 24)
    ORDER BY b.id
  LOOP
    RAISE NOTICE 'Branch % (%): GPS=%, Setup=%, 7-gün vardiya=%, açık session=%',
      r.id, r.name, r.gps_status, r.setup_complete, r.week_shifts, r.open_sessions;

    IF r.gps_status = 'NULL' THEN pilot_ok := false; END IF;
    IF r.week_shifts = 0 THEN pilot_ok := false; END IF;
  END LOOP;

  RAISE NOTICE '';
  IF pilot_ok THEN
    RAISE NOTICE '✅ PİLOT GO-LIVE HAZIR';
  ELSE
    RAISE WARNING '❌ PİLOT HAZIR DEĞİL - GPS veya vardiya eksik';
    RAISE WARNING '   Pazartesi 09:00 öncesi doldurulmalı';
  END IF;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;

-- ─── POST-RESET BILGI ─────────────────────────────────────────
-- Bu script sonrası Pazartesi 08:00'a kadar SİSTEM SESSİZ kalsın:
-- - Yeni kullanıcı ekleme YOK
-- - Yeni reçete onay YOK
-- - Rol değişikliği YOK
-- Pazartesi 08:00 adminhq parola rotasyon
-- Pazartesi 09:00 🚀 GO-LIVE
