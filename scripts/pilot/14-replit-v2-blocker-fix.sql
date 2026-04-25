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

-- ─── PRECONDITION: admin + Işıklar branch lookup (Task #214) ────
-- Sabit module_flags.id=247 yerine module_key + branch lookup
DO $$
DECLARE
  admin_uid                VARCHAR;
  isiklar_branch_id        INTEGER;
  isiklar_checklist_flag   BIGINT;
  isiklar_checklist_status BOOLEAN;
  isiklar_enabled_by       VARCHAR;
BEGIN
  SELECT id INTO admin_uid FROM users WHERE username = 'adminhq' LIMIT 1;
  IF admin_uid IS NULL THEN
    RAISE EXCEPTION 'adminhq kullanıcısı bulunamadı — script güvenli çalışamaz';
  END IF;

  SELECT id INTO isiklar_branch_id FROM branches WHERE name = 'Işıklar' LIMIT 1;
  IF isiklar_branch_id IS NULL THEN
    RAISE EXCEPTION 'Işıklar şubesi bulunamadı — script güvenli çalışamaz';
  END IF;

  SELECT id INTO isiklar_checklist_flag
  FROM module_flags
  WHERE module_key = 'checklist'
    AND scope = 'branch'
    AND branch_id = isiklar_branch_id
  LIMIT 1;

  IF isiklar_checklist_flag IS NULL THEN
    RAISE EXCEPTION 'Işıklar (branch_id=%) için checklist module_flags kaydı bulunamadı', isiklar_branch_id;
  END IF;

  -- B-5: Işıklar checklist modülü AÇ (idempotent)
  UPDATE module_flags
  SET is_enabled = true,
      enabled_by = admin_uid,
      enabled_at = COALESCE(enabled_at, NOW()),
      disabled_by = NULL,
      disabled_at = NULL,
      updated_at = NOW()
  WHERE id = isiklar_checklist_flag;

  -- Sonuç kontrolü
  SELECT is_enabled, enabled_by
    INTO isiklar_checklist_status, isiklar_enabled_by
  FROM module_flags WHERE id = isiklar_checklist_flag;

  RAISE NOTICE '------------------------------------------------';
  RAISE NOTICE 'Isiklar Checklist Modulu Durumu (flag id=%)', isiklar_checklist_flag;
  RAISE NOTICE '------------------------------------------------';

  IF isiklar_checklist_status = true THEN
    RAISE NOTICE 'OK: Isiklar checklist modulu ACIK (enabled_by=%)', isiklar_enabled_by;
  ELSE
    RAISE WARNING 'HATA: Isiklar checklist modulu hala KAPALI';
  END IF;

  RAISE NOTICE '------------------------------------------------';
END $$;

COMMIT;
