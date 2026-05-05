-- ═══════════════════════════════════════════════════════════════════
-- SPRINT 8a — score_parameters DDL (6 May 2026)
-- ═══════════════════════════════════════════════════════════════════
-- 
-- AMAÇ:
--   Sprint 8 ana migration'ı (2026-05-05-sprint-8-data-cleanup-personnel-sync.sql)
--   ADIM 5'te INSERT INTO score_parameters yapıyor, AMA tablo yok.
--   
--   Sebep: shared/schema/schema-25-score-parameters.ts schema definition
--   var ama drizzle-kit push timeout veriyor (replit.md doğruluyor),
--   o yüzden manuel CREATE TABLE migration gerekiyor.
-- 
-- BU MIGRATION:
--   - score_parameters tablosu (Drizzle schema-25 ile birebir)
--   - score_parameter_history tablosu (audit log)
--   - Index ve FK
--   - IF NOT EXISTS ile idempotent (zarar yok)
-- 
-- SIRASI:
--   1. Bu migration ÖNCE çalıştırılır (DDL)
--   2. Sonra position_salaries Lara seed (paralel)
--   3. Sonra Sprint 8 ana migration (DRY-RUN sonra GO)
-- 
-- KAYNAK: shared/schema/schema-25-score-parameters.ts (D-29 schema-first)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- 1. score_parameters — Skor kriterleri ana tablosu
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS score_parameters (
  id SERIAL PRIMARY KEY,
  
  -- Kategori
  category VARCHAR(50) NOT NULL,
  
  -- Görüntüleme
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Ağırlık ve formül
  max_points INTEGER NOT NULL,
  weight NUMERIC(5,2) DEFAULT 1.0,
  formula TEXT,
  formula_code VARCHAR(50),
  
  -- Min/max threshold
  min_threshold INTEGER DEFAULT 0,
  max_threshold INTEGER DEFAULT 100,
  
  -- Versiyon ve durum
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMP DEFAULT NOW(),
  effective_to TIMESTAMP,
  
  -- Sıralama (UI'da)
  sort_order INTEGER DEFAULT 0,
  
  -- Hangi rollere uygulanır (null = hepsine)
  applicable_roles TEXT,
  
  -- Audit
  created_by_id VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_score_parameters_active 
  ON score_parameters(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_score_parameters_category 
  ON score_parameters(category);

CREATE INDEX IF NOT EXISTS idx_score_parameters_sort_order 
  ON score_parameters(sort_order);

-- ═══════════════════════════════════════════════════════════════════
-- 2. score_parameter_history — Değişiklik geçmişi (audit)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS score_parameter_history (
  id SERIAL PRIMARY KEY,
  parameter_id INTEGER REFERENCES score_parameters(id) ON DELETE CASCADE,
  
  change_type VARCHAR(20),
  old_values TEXT,
  new_values TEXT,
  reason TEXT,
  
  changed_by_id VARCHAR REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_score_parameter_history_param_id 
  ON score_parameter_history(parameter_id);

CREATE INDEX IF NOT EXISTS idx_score_parameter_history_changed_at 
  ON score_parameter_history(changed_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- 3. Doğrulama
-- ═══════════════════════════════════════════════════════════════════

-- score_parameters tablo ve kolon sayısı
SELECT 'DDL_VERIFY_SCORE_PARAMETERS' as report,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'score_parameters') as column_count,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_name = 'score_parameters') as table_exists;

-- score_parameter_history tablo
SELECT 'DDL_VERIFY_SCORE_PARAMETER_HISTORY' as report,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'score_parameter_history') as column_count,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_name = 'score_parameter_history') as table_exists;

-- Index'ler oluştu mu?
SELECT 'DDL_VERIFY_INDEXES' as report,
  COUNT(*) as index_count
FROM pg_indexes 
WHERE tablename IN ('score_parameters', 'score_parameter_history');

-- Beklenen:
--   score_parameters: column_count=18, table_exists=1
--   score_parameter_history: column_count=8, table_exists=1
--   indexes: 5+ (3 score_parameters + 2 score_parameter_history)

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- SONRAKI ADIM:
--   Bu migration BAŞARILI olduktan sonra:
--   1. migrations/2026-05-06-position-salaries-lara-seed.sql çalıştırılır
--   2. migrations/2026-05-05-sprint-8-data-cleanup-personnel-sync.sql 
--      DRY-RUN sonra GO ile çalıştırılır
-- ═══════════════════════════════════════════════════════════════════
