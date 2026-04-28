# PHASE 1 SQL PREVIEW — RİSK İNCELEMESİ

**Tarih:** 28 Nisan 2026
**REV1 incelenen dosya:** `docs/audit/personnel-import-phase1-preview.sql` (1143 satır) — 🔴 BLOCKED
**REV2 düzeltilmiş dosya:** `docs/audit/personnel-import-phase1-preview-rev2.sql` (1248 satır) — 🟡 RISKY (owner doğrulamaları + run prosedürü)
**İnceleme modu:** READ-ONLY (DB'ye hiçbir şey çalıştırılmadı)

---

## 🚦 KARAR — REV2 SONRASI: **RISKY** (BLOCKED → açıldı)

| Boyut | REV1 | REV2 |
|---|---|---|
| Dosya state | ✅ Güvenli (ROLLBACK) | ✅ Güvenli (ROLLBACK) |
| Schema uyumu | ❌ 3 BLOCKING bug | ✅ B1, B2, B3 fix uygulandı |
| Çalıştırma kararı | ❌ BLOCKED | 🟡 RISKY (owner doğrulama + run prosedürü) |

**REV2 ile blocking yokoldu**, ancak hala 8 non-blocking risk var (R5/R6 owner doğrulaması + R3/R8/R9/R10 prosedür notları). Owner pg_dump + bcrypt + IMPORT_ACTOR_USER_ID belirleme adımlarını tamamladıktan sonra COMMIT'e geçebilir.

---

## ✅ REV2'DE KAPATILAN BLOCKING'LER

| Kod | Eski hata | REV2 fix | Durum |
|---|---|---|---|
| **B1** | `employee_salaries.id` SERIAL'a `gen_random_uuid()::text` döküyordu | INSERT kolon listesinden `id` çıkarıldı, SELECT'ten `gen_random_uuid()::text,` silindi → DB nextval kullanıyor | ✅ KAPALI |
| **B2** | `employee_salaries.created_by_id` NOT NULL ama kolon eksikti | `created_by_id` kolonu eklendi, `:IMPORT_ACTOR_USER_ID` placeholder'ı SELECT clause'a eklendi (31 yerde) | ✅ KAPALI |
| **B3** | `employee_terminations.id` SERIAL'a `gen_random_uuid()::text` döküyordu | Phase 5.2 INSERT kolon listesinden `id` çıkarıldı, SELECT'ten UUID silindi → DB nextval | ✅ KAPALI |

## ✅ REV2'DE KAPATILAN NON-BLOCKING'LER

| Kod | Eski sorun | REV2 fix | Durum |
|---|---|---|---|
| **R1** | Sayım yorumları yanlış (35→36, 27→31, 81→82) | Header + Phase 4/4b/6 başlıkları gerçek değerlerle güncellendi | ✅ KAPALI |
| **R4** | Sema rol değişimi için verification SELECT yoktu | Phase 6'ya `[V6]` eklendi: `SELECT role FROM users WHERE id='hq-ilker-recete-gm'` | ✅ KAPALI |
| **R7** | `'full_time'` kullanıyordu, DB default `'fulltime'` (alt çizgisiz) | 67 yerde `'full_time'` → `'fulltime'` (36 users INSERT + 31 salary INSERT) | ✅ KAPALI |
| **R10** | Phase 4b "opsiyonel" notu yanıltıcıydı | Başlık: "31 INSERT — ŞEMA UYUMLU, ÇALIŞTIRILACAK"; sonda atlama prosedürü açıkça yazıldı | ✅ KAPALI |
| Buğra | INSERT_THEN_TERMINATE verification belirsizdi | Phase 6'da `[V2]` aktif yeni (Buğra hariç) ve `[V3]` Buğra explicit JOIN ile ayrıldı | ✅ KAPALI |

---

## 🟡 REV2 SONRASI KALAN RİSKLER (8 madde)

### Owner Doğrulama Gerektirenler
- **R5** Eren/Atiye maaş rakamları (Eren `bonus_base=46000, net=60000, transport=6000` / Atiye `bonus_base=42000, net=50000`) Excel ile birebir karşılaştırılmalı
- **R6** `department='OFİS' / 'İMALATHANE'` string'leri Excel'den mi yoksa varsayım mı?
- 36 INSERT username'lerinin gerçek olduğu, test/placeholder olmadığı sözel onay

### Prosedür/Operasyonel Notlar
- **R3** Verification zaman penceresi `15 minutes` (REV2'de 5'ten 15'e çıkarıldı). Owner adım adım çalıştırırsa pencere yetebilir, ama tüm transaction tek seferde 15 dakikadan uzun sürerse `[V2]` ve `[V4]` bazı kayıtları kaçırabilir. Çözüm: BCRYPT replace edildikten sonra dosyayı **tek psql çağrısında** çalıştırmak
- **R8** `employee_benefits` tablosuna yan haklar tarihçesi yazılmıyor (kasa tazminatı + yakıt yardımı snapshot yine `users.meal_allowance`/`transport_allowance`'da). İleride yan hak değişimi takibi için Phase 2 ayrı preview gerek
- **R9** İki placeholder'ın replace edilmemesi durumunda psql parse error → transaction güvenli abort. Bu **mekanizma** ✓, ama owner `psql -v BCRYPT_0000=... -v IMPORT_ACTOR_USER_ID=...` syntax'ını bilmeli (REV2 header'da örnek var)
- **IMPORT_ACTOR_USER_ID seçimi** Owner hangi user ID'yi kullanacak? Önerilen: HQ rolünde aktif bir owner/RGM/CGO. `'hq-ilker-recete-gm'` kullanılabilir (Sema'nın güncellendiği user) ama kafa karışıklığı yaratabilir. Daha temiz seçenek: dedicated bir admin user veya Aslan RGM ID'si
- **Phase 5 sıralaması** Buğra önce Phase 4'te INSERT, sonra Phase 5.1'de `is_active=false` + `deleted_at='2026-02-19'`, sonra Phase 5.2'de termination kaydı. Aynı transaction içinde ardışık çalıştığı için `WHERE username='bugrasakiz'` her seferinde Buğra'yı bulur ✓

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

## ✅ REV2 — 20 Madde Sonucu

| # | Kontrol | REV1 | REV2 |
|---|---|---|---|
| 1 | Dosya `ROLLBACK;` ile mi bitiyor? | ✅ | ✅ (line 1242) |
| 2 | `COMMIT` var mı? | ✅ yok | ✅ yok |
| 3 | DELETE / TRUNCATE / DROP / ALTER var mı? | ✅ yok | ✅ yok |
| 4 | Soft-delete dışında riskli UPDATE? | ✅ | ✅ (40 UPDATE, hepsi soft-delete veya whitelisted UP-1/2/3) |
| 5 | Kapsam dışı şubeyi etkileyen branchId? | ✅ | ✅ (sadece 5, 8, 23, 24) |
| 6 | Sadece branch_id 5/8/23/24? | ✅ | ✅ |
| 7 | Kiosk/admin/yatırımcı korunuyor mu? | ✅ | ✅ |
| 8 | Andre/laramudur korunuyor mu? | ✅ | ✅ |
| 9 | hq-eren-fabrika UPDATE'leniyor mu? | ✅ | ✅ |
| 10 | ÜMÜT KOŞAR (umutkosar) fabrika_operator? | ✅ | ✅ |
| 11 | Ümran no-op? | ✅ | ✅ |
| 12 | `:BCRYPT_0000` placeholder sayısı | ✅ 35 INSERT | ✅ 35 INSERT (40 toplam satır) |
| 13 | bcrypt yoksa SQL çalışır mı? | ✅ parse error → abort | ✅ aynı (REV2'de IMPORT_ACTOR_USER_ID için de aynı koruma) |
| 14 | employee_salaries / employee_terminations şema uyumu | ❌ FAIL (B1+B2+B3) | ✅ **PASS** (B1, B2, B3 kapatıldı) |
| 15 | FK riski | ✅ | ✅ |
| 16 | Username çakışma riski | ✅ (DB kontrolü 0) | ✅ |
| 17 | Aynı kişi 2 kez insert? | ✅ | ✅ |
| 18 | Verification SELECT'leri yeterli mi? | 🟡 (R3+R4) | ✅ (V1-V7, Sema explicit, Buğra explicit, zaman penceresi 15 dk) |
| 19 | Rollback notları yeterli mi? | ✅ | ✅ (4 zorunlu adım + 2 placeholder talimatı) |
| 20 | Çalıştırma öncesi onay | (checklist) | (aşağıdaki kısaltılmış checklist) |

**Skor:** 20/20 PASS (REV1'de 17/20 + 1 FAIL + 2 RISKY → REV2'de hepsi PASS)

---

## 📋 REV2 ÇALIŞTIRMA ÖNCESİ KISALTILMIŞ CHECKLIST

### Aşama 1 — Preview düzeltme — ✅ TAMAMLANDI (REV2)
B1, B2, B3, R1, R4, R7, R10 + Buğra verification — hepsi `personnel-import-phase1-preview-rev2.sql`'de uygulandı.

### Aşama 2 — Owner doğrulamaları (zorunlu, ÇALIŞTIRMA ÖNCESİ)
- [ ] **R5** Eren `bonus_base=46000, net=60000, transport=6000` ve Atiye `bonus_base=42000, net=50000` rakamları Excel'le birebir karşılaştırıldı
- [ ] **R6** `department='OFİS'` (Eren), `'İMALATHANE'` (Atiye + fabrika operatörleri) Excel'de geçen kelimeler
- [ ] 36 INSERT username'i (Phase 4 IN-01 ... IN-36) gerçek personel; test/placeholder yok
- [ ] **IMPORT_ACTOR_USER_ID** seçildi: önerilen seçenekler:
  - Aslan RGM (varsa kendi user ID'si)
  - HQ rolünde aktif bir admin/owner
  - `'hq-ilker-recete-gm'` kullanılabilir ama Sema'nın kaydı (UP-3) olduğu için karışıklık yaratabilir

### Aşama 3 — Operasyonel hazırlık (zorunlu)
- [ ] `pg_dump $DATABASE_URL > /tmp/backup_pre_personnel_import_$(date +%F).sql`
- [ ] `pg_restore --list /tmp/backup_pre_personnel_import_*.sql | head` (yedeğin okunabilirliği)
- [ ] `node -e "console.log(require('bcryptjs').hashSync('0000', 10))"` ile bcrypt hash üretildi (örn. `$2b$10$...`)

### Aşama 4 — Run sıra (zorunlu)
1. [ ] **DRY-RUN doğrulama** (ROLLBACK hala duruyor):
   ```bash
   psql "$DATABASE_URL" \
     -v BCRYPT_0000="'\$2b\$10\$gerçek_hash_burada'" \
     -v IMPORT_ACTOR_USER_ID="'seçilen_user_id'" \
     -f docs/audit/personnel-import-phase1-preview-rev2.sql
   ```
2. [ ] Phase 0 çıktısı: 4 şube toplamı = 46 user
3. [ ] Phase 6 çıktısı (V1-V7) beklenenle uyuştu:
   - V1 toplam = 82, aktif = 44, pasif/silinen = 37
   - V2 = 35 satır (35 yeni aktif)
   - V3 = 1 satır (Buğra terminate)
   - V4 = 31 salary (2'sinin net_salary NULL)
   - V5 = 1 termination, son_tarih=2026-02-19
   - V6 = Sema role='gida_muhendisi'
   - V7 = 10 korunan satır (hepsi is_active=true)
4. [ ] Eğer sayım uyumsuzsa **DURDUR**, farkı analiz et
5. [ ] **COMMIT switch**: REV2 dosyasının kopyasında sondaki `ROLLBACK;` → `COMMIT;` değiştir
6. [ ] Aynı psql komutuyla COMMIT'li dosyayı çalıştır
7. [ ] Verification SELECT'leri (V1-V7) tek tek transaction dışında tekrar çalıştır

### Aşama 5 — Post-run
- [ ] 36 yeni user'a "şifre 0000, ilk girişte değiştirin" bildirim
- [ ] `audit_logs` toplu özet INSERT (Phase 2 follow-up)
- [ ] Pilot şubeler (Lara, Işıklar, Fabrika) müdürlerine yeni listeyi paylaş
- [ ] Phase 2 preview iste: Lara monthly_payroll + employee_leaves + employee_benefits

### Aşama 6 — Acil ROLLBACK
- [ ] `psql $DATABASE_URL < /tmp/backup_pre_personnel_import_*.sql` (Aşama 3 yedeği)
- [ ] Replit checkpoint sistemi alternatif yedek (24 saat içinde)

---

## 🎯 REV2 ÖZET

| Boyut | Durum |
|---|---|
| **Dosya state** | ✅ Güvenli (ROLLBACK ile bitiyor) |
| **20 kontrol noktası** | 20/20 PASS (REV1'deki FAIL kapatıldı) |
| **Blocking bug** | 0 (B1, B2, B3 fix uygulandı) |
| **Non-blocking risk** | 8 (R3 prosedür, R5/R6 owner doğrulaması, R8 follow-up, R9 mekanizma, IMPORT_ACTOR_USER_ID seçimi, Phase 5 sıralama, 36 username gerçeklik) |
| **Gerçek run kararı** | 🟡 **RISKY** — owner Aşama 2-3 tamamladıktan sonra COMMIT edilebilir |
| **Tahmini owner doğrulama süresi** | 15-30 dakika |

**Sonraki adım:** Owner Aşama 2 (maaş + department + username doğrulama + IMPORT_ACTOR_USER_ID seçimi) → Aşama 3 (pg_dump + bcrypt hash) → Aşama 4 (DRY-RUN doğrulama → COMMIT switch).
