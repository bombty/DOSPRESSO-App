-- Task #275 — AI cost guard: monthly USD budget cap + alert thresholds
-- Adds budget configuration columns to ai_settings.
ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "monthly_budget_usd" numeric(10, 2) DEFAULT 50.00;
ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "budget_enforcement_enabled" boolean DEFAULT true;
ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "budget_alert_threshold_pct" integer DEFAULT 80;
ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "last_budget_alert_pct" integer DEFAULT 0;
ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "last_budget_alert_at" timestamp;
ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "last_budget_alert_month" varchar(7);
