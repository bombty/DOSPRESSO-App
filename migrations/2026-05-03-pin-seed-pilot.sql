-- =====================================================================
-- Task #324 — Eksik PIN Seed Migration (Pilot Day-1 öncesi)
-- Tarih: 2026-05-03
-- Owner: Aslan
--
-- AMAÇ:
--   - branch_staff_pins ve factory_staff_pins tablolarının snapshot'unu al
--   - PIN seed işlemi öncesi geri dönüş noktası bırak
--
-- KULLANIM:
--   1) Bu SQL'i çalıştır → snapshot tablolar oluşur
--      psql "$DATABASE_URL" -f migrations/2026-05-03-pin-seed-pilot.sql
--   2) Dry-run seed (DB write YOK):
--      tsx scripts/pilot/27-pin-seed-missing.ts --dry-run
--   3) Owner Aslan onayı sonrası gerçek seed:
--      tsx scripts/pilot/27-pin-seed-missing.ts --apply > /tmp/new-pins-2026-05-03.csv
--   4) CSV'yi kullanıcılara dağıttıktan sonra:
--      shred -u /tmp/new-pins-2026-05-03.csv
--   5) Doğrulama (0 eksik beklenir):
--      psql "$DATABASE_URL" -f scripts/audit/pin-coverage-2026-05.sql
--
-- ROLLBACK (gerekirse):
--   BEGIN;
--   DELETE FROM branch_staff_pins WHERE created_at >= '2026-05-03';
--   DELETE FROM factory_staff_pins WHERE created_at >= '2026-05-03';
--   -- veya tam restore:
--   -- TRUNCATE branch_staff_pins; INSERT INTO branch_staff_pins SELECT * FROM branch_staff_pins_bk_20260503;
--   COMMIT;
-- =====================================================================

BEGIN;

-- Snapshot 1: branch_staff_pins tam yedek (NON-DESTRUCTIVE — rerun-safe)
-- Tabloya zaten varsa dokunma → gerçek pre-seed rollback noktası korunur.
DO $$
BEGIN
  IF to_regclass('public.branch_staff_pins_bk_20260503') IS NULL THEN
    EXECUTE 'CREATE TABLE branch_staff_pins_bk_20260503 AS SELECT * FROM branch_staff_pins';
    EXECUTE $c$COMMENT ON TABLE branch_staff_pins_bk_20260503 IS
      'Task #324 PIN seed öncesi snapshot (2026-05-03). Pilot Day-1 sonrasi silinebilir.'$c$;
    RAISE NOTICE 'branch_staff_pins_bk_20260503 oluşturuldu.';
  ELSE
    RAISE NOTICE 'branch_staff_pins_bk_20260503 zaten var → korunuyor (rollback noktasi).';
  END IF;
END $$;

-- Snapshot 2: factory_staff_pins tam yedek (NON-DESTRUCTIVE — rerun-safe)
DO $$
BEGIN
  IF to_regclass('public.factory_staff_pins_bk_20260503') IS NULL THEN
    EXECUTE 'CREATE TABLE factory_staff_pins_bk_20260503 AS SELECT * FROM factory_staff_pins';
    EXECUTE $c$COMMENT ON TABLE factory_staff_pins_bk_20260503 IS
      'Task #324 PIN seed öncesi snapshot (2026-05-03). Pilot Day-1 sonrasi silinebilir.'$c$;
    RAISE NOTICE 'factory_staff_pins_bk_20260503 oluşturuldu.';
  ELSE
    RAISE NOTICE 'factory_staff_pins_bk_20260503 zaten var → korunuyor (rollback noktasi).';
  END IF;
END $$;

-- Doğrulama: snapshot tabloları erişilebilir + satır sayıları raporla
-- (Rerun-safe: live tablolar seed sonrası büyümüş olabilir; snapshot
--  pre-seed durumu yansıtır → eşitlik beklenmez, sadece raporlanır.)
DO $$
DECLARE
  v_branch_live INT;
  v_branch_snap INT;
  v_factory_live INT;
  v_factory_snap INT;
BEGIN
  SELECT COUNT(*) INTO v_branch_live FROM branch_staff_pins;
  SELECT COUNT(*) INTO v_branch_snap FROM branch_staff_pins_bk_20260503;
  SELECT COUNT(*) INTO v_factory_live FROM factory_staff_pins;
  SELECT COUNT(*) INTO v_factory_snap FROM factory_staff_pins_bk_20260503;

  RAISE NOTICE 'branch_staff_pins: live=% rows, snapshot(pre-seed)=% rows',
    v_branch_live, v_branch_snap;
  RAISE NOTICE 'factory_staff_pins: live=% rows, snapshot(pre-seed)=% rows',
    v_factory_live, v_factory_snap;

  IF v_branch_snap = 0 OR v_factory_snap = 0 THEN
    RAISE EXCEPTION 'Snapshot tablosu boş — pre-seed yedek alınmamış olabilir';
  END IF;
END $$;

COMMIT;
