-- =====================================================================
-- Migration: TGK 2017/2284 Uyum — factory_recipes 4 yeni kolon
-- Tarih: 4 Mayıs 2026
-- Kaynak: docs/audit/FABRIKA-AUDIT-4-MAYIS-2026.md (KONU 2)
-- Branch: claude/fabrika-p1-pilot-2026-05-04 (commit b2e4124)
--
-- KAPSAM:
--   1. storage_conditions   → Saklama koşulları (TGK Mad. 9/g) — YASAL ZORUNLU
--   2. manufacturer_info    → Üretici/distribütör bilgisi (TGK Mad. 9/h) — YASAL ZORUNLU
--   3. may_contain_allergens → Çapraz bulaşma uyarısı (TGK Mad. 24/3) — GÜÇLÜ ÖNERİ
--   4. shelf_life_days      → Raf ömrü (SKT matematiksel temel)
--
-- ROLLBACK: Aşağıda DOWN bölümü hazır.
-- DRY-RUN: psql --single-transaction --set ON_ERROR_STOP=on
-- =====================================================================

BEGIN;

-- Idempotent — yeniden çalıştırılırsa hata vermez
ALTER TABLE factory_recipes
  ADD COLUMN IF NOT EXISTS storage_conditions    TEXT,
  ADD COLUMN IF NOT EXISTS manufacturer_info     TEXT,
  ADD COLUMN IF NOT EXISTS may_contain_allergens TEXT[],
  ADD COLUMN IF NOT EXISTS shelf_life_days       INTEGER;

-- Kolon yorumları (TGK referans)
COMMENT ON COLUMN factory_recipes.storage_conditions    IS 'TGK 2017/2284 Mad. 9/g — Saklama koşulları (zorunlu)';
COMMENT ON COLUMN factory_recipes.manufacturer_info     IS 'TGK 2017/2284 Mad. 9/h — Üretici/distribütör adı ve adresi (zorunlu)';
COMMENT ON COLUMN factory_recipes.may_contain_allergens IS 'TGK 2017/2284 Mad. 24/3 — Çapraz bulaşma uyarısı (öneri)';
COMMENT ON COLUMN factory_recipes.shelf_life_days       IS 'Raf ömrü (gün) — SKT hesaplama temeli';

-- Doğrulama: 4 kolon eklendi mi?
DO $$
DECLARE
  eklenen INTEGER;
BEGIN
  SELECT COUNT(*) INTO eklenen
  FROM information_schema.columns
  WHERE table_name = 'factory_recipes'
    AND column_name IN ('storage_conditions','manufacturer_info','may_contain_allergens','shelf_life_days');

  IF eklenen <> 4 THEN
    RAISE EXCEPTION 'Migration başarısız: bekleniyordu 4 kolon, bulundu %', eklenen;
  END IF;

  RAISE NOTICE 'OK: % yeni kolon factory_recipes tablosuna eklendi', eklenen;
END $$;

COMMIT;

-- =====================================================================
-- ROLLBACK (gerekirse manuel olarak çalıştır)
-- =====================================================================
-- BEGIN;
-- ALTER TABLE factory_recipes
--   DROP COLUMN IF EXISTS storage_conditions,
--   DROP COLUMN IF EXISTS manufacturer_info,
--   DROP COLUMN IF EXISTS may_contain_allergens,
--   DROP COLUMN IF EXISTS shelf_life_days;
-- COMMIT;
