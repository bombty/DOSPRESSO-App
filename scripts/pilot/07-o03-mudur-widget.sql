-- =====================================================================
-- O03 — Mudur Rolüne `branch_score_detail` Widget Atama
-- Pazartesi 28 Nis 2026, 12:00-13:00 (1 saat)
-- =====================================================================
-- BULGU: Supervisor'da `branch_score_detail` widget var, mudur'da YOK.
-- Hiyerarşi tutarsız: mudur > supervisor olmalı, widget eksik bug.
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- ADIM 1: Mevcut durum tespit
-- ─────────────────────────────────────────────────────────────────────
SELECT role, widget_key, position, is_active
FROM dashboard_role_widgets
WHERE widget_key = 'branch_score_detail'
ORDER BY role;
-- Beklenen: supervisor var, mudur YOK

-- Mudur'un mevcut widget'ları (referans için)
SELECT widget_key, position
FROM dashboard_role_widgets
WHERE role = 'mudur' AND is_active = true
ORDER BY position;

-- ─────────────────────────────────────────────────────────────────────
-- ADIM 2: Widget metadata'yı doğrula
-- ─────────────────────────────────────────────────────────────────────
SELECT id, widget_key, name, category, default_size
FROM dashboard_widgets
WHERE widget_key = 'branch_score_detail';
-- Beklenen: 1 satır, kategori='operasyon' veya 'personel'

-- ─────────────────────────────────────────────────────────────────────
-- ADIM 3: Mudur'a widget ata
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO dashboard_role_widgets (role, widget_key, position, is_active, created_at, updated_at)
SELECT 
  'mudur',
  'branch_score_detail',
  COALESCE((
    SELECT MAX(position) + 1 
    FROM dashboard_role_widgets 
    WHERE role = 'mudur' AND is_active = true
  ), 1),
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM dashboard_role_widgets 
  WHERE role = 'mudur' AND widget_key = 'branch_score_detail'
);

-- ─────────────────────────────────────────────────────────────────────
-- ADIM 4: Audit log
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO audit_logs (user_id, action, target_type, target_id, details, created_at)
VALUES (
  (SELECT id FROM users WHERE username = 'adminhq' LIMIT 1),
  'O03_WIDGET_ASSIGNED',
  'dashboard_role_widgets',
  'mudur:branch_score_detail',
  jsonb_build_object(
    'role', 'mudur',
    'widget_key', 'branch_score_detail',
    'reason', 'O03 — Hiyerarşi tutarlılığı: supervisor altındaki widget mudur\'da da olmalı'
  ),
  NOW()
);

-- ─────────────────────────────────────────────────────────────────────
-- DOĞRULAMA
-- ─────────────────────────────────────────────────────────────────────
SELECT role, widget_key, position, is_active
FROM dashboard_role_widgets
WHERE widget_key = 'branch_score_detail'
ORDER BY role;
-- Beklenen: 2 satır (mudur + supervisor)

-- Mudur dashboard'ı tam liste (UI doğrulama için)
SELECT widget_key, position
FROM dashboard_role_widgets
WHERE role = 'mudur' AND is_active = true
ORDER BY position;

COMMIT;
-- Rollback: ROLLBACK;

-- =====================================================================
-- FRONTEND DOĞRULAMA (Pazartesi 12:45):
-- 1. Mudur user ile login
-- 2. /komuta-merkezi sayfasına git
-- 3. "Şube Skor Detay" widget'ı görünmeli (önceden yoktu)
-- 4. Widget data API çağrısı 200 dönmeli (403 yok)
-- =====================================================================
