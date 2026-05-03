-- ============================================================
-- F36 — PIN Coverage Audit (READ-ONLY, dry-run)
-- Owner: Aslan | Pilot Day-1 öncesi PIN seed kapsama kontrolü
-- Tarih: 2026-05-03
-- Tablolar:
--   - branch_staff_pins  : Şube kiosk PIN'leri (BRANCH_ROLES)
--   - factory_staff_pins : Fabrika kiosk PIN'leri (FACTORY_FLOOR + uretim_sefi/sef/recete_gm/fabrika_mudur/fabrika_depo/fabrika)
--   - hq_staff_pins      : YOK (HQ kioskı PIN tablosu mevcut değil → HQ rolleri sadece web login)
--
-- ÇALIŞTIRMA: psql $DATABASE_URL -f scripts/audit/pin-coverage-2026-05.sql
-- DB WRITE YOK. Sadece SELECT.
-- ============================================================

\echo '=== 1) GENEL ÖZET — Aktif Kullanıcı / PIN Sayıları ==='
SELECT
  (SELECT COUNT(*) FROM users WHERE is_active = true) AS toplam_aktif_kullanici,
  (SELECT COUNT(*) FROM branch_staff_pins WHERE is_active = true) AS aktif_branch_pin,
  (SELECT COUNT(*) FROM factory_staff_pins WHERE is_active = true) AS aktif_factory_pin;

\echo ''
\echo '=== 2) BRANCH PIN — Eksik kullanıcılar (rol bazlı) ==='
\echo 'Beklenen: stajyer, bar_buddy, barista, supervisor_buddy, supervisor, mudur'
\echo '(yatirimci_branch ve sube_kiosk hariç — bu roller kioska girmez)'
SELECT
  u.role,
  COUNT(*) AS pin_eksik_sayi,
  STRING_AGG(u.id::text || ' (' || COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ', branch=' || COALESCE(u.branch_id::text,'NULL') || ')', E'\n  ' ORDER BY u.id) AS detay
FROM users u
LEFT JOIN branch_staff_pins p
  ON p.user_id = u.id
 AND p.is_active = true
 AND p.branch_id = u.branch_id
WHERE u.is_active = true
  AND u.branch_id IS NOT NULL  -- branch_id NULL kullanıcılar Bölüm 4'te raporlanır (çift sayım önleme)
  AND u.role IN ('stajyer','bar_buddy','barista','supervisor_buddy','supervisor','mudur')
  AND p.id IS NULL
GROUP BY u.role
ORDER BY u.role;

\echo ''
\echo '=== 3) FACTORY PIN — Eksik kullanıcılar (rol bazlı) ==='
\echo 'Beklenen: uretim_sefi, fabrika_operator, fabrika_sorumlu, fabrika_personel,'
\echo '          fabrika_depo, sef, recete_gm, fabrika_mudur, fabrika'
SELECT
  u.role,
  COUNT(*) AS pin_eksik_sayi,
  STRING_AGG(u.id::text || ' (' || COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ')', E'\n  ' ORDER BY u.id) AS detay
FROM users u
LEFT JOIN factory_staff_pins p
  ON p.user_id = u.id
 AND p.is_active = true
WHERE u.is_active = true
  AND u.role IN ('uretim_sefi','fabrika_operator','fabrika_sorumlu','fabrika_personel','fabrika_depo','sef','recete_gm','fabrika_mudur','fabrika')
  AND p.id IS NULL
GROUP BY u.role
ORDER BY u.role;

\echo ''
\echo '=== 4) ŞÜPHELİ — branchId NULL ama BRANCH rolünde aktif kullanıcı ==='
\echo '(PIN tablosuna yazılamaz çünkü branch_id NOT NULL — önce branch atanmalı)'
SELECT id, role, first_name, last_name, email
FROM users
WHERE is_active = true
  AND role IN ('stajyer','bar_buddy','barista','supervisor_buddy','supervisor','mudur')
  AND branch_id IS NULL
ORDER BY role, id;

\echo ''
\echo '=== 5) ŞÜPHELİ — Kilitli PIN sayısı (locked_until > now) ==='
SELECT 'branch' AS kaynak, COUNT(*) AS kilitli_pin
FROM branch_staff_pins
WHERE pin_locked_until IS NOT NULL AND pin_locked_until > NOW()
UNION ALL
SELECT 'factory' AS kaynak, COUNT(*) AS kilitli_pin
FROM factory_staff_pins
WHERE pin_locked_until IS NOT NULL AND pin_locked_until > NOW();

\echo ''
\echo '=== 6) ŞÜPHELİ — Pasif kullanıcı PIN aktif (temizlik adayı) ==='
SELECT 'branch' AS kaynak, p.user_id, u.role, u.is_active
FROM branch_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE p.is_active = true AND u.is_active = false
UNION ALL
SELECT 'factory' AS kaynak, p.user_id, u.role, u.is_active
FROM factory_staff_pins p
JOIN users u ON u.id = p.user_id
WHERE p.is_active = true AND u.is_active = false
ORDER BY kaynak, user_id;

\echo ''
\echo '=== 7) KAPSAMA YÜZDESI — Rol bazlı ==='
WITH branch_target AS (
  SELECT u.role, COUNT(*) AS toplam
  FROM users u
  WHERE u.is_active = true
    AND u.role IN ('stajyer','bar_buddy','barista','supervisor_buddy','supervisor','mudur')
    AND u.branch_id IS NOT NULL
  GROUP BY u.role
),
branch_have AS (
  SELECT u.role, COUNT(*) AS sahip
  FROM users u
  JOIN branch_staff_pins p
    ON p.user_id = u.id AND p.is_active = true AND p.branch_id = u.branch_id
  WHERE u.is_active = true
  GROUP BY u.role
),
factory_target AS (
  SELECT u.role, COUNT(*) AS toplam
  FROM users u
  WHERE u.is_active = true
    AND u.role IN ('uretim_sefi','fabrika_operator','fabrika_sorumlu','fabrika_personel','fabrika_depo','sef','recete_gm','fabrika_mudur','fabrika')
  GROUP BY u.role
),
factory_have AS (
  SELECT u.role, COUNT(*) AS sahip
  FROM users u
  JOIN factory_staff_pins p
    ON p.user_id = u.id AND p.is_active = true
  WHERE u.is_active = true
  GROUP BY u.role
)
SELECT 'branch' AS kaynak, t.role, t.toplam, COALESCE(h.sahip,0) AS pin_sahip,
       ROUND(100.0 * COALESCE(h.sahip,0) / NULLIF(t.toplam,0), 1) AS yuzde
FROM branch_target t
LEFT JOIN branch_have h USING (role)
UNION ALL
SELECT 'factory' AS kaynak, t.role, t.toplam, COALESCE(h.sahip,0) AS pin_sahip,
       ROUND(100.0 * COALESCE(h.sahip,0) / NULLIF(t.toplam,0), 1) AS yuzde
FROM factory_target t
LEFT JOIN factory_have h USING (role)
ORDER BY kaynak, role;

\echo ''
\echo '=== AUDIT BİTTİ — Aşağıdaki adımlar:'
\echo '  1) Çıktıyı docs/audit/comprehensive-2026-05/pin-coverage-out.txt e kaydet'
\echo '  2) Eksik PIN listesi → Plan mode + isolated agent ile seed migration üret'
\echo '  3) GO komutu owner Aslan tarafından verilir (DB WRITE)'
