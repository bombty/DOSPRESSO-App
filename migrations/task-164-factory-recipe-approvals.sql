-- ═══════════════════════════════════════════════════════════════════
-- TASK #164 — Reçete onay durumunu yapılandırılmış kolonda tut
-- 23 Nis 2026
-- ═══════════════════════════════════════════════════════════════════
--
-- AMAÇ:
--   Şu ana kadar reçete onayları factory_recipes.change_log içinde
--   serbest metin olarak tutuluyordu (Task #139, #159).
--   Yeni factory_recipe_approvals tablosu raporlama, "kaç reçete
--   onaysız?" sorgusu ve UI badge'i için yapılandırılmış kayıt sağlar.
--
-- IDEMPOTENT:
--   - CREATE TABLE IF NOT EXISTS
--   - Backfill: aynı (recipe_id, scope, source_ref) zaten varsa skip.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- 1. TABLO
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factory_recipe_approvals (
  id                       SERIAL PRIMARY KEY,
  recipe_id                INTEGER NOT NULL
    REFERENCES factory_recipes(id) ON DELETE CASCADE,
  scope                    VARCHAR(20) NOT NULL,
  approved_by              VARCHAR NOT NULL
    REFERENCES users(id) ON DELETE RESTRICT,
  approved_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note                     TEXT,
  recipe_version_id        INTEGER
    REFERENCES factory_recipe_versions(id) ON DELETE SET NULL,
  recipe_version_number    INTEGER,
  source_ref               VARCHAR(50),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fra_recipe_idx        ON factory_recipe_approvals(recipe_id);
CREATE INDEX IF NOT EXISTS fra_recipe_scope_idx  ON factory_recipe_approvals(recipe_id, scope);
CREATE INDEX IF NOT EXISTS fra_scope_idx         ON factory_recipe_approvals(scope);
CREATE INDEX IF NOT EXISTS fra_approved_at_idx   ON factory_recipe_approvals(approved_at);

-- ────────────────────────────────────────────────────────────────────
-- 2. BACKFILL — Task #159 (gramaj) onayları
--    change_log içinde "[2026-... Task #159 — Sema/<user>]" formatı.
-- ────────────────────────────────────────────────────────────────────
INSERT INTO factory_recipe_approvals
  (recipe_id, scope, approved_by, approved_at, note, source_ref)
SELECT
  r.id,
  'gramaj',
  -- FK güvenli çözüm: parse'tan dönen user yoksa hq-sema-gida'ya, o da yoksa
  -- mevcut herhangi bir admin'e düş. (FK violation INSERT zamanında oluşmasın.)
  COALESCE(
    (SELECT u.id FROM users u
     WHERE u.id = (regexp_match(r.change_log, 'Task #159[^—]*—\s*[^/]*/([a-zA-Z0-9_-]+)'))[1]
     LIMIT 1),
    (SELECT u.id FROM users u WHERE u.id = 'hq-sema-gida' LIMIT 1),
    (SELECT u.id FROM users u WHERE u.role = 'admin' AND u.is_active = true ORDER BY u.id LIMIT 1)
  ),
  COALESCE(
    NULLIF((regexp_match(r.change_log, '\[(\d{4}-\d{2}-\d{2})[^]]*Task #159'))[1], '')::timestamptz,
    r.updated_at,
    NOW()
  ),
  -- Notu satır olarak çıkart
  NULLIF(TRIM(BOTH E' \t\n\r' FROM
    COALESCE(
      (regexp_match(r.change_log, 'Task #159[^\]]*\]\s*([^\n\[]+)'))[1],
      ''
    )
  ), ''),
  'Task #159'
FROM factory_recipes r
WHERE r.change_log LIKE '%Task #159%'
  AND NOT EXISTS (
    SELECT 1 FROM factory_recipe_approvals a
    WHERE a.recipe_id = r.id
      AND a.scope = 'gramaj'
      AND a.source_ref = 'Task #159'
  );

-- ────────────────────────────────────────────────────────────────────
-- 3. BACKFILL — Task #139 (besin) onayları
--    change_log içinde "Task #139" referansı varsa scope='besin'.
--    (NOT: Task #139 esas olarak factory_ingredient_nutrition'a yazdı;
--     reçete bazında change_log içinde geçen kayıtlar varsa onları al.)
-- ────────────────────────────────────────────────────────────────────
INSERT INTO factory_recipe_approvals
  (recipe_id, scope, approved_by, approved_at, note, source_ref)
SELECT
  r.id,
  'besin',
  COALESCE(
    (SELECT u.id FROM users u
     WHERE u.id = (regexp_match(r.change_log, 'Task #139[^—]*—\s*[^/]*/([a-zA-Z0-9_-]+)'))[1]
     LIMIT 1),
    (SELECT u.id FROM users u WHERE u.id = 'hq-sema-gida' LIMIT 1),
    (SELECT u.id FROM users u WHERE u.role = 'admin' AND u.is_active = true ORDER BY u.id LIMIT 1)
  ),
  COALESCE(
    NULLIF((regexp_match(r.change_log, '\[(\d{4}-\d{2}-\d{2})[^]]*Task #139'))[1], '')::timestamptz,
    r.updated_at,
    NOW()
  ),
  NULLIF(TRIM(BOTH E' \t\n\r' FROM
    COALESCE(
      (regexp_match(r.change_log, 'Task #139[^\]]*\]\s*([^\n\[]+)'))[1],
      ''
    )
  ), ''),
  'Task #139'
FROM factory_recipes r
WHERE r.change_log LIKE '%Task #139%'
  AND NOT EXISTS (
    SELECT 1 FROM factory_recipe_approvals a
    WHERE a.recipe_id = r.id
      AND a.scope = 'besin'
      AND a.source_ref = 'Task #139'
  );

-- ────────────────────────────────────────────────────────────────────
-- 4. VERIFICATION
--    NOT: approved_by FK güvenliği INSERT içindeki COALESCE chain ile
--    sağlanıyor (parse → hq-sema-gida → herhangi bir aktif admin).
-- ────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  approved_count INTEGER;
  changelog_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT recipe_id) INTO approved_count
  FROM factory_recipe_approvals
  WHERE scope = 'gramaj' AND source_ref = 'Task #159';

  SELECT COUNT(*) INTO changelog_count
  FROM factory_recipes
  WHERE change_log LIKE '%Task #159%';

  IF approved_count < changelog_count THEN
    RAISE WARNING 'Backfill eksik: change_log %s reçete, onay tablosu %s reçete', changelog_count, approved_count;
  ELSE
    RAISE NOTICE '✓ Task #164: factory_recipe_approvals hazır (% gramaj onayı backfill edildi)', approved_count;
  END IF;
END $$;

COMMIT;
