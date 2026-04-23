-- ═══════════════════════════════════════════════════════════════════
-- S-GPS (23 Nis 2026) — GPS Fallback Migration
-- ═══════════════════════════════════════════════════════════════════
--
-- AMAÇ:
--   branch_shift_sessions tablosuna GPS fallback izleme kolonları ekle.
--   Tablet GPS izin vermediğinde supervisor/müdür PIN ile manuel onay
--   akışı izlenebilir hale gelir.
--
-- AKIŞ:
--   1. Barista kiosk'a PIN girer → shift-start butonu basar
--   2. Tablet GPS izin vermez → hata toast'u
--   3. Supervisor kiosk'a gelir → "GPS Manuel Onay" butonu basar
--   4. Kendi PIN'ini girer → shift-start yeniden çağrılır
--      (gpsFallback=true + supervisorApprovalPin=XXXX)
--   5. Sistem override kaydı: gps_fallback_used=true + approvedBy=supervisor
--
-- ÇALIŞTIRMA:
--   psql "$DATABASE_URL" -f scripts/pilot/13-gps-fallback-migration.sql
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- gps_fallback_used: true = supervisor manuel onay ile shift açıldı
ALTER TABLE branch_shift_sessions
ADD COLUMN IF NOT EXISTS gps_fallback_used BOOLEAN NOT NULL DEFAULT false;

-- gps_fallback_approved_by: onayı veren supervisor/müdür user_id
ALTER TABLE branch_shift_sessions
ADD COLUMN IF NOT EXISTS gps_fallback_approved_by VARCHAR REFERENCES users(id) ON DELETE SET NULL;

-- Index: raporlama için hızlı sorgulama
CREATE INDEX IF NOT EXISTS bss_gps_fallback_idx
ON branch_shift_sessions (gps_fallback_used, check_in_time)
WHERE gps_fallback_used = true;

DO $$
DECLARE
  total_sessions INT;
  fallback_count INT;
BEGIN
  SELECT COUNT(*) INTO total_sessions FROM branch_shift_sessions;
  SELECT COUNT(*) INTO fallback_count FROM branch_shift_sessions WHERE gps_fallback_used = true;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'S-GPS Migration Tamamlandı';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Toplam session:  % kayıt', total_sessions;
  RAISE NOTICE 'Fallback kullanım: % (hepsi 0 olmalı başlangıçta)', fallback_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Pilot Rapor Sorgusu:';
  RAISE NOTICE '  SELECT b.name, u.first_name, u.last_name, s.check_in_time,';
  RAISE NOTICE '         approver.first_name as approved_by_name';
  RAISE NOTICE '  FROM branch_shift_sessions s';
  RAISE NOTICE '  JOIN branches b ON b.id = s.branch_id';
  RAISE NOTICE '  JOIN users u ON u.id = s.user_id';
  RAISE NOTICE '  LEFT JOIN users approver ON approver.id = s.gps_fallback_approved_by';
  RAISE NOTICE '  WHERE s.gps_fallback_used = true';
  RAISE NOTICE '  ORDER BY s.check_in_time DESC;';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;
