-- =====================================================================
-- Karar 2 ROLLBACK: mudur_b8 (İbrahim) tekrar aktif et
-- Tarih: 26 Nis 2026
-- =====================================================================

BEGIN;

UPDATE users
SET is_active = true,
    updated_at = NOW()
WHERE username = 'mudur_b8';

SELECT id, username, first_name, last_name, role, branch_id, is_active
FROM users
WHERE username = 'mudur_b8';

COMMIT;
