-- ═══════════════════════════════════════════════════════════════════
-- RAW MATERIALS BULK UPSERT (23 Nis 2026)
-- Excel: 2026_Satinalinan_Urunler_Bombtea_Hammadde.xlsx
-- Toplam: 185 ürün (H/T/Y/M kategorileri)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Önce aktif hale getir (eğer silinmiş ya da pasif ise)
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1001', 'TOZ ŞEKER 50 KG', 'hammadde', 'ADET', 1890, 1868, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1005', 'Yumurta L', 'hammadde', 'ADET', 6.44, 6.44, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1006', 'Yaş Maya 500 gr*24', 'hammadde', 'ADET', 925, 925, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1007', 'Yağsız Süt Tozu 25 kg', 'hammadde', 'ADET', 230, 230, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1008', 'Buğday Gluteni 25 Kg', 'hammadde', 'ADET', 5234, 4975, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1009', 'Vanilya Dkt', 'hammadde', 'ADET', 1050, 950, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1011', 'Turyağ T2', 'hammadde', 'ADET', 2215, 1925, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1012', 'Turyağ Mayalı 10 kg', 'hammadde', 'ADET', 775, 660, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1014', 'Turyağ Fritöz 18 lt', 'hammadde', 'ADET', 1875, 1680, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1015', 'Cool Lime Aroma Vericisi-1 kg', 'hammadde', 'ADET', 787.08, 698.6650000000001, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1016', 'Çilek-Ahududu Aroma Vericisi-1 kg', 'hammadde', 'ADET', 1814, 1468.2825, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1018', 'Nane Aroma Verici-1 kg', 'hammadde', 'ADET', 2454.33, 2224.179, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1019', 'Karamel Aroma Verici-1 kg', 'hammadde', 'ADET', 1364.16, 1278.8395, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1020', 'Yaban mersini Aroma Vericisi-1 kg', 'hammadde', 'ADET', 1118.2, 986.568, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1021', 'Vanilya Aroma Vericisi-1 kg', 'hammadde', 'ADET', 2250, 2189, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1025', 'Masala Chai Tea Latte Aroma Vercisi-1 kg', 'hammadde', 'ADET', 994.42, 712.2855, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1026', 'Kola Aroma Vericisi-1 kg', 'hammadde', 'ADET', 5264.13, 4744.326999999999, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1027', 'Mango Aroma Vericisi-1 kg', 'hammadde', 'ADET', 1012.41, 861.25, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1028', 'Tarçın Aroma Vericisi-1 kg', 'hammadde', 'ADET', 2112.63, 1902.208, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1029', 'Şeftali Aroma Vericisi -1 kg', 'hammadde', 'ADET', 2781.22, 2558.785, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1031', 'Enerji İçeceği Aroma Vericisi -1 kg', 'hammadde', 'ADET', 1681, 1550.554, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1034', 'Kızarmış Marshmallow Aroma Vericisi-1 kg', 'hammadde', 'ADET', 1848.15, 1684.185, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1035', 'Kırmızı Orman Meyveleri Aroma Vericisi-1 kg', 'hammadde', 'ADET', 1329.25, 1076.265, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1038', 'Pumpkin Aroma Vericisi -1 kg', 'hammadde', 'ADET', 1760.35, 1595.998, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1039', 'Şeker Kamışı Aroma Vericisi', 'hammadde', 'ADET', 1988.85, 1825.453333333333, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1041', 'Karbon Black', 'hammadde', 'ADET', 1070.36, 886.7, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1043', 'Brezilya Cerrado Yeşil Kahve Çekirdeği', 'hammadde', 'KG', 463.06, 456.8713205128205, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1045', 'Brezilya Rio Minas Yeşil Kahve Çekirdeği', 'hammadde', 'KG', 340, 319.81, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1047', 'Bulanıklık Verici 5 Kg', 'hammadde', 'ADET', 905, 691.57, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1048', 'Barbekü sos', 'hammadde', 'ADET', 400, 400, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1049', 'Beyaz Konfiseri Para Çikolata 10 kg', 'hammadde', 'ADET', 970, 2365.384615384615, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1050', 'Sütlü Konfiseri Para Çikolata 10 kg', 'hammadde', 'ADET', 970, 2200, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1051', 'Bitter Konfiseri Para Çikolata 10 kg', 'hammadde', 'ADET', 1010, 2900, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1052', 'Sweet Chilli Sos', 'hammadde', 'ADET', 340, 340, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1053', 'Decaf Kahve Yeşil Kahve Çekirdeği', 'hammadde', 'KG', 595.16, 577.42, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1055', 'Esmer Toz Şeker', 'hammadde', 'KG', 75, 75, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1056', 'Zencefil Toz 500 Gr', 'hammadde', 'ADET', 355, 237.62, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1059', 'Sunset Glaze 1 kg', 'hammadde', 'ADET', 235, 235, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1062', 'Potasyum Sorbat E202', 'hammadde', 'ADET', 229, 185.82, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1063', 'Malik Asit E296 5 Kg', 'hammadde', 'ADET', 1379, 839.81, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1064', 'Ksantan Gum', 'hammadde', 'KG', 395, 347, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1067', 'Kalsiyum Propiyanat E282 1 kg', 'hammadde', 'ADET', 271.28, 230.23, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1069', 'Trisodyum Fosfat E339 1 kg', 'hammadde', 'ADET', 413.42, 339.07, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1071', 'SSL', 'hammadde', 'KG', 410, 325, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1073', 'Bitkisel Karbon (Aktif Karbon) Siyahı Gıda Renklen', 'hammadde', 'ADET', 899.98, 780.89, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1077', 'Şeftali Konserve 5 Kg', 'hammadde', 'ADET', 480, 450, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1078', 'Datem', 'hammadde', 'KG', 1700, 1185, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1079', 'Dondurulmuş Piliç Kasap Köfte', 'hammadde', 'ADET', 140, 140, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1080', 'Yer Fıstığı Pirinç Kırılmış', 'hammadde', 'ADET', 155, 135, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1081', 'Labne', 'hammadde', 'ADET', 487.7, 539.68, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1083', 'Hamur Kabartma Tozu 25 kg', 'hammadde', 'ADET', 2650, 1807.5, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1087', 'Peynir Altı Suyu Tozu', 'hammadde', 'ADET', 94, 35.6436, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1088', 'Tereyağ 1 Kg', 'hammadde', 'ADET', 549.91, 578.37, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1089', 'Izgara Dilimli Piliç Fileto 500 gr (12li)', 'hammadde', 'ADET', 217, 217, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1090', 'Karabiber 1 kg', 'hammadde', 'ADET', 975.55, 562.365, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1091', 'Bitkisel Gliserin - Gliserol %99,7 - 25 Kg', 'hammadde', 'ADET', 3125, 3125, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1093', 'Maltodekstrin DE=6 1 Kg', 'hammadde', 'ADET', 348.59, 185.3, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1094', 'İzomalt E953 5 Kg', 'hammadde', 'ADET', 2630, 1326.22, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1095', 'Nicaragua Shg EP Yeşil Kahve Çekirdeği', 'hammadde', 'KG', 517, 402.5, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1099', 'Malt Ekstraktı Özü Gıda Tipi 1 Kg', 'hammadde', 'ADET', 372.34, 223.85, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1100', 'Kievit 30-S Kahve Kreması', 'hammadde', 'KG', 137.67, 128.71, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1113', 'Tegral Satın Cream Cake Havuçlu Tarçınlı Cvz 10 Kg', 'hammadde', 'ADET', 5600, 5000, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1114', 'Tegral Satın Cream Cake Toffee 10 Kg', 'hammadde', 'ADET', 3300, 2650, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1117', 'Festipak 12x1 Kg', 'hammadde', 'ADET', 218, 218, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1120', 'Kakule Toz', 'hammadde', 'KG', 2265, 990.1, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1121', 'Karanfil Toz', 'hammadde', 'KG', 970, 405.94, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1122', 'Anason Toz', 'hammadde', 'KG', 1101.14, 722.32, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1123', '1000 cc. Şeffaf eski model kısa şişe', 'hammadde', 'ADET', 7.5, 6.65, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1129', 'Lavaş 30 cm 10lu x 10 paket', 'hammadde', 'ADET', 88, 88, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1131', 'Sitrik Asit (Anhidrat)', 'hammadde', 'ADET', 173, 96.44930000000001, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1134', 'Bütün Yumurta Tozu 15 Kg Bio Protein', 'hammadde', 'ADET', 520, 513, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1136', 'Hemiselülaz Enzimi 100 gr', 'hammadde', 'ADET', 102, 75.62, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1137', 'Haşhaş Mavi 1 Kg', 'hammadde', 'ADET', 200, 175, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1138', 'Lipaz Enzimi 1 Kg', 'hammadde', 'ADET', 2376, 1737.82, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1141', 'Maltojenik Amilaz', 'hammadde', 'ADET', 4105, 3104.491, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1142', 'Pektinaz Enzimi 5 Kg', 'hammadde', 'ADET', 6282, 4692.64, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1143', 'Kakao Gerkens GT-50 25 Kg', 'hammadde', 'ADET', 480, 480, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1144', 'Limon', 'hammadde', 'KG', 65, 60, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1145', 'Hidroksipropil Metil Selüloz Hpmc E464 5 Kg', 'hammadde', 'ADET', 6388, 4721.64, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1148', 'Vizyon 2000 Ekmek Geliştirici 20 Kg', 'hammadde', 'ADET', 920, 800, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1150', 'L-Sistein HCI E920 1 Kg', 'hammadde', 'ADET', 982, 748.25, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1153', 'Taurin -1 kg', 'hammadde', 'ADET', 358, 278.75, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1155', 'Sweet Roasted Wallnut Aroma Vericisi -1 kg', 'hammadde', 'ADET', 1462, 1347.138333333333, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1156', 'Bal Kabağı Püresi', 'hammadde', 'ADET', 652, 633.5600000000001, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1157', 'Tegral Toping (Çeşit Ekmek Dekor) 5 Kg', 'hammadde', 'ADET', 1150, 850, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1167', 'Bisküvi Kreması', 'hammadde', 'ADET', 400, 420.79, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1169', 'DELİ CITRON 5 KG', 'hammadde', 'ADET', 3730, 3730, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1170', 'Burçak ', 'hammadde', 'ADET', 19.8, 19.8, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1171', 'Haşhaş Beyazi 1 Kg', 'hammadde', 'ADET', 220, 210, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1172', 'Cream Brule Aroma Vericisi-1 kg', 'hammadde', 'ADET', 875, 861, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1173', 'Pirejelati Mısır Nişatası', 'hammadde', 'ADET', 118.76, 116.56, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1174', 'Susam Pastalık 5 Kg', 'hammadde', 'ADET', 110, 105, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1175', 'Donut Sos Filfişi Beyaz 6 Kg ', 'hammadde', 'ADET', 300, 300, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1176', 'Donut Sos Karamel 6 Kg ', 'hammadde', 'ADET', 300, 300, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1177', 'Donut Sos Çilek 6 Kg ', 'hammadde', 'ADET', 300, 300, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('H-1178', 'Donut Sos Çikolatallı 6 Kg ', 'hammadde', 'ADET', 300, 300, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('M-1130', 'Dekstroz', 'hammadde', 'ADET', 120, 119.59, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('M-1133', 'Granül blend (500 Gr)', 'mamul', 'ADET', 275, 177.5, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('M-1170', 'Kruvasan Sade - Tereyağlı', 'mamul', 'ADET', 34.5, 34.5, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('M-1194', 'Sızma Zeytinyağ 5 Lt', 'hammadde', 'ADET', 1524, 1524, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0002', 'Topping Çilek', 'ticari_mamul', 'ADET', 120, 118, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0003', 'White Chocolate Şurup (6''lı)', 'ticari_mamul', 'ADET', 516.42, 516.42, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0015', 'Siyah Çay 1050 GR', 'ticari_mamul', 'ADET', 360, 290, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0017', 'Balance Çayı (500 Gr)', 'ticari_mamul', 'ADET', 465, 375, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0021', 'IQ Çayı (500 Gr)', 'ticari_mamul', 'ADET', 320, 272.5, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0024', 'Waspco Yer Fıstık ve Kakaolu 30''lu', 'ticari_mamul', 'ADET', 34.2, 34.2, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0025', 'Waspco Hindistan Cevizli 30''lu', 'ticari_mamul', 'ADET', 34.2, 34.2, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0026', 'Waspco Muzlu 30''lu', 'ticari_mamul', 'ADET', 34.2, 34.2, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0027', 'Waspco Fındıklı 30''lu', 'ticari_mamul', 'ADET', 34.2, 34.2, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0028', 'Waspco Antep Fıstıklı 30''lu', 'ticari_mamul', 'ADET', 36.9, 36.9, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0032', 'Karton Massivo (1000 adet)', 'ticari_mamul', 'ADET', 1.75, 1.75, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0036', 'Sıcak kapak 16 oz (1000 adet)', 'ticari_mamul', 'ADET', 0.8, 0.8, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0038', 'Şeffaf Massivo (1000 adet)', 'ticari_mamul', 'ADET', 2.74, 2.74, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0041', 'Düz kapak şeffaf (Fişek İçi 50 adet)', 'ticari_mamul', 'ADET', 0.65, 0.65, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0046', 'Düz Strawless Pipetsiz şeffaf kapak (1000 adet)', 'ticari_mamul', 'ADET', 1.07, 1.07, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0052', 'Tahta Karıştırıcı 14 cm (250 adet)', 'ticari_mamul', 'ADET', 76.25, 72.75, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0063', 'Thermoplan Tablet', 'ticari_mamul', 'ADET', 946.54, 937.67, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0074', 'Önlük', 'ticari_mamul', 'ADET', 1030, 1030, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0077', 'Çöp Poşeti Jumbo (10 adet)', 'ticari_mamul', 'ADET', 474, 474, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0095', 'Krema Tüpü Changer (10 Adet)', 'ticari_mamul', 'ADET', 450, 375, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0109', 'Yarım Yağlı Süt', 'ticari_mamul', 'ADET', 50.85, 43, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0110', 'Tam Yağlı Süt', 'ticari_mamul', 'ADET', 55.72, 46.5, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0125', 'Fındık Aroma Vericisi-1 kg', 'ticari_mamul', 'ADET', 1625, 1436.917, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0131', 'Yoğurt', 'ticari_mamul', 'ADET', 142.73, 115.42, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0137', 'Şanti Sıkma Torbası 72 li', 'ticari_mamul', 'ADET', 99, 99, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0151', 'Laktozsuz Süt', 'ticari_mamul', 'ADET', 51.42, 46.5, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0162', 'Badem Sütü', 'ticari_mamul', 'ADET', 79.65, 79.65, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0163', 'Bunn Filtre Kağıdı 50 cl', 'ticari_mamul', 'ADET', 775, 775, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0214', 'Balance Çayı 250 Gr', 'ticari_mamul', 'ADET', 232, 232, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0215', 'Do & You Çayı 250 Gr', 'ticari_mamul', 'ADET', 246, 246, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0216', 'Mandala Çayı 250 Gr', 'ticari_mamul', 'ADET', 177, 177, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0217', 'Teatox Çayı 500 Gr', 'ticari_mamul', 'ADET', 162, 162, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0218', 'IQ Çayı 250 Gr', 'ticari_mamul', 'ADET', 160, 160, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0221', 'Jigger', 'ticari_mamul', 'ADET', 227.47, 227.47, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0256', '40x40 mm Eko Termal Etiket', 'ticari_mamul', 'ADET', 0.06, 0.055, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0257', 'Yulaf Sütü', 'ticari_mamul', 'ADET', 113.4, 113.4, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0265', 'Sosluk 420 ml', 'ticari_mamul', 'ADET', 65, 61.6, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0322', 'Teatox (500 Gr)', 'ticari_mamul', 'ADET', 324, 212.5, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0323', 'Do & You Çayı (500 Gr)', 'ticari_mamul', 'ADET', 492, 430, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0324', 'Matcha Çayı (250 gr)', 'ticari_mamul', 'ADET', 605, 605, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0331', 'Mandala Çayı (500 Gr)', 'ticari_mamul', 'ADET', 354, 287.5, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0332', 'Forest Berries Çayı (500 Gr)', 'ticari_mamul', 'ADET', 280, 195, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0363', 'Tatlı Kaşık (12li)', 'ticari_mamul', 'ADET', 350, 350, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0364', 'Tatlı Çatal (12li)', 'ticari_mamul', 'ADET', 350, 350, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0366', 'Çay Kaşığı Long (12 li)', 'ticari_mamul', 'ADET', 450, 450, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0419', 'Ovalette Damla Çikolata Bitter 6x2 Kg', 'ticari_mamul', 'KG', 200, 200, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0420', 'Ovalette Damla Çikolata Sütlü 6x2 Kg', 'ticari_mamul', 'KG', 165, 165, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0462', 'Alba Bitkisel Yağ', 'ticari_mamul', 'ADET', 1153, 1030, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0464', 'Forest Berries Çayı (250 Gr)', 'ticari_mamul', 'ADET', 140, 140, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0473', 'Frambuaz Dolgu 6 KG', 'ticari_mamul', 'ADET', 397.5, 300, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0495', 'Karemel Dolgu 7  kg', 'ticari_mamul', 'ADET', 177, 143, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0508', 'Riders Tuzlu Karamelli 50 gr x 24 Adet', 'ticari_mamul', 'ADET', 638.61, 638.61, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0509', 'Riders Kırmızı Meyveli 40 gr x 24 Adet', 'ticari_mamul', 'ADET', 570.3, 570.3, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0510', 'Granio Tiramisu Aromalı 40 gr x 24 Adet', 'ticari_mamul', 'ADET', 427.72, 427.72, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0511', 'Granio Kırmızı Meyveli 40 gr x 24 Adet', 'ticari_mamul', 'ADET', 427.72, 427.72, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0512', 'Riders Macha Limonlu 40 gr x 24 Adet', 'ticari_mamul', 'ADET', 570.3, 570.3, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0513', 'Nio Sütlü Kaplamalı Ballı Muzlu Tahıl Bar 23gr x24', 'ticari_mamul', 'ADET', 168, 168, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0514', 'Nio Sütlü Kaplamalı Kakao Bisk. Tahıl Bar 23gr x24', 'ticari_mamul', 'ADET', 168, 168, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0515', 'Nio Sütlü Karamel Bisküvili Tahıl Bar 23gr x24', 'ticari_mamul', 'ADET', 168, 168, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0518', 'Siyah Biskü. Karamel Pasta Dolgu 7 kg', 'ticari_mamul', 'ADET', 100, 100, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0519', 'Antep Fıstıklı Kadayıflı Dolgu 6 Kg', 'ticari_mamul', 'ADET', 825, 825, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('T-0520', 'Teflon Silpat  30x40', 'ticari_mamul', 'ADET', 95.83, 95.83, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1112', 'Mozzarella Peynir', 'yardimci', 'ADET', 365, 390, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1113', 'Dilimli Burger Peynir', 'yardimci', 'ADET', 405, 405, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1114', 'Çeçil Peynir', 'yardimci', 'ADET', 347, 347, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1119', 'File Badem', 'yardimci', 'KG', 550, 550, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1120', 'Pirinç Fındık', 'yardimci', 'KG', 690, 760, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1122', 'Un 25 Kg', 'yardimci', 'ADET', 816.83, 801.98, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1123', 'Ayçiçek Yağı 5 lt', 'yardimci', 'ADET', 409, 409, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1125', 'Kıtır Soğan 1 kg', 'yardimci', 'ADET', 545, 431, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1129', 'Granül Pasta Şeker Renkli( pasta süsü)', 'yardimci', 'ADET', 110, 110, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1136', 'Vanilya Dolgu', 'yardimci', 'ADET', 120, 96, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1137', 'Karamel Dolgu', 'yardimci', 'ADET', 177, 143, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1138', 'Vişne Meyveli Pasta Dolgu 7 Kg', 'yardimci', 'KG', 256, 95, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1139', 'Frambuaz Aromalı Pasta Dolgu', 'yardimci', 'ADET', 300, 300, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1140', 'Waffle Sos Kakaolu 10 kg', 'yardimci', 'ADET', 2055.35, 1846.27, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1141', 'Blueberry Meyve', 'yardimci', 'KG', 850, 550, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1142', 'Karbonat 1 Kg', 'yardimci', 'ADET', 68.66, 68.66, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1143', 'Taze Peynir 2750Gr', 'yardimci', 'ADET', 700.3, 700.3, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1145', 'Dilimli Kaşar Peyniri 1 kg', 'yardimci', 'ADET', 350, 330, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1149', 'Tapyoka Unu 5 Kg', 'yardimci', 'ADET', 867, 645.85, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1151', 'Fungal Alfa Amilaz Enzimi', 'yardimci', 'ADET', 892, 610.59, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1152', 'Soya Unu Sonic 25 Kg', 'yardimci', 'ADET', 3631, 2961.46, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1153', 'TUZ 3 KG', 'yardimci', 'ADET', 28.86, 28.86, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();
INSERT INTO raw_materials (code, name, category, unit, current_unit_price, last_purchase_price, price_last_updated, is_active, updated_at)
VALUES ('Y-1163', 'Petso Sos 440 Gr', 'yardimci', 'ADET', 429.28, 429.28, NOW(), true, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  current_unit_price = EXCLUDED.current_unit_price,
  last_purchase_price = EXCLUDED.last_purchase_price,
  price_last_updated = NOW(),
  is_active = true,
  updated_at = NOW();

-- Sonuç raporu
DO $$
DECLARE
  total_count INT;
  active_count INT;
  hm_count INT;
  tm_count INT;
  ym_count INT;
  mm_count INT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM raw_materials;
  SELECT COUNT(*) INTO active_count FROM raw_materials WHERE is_active = true;
  SELECT COUNT(*) INTO hm_count FROM raw_materials WHERE category = 'hammadde';
  SELECT COUNT(*) INTO tm_count FROM raw_materials WHERE category = 'ticari_mamul';
  SELECT COUNT(*) INTO ym_count FROM raw_materials WHERE category = 'yardimci';
  SELECT COUNT(*) INTO mm_count FROM raw_materials WHERE category = 'mamul';

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Raw Materials Bulk UPSERT Tamamlandı';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Toplam:  % kayıt', total_count;
  RAISE NOTICE 'Aktif:   % kayıt', active_count;
  RAISE NOTICE 'Hammadde (H-): % kayıt', hm_count;
  RAISE NOTICE 'Ticari (T-):   % kayıt', tm_count;
  RAISE NOTICE 'Yardımcı (Y-): % kayıt', ym_count;
  RAISE NOTICE 'Mamul (M-):    % kayıt', mm_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;