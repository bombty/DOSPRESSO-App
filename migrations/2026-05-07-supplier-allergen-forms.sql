-- ═══════════════════════════════════════════════════════════════════
-- Tedarikçi Alerjen Kontrol Formu Tablosu
-- Form Kodu: 0011.A.FR.GG.36/Rev.1/1.4.2025
-- TGK 26.01.2017/29960 EK-1 uyumlu
-- Aslan'ın PDF formundan sisteme entegre edildi
-- Tarih: 7 May 2026
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS supplier_allergen_forms (
  id SERIAL PRIMARY KEY,
  
  -- Form referansı
  form_code VARCHAR(50) DEFAULT '0011.A.FR.GG.36/Rev.1',
  form_date TIMESTAMP DEFAULT NOW(),
  
  -- Tedarikçi & ürün
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name VARCHAR(255) NOT NULL,
  raw_material_id INTEGER REFERENCES raw_materials(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  
  -- Fabrika bilgileri
  factory_name VARCHAR(255),
  
  -- Form dolduran
  filled_by VARCHAR(255),
  filled_by_title VARCHAR(100),
  contact_phone VARCHAR(30),
  signature_url TEXT,
  
  -- 14 Alerjen × 3 Kolon Matrisi (JSONB)
  allergen_matrix JSONB DEFAULT '{}'::jsonb,
  
  -- 15 Önleyici Faaliyet
  preventive_actions_required BOOLEAN DEFAULT FALSE,
  preventive_actions JSONB DEFAULT '{}'::jsonb,
  
  -- 3 doğrulama sorusu
  label_includes_allergens BOOLEAN,
  label_example_url TEXT,
  spec_includes_allergens BOOLEAN,
  spec_example_url TEXT,
  
  -- Onay
  status VARCHAR(20) DEFAULT 'draft',
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saf_supplier ON supplier_allergen_forms(supplier_id);
CREATE INDEX IF NOT EXISTS idx_saf_raw_material ON supplier_allergen_forms(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_saf_status ON supplier_allergen_forms(status);
CREATE INDEX IF NOT EXISTS idx_saf_form_date ON supplier_allergen_forms(form_date DESC);

COMMENT ON TABLE supplier_allergen_forms IS 
  'Form 0011.A.FR.GG.36/Rev.1 — Tedarikçi Alerjen Kontrol Formu (TGK EK-1)';

-- Doğrulama
SELECT COUNT(*) AS form_table_created FROM supplier_allergen_forms;

COMMIT;
