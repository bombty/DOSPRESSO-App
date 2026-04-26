-- =====================================================================
-- Task #215 ROLLBACK: source='manual_backfill' kayıtlarını sil
-- Tarih: 26 Nis 2026
-- =====================================================================

BEGIN;

-- Silinmeden önce kayıtları göster
SELECT user_id, branch_id, record_date, record_time, record_type, device_info
FROM pdks_records
WHERE source = 'manual_backfill';

-- Sil
DELETE FROM pdks_records WHERE source = 'manual_backfill';

-- Doğrulama: 0 olmalı
SELECT 'KALAN_BACKFILL' as kontrol, count(*) as adet FROM pdks_records WHERE source = 'manual_backfill';

COMMIT;
