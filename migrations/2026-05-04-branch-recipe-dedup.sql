-- ─────────────────────────────────────────────────────
-- ŞUBE REÇETE — DUPLICATE TEMİZLİK MIGRATION
-- 4 May 2026 — Aslan onayı
-- ─────────────────────────────────────────────────────
-- SORUN:
--   - branch_products'ta name unique constraint yoktu
--   - Önceki seed (3 May) + template seed (4 May) çakıştı
--   - Sonuç: 30 ürün (15 olması gereken yerde), 58 reçete (29 olması gereken)
--
-- ÇÖZÜM:
--   1. Eski (id daha küçük) kayıtları KORU, yeni (id daha büyük) duplicate'leri SİL
--   2. CASCADE: branch_recipes, branch_recipe_ingredients, branch_recipe_steps,
--      branch_recipe_aroma_compatibility hepsi otomatik temizlenir
--   3. branch_products'a UNIQUE(name) constraint EKLE (gelecek koruma)
--
-- KORUMA:
--   - Sadece duplicate isimler temizlenir
--   - 8 önceki seed (Americano, Latte, Flat White, Cortado, Creamy Latte,
--     Bull Eye, Matcha Latte, Bombty Latte) etkilenmez
--   - 15 template ürünü tek satıra düşürülür

BEGIN;

-- ════════════════════════════════════════
-- 1. DUPLICATE KAYITLARI TESPİT ET (rapor için)
-- ════════════════════════════════════════
-- Aşağıdaki SELECT'ler yorumda — gerçek migration'da UPDATE/DELETE yapılır
--
-- SELECT name, COUNT(*), MIN(id) AS keep_id, ARRAY_AGG(id) AS all_ids
-- FROM branch_products
-- GROUP BY name
-- HAVING COUNT(*) > 1
-- ORDER BY name;

-- ════════════════════════════════════════
-- 2. DUPLICATE branch_products SİL
-- ════════════════════════════════════════
-- En küçük id'yi koruyup, diğer duplicate'leri sil.
-- CASCADE ile branch_recipes (FK'lı), o da branch_recipe_ingredients,
-- branch_recipe_steps, branch_recipe_aroma_compatibility hepsini siler.

DELETE FROM branch_products
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY name ORDER BY id ASC) AS rn
    FROM branch_products
  ) AS dups
  WHERE rn > 1
);

-- ════════════════════════════════════════
-- 3. UNIQUE CONSTRAINT EKLE (gelecek koruma)
-- ════════════════════════════════════════
ALTER TABLE branch_products
  ADD CONSTRAINT bp_name_unique UNIQUE (name);

COMMIT;

-- ════════════════════════════════════════
-- DOĞRULAMA SORGULARI
-- ════════════════════════════════════════
-- 1. Duplicate kontrolü (boş dönmeli)
-- SELECT name, COUNT(*) FROM branch_products GROUP BY name HAVING COUNT(*) > 1;
-- Beklenen: 0 satır
--
-- 2. Toplam ürün sayısı
-- SELECT COUNT(*) FROM branch_products;
-- Beklenen: 23 (8 önceki seed + 15 template)
--
-- 3. Template ürün sayısı
-- SELECT COUNT(*) FROM branch_products WHERE display_order >= 100;
-- Beklenen: 15
--
-- 4. Reçete sayısı
-- SELECT COUNT(*) FROM branch_recipes WHERE is_template = TRUE;
-- Beklenen: 29 (Italian Soda sadece long_diva)
--
-- 5. Aroma uyumluluğu sayısı
-- SELECT COUNT(*) FROM branch_recipe_aroma_compatibility;
-- Beklenen: ~80 (önceki ~250'den ~170 silindi - duplicate FK kaskad)
--
-- 6. UNIQUE constraint kontrolü
-- SELECT conname FROM pg_constraint WHERE conrelid = 'branch_products'::regclass;
-- Beklenen: bp_name_unique mevcut

-- ════════════════════════════════════════
-- ROLLBACK SCRIPT
-- ════════════════════════════════════════
-- BEGIN;
-- ALTER TABLE branch_products DROP CONSTRAINT IF EXISTS bp_name_unique;
-- COMMIT;
-- (Silinmiş kayıtları geri getirmek için 2026-05-04-templates-seed.sql tekrar çalıştır)
