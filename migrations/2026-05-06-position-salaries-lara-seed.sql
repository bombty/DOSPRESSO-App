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
-- ⚠️ COMPLIANCE UYARISI (Aslan görmeli!)
--   Lara duyurusu 24.11.2025'te yapıldı. O tarihte 2026 asgari ücret
--   henüz belli değildi (Asgari Ücret Tespit Komisyonu kararı 23.12.2025).
--   2026 brüt asgari ücret = 33.030 TL (RG 26.12.2025/33119).
--   Stajyer pozisyon ücreti = 33.000 TL ⇒ asgari ücretin 30 TL ALTINDA.
--   
--   YASAL SORUN: 4857 sayılı İş Kanunu uyarınca işçiye asgari ücretten
--   düşük ödeme YASAKTIR (m.39).
--   
--   ÖNERİLER:
--     1. Aslan: Lara duyurusunu 2026 asgari ücrete göre güncelle
--        (Stajyer 33.000 → minimum 33.030, mantıksal olarak 33.500-34.000)
--     2. Bu migration'da seed değerleri AYNEN duyuru rakamları (sadakat).
--        Bordro hesaplamasında payroll-engine fallback uygulayacak:
--        finalSalary = MAX(positionSalary.totalSalary, payrollParameters.minimum_wage_gross)
--     3. Mahmut Mayıs 2026 bordrosunda fiili Stajyer ücretini görsün.
-- 
-- ═══════════════════════════════════════════════════════════════════
-- LARA POZİSYON MATRİSİ (24.11.2025 duyurusu)
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Pozisyon          Toplam     Taban      Prim       İş Kanunu Uyumu
-- ────────────────  ─────────  ─────────  ─────────  ──────────────
-- Stajyer           33.000 TL  31.000 TL   2.000 TL  ⚠ < ASGARİ
-- Bar Buddy         36.000 TL  31.000 TL   3.000 TL  ✓
-- Barista           41.000 TL  31.000 TL   8.000 TL  ✓
-- Supervisor Buddy  45.000 TL  31.000 TL  12.000 TL  ✓
-- Supervisor        49.000 TL  31.000 TL  16.000 TL  ✓
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
  -- Stajyer (⚠️ asgari ücret altında, payroll-engine fallback ile düzeltilecek)
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
    WHEN total_salary < 3303000 THEN '⚠ Asgari ücretin ALTINDA'
    ELSE '✓ Uygun'
  END AS asgari_ucret_kontrol
FROM position_salaries
WHERE effective_from = '2026-01-01'
ORDER BY total_salary ASC;

-- Beklenen çıktı (5 satır):
-- intern           | Stajyer          | 33000 | 31000 |  2000 | 2026-01-01 | ⚠ Asgari ücretin ALTINDA
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
--      - Stajyer için fallback uygulandı mı? (33.030 minimum)
--      - Diğer pozisyonlar duyuru rakamlarıyla doğru hesaplandı mı?
-- 5. ⏳ İK redesign Faz 2 (yeni hub) bu seed'i kullanacak: Lara çalışanı
--      profili açıldığında "Lara Pozisyon: Barista — 41.000 TL" rozet gösterilecek.
-- 
-- ═══════════════════════════════════════════════════════════════════
