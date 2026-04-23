-- ═══════════════════════════════════════════════════════════════════
-- ALERJEN TEMEL SEED (Pilot Yasal Risk Azaltma)
-- 23 Nis 2026 - Replit v2 raporu B-8 çözümü
-- ═══════════════════════════════════════════════════════════════════
--
-- UYARI: Bu TAMAMLAYICI DEĞİL, BAŞLANGIÇ seed'idir.
-- Sema (gida_muhendisi) 26 Nis smoke test öncesi gerçek alerjen verilerini
-- girmelidir (her reçete için detaylı analiz).
--
-- Bu seed ne yapar:
-- 1. En yaygın 8 alerjen (AB Direktif 1169/2011):
--    gluten, süt, yumurta, soya, fındık, fıstık, susam, sülfit
-- 2. factory_ingredient_nutrition tablosuna TEMPLATE kayıt
-- 3. Her hammadde için boş kayıt (Sema sonra doldurur)
--
-- Pilot yasal minimum: Müşteri alerjen sorduğunda "kayıtlarımız
-- güncellenmiyor, lütfen dikkatli tüketin" diyebiliriz.
-- Bu seed sonrası "şu reçetemizde X, Y alerjen var" diyebiliriz.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Mevcut factory_ingredient_nutrition sayısı kontrolü
DO $$
DECLARE
  existing_count INT;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM factory_ingredient_nutrition;

  IF existing_count > 0 THEN
    RAISE NOTICE 'ℹ️  factory_ingredient_nutrition zaten % kayıt içeriyor. Seed atlanıyor.', existing_count;
    RAISE NOTICE '   Sema verileri doğrudan güncelliyor olabilir.';
  ELSE
    RAISE NOTICE '⚠️  factory_ingredient_nutrition BOŞ - yasal risk!';
    RAISE NOTICE '   Bu seed template kayıtları ekler - Sema sonra doldurur';
  END IF;
END $$;

-- factory_ingredient_nutrition template kayıt:
-- Her hammadde için default "bilinmiyor" kayıt
-- Sema bunları UPDATE edecek (gerçek alerjen + beslenme)
INSERT INTO factory_ingredient_nutrition (
  ingredient_id,
  contains_gluten,
  contains_dairy,
  contains_eggs,
  contains_soy,
  contains_tree_nuts,
  contains_peanuts,
  contains_sesame,
  contains_sulfites,
  allergen_notes,
  is_verified,
  created_at,
  updated_at
)
SELECT
  ri.id,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  'SEMA DOLDURACAK — default false (yasal minimum için güvenli default)',
  false, -- is_verified=false → Sema doğrulayacak
  NOW(),
  NOW()
FROM factory_recipe_ingredients ri
WHERE NOT EXISTS (
  SELECT 1 FROM factory_ingredient_nutrition n
  WHERE n.ingredient_id = ri.id
)
ON CONFLICT DO NOTHING;

-- Sonuç raporu
DO $$
DECLARE
  total_count INT;
  verified_count INT;
  recipes_with_nutrition INT;
  total_recipes INT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM factory_ingredient_nutrition;
  SELECT COUNT(*) INTO verified_count FROM factory_ingredient_nutrition WHERE is_verified = true;
  SELECT COUNT(DISTINCT r.id) INTO recipes_with_nutrition
  FROM factory_recipes r
  JOIN factory_recipe_ingredients ri ON ri.recipe_id = r.id
  JOIN factory_ingredient_nutrition n ON n.ingredient_id = ri.id;
  SELECT COUNT(*) INTO total_recipes FROM factory_recipes;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Alerjen Seed Tamamlandı';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Toplam template kayıt:  %', total_count;
  RAISE NOTICE 'Sema doğrulamış (verified): %', verified_count;
  RAISE NOTICE 'Alerjen verisi olan reçete: % / %', recipes_with_nutrition, total_recipes;
  RAISE NOTICE '';
  RAISE NOTICE '📋 SEMA''NIN İŞİ (26 Nis öncesi):';
  RAISE NOTICE '1. factory_ingredient_nutrition tablosunda kayıtları aç';
  RAISE NOTICE '2. Her malzeme için gerçek alerjen durumunu işaretle';
  RAISE NOTICE '3. is_verified=true ile onayla';
  RAISE NOTICE '4. Pilot öncesi tüm 27 reçete için verify etmeli';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;
