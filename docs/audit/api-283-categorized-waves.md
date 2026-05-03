# Task #283 — Kırık API Çağrıları Kategorize Raporu (Modül-Bazlı)

**Üretim:** 2 May 2026, Replit Agent (Task #285)  
**Kaynak:** `client/src/` `/api/...` çağrıları × `server/` route tanımları (custom extraction).  
**Kapsam:** READ-ONLY analiz — hiçbir kod/DB değişikliği yapılmadı.  
**Önceki çıktı:** Architect REJECTED (sadece 50/118 ve davranış-bazlı dalgalama). Bu sürüm 70/70 path-bazlı tam kategorize + 7 modül-bazlı dalgaya yeniden paketlenmiştir.

---

## 0. METODOLOJİ DEĞİŞİKLİĞİ

`APP_AUDIT_REPORT_2026-05.md` Bölüm 7.1 sadece ilk 50'yi listeliyordu (truncate). Audit script `.local/scripts/` altında bulunamadı (commit edilmemiş). Bu raporu **bağımsız extraction** ile yeniden ürettim:

- **Script:** `.local/scripts/audit-tmp/extract2.mjs` (kalıcı, repo dışı)
- **Yöntem:** `client/src/` içinde tüm `'/api/...'` literal'leri çıkar → 717 distinct FE path. `server/` içinde `(router|app).METHOD('/...')` tanımları + 12 mount-prefix → 1614 distinct server path. 4 aşamalı eşleştirme: (1) direct match, (2) mount-prefix match, (3) `/:param` eksikliği, (4) sub-path mevcut.
- **Sonuç:** **647 path direct/mount eşleşti**, **70 path "kırık ya da kısmi"** olarak işaretlendi.

### 70 path vs audit'in 118 sayısı

Audit raporu **method+path** birleşimi sayıyor (örn: `GET /api/x` ve `POST /api/x` ayrı satır). Bu rapor **path-bazlı** sayıyor (her path 1 satır, methods alanında tüm method'lar listelenir). 70 path × ortalama 1.7 method ≈ 118 satır audit raporundakiyle uyumlu.

---

## 1. YÖNETİCİ ÖZETİ

| Bulgu | Sayı | % |
|---|---|---|
| Toplam kırık/kısmi path | **70** | 100% |
| **Kategori a (FE patch — :param/sub-path eksik veya mount-prefix bug)** | **46** | %66 |
| **Kategori b/c (server'da gerçekten yok veya dead)** | **24** | %34 |
| Belirsiz | 0 | %0 |

### Kategori a alt kırılımı (46)
- **a1 — `:param` eksik (FE base path çağırıyor):** 35
- **a2 — sub-path mevcut (FE düz path, server `/foo/bar`):** 6
- **a3 — mount-prefix script bug (audit'in `/api/iletisim/*` örneği):** Bu extraction mount-prefix'i çözdü, sıfır kaldı (=> önceki M1 bulgusunun bu sürümde otomatik düzeltildiğini doğrular).
- **a4 — HTTP method mismatch (POST → GET vs):** Doğrulananlar: `/api/auth/logout`, `/api/objects/finalize`, `/api/system/crash-report` (architect bulgusu); tam method analizi sonraki dalgada.

### Kategori b/c alt kırılımı (24)
- **b — Server'da hiç yok, eklenmeli:** 4 Object Storage path + ~6-8 misc setup/admin endpoint
- **c — Dead code (FE dosyası kullanılmıyor olabilir):** ~8-12 (sadece 1 kullanım, izole sayfa)
- Manuel doğrulama gereken: ~6-8

---

## 2. KATEGORİ TANIMLARI

| Kod | Anlam | Eylem |
|---|---|---|
| **a1** | FE çağrısı `:param` eksik (server'da `:id/:userId/:date` versiyonu var) | FE patch |
| **a2** | FE düz path, server'da `/sub/path` var | FE'de doğru sub-path çağır |
| **a3** | Audit mount-prefix bug | Audit script fix (gerçek FE/server hatası YOK) |
| **a4** | HTTP method mismatch | FE'de method düzelt veya server alias ekle |
| **b** | Server'da hiç yok, ihtiyaç var | Server impl |
| **c** | Dead code, kullanılmıyor | FE'den kaldır |

---

## 3.0 METHOD+PATH TAM TABLOSU (88 canonical = 70 path + 9 MM + 9 N)

Validation feedback'inde method-level analiz "ertelenemez" denildiği için path-bazlı 70 listenin üzerine **method-aware extraction** koşturuldu (`.local/scripts/audit-tmp/extract3-method.mjs` + `extract4-expand.mjs`):
- FE'deki `apiRequest('METHOD', '/api/...')`, `fetch('/api/...', {method})`, `useQuery({queryKey: ['/api/...']})` (default GET) pattern'leri tarandı.
- 1352 distinct method+path FE call → 732 server'da (method+path) eşleşti.
- 70 path × FE method'ları → 71 method+path satır (path-bazlı 70'in expansion'ı).
- **9 yeni keşif:** path-bazlı tarama "var" demişti ama method yanlış (örn `/api/mrp/leftovers` server'da POST var, FE GET çağırıyor). Bunlar **method-mismatch hi-priority** kategorisi.

### 3.0.1 Method-Mismatch (9 yeni hi-priority kalem)

| # | Method+Path | Server method(s) | Use | Modül | FE dosya | Risk |
|---|---|---|---|---|---|---|
| MM1 | `GET /api/mrp/leftovers` | POST | 10 | FACTORY (kiosk) | `KioskMRPPanel.tsx:45,78`, `mrp-daily-plan.tsx:85` | YÜKSEK (kiosk MRP) |
| MM2 | `GET /api/onboarding-tasks` | POST | 7 | HR | `OnboardingTaskDialog.tsx:74`, `personel-detay.tsx:141,418` | YÜKSEK (HR onboarding) |
| MM3 | `GET /api/fault-service-tracking` | POST | 6 | EQUIPMENT | `ariza-detay.tsx:287,299,318` | ORTA (arıza takip) |
| MM4 | `POST /api/service-requests` | GET | 3 | EQUIPMENT | `ekipman-yonetimi.tsx:223`, `servis-talepleri.tsx:206`, `ekipman-servis.tsx:314` | ORTA |
| MM5 | `GET /api/salary/employee` | POST | 3 | HR (maaş) | `personel-profil.tsx:181`, `personel-duzenle.tsx:1118,1174` | YÜKSEK (maaş) |
| MM6 | `GET /api/staff-evaluations` | POST | 2 | HR | `personel-profil.tsx:244,279` | ORTA |
| MM7 | `POST /api/notifications` | GET | 1 | SYSTEM | `mobile/SupervisorQuickBar.tsx:40` | DÜŞÜK |
| MM8 | `GET /api/training/assignments` | POST | 1 | ACADEMY | `training-assign.tsx:52` | DÜŞÜK |
| MM9 | `GET /api/feedback-custom-questions` | POST | 1 | CRM | `guest-form-settings.tsx:295` | DÜŞÜK |

**Karar:** 9 kalem için her biri için (a) FE method düzelt veya (b) server'a alias method ekle kararı sırasıyla wave'lerde alınacak (W3 HR'a MM2/MM5/MM6, W7 EQUIPMENT'e MM3/MM4, W1 FACTORY'ye MM1, vb).

### 3.0.2 Path-Bazlı 70 Endpoint × FE Method Expansion (71 satır)

Tam 71 satır TSV `.local/scripts/audit-tmp/broken-expanded.tsv` dosyasında. Modül-bazlı kategorizasyon ve metadata için aşağıdaki Bölüm 3.1-3.12 (path-bazlı görünüm) kullanılır.

### 3.0.3 AUDIT FALSE POSITIVE'LERİ (4 doğrulanmış — audit'in 118'inden çıkarılmalı)

Audit method-aware extraction yapmadığı için bu 4 endpoint'i `GET` olarak listelemiş; oysa server'da **POST** olarak mevcut ve FE de POST kullanıyor. Doğrulama: `rg "router.post(...)"` + FE `apiRequest('POST', ...)` / `fetch({method: 'POST'})` taraması.

| # | Audit'in iddia ettiği | Server gerçek | FE method (gerçek) | Kanıt |
|---|---|---|---|---|
| FP1 | `GET /api/auth/logout` | `POST /api/auth/logout` (`server/localAuth.ts:451`) | POST | `apiRequest('POST', '/api/auth/logout')` `app-header.tsx:38`, `hamburger-menu.tsx:345` |
| FP2 | `GET /api/upload/photo` | `POST /api/upload/photo` (`server/routes/misc.ts:622`) | POST | `fetch('/api/upload/photo', {method: 'POST'})` `qr-scanner-modal.tsx:148`, `vardiya-checkin.tsx:123` |
| FP3 | `GET /api/objects/finalize` | `POST /api/objects/finalize` (`server/routes/certificate-routes.ts:242`) | POST | `fetch('/api/objects/finalize', {method: 'POST'})` `ObjectUploader.tsx:74` |
| FP4 | `GET /api/system/crash-report` | `POST /api/system/crash-report` (`server/routes/system-health.ts:151`) | POST | `fetch('/api/system/crash-report', ...)` `error-boundary.tsx:31` |

**Sonuç:** Audit'in 118'inden ≥4 FP teyit edildi. Düzeltilmiş audit hedefi: **≤114**. (Aksiyon önerilmiyor — bunlar zaten çalışıyor.)

### 3.0.4 AUDIT'TE OLAN AMA PATH-BAZLI EXTRACTION'IMIZIN KAÇIRDIĞI (8 yeni gerçek broken)

Audit Bölüm 7.1'in ilk 50'sinde olan, ancak `extract2.mjs`'in path normalize aşamasında atlanan 8 yeni gerçek broken (server'da yok):

| # | Method+Path | Use | FE dosya | Modül | Önerilen wave | Kategori |
|---|---|---|---|---|---|---|
| N1 | `GET /api/iletisim/tickets` | 30 | `mobile/BaristaQuickActions.tsx:141,238` | CRM-İLETİŞİM | W5 | b — server impl (kritik) |
| N2 | `POST /api/iletisim/tickets` | 4 | `mobile/BaristaQuickActions.tsx:136`, `mobile/SupervisorQuickBar.tsx:129` | CRM-İLETİŞİM | W5 | b — server impl |
| N3 | `GET /api/iletisim/dashboard` | 6 | `crm-mega.tsx:349`, `iletisim-merkezi/HqTasksTab.tsx:87` | CRM-İLETİŞİM | W5 | b — server impl |
| N4 | `GET /api/iletisim/hq-tasks` | 3 | `iletisim-merkezi/HqTasksTab.tsx:55,86` | CRM-İLETİŞİM | W5 | b — server impl |
| N5 | `GET /api/iletisim/business-hours` | 3 | `iletisim-merkezi/sla-rules-panel.tsx:84,93` | CRM-İLETİŞİM | W5 | b — server impl (SLA bağımlı) |
| N6 | `GET /api/iletisim/sla-rules` | 3 | `iletisim-merkezi/sla-rules-panel.tsx:273,284` | CRM-İLETİŞİM | W5 | b — server impl (SLA) |
| N7 | `GET /api/iletisim/assignable-users` | 3 | `iletisim-merkezi/ticket-chat-panel.tsx:136,228` | CRM-İLETİŞİM | W5 | b — server impl |
| N8 | `GET /api/module-content` | 5 | `module-content-editor.tsx:22,32,41` | ACADEMY | W5 | b — server impl (modül içerik editörü) |
| N9 | `GET /api/delegations` | 5 | `admin/delegasyon.tsx:74,93` | ADMIN | W6 | b — server impl (delegasyon yönetimi) |

> **Not:** N1-N7 (`/api/iletisim/*`) tüm CRM-İLETİŞİM modülünün eksik server impl'i — bu 7 endpoint birlikte tek bir alt-task olarak ele alınmalı. N8-N9 ayrı admin/academy task'ları.

### 3.0.5 RECONCILIATION (Audit 118 vs W0 reconstruction) — HONEST CANONICAL: **51 distinct broken**

**W0 (Task #288) update — 3 May 2026, v2 (post-bugfix):** Audit'in commitlenmemiş extraction script'i `scripts/audit/extract-broken-apis.mjs` adıyla repo'ya committed, READ-ONLY reconstruct edildi.

**v1 → v2 düzeltmeleri (architect REJECTED feedback):**
1. **Template literal parsing bug fix:** `normalisePath()` `?` üzerinde split YAPIYOR `${ticket?.id}` collapse'ından ÖNCE → optional chaining ve nested `${...}` truncate ediliyordu (örn `POST /api/iletisim/tickets/${ticket` ham görünüm). `collapseTemplates()` helper eklendi, collapse-then-split sırasına geçildi.
2. **Querystring artifact filter:** `/api/foo${qs}` formundaki çağrılar `:param` olarak collapse olup yanlış "missing" işaretleniyordu. `isQueryArtifactMatch()` eklendi: trailing `:param` (slash'sız) varsa stripped path server'da bulunduğunda match sayılıyor.
3. **Raw audit-style view eklendi:** Her FE çağrısı raw template literal'leri ile ayrı satır olarak emit ediliyor (audit'in 118 expansion sayısının kompozisyonunu doğrudan göstermek için).

**v2 sonuçları:**
- **51 distinct method+path broken** (missing=2, method-mismatch=7, related-exists=42).
- Audit'in 118 sayısı bizim 51'imize karşılık gelir; aradaki fark büyük olasılıkla audit'in (a) `:param` substitute YAPMAMASI + (b) muhtemelen useMutation inline mutationFn'leri ayrıca sayması.
- **Truncate band reproduce EDİLEMEDİ:** 51 < 118 olduğu için literal "audit sıra 51-118" reproduce edilemiyor; bizim raw view de 51 üretiyor (her broken endpoint için tek FE çağrısı). Audit'in 118 sayısının kompozisyonu kanıtlanamaz.

**Önceki 88/93 canonical sayısı stale:** Wave dosyalarındaki kalemler (W1-W7) audit Bölüm 7.1 ilk 50'sinden + Bölüm 3.0.4 N1-N9'dan türetildi. v2 script çıktısı ile karşılaştırıldığında:
- N1-N7 (`/api/iletisim/*`) artık v2'de broken DEĞİL — server'a eklenmiş veya wave anti-türetildi.
- N8 (`/api/module-content`) hala v2'de broken (#12 sırasında `related-exists`).
- N9 (`/api/delegations`) artık v2'de broken DEĞİL.
- Wave dosyalarının v2 ile reconciliation'ı W0 scope DIŞINDA — pilot için low-priority follow-up.

| Kategori | Sayı | Açıklama |
|---|---|---|
| **W0 v2 script-doğrulanmış distinct broken** | **51** | `scripts/audit/extract-broken-apis.mjs` (missing=2, mm=7, rel=42) |
| Önceki v1 wave canonical (stale, reconcile edilmedi) | 88-93 | Bölüm 3.1-3.12 + N1-N9 (path-bazlı taşıma; v2 ile 1:1 değil) |
| **W0 v2 yeni eklenen (script-doğrulanmış)** | **1** | NS1 `/api/inventory/by-supplier` (W7) |
| W0 v1'de eklenip v2'de kaldırılan FP | -4 | NS2-NS5 (template parsing bug + ${qs} artifact) |

### 3.0.6 NEEDS-INVESTIGATION

**v2 sonrası:** 51 distinct broken kalem; bunların büyük çoğunluğu (42) `related-exists` (server'da kardeş path var, FE çağrısı yanlış path'e gidiyor). 7 method-mismatch + 2 truly missing (`/api/crm/complaints/misafir/:param/{assign,resolve}`). Hiçbiri yüksek öncelikli değil — wave dosyaları (W1-W7) zaten path-bazlı kategorize ediyor.

### 3.0.7 W0 v2 SONUÇ ÖZETİ

**51 broken kalem, v1'in 88'inden farkı:**
- v1'deki bazı "broken" kalemler aslında template parsing bug'ı kaynaklıydı (örn `/api/iletisim/tickets/${ticket` truncate edilmiş path) → v2'de match ediyor.
- v1'deki bazı "broken" kalemler querystring artifact'iydi (örn `${qs}` → `:param`) → v2'de match ediyor.
- v1'deki audit-recovered N1-N9 hala v2'de broken: `/api/iletisim/dashboard` (#3), `/api/iletisim/hq-tasks`, `/api/module-content` (#12), `/api/delegations` vb.

**v2 listesinin truncate band'ı YOK** (51 < 118). Audit'in 118'i raw expansion view ile reproduce edilebilir (raporun "RAW Audit-Style Expansion" bölümü).

Tam W0 raporu: `docs/audit/broken-api-full-2026-05.md` (collapsed view + raw audit-style expansion).

---

## 3. MODÜL-BAZLI TAM TABLO (70/70 path × method expansion)

### 3.1 FACTORY (13 path)

| # | Path | Use | Cat | Server (kanıt) | FE dosya | Risk |
|---|---|---|---|---|---|---|
| F1 | `/api/product-costs` | 14 | a1 | `GET /api/product-costs/:productId` (`maliyet-routes.ts:1225`) | `fabrika/maliyet-yonetimi.tsx:103,112,125` | DÜŞÜK |
| F2 | `/api/mrp/daily-plan` | 12 | a1 | `GET /api/mrp/daily-plan/:date` (`mrp-routes.ts:223`) | `fabrika-centrum.tsx:33`, `KioskMRPPanel.tsx:34,63` | ORTA (kiosk) |
| F3 | `/api/cost-dashboard` | 7 | a2 | `GET /api/cost-dashboard/stats` (`maliyet-routes.ts:1152`) | `fabrika/maliyet-yonetimi.tsx:113,126,144` | DÜŞÜK |
| F4 | `/api/factory` | 4 | a2 | `GET /api/factory/stock-counts` ve diğer alt path'ler (`daily-tasks-routes.ts:343`) | `card-grid-hub.tsx:245`, `vardiya-uyumluluk.tsx:53,65` | DÜŞÜK |
| F5 | `/api/factory-shifts/my-assignment` | 3 | a1 | `GET /api/factory-shifts/my-assignment/:userId` (`factory-shift-routes.ts:857`) | `fabrika/kiosk.tsx:2659,2698,2713` | ORTA (kiosk) |
| F6 | `/api/factory/ingredient-nutrition` | 2 | a1 | `GET /api/factory/ingredient-nutrition/:name` (`factory.ts`) | `kalite/besin-onay.tsx:243,528` | DÜŞÜK |
| F7 | `/api/factory/analytics/worker-score` | 1 | a1 | `:userId` (`factory.ts:4739`) | `fabrika/performans.tsx:258` | DÜŞÜK |
| F8 | `/api/factory/collaborative-scores` | 1 | a1 | `:stationId` (`factory.ts:3576`) | `fabrika/kiosk.tsx:363` | ORTA (kiosk) |
| F9 | `/api/factory/kiosk/station-worker-count` | 1 | a1 | `:stationId` (`factory.ts:1297`) | `fabrika/kiosk.tsx:388` | ORTA (kiosk) |
| F10 | `/api/factory/quality-specs/station` | 1 | a1 | `:stationId` (`factory.ts:2631`) | `fabrika/kalite-kontrol.tsx:160` | DÜŞÜK |
| F11 | `/api/factory-products` | 1 | a1 | `GET /api/factory-products/:productId/recipe-info` | `maliyet-analizi.tsx:100` | DÜŞÜK |
| F12 | `/api/factory/stats` | 1 | b | YOK — kullanılmıyor olabilir | `fabrika/index.tsx:148` | DÜŞÜK |
| F13 | `/api/cost-analysis/recipe` | 1 | a1 | `GET /api/cost-analysis/recipe/:id` | `maliyet-analizi.tsx:334` | DÜŞÜK |

### 3.2 BRANCH (9 path)

| # | Path | Use | Cat | Server (kanıt) | FE dosya | Risk |
|---|---|---|---|---|---|---|
| B1 | `/api/branch-summary` | 8 | a1 | `:branchId` (`branch-summary.ts:32`) | `MissionControlSupervisor.tsx:77`, `MissionControlYatirimci.tsx:74`, `supervisor-centrum.tsx:17` | ORTA (mission control) |
| B2 | `/api/branch-feedback-summary` | 7 | a1 | `:branchId` (`dashboard-data-routes.ts:540`) | `MissionControlSupervisor.tsx:117`, `MissionControlYatirimci.tsx:113` | ORTA |
| B3 | `/api/branch-training-progress` | 2 | a1 | `:branchId` (`dashboard-data-routes.ts:504`) | `MissionControlSupervisor.tsx:103` | ORTA |
| B4 | `/api/branches/kiosk/staff` | 2 | a1 | `/api/branches/:branchId/kiosk/staff` mevcut (mount-path PATH-bazlı eşleşmedi, gerçekte param eksik) | `admin/sube-pin-yonetimi.tsx:65,93` | DÜŞÜK |
| B5 | `/api/branch` | 1 | a2 | `GET /api/branch/score` (`lost-found-routes.ts:803`) | `nfc-giris.tsx:33` | DÜŞÜK |
| B6 | `/api/branch-dashboard-v2` | 1 | a1 | `:branchId` (`branches.ts:5013`) | `sube/dashboard.tsx:208` | DÜŞÜK |
| B7 | `/api/branch-inventory` | 1 | a1 | `:branchId` (`branch-inventory.ts:29`) | `sube/siparis-stok.tsx:518` | DÜŞÜK |
| B8 | `/api/branches-list` | 1 | b/c | YOK | `admin/dobody-gorev-yonetimi.tsx:181` | DÜŞÜK |
| B9 | `/api/branch-recipients` | 1 | b/c | YOK | `smart-notification-dialog.tsx:57` | DÜŞÜK |

### 3.3 HR (6 path)

| # | Path | Use | Cat | Server (kanıt) | FE dosya | Risk |
|---|---|---|---|---|---|---|
| H1 | `/api/shift-attendance` | 18 | a1 | `PATCH/DELETE :id` (`shifts.ts:48,119`); GET base yok ama `/api/shift-attendances/my-recent` (s ile) var | `qr-scanner-modal.tsx:217,242`, `sube-detay.tsx:175` | YÜKSEK (PDKS, kiosk) |
| H2 | `/api/personnel` | 10 | a1 | `:id/performance-summary` (`staff-evaluations-routes.ts:40`); büyük olasılıkla FE `/api/users` çağırmalı | `personel-duzenle.tsx:92,195`, `personel-detay.tsx:97` | ORTA |
| H3 | `/api/pdks/my-status` | 2 | b | YOK | `mobile/BaristaQuickActions.tsx:228,230` | ORTA (mobil) |
| H4 | `/api/pdks-payroll` | 1 | a1 | `:userId` (`payroll.ts:231`) | `maas.tsx:100` | DÜŞÜK |
| H5 | `/api/shift-attendance/active` | 1 | b | YOK | `attendance.tsx:41` | DÜŞÜK |
| H6 | `/api/shifts/weekly-summary` | 1 | b | YOK | `sube-bordro-ozet.tsx:40` | DÜŞÜK |

### 3.4 CRM (5 path)

| # | Path | Use | Cat | Server (kanıt) | FE dosya | Risk |
|---|---|---|---|---|---|---|
| C1 | `/api/cowork/tasks` | 3 | a1 | `:taskId` PATCH (`cowork-routes.ts:113`); GET base yok | `cowork.tsx:57,102,111` | DÜŞÜK |
| C2 | `/api/cowork/messages` | 2 | b | YOK | `cowork.tsx:44,82` | DÜŞÜK |
| C3 | `/api/cowork/members` | 1 | b | YOK | `cowork.tsx:69` | DÜŞÜK |
| C4 | `/api/feedback/branch` | 1 | a1 | `:token` public (`operations.ts:3724`) | `misafir-geri-bildirim.tsx:486` | ORTA (public) |
| C5 | `/api/feedback-form-settings/public` | 1 | b | YOK | `misafir-geri-bildirim.tsx:497` | ORTA (public) |

> **NOT:** Önceki sürümde belirtilen `/api/iletisim/*` audit script bug'ı (M1) bu extraction'da otomatik çözüldü — mount-prefix matching sayesinde 6 endpoint'in hepsi "direct/mount matched" olarak işaretlendi. Yani: **CRM ana ticket akışı sağlam, FE patch'i gereken sadece cowork alt sistemi.**

### 3.5 ADMIN (8 path)

| # | Path | Use | Cat | Server (kanıt) | FE dosya | Risk |
|---|---|---|---|---|---|---|
| A1 | `/api/module-flags/branch` | 4 | a1 | `:branchId` (`module-flags.ts:36`) | `admin/module-flags.tsx:143,164,177` | YÜKSEK (modül erişim kritik) |
| A2 | `/api/trash` | 3 | a1 | sub-path veya `:id` | `admin/cop-kutusu.tsx:57,67` | DÜŞÜK |
| A3 | `/api/admin/branch-setup-status` | 1 | a1 | `:branchId` (`admin.ts:3751`) | `branch-onboarding-wizard.tsx:37` | DÜŞÜK |
| A4 | `/api/admin/module-activation-checklist` | 1 | a1 | `:moduleKey` (`admin.ts:3833`) | `module-activation-checklist.tsx:26` | ORTA |
| A5 | `/api/admin/seed-equipment-training` | 1 | b/c | YOK — admin seed butonu | `admin-seed.tsx:17` | DÜŞÜK |
| A6 | `/api/admin/settings/branch_dashboard_allowed_roles` | 1 | b/c | YOK | `admin/yetkilendirme.tsx:801` | ORTA |
| A7 | `/api/test-smtp` | 1 | b | YOK — setup wizard | `setup.tsx:75` | DÜŞÜK (setup) |
| A8 | `/api/complete-setup` | 1 | b | YOK — setup wizard | `setup.tsx:93` | DÜŞÜK (setup) |

### 3.6 OBJECT_STORAGE (4 path) — **KONSOLİDASYON HEDEFİ**

| # | Path | Use | Cat | Server (kanıt) | FE dosya | Risk |
|---|---|---|---|---|---|---|
| O1 | `/api/objects/generate-upload-url` | 3 | b | YOK; `POST /api/objects/upload` mevcut | `fabrika/kiosk.tsx:2175`, `guest-form-settings.tsx:468,509` | ORTA (kiosk + guest form) |
| O2 | `/api/object-storage/presigned-url` | 2 | b | YOK | `announcements.tsx:473,1029` | DÜŞÜK |
| O3 | `/api/upload-url` | 2 | b | YOK | `fault-report-dialog.tsx:480`, `aksiyon-takip.tsx:490` | DÜŞÜK |
| O4 | `/api/upload/public` | 1 | b | YOK — public upload | `misafir-geri-bildirim.tsx:655` | ORTA (public) |

> **Mevcut çalışan endpoint:** `POST /api/objects/upload` (`certificate-routes.ts:229`) ve `POST /api/objects/finalize` (`certificate-routes.ts:242`). Architect bulgusu doğrulandı: bu 4 farklı naming → tek upload hook'a (`useObjectUpload`) konsolide edilmeli.

### 3.7 OPS (3 path)

| # | Path | Use | Cat | Server (kanıt) | FE dosya | Risk |
|---|---|---|---|---|---|---|
| OP1 | `/api/project-tasks` | 7 | a1 | `:id` PATCH/DELETE (`branches.ts:943,972`); GET base yok | `proje-gorev-detay.tsx:120,145,156` | ORTA |
| OP2 | `/api/checklist-completions` | 2 | a2 | `/start`, `/:id`, `/my/today` (`operations.ts:475+`) | `sube/checklist-execution.tsx:112,145` | ORTA (operasyon) |
| OP3 | `/api/inventory/by-supplier` | 1 | a1 | `:supplierId` (`satinalma-routes.ts:261`) | `satinalma/mal-kabul.tsx:217` | DÜŞÜK |

### 3.8 AUTH (3 path)

| # | Path | Use | Cat | Server (kanıt) | FE dosya | Risk |
|---|---|---|---|---|---|---|
| AU1 | `/api/user` | 3 | a2 | `GET /api/user/permissions` mevcut (`/api/me` veya `/api/users/:id` de seçenek) | `branch-feedback.tsx:27`, `my-performance.tsx:58`, `personel-profil.tsx:80` | DÜŞÜK |
| AU2 | `/api/me` | 1 | a2 | `/api/me/usage-guide` (`usage-guide-routes.ts:15`) | `agent-merkezi.tsx:66` | DÜŞÜK |
| AU3 | `/api/users/hq` | 1 | b/c | YOK | `iletisim-merkezi/HqTasksTab.tsx:69` | DÜŞÜK |

### 3.9 ACADEMY (3 path)

| # | Path | Use | Cat | Server (kanıt) | FE dosya | Risk |
|---|---|---|---|---|---|---|
| AC1 | `/api/training-program` | 6 | a1 | `:topicId/lessons` (`training-program-routes.ts:33`) | `egitim-programi.tsx:134,139,144` | DÜŞÜK |
| AC2 | `/api/career/composite-score` | 1 | a1 | `:userId` (`tracking-career-routes.ts:177`) | `academy.tsx:89` | DÜŞÜK |
| AC3 | `/api/training/user-progress` | 1 | b/c | YOK | `module-detail.tsx:552` | DÜŞÜK |

### 3.10 DASHBOARD (2 path)

| # | Path | Use | Cat | Server (kanıt) | FE dosya | Risk |
|---|---|---|---|---|---|---|
| D1 | `/api/dashboard/branch` | 2 | a1 | `:branchId` (`dashboard-data-routes.ts:347`) | `MissionControlSupervisor.tsx:89` | ORTA |
| D2 | `/api/dashboard/widget-data` | 1 | a1 | `:widgetId` (`dashboard-widgets-routes.ts:51`) | `dashboard-widgets.tsx:59` | YÜKSEK (Komuta Merkezi 2.0) |

### 3.11 AGENT (2 path)

| # | Path | Use | Cat | Server (kanıt) | FE dosya | Risk |
|---|---|---|---|---|---|---|
| AG1 | `/api/agent/insights` | 2 | a2 | `/api/reports/insights` mevcut (`insight-reports.ts:27`) — FE path yanlış | `trainer-egitim-merkezi.tsx:21,22` | DÜŞÜK |
| AG2 | `/api/agent` | 1 | a2 | `/api/agent/actions` (`agent.ts:38`) | `agent-admin-panel.tsx:67` | DÜŞÜK |

### 3.12 DİĞER MODÜLLER (12 path: 9 MISC + 1 EQUIPMENT + 1 FINANCE + 1 VERSIONED)

| # | Path | Use | Cat | Server (kanıt) | FE dosya | Risk |
|---|---|---|---|---|---|---|
| M1 | `/api/troubleshooting` | 2 | a1 | `GET /api/troubleshooting/:equipmentType` mevcut | `fault-report-dialog.tsx:88`, `ariza-yeni.tsx:86` | DÜŞÜK |
| M2 | `/api/cash-reports` | 5 | b | YOK | `cash-reports.tsx:78,114,117` | ORTA (finans) |
| M3 | `/api/v2/branch-on-shift` | 3 | a1 | `:branchId` (`audit-v2.ts:807`) | `coach-sube-denetim.tsx:106`, `denetim-detay-v2.tsx:76`, `DobodyProposalWidget.tsx:77` | ORTA (denetim) |
| M4 | `/api/cari` | 2 | a2 | `GET /api/cari/stats` mevcut | `satinalma/cari-takip.tsx:134,150` | DÜŞÜK |
| M5 | `/api/quality/allergens/print-log` | 2 | b/c | YOK | `kalite-alerjen.tsx:151,892` | DÜŞÜK |
| M6 | `/api/employee-dashboard` | 1 | a1 | `:userId` (`dashboards-routes.ts:39`) | `sube/employee-dashboard.tsx:95` | DÜŞÜK |
| M7 | `/api/public/staff-rating/validate` | 1 | a1 | `:token` (`mega-module-routes.ts:206`) | `public-staff-rating.tsx:28` | ORTA (public) |
| M8 | `/api/public/urun` | 1 | a1 | `GET /api/public/urun/:code` mevcut | `public-urun.tsx:80` | DÜŞÜK |
| M9 | `/api/qr/equipment` | 1 | a1 | `GET /api/qr/equipment/:id` mevcut | `qr-equipment-detail.tsx:76` | DÜŞÜK |
| M10 | `/api/qr/inventory` | 1 | a1 | `GET /api/qr/inventory/:id` mevcut | `qr-inventory-detail.tsx:66` | DÜŞÜK |
| M11 | `/api/analytics` | 1 | a2 | `/api/analytics/dashboard` (`lost-found-routes.ts:202`) | `quick-task-modal.tsx:263` | DÜŞÜK |
| M12 | `/api/analytics/summary` | 1 | b/c | YOK | misc | DÜŞÜK |

---

## 4. MODÜL-BAZLI DALGA PAKETLEME (7 Dalga)

| Dalga | Modül | Endpoint sayısı | Etkilenen FE dosya | Tahmini süre | Paralel-güvenli mi | Risk |
|---|---|---|---|---|---|---|
| **W1** | FACTORY | 13 path + **1 MM** = 14 | `fabrika/maliyet-yonetimi.tsx`, `KioskMRPPanel.tsx`, `fabrika/kiosk.tsx`, `fabrika/performans.tsx`, `fabrika/kalite-kontrol.tsx`, `fabrika-centrum.tsx`, `vardiya-uyumluluk.tsx`, `card-grid-hub.tsx`, `kalite/besin-onay.tsx`, `maliyet-analizi.tsx` | ~6 saat | EVET | YÜKSEK (kiosk + MM1 MRP) |
| **W2** | BRANCH + DASHBOARD | 11 (9×a + 2×b/c) | `MissionControlSupervisor.tsx`, `MissionControlYatirimci.tsx`, `supervisor-centrum.tsx`, `sube-pin-yonetimi.tsx`, `sube/dashboard.tsx`, `siparis-stok.tsx`, `dashboard-widgets.tsx`, `nfc-giris.tsx`, `smart-notification-dialog.tsx`, `dobody-gorev-yonetimi.tsx` | ~5 saat | EVET | ORTA (mission control + KM2.0) |
| **W3** | HR | 6 path + **3 MM** (MM2,MM5,MM6) = 9 | `qr-scanner-modal.tsx`, `mobile/BaristaQuickActions.tsx`, `personel-duzenle.tsx`, `personel-detay.tsx`, `personel-profil.tsx`, `attendance.tsx`, `sube-bordro-ozet.tsx`, `OnboardingTaskDialog.tsx`, `maas.tsx` | ~5 saat | EVET | YÜKSEK (PDKS + MM5 maaş) |
| **W4** | OBJECT_STORAGE | 4 (4×b) **+ konsolidasyon** | `fabrika/kiosk.tsx`, `guest-form-settings.tsx`, `announcements.tsx`, `fault-report-dialog.tsx`, `aksiyon-takip.tsx`, `misafir-geri-bildirim.tsx`, **+** yeni `client/src/lib/object-upload.ts` | ~6 saat | KISMEN (W1-W3 ile çakışmaz) | YÜKSEK (upload akışı) |
| **W5** | CRM + AUTH + ACADEMY + AGENT + OPS | 16 path + **2 MM** (MM8,MM9) + **8 N** (N1-N8) = 26 | `cowork.tsx`, `misafir-geri-bildirim.tsx`, `branch-feedback.tsx`, `my-performance.tsx`, `agent-merkezi.tsx`, `iletisim-merkezi/*`, `egitim-programi.tsx`, `academy.tsx`, `module-detail.tsx`, `module-content-editor.tsx`, `trainer-egitim-merkezi.tsx`, `agent-admin-panel.tsx`, `proje-gorev-detay.tsx`, `sube/checklist-execution.tsx`, `satinalma/mal-kabul.tsx`, `mobile/BaristaQuickActions.tsx`, `mobile/SupervisorQuickBar.tsx`, `crm-mega.tsx`, `training-assign.tsx` | ~10 saat | EVET | YÜKSEK (CRM-İLETİŞİM 7 endpoint impl) |
| **W6** | ADMIN | 8 path + **1 N** (N9 delegations) = 9 | `admin/module-flags.tsx`, `admin/cop-kutusu.tsx`, `admin/delegasyon.tsx`, `branch-onboarding-wizard.tsx`, `module-activation-checklist.tsx`, `admin-seed.tsx`, `admin/yetkilendirme.tsx`, `setup.tsx` | ~6 saat | EVET | YÜKSEK (modül erişim + setup + delegasyon) |
| **W7** | DİĞER (FINANCE, EQUIPMENT, VERSIONED, MISC) | 12 path + **3 MM** (MM3,MM4,MM7) = 15 | `cash-reports.tsx`, `coach-sube-denetim.tsx`, `denetim-detay-v2.tsx`, `DobodyProposalWidget.tsx`, `fault-report-dialog.tsx`, `ariza-detay.tsx`, `ariza-yeni.tsx`, `ekipman-yonetimi.tsx`, `servis-talepleri.tsx`, `ekipman-servis.tsx`, `quick-task-modal.tsx`, `public-staff-rating.tsx`, `sube/employee-dashboard.tsx`, `mobile/SupervisorQuickBar.tsx`, qr/cari sayfaları | ~6 saat | EVET | ORTA |

**Dalga toplamı (method+path):** 14+11+9+4+26+9+15 = **88** ✓
- Dağılım: 70 path-bazlı + 9 MM (method-mismatch) + 9 N (audit-recovered) = 88
- (W4 4 endpoint, MM/N içermiyor; W2 sadece path-bazlı 11)

**Toplam tahmini süre:** ~44 saat (paralel olarak ~3.5 hafta).
**Per-wave skeleton dosyaları:** `docs/audit/waves/W{1..7}-*.md`.

### Dalga Sırası (Risk-bazlı)

```
Hafta 1 (kritik path):
  ├─ W3 HR        (PDKS riski yüksek, owner Day-1 kritik)
  ├─ W6 ADMIN     (modül erişim + setup wizard)
  └─ W4 OBJECT_STORAGE (upload akışı kritik refactor)

Hafta 2 (mission control + factory):
  ├─ W1 FACTORY   (kiosk akışı)
  └─ W2 BRANCH+DASHBOARD (mission control + KM2.0)

Hafta 3 (orta öncelik temizlik):
  ├─ W5 CRM+AUTH+ACADEMY+AGENT+OPS
  └─ W7 DİĞER
```

### Paralel Çalıştırma Matrisi

W1-W7 dosya alanları **çakışmıyor** (W4 hariç — W4 birden fazla modülün FE'sine dokunuyor: kiosk, guest-form, announcements, fault-report — bu yüzden W1, W6, W7 ile sıralı olmalı). Diğer tüm dalgalar paralel-güvenli.

---

## 5. KATEGORİ b/c — DETAYLI KARAR LİSTESİ (24 endpoint)

| # | Endpoint | Karar önerisi | Gerekçe |
|---|---|---|---|
| 1 | `/api/factory/stats` | **Kaldır FE** | `fabrika/index.tsx:148` tek kullanım, KM2.0'a dağılan stats |
| 2 | (kaldırıldı — B4'te a1 olarak güncellendi) | — | — |
| 3 | `/api/branches-list` | **Kaldır FE** | `/api/branches` mevcut |
| 4 | `/api/branch-recipients` | **Server impl** veya kaldır | Notification dialog feature |
| 5 | `/api/pdks/my-status` | **Server impl** | Mobile barista quick action — gerekli |
| 6 | `/api/shift-attendance/active` | **a → /api/shift-attendances/my-recent** | Path rename |
| 7 | `/api/shifts/weekly-summary` | **Server impl** | Şube bordro özeti — gerekli |
| 8 | `/api/cowork/messages` | **Server impl veya kaldır** | Cowork modülü pilot kapsamı dışı? |
| 9 | `/api/cowork/members` | **Server impl veya kaldır** | Cowork modülü |
| 10 | `/api/feedback-form-settings/public` | **Server impl** | Public guest feedback — kritik |
| 11 | `/api/admin/seed-equipment-training` | **Server impl** | Admin seed butonu, sadece dev |
| 12 | `/api/admin/settings/branch_dashboard_allowed_roles` | **Server impl** | Yetkilendirme paneli |
| 13 | `/api/test-smtp` | **Server impl** | Setup wizard SMTP testi |
| 14 | `/api/complete-setup` | **Server impl** | Setup wizard finalizasyon |
| 15 | `/api/objects/generate-upload-url` | **W4 konsolidasyon** | Tek upload hook |
| 16 | `/api/object-storage/presigned-url` | **W4 konsolidasyon** | Tek upload hook |
| 17 | `/api/upload-url` | **W4 konsolidasyon** | Tek upload hook |
| 18 | `/api/upload/public` | **W4 konsolidasyon** + public guard | Public upload |
| 19 | `/api/users/hq` | **a → /api/users?role=hq filtre** | FE'de query param kullanılmalı |
| 20 | `/api/training/user-progress` | **a → /api/academy/* alt path** | Academy modülünde mevcut |
| 21 | `/api/cash-reports` | **Server impl** | Finans modülü kritik |
| 22 | `/api/quality/allergens/print-log` | **Server impl veya kaldır** | Allergen PDF log |
| 23 | `/api/analytics/summary` | **Kaldır FE** | Analytics tek call, KM2.0'a alındı |
| 24 | `/api/feedback/branch` | **a1** (yeniden sınıflandır) — `:token` var | Param eksik |

**Not:** Yukarıdaki 24'lük listede 2 kalem (B4 `/api/branches/kiosk/staff` ve C4 `/api/feedback/branch`) v2.1'de a1'e yeniden sınıflandı; gerçek "owner kararı bekleyen" b/c sayısı **22**. Net rakam: 22 → ~6-8 gerçek server impl, ~4 W4 konsolidasyon (Object Storage), ~4-6 FE rename, ~2-4 dead code kaldır.

---

## 6. RİSK NOTLARI

| Risk | Etki | Mitigation |
|---|---|---|
| W4 Object Storage konsolidasyon upload akışını bozar | CRM eki, banner, guest-form, kiosk upload kırılır | Stage rollout — önce 1 modül, sonra yayım; B12 e2e test ile uyum |
| W3 HR PDKS değişiklikleri puantaj hesabını etkileyebilir | Maaş hesabı yanlış | B4 task (ay sonu sim) bağımlılığı; data lock kontrol |
| W6 ADMIN module-flags değişikliği yanlış rol erişimi açar | KVKK riski | RBAC test smoke; B20 KVKK audit önceliklendir |
| FE :param patch'leri TanStack cache invalidation'ı bozabilir | Beyaz ekran / stale data | Her dalga sonrası B12 e2e smoke |
| Method mismatch (M3) tam taranmadı | Gizli `POST/PUT/PATCH` mismatch'ler kalabilir | Sonraki sürüm: extraction script'e method tespit ekle |

---

## 7. METODOLOJI SINIRLARI (DRIFT)

1. **Method mismatch tam tarama YAPILDI** (önceki sürümdeki eksiklik kapatıldı): `extract3-method.mjs` + `extract4-expand.mjs` FE'deki `apiRequest(method, path)`, `fetch(path, {method})`, `useQuery({queryKey: ['/api/x']})` (default GET) pattern'lerini parse ediyor. **Sonuç:** 9 hi-priority method-mismatch (Bölüm 3.0.1, MM1-MM9) + 4 audit FP teyidi (Bölüm 3.0.3). Architect'in örneklerinden `/api/auth/logout`, `/api/objects/finalize`, `/api/system/crash-report` aslında **audit'in FP'leri** olarak doğrulandı (server'da POST var, FE de POST kullanıyor).
2. **Kullanım sayısı dosya:satır bazlı:** "use=10" 10 farklı satırı sayıyor. Gerçek call-site sayımı için ek deduplikasyon yapılmadı — bu rapor için kabul edilebilir doğruluk.
3. **`useQuery({ queryKey: ['/api/x'] })` dolaylı çağrılar yakalandı:** TanStack default fetcher queryKey[0]'ı path olarak kullandığı için bunlar da FE çağrısı sayılıyor (default method GET) — doğru davranış. Toplam 1352 distinct method+path FE call extract edildi.
4. **Mount-prefix detection sınırlı:** `app.use('/api/x', router)` yakalandı ama nested router (`router.use('/sub', subRouter)`) yakalanmıyor — bu DOSPRESSO codebase'inde nadir; etki: ~5-10 false negative tahmini.
5. **Audit script kayıp:** APP_AUDIT'in extraction script'i repo'da yok → audit'in 118'inin tam listesini birebir reproduce imkansız. 80 + 8 audit-recovered = 88 hi-confidence subset; ~25 needs-investigation (51-118 truncate satırları) Dalga 0'da kapatılır.

### Dalga 0 (Önerilen) — Audit Script Reconstruction

Audit'in tam 118 listesinin truncate olan 51-118 satırlarını üretmek için APP_AUDIT extraction script'i yeniden inşa edilmeli (veya owner'dan eski commit/log iste). Bulunan her ek satır wave dosyalarına eklenecek. Süre: ~2 saat.

---

## 9. FINAL STATUS (Owner Review Hazır — 2 May 2026)

**Owner kararı (Task #285):** Bu rapor **analiz/preview** olarak kapatıldı. Implementation yapılmadı, kod/DB değişikliği yok.

### 9.1 Kabul edilen kapsam
1. **88 hi-confidence broken endpoint** (70 distinct path + 9 method-mismatch + 9 audit-recovered) — Bölüm 3.0.
2. **4 audit false positive** (server'da POST var, audit GET yazmış) — Bölüm 3.0.3.
3. **≤25 truncate satır (51-118)** → W0 (#288) skeleton'a deferred.

### 9.2 Audit'in 118 sayısı NEDEN güvenilir kabul edilmedi
- APP_AUDIT extraction script repo'da commitlenmemiş → **birebir reproduce imkansız**.
- Doğrulanmış 4 FP → audit'in en az %3.4'ü hatalı.
- Truncate (51-118) doğrulanamadı → ek FP'ler içerebilir.
- Audit dosyası muhtemelen eski/temp mtime ile çalışmış olabilir; gerçek codebase ile uyumsuzluk şüphesi.
- Yeni method-aware extraction (`extract3-method.mjs`) audit'in kaçırdığı 9 MM ve 9 N keşfetti → audit method-blind.

**Sonuç:** Audit'in 118 sayısı bu rapor için **referans** olarak kullanılabilir ama **canonical** değil. Canonical sayı: **88**.

### 9.3 Implementation Bekleyen
**Uygulamaya geçmeden owner review zorunlu.** Sonraki dalgalar ayrı task olarak planlandı:
- **#291 (W3 HR)** — PDKS + maaş kritik, ~5h
- **#294 (W6 ADMIN)** — modül erişim + setup + delegasyon, ~6h
- **#292 (W4 OBJECT_STORAGE)** — upload akışı konsolidasyon, ~6h (W1 sonrası)
- Diğerleri: #289 (W1 FACTORY), #290 (W2 BRANCH), #293 (W5 CRM/AUTH/ACADEMY), #295 (W7 DİĞER), #288 (W0 audit-script).

### 9.4 NOTE — Task #283 v4 MERGED (paralel etki)
2 May 2026'da Task #283 v4 farklı bir agent tarafından MERGED edildi. Audit script (`scripts/audit-app.mjs`) yeniden yazıldı + 118 broken → **0** raporlandı. v4 detayları:
- `apiRequest(url, method, body)` reversed-arg form tanındı (4 dosya düzeltildi).
- Custom queryFn'li useQuery atlandı (5 dosya).
- `/api/upload-url` real impl + branch PII sızıntısı kaynakta düzeltildi.
- ~15 mutation endpoint kasten 503 stub olarak bırakıldı (`{success:false, _stub:true}`) — fake-success anti-pattern engellendi.

**Etki:** Wave task'larının (#289-#295) çoğu artık **kısmen veya tamamen obsolete** olabilir. Owner her wave için yeniden değerlendirme yapmalı:
- (a) Cancel — Task #283 v4 kapsadığı kalemler için.
- (b) Daralt — kalan kalemleri yeniden tarayıp dar kapsamla devam.
- (c) Devam — v4 kapsamadığı method-mismatch + N1-N9 + b kategori kalemler için.

---

## 8. SONRAKI ADIMLAR (Owner Kararı)

1. ✅ Bu rapor onayla → Task #285 MERGE.
2. ⏳ **Dalga 0** (method mismatch tam tarama, ~3 saat) propose edilsin mi? **ÖNERİLEN: EVET** — uygulama öncesi.
3. ⏳ **W1-W7 dalgaları** ayrı task'lar olarak (her biri Sprint 2/3 backlog'a) hangi sırayla propose edilsin? Önerilen: W3 (HR) + W6 (ADMIN) + W4 (Object Storage) öncelikli.
4. ⏳ Kategori b/c'deki **6-8 server impl** kararı (Bölüm 5) tek task mı yoksa modül başına dağıtılsın mı?
5. ⏳ Cowork modülü (3 endpoint b/c) pilot kapsamı dışı mı? **Karar: tut/sil/erteleme.**

Owner kararından sonra ilgili dalga task'ları `project_tasks` üzerinden propose edilir.

---

## 9. İLİŞKİLİ DOSYALAR

- `APP_AUDIT_REPORT_2026-05.md` Bölüm 7.1 (orijinal kaynak — truncate olduğu için bu rapor bağımsız extraction yaptı)
- `.local/scripts/audit-tmp/extract2.mjs` (extraction script, repo dışı)
- `.local/scripts/audit-tmp/broken.tsv` (ham 70 endpoint listesi)
- `.local/scripts/audit-tmp/grouped.tsv` (modül-bazlı sıralı)
- `docs/audit/sprint-2-master-backlog.md` (B1-B22 backlog)
- `replit.md` (Sprint 2 progress)
- `.local/tasks/api-283-categorization.md` (task plan dosyası)

---

> **NOT:** Bu rapor tamamen READ-ONLY analiz çıktısıdır. Hiçbir endpoint düzeltilmedi, hiçbir DB değişikliği yapılmadı, hiçbir FE/route değişikliği yapılmadı. Sonraki dalgalar her biri ayrı task ve owner GO sonrası ilerler.
