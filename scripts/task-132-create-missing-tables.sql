-- ═══════════════════════════════════════════════════════════════════
-- TASK #132 — Şemada tanımlı ama DB'de olmayan 17 tabloyu yarat
-- 23 Nis 2026
-- ═══════════════════════════════════════════════════════════════════
--
-- AMAÇ:
--   shared/schema/* içinde pgTable() ile tanımlı ama PostgreSQL'de
--   bulunmayan 17 tabloyu CREATE TABLE IF NOT EXISTS ile ekler.
--   Tablolar oluşturulduktan sonra scripts/db-drift-fix.sql artık
--   "atlandı" notu üretmeyecek; eksik UNIQUE/index/FK'ler de
--   uygulanabilir hale gelecek.
--
-- IDEMPOTENT:
--   Tüm CREATE TABLE / CREATE INDEX deyimleri IF NOT EXISTS kullanır.
--   Birden fazla kez çalıştırılabilir.
--
-- DOĞRULAMA:
--   tsx scripts/db-drift-check.ts
--   → "DB'de bulunmayan tablo: 0" görünmeli.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────
-- 1. ai_report_summaries  (shared/schema/schema-07.ts)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_report_summaries (
  id              serial PRIMARY KEY,
  report_id       integer NOT NULL REFERENCES detailed_reports(id) ON DELETE CASCADE,
  summary         text NOT NULL,
  key_findings    jsonb,
  recommendations jsonb,
  visual_insights jsonb,
  generated_at    timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS summaries_report_idx
  ON ai_report_summaries(report_id);

-- ───────────────────────────────────────────────────────────────────
-- 2. branch_comparisons  (shared/schema/schema-07.ts)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_comparisons (
  id                  serial PRIMARY KEY,
  report_id           integer REFERENCES detailed_reports(id) ON DELETE CASCADE,
  branch1_id          integer NOT NULL REFERENCES branches(id),
  branch2_id          integer NOT NULL REFERENCES branches(id),
  metric              varchar(100) NOT NULL,
  branch1_value       numeric,
  branch2_value       numeric,
  difference          numeric,
  percent_difference  numeric,
  trend               varchar(20),
  created_at          timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comparisons_report_idx ON branch_comparisons(report_id);
CREATE INDEX IF NOT EXISTS comparisons_metric_idx ON branch_comparisons(metric);

-- ───────────────────────────────────────────────────────────────────
-- 3. branch_feedbacks  (shared/schema/schema-06.ts)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_feedbacks (
  id                serial PRIMARY KEY,
  branch_id         integer NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  submitted_by_id   varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              varchar(50) NOT NULL,
  subject           varchar(255) NOT NULL,
  message           text NOT NULL,
  status            varchar(20) DEFAULT 'yeni',
  response          text,
  responded_by_id   varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamp DEFAULT now(),
  responded_at      timestamp
);
CREATE INDEX IF NOT EXISTS branch_feedbacks_branch_idx  ON branch_feedbacks(branch_id);
CREATE INDEX IF NOT EXISTS branch_feedbacks_status_idx  ON branch_feedbacks(status);
CREATE INDEX IF NOT EXISTS branch_feedbacks_created_idx ON branch_feedbacks(created_at);

-- ───────────────────────────────────────────────────────────────────
-- 4. dobody_action_templates  (shared/schema/schema-15-ajanda.ts)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dobody_action_templates (
  id                    serial PRIMARY KEY,
  template_key          varchar(100) NOT NULL,
  label_tr              varchar(200) NOT NULL,
  message_template      text NOT NULL,
  default_action_type   varchar(30) NOT NULL DEFAULT 'send_notification',
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dobody_action_templates_template_key_unique UNIQUE (template_key)
);

-- ───────────────────────────────────────────────────────────────────
-- 5. factory_ingredient_nutrition_history  (shared/schema/schema-22-factory-recipes.ts)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factory_ingredient_nutrition_history (
  id                serial PRIMARY KEY,
  nutrition_id      integer REFERENCES factory_ingredient_nutrition(id) ON DELETE CASCADE,
  ingredient_name   varchar(255) NOT NULL,
  action            varchar(20) NOT NULL,
  source            varchar(30) NOT NULL,
  before            jsonb,
  after             jsonb NOT NULL,
  changed_by        varchar REFERENCES users(id) ON DELETE SET NULL,
  changed_by_role   varchar(30),
  changed_at        timestamptz NOT NULL DEFAULT now(),
  note              text
);
CREATE INDEX IF NOT EXISTS finh_nutrition_idx   ON factory_ingredient_nutrition_history(nutrition_id);
CREATE INDEX IF NOT EXISTS finh_name_idx        ON factory_ingredient_nutrition_history(ingredient_name);
CREATE INDEX IF NOT EXISTS finh_changed_at_idx  ON factory_ingredient_nutrition_history(changed_at);

-- ───────────────────────────────────────────────────────────────────
-- 6. factory_recipe_approvals  (Task #164 — migrations/task-164-*.sql)
--    NOT: Asıl backfill migrations/task-164-factory-recipe-approvals.sql
--    içinde; burada sadece şema (boş tablo) oluşturulur.
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factory_recipe_approvals (
  id                       serial PRIMARY KEY,
  recipe_id                integer NOT NULL REFERENCES factory_recipes(id) ON DELETE CASCADE,
  scope                    varchar(20) NOT NULL,
  approved_by              varchar NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_at              timestamptz NOT NULL DEFAULT now(),
  note                     text,
  recipe_version_id        integer REFERENCES factory_recipe_versions(id) ON DELETE SET NULL,
  recipe_version_number    integer,
  source_ref               varchar(50),
  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fra_recipe_idx        ON factory_recipe_approvals(recipe_id);
CREATE INDEX IF NOT EXISTS fra_recipe_scope_idx  ON factory_recipe_approvals(recipe_id, scope);
CREATE INDEX IF NOT EXISTS fra_scope_idx         ON factory_recipe_approvals(scope);
CREATE INDEX IF NOT EXISTS fra_approved_at_idx   ON factory_recipe_approvals(approved_at);

-- ───────────────────────────────────────────────────────────────────
-- 7. factory_recipe_ingredient_snapshots  (Task #182)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factory_recipe_ingredient_snapshots (
  id                serial PRIMARY KEY,
  recipe_id         integer NOT NULL REFERENCES factory_recipes(id) ON DELETE CASCADE,
  snapshot          jsonb NOT NULL,
  ingredient_count  integer NOT NULL DEFAULT 0,
  reason            varchar(50) DEFAULT 'bulk_import',
  created_by        varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  restored_at       timestamptz
);
CREATE INDEX IF NOT EXISTS fris_recipe_idx
  ON factory_recipe_ingredient_snapshots(recipe_id, created_at);

-- ───────────────────────────────────────────────────────────────────
-- 8. factory_recipe_label_print_logs  (Task #187)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factory_recipe_label_print_logs (
  id                  serial PRIMARY KEY,
  recipe_id           integer NOT NULL REFERENCES factory_recipes(id) ON DELETE CASCADE,
  recipe_code         varchar(50),
  recipe_name         varchar(255),
  printed_by          varchar REFERENCES users(id) ON DELETE SET NULL,
  is_draft            boolean NOT NULL DEFAULT false,
  grammage_approved   boolean NOT NULL DEFAULT false,
  draft_reason        varchar(255),
  printed_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS frlpl_recipe_idx     ON factory_recipe_label_print_logs(recipe_id);
CREATE INDEX IF NOT EXISTS frlpl_printed_at_idx ON factory_recipe_label_print_logs(printed_at);
CREATE INDEX IF NOT EXISTS frlpl_printed_by_idx ON factory_recipe_label_print_logs(printed_by);

-- ───────────────────────────────────────────────────────────────────
-- 9. hq_support_category_assignments  (shared/schema/schema-03.ts)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_support_category_assignments (
  id              serial PRIMARY KEY,
  category        varchar(50) NOT NULL,
  user_id         varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_assign      boolean DEFAULT false,
  can_close       boolean DEFAULT true,
  created_at      timestamp DEFAULT now(),
  created_by_id   varchar REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT hq_support_cat_assign_unique UNIQUE (category, user_id)
);
CREATE INDEX IF NOT EXISTS hq_support_cat_assign_category_idx ON hq_support_category_assignments(category);
CREATE INDEX IF NOT EXISTS hq_support_cat_assign_user_idx     ON hq_support_category_assignments(user_id);

-- ───────────────────────────────────────────────────────────────────
-- 10. mega_module_mappings  (shared/schema/schema-05.ts)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mega_module_mappings (
  id              serial PRIMARY KEY,
  module_id       varchar(100) NOT NULL,
  mega_module_id  varchar(50) NOT NULL,
  sort_order      integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamp DEFAULT now(),
  updated_at      timestamp DEFAULT now(),
  CONSTRAINT mega_module_mappings_unique UNIQUE (module_id)
);
CREATE INDEX IF NOT EXISTS mega_module_mappings_module_idx ON mega_module_mappings(module_id);
CREATE INDEX IF NOT EXISTS mega_module_mappings_mega_idx   ON mega_module_mappings(mega_module_id);

-- ───────────────────────────────────────────────────────────────────
-- 11. notification_policies  (shared/schema/schema-15-ajanda.ts)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_policies (
  id                  serial PRIMARY KEY,
  role                varchar(50) NOT NULL,
  category            varchar(50) NOT NULL,
  default_frequency   varchar(20) NOT NULL DEFAULT 'instant',
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_policies_role
  ON notification_policies(role, category);

-- ───────────────────────────────────────────────────────────────────
-- 12. notification_preferences  (shared/schema/schema-15-ajanda.ts)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  id          serial PRIMARY KEY,
  user_id     varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    varchar(50) NOT NULL,
  frequency   varchar(20) NOT NULL DEFAULT 'instant',
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user
  ON notification_preferences(user_id, category);

-- ───────────────────────────────────────────────────────────────────
-- 13. notification_digest_queue  (shared/schema/schema-15-ajanda.ts)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_digest_queue (
  id          serial PRIMARY KEY,
  user_id     varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        varchar(100) NOT NULL,
  title       text NOT NULL,
  message     text NOT NULL,
  link        text,
  branch_id   integer,
  category    varchar(50) NOT NULL,
  processed   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_digest_queue_user
  ON notification_digest_queue(user_id, processed);

-- ───────────────────────────────────────────────────────────────────
-- 14. product_suppliers  (shared/schema/schema-09.ts)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_suppliers (
  id                       serial PRIMARY KEY,
  inventory_id             integer NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  supplier_id              integer NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_product_code    varchar(100),
  unit_price               numeric(12, 2) NOT NULL,
  minimum_order_quantity   numeric(12, 3) DEFAULT 1,
  lead_time_days           integer DEFAULT 3,
  preference_order         integer DEFAULT 1,
  is_primary               boolean DEFAULT false,
  is_active                boolean DEFAULT true,
  notes                    text,
  created_at               timestamp DEFAULT now(),
  updated_at               timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ps_inventory_idx ON product_suppliers(inventory_id);
CREATE INDEX IF NOT EXISTS ps_supplier_idx  ON product_suppliers(supplier_id);

-- ───────────────────────────────────────────────────────────────────
-- 15. recipe_ingredients  (shared/schema/schema-10.ts)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id            serial PRIMARY KEY,
  recipe_id     integer NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  inventory_id  integer NOT NULL REFERENCES inventory(id) ON DELETE RESTRICT,
  quantity      numeric(10, 3) NOT NULL,
  unit          varchar(20) NOT NULL,
  cup_size      varchar(20) DEFAULT 'all',
  notes         text,
  created_at    timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ri_recipe_idx    ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS ri_inventory_idx ON recipe_ingredients(inventory_id);

-- ───────────────────────────────────────────────────────────────────
-- 16. ticket_activity_logs  (shared/schema/schema-03.ts)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_activity_logs (
  id          serial PRIMARY KEY,
  ticket_id   integer NOT NULL REFERENCES hq_support_tickets(id) ON DELETE CASCADE,
  user_id     varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      varchar(50) NOT NULL,
  old_value   text,
  new_value   text,
  created_at  timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_activity_logs_ticket_idx  ON ticket_activity_logs(ticket_id);
CREATE INDEX IF NOT EXISTS ticket_activity_logs_created_idx ON ticket_activity_logs(created_at);

-- ───────────────────────────────────────────────────────────────────
-- 17. trend_metrics  (shared/schema/schema-07.ts)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trend_metrics (
  id              serial PRIMARY KEY,
  report_id       integer REFERENCES detailed_reports(id) ON DELETE CASCADE,
  branch_id       integer REFERENCES branches(id),
  metric_name     varchar(100) NOT NULL,
  date            date NOT NULL,
  value           numeric NOT NULL,
  previous_value  numeric,
  change_percent  numeric,
  target          numeric,
  status          varchar(20),
  notes           text,
  created_at      timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trends_report_idx ON trend_metrics(report_id);
CREATE INDEX IF NOT EXISTS trends_branch_idx ON trend_metrics(branch_id);
CREATE INDEX IF NOT EXISTS trends_metric_idx ON trend_metrics(metric_name);
CREATE INDEX IF NOT EXISTS trends_date_idx   ON trend_metrics(date);

-- ───────────────────────────────────────────────────────────────────
-- DOĞRULAMA
-- ───────────────────────────────────────────────────────────────────
DO $$
DECLARE
  missing_count INTEGER;
  expected TEXT[] := ARRAY[
    'ai_report_summaries','branch_comparisons','branch_feedbacks',
    'dobody_action_templates','factory_ingredient_nutrition_history',
    'factory_recipe_approvals','factory_recipe_ingredient_snapshots',
    'factory_recipe_label_print_logs','hq_support_category_assignments',
    'mega_module_mappings','notification_digest_queue',
    'notification_policies','notification_preferences','product_suppliers',
    'recipe_ingredients','ticket_activity_logs','trend_metrics'
  ];
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM unnest(expected) AS t(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t.name
  );

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Task #132: % tablo hala eksik', missing_count;
  ELSE
    RAISE NOTICE '✓ Task #132: 17 tablo başarıyla yaratıldı / mevcut.';
  END IF;
END $$;

COMMIT;
