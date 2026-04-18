-- Task #99: factory_product_price_history table
-- Stores audit/history rows for every change to factory_products.base_price /
-- suggested_price (recipe recalculation, manual edit, import, script, ...).

CREATE TABLE IF NOT EXISTS factory_product_price_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES factory_products(id) ON DELETE CASCADE,

  old_base_price NUMERIC(12, 2),
  new_base_price NUMERIC(12, 2),
  old_suggested_price NUMERIC(12, 2),
  new_suggested_price NUMERIC(12, 2),
  change_percent NUMERIC(8, 2),

  source VARCHAR(30) NOT NULL,
  source_reference_id INTEGER,
  notes TEXT,

  changed_by_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fpph_product_idx        ON factory_product_price_history(product_id);
CREATE INDEX IF NOT EXISTS fpph_source_idx         ON factory_product_price_history(source);
CREATE INDEX IF NOT EXISTS fpph_date_idx           ON factory_product_price_history(changed_at);
CREATE INDEX IF NOT EXISTS fpph_product_date_idx   ON factory_product_price_history(product_id, changed_at);
