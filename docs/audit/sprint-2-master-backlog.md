# SPRINT 2 — MASTER BACKLOG

DOCS-ONLY master backlog. Sprint 1 (Pilot Day-1 hazırlığı) tamamlandıktan sonra sıraya alınacak işlerin tek sayfa özet tablosu + her iş için detay.

Son güncelleme: 2 Mayıs 2026  
Durum: **PLAN — Sprint 1 (pilot) bitiminde aktive edilir**  
Kaynak: `docs/SPRINT-LIVE.md` "Açık İşler", `docs/audit/pilot-readiness-current.md` Bölüm 5  
Hazırlayan: Replit Agent (mevcut plan + runbook + DECISIONS derlemesi)

---

## 1. ÖZET TABLO — Tüm Sprint 2 İşleri

| # | İş | Plan Dosyası | DB Write? | Süre | Pilot Etki | Öncelik | Sıra |
|---|---|---|---|---|---|---|---|
| **B1** | HQ kiosk PIN bcrypt + lockout + audit | `docs/plans/hq-kiosk-pin-security.md` ✅ | EVET | ~4.5 saat | Yok (post-pilot) | 🔴 KRİTİK GÜVENLİK | 1 |
| **B2** | shift_attendance check-out kapanışı (3 endpoint) | `docs/plans/shift-attendance-checkout-fix.md` ✅ | KOŞULLU (backfill yapılırsa) | ~3 saat | Yok (audit only) | 🟡 ORTA | 2 |
| **B3** | İzin / rapor / ücretsiz izin bakiye sistemi | `docs/plans/leave-balance-system.md` ✅ | EVET | ~12 saat | Yok (Day-1 manuel) | 🔴 YÜKSEK | 3 |
| **B4** | Ay sonu puantaj simülasyonu | YOK (yazılacak) | HAYIR (READ-ONLY) | ~2 saat | Pilot ay sonu öncesi (~30 May) | 🟡 ORTA | 4 |
| **B5** | Fabrika üretim — S3/S4 genişletme | `docs/plans/factory-production-mvp.md` ✅ (S1+S2) | KOŞULLU | ~6-10 saat | Yok (Day-1 S1+S2 sınırlı) | 🟡 ORTA | 5 |
| **B6** | Reçete + besin + alerjen + etiket sistemi | `docs/runbooks/recipe-label-workflow.md` ✅ (workflow), implementasyon planı YOK | EVET | TBD (~16-24 saat tahmini) | Yok | 🟢 DÜŞÜK | 6 |
| **B7** | Day-5 güvenlik sertleştirme paketi (Task #272) | YOK | HAYIR (kod) | TBD | Yok | 🟡 ORTA | 7 |
| **B8** | Rol Detaylı Rapor PDF (26 Rol) (Task #259) | YOK | HAYIR (rapor) | TBD | Yok | 🟢 DÜŞÜK | 8 |
| **B9** | Pilot bittikten sonra varsayılan '0000' şifre değişimi (Task #274) | B1 ile birleşir | EVET | B1 kapsamında | Yok | 🔴 KRİTİK GÜVENLİK | B1 ile |
| **B10** | OpenAI aylık harcama tavanı + uyarı (Task #275) | YOK | EVET (yeni tablo: cost limits) | ~3-4 saat | Yok | 🟡 ORTA | 9 |
| **B11** | Kapanışlarda `pdks_daily_summary` senkron tut (Task #276) | B2 ile bağlantılı, ek scope | EVET | ~2-3 saat (B2 üzerine) | Yok | 🟡 ORTA | B2 ile |
| **B12** | Kiosk vardiya kapanış E2E test (Task #277) | YOK | HAYIR (test) | ~3-4 saat | Yok | 🟡 ORTA | B2 sonrası |

**Toplam tahmini:** ~50-65 saat (Sprint 2 ~6-8 hafta zaman çizelgesi)

---

## 2. DETAY — Her İş

### B1. HQ Kiosk PIN bcrypt + Lockout + Audit

- **Plan:** `docs/plans/hq-kiosk-pin-security.md` (~250 satır, 4 faz, 15 test)
- **Amaç:** HQ kiosk login plaintext PIN açığını kapatmak (`branches.ts:4122` `phone_number.slice(-4)` compare); bcrypt + 3 deneme/15 dk lockout + rate limit + audit log
- **Risk:** 🔴 KRİTİK — insider + brute force, dakikalar içinde tüm hesaplar (kabul edilen risk md. 14)
- **Etkilenen Dosyalar/Tablolar:** Yeni `hq_staff_pins` tablosu, `branches.ts:4122` endpoint, PIN seed scripti, audit log entegrasyonu
- **DB Write:** EVET (yeni tablo + PIN seed)
- **Pilot Öncesi/Sonrası:** **Sonrası** (Day-1 öncesi schema değişikliği riski yüksek)
- **Bağımlılık:** B9 ('0000' fallback PIN değişimi) bu işin parçası olarak yapılır
- **Sıra:** 1️⃣ İlk yapılacak, en kritik güvenlik

---

### B2. shift_attendance Check-out Kapanışı

- **Plan:** `docs/plans/shift-attendance-checkout-fix.md` (~280 satır, 5 faz, 14 test)
- **Amaç:** Branch (`branches.ts:3273`), HQ (`branches.ts:4331`), Factory (`factory.ts:~1855`) shift-end endpoint'lerinde `shift_attendance.check_out_time` UPDATE eksiği; ortak utility refactor (`closeShiftAttendance()`)
- **Risk:** 🟡 ORTA (audit only) — Maaş ETKİSİZ (bordro `pdks_daily_summary` Excel-bazlı, md. 13)
- **Etkilenen Dosyalar/Tablolar:** 3 endpoint, ortak yardımcı dosya, `shift_attendance` tablo (UPDATE only, schema değişmez), opsiyonel backfill scripti
- **DB Write:** KOŞULLU (kod fix yeterse HAYIR; backfill yapılırsa EVET)
- **Pilot Öncesi/Sonrası:** **Tercihen önce** (Day-1 öncesi yapılırsa kayıt bütünlüğü temiz başlar — opsiyon O1)
- **Bağımlılık:** B11 (`pdks_daily_summary` sync) ek scope olarak buraya eklenebilir
- **Sıra:** 2️⃣ veya pilot öncesi opsiyonel

---

### B3. İzin / Rapor / Ücretsiz İzin Bakiye Sistemi

- **Plan:** `docs/plans/leave-balance-system.md` (~280 satır, 6 faz, 8 açık karar)
- **Amaç:** Mevcut `leave_requests` üzerine yeni `leave_balances` + `leave_entitlement_rules` + `medical_leaves` tablo + 4857 İK uyumlu yıllık hak hesabı + KVKK uyumlu rapor saklama
- **Risk:** 🔴 YÜKSEK — Bakiye sistemi olmadan onay verilirse haktan fazla izin verilir; KVKK ihlali riski (sağlık raporu hassas veri)
- **Etkilenen Dosyalar/Tablolar:** 3 yeni tablo, `hr.ts:2212-2558` endpoint refactor, `LeaveManagementSection.tsx`, dashboard widget'lar
- **DB Write:** EVET (3 yeni tablo + entitlement rules seed + 2026 bakiye seed)
- **Pilot Öncesi/Sonrası:** **Sonrası** (Day-1'de manuel/Excel ile yürür — R3 owner kararı)
- **Bağımlılık:** Yok
- **Sıra:** 3️⃣ Pilot personel sayısı arttıkça kritik hale gelir

---

### B4. Ay Sonu Puantaj Simülasyonu

- **Plan:** YOK (Sprint 2 başında yazılacak)
- **Amaç:** Pilot ay sonu (~30 May 2026) öncesi tam puantaj kuru çalıştırması — `pdks_monthly_stats` üretimi, ücret hesabı, kesintiler, izin etkisi
- **Risk:** 🟡 ORTA — İlk gerçek ay sonu çalıştırması; hatalar pilot maaşını etkileyebilir
- **Etkilenen Dosyalar/Tablolar:** READ-ONLY simülasyon — `pdks_engine.ts`, `pdks_daily_summary`, `pdks_monthly_stats` (sadece SELECT + simülasyon raporu)
- **DB Write:** HAYIR (READ-ONLY simülasyon, gerçek ay sonu hesaplaması ayrı çalışma)
- **Pilot Öncesi/Sonrası:** **Pilot içi (~25 Mayıs)** — Ay sonu öncesi 5 gün tampon
- **Bağımlılık:** Pilot Excel verisi mevcut olmalı
- **Sıra:** 4️⃣ Pilot ay sonu yaklaştıkça

---

### B5. Fabrika Üretim — S3/S4 Genişletme

- **Plan:** `docs/plans/factory-production-mvp.md` (S1+S2 Day-1, S3/S4 post-pilot)
- **Amaç:** Day-1'de S1+S2 (plan + batch CRUD) ile başlayan fabrika modülünü S3 (run + output + complete) ve S4 (kiosk üretim takibi şefler için) ile genişletme
- **Risk:** 🟡 ORTA — Kompleks akış (run + output + lot tracking + worker scoring), kiosk entegrasyonu
- **Etkilenen Dosyalar/Tablolar:** `factory.ts` (~7000 satır), `factory_production_runs`, `factory_production_outputs`, kiosk akışı
- **DB Write:** KOŞULLU (mevcut tablolar yeterse HAYIR, lot tracking yeni alan gerekirse EVET)
- **Pilot Öncesi/Sonrası:** **Sonrası**
- **Bağımlılık:** Day-1 sonrası fabrika ekibinin gerçek kullanım geri bildirimi
- **Sıra:** 5️⃣

---

### B6. Reçete + Besin + Alerjen + Etiket Sistemi

- **Plan:** `docs/runbooks/recipe-label-workflow.md` ✅ (workflow runbook); implementasyon planı YOK
- **Amaç:** Reçete değişikliğinin etiket revize akışına bağlanması; etiket statüleri (taslak/onay bekliyor/onaylı/revize gerekli); TGK uyumlu etiket; besin değeri otomatik hesap
- **Risk:** 🟢 DÜŞÜK (post-pilot iş) — Mevzuat (TGK) uyumluluğu kritik ama Day-1 etkisi yok
- **Etkilenen Dosyalar/Tablolar:** Yeni etiket tablosu (statüler + revize history), `factory-recipes.ts`, `factory-recipe-nutrition.ts`, frontend etiket sayfası
- **DB Write:** EVET (yeni tablo + revize history)
- **Pilot Öncesi/Sonrası:** **Sonrası** (Sprint 2 sonu / Sprint 3)
- **Bağımlılık:** B3 (İzin sistemi) ile öncelik karşılaştırması — operasyonel ihtiyaca göre
- **Sıra:** 6️⃣

---

### B7. Day-5 Güvenlik Sertleştirme Paketi (Task #272)

- **Plan:** YOK
- **Amaç:** Register endpoint güvenlik (kapatma?), helmet/frameguard middleware, auth rate limiter, log temizliği
- **Risk:** 🟡 ORTA — Production hardening
- **Etkilenen Dosyalar/Tablolar:** `server/index.ts` (helmet middleware), `server/routes/auth.ts` (rate limiter), `server/middleware/` (yeni)
- **DB Write:** HAYIR (kod değişikliği)
- **Pilot Öncesi/Sonrası:** **Sonrası** (Day-5 ismi tuhaf, owner scope netleştirsin)
- **Bağımlılık:** B1 (HQ PIN) ile beraber yapılırsa daha verimli
- **Sıra:** 7️⃣

---

### B8. Rol Detaylı Rapor PDF (26 Rol) (Task #259)

- **Plan:** YOK
- **Amaç:** 26 rol için detaylı yetki + akış + erişim raporu PDF
- **Risk:** 🟢 DÜŞÜK
- **Etkilenen Dosyalar/Tablolar:** Yeni rapor üretici, PDF kütüphanesi
- **DB Write:** HAYIR (rapor)
- **Pilot Öncesi/Sonrası:** **Sonrası**
- **Bağımlılık:** TEST-MATRIX.md zaten var (13 rol smoke test); 26 rol detayı için ek araştırma
- **Sıra:** 8️⃣

---

### B9. Varsayılan '0000' PIN Değişimi (Task #274)

- **Plan:** B1 ile birleşir
- **Amaç:** Pilot bittikten sonra varsayılan '0000' fallback PIN'leri güçlü PIN'lerle değiştir
- **Risk:** 🔴 KRİTİK GÜVENLİK
- **Etkilenen Dosyalar/Tablolar:** B1'deki `hq_staff_pins` seed + branch/factory PIN değişim akışı
- **DB Write:** EVET
- **Pilot Öncesi/Sonrası:** **Sonrası** (B1 ile aynı sprint)
- **Bağımlılık:** B1
- **Sıra:** B1 ile aynı (1️⃣)

---

### B10. OpenAI Aylık Harcama Tavanı + Uyarı (Task #275)

- **Plan:** YOK
- **Amaç:** Mr. Dobody + Academy AI çağrıları için aylık cost monitoring; tavan aşılırsa uyarı + opsiyonel servis kapatma
- **Risk:** 🟡 ORTA — OpenAI fatura sürprizi olabilir
- **Etkilenen Dosyalar/Tablolar:** Yeni `ai_cost_limits` + `ai_cost_log` tablo, OpenAI çağrı wrapper, admin dashboard widget
- **DB Write:** EVET (yeni tablolar)
- **Pilot Öncesi/Sonrası:** **Sonrası** (pilot süresi 1 ay, fatura tahmini düşük)
- **Bağımlılık:** Yok
- **Sıra:** 9️⃣

---

### B11. Kapanışlarda pdks_daily_summary Sync (Task #276)

- **Plan:** B2 ile bağlantılı, ek scope
- **Amaç:** Şube/HQ/fabrika kapanışlarında sadece `shift_attendance` değil `pdks_daily_summary` da sync edilir → Excel-bazlı bordro ile sistem-bazlı kayıt arasında tutarlılık
- **Risk:** 🟡 ORTA — Eğer sync olmazsa ay sonu Excel + sistem farkı çıkar
- **Etkilenen Dosyalar/Tablolar:** B2'deki 3 endpoint + `pdks_daily_summary` UPDATE
- **DB Write:** EVET
- **Pilot Öncesi/Sonrası:** **Sonrası (B2 ile)**
- **Bağımlılık:** B2 (shift_attendance fix)
- **Sıra:** B2 ile aynı (2️⃣)

---

### B12. Kiosk Vardiya Kapanış E2E Test (Task #277)

- **Plan:** YOK
- **Amaç:** Kiosk login → shift-start → shift-end → close akışı için Playwright E2E test (manuel TEST-MATRIX yerine otomatik)
- **Risk:** 🟡 ORTA — Şu an sadece manuel smoke test
- **Etkilenen Dosyalar/Tablolar:** Yeni `tests/e2e/kiosk-shift-flow.spec.ts`, Playwright config
- **DB Write:** HAYIR (test ortamı)
- **Pilot Öncesi/Sonrası:** **B2 sonrası** (kapanış mantığı düzeltildikten sonra)
- **Bağımlılık:** B2 + B11
- **Sıra:** B2/B11 sonrası

---

## 3. ÖNERİLEN SIRA (Sprint 2 Yol Haritası)

### Hafta 1 (Pilot bitimi sonrası ilk hafta)
- 1️⃣ **B1 + B9** — HQ PIN bcrypt + '0000' değişimi (~5 saat) — En kritik güvenlik
- 2️⃣ **B2 + B11** — shift_attendance fix + pdks_daily_summary sync (~5 saat)

### Hafta 2
- 3️⃣ **B12** — Kiosk vardiya E2E test (~3-4 saat) — B2 sonrası regresyon koruması
- 4️⃣ **B7** — Day-5 güvenlik paketi (B1 ile aynı sprint mantıken, ama B1 bittiyse ayrı)

### Hafta 3-4
- 5️⃣ **B3** — İzin/rapor/bakiye sistemi (~12 saat) — En geniş iş, 2 hafta planlanabilir
- 6️⃣ **B10** — OpenAI cost monitoring (~3-4 saat) — Operasyonel önemli

### Hafta 5-6
- 7️⃣ **B5** — Fabrika S3/S4 genişletme (~6-10 saat) — Pilot geri bildirimine göre öncelik
- 8️⃣ **B4** — Ay sonu puantaj simülasyonu (~2 saat) — Pilot ay sonu sırasında zaten yapılır

### Hafta 7-8
- 9️⃣ **B8** — Rol Detaylı Rapor PDF
- 🔟 **B6** — Reçete + besin + alerjen + etiket sistemi (post-pilot)

---

## 4. KARAR BEKLEYEN STRATEJİK SORULAR (Owner)

1. **Sprint 2 başlama tarihi:** Pilot bitiminden hemen sonra mı, 1 hafta arıyla mı?
2. **Sprint 2 takım:** Sadece Replit Agent mı, ChatGPT/Claude reaktive mi?
3. **B1 mi B3 mü öncelik:** Güvenlik önce mi (HQ PIN), İK önce mi (izin sistemi)?
4. **B6 (reçete+etiket) Sprint 2'ye mi Sprint 3'e mi:** Mevzuat (TGK) zorunluluğu varsa öncelik artar
5. **B10 (OpenAI cost) ne kadar acil:** Pilot 1 ay tahminen düşük fatura, ama Mr. Dobody yoğun kullanılırsa risk
6. **Yeni Replit propose task'lar (#272-#277) onaylanacak mı:** Owner UI'da tek tek karar vermeli

---

## 5. SPRINT 1 TAMAMLAMA DOĞRULAMA (Sprint 2'ye Geçiş Şartı)

Aşağıdakiler tamamlanmadan Sprint 2'ye geçilmemeli:

- ✅ Pilot Day-1 GO/NO-GO checklist tamam (`docs/PILOT-DAY1-CHECKLIST.md`)
- ✅ Pilot Day-1 incident log şablonu hazır
- ✅ Tüm Sprint 1 tamamlanan işler (16 madde) `docs/SPRINT-LIVE.md`'de işaretli
- ✅ DB drift = 0 doğrulandı
- ⚠️ **Pilot Day-1 yapıldı ve değerlendirildi** — Bu olmadan Sprint 2 başlamamalı
- ⚠️ **Pilot retrospektif raporu** — Day-1 sonrası owner + Aslan + Eren + ekip ile retro toplantısı, çıktısı `docs/audit/pilot-retro-YYYY-MM-DD.md`

---

## 5.5 Yeni 8 İş — Çok Perspektifli Audit Sonucu (2 May 2026)

`docs/audit/system-multi-perspective-evaluation-2026-05-02.md` raporundan sprint-2 backlog'a eklenen yeni işler. Mevcut B1-B12 listesini tamamlar.

### B13 — Public Endpoint Sertleştirme 🔴 KRİTİK

| Alan | Değer |
|---|---|
| **Severity** | 🔴 KRİTİK |
| **Kapsam** | `delegation-routes.ts` 5 endpoint + `module-content-routes.ts` 5 endpoint + `/api/export/*` 19 endpoint AUTH eklenmesi |
| **Süre** | ~5 saat (3 saat export + 1 saat delegation + 1 saat module-content) |
| **Plan dokümanı** | YOK — Plan moduna geçince yazılır |
| **Acceptance** | Tüm 29 endpoint anonim çağrıda 401, yetkisiz rolde 403; pozitif/negatif test her endpoint için |
| **Bağlı bulgu** | G1, G2, G5 (audit) + FULL_AUDIT Issue #2 |
| **Risk** | Pilot Day-1 öncesi acil — anonim erişim mevcut |

### B14 — ROLE_MODULE_DEFAULTS Tamamlama 🔴 YÜKSEK

| Alan | Değer |
|---|---|
| **Severity** | 🔴 YÜKSEK |
| **Kapsam** | `shared/modules-registry.ts` `ROLE_MODULE_DEFAULTS` tablosuna 16 eksik rol için varsayılan modül listesi |
| **Eksik roller** | ceo, cgo, mudur, sef, gida_muhendisi, sube_kiosk, kalite_kontrol, marketing, stajyer, bar_buddy, uretim_sefi, fabrika_operator, fabrika_sorumlu, fabrika_personel, fabrika_depo, recete_gm, muhasebe_ik |
| **Süre** | ~2 saat |
| **Plan dokümanı** | YOK |
| **Acceptance** | Her yeni rol kullanıcısı login olduğunda boş/eksik modül listesi görmesin; UI sidebar dolu |
| **Bağlı bulgu** | K2, U3 (audit) |
| **Risk** | Pilot kullanıcı (Aslan, Eren, Sema, Ümit) ilk login boş ekran görebilir |

### B15 — Scheduler Advisory Lock 🔴 YÜKSEK

| Alan | Değer |
|---|---|
| **Severity** | 🔴 YÜKSEK (autoscale öncesi zorunlu) |
| **Kapsam** | `server/services/agent-scheduler.ts` ve 30+ scheduler job'a `pg_advisory_lock` veya distributed lock |
| **Süre** | ~3 saat |
| **Plan dokümanı** | YOK |
| **Acceptance** | Replit autoscale'de 2+ instance varken scheduler job'ları aynı anda 2 kere çalışmaz; lock timeout dökümante |
| **Bağlı bulgu** | P3 (audit) + FULL_AUDIT Issue #11 |
| **Risk** | Pilot 1 instance OK, ama autoscale geçilirse görev duplikasyonu |

### B16 — pg_dump Cron + S3 Yedek Otomasyonu ✅ MERGED (2 May 2026, Task #280 / Wave A-2)

| Alan | Değer |
|---|---|
| **Severity** | 🔴 YÜKSEK (DR temeli) — ÇÖZÜLDÜ |
| **Kapsam** | ✅ `scripts/backup/pg-dump-daily.ts` (pg_dump custom + gzip + Object Storage + 30 gün retention); `server/backup.ts` `startDailyPgDumpScheduler()` her gece 03:00 UTC; `docs/runbooks/db-restore-from-backup.md` (10 adım) |
| **Süre** | ~2 saat (gerçekleşen) |
| **Plan dokümanı** | `docs/plans/W-A2-pgdump-cron-DR.md` |
| **Acceptance** | ✅ Dry-run PASS (5.55 MB, 5.3s); ✅ Scheduler boot'ta mount edildi; ⏳ İlk gerçek backup Day-1 sabahı 03:00 UTC |
| **Bağlı bulgu** | O6 (audit) — ÇÖZÜLDÜ |
| **Risk** | ✅ Pilot Day-1 hazır; PILOT-DAY1-ROLLBACK-PLAN Seviye 5 ✅ |
| **DECISIONS** | #30 yeni karar |

### B17 — Login Lockout DB'ye Taşı 🟡 ORTA

| Alan | Değer |
|---|---|
| **Severity** | 🟡 ORTA |
| **Kapsam** | `server/localAuth.ts` in-memory lockout map → DB tablosuna (`login_attempts` veya `users.lockout_until`) |
| **Süre** | ~3 saat |
| **Plan dokümanı** | YOK |
| **Acceptance** | Restart sonrası lockout devam, autoscale'de paralel instance ortak sayar |
| **Bağlı bulgu** | G7 (audit) + FULL_AUDIT A3 |

### B18 — TEST-MATRIX 31 Role Genişletme 🟡 ORTA

| Alan | Değer |
|---|---|
| **Severity** | 🟡 ORTA |
| **Kapsam** | `docs/TEST-MATRIX.md` mevcut 13 rol → 31 rol smoke test |
| **Eksik roller** | coach, marketing, trainer, kalite_kontrol, supervisor_buddy, stajyer, bar_buddy, uretim_sefi, fabrika_operator, fabrika_sorumlu, fabrika_personel, fabrika_depo, recete_gm, muhasebe (legacy), teknik (legacy), destek, fabrika (legacy), yatirimci_hq |
| **Süre** | ~4 saat |
| **Plan dokümanı** | YOK |
| **Acceptance** | Her rol için login + dashboard + 3 ana endpoint test sonucu (geçti/kaldı) |
| **Bağlı bulgu** | K4 (audit) |

### B19 — Legacy Rol Denetimi + Temizlik 🟡 ORTA

| Alan | Değer |
|---|---|
| **Severity** | 🟡 ORTA |
| **Kapsam** | `muhasebe`, `teknik`, `destek`, `fabrika`, `yatirimci_hq` legacy rolleri — kullanım denetimi: gerçekten kullanılıyor mu, kim hangi rolle login? |
| **Süre** | ~2 saat |
| **Plan dokümanı** | YOK |
| **Acceptance** | Kullanılmayan roller dökümante (deprecated note); kullanılanlar dökümante (yeni rolle ilişkisi) |
| **Bağlı bulgu** | K3 (audit) |

### B20 — KVKK Audit + İyileştirme 🟡 ORTA

| Alan | Değer |
|---|---|
| **Severity** | 🟡 ORTA (hukuki risk) |
| **Kapsam** | M1-M8 (audit Bölüm 6.1): kişisel veri şifreleme, personel dosya RBAC, audit log denetimi, sağlık raporu sebep yazımı yasak, veri silme akışı, aydınlatma metni, saklama süreleri, kiosk QR IP toplama |
| **Süre** | ~6 saat |
| **Plan dokümanı** | YOK |
| **Acceptance** | KVKK 8 maddenin her biri için mevcut durum + plan dökümante |
| **Bağlı bulgu** | M1-M8 (audit) |

---

## 5.6 Sprint 2 Toplam Yük

| Grup | İş Sayısı | Toplam Süre |
|---|---|---|
| B1-B12 (orijinal) | 12 | ~50-65 saat |
| B13-B20 (audit) | 8 | ~27 saat |
| **TOPLAM** | **20** | **~75-90 saat** (8-10 hafta @ 10 saat/hafta) |

---

## 6. İLİŞKİLİ DOKÜMANLAR

- `docs/SPRINT-LIVE.md` — Aktif sprint canlı durum
- `docs/DECISIONS.md` — 28 madde kararlar (md. 14, 15 kabul edilen riskler)
- `docs/audit/pilot-readiness-current.md` — Pilot Day-1 hazırlık raporu (Bölüm 5'ten gelir)
- `docs/PILOT-DAY1-CHECKLIST.md` — Day-1 GO/NO-GO
- `docs/PILOT-DAY1-INCIDENT-LOG.md` — Day-1 hata günlüğü
- `docs/runbooks/db-write-protocol.md` — DB-WRITE acil prosedür
- `docs/runbooks/kiosk-pdks-test.md` — Kiosk + PDKS test
- `docs/runbooks/git-security-cleanup.md` — Git güvenlik
- `docs/runbooks/recipe-label-workflow.md` — Reçete + etiket workflow
- `docs/plans/hq-kiosk-pin-security.md` — B1 plan
- `docs/plans/shift-attendance-checkout-fix.md` — B2 plan
- `docs/plans/leave-balance-system.md` — B3 plan
- `docs/plans/factory-production-mvp.md` — B5 plan (S1+S2 Day-1, S3/S4 Sprint 2)
- `docs/TEST-MATRIX.md` — 13 rol smoke test

---

> **Bu doküman MASTER BACKLOG'tur. Sprint 2 başında her iş için ayrı sprint planlaması yapılır. Replit Agent + Owner periyodik retro toplantısında bu liste güncellenir, yeni işler eklenir, tamamlananlar arşivlenir.**
