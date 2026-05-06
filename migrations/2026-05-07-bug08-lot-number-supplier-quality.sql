-- ═══════════════════════════════════════════════════════════════════
-- BUG-08 FIX: supplier_quality_records.lot_number kolonu ekle
-- ═══════════════════════════════════════════════════════════════════
--
-- Aslan 7 May 2026 — Replit Agent'ın 6 May 2026 raporuna göre
-- Tedarikçi Kalite QC formunda lot/parti numarası zorunlu alan
-- ama DB'de kolon yoktu. TGK 2017/2284 m.9/k gereği ürün izlenebilirliği
-- için lot numarası kayıt altına alınmalı.
--
-- Idempotent: ON CONFLICT yok (ALTER TABLE) ama IF NOT EXISTS ile
-- tekrar çalıştırılabilir.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE supplier_quality_records
  ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100);

CREATE INDEX IF NOT EXISTS sqr_lot_number_idx
  ON supplier_quality_records(lot_number)
  WHERE lot_number IS NOT NULL;

-- DOĞRULAMA
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'supplier_quality_records'
      AND column_name = 'lot_number'
  ) THEN
    RAISE NOTICE '✅ lot_number kolonu eklendi (supplier_quality_records)';
  ELSE
    RAISE EXCEPTION '❌ lot_number kolonu eklenmedi!';
  END IF;
END $$;
