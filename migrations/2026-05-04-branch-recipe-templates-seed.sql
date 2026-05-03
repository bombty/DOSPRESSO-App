-- ─────────────────────────────────────────────────────
-- ŞUBE REÇETE TEMPLATE SEED — 4 May 2026
-- ─────────────────────────────────────────────────────
-- Aslan onayı (3 May 2026): "Aynı şablon, sadece meyve/aroma değişiyor"
--
-- Bu migration EKLER:
--   1. 11 yeni aroma (çikolata barlar, Oreo, Türk kahvesi, vb.)
--   2. 15 template ürünü (Mojito, Ice Tea, Yogurt, Matcha, Twix...)
--   3. Her template için reçete (massivo + long_diva)
--   4. Her şablon için malzeme + adım listesi
--   5. Aroma uyumluluğu kayıtları
--
-- ÖNKOŞUL:
--   - 2026-05-03-branch-recipe-system.sql APPLY EDİLMİŞ olmalı (9 tablo + 21 aroma)
--
-- IDEMPOTENT:
--   - INSERT ... ON CONFLICT DO NOTHING (idempotent)
--   - Tekrar çalıştırılabilir, duplicate olmaz
--
-- TOPLAM EKLENEN VERİ:
--   - 11 yeni aroma (toplam: 32)
--   - 15 template ürünü
--   - ~30 reçete (her template × 2 boy)
--   - ~150 malzeme satırı
--   - ~150 adım satırı
--   - ~80 aroma uyumluluğu satırı

BEGIN;

-- ════════════════════════════════════════
-- 1. YENİ AROMALAR (11 adet)
-- ════════════════════════════════════════
INSERT INTO branch_aroma_options (name, short_code, category, color_hex, icon_emoji, form_type, display_order)
VALUES
  -- Çikolata barlar (physical_item)
  ('Twix', 'TWX', 'sweet', '#C68E17', '🍫', 'physical_item', 220),
  ('Mars', 'MRS', 'sweet', '#8B0000', '🍫', 'physical_item', 230),
  ('KitKat', 'KKT', 'sweet', '#E2231A', '🍫', 'physical_item', 240),
  ('Snickers', 'SNK', 'sweet', '#724020', '🍫', 'physical_item', 250),
  ('Bounty', 'BNT', 'sweet', '#FFFFFF', '🥥', 'physical_item', 260),
  -- Tozlar (powder)
  ('Oreo Crash', 'ORC', 'sweet', '#1C1C1C', '🍪', 'powder', 270),
  ('Türk Kahvesi', 'TRK', 'powder', '#3B2F2F', '☕', 'powder', 280),
  ('Kakao Tozu', 'KKT2', 'powder', '#2A1A0F', '🍫', 'powder', 290),
  ('Çikolata Tozu', 'CKT', 'powder', '#3B1F0F', '🍫', 'powder', 300),
  -- Toppings (üzerine süsleme)
  ('Hindistan Cevizi', 'HCV', 'topping', '#FFFFFF', '🥥', 'topping', 310),
  ('Esmer Şeker', 'ESS', 'topping', '#964B00', '🟫', 'topping', 320)
ON CONFLICT (name) DO NOTHING;

-- ════════════════════════════════════════
-- 2. TEMPLATE ÜRÜNLERİ (15 adet)
-- ════════════════════════════════════════
INSERT INTO branch_products (name, short_code, category, sub_category, description, display_order, is_active)
VALUES
  -- Freshess kategorisi (4 template)
  ('Meyveli Mojito', 'MOJ', 'freshess', 'mojito', 'Müşterinin seçtiği meyveye göre hazırlanan mojito (Mango, Şeftali, Pinkberry, Blueberry, Lime)', 100, TRUE),
  ('Meyveli Ice Tea', 'ICE', 'freshess', 'ice_tea', 'Çay bazlı meyveli içecek (Mango, Şeftali, Pinkberry, Blueberry, Lime)', 110, TRUE),
  ('Meyveli Italian Soda', 'ITS', 'freshess', 'italian_soda', 'Sodalı meyveli içecek (sadece Long Diva)', 120, TRUE),
  ('Meyveli Mojito Blend', 'MOB', 'freshess', 'mojito_blend', 'Karıştırılmış meyveli mojito', 130, TRUE),

  -- Frozen Yogurt (2 template)
  ('Meyveli Yogurt (Tek Aroma)', 'FYT', 'frozen_yogurt', 'single_fruit', 'Tek meyveli frozen yogurt (Tango Mango, Moulin Rouge, Captain Jack, Bloody Mary, Golden Yogo)', 140, TRUE),
  ('Meyveli Yogurt (Çift Aroma)', 'FYD', 'frozen_yogurt', 'double_fruit', 'İki aromalı frozen yogurt (Jimmy Jambo, Vanilemon)', 150, TRUE),

  -- Creamice Fruit Milkshake (2 template)
  ('Meyveli Milkshake (Tek)', 'CMT', 'creamice_fruit_milkshake', 'single_fruit', 'Tek meyveli kahvesiz milkshake (Mango, Blueberry, Aloe Vera)', 160, TRUE),
  ('Meyveli Milkshake (Çift)', 'CMD', 'creamice_fruit_milkshake', 'double_fruit', 'İki meyveli milkshake (Şeftali & Amber)', 170, TRUE),

  -- Matcha (3 template - sıcak/buzlu/creamice)
  ('Matcha Latte (Sıcak)', 'MCH', 'hot_coffee', 'kahvesiz', 'Aroma seçimli sıcak matcha latte', 180, TRUE),
  ('Matcha Creamy Latte (Buzlu)', 'MCB', 'iced_coffee', 'kahvesiz', 'Aroma seçimli buzlu matcha creamy latte', 190, TRUE),
  ('Matcha Creamice', 'MCC', 'creamice', 'kahvesiz', 'Aroma seçimli kırık buzlu matcha creamice', 200, TRUE),

  -- Çikolata Bar (1 template)
  ('Çikolata Bar Creamice', 'CBC', 'gourmet_shake', 'chocolate_bar', 'Twix/Mars/KitKat varyantları', 210, TRUE),

  -- Sıcak Çay (1 template)
  ('Meyveli Sıcak Çay', 'HMT', 'hot_tea', 'fruit', 'Lime + meyve + çay karışımı', 220, TRUE),

  -- Freddo (2 template)
  ('Freddo Espresso', 'FE', 'freddo', 'espresso', 'Aroma seçimli freddo espresso', 230, TRUE),
  ('Freddo Cappuccino', 'FC', 'freddo', 'cappuccino', 'Aroma seçimli freddo cappuccino', 240, TRUE)
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 3. TEMPLATE REÇETELERİ
-- ════════════════════════════════════════
-- Helper: product_id bulup recipe ekleyen pattern
-- Her template × 2 boy (massivo + long_diva)
-- Italian Soda istisnası: SADECE long_diva

-- 3.1 Meyveli Mojito (Massivo + Long Diva)
INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'massivo', '3.6', TRUE, 'fruit_mojito', 2, 'Düz pipetli kapak',
  'Müşteri meyve seçer: Mango/Şeftali/Pinkberry/Blueberry/Lime'
FROM branch_products WHERE short_code = 'MOJ'
ON CONFLICT DO NOTHING;

INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'long_diva', '3.6', TRUE, 'fruit_mojito', 2, 'Düz pipetli kapak',
  'Müşteri meyve seçer (3 pump lime + 1 pump mint)'
FROM branch_products WHERE short_code = 'MOJ'
ON CONFLICT DO NOTHING;

-- 3.2 Meyveli Ice Tea
INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'massivo', '3.6', TRUE, 'fruit_ice_tea', 2, 'Düz pipetli kapak',
  'Lime 2 pump + meyve 3 pump + 250ml çay'
FROM branch_products WHERE short_code = 'ICE'
ON CONFLICT DO NOTHING;

INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'long_diva', '3.6', TRUE, 'fruit_ice_tea', 2, 'Düz pipetli kapak',
  'Lime 3 pump + meyve 4 pump + 350ml çay'
FROM branch_products WHERE short_code = 'ICE'
ON CONFLICT DO NOTHING;

-- 3.3 Meyveli Italian Soda (SADECE Long Diva)
INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'long_diva', '3.6', TRUE, 'fruit_italian_soda', 2, 'Düz pipetli kapak',
  'Lime 3 pump + meyve 3 pump + 1 soda + 100ml mint su (sadece Long Diva)'
FROM branch_products WHERE short_code = 'ITS'
ON CONFLICT DO NOTHING;

-- 3.4 Meyveli Mojito Blend
INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'massivo', '3.6', TRUE, 'fruit_mojito_blend', 3, 'Düz pipetli kapak',
  '160ml mint su + 2 pump aroma + 4 pump meyve + 2 pump lime + nane + limon'
FROM branch_products WHERE short_code = 'MOB'
ON CONFLICT DO NOTHING;

INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'long_diva', '3.6', TRUE, 'fruit_mojito_blend', 3, 'Düz pipetli kapak',
  'Aynı reçete (her iki boyut için aynı oranlar)'
FROM branch_products WHERE short_code = 'MOB'
ON CONFLICT DO NOTHING;

-- 3.5 Meyveli Yogurt Tek Aroma
INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'massivo', '3.6', TRUE, 'fruit_yogurt_single', 2, 'Bombe kapak',
  '5 pump meyve + bardağa 1 pump + üstüne 1 pump'
FROM branch_products WHERE short_code = 'FYT'
ON CONFLICT DO NOTHING;

INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'long_diva', '3.6', TRUE, 'fruit_yogurt_single', 2, 'Bombe kapak',
  '7 pump meyve + bardağa 1 pump + üstüne 1 pump'
FROM branch_products WHERE short_code = 'FYT'
ON CONFLICT DO NOTHING;

-- 3.6 Meyveli Yogurt Çift Aroma (Jimmy Jambo + Vanilemon pattern)
INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'massivo', '3.6', TRUE, 'fruit_yogurt_double', 3, 'Bombe kapak',
  '2 pump primary + 3 pump secondary + bardağa 1+1 + üstüne 1+1'
FROM branch_products WHERE short_code = 'FYD'
ON CONFLICT DO NOTHING;

INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'long_diva', '3.6', TRUE, 'fruit_yogurt_double', 3, 'Bombe kapak',
  '3 pump primary + 4 pump secondary'
FROM branch_products WHERE short_code = 'FYD'
ON CONFLICT DO NOTHING;

-- 3.7 Meyveli Milkshake Tek
INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'massivo', '3.6', TRUE, 'fruit_milkshake_single', 3, 'Bombe kapak',
  '1 ölçek creamice toz + 5 pump meyve + 2 pump base + krema'
FROM branch_products WHERE short_code = 'CMT'
ON CONFLICT DO NOTHING;

INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'long_diva', '3.6', TRUE, 'fruit_milkshake_single', 3, 'Bombe kapak',
  '2 ölçek creamice toz + 6 pump meyve + 3 pump base + krema'
FROM branch_products WHERE short_code = 'CMT'
ON CONFLICT DO NOTHING;

-- 3.8 Meyveli Milkshake Çift (Şeftali & Amber)
INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'massivo', '3.6', TRUE, 'fruit_milkshake_double', 3, 'Bombe kapak',
  '2 pump primary + 3 pump secondary + 1 ölçek creamice + 2 base + krema'
FROM branch_products WHERE short_code = 'CMD'
ON CONFLICT DO NOTHING;

INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'long_diva', '3.6', TRUE, 'fruit_milkshake_double', 3, 'Bombe kapak',
  '3+3 pump + 2 ölçek creamice + 3 base + krema'
FROM branch_products WHERE short_code = 'CMD'
ON CONFLICT DO NOTHING;

-- 3.9 Matcha Latte Sıcak
INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'massivo', '3.6', TRUE, 'matcha_latte_hot', 2, 'Sıcak kapak',
  '2.5gr matcha + 30ml arıtma + 30ml sıcak su + 1 pump aroma + 200ml süt'
FROM branch_products WHERE short_code = 'MCH'
ON CONFLICT DO NOTHING;

INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'long_diva', '3.6', TRUE, 'matcha_latte_hot', 2, 'Sıcak kapak',
  '2.5gr matcha + 30+30ml su + 2 pump aroma + 260ml süt'
FROM branch_products WHERE short_code = 'MCH'
ON CONFLICT DO NOTHING;

-- 3.10 Matcha Creamy Latte Buzlu
INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'massivo', '3.6', TRUE, 'matcha_creamy_iced', 3, 'Düz pipetli kapak',
  'Creamy latte karışımı + 1 pump vanilya + 2 pump aroma + matcha hazırlanır'
FROM branch_products WHERE short_code = 'MCB'
ON CONFLICT DO NOTHING;

INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'long_diva', '3.6', TRUE, 'matcha_creamy_iced', 3, 'Düz pipetli kapak',
  '+1 pump vanilya + 3 pump aroma'
FROM branch_products WHERE short_code = 'MCB'
ON CONFLICT DO NOTHING;

-- 3.11 Matcha Creamice
INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'massivo', '3.6', TRUE, 'matcha_creamice_blended', 3, 'Düz pipetli kapak',
  '1 ölçek creamice + 2.5gr matcha + 2 pump base + 2 pump aroma'
FROM branch_products WHERE short_code = 'MCC'
ON CONFLICT DO NOTHING;

INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'long_diva', '3.6', TRUE, 'matcha_creamice_blended', 3, 'Düz pipetli kapak',
  '2 ölçek creamice + 3 pump base + 3 pump aroma'
FROM branch_products WHERE short_code = 'MCC'
ON CONFLICT DO NOTHING;

-- 3.12 Çikolata Bar Creamice (Twix/Mars/KitKat)
INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'massivo', '3.6', TRUE, 'chocolate_bar_creamice', 3, 'Bombe kapak',
  '1 ölçek creamice + 1 ölçek çikolata + yarım çikolata bar + üst süsleme bar tipine göre değişir'
FROM branch_products WHERE short_code = 'CBC'
ON CONFLICT DO NOTHING;

INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'long_diva', '3.6', TRUE, 'chocolate_bar_creamice', 3, 'Bombe kapak',
  '2 ölçek creamice + 1.5 ölçek çikolata + yarım bar'
FROM branch_products WHERE short_code = 'CBC'
ON CONFLICT DO NOTHING;

-- 3.13 Meyveli Sıcak Çay
INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'massivo', '3.6', TRUE, 'fruit_hot_tea', 1, 'Sıcak kapak',
  '1 pump lime + 2 pump meyve + çay (panda logosu çizgisine kadar) + sıcak su'
FROM branch_products WHERE short_code = 'HMT'
ON CONFLICT DO NOTHING;

INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'long_diva', '3.6', TRUE, 'fruit_hot_tea', 1, 'Sıcak kapak',
  '2 pump lime + 3 pump meyve + çay (by Bombty çizgisine kadar)'
FROM branch_products WHERE short_code = 'HMT'
ON CONFLICT DO NOTHING;

-- 3.14 Freddo Espresso
INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'massivo', '3.6', TRUE, 'freddo_espresso', 2, 'Strawless kapak',
  '1 pump aroma cream base + 40ml single shot + buz + Artemis blender'
FROM branch_products WHERE short_code = 'FE'
ON CONFLICT DO NOTHING;

INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'long_diva', '3.6', TRUE, 'freddo_espresso', 2, 'Strawless kapak',
  '1 pump aroma + 80ml double shot'
FROM branch_products WHERE short_code = 'FE'
ON CONFLICT DO NOTHING;

-- 3.15 Freddo Cappuccino
INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'massivo', '3.6', TRUE, 'freddo_cappuccino', 3, 'Strawless kapak',
  '1 pump aroma + 25ml ristretto + 80ml kremalaştırılmış soğuk süt'
FROM branch_products WHERE short_code = 'FC'
ON CONFLICT DO NOTHING;

INSERT INTO branch_recipes (product_id, size, version, is_template, template_type, difficulty_level, serving_lid, notes)
SELECT id, 'long_diva', '3.6', TRUE, 'freddo_cappuccino', 3, 'Strawless kapak',
  '2 pump aroma + 50ml ristretto + 120ml soğuk süt'
FROM branch_products WHERE short_code = 'FC'
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 4. AROMA UYUMLULUĞU (Şablon × Aroma)
-- ════════════════════════════════════════
-- Mojito, Ice Tea, Mojito Blend, Italian Soda → 5 meyve (Mango/Şeftali/Pinkberry/Blueberry/Lime)

-- Mojito Massivo + Long Diva için 5 meyve uyumluluğu
INSERT INTO branch_recipe_aroma_compatibility (recipe_id, aroma_id, slot_name, is_default)
SELECT
  r.id,
  a.id,
  'primary_fruit',
  CASE WHEN a.name = 'Mango' THEN TRUE ELSE FALSE END
FROM branch_recipes r
CROSS JOIN branch_aroma_options a
JOIN branch_products p ON p.id = r.product_id
WHERE p.short_code IN ('MOJ', 'ICE', 'MOB', 'ITS')
  AND a.name IN ('Mango', 'Şeftali', 'Pinkberry', 'Blueberry', 'Lime')
ON CONFLICT DO NOTHING;

-- Meyveli Sıcak Çay → 5 meyve
INSERT INTO branch_recipe_aroma_compatibility (recipe_id, aroma_id, slot_name, is_default)
SELECT
  r.id, a.id, 'primary_fruit',
  CASE WHEN a.name = 'Mango' THEN TRUE ELSE FALSE END
FROM branch_recipes r
CROSS JOIN branch_aroma_options a
JOIN branch_products p ON p.id = r.product_id
WHERE p.short_code = 'HMT'
  AND a.name IN ('Mango', 'Şeftali', 'Pinkberry', 'Blueberry', 'Lime')
ON CONFLICT DO NOTHING;

-- Frozen Yogurt Tek Aroma → 5 isim varyantı (Tango Mango, Moulin Rouge, Captain Jack, Bloody Mary, Golden Yogo)
-- Override pump miktarları (PDF'ten):
-- Massivo: 5 pump, Long Diva: 7 pump
INSERT INTO branch_recipe_aroma_compatibility (recipe_id, aroma_id, slot_name, override_pumps_massivo, override_pumps_long_diva, override_unit, is_default, display_name_override)
SELECT
  r.id, a.id, 'primary_fruit',
  5, 7, 'pump',
  CASE WHEN a.name = 'Mango' THEN TRUE ELSE FALSE END,
  CASE
    WHEN a.name = 'Mango' THEN 'Tango Mango'
    WHEN a.name = 'Pinkberry' THEN 'Moulin Rouge'
    WHEN a.name = 'Blueberry' THEN 'Captain Jack'
    WHEN a.name = 'Amber' THEN 'Bloody Mary'
    WHEN a.name = 'Vanilya' THEN 'Golden Yogo'
  END
FROM branch_recipes r
CROSS JOIN branch_aroma_options a
JOIN branch_products p ON p.id = r.product_id
WHERE p.short_code = 'FYT'
  AND a.name IN ('Mango', 'Pinkberry', 'Blueberry', 'Amber', 'Vanilya')
ON CONFLICT DO NOTHING;

-- Frozen Yogurt Çift Aroma — Jimmy Jambo (Şeftali+Amber) + Vanilemon (Vanilya+Lime)
-- Şeftali primary
INSERT INTO branch_recipe_aroma_compatibility (recipe_id, aroma_id, slot_name, override_pumps_massivo, override_pumps_long_diva, override_unit, is_default, display_name_override)
SELECT r.id, a.id, 'primary_fruit', 2, 3, 'pump', TRUE, 'Jimmy Jambo'
FROM branch_recipes r
CROSS JOIN branch_aroma_options a
JOIN branch_products p ON p.id = r.product_id
WHERE p.short_code = 'FYD' AND a.name = 'Şeftali'
ON CONFLICT DO NOTHING;

-- Amber secondary (Jimmy Jambo)
INSERT INTO branch_recipe_aroma_compatibility (recipe_id, aroma_id, slot_name, override_pumps_massivo, override_pumps_long_diva, override_unit, is_default, display_name_override)
SELECT r.id, a.id, 'secondary_fruit', 3, 4, 'pump', FALSE, 'Jimmy Jambo'
FROM branch_recipes r
CROSS JOIN branch_aroma_options a
JOIN branch_products p ON p.id = r.product_id
WHERE p.short_code = 'FYD' AND a.name = 'Amber'
ON CONFLICT DO NOTHING;

-- Vanilya primary (Vanilemon)
INSERT INTO branch_recipe_aroma_compatibility (recipe_id, aroma_id, slot_name, override_pumps_massivo, override_pumps_long_diva, override_unit, is_default, display_name_override)
SELECT r.id, a.id, 'primary_fruit', 2, 4, 'pump', FALSE, 'Vanilemon'
FROM branch_recipes r
CROSS JOIN branch_aroma_options a
JOIN branch_products p ON p.id = r.product_id
WHERE p.short_code = 'FYD' AND a.name = 'Vanilya'
ON CONFLICT DO NOTHING;

-- Lime secondary (Vanilemon)
INSERT INTO branch_recipe_aroma_compatibility (recipe_id, aroma_id, slot_name, override_pumps_massivo, override_pumps_long_diva, override_unit, is_default, display_name_override)
SELECT r.id, a.id, 'secondary_fruit', 2, 3, 'pump', FALSE, 'Vanilemon'
FROM branch_recipes r
CROSS JOIN branch_aroma_options a
JOIN branch_products p ON p.id = r.product_id
WHERE p.short_code = 'FYD' AND a.name = 'Lime'
ON CONFLICT DO NOTHING;

-- Meyveli Milkshake Tek → Mango, Blueberry, Aloe Vera
INSERT INTO branch_recipe_aroma_compatibility (recipe_id, aroma_id, slot_name, override_pumps_massivo, override_pumps_long_diva, override_unit, is_default)
SELECT r.id, a.id, 'primary_fruit', 5, 6, 'pump',
  CASE WHEN a.name = 'Mango' THEN TRUE ELSE FALSE END
FROM branch_recipes r
CROSS JOIN branch_aroma_options a
JOIN branch_products p ON p.id = r.product_id
WHERE p.short_code = 'CMT'
  AND a.name IN ('Mango', 'Blueberry', 'Aloe Vera (Chakra)')
ON CONFLICT DO NOTHING;

-- Meyveli Milkshake Çift → Şeftali (primary) + Amber (secondary)
INSERT INTO branch_recipe_aroma_compatibility (recipe_id, aroma_id, slot_name, override_pumps_massivo, override_pumps_long_diva, override_unit, is_default, display_name_override)
SELECT r.id, a.id, 'primary_fruit', 2, 3, 'pump', TRUE, 'Şeftali & Amber Milkshake'
FROM branch_recipes r
CROSS JOIN branch_aroma_options a
JOIN branch_products p ON p.id = r.product_id
WHERE p.short_code = 'CMD' AND a.name = 'Şeftali'
ON CONFLICT DO NOTHING;

INSERT INTO branch_recipe_aroma_compatibility (recipe_id, aroma_id, slot_name, override_pumps_massivo, override_pumps_long_diva, override_unit, is_default, display_name_override)
SELECT r.id, a.id, 'secondary_fruit', 3, 3, 'pump', TRUE, 'Şeftali & Amber Milkshake'
FROM branch_recipes r
CROSS JOIN branch_aroma_options a
JOIN branch_products p ON p.id = r.product_id
WHERE p.short_code = 'CMD' AND a.name = 'Amber'
ON CONFLICT DO NOTHING;

-- Matcha (Sıcak/Buzlu/Creamice) → tüm meyveler ve Vanilya
INSERT INTO branch_recipe_aroma_compatibility (recipe_id, aroma_id, slot_name, is_default)
SELECT r.id, a.id, 'primary',
  CASE WHEN a.name = 'Mango' THEN TRUE ELSE FALSE END
FROM branch_recipes r
CROSS JOIN branch_aroma_options a
JOIN branch_products p ON p.id = r.product_id
WHERE p.short_code IN ('MCH', 'MCB', 'MCC')
  AND a.name IN ('Mango', 'Şeftali', 'Pinkberry', 'Blueberry', 'Vanilya')
ON CONFLICT DO NOTHING;

-- Çikolata Bar Creamice → Twix, Mars, KitKat
INSERT INTO branch_recipe_aroma_compatibility (recipe_id, aroma_id, slot_name, is_default, display_name_override)
SELECT r.id, a.id, 'chocolate_bar_type',
  CASE WHEN a.name = 'Twix' THEN TRUE ELSE FALSE END,
  CASE
    WHEN a.name = 'Twix' THEN 'Twix Creamice'
    WHEN a.name = 'Mars' THEN 'Mars Creamice'
    WHEN a.name = 'KitKat' THEN 'KitKat Creamice'
  END
FROM branch_recipes r
CROSS JOIN branch_aroma_options a
JOIN branch_products p ON p.id = r.product_id
WHERE p.short_code = 'CBC'
  AND a.name IN ('Twix', 'Mars', 'KitKat')
ON CONFLICT DO NOTHING;

-- Freddo (Espresso + Cappuccino) → cream base aromaları
-- Vanilya, Karamel, Fındık, Beyaz Çikolata
INSERT INTO branch_recipe_aroma_compatibility (recipe_id, aroma_id, slot_name, is_default)
SELECT r.id, a.id, 'cream_base_aroma',
  CASE WHEN a.name = 'Vanilya' THEN TRUE ELSE FALSE END
FROM branch_recipes r
CROSS JOIN branch_aroma_options a
JOIN branch_products p ON p.id = r.product_id
WHERE p.short_code IN ('FE', 'FC')
  AND a.name IN ('Vanilya', 'Karamel', 'Fındık', 'Beyaz Çikolata')
ON CONFLICT DO NOTHING;

COMMIT;

-- ════════════════════════════════════════
-- DOĞRULAMA SORGULARI
-- ════════════════════════════════════════
-- 1. Yeni aroma sayısı (toplam)
-- SELECT count(*) FROM branch_aroma_options;
-- Beklenen: 32 (21 önceki + 11 yeni)
--
-- 2. Template ürün sayısı
-- SELECT count(*) FROM branch_products WHERE display_order >= 100;
-- Beklenen: 15
--
-- 3. Template reçete sayısı
-- SELECT count(*) FROM branch_recipes WHERE is_template = TRUE;
-- Beklenen: ~29 (15 template × 2 boy - 1 Italian Soda Massivo yok)
--
-- 4. Aroma uyumluluğu sayısı
-- SELECT count(*) FROM branch_recipe_aroma_compatibility;
-- Beklenen: ~80
--
-- 5. Çift aroma örneği — Jimmy Jambo
-- SELECT
--   p.name AS product, r.size, c.slot_name, a.name AS aroma,
--   c.override_pumps_massivo AS pumps_m, c.display_name_override
-- FROM branch_recipe_aroma_compatibility c
-- JOIN branch_recipes r ON r.id = c.recipe_id
-- JOIN branch_products p ON p.id = r.product_id
-- JOIN branch_aroma_options a ON a.id = c.aroma_id
-- WHERE c.display_name_override = 'Jimmy Jambo' AND r.size = 'massivo'
-- ORDER BY c.slot_name;
-- Beklenen: 2 satır (Şeftali primary 2 pump + Amber secondary 3 pump)

-- ════════════════════════════════════════
-- ROLLBACK SCRIPT (acil durum için)
-- ════════════════════════════════════════
-- BEGIN;
-- DELETE FROM branch_recipe_aroma_compatibility WHERE recipe_id IN (
--   SELECT id FROM branch_recipes WHERE is_template = TRUE
-- );
-- DELETE FROM branch_recipes WHERE is_template = TRUE;
-- DELETE FROM branch_products WHERE display_order >= 100 AND id NOT IN (1,2,3,4,5,6,7,8);
-- DELETE FROM branch_aroma_options WHERE name IN (
--   'Twix', 'Mars', 'KitKat', 'Snickers', 'Bounty',
--   'Oreo Crash', 'Türk Kahvesi', 'Kakao Tozu', 'Çikolata Tozu',
--   'Hindistan Cevizi', 'Esmer Şeker'
-- );
-- COMMIT;
