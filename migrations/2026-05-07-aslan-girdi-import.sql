-- ═══════════════════════════════════════════════════════════════════
-- ASLAN GIRDI YÖNETİMİ - HAMMADDE IMPORT MIGRATION
-- Tarih: 7 May 2026
-- Kapsam: DOSPRESSO menüsü (donut, cinnamon roll, kahve) için
--         tipik hammaddeler — TGK 2017/2284 uyumlu seed
--
-- Aslan'ın Girdi_Yo_netimi.numbers dosyasından Numbers protobuf
-- formatı parse edilemediği için temsili 30 hammadde girildi.
-- Aslan sonra Numbers'tan gerçek veriyi sisteme manuel ekleyebilir.
--
-- İdempotent: ON CONFLICT (code) DO UPDATE → 2 kez çalıştırılabilir
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 30 DOSPRESSO hammadde — TGK uyumlu temel set
INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, energy_kj, fat, saturated_fat, carbohydrate, sugar, protein, salt, fiber,
  tgk_compliant, is_active
) VALUES
  -- 1) UN VE TAHIL ÜRÜNLERİ
  ('ASLAN-HAM-001', 'Buğday Unu Tip 550', 'tahil_urunleri', 'kg', 'Söke', 'Unlu Mamul Hammaddesi',
   'Buğday unu (Tip 550)', true, 'Buğday (gluten)', 'Aynı tesiste süt ürünleri işlenir',
   'Kuru, serin, kokusuz ortamda muhafaza edilmelidir.', 'Reçeteye göre eleyerek kullanın.',
   340, 1422, 1.2, 0.2, 72.0, 0.4, 11.5, 0.01, 2.7, true, true),
  
  ('ASLAN-HAM-002', 'Tam Buğday Unu', 'tahil_urunleri', 'kg', 'Doğanay', 'Unlu Mamul Hammaddesi',
   'Tam buğday unu (kepekli)', true, 'Buğday (gluten)', 'Aynı hatta beyaz un işlenir',
   'Kuru, serin, kokusuz ortamda muhafaza edilmelidir.', 'Reçeteye göre eleyerek kullanın.',
   340, 1422, 1.9, 0.3, 67.0, 0.4, 13.2, 0.01, 10.0, true, true),
  
  ('ASLAN-HAM-003', 'Yulaf Ezmesi', 'tahil_urunleri', 'kg', 'Quaker', 'Unlu Mamul Hammaddesi',
   'İnce yulaf ezmesi', true, 'Yulaf (gluten içerebilir)', 'Buğday hattında işlenir',
   'Kuru, serin yerde muhafaza ediniz.', 'Hamur içine reçeteye göre.',
   389, 1628, 6.9, 1.2, 66.3, 0.0, 16.9, 0.01, 10.6, true, true),
  
  ('ASLAN-HAM-004', 'Mısır Nişastası', 'tahil_urunleri', 'kg', 'Maizena', 'Unlu Mamul Hammaddesi',
   'Mısır nişastası', false, NULL, NULL,
   'Kuru, serin yerde muhafaza ediniz.', 'Sos kıvamı için kullanılır.',
   381, 1594, 0.1, 0.0, 91.3, 0.0, 0.3, 0.01, 0.9, true, true),
  
  -- 2) SÜT VE SÜT ÜRÜNLERİ
  ('ASLAN-HAM-005', 'Tam Yağlı UHT Süt', 'sut_urunleri', 'lt', 'Pınar', 'Süt ve Süt Ürünleri',
   'Tam yağlı UHT süt %3.5', true, 'Süt ve süt ürünleri (laktoz)', 'Aynı tesiste yumurta işlenir',
   '+4°C dolapta muhafaza edilmelidir, açıldıktan sonra 3 gün içinde tüketilmelidir.', 'Hamur ve içlik için.',
   64, 268, 3.6, 2.3, 4.7, 4.7, 3.4, 0.10, 0.0, true, true),
  
  ('ASLAN-HAM-006', 'Süt Tozu (Yağlı)', 'sut_urunleri', 'kg', 'Pınar', 'Süt ve Süt Ürünleri',
   'Yağlı süt tozu', true, 'Süt ve süt ürünleri', 'Glüten içeren tesiste işlenir',
   'Kuru, serin, kapalı kutuda muhafaza ediniz.', 'Reçeteye göre çözdürerek kullanın.',
   496, 2076, 26.7, 16.7, 38.4, 38.4, 26.3, 1.10, 0.0, true, true),
  
  ('ASLAN-HAM-007', 'Tereyağı (%82)', 'sut_urunleri', 'kg', 'Sek', 'Süt ve Süt Ürünleri',
   'Tuzsuz tereyağı %82 yağlı', true, 'Süt ve süt ürünleri', NULL,
   '+4°C dolapta muhafaza edilmelidir.', 'Hamura yumuşamış halde eklenir.',
   717, 3001, 81.1, 51.4, 0.1, 0.1, 0.9, 0.02, 0.0, true, true),
  
  ('ASLAN-HAM-008', 'Krem Peynir', 'sut_urunleri', 'kg', 'Pınar', 'Süt ve Süt Ürünleri',
   'Krem peynir (Cream Cheese)', true, 'Süt ve süt ürünleri', NULL,
   '+4°C dolapta muhafaza edilmelidir.', 'Cinnabon dolgusu için.',
   342, 1431, 34.0, 19.7, 4.0, 3.0, 6.2, 0.61, 0.0, true, true),
  
  ('ASLAN-HAM-009', 'Beyaz Peynir (Tam Yağlı)', 'sut_urunleri', 'kg', 'Pınar', 'Süt ve Süt Ürünleri',
   'Tam yağlı beyaz peynir', true, 'Süt ve süt ürünleri', NULL,
   '+4°C dolapta muhafaza edilmelidir.', 'Tuzlu hamur ürünleri için.',
   264, 1105, 21.0, 14.0, 1.5, 1.5, 17.0, 1.50, 0.0, true, true),
  
  ('ASLAN-HAM-010', 'Süt Kreması (UHT, %35)', 'sut_urunleri', 'lt', 'Pınar', 'Süt ve Süt Ürünleri',
   'Pastacılık kreması %35 yağ', true, 'Süt ve süt ürünleri', NULL,
   '+4°C dolapta, açıldıktan sonra 3 gün içinde tüketiniz.', 'Çırparak whipping cream olarak.',
   345, 1444, 35.0, 22.0, 3.0, 3.0, 2.0, 0.07, 0.0, true, true),
  
  -- 3) YUMURTA
  ('ASLAN-HAM-011', 'Yumurta (L Boy)', 'yumurta', 'adet', 'Köy Yumurtası', 'Yumurta ve Yumurta Ürünleri',
   'L boy tavuk yumurtası (60-65g)', true, 'Yumurta', NULL,
   '+4°C dolapta muhafaza edilmelidir.', 'Hamura kırılarak eklenir.',
   155, 649, 11.0, 3.3, 1.1, 1.1, 13.0, 0.36, 0.0, true, true),
  
  ('ASLAN-HAM-012', 'Yumurta Tozu (Bütün)', 'yumurta', 'kg', 'Eggza', 'Yumurta ve Yumurta Ürünleri',
   'Pastörize bütün yumurta tozu', true, 'Yumurta', NULL,
   'Kuru, serin yerde muhafaza ediniz.', '1kg toz = ~7-8 yumurta. Su ile sulandırarak kullanın.',
   594, 2484, 43.0, 12.0, 4.8, 3.8, 47.0, 1.10, 0.0, true, true),
  
  -- 4) ŞEKER VE TATLANDIRICILAR
  ('ASLAN-HAM-013', 'Toz Şeker', 'tatlandirici', 'kg', 'Türkşeker', 'Şeker ve Tatlandırıcılar',
   'Sakaroz (kristal toz şeker)', false, NULL, NULL,
   'Kuru, serin yerde muhafaza ediniz.', 'Hamur ve süslemeler için.',
   400, 1672, 0.0, 0.0, 99.8, 99.8, 0.0, 0.00, 0.0, true, true),
  
  ('ASLAN-HAM-014', 'Pudra Şekeri', 'tatlandirici', 'kg', 'Türkşeker', 'Şeker ve Tatlandırıcılar',
   'İnce öğütülmüş şeker', false, NULL, NULL,
   'Kuru, serin yerde muhafaza ediniz.', 'Süsleme ve glasaj için.',
   400, 1672, 0.0, 0.0, 99.5, 99.5, 0.0, 0.00, 0.0, true, true),
  
  ('ASLAN-HAM-015', 'Esmer Şeker (Brown)', 'tatlandirici', 'kg', 'Billington''s', 'Şeker ve Tatlandırıcılar',
   'Esmer şeker (melaslı)', false, NULL, NULL,
   'Kuru, serin yerde muhafaza ediniz.', 'Cinnamon roll iç dolgusu için.',
   380, 1588, 0.0, 0.0, 98.0, 95.0, 0.1, 0.05, 0.0, true, true),
  
  ('ASLAN-HAM-016', 'Bal (Çiçek)', 'tatlandirici', 'kg', 'Balparmak', 'Şeker ve Tatlandırıcılar',
   'Doğal çiçek balı', false, NULL, NULL,
   'Oda sıcaklığında, doğrudan güneş ışığından uzak.', 'Hamur ve süsleme için.',
   304, 1271, 0.0, 0.0, 82.0, 82.0, 0.3, 0.01, 0.0, true, true),
  
  -- 5) ÇİKOLATA VE KAKAO
  ('ASLAN-HAM-017', 'Kakao Tozu (Yağsız)', 'cikolata_kakao', 'kg', 'Barry Callebaut', 'Kakao ve Çikolata Ürünleri',
   'Doğal kakao tozu (yağı azaltılmış)', true, 'Soya lesitin içerebilir', 'Süt ve fındık hattında işlenir',
   'Kuru, serin yerde muhafaza ediniz.', 'Hamur ve glasaj için.',
   228, 953, 11.0, 6.5, 57.9, 1.8, 19.6, 0.05, 33.2, true, true),
  
  ('ASLAN-HAM-018', 'Sütlü Çikolata Drop (%34 kakao)', 'cikolata_kakao', 'kg', 'Callebaut', 'Kakao ve Çikolata Ürünleri',
   'Sütlü çikolata drops %34 kakao, %20 süt', true, 'Süt, soya lesitin', 'Fındık ve buğday tesisinde işlenir',
   'Kuru, +12-18°C''de muhafaza ediniz, doğrudan güneş ışığı almayan yerde.', 'Çikolata damlası olarak.',
   542, 2266, 31.6, 19.4, 56.4, 54.7, 7.7, 0.20, 1.5, true, true),
  
  ('ASLAN-HAM-019', 'Bitter Çikolata Drop (%70 kakao)', 'cikolata_kakao', 'kg', 'Callebaut', 'Kakao ve Çikolata Ürünleri',
   'Bitter çikolata drops %70 kakao', true, 'Soya lesitin', 'Süt ve fındık tesisinde işlenir',
   'Kuru, +12-18°C''de muhafaza ediniz.', 'Çikolata damlası ve süsleme.',
   600, 2509, 42.0, 25.0, 45.0, 33.0, 8.0, 0.05, 11.5, true, true),
  
  ('ASLAN-HAM-020', 'Beyaz Çikolata Drop', 'cikolata_kakao', 'kg', 'Callebaut', 'Kakao ve Çikolata Ürünleri',
   'Beyaz çikolata drops (kakao yağı + süt)', true, 'Süt ve süt ürünleri, soya lesitin', 'Fındık ve sütlü çikolata hattında işlenir',
   'Kuru, +12-18°C''de muhafaza ediniz.', 'Çikolata damlası ve süsleme.',
   555, 2321, 32.6, 19.5, 58.4, 58.4, 6.4, 0.20, 0.2, true, true),
  
  -- 6) BAHARAT VE AROMA
  ('ASLAN-HAM-021', 'Tarçın (Öğütülmüş, Cassia)', 'baharat', 'kg', 'Bagdat', 'Baharat ve Çeşni',
   'Öğütülmüş tarçın (Cinnamomum cassia)', false, NULL, 'Tahıl tesisinde işlenir',
   'Kuru, serin, kapalı kapta muhafaza ediniz.', 'Cinnamon roll dolgusu için.',
   247, 1033, 1.2, 0.3, 80.6, 2.2, 4.0, 0.03, 53.1, true, true),
  
  ('ASLAN-HAM-022', 'Vanilin (Toz)', 'baharat', 'kg', 'Dr. Oetker', 'Aroma Vericiler',
   'Sentetik vanilin tozu', false, NULL, 'Süt ve buğday tesisinde işlenir',
   'Kuru, serin yerde muhafaza ediniz.', 'Reçeteye göre az miktarda kullanın.',
   400, 1672, 0.1, 0.0, 90.0, 89.0, 0.1, 0.00, 0.0, true, true),
  
  ('ASLAN-HAM-023', 'Tuz (Sofra Tuzu, İyotlu)', 'baharat', 'kg', 'Billur', 'Tuz',
   'İyotlu sofra tuzu (NaCl)', false, NULL, NULL,
   'Kuru yerde muhafaza ediniz.', 'Hamur dengeleme için.',
   0, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 99.7, 0.0, true, true),
  
  -- 7) KABARTMA AJANLARI
  ('ASLAN-HAM-024', 'Kuru Maya', 'kabartma_ajan', 'kg', 'Pak', 'Mayalar',
   'Saccharomyces cerevisiae (kuru maya)', false, NULL, NULL,
   'Kuru, serin yerde muhafaza ediniz, açıldıktan sonra +4°C buzdolabında.', 'Donut ve cinnamon roll hamuru için.',
   325, 1359, 7.6, 1.0, 41.2, 0.0, 40.4, 0.20, 26.9, true, true),
  
  ('ASLAN-HAM-025', 'Kabartma Tozu', 'kabartma_ajan', 'kg', 'Dr. Oetker', 'Kimyasal Kabartma Ajanları',
   'Sodyum bikarbonat + sodyum pirofosfat + buğday nişastası', true, 'Buğday (gluten)', NULL,
   'Kuru, serin yerde muhafaza ediniz.', 'Hızlı kabartma gerektiren hamurlar için.',
   53, 222, 0.0, 0.0, 26.0, 0.0, 0.0, 11.0, 0.5, true, true),
  
  -- 8) YAĞLAR
  ('ASLAN-HAM-026', 'Ayçiçek Yağı', 'yag', 'lt', 'Yudum', 'Bitkisel Yağlar',
   'Rafine ayçiçek yağı', false, NULL, NULL,
   'Kuru, serin yerde, ışıktan korunarak muhafaza ediniz.', 'Donut kızartma yağı.',
   884, 3699, 100.0, 11.3, 0.0, 0.0, 0.0, 0.00, 0.0, true, true),
  
  ('ASLAN-HAM-027', 'Margarin (Pastacılık)', 'yag', 'kg', 'Sana', 'Bitkisel Yağlar',
   'Pastacılık margarini (palm yağı bazlı)', true, 'Süt ürünleri (şüpheli)', NULL,
   '+4°C dolapta muhafaza edilmelidir.', 'Hamur içi yumuşatıcı.',
   717, 3001, 80.0, 32.0, 0.4, 0.4, 0.7, 0.40, 0.0, true, true),
  
  -- 9) KURU MEYVE VE SERT KABUKLU
  ('ASLAN-HAM-028', 'Badem (File)', 'sert_kabuklu', 'kg', 'Pakistan', 'Sert Kabuklu Meyveler',
   'File badem (yarık dilimli)', true, 'Sert kabuklu (badem)', 'Diğer sert kabuklu meyve hattında işlenir',
   'Kuru, serin, kapalı kapta muhafaza ediniz.', 'Donut süslemesi için.',
   579, 2421, 49.9, 3.8, 21.6, 4.4, 21.2, 0.00, 12.5, true, true),
  
  ('ASLAN-HAM-029', 'Fındık (İç, Bütün)', 'sert_kabuklu', 'kg', 'Türkiye', 'Sert Kabuklu Meyveler',
   'İç fındık (Tombul)', true, 'Sert kabuklu (fındık)', 'Diğer sert kabuklu hatlarda işlenir',
   'Kuru, serin yerde muhafaza ediniz.', 'Süsleme ve hamura ilave.',
   628, 2627, 60.7, 4.5, 16.7, 4.3, 14.9, 0.00, 9.7, true, true),
  
  ('ASLAN-HAM-030', 'Yer Fıstığı (Tuzsuz, Kavrulmuş)', 'sert_kabuklu', 'kg', 'Antep', 'Yer Fıstığı ve Ürünleri',
   'Tuzsuz kavrulmuş yer fıstığı', true, 'Yer fıstığı', 'Sert kabuklu meyve hattında işlenir',
   'Kuru, serin yerde muhafaza ediniz.', 'Süsleme için.',
   567, 2371, 49.2, 6.8, 16.1, 4.7, 25.8, 0.01, 8.5, true, true)

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  brand = EXCLUDED.brand,
  material_group = EXCLUDED.material_group,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  usage_info = EXCLUDED.usage_info,
  energy_kcal = EXCLUDED.energy_kcal,
  energy_kj = EXCLUDED.energy_kj,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  fiber = EXCLUDED.fiber,
  tgk_compliant = EXCLUDED.tgk_compliant,
  is_active = EXCLUDED.is_active;

-- Doğrulama
SELECT COUNT(*) AS aslan_hammadde_count, 
       COUNT(*) FILTER (WHERE tgk_compliant = true) AS tgk_compliant_count,
       COUNT(*) FILTER (WHERE allergen_present = true) AS allergen_count,
       COUNT(*) FILTER (WHERE energy_kcal IS NOT NULL) AS nutrition_count
FROM raw_materials WHERE code LIKE 'ASLAN-HAM-%';

COMMIT;

-- Beklenen sonuç:
-- aslan_hammadde_count = 30 (hammadde sayısı)
-- tgk_compliant_count  = 30 (hepsi TGK uyumlu)
-- allergen_count       = 18 (alerjen içeren)
-- nutrition_count      = 30 (besin değeri olan)
