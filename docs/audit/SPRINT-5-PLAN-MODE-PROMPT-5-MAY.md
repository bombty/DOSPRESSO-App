# Sprint 5 — Plan Mode Prompt (Replit için)

## TASK-#347: Personel Veri Senkronizasyon (Excel → DB)

### Bağlam
Sprint 5 / Personel Data Sync. Mahmut Bey'in elindeki master Excel
dosyası (`PERSONEL_o_zlu_k_app.xlsx`) **27 personelin tam verisini**
içeriyor:
- İşe giriş tarihleri (kıdem hesabı için kritik)
- Doğum tarihleri
- Hakediş kalemleri (temel maaş + prim + kasa tazminatı + yakıt)
- 2025'ten devreden + 2026 yeni izin hakları

DB şu an **sadece varsayılan değerlerle** dolu (Sprint 1 leave_balances
tüm aktif kullanıcılara 14 gün koymuştu). Mahmut demosunda yanlış
sayılar görmesi pilotun güvenilirliğini sarsar.

### Excel Kapsamı

| Departman | Kişi | Toplam Hakediş | Toplam İzin |
|-----------|------|----------------|-------------|
| İMALATHANE (Fabrika #24) | 10 | ₺423,500 | 72.0 gün |
| OFİS (HQ #23) | 5 | ₺297,500 | 96.0 gün |
| IŞIKLAR (#5) | 11 | ₺459,000 | 87.0 gün |
| **TOPLAM** | **26** | **₺1,180,000** | **255 gün** |

### Pre-flight

```bash
git fetch origin
git pull origin main
git log --oneline -3  # Sprint 5 branch merge edilmiş olmalı
```

### Plan Mode Görev Tanımı

#### 1. Backup
```bash
pg_dump $DATABASE_URL > backup-pre-personel-sync-$(date +%Y%m%d-%H%M).dump
```

#### 2. DRY-RUN — Eşleşme Analizi (zorunlu)

**Migration EXECUTE etmeden önce** isim eşleşmesi doğrulaması:

```sql
-- Excel'deki 26 isim için DB'de eşleşen kayıt sayısını gör
WITH excel_names AS (
  SELECT * FROM (VALUES
    ('ARİFE YILDIRIM', 'İMALATHANE'),
    ('ATİYE KAR', 'İMALATHANE'),
    ('BÜŞRA DOĞMUŞ', 'İMALATHANE'),
    ('DIANA NAYFONOVA', 'OFİS'),
    ('EREN ELMAS', 'OFİS'),
    ('FİLİZ KARALİ', 'İMALATHANE'),
    ('GALİP CAN BORAN', 'İMALATHANE'),
    ('HATİCE KOCABAŞ', 'İMALATHANE'),
    ('LEYLA SÖNMEZ', 'İMALATHANE'),
    ('MAHMUT ALTUNAY', 'OFİS'),
    ('MİHRİCAN VEZİROĞLU', 'İMALATHANE'),
    ('MUSTAFA CAN HORZUM', 'İMALATHANE'),
    ('ŞEVKET SAMET KARA', 'OFİS'),
    ('UTKU DERNEK', 'OFİS'),
    ('ÜMÜT KOŞAR', 'İMALATHANE'),
    ('AHMET HAMİT DOĞAN', 'IŞIKLAR'),
    ('ATEŞ GÜNEY YILMAZ', 'IŞIKLAR'),
    ('BASRİ ŞEN', 'IŞIKLAR'),
    ('CİHAN KOLAKAN', 'IŞIKLAR'),
    ('ECE ÖZ', 'IŞIKLAR'),
    ('EFE KADİR KOCAKAYA', 'IŞIKLAR'),
    ('KEMAL HÜSEYİNOĞLU', 'IŞIKLAR'),
    ('YAVUZ KOLAKAN', 'IŞIKLAR'),
    ('SÜLEYMAN OLGUN', 'IŞIKLAR'),
    ('İSMAİL SİVRİ', 'IŞIKLAR'),
    ('HÜLYA TÜZÜN', 'IŞIKLAR')
  ) AS t(full_name, dept)
)
SELECT 
  e.full_name AS excel_name,
  e.dept AS excel_dept,
  u.id AS db_id,
  u.first_name || ' ' || u.last_name AS db_name,
  u.role,
  u.branch_id,
  u.hire_date AS current_hire_date,
  u.net_salary / 100 AS current_salary_tl
FROM excel_names e
LEFT JOIN users u ON 
  LOWER(u.first_name || ' ' || u.last_name) ILIKE LOWER(e.full_name)
  AND u.deleted_at IS NULL
ORDER BY e.dept, e.full_name;
```

**Beklenen:** 26 satır, hepsinde db_id dolu olmalı.

**Eşleşmeyen varsa:** Aslan'a bildir, manuel ad düzeltmesi gerekebilir.

#### 3. EXECUTE Onayı

DRY-RUN sonucunu Aslan'a göster:
- Kaç eşleşme bulundu? (hedef: 26/26)
- Eşleşmeyenler kim?
- Eşleşmeyenlerin DB'de farklı yazılmış olma ihtimali (örn: "ÜMÜT" vs "Ümit")

Aslan: "GO" → migration çalıştır.

```bash
psql $DATABASE_URL -f migrations/2026-05-05-personel-data-sync.sql
```

#### 4. Smoke Test

```sql
-- A) Güncellenen users (son 5 dakikada)
SELECT 
  COUNT(*) AS updated_count,
  AVG(net_salary)/100 AS avg_salary_tl,
  MIN(hire_date) AS oldest_hire,
  MAX(hire_date) AS newest_hire
FROM users 
WHERE updated_at >= NOW() - INTERVAL '5 minutes' 
  AND net_salary > 0;
-- Beklenen: updated_count = 26, avg_salary ~45,000 TL

-- B) leave_balances 2026 özet
SELECT 
  COUNT(*) AS total_records,
  SUM(annual_entitlement_days) AS total_entitlement,
  SUM(carried_over_days) AS total_carried_over,
  SUM(remaining_days) AS total_remaining,
  MAX(carried_over_days) AS max_carried_over_anyone
FROM leave_balances 
WHERE period_year = 2026
  AND notes LIKE 'Excel master sync%';
-- Beklenen: 
--   total_records ~26
--   max_carried_over_anyone = 56 (Utku DERNEK)
--   total_entitlement ~250+ gün

-- C) Spot kontrol — Mahmut Bey
SELECT 
  first_name, last_name, hire_date, 
  net_salary/100 AS salary_tl,
  bonus_base/100 AS bonus_tl,
  meal_allowance/100 AS kasa_tl
FROM users 
WHERE first_name ILIKE 'mahmut' AND deleted_at IS NULL;
-- Beklenen: Mahmut Altunay, hire_date 2025-11-24, salary 65,000 TL

-- D) Spot kontrol — Utku (en uzun kıdemli)
SELECT 
  u.first_name, u.last_name, u.hire_date,
  lb.annual_entitlement_days, lb.carried_over_days, lb.remaining_days
FROM users u
LEFT JOIN leave_balances lb ON lb.user_id = u.id AND lb.period_year = 2026
WHERE u.first_name ILIKE 'utku' AND u.deleted_at IS NULL;
-- Beklenen: hire 2015-09-08, carried_over 56, entitlement 0 (15+ yıl ama 2026 hak edilen kolonu boş)
```

#### 5. Frontend Smoke Test

Tarayıcıda doğrula:
- `/personel-puantajim` (Mahmut girişi ile) → İzin tab'ında doğru bakiye
- `/muhasebe-centrum` → Bekleyen işlemler değişmemiş, anormallikler doğru

### Success Criteria

- [ ] 26 users kaydı güncellendi (eşleşmeyen varsa rapor)
- [ ] hire_date, birth_date, net_salary, bonus_base, meal_allowance, transport_allowance dolu
- [ ] leave_balances 2026 yılı için Excel verileriyle güncel
- [ ] Utku'nun carried_over_days = 56
- [ ] Mahmut'un hire_date = 2025-11-24, salary = 65,000 TL
- [ ] /personel-puantajim sayfası doğru izin bakiyesi gösteriyor

### Out of Scope

- Lara şubesi puantaj (15 personel) — ayrı sprint (Lara_Sube_Maas Excel)
- Aylık bordro hesaplama — mevcut /api/pdks-payroll/calculate kullanılacak
- payroll_config matrisi (pozisyon bazlı maaş şablonları) — Sprint 6

### Rollback Plan

```sql
BEGIN;
-- leave_balances geri al
UPDATE leave_balances 
SET annual_entitlement_days = 14, 
    carried_over_days = 0,
    notes = 'Rollback to Sprint 1 default'
WHERE notes LIKE 'Excel master sync%';

-- users net_salary geri al (eğer önceki backup varsa)
-- pg_dump backup'tan restore daha güvenli
COMMIT;
```

### Beklenen Süre

- Backup: 2 dk
- DRY-RUN eşleşme analizi: 3 dk
- Aslan onayı + EXECUTE: 5 dk
- Smoke test: 5 dk
- **Toplam: ~15 dakika**

---

**Aslan onayı bekleniyor:**
1. Eşleşmeyen isimler olursa manuel düzeltme yapılsın mı yoksa atlanasın mı?
2. Mahmut demosu öncesi mi yoksa sonrası mı execute edilsin?

Tavsiye: Demo öncesi execute → Mahmut gerçek rakamları görür.
