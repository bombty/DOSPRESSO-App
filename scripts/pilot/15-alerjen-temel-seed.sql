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

-- INSERT: Her DISTINCT malzeme adı için template kayıt
-- ON CONFLICT: ingredient_name UNIQUE olduğu için zaten varsa atlama
INSERT INTO factory_ingredient_nutrition (
  ingredient_name,
  allergens,
  source,
  confidence,
  verified_by,
  created_at,
  updated_at
)
SELECT DISTINCT
  fri.name,
  ARRAY[]::text[],           -- Boş alerjen array (Sema dolduracak)
  'manual'::varchar,
  0,                          -- confidence=0: template (Sema 100'e çıkaracak)
  NULL,                       -- verified_by: Sema onaylayınca güncellenir
  NOW(),
  NOW()
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
  SELECT COUNT(*) INTO verified_count FROM factory_ingredient_nutrition WHERE verified_by IS NOT NULL;
  SELECT COUNT(*) INTO template_count FROM factory_ingredient_nutrition WHERE verified_by IS NULL AND confidence = 0;

  SELECT COUNT(DISTINCT fri.recipe_id) INTO recipes_with_any_ingredient_nutrition
  FROM factory_recipe_ingredients fri
  JOIN factory_ingredient_nutrition fin ON fin.ingredient_name = fri.name;

  SELECT COUNT(*) INTO total_recipes FROM factory_recipes;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Alerjen Seed Tamamlandı';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Toplam nutrition kayıt:  % (template + doğrulanmış)', total_nutrition_count;
  RAISE NOTICE 'Sema doğrulamış:          % (verified_by NOT NULL)', verified_count;
  RAISE NOTICE 'Template bekleyen:        % (Sema dolduracak)', template_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Coverage: % / % reçete nutrition kaydına sahip',
    recipes_with_any_ingredient_nutrition, total_recipes;
  RAISE NOTICE '';
  RAISE NOTICE '📋 SEMA NIN IŞI (26 Nis öncesi):';
  RAISE NOTICE '1. Her template kayıt için gerçek alerjen + besin değeri girer';
  RAISE NOTICE '   ÖRNEK:';
  RAISE NOTICE '   UPDATE factory_ingredient_nutrition';
  RAISE NOTICE '   SET allergens = ARRAY[''gluten'',''soya''],';
  RAISE NOTICE '       energy_kcal = 364, fat_g = 1.2, carbohydrate_g = 76,';
  RAISE NOTICE '       verified_by = ''hq-sema-gida'',';
  RAISE NOTICE '       confidence = 100';
  RAISE NOTICE '   WHERE ingredient_name = ''Un'';';
  RAISE NOTICE '';
  RAISE NOTICE '2. Admin panelden: /kalite/alerjen sayfası';
  RAISE NOTICE '3. Pilot 28 Nis öncesi en az 27 reçetenin tüm malzemeleri verify';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;
