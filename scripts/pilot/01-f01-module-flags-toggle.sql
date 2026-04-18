-- =====================================================================
-- F01 + F02: Module Flags Pilot Toggle
-- Pazartesi 28 Nis 2026, 14:45-16:00 toplantı sonrası uygulanacak
-- =====================================================================
-- ÖNCESİ: Aslan + IT + Agent karar toplantısı (15 dk)
-- DRY-RUN: BEGIN; ... ROLLBACK; ile test
-- PRODUCTION: BEGIN; ... COMMIT;
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- BÖLÜM A: F01 — 3 modül kesin AÇILACAK (Aslan onaylı)
-- ─────────────────────────────────────────────────────────────────────
-- delegasyon: Madde 38 (3'lü onay >50 dosya) ve Madde 39 (archive)
-- iletisim_merkezi: CRM 4 lokasyon mesajlaşma
-- dobody.flow: Mr. Dobody gap detection (pilot ölçüm aracı)
UPDATE module_flags
SET is_enabled = true,
    enabled_at = NOW(),
    enabled_by = 'pilot_launch_2026_04_28',
    updated_at = NOW()
WHERE scope = 'global'
  AND module_key IN ('delegasyon', 'iletisim_merkezi', 'dobody.flow')
  AND deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- BÖLÜM B: F02 — Türkçe→İngilizce Migration (3 net eşleşme — TÜRKÇE SİL)
-- ─────────────────────────────────────────────────────────────────────
-- fabrika.kalite ↔ fabrika.quality (zaten enabled)
-- fabrika.kavurma ↔ fabrika.roasting (zaten enabled)
-- fabrika.sevkiyat ↔ fabrika.shipment (zaten enabled)
-- ⚠️ Soft-delete: deleted_at set, fiziksel silme değil (rollback için)
UPDATE module_flags
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE scope = 'global'
  AND module_key IN ('fabrika.kalite', 'fabrika.kavurma', 'fabrika.sevkiyat')
  AND deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- BÖLÜM C: F02 — Aslan tavsiyesi (Pazartesi toplantıda netleşir)
-- ─────────────────────────────────────────────────────────────────────
-- Aslan'ın 19 Nis tavsiyesi:
--   fabrika.hammadde → AKTİF (pilot hammadde takibi)
--   fabrika.siparis  → AKTİF (Sprint D hazırlık)
--   fabrika.sayim    → OPSIYONEL (pilot sonrası değerlendir)
--   fabrika.stok     → AKTİF (production ≠ stok)
--
-- ⚠️ ÖNEMLİ NOT: Cumartesi kod incelemesinde tespit edildi ki
-- fabrika.* flag'lerin RUNTIME ETKİSİ YOK (sayfalarda useModuleFlag yok).
-- Bu UPDATE sadece admin paneli görünümünü etkiler.
-- Aslan toplantıda Senaryo A (sadece migration) vs B (aktif et) seçecek.

-- Senaryo B (Aslan'ın tavsiyesi) — UNCOMMENT to apply:
-- UPDATE module_flags
-- SET is_enabled = true,
--     enabled_at = NOW(),
--     enabled_by = 'pilot_launch_2026_04_28_aslan_decision',
--     updated_at = NOW()
-- WHERE scope = 'global'
--   AND module_key IN ('fabrika.hammadde', 'fabrika.siparis', 'fabrika.stok')
--   AND deleted_at IS NULL;

-- fabrika.sayim opsiyonel — pilot sonrası ele al, şimdilik dokunma

-- ─────────────────────────────────────────────────────────────────────
-- BÖLÜM D: F01 — KAPALI KALACAKLAR (referans, aksiyon yok)
-- ─────────────────────────────────────────────────────────────────────
-- dobody.chat → Hafta 2'de değerlendirilir
-- (yukarıda Bölüm B+C dışındaki disabled'lar)

-- ─────────────────────────────────────────────────────────────────────
-- DOĞRULAMA SORGULARI (uygulamadan ÖNCE çalıştır)
-- ─────────────────────────────────────────────────────────────────────
SELECT module_key, is_enabled, deleted_at, flag_level
FROM module_flags
WHERE scope = 'global'
  AND module_key IN (
    'delegasyon', 'iletisim_merkezi', 'dobody.flow',
    'fabrika.kalite', 'fabrika.kavurma', 'fabrika.sevkiyat',
    'fabrika.hammadde', 'fabrika.siparis', 'fabrika.stok'
  )
ORDER BY module_key;

-- ─────────────────────────────────────────────────────────────────────
-- ROLLBACK / COMMIT KARARI (smoke test sonrası)
-- ─────────────────────────────────────────────────────────────────────
-- Smoke test BAŞARILI ise:
COMMIT;

-- Smoke test BAŞARISIZ ise:
-- ROLLBACK;
