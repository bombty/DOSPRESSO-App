-- ═══════════════════════════════════════════════════════════════════
-- Sprint 14 Phase 12 — TGK 2017/2284 Madde 9/k Uyumu
-- ═══════════════════════════════════════════════════════════════════
--
-- Tarih: 7 May 2026
-- Sahibi: Claude (gece marathon Faz 3 — Etiket Motoru)
-- Bağlam: Sprint 12 P-19 audit'inde tespit edilen kritik eksiklik:
--   "TGK 2017/2284 Madde 9/k — Lot/Parti numarası zorunlu, mevcut sistemde EKSİK"
--
-- Etki:
--   - tgk_labels tablosuna 6 yeni alan: lot_number, batch_number,
--     production_date, expiry_date, production_run_id, factory_recipe_id
--   - 2 yeni index: lot_number, production_date
--   - Backward-compatible: NULL alanlar mevcut kayıtlar için
--
-- Yetki gereken roller (manual run için):
--   - admin / ceo / cgo / gida_muhendisi
--
-- Backup öncesi:
--   pg_dump --schema-only > schema-backup.sql
--   pg_dump --data-only -t tgk_labels > tgk_labels-data.sql
--
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1) Yeni alanları ekle (idempotent - zaten varsa ekleme)
ALTER TABLE tgk_labels
  ADD COLUMN IF NOT EXISTS lot_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS production_date DATE,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS production_run_id INTEGER,
  ADD COLUMN IF NOT EXISTS factory_recipe_id INTEGER;

-- 2) Index ekle (lot bazlı arama hızlı olsun, forensic traceability için)
CREATE INDEX IF NOT EXISTS tgk_labels_lot_idx ON tgk_labels (lot_number);
CREATE INDEX IF NOT EXISTS tgk_labels_production_date_idx ON tgk_labels (production_date);

-- 3) Comment'ler (DBA'ler için TGK referansı)
COMMENT ON COLUMN tgk_labels.lot_number IS 'TGK 2017/2284 Madde 9/k — Lot/Parti numarası (zorunlu). Format örnek: L-2026-W19-001';
COMMENT ON COLUMN tgk_labels.batch_number IS 'Fabrika üretim batch numarası (factoryProductionRuns.batchNumber ile eşleşir)';
COMMENT ON COLUMN tgk_labels.production_date IS 'Üretim tarihi (YYYY-MM-DD). Etiket üzerinde TGK m.9/h uyarınca zorunlu olabilir.';
COMMENT ON COLUMN tgk_labels.expiry_date IS 'Son tüketim tarihi (TGK m.9/i — son tüketim/kullanım tarihi zorunlu)';
COMMENT ON COLUMN tgk_labels.production_run_id IS 'factoryProductionRuns.id — forensic traceability için';
COMMENT ON COLUMN tgk_labels.factory_recipe_id IS 'Bu etiket hangi factoryRecipes\'tan üretildi (geri çağırma için)';

-- 4) Audit log (KVKK + ISO 22000)
INSERT INTO audit_logs (
  event_type,
  action,
  entity_type,
  details,
  scope_type,
  created_at
) VALUES (
  'compliance.tgk',
  'schema_migration.lot_fields',
  'tgk_labels',
  jsonb_build_object(
    'description', 'Sprint 14 Phase 12 — TGK m.9/k Lot/Parti uyum migration',
    'columns_added', ARRAY['lot_number', 'batch_number', 'production_date', 'expiry_date', 'production_run_id', 'factory_recipe_id'],
    'compliance_ref', 'TGK 2017/2284 Madde 9/k',
    'p_19_audit_finding', 'closed',
    'sprint', 'Sprint 14 Phase 12',
    'execution_date', CURRENT_DATE
  ),
  'system',
  NOW()
) ON CONFLICT DO NOTHING;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- POST_CHECK (manuel doğrulama)
-- ═══════════════════════════════════════════════════════════════════
--
-- 1) Sütunlar var mı?
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'tgk_labels' AND column_name IN
--   ('lot_number', 'batch_number', 'production_date', 'expiry_date', 'production_run_id', 'factory_recipe_id');
-- Beklenen: 6 satır
--
-- 2) Indexler oluştu mu?
-- SELECT indexname FROM pg_indexes WHERE tablename = 'tgk_labels'
-- AND indexname IN ('tgk_labels_lot_idx', 'tgk_labels_production_date_idx');
-- Beklenen: 2 satır
--
-- 3) Audit log kaydı?
-- SELECT id, event_type, action, created_at FROM audit_logs
-- WHERE event_type = 'compliance.tgk' AND action = 'schema_migration.lot_fields'
-- ORDER BY created_at DESC LIMIT 1;
-- Beklenen: 1 satır
--
-- 4) Backward compat: mevcut etiket sayımı değişmedi mi?
-- SELECT COUNT(*) FROM tgk_labels;
-- Beklenen: migration öncesi sayıyla aynı
--
-- ═══════════════════════════════════════════════════════════════════
