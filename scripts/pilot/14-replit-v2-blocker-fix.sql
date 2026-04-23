-- ═══════════════════════════════════════════════════════════════════
-- REPLIT v2 RAPORU — Blocker Düzeltmeleri (DÜZELTMESİ)
-- 23 Nis 2026
-- ═══════════════════════════════════════════════════════════════════
--
-- ÖNCEKİ HATA:
--   enabled_by kolonuna 'claude-pilot-fix' string koymuştum
--   Gerçek şema: enabled_by VARCHAR REFERENCES users(id)
--   HATA: foreign key violation
--
-- DÜZELTME:
--   enabled_by için NULL kullan (kolon nullable)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── B-5: Işıklar checklist modülü AÇ ──────────────────────────

UPDATE module_flags
SET is_enabled = true,
    enabled_by = NULL,
    enabled_at = NOW(),
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
BEGIN
  SELECT is_enabled INTO isiklar_checklist_status
  FROM module_flags WHERE id = 247;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Isiklar Checklist Modulu Durumu';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  IF isiklar_checklist_status IS NULL THEN
    RAISE WARNING 'module_flags id=247 bulunamadi!';
  ELSIF isiklar_checklist_status = true THEN
    RAISE NOTICE '✅ Isiklar checklist modulu ACIK - pilot skor formulu calisir';
  ELSE
    RAISE WARNING '❌ Isiklar checklist modulu hala KAPALI';
  END IF;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;
