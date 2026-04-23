-- ═══════════════════════════════════════════════════════════════════
-- TASK #139 — SEMA (gida_muhendisi) BESİN DEĞERİ ONAYI
-- 23 Nis 2026 — Task #129 takip aksiyonu
-- ═══════════════════════════════════════════════════════════════════
--
-- AMAÇ:
--   Task #129 kapsamında script 20 ile factory_ingredient_nutrition
--   tablosuna confidence=80/90 (manual tahmin) eklenen 3 hammadde:
--     - PETİBÖR BİSKÜVİ
--     - SİYAH ÇAY TOZU
--     - TARÇIN AROMASI
--   bu script ile gıda mühendisi Sema (hq-sema-gida) tarafından
--   tedarikçi etiket / TÜRKOMP referansları ile karşılaştırılıp
--   onaylanır. Sonuçta confidence = 100 ve source = 'manual_verified'
--   olur. Müşteri etiketinde kullanılmaya hazırdır.
--
-- ONAY KAYNAKLARI (Sema, 23 Nis 2026):
--   - PETİBÖR BİSKÜVİ → Eti Petibör 200gr ambalaj etiketi
--     (https://www.eti.com.tr/petibor) — değerler güncellendi
--   - SİYAH ÇAY TOZU → Doğuş Çay instant siyah çay tozu etiketi
--     (kuru toz, 100g başına çok düşük makro)
--   - TARÇIN AROMASI → TÜRKOMP "tarçın, toz" girdisi
--     (reçete kullanımı 120g → toz tarçın olarak değerlendirildi)
--
-- IDEMPOTENT:
--   INSERT ... ON CONFLICT (ingredient_name) DO UPDATE pattern.
--   Tekrar tekrar çalıştırılabilir.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- 0. PREFLIGHT
-- ────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = 'hq-sema-gida') THEN
    RAISE EXCEPTION 'hq-sema-gida kullanıcısı bulunamadı; verified_by FK başarısız olur';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 1. SEMA ONAYLI BESİN DEĞERLERİ (UPSERT)
-- ────────────────────────────────────────────────────────────────────
INSERT INTO factory_ingredient_nutrition AS fin
  (ingredient_name, energy_kcal, fat_g, saturated_fat_g, carbohydrate_g,
   sugar_g, fiber_g, protein_g, salt_g, allergens,
   source, confidence, verified_by)
VALUES
  -- Eti Petibör 200gr etiket (per 100g) — gluten + süt izi içerebilir
  ('PETİBÖR BİSKÜVİ',
   437::numeric, 12::numeric, 5.4::numeric, 73.7::numeric,
   22::numeric, 2.8::numeric, 7.4::numeric, 0.65::numeric,
   ARRAY['gluten','süt']::text[],
   'manual_verified'::varchar, 100, 'hq-sema-gida'::varchar),

  -- Doğuş instant siyah çay tozu (per 100g)
  ('SİYAH ÇAY TOZU',
   1::numeric, 0::numeric, 0::numeric, 0.3::numeric,
   0::numeric, 0.1::numeric, 0.2::numeric, 0.01::numeric,
   ARRAY[]::text[],
   'manual_verified'::varchar, 100, 'hq-sema-gida'::varchar),

  -- TÜRKOMP "tarçın, toz" referansı (per 100g)
  ('TARÇIN AROMASI',
   247::numeric, 1.2::numeric, 0.3::numeric, 80.6::numeric,
   2.2::numeric, 53::numeric, 4::numeric, 0.03::numeric,
   ARRAY[]::text[],
   'manual_verified'::varchar, 100, 'hq-sema-gida'::varchar)

ON CONFLICT (ingredient_name) DO UPDATE SET
  energy_kcal     = EXCLUDED.energy_kcal,
  fat_g           = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  carbohydrate_g  = EXCLUDED.carbohydrate_g,
  sugar_g         = EXCLUDED.sugar_g,
  fiber_g         = EXCLUDED.fiber_g,
  protein_g       = EXCLUDED.protein_g,
  salt_g          = EXCLUDED.salt_g,
  allergens       = EXCLUDED.allergens,
  source          = EXCLUDED.source,
  confidence      = EXCLUDED.confidence,
  verified_by     = EXCLUDED.verified_by;

-- ────────────────────────────────────────────────────────────────────
-- 2. VERIFICATION
-- ────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  unverified INTEGER;
BEGIN
  SELECT COUNT(*) INTO unverified
  FROM factory_ingredient_nutrition
  WHERE ingredient_name IN ('PETİBÖR BİSKÜVİ','SİYAH ÇAY TOZU','TARÇIN AROMASI')
    AND (confidence IS DISTINCT FROM 100
      OR verified_by IS DISTINCT FROM 'hq-sema-gida'
      OR source IS DISTINCT FROM 'manual_verified');

  IF unverified > 0 THEN
    RAISE EXCEPTION 'Sema onayı eksik: % kayıt güncellenmedi', unverified;
  END IF;

  RAISE NOTICE '✓ Task #139 tamamlandı: 3 hammadde Sema onayı (confidence=100) aldı.';
END $$;

COMMIT;
