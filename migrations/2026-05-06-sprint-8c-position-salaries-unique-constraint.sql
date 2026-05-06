-- ═══════════════════════════════════════════════════════════════════
-- SPRINT 8c — position_salaries UNIQUE Constraint (6 May 2026)
-- ═══════════════════════════════════════════════════════════════════
-- 
-- AMAÇ:
--   position_salaries tablosuna (position_code, effective_from) üzerinde
--   UNIQUE constraint ekle ki gelecekte ON CONFLICT DO NOTHING migration'lar
--   doğru çalışsın.
-- 
-- ARKA PLAN:
--   Sprint 8b (position_salaries Lara seed) migration'ı ON CONFLICT DO NOTHING
--   pattern'ini kullanıyordu, AMA tabloda unique constraint yoktu.
--   Replit Replit Agent bunu yakaladı, WHERE NOT EXISTS pattern'ine geçti
--   (Task #353 raporu, 6 May 2026).
--   
--   Bu migration kalıcı çözümdür: UNIQUE constraint eklenir, gelecek
--   migration'lar ON CONFLICT pattern'ini güvenli kullanabilir.
-- 
-- GÜVENLIK:
--   - Eğer DB'de duplicate varsa CONSTRAINT CREATE fail eder
--     → Pre-check ile duplicate önce raporlanır, varsa migration durur
--   - Idempotent: constraint zaten varsa skip
--   - BEGIN/COMMIT transactional
-- 
-- KAYNAK: Replit Task #354 follow-up (Sprint 8b raporu)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- 1. Pre-check: Duplicate var mı?
-- ═══════════════════════════════════════════════════════════════════
-- (position_code, effective_from) kombinasyonu birden fazla satırda 
-- görünüyorsa migration FAIL etmeli (constraint create violation alır).
-- Manuel temizlik gerek.

SELECT 'PRE_CHECK_DUPLICATES' as report,
  position_code, 
  effective_from::date as effective_from,
  COUNT(*) as duplicate_count
FROM position_salaries
GROUP BY position_code, effective_from
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, position_code;

-- Beklenen: 0 satır (eğer DB temiz ise — Replit Sprint 8b sonrası temizlemişti)
-- Eğer satır varsa: STOP, manuel cleanup gerek.

-- ═══════════════════════════════════════════════════════════════════
-- 2. Pre-check: Constraint zaten var mı?
-- ═══════════════════════════════════════════════════════════════════

SELECT 'PRE_CHECK_CONSTRAINT_EXISTS' as report,
  conname,
  contype
FROM pg_constraint 
WHERE conrelid = 'position_salaries'::regclass
  AND conname = 'position_salaries_code_effective_unique';

-- Beklenen: 0 satır (constraint henüz yok)

-- ═══════════════════════════════════════════════════════════════════
-- 3. UNIQUE constraint ekle (idempotent)
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'position_salaries'::regclass
      AND conname = 'position_salaries_code_effective_unique'
  ) THEN
    ALTER TABLE position_salaries 
    ADD CONSTRAINT position_salaries_code_effective_unique 
    UNIQUE (position_code, effective_from);
    RAISE NOTICE 'UNIQUE constraint added.';
  ELSE
    RAISE NOTICE 'UNIQUE constraint already exists, skipped.';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. Post-verify: Constraint başarıyla oluştu mu?
-- ═══════════════════════════════════════════════════════════════════

SELECT 'POST_CHECK_CONSTRAINT' as report,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'position_salaries'::regclass
  AND contype = 'u'
ORDER BY conname;

-- Beklenen: 1 satır
--   constraint_name: position_salaries_code_effective_unique
--   constraint_type: u
--   definition: UNIQUE (position_code, effective_from)

-- ═══════════════════════════════════════════════════════════════════
-- 5. Toplam satır sayısı (data değişmediğini doğrula)
-- ═══════════════════════════════════════════════════════════════════

SELECT 'POST_CHECK_ROW_COUNT' as report,
  COUNT(*) as total_rows,
  COUNT(DISTINCT position_code) as distinct_position_codes,
  COUNT(DISTINCT (position_code, effective_from)) as distinct_combinations
FROM position_salaries;

-- Beklenen: total_rows = 19 (veya mevcut sayı), 
--          distinct_position_codes ≈ 14 (HQ + Fabrika + Lara),
--          distinct_combinations = total_rows (her satır tek)

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- ROLLBACK PLANI (gerekirse):
--   ALTER TABLE position_salaries 
--   DROP CONSTRAINT IF EXISTS position_salaries_code_effective_unique;
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- SONRAKI ADIM:
--   Bu migration BAŞARILI olduktan sonra:
--   1. Sprint 8b migration dosyası (2026-05-06-position-salaries-lara-seed.sql)
--      ON CONFLICT DO NOTHING pattern'ini güvenli kullanabilir
--   2. Gelecek pozisyon maaş güncellemeleri için pattern hazır
--   3. Sprint 8 ana migration (35 personel UPSERT) çalıştırılabilir
-- ═══════════════════════════════════════════════════════════════════
