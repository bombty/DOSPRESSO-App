-- =====================================================================
-- Task #240 paralel: Eren (fabrika_mudur) pilot dashboard tune
-- Tarih: 26 Nis 2026
-- Kullanıcı: Eren Fabrika (id=hq-eren-fabrika, branch_id=24)
--
-- Pilot Day-1 sabahı default_open=true seti (5 widget):
--   1. factory_production    — Bugünkü üretim planı + ilerleme
--   2. todays_tasks          — Bugün üretilecek ürünler
--   3. qc_stats              — Kalite kontrol durumu
--   4. pending_shipments     — Şubelere bekleyen sevkiyatlar
--   5. equipment_faults      — Ekipman arızaları (varsa)
--
-- Geri kalan 5 widget collapsed (default_open=false):
--   6. equipment_maintenance, 7. staff_count, 8. financial_overview,
--   9. ai_briefing, 10. quick_actions
--
-- NOT: Aslan brief'inde "factory_summary" geçti ama DB'de widget_key='factory_production'.
-- Atama: factory_production (Aslan'ın factory_summary kastettiği aynı widget).
-- =====================================================================

BEGIN;

-- ===== Mevcut atamaları sil + yeniden ekle (idempotent) =====
DELETE FROM dashboard_role_widgets WHERE role = 'fabrika_mudur';

-- Pilot Day-1 default_open=true (5 widget, sıra önemli)
INSERT INTO dashboard_role_widgets (role, widget_key, display_order, default_open, is_enabled, created_at, updated_at) VALUES
  ('fabrika_mudur', 'factory_production',    1, true,  true, NOW(), NOW()),
  ('fabrika_mudur', 'todays_tasks',          2, true,  true, NOW(), NOW()),
  ('fabrika_mudur', 'qc_stats',              3, true,  true, NOW(), NOW()),
  ('fabrika_mudur', 'pending_shipments',     4, true,  true, NOW(), NOW()),
  ('fabrika_mudur', 'equipment_faults',      5, true,  true, NOW(), NOW()),

-- Collapsed default_open=false (5 widget)
  ('fabrika_mudur', 'equipment_maintenance', 6, false, true, NOW(), NOW()),
  ('fabrika_mudur', 'staff_count',           7, false, true, NOW(), NOW()),
  ('fabrika_mudur', 'financial_overview',    8, false, true, NOW(), NOW()),
  ('fabrika_mudur', 'ai_briefing',           9, false, true, NOW(), NOW()),
  ('fabrika_mudur', 'quick_actions',        10, false, true, NOW(), NOW());

-- ===== DOĞRULAMA =====
-- Eren widget'ları (10 toplam, 5 default_open=true)
SELECT widget_key, display_order, default_open, is_enabled
FROM dashboard_role_widgets
WHERE role = 'fabrika_mudur'
ORDER BY display_order;

-- default_open=true sayısı 5 olmalı
SELECT 'fabrika_mudur_default_open_count' as kontrol, count(*) as adet
FROM dashboard_role_widgets
WHERE role = 'fabrika_mudur' AND default_open = true;

COMMIT;
