-- DB DRIFT FIX SCRIPT
-- Üretildi: 2026-04-23T22:40:36.193Z
-- Bu dosya scripts/db-drift-check.ts tarafından otomatik üretilir.
-- Çalıştırmadan önce gözden geçirin (özellikle veri çakışmalarına dikkat).

BEGIN;

-- Eksik UNIQUE constraint'ler
-- NOT: Mevcut tabloda duplicate veri varsa ALTER fail eder; önce SELECT ile kontrol edin.
ALTER TABLE "module_flags" ADD CONSTRAINT "uq_module_flags_key_scope_branch_role" UNIQUE ("module_key", "scope", "branch_id", "target_role");

-- Eksik index'ler
CREATE INDEX IF NOT EXISTS "employee_onboarding_progress_mentor_idx" ON "employee_onboarding_progress" ("mentor_id");

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

COMMIT;
