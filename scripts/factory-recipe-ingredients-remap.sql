-- ============================================================
-- Task #138: factory_recipe_ingredients.raw_material_id REMAP
-- ============================================================
-- Purpose: Eski/karışık raw_material_id değerleri envanterdeki
--          gerçek hammaddeye işaret etsin. Stok düşümü ve maliyet
--          hesaplamalarının doğru hammaddeyi kullanması garanti altına alınır.
--
-- Tespit edilen hatalı eşleşmeler (örnek):
--   "UN"        -> id 2  (Test Urun 3)            => 10  (HM-008  Un)
--   "SU"        -> id 4  (Tam Yagli Sut)          => 923 (HM-NEW-003 Su)
--   "TUZ"       -> id 527 (Tds Metre Tuz Ölçer)   => 818 (Y-1153 TUZ 3 KG)
--   "TEREYAĞ"   -> id 67 (Kruvasan Sade Tereyağlı)=> 11  (HM-009 Tereyag)
--   "KREMA"     -> id 8  (Kremali Sut)            => 231 (H-1152 Bitkisel Krema %20)
--   "FİLE BADEM"-> id 9  (Badem Sutu)             => 788 (Y-1119 File Badem)
--   "Soya Unu"  -> id 595 (Soya Sütü)             => 817 (Y-1152 Soya Unu Sonic)
--   "Margarin (Alba)" -> id 124 (Turyağ Mayalı)   => 924 (HM-NEW-004 AAK ALBA Margarin)
--   "Su" (DON-001 NULL kayıt)                     => 923 (HM-NEW-003 Su)
--
-- İdempotent: Aynı script tekrar çalıştırılırsa zaten doğru olan
--             kayıtlara dokunmaz (WHERE raw_material_id = <eski>).
-- ============================================================

BEGIN;

-- 1) UN: Test Urun 3 (id=2) yerine HM-008 Un (id=10)
UPDATE factory_recipe_ingredients
SET raw_material_id = 10
WHERE raw_material_id = 2
  AND UPPER(TRIM(name)) IN ('UN');

-- 2) SU / SOĞUK SU: Tam Yağlı Süt (id=4) yerine HM-NEW-003 Su (id=923)
UPDATE factory_recipe_ingredients
SET raw_material_id = 923
WHERE raw_material_id = 4
  AND UPPER(TRIM(name)) IN ('SU', 'SOĞUK SU');

-- 3) TUZ: Tds Metre Tuz Ölçer (id=527, ticari_mal/cihaz!) yerine Y-1153 TUZ 3 KG (id=818)
UPDATE factory_recipe_ingredients
SET raw_material_id = 818
WHERE raw_material_id = 527
  AND UPPER(TRIM(name)) IN ('TUZ');

-- 4) TEREYAĞ: Kruvasan Sade Tereyağlı (id=67, bitmiş ürün!) yerine HM-009 Tereyag (id=11)
UPDATE factory_recipe_ingredients
SET raw_material_id = 11
WHERE raw_material_id = 67
  AND UPPER(TRIM(name)) IN ('TEREYAĞ', 'TEREYAG', 'TEREYAĞI');

-- 5) KREMA: Kremalı Süt (id=8, hammadde süt) yerine H-1152 Bitkisel Krema (id=231)
UPDATE factory_recipe_ingredients
SET raw_material_id = 231
WHERE raw_material_id = 8
  AND UPPER(TRIM(name)) IN ('KREMA');

-- 6) FİLE BADEM: Badem Sutu (id=9, badem sütü) yerine Y-1119 File Badem (id=788)
UPDATE factory_recipe_ingredients
SET raw_material_id = 788
WHERE raw_material_id = 9
  AND UPPER(TRIM(name)) IN ('FİLE BADEM', 'FILE BADEM');

-- 7) Soya Unu: Soya Sütü (id=595) yerine Y-1152 Soya Unu Sonic (id=817)
UPDATE factory_recipe_ingredients
SET raw_material_id = 817
WHERE raw_material_id = 595
  AND UPPER(TRIM(name)) IN ('SOYA UNU');

-- 8) Margarin (Alba): Turyağ Mayalı (id=124) yerine HM-NEW-004 AAK ALBA Margarin (id=924)
UPDATE factory_recipe_ingredients
SET raw_material_id = 924
WHERE raw_material_id = 124
  AND name ILIKE 'Margarin (Alba)%';

-- 9) Su: NULL kayıt için HM-NEW-003 Su (id=923)
UPDATE factory_recipe_ingredients
SET raw_material_id = 923
WHERE raw_material_id IS NULL
  AND UPPER(TRIM(name)) IN ('SU', 'SOĞUK SU');

COMMIT;

-- Doğrulama sorgusu (script çalıştıktan sonra elle koşulabilir):
--
-- SELECT fri.id, fri.recipe_id, fri.name AS ing_name,
--        inv.code AS inv_code, inv.name AS inv_name, inv.category AS inv_category
-- FROM factory_recipe_ingredients fri
-- LEFT JOIN inventory inv ON inv.id = fri.raw_material_id
-- WHERE inv.category NOT IN ('hammadde','yari_mamul','konsantre','toz_topping','arge')
--    OR fri.raw_material_id IS NULL
-- ORDER BY fri.recipe_id, fri.id;
