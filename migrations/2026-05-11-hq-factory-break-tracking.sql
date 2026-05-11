-- Migration: 2026-05-11-hq-factory-break-tracking
-- Sprint: 14a — Mola Sayaç Genişletme (Fabrika + HQ)
-- Amaç:
--   1. hq_break_logs tablosu oluştur (HQ kiosk mola takibi için)
--   2. factory_shift_sessions.break_minutes kolonu ekle (fabrika kümülatif mola hakkı için)
-- Çalıştırma:
--   psql "$DATABASE_URL" -1 -f migrations/2026-05-11-hq-factory-break-tracking.sql
-- Güvenli: idempotent (IF NOT EXISTS / DO blocks)

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- 1. HQ_BREAK_LOGS tablosunu oluştur
-- ──────────────────────────────────────────────────────────────
-- branch_break_logs'a benzer yapı, hq_shift_sessions'a referans
CREATE TABLE IF NOT EXISTS hq_break_logs (
  id                       SERIAL PRIMARY KEY,
  session_id               INTEGER NOT NULL REFERENCES hq_shift_sessions(id) ON DELETE CASCADE,
  user_id                  VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  break_start_time         TIMESTAMP NOT NULL,
  break_end_time           TIMESTAMP,
  break_duration_minutes   INTEGER DEFAULT 0,

  break_type               VARCHAR(30) DEFAULT 'regular',  -- regular, lunch, prayer, personal
  notes                    TEXT,
  created_at               TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hq_break_logs_session_idx ON hq_break_logs(session_id);
CREATE INDEX IF NOT EXISTS hq_break_logs_user_idx    ON hq_break_logs(user_id);
CREATE INDEX IF NOT EXISTS hq_break_logs_date_idx    ON hq_break_logs(break_start_time);

-- ──────────────────────────────────────────────────────────────
-- 2. FACTORY_SHIFT_SESSIONS.break_minutes kolonu ekle
-- ──────────────────────────────────────────────────────────────
-- Kümülatif günlük mola hakkı için (45+15 senaryosu)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'factory_shift_sessions'
      AND column_name = 'break_minutes'
  ) THEN
    ALTER TABLE factory_shift_sessions
      ADD COLUMN break_minutes INTEGER DEFAULT 0;
    RAISE NOTICE 'factory_shift_sessions.break_minutes kolonu eklendi';
  ELSE
    RAISE NOTICE 'factory_shift_sessions.break_minutes zaten var, atlandı';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 3. Backfill: mevcut factory_break_logs verisinden break_minutes hesapla
-- ──────────────────────────────────────────────────────────────
-- factoryShiftSessions için mevcut bitmiş molaları topla
UPDATE factory_shift_sessions fss
SET break_minutes = COALESCE(sub.total_break, 0)
FROM (
  SELECT
    session_id,
    SUM(COALESCE(duration_minutes, 0))::int AS total_break
  FROM factory_break_logs
  WHERE ended_at IS NOT NULL
  GROUP BY session_id
) sub
WHERE fss.id = sub.session_id
  AND (fss.break_minutes IS NULL OR fss.break_minutes = 0);

-- ──────────────────────────────────────────────────────────────
-- 4. Sonuç özeti
-- ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_hq_table_exists boolean;
  v_factory_col_exists boolean;
  v_factory_backfilled int;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'hq_break_logs'
  ) INTO v_hq_table_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'factory_shift_sessions' AND column_name = 'break_minutes'
  ) INTO v_factory_col_exists;

  SELECT COUNT(*) INTO v_factory_backfilled
  FROM factory_shift_sessions
  WHERE break_minutes > 0;

  RAISE NOTICE 'Sprint 14a Migration tamamlandi:';
  RAISE NOTICE '  - hq_break_logs tablosu: %', CASE WHEN v_hq_table_exists THEN 'VAR ✅' ELSE 'EKSIK ❌' END;
  RAISE NOTICE '  - factory_shift_sessions.break_minutes: %', CASE WHEN v_factory_col_exists THEN 'VAR ✅' ELSE 'EKSIK ❌' END;
  RAISE NOTICE '  - factory_shift_sessions backfilled: % kayit', v_factory_backfilled;
END $$;

COMMIT;
