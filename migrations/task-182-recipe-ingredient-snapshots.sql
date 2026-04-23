-- Task #182: Toplu içe aktarımı yedekle/geri al desteği
-- Reçete malzemeleri toplu olarak değiştirilmeden önce JSON snapshot alınır.

CREATE TABLE IF NOT EXISTS factory_recipe_ingredient_snapshots (
  id            serial PRIMARY KEY,
  recipe_id     integer NOT NULL REFERENCES factory_recipes(id) ON DELETE CASCADE,
  snapshot      jsonb NOT NULL,
  ingredient_count integer NOT NULL DEFAULT 0,
  reason        varchar(50) DEFAULT 'bulk_import',
  created_by    varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  restored_at   timestamptz
);

CREATE INDEX IF NOT EXISTS fris_recipe_idx
  ON factory_recipe_ingredient_snapshots (recipe_id, created_at);
