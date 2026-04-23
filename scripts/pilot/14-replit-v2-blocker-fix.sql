-- ═══════════════════════════════════════════════════════════════════
-- REPLIT TARAMA RAPORU v2 — Yeni Blocker Düzeltmeleri
-- 23 Nis 2026
-- ═══════════════════════════════════════════════════════════════════
--
-- Replit'in kapsamlı tarama raporunda tespit edilen 4 ek kritik blocker:
--
-- 1. 🔴 B-5: Işıklar (branch 5) checklist modülü kapalı
--    - module_flags.id=247 is_enabled=false (18 Mart'tan beri)
--    - Etki: Skor formülünün %40'ı (checklist) pilot sırasında 0 döner
--    - Çözüm: TEK UPDATE (2 saniye iş)
--
-- 2. 🟠 O-1: manager_name 4 lokasyon yanlış (zaten 12-blocker'da var, tekrar)
--
-- 3. 🟠 O-5: delegasyon + iletisim_merkezi modülleri global disabled
--    - delegasyon: Vekalet/devir akışı (Coach hastalanırsa supervisor'a devir)
--    - iletisim_merkezi: Unified CRM platform
--    - Pilot için gerekebilir — Aslan kararı
--    - Bu script OPENER formda - comment'li (karar sonrası aç)
--
-- 4. 🟡 Bildirim temizleme (21,951 unread)
--    - Pilot günü kullanıcı açık bildirim bombardımanıyla karşılaşmamalı
--    - Pazar 27 Nis 22:30 launch-reset'te çalıştırılmalı
--    - Audit log KORUNUR (sadece notifications tablosu)
--
-- ÇALIŞTIRMA:
--   psql "$DATABASE_URL" -f scripts/pilot/14-replit-v2-blocker-fix.sql
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── B-5: Işıklar checklist modülü AÇ ──────────────────────────

UPDATE module_flags
SET is_enabled = true,
    enabled_by = 'claude-pilot-fix',
    enabled_at = NOW(),
    disabled_at = NULL,
    updated_at = NOW()
WHERE id = 247
  AND module_key = 'checklist'
  AND branch_id = 5;

-- ─── O-5: delegasyon + iletisim_merkezi AÇ (opsiyonel) ─────────
-- NOT: Aslan karar verdikten sonra aşağıdaki 2 bloğu aç.
--
-- UPDATE module_flags SET is_enabled=true, enabled_at=NOW(), disabled_at=NULL, updated_at=NOW()
-- WHERE module_key='delegasyon' AND scope='global';
--
-- UPDATE module_flags SET is_enabled=true, enabled_at=NOW(), disabled_at=NULL, updated_at=NOW()
-- WHERE module_key='iletisim_merkezi' AND scope='global';

-- ─── Bildirim Temizleme (Pilot 4 lokasyon için 7+ gün öncesi okunmamış) ──
-- NOT: Bu blok 27 Nis 22:30'da çalışacak, şimdi YORUM halinde.
-- Aktif etmek için comment'leri kaldır.
--
-- DELETE FROM notifications
-- WHERE is_read = false
--   AND created_at < NOW() - INTERVAL '7 days'
--   AND (
--     branch_id IN (5, 8, 23, 24)
--     OR user_id IN (
--       SELECT id FROM users
--       WHERE branch_id IN (5, 8, 23, 24) OR role IN ('admin','ceo','cgo','coach','trainer','muhasebe_ik','satinalma','kalite_kontrol','gida_muhendisi','fabrika_mudur','marketing','teknik','destek','yatirimci_hq')
--     )
--   );

-- ─── Sonuç Raporu ────────────────────────────────────────────

DO $$
DECLARE
  isiklar_checklist_status BOOLEAN;
  disabled_global_modules TEXT[];
  total_notifications INT;
  unread_7d_pilot INT;
BEGIN
  -- Işıklar checklist kontrolü
  SELECT is_enabled INTO isiklar_checklist_status
  FROM module_flags WHERE id = 247;

  -- Global disabled modüller
  SELECT ARRAY_AGG(module_key ORDER BY module_key) INTO disabled_global_modules
  FROM module_flags
  WHERE scope = 'global' AND is_enabled = false
    AND module_key IN ('delegasyon', 'iletisim_merkezi', 'dobody.chat', 'dobody.flow');

  -- Bildirim sayısı (pilot scope)
  SELECT COUNT(*) INTO total_notifications FROM notifications;
  SELECT COUNT(*) INTO unread_7d_pilot
  FROM notifications
  WHERE is_read = false
    AND created_at < NOW() - INTERVAL '7 days'
    AND branch_id IN (5, 8, 23, 24);

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Replit Tarama v2 - Blocker Düzeltme Sonucu';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'B-5 Işıklar checklist modülü: %',
    CASE WHEN isiklar_checklist_status THEN '✅ AÇIK' ELSE '❌ KAPALI' END;
  RAISE NOTICE '';
  RAISE NOTICE 'O-5 Aslan kararı bekliyor (bu script''te YORUM):';
  IF disabled_global_modules IS NOT NULL THEN
    RAISE NOTICE '  Disabled global modüller: %', disabled_global_modules;
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE 'Bildirim durumu:';
  RAISE NOTICE '  Toplam:               % kayıt', total_notifications;
  RAISE NOTICE '  Pilot lok. 7g+ unread: % (Pazar 22:30 temizlenecek)', unread_7d_pilot;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;
