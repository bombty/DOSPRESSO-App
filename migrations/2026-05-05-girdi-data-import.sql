-- ═══════════════════════════════════════════════════════════════════
-- Sprint 7 (5 May 2026) - Numbers Verisinden 67 Hammadde Import
-- ═══════════════════════════════════════════════════════════════════
-- Kaynak: Girdi_Yo_netimi.numbers (Aslan'ın hammadde listesi)
-- 
-- Bu migration:
--   1. 9 unique tedarikçiyi suppliers tablosuna ekler (varsa atlar)
--   2. 67 hammaddeyi raw_materials tablosuna ekler (TGK alanları dolu)
--   3. Marka/grup/besin değerleri Numbers'tan birebir
--   4. Kod yoksa otomatik HAM### atanır
-- 
-- DRY-RUN: Önce SELECT ile kontrolü yap, sonra commit
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1) TEDARİKÇİLERİ EKLE (UPSERT — varsa atla)
-- ─────────────────────────────────────────────────────────────────

INSERT INTO suppliers (code, name, status, food_authorization_number, created_at, updated_at) VALUES
  ('TED-ICIM', 'İçim', 'aktif', NULL, NOW(), NOW()),
  ('TED-PURATOS', 'Puratos', 'aktif', NULL, NOW(), NOW()),
  ('TED-METRO', 'Metro', 'aktif', NULL, NOW(), NOW()),
  ('TED-KATSAN', 'Katsan', 'aktif', NULL, NOW(), NOW()),
  ('TED-HEKIMOGLU', 'Hekimoğlu', 'aktif', 'TR-42-K-002701', NOW(), NOW()),
  ('TED-PAKMAYA', 'Pakmaya', 'aktif', NULL, NOW(), NOW()),
  ('TED-DELI', 'Deli', 'aktif', NULL, NOW(), NOW()),
  ('TED-OVALETTE', 'Ovalette', 'aktif', NULL, NOW(), NOW()),
  ('TED-GLORA', 'Glora', 'aktif', NULL, NOW(), NOW()),
  ('TED-TEGRAL', 'Tegral', 'aktif', NULL, NOW(), NOW()),
  ('TED-ARO', 'Aro', 'aktif', NULL, NOW(), NOW()),
  ('TED-METROCHEF', 'Metro Chef', 'aktif', NULL, NOW(), NOW()),
  ('TED-TR35', 'TR-35-K-000733', 'aktif', 'TR-35-K-000733', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 2) HAMMADDELERİ EKLE (67 girdi)
-- ─────────────────────────────────────────────────────────────────
-- Her hammadde için:
--   - code (HAM001..HAM067)
--   - name, brand, materialGroup
--   - supplier_id (suppliers tablosundan eşleştir)
--   - content_info, allergen_present, allergen_detail, cross_contamination
--   - energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt
--   - unit varsayılan: kg
-- ─────────────────────────────────────────────────────────────────

WITH supplier_lookup AS (
  SELECT id, name FROM suppliers
)
INSERT INTO raw_materials (
  code, name, brand, material_group, unit, supplier_id,
  content_info, allergen_present, allergen_detail, cross_contamination,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, tgk_compliant, nutrition_source,
  created_at, updated_at
) VALUES
-- 1. HAM001 - Beyaz Çikolatalı Vanilya Aromalı Dolgu
('HAM001', 'Beyaz Çikolatalı Vanilya Aromalı Dolgu', 'Puratos', 'süt ve süt ürünleri', 'kg',
  (SELECT id FROM suppliers WHERE name = 'İçim'),
  'su, glikoz şurubu (mısır), modifiye nişasta, şeker, malto dekstrin, bitkisel yağ (palm), stabilizatör (E170), beyaz çikolata %1 (şeker, kakao yağı, tam yağlı süt tozu, yağsız süt tozu, emülgatör (E322), aroma verici (vanilya)), kıvam artırıcılar (E460, E466, E415), asit (E575), tuz, jelleştirici (E407), koruyucu (E202), vanilin, emülgatör (E435), renklendirici (E160a)',
  TRUE, 'Süt ve süt ürünleri içerir.',
  'Eser miktarda gluten, yumurta, soya, fındık, susam ve sülfit içerebilir.',
  730, 2.3, 2.3, 37.5, 17.2, 0.2, 0.0,
  TRUE, TRUE, 'manual', NOW(), NOW()),

-- 2. HAM002 - Buğday Unu Süper Lüks Mavi (Hekimoğlu, TR-42-K-002701)
('HAM002', 'Buğday Unu Süper Lüks Mavi', 'Hekimoğlu', 'un ve tahıl', 'kg',
  (SELECT id FROM suppliers WHERE code = 'TED-HEKIMOGLU'),
  'Buğday unu', TRUE, 'Gluten içerir.', 'Yok',
  347, 0.51, 0.082, 73.45, NULL, 12.22, 0.204,
  TRUE, TRUE, 'manual', NOW(), NOW()),

-- 3. HAM003 - Buğday Unu Süper 1
('HAM003', 'Buğday Unu Süper 1', 'Hekimoğlu', 'un ve tahıl', 'kg',
  (SELECT id FROM suppliers WHERE code = 'TED-HEKIMOGLU'),
  'Buğday unu', TRUE, 'Gluten içerir.', 'Yok',
  347.13, 0.51, 0.2, 73.8, NULL, 11.16, 0.4,
  TRUE, TRUE, 'manual', NOW(), NOW()),

-- 4. HAM004 - Frambuazlı Sos
('HAM004', 'Frambuazlı Sos', 'Puratos', 'sos ve dolgu', 'kg',
  (SELECT id FROM suppliers WHERE name = 'Puratos'),
  'Frambuazlı sos [frambuaz %35, su, glikoz şurubu (mısır), şeker, asitlik düzenleyici, koruyucu, doğal aroma verici]',
  TRUE, 'Sülfit içerir.', 'Eser miktarda gluten, yumurta, soya, fındık, susam, süt ve sert kabuklu yemiş içerebilir.',
  670, 0.5, 0.1, 39.1, 24.2, 0.5, 1.4,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 5. HAM005 - Frambuaz Aromalı Kokolin
('HAM005', 'Frambuaz Aromalı Kokolin', NULL, 'çikolata ve kokolin', 'kg', NULL,
  'Frambuaz aromalı kokolin (şeker, tam hidrojenize bitkisel yağ, kakao tozu)',
  TRUE, 'Süt ürünü içerir.', 'Eser miktarda soya, gluten, fındık, badem, fıstık içerebilir.',
  564, 36.0, NULL, 60.0, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 6. HAM006 - Vişneli Sos
('HAM006', 'Vişneli Sos', 'Deli', 'sos ve dolgu', 'kg',
  (SELECT id FROM suppliers WHERE name = 'Deli'),
  'Vişne, şeker, su, asitlik düzenleyici, koruyucu',
  FALSE, NULL, NULL,
  186.9, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 7. HAM007 - Limonlu Dolgu
('HAM007', 'Limonlu Dolgu', 'Deli', 'sos ve dolgu', 'kg',
  (SELECT id FROM suppliers WHERE name = 'Deli'),
  'Limonlu dolgu', NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 8. HAM008 - Karamel Aromalı Sos
('HAM008', 'Karamel Aromalı Sos', 'Puratos', 'sos ve dolgu', 'kg',
  (SELECT id FROM suppliers WHERE name = 'Puratos'),
  'Karamel sos', TRUE, 'Süt ürünü içerir.',
  'Eser miktarda soya, gluten, fındık, badem, fıstık içerebilir.',
  747, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 9. HAM009 - Sütlü Kokolin
('HAM009', 'Sütlü Kokolin', NULL, 'çikolata ve kokolin', 'kg', NULL,
  'Sütlü kokolin', TRUE, 'Süt ürünü içerir.', 'Eser miktarda soya, gluten, fındık içerebilir.',
  225, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 10. HAM010 - Beyaz Kokolin
('HAM010', 'Beyaz Kokolin', NULL, 'çikolata ve kokolin', 'kg', NULL,
  'Beyaz kokolin', TRUE, 'Süt ürünü içerir.', 'Eser miktarda soya, gluten, fındık içerebilir.',
  538, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 11. HAM011 - Bitter Kokolin
('HAM011', 'Bitter Kokolin', 'Ovalette', 'çikolata ve kokolin', 'kg',
  (SELECT id FROM suppliers WHERE name = 'Ovalette'),
  'Bitter kokolin', TRUE, NULL, 'Eser miktarda süt ürünü, soya içerebilir.',
  518, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 12. HAM012 - Bitter Çikolata Para
('HAM012', 'Bitter Çikolata Para', 'Ovalette', 'çikolata ve kokolin', 'kg',
  (SELECT id FROM suppliers WHERE name = 'Ovalette'),
  'Bitter çikolata para', TRUE, NULL, 'Eser miktarda süt ürünü, soya içerebilir.',
  509, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 13. HAM013 - Beyaz Çikolata Para
('HAM013', 'Beyaz Çikolata Para', NULL, 'çikolata ve kokolin', 'kg', NULL,
  'Beyaz çikolata para', TRUE, 'Süt ürünü içerir.', 'Eser miktarda soya içerebilir.',
  558, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 14. HAM014 - Kakao Tozu
('HAM014', 'Kakao Tozu', NULL, 'çikolata ve kokolin', 'kg', NULL,
  'Kakao tozu', FALSE, NULL, NULL,
  495, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 15. HAM015 - Kakaolu Fındıklı Krema
('HAM015', 'Kakaolu Fındıklı Krema', NULL, 'sos ve dolgu', 'kg', NULL,
  'Kakaolu fındıklı krema', TRUE, 'Süt ürünü, fındık içerir.', NULL,
  540, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 16. HAM016 - Renkli Granül Şeker
('HAM016', 'Renkli Granül Şeker', NULL, 'şeker ve katkı', 'kg', NULL,
  'Şeker, renklendirici', FALSE, NULL, NULL,
  339, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 17. HAM017 - Süs Yer Fıstığı
('HAM017', 'Süs Yer Fıstığı', NULL, 'kuruyemiş', 'kg', NULL,
  'Yer fıstığı', TRUE, 'Yer fıstığı içerir.', NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 18. HAM018 - Hindistan Cevizi
('HAM018', 'Hindistan Cevizi', NULL, 'kuruyemiş', 'kg', NULL,
  'Hindistan cevizi', FALSE, NULL, NULL,
  682, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 19. HAM019 - Tuz
('HAM019', 'Tuz', NULL, 'şeker ve katkı', 'kg', NULL,
  'Sodyum klorür', FALSE, NULL, NULL,
  1, 0, 0, 0, 0, 0, 100,
  TRUE, TRUE, 'manual', NOW(), NOW()),

-- 20. HAM020 - Peynir Altı Suyu Tozu
('HAM020', 'Peynir Altı Suyu Tozu', NULL, 'süt ve süt ürünleri', 'kg', NULL,
  'Peynir altı suyu tozu', TRUE, 'Süt ürünü içerir.', NULL,
  300, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 21. HAM021 - Soya Unu
('HAM021', 'Soya Unu', NULL, 'un ve tahıl', 'kg', NULL,
  'Soya unu', TRUE, 'Soya içerir.', NULL,
  409, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 22. HAM022 - Bitkisel Yağ (Palm)
('HAM022', 'Bitkisel Yağ', NULL, 'yağ', 'lt', NULL,
  'Bitkisel yağ (palm)', FALSE, NULL, NULL,
  900, 100, NULL, 0, 0, 0, 0,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 23. HAM023 - Şeker (Aro)
('HAM023', 'Şeker', 'Aro', 'şeker ve katkı', 'kg',
  (SELECT id FROM suppliers WHERE name = 'Aro'),
  'Sakaroz', FALSE, NULL, NULL,
  400, 0, 0, 99.44, 98.8, 0.25, 0,
  TRUE, TRUE, 'manual', NOW(), NOW()),

-- 24. HAM024 - Esmer Şeker
('HAM024', 'Esmer Şeker', NULL, 'şeker ve katkı', 'kg', NULL,
  'Esmer şeker', FALSE, NULL, NULL,
  400, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 25. HAM025 - File Badem
('HAM025', 'File Badem', NULL, 'kuruyemiş', 'kg', NULL,
  'Badem', TRUE, 'Sert kabuklu yemiş (badem) içerir.', NULL,
  600, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 26. HAM026 - Yaş Maya
('HAM026', 'Yaş Maya', 'Pakmaya', 'maya ve mayalama', 'kg',
  (SELECT id FROM suppliers WHERE name = 'Pakmaya'),
  'Yaş maya (Saccharomyces cerevisiae)', FALSE, NULL, NULL,
  104, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 27. HAM027 - Kuru Maya
('HAM027', 'Kuru Maya', 'Pakmaya', 'maya ve mayalama', 'kg',
  (SELECT id FROM suppliers WHERE name = 'Pakmaya'),
  'Kuru maya', FALSE, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 28. HAM028 - Dekstroz
('HAM028', 'Dekstroz', NULL, 'şeker ve katkı', 'kg', NULL,
  'Dekstroz monohidrat', FALSE, NULL, NULL,
  400, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 29. HAM029 - Yumurta Tozu
('HAM029', 'Yumurta Tozu', NULL, 'yumurta', 'kg', NULL,
  'Tam yumurta tozu', TRUE, 'Yumurta içerir.', NULL,
  100, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 30. HAM030 - Enzim (Maltogenik Amilaz)
('HAM030', 'Enzim - Maltogenik Amilaz', NULL, 'katkı maddesi', 'kg', NULL,
  'Enzim (maltogenik amilaz)', FALSE, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 31-37 katkı maddeleri (E-numaraları)
('HAM031', 'Emülgatör E471', NULL, 'katkı maddesi', 'kg', NULL, 'E471', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, 'manual', NOW(), NOW()),
('HAM032', 'Emülgatör E472E', NULL, 'katkı maddesi', 'kg', NULL, 'E472E', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, 'manual', NOW(), NOW()),
('HAM033', 'Emülgatör E481', NULL, 'katkı maddesi', 'kg', NULL, 'E481', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, 'manual', NOW(), NOW()),
('HAM034', 'Kıvam Artırıcı E466', NULL, 'katkı maddesi', 'kg', NULL, 'E466', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, 'manual', NOW(), NOW()),
('HAM035', 'Kıvam Artırıcı E415', NULL, 'katkı maddesi', 'kg', NULL, 'E415 (ksantan gam)', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, 'manual', NOW(), NOW()),
('HAM036', 'Aroma Verici - Acı Badem Aroması', NULL, 'katkı maddesi', 'kg', NULL, 'Acı badem aroması', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, 'manual', NOW(), NOW()),
('HAM037', 'Aroma Verici - Muskat Aroması', NULL, 'katkı maddesi', 'kg', NULL, 'Muskat aroması', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, 'manual', NOW(), NOW()),
('HAM038', 'Un İşlem Maddesi E466', NULL, 'katkı maddesi', 'kg', NULL, 'E466 (un işleme)', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, 'manual', NOW(), NOW()),
('HAM039', 'Un İşlem Maddesi E415', NULL, 'katkı maddesi', 'kg', NULL, 'E415 (un işleme)', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, 'manual', NOW(), NOW()),
('HAM040', 'Nem Verici E422 (Gliserin)', NULL, 'katkı maddesi', 'kg', NULL, 'E422 - Gliserin', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, 'manual', NOW(), NOW()),
('HAM041', 'Koruyucu E282 (Kalsiyum Propiyonat)', NULL, 'katkı maddesi', 'kg', NULL, 'E282', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, 'manual', NOW(), NOW()),

-- 42-44 hammaddeler
('HAM042', 'Su', NULL, 'hammadde', 'lt', NULL, 'İçme suyu', FALSE, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, TRUE, TRUE, 'manual', NOW(), NOW()),
('HAM043', 'Renklendirici (Hibiskus)', NULL, 'katkı maddesi', 'kg', NULL, 'Hibiscus sabdariff, maltodekstrin', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, 'manual', NOW(), NOW()),
('HAM044', 'Prejelatinize Mısır Nişastası', NULL, 'un ve tahıl', 'kg', NULL, 'Modifiye mısır nişastası', FALSE, NULL, NULL, 370, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, 'manual', NOW(), NOW()),

-- 45. HAM045 - Tereyağı (Aro)
('HAM045', 'Tereyağı', 'Aro', 'süt ve süt ürünleri', 'kg',
  (SELECT id FROM suppliers WHERE name = 'Aro'),
  'Tereyağı (min %82 süt yağı)', TRUE, 'Süt ürünü içerir.', NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

('HAM046', 'Aroma Verici - Vanilya Aroması', NULL, 'katkı maddesi', 'kg', NULL, 'Vanilin', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, 'manual', NOW(), NOW()),
('HAM047', 'Karbonat (Sodyum Bikarbonat)', NULL, 'katkı maddesi', 'kg', NULL, 'NaHCO3', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, 'manual', NOW(), NOW()),

-- 48. HAM048 - Tam Yağlı Taze Peynir (Metro Chef)
('HAM048', 'Tam Yağlı Taze Peynir', 'Metro Chef', 'süt ve süt ürünleri', 'kg',
  (SELECT id FROM suppliers WHERE code = 'TED-METROCHEF'),
  'Pastörize inek sütü, peynir mayası, tuz', TRUE, 'Süt ürünü içerir.', NULL,
  189, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

('HAM049', 'Tam Yağlı Taze Peynir Labne', NULL, 'süt ve süt ürünleri', 'kg', NULL,
  'Labne peyniri', TRUE, 'Süt ürünü içerir.', NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

('HAM050', 'Çeçil Peyniri', NULL, 'süt ve süt ürünleri', 'kg', NULL,
  'Çeçil peyniri', TRUE, 'Süt ürünü içerir.', NULL,
  300, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

('HAM051', 'Yarım Yağlı Tost Peyniri', NULL, 'süt ve süt ürünleri', 'kg', NULL,
  'Tost peyniri', TRUE, 'Süt ürünü içerir.', NULL,
  275, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 52. HAM052 - Bitkisel Yağlı Şekersiz UHT Krem Şanti (Puratos)
('HAM052', 'Bitkisel Yağlı Şekersiz UHT Krem Şanti', 'Puratos', 'süt ve süt ürünleri', 'lt',
  (SELECT id FROM suppliers WHERE name = 'Puratos'),
  'Bitkisel yağ, su, dengeleyici, emülgatör, aroma', TRUE, NULL,
  'Eser miktarda süt ürünü içerebilir.',
  271, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 53. HAM053 - Kek Karışımı Toffee (Tegral)
('HAM053', 'Kek Karışımı Toffee', 'Tegral', 'kek ve hamur karışımı', 'kg',
  (SELECT id FROM suppliers WHERE name = 'Tegral'),
  'Buğday unu, şeker, modifiye nişasta, emülgatör, kabartıcı, aroma',
  TRUE, 'Gluten içerir.', 'Eser miktarda yumurta, süt, soya içerebilir.',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

('HAM054', 'Bisküvi', NULL, 'bisküvi ve gofret', 'kg', NULL,
  'Bisküvi', TRUE, 'Gluten içerir.', 'Süt ürünü, yumurta içerebilir.',
  450, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 55. HAM055 - Bisküvi Kreması (Glora)
('HAM055', 'Bisküvi Kreması', 'Glora', 'sos ve dolgu', 'kg',
  (SELECT id FROM suppliers WHERE name = 'Glora'),
  'Bisküvi kreması', TRUE, 'Süt ürünü içerir.', 'Eser miktarda gluten içerebilir.',
  563, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 56. HAM056 - Yulaf Ezmesi (Aro)
('HAM056', 'Yulaf Ezmesi', 'Aro', 'un ve tahıl', 'kg',
  (SELECT id FROM suppliers WHERE name = 'Aro'),
  'Yulaf', TRUE, 'Gluten içerir (yulaf).', NULL,
  378, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

('HAM057', 'Öğütülmüş Kahve', NULL, 'kahve', 'kg', NULL,
  'Kavrulmuş çekirdek kahve', FALSE, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 58-67 sebze/meyve/tuz
('HAM058', 'Közlenmiş Kırmızı Biber', NULL, 'sebze ve meyve', 'kg', NULL,
  'Közlenmiş kırmızı biber, tuz, ayçiçek yağı', FALSE, NULL, NULL,
  38, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

('HAM059', 'Badem', NULL, 'kuruyemiş', 'kg', NULL,
  'Badem', TRUE, 'Sert kabuklu yemiş (badem) içerir.', NULL,
  600, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

('HAM060', 'Kurutulmuş Domates', NULL, 'sebze ve meyve', 'kg', NULL,
  'Kurutulmuş domates, tuz', FALSE, NULL, NULL,
  210, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

('HAM061', 'Bitkisel Yağ - Zeytinyağı', NULL, 'yağ', 'lt', NULL,
  'Zeytinyağı', FALSE, NULL, NULL,
  900, 100, 14, 0, 0, 0, 0,
  TRUE, TRUE, 'manual', NOW(), NOW()),

('HAM062', 'Kaya Tuzu', NULL, 'şeker ve katkı', 'kg', NULL,
  'Kaya tuzu', FALSE, NULL, NULL,
  112, NULL, NULL, NULL, NULL, NULL, 100,
  TRUE, FALSE, 'manual', NOW(), NOW()),

('HAM063', 'Biber Salçası', NULL, 'sos ve dolgu', 'kg', NULL,
  'Kırmızı biber, tuz', FALSE, NULL, NULL,
  14, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

('HAM064', 'Elma Sirkesi', NULL, 'sos ve dolgu', 'lt', NULL,
  'Elma sirkesi', TRUE, 'Sülfit içerebilir.', NULL,
  2, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

('HAM065', 'Zeytin Ezmesi', NULL, 'sos ve dolgu', 'kg', NULL,
  'Zeytin, zeytinyağı, tuz', FALSE, NULL, NULL,
  200, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 66. HAM066 - Yeşil Zeytin (Aro)
('HAM066', 'Yeşil Zeytin', 'Aro', 'sebze ve meyve', 'kg',
  (SELECT id FROM suppliers WHERE name = 'Aro'),
  'Yeşil zeytin, salamura, tuz', FALSE, NULL, NULL,
  130, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW()),

-- 67. HAM067 - Kekik (Aro)
('HAM067', 'Kekik', 'Aro', 'baharat', 'kg',
  (SELECT id FROM suppliers WHERE name = 'Aro'),
  'Kekik (Origanum vulgare)', FALSE, NULL, NULL,
  288, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, FALSE, 'manual', NOW(), NOW())

ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 3) DOĞRULAMA SORGUSU
-- ─────────────────────────────────────────────────────────────────
-- 
-- SELECT COUNT(*) FROM raw_materials WHERE code LIKE 'HAM%';
-- Beklenen: 67 (mevcut + yeni eklenen)
-- 
-- SELECT material_group, COUNT(*) FROM raw_materials 
-- WHERE code LIKE 'HAM%' GROUP BY material_group ORDER BY COUNT(*) DESC;
-- 
-- SELECT COUNT(*) FROM raw_materials WHERE allergen_present = TRUE;
-- 
-- SELECT s.name as tedarikci, COUNT(rm.id) as urun_sayisi 
-- FROM suppliers s 
-- LEFT JOIN raw_materials rm ON rm.supplier_id = s.id 
-- WHERE s.code LIKE 'TED-%' 
-- GROUP BY s.name 
-- ORDER BY urun_sayisi DESC;
