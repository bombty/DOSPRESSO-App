-- ═══════════════════════════════════════════════════════════════════
-- Sprint 7 (5 May 2026) — Girdi Yönetimi / TGK 2017/2284 Uyumu
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Aslan'ın talebi: Tam TGK uyumlu hammadde yönetimi
--   - Etiket oluşturma (besin değeri + alerjen)
--   - Tedarikçi performans takibi
--   - Numbers dosyasındaki 67 girdi import'u
-- 
-- Yetki: admin, ceo, satinalma, gida_muhendisi
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1) raw_materials tablosuna TGK uyum alanları ekle
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE raw_materials 
  ADD COLUMN IF NOT EXISTS brand VARCHAR(255),
  ADD COLUMN IF NOT EXISTS material_group VARCHAR(100), -- 'süt ve süt ürünleri', 'un ve tahıl', 'şeker' vs.
  ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(100), -- Tedarikçi kendi kodu (TR-42-K-002701 gibi)
  
  -- TGK 2017/2284 zorunlu içerik bilgisi
  ADD COLUMN IF NOT EXISTS content_info TEXT, -- Detaylı içerik listesi (E-numaraları, %ler dahil)
  
  -- Alerjen bilgisi (TGK Madde 9)
  ADD COLUMN IF NOT EXISTS allergen_present BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_detail TEXT,
  ADD COLUMN IF NOT EXISTS cross_contamination TEXT, -- Çapraz bulaşma uyarısı
  
  -- Saklama ve kullanım
  ADD COLUMN IF NOT EXISTS storage_conditions TEXT,
  ADD COLUMN IF NOT EXISTS usage_info TEXT,
  
  -- Besin değerleri (100g/100ml başına) — TGK Ek-13
  ADD COLUMN IF NOT EXISTS energy_kcal NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS energy_kj NUMERIC(10, 2), -- Otomatik = kcal * 4.184
  ADD COLUMN IF NOT EXISTS fat NUMERIC(10, 3),
  ADD COLUMN IF NOT EXISTS saturated_fat NUMERIC(10, 3),
  ADD COLUMN IF NOT EXISTS carbohydrate NUMERIC(10, 3),
  ADD COLUMN IF NOT EXISTS sugar NUMERIC(10, 3),
  ADD COLUMN IF NOT EXISTS protein NUMERIC(10, 3),
  ADD COLUMN IF NOT EXISTS salt NUMERIC(10, 3),
  ADD COLUMN IF NOT EXISTS fiber NUMERIC(10, 3), -- Lif (opsiyonel TGK)
  
  -- TGK uyum durumu
  ADD COLUMN IF NOT EXISTS tgk_compliant BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tgk_verified_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS tgk_verified_by_id VARCHAR REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS tgk_notes TEXT,
  
  -- Belge yönetimi
  ADD COLUMN IF NOT EXISTS spec_document_url TEXT, -- Spesifikasyon belgesi (PDF)
  ADD COLUMN IF NOT EXISTS analysis_certificate_url TEXT, -- Analiz raporu
  ADD COLUMN IF NOT EXISTS halal_certificate_url TEXT, -- Helal sertifika
  
  -- Pilot eklenecek diğerleri
  ADD COLUMN IF NOT EXISTS expiry_days INTEGER, -- Açıldıktan sonra raf ömrü (gün)
  ADD COLUMN IF NOT EXISTS minimum_shelf_life_days INTEGER, -- Tedarikten sonra minimum SKT (gün)
  ADD COLUMN IF NOT EXISTS country_of_origin VARCHAR(100); -- Menşei

-- ─────────────────────────────────────────────────────────────────
-- 2) Tedarikçi performans takibi — yeni tablo
-- ─────────────────────────────────────────────────────────────────
-- (mevcut suppliers tablosundaki performance_score'u detaylandırır)

CREATE TABLE IF NOT EXISTS supplier_quality_records (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  raw_material_id INTEGER REFERENCES raw_materials(id) ON DELETE SET NULL,
  
  -- Giriş kaydı
  delivery_date DATE NOT NULL,
  invoice_number VARCHAR(100),
  delivered_quantity NUMERIC(12, 3),
  unit VARCHAR(20),
  
  -- Kalite kontrol
  inspection_status VARCHAR(30) NOT NULL, -- 'kabul', 'şartlı_kabul', 'red'
  non_conformity TEXT, -- Uygunsuzluk açıklaması
  rejection_reason TEXT, -- Red sebebi
  corrective_action TEXT, -- Düzeltici işlem
  
  -- İlişkiler
  inspected_by_id VARCHAR REFERENCES users(id),
  approved_by_id VARCHAR REFERENCES users(id),
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sqr_supplier_idx ON supplier_quality_records (supplier_id);
CREATE INDEX IF NOT EXISTS sqr_material_idx ON supplier_quality_records (raw_material_id);
CREATE INDEX IF NOT EXISTS sqr_date_idx ON supplier_quality_records (delivery_date);
CREATE INDEX IF NOT EXISTS sqr_status_idx ON supplier_quality_records (inspection_status);

-- ─────────────────────────────────────────────────────────────────
-- 3) Etiket önizleme/üretim tablosu
-- ─────────────────────────────────────────────────────────────────
-- TGK 2017/2284 uyumlu etiket: ürün → reçete → toplam besin değeri → etiket

CREATE TABLE IF NOT EXISTS tgk_labels (
  id SERIAL PRIMARY KEY,
  
  -- Etiket sahibi
  product_id INTEGER, -- branch_products veya factory_products id
  product_type VARCHAR(20), -- 'branch_product' | 'factory_product'
  product_name VARCHAR(255) NOT NULL,
  
  -- Etiket içeriği (TGK Madde 9 zorunlu alanlar)
  ingredients_text TEXT, -- Hesaplanmış içerik listesi
  allergen_warning TEXT, -- Alerjen uyarısı
  cross_contamination_warning TEXT,
  
  -- Net miktar
  net_quantity_g NUMERIC(10, 2),
  serving_size_g NUMERIC(10, 2),
  
  -- Besin değerleri (100g başına)
  energy_kcal NUMERIC(10, 2),
  energy_kj NUMERIC(10, 2),
  fat NUMERIC(10, 3),
  saturated_fat NUMERIC(10, 3),
  carbohydrate NUMERIC(10, 3),
  sugar NUMERIC(10, 3),
  protein NUMERIC(10, 3),
  salt NUMERIC(10, 3),
  fiber NUMERIC(10, 3),
  
  -- Saklama ve son kullanma
  storage_conditions TEXT,
  shelf_life_days INTEGER,
  best_before_date DATE,
  
  -- Üretici bilgisi
  manufacturer_name VARCHAR(255) DEFAULT 'DOSPRESSO Coffee & Donut',
  manufacturer_address TEXT DEFAULT 'Antalya, Türkiye',
  
  -- Onay zinciri
  status VARCHAR(30) DEFAULT 'taslak', -- 'taslak' | 'onay_bekliyor' | 'onaylandi' | 'reddedildi'
  created_by_id VARCHAR REFERENCES users(id),
  approved_by_id VARCHAR REFERENCES users(id), -- Gıda mühendisi onayı
  approved_at TIMESTAMP,
  rejected_reason TEXT,
  
  -- Versiyon
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tgk_labels_product_idx ON tgk_labels (product_id, product_type);
CREATE INDEX IF NOT EXISTS tgk_labels_status_idx ON tgk_labels (status);

-- ─────────────────────────────────────────────────────────────────
-- 4) suppliers tablosuna ek alanlar (gıda mevzuat)
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS food_authorization_number VARCHAR(100), -- Gıda işletme onay no (TR-XX-K-XXXXXX)
  ADD COLUMN IF NOT EXISTS authorization_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS iso_22000_certified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS haccp_certified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS halal_certified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_audit_date DATE,
  ADD COLUMN IF NOT EXISTS audit_score NUMERIC(5, 2);

-- ═══════════════════════════════════════════════════════════════════
-- KONTROL SORGULARI
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Migration sonrası DRY-RUN doğrulama için:
-- 
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'raw_materials' AND column_name LIKE '%allergen%';
--
-- SELECT count(*) FROM supplier_quality_records;
-- SELECT count(*) FROM tgk_labels;
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 5) TÜRKOMP cache tablosu (Sprint 7 v2)
-- Türkiye Tarım ve Orman Bakanlığı resmi gıda veri tabanı
-- ⚠️ Ticari kullanım için TÜRKOMP'tan ücretli lisans alınmalıdır
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS turkomp_foods (
  id SERIAL PRIMARY KEY,
  
  turkomp_id INTEGER NOT NULL UNIQUE,
  turkomp_code VARCHAR(20),
  slug VARCHAR(200),
  
  name VARCHAR(255) NOT NULL,
  scientific_name VARCHAR(255),
  food_group VARCHAR(100),
  langual_code TEXT,
  
  nitrogen_factor NUMERIC(6, 4),
  fat_conversion_factor NUMERIC(6, 4),
  
  energy_kcal NUMERIC(10, 2),
  energy_kj NUMERIC(10, 2),
  water NUMERIC(10, 3),
  protein NUMERIC(10, 3),
  fat NUMERIC(10, 3),
  saturated_fat NUMERIC(10, 3),
  carbohydrate NUMERIC(10, 3),
  sugar NUMERIC(10, 3),
  fiber NUMERIC(10, 3),
  salt NUMERIC(10, 3),
  sodium NUMERIC(10, 3),
  
  all_components JSONB,
  
  source VARCHAR(50) DEFAULT 'turkomp',
  fetched_at TIMESTAMP DEFAULT NOW(),
  fetched_by_id VARCHAR REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS turkomp_id_idx ON turkomp_foods (turkomp_id);
CREATE INDEX IF NOT EXISTS turkomp_name_idx ON turkomp_foods (name);
CREATE INDEX IF NOT EXISTS turkomp_code_idx ON turkomp_foods (turkomp_code);
CREATE INDEX IF NOT EXISTS turkomp_group_idx ON turkomp_foods (food_group);

-- raw_materials TÜRKOMP referansı
ALTER TABLE raw_materials
  ADD COLUMN IF NOT EXISTS turkomp_food_id INTEGER REFERENCES turkomp_foods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nutrition_source VARCHAR(30) DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS rm_turkomp_idx ON raw_materials (turkomp_food_id);
