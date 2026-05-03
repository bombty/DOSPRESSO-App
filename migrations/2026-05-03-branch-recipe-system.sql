-- ─────────────────────────────────────────────────────
-- ŞUBE REÇETE SİSTEMİ — Migration
-- 3 May 2026 — Branch Recipe System (factory-isolated)
-- ─────────────────────────────────────────────────────
-- 9 yeni tablo + 21 aroma seed:
--   1. branch_products
--   2. branch_recipes (+ isTemplate alanı)
--   3. branch_recipe_ingredients (+ isVariableAroma + aromaSlot)
--   4. branch_recipe_steps
--   5. branch_recipe_quizzes
--   6. branch_onboarding_steps
--   7. branch_recipe_learning_progress
--   8. branch_aroma_options (template sistemi için aroma havuzu)
--   9. branch_recipe_aroma_compatibility (şablon × aroma uyumluluğu)
--
-- KRİTİK: Hiçbir tablo factory_* tablolarına FK referans VERMEZ.
-- Sadece users tablosuna referans verilir (global).
--
-- TEMPLATE SİSTEMİ (3 May 2026, Aslan onayı):
-- "Meyveli Mojito + Mango/Şeftali/Pinkberry" gibi varyasyonlar için
-- 5 ayrı reçete yerine 1 şablon + 5 aroma uyumluluğu kaydı.
-- Aynı pattern Frozen Yogurt, Matcha Creamice, Fruit Milkshake'te de var.

BEGIN;

-- ────────────────────────────────────────
-- 1. BRANCH PRODUCTS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_code VARCHAR(10),
  category VARCHAR(50) NOT NULL,
  sub_category VARCHAR(50),
  description TEXT,
  image_url VARCHAR(500),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  massivo_price NUMERIC(10, 2),
  long_diva_price NUMERIC(10, 2),
  is_pilot_only BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS bp_category_idx ON branch_products(category);
CREATE INDEX IF NOT EXISTS bp_active_idx ON branch_products(is_active);
CREATE INDEX IF NOT EXISTS bp_short_code_idx ON branch_products(short_code);

-- ────────────────────────────────────────
-- 2. BRANCH RECIPES
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_recipes (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES branch_products(id) ON DELETE CASCADE,
  size VARCHAR(20) NOT NULL,
  version VARCHAR(10) DEFAULT '3.6',
  is_active BOOLEAN DEFAULT TRUE,
  -- Template sistemi (3 May 2026, Aslan onayı)
  is_template BOOLEAN DEFAULT FALSE,
  template_type VARCHAR(50),
  preparation_time_sec INTEGER,
  difficulty_level INTEGER DEFAULT 1,
  serving_cup VARCHAR(50),
  serving_lid VARCHAR(50),
  serving_notes TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS br_product_idx ON branch_recipes(product_id);
CREATE INDEX IF NOT EXISTS br_active_idx ON branch_recipes(is_active);
CREATE INDEX IF NOT EXISTS br_template_idx ON branch_recipes(is_template);
CREATE UNIQUE INDEX IF NOT EXISTS br_product_size_unique
  ON branch_recipes(product_id, size);

-- ────────────────────────────────────────
-- 3. BRANCH RECIPE INGREDIENTS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_recipe_ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES branch_recipes(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  ingredient_name VARCHAR(255) NOT NULL,
  quantity_text VARCHAR(100) NOT NULL,
  quantity_numeric NUMERIC(10, 3),
  unit VARCHAR(20),
  preparation_note TEXT,
  -- Template aroma sistemi (3 May 2026, Aslan onayı)
  is_variable_aroma BOOLEAN DEFAULT FALSE,
  aroma_slot VARCHAR(30),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS bri_recipe_idx ON branch_recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS bri_recipe_step_idx ON branch_recipe_ingredients(recipe_id, step_order);
CREATE INDEX IF NOT EXISTS bri_aroma_slot_idx ON branch_recipe_ingredients(aroma_slot);

-- ────────────────────────────────────────
-- 4. BRANCH RECIPE STEPS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_recipe_steps (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES branch_recipes(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  image_url VARCHAR(500),
  video_url VARCHAR(500),
  is_critical BOOLEAN DEFAULT FALSE,
  estimated_sec INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS brs_recipe_idx ON branch_recipe_steps(recipe_id);
CREATE INDEX IF NOT EXISTS brs_recipe_step_idx ON branch_recipe_steps(recipe_id, step_order);

-- ────────────────────────────────────────
-- 5. BRANCH RECIPE QUIZZES
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_recipe_quizzes (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES branch_recipes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type VARCHAR(30) NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty VARCHAR(10) DEFAULT 'easy',
  focus_area VARCHAR(50),
  is_auto_generated BOOLEAN DEFAULT TRUE,
  created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  approved_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS brq_recipe_idx ON branch_recipe_quizzes(recipe_id);
CREATE INDEX IF NOT EXISTS brq_difficulty_idx ON branch_recipe_quizzes(difficulty);
CREATE INDEX IF NOT EXISTS brq_active_idx ON branch_recipe_quizzes(is_active);

-- ────────────────────────────────────────
-- 6. BRANCH ONBOARDING STEPS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_onboarding_steps (
  id SERIAL PRIMARY KEY,
  target_role VARCHAR(50) NOT NULL,
  step_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  recipe_ids JSONB DEFAULT '[]'::jsonb,
  estimated_minutes INTEGER DEFAULT 30,
  prerequisite_step_ids JSONB DEFAULT '[]'::jsonb,
  completion_criteria JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS bos_role_idx ON branch_onboarding_steps(target_role);
CREATE INDEX IF NOT EXISTS bos_step_idx ON branch_onboarding_steps(target_role, step_number);
CREATE UNIQUE INDEX IF NOT EXISTS bos_role_step_unique
  ON branch_onboarding_steps(target_role, step_number);

-- ────────────────────────────────────────
-- 7. BRANCH RECIPE LEARNING PROGRESS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_recipe_learning_progress (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES branch_recipes(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 0,
  quiz_attempts INTEGER DEFAULT 0,
  quiz_correct INTEGER DEFAULT 0,
  best_score NUMERIC(5, 2),
  demo_completed BOOLEAN DEFAULT FALSE,
  demo_approved_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  demo_approved_at TIMESTAMP,
  mastered_at TIMESTAMP,
  last_viewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS brlp_user_idx ON branch_recipe_learning_progress(user_id);
CREATE INDEX IF NOT EXISTS brlp_recipe_idx ON branch_recipe_learning_progress(recipe_id);
CREATE UNIQUE INDEX IF NOT EXISTS brlp_user_recipe_unique
  ON branch_recipe_learning_progress(user_id, recipe_id);

-- ────────────────────────────────────────
-- 8. BRANCH AROMA OPTIONS — Aroma havuzu
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_aroma_options (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  short_code VARCHAR(10),
  category VARCHAR(30) NOT NULL,
  description TEXT,
  color_hex VARCHAR(7),
  icon_emoji VARCHAR(4),
  form_type VARCHAR(20) DEFAULT 'syrup',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS bao_category_idx ON branch_aroma_options(category);
CREATE INDEX IF NOT EXISTS bao_active_idx ON branch_aroma_options(is_active);

-- Seed: Reçete v.3.6 PDF'inde geçen aromalar
INSERT INTO branch_aroma_options (name, short_code, category, color_hex, icon_emoji, form_type, display_order)
VALUES
  ('Mango', 'MNG', 'fruit', '#FFB347', '🥭', 'syrup', 10),
  ('Şeftali', 'SFT', 'fruit', '#FFCBA4', '🍑', 'syrup', 20),
  ('Pinkberry', 'PNK', 'fruit', '#FF69B4', '🍓', 'syrup', 30),
  ('Blueberry', 'BLB', 'fruit', '#4169E1', '🫐', 'syrup', 40),
  ('Lime', 'LIM', 'fruit', '#90EE90', '🍋', 'syrup', 50),
  ('Limon', 'LMN', 'fruit', '#FFFF00', '🍋', 'fresh', 60),
  ('Amber', 'AMB', 'sweet', '#FFA500', '🟠', 'syrup', 70),
  ('Vanilya', 'VNL', 'sweet', '#F5DEB3', '🌼', 'syrup', 80),
  ('Karamel', 'KRM', 'sweet', '#C68E17', '🍯', 'syrup', 90),
  ('Tarçın', 'TRC', 'herbal', '#8B4513', '🟫', 'syrup', 100),
  ('Fındık', 'FND', 'sweet', '#A0522D', '🌰', 'syrup', 110),
  ('Beyaz Çikolata', 'BCK', 'sweet', '#FFFAF0', '🤍', 'syrup', 120),
  ('Pumpkin', 'PMP', 'sweet', '#FF7518', '🎃', 'syrup', 130),
  ('Pecan', 'PCN', 'sweet', '#9B7653', '🌰', 'syrup', 140),
  ('Toasted Marshmallow', 'TOM', 'sweet', '#F5F5DC', '🍡', 'syrup', 150),
  ('Popflix', 'POP', 'sweet', '#FFD700', '🍿', 'syrup', 160),
  ('Aloe Vera (Chakra)', 'ALV', 'herbal', '#90EE90', '🌿', 'syrup', 170),
  ('Mint', 'MNT', 'herbal', '#98FB98', '🌱', 'fresh', 180),
  ('Nane', 'NAN', 'herbal', '#90EE90', '🌿', 'fresh', 190),
  ('Chaity', 'CHT', 'herbal', '#D2691E', '☕', 'syrup', 200),
  ('Golden Latte', 'GLD', 'herbal', '#FFD700', '✨', 'powder', 210)
ON CONFLICT (name) DO NOTHING;

-- ────────────────────────────────────────
-- 9. BRANCH RECIPE AROMA COMPATIBILITY
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_recipe_aroma_compatibility (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES branch_recipes(id) ON DELETE CASCADE,
  aroma_id INTEGER NOT NULL REFERENCES branch_aroma_options(id) ON DELETE CASCADE,
  slot_name VARCHAR(30) NOT NULL,
  override_pumps_massivo NUMERIC(5, 2),
  override_pumps_long_diva NUMERIC(5, 2),
  override_unit VARCHAR(20),
  is_default BOOLEAN DEFAULT FALSE,
  display_name_override VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS brac_recipe_idx ON branch_recipe_aroma_compatibility(recipe_id);
CREATE INDEX IF NOT EXISTS brac_aroma_idx ON branch_recipe_aroma_compatibility(aroma_id);
CREATE UNIQUE INDEX IF NOT EXISTS brac_recipe_aroma_slot_unique
  ON branch_recipe_aroma_compatibility(recipe_id, aroma_id, slot_name);

COMMIT;

-- ────────────────────────────────────────
-- ROLLBACK SCRIPT (acil durum için)
-- ────────────────────────────────────────
-- BEGIN;
-- DROP TABLE IF EXISTS branch_recipe_aroma_compatibility CASCADE;
-- DROP TABLE IF EXISTS branch_aroma_options CASCADE;
-- DROP TABLE IF EXISTS branch_recipe_learning_progress CASCADE;
-- DROP TABLE IF EXISTS branch_onboarding_steps CASCADE;
-- DROP TABLE IF EXISTS branch_recipe_quizzes CASCADE;
-- DROP TABLE IF EXISTS branch_recipe_steps CASCADE;
-- DROP TABLE IF EXISTS branch_recipe_ingredients CASCADE;
-- DROP TABLE IF EXISTS branch_recipes CASCADE;
-- DROP TABLE IF EXISTS branch_products CASCADE;
-- COMMIT;

-- DOĞRULAMA SORGUSU
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' AND table_name LIKE 'branch_%'
--   ORDER BY table_name;
-- Beklenen: 9 satır

-- AROMA SEED DOĞRULAMA
-- SELECT count(*) FROM branch_aroma_options;
-- Beklenen: 21
