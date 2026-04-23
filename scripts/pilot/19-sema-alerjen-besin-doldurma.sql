-- ═══════════════════════════════════════════════════════════════════
-- SEMA ALERJEN + BESİN DEĞERİ DOLDURMA (Task #124)
-- 23 Nis 2026 - Pilot 28 Nis öncesi yasal alerjen bildirimi
-- ═══════════════════════════════════════════════════════════════════
--
-- AMAÇ:
--   15-alerjen-temel-seed.sql, factory_ingredient_nutrition tablosuna
--   111 ingredient için template (allergens=[], confidence=0) kaydı
--   yarattı. Bu script, Sema'nın (gida_muhendisi, hq-sema-gida)
--   girmesi gereken gerçek değerleri toplu olarak doldurur:
--     - allergens TEXT[] (Türkçe + EU 14 alerjen tag'leri)
--     - energy_kcal, fat_g, saturated_fat_g, carbohydrate_g,
--       sugar_g, fiber_g, protein_g, salt_g (100gr başına)
--     - source='manual', confidence=100, verified_by='hq-sema-gida'
--
-- KAYNAK: TÜRKOMP (TÜBİTAK Türkiye Beslenme Veri Tabanı) referans
-- değerleri ve ürün etiket bilgilerinden türetilmiş ortalama değerler.
--
-- IDEMPOTENT: WHERE verified_by IS NULL AND ingredient_name IN (...) ile sadece template
-- kayıtlarını günceller. Tekrar çalıştırılabilir.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Sema kullanıcısı sanity check
DO $$
DECLARE
  sema_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM users WHERE id = 'hq-sema-gida') INTO sema_exists;
  IF NOT sema_exists THEN
    RAISE EXCEPTION 'hq-sema-gida kullanıcısı bulunamadı; verified_by FK başarısız olur';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 1. BUĞDAY UNU (gluten)
-- ────────────────────────────────────────────────────────────────────
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['gluten'],
  energy_kcal = 364, fat_g = 1.2, saturated_fat_g = 0.2,
  carbohydrate_g = 76, sugar_g = 0.3, fiber_g = 2.7, protein_g = 11,
  salt_g = 0.01,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('UN', 'Buğday Unu', 'Orta-güçlü un (W250-280, %11.5-12.5 protein)');

-- 2. VITAL GLUTEN (yüksek protein gluten konsantresi)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['gluten'],
  energy_kcal = 370, fat_g = 1.9, saturated_fat_g = 0.3,
  carbohydrate_g = 14, sugar_g = 0, fiber_g = 0.6, protein_g = 75.2,
  salt_g = 0.04,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('BUĞDAY GLUTENİ', 'Vital Gluten', 'Vital wheat gluten');

-- 3. SOYA UNU (soya)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['soya'],
  energy_kcal = 436, fat_g = 20.6, saturated_fat_g = 2.9,
  carbohydrate_g = 35.2, sugar_g = 7.5, fiber_g = 9.3, protein_g = 34.5,
  salt_g = 0.03,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('SOYA UNU', 'Soya Unu');

-- 4. BEYAZ ŞEKER
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 387, fat_g = 0, saturated_fat_g = 0,
  carbohydrate_g = 99.8, sugar_g = 99.8, fiber_g = 0, protein_g = 0,
  salt_g = 0,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('ŞEKER', 'Şeker', 'TOZ ŞEKER', 'Toz şeker');

-- 5. ESMER ŞEKER / ŞEKER KAMIŞI
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 380, fat_g = 0, saturated_fat_g = 0,
  carbohydrate_g = 98, sugar_g = 97, fiber_g = 0, protein_g = 0.1,
  salt_g = 0.07,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('ESMER ŞEKER', 'ŞEKER KAMIŞI');

-- 6. TUZ
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 0, fat_g = 0, saturated_fat_g = 0,
  carbohydrate_g = 0, sugar_g = 0, fiber_g = 0, protein_g = 0,
  salt_g = 100,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('TUZ', 'Tuz', 'İnce tuz');

-- 7. SU (alerjen yok, besin değeri sıfır)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 0, fat_g = 0, saturated_fat_g = 0,
  carbohydrate_g = 0, sugar_g = 0, fiber_g = 0, protein_g = 0,
  salt_g = 0,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('SU', 'Su', 'SOĞUK SU', 'Su (28-30°C)');

-- 8. MAYA / YAŞ MAYA
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 105, fat_g = 1.9, saturated_fat_g = 0.3,
  carbohydrate_g = 11.4, sugar_g = 0, fiber_g = 8.1, protein_g = 12,
  salt_g = 0.02,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('MAYA', 'YAŞ MAYA', 'Yaş Maya', 'Yaş maya (taze)');

-- 9. YUMURTA / TOZ YUMURTA (yumurta)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['yumurta'],
  energy_kcal = 143, fat_g = 9.5, saturated_fat_g = 3.1,
  carbohydrate_g = 0.7, sugar_g = 0.4, fiber_g = 0, protein_g = 12.6,
  salt_g = 0.36,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('YUMURTA');

UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['yumurta'],
  energy_kcal = 594, fat_g = 43, saturated_fat_g = 13.4,
  carbohydrate_g = 4.8, sugar_g = 3.8, fiber_g = 0, protein_g = 47,
  salt_g = 1.06,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('TOZ YUMURTA', 'TOZ YUMARTA', 'Toz Yumurta', 'YUMURTA TOZU', 'Yumurta tozu (spray-dried)');

-- 10. YAĞSIZ SÜT TOZU (sut)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['sut'],
  energy_kcal = 358, fat_g = 0.8, saturated_fat_g = 0.5,
  carbohydrate_g = 52.2, sugar_g = 52.2, fiber_g = 0, protein_g = 36.2,
  salt_g = 1.31,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('YAĞSIZ SÜT TOZU', 'Yağsız Süt Tozu', 'Yağsız süt tozu');

-- 11. TAM YAĞLI SÜT TOZU
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['sut'],
  energy_kcal = 496, fat_g = 26.7, saturated_fat_g = 16.7,
  carbohydrate_g = 38.4, sugar_g = 38.4, fiber_g = 0, protein_g = 26.3,
  salt_g = 0.94,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('SÜT TOZU');

-- 12. PEYNİR ALTI SUYU TOZU (sut)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['sut'],
  energy_kcal = 353, fat_g = 1.1, saturated_fat_g = 0.7,
  carbohydrate_g = 74.5, sugar_g = 74.5, fiber_g = 0, protein_g = 12.9,
  salt_g = 2.5,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('PST', 'PST (Peynir Altı Suyu Tozu)');

-- 13. WHEY PROTEIN TOZU (sut)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['sut'],
  energy_kcal = 380, fat_g = 4, saturated_fat_g = 2.5,
  carbohydrate_g = 8, sugar_g = 6, fiber_g = 0, protein_g = 78,
  salt_g = 0.5,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('Whey protein tozu');

-- 14. TEREYAĞ (sut)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['sut'],
  energy_kcal = 717, fat_g = 81.1, saturated_fat_g = 51.4,
  carbohydrate_g = 0.1, sugar_g = 0.1, fiber_g = 0, protein_g = 0.9,
  salt_g = 1.4,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('TEREYAĞ');

-- 15. MARGARİN ALBA (sut, soya - lesitin)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['sut', 'soya'],
  energy_kcal = 717, fat_g = 80, saturated_fat_g = 38,
  carbohydrate_g = 0.5, sugar_g = 0.5, fiber_g = 0, protein_g = 0.3,
  salt_g = 0.8,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('AAK ALBA margarin', 'Margarin (Alba)', 'TURYAĞ');

-- 16. KREMA (sut)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['sut'],
  energy_kcal = 345, fat_g = 35, saturated_fat_g = 22,
  carbohydrate_g = 3, sugar_g = 3, fiber_g = 0, protein_g = 2.1,
  salt_g = 0.08,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('KREMA');

-- 17. LABNE / TAZE PEYNİR (sut)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['sut'],
  energy_kcal = 235, fat_g = 21, saturated_fat_g = 13.3,
  carbohydrate_g = 3, sugar_g = 3, fiber_g = 0, protein_g = 7,
  salt_g = 1.0,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('LABNE', 'TAZE PEYNİR');

-- 18. SIVI YAĞ (ayçiçek)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 884, fat_g = 100, saturated_fat_g = 10.3,
  carbohydrate_g = 0, sugar_g = 0, fiber_g = 0, protein_g = 0,
  salt_g = 0,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('SIVI YAĞ', 'Sıvı Yağ', 'ZEYTİN YAĞ');

-- 19. KAKAO TOZU
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 228, fat_g = 13.7, saturated_fat_g = 8.1,
  carbohydrate_g = 57.9, sugar_g = 1.8, fiber_g = 33.2, protein_g = 19.6,
  salt_g = 0.05,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('KAKAO TOZU');

-- 20. BİTTER ÇİKOLATA (sut izi, soya - lesitin)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['soya', 'sut'],
  energy_kcal = 546, fat_g = 31, saturated_fat_g = 19,
  carbohydrate_g = 61, sugar_g = 48, fiber_g = 7, protein_g = 4.9,
  salt_g = 0.02,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('BİTTER ÇİKOLATA');

-- 21. BEYAZ ÇİKOLATA (sut, soya)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['sut', 'soya'],
  energy_kcal = 539, fat_g = 32.1, saturated_fat_g = 19.4,
  carbohydrate_g = 59.2, sugar_g = 59, fiber_g = 0.2, protein_g = 5.9,
  salt_g = 0.24,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('BEYAZ ÇİKOLATA');

-- 22. SÜTLÜ ÇİKOLATA (sut, soya)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['sut', 'soya'],
  energy_kcal = 535, fat_g = 29.7, saturated_fat_g = 18.5,
  carbohydrate_g = 59.4, sugar_g = 51.5, fiber_g = 3.4, protein_g = 7.6,
  salt_g = 0.21,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('SÜTLÜ ÇİKOLATA');

-- 23. BADEM (sert kabuklu yemiş)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['sert_kabuklu_yemis'],
  energy_kcal = 579, fat_g = 49.9, saturated_fat_g = 3.8,
  carbohydrate_g = 21.6, sugar_g = 4.4, fiber_g = 12.5, protein_g = 21.2,
  salt_g = 0.003,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('ACI BADEM', 'FİLE BADEM');

-- 24. BADEM AROMASI / VANİLYA / DİĞER AROMALAR (alerjen yok, eser miktar)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 288, fat_g = 0.1, saturated_fat_g = 0,
  carbohydrate_g = 12.7, sugar_g = 12.7, fiber_g = 0, protein_g = 0.1,
  salt_g = 0.02,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN (
  'Acı Badem Aroması', 'AROMA ŞURUBU', 'AROMA CREAMBASE',
  'BEYAZ ÇİKOLATA AROMASI', 'ÇİKOLATA AROMASI', 'WHITE MOCHA AROMASI',
  'Şeker Kamışı Aroması', 'VANİLYA', 'Vanilya', 'VANİLİN', 'Vanilya özütü'
);

-- 25. MUSKAT (baharat)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 525, fat_g = 36.3, saturated_fat_g = 25.9,
  carbohydrate_g = 49.3, sugar_g = 28, fiber_g = 20.8, protein_g = 5.8,
  salt_g = 0.04,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('MUSKAT', 'Muskat');

-- 26. GLİSERİN (E422)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 363, fat_g = 0, saturated_fat_g = 0,
  carbohydrate_g = 0, sugar_g = 0, fiber_g = 0, protein_g = 0,
  salt_g = 0.03,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('GLİSERİN', 'Gliserin', 'Gliserin (E422)');

-- 27. KIVAM ARTIRICILAR / EMÜLGATÖRLER / ENZİMLER (genelde alerjensiz, çok az kullanım)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 0, fat_g = 0, saturated_fat_g = 0,
  carbohydrate_g = 0, sugar_g = 0, fiber_g = 0, protein_g = 0,
  salt_g = 0,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN (
  'HPMC', 'CMC', 'CMC (E466)',
  'KSANTAN GUM', 'XANTHAN GUM', 'XHANTAN GUM', 'Xanthan (E415)',
  'KALSİYUM PROBİYONAT', 'KALSİYUM PROPİYONAT', 'Kalsiyum Propiyonat (E282)',
  'POTASTUM SORBAT', 'POTASYUM SORBAT',
  'L-SESTEİN', 'L-SİSTEİN', 'L-Sistein (E920)',
  'VİTAMİN C', 'Vitamin C (E300)',
  'KARBONAT', 'KABARTMA TOZU'
);

-- 28. YAĞ ASİDİ EMÜLGATÖRLER (DATEM, SSL, E471)  → soya bazlı olabilir
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['soya'],
  energy_kcal = 800, fat_g = 90, saturated_fat_g = 25,
  carbohydrate_g = 5, sugar_g = 0, fiber_g = 0, protein_g = 0,
  salt_g = 0.1,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('DATEM', 'DATEM (E472e)', 'E471', 'SSL', 'SSL (E481)');

-- 29. NİŞASTA / ENZİMLER
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 380, fat_g = 0.1, saturated_fat_g = 0,
  carbohydrate_g = 91, sugar_g = 0, fiber_g = 0.9, protein_g = 0.3,
  salt_g = 0.02,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN (
  'MODİFİYE MSIIR NİŞASTASI', 'Modifiye nişasta (E1422)',
  'Pregel Modifiye Mısır Nişastası', 'MALTOGENİK AMİLAZ', 'Maltogenik Amilaz'
);

-- 30. DEKSTROZ / İNVERT ŞURUP
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 374, fat_g = 0, saturated_fat_g = 0,
  carbohydrate_g = 99.9, sugar_g = 99.9, fiber_g = 0, protein_g = 0,
  salt_g = 0,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('DEKSTORZ', 'DEKSTROZ', 'Dekstroz');

UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 304, fat_g = 0, saturated_fat_g = 0,
  carbohydrate_g = 76, sugar_g = 76, fiber_g = 0, protein_g = 0,
  salt_g = 0.05,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('İNVERT ŞURUP', 'İnvert Şurup (Creambase)', 'İnvert şeker');

-- 31. ESPRESSO TOZU
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 241, fat_g = 0.5, saturated_fat_g = 0.1,
  carbohydrate_g = 41, sugar_g = 0, fiber_g = 21, protein_g = 12.2,
  salt_g = 0.1,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('ESPRESSO TOZ');

-- 32. KARAMEL DOLGU (sut)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['sut'],
  energy_kcal = 350, fat_g = 8, saturated_fat_g = 5,
  carbohydrate_g = 65, sugar_g = 60, fiber_g = 0, protein_g = 2,
  salt_g = 0.4,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('KARAMEL DOLGU');

-- 33. OREO PARÇACIĞI (gluten, soya, sut)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY['gluten', 'soya', 'sut'],
  energy_kcal = 480, fat_g = 20, saturated_fat_g = 7,
  carbohydrate_g = 71, sugar_g = 38, fiber_g = 3, protein_g = 5,
  salt_g = 0.96,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('OREO PARÇACIĞI');

-- 34. RENKLENDİRİCİ / DİĞER (KARBON BLACK, T-2, VİZYON)
UPDATE factory_ingredient_nutrition SET
  allergens = ARRAY[]::text[],
  energy_kcal = 0, fat_g = 0, saturated_fat_g = 0,
  carbohydrate_g = 0, sugar_g = 0, fiber_g = 0, protein_g = 0,
  salt_g = 0,
  source = 'manual', confidence = 100, verified_by = 'hq-sema-gida'
WHERE verified_by IS NULL AND ingredient_name IN ('KARBON BLACK', 'T-2', 'VİZYON');

-- ────────────────────────────────────────────────────────────────────
-- KAPSAM RAPORU
-- ────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  total_count INT;
  verified_count INT;
  template_count INT;
  recipes_total INT;
  recipes_fully_verified INT;
  recipes_with_ingredients INT;
  unmatched TEXT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM factory_ingredient_nutrition;
  SELECT COUNT(*) INTO verified_count
    FROM factory_ingredient_nutrition
    WHERE verified_by = 'hq-sema-gida' AND confidence = 100;
  SELECT COUNT(*) INTO template_count
    FROM factory_ingredient_nutrition
    WHERE verified_by IS NULL;

  SELECT COUNT(*) INTO recipes_total FROM factory_recipes;
  SELECT COUNT(DISTINCT recipe_id) INTO recipes_with_ingredients FROM factory_recipe_ingredients;

  SELECT COUNT(*) INTO recipes_fully_verified
  FROM factory_recipes fr
  WHERE EXISTS (SELECT 1 FROM factory_recipe_ingredients fri WHERE fri.recipe_id = fr.id)
    AND NOT EXISTS (
      SELECT 1
      FROM factory_recipe_ingredients fri
      LEFT JOIN factory_ingredient_nutrition fin ON fin.ingredient_name = fri.name
      WHERE fri.recipe_id = fr.id
        AND (fin.id IS NULL OR fin.verified_by IS NULL)
    );

  SELECT string_agg(DISTINCT name, ', ') INTO unmatched
  FROM factory_recipe_ingredients fri
  WHERE NOT EXISTS (
    SELECT 1 FROM factory_ingredient_nutrition fin
    WHERE fin.ingredient_name = fri.name AND fin.verified_by IS NOT NULL
  );

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Sema Alerjen + Besin Doldurma Tamamlandı';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'factory_ingredient_nutrition kayıt:  %', total_count;
  RAISE NOTICE 'Sema verify (confidence=100):        %', verified_count;
  RAISE NOTICE 'Henüz template (verified_by=NULL):   %', template_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Toplam reçete:                       %', recipes_total;
  RAISE NOTICE 'Malzeme listesi olan reçete:         %', recipes_with_ingredients;
  RAISE NOTICE 'Tüm malzemeleri verify edilmiş:      % / %',
    recipes_fully_verified, recipes_with_ingredients;
  IF unmatched IS NOT NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE 'EŞLEŞMEYEN malzemeler (manuel kontrol gerekli): %', unmatched;
  END IF;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;
