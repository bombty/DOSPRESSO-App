-- ═══════════════════════════════════════════════════════════════════
-- TASK #179 — Eski change_log onay metinlerini temizle
-- 23 Nis 2026
-- ═══════════════════════════════════════════════════════════════════
--
-- AMAÇ:
--   Task #164 backfill scripti, factory_recipes.change_log içindeki
--   Task #139 / Task #159 onay satırlarını factory_recipe_approvals
--   tablosuna kopyaladı. Ancak orijinal satırlar change_log içinde
--   duruyor → iki kaynak arasında tutarsızlık riski var.
--
--   Bu migration backfill başarılı olduktan SONRA change_log içindeki
--   Task #139 / #159 satırlarını temizler ve yerine tek satırlık
--   "[migrated to factory_recipe_approvals]" notu bırakır.
--
-- GÜVENLİK:
--   - Sadece factory_recipe_approvals tablosunda ilgili kayıt bulunan
--     reçeteler için temizlik yapılır.
--   - Idempotent: aynı reçete için "[migrated to factory_recipe_approvals]"
--     notu zaten varsa tekrar eklenmez.
--   - Diğer change_log satırları (Task #91, #106, #182, vb.) korunur.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- 1. ÖN-DOĞRULAMA: factory_recipe_approvals tablosu var mı?
-- ────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'factory_recipe_approvals'
  ) THEN
    RAISE EXCEPTION 'factory_recipe_approvals tablosu yok. Önce migrations/task-164-factory-recipe-approvals.sql çalıştırın.';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 2. METRİK — Temizlik öncesi change_log uzunluğu
--    İki ayrı metrik:
--      a) Tüm reçeteler genelinde toplam uzunluk (genel düşüş için)
--      b) Sadece eşleşen reçeteler (lokal düşüş için)
--    Geçici tablo ile kayıt altına alınır; sonradan after-metric ile
--    aynı populasyon üzerinden karşılaştırılır.
-- ────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE _task179_before AS
SELECT
  id,
  LENGTH(change_log) AS before_len,
  (change_log LIKE '%Task #159%' OR change_log LIKE '%Task #139%') AS had_match
FROM factory_recipes;

DO $$
DECLARE
  before_total BIGINT;
  before_matched_len BIGINT;
  before_matched_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(before_len),0) INTO before_total FROM _task179_before;
  SELECT COALESCE(SUM(before_len),0), COUNT(*)
    INTO before_matched_len, before_matched_count
    FROM _task179_before WHERE had_match;
  RAISE NOTICE 'Task #179: ÖNCE → toplam change_log uzunluğu = %, eşleşen reçete sayısı = %, eşleşenlerin uzunluğu = %',
    before_total, before_matched_count, before_matched_len;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 3. TEMİZLİK — Task #139 / #159 satırlarını sil
--    Format örneği:
--      "[2026-04-15 10:23 Task #159 — Sema/hq-sema-gida] gramaj onaylandı\n"
--    Regex açıklaması:
--      \[[^\]]*Task #(139|159)[^\]]*\]   → köşeli parantez bloğu
--      [^\n]*                              → notu (satır sonuna kadar)
--      \n?                                 → opsiyonel satır sonu
-- ────────────────────────────────────────────────────────────────────
UPDATE factory_recipes r
SET change_log = TRIM(BOTH E' \t\n\r' FROM
  regexp_replace(
    r.change_log,
    E'\\[[^\\]]*Task #(139|159)[^\\]]*\\][^\\n]*\\n?',
    '',
    'g'
  )
)
WHERE (r.change_log LIKE '%Task #159%' OR r.change_log LIKE '%Task #139%')
  AND EXISTS (
    SELECT 1 FROM factory_recipe_approvals a
    WHERE a.recipe_id = r.id
      AND a.source_ref IN ('Task #139','Task #159')
  );

-- ────────────────────────────────────────────────────────────────────
-- 4. NOT — Tek satırlık "migrated" işareti bırak (idempotent)
--    Yalnız ilgili reçeteye, ve sadece daha önce eklenmemişse.
-- ────────────────────────────────────────────────────────────────────
UPDATE factory_recipes r
SET change_log = CASE
  WHEN r.change_log IS NULL OR r.change_log = ''
    THEN '[' || to_char(NOW(),'YYYY-MM-DD') || ' Task #179] [migrated to factory_recipe_approvals]'
  ELSE r.change_log || E'\n[' || to_char(NOW(),'YYYY-MM-DD') || ' Task #179] [migrated to factory_recipe_approvals]'
END
WHERE EXISTS (
    SELECT 1 FROM factory_recipe_approvals a
    WHERE a.recipe_id = r.id
      AND a.source_ref IN ('Task #139','Task #159')
  )
  AND EXISTS (
    -- Sadece bu çalıştırmada gerçekten temizlik yapılan reçetelere işaret bırak.
    SELECT 1 FROM _task179_before b
    WHERE b.id = r.id AND b.had_match
  )
  AND (r.change_log IS NULL OR r.change_log NOT LIKE '%[migrated to factory_recipe_approvals]%');

-- ────────────────────────────────────────────────────────────────────
-- 5. VERIFICATION
-- ────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  remaining INTEGER;
  after_total BIGINT;
  after_matched_len BIGINT;
  before_total BIGINT;
  before_matched_len BIGINT;
  migrated_marker INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM factory_recipes
  WHERE change_log LIKE '%Task #159%' OR change_log LIKE '%Task #139%';

  -- Aynı populasyon (tüm reçeteler) üzerinden öncesi/sonrası
  SELECT COALESCE(SUM(LENGTH(change_log)),0) INTO after_total FROM factory_recipes;
  SELECT COALESCE(SUM(before_len),0) INTO before_total FROM _task179_before;

  -- Aynı populasyon (eşleşmiş reçeteler) üzerinden öncesi/sonrası
  SELECT COALESCE(SUM(LENGTH(r.change_log)),0) INTO after_matched_len
  FROM factory_recipes r
  JOIN _task179_before b ON b.id = r.id AND b.had_match;
  SELECT COALESCE(SUM(before_len),0) INTO before_matched_len
  FROM _task179_before WHERE had_match;

  SELECT COUNT(*) INTO migrated_marker
  FROM factory_recipes
  WHERE change_log LIKE '%[migrated to factory_recipe_approvals]%';

  RAISE NOTICE 'Task #179: SONRA → kalan #139/#159 satırı: %, migrated işareti: %', remaining, migrated_marker;
  RAISE NOTICE 'Task #179: change_log uzunluk değişimi (tüm reçeteler) → ÖNCE=% SONRA=% (delta=%)',
    before_total, after_total, (before_total - after_total);
  RAISE NOTICE 'Task #179: change_log uzunluk değişimi (eşleşen reçeteler) → ÖNCE=% SONRA=% (delta=%)',
    before_matched_len, after_matched_len, (before_matched_len - after_matched_len);

  IF remaining > 0 THEN
    RAISE WARNING 'DİKKAT: % reçetede hâlâ Task #139/#159 satırı var. Backfill eksik olabilir; factory_recipe_approvals kontrol edin.', remaining;
  END IF;
END $$;

DROP TABLE IF EXISTS _task179_before;

COMMIT;
