-- DOSPRESSO factory_ingredient_nutrition Seed (Aslan Girdi Listesi)
-- Reçete besin değeri otomatik hesaplama bunu kullanır
-- Tarih: 7 May 2026

BEGIN;

-- Eski 'Aslan kaynakli' kayıtları temizle
DELETE FROM factory_ingredient_nutrition WHERE source = 'aslan_import';


INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Beyaz Çi̇kolatali Vani̇lya Aromali Dolgu', 730.0, 2.3, 2.3, 37.5, 17.2, 0.2, 0.0,
  ARRAY['süt']::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Buğday unu süper lüks mavi', 347.0, 0.51, 0.08, 73.45, 0.0, 12.22, 0.2,
  ARRAY['gluten']::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'BUĞDAY UNU SÜPER 1', 347.13, 0.51, 0.2, 73.8, 0.0, 11.16, 0.4,
  ARRAY['gluten']::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Frambuazlı sos', 670.0, 0.5, 0.1, 39.1, 24.2, 0.5, 1.4,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'FRAMBUAZ AROMALI KOKOLİN', 564.0, 36.0, NULL, 60.0, NULL, NULL, NULL,
  ARRAY['süt']::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Vi̇şneli̇ Sos', 186.9, 2.1, 1.9, 41.1, 16.4, 0.2, 1.5,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Karamel aromalı sos', 747.0, 2.3, 1.9, 39.2, 26.7, 0.2, 0.22,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Sütlü kokolin', 225.0, 29.4, 26.2, 65.1, 62.5, 3.2, 0.98,
  ARRAY['süt']::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Beyaz kokolin', 538.0, 29.2, 28.5, 66.1, 66.1, 2.7, 1.29,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Bitter kokolin', 518.0, 32.0, 26.0, 57.0, 55.0, 2.8, 0.0,
  ARRAY['süt']::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Bitter çikolata para', 509.0, 30.0, 18.0, 61.0, 50.0, 3.8, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Beyaz çikolata para', 558.0, 33.0, 18.0, 61.0, 50.0, 3.8, 0.0,
  ARRAY['süt']::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Kakao tozu', 495.0, 31.79, 0.0, 31.09, 0.0, 18.87, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Kakaolu fındıklı krema', 540.0, 33.0, 15.0, 55.0, 52.0, 6.0, 0.2,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Renkli granül şeker', 339.0, 1.3, 0.0, 87.0, 91.0, 0.1, 0.03,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Hindistan cevizi', 682.0, 67.22, 0.0, 4.25, 0.0, 5.62, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Tuz', 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 93.52,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Peyni̇r Alti Suyu Tozu', 300.0, 0.54, 0.0, 73.45, 0.0, 11.73, 0.0,
  ARRAY['süt']::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Soya Unu', 409.0, 22.4, 2.7, 36.7, 6.4, 34.3, 0.03,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Bitkisel yağ [………….', 900.0, 100.0, 10.38, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Şeker', 400.0, 0.0, 0.0, 99.44, 98.8, 0.25, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Esmer şeker', 400.0, 0.0, 0.0, 99.82, 96.41, 0.0, 0.04,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'File badem', 600.0, 55.0, 0.0, 17.0, 4.0, 20.0, 0.0,
  ARRAY['fındık']::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Yaş maya', 104.0, 1.0, 0.0, 7.24, 0.0, 12.48, 0.18,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Dekstroz', 400.0, 0.0, 0.0, 99.44, 0.0, 0.25, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Yumurta tozu', 100.0, 10.0, 0.0, 0.0, 0.0, 10.0, 0.38,
  ARRAY['yumurta']::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Enzim (maltogenik amilaz)', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Emülgatör(E471)', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Emülgatör(E472E)', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Emülgatör(E481)', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Kıvam artırıcı (E466)', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Kıvam artırıcı (E415)', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Aroma Veri̇ci̇ (Aci Badem Aromasi)', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  ARRAY['fındık']::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Aroma Veri̇ci̇ (Muskat Aromasi)', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Un İşlem Maddesi̇ (E466)', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Un İşlem Maddesi̇ (E415)', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Nem Veri̇ci̇ (E422)', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'KORUYUCU (e282)', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Su', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Renklendirici (hibiskus sabdariff, maltodekstrin)', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Prejelatinize mısır nişastası', 370.0, 0.78, 0.0, 90.58, 0.0, 0.19, 0.01,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Aroma verici )vanilya aroması)', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Tam Yağli Taze Peyni̇r', 189.0, NULL, NULL, NULL, NULL, NULL, NULL,
  ARRAY['süt']::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Çeçil peyniri', 300.0, 24.0, 0.0, 1.0, 0.0, 25.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Yarım yağlı Tost peyniri', 275.0, 20.0, 13.8, 1.8, 0.5, 22.3, 1.3,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Bitkisel yağlı, şekersiz UHT Krem şanti', 271.0, 27.6, 27.3, 4.5, 0.0, 0.8, 0.22,
  ARRAY['süt','soya']::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Bisküvi', 450.0, 17.0, 9.4, 66.0, 21.0, 6.1, 0.9,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Bisküvi kreması', 563.0, 35.34, 9.48, 54.0, 27.0, 4.18, 0.1,
  ARRAY['gluten','soya']::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Yulaf ezmesi', 378.0, 7.6, 1.42, 59.4, 1.3, 13.5, 0.02,
  ARRAY['gluten']::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Közlenmiş kırmızı biber', 38.0, 0.11, 0.0, 8.02, 4.7, 0.63, 1.25,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Badem', 600.0, 50.22, 0.0, 10.36, 2.7, 20.57, 0.01,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Kurutulmuş domates', 210.0, 0.53, 0.0, 29.22, 13.66, 11.31, 5.31,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Bitkisel yağ (zeytinyağı)', 900.0, 100.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Kaya tuzu', 112.0, 0.44, 0.0, 23.43, 0.0, 2.44, 1.03,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Biber salçası', 14.0, 0.0, 0.0, 3.14, 0.0, 0.25, 0.04,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Elma sirkesi', 2.0, 0.0, 0.0, 0.39, 0.0, 0.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Zeytin ezmesi', 200.0, 18.0, 0.0, 1.0, 0.0, 2.0, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Yeşil zeytin', 130.0, 15.0, 2.0, 3.5, 1.0, 1.0, 6.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

INSERT INTO factory_ingredient_nutrition (
  ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, protein_g, salt_g,
  allergens, source, confidence, created_at, updated_at
) VALUES (
  'Kekik', 288.0, 7.25, 0.0, 26.66, 0.0, 8.81, 0.0,
  NULL::text[], 'aslan_import', 95, NOW(), NOW()
) ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

-- Toplam 59 kayıt INSERT/UPDATE
SELECT COUNT(*) AS toplam_besin_kaydi FROM factory_ingredient_nutrition WHERE source = 'aslan_import';

COMMIT;