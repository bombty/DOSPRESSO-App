-- =====================================================================
-- Migration: 2 unutulmuş açık fabrika vardiyasını kapat
-- Tarih: 4 Mayıs 2026
-- Kaynak: docs/audit/FABRIKA-DEEP-SCAN-4-MAYIS-2026.md (KRİTİK BULGU 1)
--
-- HEDEF KAYITLAR:
--   id=113, user=c706446d... (4 May 18:05'ten beri açık)
--   id=114, user=1705b9b3... (4 May 18:08'den beri açık)
--
-- AKSIYON:
--   - status: 'active' → 'completed'
--   - check_out_time: NOW()
--   - phase: 'hazirlik' → 'tamamlandi'
--   - work_minutes: NOW() - check_in_time (dakika)
--   - notes: '[auto-closed: 4 May test session]' eklenir
--
-- DRY-RUN: BEGIN; UPDATE...; SELECT etkilenen; ROLLBACK;
-- =====================================================================

BEGIN;

-- ÖN GÖRÜNTÜ: kapatılacak kayıtları göster
SELECT id, user_id, status, phase, check_in_time,
       ROUND(EXTRACT(EPOCH FROM (NOW() - check_in_time)) / 60) AS hesaplanacak_work_min,
       notes
FROM factory_shift_sessions
WHERE id IN (113, 114) AND status = 'active';

-- AKSIYON
UPDATE factory_shift_sessions
SET
  status         = 'completed',
  check_out_time = NOW(),
  phase          = 'tamamlandi',
  work_minutes   = ROUND(EXTRACT(EPOCH FROM (NOW() - check_in_time)) / 60),
  notes          = COALESCE(notes, '') || ' [auto-closed: 4 May test session]'
WHERE id IN (113, 114)
  AND status = 'active';

-- DOĞRULAMA: 2 satır etkilenmeli
DO $$
DECLARE
  hala_acik INTEGER;
BEGIN
  SELECT COUNT(*) INTO hala_acik
  FROM factory_shift_sessions
  WHERE id IN (113, 114) AND status = 'active';

  IF hala_acik > 0 THEN
    RAISE EXCEPTION 'Migration başarısız: % vardiya hala açık', hala_acik;
  END IF;

  RAISE NOTICE 'OK: 113 ve 114 numaralı vardıyalar kapatıldı';
END $$;

-- SON DURUM gösterimi
SELECT id, status, phase,
       to_char(check_in_time, 'MM-DD HH24:MI') AS giris,
       to_char(check_out_time, 'MM-DD HH24:MI') AS cikis,
       work_minutes,
       notes
FROM factory_shift_sessions
WHERE id IN (113, 114);

COMMIT;
