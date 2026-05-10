-- Migration: 2026-05-11-long-shift-auto-close
-- Amaç: Pilot öncesi temizlik — 12 saatten uzun açık kalan vardiyaları otomatik kapat
-- Çalıştırma: psql $DATABASE_URL -1 -f migrations/2026-05-11-long-shift-auto-close.sql
-- Güvenli: idempotent, sadece 'active'/'on_break' session'ları etkiler

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- 1. BRANCH: on_break olan açık mola loglarını kapat
-- ──────────────────────────────────────────────────────────────
UPDATE branch_break_logs bl
SET
  break_end_time          = NOW(),
  break_duration_minutes  = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - bl.break_start_time))::int / 60)
FROM branch_shift_sessions bss
WHERE bl.session_id = bss.id
  AND bl.break_end_time IS NULL
  AND bss.status IN ('active', 'on_break')
  AND bss.check_in_time < NOW() - INTERVAL '12 hours';

-- ──────────────────────────────────────────────────────────────
-- 2. BRANCH: 12+ saatlik session'ları 'abandoned' olarak kapat
-- ──────────────────────────────────────────────────────────────
UPDATE branch_shift_sessions
SET
  status            = 'abandoned',
  check_out_time    = NOW(),
  work_minutes      = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - check_in_time))::int / 60),
  net_work_minutes  = GREATEST(0,
    EXTRACT(EPOCH FROM (NOW() - check_in_time))::int / 60
    - COALESCE(break_minutes, 0)
  ),
  notes = COALESCE(notes || ' | ', '') || 'AUTO-CLOSED: 12h limit exceeded (2026-05-11 pilot prep)'
WHERE status IN ('active', 'on_break')
  AND check_in_time < NOW() - INTERVAL '12 hours';

-- ──────────────────────────────────────────────────────────────
-- 3. HQ: 12+ saatlik session'ları kapat
-- ──────────────────────────────────────────────────────────────
UPDATE hq_shift_sessions
SET
  status           = 'abandoned',
  check_out_time   = NOW(),
  notes            = COALESCE(notes || ' | ', '') || 'AUTO-CLOSED: 12h limit exceeded (2026-05-11 pilot prep)'
WHERE status IN ('active', 'on_break', 'outside')
  AND check_in_time < NOW() - INTERVAL '12 hours';

-- ──────────────────────────────────────────────────────────────
-- 4. FACTORY: 12+ saatlik session'ları kapat
-- ──────────────────────────────────────────────────────────────
UPDATE factory_shift_sessions
SET
  status           = 'abandoned',
  check_out_time   = NOW(),
  notes            = COALESCE(notes || ' | ', '') || 'AUTO-CLOSED: 12h limit exceeded (2026-05-11 pilot prep)'
WHERE status IN ('active', 'on_break')
  AND check_in_time < NOW() - INTERVAL '12 hours';

-- ──────────────────────────────────────────────────────────────
-- 5. Sonuç özeti
-- ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_branch  int;
  v_hq      int;
  v_factory int;
BEGIN
  SELECT COUNT(*) INTO v_branch  FROM branch_shift_sessions  WHERE notes LIKE '%AUTO-CLOSED%' AND check_out_time::date = CURRENT_DATE;
  SELECT COUNT(*) INTO v_hq      FROM hq_shift_sessions      WHERE notes LIKE '%AUTO-CLOSED%' AND check_out_time::date = CURRENT_DATE;
  SELECT COUNT(*) INTO v_factory FROM factory_shift_sessions WHERE notes LIKE '%AUTO-CLOSED%' AND check_out_time::date = CURRENT_DATE;
  RAISE NOTICE 'AUTO-CLOSE tamamlandi -- Branch: %, HQ: %, Factory: %', v_branch, v_hq, v_factory;
END $$;

COMMIT;
