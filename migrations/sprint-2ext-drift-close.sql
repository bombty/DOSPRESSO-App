-- ============================================================================
-- Task #305 — Bundle 1A: DB Drift Close (Mekanik Kısım)
-- Tarih: 2026-05-03
-- Sorumlu: Main Agent (Aslan onayı ile)
-- Kapsam: 42 kolon (40 dönüşüm + 2 K5B int[]) + 6 yeni ai_settings kolonu
--         + 60 index + 28 FK = 136 item (module_flags UNIQUE COALESCE-index ile zaten karşılanmış)
-- Dahil: target_branch_ids text→integer[] (Kategori 5B, validator review sonrası)
-- Defer: 13 eksik tablo + bağlı 4 unique/23 idx/19 FK (Bundle 1B)
-- Karar matrisi: docs/audit/comprehensive-2026-05/drift-resolution.md
-- ============================================================================
-- IDEMPOTENCY NOTU: Bu migration tek-seferlik (one-shot). FK ALTER TABLE ADD
-- CONSTRAINT ifadeleri idempotent DEĞİL — replay başarısız olur. Production'a
-- uygulanmış sayılır; tekrar çalıştırılması gerekirse her FK'yı
-- "DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;" bloğuyla
-- sarmak veya migration tracker tablosuna kaydedip skip etmek gerekir.
-- 3 May 2026 APPLY sonrası repository tracker (manual): APPLIED ✓
-- ============================================================================
-- DRY-RUN: BEGIN ile başla, son satırı ROLLBACK olarak değiştir
-- APPLY:   Son satırı COMMIT olarak bırak
-- ============================================================================

BEGIN;

-- ===== KATEGORİ 1 — text ↔ varchar (3 kolon, güvenli genişletme) ============
ALTER TABLE employee_terminations ALTER COLUMN termination_reason TYPE text;
ALTER TABLE equipment ALTER COLUMN image_url TYPE text;
ALTER TABLE task_comments ALTER COLUMN user_id TYPE text;

-- ===== KATEGORİ 2 — integer → numeric (1 kolon) =============================
ALTER TABLE audit_template_items ALTER COLUMN weight TYPE numeric(5, 2) USING weight::numeric(5,2);

-- ===== KATEGORİ 3 — date → timestamp (3 kolon, boş tablo) ====================
ALTER TABLE employee_onboarding_assignments ALTER COLUMN start_date TYPE timestamp USING start_date::timestamp;
ALTER TABLE employee_onboarding_assignments ALTER COLUMN expected_end_date TYPE timestamp USING expected_end_date::timestamp;
ALTER TABLE employee_onboarding_assignments ALTER COLUMN actual_end_date TYPE timestamp USING actual_end_date::timestamp;

-- ===== KATEGORİ 4 — timestamp ↔ timestamptz (8 kolon) ========================
-- DB timestamptz → schema timestamp WITHOUT TZ (7 kolon)
ALTER TABLE employee_onboarding_progress ALTER COLUMN updated_at TYPE timestamp;
ALTER TABLE employee_terminations ALTER COLUMN created_at TYPE timestamp;
ALTER TABLE employee_terminations ALTER COLUMN updated_at TYPE timestamp;
ALTER TABLE onboarding_template_steps ALTER COLUMN updated_at TYPE timestamp;
ALTER TABLE system_critical_logs ALTER COLUMN acknowledged_at TYPE timestamp;
ALTER TABLE system_critical_logs ALTER COLUMN created_at TYPE timestamp;
ALTER TABLE task_escalation_log ALTER COLUMN sent_at TYPE timestamp;

-- DB timestamp WITHOUT → schema timestamptz (1 kolon, Europe/Istanbul yorumla)
ALTER TABLE task_comments ALTER COLUMN created_at TYPE timestamptz USING (created_at AT TIME ZONE 'Europe/Istanbul');

-- ===== KATEGORİ 5 — DROP NOT NULL (6 kolon) =================================
ALTER TABLE branch_shift_sessions ALTER COLUMN gps_fallback_used DROP NOT NULL;
ALTER TABLE employee_onboarding_progress ALTER COLUMN updated_at DROP NOT NULL;
ALTER TABLE employee_terminations ALTER COLUMN termination_reason DROP NOT NULL;
ALTER TABLE onboarding_template_steps ALTER COLUMN updated_at DROP NOT NULL;
ALTER TABLE task_comments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN branch_id DROP NOT NULL;
ALTER TABLE messages ALTER COLUMN type DROP NOT NULL;  -- post-drift discovery (3 May 2026)

-- ===== KATEGORİ 5B — text → integer[] (target_branch_ids final fix) =========
-- Schema authority: shared/schema/schema-02.ts artık integer().array() (satır 3058+3222).
-- DB'yi de int[]'e uyarla.
--
-- Pre-flight veri kanıtı (3 May 2026 APPLY öncesi):
--   tasks: 1343 satır, target_branch_ids non-null = 1, değer = '{5}' (PG array literal,
--          int dizi formatı; JSON dizi DEĞİL — kod zaten int dizi yazıyor)
--   task_groups: 0 satır (boş tablo)
--
-- Bu nedenle:
--   - task_groups: USING NULL (veri yok, kayıp imkansız)
--   - tasks: USING target_branch_ids::integer[] (PG array literal otomatik cast eder)
--
-- Eğer bir gün JSON-style ('[1,2]') veri olsaydı bu cast başarısız olurdu; tablo veri
-- şekli yukarıdaki pre-flight ile doğrulandı. APPLY öncesi tekrar pre-flight koşulması
-- önerilir (satır sayısı ve örnek değer kontrolü).
ALTER TABLE task_groups ALTER COLUMN target_branch_ids TYPE integer[] USING NULL;
ALTER TABLE tasks ALTER COLUMN target_branch_ids TYPE integer[]
  USING target_branch_ids::integer[];

-- ===== KATEGORİ 6 — BACKFILL (1 satır) =======================================
UPDATE employee_terminations
   SET processed_by_id = '18e0cb39-87aa-4862-8f08-f52df6ee01b1'
 WHERE id = 4 AND processed_by_id IS NULL;

-- ===== KATEGORİ 7 — SET NOT NULL (22 kolon, 0 NULL audit doğrulandı) =========
ALTER TABLE ai_settings ALTER COLUMN provider SET NOT NULL;
ALTER TABLE announcements ALTER COLUMN category SET NOT NULL;
ALTER TABLE customer_feedback ALTER COLUMN source SET NOT NULL;
ALTER TABLE customer_feedback ALTER COLUMN priority SET NOT NULL;
ALTER TABLE customer_feedback ALTER COLUMN sla_breached SET NOT NULL;
ALTER TABLE customer_feedback ALTER COLUMN feedback_type SET NOT NULL;
ALTER TABLE customer_feedback ALTER COLUMN requires_contact SET NOT NULL;
ALTER TABLE employee_onboarding_assignments ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE employee_onboarding_assignments ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE employee_onboarding_assignments ALTER COLUMN status SET NOT NULL;
ALTER TABLE employee_onboarding_assignments ALTER COLUMN overall_progress SET NOT NULL;
ALTER TABLE employee_onboarding_assignments ALTER COLUMN manager_notified SET NOT NULL;
ALTER TABLE employee_onboarding_progress ALTER COLUMN status SET NOT NULL;
ALTER TABLE employee_terminations ALTER COLUMN processed_by_id SET NOT NULL;
ALTER TABLE factory_recipe_category_access ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE hq_support_tickets ALTER COLUMN priority SET NOT NULL;
ALTER TABLE onboarding_template_steps ALTER COLUMN step_order SET NOT NULL;
ALTER TABLE onboarding_templates ALTER COLUMN target_role SET NOT NULL;
ALTER TABLE onboarding_templates ALTER COLUMN duration_days SET NOT NULL;
ALTER TABLE onboarding_templates ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE onboarding_templates ALTER COLUMN created_by_id SET NOT NULL;
ALTER TABLE overtime_requests ALTER COLUMN overtime_date SET NOT NULL;
ALTER TABLE overtime_requests ALTER COLUMN start_time SET NOT NULL;
ALTER TABLE overtime_requests ALTER COLUMN end_time SET NOT NULL;

-- ===== KATEGORİ 7B — Orphan FK Backfill (silinmiş user'lara referans → NULL) ====
-- 2 yetim kayıt: customer_feedback.staff_id (1), interview_questions.created_by_id (10)
UPDATE customer_feedback SET staff_id = NULL
 WHERE staff_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = customer_feedback.staff_id);
-- interview_questions.created_by_id NOT NULL → admin user ile backfill
UPDATE interview_questions SET created_by_id = '18e0cb39-87aa-4862-8f08-f52df6ee01b1'
 WHERE created_by_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = interview_questions.created_by_id);

-- ===== KATEGORİ 8-10 — ai_settings 6 kolon + module_flags UNIQUE + 60 idx + 28 FK (auto-üretildi) ===


-- Eksik kolonlar
-- NOT: NOT NULL kolonlar nullable olarak ekleniyor — backfill sonrası SET NOT NULL'u manuel uygulayın.
ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "monthly_budget_usd" numeric(10, 2);
ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "budget_enforcement_enabled" boolean;
ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "budget_alert_threshold_pct" integer;
ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "last_budget_alert_pct" integer;
ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "last_budget_alert_at" timestamp;
ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "last_budget_alert_month" varchar(7);

-- Eksik UNIQUE constraint'ler
-- NOT: Mevcut tabloda duplicate veri varsa ALTER fail eder; önce SELECT ile kontrol edin.
-- SKIPPED (unique index already exists with COALESCE semantics): ALTER TABLE "module_flags" ADD CONSTRAINT "uq_module_flags_key_scope_branch_role" UNIQUE ("module_key", "scope", "branch_id", "target_role");

-- Eksik index'ler
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

-- Eksik foreign key'ler
-- NOT: Orphan satır varsa ALTER fail eder; önce SELECT ile kontrol edin.
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "users" ("id");
ALTER TABLE "audit_templates_v2" ADD CONSTRAINT "audit_templates_v2_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
ALTER TABLE "branch_orders" ADD CONSTRAINT "branch_orders_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "users" ("id");
ALTER TABLE "cowork_channel_members" ADD CONSTRAINT "cowork_channel_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "cowork_channels" ADD CONSTRAINT "cowork_channels_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id");
ALTER TABLE "cowork_messages" ADD CONSTRAINT "cowork_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "users" ("id");
ALTER TABLE "cowork_tasks" ADD CONSTRAINT "cowork_tasks_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "users" ("id");
ALTER TABLE "cowork_tasks" ADD CONSTRAINT "cowork_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id");
ALTER TABLE "customer_feedback" ADD CONSTRAINT "customer_feedback_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "users" ("id");
ALTER TABLE "employee_terminations" ADD CONSTRAINT "employee_terminations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "factory_keyblend_ingredients" ADD CONSTRAINT "factory_keyblend_ingredients_raw_material_id_inventory_id_fk" FOREIGN KEY ("raw_material_id") REFERENCES "inventory" ("id");
ALTER TABLE "factory_production_logs" ADD CONSTRAINT "factory_production_logs_session_id_factory_shift_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "factory_shift_sessions" ("id");
ALTER TABLE "factory_recipe_ingredients" ADD CONSTRAINT "factory_recipe_ingredients_raw_material_id_inventory_id_fk" FOREIGN KEY ("raw_material_id") REFERENCES "inventory" ("id");
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_quality_checked_by_id_users_id_fk" FOREIGN KEY ("quality_checked_by_id") REFERENCES "users" ("id");
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_received_by_id_users_id_fk" FOREIGN KEY ("received_by_id") REFERENCES "users" ("id");
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id");
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id");
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id");
ALTER TABLE "production_cost_tracking" ADD CONSTRAINT "production_cost_tracking_production_record_id_production_records_id_fk" FOREIGN KEY ("production_record_id") REFERENCES "production_records" ("id");
ALTER TABLE "production_ingredients" ADD CONSTRAINT "production_ingredients_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "inventory" ("id");
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "inventory" ("id");
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "recipes" ("id");
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_produced_by_id_users_id_fk" FOREIGN KEY ("produced_by_id") REFERENCES "users" ("id");
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "users" ("id");
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id");
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id");
ALTER TABLE "task_groups" ADD CONSTRAINT "task_groups_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id");

-- 3 UNIQUE, 23 index ve 19 FK, DB'de olmayan tablolar için atlandı.
-- Önce eksik tabloları yaratmak için: npm run db:push (veya scripts/pilot/* script'leri)

-- 42 kolon için tip/nullability uyuşmazlığı var;
-- otomatik üretilmedi (veri kaybı/dönüşüm riski). Konsol raporundan manuel uygulayın.

-- Son satır: DRY-RUN için ROLLBACK, APPLY için COMMIT
COMMIT;
