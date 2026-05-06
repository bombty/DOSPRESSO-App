-- ═══════════════════════════════════════════════════════════════════════════
-- Sprint 10 P-7 — HQ Kiosk PIN bcrypt Migration (6 May 2026)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- AMAÇ:
--   HQ kiosk PIN'i şu ana kadar `users.phoneNumber.slice(-4)` ile plaintext
--   karşılaştırılıyordu (D-17 Mart 2026 kararı: "pilot süresince plaintext").
--   Audit Security 4.1 bu kararı revize etti: bcrypt'e geçilmeli.
--
--   Code refactor (server/routes/branches.ts) yapıldı:
--     - Önce branchStaffPins'tan hash'lenmiş PIN aranır
--     - Yoksa phone fallback + lazy migration (ilk login'de bcrypt'e yazar)
--
--   Bu migration: HQ kullanıcılar için PIN'leri TOPLU bcrypt'e geçirir.
--   Lazy migration olmadan, herkesin login PIN'i hazır olur.
--
-- NEDEN BU MIGRATION?
--   Lazy migration yeterli AMA gerçek pilot ortamında ilk gün her HQ kullanıcı
--   PIN'ini girdiğinde fallback path tetiklenir (warn log spam, audit log dolu).
--   Bu migration o ilk-day spam'i önler.
--
-- BAĞIMLILIK:
--   - branchStaffPins tablosu var (Sprint 6 öncesi)
--   - bcrypt extension YOK (PostgreSQL native bcrypt yok)
--   - O yüzden bu SQL bcrypt yapamaz — pgcrypto'nun crypt() fonksiyonunu kullanırız
--   - VEYA: Node.js script (scripts/sprint-10-p7-migrate-hq-pins.ts) yazılır
--
-- BU DOSYA: pgcrypto-tabanlı geçiş (DB-side, daha hızlı, Replit EXECUTE'a uygun)
--
-- KAYIT FORMATI:
--   bcrypt'in $2a$, $2b$, $2y$ varyantları var. Node.js bcrypt $2b$ kullanır.
--   pgcrypto crypt(pin, gen_salt('bf', 10)) → $2a$ döndürür.
--   bcrypt.compare()  $2a$ ve $2b$ ikisini de kabul eder ✅
--
-- DRY-RUN:
--   Bu script idempotent değil (insert) — dikkatli çalıştır.
--   ROLLBACK SQL: aşağıda yorum olarak.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── PRE-CHECK ─────────────────────────────────────────────────────
-- 1. pgcrypto extension hazır mı?
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Mevcut HQ kullanıcı sayısı (HQ branch'inde aktif rolü olan)
DO $$
DECLARE
  hq_user_count INTEGER;
  existing_pin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO hq_user_count
  FROM users
  WHERE is_active = true
    AND phone_number IS NOT NULL
    AND length(phone_number) >= 4
    AND role IN (
      'admin', 'ceo', 'cgo', 'ceo_observer', 'muhasebe_ik', 'satinalma',
      'kalite_kontrol', 'marketing', 'teknik', 'trainer', 'coach', 'destek',
      'yatirimci_hq'
    );

  SELECT COUNT(*) INTO existing_pin_count
  FROM branch_staff_pins
  WHERE branch_id = 23 AND is_active = true;

  RAISE NOTICE '[P-7 PRE-CHECK] HQ kullanıcı (PIN aday): %', hq_user_count;
  RAISE NOTICE '[P-7 PRE-CHECK] Mevcut HQ branch_staff_pins: %', existing_pin_count;
END $$;

-- ─── EXECUTE ──────────────────────────────────────────────────────
-- HQ kullanıcılar için phone_number son 4 hanesini bcrypt hash'le
-- ON CONFLICT DO NOTHING: Zaten PIN'i olan kullanıcılar atlanır

INSERT INTO branch_staff_pins (
  user_id,
  branch_id,
  hashed_pin,
  pin_failed_attempts,
  is_active,
  created_at,
  updated_at
)
SELECT
  u.id AS user_id,
  23 AS branch_id,
  crypt(RIGHT(u.phone_number, 4), gen_salt('bf', 10)) AS hashed_pin,
  0 AS pin_failed_attempts,
  true AS is_active,
  NOW() AS created_at,
  NOW() AS updated_at
FROM users u
WHERE u.is_active = true
  AND u.phone_number IS NOT NULL
  AND length(u.phone_number) >= 4
  AND u.role IN (
    'admin', 'ceo', 'cgo', 'ceo_observer', 'muhasebe_ik', 'satinalma',
    'kalite_kontrol', 'marketing', 'teknik', 'trainer', 'coach', 'destek',
    'yatirimci_hq'
  )
ON CONFLICT (user_id, branch_id) DO NOTHING;

-- ─── POST-VERIFY ──────────────────────────────────────────────────
DO $$
DECLARE
  new_pin_count INTEGER;
  total_pin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO new_pin_count
  FROM branch_staff_pins
  WHERE branch_id = 23
    AND is_active = true
    AND created_at >= NOW() - INTERVAL '1 minute';

  SELECT COUNT(*) INTO total_pin_count
  FROM branch_staff_pins
  WHERE branch_id = 23 AND is_active = true;

  RAISE NOTICE '[P-7 POST-CHECK] Yeni eklenen HQ PIN: %', new_pin_count;
  RAISE NOTICE '[P-7 POST-CHECK] Toplam aktif HQ PIN: %', total_pin_count;
END $$;

-- ─── AUDIT LOG ────────────────────────────────────────────────────
-- Bu migration'ın yapıldığını kayıt altına al (audit_logs)
INSERT INTO audit_logs (
  event_type,
  user_id,
  actor_role,
  scope_branch_id,
  action,
  resource,
  resource_id,
  details,
  created_at
)
VALUES (
  'kiosk.hq_pin_bulk_migration',
  NULL,  -- system action
  'system',
  23,
  'migration.bcrypt_hash',
  'branch_staff_pins',
  'sprint-10-p7',
  jsonb_build_object(
    'sprint', '10',
    'task', 'P-7',
    'migration_date', '2026-05-06',
    'migration_type', 'phone_pin_to_bcrypt_bulk',
    'note', 'HQ kullanıcılar için phone son 4 → bcrypt hash. Lazy migration ile eşgüdüm.'
  ),
  NOW()
);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK SQL (acil geri alma — DİKKAT, hash'lenmiş PIN'leri siler)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- BEGIN;
-- DELETE FROM branch_staff_pins
-- WHERE branch_id = 23
--   AND created_at >= '2026-05-06 00:00:00'
--   AND created_at <  '2026-05-07 00:00:00';
-- COMMIT;
--
-- Bu silmeden sonra HQ kullanıcılar phone-fallback path ile login olabilir.
-- ═══════════════════════════════════════════════════════════════════════════
