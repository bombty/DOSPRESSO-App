-- ═══════════════════════════════════════════════════════════════════
-- ALERJEN TEMEL SEED (Pilot Yasal Risk Azaltma) — v3
-- 23 Nis 2026 - Task #122
-- ═══════════════════════════════════════════════════════════════════
--
-- AMAÇ:
--   1. factory_recipe_ingredients içindeki her DISTINCT ingredient için
--      factory_ingredient_nutrition kaydı garanti et (ON CONFLICT NO-OP).
--   2. İsim örüntüsünden çıkarılabilen temel alerjenleri otomatik doldur
--      (gluten, süt, yumurta, soya, sert kabuklu, sülfit). Sadece
--      allergens IS NULL ya da boş array olan satırlar güncellenir;
--      Sema'nın elle girdiği veriler korunur.
--
-- ŞEMA UYUMU (factory_ingredient_nutrition):
--   - ingredient_name VARCHAR UNIQUE (FK değil, string)
--   - allergens TEXT[] array
--   - source VARCHAR  ('manual'|'ai'|'usda'|'turkomp'|'auto-pattern')
--   - confidence INT  (0-100)
--   - verified_by VARCHAR FK users(id)
--
-- SEMA SONRA NE YAPACAK:
--   - Tahmini değerleri /kalite/alerjen panelinden onaylar
--   - Eksik / yanlış olanları düzeltir (UPDATE allergens, source='manual')
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- DRIFT FIX (idempotent): ingredient_name UNIQUE constraint
-- ────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'factory_ingredient_nutrition_name_unique'
       OR (conrelid = 'factory_ingredient_nutrition'::regclass
           AND contype = 'u'
           AND array_to_string(conkey, ',') = (
             SELECT attnum::text FROM pg_attribute
             WHERE attrelid = 'factory_ingredient_nutrition'::regclass
               AND attname = 'ingredient_name'
           ))
  ) THEN
    ALTER TABLE factory_ingredient_nutrition
      ADD CONSTRAINT factory_ingredient_nutrition_name_unique UNIQUE (ingredient_name);
    RAISE NOTICE 'DRIFT FIX: ingredient_name UNIQUE constraint eklendi';
  ELSE
    RAISE NOTICE 'DRIFT OK: ingredient_name UNIQUE constraint mevcut';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- Başlangıç durumu
-- ────────────────────────────────────────────────────────────────────
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
  RAISE NOTICE '';
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 1) DISTINCT ingredient_name'ler için template kayıt (idempotent)
-- ────────────────────────────────────────────────────────────────────
INSERT INTO factory_ingredient_nutrition (ingredient_name, allergens, source, confidence)
SELECT DISTINCT
  fri.name,
  ARRAY[]::text[],
  'auto-pattern',
  0
FROM factory_recipe_ingredients fri
ON CONFLICT (ingredient_name) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- 2) İsim örüntüsünden alerjen tahminleri (sadece boş satırları doldurur)
--    Eşleştirme: lower + Türkçe karakter normalizasyonu
-- ────────────────────────────────────────────────────────────────────
WITH norm AS (
  SELECT
    id,
    ingredient_name,
    translate(
      lower(ingredient_name),
      'çğıöşüâîû',
      'cgiosuaiu'
    ) AS n
  FROM factory_ingredient_nutrition
  WHERE allergens IS NULL OR array_length(allergens, 1) IS NULL
),
classified AS (
  SELECT
    id,
    ingredient_name,
    ARRAY(
      SELECT DISTINCT a FROM unnest(
        CASE WHEN n LIKE '%gluten%' OR n LIKE '%bugday%' OR n LIKE '%un%'
                  OR n LIKE '%maya%' OR n LIKE '%amilaz%' OR n LIKE '%datem%'
                  OR n LIKE '%hpmc%' OR n LIKE '%cmc%' OR n LIKE '%ssl%'
             THEN ARRAY['gluten'] ELSE ARRAY[]::text[] END
        ||
        CASE WHEN n LIKE '%sut%' OR n LIKE '%peynir%' OR n LIKE '%krema%'
                  OR n LIKE '%tereyag%' OR n LIKE '%labne%' OR n LIKE '%whey%'
                  OR n LIKE '%pst%' OR n LIKE '%margarin%' OR n LIKE '%alba%'
                  OR n LIKE '%creambase%' OR n LIKE '%mocha%'
                  OR n LIKE '%sutlu cikolata%' OR n LIKE '%beyaz cikolata%'
             THEN ARRAY['sut'] ELSE ARRAY[]::text[] END
        ||
        CASE WHEN n LIKE '%yumurta%' OR n LIKE '%yumarta%'
             THEN ARRAY['yumurta'] ELSE ARRAY[]::text[] END
        ||
        CASE WHEN n LIKE '%soya%' OR n LIKE '%lesitin%' OR n LIKE '%e322%'
             THEN ARRAY['soya'] ELSE ARRAY[]::text[] END
        ||
        CASE WHEN n LIKE '%badem%' OR n LIKE '%findik%' OR n LIKE '%ceviz%'
                  OR n LIKE '%fistik%' OR n LIKE '%antep%'
             THEN ARRAY['sert_kabuklu'] ELSE ARRAY[]::text[] END
        ||
        CASE WHEN n LIKE '%susam%' OR n LIKE '%tahin%'
             THEN ARRAY['susam'] ELSE ARRAY[]::text[] END
        ||
        CASE WHEN n LIKE '%sulfit%' OR n LIKE '%e220%' OR n LIKE '%e221%'
                  OR n LIKE '%e222%' OR n LIKE '%e223%' OR n LIKE '%e224%'
                  OR n LIKE '%e225%' OR n LIKE '%e226%' OR n LIKE '%e227%'
                  OR n LIKE '%e228%'
             THEN ARRAY['sulfit'] ELSE ARRAY[]::text[] END
      ) AS a
    ) AS allergens_guess
  FROM norm
)
UPDATE factory_ingredient_nutrition fin
SET
  allergens   = classified.allergens_guess,
  source      = 'auto-pattern',
  confidence  = CASE
                  WHEN array_length(classified.allergens_guess, 1) IS NULL THEN 0
                  ELSE 60
                END
FROM classified
WHERE fin.id = classified.id;

-- ────────────────────────────────────────────────────────────────────
-- 3) Sonuç raporu
-- ────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  total_nutrition_count INT;
  with_allergens_count INT;
  empty_count INT;
  recipes_with_allergen_coverage INT;
  total_recipes INT;
  distinct_allergen_kinds INT;
BEGIN
  SELECT COUNT(*) INTO total_nutrition_count FROM factory_ingredient_nutrition;
  SELECT COUNT(*) INTO with_allergens_count
    FROM factory_ingredient_nutrition
    WHERE allergens IS NOT NULL AND array_length(allergens, 1) > 0;
  SELECT COUNT(*) INTO empty_count
    FROM factory_ingredient_nutrition
    WHERE allergens IS NULL OR array_length(allergens, 1) IS NULL;

  SELECT COUNT(DISTINCT fri.recipe_id) INTO recipes_with_allergen_coverage
  FROM factory_recipe_ingredients fri
  JOIN factory_ingredient_nutrition fin ON fin.ingredient_name = fri.name
  WHERE fin.allergens IS NOT NULL AND array_length(fin.allergens, 1) > 0;

  SELECT COUNT(*) INTO total_recipes FROM factory_recipes;

  SELECT COUNT(DISTINCT a) INTO distinct_allergen_kinds
  FROM factory_ingredient_nutrition, unnest(allergens) AS a;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Alerjen Seed Tamamlandı';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Toplam nutrition kayıt:      %', total_nutrition_count;
  RAISE NOTICE 'Alerjen dolu (auto-pattern): % kayıt', with_allergens_count;
  RAISE NOTICE 'Hâlâ boş (manuel bekliyor):  % kayıt', empty_count;
  RAISE NOTICE 'Tespit edilen alerjen tipi:  % adet', distinct_allergen_kinds;
  RAISE NOTICE '';
  RAISE NOTICE 'Coverage: % / % reçete en az bir alerjen kaydına sahip',
    recipes_with_allergen_coverage, total_recipes;
  RAISE NOTICE '';
  RAISE NOTICE '📋 SEMA NIN IŞI (28 Nis pilot öncesi):';
  RAISE NOTICE '1. /kalite/alerjen panelinden auto-pattern kayıtları doğrula';
  RAISE NOTICE '   (UPDATE ... SET source = ''manual'', confidence = 100, verified_by = <uid>)';
  RAISE NOTICE '2. Boş kalan % kayıt için manuel alerjen ata', empty_count;
  RAISE NOTICE '3. Çapraz bulaşma riskleri (notes) eklenir';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;
