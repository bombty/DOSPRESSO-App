-- Task #93: Inventory Price & Material Type Columns + Price History Table
-- Applied: 14 April 2026

-- 1. New inventory columns
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS market_price NUMERIC(10,2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS market_price_updated_at TIMESTAMP;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS material_type VARCHAR(10);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS purchase_unit VARCHAR(20);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS recipe_unit VARCHAR(20);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC(12,4);
CREATE INDEX IF NOT EXISTS inventory_material_type_idx ON inventory(material_type);

-- 2. Price history table
CREATE TABLE IF NOT EXISTS inventory_price_history (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  price_type VARCHAR(20) NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  previous_price NUMERIC(12,2),
  change_percent NUMERIC(6,2),
  source VARCHAR(30) NOT NULL,
  source_reference_id INTEGER,
  effective_date DATE NOT NULL,
  notes TEXT,
  created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS iph_inventory_idx ON inventory_price_history(inventory_id);
CREATE INDEX IF NOT EXISTS iph_type_idx ON inventory_price_history(price_type);
CREATE INDEX IF NOT EXISTS iph_date_idx ON inventory_price_history(effective_date);
