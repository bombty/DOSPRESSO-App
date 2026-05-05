-- ═══════════════════════════════════════════════════════════════════
-- Sprint 17 (5 May 2026) - pg_stat_statements + Slow Query Logging Enable
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Aslan'ın talebi (Replit raporu):
--   "pg_stat_statements yok — slow query/error endpoint ölçülemedi"
-- 
-- ÇÖZÜM:
--   1. pg_stat_statements extension enable (Neon serverless destekler)
--   2. Slow query threshold ayarla (>500ms log)
--   3. APM-lite query monitoring view'ları oluştur
-- 
-- KISITLAMA - NEON SERVERLESS:
--   Neon DB'de pg_stat_statements extension çalışıyor ama 
--   bazı parametreler superuser gerektirir (postgres rolü).
--   Kullanıcı parametreleri için ALTER SYSTEM yerine ALTER DATABASE.
-- 
-- VERIFY:
--   SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';
--   Beklenen: 1 satır (extversion bilgisi ile)
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- ADIM 0: BASELINE - Mevcut extension'lar
-- ───────────────────────────────────────────────────────────────────

SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('pg_stat_statements', 'pg_trgm', 'uuid-ossp')
ORDER BY extname;
-- Beklenen öncesi: pg_stat_statements yoksa hiç satır

-- ───────────────────────────────────────────────────────────────────
-- ADIM 1: pg_stat_statements Extension Enable
-- ───────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ⚠️ NOT: Bazı Neon ortamlarında shared_preload_libraries
-- 'da pg_stat_statements zaten yüklü olmalı. Yoksa Neon dashboard'dan
-- enable etmek gerekebilir. Bu durumda CREATE EXTENSION fail eder
-- → DBA action gerek (Aslan support@neon.tech'e yaz).

-- ───────────────────────────────────────────────────────────────────
-- ADIM 2: APM-lite Query Monitoring View'ları
-- ───────────────────────────────────────────────────────────────────
-- 
-- Bu view'lar pg_stat_statements üzerinden Aslan/Claude'un
-- DB performance'ı analiz etmesi için.
-- ───────────────────────────────────────────────────────────────────

-- View 1: En yavaş 20 sorgu (mean exec time)
CREATE OR REPLACE VIEW v_slow_queries_top20 AS
SELECT 
  substring(query FROM 1 FOR 200) AS query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) AS mean_ms,
  ROUND(total_exec_time::numeric, 2) AS total_ms,
  ROUND((100.0 * total_exec_time / SUM(total_exec_time) OVER ())::numeric, 2) AS pct_total_time,
  ROUND(rows::numeric / NULLIF(calls, 0), 1) AS avg_rows_per_call
FROM pg_stat_statements
WHERE query NOT LIKE 'COMMIT%' 
  AND query NOT LIKE 'BEGIN%'
  AND query NOT LIKE 'SET %'
  AND calls > 5  -- en az 5 çağrı (gürültüyü filtrele)
ORDER BY mean_exec_time DESC
LIMIT 20;

-- View 2: En çok çağrılan 20 sorgu (call count)
CREATE OR REPLACE VIEW v_most_called_queries_top20 AS
SELECT 
  substring(query FROM 1 FOR 200) AS query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) AS mean_ms,
  ROUND(total_exec_time::numeric, 2) AS total_ms,
  ROUND((100.0 * calls / SUM(calls) OVER ())::numeric, 2) AS pct_total_calls
FROM pg_stat_statements
WHERE query NOT LIKE 'COMMIT%' 
  AND query NOT LIKE 'BEGIN%'
ORDER BY calls DESC
LIMIT 20;

-- View 3: Slow query candidates (>500ms mean OR >100 toplam saniye)
CREATE OR REPLACE VIEW v_slow_query_candidates AS
SELECT 
  substring(query FROM 1 FOR 300) AS query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) AS mean_ms,
  ROUND(total_exec_time::numeric, 2) AS total_ms,
  ROUND((total_exec_time / 1000.0)::numeric, 2) AS total_sec,
  CASE 
    WHEN mean_exec_time > 1000 THEN 'CRITICAL (>1s mean)'
    WHEN mean_exec_time > 500 THEN 'WARN (>500ms mean)'
    WHEN total_exec_time > 100000 THEN 'WARN (>100s total)'
    ELSE 'OK'
  END AS severity
FROM pg_stat_statements
WHERE (mean_exec_time > 500 OR total_exec_time > 100000)
  AND query NOT LIKE 'COMMIT%'
  AND query NOT LIKE 'BEGIN%'
ORDER BY mean_exec_time DESC;

-- View 4: Error tracking helper (boyut/null pattern)
CREATE OR REPLACE VIEW v_query_error_patterns AS
SELECT 
  substring(query FROM 1 FOR 200) AS query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) AS mean_ms,
  rows AS total_rows_returned,
  ROUND(rows::numeric / NULLIF(calls, 0), 1) AS rows_per_call
FROM pg_stat_statements
WHERE rows = 0  -- Hiç sonuç döndürmeyen (potansiyel error veya empty result)
  AND calls > 10
ORDER BY calls DESC
LIMIT 20;

-- ───────────────────────────────────────────────────────────────────
-- ADIM 3: Reset & Restart Helper Function
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pg_stat_statements_reset_safe()
RETURNS void AS $$
BEGIN
  PERFORM pg_stat_statements_reset();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Periyodik reset için (haftalık önerilen):
--   SELECT pg_stat_statements_reset_safe();

-- ───────────────────────────────────────────────────────────────────
-- ADIM 4: Doğrulama
-- ───────────────────────────────────────────────────────────────────

-- 4a) Extension durumu
SELECT 
  extname,
  extversion,
  extnamespace::regnamespace AS schema
FROM pg_extension 
WHERE extname = 'pg_stat_statements';
-- Beklenen: 1 satır

-- 4b) Mevcut top 5 sorgu (ilk durum)
SELECT * FROM v_slow_queries_top20 LIMIT 5;
-- Beklenen: pg_stat_statements henüz yeni → boş veya az satır

-- 4c) View'ların listesi
SELECT viewname FROM pg_views 
WHERE viewname LIKE 'v_slow_%' OR viewname LIKE 'v_most_%' OR viewname LIKE 'v_query_%'
ORDER BY viewname;
-- Beklenen: 4 view

-- ═══════════════════════════════════════════════════════════════════
-- POST-MIGRATION ACTIONS:
-- ═══════════════════════════════════════════════════════════════════
-- 
-- 1. ✅ pg_stat_statements aktif - tüm query'ler izleniyor
-- 2. ⏳ 24 saat veri toplaması bekle (pilot başlangıcında)
-- 3. ⏳ Sonra slow query analizi:
--      SELECT * FROM v_slow_query_candidates;
--      → CRITICAL/WARN olanlar incele, index ekle veya query optimize et
-- 4. ⏳ Periyodik reset (her Pazar gece):
--      SELECT pg_stat_statements_reset_safe();
-- 5. ⏳ APM kurulumu (Sentry veya Datadog):
--      - .env'e SENTRY_DSN ekle
--      - server/index.ts'te Sentry.init() çağır
--      - server/middleware/sentry-monitoring.ts yaz
--      Bu ayrı bir görev, bu migration sadece DB tarafı.
-- 
-- ROLLBACK:
--   DROP VIEW IF EXISTS v_slow_queries_top20;
--   DROP VIEW IF EXISTS v_most_called_queries_top20;
--   DROP VIEW IF EXISTS v_slow_query_candidates;
--   DROP VIEW IF EXISTS v_query_error_patterns;
--   DROP FUNCTION IF EXISTS pg_stat_statements_reset_safe();
--   DROP EXTENSION IF EXISTS pg_stat_statements;  -- Dikkatli ol, başka şeyler kullanıyor olabilir
-- 
-- ═══════════════════════════════════════════════════════════════════
