-- ═══════════════════════════════════════════════════════════════════
-- TASK #180 — Reçete düzenlendiğinde mevcut onayları otomatik geçersiz say
-- ═══════════════════════════════════════════════════════════════════
--
-- AMAÇ:
--   Bir reçetenin gramajı/malzemesi değiştiğinde geçmiş gramaj onayları
--   artık güvence sağlamaz. invalidated_at + invalidated_reason kolonları
--   sayesinde uygulama katmanı bu onayları "stale" olarak işaretler.
--   Liste / badge sorguları yalnızca invalidated_at IS NULL satırları
--   "geçerli" sayar.
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE factory_recipe_approvals
  ADD COLUMN IF NOT EXISTS invalidated_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invalidated_reason VARCHAR(100);

CREATE INDEX IF NOT EXISTS fra_invalidated_at_idx
  ON factory_recipe_approvals(invalidated_at);

DO $$
BEGIN
  RAISE NOTICE '✓ Task #180: factory_recipe_approvals.invalidated_at + invalidated_reason hazır';
END $$;

COMMIT;
