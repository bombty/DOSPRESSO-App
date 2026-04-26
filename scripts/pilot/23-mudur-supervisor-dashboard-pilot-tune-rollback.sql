-- ════════════════════════════════════════════════════════════════════
-- Pilot 23 ROLLBACK: Mudur ve Supervisor Dashboard Pilot Tune
-- ════════════════════════════════════════════════════════════════════
-- AMAÇ: scripts/pilot/23-mudur-supervisor-dashboard-pilot-tune.sql etkilerini
-- geri al. Lara→Andre rename DEĞİŞMEZ (saha bilgisi kalıcı, ayrı rollback gerekir).
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- pdks_absence eklemesini sil (bu pilot 23'te eklenen TEK yeni atama)
DELETE FROM dashboard_role_widgets
WHERE role IN ('mudur', 'supervisor') AND widget_key = 'pdks_absence';

-- mudur rolü → orijinal sıralamaya geri dön
UPDATE dashboard_role_widgets SET display_order=1,  default_open=true,  updated_at=NOW() WHERE role='mudur' AND widget_key='branch_status';
UPDATE dashboard_role_widgets SET display_order=2,  default_open=true,  updated_at=NOW() WHERE role='mudur' AND widget_key='staff_count';
UPDATE dashboard_role_widgets SET display_order=3,  default_open=true,  updated_at=NOW() WHERE role='mudur' AND widget_key='leave_requests';
UPDATE dashboard_role_widgets SET display_order=4,  default_open=true,  updated_at=NOW() WHERE role='mudur' AND widget_key='todays_tasks';
UPDATE dashboard_role_widgets SET display_order=5,  default_open=true,  updated_at=NOW() WHERE role='mudur' AND widget_key='customer_feedback';
UPDATE dashboard_role_widgets SET display_order=6,  default_open=true,  updated_at=NOW() WHERE role='mudur' AND widget_key='equipment_faults';
UPDATE dashboard_role_widgets SET display_order=7,  default_open=false, updated_at=NOW() WHERE role='mudur' AND widget_key='financial_overview';
UPDATE dashboard_role_widgets SET display_order=8,  default_open=false, updated_at=NOW() WHERE role='mudur' AND widget_key='sla_tracker';
UPDATE dashboard_role_widgets SET display_order=9,  default_open=false, updated_at=NOW() WHERE role='mudur' AND widget_key='quick_actions';
UPDATE dashboard_role_widgets SET display_order=10, default_open=false, updated_at=NOW() WHERE role='mudur' AND widget_key='pdks_attendance';

-- supervisor rolü → orijinal sıralamaya geri dön
UPDATE dashboard_role_widgets SET display_order=1,  default_open=true,  updated_at=NOW() WHERE role='supervisor' AND widget_key='branch_status';
UPDATE dashboard_role_widgets SET display_order=2,  default_open=true,  updated_at=NOW() WHERE role='supervisor' AND widget_key='staff_count';
UPDATE dashboard_role_widgets SET display_order=3,  default_open=true,  updated_at=NOW() WHERE role='supervisor' AND widget_key='leave_requests';
UPDATE dashboard_role_widgets SET display_order=4,  default_open=true,  updated_at=NOW() WHERE role='supervisor' AND widget_key='todays_tasks';
UPDATE dashboard_role_widgets SET display_order=5,  default_open=true,  updated_at=NOW() WHERE role='supervisor' AND widget_key='customer_feedback';
UPDATE dashboard_role_widgets SET display_order=6,  default_open=false, updated_at=NOW() WHERE role='supervisor' AND widget_key='equipment_faults';
UPDATE dashboard_role_widgets SET display_order=7,  default_open=false, updated_at=NOW() WHERE role='supervisor' AND widget_key='sla_tracker';
UPDATE dashboard_role_widgets SET display_order=8,  default_open=false, updated_at=NOW() WHERE role='supervisor' AND widget_key='quick_actions';
UPDATE dashboard_role_widgets SET display_order=9,  default_open=false, updated_at=NOW() WHERE role='supervisor' AND widget_key='training_progress';
UPDATE dashboard_role_widgets SET display_order=10, default_open=false, updated_at=NOW() WHERE role='supervisor' AND widget_key='branch_score_detail';
UPDATE dashboard_role_widgets SET display_order=10, default_open=false, updated_at=NOW() WHERE role='supervisor' AND widget_key='pdks_attendance';

COMMIT;
\echo '✅ Pilot 23 rollback tamamlandı (Lara→Andre dokunulmadı).'
