-- Task #106: Reçete fiyat değişiklik geçmişi tablosunu yeniden aç
-- Drizzle schema: shared/schema/schema-22-factory-recipes.ts → factoryRecipePriceHistory
-- Not: db:push pre-existing schema-02 hatası nedeniyle çalışmadığı için
-- bu tablo manuel SQL ile oluşturulmuştur.

CREATE TABLE IF NOT EXISTS factory_recipe_price_history (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES factory_recipes(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES factory_products(id) ON DELETE SET NULL,

  old_raw_material_cost NUMERIC(12, 4),
  new_raw_material_cost NUMERIC(12, 4),
  old_unit_cost NUMERIC(12, 4),
  new_unit_cost NUMERIC(12, 4),

  old_base_price NUMERIC(12, 2),
  new_base_price NUMERIC(12, 2),
  old_suggested_price NUMERIC(12, 2),
  new_suggested_price NUMERIC(12, 2),

  change_percent NUMERIC(8, 2),

  status VARCHAR(30) NOT NULL,
  reason TEXT,
  ingredient_count INTEGER DEFAULT 0,
  resolved_ingredient_count INTEGER DEFAULT 0,
  coverage_percent NUMERIC(5, 2),
  missing_ingredients JSONB DEFAULT '[]'::jsonb,

  source VARCHAR(30) NOT NULL,
  run_id VARCHAR(100),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS frph_recipe_idx ON factory_recipe_price_history(recipe_id);
CREATE INDEX IF NOT EXISTS frph_product_idx ON factory_recipe_price_history(product_id);
CREATE INDEX IF NOT EXISTS frph_run_idx ON factory_recipe_price_history(run_id);
CREATE INDEX IF NOT EXISTS frph_created_idx ON factory_recipe_price_history(created_at);
