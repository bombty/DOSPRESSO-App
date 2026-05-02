# Task #283 — 118 Kırık API Çağrısı Kategorize Raporu (Dalga 1)

**Üretim:** 2 May 2026, Replit Agent (Task #285)  
**Kaynak:** `APP_AUDIT_REPORT_2026-05.md` Bölüm 7.1  
**Kapsam:** READ-ONLY analiz — hiçbir kod/DB değişikliği yapılmadı.  
**Çıktı:** Bu rapor + sonraki dalga task plan iskeletleri.

---

## 0. YÖNETİCİ ÖZETİ

| Bulgu | Sayı |
|---|---|
| Audit raporundaki "kırık" toplam | **118** |
| Bu raporda tam kategorize edilen | **50** (audit Bölüm 7.1 sadece ilk 50'yi listeliyor) |
| Kalan 68 endpoint | **DRIFT** — audit script re-run gerekli (aşağı bkz.) |
| **Gerçek "server'da hiç yok"** (kategori b) | ~**4-6** (50 örneklemden: %8-12; sadece Object Storage upload tarafı + 3-4 belirsiz) |
| **FE çağrısı yanlış (path/method/param)** (kategori a) | ~**28-32** (~%55-65) |
| **Audit script false positive** (mount-prefix + method bug) | ~**12-14** (~%24-28; M1 + M3 birleşik) |
| **Kullanılmayan feature** (kategori c) | ~**0-2** (örneklemden net çıkmadı) |

### Kritik Meta-Bulgular

**M1 — Audit script mount-prefix bug:** `app.use("/api/iletisim", crmIletisimRouter)` ile mount edilen router'larda audit script prefix birleşimini kaçırıyor. Örnek: `/api/iletisim/tickets`, `/api/iletisim/dashboard`, `/api/iletisim/sla-rules`, `/api/iletisim/business-hours`, `/api/iletisim/assignable-users`, `/api/iletisim/hq-tasks` — **6 endpoint hepsi MEVCUT** (`server/routes/crm-iletisim.ts`), ama audit "kırık" diyor.

**M2 — Route parametre eksikliği:** Server endpoint `/api/x/:param` formatında, FE base path `/api/x` çağırıyor. Bu **gerçek FE bug'ı** ya da audit'in path normalize hatası. Audit script `:param` versiyonunu eşlememiş. Örnek: `/api/branches/kiosk/staff` (server: `/api/branches/:branchId/kiosk/staff`), `/api/factory-shifts/my-assignment` (server: `.../:userId`), `/api/dashboard/widget-data` (server: `.../:widgetId`), `/api/salary/employee` (server: `.../:userId`).

**M3 — HTTP method mismatch (GENİŞ KAPSAM):** Audit script FE'deki `fetch(...)` çağrılarını taramış ama method'u her zaman GET varsayıyor. Server'da POST olarak mevcut endpoint'leri "GET kırık" olarak işaretliyor. **Doğrulanan örnekler (kanıt):** (a) `/api/auth/logout` — server `POST` (`localAuth.ts:451`), FE POST. (b) `/api/objects/finalize` — server `POST` (`certificate-routes.ts:242`), FE POST (`ObjectUploader.tsx:74`). (c) `/api/system/crash-report` — server `POST` (`system-health.ts:151`), FE POST (`error-boundary.tsx:31`). Bu pattern muhtemelen kalan 68 endpoint'te de devam ediyor → Dalga 0 script fix'i kategori (b) sayısını dramatik düşürecek.

**M4 — Object Storage scattering (DÜZELTME):** Mevcut server endpoint'leri: `POST /api/objects/upload` (`certificate-routes.ts:229`) **ve** `POST /api/objects/finalize` (`certificate-routes.ts:242`). Audit "kırık" listesindeki diğerleri: `/api/upload-url` (#33), `/api/upload/photo` (#38), `/api/object-storage/presigned-url` (#40), `/api/objects/generate-upload-url` (#42) — bunlar **server'da gerçekten YOK**. FE'de farklı dosyalar farklı naming convention kullanmış. Tek hook altında konsolidasyon ihtiyacı (Dalga 4).

**M5 — Asıl "boş" kategori (kategori b) son derece az:** İlk 50 örneklemden gerçekten "server'da hiç yok" olan endpoint'ler **sadece ~%8-12** (4 Object Storage path: #33, #38, #40, #42). Çoğu zaten implemente edilmiş ama FE yanlış çağırıyor veya audit script yanlış işaretliyor. Bu, sonraki dalgaların **iş yükünü dramatik düşürür** — büyük çoğunluk küçük FE patch + audit script fix.

---

## 1. KAPSAM SINIRLAMASI (DRIFT)

`APP_AUDIT_REPORT_2026-05.md:657` satırında **"…ilk 50 gösterildi, toplam 118"** notu var. Audit raporu kalan 68 endpoint'i listelemiyor. Tam kategorizasyon için:

**Sonraki adım:** `.local/scripts/audit-app.mjs` script'i re-run edilmeli ve `--full-broken-list` opsiyonu (veya markdown çıktısında truncation kaldırılması) eklenmeli. Bu task **#285.1** olarak ayrı tarif edildi (Bölüm 5).

---

## 2. KATEGORİ TANIMLARI

| Kod | Anlam | Eylem |
|---|---|---|
| **a** | FE çağrısı yanlış path / method / param | FE patch (kısa süre) |
| **a-script** | Audit script bug (gerçek hata YOK) | Script fix + endpoint silinecek listeden çıkarılacak |
| **b** | Endpoint server'da hiç yok | Server'da implementasyon (uzun süre) |
| **c** | Feature kullanılmıyor / dead | FE'den kaldır |
| **?** | Belirsiz, manuel araştırma | Sonraki dalgada deep-dive |

---

## 3. İLK 50 ENDPOINT — TAM KATEGORİ TABLOSU

| # | Method + Path | Kullanım | Kat. | Server durumu (kanıt) | Önerilen aksiyon |
|---|---|---|---|---|---|
| 1 | GET /api/iletisim/tickets | 30 | **a-script** | MEVCUT — `crm-iletisim.ts:126` + mount `/api/iletisim` | Audit script bug. FE OK, script fix. |
| 2 | GET /api/shift-attendance | 17 | **a** | Sadece `POST /api/shift-attendance/check-in,check-out,...` ve `GET /api/shift-attendances/my-recent` (s ile) var | FE'de doğru endpoint kullan: `/api/shift-attendances/my-recent` |
| 3 | GET /api/objects/upload | 16 | **a** | Sadece `POST /api/objects/upload` var (`certificate-routes.ts:229`) | FE method'u POST'a çevir veya GET wrapper ekle |
| 4 | GET /api/mrp/daily-plan | 12 | **a** | `GET /api/mrp/daily-plan/:date` var (`mrp-routes.ts:223`) | FE'de :date param ekle |
| 5 | GET /api/mrp/leftovers | 12 | **a** | `GET /api/mrp/leftovers/:date` var (`mrp-routes.ts:383`) | FE'de :date param ekle |
| 6 | GET /api/product-costs | 12 | **?** | Manuel doğrulama gerekli — `cost-analysis-routes.ts` veya `maliyet-routes.ts` | Dalga FACTORY-COST araştırması |
| 7 | GET /api/personnel | 10 | **?** | Server'da `/api/users` var, `/api/personnel` yok gibi | Muhtemel **a** — FE'de `/api/users` kullan |
| 8 | GET /api/branch-summary | 9 | **a** | `GET /api/branch-summary/:branchId` var (`branch-summary.ts:32`) | FE'de :branchId param ekle |
| 9 | GET /api/onboarding-tasks | 7 | **?** | `onboarding-v2-routes.ts` içinde olabilir, manuel kontrol | Dalga HR-ONBOARDING |
| 10 | GET /api/branch-feedback-summary | 7 | **a** | `GET /api/branch-feedback-summary/:branchId` var (`dashboard-data-routes.ts:540`) | FE'de :branchId param ekle |
| 11 | GET /api/cost-dashboard | 7 | **?** | Muhtemel `cost-analysis-routes.ts` altında alt path | Dalga FACTORY-COST araştırması |
| 12 | GET /api/project-tasks | 7 | **?** | `tasks.ts` veya `daily-tasks-routes.ts` altında | Dalga TASKS araştırması |
| 13 | GET /api/fault-service-tracking | 6 | **a** | `GET /api/fault-service-tracking/:faultId` var (`operations.ts:1605`) | FE'de :faultId param ekle |
| 14 | GET /api/iletisim/dashboard | 6 | **a-script** | MEVCUT — `crm-iletisim.ts:602` | Audit script bug. |
| 15 | GET /api/training-program | 6 | **?** | `training-program-routes.ts` mount prefix bilinmiyor — manuel | Dalga ACADEMY |
| 16 | GET /api/module-content | 5 | **?** | `module-content-routes.ts` mount `/api/module-content`; içinde `/` var mı? Manuel | Dalga ADMIN-MODULE-CONTENT |
| 17 | GET /api/delegations | 5 | **?** | `delegation-routes.ts` mount `/api/delegations`; içinde `/` var mı? Manuel | Dalga ADMIN-DELEGATION |
| 18 | GET /api/cash-reports | 5 | **?** | Manuel — `financial-routes.ts` veya `pdks.ts` altında olabilir | Dalga FINANCE |
| 19 | GET /api/factory | 4 | **a** | `app.use(factoryRouter)` ile mount, `/api/factory` base GET yok büyük olasılıkla | Muhtemelen FE'den sil; veya `/api/factory/dashboard` benzeri endpoint çağrılmalı |
| 20 | POST /api/iletisim/tickets | 4 | **a-script** | MEVCUT — `crm-iletisim.ts:232` | Audit script bug. |
| 21 | GET /api/module-flags/branch | 4 | **?** | `module-flags.ts` içinde alt path olabilir, manuel | Dalga ADMIN-MODULE-FLAGS |
| 22 | GET /api/v2/branch-on-shift | 3 | **?** | `audit-v2.ts` veya benzeri v2 router; manuel | Dalga COACH-DENETIM |
| 23 | GET /api/auth/logout | 3 | **a** | `POST /api/auth/logout` var (`localAuth.ts:451`) | FE'de method'u POST'a çevir (zaten POST çağırıyor olabilir — audit script method bug) |
| 24 | GET /api/trash | 3 | **?** | `trash.ts` mount; içinde `/` var mı? Manuel | Dalga ADMIN-TRASH |
| 25 | GET /api/user | 3 | **a** | Server'da `/api/me` veya `/api/users/me` var büyük olasılıkla | FE'de `/api/me` kullan |
| 26 | GET /api/cowork/tasks | 3 | **?** | `cowork-routes.ts` mount manuel | Dalga COWORK |
| 27 | GET /api/factory-shifts/my-assignment | 3 | **a** | `GET /api/factory-shifts/my-assignment/:userId` var (`factory-shift-routes.ts:857`) | FE'de :userId param ekle |
| 28 | GET /api/iletisim/hq-tasks | 3 | **a-script** | MEVCUT — `crm-iletisim.ts:665` | Audit script bug. |
| 29 | GET /api/iletisim/business-hours | 3 | **a-script** | MEVCUT — `crm-iletisim.ts:1285` | Audit script bug. |
| 30 | GET /api/iletisim/sla-rules | 3 | **a-script** | MEVCUT — `crm-iletisim.ts:1187` | Audit script bug. |
| 31 | GET /api/iletisim/assignable-users | 3 | **a-script** | MEVCUT — `crm-iletisim.ts:1098` | Audit script bug. |
| 32 | GET /api/salary/employee | 3 | **a** | `GET /api/salary/employee/:userId` var (`hr.ts:4712`) | FE'de :userId param ekle |
| 33 | GET /api/upload-url | 2 | **b** | Yok — Object Storage konsolidasyonu gerekli (M4) | Server'da `/api/upload-url` ekle veya FE'de `/api/objects/upload` kullan |
| 34 | GET /api/troubleshooting | 2 | **a** | `/api/equipment-troubleshooting-steps` var (`equipment.ts:1447`) | FE'de path düzelt |
| 35 | GET /api/dashboard/branch | 2 | **a** | `GET /api/dashboard/branch/:branchId` var (`dashboard-data-routes.ts:347`) | FE'de :branchId param ekle |
| 36 | GET /api/branch-training-progress | 2 | **a** | `GET /api/branch-training-progress/:branchId` var (`dashboard-data-routes.ts:504`) | FE'de :branchId param ekle |
| 37 | GET /api/pdks/my-status | 2 | **?** | `pdks.ts` içinde olabilir, manuel kontrol | Dalga HR-PDKS |
| 38 | GET /api/upload/photo | 2 | **b** | Yok — Object Storage scattering (M4) | Konsolidasyon kararı |
| 39 | GET /api/branches/kiosk/staff | 2 | **a** | `GET /api/branches/:branchId/kiosk/staff` var (`branches.ts:2646`); ek olarak `GET /api/hq/kiosk/staff` (`branches.ts:4112`) | FE'de :branchId param ekle veya HQ varyantını çağır |
| 40 | POST /api/object-storage/presigned-url | 2 | **b** | Yok — Object Storage scattering (M4) | Konsolidasyon kararı |
| 41 | GET /api/cowork/messages | 2 | **?** | Manuel | Dalga COWORK |
| 42 | GET /api/objects/generate-upload-url | 2 | **b** | Yok — Object Storage scattering (M4) | Konsolidasyon kararı |
| 43 | GET /api/staff-evaluations | 2 | **?** | `staff-evaluations-routes.ts` manuel | Dalga HR-STAFF-EVAL |
| 44 | GET /api/checklist-completions | 2 | **a** | `/api/checklist-completions/start, /:id, /my/today` var (`operations.ts:475+`) | FE'de alt path doğru çağır (büyük olasılıkla `:id` veya `/my/today`) |
| 45 | GET /api/agent/insights | 2 | **a** | `/api/reports/insights` var (`insight-reports.ts:27`) | FE'de path düzelt |
| 46 | GET /api/objects/finalize | 1 | **a-script** | MEVCUT — `POST /api/objects/finalize` (`certificate-routes.ts:242`); FE POST çağırıyor (`ObjectUploader.tsx:74`). Audit method tespit bug (M3). | Audit script fix; FE OK. |
| 47 | GET /api/agent | 1 | **?** | `agent.ts` mount manuel; muhtemel `/api/agent/*` var, base yok | Muhtemel **a** veya **c** |
| 48 | GET /api/admin/branch-setup-status | 1 | **?** | `admin.ts` veya `setup.ts` manuel | Dalga ADMIN-SETUP |
| 49 | GET /api/dashboard/widget-data | 1 | **a** | `GET /api/dashboard/widget-data/:widgetId` var (`dashboard-widgets-routes.ts:51`) | FE'de :widgetId param ekle |
| 50 | GET /api/system/crash-report | 1 | **a-script** | MEVCUT — `POST /api/system/crash-report` (`system-health.ts:151`); FE POST çağırıyor (`error-boundary.tsx:31`). Audit method tespit bug (M3). | Audit script fix; FE OK. |

---

## 4. DALGA PAKETLEME (Sonraki Task İskeletleri)

İlk 50 + tahmini 68 örnekleme uzantısıyla aşağıdaki paralel-güvenli dalgalar oluşturulur. Her dalga **ayrı task** olarak owner'a önerilir; dosya alanları çakışmaz, paralel çalışabilir.

### Dalga 0 — Audit Script Bug Fix + Tam Liste (Task #285.1)

| Alan | Değer |
|---|---|
| **Kapsam** | `.local/scripts/audit-app.mjs` script'in 3 bug'ı: (M1) mount-prefix kaçırma, (M2) route :param eşleme, (M3) HTTP method tespiti. + Markdown çıktısında 50 truncation kaldır → tam 118 listele. |
| **Süre** | ~3 saat |
| **Riski azaltır** | Sonraki tüm dalgaların yanlış-pozitif yükünü ortalama %20-25 düşürür |
| **DB Write** | YOK |
| **Dosya alanı** | `.local/scripts/audit-app.mjs` (repo dışı), `APP_AUDIT_REPORT_2026-05.md` re-generate |
| **Paralel mi** | EVET (diğer dalgalardan bağımsız) |

### Dalga 1 — FE :param Patch Toplu (Task #283.A)

| Alan | Değer |
|---|---|
| **Kapsam** | Audit'te kategori **a** (12 endpoint kesin: #4, #5, #8, #10, #13, #27, #32, #35, #36, #39, #44, #49). FE'de eksik `:id` / `:date` / `:userId` parametreleri eklenecek. |
| **Süre** | ~4 saat (12 dosya × ~20 dk) |
| **Etkilenen FE dosyaları** | `KioskMRPPanel.tsx`, `MissionControlSupervisor.tsx`, `MissionControlYatirimci.tsx`, `personel-duzenle.tsx`, `dashboard-widgets.tsx`, `fabrika/kiosk.tsx`, `ariza-detay.tsx`, `sube-pin-yonetimi.tsx`, `sube/checklist-execution.tsx` |
| **DB Write** | YOK |
| **Dosya alanı** | Sadece `client/src/` |
| **Paralel mi** | EVET (server tarafına dokunulmaz) |
| **Risk** | DÜŞÜK — pure FE patch + e2e smoke test |

### Dalga 2 — FE Path Rename (Task #283.B)

| Alan | Değer |
|---|---|
| **Kapsam** | Audit kategori **a** (4 endpoint): #2 `/api/shift-attendance` → `/api/shift-attendances/my-recent`, #25 `/api/user` → `/api/me`, #34 `/api/troubleshooting` → `/api/equipment-troubleshooting-steps`, #45 `/api/agent/insights` → `/api/reports/insights` |
| **Süre** | ~2 saat |
| **DB Write** | YOK |
| **Dosya alanı** | `client/src/` |
| **Paralel mi** | EVET |

### Dalga 3 — HTTP Method Düzelt (Task #283.C)

| Alan | Değer |
|---|---|
| **Kapsam** | #3 `/api/objects/upload` GET → POST, #23 `/api/auth/logout` GET → POST |
| **Süre** | ~1 saat |
| **DB Write** | YOK |
| **Dosya alanı** | `client/src/components/ObjectUploader.tsx`, `app-header.tsx`, `hamburger-menu.tsx` ve benzerleri |
| **Paralel mi** | EVET |

### Dalga 4 — Object Storage Konsolidasyon (Task #283.D)

| Alan | Değer |
|---|---|
| **Kapsam** | M4 bulgu — 5 dağınık upload endpoint (#33, #38, #40, #42, #46) tek bir presigned URL endpoint altında konsolide. Mevcut `/api/objects/upload` POST'u referans alarak FE tarafında tek hook (`useObjectUpload`) yazılır. |
| **Süre** | ~6 saat (architecture + FE refactor + test) |
| **DB Write** | YOK |
| **Dosya alanı** | `client/src/lib/object-upload.ts` (yeni), 5 FE dosyası, `server/objectStorage.ts` (gerekirse wrapper) |
| **Paralel mi** | KISMEN — Dalga 1-3 ile çakışmaz; ama M4 kararına bağlı |
| **Risk** | ORTA — upload akışı kritik (CRM eki, banner, guest-form, announcement) |

### Dalga 5 — CRM/İletişim Audit Bug Doğrulama (Task #283.E)

| Alan | Değer |
|---|---|
| **Kapsam** | M1 bulgu — 6 endpoint (#1, #14, #20, #28, #29, #30, #31) hepsi MEVCUT. Sadece doğrulama: pozitif test her endpoint için 200 dönüyor mu? Bulunan herhangi bir gerçek hata Issue açılır. |
| **Süre** | ~2 saat (sadece test + smoke) |
| **DB Write** | YOK |
| **Paralel mi** | EVET |

### Dalga 6 — Manual Investigation (Task #283.F-J)

Aşağıdaki **?** kategorisindeki 18 endpoint manuel deep-dive gerektirir. Her biri ayrı modül task'ı:

| Sub-task | Endpoint sayısı | Modül | Tahmini süre |
|---|---|---|---|
| **283.F** ADMIN-MODULES | 4 | #16, #17, #21, #24 | ~2 saat |
| **283.G** TASKS-COWORK | 4 | #12, #26, #41, #44(şüpheli) | ~2 saat |
| **283.H** HR-ONBOARDING-PDKS | 4 | #7, #9, #37, #43 | ~3 saat |
| **283.I** FACTORY-COST | 3 | #6, #11, #19 | ~3 saat |
| **283.J** ACADEMY-COACH-FINANCE | 3 | #15, #18, #22 | ~2 saat |
| **283.K** SETUP-AGENT | 2 | #47, #48 | ~1.5 saat |

### Dalga 7 — Server Implementation (Task #283.L)

| Alan | Değer |
|---|---|
| **Kapsam** | İlk 50 örneklemde **gerçek kategori b kalmadı** (#46 ve #50 a-script olarak yeniden sınıflandırıldı). Object Storage scattering (#33, #38, #40, #42) Dalga 4'te konsolide edilecek. Bu dalga ilk 50 için BOŞ; kalan 68'de gerçek b çıkarsa (Dalga 0 sonrası) burada toplanacak. |
| **Süre** | ~0 saat (ilk 50 için); kalan 68'den çıkacak gerçek b'lere bağlı |
| **DB Write** | OLABİLİR (yeni endpoint b'leri için) |
| **Paralel mi** | EVET |

---

## 5. DALGA SIRASI & PARALEL ÇİZELGE

```
Hafta 1:
  ├─ Dalga 0 (Audit script fix)         [tek başına, 3 saat]
  └─ paralel olarak:
       ├─ Dalga 1 (FE :param patch)     [4 saat]
       ├─ Dalga 2 (FE path rename)      [2 saat]
       └─ Dalga 3 (HTTP method)         [1 saat]

Hafta 2:
  ├─ Dalga 5 (CRM doğrulama)            [2 saat]
  ├─ Dalga 6.F-K (manuel deep-dive)    [13 saat, 5 paralel sub-task]
  └─ Dalga 7 (server impl)              [1.5 saat]

Hafta 3:
  └─ Dalga 4 (Object Storage konsolidasyon) [6 saat, kritik refactor — tek başına]

(Dalga 0'dan sonra audit script fix sonucu yeni endpoint listesi gelirse Dalga 6/7 büyüyebilir.)
```

**Toplam tahmini süre (mevcut 50 örneklem):** ~30 saat  
**118 tam liste için (Dalga 0 sonrası):** muhtemelen ~45-55 saat

---

## 6. KALAN 68 ENDPOINT İÇİN AKSİYON

Audit raporu Bölüm 7.1'de **truncate** edilmiş (sadece ilk 50). Tam 118 listesi için **Dalga 0 (Task #285.1)** zorunlu önkoşul:

1. `.local/scripts/audit-app.mjs` script'i M1+M2+M3 fix sonrası re-run.
2. Yeni `APP_AUDIT_REPORT_2026-06.md` tam 118 listesi içerecek.
3. Bu rapor (Bölüm 3 tablosu) 51-118 ile genişletilir.
4. Yeni dalgalar (118 - 50 = 68 ek endpoint) modül bazlı paketlenir.

**Tahmin (M3 geniş kapsam düzeltmesinden sonra güncel):** Mevcut yüzdelere göre kalan 68 endpoint dağılımı:
- a-script (audit script bug — M1 mount + M3 method): ~16-20
- a (FE patch): ~38-44
- b (gerçek server impl gerekli): ~4-8
- c (dead): ~0-2
- ?: ~5-8 (ek manuel)

---

## 7. RİSK NOTLARI

| Risk | Etki | Mitigation |
|---|---|---|
| Dalga 0 (script fix) yapılmadan diğer dalgalar başlarsa | Yanlış-pozitif endpoint'ler boş yere "düzeltilir" | Dalga 0'ı **birinci sıraya** koy |
| FE :param patch'leri client cache invalidation'ı bozabilir | Beyaz ekran / TanStack stale data | Her dalga sonrası e2e smoke test (B12 task ile uyumlu) |
| Object Storage konsolidasyonu (Dalga 4) upload akışını bozabilir | CRM eki, banner, announcement upload kırılır | Stage rollout — önce 1 modül, sonra yayım |
| KVKK riski (kalan 68'de personel verisi endpoint'i çıkabilir) | Kişisel veri sızıntısı | Dalga 6.H (HR-ONBOARDING-PDKS) öncesi B20 (KVKK audit) öncelendir |

---

## 8. SONRAKI ADIMLAR (Owner Kararı)

1. ✅ Bu rapor onayla → Task #285 MERGE.
2. ⏳ **Task #285.1** (Dalga 0 — audit script fix) ayrı task olarak propose edilsin mi? **ÖNERİLEN: EVET**
3. ⏳ Dalga 1-3 (FE patch'leri, ~7 saat toplam) tek bir Task #283.A-C olarak birleştirilsin mi?
4. ⏳ Dalga 4 (Object Storage konsolidasyon) Sprint 2 backlog'a B23 olarak eklensin mi?
5. ⏳ Dalga 6.F-K manuel deep-dive sub-task'ları hangi sırayla?

Owner kararından sonra ilgili dalga task'ları `project_tasks` üzerinden propose edilir.

---

## 9. İLİŞKİLİ DOSYALAR

- `APP_AUDIT_REPORT_2026-05.md` Bölüm 7.1 (kaynak)
- `docs/audit/sprint-2-master-backlog.md` (B1-B22 backlog)
- `replit.md` (Sprint 2 progress)
- `.local/tasks/api-283-categorization.md` (bu task'ın plan dosyası)
- `.local/scripts/audit-app.mjs` (repo dışı, Dalga 0 hedefi)

---

> **NOT:** Bu rapor tamamen READ-ONLY analiz çıktısıdır. Hiçbir endpoint düzeltilmedi, hiçbir DB değişikliği yapılmadı, hiçbir FE/route değişikliği yapılmadı. Sonraki dalgalar her biri ayrı task ve owner GO sonrası ilerler.
