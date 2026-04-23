-- ═══════════════════════════════════════════════════════════════════
-- REPLIT v2 RAPORU — Blocker Düzeltmeleri (DÜZELTMESİ v3)
-- 23 Nis 2026
-- ═══════════════════════════════════════════════════════════════════
--
-- HATA GEÇMİŞİ:
--   v1: enabled_by = 'claude-pilot-fix' string → FK violation
--       (enabled_by VARCHAR REFERENCES users(id))
--   v2: enabled_by = NULL → çalıştı ama audit izi kaybediliyordu
--       (Pilot go-live öncesi denetim için kim açtı bilinmeli)
--
-- v3 DÜZELTMESİ:
--   - enabled_by için gerçek admin user_id (adminhq) kullanılıyor
--   - Script idempotent: adminhq id'si DB'den dinamik çekiliyor;
--     enabled_at COALESCE ile korunuyor, böylece tekrar çalıştırılsa
--     da ilk açılış zamanı ezilmez.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Admin kullanıcı id'sini doğrula ────────────────────────────
DO $$
DECLARE
  admin_uid VARCHAR;
BEGIN
  SELECT id INTO admin_uid FROM users WHERE username = 'adminhq' LIMIT 1;
  IF admin_uid IS NULL THEN
    RAISE EXCEPTION 'adminhq kullanıcısı bulunamadı — script güvenli çalışamaz';
  END IF;
END $$;

-- ─── B-5: Işıklar checklist modülü AÇ ──────────────────────────

UPDATE module_flags
SET is_enabled = true,
    enabled_by = (SELECT id FROM users WHERE username = 'adminhq' LIMIT 1),
    enabled_at = COALESCE(enabled_at, NOW()),
    disabled_by = NULL,
    disabled_at = NULL,
    updated_at = NOW()
WHERE id = 247
  AND module_key = 'checklist'
  AND branch_id = 5;

-- Sonuç kontrolü
DO $$
DECLARE
  isiklar_checklist_status BOOLEAN;
  isiklar_enabled_by VARCHAR;
BEGIN
  SELECT is_enabled, enabled_by
    INTO isiklar_checklist_status, isiklar_enabled_by
  FROM module_flags WHERE id = 247;

  RAISE NOTICE '------------------------------------------------';
  RAISE NOTICE 'Isiklar Checklist Modulu Durumu';
  RAISE NOTICE '------------------------------------------------';

  IF isiklar_checklist_status IS NULL THEN
    RAISE WARNING 'module_flags id=247 bulunamadi!';
  ELSIF isiklar_checklist_status = true THEN
    RAISE NOTICE 'OK: Isiklar checklist modulu ACIK (enabled_by=%)', isiklar_enabled_by;
  ELSE
    RAISE WARNING 'HATA: Isiklar checklist modulu hala KAPALI';
  END IF;

  RAISE NOTICE '------------------------------------------------';
END $$;

COMMIT;
