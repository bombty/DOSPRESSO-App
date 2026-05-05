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
--   2026 yılı için RESMİ KAYNAKLARDAN doğrulanmış parametreler seed edilir.
--   Mahmut (muhasebe sorumlusu) yine de bordro hesaplamayı test etmeli.
-- 
-- ═══════════════════════════════════════════════════════════════════
-- RESMİ KAYNAKLAR (6 May 2026 itibarıyla doğrulanmış)
-- ═══════════════════════════════════════════════════════════════════
--
-- 1) ASGARİ ÜCRET 2026
--    - Brüt: 33.030,00 TL/ay  ·  Net: 28.075,50 TL/ay  ·  Günlük: 1.100 TL
--    - Asgari Ücret Tespit Komisyonu kararı: 23.12.2025
--    - Resmi Gazete: 26.12.2025, sayı 33119
--    - Asgari ücret desteği: 1.270 TL/ay (önceki: 1.000 TL)
--    - Kaynak: https://www.csgb.gov.tr/Media/gm2fekds/asgari-ücret-2026.pdf
--
-- 2) SGK PRİM ORANLARI 2026 (5510 sayılı Kanun)
--    - İşçi MYÖ (Malullük/Yaşlılık/Ölüm): %14
--    - İŞVEREN MYÖ: %20.5 → %21.75 (1 PUAN ARTIŞ)
--      ⚠ DEĞİŞİKLİK: 7566 sayılı Kanun, RG: 19.12.2025
--      5510 SK md.81/1-(a) 2. cümle değiştirildi.
--      Yürürlük: 01.01.2026
--    - İşçi İşsizlik: %1
--    - İşveren İşsizlik: %2
--    - KVSK (Kısa Vadeli Sigorta Kolu - işveren): %2.25
--      Not: 7524 sayılı Kanun (RG: 02.08.2024) ile %2 → %2.25
--    - Damga Vergisi: ‰7.59
--
-- 3) GELİR VERGİSİ DİLİMLERİ 2026 (Ücret gelirleri)
--    - 1. dilim: 0 - 190.000 TL → %15
--    - 2. dilim: 190.000 - 400.000 TL → %20
--    - 3. dilim: 400.000 - 1.500.000 TL → %27
--    - 4. dilim: 1.500.000 - 5.300.000 TL → %35
--    - 5. dilim: 5.300.000+ TL → %40
--    - Tebliğ: Gelir Vergisi Genel Tebliği (Seri No: 332)
--    - Resmi Gazete: 30.12.2025, sayı 33124 (5. Mükerrer)
--    - Yeniden Değerleme Oranı (2025): %25.49
--    - GVK md.103
--
-- 4) YEMEK / ULAŞIM MUAFİYETLERİ 2026
--    a) Yemek Vergi Muafiyeti (gelir + damga vergisi):
--       - Nakit ödeme: 300 TL/gün
--       - Yemek kartı (KDV dahil): 330 TL/gün
--       - Tebliğ: GVK 332 Seri No (RG 31.12.2025)
--    b) Yemek SGK Muafiyeti (nakit):
--       - 158 TL/gün → 300 TL/gün (158 + ~%90 ARTIŞ)
--       ⚠ DEĞİŞİKLİK: 7577 sayılı Kanun, yürürlük 17.04.2026
--       SGK genelgesi: 2026/2 (07.01.2026) — 158 TL düzeyi.
--       7577 ile nakit yemek SGK istisnası gelir vergisi limitine eşitlendi.
--       NOT: Yemek kartı (ayni) ile restoran kullanımında SGK istisnası SINIRSIZ.
--    c) Yol/Ulaşım Muafiyeti:
--       - Ayni (toplu taşıma kartı/bilet): 158 TL/gün
--       - Nakit: İSTİSNA YOK (tamamı vergi+SGK'ya tabi)
--
-- 5) MESAİ ÇARPANI
--    - Fazla mesai: %50 zam (1.5x) — 4857 sayılı İş Kanunu md.41
--
-- ═══════════════════════════════════════════════════════════════════
-- ⚠ SCHEMA HASSASİYET NOTU
-- ═══════════════════════════════════════════════════════════════════
--   sgk_employer_rate kolonu INTEGER (binde cinsinden).
--   %21.75 = 217.5 binde — kesirli değer integer'a YUVARLANIYOR (218).
--   Bu yuvarlama 33.030 TL brüt üzerinde aylık ~16 TL hata üretir
--   (gerçek %21.75 vs uygulanan %21.8). Pilot için kabul edilebilir.
--   FUTURE: schema-07.ts sgk_employer_rate → numeric(4,1) yapılırsa
--   tam hassasiyet sağlanır. (Sprint 17+ backlog)
--
-- ═══════════════════════════════════════════════════════════════════
-- BACKUP / VERIFY / ROLLBACK
-- ═══════════════════════════════════════════════════════════════════
-- BACKUP (Migration ÖNCESİ):
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
  
  -- ───────────────────────────────────────────────────────────────────
  -- ASGARİ ÜCRET (RG 26.12.2025 / 33119 — Asgari Ücret Tespit Komisyonu)
  -- ───────────────────────────────────────────────────────────────────
  3303000,    -- 33.030,00 TL brüt = 3.303.000 kuruş ✅
  2807550,    -- 28.075,50 TL net = 2.807.550 kuruş ✅
  
  -- ───────────────────────────────────────────────────────────────────
  -- SGK ORANLARI (2026 — resmi)
  -- ───────────────────────────────────────────────────────────────────
  140,        -- %14 — SGK işçi MYÖ (5510 SK md.81)
  218,        -- %21.75 → 217.5 binde, integer yuvarlama 218
              -- ⚠ 7566 sayılı Kanun (RG 19.12.2025) ile %20.5 → %21.75
              -- Schema integer hassasiyeti: ~%0.05 sapma (~16 TL/ay/asgari ücretli)
  10,         -- %1 — İşsizlik işçi
  20,         -- %2 — İşsizlik işveren
  
  -- ───────────────────────────────────────────────────────────────────
  -- DAMGA VERGİSİ (sabit)
  -- ───────────────────────────────────────────────────────────────────
  759,        -- ‰7.59 (binde 7.59) — 488 sayılı Damga Vergisi Kanunu
  
  -- ───────────────────────────────────────────────────────────────────
  -- GELİR VERGİSİ DİLİMLERİ — ÜCRET (RG 30.12.2025 / 33124 5.M, GVK 332 Tebliğ)
  -- Yeniden Değerleme Oranı: %25.49
  -- ───────────────────────────────────────────────────────────────────
  -- 1. dilim: 0 - 190.000 TL → %15
  19000000, 150,
  -- 2. dilim: 190.000 - 400.000 TL → %20
  40000000, 200,
  -- 3. dilim: 400.000 - 1.500.000 TL → %27 (ücretliler için 1.5M)
  150000000, 270,
  -- 4. dilim: 1.500.000 - 5.300.000 TL → %35
  530000000, 350,
  -- 5. dilim: 5.300.000+ TL → %40
  400,
  
  -- ───────────────────────────────────────────────────────────────────
  -- MUAFİYETLER 2026 (GVK 332 Tebliğ + 7577 SK)
  -- ───────────────────────────────────────────────────────────────────
  30000,      -- 300 TL/gün — Yemek vergi muafiyeti (nakit, KDV hariç)
              -- Yemek kartı: 330 TL/gün (KDV dahil) — bu kolon nakit için
  30000,      -- 300 TL/gün — Yemek SGK muafiyeti (nakit)
              -- ⚠ 7577 sayılı Kanun, yürürlük 17.04.2026
              -- Önceki değer: 158 TL/gün (SGK 2026/2 genelgesi 07.01.2026)
              -- 7577 ile gelir vergisi limitiyle eşitlendi (158 → 300)
  15800,      -- 158 TL/gün — Ulaşım muafiyeti (AYNİ — toplu taşıma kartı/bilet)
              -- Nakit ulaşım yardımı: İSTİSNA YOK (tamamı vergi+SGK'ya tabi)
  
  -- ───────────────────────────────────────────────────────────────────
  -- ÇALIŞMA DÜZENİ (sabit)
  -- ───────────────────────────────────────────────────────────────────
  30,         -- Aylık 30 gün (4857 SK md.49 — fixed divider)
  8,          -- Günlük 8 saat (4857 SK md.63)
  1.5,        -- Mesai çarpanı 1.5x (4857 SK md.41 — %50 zam)
  
  '2026 resmi parametreler. Kaynaklar: Asgari ücret RG 26.12.2025/33119; SGK işveren MYÖ %21.75 (7566 SK, RG 19.12.2025); Vergi dilimleri GVK 332 Tebliğ (RG 30.12.2025/33124); Yemek SGK 300 TL/gün (7577 SK, 17.04.2026). Schema integer yuvarlamasından ~16 TL/ay sapma kabul edildi.',
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
-- sgk_isci_pct=14.0, sgk_isveren_pct=21.8 (yuvarlama; gerçek %21.75)
-- dilim_1_ust_TL=190000, son_dilim_pct=40
-- yemek_vergi_TL=300, yemek_sgk_TL=300 (7577 SK sonrası)

-- ═══════════════════════════════════════════════════════════════════
-- POST-MIGRATION ACTIONS:
-- ═══════════════════════════════════════════════════════════════════
-- 
-- 1. ✅ payroll_parameters tablosunda 1 aktif kayıt olmalı (year=2026)
-- 2. ⏳ Mahmut bordro hesaplamayı test et:
--      - Bir personelin Mayıs 2026 bordrosu
--      - Brüt 33.030 → SGK işçi 4.624,20 → işsizlik 330,30 → net 28.075,50
--      - Asgari ücret gelir+damga vergisinden istisna (GVK md.103)
-- 3. ⏳ Mali rapor doğrulama: /sube-bordro-ozet sayfa render
-- 4. ⏳ Hardcoded fallback kontrol: server/routes/hr.ts:6484 (ayrı PR'da %21.75'e çekildi)
-- 5. ⏳ Schema sapma izleme: integer rate yuvarlaması yıllık <500 TL hata,
--      Sprint 17+ schema-07.ts numeric(4,1) refactor backlog'a eklendi.
-- 
-- ═══════════════════════════════════════════════════════════════════
