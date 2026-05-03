-- ============================================================
-- Bundle 1B — 13 Eksik Tablo Migration
-- Task: #314 | Tarih: 2026-05-03
-- Drift kapatma: 58 → 0
-- Pre-flight: dry-run PASSED (BEGIN/ROLLBACK), 3 May 2026
-- Try/catch: notification-preferences.ts ✅ tam, satinalma-routes.ts ✅ tam
--            storage.ts fonksiyonları route-level try/catch korumalı
-- ============================================================
--
-- ROLLBACK (gerekirse manuel çalıştır):
-- DROP TABLE IF EXISTS dobody_action_templates CASCADE;
-- DROP TABLE IF EXISTS notification_digest_queue CASCADE;
-- DROP TABLE IF EXISTS notification_preferences CASCADE;
-- DROP TABLE IF EXISTS notification_policies CASCADE;
-- DROP TABLE IF EXISTS recipe_ingredients CASCADE;
-- DROP TABLE IF EXISTS product_suppliers CASCADE;
-- DROP TABLE IF EXISTS ai_report_summaries CASCADE;
-- DROP TABLE IF EXISTS trend_metrics CASCADE;
-- DROP TABLE IF EXISTS branch_comparisons CASCADE;
-- DROP TABLE IF EXISTS branch_feedbacks CASCADE;
-- DROP TABLE IF EXISTS mega_module_mappings CASCADE;
-- DROP TABLE IF EXISTS hq_support_category_assignments CASCADE;
-- DROP TABLE IF EXISTS ticket_activity_logs CASCADE;
-- ============================================================

BEGIN;

-- ── 1. ticket_activity_logs ──────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_activity_logs (
  id           SERIAL PRIMARY KEY,
  ticket_id    INTEGER NOT NULL REFERENCES hq_support_tickets(id) ON DELETE CASCADE,
  user_id      VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action       VARCHAR(50) NOT NULL,
  old_value    TEXT,
  new_value    TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ticket_activity_logs_ticket_idx  ON ticket_activity_logs(ticket_id);
CREATE INDEX IF NOT EXISTS ticket_activity_logs_created_idx ON ticket_activity_logs(created_at);

-- ── 2. hq_support_category_assignments ───────────────────────
CREATE TABLE IF NOT EXISTS hq_support_category_assignments (
  id             SERIAL PRIMARY KEY,
  category       VARCHAR(50) NOT NULL,
  user_id        VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_assign     BOOLEAN DEFAULT FALSE,
  can_close      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMP DEFAULT NOW(),
  created_by_id  VARCHAR REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS hq_support_cat_assign_category_idx
  ON hq_support_category_assignments(category);
CREATE INDEX IF NOT EXISTS hq_support_cat_assign_user_idx
  ON hq_support_category_assignments(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS hq_support_cat_assign_unique
  ON hq_support_category_assignments(category, user_id);

-- ── 3. mega_module_mappings ───────────────────────────────────
CREATE TABLE IF NOT EXISTS mega_module_mappings (
  id             SERIAL PRIMARY KEY,
  module_id      VARCHAR(100) NOT NULL,
  mega_module_id VARCHAR(50) NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mega_module_mappings_module_idx ON mega_module_mappings(module_id);
CREATE INDEX IF NOT EXISTS mega_module_mappings_mega_idx   ON mega_module_mappings(mega_module_id);
CREATE UNIQUE INDEX IF NOT EXISTS mega_module_mappings_unique ON mega_module_mappings(module_id);

-- ── 4. branch_feedbacks ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_feedbacks (
  id               SERIAL PRIMARY KEY,
  branch_id        INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  submitted_by_id  VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type             VARCHAR(50) NOT NULL,
  subject          VARCHAR(255) NOT NULL,
  message          TEXT NOT NULL,
  status           VARCHAR(20) DEFAULT 'yeni',
  response         TEXT,
  responded_by_id  VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMP DEFAULT NOW(),
  responded_at     TIMESTAMP
);
CREATE INDEX IF NOT EXISTS branch_feedbacks_branch_idx  ON branch_feedbacks(branch_id);
CREATE INDEX IF NOT EXISTS branch_feedbacks_status_idx  ON branch_feedbacks(status);
CREATE INDEX IF NOT EXISTS branch_feedbacks_created_idx ON branch_feedbacks(created_at);

-- ── 5. branch_comparisons ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_comparisons (
  id                 SERIAL PRIMARY KEY,
  report_id          INTEGER REFERENCES detailed_reports(id) ON DELETE CASCADE,
  branch1_id         INTEGER NOT NULL REFERENCES branches(id),
  branch2_id         INTEGER NOT NULL REFERENCES branches(id),
  metric             VARCHAR(100) NOT NULL,
  branch1_value      NUMERIC,
  branch2_value      NUMERIC,
  difference         NUMERIC,
  percent_difference NUMERIC,
  trend              VARCHAR(20),
  created_at         TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS comparisons_report_idx ON branch_comparisons(report_id);
CREATE INDEX IF NOT EXISTS comparisons_metric_idx ON branch_comparisons(metric);

-- ── 6. trend_metrics ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trend_metrics (
  id             SERIAL PRIMARY KEY,
  report_id      INTEGER REFERENCES detailed_reports(id) ON DELETE CASCADE,
  branch_id      INTEGER REFERENCES branches(id),
  metric_name    VARCHAR(100) NOT NULL,
  date           DATE NOT NULL,
  value          NUMERIC NOT NULL,
  previous_value NUMERIC,
  change_percent NUMERIC,
  target         NUMERIC,
  status         VARCHAR(20),
  notes          TEXT,
  created_at     TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trends_report_idx ON trend_metrics(report_id);
CREATE INDEX IF NOT EXISTS trends_branch_idx ON trend_metrics(branch_id);
CREATE INDEX IF NOT EXISTS trends_metric_idx ON trend_metrics(metric_name);
CREATE INDEX IF NOT EXISTS trends_date_idx   ON trend_metrics(date);

-- ── 7. ai_report_summaries ────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_report_summaries (
  id              SERIAL PRIMARY KEY,
  report_id       INTEGER NOT NULL REFERENCES detailed_reports(id) ON DELETE CASCADE,
  summary         TEXT NOT NULL,
  key_findings    JSONB,
  recommendations JSONB,
  visual_insights JSONB,
  generated_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS summaries_report_idx ON ai_report_summaries(report_id);

-- ── 8. product_suppliers ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_suppliers (
  id                     SERIAL PRIMARY KEY,
  inventory_id           INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  supplier_id            INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_product_code  VARCHAR(100),
  unit_price             NUMERIC(12,2) NOT NULL,
  minimum_order_quantity NUMERIC(12,3) DEFAULT 1,
  lead_time_days         INTEGER DEFAULT 3,
  preference_order       INTEGER DEFAULT 1,
  is_primary             BOOLEAN DEFAULT FALSE,
  is_active              BOOLEAN DEFAULT TRUE,
  notes                  TEXT,
  created_at             TIMESTAMP DEFAULT NOW(),
  updated_at             TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ps_inventory_idx ON product_suppliers(inventory_id);
CREATE INDEX IF NOT EXISTS ps_supplier_idx  ON product_suppliers(supplier_id);

-- ── 9. recipe_ingredients ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id           SERIAL PRIMARY KEY,
  recipe_id    INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE RESTRICT,
  quantity     NUMERIC(10,3) NOT NULL,
  unit         VARCHAR(20) NOT NULL,
  cup_size     VARCHAR(20) DEFAULT 'all',
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ri_recipe_idx    ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS ri_inventory_idx ON recipe_ingredients(inventory_id);

-- ── 10. notification_policies ─────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_policies (
  id                SERIAL PRIMARY KEY,
  role              VARCHAR(50) NOT NULL,
  category          VARCHAR(50) NOT NULL,
  default_frequency VARCHAR(20) NOT NULL DEFAULT 'instant',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_policies_role ON notification_policies(role, category);

-- ── 11. notification_preferences ─────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  id         SERIAL PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category   VARCHAR(50) NOT NULL,
  frequency  VARCHAR(20) NOT NULL DEFAULT 'instant',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id, category);

-- ── 12. notification_digest_queue ────────────────────────────
CREATE TABLE IF NOT EXISTS notification_digest_queue (
  id         SERIAL PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(100) NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  branch_id  INTEGER,
  category   VARCHAR(50) NOT NULL,
  processed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_digest_queue_user ON notification_digest_queue(user_id, processed);

-- ── 13. dobody_action_templates ───────────────────────────────
CREATE TABLE IF NOT EXISTS dobody_action_templates (
  id                  SERIAL PRIMARY KEY,
  template_key        VARCHAR(100) NOT NULL,
  label_tr            VARCHAR(200) NOT NULL,
  message_template    TEXT NOT NULL,
  default_action_type VARCHAR(30) NOT NULL DEFAULT 'send_notification',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS dobody_action_templates_template_key_unique
  ON dobody_action_templates(template_key);

COMMIT;
