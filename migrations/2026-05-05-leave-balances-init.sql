-- ═══════════════════════════════════════════════════════════════════
-- TASK-#343: leave_balances Tablosu + Initial Seed
-- ═══════════════════════════════════════════════════════════════════
-- Tarih:        5 May 2026
-- Sprint:       1 / 4 (İK Schema Foundation)
-- Bağlam:       leave_balances tablosu DB'de yok, frontend (LeaveManagementSection.tsx)
--               kullanıyor, runtime'da boş array dönüyor. İzin bakiyeleri runtime
--               hesaplanıyor, gerçek tabloda kayıt yok.
-- 
-- Done looks like:
--   1. leave_balances tablosu DB'de oluşturuldu
--   2. Mevcut tüm aktif kullanıcılar için 2026 yılı initial bakiye kaydı seed edildi
--   3. Yıllık izin hakkı: İş Kanunu Madde 53 + DOSPRESSO politikası:
--        < 1 yıl    → 0 gün (henüz hak edilmemiş)
--        1-5 yıl    → 14 gün
--        5-15 yıl   → 20 gün
--        15+ yıl    → 26 gün
--   4. used_days = leave_requests'ten approved + leaveType IN ('annual','annual_leave') olanların totalDays toplamı
--   5. carried_over_days = 0 (önceki yıldan devir, ileride kullanım için)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────
-- 1) leave_balances Tablosu
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_balances (
  id                       SERIAL PRIMARY KEY,
  user_id                  VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_year              INTEGER NOT NULL,
  annual_entitlement_days  INTEGER NOT NULL DEFAULT 14,  -- yıllık izin hakkı
  used_days                INTEGER NOT NULL DEFAULT 0,    -- kullanılan
  carried_over_days        INTEGER NOT NULL DEFAULT 0,    -- önceki yıldan devir
  -- Hesaplanan kolon (read-only)
  remaining_days           INTEGER GENERATED ALWAYS AS 
                           (annual_entitlement_days + carried_over_days - used_days) STORED,
  notes                    TEXT,
  last_calculated_at       TIMESTAMP DEFAULT NOW(),
  created_at               TIMESTAMP DEFAULT NOW(),
  updated_at               TIMESTAMP DEFAULT NOW(),
  -- Bir kullanıcı + bir yıl için tek kayıt
  CONSTRAINT leave_balances_user_year_uniq UNIQUE (user_id, period_year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_user ON leave_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(period_year);

COMMENT ON TABLE leave_balances IS 'Kullanıcı bazında yıllık izin bakiyesi (İş Kanunu Madde 53 uyumlu)';
COMMENT ON COLUMN leave_balances.annual_entitlement_days IS 'Yıllık izin hakkı (kıdem süresine göre)';
COMMENT ON COLUMN leave_balances.used_days IS 'O yıl kullanılan izin günü (leave_requests approved toplamı)';
COMMENT ON COLUMN leave_balances.carried_over_days IS 'Önceki yıldan devreden gün (max 14)';
COMMENT ON COLUMN leave_balances.remaining_days IS 'Hesaplanan: entitlement + carried_over - used';

-- ─────────────────────────────────────────────────────────────────
-- 2) Initial Seed: 2026 Yılı için Tüm Aktif Kullanıcılar
-- ─────────────────────────────────────────────────────────────────
-- Önce kıdem süresine göre annual_entitlement hesapla, sonra
-- 2026'da kullanılan izinleri leave_requests'ten topla.

INSERT INTO leave_balances (user_id, period_year, annual_entitlement_days, used_days, carried_over_days, notes)
SELECT 
  u.id AS user_id,
  2026 AS period_year,
  -- İş Kanunu Madde 53 + DOSPRESSO politikası
  CASE 
    WHEN u.start_date IS NULL OR u.start_date > '2025-05-01'::date THEN 0   -- < 1 yıl
    WHEN u.start_date > '2021-05-01'::date THEN 14                            -- 1-5 yıl
    WHEN u.start_date > '2011-05-01'::date THEN 20                            -- 5-15 yıl
    ELSE 26                                                                    -- 15+ yıl
  END AS annual_entitlement_days,
  -- 2026 yılı içinde kullanılan annual leave gün toplamı
  COALESCE((
    SELECT SUM(lr.total_days)::INTEGER
    FROM leave_requests lr
    WHERE lr.user_id = u.id
      AND lr.status = 'approved'
      AND lr.leave_type IN ('annual', 'annual_leave', 'yillik')
      AND EXTRACT(YEAR FROM lr.start_date) = 2026
  ), 0) AS used_days,
  0 AS carried_over_days,
  'Initial seed (5 May 2026 — Sprint 1 schema drift fix)' AS notes
FROM users u
WHERE u.deleted_at IS NULL
  AND u.role NOT IN ('admin', 'kiosk_user', 'tablet_kiosk')  -- sistem kullanıcıları hariç
ON CONFLICT (user_id, period_year) DO NOTHING;  -- idempotent

-- ─────────────────────────────────────────────────────────────────
-- 3) Doğrulama Sorgusu (DRY-RUN için)
-- ─────────────────────────────────────────────────────────────────
-- Aşağıdaki sorgu manuel çalıştırılabilir, EXECUTE'a dahil değil:
--
-- SELECT 
--   COUNT(*) AS total_users,
--   SUM(annual_entitlement_days) AS total_entitlement,
--   SUM(used_days) AS total_used,
--   SUM(remaining_days) AS total_remaining,
--   AVG(remaining_days)::DECIMAL(10,2) AS avg_remaining
-- FROM leave_balances 
-- WHERE period_year = 2026;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- ROLLBACK PLAN (Eğer veri yanlış görünürse):
-- 
-- BEGIN;
-- DELETE FROM leave_balances WHERE notes = 'Initial seed (5 May 2026 — Sprint 1 schema drift fix)';
-- DROP TABLE IF EXISTS leave_balances CASCADE;
-- COMMIT;
-- 
-- Bu işlem leave_requests'i etkilemez (FK sadece users → leave_balances)
-- ═══════════════════════════════════════════════════════════════════
