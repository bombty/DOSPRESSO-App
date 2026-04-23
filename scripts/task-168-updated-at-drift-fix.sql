-- Task #168: Eksik updated_at kolonlarını topluca tamamla
-- Üretildi: 2026-04-23T21:19:38.352Z
-- Bu dosya scripts/task-168-scan-updated-at-drift.ts tarafından üretilmiştir.
-- Pattern: task #156 (factory_ingredient_nutrition) ile birebir aynı.
--   1) Kolonu NULLABLE ekle  2) created_at ile backfill
--   3) DEFAULT NOW() + NOT NULL  4) BEFORE UPDATE trigger

BEGIN;

-- Tek bir paylaşılan trigger fonksiyonu — her tabloya ayrı fonksiyon yaratmak yerine
-- generic bir fonksiyon kullanıyoruz (idempotent CREATE OR REPLACE).
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- employee_onboarding_progress
ALTER TABLE "employee_onboarding_progress" ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE "employee_onboarding_progress" SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;
ALTER TABLE "employee_onboarding_progress"
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL;
DROP TRIGGER IF EXISTS "trg_employee_onboarding_progress_updated_at" ON "employee_onboarding_progress";
CREATE TRIGGER "trg_employee_onboarding_progress_updated_at" BEFORE UPDATE ON "employee_onboarding_progress" FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- factory_ingredient_nutrition
ALTER TABLE "factory_ingredient_nutrition" ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE "factory_ingredient_nutrition" SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;
ALTER TABLE "factory_ingredient_nutrition"
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL;
DROP TRIGGER IF EXISTS "trg_factory_ingredient_nutrition_updated_at" ON "factory_ingredient_nutrition";
CREATE TRIGGER "trg_factory_ingredient_nutrition_updated_at" BEFORE UPDATE ON "factory_ingredient_nutrition" FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- onboarding_template_steps
ALTER TABLE "onboarding_template_steps" ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE "onboarding_template_steps" SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;
ALTER TABLE "onboarding_template_steps"
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL;
DROP TRIGGER IF EXISTS "trg_onboarding_template_steps_updated_at" ON "onboarding_template_steps";
CREATE TRIGGER "trg_onboarding_template_steps_updated_at" BEFORE UPDATE ON "onboarding_template_steps" FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

COMMIT;
