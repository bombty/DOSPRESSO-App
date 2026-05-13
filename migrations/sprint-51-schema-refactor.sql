-- ═══════════════════════════════════════════════════════════════════
-- Sprint 51 (Aslan 13 May 2026) — Schema Refactor
-- ═══════════════════════════════════════════════════════════════════
-- DOSPRESSO Fabrika Sistemi Yeniden Yapılandırma:
--
-- 1. raw_materials → 4 kategori + stok kolonları (TEK TABLO)
-- 2. factory_products → 7 kategori enum
-- 3. b2b_customers YENİ TABLO (toptan müşteri için)
-- 4. inventory + factory_inventory + branch_inventory DEAKTİF
--    (is_active = false yapılır, 2 hafta gözlem sonra DROP)
-- ═══════════════════════════════════════════════════════════════════

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ 1. raw_materials - YENİ KOLONLAR                                  ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Kategori sistemi (4 ana kategori)
-- Önceki "category" kolonu kullanılıyordu (string), şimdi enum benzeri sabit set
-- NOT: VARCHAR olarak kalır, sadece değerler kısıtlı
ALTER TABLE raw_materials 
  ADD COLUMN IF NOT EXISTS main_category VARCHAR(50);

-- 4 kategori değeri:
--   'hammadde'        → un, şeker, yağ, aroma vb. (üretimde kullanılan)
--   'al_sat'          → toptan alıp doğrudan satılan (üretim yok)
--   'uretim_malzeme'  → ambalaj, etiket, kutu
--   'fabrika_kullanim'→ temizlik, ofis, sarf
COMMENT ON COLUMN raw_materials.main_category IS 
  'Sprint 51: Ana kategori: hammadde, al_sat, uretim_malzeme, fabrika_kullanim';

-- Stok kolonları (raw_materials'ın artık kendi stok takibi var)
ALTER TABLE raw_materials 
  ADD COLUMN IF NOT EXISTS current_stock NUMERIC(12, 3) DEFAULT 0;
ALTER TABLE raw_materials 
  ADD COLUMN IF NOT EXISTS min_stock NUMERIC(12, 3) DEFAULT 0;
ALTER TABLE raw_materials 
  ADD COLUMN IF NOT EXISTS max_stock NUMERIC(12, 3);
ALTER TABLE raw_materials 
  ADD COLUMN IF NOT EXISTS reorder_point NUMERIC(12, 3);
ALTER TABLE raw_materials 
  ADD COLUMN IF NOT EXISTS stock_last_updated TIMESTAMP;
ALTER TABLE raw_materials 
  ADD COLUMN IF NOT EXISTS warehouse_location VARCHAR(100);

-- KDV oranı (al_sat ürünler için satış fiyatı + KDV)
ALTER TABLE raw_materials 
  ADD COLUMN IF NOT EXISTS kdv_rate INTEGER DEFAULT 18;

-- Satış fiyatı (al_sat ürünler için)
ALTER TABLE raw_materials 
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12, 4);

-- İndeks ekle (kategori bazlı sorgular için)
CREATE INDEX IF NOT EXISTS idx_raw_materials_main_category 
  ON raw_materials(main_category);
CREATE INDEX IF NOT EXISTS idx_raw_materials_low_stock 
  ON raw_materials(current_stock, min_stock) 
  WHERE current_stock < min_stock;

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ 2. factory_products - YENİ KATEGORİ                               ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Mevcut "category" kolonu kullanılıyor, sadece değerleri standartlaştır
-- Yeni 7 kategori:
--   'donut'        → DOREO, klasik vb.
--   'kek_pasta'    → kek, pasta
--   'surup'        → vanilya, karamel
--   'tatli'        → diğer tatlılar
--   'tuzlu'        → poğaça, börek vb.
--   'kahve'        → çekirdek, espresso, bean
--   'toz_karisim'  → cappuccino, dondurma karışım
--   'diger'        → diğer

COMMENT ON COLUMN factory_products.category IS 
  'Sprint 51: 7 kategori: donut, kek_pasta, surup, tatli, tuzlu, kahve, toz_karisim, diger';

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ 3. b2b_customers - YENİ TABLO (Toptan müşteri)                    ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS b2b_customers (
  id SERIAL PRIMARY KEY,
  
  -- Temel bilgi
  code VARCHAR(50) UNIQUE NOT NULL,  -- B2B-001, B2B-002...
  name VARCHAR(255) NOT NULL,
  company_type VARCHAR(50),  -- restoran, otel, cafe, market, vb.
  
  -- Vergi bilgisi (Compliance için ŞART)
  tax_number VARCHAR(11),  -- 10-11 haneli
  tax_office VARCHAR(100),
  
  -- İletişim
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  mobile_phone VARCHAR(20),
  
  -- Adres
  address TEXT,
  city VARCHAR(100),
  district VARCHAR(100),
  postal_code VARCHAR(10),
  
  -- Ticari
  credit_limit NUMERIC(12, 2) DEFAULT 0,
  payment_term_days INTEGER DEFAULT 30,  -- 30 gün vade
  discount_rate NUMERIC(5, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'TRY',
  
  -- Durum
  status VARCHAR(20) DEFAULT 'aktif',  -- aktif, pasif, blokeli
  customer_since DATE,
  notes TEXT,
  
  -- Audit
  created_by_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_customers_status ON b2b_customers(status);
CREATE INDEX IF NOT EXISTS idx_b2b_customers_city ON b2b_customers(city);
CREATE INDEX IF NOT EXISTS idx_b2b_customers_code ON b2b_customers(code);

COMMENT ON TABLE b2b_customers IS 
  'Sprint 51: Toptan B2B müşteriler (franchise dışı dış satış kanalı)';

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ 4. ESKİ STOK TABLOLARI - DEAKTİF                                  ║
-- ╚══════════════════════════════════════════════════════════════════╝
-- NOT: Hemen DROP TABLE yapmıyoruz, 2 hafta gözlem.
-- Veriler kaybolmasın, sadece is_active=false (kullanılmıyor) işareti.

-- inventory tablosu
ALTER TABLE inventory 
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMP DEFAULT NULL;
UPDATE inventory 
SET deprecated_at = NOW() 
WHERE deprecated_at IS NULL;

COMMENT ON TABLE inventory IS 
  'DEAKTİF Sprint 51 (Aslan 13 May 2026): raw_materials.current_stock kullanılıyor. 2 hafta sonra DROP.';

-- factory_inventory tablosu
ALTER TABLE factory_inventory 
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMP DEFAULT NULL;
UPDATE factory_inventory 
SET deprecated_at = NOW() 
WHERE deprecated_at IS NULL;

COMMENT ON TABLE factory_inventory IS 
  'DEAKTİF Sprint 51: raw_materials.current_stock kullanılıyor.';

-- branch_inventory tablosu (Aslan: ŞUBE STOĞU SİSTEMİNDE TUTULMAYACAK)
ALTER TABLE branch_inventory 
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMP DEFAULT NULL;
UPDATE branch_inventory 
SET deprecated_at = NOW() 
WHERE deprecated_at IS NULL;

COMMENT ON TABLE branch_inventory IS 
  'DEAKTİF Sprint 51 (Aslan 13 May 2026): Şube stoğu artık sistemde tutulmuyor. 2 hafta sonra DROP.';

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ 5. 185 HAMMADDE - KATEGORI MIGRASYONU                             ║
-- ╚══════════════════════════════════════════════════════════════════╝
-- Mevcut kategorilerden 4 ana kategoriye eşleme.
-- Kalan "hammadde_diger" veya null olanlar Sprint 51.1 AI ile düzeltilir.

UPDATE raw_materials SET main_category = 'hammadde'
WHERE category IN (
  'aroma_verici', 'tatlandirici', 'yag', 'maya_enzim', 
  'un_nisasta', 'mineral', 'sut_yumurta', 'sert_kabuklu',
  'aroma_diger', 'hammadde_diger', 'genel'
);

-- T- ve Y- kodlu olanlar üretim_malzeme veya fabrika_kullanim
UPDATE raw_materials SET main_category = 'uretim_malzeme'
WHERE code LIKE 'T-%' AND main_category IS NULL;

UPDATE raw_materials SET main_category = 'fabrika_kullanim'
WHERE code LIKE 'Y-%' AND main_category IS NULL;

-- Default: kalan hepsi 'hammadde'
UPDATE raw_materials SET main_category = 'hammadde'
WHERE main_category IS NULL;

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ 6. DOĞRULAMA & RAPOR                                              ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Kategori dağılımı kontrolü
DO $$
DECLARE
  total INT;
  hammadde_count INT;
  alsat_count INT;
  uretim_count INT;
  fabrika_count INT;
  uncategorized INT;
BEGIN
  SELECT COUNT(*) INTO total FROM raw_materials WHERE is_active = true;
  SELECT COUNT(*) INTO hammadde_count FROM raw_materials WHERE main_category = 'hammadde' AND is_active = true;
  SELECT COUNT(*) INTO alsat_count FROM raw_materials WHERE main_category = 'al_sat' AND is_active = true;
  SELECT COUNT(*) INTO uretim_count FROM raw_materials WHERE main_category = 'uretim_malzeme' AND is_active = true;
  SELECT COUNT(*) INTO fabrika_count FROM raw_materials WHERE main_category = 'fabrika_kullanim' AND is_active = true;
  SELECT COUNT(*) INTO uncategorized FROM raw_materials WHERE main_category IS NULL AND is_active = true;
  
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE 'Sprint 51 Migration TAMAMLANDI';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE 'TOPLAM aktif hammadde: %', total;
  RAISE NOTICE '  hammadde:         %', hammadde_count;
  RAISE NOTICE '  al_sat:           %', alsat_count;
  RAISE NOTICE '  uretim_malzeme:   %', uretim_count;
  RAISE NOTICE '  fabrika_kullanim: %', fabrika_count;
  RAISE NOTICE '  KATEGORİSİZ:      %', uncategorized;
  RAISE NOTICE '═══════════════════════════════════════════════';
END $$;
