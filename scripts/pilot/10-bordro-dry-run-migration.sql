-- ═══════════════════════════════════════════════════════════════════
-- S-BORDRO (21 Nis 2026) — Pilot Güvenlik Migration
-- ═══════════════════════════════════════════════════════════════════
--
-- AMAÇ:
--   monthly_payroll tablosuna is_dry_run kolonu ekle.
--   Pilot ilk ay (Mayıs 2026) bordro hesaplamaları DRY_RUN modda çalışacak.
--   SGK external bildirim YAPILMAZ, sadece iç kayıt tutulur.
--
-- ETKİ:
--   - Mevcut 871 monthly_payroll kaydı default false = normal mod
--   - Yeni pilot bordroları is_dry_run=true ile yazılacak (env'e bağlı)
--
-- ÇALIŞTIRMA:
--   psql "$DATABASE_URL" -f scripts/pilot/10-bordro-dry-run-migration.sql
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- is_dry_run kolonu ekle (default false = pilot dışı güvenli varsayılan)
ALTER TABLE monthly_payroll
ADD COLUMN IF NOT EXISTS is_dry_run BOOLEAN NOT NULL DEFAULT false;

-- Mevcut 871 kayıt için kontrol (hepsi false kalır)
DO $$
DECLARE
  total_count INT;
  dry_run_count INT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM monthly_payroll;
  SELECT COUNT(*) INTO dry_run_count FROM monthly_payroll WHERE is_dry_run = true;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'S-Bordro Migration Tamamlandı';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Toplam bordro kayıt: %', total_count;
  RAISE NOTICE 'DRY_RUN flag ile: % (hepsi 0 olmalı)', dry_run_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Env değişkenleri (.env dosyasına ekle):';
  RAISE NOTICE '  PAYROLL_LOCKED_DATASOURCE=kiosk';
  RAISE NOTICE '  PAYROLL_DRY_RUN=true';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;
