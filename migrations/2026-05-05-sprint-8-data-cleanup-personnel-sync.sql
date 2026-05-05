-- ═══════════════════════════════════════════════════════════════════
-- SPRINT 8 - 5 Mayıs 2026 - Pilot Data Cleanup + Gerçek Personel Sync
-- ═══════════════════════════════════════════════════════════════════
-- 
-- AMAÇ:
--   1. 18 fake şubeyi pasifleştir (sadece pilot 4 lokasyon aktif kalır)
--   2. 119 fake personeli pasifleştir (sadece 35 gerçek personel aktif)
--   3. Excel'den gelen 35 gerçek personel verisini UPSERT
-- 
-- ÖNCEKİ DURUM (5 May 19:15):
--   - 22 şube aktif (Antalya Mallof, Beachpark, Markantalya, Batman, vs.)
--   - 157 personel aktif (üyelerin %75'i fake test data)
-- 
-- HEDEF DURUM:
--   - 4 şube aktif: Işıklar, Lara, Merkez Ofis, Fabrika
--   - 35 personel aktif: 11 Işıklar + 5 Ofis + 10 Fabrika + 9 Lara
-- 
-- DRY-RUN ÖNCE — sadece SELECT'ler. Sonra GO.
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- ADIM 0: BASELINE - Mevcut durum raporu (DRY-RUN)
-- ═══════════════════════════════════════════════════════════════════

-- A) Tüm aktif şubeler
SELECT 'A_BASELINE_BRANCHES' as report, id, code, name, is_active 
FROM branches 
WHERE is_active = true 
ORDER BY id;

-- B) Şube başına aktif personel sayısı
SELECT 'B_BASELINE_USERS_PER_BRANCH' as report, 
  b.id, b.name, COUNT(u.id) as active_users
FROM branches b
LEFT JOIN users u ON u.branch_id = b.id AND u.is_active = true
WHERE b.is_active = true
GROUP BY b.id, b.name
ORDER BY active_users DESC;

-- C) branch_id NULL olan personel (HQ rolleri admin/ceo/coach/trainer)
SELECT 'C_BASELINE_HQ_USERS' as report, 
  role, COUNT(*) as count 
FROM users 
WHERE branch_id IS NULL AND is_active = true 
GROUP BY role 
ORDER BY count DESC;

-- D) Pilot 4 lokasyon ID'leri (PILOT_BRANCH_IDS olarak tanımlanmalı)
-- Beklenen: id=5 (Işıklar), id=8 (Lara), id=23 (Merkez Ofis), id=24 (Fabrika)
SELECT 'D_PILOT_BRANCHES' as report, id, code, name 
FROM branches 
WHERE id IN (5, 8, 23, 24)
ORDER BY id;

-- ═══════════════════════════════════════════════════════════════════
-- *** GO BEKLENİYOR ***
-- DRY-RUN sonuçları doğrulandıktan sonra aşağıdaki bölümler çalıştırılır.
-- Sırasıyla:
--   ADIM 1: Pilot lokasyonlar dışı şubeleri pasifleştir
--   ADIM 2: Pilot lokasyonlar dışı (ve HQ rolü olmayan) personeli pasifleştir
--   ADIM 3: 35 gerçek personeli UPSERT
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- ADIM 1: Pilot dışı şubeleri pasifleştir
-- ═══════════════════════════════════════════════════════════════════
-- Sadece id IN (5, 8, 23, 24) aktif kalır

BEGIN;

UPDATE branches 
SET is_active = false 
WHERE id NOT IN (5, 8, 23, 24) 
  AND is_active = true;

-- Doğrulama: kaç şube pasifleşti?
SELECT 'STEP_1_DEACTIVATED_BRANCHES' as report, COUNT(*) as count 
FROM branches 
WHERE is_active = false;

-- Beklenen: 18 satır pasifleşti

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- ADIM 2: Pilot dışı personeli pasifleştir
-- ═══════════════════════════════════════════════════════════════════
-- KORU: HQ roller (admin, ceo, cgo, coach, trainer, muhasebe, satinalma, gida_muhendisi, kalite, sef, recete_gm, fabrika_mudur)
-- KORU: Pilot şubelerdeki personel (branch_id IN 5,8,23,24)
-- PASİFLEŞTİR: Diğerleri

BEGIN;

UPDATE users 
SET is_active = false 
WHERE is_active = true
  AND (branch_id IS NOT NULL AND branch_id NOT IN (5, 8, 23, 24))
  AND role NOT IN (
    'admin', 'ceo', 'cgo', 'coach', 'trainer', 
    'muhasebe', 'muhasebe_ik', 'satinalma',
    'gida_muhendisi', 'kalite', 'kalite_kontrol',
    'sef', 'recete_gm', 'fabrika_mudur', 'fabrika_sorumlu'
  );

-- Doğrulama
SELECT 'STEP_2_REMAINING_ACTIVE_USERS' as report, 
  COALESCE(b.name, 'HQ (no branch)') as location,
  COUNT(u.id) as active_count
FROM users u
LEFT JOIN branches b ON u.branch_id = b.id
WHERE u.is_active = true
GROUP BY b.name
ORDER BY active_count DESC;

-- Beklenen: ~35 personel + HQ rolleri (admin, ceo, vs.)

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- ADIM 3: 35 GERÇEK PERSONEL — UPSERT (Excel'den)
-- ═══════════════════════════════════════════════════════════════════
-- 
-- UPSERT mantığı:
--   - first_name + last_name match → UPDATE
--   - Yoksa INSERT (yeni kullanıcı)
-- 
-- Tablo: users
-- Pilot branch_id'leri: 5=Işıklar, 8=Lara, 23=Merkez Ofis, 24=Fabrika
-- 
-- ⚠️ DİKKAT: tckn, hashedPassword, username gibi alanlar nullable.
-- Sistem ilk girişte mustChangePassword=true ile zorunlu şifre değişimi yapar.
-- ═══════════════════════════════════════════════════════════════════

-- 3.1) FABRIKA (10 kişi, branch_id=24)
-- Excel ÇİZERGE sheet'inden:
INSERT INTO users (
  username, first_name, last_name, role, branch_id, 
  hire_date, birth_date, is_active, must_change_password,
  net_salary, bonus_base, account_status,
  notes
) VALUES
-- Arife Yıldırım — Hatice ile birlikte gelmiş yeni
('arife.yildirim', 'ARİFE', 'YILDIRIM', 'fabrika_personel', 24, '2025-05-23', '2000-11-26', true, true, 
  2950000, 400000, 'approved',
  'Sprint 8 sync: hakediş 33500, prim 4000'),
-- Atiye Kar — Süpervizör (mevcut kayıt, UPDATE)
('atiye.kar', 'ATİYE', 'KAR', 'supervisor', 24, '2017-02-24', '1970-02-01', true, false,
  4200000, 800000, 'approved',
  'Sprint 8 sync: kıdem 9 yıl, izin hakkı 20.5 gün, kullanılan 10'),
('busra.dogmus', 'BÜŞRA', 'DOĞMUŞ', 'fabrika_personel', 24, '2023-08-08', '2000-01-01', true, true,
  3100000, 400000, 'approved',
  'Sprint 8 sync: kıdem 2 yıl, izin 7 gün'),
('filiz.karali', 'FİLİZ', 'KARALİ', 'fabrika_personel', 24, '2018-07-25', NULL, true, true,
  3050000, 0, 'approved',
  'Sprint 8 sync: hakediş 38500, kıdem 7 yıl'),
('galipcan.boran', 'GALİP CAN', 'BORAN', 'fabrika_personel', 24, '2024-03-18', NULL, true, true,
  3150000, 0, 'approved',
  'Sprint 8 sync: hakediş 34500, kıdem 2 yıl'),
('hatice.kocabas', 'HATİCE', 'KOCABAŞ', 'fabrika_personel', 24, '2025-07-21', NULL, true, true,
  3100000, 0, 'approved',
  'Sprint 8 sync: yeni başlayan, hakediş 32500'),
('leyla.sonmez', 'LEYLA', 'SÖNMEZ', 'fabrika_personel', 24, '2025-10-01', NULL, true, true,
  3000000, 0, 'approved',
  'Sprint 8 sync: yeni başlayan, hakediş 32500'),
('mihrican.veziroglu', 'MİHRİCAN', 'VEZİROĞLU', 'fabrika_personel', 24, '2023-05-29', NULL, true, true,
  3100000, 0, 'approved',
  'Sprint 8 sync: hakediş 35000, kıdem 3 yıl'),
('mustafacan.horzum', 'MUSTAFA CAN', 'HORZUM', 'fabrika_personel', 24, '2024-01-22', NULL, true, true,
  3900000, 0, 'approved',
  'Sprint 8 sync: hakediş 47000, kıdem 2 yıl'),
('umut.kosar', 'ÜMÜT', 'KOŞAR', 'fabrika_operator', 24, '2025-11-17', NULL, true, true,
  7000000, 0, 'approved',
  'Sprint 8 sync: hakediş 85000, fabrika operatörü')
ON CONFLICT (username) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  branch_id = EXCLUDED.branch_id,
  hire_date = EXCLUDED.hire_date,
  birth_date = COALESCE(EXCLUDED.birth_date, users.birth_date),
  net_salary = EXCLUDED.net_salary,
  bonus_base = EXCLUDED.bonus_base,
  is_active = true,
  notes = EXCLUDED.notes;

-- 3.2) OFİS (5 kişi, branch_id=23)
INSERT INTO users (
  username, first_name, last_name, role, branch_id, 
  hire_date, birth_date, is_active, must_change_password,
  net_salary, bonus_base, account_status, notes
) VALUES
('diana.nayfonova', 'DIANA', 'NAYFONOVA', 'muhasebe_ik', 23, '2025-01-20', '1981-11-03', true, true,
  3700000, 800000, 'approved',
  'Sprint 8 sync: ofis, hakediş 47500, yakıt 2500'),
('eren.elmas', 'EREN', 'ELMAS', 'cgo', 23, '2021-05-25', '1994-04-22', true, false,
  4600000, 800000, 'approved',
  'Sprint 8 sync: CGO, hakediş 60000, kıdem 4 yıl, kullanılan izin 2.5'),
('mahmut.altunay', 'MAHMUT', 'ALTUNAY', 'muhasebe_ik', 23, '2025-11-24', NULL, true, false,
  4900000, 800000, 'approved',
  'Sprint 8 sync: muhasebe IK görevlisi, hakediş 65000'),
('sevketsamet.kara', 'ŞEVKET SAMET', 'KARA', 'satinalma', 23, '2024-04-15', NULL, true, true,
  3700000, 0, 'approved',
  'Sprint 8 sync: satınalma, hakediş 50000'),
('utku.dernek', 'UTKU', 'DERNEK', 'ceo', 23, '2015-09-08', NULL, true, false,
  5900000, 0, 'approved',
  'Sprint 8 sync: kıdem 10+ yıl, hakediş 75000, devir izin 56.5')
ON CONFLICT (username) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  branch_id = EXCLUDED.branch_id,
  hire_date = EXCLUDED.hire_date,
  net_salary = EXCLUDED.net_salary,
  bonus_base = EXCLUDED.bonus_base,
  is_active = true,
  notes = EXCLUDED.notes;

-- 3.3) IŞIKLAR (11 kişi, branch_id=5)
INSERT INTO users (
  username, first_name, last_name, role, branch_id, 
  hire_date, is_active, must_change_password,
  net_salary, bonus_base, account_status, notes
) VALUES
('ahmethamit.dogan', 'AHMET HAMİT', 'DOĞAN', 'barista', 5, '2025-10-08', true, true, 3100000, 0, 'approved', 'Sprint 8 sync: yeni, hakediş 36000'),
('atesguney.yilmaz', 'ATEŞ GÜNEY', 'YILMAZ', 'supervisor_buddy', 5, '2023-12-27', true, true, 3200000, 0, 'approved', 'Sprint 8 sync: kıdem 2 yıl, izin 16'),
('basri.sen', 'BASRİ', 'ŞEN', 'barista', 5, '2022-09-01', true, false, 3500000, 0, 'approved', 'Sprint 8 sync: kıdem 3 yıl, izin 9'),
('cihan.kolakan', 'CİHAN', 'KOLAKAN', 'bar_buddy', 5, '2025-11-24', true, true, 3200000, 0, 'approved', 'Sprint 8 sync: yeni'),
('ece.oz', 'ECE', 'ÖZ', 'supervisor', 5, '2022-09-06', true, false, 4200000, 0, 'approved', 'Sprint 8 sync: süpervizör, kıdem 3 yıl, izin 14'),
('efekadir.kocakaya', 'EFE KADİR', 'KOCAKAYA', 'stajyer', 5, '2025-09-18', true, true, 3100000, 0, 'approved', 'Sprint 8 sync: yeni stajyer'),
('kemal.huseyinoglu', 'KEMAL', 'HÜSEYİNOĞLU', 'barista', 5, '2023-08-18', true, true, 3200000, 0, 'approved', 'Sprint 8 sync: kıdem 2 yıl, izin 7'),
('yavuz.kolakan', 'YAVUZ', 'KOLAKAN', 'manager', 5, '2021-02-19', true, false, 4600000, 0, 'approved', 'Sprint 8 sync: müdür, kıdem 5 yıl, izin 41'),
('suleyman.olgun', 'SÜLEYMAN', 'OLGUN', 'bar_buddy', 5, '2026-01-13', true, true, 3200000, 0, 'approved', 'Sprint 8 sync: yeni 2026'),
('ismail.sivri', 'İSMAİL', 'SİVRİ', 'stajyer', 5, '2026-02-09', true, true, 3100000, 0, 'approved', 'Sprint 8 sync: yeni stajyer 2026'),
('hulya.tuzun', 'HÜLYA', 'TÜZÜN', 'stajyer', 5, '2026-02-17', true, true, 3100000, 0, 'approved', 'Sprint 8 sync: yeni stajyer 2026')
ON CONFLICT (username) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  branch_id = EXCLUDED.branch_id,
  hire_date = EXCLUDED.hire_date,
  net_salary = EXCLUDED.net_salary,
  is_active = true,
  notes = EXCLUDED.notes;

-- 3.4) LARA (9 kişi, branch_id=8)
-- Lara sheet'inden — net maaş bilgileri Ocak/Şubat/Mart 2026 detay tablolarda
-- Maaş bilgisi henüz girilmedi (Aslan'a sorulacak), şimdilik 0
INSERT INTO users (
  username, first_name, last_name, role, branch_id, 
  is_active, must_change_password, account_status, notes
) VALUES
('denizhalil.colak', 'DENİZ HALİL', 'ÇOLAK', 'supervisor_buddy', 8, true, true, 'approved', 'Sprint 8 sync: Lara, position=Supervisor Buddy'),
('eren.demir', 'EREN', 'DEMİR', 'barista', 8, true, true, 'approved', 'Sprint 8 sync: Lara, Barista'),
('veysel.huseyinoglu', 'VEYSEL', 'HÜSEYİNOĞLU', 'barista', 8, true, true, 'approved', 'Sprint 8 sync: Lara, Barista'),
('dilarajenefer.elmas', 'DİLARA JENNEFER', 'ELMAS', 'barista', 8, true, true, 'approved', 'Sprint 8 sync: Lara, Barista'),
('berkan.bozdag', 'BERKAN', 'BOZDAĞ', 'bar_buddy', 8, true, true, 'approved', 'Sprint 8 sync: Lara, Bar Buddy'),
('efe.yuksel', 'EFE', 'YÜKSEL', 'bar_buddy', 8, true, true, 'approved', 'Sprint 8 sync: Lara, Bar Buddy'),
('gul.demir', 'GÜL', 'DEMİR', 'bar_buddy', 8, true, true, 'approved', 'Sprint 8 sync: Lara, Bar Buddy'),
('yagiz.torer', 'YAĞIZ', 'TÖRER', 'stajyer', 8, true, true, 'approved', 'Sprint 8 sync: Lara, Stajyer'),
('bugra.sakiz', 'BUĞRA', 'SAKIZ', 'stajyer', 8, true, true, 'approved', 'Sprint 8 sync: Lara, Stajyer (Buğra: çalışılan gün × günlük ücret kuralı)')
ON CONFLICT (username) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  branch_id = EXCLUDED.branch_id,
  is_active = true,
  notes = EXCLUDED.notes;

-- ═══════════════════════════════════════════════════════════════════
-- ADIM 4: DOĞRULAMA SORGULARI (otomatik raporlanır)
-- ═══════════════════════════════════════════════════════════════════

-- A) Aktif şube sayısı (beklenen: 4)
SELECT 'FINAL_ACTIVE_BRANCHES' as report, COUNT(*) as count 
FROM branches WHERE is_active = true;

-- B) Şube başına aktif personel
SELECT 'FINAL_USERS_PER_BRANCH' as report, b.name, COUNT(u.id) as active_users
FROM branches b
LEFT JOIN users u ON u.branch_id = b.id AND u.is_active = true
WHERE b.is_active = true
GROUP BY b.name
ORDER BY active_users DESC;

-- Beklenen: Işıklar=11, Fabrika=10+, Lara=9, Merkez Ofis=5+

-- C) HQ personel (branch_id NULL)
SELECT 'FINAL_HQ_USERS' as report, role, COUNT(*) as count
FROM users WHERE branch_id IS NULL AND is_active = true
GROUP BY role ORDER BY count DESC;

-- D) Toplam aktif personel sayısı
SELECT 'FINAL_TOTAL_ACTIVE' as report, COUNT(*) as count 
FROM users WHERE is_active = true;

-- Beklenen: ~35-40 (35 pilot personel + birkaç HQ admin/ceo)

-- ═══════════════════════════════════════════════════════════════════
-- ADIM 5: SCORE_PARAMETERS — Mevcut hardcoded skor kriterleri seed
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Mevcut my-performance.tsx'te hardcoded:
--   Devam: 20 puan, Checklist: 20 puan, Görev: 15 puan, 
--   Müşteri: 15 puan, Yönetici: 20 puan = Toplam 90 puan
-- 
-- Bunlar DB'ye taşınır ki admin /admin/skor-parametreleri'nden ayarlasın.
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO score_parameters (
  category, display_name, description, max_points, weight, formula, formula_code, sort_order, is_active, version
) VALUES
('devam', 'Devam ve Mesai', 'Aylık ortalama PDKS uyumu (geç kalma + devamsızlık)', 20, 1.0, 
 'PDKS uyum oranı × 20 puan', 'pdks_compliance', 1, true, 1),
('checklist', 'Günlük Checklist', 'Vardiya başı/sonu checklist tamamlama oranı', 20, 1.0,
 'Tamamlanan checklist / Toplam × 20 puan', 'checklist_completion', 2, true, 1),
('gorev', 'Görev Tamamlama', 'Atanan görevlerin zamanında tamamlanması', 15, 1.0,
 'Zamanında tamamlanan / Toplam × 15 puan', 'task_completion', 3, true, 1),
('musteri', 'Müşteri Memnuniyeti', 'NPS ve müşteri puanlamaları', 15, 1.0,
 'Ortalama müşteri puanı × 3 (5\\\'lik skala)', 'customer_satisfaction', 4, true, 1),
('yonetici', 'Yönetici Değerlendirmesi', 'Süpervizör/müdür değerlendirme puanı', 20, 1.0,
 'Yönetici puanı × 20 puan', 'manager_evaluation', 5, true, 1);

-- Doğrulama
SELECT 'STEP_5_SCORE_PARAMETERS_SEEDED' as report, 
  COUNT(*) as count,
  SUM(max_points) as total_max
FROM score_parameters WHERE is_active = true;

-- Beklenen: count=5, total_max=90
