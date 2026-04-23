-- ═══════════════════════════════════════════════════════════════════
-- ALERJEN TEMEL SEED (Pilot Yasal Risk Azaltma) — DÜZELTMESİ
-- 23 Nis 2026 - Replit v2 raporu B-8 çözümü
-- ═══════════════════════════════════════════════════════════════════
--
-- ÖNCEKİ HATA:
--   ingredient_id + contains_gluten/dairy/eggs BOOLEAN kolonları kullandım
--   Gerçek şema:
--     - ingredient_name VARCHAR UNIQUE (FK DEĞİL, string)
--     - allergens TEXT[] array ["gluten","soya"]
--     - verified_by VARCHAR FK users(id) (is_verified değil)
--
-- DÜZELTME:
--   DISTINCT ingredient_name'ler için template kayıt
--   allergens = boş array '{}'
--   source = 'manual', confidence = 0, verified_by = NULL
--
-- Sema SONRA ne yapacak:
--   UPDATE factory_ingredient_nutrition
--   SET allergens = ARRAY['gluten','soya'], verified_by = 'sema-user-id'
--   WHERE ingredient_name = 'Un';
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Mevcut durum
DO $$
DECLARE
  existing_count INT;
  recipe_ingredient_count INT;
  distinct_ingredient_names INT;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM factory_ingredient_nutrition;
  SELECT COUNT(*) INTO recipe_ingredient_count FROM factory_recipe_ingredients;
  SELECT COUNT(DISTINCT name) INTO distinct_ingredient_names FROM factory_recipe_ingredients;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Alerjen Seed - Başlangıç Durumu';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'factory_ingredient_nutrition: % kayıt', existing_count;
  RAISE NOTICE 'factory_recipe_ingredients:    % kayıt', recipe_ingredient_count;
  RAISE NOTICE 'DISTINCT ingredient_name:      % benzersiz', distinct_ingredient_names;

  IF existing_count > 0 THEN
    RAISE NOTICE 'ℹ️  Mevcut kayıtlar korunacak, sadece eksikler eklenecek';
  END IF;
  RAISE NOTICE '';
END $$;

-- INSERT: Sadece zorunlu kolonlar (şema drift riski minimal)
-- ingredient_name (NOT NULL UNIQUE) - Sema diğer kolonları sonra dolduracak
INSERT INTO factory_ingredient_nutrition (ingredient_name, allergens)
SELECT DISTINCT
  fri.name,
  ARRAY[]::text[]
FROM factory_recipe_ingredients fri
ON CONFLICT (ingredient_name) DO NOTHING;

-- Sonuç raporu
DO $$
DECLARE
  total_nutrition_count INT;
  verified_count INT;
  template_count INT;
  recipes_with_any_ingredient_nutrition INT;
  total_recipes INT;
BEGIN
  SELECT COUNT(*) INTO total_nutrition_count FROM factory_ingredient_nutrition;
  SELECT COUNT(*) INTO verified_count FROM factory_ingredient_nutrition WHERE allergens IS NOT NULL AND array_length(allergens, 1) > 0;
  SELECT COUNT(*) INTO template_count FROM factory_ingredient_nutrition WHERE allergens = ARRAY[]::text[];

  SELECT COUNT(DISTINCT fri.recipe_id) INTO recipes_with_any_ingredient_nutrition
  FROM factory_recipe_ingredients fri
  JOIN factory_ingredient_nutrition fin ON fin.ingredient_name = fri.name;

  SELECT COUNT(*) INTO total_recipes FROM factory_recipes;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Alerjen Seed Tamamlandı';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Toplam nutrition kayıt:    %', total_nutrition_count;
  RAISE NOTICE 'Alerjen dolu (verify):     % kayıt', verified_count;
  RAISE NOTICE 'Template (Sema bekliyor):  % kayıt', template_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Coverage: % / % reçete nutrition kaydına sahip',
    recipes_with_any_ingredient_nutrition, total_recipes;
  RAISE NOTICE '';
  RAISE NOTICE '📋 SEMA NIN IŞI (26 Nis öncesi):';
  RAISE NOTICE '1. Her template kayıt için gerçek alerjen girer';
  RAISE NOTICE '   ÖRNEK:';
  RAISE NOTICE '   UPDATE factory_ingredient_nutrition';
  RAISE NOTICE '   SET allergens = ARRAY[''gluten'',''soya'']';
  RAISE NOTICE '   WHERE ingredient_name = ''Un'';';
  RAISE NOTICE '';
  RAISE NOTICE '2. Admin panelden: /kalite/alerjen sayfasi';
  RAISE NOTICE '3. Pilot 28 Nis oncesi en az 27 recetenin tum malzemeleri verify';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;
