-- Task #193: Reçete adımları için toplu içe aktarma yedeği
-- /steps/bulk replace çağrısı öncesi mevcut adımlar JSON snapshot olarak
-- yedeklenir; "Geri Al" ile son snapshot geri yüklenir (geri al'ı geri al
-- desteği için restore öncesi mevcut hal de yedeklenir).

CREATE TABLE IF NOT EXISTS factory_recipe_step_snapshots (
  id serial PRIMARY KEY,
  recipe_id integer NOT NULL REFERENCES factory_recipes(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  step_count integer NOT NULL DEFAULT 0,
  reason varchar(50) DEFAULT 'bulk_import',
  created_by varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  restored_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS frss_recipe_idx
  ON factory_recipe_step_snapshots (recipe_id, created_at);
