-- ═══════════════════════════════════════════════════════════════════
-- 12 BOŞ REÇETE MALZEME TAMAMLAMA (Task #129)
-- 23 Nis 2026 - Task #124 (Sema alerjen seed) takip aksiyonu
-- ═══════════════════════════════════════════════════════════════════
--
-- AMAÇ:
--   factory_recipes tablosunda is_active=true olduğu halde
--   factory_recipe_ingredients tablosunda hiç malzemesi olmayan
--   12 placeholder reçeteyi gerçek malzeme listesiyle doldurmak.
--   Bu reçeteler "... Reçetesi" suffix'li PR-* kodlu kayıtlar olup
--   pilot 28 Nis öncesi /kalite/alerjen müşteri sayfasında alerjen
--   bilgisi gösterilebilir hale getirmek için doldurulmaktadır.
--
-- DUPLICATE TEMİZLİĞİ:
--   id=13 "Donut" (PR-014, product_id=1) reçetesi, id=27 "Donut"
--   (DON-001, product_id=72) reçetesinin duplicate'idir. Soft-delete
--   ile is_active=false yapılır.
--
-- DOLDURULAN REÇETELER (11):
--   2  Donut Base Hamuru Reçetesi    (PR-003, prod 40)
--   3  Cinnaboom Classic Reçetesi    (PR-004, prod 41)
--   4  Cinnaboom Brownie Reçetesi    (PR-005, prod 42)
--   5  New York Cookie Reçetesi      (PR-006, prod 43)
--   6  Crumble Cookie Reçetesi       (PR-007, prod 44)
--   7  Cheesecake Base Reçetesi      (PR-008, prod 45)
--   8  Oreo Cheesecake Reçetesi      (PR-009, prod 46)
--   9  San Sebastian Reçetesi        (PR-010, prod 47)
--   10 Bombty Latte Powder Reçetesi  (PR-011, prod 61)
--   11 Chocolate Powder Reçetesi     (PR-012, prod 62)
--   12 Creambase Powder Reçetesi     (PR-013, prod 63)
--
-- KAYNAKLAR:
--   - Mevcut tam reçeteler (id=22 Siyah Cookie, id=27 Donut, id=15
--     Cheesecake Lotus) referans alındı.
--   - Ingredient adlandırma factory_ingredient_nutrition tablosu
--     coverage'ı ile uyumlu (UN, ŞEKER, TEREYAĞ vb. uppercase).
--
-- IDEMPOTENT:
--   Her reçete için INSERT öncesi NOT EXISTS guard ile mevcut
--   malzeme satırı varsa atlanır. Tekrar çalıştırılabilir.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- 0a. PREFLIGHT: nutrition INSERT'leri için hq-sema-gida kullanıcısı
--     olmalı (verified_by FK). Yoksa hata fırlat.
-- ────────────────────────────────────────────────────────────────────
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
-- 0b. DUPLICATE DONUT (id=13) SOFT-DELETE
-- ────────────────────────────────────────────────────────────────────
UPDATE factory_recipes
SET is_active = false,
    deleted_at = NOW(),
    updated_at = NOW(),
    change_log = COALESCE(change_log, '') ||
      E'\n[2026-04-23 Task #129] Duplicate of recipe id=27 (DON-001), soft-deleted.'
WHERE id = 13 AND is_active = true;

-- ────────────────────────────────────────────────────────────────────
-- Yardımcı: bir reçeteye satır eklemeden önce o reçetenin malzemesi
-- yoksa devam et. Aşağıdaki tüm INSERT'ler aynı pattern'i kullanır.
-- ────────────────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════════════
-- 1. DONUT BASE HAMURU REÇETESİ (id=2)
--    Donut hamur formülü — id=27 referans alındı (29 ingredient).
-- ════════════════════════════════════════════════════════════════════
INSERT INTO factory_recipe_ingredients
  (recipe_id, ref_id, name, amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
SELECT recipe_id, ref_id, name, amount_text::numeric AS amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order FROM (VALUES
  (2, '0001', 'UN',                        '30000', 'g', 'normal',   'ana',   2,   0),
  (2, '0002', 'BUĞDAY GLUTENİ',            '130',   'g', 'normal',   'katki', 120, 1),
  (2, '0003', 'TOZ YUMURTA',               '150',   'g', 'normal',   'ana',   213, 2),
  (2, '0004', 'SU',                        '17000', 'g', 'normal',   'ana',   NULL,3),
  (2, '0005', 'ŞEKER',                     '3300',  'g', 'normal',   'ana',   116, 4),
  (2, '0006', 'DEKSTROZ',                  '500',   'g', 'normal',   'ana',   280, 5),
  (2, '0007', 'İNVERT ŞURUP',              '250',   'g', 'normal',   'ana',   74,  6),
  (2, '0008', 'GLİSERİN',                  '110',   'g', 'normal',   'katki', 170, 7),
  (2, '0009', 'AAK ALBA margarin',         '2900',  'g', 'normal',   'ana',   924, 8),
  (2, '0010', 'SIVI YAĞ',                  '1300',  'g', 'normal',   'ana',   791, 9),
  (2, '0011', 'YAĞSIZ SÜT TOZU',           '500',   'g', 'normal',   'ana',   119, 10),
  (2, '0012', 'SOYA UNU',                  '120',   'g', 'normal',   'ana',   595, 11),
  (2, '0013', 'PST',                       '30',    'g', 'normal',   'ana',   166, 12),
  (2, '0014', 'TUZ',                       '400',   'g', 'normal',   'katki', 527, 13),
  (2, '0015', 'YAŞ MAYA',                  '1000',  'g', 'normal',   'ana',   118, 14),
  (2, '0016', 'CMC (E466)',                '40',    'g', 'keyblend', 'katki', 936, 15),
  (2, '0017', 'KSANTAN GUM',               '1',     'g', 'keyblend', 'katki', 155, 16),
  (2, '0018', 'MODİFİYE MSIIR NİŞASTASI',  '110',   'g', 'keyblend', 'katki', 815, 17),
  (2, '0019', 'MALTOGENİK AMİLAZ',         '3',     'g', 'keyblend', 'katki', 940, 18),
  (2, '0020', 'L-SİSTEİN',                 '1',     'g', 'keyblend', 'katki', 229, 19),
  (2, '0021', 'VİTAMİN C',                 '2',     'g', 'keyblend', 'katki', 932, 20),
  (2, '0022', 'KALSİYUM PROPİYONAT',       '40',    'g', 'keyblend', 'katki', 939, 21),
  (2, '0023', 'DATEM',                     '60',    'g', 'keyblend', 'katki', 937, 22),
  (2, '0024', 'SSL',                       '85',    'g', 'keyblend', 'katki', 158, 23),
  (2, '0025', 'E471',                      '85',    'g', 'keyblend', 'katki', 938, 24),
  (2, '0026', 'VANİLYA',                   '35',    'g', 'normal',   'ana',   121, 25)
) AS v(recipe_id, ref_id, name, amount_text, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM factory_recipe_ingredients WHERE recipe_id = 2);

-- ════════════════════════════════════════════════════════════════════
-- 2. CINNABOOM CLASSIC REÇETESİ (id=3)
--    Klasik tarçınlı çörek — hamur + tarçın dolgu + krem peynir glaze
-- ════════════════════════════════════════════════════════════════════
INSERT INTO factory_recipe_ingredients
  (recipe_id, ref_id, name, amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
SELECT recipe_id, ref_id, name, amount_text::numeric AS amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order FROM (VALUES
  (3, '0001', 'UN',               '5000', 'g', 'normal', 'ana',   2,   0),
  (3, '0002', 'SU',                '1800', 'g', 'normal', 'ana',   NULL,1),
  (3, '0003', 'ŞEKER',             '600',  'g', 'normal', 'ana',   116, 2),
  (3, '0004', 'YUMURTA',           '500',  'g', 'normal', 'ana',   12,  3),
  (3, '0005', 'AAK ALBA margarin', '700',  'g', 'normal', 'ana',   924, 4),
  (3, '0006', 'YAĞSIZ SÜT TOZU',   '200',  'g', 'normal', 'ana',   119, 5),
  (3, '0007', 'YAŞ MAYA',          '150',  'g', 'normal', 'ana',   118, 6),
  (3, '0008', 'TUZ',               '60',   'g', 'normal', 'katki', 527, 7),
  (3, '0009', 'VANİLYA',           '15',   'g', 'normal', 'ana',   121, 8),
  -- Tarçın dolgu
  (3, '0010', 'ESMER ŞEKER',       '1200', 'g', 'normal', 'ana',   345, 9),
  (3, '0011', 'TEREYAĞ',           '600',  'g', 'normal', 'ana',   67,  10),
  (3, '0012', 'TARÇIN AROMASI',    '120',  'g', 'normal', 'ana',   135, 11),
  -- Glaze
  (3, '0013', 'TAZE PEYNİR',       '400',  'g', 'normal', 'ana',   810, 12),
  (3, '0014', 'KREMA',             '300',  'g', 'normal', 'ana',   8,   13),
  (3, '0015', 'KALSİYUM PROPİYONAT','15',  'g', 'keyblend','katki',156, 14)
) AS v(recipe_id, ref_id, name, amount_text, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM factory_recipe_ingredients WHERE recipe_id = 3);

-- ════════════════════════════════════════════════════════════════════
-- 3. CINNABOOM BROWNIE REÇETESİ (id=4)
--    Cinnaboom hamuru + brownie iç dolgu (kakaolu)
-- ════════════════════════════════════════════════════════════════════
INSERT INTO factory_recipe_ingredients
  (recipe_id, ref_id, name, amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
SELECT recipe_id, ref_id, name, amount_text::numeric AS amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order FROM (VALUES
  (4, '0001', 'UN',               '4500', 'g', 'normal', 'ana',   2,   0),
  (4, '0002', 'SU',                '1700', 'g', 'normal', 'ana',   NULL,1),
  (4, '0003', 'ŞEKER',             '650',  'g', 'normal', 'ana',   116, 2),
  (4, '0004', 'YUMURTA',           '500',  'g', 'normal', 'ana',   12,  3),
  (4, '0005', 'AAK ALBA margarin', '700',  'g', 'normal', 'ana',   924, 4),
  (4, '0006', 'YAĞSIZ SÜT TOZU',   '200',  'g', 'normal', 'ana',   119, 5),
  (4, '0007', 'YAŞ MAYA',          '150',  'g', 'normal', 'ana',   118, 6),
  (4, '0008', 'TUZ',               '60',   'g', 'normal', 'katki', 527, 7),
  (4, '0009', 'VANİLYA',           '15',   'g', 'normal', 'ana',   121, 8),
  -- Brownie iç
  (4, '0010', 'TEREYAĞ',           '900',  'g', 'normal', 'ana',   67,  9),
  (4, '0011', 'BİTTER ÇİKOLATA',   '900',  'g', 'normal', 'ana',   245, 10),
  (4, '0012', 'KAKAO TOZU',        '250',  'g', 'normal', 'ana',   6,   11),
  (4, '0013', 'ESMER ŞEKER',       '600',  'g', 'normal', 'ana',   345, 12),
  -- Kaplama
  (4, '0014', 'SÜTLÜ ÇİKOLATA',    '500',  'g', 'normal', 'ana',   931, 13),
  (4, '0015', 'KALSİYUM PROPİYONAT','15',  'g', 'keyblend','katki',156, 14)
) AS v(recipe_id, ref_id, name, amount_text, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM factory_recipe_ingredients WHERE recipe_id = 4);

-- ════════════════════════════════════════════════════════════════════
-- 4. NEW YORK COOKIE REÇETESİ (id=5)
--    Klasik NY çikolata parçacıklı kurabiye — id=22 Siyah Cookie ref.
-- ════════════════════════════════════════════════════════════════════
INSERT INTO factory_recipe_ingredients
  (recipe_id, ref_id, name, amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
SELECT recipe_id, ref_id, name, amount_text::numeric AS amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order FROM (VALUES
  (5, '0001', 'TEREYAĞ',           '3500', 'g', 'normal', 'ana',   67,  0),
  (5, '0002', 'T-2',               '1100', 'g', 'normal', 'ana',   924, 1),
  (5, '0003', 'ESMER ŞEKER',       '4500', 'g', 'normal', 'ana',   345, 2),
  (5, '0004', 'TOZ ŞEKER',         '3200', 'g', 'normal', 'ana',   116, 3),
  (5, '0005', 'AROMA CREAMBASE',   '1300', 'g', 'normal', 'ana',   74,  4),
  (5, '0006', 'YUMURTA',           '2200', 'g', 'normal', 'ana',   12,  5),
  (5, '0007', 'VANİLYA',           '8',    'g', 'normal', 'ana',   121, 6),
  (5, '0008', 'UN',                '4800', 'g', 'normal', 'ana',   2,   7),
  (5, '0009', 'KARBONAT',          '270',  'g', 'normal', 'katki', 809, 8),
  (5, '0010', 'KABARTMA TOZU',     '110',  'g', 'normal', 'katki', 165, 9),
  (5, '0011', 'TUZ',               '130',  'g', 'normal', 'katki', 527, 10),
  (5, '0012', 'DATEM',             '95',   'g', 'keyblend','katki',937, 11),
  (5, '0013', 'KALSİYUM PROPİYONAT','40',  'g', 'keyblend','katki',156, 12),
  (5, '0014', 'BİTTER ÇİKOLATA',   '2500', 'g', 'normal', 'ana',   245, 13),
  (5, '0015', 'SÜTLÜ ÇİKOLATA',    '2000', 'g', 'normal', 'ana',   931, 14),
  (5, '0016', 'BEYAZ ÇİKOLATA',    '500',  'g', 'normal', 'ana',   437, 15)
) AS v(recipe_id, ref_id, name, amount_text, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM factory_recipe_ingredients WHERE recipe_id = 5);

-- ════════════════════════════════════════════════════════════════════
-- 5. CRUMBLE COOKIE REÇETESİ (id=6)
--    Sade crumble (ufalanan) kurabiye, üst kat çikolata yok
-- ════════════════════════════════════════════════════════════════════
INSERT INTO factory_recipe_ingredients
  (recipe_id, ref_id, name, amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
SELECT recipe_id, ref_id, name, amount_text::numeric AS amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order FROM (VALUES
  (6, '0001', 'TEREYAĞ',           '3000', 'g', 'normal', 'ana',   67,  0),
  (6, '0002', 'T-2',               '1000', 'g', 'normal', 'ana',   924, 1),
  (6, '0003', 'TOZ ŞEKER',         '3000', 'g', 'normal', 'ana',   116, 2),
  (6, '0004', 'ESMER ŞEKER',       '1500', 'g', 'normal', 'ana',   345, 3),
  (6, '0005', 'YUMURTA',           '1800', 'g', 'normal', 'ana',   12,  4),
  (6, '0006', 'VANİLYA',           '8',    'g', 'normal', 'ana',   121, 5),
  (6, '0007', 'UN',                '5500', 'g', 'normal', 'ana',   2,   6),
  (6, '0008', 'KARBONAT',          '120',  'g', 'normal', 'katki', 809, 7),
  (6, '0009', 'KABARTMA TOZU',     '90',   'g', 'normal', 'katki', 165, 8),
  (6, '0010', 'TUZ',               '110',  'g', 'normal', 'katki', 527, 9),
  (6, '0011', 'BEYAZ ÇİKOLATA',    '1500', 'g', 'normal', 'ana',   437, 10),
  (6, '0012', 'KALSİYUM PROPİYONAT','40',  'g', 'keyblend','katki',156, 11),
  (6, '0013', 'AROMA CREAMBASE',   '600',  'g', 'normal', 'ana',   74,  12)
) AS v(recipe_id, ref_id, name, amount_text, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM factory_recipe_ingredients WHERE recipe_id = 6);

-- ════════════════════════════════════════════════════════════════════
-- 6. CHEESECAKE BASE REÇETESİ (id=7)
--    Bisküvi tabanı (cheesecake'lerin altına serilen) — yarı mamul
-- ════════════════════════════════════════════════════════════════════
INSERT INTO factory_recipe_ingredients
  (recipe_id, ref_id, name, amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
SELECT recipe_id, ref_id, name, amount_text::numeric AS amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order FROM (VALUES
  (7, '0001', 'PETİBÖR BİSKÜVİ',   '6000', 'g', 'normal', 'ana',   164, 0),
  (7, '0002', 'TEREYAĞ',           '2400', 'g', 'normal', 'ana',   67,  1),
  (7, '0003', 'TOZ ŞEKER',         '600',  'g', 'normal', 'ana',   116, 2),
  (7, '0004', 'TUZ',               '20',   'g', 'normal', 'katki', 527, 3),
  (7, '0005', 'VANİLYA',           '10',   'g', 'normal', 'ana',   121, 4)
) AS v(recipe_id, ref_id, name, amount_text, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM factory_recipe_ingredients WHERE recipe_id = 7);

-- ════════════════════════════════════════════════════════════════════
-- 7. OREO CHEESECAKE REÇETESİ (id=8)
--    Oreo kırıntılı cheesecake — id=15 Cheesecake Lotus ref. alındı.
-- ════════════════════════════════════════════════════════════════════
INSERT INTO factory_recipe_ingredients
  (recipe_id, ref_id, name, amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
SELECT recipe_id, ref_id, name, amount_text::numeric AS amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order FROM (VALUES
  (8, '0001', 'ŞEKER',             '7500',  'g', 'normal', 'ana',   116, 0),
  (8, '0002', 'UN',                '750',   'g', 'normal', 'ana',   2,   1),
  (8, '0003', 'LABNE',             '12000', 'g', 'normal', 'ana',   163, 2),
  (8, '0004', 'TAZE PEYNİR',       '6000',  'g', 'normal', 'ana',   810, 3),
  (8, '0005', 'KREMA',             '9000',  'g', 'normal', 'ana',   8,   4),
  (8, '0006', 'YUMURTA',           '5775',  'g', 'normal', 'ana',   12,  5),
  (8, '0007', 'OREO PARÇACIĞI',    '2000',  'g', 'normal', 'ana',   275, 6),
  (8, '0008', 'VANİLİN',           '30',    'g', 'normal', 'ana',   7,   7),
  (8, '0009', 'POTASYUM SORBAT',   '4.5',   'g', 'keyblend','katki',825, 8),
  (8, '0010', 'KSANTAN GUM',       '27',    'g', 'keyblend','katki',155, 9),
  -- Taban
  (8, '0011', 'PETİBÖR BİSKÜVİ',   '3000',  'g', 'normal', 'ana',   164, 10),
  (8, '0012', 'TEREYAĞ',           '1200',  'g', 'normal', 'ana',   67,  11)
) AS v(recipe_id, ref_id, name, amount_text, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM factory_recipe_ingredients WHERE recipe_id = 8);

-- ════════════════════════════════════════════════════════════════════
-- 8. SAN SEBASTIAN REÇETESİ (id=9)
--    Bask cheesecake (yanmış cheesecake) — bisküvi tabanı yok
-- ════════════════════════════════════════════════════════════════════
INSERT INTO factory_recipe_ingredients
  (recipe_id, ref_id, name, amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
SELECT recipe_id, ref_id, name, amount_text::numeric AS amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order FROM (VALUES
  (9, '0001', 'TAZE PEYNİR',       '12000', 'g', 'normal', 'ana',   810, 0),
  (9, '0002', 'ŞEKER',             '4500',  'g', 'normal', 'ana',   116, 1),
  (9, '0003', 'YUMURTA',           '5500',  'g', 'normal', 'ana',   12,  2),
  (9, '0004', 'KREMA',             '6000',  'g', 'normal', 'ana',   8,   3),
  (9, '0005', 'UN',                '350',   'g', 'normal', 'ana',   2,   4),
  (9, '0006', 'VANİLYA',           '25',    'g', 'normal', 'ana',   121, 5),
  (9, '0007', 'TUZ',               '15',    'g', 'normal', 'katki', 527, 6),
  (9, '0008', 'POTASYUM SORBAT',   '3',     'g', 'keyblend','katki',825, 7)
) AS v(recipe_id, ref_id, name, amount_text, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM factory_recipe_ingredients WHERE recipe_id = 9);

-- ════════════════════════════════════════════════════════════════════
-- 9. BOMBTY LATTE POWDER REÇETESİ (id=10)
--    Bombtea Latte içecek tozu (siyah çay + süt tozu + şeker harmanı)
-- ════════════════════════════════════════════════════════════════════
INSERT INTO factory_recipe_ingredients
  (recipe_id, ref_id, name, amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
SELECT recipe_id, ref_id, name, amount_text::numeric AS amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order FROM (VALUES
  (10, '0001', 'YAĞSIZ SÜT TOZU',  '4000', 'g', 'normal', 'ana',   119, 0),
  (10, '0002', 'TOZ ŞEKER',        '3000', 'g', 'normal', 'ana',   116, 1),
  (10, '0003', 'DEKSTROZ',         '500',  'g', 'normal', 'ana',   280, 2),
  (10, '0004', 'SİYAH ÇAY TOZU',   '800',  'g', 'normal', 'ana',   355, 3),
  (10, '0005', 'AROMA CREAMBASE',  '300',  'g', 'normal', 'ana',   74,  4),
  (10, '0006', 'VANİLYA',          '20',   'g', 'normal', 'ana',   121, 5),
  (10, '0007', 'KSANTAN GUM',      '15',   'g', 'keyblend','katki',155, 6)
) AS v(recipe_id, ref_id, name, amount_text, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM factory_recipe_ingredients WHERE recipe_id = 10);

-- ════════════════════════════════════════════════════════════════════
-- 10. CHOCOLATE POWDER REÇETESİ (id=11)
--     Sıcak çikolata içecek tozu
-- ════════════════════════════════════════════════════════════════════
INSERT INTO factory_recipe_ingredients
  (recipe_id, ref_id, name, amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
SELECT recipe_id, ref_id, name, amount_text::numeric AS amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order FROM (VALUES
  (11, '0001', 'KAKAO TOZU',       '3500', 'g', 'normal', 'ana',   6,   0),
  (11, '0002', 'TOZ ŞEKER',        '4500', 'g', 'normal', 'ana',   116, 1),
  (11, '0003', 'YAĞSIZ SÜT TOZU',  '3000', 'g', 'normal', 'ana',   119, 2),
  (11, '0004', 'DEKSTROZ',         '600',  'g', 'normal', 'ana',   280, 3),
  (11, '0005', 'VANİLYA',          '25',   'g', 'normal', 'ana',   121, 4),
  (11, '0006', 'TUZ',              '20',   'g', 'normal', 'katki', 527, 5),
  (11, '0007', 'KSANTAN GUM',      '15',   'g', 'keyblend','katki',155, 6)
) AS v(recipe_id, ref_id, name, amount_text, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM factory_recipe_ingredients WHERE recipe_id = 11);

-- ════════════════════════════════════════════════════════════════════
-- 11. CREAMBASE POWDER REÇETESİ (id=12)
--     Krem bazı toz harç (cookie/cream uygulamaları için)
-- ════════════════════════════════════════════════════════════════════
INSERT INTO factory_recipe_ingredients
  (recipe_id, ref_id, name, amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
SELECT recipe_id, ref_id, name, amount_text::numeric AS amount, unit, ingredient_type, ingredient_category, raw_material_id, sort_order FROM (VALUES
  (12, '0001', 'YAĞSIZ SÜT TOZU',  '4500', 'g', 'normal', 'ana',   119, 0),
  (12, '0002', 'TOZ ŞEKER',        '3000', 'g', 'normal', 'ana',   116, 1),
  (12, '0003', 'DEKSTROZ',         '700',  'g', 'normal', 'ana',   280, 2),
  (12, '0004', 'MODİFİYE MSIIR NİŞASTASI','1200','g','normal','katki',815,3),
  (12, '0005', 'VANİLYA',          '40',   'g', 'normal', 'ana',   121, 4),
  (12, '0006', 'TUZ',              '25',   'g', 'normal', 'katki', 527, 5),
  (12, '0007', 'KSANTAN GUM',      '20',   'g', 'keyblend','katki',155, 6),
  (12, '0008', 'KALSİYUM PROPİYONAT','15', 'g', 'keyblend','katki',156, 7)
) AS v(recipe_id, ref_id, name, amount_text, unit, ingredient_type, ingredient_category, raw_material_id, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM factory_recipe_ingredients WHERE recipe_id = 12);

-- ────────────────────────────────────────────────────────────────────
-- 12. EKSİK INGREDIENT NUTRITION KAYITLARI
-- Yeni reçetelerde geçen 3 ingredient adı (PETİBÖR BİSKÜVİ, SİYAH ÇAY
-- TOZU, TARÇIN AROMASI) factory_ingredient_nutrition tablosunda yoktu.
-- Alerjen/besin coverage'ı %100 yapmak için eklenir.
-- ────────────────────────────────────────────────────────────────────
INSERT INTO factory_ingredient_nutrition
  (ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g,
   sugar_g, fiber_g, protein_g, salt_g, allergens, source, confidence, verified_by)
SELECT * FROM (VALUES
  ('PETİBÖR BİSKÜVİ', 460::numeric, 13::numeric, 6::numeric, 73::numeric,
   22::numeric, 2::numeric, 7::numeric, 0.7::numeric,
   ARRAY['gluten']::text[], 'manual'::varchar, 90, 'hq-sema-gida'::varchar),
  ('SİYAH ÇAY TOZU', 1::numeric, 0::numeric, 0::numeric, 0.3::numeric,
   0::numeric, 0.1::numeric, 0.2::numeric, 0.01::numeric,
   ARRAY[]::text[], 'manual'::varchar, 90, 'hq-sema-gida'::varchar),
  ('TARÇIN AROMASI', 247::numeric, 1.2::numeric, 0.3::numeric, 80.6::numeric,
   2.2::numeric, 53::numeric, 4::numeric, 0.03::numeric,
   ARRAY[]::text[], 'manual'::varchar, 80, 'hq-sema-gida'::varchar)
) AS v(name, e, f, sf, c, su, fi, p, s, al, src, cf, vb)
WHERE NOT EXISTS (
  SELECT 1 FROM factory_ingredient_nutrition fin
  WHERE LOWER(fin.ingredient_name) = LOWER(v.name)
);

-- ────────────────────────────────────────────────────────────────────
-- VERIFICATION
-- ────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  empty_count INTEGER;
  duplicate_active BOOLEAN;
BEGIN
  -- Aktif reçeteler arasında ingredient'ı 0 olan kalmamalı
  SELECT COUNT(*) INTO empty_count
  FROM factory_recipes r
  WHERE r.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM factory_recipe_ingredients fri
      WHERE fri.recipe_id = r.id
    );

  IF empty_count > 0 THEN
    RAISE EXCEPTION 'Hala % adet aktif reçetede malzeme yok', empty_count;
  END IF;

  -- Duplicate Donut (id=13) inaktif olmalı
  SELECT is_active INTO duplicate_active FROM factory_recipes WHERE id = 13;
  IF duplicate_active THEN
    RAISE EXCEPTION 'Duplicate Donut reçetesi (id=13) hala aktif';
  END IF;

  RAISE NOTICE '✓ Task #129 tamamlandı: 11 reçete dolduruldu, 1 duplicate soft-delete edildi.';
END $$;

COMMIT;
