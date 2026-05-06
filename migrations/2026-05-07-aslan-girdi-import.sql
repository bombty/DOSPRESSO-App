-- ═══════════════════════════════════════════════════════════════════
-- DOSPRESSO Hammadde Veri İmport — Aslan'ın Numbers Dosyasından
-- Kaynak: /mnt/user-data/uploads/Girdi_Yo_netimi.numbers (67 hammadde)
-- Tarih: 7 May 2026
-- TGK 2017/2284 uyumlu alanlar (içerik, alerjen, çapraz bulaşma, besin değerleri)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1) Eski 'Aslan girdi import' kayıtlarını temizle (idempotent)
DELETE FROM raw_materials WHERE code LIKE 'ASLAN-HAM-%';

-- 2) 67 hammaddeyi INSERT et

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-001', 'Beyaz Çi̇kolatali Vani̇lya Aromali Dolgu', 'dolgu_sos', 'kg',
  'PURATOS', 'süt ve süt ürünleri',
  '[su, glikoz şurubu (mısır), modifiye nişasta, şeker, malto dekstrin, bitkisel yağ (palm), stabilizatör (kalsiyum sülfat), beyaz çikolata %1 (şeker, kakao yağı, tam yağlı süt tozu, yağsız süt tozu, emülgatör, (ayçiçek lesitini (E322)), aroma verici (vanilya), kıvam artırıcılar (mikro selüloz (E460), sodyum karboksil metilselüloz (E466), ksantan gam (E415)), asit (Glukono-delta-lakton (E575)), tuz, jelleştirici (karragenan (E407)), koruyucu (potasyum sorbat (E202)), vanilin, aroma verici (süt, beyaz çikolata), emülgatör (polisorbat 60 (E435)), renklendirici (beta karoten (E160a))],', true, 'Süt ve süt ürünleri içerir.', 'Eser miktarda gluten, yumurta, soya, fındık, susam ve sülfit içerebilir.',
  NULL, NULL,
  730.0, 2.3, 2.3, 37.5, 17.2, 0.2, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-002', 'Buğday unu süper lüks mavi', 'un', 'kg',
  'Hekimoğlu', NULL,
  'Buğday unu', true, 'gluten', 'Yok',
  NULL, NULL,
  347.0, 0.51, 0.082, 73.45, 0.0, 12.22, 0.204,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-003', 'BUĞDAY UNU SÜPER 1', 'un', 'kg',
  'Hekimoğlu', NULL,
  'BUĞDAY UNU', true, 'gLUTEN', 'YOK',
  NULL, NULL,
  347.13, 0.51, 0.2, 73.8, 0.0, 11.16, 0.4,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-004', 'Frambuazlı sos', 'dolgu_sos', 'kg',
  'PURATOS', NULL,
  'Frambuazlı sos [frambuaz %35, su, glikoz şurubu (mısır), şeker, modifiye nişasta, kıvam artırıcılar (mikrokristalin selüloz (E460), sodyum karboksil metil selüloz (E466), ksantan gam (E415), siyah havuç konsantresi, kırmızı pancar suyu konsantresi, asitlik düzenleyici (trisodyum sitrat (E331)), frambuaz aroma vericisi, asitlik düzenleyici  (sitrik asit (E330)), tuz, koruyucu (potasyum sorbat (E202)), jelleştirici (karragenan (E407), renklendirici (beta karoten (E160a), antioksidan (sodyum metabisülfit (E223)]', true, 'SÜLFİT İÇERİR.', 'ESER MİKTARDA GLUTEN, YUMURTA, SOYA, FINDIK, SUSAM, SÜT VE SÜT ÜRÜNLERİ İÇEREBİLİR.',
  '5 İLE 25 DERECE ARASINDA KURU BİR ORTAMDA (r.h. MAX %65) MUHAFAZA EDİNİZ. kULLANIM SONRASI AMBALAJI DÜZGÜN ŞEKİLDE KAPATINIZ.', NULL,
  670.0, 0.5, 0.1, 39.1, 24.2, 0.5, 1.4,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-005', 'FRAMBUAZ AROMALI KOKOLİN', 'dolgu_sos', 'kg',
  NULL, NULL,
  'Frambuaz aromalı kokolin (şeker, tam hidrojenize bitkisel yağ (palm), peynir altı suyu tozu (süt), emülgatör (ayçiçek lesitini (E322), renklendirici (antosiyaninler (E163)), aroma verici (frambuaz aroması))', true, 'sÜT ÜRÜNÜ İÇERİR.', 'esER MİKTARDA SOYA, GLUTEN, FINDIK, BADEM, FISTIK İÇEREBİLİR.',
  NULL, NULL,
  564.0, 36.0, NULL, 60.0, NULL, NULL, NULL,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-006', 'Vi̇şneli̇ Sos', 'dolgu_sos', 'kg',
  'DELİ', NULL,
  NULL, true, 'SÜLFİT içerir.', 'Gluten, yumurta, soya, fındık, susam, süt ve süt ürünleri içerebilir.',
  '5 İLE 25 DERECE ARASINDA KURU BİR ORTAMDA (r.h. MAX %65) MUHAFAZA EDİNİZ. kULLANIM SONRASI AMBALAJI DÜZGÜN ŞEKİLDE KAPATINIZ.', NULL,
  186.9, 2.1, 1.9, 41.1, 16.4, 0.2, 1.5,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-007', 'Li̇monlu Dolgu', 'dolgu_sos', 'kg',
  'DELİ', NULL,
  NULL, true, 'SÜT ÜRÜNÜ VE SÜLFİT İÇERİR.', NULL,
  'SERİN VE RUTUBETSİZ YERDE MUHAFAZA EDİNİZ (16-20 DERECE (MAX %60 BAĞIL NEM). HER KULLANIMDAN SONRA AMBALAJI KAPALI OLARAK SAKLAYINIZ.', NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik, besin', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-008', 'Karamel aromalı sos', 'dolgu_sos', 'kg',
  'Puratos', NULL,
  'Karamel aromalı sos [su, glikoz şurubu (mısır), şeker, modifiye nişasta, bitkisel yağ (palm), stabilizatör (kalsiyum sülfat (E516)), kıvam artırıcılar (mikrokristalin selüloz (E460), sodyum karboksil metil selüloz (E466), ksantan gam (E415)), karamelize şeker, karamel aroma verici, asit (glukono-delta-lakton (E575)), tuz, jelleştirici (karragenan (E407)), koruyucu (potasyum sorbat (E202)), emülgatör (polisorbat 60 (E435)), renklendirici (paprika ekstraktı (E160c)]', true, 'İçermez.', 'Gluten, yumurta, soya, fındık, susam, sülfit, süt ve süt ürünleri içerebilir.',
  '5 İLE 25 DERECE ARASINDA KURU BİR ORTAMDA (r.h. MAX %65) MUHAFAZA EDİNİZ. kULLANIM SONRASI AMBALAJI DÜZGÜN ŞEKİLDE KAPATINIZ.', NULL,
  747.0, 2.3, 1.9, 39.2, 26.7, 0.2, 0.22,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-009', 'Sütlü kokolin', 'süt_ürünleri', 'kg',
  NULL, NULL,
  'Sütlü kokolin [şeker, tam hidrojenize bitkisel yağ (palm), peynir altı suyu tozu (süt ürünü), kakao tozu, yağsız süt tozu, emülgatör (ayçiçek lesitini (E322)), aroma verici (vanilin)]', true, 'sÜT ÜRÜNÜ İÇERİR.', 'Eser miktarda soya ürünü, fındık, Antep fıstığı, badem ve gluten içerebilir.',
  '15-20 derece sıcaklıkta, Max %70 bağıl nemde, serin ve kuru yerde, kokudan ve direkt ışıktan uzakta saklanır.', NULL,
  225.0, 29.4, 26.2, 65.1, 62.5, 3.2, 0.98,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-010', 'Beyaz kokolin', 'çikolata_kakao', 'kg',
  NULL, NULL,
  'Beyaz kokolin (Şeker, bitkisel yağ (tam hidrojenize palm), peyniraltı suyu tozu (süt ürünü), yağsız süt tozu, emülgatör (ayçiçek lesitini (E322))', false, NULL, NULL,
  NULL, NULL,
  538.0, 29.2, 28.5, 66.1, 66.1, 2.7, 1.29,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: alerjen', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-011', 'Bitter kokolin', 'çikolata_kakao', 'kg',
  'Ovalette', NULL,
  'Bitter kokolin (şeker, tam hidrojenize bitkisel yağ (palm, ayçiçek), yağı azaltılmış kakao tozu, peynir altı suyu tozu (süt ürünü), emülgatörler (ayçiçek lesitini (E322), sorbitan tristearat (E492), poligliserol polirisinoleat (E476)), aroma verici (vanilya)', true, 'Süt ürünü içerir.', 'Eser miktarda fındık, Antep fıstığı, badem, ceviz içerebilir.',
  '+18/+20 DERECEDE SERİN VE KOKUSUz yerde muhafaza ediniz.ışık, hava, nemden ve aşırı sıcaklık değişimlerinden koruyunuz.', NULL,
  518.0, 32.0, 26.0, 57.0, 55.0, 2.8, 0.004,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-012', 'Bitter çikolata para', 'çikolata_kakao', 'kg',
  'Ovalette', NULL,
  'Bitter çikolata para [Şeker, kakao kitlesi, yağı azaltılmış kakao tozu, kakao yağı, bitkisel yağ (palm, shea), emülgatör (ayçiçek lesitini (E322), poligliserol polisirinoleat (E476), aroma verici (vanilin)]', false, 'İÇERMEZ.', 'ESER MİKTARDA SÜT VE SÜT ÜRÜNLERİNİ, FINDIK, ANTEP FISTIĞI, BADEM, CEVİZ, GLUTEN İÇEREBİLİR.',
  '+18/+20 DERECEDE SERİN VE KOKUSUz yerde muhafaza ediniz.ışık, hava, nemden ve aşırı sıcaklık değişimlerinden koruyunuz.', 'Eritilirken, benmari usulü 45-50 derecede kullanılır.',
  509.0, 30.0, 18.0, 61.0, 50.0, 3.8, 0.004,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-013', 'Beyaz çikolata para', 'çikolata_kakao', 'kg',
  NULL, NULL,
  'Beyaz çikolata para (%33 toplam yağ) [şeker, kakao yağı, tam yağlı süt tozu (süt), bitkisel yağ (palm, shea), emülgatör (ayçiçek lesitini (E322), poligliserol polirisinoleat (E476), aroma verici (vanilin).', true, 'Süt ve süt ürünleri içerir.', 'İçermez.',
  '+18/+20 DERECEDE SERİN VE KOKUSUz yerde muhafaza ediniz.ışık, hava, nemden ve aşırı sıcaklık değişimlerinden koruyunuz.', 'Eritilirken, benmari usulü 45-50 derecede kullanılır.',
  558.0, 33.0, 18.0, 61.0, 50.0, 3.8, 0.004,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-014', 'Kakao tozu', 'çikolata_kakao', 'kg',
  NULL, NULL,
  'Kakao tozu', false, NULL, NULL,
  NULL, NULL,
  495.0, 31.79, 0.0, 31.09, 0.0, 18.87, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-015', 'Kakaolu fındıklı krema', 'süt_ürünleri', 'kg',
  NULL, NULL,
  'Kakaolu fındıklı krema (şeker, bitkisel yağ (ayçiçek, palm), yağsız süt tozu, fındık (%5), toz kakao (%5), demineralize peyniraltı suyu tozu, emülgatör (soya lesitini (E322)), aroma verici (vanilin, süt))', false, NULL, NULL,
  NULL, NULL,
  540.0, 33.0, 15.0, 55.0, 52.0, 6.0, 0.2,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: alerjen', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-016', 'Renkli granül şeker', 'şeker_tatlandırıcı', 'kg',
  NULL, NULL,
  'Renkli granül şeker (şeker, nişasta, renklendirici (Bordo E122, E133, E110, E102), kalsiyum karbonat E170)).', false, NULL, NULL,
  NULL, NULL,
  339.0, 1.3, 0.0, 87.0, 91.0, 0.1, 0.03,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-017', 'Süs yer fıstığı', 'diğer', 'kg',
  NULL, NULL,
  'Süs yer fıstığı (yer fıstığı, toz krema, pudra şekeri, renklendiriciler (E102, E132))', true, 'Yer fıstığı, süt ürünü içerir.', NULL,
  NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: besin', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-018', 'Hindistan cevizi', 'kuruyemiş', 'kg',
  NULL, NULL,
  'Hindistan cevizi', false, NULL, NULL,
  NULL, NULL,
  682.0, 67.22, 0.0, 4.25, 0.0, 5.62, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: alerjen', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-019', 'Tuz', 'baharat_tuz', 'kg',
  NULL, NULL,
  'Tuz', false, 'İçermez.', NULL,
  NULL, NULL,
  1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 93.521,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-020', 'Peyni̇r Alti Suyu Tozu', 'diğer', 'kg',
  NULL, NULL,
  'PEYNİR ALTI SUYU TOZU', true, 'Süt ürünü içerir.', NULL,
  NULL, NULL,
  300.0, 0.54, 0.0, 73.45, 0.0, 11.73, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-021', 'Soya Unu', 'un', 'kg',
  NULL, NULL,
  NULL, false, NULL, NULL,
  NULL, NULL,
  409.0, 22.4, 2.7, 36.7, 6.4, 34.3, 0.025,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik, alerjen', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-022', 'Bitkisel yağ [………….', 'yağ', 'kg',
  NULL, NULL,
  NULL, false, NULL, NULL,
  NULL, NULL,
  900.0, 100.0, 10.382, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik, alerjen', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-023', 'Şeker', 'şeker_tatlandırıcı', 'kg',
  'Aro', NULL,
  'Şeker', false, 'içermez.', NULL,
  NULL, NULL,
  400.0, 0.0, 0.0, 99.44, 98.8, 0.25, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-024', 'Esmer şeker', 'şeker_tatlandırıcı', 'kg',
  NULL, NULL,
  'Esmer şeker', false, 'içermez.', NULL,
  NULL, NULL,
  400.0, 0.0, 0.0, 99.82, 96.41, 0.0, 0.045,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-025', 'File badem', 'kuruyemiş', 'kg',
  NULL, NULL,
  'File badem', true, 'Badem içerir.', NULL,
  NULL, NULL,
  600.0, 55.0, 0.0, 17.0, 4.0, 20.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-026', 'Yaş maya', 'maya_kabartıcı', 'kg',
  'Pakmaya', NULL,
  'Yaş maya', false, 'içermez.', NULL,
  NULL, NULL,
  104.0, 1.0, 0.0, 7.24, 0.0, 12.48, 0.183,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-027', 'Kuru Maya', 'maya_kabartıcı', 'kg',
  'Pakmaya', NULL,
  'DOĞAL MAYA (SACCHAROMYCES CEREVİSİAE), BİTKİSEL EMÜLGATÖR (SORBİTAN MONOSTEARAT)', false, 'İçermez.', NULL,
  'HAVA ALMAYACAK ŞEKİLDE PAKETLEYEREK BUZDOLABINDA VEYA SERİN VE KOKUSUZ ORTAMDA SAKLAYINIZ.', NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: besin', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-028', 'Dekstroz', 'diğer', 'kg',
  NULL, NULL,
  'Dekstroz', false, 'içermez.', NULL,
  NULL, NULL,
  400.0, 0.0, 0.0, 99.44, 0.0, 0.25, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-029', 'Yumurta tozu', 'yumurta', 'adet',
  NULL, NULL,
  'Yumurta tozu', true, 'Yumurta içerir.', NULL,
  NULL, NULL,
  100.0, 10.0, 0.0, 0.0, 0.0, 10.0, 0.375,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-030', 'Enzim (maltogenik amilaz)', 'gıda_katkısı', 'kg',
  NULL, NULL,
  'Enzim (maltogenik amilaz)', false, NULL, NULL,
  NULL, NULL,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-031', 'Emülgatör(E471)', 'gıda_katkısı', 'kg',
  NULL, NULL,
  NULL, false, 'içermez.', NULL,
  NULL, NULL,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-032', 'Emülgatör(E472E)', 'gıda_katkısı', 'kg',
  NULL, NULL,
  NULL, false, 'içermez.', NULL,
  NULL, NULL,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-033', 'Emülgatör(E481)', 'gıda_katkısı', 'kg',
  NULL, NULL,
  NULL, false, 'içermez.', NULL,
  NULL, NULL,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-034', 'Kıvam artırıcı (E466)', 'diğer', 'kg',
  NULL, NULL,
  NULL, false, 'içermez.', NULL,
  NULL, NULL,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-035', 'Kıvam artırıcı (E415)', 'diğer', 'kg',
  NULL, NULL,
  NULL, false, 'içermez.', NULL,
  NULL, NULL,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-036', 'Aroma Veri̇ci̇ (Aci Badem Aromasi)', 'dolgu_sos', 'kg',
  NULL, NULL,
  'Acı badem', true, 'Acı badem içerir.', NULL,
  NULL, NULL,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-037', 'Aroma Veri̇ci̇ (Muskat Aromasi)', 'dolgu_sos', 'kg',
  NULL, NULL,
  'Muskat', false, NULL, NULL,
  NULL, NULL,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-038', 'Un İşlem Maddesi̇ (E466)', 'un', 'kg',
  NULL, NULL,
  NULL, false, 'İçermez.', NULL,
  NULL, NULL,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-039', 'Un İşlem Maddesi̇ (E415)', 'un', 'kg',
  NULL, NULL,
  NULL, false, 'İçermez.', NULL,
  NULL, NULL,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-040', 'Nem Veri̇ci̇ (E422)', 'diğer', 'kg',
  NULL, NULL,
  NULL, false, 'İçermez.', NULL,
  NULL, NULL,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-041', 'KORUYUCU (e282)', 'diğer', 'kg',
  NULL, NULL,
  NULL, false, 'İçermez.', NULL,
  NULL, NULL,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-042', 'Su', 'diğer', 'kg',
  NULL, NULL,
  'İçilebilir su', false, 'İçermez.', NULL,
  NULL, NULL,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-043', 'Renklendirici (hibiskus sabdariff, maltodekstrin)', 'diğer', 'kg',
  NULL, NULL,
  NULL, false, NULL, NULL,
  NULL, NULL,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik, alerjen', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-044', 'Prejelatinize mısır nişastası', 'gıda_katkısı', 'kg',
  NULL, NULL,
  'Prejelatinize mısır nişastası', false, NULL, NULL,
  NULL, NULL,
  370.0, 0.78, 0.0, 90.58, 0.0, 0.19, 0.005,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: alerjen', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-045', 'Tereyağı', 'süt_ürünleri', 'kg',
  'Aro', NULL,
  'Tereyağı', true, 'Süt ürünü içerir.', NULL,
  NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: besin', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-046', 'Aroma verici )vanilya aroması)', 'dolgu_sos', 'kg',
  NULL, NULL,
  'Aroma verici )vanilya aroması)', false, 'İçermez.', NULL,
  NULL, NULL,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-047', 'Karbonat', 'diğer', 'kg',
  NULL, NULL,
  NULL, false, 'İçermez.', NULL,
  NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik, besin', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-048', 'Tam Yağli Taze Peyni̇r', 'yağ', 'kg',
  'METRO CHEF', NULL,
  'Tam yağlı taze peynir (pastörize inek sütü kreması, stabilizör (sodyum aljinat (E401)), emülsifiye edici tuzlar (polifosfatlar (E452), sodyum fosfatlar (E339), peynir kültürü, tuz.', true, 'SÜT ÜRÜNÜ İÇERİR.', 'İçermez.',
  NULL, NULL,
  189.0, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-049', 'Tam yağlı taze peynir labne', 'süt_ürünleri', 'kg',
  NULL, NULL,
  'Taze peynir labne [Pastörize inek sütü, tuz, kıvam artırıcılar (sodyum aljinat (E401), selüloz gam (E466), guar gam (E412), keçiboynuzu gamı (E410)), yoğurt kültürü]', false, NULL, NULL,
  NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: alerjen, besin', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-050', 'Çeçil peyniri', 'süt_ürünleri', 'kg',
  NULL, NULL,
  'Çeçil peyniri (pastörize inek sütü, peynir mayası, kültür, tuz)', false, NULL, NULL,
  NULL, NULL,
  300.0, 24.0, 0.0, 1.0, 0.0, 25.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: alerjen', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-051', 'Yarım yağlı Tost peyniri', 'süt_ürünleri', 'kg',
  NULL, NULL,
  'Yarım yağlı dilimli tost peyniri (pastörize inek sütü, peynir mayası, tuz, peynir kültürü, eritme tuzları (sodyum sitrat (E331), sodyum fosfat (E339)), laktoz)', false, NULL, NULL,
  NULL, NULL,
  275.0, 20.0, 13.8, 1.8, 0.5, 22.3, 1.3,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: alerjen', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-052', 'Bitkisel yağlı, şekersiz UHT Krem şanti', 'şeker_tatlandırıcı', 'kg',
  'Puratos', NULL,
  'Bitkisel yağlı, şekersiz UHT Kremşanti [su, tam hidrojenize bitkisel yağ (palm çekirdeği yağı), stabilizatörler (sorbitol şurup (E420), hidroksipropil selüloz (E463), mikrokristalin selüloz (E460 (i)), sodyum karboksil metil selüloz (E466)), maltodekstrin, hindiba kökü lifi, süt proteini, emülgatörler (yağ asitlerinin mono-digliseritlerinin tartarik asit esterleri (E472d), soya lesitini, yağ asitlerinin mono-ve digliseritlerinin laktik asit esterleri (E472b)), yağsız süt tozu, tuz, aroma vericiler, asitlik düzenleyiciler (disodyum fosfat (E339), trisodyum nitrat (E251)), renklendirici (bitkisel karotenler (E160a)]', true, 'Soya ve süt ürünleri içerir.', 'İçermez.',
  '(2-20 DERECE) SERİN VE RUTUBETSİZ YERDE MUHAFAZA EDİNİZ. HER KULLANIM SONRASI AMBALAJI KAPALI OLARAK SAKLAYINIZ.SICAKLIK DEĞİŞİMLERİNDEN KAÇININ. ÜRÜN AÇILDIKTAN SONRA EN FAZLA 3 GÜN BUZDOLABINDA SAKLANABİLİR.', 'kULLANMAYA BAŞLAMADAN ÖNCE EN AZ 12 SAAT SOĞUTUNUZ. 5-8 DERECE ARASINDA ÇIRPINIZ.İSTENEN KIVAMI ELDE EDENE KADAR ORTA HIZDA ÇIRPINIZ.BİR KEZ ÇIRPILDIĞINDA, ÜRÜN DONMA VE ÇÖZÜLME İÇİN UYGUN HALE GELMEKTEDİR.',
  271.0, 27.6, 27.3, 4.5, 0.0, 0.8, 0.217,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-053', 'Kek Karişimi Toffee', 'diğer', 'kg',
  'TEGRAL', NULL,
  NULL, false, NULL, NULL,
  NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik, alerjen, besin', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-054', 'Bisküvi', 'diğer', 'kg',
  NULL, NULL,
  'Bisküvi [Buğday Unu, Tam Buğday Unu %24, Bitkisel Yağ (Palm, Ayçiçek, Pamuk, Kanola), Şeker, Pastörize Yumurta, Malt Ekstrakt (Arpa Ürünü), Kabartıcılar (Amonyum Karbonatlar (E503), Sodyum Hidrojen Karbonat (E500), Sodyum Asit Pirofosfat (E450)), İnvert Şeker Şurubu, Peynir Altı Suyu Tozu (Süt Ürünü), Yağsız Süt Tozu, Kepek, Tuz, Aroma Vericiler, Emülgatör (Sodyum Stearol-2-Laktilat (E481)), Renklendirici (Karamel (E150a)]', false, NULL, NULL,
  'Serin ve kuru ortamda muhafaza ediniz.', NULL,
  450.0, 17.0, 9.4, 66.0, 21.0, 6.1, 0.9,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: alerjen', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-055', 'Bisküvi kreması', 'süt_ürünleri', 'kg',
  'Glora', NULL,
  'Karamelize bisküvi kreması [Karamelize bisküvi %60 (Buğday unu, şeker, bitkisel yağ (değişken miktarlarda palm, pamuk, ayçiçek, keten tohumu), karamelize şeker, kabartıcı (sodyum bikarbonat), tuz, tarçın], bitkisel yağ (ayçiçek), şeker, emülgatör (soya lesitini (E322)), aroma verici (tarçın)', true, 'Gluten, soya ürünü içerir.', 'Eser miktarda fındık, fıstık içerebilir.',
  'Serin ve kuru ortamda muhafaza ediniz.', NULL,
  563.0, 35.34, 9.48, 54.0, 27.0, 4.18, 0.1,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-056', 'Yulaf ezmesi', 'diğer', 'kg',
  'Aro', NULL,
  'Yulaf ezmesi', true, 'Gluten içerir.', 'içermez.',
  'Serin ve kuru ortamda muhafaza ediniz.', NULL,
  378.0, 7.6, 1.42, 59.4, 1.3, 13.5, 0.02,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-057', 'Öğütülmüş kahve', 'diğer', 'kg',
  NULL, NULL,
  NULL, false, 'İçermez.', 'İçermez.',
  'Serin ve kuru ortamda muhafaza ediniz.', NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: icerik, besin', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-058', 'Közlenmiş kırmızı biber', 'diğer', 'kg',
  NULL, NULL,
  'Közlenmiş kırmızı biber (közlenmiş kırmızı biber %64), su, sirke, şeker, tuz)', false, NULL, NULL,
  'Serin ve kuru ortamda muhafaza ediniz.', NULL,
  38.0, 0.11, 0.0, 8.02, 4.7, 0.63, 1.253,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: alerjen', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-059', 'Badem', 'kuruyemiş', 'kg',
  NULL, NULL,
  'Badem', false, NULL, NULL,
  'Serin ve kuru ortamda muhafaza ediniz.', NULL,
  600.0, 50.22, 0.0, 10.36, 2.7, 20.57, 0.01,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: alerjen', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-060', 'Kurutulmuş domates', 'diğer', 'kg',
  NULL, NULL,
  'Kurutulmuş domates (Güneşte kurutulmuş domates (%56,67), ayçiçek yağı, tuz, glikoz şurubu, kekik, sarımsak, asitlik düzenleyici (sitrik asit (E330)), antioksidan (askorbik asit (E300)), koruyucu (potasyum sorbat (E202))', false, NULL, NULL,
  'Serin ve kuru ortamda muhafaza ediniz.', NULL,
  210.0, 0.53, 0.0, 29.22, 13.66, 11.31, 5.311,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: alerjen', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-061', 'Bitkisel yağ (zeytinyağı)', 'yağ', 'kg',
  NULL, NULL,
  'Zeytinyağı', false, 'İçermez.', 'içermez.',
  'Serin ve kuru ortamda muhafaza ediniz.', NULL,
  900.0, 100.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-062', 'Kaya tuzu', 'baharat_tuz', 'kg',
  NULL, NULL,
  'Kaya tuzu', false, 'İçermez.', 'içermez.',
  'Serin ve kuru ortamda muhafaza ediniz.', NULL,
  112.0, 0.44, 0.0, 23.43, 0.0, 2.44, 1.033,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-063', 'Biber salçası', 'diğer', 'kg',
  NULL, NULL,
  'Biber salçası', false, 'İçermez.', NULL,
  'Serin ve kuru ortamda muhafaza ediniz.', NULL,
  14.0, 0.0, 0.0, 3.14, 0.0, 0.25, 0.035,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-064', 'Elma sirkesi', 'diğer', 'kg',
  NULL, NULL,
  'Elma sirkesi', false, 'İçermez.', 'içermez.',
  'Serin ve kuru ortamda muhafaza ediniz.', NULL,
  2.0, 0.0, 0.0, 0.39, 0.0, 0.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-065', 'Zeytin ezmesi', 'diğer', 'kg',
  NULL, NULL,
  'Zeytin ezmesi [zeytin püresi (%92), tuz,bitkisel yağ (ayçiçek yağı), koruyucu (potasyum sorbat (E 202)]', false, NULL, NULL,
  NULL, NULL,
  200.0, 18.0, 0.0, 1.0, 0.0, 2.0, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: alerjen', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-066', 'Yeşil zeytin', 'diğer', 'kg',
  'aro', NULL,
  'Yeşil zeytin [Dilimlenmiş yeşil zeytin, su, tuz, asitlik düzenleyici (sitrik asit (E330)), antioksidan (askorbik asit (E300)), koruyucu (potasyum sorbat (E202), sodyum benzoat (E221))]', false, 'İçermez.', 'içermez.',
  NULL, NULL,
  130.0, 15.0, 2.0, 3.5, 1.0, 1.0, 6.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO raw_materials (
  code, name, category, unit, brand, material_group,
  content_info, allergen_present, allergen_detail, cross_contamination,
  storage_conditions, usage_info,
  energy_kcal, fat, saturated_fat, carbohydrate, sugar, protein, salt,
  is_active, notes, created_at, updated_at
) VALUES (
  'ASLAN-HAM-067', 'Kekik', 'diğer', 'kg',
  'Aro', NULL,
  'Kekik', false, 'İçermez.', 'içermez.',
  'Serin ve kuru ortamda muhafaza ediniz.', NULL,
  288.0, 7.25, 0.0, 26.66, 0.0, 8.81, 0.0,
  TRUE, '📥 Aslan import 7 May 2026. Eksik: tam', NOW(), NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  content_info = EXCLUDED.content_info,
  allergen_present = EXCLUDED.allergen_present,
  allergen_detail = EXCLUDED.allergen_detail,
  cross_contamination = EXCLUDED.cross_contamination,
  storage_conditions = EXCLUDED.storage_conditions,
  energy_kcal = EXCLUDED.energy_kcal,
  fat = EXCLUDED.fat,
  saturated_fat = EXCLUDED.saturated_fat,
  carbohydrate = EXCLUDED.carbohydrate,
  sugar = EXCLUDED.sugar,
  protein = EXCLUDED.protein,
  salt = EXCLUDED.salt,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- 3) İstatistik
SELECT 'TOPLAM_HAMMADDE' AS metric, COUNT(*)::text AS value FROM raw_materials WHERE code LIKE 'ASLAN-HAM-%'
UNION ALL SELECT 'BESIN_TAM', COUNT(*)::text FROM raw_materials WHERE code LIKE 'ASLAN-HAM-%' AND energy_kcal IS NOT NULL
UNION ALL SELECT 'ICERIK_BILGI_TAM', COUNT(*)::text FROM raw_materials WHERE code LIKE 'ASLAN-HAM-%' AND content_info IS NOT NULL
UNION ALL SELECT 'ALERJEN_BILGI_TAM', COUNT(*)::text FROM raw_materials WHERE code LIKE 'ASLAN-HAM-%' AND allergen_detail IS NOT NULL
UNION ALL SELECT 'EKSIK_VERI_VAR', COUNT(*)::text FROM raw_materials WHERE code LIKE 'ASLAN-HAM-%' AND notes LIKE '%Eksik:%' AND notes NOT LIKE '%Eksik: tam%';

COMMIT;