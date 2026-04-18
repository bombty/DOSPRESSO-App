-- =====================================================================
-- F02 — Fabrika Modül Naming Migration
-- AYRI DOSYA: F01'den ayrıldı (Aslan isteği)
-- Pazartesi 28 Nis 14:00 toplantı sonrası uygulanacak
-- =====================================================================
-- KAYNAK: docs/pilot/f02-kod-inceleme-raporu.md
-- KARAR TABLOSU (raporun §5'inde):
--   3 SOFT-DELETE: fabrika.kalite, fabrika.kavurma, fabrika.sevkiyat
--   1 AÇ:         fabrika.stok
--   3 KAPALI BIRAK: fabrika.hammadde, fabrika.siparis, fabrika.sayim
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- BÖLÜM A: 3 Türkçe Legacy SOFT-DELETE (İngilizce eşi aktif)
-- ─────────────────────────────────────────────────────────────────────
-- fabrika.kalite ↔ fabrika.quality (zaten enabled)
-- fabrika.kavurma ↔ fabrika.roasting (zaten enabled)
-- fabrika.sevkiyat ↔ fabrika.shipment (zaten enabled)
UPDATE module_flags
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE scope = 'global'
  AND module_key IN ('fabrika.kalite', 'fabrika.kavurma', 'fabrika.sevkiyat')
  AND deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- BÖLÜM B: fabrika.stok AKTİF ET (Task #91 + 3 gerçek kod referansı)
-- ─────────────────────────────────────────────────────────────────────
UPDATE module_flags
SET is_enabled = true,
    enabled_at = NOW(),
    enabled_by = 'pilot_launch_2026_04_28_f02_decision',
    disabled_at = NULL,
    disabled_by = NULL,
    updated_at = NOW()
WHERE scope = 'global'
  AND module_key = 'fabrika.stok'
  AND deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- BÖLÜM C: 3 Modül KAPALI BIRAK (sadece referans, aksiyon yok)
-- ─────────────────────────────────────────────────────────────────────
-- fabrika.hammadde — sayfa+endpoint yok, sadece flag boşta
-- fabrika.siparis  — branch_orders permission yerini almış
-- fabrika.sayim    — stok-sayim.tsx farklı isimle çalışıyor
-- (UPDATE yok, sadece dokümantasyon amaçlı)

-- ─────────────────────────────────────────────────────────────────────
-- AUDIT LOG
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO audit_logs (user_id, action, target_type, target_id, details, created_at)
VALUES (
  (SELECT id FROM users WHERE username = 'adminhq' LIMIT 1),
  'F02_FABRIKA_NAMING_MIGRATION',
  'module_flags',
  'multiple',
  jsonb_build_object(
    'soft_deleted', ARRAY['fabrika.kalite', 'fabrika.kavurma', 'fabrika.sevkiyat'],
    'enabled', ARRAY['fabrika.stok'],
    'left_disabled', ARRAY['fabrika.hammadde', 'fabrika.siparis', 'fabrika.sayim'],
    'reason', 'F02 naming çakışması — Türkçe legacy migration, kod inceleme raporu'
  ),
  NOW()
);

-- ─────────────────────────────────────────────────────────────────────
-- DOĞRULAMA
-- ─────────────────────────────────────────────────────────────────────
SELECT module_key, is_enabled, deleted_at
FROM module_flags
WHERE scope = 'global'
  AND module_key LIKE 'fabrika%'
ORDER BY module_key;

-- Beklenen sonuç (15 satır):
--   fabrika                  | t | NULL
--   fabrika.factory-kiosk    | t | NULL
--   fabrika.haccp            | t | NULL
--   fabrika.hammadde         | f | NULL
--   fabrika.kalite           | f | <BUGÜN>  ← deleted
--   fabrika.kavurma          | f | <BUGÜN>  ← deleted
--   fabrika.production       | t | NULL
--   fabrika.quality          | t | NULL
--   fabrika.roasting         | t | NULL
--   fabrika.sayim            | f | NULL
--   fabrika.sevkiyat         | f | <BUGÜN>  ← deleted
--   fabrika.shipment         | t | NULL
--   fabrika.siparis          | f | NULL
--   fabrika.stok             | t | NULL    ← şimdi enabled
--   fabrika.vardiya          | t | NULL

COMMIT;
-- Rollback: scripts/pilot/02-f02-fabrika-naming-rollback.sql
