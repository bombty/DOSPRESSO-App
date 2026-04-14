-- Task #98: MRP-Light 4 Tablo Migration
-- Tarih: 2026-04-14
-- IT Danışman commit: 2b0c0e7b

-- 1. daily_material_plans
CREATE TABLE IF NOT EXISTS daily_material_plans (
  id SERIAL PRIMARY KEY,
  plan_date DATE NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  confirmed_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  total_item_count INTEGER DEFAULT 0,
  total_picked_count INTEGER DEFAULT 0,
  total_cost_estimate NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. daily_material_plan_items
CREATE TABLE IF NOT EXISTS daily_material_plan_items (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES daily_material_plans(id) ON DELETE CASCADE,
  inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE RESTRICT,
  recipe_id INTEGER REFERENCES factory_recipes(id) ON DELETE SET NULL,
  batch_count NUMERIC(5,1),
  required_quantity NUMERIC(12,3) NOT NULL,
  leftover_quantity NUMERIC(12,3) DEFAULT 0,
  net_pick_quantity NUMERIC(12,3) NOT NULL,
  actual_picked_quantity NUMERIC(12,3),
  unit VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  picked_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  picked_at TIMESTAMPTZ,
  verified_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. production_area_leftovers
CREATE TABLE IF NOT EXISTS production_area_leftovers (
  id SERIAL PRIMARY KEY,
  record_date DATE NOT NULL,
  inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE RESTRICT,
  remaining_quantity NUMERIC(12,3) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  condition VARCHAR(20) NOT NULL DEFAULT 'good',
  storage_temp NUMERIC(4,1),
  expiry_risk BOOLEAN DEFAULT false,
  usable_for_recipes JSONB DEFAULT '[]',
  used_in_next_day BOOLEAN DEFAULT false,
  used_quantity NUMERIC(12,3),
  wasted_quantity NUMERIC(12,3),
  waste_reason TEXT,
  recorded_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  verified_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(record_date, inventory_id)
);

-- 4. material_pick_logs
CREATE TABLE IF NOT EXISTS material_pick_logs (
  id SERIAL PRIMARY KEY,
  plan_item_id INTEGER REFERENCES daily_material_plan_items(id) ON DELETE SET NULL,
  inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE RESTRICT,
  quantity NUMERIC(12,3) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  from_location VARCHAR(50) NOT NULL,
  to_location VARCHAR(50) NOT NULL DEFAULT 'uretim_alani',
  lot_number VARCHAR(100),
  expiry_date DATE,
  picked_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  verified_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  movement_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS dmp_status_idx ON daily_material_plans(status);
CREATE INDEX IF NOT EXISTS dmp_date_idx ON daily_material_plans(plan_date);
CREATE INDEX IF NOT EXISTS dmpi_plan_idx ON daily_material_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS dmpi_inventory_idx ON daily_material_plan_items(inventory_id);
CREATE INDEX IF NOT EXISTS dmpi_status_idx ON daily_material_plan_items(status);
CREATE INDEX IF NOT EXISTS pal_date_idx ON production_area_leftovers(record_date);
CREATE INDEX IF NOT EXISTS pal_inventory_idx ON production_area_leftovers(inventory_id);
CREATE INDEX IF NOT EXISTS mpl_plan_item_idx ON material_pick_logs(plan_item_id);
CREATE INDEX IF NOT EXISTS mpl_inventory_idx ON material_pick_logs(inventory_id);
