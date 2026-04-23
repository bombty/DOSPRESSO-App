-- ═══════════════════════════════════════════════════════════════════
-- 11 REÇETE AĞIRLIK ALANI TAMAMLAMA (Task #137 — Adım 1/2)
-- 23 Nis 2026 - Task #129 takip aksiyonu
-- ═══════════════════════════════════════════════════════════════════
--
-- AMAÇ:
--   Task #129 ile 11 placeholder reçeteye (id 2..12) malzeme listesi
--   eklendi, ancak factory_recipes tablosundaki ağırlık alanları
--   (total_weight_grams, expected_unit_weight) boş bırakılmıştı.
--
--   Bu script SADECE ağırlık alanlarını günceller. Maliyet alanları
--   (raw_material_cost / total_batch_cost / unit_cost) için Adım 2:
--       npx tsx scripts/pilot/21b-recete-maliyet-backfill.ts
--   çalıştırılmalıdır (canonical lineCost + keyblend ağacı semantiği
--   server/scripts/recalculate-recipe-prices.ts ile bire bir aynı).
--
-- HARD ASSERTION:
--   11 reçetenin tamamında ağırlık alanları NOT NULL olmalı.
--
-- IDEMPOTENT:
--   Sadece NULL olan alanlar yazılır. Re-run güvenli.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────
-- 0. PRE-FLIGHT: Tüm malzemeler 'g' birim olmalı
-- ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  bad_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM factory_recipe_ingredients
  WHERE recipe_id BETWEEN 2 AND 12
    AND LOWER(unit) NOT IN ('g', 'gr', 'gram');
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Beklenmeyen birim: 11 reçete malzemeleri arasında % adet g/gr olmayan satır var', bad_count;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 1. AĞIRLIK ALANLARI
--    total_weight_grams VEYA expected_unit_weight NULL ise update.
-- ─────────────────────────────────────────────────────────────────
UPDATE factory_recipes fr
SET
  total_weight_grams = sub.total_g::integer,
  expected_unit_weight = ROUND(sub.total_g / NULLIF(fr.base_batch_output, 0)::numeric, 3),
  updated_at = NOW(),
  change_log = COALESCE(fr.change_log, '') ||
    E'\n[2026-04-23 Task #137] total_weight_grams=' || sub.total_g::text ||
    'g, expected_unit_weight=' ||
    ROUND(sub.total_g / NULLIF(fr.base_batch_output, 0)::numeric, 3)::text ||
    'g hesaplandı (malzeme toplamı / base_batch_output).'
FROM (
  SELECT recipe_id, SUM(amount) AS total_g
  FROM factory_recipe_ingredients
  WHERE recipe_id BETWEEN 2 AND 12
  GROUP BY recipe_id
) sub
WHERE fr.id = sub.recipe_id
  AND fr.id BETWEEN 2 AND 12
  AND (fr.total_weight_grams IS NULL OR fr.expected_unit_weight IS NULL);

-- ─────────────────────────────────────────────────────────────────
-- 2. HARD ASSERTION
-- ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  weight_ok INTEGER;
  missing_ids TEXT;
BEGIN
  SELECT COUNT(*) INTO weight_ok
  FROM factory_recipes
  WHERE id BETWEEN 2 AND 12
    AND total_weight_grams IS NOT NULL
    AND expected_unit_weight IS NOT NULL;

  IF weight_ok <> 11 THEN
    SELECT string_agg(id::text, ',' ORDER BY id) INTO missing_ids
    FROM factory_recipes
    WHERE id BETWEEN 2 AND 12
      AND (total_weight_grams IS NULL OR expected_unit_weight IS NULL);
    RAISE EXCEPTION 'Task #137 ağırlık eksik: %/11 reçete dolu (eksik id: %)', weight_ok, missing_ids;
  END IF;

  RAISE NOTICE '✓ Task #137 Adım 1: 11/11 reçete için ağırlık alanları dolu. Şimdi 21b TS script çalıştırın.';
END $$;

COMMIT;
