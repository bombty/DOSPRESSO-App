# ✅ DECIDED — Kalıcı Kararlar

> **Bir kez verilen kararlar, tartışılmaz.** Yeni oturum: önce bu dosyayı oku, kararları yeniden açma.

---

## 🏗️ MİMARİ KARARLAR

### D-01: Triangle Workflow (4 Apr 2026)
**Karar:** İş bölümü kesindir.
- **Aslan (CEO):** Business, UX, priority kararları
- **Claude:** Architecture, code, GitHub push, kod yazma
- **Replit Agent:** DB migration, build, hotfix, smoke test

**Neden:** Karışıklığı önlemek, sorumluluk net olsun.

---

### D-02: Monorepo Tek Repo (Mart 2026)
**Karar:** `bombty/DOSPRESSO-App` tek repo, monorepo değil.  
**Yapı:** client/ + server/ + shared/ + migrations/ + docs/  
**Neden:** Replit hızlı build için tek workspace.

---

### D-03: Drizzle ORM + PostgreSQL Neon (Mart 2026)
**Karar:** Drizzle ORM, type-safe schema. Neon serverless.  
**Neden:** TypeScript inference, migration yönetimi kolay.  
**Schema dosyaları:** schema-01 → schema-25 (domain bazlı).

---

### D-04: 24 Schema Dosyası (Apr 2026)
**Karar:** Tek monolit yerine domain bazlı 24+ schema.  
**Avantaj:** Modüler, paralel iş, conflict az.  
**Schema-25 (Sprint 8):** scoreParameters + history.

---

## 🔐 GÜVENLİK VE COMPLIANCE

### D-05: Push Token Asla Dosyaya Yazılmaz (10 Apr 2026)
**Token:** Konuşmada paylaşılır (asla dosyaya yazma — bu kural D-05).  
**Komut formatı:** `git push "https://x-access-token:TOKEN@github.com/bombty/DOSPRESSO-App.git" BRANCH`

---

### D-06: Main'e Doğrudan Push Yasak (5 May 2026)
**Karar:** Tüm değişiklikler hotfix branch + PR mecburi.  
**Neden:** 5 May gecesi 30 conflict marker push olayı.  
**Aktif:** P-9'dan sonra GitHub Branch Protection ile teknik olarak da uygulanacak.

---

### D-07: 5 Perspektif Review (3 May 2026)
Her major değişiklik için:
1. **Principal Engineer** — kod kalitesi
2. **Franchise F&B Ops** — operasyonel etki
3. **Senior QA** — test edilebilirlik
4. **Product Manager** — UX
5. **Compliance** — İş Kanunu, gıda mevzuat, KDV/AGI, KVKK

---

### D-08: Plan Mode Zorunluluğu (Apr 2026)
**Karar:** DB write, schema, migration, env değişiklik için:
- Mode'u **Plan**'a çevir (Aslan)
- Isolated task agent (Replit Agent)
- pg_dump backup zorunlu
- DRY-RUN + GO mecburi
- PR review

**Build mode'da DB yazma YASAK** (kuralı esnetme).

---

### D-09: Çalışma Sistemi v2.0 — 4 Skill Mecburi (14 Apr 2026)
**Karar:** Her oturum sonu 4 skill dosyası güncellenir:
- `dospresso-architecture`
- `dospresso-debug-guide`
- `dospresso-quality-gate`
- `session-protocol`

---

### D-10: Async Coordination — 3 MD Dosya (Apr 2026)
- `docs/TODAY.md` — bugün ne yapıldı
- `docs/PENDING.md` — bekleyen işler
- `docs/DECIDED.md` — kalıcı kararlar (bu dosya)

---

## 🏢 İŞ MODELİ KARARLARI

### D-11: Pilot 4 Lokasyon (Apr 2026)
- **Işıklar #5** (HQ-owned, Antalya)
- **Antalya Lara #8** (franchise temsil)
- **Merkez Ofis #23** (HQ)
- **Fabrika #24** (üretim)

**Strateji:** Hibrit C — Mahmut HQ koordinasyon, Coach saha gözetim.  
**Tarih:** 12 May 2026 Pazartesi 09:00.

---

### D-12: Muhasebe Scope Sabit (Apr 2026)
**Karar:** Muhasebe modülü = HQ + Fabrika + Işıklar **SADECE**.  
**Neden:** Diğer şubeler franchise muhasebe ayrı yürütüyor.

---

### D-13: Data Flow Tek Yönlü (Apr 2026)
**Karar:** Branch → HQ. ASLA tersi.  
**Neden:** Veri tutarlılığı, audit, complians.

---

### D-14: Fabrika ↔ Branch Tam İzole (Apr 2026)
**Karar:** Cross-access yok.  
- `product_recipes` (branch) ≠ `factory_recipes` (factory)
- Branch ve factory personeli birbirini görmez
- Stok ayrı

---

### D-15: Mr. Dobody — Pattern-Based (Mart 2026)
**Karar:** Individual alert DEĞİL.  
**Yapı:** Pattern-based notifications + autonomous actions with approval mechanism.

---

### D-16: Admin Tam Erişim (Mart 2026)
**Karar:** Admin role her zaman tam erişim. Filtre uygulanmaz.

---

### D-17: HQ Kiosk PIN Plaintext (DECISIONS#14, Mart 2026)
**Karar:** Pilot süresince plaintext kalır (HQ hesabı az, düşük risk).  
**Pilot SONRASI (B1):** Hash + secure storage.

---

## 🎯 PILOT-SPESIFIK KARARLAR

### D-18: Sprint 8 EXECUTE — Seçenek (a) GO (5 May 2026)
**Karar:** Pilot şubelerdeki 11 ekstra kişi aktif kalır.  
**Neden:** Veri kaybetmek yerine fazlalık tut. Mahmut sonra inceler.

---

### D-19: monthly_payroll Pilot Süresince Aktif (5 May 2026)
**Karar:** schema-12 monthlyPayroll kullanılır (51 aktif kayıt).  
**schema-07 monthlyPayrolls boş kalır** (deprecated-candidate).  
**Pilot SONRASI:** `docs/DECISIONS-MONTHLY-PAYROLL.md` Seçenek A.

---

### D-20: Feature Freeze (18 Apr - 15 Haz 2026)
**Karar:** Pilot stabilize olana kadar yeni feature yok.  
**İstisna:** Kritik bug fix, pilot bloker.  
**Yeni feature talebi → "Sprint 17+ pilot sonrası"** yanıtı.

---

### D-21: payroll_parameters 2026 Tahmin Değerleri (5 May 2026)
**Karar:** Migration tahmini değerler kullanır:
- Asgari ücret 33.030 TL brüt / 28.075,50 TL net
- SGK %14 işçi / %20.5 işveren
- 5 vergi dilimi (%15 → %40)

**Mahmut'un sorumluluğu:** Resmi Gazete + GİB ile DOĞRULAMA.

---

## 📐 SCHEMA / VERİ KARARLARI

### D-22: Bordro Tablo Kanonik Karar (5 May 2026)
**Detay:** `docs/DECISIONS-MONTHLY-PAYROLL.md`  
**Pilot süresince:** monthlyPayroll (schema-12) aktif tablo.  
**Pilot sonrası:** Seçenek A — monthlyPayrolls'a migrate, monthlyPayroll DROP.

---

### D-23: Skor Sistemi 5 Kategori 90 Puan (Sprint 8, 5 May 2026)
**Karar:** Default skor parametreleri:
- Devam (PDKS): max 20
- Checklist: max 20
- Görev: max 15
- Müşteri: max 15
- Yönetici: max 20
- **Toplam:** 90 puan

**Admin/CEO** kriter ekleyebilir/değiştirebilir.

---

### D-24: 35 Gerçek Personel (5 May 2026)
**Karar:** Aslan'ın gönderdiği 2 Excel'den:
- PERSONEL_o_zlu_k_app.xlsx (26 kişi)
- Lara_Sube_Maas_2026_replit.xlsx (9 kişi Lara)

**Toplam 35.** Migration ADIM 3'te UPSERT.

---

## 🚦 GIT VE WORKFLOW KARARLARI

### D-25: Git Safety 5 Katman (5 May 2026)
**Skill:** `dospresso-git-safety` (4 May)
- L1: Build session başı `git fetch && git status -sb`
- L2: Plan mode task agent `touched_paths`
- L3: Commit öncesi sync check
- L4: Conflict çıkarsa Replit Resolve UI (CLI değil)
- L5: Push öncesi `git log @{u}..HEAD`

**YASAK:** force push, `--theirs .` toptan, `reset --hard`, filter-branch.

---

### D-26: Mode Geçiş Kuralı (Apr 2026)
**Build mode:** kod yazma, edit, doc, lint  
**Plan mode:** DB write, schema, migration, env

---

### D-27: Triangle Conflict Çözümü (5 May 2026)
**Karar:** Replit + Claude aynı dosyayı düzenlerse:
- Conflict çıkarsa **GitHub UI** (görsel, hata az)
- CLI `git checkout --theirs` SADECE iki taraf bilinçli emrederse
- main'de doğrudan kod editi YASAK

---

## 🧠 BİLGİ YÖNETİMİ KARARLARI

### D-28: Memory Edits 30 Madde Limit (Mart 2026)
**Karar:** memory_user_edits max 30 satır, 100k char.  
**Format:** Concise. Verbatim komut yok.

---

### D-29: Skill Files Mandatory at Session End (14 Apr 2026)
4 skill dosyası her oturum sonu güncellenir.  
Aksi: yarın Claude eksik bilgiyle çalışır.

---

### D-30: Devir-Teslim Tek Dosya Hafıza (Apr 2026)
**Format:** `docs/DEVIR-TESLIM-X-NISAN-2026.md` veya `-MAYIS-`  
**İçerik:** Yeni oturum sıfırdan başlasa devam edebilecek seviyede.

---

### D-31: Skor Parametreleri Admin Tarafından Düzenlenebilir (Sprint 8 - 5 May 2026)
**Karar:** Performans skor kriterleri sabit hardcoded değil, DB tablosundan okunur.  
**Tablo:** `score_parameters` (schema-25, 5 default kriter, totalMaxPoints=90)  
**Yetki:** sadece admin + ceo düzenleyebilir (`/admin/skor-parametreleri`)  
**Audit:** her değişiklik `score_parameters_history` tablosuna kayıt edilir.  
**API:** GET/POST/PUT/DELETE `/api/score-parameters`

---

### D-32: Performans 5 Kategori = 90 Puan (Sprint 8/10 - 5 May 2026)
**5 Kategori:**
- **Devam** (max 20): PDKS uyum oranı (planlanan vs kayıtlı)
- **Checklist** (max 20): Tamamlanan / Toplam atanan
- **Görev** (max 15): Zamanında tamamlanan / Toplam atanan
- **Müşteri** (max 15): Şube ortalama müşteri puanı (5 üzerinden)
- **Yönetici** (max 20): Manager rating (manuel, monthlyEmployeePerformance.managerRatingScore)

**Hesaplama:** `server/services/performance-calculator.ts`  
**Endpoint:** GET `/api/performance/personnel?branchId=&role=&year=&month=`  
**UI:** `/performans-yonetim` (HQ + manager/supervisor için filtreli)

---

### D-33: Bordro Merkezi Hub - 3 Kart (Sprint 11 - 5 May 2026)
**Karar:** 3 farklı bordro sayfası karışıktı, tek hub yapıldı.  
**Sayfa:** `/bordro-merkezi`  
**Kartlar:**
1. Kişisel Bordrom (HERKES) → `/bordrom`
2. Toplu Hesaplama (HQ Muhasebe) → `/maas`
3. Şube Özeti (HQ + Şube Yönetici) → `/sube-bordro-ozet`

Mevcut sayfalar bozulmadan kaldı (link ile yönlendirme).

---

### D-34: İK Merkezi Hub - 4 Kategori Role Bazlı (Sprint 13 - 5 May 2026)
**Karar:** 12+ İK giriş noktası karışıktı, tek hub yapıldı.  
**Sayfa:** `/ik-merkezi`  
**Kategoriler:**
1. **Kişisel:** Bordrom, Performansım, İzin, Mesai
2. **Yönetici:** Personel Puanla, Şube Bordrosu, Vardiya
3. **HQ:** Performans Yönetim, İK Raporları, Personel, Onboarding
4. **Admin:** Toplu Bordro, Skor Parametreleri

Bekleyen işler banner (izin/mesai talepleri).

---

### D-35: monthly_payroll vs monthly_payrolls - Pilot Sonrası Karar (Sprint 16 - 5 May 2026)
**Sorun:** İki tablo aynı domain (bordro), kafa karıştırıyor.  
**Pilot Süresince (12 May - 15 Haz):** Hiçbir tablo değişmez.  
**Aktif Tablo:** `monthly_payroll` (schema-12) — 51 kayıt korunur.  
**Pilot Sonrası:** Seçenek A (önerim) — `monthly_payrolls` (schema-07) ana yap, 51 kayıt taşı, eski tablo Q3'te DROP.  
**Detay:** `docs/DECISIONS-MONTHLY-PAYROLL.md`

---

### D-36: payroll_parameters 2026 Seed Migration (Sprint 16 - 5 May 2026)
**Karar:** Bordro 0 dönmemesi için payroll_parameters tablosu seed edildi.  
**Migration:** `migrations/2026-05-05-payroll-parameters-2026-seed.sql`  
**Seed Değerleri (TAHMİN — Mahmut doğrulayacak):**
- Asgari ücret brüt 33.030 TL / net 28.075,50 TL
- SGK işçi %14, işveren %20.5
- 5 vergi dilimi (%15 → %40)
- Yemek vergi muafiyeti 300 TL/gün
- Mesai çarpanı 1.5x

⚠️ **Mahmut sorumlu:** Resmi Gazete + GİB yayınlarına göre UPDATE atacak.

---

### D-37: Scheduler Bildirim 24h Dedup (Sprint 16 - 5 May 2026)
**Karar:** Aynı task için max 1 bildirim/24h. Önceki davranış: kullanıcı bildirimi okudukça yeni bildirim oluşturuluyordu (1 task → 751 bildirim/24h spam).  
**Fix:** `server/reminders.ts upsertOverdueNotification`  
**Yeni Mantık:** 24 saat içinde aynı task+user için bildirim varsa SESSİZ SKİP (UPDATE bile yok).  
**Etki:** Notification tablo büyümesi yavaşlar, kullanıcı UX iyileşir.  
**Referans:** debug-guide §19

---

### D-38: Hotfix Branch + PR Mecburi (5 May 2026 incident sonrası)
**Sorun:** 5 May gecesi git pull conflict çıktı, marker'lı dosyalar `git add -A && git commit && git push` ile direkt main'e push'landı (30 marker). Esbuild parse hatası → beyaz ekran.  
**Karar:** Bundan sonra **hiçbir conflict çözümü doğrudan main'e gitmez.**  
**Süreç:**
1. `git checkout -b hotfix/<kebab-case>`
2. Conflict resolve (Replit Resolve UI VEYA `git checkout <hash> -- <files>`)
3. `grep -c '<<<<<<<' <files>` → hepsi 0 doğrula
4. Commit + push hotfix branch
5. PR aç + Squash merge

**Skill Güncellemesi:** `dospresso-git-safety` L4 yeni kural eklendi.  
**Quality Gate:** QG-28 (marker count) + QG-29 (token kontrol) eklendi.

---

## 📊 İSTATİSTİK (5 May 2026 sonu itibarıyla — Sprint 16 + Hotfix sonrası)

- **Toplam tablo:** 478+
- **Toplam endpoint:** 1.985+ (Sprint 8-16: +22 yeni endpoint)
- **Toplam sayfa:** 336+ (Sprint 8-16: +12 yeni sayfa)
- **Aktif rol:** 23 (8 phantom)
- **Bilinen bug:** 33 (debug-guide §1-§33, hotfix §32 + payroll §33 eklendi)
- **Schema dosyası:** 25 (schema-01 → schema-25-score-parameters)
- **Migration:** 16 (en yenisi 2026-05-05-payroll-parameters-2026-seed.sql)
- **Quality Gate:** 29 madde (QG-28 marker, QG-29 token eklendi)

---

### D-39: 6. Perspektif — End User (Persona-Specific) (6 May 2026)
**Karar:** D-07'deki 5 perspektif review **6'ya çıkarıldı**. Yeni 6. perspektif:

6. **End User (Persona-Specific)** — Sistemi gerçekten kullanacak kişinin gözünden:
   - Hangi cihazda? (Mahmut bilgisayar, Berkan telefon)
   - Hangi bağlam? (Mahmut ay sonu, Berkan mola arası)
   - Hangi durum? (yeni öğreniyor mu, günlük rutin mi)
   - Şu an Excel/WhatsApp/kağıt kullanan birine geçiş kolaylaştı mı?

**Personas (DOSPRESSO):** Aslan (CEO), Mahmut (muhasebe), Berkan (Lara barista), Andre (Lara mudur), Yavuz (coach 19 şube), Eren (fabrika mudur), Sema (recete_gm).

**Neden:** Mevcut 5 perspektif "uzman gözü" (kod/ops/QA/UX teorisi/hukuk). Eksik olan: **gerçek kullanıcının yaşadığı an**. Product Manager perspektifinden FARKLI — PM "tasarım stratejisi", End User "fiili deneyim".

**Uygulama:** Her major commit/karar için 6 perspektif tablosu zorunlu. Schema/API minor değişikliklerinde mental check yeterli.

---

### D-40: Lara Stajyer Excel Sadakati + Sistem Fallback (6 May 2026)
**Karar:** Lara duyurusu rakamları (24.11.2025) sistemde **AYNEN korunur**, asgari ücret kontrolü payroll-engine'de yapılır.

**Detay:**
- Lara duyurusu (24.11.2025): Stajyer 33.000 TL
- 2026 brüt asgari ücret: 33.030 TL (RG 26.12.2025/33119)
- Sorun: Stajyer 33.000 < asgari ücret (4857 SK m.39 ihlali)
- **Çözüm:** position_salaries.totalSalary = 33.000 (Excel sadakati). payroll-engine bordro hesaplarken `MAX(positionSalary, minimum_wage_gross)` uygular. salarySource = 'minimum_wage_fallback' işaretlenir, audit trail tutulur.

**Neden:** Aslan'ın talebi: "stajyer maaşı gönderdiğim Excel ve personel maaşları aynı kalmalı." Lara duyuru güncellenmedikçe veri sadakat korur, hukuki uyum sistemde sağlanır.

---

### D-40 v2: Lara Stajyer NET Maaş + Sistem Net→Brüt Dönüşümü (6 May 2026, 03:00 — REVİZE)
**Karar:** D-40 v1 yanlış premise'e dayanıyordu. **Aslan'ın netleştirmesi (6 May 03:00):** "Burada sana verdiğim maaşların hepsi NET. Personellerin ELİNE GEÇECEK rakamlar. Brüt SEN hesaplarsın güncel yasal duruma göre."

**Detay:**
- DB kolonları: `position_salaries.total_salary`, `users.netSalary`, `users.bonusBase` → **HEPSİ NET**
- Bordro hesabı: payroll-engine NET → BRÜT dönüşümü yapar (yeni `tax-calculator.ts` modülü)
- Asgari ücret kontrolü: **NET cinsinden** (~28.075,50 TL 2026)
- Stajyer 33.000 NET → asgari net'in 4.924,50 TL ÜZERİNDE → **fallback gereksiz**
- Tüm Lara matrisi: zaten asgari net'in üstünde, hiçbir personele fallback uygulanmamalı

**Etki:**
- `payroll-engine.ts` satır 285-303 BUG'lu (net'i brüt'e karşılaştırıyor) → revize edilmeli
- `payroll_parameters` tablosuna `minimum_wage_net` kolonu eklenmeli (28.075,50 × 100)
- Bordro UI'da brüt + tüm kesintiler gösterilmeli (TR mevzuat standardı)
- Sprint 8b migration yorumlarındaki "compliance uyarısı" yanlış alarmdı, temizlenmeli

**Plan dökümanı:** `docs/PAYROLL-NET-BRUT-REVISION-PLAN-2026-05-06.md` (~3 saatlik iş, yarın yapılacak)

**Eski (D-40 v1) silinmedi (audit trail), bu D-40 v2 yeni karar.**

---

### D-41: Hub-First Sidebar (6 May 2026)
**Karar:** İK redesign'da yeni 5 sayfa (`izin-talep`, `mesai-talep`, `takim-takvimi`, `bordro-onay`, `onay-kuyrugu`) **sidebar'a girmez**.

**Sidebar:** Tek "İK & Bordro" linki (`/ik-merkezi`) dominant. Alt sayfalar hub'tan erişilir.

**Neden:** Sistem-raporu (5 May) "akademi rota patlaması" sorununu tespit etti — 50+ akademi linki kullanıcıyı kafasını karıştırıyor. Aynı hatayı İK'da yapmamak için Mahmut-first hub-merkez felsefesi korunur.

**Opsiyonel iyileştirme (Sprint H sonrası):** Sidebar'da "İK & Bordro" yanında dinamik badge (bekleyen aksiyon sayısı). Şu an scope dışı.

---

### D-20 NOTU: Feature Freeze Pause (6 May 2026)
**Aslan kararı:** Feature Freeze (18 Apr - 15 Haz 2026) **pause edildi**. "Birkaç gün içinde her şeyi bitirelim, pilot tarihi ben belirleyeceğim."

Pilot 12 May 2026 ertelendi → tarih TBD.

D-20'nin politikası şu an aktif değil; yeni feature talepleri reddedilmeyecek. Pilot tarihi tekrar set edilince Feature Freeze tekrar aktif olabilir.

---

**Bu dosya değişmez kararları içerir.** Yeni karar eklenirse yeni satır olarak ekle, eski karar silinmez. Audit trail önemli.

**Son güncelleme:** 6 May 2026, 03:15 (D-40 v2 revize: NET maaş netleştirmesi + payroll-engine bug tespit + revizyon planı)
