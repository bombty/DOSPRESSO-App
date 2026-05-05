-- ═══════════════════════════════════════════════════════════════════
-- Sprint 17 (5 May 2026) - Fabrika Alt Modül Pilot Enable
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Aslan'ın talebi: Replit raporu
--   "Fabrika 6 alt modül DISABLE (kavurma/kalite/hammadde/stok/sayım/sipariş/sevkiyat)
--    Fabrika pilot ID 24, hangi alt modüller gerekli karar?"
-- 
-- KARAR (Aslan implicit GO - "şimdi hallet"):
--   Pilot 12 May için Fabrika ID 24'te HEPSI ENABLE.
--   Pilot süresince hangileri gerçekten kullanılıyor görülecek,
--   pilot sonrası kullanılmayanlar disable edilebilir.
-- 
--   KONSERVATIF mantık:
--   - Pilot ENGEL'i = "modül göremiyorum, kullanamıyorum" şikayeti riski
--   - Disable bırakırsak fabrika personeli pilot süresince eksiklik yaşar
--   - Enable edersek: kullanıcı ihtiyaca göre kullanır, kullanılmayanlar
--     görünür ama veri girişi olmaz (boş kalır)
-- 
-- AKTIF EDİLECEKLER (6 modül):
--   1. fabrika.kavurma - Kahve kavurma operasyonları
--   2. fabrika.kalite - Kalite kontrol kayıtları
--   3. fabrika.hammadde - Hammadde stok yönetimi
--   4. fabrika.stok - Üretim stok takibi
--   5. fabrika.sayim - Periyodik stok sayımı
--   6. fabrika.siparis - Şubelerden gelen siparişler
--   7. fabrika.sevkiyat - Şubelere sevkiyat (BONUS - 7. modül)
-- 
-- VERIFY:
--   SELECT module_key, is_enabled FROM module_flags
--   WHERE branch_id = 24 AND module_key LIKE 'fabrika.%';
--   Beklenen: 7 satır, hepsi enabled
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- ADIM 0: BASELINE
-- ───────────────────────────────────────────────────────────────────

SELECT 
  module_key, scope, branch_id, is_enabled, flag_level
FROM module_flags
WHERE module_key LIKE 'fabrika.%' OR module_key = 'fabrika'
ORDER BY scope, module_key;
-- Beklenen öncesi: ya hiç yok ya da hepsinde is_enabled=false

-- ───────────────────────────────────────────────────────────────────
-- ADIM 1: Global fabrika modülü ENABLE
-- ───────────────────────────────────────────────────────────────────

INSERT INTO module_flags (
  module_key, scope, branch_id, is_enabled, flag_level, flag_behavior,
  enabled_at, created_at, updated_at
) VALUES (
  'fabrika', 'global', NULL, true, 'module', 'fully_visible',
  NOW(), NOW(), NOW()
)
ON CONFLICT ON CONSTRAINT uq_module_flags_key_scope_branch_role
DO UPDATE SET 
  is_enabled = true, 
  enabled_at = NOW(),
  disabled_at = NULL,
  updated_at = NOW();

-- ───────────────────────────────────────────────────────────────────
-- ADIM 2: 7 alt modül için Fabrika ID 24'te ENABLE
-- ───────────────────────────────────────────────────────────────────

INSERT INTO module_flags (
  module_key, scope, branch_id, is_enabled, flag_level, flag_behavior, parent_key,
  enabled_at, created_at, updated_at
)
SELECT 
  module_key, 'branch', 24, true, 'submodule', 'fully_visible', 'fabrika',
  NOW(), NOW(), NOW()
FROM (VALUES 
  ('fabrika.kavurma'),
  ('fabrika.kalite'),
  ('fabrika.hammadde'),
  ('fabrika.stok'),
  ('fabrika.sayim'),
  ('fabrika.siparis'),
  ('fabrika.sevkiyat')
) AS submodules(module_key)
ON CONFLICT ON CONSTRAINT uq_module_flags_key_scope_branch_role
DO UPDATE SET 
  is_enabled = true, 
  enabled_at = NOW(),
  disabled_at = NULL,
  updated_at = NOW();

-- ───────────────────────────────────────────────────────────────────
-- ADIM 3: Doğrulama
-- ───────────────────────────────────────────────────────────────────

SELECT 
  module_key,
  scope,
  CASE WHEN scope = 'branch' THEN (SELECT name FROM branches WHERE id = branch_id) ELSE 'GLOBAL' END AS lokasyon,
  is_enabled,
  flag_level,
  parent_key
FROM module_flags
WHERE (module_key = 'fabrika' OR module_key LIKE 'fabrika.%')
  AND is_enabled = true
ORDER BY scope DESC, module_key;

-- Beklenen: 8 satır (1 global fabrika + 7 fabrika alt modül branch=24)

-- ═══════════════════════════════════════════════════════════════════
-- POST-MIGRATION ACTIONS:
-- ═══════════════════════════════════════════════════════════════════
-- 
-- 1. ✅ Fabrika ID 24'te 7 alt modül erişilebilir
-- 2. ⏳ İlker (recete_gm) + Ümit Usta (sef) + Atiye Kar (supervisor)
--    bu modülleri pilot süresince test eder
-- 3. ⏳ Pilot 15 Haziran sonrası kullanım analiz:
--      SELECT module_key, COUNT(DISTINCT user_id) as kullanici_sayisi
--      FROM module_usage_log  -- (eğer varsa)
--      WHERE module_key LIKE 'fabrika.%' AND created_at > '2026-05-12'
--      GROUP BY module_key;
--    Kullanılmayanlar pilot sonrası disable edilebilir.
-- 
-- ROLLBACK:
--   UPDATE module_flags SET is_enabled = false, disabled_at = NOW()
--   WHERE module_key LIKE 'fabrika.%' AND branch_id = 24;
-- 
-- ═══════════════════════════════════════════════════════════════════
