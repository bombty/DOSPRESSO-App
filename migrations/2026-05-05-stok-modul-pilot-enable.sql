-- ═══════════════════════════════════════════════════════════════════
-- Sprint 17 (5 May 2026) - Stok Modül Pilot Enable + Başlangıç Inventory
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Aslan'ın talebi (Replit raporu):
--   "module_flags.stok=false (pilot şubeler için enable + seed gerek)"
-- 
-- ÇÖZÜM:
--   1. Pilot 4 şubede (5/8/23/24) stok modülünü ENABLE
--   2. Her pilot şubeye en sık satılan 12 ürün için minimum başlangıç stoğu
--   3. Stok hareket başlangıç kaydı (audit için)
-- 
-- KONSERVATIF YAKLAŞIM:
--   - Diğer 16 şubede stok DISABLE kalır
--   - Sadece pilot şubeler test eder
--   - Pilot başarılıysa diğer şubelere kademeli yayılım
-- 
-- VERIFY:
--   SELECT COUNT(*) FROM module_flags 
--   WHERE module_key = 'stok' AND is_enabled = true;
--   Beklenen: 4 (pilot şubeler) + 1 (global) = 5
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- ADIM 0: BASELINE
-- ───────────────────────────────────────────────────────────────────

SELECT 
  module_key, scope, branch_id, is_enabled, flag_level
FROM module_flags
WHERE module_key = 'stok' OR module_key LIKE 'stok.%'
ORDER BY scope, branch_id;
-- Beklenen öncesi: 1 satır (global, is_enabled=false) veya boş

SELECT 
  b.id, b.name, COUNT(bi.id) AS inventory_kayit
FROM branches b
LEFT JOIN branch_inventory bi ON bi.branch_id = b.id
WHERE b.id IN (5, 8, 23, 24)
GROUP BY b.id, b.name;
-- Beklenen: 4 şube, hepsi inventory_kayit=0

-- ───────────────────────────────────────────────────────────────────
-- ADIM 1: Global stok flag ENABLE
-- ───────────────────────────────────────────────────────────────────

INSERT INTO module_flags (
  module_key, scope, branch_id, is_enabled, flag_level, flag_behavior,
  enabled_at, created_at, updated_at
) VALUES (
  'stok', 'global', NULL, true, 'module', 'fully_visible',
  NOW(), NOW(), NOW()
)
ON CONFLICT ON CONSTRAINT uq_module_flags_key_scope_branch_role 
DO UPDATE SET 
  is_enabled = true, 
  enabled_at = NOW(), 
  disabled_at = NULL,
  disabled_by = NULL,
  updated_at = NOW();

-- ───────────────────────────────────────────────────────────────────
-- ADIM 2: Pilot 4 şube için stok flag ENABLE (branch scope)
-- ───────────────────────────────────────────────────────────────────

-- Bu, global'i override edebilir veya destekleyebilir.
-- Global enable + branch enable = çift güvenli.

INSERT INTO module_flags (
  module_key, scope, branch_id, is_enabled, flag_level, flag_behavior,
  enabled_at, created_at, updated_at
)
SELECT 
  'stok', 'branch', branch_id, true, 'module', 'fully_visible',
  NOW(), NOW(), NOW()
FROM (VALUES (5), (8), (23), (24)) AS pilot_branches(branch_id)
ON CONFLICT ON CONSTRAINT uq_module_flags_key_scope_branch_role 
DO UPDATE SET 
  is_enabled = true, 
  enabled_at = NOW(),
  disabled_at = NULL,
  updated_at = NOW();

-- ───────────────────────────────────────────────────────────────────
-- ADIM 3: Başlangıç Inventory Seed
-- ───────────────────────────────────────────────────────────────────
--
-- Strategy:
--   factory_products tablosundan en popüler 12 ürünü al (id ASC ilk 12)
--   Her pilot şubeye (5/8/23/24) bu ürünleri seed et
--   currentStock=0 (sayım sonrası güncellensin)
--   minimumStock=5 (default eşik)
--
-- NOT: Bu sadece İSKELET. Gerçek stok değerleri Mahmut/Şube Müdürü
-- pilot başlangıcında manuel sayım girer.
-- ───────────────────────────────────────────────────────────────────

INSERT INTO branch_inventory (
  branch_id, product_id, current_stock, minimum_stock, unit,
  created_at, updated_at
)
SELECT 
  pilot.branch_id,
  fp.id AS product_id,
  0 AS current_stock,        -- Başlangıç 0, sayım sonrası güncellensin
  CASE 
    WHEN fp.unit IN ('adet', 'piece') THEN 5
    WHEN fp.unit IN ('kg', 'g') THEN 10
    WHEN fp.unit IN ('lt', 'ml') THEN 5
    ELSE 5
  END AS minimum_stock,
  COALESCE(fp.unit, 'adet') AS unit,
  NOW(), NOW()
FROM (VALUES (5), (8), (23), (24)) AS pilot(branch_id)
CROSS JOIN (
  SELECT id, unit 
  FROM factory_products
  WHERE is_active = true
  ORDER BY id ASC
  LIMIT 12  -- ilk 12 ürün
) AS fp
WHERE NOT EXISTS (
  -- Idempotent: aynı şube+ürün varsa atla
  SELECT 1 FROM branch_inventory bi 
  WHERE bi.branch_id = pilot.branch_id 
    AND bi.product_id = fp.id
);

-- ───────────────────────────────────────────────────────────────────
-- ADIM 4: Stok hareket başlangıç kaydı (audit için)
-- ───────────────────────────────────────────────────────────────────

INSERT INTO branch_stock_movements (
  branch_id, product_id, movement_type, quantity, previous_stock, new_stock,
  reference_type, notes, created_at
)
SELECT 
  bi.branch_id, bi.product_id, 'initial_seed' AS movement_type,
  0 AS quantity, NULL AS previous_stock, 0 AS new_stock,
  'migration' AS reference_type,
  'Sprint 17 pilot inventory başlangıç (5 May 2026) - Mahmut sayım sonrası güncellesin' AS notes,
  NOW() AS created_at
FROM branch_inventory bi
WHERE bi.branch_id IN (5, 8, 23, 24)
  AND NOT EXISTS (
    SELECT 1 FROM branch_stock_movements bsm
    WHERE bsm.branch_id = bi.branch_id 
      AND bsm.product_id = bi.product_id
      AND bsm.movement_type = 'initial_seed'
  );

-- ───────────────────────────────────────────────────────────────────
-- ADIM 5: Doğrulama
-- ───────────────────────────────────────────────────────────────────

-- 5a) Module flags
SELECT 
  module_key, scope, branch_id, is_enabled,
  CASE WHEN scope = 'branch' THEN (SELECT name FROM branches WHERE id = branch_id) ELSE 'GLOBAL' END AS lokasyon
FROM module_flags
WHERE module_key = 'stok' AND is_enabled = true
ORDER BY scope DESC, branch_id;

-- Beklenen: 5 satır (1 global + 4 pilot branch)

-- 5b) Inventory dağılımı
SELECT 
  b.id, b.name,
  COUNT(bi.id) AS inventory_kayit,
  SUM(CASE WHEN bi.current_stock = 0 THEN 1 ELSE 0 END) AS bos_stok,
  SUM(CASE WHEN bi.minimum_stock IS NOT NULL THEN 1 ELSE 0 END) AS min_eshik_var
FROM branches b
LEFT JOIN branch_inventory bi ON bi.branch_id = b.id
WHERE b.id IN (5, 8, 23, 24)
GROUP BY b.id, b.name
ORDER BY b.id;

-- Beklenen: 4 şube, her birinde 12 inventory_kayit, hepsi bos_stok

-- 5c) Hareket kayıtları
SELECT 
  branch_id, COUNT(*) AS hareket_sayisi,
  COUNT(*) FILTER (WHERE movement_type = 'initial_seed') AS seed_sayisi
FROM branch_stock_movements
WHERE branch_id IN (5, 8, 23, 24)
GROUP BY branch_id
ORDER BY branch_id;

-- Beklenen: 4 şube, her birinde 12 seed kayıt

-- ═══════════════════════════════════════════════════════════════════
-- POST-MIGRATION ACTIONS:
-- ═══════════════════════════════════════════════════════════════════
-- 
-- 1. ✅ /sube/siparis-stok sayfası pilot şubelerde açılır
-- 2. ⏳ Mahmut/Şube Müdürü pilot başlangıcı:
--      a. Fiziksel sayım yap (12 ürün × 4 şube = 48 sayım)
--      b. /sube/siparis-stok'tan currentStock güncelle
--      c. Her güncelleme branch_stock_movements tablosuna kaydedilir
-- 3. ⏳ Pilot süresince düşük stok bildirimleri:
--      - currentStock < minimumStock olunca otomatik notification
--      - Mr. Dobody bu pattern'i tetikler
-- 4. ⏳ Pilot sonrası diğer 16 şubeye yayılım
-- 
-- ROLLBACK:
--   DELETE FROM branch_stock_movements WHERE branch_id IN (5,8,23,24) AND movement_type='initial_seed';
--   DELETE FROM branch_inventory WHERE branch_id IN (5,8,23,24);
--   UPDATE module_flags SET is_enabled=false, disabled_at=NOW() 
--     WHERE module_key='stok';
-- ═══════════════════════════════════════════════════════════════════
