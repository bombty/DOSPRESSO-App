-- =====================================================================
-- Task #328 — Attendance Settings Audit Tablosu
-- Tarih: 2026-05-03
-- Owner: Aslan
--
-- AMAÇ:
--   - branch_kiosk_settings PATCH'lerinde değişen her field için audit row
--   - Compliance + bordro tartışmasında kanıt
--   - Yeni tablo, mevcut data etkilenmez (rollback risksiz: DROP TABLE)
--
-- KULLANIM:
--   psql "$DATABASE_URL" -f migrations/2026-05-03-attendance-settings-audit.sql
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS attendance_settings_audit;
-- =====================================================================

CREATE TABLE IF NOT EXISTS attendance_settings_audit (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  changed_by_id VARCHAR NOT NULL REFERENCES users(id),
  field_name VARCHAR(64) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_audit_branch_changed
  ON attendance_settings_audit (branch_id, changed_at);

-- Sanity check
DO $$
BEGIN
  RAISE NOTICE 'attendance_settings_audit table ready: %', (
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_name = 'attendance_settings_audit'
  );
END $$;
