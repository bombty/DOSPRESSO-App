-- =====================================================================
-- Karar 2: Lara mudur_b8 (İbrahim Keskin) deactivate
-- Tarih: 26 Nis 2026
-- Sebep: İbrahim eski mudur kaydı, Andre (laramudur) yeni atanan müdür.
--        Pilot Day-1'de 2 mudur user görünmemeli, çakışma önlenir.
-- larasupervisor: dokunulmuyor — Andre'nin supervisor durumu Aslan tarafından netleşecek.
-- =====================================================================

BEGIN;

-- Önce mevcut durumu göster
SELECT id, username, first_name, last_name, role, branch_id, is_active, account_status
FROM users
WHERE username IN ('mudur_b8', 'laramudur', 'larasupervisor')
ORDER BY username;

-- Deactivate
UPDATE users
SET is_active = false,
    updated_at = NOW()
WHERE username = 'mudur_b8'
  AND is_active = true;

-- Sonraki durum
SELECT id, username, first_name, last_name, role, branch_id, is_active, account_status
FROM users
WHERE username IN ('mudur_b8', 'laramudur', 'larasupervisor')
ORDER BY username;

-- Lara şubesinde aktif mudur kontrol (1 olmalı: laramudur=Andre)
SELECT 'lara_aktif_mudur_sayisi' as kontrol, count(*) as adet
FROM users
WHERE branch_id = 8 AND role = 'mudur' AND is_active = true AND deleted_at IS NULL;

COMMIT;
