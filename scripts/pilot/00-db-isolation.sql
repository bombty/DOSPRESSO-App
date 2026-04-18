-- =====================================================================
-- 00 — Pilot DB Mantıksal İzolasyon (Seçenek B)
-- Pazar 27 Nis 2026, 22:30 (backup öncesi son adım)
-- =====================================================================
-- KAYNAK: docs/pilot/db-izolasyon-raporu.md §4
-- AMAÇ:
--   1) 61 test/seed user'ı deaktive et
--   2) 18 non-pilot branch'i deaktive et
--   3) 2 test branch'i soft-delete
--   4) Audit log girişi
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 1. Test/seed user'ları deaktive et (DAR PATTERN — Code review CRITICAL fix)
-- ─────────────────────────────────────────────────────────────────────
-- ⚠️ DİKKAT: '%test%' ILIKE çok geniş — gerçek isimleri (örn 'tester_murat',
-- 'bestenur_test') yakalayabilir. Aşağıdaki pattern sadece BAŞINDA/SONUNDA
-- veya nokta/altçizgi ile ayrılmış 'test', 'seed', 'mock' yakalar.
-- ─────────────────────────────────────────────────────────────────────
-- ÖNCE DRY-RUN: bu SELECT ile silinecekleri gözden geçir, sonra UPDATE'i çalıştır
SELECT id, username, role, branch_id
FROM users
WHERE (
    username ~* '^(test|seed|mock|demo)([_.\-]|$)'    -- başında test/seed/mock/demo
    OR username ~* '([_.\-]|^)(test|seed|mock|demo)$' -- sonunda  
    OR username ~* '([_.\-])(test|seed|mock)([_.\-])' -- ortada nokta/altçizgi/tire ile
  )
  AND is_active = true
  AND username NOT IN ('adminhq')
ORDER BY id;
-- ☝️ Pazar 22:30'da bu listeyi GÖZDEN GEÇİR. Yanlış user yakalanırsa
-- deactivation pattern'i daha da daralt veya whitelist ile değiştir.

-- DRY-RUN onayından sonra UPDATE çalıştırılır:
WITH deactivated_users AS (
  UPDATE users
  SET is_active = false,
      updated_at = NOW()
  WHERE (
      username ~* '^(test|seed|mock|demo)([_.\-]|$)'
      OR username ~* '([_.\-]|^)(test|seed|mock|demo)$'
      OR username ~* '([_.\-])(test|seed|mock)([_.\-])'
    )
    AND is_active = true
    AND username NOT IN ('adminhq')
  RETURNING id, username
)
SELECT count(*) AS deactivated_user_count FROM deactivated_users;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Non-pilot branch'leri deaktive et (16 + 2 test = 18)
-- ─────────────────────────────────────────────────────────────────────
WITH deactivated_branches AS (
  UPDATE branches
  SET is_active = false
  WHERE id NOT IN (5, 8, 23, 24)  -- 4 pilot lokasyon: Işıklar, Lara, HQ, Fabrika
    AND is_active = true
  RETURNING id, name
)
SELECT count(*) AS deactivated_branch_count FROM deactivated_branches;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Test branch'leri soft-delete (admin sidebar'dan tamamen sakla)
-- ─────────────────────────────────────────────────────────────────────
UPDATE branches
SET deleted_at = NOW()
WHERE id IN (1, 4)  -- Test Branch 1, Örnek şube
  AND deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Audit log girişi
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO audit_logs (user_id, action, target_type, target_id, details, created_at)
VALUES (
  (SELECT id FROM users WHERE username = 'adminhq' LIMIT 1),
  'PILOT_DB_ISOLATION_APPLIED',
  'branches+users',
  'multiple',
  jsonb_build_object(
    'pilot_branches_active', ARRAY[5, 8, 23, 24],
    'pilot_branch_names', ARRAY['Işıklar', 'Antalya Lara', 'Merkez Ofis (HQ)', 'Fabrika'],
    'reason', 'Pilot 28 Nis 2026 — mantıksal izolasyon (Seçenek B)'
  ),
  NOW()
);

-- ─────────────────────────────────────────────────────────────────────
-- 5. DOĞRULAMA SORGULARI
-- ─────────────────────────────────────────────────────────────────────
-- A) Active user/branch sayıları
SELECT
  (SELECT count(*) FROM users WHERE is_active = true AND deleted_at IS NULL) AS active_users,
  (SELECT count(*) FROM users WHERE is_active = false) AS inactive_users,
  (SELECT count(*) FROM branches WHERE is_active = true AND deleted_at IS NULL) AS active_branches,
  (SELECT count(*) FROM branches WHERE is_active = false OR deleted_at IS NOT NULL) AS inactive_branches;

-- Beklenen:
--   active_users:    ~290 (350 toplam - 61 test + adminhq dahil)
--   active_branches: 4 (sadece pilot)
--   inactive_branches: 18

-- B) Pilot branch'leri tek tek
SELECT id, name, is_active, deleted_at IS NOT NULL AS deleted
FROM branches
WHERE id IN (5, 8, 23, 24)
ORDER BY id;
-- Beklenen: 4 satır, hepsi is_active=true, deleted=false

-- C) Test branch'leri silindi mi?
SELECT id, name, deleted_at
FROM branches
WHERE id IN (1, 4);
-- Beklenen: 2 satır, deleted_at = bugün

COMMIT;

-- =====================================================================
-- ROLLBACK SCRIPT (Acil durum):
-- =====================================================================
-- Pazar 23:00 backup'tan geri yükle:
--   psql "$DATABASE_URL" < /tmp/pilot-backup-2026-04-27.sql
--
-- Veya manuel kısmi rollback:
--   UPDATE branches SET is_active = true WHERE id NOT IN (5, 8, 23, 24);
--   UPDATE branches SET deleted_at = NULL WHERE id IN (1, 4);
--   UPDATE users SET is_active = true
--     WHERE (username ILIKE '%test%' OR username ILIKE '%seed%')
--       AND is_active = false;
-- =====================================================================
