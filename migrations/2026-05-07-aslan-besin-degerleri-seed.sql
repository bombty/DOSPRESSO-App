-- ═══════════════════════════════════════════════════════════════════
-- ASLAN BESİN DEĞERLERİ SEED — factory_ingredient_nutrition
-- Tarih: 7 May 2026
--
-- Reçete besin hesaplaması (factory_recipes) için ingredient_name'e göre
-- 100g/100ml besin değerleri seed'i. raw_materials adından eşleşir.
--
-- KAYNAK: TÜRKOMP veri tabanı + USDA + ürün etiket bilgileri
-- İdempotent: ON CONFLICT (ingredient_name) DO UPDATE
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

INSERT INTO factory_ingredient_nutrition (
  ingredient_name,
  energy_kcal, fat_g, saturated_fat_g, trans_fat_g,
  carbohydrate_g, sugar_g, fiber_g,
  protein_g, salt_g, sodium_mg,
  allergens, source, confidence
) VALUES
  -- UN VE TAHIL
  ('Buğday Unu Tip 550', 340, 1.2, 0.2, 0.0, 72.0, 0.4, 2.7, 11.5, 0.01, 4, ARRAY['gluten'], 'turkomp', 95),
  ('Tam Buğday Unu', 340, 1.9, 0.3, 0.0, 67.0, 0.4, 10.0, 13.2, 0.01, 4, ARRAY['gluten'], 'turkomp', 95),
  ('Yulaf Ezmesi', 389, 6.9, 1.2, 0.0, 66.3, 0.0, 10.6, 16.9, 0.01, 4, ARRAY['gluten'], 'turkomp', 90),
  ('Mısır Nişastası', 381, 0.1, 0.0, 0.0, 91.3, 0.0, 0.9, 0.3, 0.01, 4, NULL, 'usda', 95),
  
  -- SÜT VE SÜT ÜRÜNLERİ
  ('Tam Yağlı UHT Süt', 64, 3.6, 2.3, 0.1, 4.7, 4.7, 0.0, 3.4, 0.10, 40, ARRAY['sut'], 'turkomp', 95),
  ('Süt Tozu (Yağlı)', 496, 26.7, 16.7, 0.5, 38.4, 38.4, 0.0, 26.3, 1.10, 440, ARRAY['sut'], 'turkomp', 90),
  ('Tereyağı (%82)', 717, 81.1, 51.4, 2.1, 0.1, 0.1, 0.0, 0.9, 0.02, 8, ARRAY['sut'], 'turkomp', 95),
  ('Krem Peynir', 342, 34.0, 19.7, 1.0, 4.0, 3.0, 0.0, 6.2, 0.61, 244, ARRAY['sut'], 'turkomp', 90),
  ('Beyaz Peynir (Tam Yağlı)', 264, 21.0, 14.0, 0.5, 1.5, 1.5, 0.0, 17.0, 1.50, 600, ARRAY['sut'], 'turkomp', 95),
  ('Süt Kreması (UHT, %35)', 345, 35.0, 22.0, 0.8, 3.0, 3.0, 0.0, 2.0, 0.07, 28, ARRAY['sut'], 'turkomp', 90),
  
  -- YUMURTA
  ('Yumurta (L Boy)', 155, 11.0, 3.3, 0.0, 1.1, 1.1, 0.0, 13.0, 0.36, 144, ARRAY['yumurta'], 'turkomp', 95),
  ('Yumurta Tozu (Bütün)', 594, 43.0, 12.0, 0.1, 4.8, 3.8, 0.0, 47.0, 1.10, 440, ARRAY['yumurta'], 'turkomp', 90),
  
  -- ŞEKER VE TATLANDIRICILAR
  ('Toz Şeker', 400, 0.0, 0.0, 0.0, 99.8, 99.8, 0.0, 0.0, 0.00, 0, NULL, 'usda', 100),
  ('Pudra Şekeri', 400, 0.0, 0.0, 0.0, 99.5, 99.5, 0.0, 0.0, 0.00, 0, NULL, 'usda', 100),
  ('Esmer Şeker (Brown)', 380, 0.0, 0.0, 0.0, 98.0, 95.0, 0.0, 0.1, 0.05, 20, NULL, 'usda', 95),
  ('Bal (Çiçek)', 304, 0.0, 0.0, 0.0, 82.0, 82.0, 0.0, 0.3, 0.01, 4, NULL, 'turkomp', 95),
  
  -- ÇİKOLATA VE KAKAO
  ('Kakao Tozu (Yağsız)', 228, 11.0, 6.5, 0.0, 57.9, 1.8, 33.2, 19.6, 0.05, 20, NULL, 'turkomp', 95),
  ('Sütlü Çikolata Drop (%34 kakao)', 542, 31.6, 19.4, 0.5, 56.4, 54.7, 1.5, 7.7, 0.20, 80, ARRAY['sut','soya'], 'manual', 85),
  ('Bitter Çikolata Drop (%70 kakao)', 600, 42.0, 25.0, 0.0, 45.0, 33.0, 11.5, 8.0, 0.05, 20, ARRAY['soya'], 'manual', 85),
  ('Beyaz Çikolata Drop', 555, 32.6, 19.5, 0.5, 58.4, 58.4, 0.2, 6.4, 0.20, 80, ARRAY['sut','soya'], 'manual', 85),
  
  -- BAHARAT VE AROMA
  ('Tarçın (Öğütülmüş, Cassia)', 247, 1.2, 0.3, 0.0, 80.6, 2.2, 53.1, 4.0, 0.03, 12, NULL, 'turkomp', 95),
  ('Vanilin (Toz)', 400, 0.1, 0.0, 0.0, 90.0, 89.0, 0.0, 0.1, 0.00, 0, NULL, 'manual', 80),
  ('Tuz (Sofra Tuzu, İyotlu)', 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 99.7, 38758, NULL, 'usda', 100),
  
  -- KABARTMA
  ('Kuru Maya', 325, 7.6, 1.0, 0.0, 41.2, 0.0, 26.9, 40.4, 0.20, 80, NULL, 'turkomp', 95),
  ('Kabartma Tozu', 53, 0.0, 0.0, 0.0, 26.0, 0.0, 0.5, 0.0, 11.0, 4400, ARRAY['gluten'], 'manual', 85),
  
  -- YAĞLAR
  ('Ayçiçek Yağı', 884, 100.0, 11.3, 0.2, 0.0, 0.0, 0.0, 0.0, 0.00, 0, NULL, 'turkomp', 95),
  ('Margarin (Pastacılık)', 717, 80.0, 32.0, 1.5, 0.4, 0.4, 0.0, 0.7, 0.40, 160, ARRAY['sut'], 'manual', 85),
  
  -- SERT KABUKLU
  ('Badem (File)', 579, 49.9, 3.8, 0.0, 21.6, 4.4, 12.5, 21.2, 0.00, 0, ARRAY['sert_kabuklu'], 'turkomp', 95),
  ('Fındık (İç, Bütün)', 628, 60.7, 4.5, 0.0, 16.7, 4.3, 9.7, 14.9, 0.00, 0, ARRAY['sert_kabuklu'], 'turkomp', 95),
  ('Yer Fıstığı (Tuzsuz, Kavrulmuş)', 567, 49.2, 6.8, 0.0, 16.1, 4.7, 8.5, 25.8, 0.01, 4, ARRAY['yer_fistigi'], 'turkomp', 95)

ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal = EXCLUDED.energy_kcal,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  trans_fat_g = EXCLUDED.trans_fat_g,
  carbohydrate_g = EXCLUDED.carbohydrate_g,
  sugar_g = EXCLUDED.sugar_g,
  fiber_g = EXCLUDED.fiber_g,
  protein_g = EXCLUDED.protein_g,
  salt_g = EXCLUDED.salt_g,
  sodium_mg = EXCLUDED.sodium_mg,
  allergens = EXCLUDED.allergens,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

-- Doğrulama
SELECT COUNT(*) AS nutrition_seed_count,
       COUNT(*) FILTER (WHERE allergens IS NOT NULL AND array_length(allergens, 1) > 0) AS allergen_count,
       COUNT(*) FILTER (WHERE source = 'turkomp') AS turkomp_count,
       AVG(confidence)::int AS avg_confidence
FROM factory_ingredient_nutrition;

COMMIT;

-- Beklenen:
-- nutrition_seed_count = 30
-- allergen_count       = 16
-- turkomp_count        = 19
-- avg_confidence       = 91+
