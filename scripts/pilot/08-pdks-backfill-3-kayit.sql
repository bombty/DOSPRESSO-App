-- ════════════════════════════════════════════════════════════════════
-- 08 — PDKS BACKFILL: 3 Eksik Kiosk Kaydı (Pilot Öncesi Fix)
-- ════════════════════════════════════════════════════════════════════
-- Tarih:    20.04.2026 (Pazartesi 09:00 hazırlığı)
-- Bağlam:   B.1 consistency-check missing_pdks_record=4 bulgusu
-- Etki:     3 pilot şubesi kaydı (Işıklar=2, Fabrika=1) — Test Branch 1 yoksay
-- Kök neden: server/routes/branches.ts:2910-2922 silent try/catch swallow
--           (Pazartesi sabah Claude transaction guard fix yazacak — Sprint D)
--
-- ÇALIŞTIRMA: Pazartesi 28.04.2026 ~09:00 (pilot başlamadan ÖNCE)
--   psql "$DATABASE_URL" -f scripts/pilot/08-pdks-backfill-3-kayit.sql
--
-- IDEMPOTENT: NOT EXISTS kontrolü ile 2 kez çalıştırılırsa 0 satır insert eder.
-- ROLLBACK:   DELETE FROM pdks_records WHERE source = 'kiosk_backfill_d1';
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── PRECONDITION: pilot kullanıcılar mevcut mu? ───────────────────
-- Sabit UUID kullanımı yerine username lookup (Task #214)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'basri' AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Pilot kullanıcısı "basri" (supervisor, Işıklar) bulunamadı — yanlış DB?';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'busradogmus20' AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Pilot kullanıcısı "busradogmus20" (fabrika_operator, Fabrika) bulunamadı — yanlış DB?';
  END IF;
END $$;

-- Kanıt: hangi 3 kayıt geri dolduruluyor?
\echo '──── BACKFILL ÖNCESİ DURUM ────'
SELECT
  COALESCE(u.first_name || ' ' || u.last_name, u.username) AS user_name,
  s.branch_id,
  b.name AS branch,
  s.shift_date,
  TO_CHAR((sa.check_in_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul')::time, 'HH24:MI:SS') AS check_in_tr_time,
  CASE WHEN EXISTS (
    SELECT 1 FROM pdks_records pr
    WHERE pr.user_id = sa.user_id
      AND pr.record_date = s.shift_date
      AND pr.record_type = 'giris'
  ) THEN 'PDKS VAR (atla)' ELSE 'EKSİK (insert)' END AS durum
FROM shift_attendance sa
INNER JOIN shifts s ON sa.shift_id = s.id
LEFT JOIN branches b ON s.branch_id = b.id
LEFT JOIN users u ON sa.user_id = u.id
WHERE sa.user_id IN (
  (SELECT id FROM users WHERE username = 'basri'),          -- Basri Şen (supervisor, Işıklar)
  (SELECT id FROM users WHERE username = 'busradogmus20')   -- Büşra Doğmuş (fabrika_operator, Fabrika)
)
AND s.shift_date IN ('2026-03-21'::date, '2026-03-29'::date, '2026-04-02'::date)
AND sa.check_in_time IS NOT NULL
ORDER BY s.shift_date;

-- ════════════════════════════════════════════════════════════════════
-- BACKFILL INSERT (idempotent, NOT EXISTS guard)
-- ════════════════════════════════════════════════════════════════════
\echo '──── BACKFILL INSERT ────'
INSERT INTO pdks_records (
  user_id, branch_id, record_date, record_time, record_type, source, device_info, created_at
)
SELECT
  sa.user_id,
  s.branch_id,
  s.shift_date,
  -- TR saat dilimine çevir, time'a downcast (HH:MM:SS)
  ((sa.check_in_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul')::time) AS record_time,
  'giris',
  'kiosk_backfill_d1',
  'pilot_backfill_28042026',
  NOW()
FROM shift_attendance sa
INNER JOIN shifts s ON sa.shift_id = s.id
WHERE sa.user_id IN (
  'f8319722-c617-4694-aeae-98b5789b0b97',  -- Basri Şen
  '41d2a9f0-f3be-45d0-90cc-e2aa585cfcc9'   -- Büşra Doğmuş
)
AND s.shift_date IN ('2026-03-21'::date, '2026-03-29'::date, '2026-04-02'::date)
AND sa.check_in_time IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM pdks_records pr
  WHERE pr.user_id = sa.user_id
    AND pr.record_date = s.shift_date
    AND pr.record_type = 'giris'
);

-- ════════════════════════════════════════════════════════════════════
-- DOĞRULAMA: missing_pdks_record artık 0 olmalı (test branch hariç)
-- ════════════════════════════════════════════════════════════════════
\echo '──── BACKFILL SONRASI: pilot şubelerde missing_pdks_record ────'
SELECT
  s.branch_id,
  b.name AS branch_name,
  COUNT(*) AS still_missing
FROM shift_attendance sa
INNER JOIN shifts s ON sa.shift_id = s.id
LEFT JOIN branches b ON s.branch_id = b.id
LEFT JOIN pdks_records pr ON pr.user_id = sa.user_id
  AND pr.record_date = s.shift_date
  AND pr.record_type = 'giris'
WHERE sa.check_in_time IS NOT NULL
  AND s.shift_date >= NOW() - INTERVAL '30 days'
  AND pr.id IS NULL
  AND s.branch_id IN (5, 8, 23, 24)  -- yalnız pilot şubeler
GROUP BY s.branch_id, b.name
ORDER BY still_missing DESC;
-- Beklenen sonuç: 0 satır (pilot şubelerde eksik kayıt kalmadı)

\echo '──── BACKFILL kayıtları (audit izi) ────'
SELECT id, user_id, branch_id, record_date, record_time, source, device_info, created_at
FROM pdks_records
WHERE source = 'kiosk_backfill_d1'
ORDER BY record_date;

COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- POST-RUN: B.1 endpoint'inde tekrar test et:
--   curl -sS -b /tmp/admin-cookie.txt \
--     "http://localhost:5000/api/pdks/consistency-check?days=30" | \
--     jq '.inconsistencies.missing_pdks_record.count'
--   # Beklenen: 1 (yalnız Test Branch 1 / Admin DOSPRESSO 03.04 — yoksayılır)
-- ════════════════════════════════════════════════════════════════════
