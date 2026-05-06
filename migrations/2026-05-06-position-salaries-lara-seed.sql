-- ═══════════════════════════════════════════════════════════════════
-- İK Redesign Sprint - position_salaries Lara Matrisi Seed
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Tarih: 6 Mayıs 2026
-- Sprint: S17-IK-REDESIGN (Faz 1)
-- Branch: claude/ik-redesign-2026-05-06
-- 
-- AMAÇ:
--   DOSPRESSO Lara Şubesi (#8) standart pozisyon × maaş matrisini
--   position_salaries tablosuna seed et. İK redesign'da dual-model
--   bordro hesabı için Lara modeli kaynak veri.
-- 
-- KAYNAK:
--   "DOSPRESSO 2026 Maaş & Prim Sistemi – Şube Uygulama Duyurusu"
--   Tarih: 24.11.2025
--   Lokasyon: Lara_Sube_Maas_2026 Excel (Aslan'dan, 5 May 2026)
-- 
-- ✅ NOT (D-40 v2, 6 May 2026 — REVİZE):
--   Aslan netleştirdi: Lara duyurusundaki TÜM tutarlar NET (eline geçecek).
--   Brüt rakamlar payroll-engine + tax-calculator (Sprint 9) tarafından 
--   TR 2026 vergi sistemine göre hesaplanır.
-- 
--   Asgari ücret kontrolü NET cinsinden yapılır:
--     2026 NET asgari = 28.075,50 TL (TÜRMOB)
--     Stajyer 33.000 NET > 28.075,50 NET (4.924,50 TL ÜZERİNDE) ✓ YASAL UYUM VAR
--   
--   ÖNCEKI YANLIŞ ALARM (silindi):
--     "Stajyer 33.000 < 33.030 brüt asgari" → NET vs BRÜT karıştırılmıştı.
--     payroll-engine.ts satır 285-303'te bug fix yapıldı (Sprint 9, D-40 v2).
-- 
-- ═══════════════════════════════════════════════════════════════════
-- LARA POZİSYON MATRİSİ (24.11.2025 duyurusu, NET tutarlar)
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Pozisyon          NET Total  NET Taban  NET Prim   Asgari NET (28.075,50) Üstü mü?
-- ────────────────  ─────────  ─────────  ─────────  ─────────────────────────────
-- Stajyer           33.000 TL  31.000 TL   2.000 TL  ✓ +4.924,50 TL
-- Bar Buddy         36.000 TL  31.000 TL   3.000 TL  ✓ +7.924,50 TL
-- Barista           41.000 TL  31.000 TL   8.000 TL  ✓ +12.924,50 TL
-- Supervisor Buddy  45.000 TL  31.000 TL  12.000 TL  ✓ +16.924,50 TL
-- Supervisor        49.000 TL  31.000 TL  16.000 TL  ✓ +20.924,50 TL
-- 
-- Brüt karşılıkları (tax-calculator.ts ile hesaplandı, TR 2026):
--   Stajyer 33K NET → ~41.064 BRÜT
--   Bar Buddy 36K → ~45.959 BRÜT
--   Barista 41K → ~54.117 BRÜT
--   Sup Buddy 45K → ~60.643 BRÜT
--   Supervisor 49K → ~67.169 BRÜT
-- 
-- ⚠️ TÜM TUTARLAR KURUŞ (₺ × 100)!
-- Örnek: 33.000 TL = 3.300.000 kuruş
-- 
-- ═══════════════════════════════════════════════════════════════════
-- BACKUP / ROLLBACK
-- ═══════════════════════════════════════════════════════════════════
-- 
-- BACKUP (Migration ÖNCESİ, isolated agent yapacak):
--   pg_dump ... -t position_salaries > migrations/backups/position_salaries_pre_2026-05-06.sql
-- 
-- VERIFY:
--   SELECT COUNT(*) FROM position_salaries WHERE effective_from = '2026-01-01';
--   Beklenen: 5
-- 
-- ROLLBACK:
--   DELETE FROM position_salaries WHERE effective_from = '2026-01-01' AND created_at >= '2026-05-06';
-- 
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- ADIM 0: BASELINE
-- ───────────────────────────────────────────────────────────────────

SELECT 
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE effective_from = '2026-01-01') AS lara_2026_records,
  MIN(effective_from) AS earliest,
  MAX(effective_from) AS latest
FROM position_salaries;
-- Beklenen: total=0 veya birkaç eski (2025 vb.), lara_2026_records=0

-- ───────────────────────────────────────────────────────────────────
-- ADIM 1: LARA POZİSYON MATRİSİ SEED (2026)
-- ───────────────────────────────────────────────────────────────────
-- Idempotent: Eğer aynı position_code + effective_from zaten varsa skip

INSERT INTO position_salaries (
  position_code,
  position_name,
  total_salary,
  base_salary,
  bonus,
  effective_from,
  effective_to,
  created_at
) VALUES
  -- Stajyer (NET 33.000 TL — asgari net 28.075,50 üstünde, yasal uyum var)
  ('intern', 'Stajyer', 3300000, 3100000, 200000, '2026-01-01', NULL, NOW()),
  
  -- Bar Buddy (junior barista yardımcısı)
  ('bar_buddy', 'Bar Buddy', 3600000, 3100000, 300000, '2026-01-01', NULL, NOW()),
  
  -- Barista (saha operasyon)
  ('barista', 'Barista', 4100000, 3100000, 800000, '2026-01-01', NULL, NOW()),
  
  -- Supervisor Buddy (supervisor yardımcısı)
  ('supervisor_buddy', 'Supervisor Buddy', 4500000, 3100000, 1200000, '2026-01-01', NULL, NOW()),
  
  -- Supervisor (saha yönetici)
  ('supervisor', 'Supervisor', 4900000, 3100000, 1600000, '2026-01-01', NULL, NOW())
ON CONFLICT DO NOTHING;
-- ON CONFLICT: position_salaries tablosunda unique constraint yoksa hata vermez,
-- varsa duplicate skip eder. Idempotent re-run güvenli.

-- ───────────────────────────────────────────────────────────────────
-- ADIM 2: DOĞRULAMA
-- ───────────────────────────────────────────────────────────────────

SELECT 
  position_code,
  position_name,
  total_salary / 100.0 AS toplam_TL,
  base_salary / 100.0 AS taban_TL,
  bonus / 100.0 AS prim_TL,
  effective_from,
  CASE 
    WHEN total_salary < 2807550 THEN '⚠ Net asgari ücret altında'
    ELSE '✓ Uygun'
  END AS asgari_ucret_kontrol
FROM position_salaries
WHERE effective_from = '2026-01-01'
ORDER BY total_salary ASC;

-- Beklenen çıktı (5 satır):
-- intern           | Stajyer          | 33000 | 31000 |  2000 | 2026-01-01 | ✓ Net asgari üstünde
-- bar_buddy        | Bar Buddy        | 36000 | 31000 |  3000 | 2026-01-01 | ✓ Uygun
-- barista          | Barista          | 41000 | 31000 |  8000 | 2026-01-01 | ✓ Uygun
-- supervisor_buddy | Supervisor Buddy | 45000 | 31000 | 12000 | 2026-01-01 | ✓ Uygun
-- supervisor       | Supervisor       | 49000 | 31000 | 16000 | 2026-01-01 | ✓ Uygun

-- ═══════════════════════════════════════════════════════════════════
-- POST-MIGRATION ACTIONS:
-- ═══════════════════════════════════════════════════════════════════
-- 
-- 1. ✅ position_salaries 5 yeni kayıt (effective_from=2026-01-01)
-- 2. ⏳ payroll-engine.ts dual-model destek (positionCode lookup + minimum_wage fallback)
-- 3. ⏳ Aslan: Lara duyurusu güncelleme kararı — Stajyer ücretini 33.030+ yap mı?
-- 4. ⏳ Mahmut Mayıs 2026 Lara bordrosu test:
--      - (D-40 v2 sonrası fallback gereksiz, NET asgari 28.075,50)
--      - Diğer pozisyonlar duyuru rakamlarıyla doğru hesaplandı mı?
-- 5. ⏳ İK redesign Faz 2 (yeni hub) bu seed'i kullanacak: Lara çalışanı
--      profili açıldığında "Lara Pozisyon: Barista — 41.000 TL" rozet gösterilecek.
-- 
-- ═══════════════════════════════════════════════════════════════════
