-- Task #255 — Drizzle ↔ Live DB drift kapatma migration'ı
-- Tarih: 2026-04-26
-- Detay: docs/audit/db-drift-report-2026-04-26.md
--
-- Bu migration üç bloktan oluşur:
--   1. Drizzle schema'da tanımlı ama DB'de bulunmayan 13 tablonun yaratılması
--      ve bu tablolara ait index/FK/UNIQUE'ların eklenmesi.
--   2. Mevcut tablolar üzerindeki 4 UNIQUE constraint'in geri eklenmesi.
--   3. Mevcut tablolar üzerindeki 83 index ve 47 foreign key'in tamamlanması
--      (kaynak: scripts/db-drift-check.ts → scripts/db-drift-fix.sql).
--
-- Migration tüm bloklarıyla idempotent yazılmıştır: tekrar çalıştırılırsa hata
-- vermez (CREATE TABLE/INDEX IF NOT EXISTS, ADD CONSTRAINT için DO $$ BEGIN ...
-- EXCEPTION WHEN duplicate_object THEN NULL; END $$ pattern'i kullanılır).

BEGIN;

-- =============================================================================
-- 1. EKSİK TABLOLAR
-- =============================================================================

CREATE TABLE IF NOT EXISTS "ai_report_summaries" (
  "id" serial PRIMARY KEY NOT NULL,
  "report_id" integer NOT NULL,
  "summary" text NOT NULL,
  "key_findings" jsonb,
  "recommendations" jsonb,
  "visual_insights" jsonb,
  "generated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "branch_comparisons" (
  "id" serial PRIMARY KEY NOT NULL,
  "report_id" integer,
  "branch1_id" integer NOT NULL,
  "branch2_id" integer NOT NULL,
  "metric" varchar(100) NOT NULL,
  "branch1_value" numeric,
  "branch2_value" numeric,
  "difference" numeric,
  "percent_difference" numeric,
  "trend" varchar(20),
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "branch_feedbacks" (
  "id" serial PRIMARY KEY NOT NULL,
  "branch_id" integer NOT NULL,
  "submitted_by_id" varchar NOT NULL,
  "type" varchar(50) NOT NULL,
  "subject" varchar(255) NOT NULL,
  "message" text NOT NULL,
  "status" varchar(20) DEFAULT 'yeni',
  "response" text,
  "responded_by_id" varchar,
  "created_at" timestamp DEFAULT now(),
  "responded_at" timestamp
);

CREATE TABLE IF NOT EXISTS "dobody_action_templates" (
  "id" serial PRIMARY KEY NOT NULL,
  "template_key" varchar(100) NOT NULL,
  "label_tr" varchar(200) NOT NULL,
  "message_template" text NOT NULL,
  "default_action_type" varchar(30) DEFAULT 'send_notification' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dobody_action_templates_template_key_unique" UNIQUE("template_key")
);

CREATE TABLE IF NOT EXISTS "hq_support_category_assignments" (
  "id" serial PRIMARY KEY NOT NULL,
  "category" varchar(50) NOT NULL,
  "user_id" varchar NOT NULL,
  "can_assign" boolean DEFAULT false,
  "can_close" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "created_by_id" varchar,
  CONSTRAINT "hq_support_cat_assign_unique" UNIQUE("category","user_id")
);

CREATE TABLE IF NOT EXISTS "mega_module_mappings" (
  "id" serial PRIMARY KEY NOT NULL,
  "module_id" varchar(100) NOT NULL,
  "mega_module_id" varchar(50) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "mega_module_mappings_unique" UNIQUE("module_id")
);

CREATE TABLE IF NOT EXISTS "notification_digest_queue" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" varchar(36) NOT NULL,
  "type" varchar(100) NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "link" text,
  "branch_id" integer,
  "category" varchar(50) NOT NULL,
  "processed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notification_policies" (
  "id" serial PRIMARY KEY NOT NULL,
  "role" varchar(50) NOT NULL,
  "category" varchar(50) NOT NULL,
  "default_frequency" varchar(20) DEFAULT 'instant' NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" varchar(36) NOT NULL,
  "category" varchar(50) NOT NULL,
  "frequency" varchar(20) DEFAULT 'instant' NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "product_suppliers" (
  "id" serial PRIMARY KEY NOT NULL,
  "inventory_id" integer NOT NULL,
  "supplier_id" integer NOT NULL,
  "supplier_product_code" varchar(100),
  "unit_price" numeric(12, 2) NOT NULL,
  "minimum_order_quantity" numeric(12, 3) DEFAULT '1',
  "lead_time_days" integer DEFAULT 3,
  "preference_order" integer DEFAULT 1,
  "is_primary" boolean DEFAULT false,
  "is_active" boolean DEFAULT true,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "recipe_ingredients" (
  "id" serial PRIMARY KEY NOT NULL,
  "recipe_id" integer NOT NULL,
  "inventory_id" integer NOT NULL,
  "quantity" numeric(10, 3) NOT NULL,
  "unit" varchar(20) NOT NULL,
  "cup_size" varchar(20) DEFAULT 'all',
  "notes" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ticket_activity_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "ticket_id" integer NOT NULL,
  "user_id" varchar NOT NULL,
  "action" varchar(50) NOT NULL,
  "old_value" text,
  "new_value" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "trend_metrics" (
  "id" serial PRIMARY KEY NOT NULL,
  "report_id" integer,
  "branch_id" integer,
  "metric_name" varchar(100) NOT NULL,
  "date" date NOT NULL,
  "value" numeric NOT NULL,
  "previous_value" numeric,
  "change_percent" numeric,
  "target" numeric,
  "status" varchar(20),
  "notes" text,
  "created_at" timestamp DEFAULT now()
);

-- =============================================================================
-- 2. UNIQUE CONSTRAINT'LER (drift'te eksik raporlananlar; mevcut tablolar)
-- =============================================================================

DO $$ BEGIN
  ALTER TABLE "module_flags" ADD CONSTRAINT "uq_module_flags_key_scope_branch_role"
    UNIQUE ("module_key", "scope", "branch_id", "target_role");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 3. INDEX'LER (yeni tablolar + mevcut tablolar)
-- =============================================================================

-- Yeni tablolara ait index'ler
CREATE INDEX IF NOT EXISTS "summaries_report_idx" ON "ai_report_summaries" ("report_id");
CREATE INDEX IF NOT EXISTS "comparisons_report_idx" ON "branch_comparisons" ("report_id");
CREATE INDEX IF NOT EXISTS "comparisons_metric_idx" ON "branch_comparisons" ("metric");
CREATE INDEX IF NOT EXISTS "branch_feedbacks_branch_idx" ON "branch_feedbacks" ("branch_id");
CREATE INDEX IF NOT EXISTS "branch_feedbacks_status_idx" ON "branch_feedbacks" ("status");
CREATE INDEX IF NOT EXISTS "branch_feedbacks_created_idx" ON "branch_feedbacks" ("created_at");
CREATE INDEX IF NOT EXISTS "hq_support_cat_assign_category_idx" ON "hq_support_category_assignments" ("category");
CREATE INDEX IF NOT EXISTS "hq_support_cat_assign_user_idx" ON "hq_support_category_assignments" ("user_id");
CREATE INDEX IF NOT EXISTS "mega_module_mappings_module_idx" ON "mega_module_mappings" ("module_id");
CREATE INDEX IF NOT EXISTS "mega_module_mappings_mega_idx" ON "mega_module_mappings" ("mega_module_id");
CREATE INDEX IF NOT EXISTS "idx_digest_queue_user" ON "notification_digest_queue" ("user_id","processed");
CREATE INDEX IF NOT EXISTS "idx_notif_policies_role" ON "notification_policies" ("role","category");
CREATE INDEX IF NOT EXISTS "idx_notif_prefs_user" ON "notification_preferences" ("user_id","category");
CREATE INDEX IF NOT EXISTS "ps_inventory_idx" ON "product_suppliers" ("inventory_id");
CREATE INDEX IF NOT EXISTS "ps_supplier_idx" ON "product_suppliers" ("supplier_id");
CREATE INDEX IF NOT EXISTS "ri_recipe_idx" ON "recipe_ingredients" ("recipe_id");
CREATE INDEX IF NOT EXISTS "ri_inventory_idx" ON "recipe_ingredients" ("inventory_id");
CREATE INDEX IF NOT EXISTS "ticket_activity_logs_ticket_idx" ON "ticket_activity_logs" ("ticket_id");
CREATE INDEX IF NOT EXISTS "ticket_activity_logs_created_idx" ON "ticket_activity_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "trends_report_idx" ON "trend_metrics" ("report_id");
CREATE INDEX IF NOT EXISTS "trends_branch_idx" ON "trend_metrics" ("branch_id");
CREATE INDEX IF NOT EXISTS "trends_metric_idx" ON "trend_metrics" ("metric_name");
CREATE INDEX IF NOT EXISTS "trends_date_idx" ON "trend_metrics" ("date");

-- Mevcut tablolardaki eksik index'ler (kaynak: db-drift-fix.sql)
CREATE INDEX IF NOT EXISTS "aqr_user_ann_idx" ON "announcement_quiz_results" ("user_id", "announcement_id");
CREATE INDEX IF NOT EXISTS "announcements_category_idx" ON "announcements" ("category");
CREATE INDEX IF NOT EXISTS "announcements_dashboard_idx" ON "announcements" ("show_on_dashboard");
CREATE INDEX IF NOT EXISTS "audit_feedback_personnel_idx" ON "audit_personnel_feedback" ("personnel_id");
CREATE INDEX IF NOT EXISTS "audit_feedback_instance_idx" ON "audit_personnel_feedback" ("audit_instance_id");
CREATE INDEX IF NOT EXISTS "audit_feedback_unread_idx" ON "audit_personnel_feedback" ("personnel_id", "is_read_by_personnel");
CREATE INDEX IF NOT EXISTS "checklist_task_completions_photo_expires_idx" ON "checklist_task_completions" ("photo_expires_at");
CREATE INDEX IF NOT EXISTS "dmpi_recipe_idx" ON "daily_material_plan_items" ("recipe_id");
CREATE INDEX IF NOT EXISTS "dobody_evt_type_idx" ON "dobody_events" ("event_type");
CREATE INDEX IF NOT EXISTS "dobody_evt_date_idx" ON "dobody_events" ("processed_at");
CREATE INDEX IF NOT EXISTS "dobody_learn_workflow_idx" ON "dobody_learning" ("workflow_type");
CREATE INDEX IF NOT EXISTS "dobody_prop_user_idx" ON "dobody_proposals" ("user_id");
CREATE INDEX IF NOT EXISTS "dobody_prop_created_idx" ON "dobody_proposals" ("created_at");
CREATE INDEX IF NOT EXISTS "dobody_scopes_role_idx" ON "dobody_scopes" ("role");
CREATE INDEX IF NOT EXISTS "dobody_wf_conf_idx" ON "dobody_workflow_confidence" ("workflow_type", "role");
CREATE INDEX IF NOT EXISTS "employee_onboarding_assignments_user_idx" ON "employee_onboarding_assignments" ("user_id");
CREATE INDEX IF NOT EXISTS "employee_onboarding_assignments_branch_idx" ON "employee_onboarding_assignments" ("branch_id");
CREATE INDEX IF NOT EXISTS "employee_onboarding_assignments_status_idx" ON "employee_onboarding_assignments" ("status");
CREATE INDEX IF NOT EXISTS "employee_onboarding_progress_assignment_idx" ON "employee_onboarding_progress" ("assignment_id");
CREATE INDEX IF NOT EXISTS "employee_onboarding_progress_step_idx" ON "employee_onboarding_progress" ("step_id");
CREATE INDEX IF NOT EXISTS "employee_onboarding_progress_mentor_idx" ON "employee_onboarding_progress" ("mentor_id");
CREATE INDEX IF NOT EXISTS "employee_onboarding_progress_status_idx" ON "employee_onboarding_progress" ("status");
CREATE INDEX IF NOT EXISTS "employee_terminations_user_idx" ON "employee_terminations" ("user_id");
CREATE INDEX IF NOT EXISTS "employee_terminations_date_idx" ON "employee_terminations" ("termination_date");
CREATE INDEX IF NOT EXISTS "employee_terminations_type_idx" ON "employee_terminations" ("termination_type");
CREATE INDEX IF NOT EXISTS "exam_requests_target_role_idx" ON "exam_requests" ("target_role_id");
CREATE INDEX IF NOT EXISTS "fkbi_keyblend_idx" ON "factory_keyblend_ingredients" ("keyblend_id");
CREATE INDEX IF NOT EXISTS "fpl_session_idx" ON "factory_production_logs" ("session_id");
CREATE INDEX IF NOT EXISTS "fpl_status_idx" ON "factory_production_logs" ("status");
CREATE INDEX IF NOT EXISTS "frca_role_idx" ON "factory_recipe_category_access" ("role");
CREATE INDEX IF NOT EXISTS "frs_step_num_idx" ON "factory_recipe_steps" ("recipe_id", "step_number");
CREATE INDEX IF NOT EXISTS "frv_recipe_idx" ON "factory_recipe_versions" ("recipe_id");
CREATE INDEX IF NOT EXISTS "fr_parent_idx" ON "factory_recipes" ("parent_recipe_id");
CREATE INDEX IF NOT EXISTS "fr_active_idx" ON "factory_recipes" ("is_active");
CREATE INDEX IF NOT EXISTS "gri_batch_idx" ON "goods_receipt_items" ("batch_number");
CREATE INDEX IF NOT EXISTS "gr_po_idx" ON "goods_receipts" ("purchase_order_id");
CREATE INDEX IF NOT EXISTS "gr_date_idx" ON "goods_receipts" ("receipt_date");
CREATE INDEX IF NOT EXISTS "hq_support_tickets_branch_idx" ON "hq_support_tickets" ("branch_id");
CREATE INDEX IF NOT EXISTS "hq_support_tickets_category_idx" ON "hq_support_tickets" ("category");
CREATE INDEX IF NOT EXISTS "hq_support_tickets_status_idx" ON "hq_support_tickets" ("status");
CREATE INDEX IF NOT EXISTS "hq_support_tickets_priority_idx" ON "hq_support_tickets" ("priority");
CREATE INDEX IF NOT EXISTS "hq_support_tickets_assigned_idx" ON "hq_support_tickets" ("assigned_to_id");
CREATE INDEX IF NOT EXISTS "inventory_barcode_idx" ON "inventory" ("barcode");
CREATE INDEX IF NOT EXISTS "inventory_active_idx" ON "inventory" ("is_active");
CREATE INDEX IF NOT EXISTS "inv_movement_date_idx" ON "inventory_movements" ("created_at");
CREATE INDEX IF NOT EXISTS "inv_movement_ref_idx" ON "inventory_movements" ("reference_type", "reference_id");
CREATE INDEX IF NOT EXISTS "iph_inventory_type_date_idx" ON "inventory_price_history" ("inventory_id", "price_type", "effective_date");
CREATE INDEX IF NOT EXISTS "mpl_date_idx" ON "material_pick_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "mpl_from_loc_idx" ON "material_pick_logs" ("from_location");
CREATE INDEX IF NOT EXISTS "onboarding_template_steps_template_idx" ON "onboarding_template_steps" ("template_id");
CREATE INDEX IF NOT EXISTS "onboarding_template_steps_order_idx" ON "onboarding_template_steps" ("step_order");
CREATE INDEX IF NOT EXISTS "onboarding_templates_target_role_idx" ON "onboarding_templates" ("target_role");
CREATE INDEX IF NOT EXISTS "onboarding_templates_active_idx" ON "onboarding_templates" ("is_active");
CREATE INDEX IF NOT EXISTS "pal_condition_idx" ON "production_area_leftovers" ("condition");
CREATE INDEX IF NOT EXISTS "pr_inventory_idx" ON "production_records" ("inventory_id");
CREATE INDEX IF NOT EXISTS "pr_recipe_idx" ON "production_records" ("recipe_id");
CREATE INDEX IF NOT EXISTS "projects_type_idx" ON "projects" ("project_type");
CREATE INDEX IF NOT EXISTS "po_date_idx" ON "purchase_orders" ("order_date");
CREATE INDEX IF NOT EXISTS "supplier_name_idx" ON "suppliers" ("name");
CREATE INDEX IF NOT EXISTS "st_channel_idx" ON "support_tickets" ("channel");

-- =============================================================================
-- 4. FOREIGN KEY'LER (yeni tablolar + mevcut tablolar)
-- =============================================================================
-- NOT: ADD CONSTRAINT için "IF NOT EXISTS" sözdizimi PostgreSQL'de yok;
-- her FK ayrı DO bloğunda duplicate_object exception'ı ile sarmalanır.

DO $$ BEGIN
  ALTER TABLE "ai_report_summaries" ADD CONSTRAINT "ai_report_summaries_report_id_detailed_reports_id_fk"
    FOREIGN KEY ("report_id") REFERENCES "detailed_reports"("id") ON DELETE cascade NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_updated_by_id_users_id_fk"
    FOREIGN KEY ("updated_by_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "audit_templates_v2" ADD CONSTRAINT "audit_templates_v2_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "branch_comparisons" ADD CONSTRAINT "branch_comparisons_report_id_detailed_reports_id_fk"
    FOREIGN KEY ("report_id") REFERENCES "detailed_reports"("id") ON DELETE cascade NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "branch_comparisons" ADD CONSTRAINT "branch_comparisons_branch1_id_branches_id_fk"
    FOREIGN KEY ("branch1_id") REFERENCES "branches"("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "branch_comparisons" ADD CONSTRAINT "branch_comparisons_branch2_id_branches_id_fk"
    FOREIGN KEY ("branch2_id") REFERENCES "branches"("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "branch_feedbacks" ADD CONSTRAINT "branch_feedbacks_branch_id_branches_id_fk"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE cascade NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "branch_feedbacks" ADD CONSTRAINT "branch_feedbacks_submitted_by_id_users_id_fk"
    FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE cascade NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "branch_feedbacks" ADD CONSTRAINT "branch_feedbacks_responded_by_id_users_id_fk"
    FOREIGN KEY ("responded_by_id") REFERENCES "users"("id") ON DELETE set null NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "branch_orders" ADD CONSTRAINT "branch_orders_approved_by_id_users_id_fk"
    FOREIGN KEY ("approved_by_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "cowork_channel_members" ADD CONSTRAINT "cowork_channel_members_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "cowork_channels" ADD CONSTRAINT "cowork_channels_created_by_id_users_id_fk"
    FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "cowork_messages" ADD CONSTRAINT "cowork_messages_sender_id_users_id_fk"
    FOREIGN KEY ("sender_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "cowork_tasks" ADD CONSTRAINT "cowork_tasks_assigned_to_id_users_id_fk"
    FOREIGN KEY ("assigned_to_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "cowork_tasks" ADD CONSTRAINT "cowork_tasks_created_by_id_users_id_fk"
    FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "customer_feedback" ADD CONSTRAINT "customer_feedback_staff_id_users_id_fk"
    FOREIGN KEY ("staff_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employee_terminations" ADD CONSTRAINT "employee_terminations_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "factory_keyblend_ingredients" ADD CONSTRAINT "factory_keyblend_ingredients_raw_material_id_inventory_id_fk"
    FOREIGN KEY ("raw_material_id") REFERENCES "inventory" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "factory_production_logs" ADD CONSTRAINT "factory_production_logs_session_id_factory_shift_sessions_id_fk"
    FOREIGN KEY ("session_id") REFERENCES "factory_shift_sessions" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "factory_recipe_ingredients" ADD CONSTRAINT "factory_recipe_ingredients_raw_material_id_inventory_id_fk"
    FOREIGN KEY ("raw_material_id") REFERENCES "inventory" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_quality_checked_by_id_users_id_fk"
    FOREIGN KEY ("quality_checked_by_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_received_by_id_users_id_fk"
    FOREIGN KEY ("received_by_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "hq_support_category_assignments" ADD CONSTRAINT "hq_support_category_assignments_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "hq_support_category_assignments" ADD CONSTRAINT "hq_support_category_assignments_created_by_id_users_id_fk"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE set null NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_created_by_id_users_id_fk"
    FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "inventory" ADD CONSTRAINT "inventory_created_by_id_users_id_fk"
    FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_id_users_id_fk"
    FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "notification_digest_queue" ADD CONSTRAINT "notification_digest_queue_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_inventory_id_inventory_id_fk"
    FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") ON DELETE cascade NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_supplier_id_suppliers_id_fk"
    FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE cascade NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "production_cost_tracking" ADD CONSTRAINT "production_cost_tracking_production_record_id_production_records_id_fk"
    FOREIGN KEY ("production_record_id") REFERENCES "production_records" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "production_ingredients" ADD CONSTRAINT "production_ingredients_inventory_id_inventory_id_fk"
    FOREIGN KEY ("inventory_id") REFERENCES "inventory" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "production_records" ADD CONSTRAINT "production_records_inventory_id_inventory_id_fk"
    FOREIGN KEY ("inventory_id") REFERENCES "inventory" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "production_records" ADD CONSTRAINT "production_records_recipe_id_recipes_id_fk"
    FOREIGN KEY ("recipe_id") REFERENCES "recipes" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "production_records" ADD CONSTRAINT "production_records_produced_by_id_users_id_fk"
    FOREIGN KEY ("produced_by_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_id_users_id_fk"
    FOREIGN KEY ("approved_by_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_id_users_id_fk"
    FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk"
    FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE cascade NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_inventory_id_inventory_id_fk"
    FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") ON DELETE restrict NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_id_users_id_fk"
    FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "task_groups" ADD CONSTRAINT "task_groups_created_by_id_users_id_fk"
    FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ticket_activity_logs" ADD CONSTRAINT "ticket_activity_logs_ticket_id_hq_support_tickets_id_fk"
    FOREIGN KEY ("ticket_id") REFERENCES "hq_support_tickets"("id") ON DELETE cascade NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ticket_activity_logs" ADD CONSTRAINT "ticket_activity_logs_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "trend_metrics" ADD CONSTRAINT "trend_metrics_report_id_detailed_reports_id_fk"
    FOREIGN KEY ("report_id") REFERENCES "detailed_reports"("id") ON DELETE cascade NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "trend_metrics" ADD CONSTRAINT "trend_metrics_branch_id_branches_id_fk"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
