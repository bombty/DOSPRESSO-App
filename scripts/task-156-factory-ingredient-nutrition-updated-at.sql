-- Task #156: factory_ingredient_nutrition.updated_at drift fix
-- Schema'da tanımlı updated_at kolonu üretim DB'sinde yoktu. Onaylı besin
-- değerleri için /kalite/alerjen sayfasındaki "son güncelleme" tarihi yanlış
-- (created_at) gösteriyordu.
--
-- Migration sırası KRİTİK:
--   1) Kolonu NULLABLE ekle (default yok) — yeni kolon mevcut satırlarda NULL.
--   2) Eski satırları created_at ile backfill et — geçmiş baseline doğru olur.
--   3) DEFAULT NOW() + NOT NULL kısıtlarını uygula.
--   4) BEFORE UPDATE trigger ile sonraki UPDATE'lerde otomatik tazele.

ALTER TABLE factory_ingredient_nutrition
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;

UPDATE factory_ingredient_nutrition
   SET updated_at = created_at
 WHERE updated_at IS NULL;

ALTER TABLE factory_ingredient_nutrition
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION factory_ingredient_nutrition_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_factory_ingredient_nutrition_updated_at
  ON factory_ingredient_nutrition;

CREATE TRIGGER trg_factory_ingredient_nutrition_updated_at
BEFORE UPDATE ON factory_ingredient_nutrition
FOR EACH ROW EXECUTE FUNCTION factory_ingredient_nutrition_set_updated_at();
