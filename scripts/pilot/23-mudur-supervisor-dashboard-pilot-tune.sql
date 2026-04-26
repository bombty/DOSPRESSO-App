-- ════════════════════════════════════════════════════════════════════
-- Pilot 23: Mudur ve Supervisor Dashboard Pilot Tune (Task #240)
-- ════════════════════════════════════════════════════════════════════
--
-- AMAÇ: Pilot Day-1 (5 May 2026) için Erdem (Işıklar müdür), Andre (Lara
--       franchise sahibi/müdür) ve Basri (supervisor) Komuta Merkezi 2.0
--       dashboard'una login olduğunda Aslan'ın brief'inde belirtilen
--       7 widget mantıksal akışını görür.
--
-- BULGULAR (Aslan'ın brief'i ile karşılaştırma):
--   - Aslan brief: "sube_mudur ve sube_supervisor için 0 kayıt" → YANLIŞ
--     ROL ADLARI. Sistemde rol adları `mudur` ve `supervisor` (sube_ prefixi
--     YOK). Bu rollere zaten 10 ve 11 widget atanmış durumda.
--   - Pilot Day-1 BLOCKER seviyesinde değil ama Aslan'ın istediği logical
--     akış (today_attendance → late_arrivals → pending_tasks →
--     branch_score → quick_actions → shift_summary → feedback_summary)
--     için sıralama optimize edilmeli + 1 ek widget (pdks_absence)
--     atanmalı.
--
-- ASLAN HEDEF SETİ → MEVCUT WIDGET MAPPING:
--   1. today_attendance     → pdks_attendance     (var, position 10 → 2)
--   2. late_arrivals        → pdks_absence        (YENİ ATAMA, position 3)
--   3. pending_tasks        → todays_tasks        (var, position 4)
--   4. branch_score         → branch_status       (var, position 1)
--   5. quick_actions        → quick_actions       (var, position 9 → 5)
--   6. shift_summary        → (kataloğda widget yok, pdks_attendance içeriyor)
--   7. feedback_summary     → customer_feedback   (var, position 5 → 6)
--
-- KAPSAM DIŞI:
--   - Yeni widget oluşturma (component yazımı gerektirir, frontend scope)
--   - shift_compliance widget'ı (coach'a atanmış ama dashboard_widgets
--     kataloğunda kayıt yok — drift, ayrı task gerektirir)
--
-- IDEMPOTENT: ON CONFLICT (role, widget_key) DO UPDATE pattern.
-- ROLLBACK: scripts/pilot/23-mudur-supervisor-dashboard-pilot-tune-rollback.sql
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- ADIM 1: Lara Müdür kullanıcısı → first_name='Andre' (Aslan saha bilgisi)
-- Andre = Lara franchise sahibi VE müdür, tek kişi çift rol.
-- ────────────────────────────────────────────────────────────────────
UPDATE users
SET first_name = 'Andre', updated_at = NOW()
WHERE username = 'laramudur'
  AND first_name = 'Lara'
  AND role = 'mudur'
  AND branch_id = 8;

-- ────────────────────────────────────────────────────────────────────
-- ADIM 2: mudur rolü → 11 widget (10 mevcut + pdks_absence eklendi)
-- Sıralama Aslan'ın "müdür sabahı görmeli" akışına göre optimize.
-- default_open: ilk 5 widget açık (göz seviyesinde), diğerleri kapalı.
-- ────────────────────────────────────────────────────────────────────

-- Üst sıra (default_open=true) — Pilot kritik widget'lar:
INSERT INTO dashboard_role_widgets (role, widget_key, display_order, is_enabled, default_open, created_at, updated_at)
VALUES
  ('mudur', 'branch_status',      1,  true, true,  NOW(), NOW()),
  ('mudur', 'pdks_attendance',    2,  true, true,  NOW(), NOW()),
  ('mudur', 'pdks_absence',       3,  true, true,  NOW(), NOW()),
  ('mudur', 'todays_tasks',       4,  true, true,  NOW(), NOW()),
  ('mudur', 'quick_actions',      5,  true, true,  NOW(), NOW()),
  ('mudur', 'customer_feedback',  6,  true, false, NOW(), NOW()),
  ('mudur', 'staff_count',        7,  true, false, NOW(), NOW()),
  ('mudur', 'equipment_faults',   8,  true, false, NOW(), NOW()),
  ('mudur', 'leave_requests',     9,  true, false, NOW(), NOW()),
  ('mudur', 'sla_tracker',        10, true, false, NOW(), NOW()),
  ('mudur', 'financial_overview', 11, true, false, NOW(), NOW())
ON CONFLICT (role, widget_key) DO UPDATE SET
  display_order = EXCLUDED.display_order,
  is_enabled    = EXCLUDED.is_enabled,
  default_open  = EXCLUDED.default_open,
  updated_at    = NOW();

-- ────────────────────────────────────────────────────────────────────
-- ADIM 3: supervisor rolü → 12 widget (11 mevcut + pdks_absence eklendi)
-- supervisor finansal görmemeli (mudur'da var, supervisor'da yok — değişmez).
-- branch_score_detail supervisor'a özel (mudur'da yok — değişmez).
-- ────────────────────────────────────────────────────────────────────
INSERT INTO dashboard_role_widgets (role, widget_key, display_order, is_enabled, default_open, created_at, updated_at)
VALUES
  ('supervisor', 'branch_status',       1,  true, true,  NOW(), NOW()),
  ('supervisor', 'pdks_attendance',     2,  true, true,  NOW(), NOW()),
  ('supervisor', 'pdks_absence',        3,  true, true,  NOW(), NOW()),
  ('supervisor', 'todays_tasks',        4,  true, true,  NOW(), NOW()),
  ('supervisor', 'quick_actions',       5,  true, true,  NOW(), NOW()),
  ('supervisor', 'customer_feedback',   6,  true, false, NOW(), NOW()),
  ('supervisor', 'staff_count',         7,  true, false, NOW(), NOW()),
  ('supervisor', 'equipment_faults',    8,  true, false, NOW(), NOW()),
  ('supervisor', 'leave_requests',      9,  true, false, NOW(), NOW()),
  ('supervisor', 'sla_tracker',         10, true, false, NOW(), NOW()),
  ('supervisor', 'training_progress',   11, true, false, NOW(), NOW()),
  ('supervisor', 'branch_score_detail', 12, true, false, NOW(), NOW())
ON CONFLICT (role, widget_key) DO UPDATE SET
  display_order = EXCLUDED.display_order,
  is_enabled    = EXCLUDED.is_enabled,
  default_open  = EXCLUDED.default_open,
  updated_at    = NOW();

-- ────────────────────────────────────────────────────────────────────
-- ADIM 4: DOĞRULAMA RAPORU
-- ────────────────────────────────────────────────────────────────────

\echo ''
\echo '═══════════════════════════════════════════════════════'
\echo 'DOĞRULAMA: Lara Müdür → Andre güncelleme'
\echo '═══════════════════════════════════════════════════════'
SELECT id, username, first_name, last_name, role, branch_id
FROM users WHERE username = 'laramudur';

\echo ''
\echo '═══════════════════════════════════════════════════════'
\echo 'DOĞRULAMA: mudur final widget atama (11 widget)'
\echo '═══════════════════════════════════════════════════════'
SELECT widget_key, display_order, is_enabled, default_open
FROM dashboard_role_widgets WHERE role='mudur' ORDER BY display_order;

\echo ''
\echo '═══════════════════════════════════════════════════════'
\echo 'DOĞRULAMA: supervisor final widget atama (12 widget)'
\echo '═══════════════════════════════════════════════════════'
SELECT widget_key, display_order, is_enabled, default_open
FROM dashboard_role_widgets WHERE role='supervisor' ORDER BY display_order;

COMMIT;

\echo ''
\echo '✅ Pilot 23 tamamlandı: mudur=11 widget, supervisor=12 widget, Lara→Andre güncellendi.'
