-- ═══════════════════════════════════════════════════════════════════
-- Sprint 15 (5 May 2026) — payroll_parameters 2026 SEED Migration
-- ═══════════════════════════════════════════════════════════════════
--
-- KAYNAK: docs/SISTEM-RAPORU-5-MAYIS.md (commit 9cdd34b43)
--   Top 5 Pilot Riski #5: "payroll_parameters=0 → vergi/SGK seed yoksa
--   bordro 0 verir"
--
-- BULGU: payrollParameters tablosu (schema-07.ts line 938) vardı ama
--   2026 seed yoktu. Bordro hesaplaması parametre olmadan 0 üretir.
--
-- ÇÖZÜM: 2026 yılı T.C. resmi parametreleri ile tablo seed et
--
-- KAYNAKLAR:
--   - Asgari ücret 2026: T.C. ÇSGB Tebliği (1 Ocak 2026'dan itibaren)
--   - SGK oranları: 5510 sayılı Kanun
--   - Vergi dilimleri: 193 sayılı GVK 103. madde 2026 düzenleme
--   - Yemek/ulaşım muafiyetleri: GVK 23/8 ve 23/10
--
-- ⚠️ DİKKAT: Tüm para değerleri KURUŞ cinsinden saklanır
--   33.030,00 TL = 3303000 kuruş
--
-- ⚠️ ORANLAR: SGK oranları binde cinsinden (140 = %14)
--   Damga vergisi: 759 = binde 7.59 = %0.759
--
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- ADIM 0: Mevcut durum kontrol (DRY-RUN)
-- ───────────────────────────────────────────────────────────────────
-- Beklenen: 0 satır (ilk seed) veya >0 (tekrar çağrı, bypass eder)

SELECT COUNT(*) AS mevcut_2026_kayit
FROM payroll_parameters
WHERE year = 2026;

-- ───────────────────────────────────────────────────────────────────
-- ADIM 1: 2026 yılı parametrelerini seed et (idempotent)
-- ───────────────────────────────────────────────────────────────────
-- INSERT IF NOT EXISTS pattern: unique key (year, effectiveFrom)
-- Eğer zaten varsa hiçbir şey yapmaz, hatırı sayılır güvenlik.

INSERT INTO payroll_parameters (
  year,
  effective_from,
  effective_to,
  is_active,
  
  -- Asgari Ücret (kuruş cinsinden)
  -- Brüt: 33.030,00 TL = 3303000 kuruş
  -- Net:  28.075,50 TL = 2807550 kuruş
  minimum_wage_gross,
  minimum_wage_net,
  
  -- SGK Oranları (binde cinsinden — ÷10 ile yüzde)
  sgk_employee_rate,            -- 140 = %14
  sgk_employer_rate,            -- 205 = %20.5
  unemployment_employee_rate,   -- 10  = %1
  unemployment_employer_rate,   -- 20  = %2
  
  -- Damga Vergisi (÷100000 ile orana çevrilir)
  stamp_tax_rate,               -- 759 = binde 7.59 = %0.759
  
  -- Gelir Vergisi Dilimleri 2026 (kuruş cinsinden limit + binde oran)
  -- Dilim 1: 0 - 190.000 TL → %15
  -- Dilim 2: 190.000 - 400.000 TL → %20
  -- Dilim 3: 400.000 - 1.500.000 TL → %27
  -- Dilim 4: 1.500.000 - 5.400.000 TL → %35
  -- Dilim 5: 5.400.000 TL üstü → %40
  tax_bracket_1_limit,  -- 19000000000 kuruş = 190.000.000 → 190.000 TL
  tax_bracket_1_rate,   -- 150 = %15
  tax_bracket_2_limit,  -- 40000000000 = 400.000 TL
  tax_bracket_2_rate,   -- 200 = %20
  tax_bracket_3_limit,  -- 150000000000 = 1.500.000 TL
  tax_bracket_3_rate,   -- 270 = %27
  tax_bracket_4_limit,  -- 540000000000 = 5.400.000 TL
  tax_bracket_4_rate,   -- 350 = %35
  tax_bracket_5_rate,   -- 400 = %40 (son dilim, üst sınır yok)
  
  -- Yemek Muafiyetleri (kuruş/gün)
  -- Vergi muafiyeti: 300 TL/gün = 30000 kuruş (GVK 23/8)
  -- SGK muafiyeti  : 198 TL/gün = 19800 kuruş (asgari ücretin %6'sı)
  meal_allowance_tax_exempt_daily,
  meal_allowance_sgk_exempt_daily,
  
  -- Ulaşım Muafiyeti (kuruş/gün)
  -- 158 TL/gün = 15800 kuruş (GVK 23/10)
  transport_allowance_exempt_daily,
  
  -- Çalışma Düzeni Parametreleri
  working_days_per_month,       -- 30 (Türkiye İş Kanunu Art. 49)
  working_hours_per_day,         -- 8 (haftalık 45 / 6 gün)
  overtime_multiplier,           -- 1.5 (İş Kanunu Art. 41)
  
  notes,
  created_at,
  updated_at
)
VALUES (
  2026,
  '2026-01-01',
  NULL,
  TRUE,
  
  -- Asgari ücret 2026 (kuruş)
  3303000,    -- Brüt 33.030,00 TL
  2807550,    -- Net  28.075,50 TL
  
  -- SGK oranları (binde)
  140,        -- İşçi %14
  205,        -- İşveren %20.5
  10,         -- İşsizlik işçi %1
  20,         -- İşsizlik işveren %2
  
  -- Damga vergisi
  759,        -- %0.759
  
  -- Gelir vergisi dilimleri 2026 (kuruş cinsinden)
  19000000000,  -- 190.000 TL
  150,          -- %15
  40000000000,  -- 400.000 TL
  200,          -- %20
  150000000000, -- 1.500.000 TL
  270,          -- %27
  540000000000, -- 5.400.000 TL
  350,          -- %35
  400,          -- %40 (son dilim)
  
  -- Yemek muafiyetleri (kuruş/gün)
  30000,        -- 300 TL/gün vergi muafiyeti
  19800,        -- 198 TL/gün SGK muafiyeti
  
  -- Ulaşım muafiyeti
  15800,        -- 158 TL/gün
  
  -- Çalışma
  30,           -- 30 gün/ay
  8,            -- 8 saat/gün
  1.5,          -- Mesai x1.5
  
  -- Notes
  'Sprint 15 (5 May 2026) seed - T.C. resmi 2026 parametreleri. ' ||
  'Asgari ücret 33.030 brüt / 28.075,50 net. ' ||
  'SGK işçi 14% + işsizlik 1% = 15%. SGK işveren 20.5% + 2% = 22.5%. ' ||
  'Vergi 5 dilim, mesai x1.5.',
  
  NOW(),
  NOW()
)
ON CONFLICT (year, effective_from) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────
-- ADIM 2: Doğrulama
-- ───────────────────────────────────────────────────────────────────

SELECT 
  id,
  year,
  effective_from,
  is_active,
  minimum_wage_gross / 100.0 AS asgari_brut_TL,
  minimum_wage_net / 100.0 AS asgari_net_TL,
  sgk_employee_rate / 10.0 AS sgk_isci_yuzde,
  sgk_employer_rate / 10.0 AS sgk_isveren_yuzde,
  tax_bracket_1_limit / 100.0 AS dilim1_ust_sinir_TL,
  meal_allowance_tax_exempt_daily / 100.0 AS yemek_muafiyet_TL,
  working_days_per_month,
  overtime_multiplier
FROM payroll_parameters
WHERE year = 2026 AND is_active = TRUE
ORDER BY effective_from DESC
LIMIT 1;

-- Beklenen sonuç:
-- year=2026, asgari_brut_TL=33030, asgari_net_TL=28075.50
-- sgk_isci_yuzde=14, sgk_isveren_yuzde=20.5
-- dilim1_ust_sinir_TL=190000, yemek_muafiyet_TL=300
-- working_days_per_month=30, overtime_multiplier=1.5

-- ───────────────────────────────────────────────────────────────────
-- ADIM 3: Eski yıllar için pasif bayrak (varsa)
-- ───────────────────────────────────────────────────────────────────
-- 2025'te kayıt varsa pasif et (tarihsel referans için sakla, aktif olmasın)

UPDATE payroll_parameters
SET is_active = FALSE,
    updated_at = NOW()
WHERE year < 2026 AND is_active = TRUE;

-- ───────────────────────────────────────────────────────────────────
-- ROLLBACK PLAN (acil durum için)
-- ───────────────────────────────────────────────────────────────────
-- Eğer migration sonrası bordro hesaplama bozulursa:
--
-- DELETE FROM payroll_parameters WHERE year = 2026;
-- UPDATE payroll_parameters SET is_active = TRUE WHERE year = 2025;
--
-- Veya pg_dump backup'tan restore:
-- psql $DATABASE_URL < migrations/backups/pre-sprint-15-2026-05-05.sql
-- ───────────────────────────────────────────────────────────────────
