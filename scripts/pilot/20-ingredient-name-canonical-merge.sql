-- ═══════════════════════════════════════════════════════════════════
-- INGREDIENT_NAME KANONİK BİRLEŞTİRME (Task #131)
-- 23 Nis 2026
-- ═══════════════════════════════════════════════════════════════════
--
-- AMAÇ:
--   factory_ingredient_nutrition tablosunda ŞEKER/Şeker/Toz şeker,
--   SU/Su/SOĞUK SU, MAYA/YAŞ MAYA/Yaş Maya, DEKSTORZ/DEKSTROZ vb. yazım
--   ve kasa varyasyonları aynı malzeme için ayrı satırlara yol açıyordu.
--   Bu script:
--     1. Tek kanonik isim sözlüğü (alias map) tanımlar
--     2. factory_recipe_ingredients.name değerlerini kanonik forma çevirir
--     3. factory_ingredient_nutrition'da her kanonik isim için tek satır
--        bırakır (en yüksek confidence/verified satırı tercih eder),
--        diğerlerini siler ve kalan satırı kanonik isimle günceller
--
-- KAYNAK: shared/lib/ingredient-canonical.ts (TypeScript tarafı aynı map'i
-- kullanır; runtime insert/update yollarında canonicalIngredientName()
-- ile normalize edilir).
--
-- IDEMPOTENT: Tekrar çalıştırılırsa zaten kanonik olan satırlar değişmez.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- 1. ALIAS → CANONICAL eşleme tablosu (geçici)
-- ────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE _ingredient_alias_map (
  alias TEXT PRIMARY KEY,
  canonical TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO _ingredient_alias_map (alias, canonical) VALUES
  ('UN', 'Buğday Unu'),
  ('Un', 'Buğday Unu'),
  ('Buğday Unu', 'Buğday Unu'),
  ('Buğday unu', 'Buğday Unu'),
  ('BUĞDAY UNU', 'Buğday Unu'),
  ('Orta-güçlü un (W250-280, %11.5-12.5 protein)', 'Buğday Unu'),
  ('BUĞDAY GLUTENİ', 'Vital Gluten'),
  ('Buğday Gluteni', 'Vital Gluten'),
  ('Vital Gluten', 'Vital Gluten'),
  ('Vital wheat gluten', 'Vital Gluten'),
  ('Vital Wheat Gluten', 'Vital Gluten'),
  ('SOYA UNU', 'Soya Unu'),
  ('Soya Unu', 'Soya Unu'),
  ('Soya unu', 'Soya Unu'),
  ('ŞEKER', 'Toz Şeker'),
  ('Şeker', 'Toz Şeker'),
  ('TOZ ŞEKER', 'Toz Şeker'),
  ('Toz Şeker', 'Toz Şeker'),
  ('Toz şeker', 'Toz Şeker'),
  ('ESMER ŞEKER', 'Esmer Şeker'),
  ('Esmer Şeker', 'Esmer Şeker'),
  ('Esmer şeker', 'Esmer Şeker'),
  ('TUZ', 'Tuz'),
  ('Tuz', 'Tuz'),
  ('İnce tuz', 'Tuz'),
  ('İNCE TUZ', 'Tuz'),
  ('İnce Tuz', 'Tuz'),
  ('SU', 'Su'),
  ('Su', 'Su'),
  ('SOĞUK SU', 'Su'),
  ('Soğuk Su', 'Su'),
  ('Soğuk su', 'Su'),
  ('Su (28-30°C)', 'Su'),
  ('MAYA', 'Yaş Maya'),
  ('Maya', 'Yaş Maya'),
  ('YAŞ MAYA', 'Yaş Maya'),
  ('Yaş Maya', 'Yaş Maya'),
  ('Yaş maya', 'Yaş Maya'),
  ('Yaş maya (taze)', 'Yaş Maya'),
  ('YUMURTA', 'Yumurta'),
  ('Yumurta', 'Yumurta'),
  ('TOZ YUMURTA', 'Yumurta Tozu'),
  ('Toz Yumurta', 'Yumurta Tozu'),
  ('Toz yumurta', 'Yumurta Tozu'),
  ('TOZ YUMARTA', 'Yumurta Tozu'),
  ('YUMURTA TOZU', 'Yumurta Tozu'),
  ('Yumurta Tozu', 'Yumurta Tozu'),
  ('Yumurta tozu', 'Yumurta Tozu'),
  ('Yumurta tozu (spray-dried)', 'Yumurta Tozu'),
  ('YAĞSIZ SÜT TOZU', 'Yağsız Süt Tozu'),
  ('Yağsız Süt Tozu', 'Yağsız Süt Tozu'),
  ('Yağsız süt tozu', 'Yağsız Süt Tozu'),
  ('SÜT TOZU', 'Süt Tozu'),
  ('Süt Tozu', 'Süt Tozu'),
  ('Süt tozu', 'Süt Tozu'),
  ('PST', 'Peynir Altı Suyu Tozu'),
  ('PST (Peynir Altı Suyu Tozu)', 'Peynir Altı Suyu Tozu'),
  ('Peynir Altı Suyu Tozu', 'Peynir Altı Suyu Tozu'),
  ('Whey protein tozu', 'Whey Protein Tozu'),
  ('WHEY PROTEIN TOZU', 'Whey Protein Tozu'),
  ('Whey Protein Tozu', 'Whey Protein Tozu'),
  ('TEREYAĞ', 'Tereyağ'),
  ('Tereyağ', 'Tereyağ'),
  ('Tereyağı', 'Tereyağ'),
  ('TEREYAĞI', 'Tereyağ'),
  ('AAK ALBA margarin', 'Margarin (Alba)'),
  ('AAK Alba Margarin', 'Margarin (Alba)'),
  ('Margarin (Alba)', 'Margarin (Alba)'),
  ('Margarin Alba', 'Margarin (Alba)'),
  ('KREMA', 'Krema'),
  ('Krema', 'Krema'),
  ('LABNE', 'Labne'),
  ('Labne', 'Labne'),
  ('TAZE PEYNİR', 'Taze Peynir'),
  ('Taze Peynir', 'Taze Peynir'),
  ('Taze peynir', 'Taze Peynir'),
  ('SIVI YAĞ', 'Sıvı Yağ'),
  ('Sıvı Yağ', 'Sıvı Yağ'),
  ('Sıvı yağ', 'Sıvı Yağ'),
  ('VANİLYA', 'Vanilya'),
  ('Vanilya', 'Vanilya'),
  ('GLİSERİN', 'Gliserin (E422)'),
  ('Gliserin', 'Gliserin (E422)'),
  ('Gliserin (E422)', 'Gliserin (E422)'),
  ('CMC', 'CMC (E466)'),
  ('CMC (E466)', 'CMC (E466)'),
  ('DATEM', 'DATEM (E472e)'),
  ('DATEM (E472e)', 'DATEM (E472e)'),
  ('SSL', 'SSL (E481)'),
  ('SSL (E481)', 'SSL (E481)'),
  ('KSANTAN GUM', 'Ksantan Gum (E415)'),
  ('Ksantan Gum', 'Ksantan Gum (E415)'),
  ('XANTHAN GUM', 'Ksantan Gum (E415)'),
  ('Xanthan Gum', 'Ksantan Gum (E415)'),
  ('XHANTAN GUM', 'Ksantan Gum (E415)'),
  ('Xanthan (E415)', 'Ksantan Gum (E415)'),
  ('KALSİYUM PROPİYONAT', 'Kalsiyum Propiyonat (E282)'),
  ('Kalsiyum Propiyonat', 'Kalsiyum Propiyonat (E282)'),
  ('KALSİYUM PROBİYONAT', 'Kalsiyum Propiyonat (E282)'),
  ('Kalsiyum Propiyonat (E282)', 'Kalsiyum Propiyonat (E282)'),
  ('POTASYUM SORBAT', 'Potasyum Sorbat'),
  ('Potasyum Sorbat', 'Potasyum Sorbat'),
  ('POTASTUM SORBAT', 'Potasyum Sorbat'),
  ('L-SİSTEİN', 'L-Sistein (E920)'),
  ('L-Sistein', 'L-Sistein (E920)'),
  ('L-SESTEİN', 'L-Sistein (E920)'),
  ('L-Sistein (E920)', 'L-Sistein (E920)'),
  ('VİTAMİN C', 'Vitamin C (E300)'),
  ('Vitamin C', 'Vitamin C (E300)'),
  ('Vitamin C (E300)', 'Vitamin C (E300)'),
  ('MODİFİYE MSIIR NİŞASTASI', 'Modifiye Mısır Nişastası (E1422)'),
  ('Modifiye Mısır Nişastası', 'Modifiye Mısır Nişastası (E1422)'),
  ('Modifiye nişasta (E1422)', 'Modifiye Mısır Nişastası (E1422)'),
  ('Pregel Modifiye Mısır Nişastası', 'Modifiye Mısır Nişastası (E1422)'),
  ('MALTOGENİK AMİLAZ', 'Maltogenik Amilaz'),
  ('Maltogenik Amilaz', 'Maltogenik Amilaz'),
  ('MUSKAT', 'Muskat'),
  ('Muskat', 'Muskat'),
  ('DEKSTROZ', 'Dekstroz'),
  ('Dekstroz', 'Dekstroz'),
  ('DEKSTORZ', 'Dekstroz'),
  ('İNVERT ŞURUP', 'İnvert Şeker'),
  ('İnvert Şurup', 'İnvert Şeker'),
  ('İnvert Şurup (Creambase)', 'İnvert Şeker'),
  ('İnvert şeker', 'İnvert Şeker'),
  ('İnvert Şeker', 'İnvert Şeker')
;

-- ────────────────────────────────────────────────────────────────────
-- 2. BAŞLANGIÇ DURUMU
-- ────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  nutrition_before INT;
  recipe_ing_before INT;
  alias_count INT;
BEGIN
  SELECT COUNT(*) INTO nutrition_before FROM factory_ingredient_nutrition;
  SELECT COUNT(*) INTO recipe_ing_before FROM factory_recipe_ingredients;
  SELECT COUNT(*) INTO alias_count FROM _ingredient_alias_map;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Kanonik Birleştirme — Başlangıç';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Alias eşleme:                        % satır', alias_count;
  RAISE NOTICE 'factory_ingredient_nutrition (önce): %', nutrition_before;
  RAISE NOTICE 'factory_recipe_ingredients (önce):   %', recipe_ing_before;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 3. RECIPE INGREDIENTS — kanonik isme çevir
-- ────────────────────────────────────────────────────────────────────
UPDATE factory_recipe_ingredients fri
SET name = m.canonical
FROM _ingredient_alias_map m
WHERE fri.name = m.alias
  AND fri.name <> m.canonical;

-- ────────────────────────────────────────────────────────────────────
-- 4. NUTRITION TABLOSU — duplicate'ları birleştir
--    Her kanonik grup için en iyi satırı seç (verified > confidence > id),
--    diğerlerini sil, kalan satırı kanonik isimle güncelle
-- ────────────────────────────────────────────────────────────────────

-- 4a. Kanonik gruba ait satırları listeleyen CTE
WITH grouped AS (
  SELECT
    fin.id,
    fin.ingredient_name,
    COALESCE(m.canonical, fin.ingredient_name) AS canonical,
    fin.verified_by,
    COALESCE(fin.confidence, 0) AS conf
  FROM factory_ingredient_nutrition fin
  LEFT JOIN _ingredient_alias_map m ON m.alias = fin.ingredient_name
),
ranked AS (
  SELECT
    id, ingredient_name, canonical, verified_by, conf,
    ROW_NUMBER() OVER (
      PARTITION BY canonical
      ORDER BY
        (verified_by IS NOT NULL) DESC,  -- önce verified satır
        conf DESC,                       -- sonra confidence yüksek
        (ingredient_name = canonical) DESC, -- sonra zaten kanonik isim
        id ASC                           -- son olarak en eski id
    ) AS rn
  FROM grouped
)
DELETE FROM factory_ingredient_nutrition
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 4b. Hayatta kalan satırları kanonik isme güncelle
UPDATE factory_ingredient_nutrition fin
SET ingredient_name = m.canonical
FROM _ingredient_alias_map m
WHERE fin.ingredient_name = m.alias
  AND fin.ingredient_name <> m.canonical;

-- ────────────────────────────────────────────────────────────────────
-- 5. SONUÇ RAPORU
-- ────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  nutrition_after INT;
  recipe_ing_after INT;
  recipe_unmatched INT;
  unmatched_names TEXT;
BEGIN
  SELECT COUNT(*) INTO nutrition_after FROM factory_ingredient_nutrition;
  SELECT COUNT(*) INTO recipe_ing_after FROM factory_recipe_ingredients;

  -- Reçete malzemeleri arasında nutrition tablosunda karşılığı olmayanlar
  SELECT COUNT(DISTINCT fri.name), string_agg(DISTINCT fri.name, ', ')
    INTO recipe_unmatched, unmatched_names
  FROM factory_recipe_ingredients fri
  LEFT JOIN factory_ingredient_nutrition fin ON fin.ingredient_name = fri.name
  WHERE fin.id IS NULL;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Kanonik Birleştirme — Tamamlandı';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'factory_ingredient_nutrition (sonra): %', nutrition_after;
  RAISE NOTICE 'factory_recipe_ingredients (sonra):   %', recipe_ing_after;
  RAISE NOTICE '';
  IF recipe_unmatched > 0 THEN
    RAISE NOTICE 'UYARI: % reçete malzemesi nutrition tablosunda yok:', recipe_unmatched;
    RAISE NOTICE '  %', unmatched_names;
    RAISE NOTICE '  → Sema bu kalemler için manuel kayıt eklemeli.';
  ELSE
    RAISE NOTICE '✓ Tüm reçete malzemeleri nutrition tablosunda mevcut.';
  END IF;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;
