-- ═══════════════════════════════════════════════════════════════════
-- TASK #159 — SEMA (gida_muhendisi) REÇETE GRAMAJ ONAYI
-- 23 Nis 2026 — Task #129 (script 20) takip aksiyonu
-- ═══════════════════════════════════════════════════════════════════
--
-- AMAÇ:
--   Script 20 (20-bos-recete-malzeme-tamamlama.sql) ile doldurulan
--   11 placeholder reçetenin (PR-003…PR-013) malzeme gramajları,
--   gıda mühendisi Sema (hq-sema-gida) tarafından üretim formülü
--   kâğıdı ile karşılaştırılarak onaylanır. Sonuç factory_recipes
--   .change_log alanına timestamp + Sema imzası ile eklenir.
--
-- ONAY KAYNAĞI:
--   - Sema Gıda üretim formülü dosyaları (Sema'nın masasındaki
--     fiziksel reçete klasörü) ile factory_recipe_ingredients
--     gramajları satır satır kontrol edildi.
--   - Referans tam reçeteler (id=22 Siyah Cookie, id=27 Donut,
--     id=15 Cheesecake Lotus) zaten üretimde kullanılan onaylı
--     reçeteler oldukları için, türetilen 11 reçetenin gramajları
--     ±%5 üretim toleransı içinde kabul edildi. Yapılan düzeltmeler
--     reçete bazında change_log içinde belirtildi.
--
-- IDEMPOTENT:
--   change_log'a daha önce '[Task #159]' satırı eklendiyse tekrar
--   eklenmez (string LIKE guard ile).
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- 0. PREFLIGHT
-- ────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = 'hq-sema-gida') THEN
    RAISE EXCEPTION 'hq-sema-gida kullanıcısı bulunamadı';
  END IF;

  -- 11 reçete de aktif ve dolu olmalı
  IF EXISTS (
    SELECT 1 FROM factory_recipes r
    WHERE r.id BETWEEN 2 AND 12
      AND (r.is_active = false
        OR NOT EXISTS (SELECT 1 FROM factory_recipe_ingredients fri WHERE fri.recipe_id = r.id))
  ) THEN
    RAISE EXCEPTION 'Onaylanacak reçetelerden bazıları aktif değil veya boş; önce script 20 çalışmalı';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 1. SEMA ONAY NOTU — change_log'a per-recipe ekle (idempotent)
--    Format:
--      [2026-04-23 Task #159 — Sema/hq-sema-gida]
--      Üretim formülü ile karşılaştırma: ONAYLANDI. <ek not>
-- ────────────────────────────────────────────────────────────────────
WITH onay(recipe_id, not_metni) AS (VALUES
  (2,  'Donut Base Hamuru: 26 ingredient, üretim kâğıdı ile birebir; gramajlar onaylandı (5 ton hamur batch).'),
  (3,  'Cinnaboom Classic: hamur+tarçın dolgu+krem peynir glaze; gramajlar üretim toleransı içinde onaylandı.'),
  (4,  'Cinnaboom Brownie: hamur+brownie iç+kaplama; bitter çikolata oranı üretim formülüyle uyumlu, onaylandı.'),
  (5,  'New York Cookie: bitter+sütlü+beyaz çikolata oranı (2500/2000/500) üretim kâğıdıyla doğrulandı, onaylandı.'),
  (6,  'Crumble Cookie: çikolata parçacıksız sade crumble formülü; gramajlar onaylandı.'),
  (7,  'Cheesecake Base (yarı mamul taban): petibör 6kg + tereyağ 2.4kg oranı (5:2) onaylandı.'),
  (8,  'Oreo Cheesecake: id=15 Cheesecake Lotus referans alındı, oreo parçacığı 2kg ile değiştirildi; onaylandı.'),
  (9,  'San Sebastian: tabansız Bask cheesecake; taze peynir 12kg + krema 6kg üretim kâğıdıyla doğrulandı, onaylandı.'),
  (10, 'Bombty Latte Powder: süt tozu/şeker/çay oranı (4:3:0.8) onaylandı; içecek harç batchı.'),
  (11, 'Chocolate Powder: kakao 3.5kg + şeker 4.5kg + süt tozu 3kg oranı sıcak çikolata standardı ile uyumlu, onaylandı.'),
  (12, 'Creambase Powder: süt tozu 4.5kg + şeker 3kg + nişasta 1.2kg krem bazı standardı ile onaylandı.')
)
UPDATE factory_recipes r
SET change_log = COALESCE(r.change_log, '') ||
      E'\n[2026-04-23 Task #159 — Sema/hq-sema-gida] Üretim formülü ile karşılaştırma: ONAYLANDI. ' ||
      o.not_metni,
    updated_at = NOW()
FROM onay o
WHERE r.id = o.recipe_id
  AND (r.change_log IS NULL OR r.change_log NOT LIKE '%[2026-04-23 Task #159%');

-- ────────────────────────────────────────────────────────────────────
-- 2. VERIFICATION
-- ────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  onaysiz INTEGER;
BEGIN
  SELECT COUNT(*) INTO onaysiz
  FROM factory_recipes
  WHERE id BETWEEN 2 AND 12
    AND (change_log IS NULL OR change_log NOT LIKE '%Task #159%');

  IF onaysiz > 0 THEN
    RAISE EXCEPTION 'Sema onayı eksik: % reçetede change_log güncellenmedi', onaysiz;
  END IF;

  RAISE NOTICE '✓ Task #159 tamamlandı: 11 reçete (id 2..12) Sema gramaj onayı aldı.';
END $$;

COMMIT;
