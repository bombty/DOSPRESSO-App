-- ═══════════════════════════════════════════════════════════════════
-- Sprint 16 (5 May 2026) - payroll_parameters 2026 Seed Migration
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Aslan'ın talebi: Replit raporu (5 May, docs/SISTEM-RAPORU-5-MAYIS.md)
--   PİLOT RİSK #5: payroll_parameters=0 — vergi/SGK seed yoksa bordro 0 verir.
-- 
-- KÖK NEDEN:
--   payrollParameters tablosu schema'da var ama hiç kayıt yok.
--   Bordro hesaplama servisi (server/routes/hr.ts payroll endpoint) bu
--   tabloyu okumadan vergi/SGK hesaplayamıyor → tüm bordrolar 0 TL.
-- 
-- ÇÖZÜM:
--   2026 yılı için resmi parametreler seed edilir.
--   ⚠️ DİKKAT: Aşağıdaki değerler Türkiye 2026 başlangıç tahmini.
--   MAHMUT (muhasebe sorumlusu) pilot öncesi gerçek değerleri doğrulamalı:
--     - Resmi Gazete asgari ücret yayını
--     - SGK 2026 oranları (genelde değişmez ama yayında doğrula)
--     - GİB vergi dilim güncellemeleri
-- 
-- KAYNAK:
--   - SGK 2026 prim oranları (resmi gazete)
--   - Gelir İdaresi Başkanlığı 2026 vergi dilimleri
--   - Asgari Ücret Tespit Komisyonu kararı 2026
--   - 4857 Sayılı İş Kanunu (mesai çarpanı %50 = 1.5x)
-- 
-- BACKUP:
--   Migration ÖNCESİ:
--   pg_dump ... -t payroll_parameters > migrations/backups/payroll_params_pre_2026.sql
-- 
-- VERIFY:
--   SELECT * FROM payroll_parameters WHERE year = 2026 AND is_active = true;
--   Beklenen: 1 satır (2026-01-01 - aktif)
-- 
-- ROLLBACK:
--   DELETE FROM payroll_parameters WHERE year = 2026 AND created_at >= '2026-05-05';
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- ADIM 0: BASELINE
-- ───────────────────────────────────────────────────────────────────

SELECT 
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE year = 2025 AND is_active = true) AS active_2025,
  COUNT(*) FILTER (WHERE year = 2026 AND is_active = true) AS active_2026
FROM payroll_parameters;
-- Beklenen: total=0 veya birkaç eski kayıt, active_2026=0

-- ───────────────────────────────────────────────────────────────────
-- ADIM 1: 2026 Parametre Seed (Konservatif tahmin - Mahmut doğrulayacak)
-- ───────────────────────────────────────────────────────────────────
-- 
-- ⚠️ TÜM DEĞERLER KURUŞ (₺ × 100) cinsinden!
-- Örnek: 33.030 TL = 3.303.000 kuruş
-- 
-- ⚠️ TÜM YÜZDELER BİNDE cinsinden!
-- Örnek: %14 = 140, %20.5 = 205
-- ───────────────────────────────────────────────────────────────────

INSERT INTO payroll_parameters (
  year,
  effective_from,
  effective_to,
  is_active,
  
  -- Asgari Ücret 2026 (TAHMİN — Mahmut doğrula)
  -- 2025 sonu: 22.104 TL brüt → 17.002 TL net
  -- 2026 zam beklentisi: ~%30-40 → ~30.000 TL brüt civarı
  -- DİKKAT: Resmi yayına göre güncelle!
  minimum_wage_gross,
  minimum_wage_net,
  
  -- SGK Oranları (genelde 2025 ile aynı)
  sgk_employee_rate,
  sgk_employer_rate,
  unemployment_employee_rate,
  unemployment_employer_rate,
  
  -- Damga Vergisi
  stamp_tax_rate,
  
  -- Gelir Vergisi Dilimleri 2026 (TAHMİN — GİB güncel yayını al)
  tax_bracket_1_limit, tax_bracket_1_rate,
  tax_bracket_2_limit, tax_bracket_2_rate,
  tax_bracket_3_limit, tax_bracket_3_rate,
  tax_bracket_4_limit, tax_bracket_4_rate,
  tax_bracket_5_rate,
  
  -- Muafiyetler 2026 (TAHMİN)
  meal_allowance_tax_exempt_daily,
  meal_allowance_sgk_exempt_daily,
  transport_allowance_exempt_daily,
  
  -- Çalışma Düzeni (genelde sabit)
  working_days_per_month,
  working_hours_per_day,
  overtime_multiplier,
  
  notes,
  created_at,
  updated_at
) VALUES (
  2026,
  '2026-01-01',
  NULL,  -- Aktif (bitiş tarihi yok)
  true,
  
  -- Asgari Ücret (TAHMİN: 2025 + ~%35 artış)
  3303000,    -- 33.030 TL brüt = 3.303.000 kuruş [MAHMUT DOĞRULA]
  2807550,    -- 28.075,50 TL net = 2.807.550 kuruş [MAHMUT DOĞRULA]
  
  -- SGK (2025 ile aynı varsayım, değişiklik için resmi gazete)
  140,        -- %14 SGK işçi
  205,        -- %20.5 SGK işveren  
  10,         -- %1 işsizlik işçi
  20,         -- %2 işsizlik işveren
  
  -- Damga vergisi
  759,        -- binde 7.59
  
  -- 2026 Vergi Dilimleri (TAHMİN — GİB güncel yayını al)
  -- 1. dilim: 0 - 158.000 TL → %15
  15800000, 150,
  -- 2. dilim: 158.000 - 330.000 TL → %20
  33000000, 200,
  -- 3. dilim: 330.000 - 1.200.000 TL → %27
  120000000, 270,
  -- 4. dilim: 1.200.000 - 4.300.000 TL → %35
  430000000, 350,
  -- 5. dilim: 4.300.000+ → %40
  400,
  
  -- Muafiyetler
  30000,      -- 300 TL/gün vergi muafiyeti (yemek)
  19800,      -- 198 TL/gün SGK muafiyeti (yemek nakit)
  15800,      -- 158 TL/gün ulaşım
  
  -- Çalışma
  30,         -- Aylık 30 gün
  8,          -- Günlük 8 saat
  1.5,        -- Mesai çarpanı 1.5x
  
  '2026 başlangıç tahmini değerleri. PILOT: Mahmut doğrulayıp güncelleyecek. Resmi Gazete + GİB referansları kullanılmalı.',
  NOW(),
  NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- ADIM 2: 2025 değerlerini de pasifleştir (varsa)
-- ───────────────────────────────────────────────────────────────────

UPDATE payroll_parameters
SET 
  is_active = false,
  effective_to = '2025-12-31',
  updated_at = NOW()
WHERE year = 2025 AND is_active = true;

-- ───────────────────────────────────────────────────────────────────
-- ADIM 3: Doğrulama
-- ───────────────────────────────────────────────────────────────────

SELECT 
  year,
  effective_from,
  is_active,
  minimum_wage_gross / 100.0 AS asgari_brut_TL,
  minimum_wage_net / 100.0 AS asgari_net_TL,
  sgk_employee_rate / 10.0 AS sgk_isci_pct,
  sgk_employer_rate / 10.0 AS sgk_isveren_pct,
  tax_bracket_1_limit / 100.0 AS dilim_1_ust_TL,
  tax_bracket_5_rate / 10.0 AS son_dilim_pct,
  meal_allowance_tax_exempt_daily / 100.0 AS yemek_vergi_TL,
  notes
FROM payroll_parameters
WHERE is_active = true
ORDER BY year DESC;

-- Beklenen çıktı (1 satır):
-- year=2026, is_active=true, asgari_brut_TL=33030, asgari_net_TL=28075.50
-- sgk_isci_pct=14, sgk_isveren_pct=20.5, son_dilim_pct=40
-- yemek_vergi_TL=300

-- ═══════════════════════════════════════════════════════════════════
-- POST-MIGRATION ACTIONS:
-- ═══════════════════════════════════════════════════════════════════
-- 
-- 1. ✅ payroll_parameters tablosunda 1 aktif kayıt olmalı (year=2026)
-- 2. ⏳ Mahmut SGK + GİB resmi yayınlarına göre değerleri DOĞRULA
-- 3. ⏳ Eğer farklı değerler varsa: UPDATE statement çalıştır
-- 4. ⏳ Bordro test: bir personelin Mayıs 2026 bordrosunu hesapla
--      → SGK + vergi + damga + net maaş ≠ 0 olmalı
-- 5. ⏳ Mali rapor doğrulama: /sube-bordro-ozet sayfa
-- 
-- ═══════════════════════════════════════════════════════════════════
