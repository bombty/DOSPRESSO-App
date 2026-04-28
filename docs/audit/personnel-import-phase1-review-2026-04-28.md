# PHASE 1 SQL PREVIEW — RİSK İNCELEMESİ

**Tarih:** 28 Nisan 2026
**İncelenen dosya:** `docs/audit/personnel-import-phase1-preview.sql` (1143 satır)
**İnceleme modu:** READ-ONLY (DB'ye hiçbir şey çalıştırılmadı, dosya da değiştirilmedi)
**Kontrol edilen 20 madde:** aşağıdaki tabloda

---

## 🚦 KARAR: **BLOCKED**

**Dosya state olarak:** ✅ Güvenli — `ROLLBACK;` ile bitiyor, yanlışlıkla DB'ye uygulanamaz.
**Gerçek çalıştırma için:** ❌ **3 kritik bug** var, fix edilmeden COMMIT'e geçilemez. Phase 4b'de transaction patlar, tüm Phase 1-5 geri alınır, **0 user eklenmiş olur**.

---

## 🔴 BLOCKING RİSKLER (3 madde)

### B1 — `employee_salaries.id` SERIAL ama preview UUID döküyor → **TYPE MISMATCH**
**Lokasyon:** Phase 4b satır ~745-1060, 31 INSERT statement
**DB schema:** `id integer NOT NULL DEFAULT nextval('employee_salaries_id_seq')`
**Preview yazımı:** `gen_random_uuid()::text, ...` (text → integer fail)
**PostgreSQL hatası:**
```
ERROR: invalid input syntax for type integer: "8d8a7b9c-1234-..."
```
**Sonuç:** İlk salary INSERT'te transaction abort → BEGIN içindeki TÜM iş geri alınır → users INSERT'leri de gider.

**Çözüm:** Phase 4b INSERT'lerinde `id` kolonunu listeden çıkar, default `nextval` kullansın:
```sql
INSERT INTO employee_salaries (
  user_id, base_salary, net_salary, employment_type, effective_from,
  is_active, created_by_id, notes, created_at, updated_at
) SELECT
  id, 29500.00, 33500.00, 'full_time', '2025-05-23', true,
  :OWNER_USER_ID, 'Phase 1 Excel import', now(), now()
FROM users WHERE username='arifeyildirim';
```

### B2 — `employee_salaries.created_by_id` NOT NULL ama preview'da **kolon eksik**
**DB schema:** `created_by_id` NOT NULL (default yok)
**Preview yazımı:** Kolon listesinde geçmiyor
**PostgreSQL hatası:**
```
ERROR: null value in column "created_by_id" violates not-null constraint
```
**Sonuç:** B1 ile aynı — transaction abort + ROLLBACK.

**Çözüm:** `created_by_id` kolonunu ekle, owner'ın gerçek user ID'sini ata. Phase 4b'nin başında bir prelude:
```sql
-- Owner ID (RGM/admin) — owner gerçek run önce bu :OWNER_USER_ID değişkenini set etmeli
\set OWNER_USER_ID 'hq-ilker-recete-gm'
```

### B3 — `employee_terminations.id` SERIAL ama preview UUID döküyor → **TYPE MISMATCH**
**Lokasyon:** Phase 5.2 (Buğra Sakız termination)
**DB schema:** `id integer NOT NULL DEFAULT nextval('employee_terminations_id_seq')`
**Preview yazımı:** `gen_random_uuid()::text, id, '2026-02-19', ...`
**PostgreSQL hatası:** B1 ile aynı tip uyuşmazlığı.

**Çözüm:** `id` kolonunu listeden çıkar:
```sql
INSERT INTO employee_terminations (
  user_id, termination_date, termination_reason, termination_type,
  last_work_day, notes, created_at, updated_at
) SELECT
  id, '2026-02-19', 'Excel kaynak: ...', 'voluntary',
  '2026-02-19', 'Phase 1 Excel import', now(), now()
FROM users WHERE username='bugrasakiz';
```

> **Not:** B1+B2+B3 fix'leri kritik. Yapılmadan transaction COMMIT edilirse → Phase 4b/5 fail → tüm phase rollback → user değişikliği YOK. Pg_dump backup zarar görmez (DB değişmez), ama owner için sürpriz ve zaman kaybı.

---

## 🟡 RISKY (NON-BLOCKING) NOTLAR (10 madde)

### R1 — Comment-data sayım mismatch
- Phase 4 başlığı: "INSERT (35 yeni user)" → gerçek sayım: **36 INSERT**
- Phase 4b "27" demiş → gerçek: **31 INSERT**
- Phase 6 verification beklenen: "46 + 35 = 81" → doğru hesap: **46 + 36 = 82**
- Owner SQL okurken comment'e güvenmemeli; gerçek sayımları kullansın.

### R2 — Phase 5 Buğra Sakız sıralaması
INSERT_THEN_TERMINATE: Buğra önce Phase 4'te INSERT olur (line 690), sonra Phase 5'te terminate edilir. Aynı transaction içinde sırayla çalıştığı için **mantıken doğru**, ama Phase 6 verification "5 dakika içinde eklenenler" SELECT'i Buğra'yı yine yakalar — owner şaşırabilir ("ayrılan biri neden listede?"). Yardımcı not eklenebilir.

### R3 — Verification SELECT'i `created_at >= now() - interval '5 minutes'` zaman penceresine bağlı
Eğer owner SQL'i adım adım çalıştırırsa veya 5+ dakikada bitirirse, pencere bazı yeni kayıtları kaçırabilir. Daha sağlam alternatif: transaction sırasında geçici tabloya `RETURNING id` ile yazılan ID'leri tutmak veya `notes LIKE 'Phase 1 Excel import%'` filtresi.

### R4 — Sema rol değişimi (UP-3) verification eksik
Phase 6'da Sema'nın `role='gida_muhendisi'` olduğu doğrulanmıyor. Korunan istisnalar SELECT'i `role` kolonunu içeriyor ama sonucu kontrol etme yöntemi sözel — explicit SELECT eklenmeli:
```sql
SELECT id, role FROM users WHERE id='hq-ilker-recete-gm';
-- Beklenen: 'gida_muhendisi'
```

### R5 — Eren/Atiye maaş rakamları sözel kontrol gerekli
- UPDATE-1 Eren: `bonus_base=46000, net_salary=60000, transport_allowance=6000`
- UPDATE-2 Atiye: `bonus_base=42000, net_salary=50000`
Bu rakamlar Excel'den mi çıktı, varsayım mı? Owner final tabloyu **kelimesi kelimesine** Excel ile karşılaştırmalı.

### R6 — `department='OFİS' / 'İMALATHANE'` Excel'den mi varsayım mı?
DB'de bu kolon serbest text. Eğer ileride department-based filtre/raporlama varsa string tutarlılığı önemli. Owner doğrulamalı.

### R7 — `employment_type='full_time'` enum kabul ediliyor mu?
DB schema: `employment_type` varchar (enum check yok), default `'fulltime'`. Preview `'full_time'` (alt çizgili) kullanıyor — DB default'tan **farklı**. Tutarlılık için `'fulltime'` yapmak veya enum-check varsa doğrulamak gerek.

### R8 — `meal_allowance` ve `transport_allowance` snapshot vs history
Phase 4'te `users.meal_allowance` / `transport_allowance` snapshot olarak set ediliyor; ama Phase 4b'de `employee_salaries`'a yazılan tarihçede `meal_allowance` / `transport_allowance` **yok**. İleride yan hak değişikliği takibi için ayrı `employee_benefits` history gerekecek (zaten Phase 2 follow-up'ta planlandı).

### R9 — `:BCRYPT_0000` placeholder güvenlik mekanizması
35 INSERT'te placeholder var. Replace edilmeden çalıştırılırsa PostgreSQL `:BCRYPT_0000` parametresini bulamaz → syntax/parse hatası → transaction abort. **Bu aslında bir güvenlik mekanizması** ✓ — ama owner placeholder'ları replace ettikten sonra `psql -v BCRYPT_0000=...` veya `\set` ile geçirmek **bilmesi gereken bir adım**. Talimat preview üst notunda var ama owner gözden kaçırabilir.

### R10 — Phase 4b "opsiyonel" notu yanıltıcı
Preview: "Phase 4b (employee_salaries) opsiyonel — atlanabilir". Ancak B1+B2 bug'ları yüzünden Phase 4b çalıştırıldığında transaction patlar. Eğer B1+B2 fix edilmeyecekse, Phase 4b satırları **silinmeli/yorumlanmalı**, "opsiyonel" yetmiyor.

---

## ✅ PASS — 20 Madde Sonucu

| # | Kontrol | Sonuç |
|---|---|---|
| 1 | Dosya `ROLLBACK;` ile mi bitiyor? | ✅ PASS (line 1139) |
| 2 | `COMMIT` var mı? | ✅ PASS (yok, sadece `BEGIN` line 37 + `ROLLBACK` line 1139) |
| 3 | DELETE / TRUNCATE / DROP / ALTER var mı? | ✅ PASS (hiçbiri yok) |
| 4 | Soft-delete dışında riskli UPDATE var mı? | ✅ PASS (40 UPDATE: 36 soft-delete + 3 controlled UPDATE + 1 termination soft-delete; hepsi güvenli) |
| 5 | Kapsam dışı şubeyi etkileyen branchId var mı? | ✅ PASS (sadece 5, 8, 23, 24) |
| 6 | Sadece branch_id 5/8/23/24 etkileniyor mu? | ✅ PASS (Phase 0/6 SELECT'leri ve INSERT'lerin tümü kapsam içi) |
| 7 | Kiosk/admin/yatırımcı korunuyor mu? | ✅ PASS (3 kiosk + yatirimci5 soft-delete listesinde **yok**) |
| 8 | Andre/laramudur korunuyor mu? | ✅ PASS (`629b81fd-...` soft-delete listesinde yok, korunan listesinde var) |
| 9 | hq-eren-fabrika korunup Eren Elmas olarak güncelleniyor mu? | ✅ PASS (UP-1: `last_name='Elmas'` line 152) |
| 10 | ÜMÜT KOŞAR fabrika_operator olarak yeni kişi mi? | ✅ PASS (`umutkosar`, branch=24, role=`fabrika_operator` line 370) |
| 11 | Ümran no-op/pasif olarak kalıyor mu? | ✅ PASS (preview'da hiç geçmiyor — DB'de zaten pasif, dokunulmuyor) |
| 12 | `:BCRYPT_0000` placeholder kaç yerde? | ✅ PASS (35 gerçek INSERT placeholder + 5 yorum = 40 satır) |
| 13 | bcrypt hash üretilmeden SQL çalışır mı? | ✅ PASS (psql parse error → transaction abort = güvenlik mekanizması) |
| 14 | employee_salaries / employee_terminations doğru kolonlara mı? | ❌ **FAIL** (B1, B2, B3 — yukarıda) |
| 15 | FK riski var mı? | ✅ PASS (sadece soft-delete + INSERT, FK referans bütünlüğü etkilenmez) |
| 16 | Username çakışması riski var mı? | ✅ PASS (DB'de 0 çakışma — 36 yeni username unique) |
| 17 | Aynı kişi iki kez insert olabilir mi? | ✅ PASS (36 farklı username, hepsi unique; UP-1/2/3 zaten korunan kayıtlar) |
| 18 | Verification SELECT'leri yeterli mi? | 🟡 RISKY (R3, R4 — zaman penceresi + Sema rol kontrolü eksik) |
| 19 | Rollback notları yeterli mi? | ✅ PASS (4 maddelik checklist + transaction abort açıklaması var) |
| 20 | Çalıştırma öncesi onay maddeleri | (aşağıda checklist) |

---

## 📋 GERÇEK ÇALIŞTIRMA ÖNCESİ ZORUNLU CHECKLIST

### Aşama 1 — Preview dosyasını düzelt (zorunlu)
- [ ] **B1 fix**: Phase 4b INSERT'lerden `id` kolonunu çıkar, `gen_random_uuid()::text` parametresini sil
- [ ] **B2 fix**: Phase 4b INSERT'lere `created_by_id` kolonu ekle, owner user ID'sini parametrik geçir (`:OWNER_USER_ID`)
- [ ] **B3 fix**: Phase 5.2 employee_terminations INSERT'inden `id` kolonunu çıkar, UUID parametresini sil
- [ ] **R7 fix**: `'full_time'` → `'fulltime'` (DB default ile uyum)
- [ ] **R1 fix**: Phase 4 başlığını "35 yeni user" → "36 yeni user" olarak güncelle, Phase 4b başlığını "27" → "31" olarak güncelle, Phase 6 hesabını "46+35=81" → "46+36=82" yap
- [ ] **R4 fix**: Phase 6'ya `SELECT id, role FROM users WHERE id='hq-ilker-recete-gm';` ekle (Sema rol doğrulaması)

### Aşama 2 — Owner doğrulamaları (zorunlu)
- [ ] Eren/Atiye maaş rakamları (R5) Excel ile birebir karşılaştırıldı
- [ ] department='OFİS' / 'İMALATHANE' string'leri (R6) Excel'den çıktı, varsayım değil
- [ ] 36 INSERT username'lerinin **gerçek** olduğu, test/placeholder olmadığı sözel onay
- [ ] Owner gerçek user ID'si (`:OWNER_USER_ID`) belirlendi (audit log + created_by_id için)

### Aşama 3 — Operasyonel hazırlık (zorunlu)
- [ ] `pg_dump $DATABASE_URL > /tmp/backup_pre_personnel_import_$(date +%F).sql` çalıştırıldı, dosya boyutu kontrol edildi
- [ ] Yedeğin geri yüklenebilir olduğu test edildi (pg_restore --list ile içerik kontrolü)
- [ ] `node -e "console.log(require('bcryptjs').hashSync('0000', 10))"` ile bcrypt hash üretildi
- [ ] Üretilen hash 35 yere `:BCRYPT_0000` yerine konuldu (preview kopyası üzerinde, orijinal preview salt şablon olarak kalsın)
- [ ] DB connection pooler kapalıysa direct connection kullanıldı (uzun transaction için)

### Aşama 4 — Run (zorunlu sıra)
1. [ ] **DRY-RUN doğrulama**: Preview kopyasını (BCRYPT replace edilmiş, ROLLBACK hala duruyor) çalıştır → Phase 0 ve Phase 6 sayım çıktılarını al
2. [ ] **Sayı doğrulama**: Phase 0 (4 birim toplam=46) ve Phase 6 (toplam=82, aktif=45, pasif/silinen=37) beklentilerle uyuştu mu?
3. [ ] Eğer sayım uyumsuzsa **DURDUR** ve farkı analiz et
4. [ ] **COMMIT switch**: Sondaki `ROLLBACK;` → `COMMIT;` değiştir
5. [ ] Çalıştır
6. [ ] Phase 6 verification SELECT'lerini tekrar çalıştır (transaction dışında)
7. [ ] Korunan 10 user'ın `is_active=true` ve `deleted_at IS NULL` (UPDATE'lenenler hariç) olduğunu doğrula
8. [ ] Buğra Sakız `is_active=false` AND `employee_terminations` kaydının var olduğunu doğrula

### Aşama 5 — Post-run (zorunlu)
- [ ] 36 yeni user'a "şifre 0000, ilk girişte değiştirin" bildirim mekanizması (manual/email)
- [ ] `audit_logs` tablosuna toplu özet kayıt INSERT (preview'da yorumlanmış şablon var)
- [ ] Soft-delete edilen 36 user'ın FK bağımlılıklarının (vardiya, payroll, checklist) hala görünür olduğu spot kontrolü
- [ ] Pilot şubeler (Lara, Işıklar, Fabrika) müdürlerine yeni listeyi paylaş
- [ ] Phase 2-5 (monthly_payroll, employee_leaves, employee_benefits, audit_logs) için ayrı preview dosyası iste

### Aşama 6 — Acil ROLLBACK senaryosu
Eğer COMMIT sonrası 30 dakika içinde kritik bir tutarsızlık fark edilirse:
- [ ] `pg_restore` ile Aşama 3'teki yedeği geri yükle
- [ ] Kullanıcıların ara kazanan iş yapıp yapmadığını kontrol et (vardiya açma vs.)
- [ ] Replit'in checkpoint sistemi de yedek olarak kullanılabilir (24 saat içinde)

---

## 🎯 ÖZET

| Boyut | Durum |
|---|---|
| **Dosya state** | ✅ Güvenli (ROLLBACK ile bitiyor, DB'ye yazmaz) |
| **20 kontrol noktası** | 17 PASS, 1 FAIL (madde 14: schema kolon mismatch), 2 RISKY |
| **Blocking bug** | 3 (B1, B2, B3 — hepsi Phase 4b/5 INSERT şema uyumsuzluğu) |
| **Non-blocking risk** | 10 (R1-R10) |
| **Gerçek run kararı** | ❌ **BLOCKED** — preview düzeltilmeden COMMIT edilmemeli |
| **Tahmini fix süresi** | 30-60 dakika (preview regenerate + owner doğrulamaları) |

**Sonraki adım:** Owner B1+B2+B3 fix'lerini onaylar → preview generator script'i (`/tmp/gen_sql.js`) düzeltilir → Phase 1 SQL preview rev2 üretilir → bu rapor güncellenir → Aşama 2-6 checklist'i takip edilir.
