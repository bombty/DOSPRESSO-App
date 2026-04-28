-- ============================================================
-- DOSPRESSO — PERSONEL IMPORT PHASE 1 SQL PREVIEW (REV4)
-- Tarih: 28 Nisan 2026
-- REV1: 28 Nis 2026 (BLOCKED — schema mismatch'leri vardı)
-- REV2: 28 Nis 2026 (B1+B2+B3 fix + R1+R4+R7 fix uygulandı, dry-run sırasında B4 bulundu)
-- REV3: 28 Nis 2026 (B4 fix: UP-2 atiyekar0706 WHERE id → WHERE username,
--                    V1 aktif beklenti 44→45 düzeltildi, V8 Atiye explicit verification eklendi)
-- REV4: 28 Nis 2026 (B5 fix: V7 listesinden 'atiyekar0706' kaldırıldı,
--                    OR username='atiyekar0706' eklendi → 10 satır beklentisi tutar;
--                    R5 ONAYLANDI: Atiye Excel doğru, REV3 değerleri kullanılacak;
--                    COMMIT versiyonu için son hazır revizyon — gerçek import'ta
--                    sadece son satır ROLLBACK→COMMIT değişir, başka düzenleme yok)
-- Kapsam: Lara (id=8), Işıklar (id=5), Fabrika (id=24), HQ (id=23)
-- 
-- ⚠️  BU DOSYA SADECE ÖN GÖSTERİMDİR — DB'YE YAZILMAMIŞTIR
-- ⚠️  DRY-RUN: tüm phase'ler tek BEGIN...ROLLBACK içinde
-- ⚠️  Çalıştırma için: en alttaki ROLLBACK satırını COMMIT yap
-- ⚠️  ÖNCESİNDE: pg_dump + bcrypt hash + IMPORT_ACTOR_USER_ID belirleme
-- 
-- ════════════════════════════════════════════════════════════
-- REV1 → REV2 DEĞİŞİKLİK ÖZETİ
-- ════════════════════════════════════════════════════════════
-- BLOCKING fix'ler:
--   B1: employee_salaries INSERT'ten 'id' kolonu çıkarıldı (SERIAL nextval)
--   B2: employee_salaries.created_by_id (NOT NULL) eklendi
--       → :IMPORT_ACTOR_USER_ID placeholder kullanılıyor
--   B3: employee_terminations INSERT'ten 'id' kolonu çıkarıldı (SERIAL nextval)
-- NON-BLOCKING fix'ler:
--   R1: Sayım yorumları gerçek değerlerle güncellendi (35→36, 27→31, 81→82)
--   R4: Phase 6'ya Sema rol değişimi explicit verification SELECT'i eklendi
--   R7: 'full_time' → 'fulltime' (DB default ile uyum, hem users hem salaries)
--   Buğra (INSERT_THEN_TERMINATE): Phase 6'da created vs terminated ayrı SELECT
-- ════════════════════════════════════════════════════════════
-- 
-- DB schema doğrulamaları (28 Nis):
--   • users.id          : varchar, default gen_random_uuid() → INSERT'te
--                         gen_random_uuid()::text uygun ✓
--   • employee_salaries.id        : SERIAL → INSERT'te id verme, nextval ✓
--   • employee_terminations.id    : SERIAL → INSERT'te id verme, nextval ✓
--   • employee_salaries.created_by_id : NOT NULL → :IMPORT_ACTOR_USER_ID ✓
--   • users.username    : UNIQUE constraint var (collision check edildi: 0)
--   • users.email       : UNIQUE değil (constraint yok)
--   • users.employment_type default = 'fulltime' (alt çizgisiz)
--   • users tablosunda: hashed_password (password DEĞİL), net_salary,
--     bonus_base, meal_allowance, transport_allowance, must_change_password
--   • base_salary kolonu users'ta YOK → employee_salaries tablosuna gider
--   • termination_date kolonu users'ta YOK → employee_terminations tablosuna
--   • pgcrypto extension YÜKLÜ DEĞİL → crypt() çalışmaz
--     bcrypt hash uygulama katmanından gelmeli (:BCRYPT_0000 placeholder)
-- 
-- Sayım özeti (REV2 GERÇEK):
--   • Phase 0 Pre-flight SELECT  : 1 sorgu (4 birim toplam beklenen=46)
--   • Phase 2 Soft-delete        : 36 UPDATE (zaten pasif olanlar dahil)
--   • Phase 3 UPDATE             :  3 UPDATE (UP-1 Eren, UP-2 Atiye, UP-3 Sema)
--   • Phase 4 INSERT users       : 36 INSERT (35 normal + 1 INSERT_THEN_TERMINATE Buğra)
--   • Phase 4b INSERT salary     : 31 INSERT (Excel'de maaş bilgisi olanlar)
--   • Phase 5.1 TERMINATE soft-d : 1 UPDATE (Buğra)
--   • Phase 5.2 TERMINATE INSERT : 1 INSERT (employee_terminations)
--   • Phase 6 Verification       : 6 SELECT (post_verify, new users, salary,
--                                  terminations, Sema role, korunan istisnalar)
--   • Toplam UPDATE              : 40 (36 SD + 3 UP + 1 Buğra SD)
--   • Toplam INSERT users        : 36
--   • Toplam INSERT salaries     : 31
--   • Toplam INSERT terminations : 1
--   • Korunacak (DOKUNULMAYAN)   : 10 user
--   • Kapsam dışı                : ~326 user (diğer 18 şube + admin)
-- ============================================================

-- =============== ÖN HAZIRLIK (manuel, transaction dışı) ===============
-- 1) pg_dump backup ZORUNLU:
--    pg_dump $DATABASE_URL > /tmp/backup_pre_personnel_import_$(date +%F).sql
--    pg_restore --list /tmp/backup_pre_personnel_import_*.sql | head  -- kontrol
--
-- 2) bcrypt hash üret (Node app katmanı):
--    node -e "console.log(require('bcryptjs').hashSync('0000',10))"
--
-- 3) IMPORT_ACTOR_USER_ID belirle (Phase 4b created_by_id için):
--    SELECT id, username, role FROM users WHERE role IN ('rgm','cgo','admin')
--      AND deleted_at IS NULL ORDER BY role;
--    → Owner/admin user ID'si seç (örn: 'hq-ilker-recete-gm' gibi varchar)
--
-- 4) psql ile çalıştırırken iki placeholder'ı parametre olarak geçir:
--    psql "$DATABASE_URL" \
--      -v BCRYPT_0000="'\$2b\$10\$gerçekhashburada'" \
--      -v IMPORT_ACTOR_USER_ID="'hq-ilker-recete-gm'" \
--      -f docs/audit/personnel-import-phase1-preview-rev2.sql
--    NOT: değerler tek tırnaklı string olarak verilir (ID veya bcrypt hash)
--
-- 5) DRY-RUN: önce ROLLBACK ile çalıştırıp Phase 0 ve Phase 6 sayımları al,
--    beklentiyle karşılaştır, sonra ROLLBACK→COMMIT yapıp gerçek run.
-- ===============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════
-- PHASE 0 — PRE-FLIGHT SNAPSHOT
-- ════════════════════════════════════════════════════════════
-- Beklenen: 4 birim toplam 46 user (29 aktif, 17 pasif)
SELECT 'pre_flight' AS chk, branch_id, COUNT(*) AS total,
       SUM((is_active)::int) AS aktif,
       SUM((NOT is_active)::int) AS pasif,
       SUM((deleted_at IS NOT NULL)::int) AS soft_deleted_pre
FROM users WHERE branch_id IN (5,8,23,24) GROUP BY branch_id ORDER BY branch_id;

-- ════════════════════════════════════════════════════════════
-- PHASE 1 — KORUNACAK USER'LAR (no-op, sadece bilgi)
-- ════════════════════════════════════════════════════════════
-- [KORU] Işıklar  | isiklar              | Işıklar Kiosk                | sube_kiosk           | Kiosk hesabı
-- [KORU] Işıklar  | yatirimci5           | Halil Özkan                  | yatirimci_branch     | Yatırımcı
-- [KORU] Işıklar  | mudur5               | Erdem Yıldız                 | mudur                | Pilot user (replit.md)
-- [KORU] Lara     | lara                 | Antalya Lara Kiosk           | sube_kiosk           | Kiosk hesabı
-- [KORU] Lara     | laramudur            | Andre Müdür                  | mudur                | Pilot şube müdürü (owner)
-- [KORU] Fabrika  | fabrika              | Fabrika Kiosk                | fabrika_operator     | Kiosk hesabı
-- [KORU] Fabrika  | eren                 | Eren Fabrika                 | fabrika_mudur        | UPDATE: last_name=Elmas + birth/hire/maaş
-- [KORU] Fabrika  | Umit                 | Ümit Usta                    | sef                  | Pasta şefi (owner) — dokunma
-- [KORU] Fabrika  | atiyekar0706         | Atiye Kar                    | supervisor           | UPDATE: birth/hire Excel'den
-- [KORU] Fabrika  | RGM                  | Sema Reçete GM               | recete_gm            | UPDATE: role→gida_muhendisi

-- ════════════════════════════════════════════════════════════
-- PHASE 2 — SOFT-DELETE (36 user)
-- ════════════════════════════════════════════════════════════
-- Mantık: is_active=false + deleted_at=now() (HARD DELETE YOK)
-- FK: branch_monthly_payroll_summary, branch_shift_sessions, disciplinary_reports
-- vb. eski user'a bağlı kalır — geçmiş okunabilir, audit izi korunur

-- [SD-01] Işıklar  | efe                    | Efe Kolakan                  | bar_buddy          | aktif
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='714d7f30-54aa-4b40-a4ae-cd8f7ac9e0cb';
-- [SD-02] Işıklar  | abdullah               | Abdullah Üzer                | barista            | aktif
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='9487cc4b-a10d-4f4b-bc4f-0e042e159394';
-- [SD-03] Işıklar  | ahmethamit             | Ahmet Hamit Doğan            | barista            | aktif
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='4cfa0da6-b32c-40f1-bda5-b613f1a53bbc';
-- [SD-04] Işıklar  | atesguney              | Ateş Güney Yılmaz            | barista            | aktif
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='0bd4c7ce-e685-44f7-9915-0aee001af8ce';
-- [SD-05] Işıklar  | cihan                  | Cihan Kolakan                | barista            | aktif
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='47a30f2d-b348-4ac5-a29f-c7a640aaafc5';
-- [SD-06] Işıklar  | edanur                 | Edanur Tarakcı               | barista            | PASİF (zaten)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='6226c602-ac2e-4241-88e5-5070fb227ea1';
-- [SD-07] Işıklar  | kemal                  | Kemal Kolakan                | barista            | aktif
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='83b203d4-2280-4066-a5a1-bf8922689bb6';
-- [SD-08] Işıklar  | suleyman               | Süleyman Aydın               | barista            | aktif
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='6e240549-a1fe-4107-a93f-64d4c699901f';
-- [SD-09] Işıklar  | basri                  | Basri Şen                    | supervisor         | aktif
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='f8319722-c617-4694-aeae-98b5789b0b97';
-- [SD-10] Lara     | tbarbuddy1_b8          | Ayşe Demir                   | bar_buddy          | PASİF (test)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='605cd38c-fd08-47c5-924c-32359b547ea3';
-- [SD-11] Lara     | tbarbuddy2_b8          | Fatma Çelik                  | bar_buddy          | PASİF (test)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='ba82548b-df3e-45ab-8f58-c45681e1d5ee';
-- [SD-12] Lara     | larabarista1           | Barista Bir                  | barista            | aktif (placeholder)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='d4a5d4fd-09bb-424d-b021-d0d77c179ae4';
-- [SD-13] Lara     | larabarista2           | Barista İki                  | barista            | aktif (placeholder)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='45e03a81-c904-49bc-a055-95ae348f3699';
-- [SD-14] Lara     | larabarista3           | Barista Üç                   | barista            | aktif (placeholder)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='400a8a52-72cb-4b6f-a4fe-b845718db63f';
-- [SD-15] Lara     | tbarista1_b8           | Emre Yıldırım                | barista            | PASİF (test)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='e443fd05-a129-4cb1-8aee-685ac571229c';
-- [SD-16] Lara     | tbarista2_b8           | Mehmet Kaya                  | barista            | PASİF (test)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='d813e963-d27d-4aac-b28f-40bb3dda5eaf';
-- [SD-17] Lara     | mudur_b8               | İbrahim Keskin               | mudur              | PASİF (test)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='a992e3b7-cda9-4977-ab46-d762290e8e38';
-- [SD-18] Lara     | teststajyer1_b8        | Burak Şahin                  | stajyer            | PASİF (test)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='adf8ae11-ab5c-4c63-ad84-1c31418d962c';
-- [SD-19] Lara     | teststajyer2_b8        | Merve Yılmaz                 | stajyer            | PASİF (test)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='7f7c82a0-6eac-4eb9-8ada-4923930831f9';
-- [SD-20] Lara     | larasupervisor         | Lara Supervisor              | supervisor         | aktif (placeholder)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='d628cf39-2272-4678-9b6f-4a78013b848e';
-- [SD-21] Lara     | testsupervisor_b8      | Hasan Öztürk                 | supervisor         | PASİF (test)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='0e5ddccf-1e2b-49dc-a440-c84024ae6eda';
-- [SD-22] Lara     | tsupervisorbuddy1_b8   | Zeynep Arslan                | supervisor_buddy   | PASİF (test)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='2112e990-9c09-4652-8f00-cf1c04262323';
-- [SD-23] Lara     | tsupervisorbuddy2_b8   | Elif Doğan                   | supervisor_buddy   | PASİF (test)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='8d5d0ed7-f0de-44b4-88c2-ee6ea591d9ce';
-- [SD-24] HQ       | test-employee          | Yavuz Supervisor             | coach              | PASİF (test)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='1e189abc-37b2-46f5-90ce-413163a662ea';
-- [SD-25] Fabrika  | depocu                 | Test Depocu                  | fabrika_depo       | aktif (test)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='81240bf9-cdbb-42d2-98ff-6a635868b1cb';
-- [SD-26] Fabrika  | arifeyildirim0         | Arife Yıldırım               | fabrika_operator   | aktif (TC kayıt — clean slate)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='6d5b583c-f03f-4a27-bd03-c616e745302e';
-- [SD-27] Fabrika  | busradogmus20          | Büşra Doğmuş                 | fabrika_operator   | PASİF (TC kayıt — clean slate)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='41d2a9f0-f3be-45d0-90cc-e2aa585cfcc9';
-- [SD-28] Fabrika  | filizdemir             | Filiz Demir                  | fabrika_operator   | aktif (placeholder)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='b8743987-e5d4-47f5-9a6f-08112d21d6c6';
-- [SD-29] Fabrika  | leylaozdemir           | Leyla Özdemir                | fabrika_operator   | PASİF (placeholder)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='38f93cb4-0135-4402-99cf-b62c4e338546';
-- [SD-30] Fabrika  | mihricanyilmaz         | Mihrican Yılmaz              | fabrika_operator   | PASİF (placeholder)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='4006e4a0-f2e1-404c-b860-3c41b2dc7842';
-- [SD-31] Fabrika  | emreacarstj            | Emre Acar                    | stajyer            | aktif (test stajyer)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='f6d3fcba-3765-4ca6-aa6d-b84838e5fb9b';
-- [SD-32] Fabrika  | fatiharslanstj         | Fatih Arslan                 | stajyer            | aktif (test stajyer)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='df8073bf-bc07-4781-bb49-4bbbbcc7fe6f';
-- [SD-33] Fabrika  | mervecelikstj          | Merve Çelik                  | stajyer            | PASİF (test stajyer)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='cd3b8fba-26d3-45e8-9fda-d7bcbaa9ed95';
-- [SD-34] Fabrika  | selinyildizstj         | Selin Yıldız                 | stajyer            | PASİF (test stajyer)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='18fc2ddd-4b18-47b7-b12f-36a989c02ee4';
-- [SD-35] Fabrika  | umitkara               | Ümit Kara                    | supervisor_buddy   | PASİF (placeholder)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='63e73592-50a3-4c9f-b613-204af91aba32';
-- [SD-36] Fabrika  | umit                   | Ümit Usta                    | uretim_sefi        | aktif (DUPLICATE - hq-umit-sef korunuyor)
UPDATE users SET is_active=false, deleted_at=COALESCE(deleted_at, now()), updated_at=now() WHERE id='52665297-2c0d-49b6-8e89-d8649003f67b';

-- ════════════════════════════════════════════════════════════
-- PHASE 3 — UPDATE (mevcut korunan kayıtların özlük güncellemesi)
-- ════════════════════════════════════════════════════════════
-- [UP-1] Eren Elmas (mevcut hq-eren-fabrika, fabrika_mudur korunur)
UPDATE users SET
  last_name='Elmas', birth_date='1994-04-22', hire_date='2021-05-25',
  bonus_base=46000.00, net_salary=60000.00,
  meal_allowance=NULL, transport_allowance=6000.00,
  department='OFİS', updated_at=now()
WHERE id='hq-eren-fabrika';

-- [UP-2] Atiye Kar (mevcut atiyekar0706, supervisor korunur)
-- REV3 fix (B4): WHERE id='atiyekar0706' yanlıştı (atiyekar0706 username,
--   id ise 4aa226d5-8151-4eb0-9ad8-2edb246e1c7c UUID). REV2 dry-run'da
--   UPDATE 0 dönmüştü → username ile düzeltildi.
-- REV4 R5 ONAYLANDI: Owner Excel kaynağını doğru kabul etti. DB'deki
--   eski net_salary=4900000 hatalı/legacy format. REV3/REV4 değerleri
--   (net_salary=50000, bonus_base=42000) gerçek import'ta yazılacak.
UPDATE users SET
  birth_date='1970-02-01', hire_date='2017-02-24',
  bonus_base=42000.00, net_salary=50000.00,
  department='İMALATHANE', updated_at=now()
WHERE username='atiyekar0706';

-- [UP-3] Sema (mevcut hq-ilker-recete-gm) — sadece rol değişimi
UPDATE users SET role='gida_muhendisi', updated_at=now()
WHERE id='hq-ilker-recete-gm';

-- ════════════════════════════════════════════════════════════
-- PHASE 4 — INSERT users (36 yeni user: 35 normal + 1 INSERT_THEN_TERMINATE)
-- ════════════════════════════════════════════════════════════
-- NOT: Buğra Sakız [IN-33] burada INSERT olur, sonra Phase 5'te terminate edilir.
-- INSERT_THEN_TERMINATE akışı tek transaction içinde sırayla çalışır.
-- Şifre: '0000' (bcrypt hash, must_change_password=true)
-- :BCRYPT_0000 → uygulama katmanından bcryptjs.hashSync('0000',10)

-- [IN-01] ARİFE YILDIRIM → arifeyildirim (Fabrika/fabrika_operator)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'arifeyildirim', :BCRYPT_0000,
  'Arife', 'Yıldırım', 'fabrika_operator', 24,
  'arifeyildirim@dospresso.local',
  true, true, '2000-11-26', '2025-05-23', 'İMALATHANE',
  29500.00, 33500.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-02] BÜŞRA DOĞMUŞ → busradogmus (Fabrika/fabrika_operator)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'busradogmus', :BCRYPT_0000,
  'Büşra', 'Doğmuş', 'fabrika_operator', 24,
  'busradogmus@dospresso.local',
  true, true, '2000-01-01', '2023-08-08', 'İMALATHANE',
  31000.00, 35000.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-03] DIANA NAYFONOVA → diananayfonova (HQ/marketing)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'diananayfonova', :BCRYPT_0000,
  'Dıana', 'Nayfonova', 'marketing', 23,
  'diananayfonova@dospresso.local',
  true, true, '1981-11-03', '2025-01-20', 'OFİS',
  37000.00, 47500.00,
  NULL, 2500.00,
  'fulltime', now(), now()
);

-- [IN-04] FİLİZ KARALİ → filizkarali (Fabrika/fabrika_operator)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'filizkarali', :BCRYPT_0000,
  'Filiz', 'Karali', 'fabrika_operator', 24,
  'filizkarali@dospresso.local',
  true, true, '1970-06-01', '2018-07-25', 'İMALATHANE',
  30500.00, 38500.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-05] GALİP CAN BORAN → galipcanboran (Fabrika/fabrika_operator)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'galipcanboran', :BCRYPT_0000,
  'Galip Can', 'Boran', 'fabrika_operator', 24,
  'galipcanboran@dospresso.local',
  true, true, '2003-06-27', '2024-03-18', 'İMALATHANE',
  31500.00, 34500.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-06] HATİCE KOCABAŞ → haticekocabas (Fabrika/fabrika_operator)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'haticekocabas', :BCRYPT_0000,
  'Hatice', 'Kocabaş', 'fabrika_operator', 24,
  'haticekocabas@dospresso.local',
  true, true, '1978-10-20', '2025-07-21', 'İMALATHANE',
  31000.00, 32500.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-07] LEYLA SÖNMEZ → leylasonmez (Fabrika/fabrika_operator)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'leylasonmez', :BCRYPT_0000,
  'Leyla', 'Sönmez', 'fabrika_operator', 24,
  'leylasonmez@dospresso.local',
  true, true, '1990-01-01', '2025-10-01', 'İMALATHANE',
  30000.00, 32500.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-08] MAHMUT ALTUNAY → mahmutaltunay (HQ/muhasebe_ik)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'mahmutaltunay', :BCRYPT_0000,
  'Mahmut', 'Altunay', 'muhasebe_ik', 23,
  'mahmutaltunay@dospresso.local',
  true, true, '1992-09-05', '2025-11-24', 'OFİS',
  49000.00, 65000.00,
  NULL, 6000.00,
  'fulltime', now(), now()
);

-- [IN-09] MİHRİCAN VEZİROĞLU → mihricanveziroglu (Fabrika/fabrika_operator)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'mihricanveziroglu', :BCRYPT_0000,
  'Mihrican', 'Veziroğlu', 'fabrika_operator', 24,
  'mihricanveziroglu@dospresso.local',
  true, true, '1990-04-12', '2023-05-29', 'İMALATHANE',
  31000.00, 35000.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-10] MUSTAFA CAN HORZUM → mustafacanhorzum (Fabrika/fabrika_operator)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'mustafacanhorzum', :BCRYPT_0000,
  'Mustafa Can', 'Horzum', 'fabrika_operator', 24,
  'mustafacanhorzum@dospresso.local',
  true, true, '1997-07-09', '2024-01-22', 'İMALATHANE',
  39000.00, 47000.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-11] ŞEVKET SAMET KARA → sevketsametkara (HQ/satinalma)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'sevketsametkara', :BCRYPT_0000,
  'Şevket Samet', 'Kara', 'satinalma', 23,
  'sevketsametkara@dospresso.local',
  true, true, '1988-11-23', '2024-04-15', 'OFİS',
  37000.00, 50000.00,
  NULL, 5000.00,
  'fulltime', now(), now()
);

-- [IN-12] UTKU DERNEK → utkudernek (HQ/cgo)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'utkudernek', :BCRYPT_0000,
  'Utku', 'Dernek', 'cgo', 23,
  'utkudernek@dospresso.local',
  true, true, '1991-06-21', '2015-09-08', 'OFİS',
  59000.00, 75000.00,
  NULL, 6000.00,
  'fulltime', now(), now()
);

-- [IN-13] ÜMÜT KOŞAR → umutkosar (Fabrika/fabrika_operator)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'umutkosar', :BCRYPT_0000,
  'Ümüt', 'Koşar', 'fabrika_operator', 24,
  'umutkosar@dospresso.local',
  true, true, '1978-04-10', '2025-11-17', 'İMALATHANE',
  70000.00, 85000.00,
  NULL, 5000.00,
  'fulltime', now(), now()
);

-- [IN-14] AHMET HAMİT DOĞAN → ahmethamitdogan (Işıklar/barista)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'ahmethamitdogan', :BCRYPT_0000,
  'Ahmet Hamit', 'Doğan', 'barista', 5,
  'ahmethamitdogan@dospresso.local',
  true, true, '2000-01-01', '2025-10-08', 'IŞIKLAR',
  31000.00, 36000.00,
  2000.00, NULL,
  'fulltime', now(), now()
);

-- [IN-15] ATEŞ GÜNEY YILMAZ → atesguneyyilmaz (Işıklar/barista)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'atesguneyyilmaz', :BCRYPT_0000,
  'Ateş Güney', 'Yılmaz', 'barista', 5,
  'atesguneyyilmaz@dospresso.local',
  true, true, '1999-09-17', '2023-12-27', 'IŞIKLAR',
  32000.00, 42000.00,
  2000.00, NULL,
  'fulltime', now(), now()
);

-- [IN-16] BASRİ ŞEN → basrisen (Işıklar/barista)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'basrisen', :BCRYPT_0000,
  'Basri', 'Şen', 'barista', 5,
  'basrisen@dospresso.local',
  true, true, '1994-02-12', '2022-09-01', 'IŞIKLAR',
  35000.00, 45000.00,
  2000.00, NULL,
  'fulltime', now(), now()
);

-- [IN-17] CİHAN KOLAKAN → cihankolakan (Işıklar/barista)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'cihankolakan', :BCRYPT_0000,
  'Cihan', 'Kolakan', 'barista', 5,
  'cihankolakan@dospresso.local',
  true, true, '1996-06-01', '2025-11-24', 'IŞIKLAR',
  32000.00, 42000.00,
  2000.00, NULL,
  'fulltime', now(), now()
);

-- [IN-18] ECE ÖZ → eceoz (HQ/trainer)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'eceoz', :BCRYPT_0000,
  'Ece', 'Öz', 'trainer', 23,
  'eceoz@dospresso.local',
  true, true, '1994-02-11', '2022-09-06', 'IŞIKLAR',
  42000.00, 52000.00,
  2000.00, NULL,
  'fulltime', now(), now()
);

-- [IN-19] EFE KADİR KOCAKAYA → efekadirkocakaya (Işıklar/barista)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'efekadirkocakaya', :BCRYPT_0000,
  'Efe Kadir', 'Kocakaya', 'barista', 5,
  'efekadirkocakaya@dospresso.local',
  true, true, '1999-09-17', '2025-09-18', 'IŞIKLAR',
  31000.00, 36000.00,
  2000.00, NULL,
  'fulltime', now(), now()
);

-- [IN-20] KEMAL HÜSEYİNOĞLU → kemalhuseyinoglu (Işıklar/barista)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'kemalhuseyinoglu', :BCRYPT_0000,
  'Kemal', 'Hüseyinoğlu', 'barista', 5,
  'kemalhuseyinoglu@dospresso.local',
  true, true, '2001-10-20', '2023-08-18', 'IŞIKLAR',
  32000.00, 42000.00,
  2000.00, NULL,
  'fulltime', now(), now()
);

-- [IN-21] YAVUZ KOLAKAN → yavuzkolakan (HQ/coach)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'yavuzkolakan', :BCRYPT_0000,
  'Yavuz', 'Kolakan', 'coach', 23,
  'yavuzkolakan@dospresso.local',
  true, true, '1995-06-25', '2021-02-19', 'IŞIKLAR',
  46000.00, 56000.00,
  2000.00, NULL,
  'fulltime', now(), now()
);

-- [IN-22] SÜLEYMAN OLGUN → suleymanolgun (Işıklar/barista)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'suleymanolgun', :BCRYPT_0000,
  'Süleyman', 'Olgun', 'barista', 5,
  'suleymanolgun@dospresso.local',
  true, true, NULL, '2026-01-13', 'IŞIKLAR',
  32000.00, 42000.00,
  2000.00, NULL,
  'fulltime', now(), now()
);

-- [IN-23] İSMAİL SİVRİ → ismailsivri (Işıklar/barista)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'ismailsivri', :BCRYPT_0000,
  'İsmail', 'Sivri', 'barista', 5,
  'ismailsivri@dospresso.local',
  true, true, NULL, '2026-02-09', 'IŞIKLAR',
  31000.00, 33000.00,
  2000.00, NULL,
  'fulltime', now(), now()
);

-- [IN-24] HÜLYA TÜZÜN → hulyatuzun (Işıklar/barista)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'hulyatuzun', :BCRYPT_0000,
  'Hülya', 'Tüzün', 'barista', 5,
  'hulyatuzun@dospresso.local',
  true, true, '1977-01-05', '2026-02-17', 'IŞIKLAR',
  31000.00, 33000.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-25] DENİZ HALİL ÇOLAK → denizhalilcolak (Lara/supervisor_buddy)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'denizhalilcolak', :BCRYPT_0000,
  'Deniz Halil', 'Çolak', 'supervisor_buddy', 8,
  'denizhalilcolak@dospresso.local',
  true, true, NULL, NULL, 'Lara Şube',
  31000.00, 41183.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-26] EREN DEMİR → erendemir (Lara/barista)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'erendemir', :BCRYPT_0000,
  'Eren', 'Demir', 'barista', 8,
  'erendemir@dospresso.local',
  true, true, NULL, '2024-09-06', 'Lara Şube',
  31000.00, 43071.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-27] VEYSEL HÜSEYİNOĞLU → veyselhuseyinoglu (Lara/barista)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'veyselhuseyinoglu', :BCRYPT_0000,
  'Veysel', 'Hüseyinoğlu', 'barista', 8,
  'veyselhuseyinoglu@dospresso.local',
  true, true, NULL, '2025-10-27', 'Lara Şube',
  31000.00, 41256.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-28] DİLARA JENNEFER ELMAS → dilarajenneferelmas (Lara/barista)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'dilarajenneferelmas', :BCRYPT_0000,
  'Dilara Jennefer', 'Elmas', 'barista', 8,
  'dilarajenneferelmas@dospresso.local',
  true, true, NULL, '2025-10-27', 'Lara Şube',
  31000.00, 41239.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-29] BERKAN BOZDAĞ → berkanbozdag (Lara/bar_buddy)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'berkanbozdag', :BCRYPT_0000,
  'Berkan', 'Bozdağ', 'bar_buddy', 8,
  'berkanbozdag@dospresso.local',
  true, true, NULL, '2025-11-03', 'Lara Şube',
  31000.00, 32835.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-30] EFE YÜKSEL → efeyuksel (Lara/bar_buddy)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'efeyuksel', :BCRYPT_0000,
  'Efe', 'Yüksel', 'bar_buddy', 8,
  'efeyuksel@dospresso.local',
  true, true, NULL, NULL, 'Lara Şube',
  31000.00, 36664.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-31] GÜL DEMİR → guldemir (Lara/bar_buddy)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'guldemir', :BCRYPT_0000,
  'Gül', 'Demir', 'bar_buddy', 8,
  'guldemir@dospresso.local',
  true, true, NULL, '2025-12-01', 'Lara Şube',
  31000.00, 31785.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-32] Yağız Törer → yagiztorer (Lara/stajyer)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'yagiztorer', :BCRYPT_0000,
  'Yağız', 'Törer', 'stajyer', 8,
  'yagiztorer@dospresso.local',
  true, true, NULL, NULL, 'Lara Şube',
  31000.00, 33388.00,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IT-33] BUĞRA SAKIZ → bugrasakiz (Lara/stajyer)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'bugrasakiz', :BCRYPT_0000,
  'Buğra', 'Sakız', 'stajyer', 8,
  'bugrasakiz@dospresso.local',
  true, true, NULL, NULL, 'Lara Şube',
  31000.00, 16500.00,
  NULL, NULL,
  'fulltime', now(), now()
);
-- ↑ Buğra Sakız: INSERT yapılır, Phase 5'te terminate edilir

-- [IN-34] ALİCAN ERKENEKLİ → alicanerkenekli (Lara/stajyer)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'alicanerkenekli', :BCRYPT_0000,
  'Alican', 'Erkenekli', 'stajyer', 8,
  'alicanerkenekli@dospresso.local',
  true, true, NULL, '2026-04-22', 'Lara Şube',
  33000.00, NULL,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-35] DENİZ AYVAZOĞLU → denizayvazoglu (Lara/barista)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'denizayvazoglu', :BCRYPT_0000,
  'Deniz', 'Ayvazoğlu', 'barista', 8,
  'denizayvazoglu@dospresso.local',
  true, true, NULL, '2025-05-24', 'Lara Şube',
  NULL, NULL,
  NULL, NULL,
  'fulltime', now(), now()
);

-- [IN-36] ŞAHİN BERKER ERSÜRMELİ → sahinberkerersurmeli (Lara/stajyer)
INSERT INTO users (
  id, username, hashed_password, first_name, last_name, role, branch_id, email,
  is_active, must_change_password, birth_date, hire_date, department,
  bonus_base, net_salary, meal_allowance, transport_allowance,
  employment_type, created_at, updated_at
) VALUES (
  gen_random_uuid()::text, 'sahinberkerersurmeli', :BCRYPT_0000,
  'Şahin Berker', 'Ersürmeli', 'stajyer', 8,
  'sahinberkerersurmeli@dospresso.local',
  true, true, NULL, '2026-04-21', 'Lara Şube',
  33000.00, NULL,
  NULL, NULL,
  'fulltime', now(), now()
);

-- ════════════════════════════════════════════════════════════
-- PHASE 4b — employee_salaries history (31 INSERT — ŞEMA UYUMLU, ÇALIŞTIRILACAK)
-- ════════════════════════════════════════════════════════════
-- REV2 fix:
--   • id kolonu INSERT'ten çıkarıldı → SERIAL nextval kullanılıyor
--   • created_by_id (NOT NULL) eklendi → :IMPORT_ACTOR_USER_ID placeholder
--   • employment_type → 'fulltime' (DB default ile uyum)
-- Excel'deki maaş bilgisi tarihçe olarak ayrı tabloya da yazılır;
-- ileride zam/değişim takibi mümkün olur. Phase 4'teki users.net_salary
-- snapshot'ı ile bu tablo senkron tutulmalı (yan haklar için Phase 2 ayrı).

-- [SAL-01] arifeyildirim (taban=29500, net=33500)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 29500.00, 33500.00,
  'fulltime', '2025-05-23', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='arifeyildirim';

-- [SAL-02] busradogmus (taban=31000, net=35000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 31000.00, 35000.00,
  'fulltime', '2023-08-08', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='busradogmus';

-- [SAL-03] diananayfonova (taban=37000, net=47500)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 37000.00, 47500.00,
  'fulltime', '2025-01-20', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='diananayfonova';

-- [SAL-04] filizkarali (taban=30500, net=38500)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 30500.00, 38500.00,
  'fulltime', '2018-07-25', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='filizkarali';

-- [SAL-05] galipcanboran (taban=31500, net=34500)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 31500.00, 34500.00,
  'fulltime', '2024-03-18', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='galipcanboran';

-- [SAL-06] haticekocabas (taban=31000, net=32500)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 31000.00, 32500.00,
  'fulltime', '2025-07-21', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='haticekocabas';

-- [SAL-07] leylasonmez (taban=30000, net=32500)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 30000.00, 32500.00,
  'fulltime', '2025-10-01', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='leylasonmez';

-- [SAL-08] mahmutaltunay (taban=49000, net=65000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 49000.00, 65000.00,
  'fulltime', '2025-11-24', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='mahmutaltunay';

-- [SAL-09] mihricanveziroglu (taban=31000, net=35000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 31000.00, 35000.00,
  'fulltime', '2023-05-29', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='mihricanveziroglu';

-- [SAL-10] mustafacanhorzum (taban=39000, net=47000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 39000.00, 47000.00,
  'fulltime', '2024-01-22', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='mustafacanhorzum';

-- [SAL-11] sevketsametkara (taban=37000, net=50000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 37000.00, 50000.00,
  'fulltime', '2024-04-15', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='sevketsametkara';

-- [SAL-12] utkudernek (taban=59000, net=75000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 59000.00, 75000.00,
  'fulltime', '2015-09-08', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='utkudernek';

-- [SAL-13] umutkosar (taban=70000, net=85000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 70000.00, 85000.00,
  'fulltime', '2025-11-17', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='umutkosar';

-- [SAL-14] ahmethamitdogan (taban=31000, net=36000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 31000.00, 36000.00,
  'fulltime', '2025-10-08', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='ahmethamitdogan';

-- [SAL-15] atesguneyyilmaz (taban=32000, net=42000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 32000.00, 42000.00,
  'fulltime', '2023-12-27', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='atesguneyyilmaz';

-- [SAL-16] basrisen (taban=35000, net=45000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 35000.00, 45000.00,
  'fulltime', '2022-09-01', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='basrisen';

-- [SAL-17] cihankolakan (taban=32000, net=42000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 32000.00, 42000.00,
  'fulltime', '2025-11-24', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='cihankolakan';

-- [SAL-18] eceoz (taban=42000, net=52000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 42000.00, 52000.00,
  'fulltime', '2022-09-06', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='eceoz';

-- [SAL-19] efekadirkocakaya (taban=31000, net=36000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 31000.00, 36000.00,
  'fulltime', '2025-09-18', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='efekadirkocakaya';

-- [SAL-20] kemalhuseyinoglu (taban=32000, net=42000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 32000.00, 42000.00,
  'fulltime', '2023-08-18', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='kemalhuseyinoglu';

-- [SAL-21] yavuzkolakan (taban=46000, net=56000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 46000.00, 56000.00,
  'fulltime', '2021-02-19', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='yavuzkolakan';

-- [SAL-22] suleymanolgun (taban=32000, net=42000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 32000.00, 42000.00,
  'fulltime', '2026-01-13', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='suleymanolgun';

-- [SAL-23] ismailsivri (taban=31000, net=33000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 31000.00, 33000.00,
  'fulltime', '2026-02-09', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='ismailsivri';

-- [SAL-24] hulyatuzun (taban=31000, net=33000)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 31000.00, 33000.00,
  'fulltime', '2026-02-17', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (ozluk_excel)', now(), now()
FROM users WHERE username='hulyatuzun';

-- [SAL-25] erendemir (taban=31000, net=43071)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 31000.00, 43071.00,
  'fulltime', '2024-09-06', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (lara_excel)', now(), now()
FROM users WHERE username='erendemir';

-- [SAL-26] veyselhuseyinoglu (taban=31000, net=41256)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 31000.00, 41256.00,
  'fulltime', '2025-10-27', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (lara_excel)', now(), now()
FROM users WHERE username='veyselhuseyinoglu';

-- [SAL-27] dilarajenneferelmas (taban=31000, net=41239)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 31000.00, 41239.00,
  'fulltime', '2025-10-27', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (lara_excel)', now(), now()
FROM users WHERE username='dilarajenneferelmas';

-- [SAL-28] berkanbozdag (taban=31000, net=32835)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 31000.00, 32835.00,
  'fulltime', '2025-11-03', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (lara_excel)', now(), now()
FROM users WHERE username='berkanbozdag';

-- [SAL-29] guldemir (taban=31000, net=31785)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 31000.00, 31785.00,
  'fulltime', '2025-12-01', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (lara_excel)', now(), now()
FROM users WHERE username='guldemir';

-- [SAL-30] alicanerkenekli (taban=33000, net=?)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 33000.00, NULL,
  'fulltime', '2026-04-22', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (lara_excel)', now(), now()
FROM users WHERE username='alicanerkenekli';

-- [SAL-31] sahinberkerersurmeli (taban=33000, net=?)
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 33000.00, NULL,
  'fulltime', '2026-04-21', true,
  :IMPORT_ACTOR_USER_ID, 'Phase 1 Excel import (lara_excel)', now(), now()
FROM users WHERE username='sahinberkerersurmeli';

-- ════════════════════════════════════════════════════════════
-- PHASE 5 — TERMINATE (1 user: Buğra Sakız)
-- ════════════════════════════════════════════════════════════
-- Excel: BUĞRA SAKIZ stajyer Lara — 19.02.2026 işten ayrıldı

-- 5.1 users tablosunda soft-delete + tag
UPDATE users SET
  is_active=false, deleted_at='2026-02-19'::timestamp, updated_at=now()
WHERE username='bugrasakiz';

-- 5.2 employee_terminations tablosuna kayıt
INSERT INTO employee_terminations (
  user_id, termination_date, termination_reason, termination_type,
  last_work_day, notes, created_at, updated_at
) SELECT
  id, '2026-02-19',
  'Excel kaynak: Lara Şubat 2026 puantajı', 'voluntary',
  '2026-02-19',
  'Phase 1 Excel import — owner kararı: stajyer ayrıldı', now(), now()
FROM users WHERE username='bugrasakiz';

-- ════════════════════════════════════════════════════════════
-- PHASE 6 — POST-VERIFICATION (REV4: 8 SELECT)
-- ════════════════════════════════════════════════════════════
-- Beklenen sonrası (REV3 GERÇEK — REV2 dry-run ile birebir doğrulandı):
--   Önceki = 46 user, soft-delete edilen 36 (zaten pasifler dahil), eklenen 36
--   = 46 + 36 = 82 toplam
--   Aktif beklenen = 35 yeni aktif (V2, Buğra hariç) + 10 korunan = 45 aktif
--   Pasif/silinen beklenen = 36 önceki + 1 Buğra terminate = 37
--   (Buğra hem 36 INSERT'in içinde hem de Phase 5'te terminate olduğu için
--    çift sayım yok — toplam 82'de bir kere sayılıyor; V2'de filtrelendi)
-- REV3 fix: REV2'deki "44 aktif" hesabı yanlıştı; Buğra zaten V2 filter'ında
--   düşürülüyor, ayrıca düşmeye gerek yok → gerçek 45.

-- [V1] Şube bazlı toplu sayım
SELECT 'post_verify' AS chk, branch_id, COUNT(*) AS total,
       SUM((is_active)::int) AS aktif,
       SUM((NOT is_active)::int) AS pasif,
       SUM((deleted_at IS NOT NULL)::int) AS soft_deleted
FROM users WHERE branch_id IN (5,8,23,24) GROUP BY branch_id ORDER BY branch_id;

-- [V2] Yeni eklenen AKTİF kişiler (Buğra HARİÇ — terminate edildi)
-- notes alanı users'ta yok, bu yüzden zaman penceresi + is_active filtre kombinasyonu
SELECT username, first_name, last_name, role, branch_id, hire_date, is_active
FROM users
WHERE created_at >= now() - interval '15 minutes'
  AND is_active = true
ORDER BY branch_id, role, username;
-- Beklenen: 35 satır (36 INSERT - 1 terminate edilen Buğra = 35 aktif yeni)

-- [V3] Yeni eklenen TERMINATE EDİLEN kişiler (Buğra)
SELECT u.username, u.first_name, u.last_name, u.role, u.branch_id,
       u.is_active, u.deleted_at AS user_deleted_at,
       et.termination_date, et.termination_reason, et.termination_type
FROM users u
LEFT JOIN employee_terminations et ON et.user_id = u.id
WHERE u.username = 'bugrasakiz';
-- Beklenen: 1 satır, is_active=false, deleted_at='2026-02-19',
--           termination_date='2026-02-19', type='voluntary'

-- [V4] Salary history kayıt sayısı (Phase 4b)
SELECT 'salary_history' AS chk, COUNT(*) AS new_rows,
       SUM(CASE WHEN net_salary IS NULL THEN 1 ELSE 0 END) AS net_salary_null,
       MIN(effective_from) AS en_eski_hire, MAX(effective_from) AS en_yeni_hire
FROM employee_salaries
WHERE created_at >= now() - interval '15 minutes';
-- Beklenen: new_rows=31, net_salary_null=2 (ali canerkenekli + sahin berker)

-- [V5] Termination kayıt sayısı (Phase 5)
SELECT 'terminations' AS chk, COUNT(*) AS new_rows, MAX(termination_date) AS son_tarih
FROM employee_terminations WHERE created_at >= now() - interval '15 minutes';
-- Beklenen: new_rows=1, son_tarih='2026-02-19'

-- [V6] Sema rol değişimi explicit doğrulama (UP-3)
SELECT id, username, first_name, last_name, role, updated_at
FROM users WHERE id = 'hq-ilker-recete-gm';
-- Beklenen: role='gida_muhendisi', updated_at güncel

-- [V7] Korunan istisnalar (hâlâ aktif olmalı, sadece UPDATE'lenenler değişti)
-- REV4 fix (B5): atiyekar0706 listeden çıkarıldı (username, id değil),
--   onun yerine OR username='atiyekar0706' eklendi.
SELECT id, username, first_name, last_name, role, is_active, deleted_at
FROM users WHERE id IN (
  '9379801c-b971-40ed-8928-b40affbdf60e',  -- Işıklar kiosk
  '858d7987-e62e-47b9-bd9e-6c04083db8e9',  -- yatirimci5
  'ee76fb82-2a78-4ae6-9792-0f483fa15636',  -- mudur5/Erdem
  '0338cc48-dfbd-4e43-b512-12e7eb92c8c4',  -- Lara kiosk
  '629b81fd-6ac7-4a45-8480-6e6ce3cd53b6',  -- laramudur/Andre
  'a5cb16ee-d017-4ebc-bc80-b5a215cf3550',  -- Fabrika kiosk
  'hq-eren-fabrika',                       -- UP-1: last_name='Elmas'
  'hq-umit-sef',                           -- korunuyor
  'hq-ilker-recete-gm'                     -- UP-3: role='gida_muhendisi'
) OR username = 'atiyekar0706'             -- UP-2: özlük güncelleme (UUID id)
ORDER BY id;
-- Beklenen: 10 satır, hepsi is_active=true, deleted_at=NULL
-- (REV2 9 satır → B4, REV3 9 satır → B5, REV4 10 satır olmalı)

-- [V8] Atiye Kar (UP-2) explicit verification — REV3'te eklendi (B4 fix doğrulaması)
SELECT username, first_name, last_name, role, branch_id,
       birth_date, hire_date, department, bonus_base, net_salary, updated_at
FROM users WHERE username='atiyekar0706';
-- Beklenen: 1 satır
--   role='supervisor' (değişmedi, korundu)
--   branch_id=24 (Fabrika)
--   birth_date='1970-02-01', hire_date='2017-02-24'
--   department='İMALATHANE'  (önceki: empty)
--   bonus_base=42000.00      (önceki: 0)
--   net_salary=50000.00      (önceki: 4900000 — R5 ONAYLANDI: Excel doğru, eski değer hatalı format)
--   updated_at = transaction zamanı

-- ════════════════════════════════════════════════════════════
-- COMMIT vs ROLLBACK — DRY-RUN modu (REV4)
-- ════════════════════════════════════════════════════════════
-- Bu dosya DRY-RUN olduğu için sonda ROLLBACK var.
-- Owner gerçek run için aşağıdaki ROLLBACK'i COMMIT yapar.
--
-- ÖNCESİNDE 4 ZORUNLU ADIM:
--   1) pg_dump backup ALINMALI:
--      pg_dump $DATABASE_URL > /tmp/backup_pre_personnel_import_$(date +%F).sql
--   2) :BCRYPT_0000 → bcryptjs.hashSync('0000',10) çıktısı ile değiştirilmeli
--   3) :IMPORT_ACTOR_USER_ID → owner/admin user ID ile değiştirilmeli
--      (Phase 4b created_by_id NOT NULL constraint için zorunlu)
--   4) Phase 0 ve Phase 6 sayı çıktıları beklentiyle karşılaştırılmalı:
--      Phase 0 toplam=46  →  Phase 6 V1 toplam=82, V2=35 aktif yeni,
--      V3=Buğra terminate, V4=31 salary, V5=1 termination,
--      V6 Sema role='gida_muhendisi', V7 10 korunan satır
--
-- PHASE 4b NOTU (REV2): "Opsiyonel" değildir — schema uyumlu hale getirildi
-- ve Phase 4'le birlikte çalıştırılır. Eğer atlanmak istenirse [SAL-01]
-- ile [SAL-31] arası tüm INSERT'ler manuel olarak yorum satırı yapılmalı.
--
-- ROLLBACK NOTU: BEGIN içinde herhangi bir UPDATE/INSERT hata verirse
-- transaction otomatik abort eder, hiçbir değişiklik kalıcı olmaz.
-- Bu nedenle :BCRYPT_0000 ve :IMPORT_ACTOR_USER_ID replace edilmezse
-- psql parse error verir ve transaction güvenli şekilde geri alınır.
--
COMMIT;  -- GERÇEK IMPORT (REV4 onaylı)

-- ============================================================
-- DOSYA SONU — Phase 1 SQL Preview REV4
-- 36 SD + 3 UPDATE + 36 INSERT users + 31 INSERT salary + 1 TERMINATE
-- Placeholder'lar: :BCRYPT_0000 (35 yerde) + :IMPORT_ACTOR_USER_ID (31 yerde)
-- ============================================================