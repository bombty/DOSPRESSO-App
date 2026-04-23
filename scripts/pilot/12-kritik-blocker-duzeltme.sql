-- ═══════════════════════════════════════════════════════════════════
-- REPLIT RAPORU - 3 KRİTİK BLOCKER DÜZELTME
-- 21 Nis 2026 gece raporu → 21 Nis gece düzeltme
-- ═══════════════════════════════════════════════════════════════════
--
-- Replit 21 Nis IT Danışman Detaylı Rapor'da 3 kritik blocker tespit etti:
--
-- 1. 🔴 GPS KOORDİNATLARI EKSİK (4 pilot lokasyonda NULL)
--    → Kiosk shift-start GPS doğrulama yapılamaz
-- 2. 🔴 VARDİYA PLANI BOŞ (28 Nis - 4 May = 0 vardiya)
--    → Bordro 480 dk varsayar, yanlış hesap
-- 3. 🟠 manager_name DB KAYDI uyumsuz (4 lokasyonda)
--    → Cheat-sheet/bildirimde yanlış kişi gösterir
--
-- BU SCRIPT SADECE BLOCKER 3'Ü ÇÖZER (manager_name UPDATE).
-- Blocker 1 (GPS koordinatları) Aslan'dan veri gerektirir.
-- Blocker 2 (vardiya planı) Coach (Yavuz) UI'dan girer.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Blocker 3: manager_name düzeltme ───────────────────────────

UPDATE branches SET manager_name = 'Erdem Yıldız'
WHERE id = 5;  -- Işıklar (eski kayıt: "Ahmet Yılmaz")

UPDATE branches SET manager_name = 'Lara Müdür'
WHERE id = 8;  -- Antalya Lara (eski kayıt: "Zeynep Şahin")

UPDATE branches SET manager_name = 'Aslan (adminhq)'
WHERE id = 23; -- Merkez Ofis HQ (eski kayıt: "Yönetim")

UPDATE branches SET manager_name = 'Eren Fabrika (fabrika_mudur)'
WHERE id = 24; -- Fabrika (eski kayıt: "Fabrika Müdürü")

-- ─── Blocker 1: GPS Koordinatları PLACEHOLDER ──────────────────
-- NOT: Gerçek koordinatlar Aslan'dan gelince bu bloğu çalıştır.
-- Google Maps'ten alınabilir (sağ tık → "Buraya yönlen" → koordinatı kopyala)
--
-- UPDATE branches SET shift_corner_latitude = 36.8969, shift_corner_longitude = 30.7133 WHERE id = 5;  -- Işıklar
-- UPDATE branches SET shift_corner_latitude = 36.8588, shift_corner_longitude = 30.7875 WHERE id = 8;  -- Lara
-- UPDATE branches SET shift_corner_latitude = ?     , shift_corner_longitude = ?      WHERE id = 23; -- HQ
-- UPDATE branches SET shift_corner_latitude = ?     , shift_corner_longitude = ?      WHERE id = 24; -- Fabrika

-- ─── Sonuç Raporu ────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
  gps_missing INT;
  total_pilot INT;
BEGIN
  SELECT COUNT(*) INTO total_pilot FROM branches WHERE id IN (5, 8, 23, 24);
  SELECT COUNT(*) INTO gps_missing FROM branches
  WHERE id IN (5, 8, 23, 24)
    AND (shift_corner_latitude IS NULL OR shift_corner_longitude IS NULL);

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Pilot 4 Lokasyon Durum Kontrolü';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Pilot lokasyon: %', total_pilot;
  RAISE NOTICE 'GPS eksik:      % (4 olmalı - henüz girilmedi)', gps_missing;
  RAISE NOTICE '';

  FOR r IN
    SELECT id, name, manager_name,
           shift_corner_latitude, shift_corner_longitude,
           geo_radius
    FROM branches
    WHERE id IN (5, 8, 23, 24)
    ORDER BY id
  LOOP
    RAISE NOTICE 'Branch %: "%" | Müdür: "%" | GPS: (%, %) | radius: %m',
      r.id, r.name, r.manager_name,
      COALESCE(r.shift_corner_latitude::text, 'NULL'),
      COALESCE(r.shift_corner_longitude::text, 'NULL'),
      r.geo_radius;
  END LOOP;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  IF gps_missing > 0 THEN
    RAISE NOTICE '⚠️  BLOCKER 1 HALA AÇIK: GPS koordinatları girilmeli!';
    RAISE NOTICE '   Aslan''dan 4 lokasyon Google Maps koordinatlarını al';
    RAISE NOTICE '   Yukarıdaki UPDATE bloğunu comment''ten çıkar + değerleri koy';
  END IF;
END $$;

COMMIT;
