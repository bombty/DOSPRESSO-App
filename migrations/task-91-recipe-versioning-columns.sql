-- Task #91: Recipe Versioning Infrastructure Migration
-- Adds version tracking to production logs + cost snapshot to recipe versions
-- Applied: 13 April 2026

-- 1. Add recipe_version_id to factory_production_logs
ALTER TABLE factory_production_logs
  ADD COLUMN IF NOT EXISTS recipe_version_id integer
  REFERENCES factory_recipe_versions(id) ON DELETE SET NULL;

-- 2. Add recipe_version_number to factory_production_logs
ALTER TABLE factory_production_logs
  ADD COLUMN IF NOT EXISTS recipe_version_number integer;

-- 3. Add cost_snapshot to factory_recipe_versions
ALTER TABLE factory_recipe_versions
  ADD COLUMN IF NOT EXISTS cost_snapshot jsonb;

-- 4. Index for version lookups
CREATE INDEX IF NOT EXISTS fpl_recipe_version_idx
  ON factory_production_logs(recipe_version_id);
