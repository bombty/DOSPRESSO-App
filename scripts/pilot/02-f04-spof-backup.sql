-- =====================================================================
-- F04 — 3 SPOF Role Karşılıklı Backup Atama
-- Aslan kararı (19 Nis): Karşılıklı backup
--   recete_gm        ↔ kalite_kontrol
--   kalite_kontrol   ↔ gida_muhendisi
-- Pazartesi 28 Nis 2026, 08:15-08:45 (30 dk)
-- =====================================================================
-- BEKLENEN: AK-02 kararı (A/B/C — backup yöntemi)
-- A) users.backup_roles TEXT[] kolonu (1 saat) — schema değişikliği
-- B) yeni user_role_backups tablosu (2 saat) — audit log dahil
-- C) PERMISSIONS map _backup suffix (30 dk) — kod-only, EN HIZLI
--
-- ⚠️ Bu SQL Senaryo A için yazıldı (en sık kullanılan, kalıcı kayıt)
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- ADIM 1: Schema değişikliği — backup_roles kolonu
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS backup_roles TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS backup_active BOOLEAN DEFAULT false;

-- backup_active: primary user 24h offline ise true (manuel toggle veya cron)
-- backup_roles: hangi rollerin yedek yetkisi var (örn ['kalite_kontrol'])

COMMENT ON COLUMN users.backup_roles IS 'Bu kullanıcının yedek olarak yetki verdiği roller (F04 SPOF mitigation)';
COMMENT ON COLUMN users.backup_active IS '24h primary offline ise true — backup_roles aktif';

-- ─────────────────────────────────────────────────────────────────────
-- ADIM 2: Karşılıklı backup atama (3 user)
-- ─────────────────────────────────────────────────────────────────────
-- recete_gm ↔ kalite_kontrol
UPDATE users
SET backup_roles = ARRAY['kalite_kontrol'],
    updated_at = NOW()
WHERE role = 'recete_gm' AND status = 'active';

-- kalite_kontrol ← recete_gm + → gida_muhendisi
UPDATE users
SET backup_roles = ARRAY['recete_gm', 'gida_muhendisi'],
    updated_at = NOW()
WHERE role = 'kalite_kontrol' AND status = 'active';

-- gida_muhendisi ↔ kalite_kontrol
UPDATE users
SET backup_roles = ARRAY['kalite_kontrol'],
    updated_at = NOW()
WHERE role = 'gida_muhendisi' AND status = 'active';

-- ─────────────────────────────────────────────────────────────────────
-- ADIM 3: Audit log girişi
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO audit_logs (user_id, action, target_type, target_id, details, created_at)
SELECT
  (SELECT id FROM users WHERE username = 'adminhq' LIMIT 1),
  'F04_SPOF_BACKUP_ASSIGNED',
  'users',
  u.id::text,
  jsonb_build_object(
    'role', u.role,
    'backup_roles', u.backup_roles,
    'reason', 'F04 SPOF mitigation — Aslan kararı 19 Nis 2026'
  ),
  NOW()
FROM users u
WHERE u.role IN ('recete_gm', 'kalite_kontrol', 'gida_muhendisi')
  AND u.status = 'active'
  AND u.backup_roles IS NOT NULL
  AND array_length(u.backup_roles, 1) > 0;

-- ─────────────────────────────────────────────────────────────────────
-- DOĞRULAMA
-- ─────────────────────────────────────────────────────────────────────
SELECT id, username, role, backup_roles, backup_active
FROM users
WHERE role IN ('recete_gm', 'kalite_kontrol', 'gida_muhendisi')
  AND status = 'active'
ORDER BY role;

-- Beklenen sonuç (3 satır):
-- recete_gm        | {kalite_kontrol}
-- kalite_kontrol   | {recete_gm, gida_muhendisi}
-- gida_muhendisi   | {kalite_kontrol}

-- ─────────────────────────────────────────────────────────────────────
-- COMMIT (smoke test sonrası)
-- ─────────────────────────────────────────────────────────────────────
COMMIT;

-- Rollback için:
-- ROLLBACK;
-- (kolonu geri kaldırmak istenirse: ALTER TABLE users DROP COLUMN backup_roles;)

-- =====================================================================
-- KOD TARAFI (Pazartesi öğleden sonra eklenecek):
-- shared/schema/schema-02.ts → PERMISSIONS resolver güncelleme:
--   isPermitted(user, 'recete', 'approve') →
--     PERMISSIONS[user.role].recete.approve
--     OR (user.backup_active AND user.backup_roles.some(br =>
--          PERMISSIONS[br].recete.approve))
-- =====================================================================
