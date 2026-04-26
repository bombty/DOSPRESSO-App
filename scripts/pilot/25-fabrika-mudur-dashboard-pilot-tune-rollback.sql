-- =====================================================================
-- Task #240 paralel ROLLBACK: Eren (fabrika_mudur) önceki widget atamaları
-- Tarih: 26 Nis 2026
--
-- ÖNCEKİ DURUM (rollback hedefi):
--   1. factory_production    (default_open=true)
--   2. equipment_faults      (true)
--   3. equipment_maintenance (true)
--   4. qc_stats              (true)
--   5. staff_count           (true)
--   6. pending_shipments     (true)
--   7. todays_tasks          (true)
--   8. financial_overview    (false)
--   9. ai_briefing           (false)
--  10. quick_actions         (false)
-- =====================================================================

BEGIN;

DELETE FROM dashboard_role_widgets WHERE role = 'fabrika_mudur';

INSERT INTO dashboard_role_widgets (role, widget_key, display_order, default_open, is_enabled, created_at, updated_at) VALUES
  ('fabrika_mudur', 'factory_production',    1, true,  true, NOW(), NOW()),
  ('fabrika_mudur', 'equipment_faults',      2, true,  true, NOW(), NOW()),
  ('fabrika_mudur', 'equipment_maintenance', 3, true,  true, NOW(), NOW()),
  ('fabrika_mudur', 'qc_stats',              4, true,  true, NOW(), NOW()),
  ('fabrika_mudur', 'staff_count',           5, true,  true, NOW(), NOW()),
  ('fabrika_mudur', 'pending_shipments',     6, true,  true, NOW(), NOW()),
  ('fabrika_mudur', 'todays_tasks',          7, true,  true, NOW(), NOW()),
  ('fabrika_mudur', 'financial_overview',    8, false, true, NOW(), NOW()),
  ('fabrika_mudur', 'ai_briefing',           9, false, true, NOW(), NOW()),
  ('fabrika_mudur', 'quick_actions',        10, false, true, NOW(), NOW());

SELECT widget_key, display_order, default_open FROM dashboard_role_widgets WHERE role='fabrika_mudur' ORDER BY display_order;

COMMIT;
