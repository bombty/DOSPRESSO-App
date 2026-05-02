# DOSPRESSO — Çok Perspektifli Sistem Değerlendirmesi

Replit Agent gözünden 31 rol × 326 sayfa × 1.768 endpoint × 455 tablo üzerine kapsamlı değerlendirme + eksik/optimize tespiti.

Tarih: 2 Mayıs 2026  
Hazırlayan: Replit Agent (READ-ONLY analiz, mevcut audit + kod tabanı keşfi)  
Önceki audit: `docs/audit/DOSPRESSO_FULL_AUDIT_2026-04-26.md` (62 KB, 18 bölüm) — bu rapor onu **tamamlar ve günceller**, eskimiş bulguları işaretler  
Kapsam: Güvenlik, performans, veri bütünlüğü, UX, mevzuat, operasyonel — 6 perspektif  
Status: **YENİ AUDIT** — Sprint 2 master backlog'a önerilen ekler

---

## 0. KAPSAM METRİKLERİ

| Metrik | Değer | Kaynak |
|---|---|---|
| **Toplam rol (UserRole enum)** | **31** | `shared/schema/schema-01.ts:52-98` |
| **Aktif DB kullanıcı** | 372 | FULL_AUDIT 1.2 |
| **Frontend sayfa** | **326** | `client/src/pages/**/*.tsx` |
| **Backend endpoint** | **1.768** | `router.(get|post|patch|put|delete)` ripgrep |
| **Backend route dosyası** | 118 | `server/routes/*.ts` |
| **Schema dosyası** | 23 | `shared/schema/*.ts` |
| **DB tablosu (Drizzle export)** | 455 | `pgTable(` ripgrep |
| **DB tablosu (canlı)** | 444 (Apr-26) → 457 (Apr-27 sonrası) | drift kapatıldı (md. baseline) |
| **App.tsx Route** | 266 | `<Route` count |
| **Module flag (manifest)** | 100+ | `shared/module-manifest.ts` |
| **Mr. Dobody skill** | 17 | FULL_AUDIT 8.2 |
| **Scheduler job** | 30+ | FULL_AUDIT 9.2 |

**Yorum:** Sistem büyük (1.768 endpoint, 455 tablo, 326 sayfa). Bu boyut **tek seferde tek dokümanda tam audit edilemez** — bu rapor **yüksek seviye perspektif + kritik bulgu listesi** sunar, detay her bölüm için ayrı plan dokümanı önerir.

---

## 1. YÖNETİCİ ÖZETİ — 5 KRİTİK BULGU

| # | Bulgu | Severity | Önerilen Aksiyon |
|---|---|---|---|
| **K1** | ~~**`delegation-routes.ts` 5 endpoint TAMAMEN AUTH YOK**~~ | ✅ ÇÖZÜLDÜ (Task #279) | Kod zaten korumalı (bkz. Bölüm 2.2 G1). Audit bulgusu eskimişti. |
| **K2** | ~~**`ROLE_MODULE_DEFAULTS` tablosunda 16 rol eksik**~~ | ✅ ÇÖZÜLDÜ NO-OP (Task #281) | **Teşhis hatası:** `ROLE_MODULE_DEFAULTS` (`shared/modules-registry.ts:384`) **dead code** — 0 import. Gerçek erişim `role_module_permissions` DB tablosu (3127 satır, 31 rol DOLU) → `GET /api/me/permissions`. 5 pilot rol (ceo, cgo, mudur, fabrika_mudur, sube_kiosk) modül listesi `psql` ile doğrulandı. Pilot etkisi YOK. Konsolidasyon Sprint 3 B21'e taşındı. Detay: bkz. Bölüm 11. |
| **K3** | **Eski/legacy roller hâlâ enum'da** (`muhasebe`, `teknik`, `destek`, `fabrika`, `yatirimci_hq`) — geriye dönük uyumluluk için, ama dökümante edilmemiş; karışıklık riski | 🟡 ORTA | Sprint 2 sonu — temizlik veya açık dökümante |
| **K4** | **31 roldan sadece 13'ü TEST-MATRIX'te** — eksik 18 rol (factory floor 5 rol + HQ marketing/trainer/kalite_kontrol + branch hiyerarşi 3 rol + factory recete_gm + legacy 5) | 🟡 ORTA | Sprint 2 hafta 2 — TEST-MATRIX genişlet |
| **K5** | **326 sayfadan 208'i kök seviyede dağınık** (sadece 12 sayfa kategorize klasörlerde — admin/yonetim/fabrika/sube/crm/satinalma/hq/akademi/iletisim/kalite) — navigasyon + nav-registry karmaşık | 🟢 DÜŞÜK | Sprint 3 — refactor (UI etkisi yok, kod organizasyonu) |

---

## 2. PERSPEKTİF 1 — GÜVENLİK

### 2.1 ✅ Tamamlanan (Sprint 1 + Sprint 2 başı)

- ✅ Şube + Fabrika kiosk PIN bcrypt + lockout + rate limit (Sprint 1)
- ✅ `POST /api/auth/register` artık public değil (Task #272 IMPLEMENTED, Sprint 2)
- ✅ `helmet` frameguard SAMEORIGIN (Task #272)
- ✅ `authLimiter` register + reset-password endpoint'lere mount (Task #272)
- ✅ Admin bootstrap log'undan bcrypt hash_prefix temizlendi (Task #272)
- ✅ HQ kiosk plaintext PIN — risk kabul edildi (md. 14), Sprint 2 plan hazır

### 2.2 🔴 Açık Güvenlik Bulguları (YENİ — bu audit)

| # | Bulgu | Risk | Konum | Önerilen Fix |
|---|---|---|---|---|
| **G1** | ~~`delegation-routes.ts` 5 endpoint AUTH YOK~~ | ✅ ÇÖZÜLDÜ (2 May 2026, Task #279 doğrulama) | `server/routes/delegation-routes.ts:20` | **Kod zaten korumalı:** `router.use(isAuthenticated)` + GET/POST/PATCH/DELETE handler'larında `isAdminRole(['admin','ceo'])` rol kontrolü mevcut. GET `/active` sadece kendi role'ünün aktif delegation'larını döner. Anonim `/api/delegations` çağrıları **401** dönüyor (curl ile doğrulandı). Audit bulgusu eskimiş — son commit'lerde sertleştirilmiş. |
| **G2** | ~~`module-content-routes.ts` 5 endpoint AUTH YOK (CRUD!)~~ | ✅ ÇÖZÜLDÜ (2 May 2026, Task #279 doğrulama) | `server/routes/module-content-routes.ts:14` | **Kod zaten korumalı:** `router.use(isAuthenticated)` + tüm POST/DELETE handler'larında `isAdminRole(['admin','ceo'])` kontrolü mevcut. GET `/api/module-content/:moduleKey` authenticated user'a (yayınlanmış departman+topic listesi) açık. Anonim çağrılar **401** dönüyor (curl 5/5 endpoint doğrulandı). |
| **G3** | `crm-iletisim.ts` 16 endpoint `AuthRequest` tipinde ama `isAuthenticated` middleware görünmüyor | 🟡 ORTA (doğrulanmalı) | `server/routes/crm-iletisim.ts:126-781` | DOĞRULA: muhtemelen üst seviye `app.use('/api/crm-iletisim', isAuthenticated, ...)` mount, ama belirtilmemiş |
| **G4** | `mega-module-routes.ts` 4 public endpoint (staff-qr + staff-rating) | 🟢 PUBLIC kasıtlı (QR feedback) | `server/routes/mega-module-routes.ts:28,66,206,245` | Token expiry + rate limit doğrulanmalı |
| **G5** | `/api/export/*` 19 endpoint AUTH YOK (FULL_AUDIT Issue #2 — 26 Apr) | 🔴 KRİTİK (eski bulgu) | FULL_AUDIT Bölüm 2 | Sprint 2 hafta 1 — tüm export endpoint'ler `isAuthenticated` + role check |
| **G6** | Pilot parola "0000" 157 kullanıcı için aktif (FULL_AUDIT A5) | 🔴 YÜKSEK | `server/index.ts` startup log | B9 (Task #274) — pilot bittikten sonra zorunlu parola değişimi akışı |
| **G7** | Login lockout in-memory (FULL_AUDIT A3) | 🟡 ORTA | `server/localAuth.ts` | Sprint 2 — DB'ye taşı (autoscale + restart resistance) |
| **G8** | `ProtectedRoute` admin baypas riski (FULL_AUDIT A1) | 🟡 ORTA | `client/src/components/ProtectedRoute.tsx` | `strictRoles=true` her sayfada zorlanmıyor — audit + fix |
| **G9** | `OPENAI_API_KEY` env var ikili (`OPENAI_API_KEY` + `AI_INTEGRATIONS_OPENAI_API_KEY`) | 🟢 DÜŞÜK | Env config | Tek isim standardize (Sprint 3) |
| **G10** | `SESSION_SECRET` rotation politikası YOK | 🟡 ORTA | env | 6 ayda bir rotasyon politikası dökümante |

### 2.3 Genel Güvenlik Skoru

- **Sprint 1 öncesi:** 4/10 (HQ kiosk plaintext, register public, helmet eksik, log sızıntı)
- **Sprint 2 başı (Task #272 sonrası):** 6/10 (register guard + frameguard + log temizliği yapıldı)
- **Sprint 2 sonrası hedef (G1-G10 kapatılırsa):** 8/10
- **Production grade hedef:** 9/10 (B1 + G1-G10 + secret rotation + WAF)

---

## 3. PERSPEKTİF 2 — PERFORMANS

### 3.1 Mevcut İyi Pratikler

- ✅ TanStack Query staleTime=5dk, gcTime=10dk (cache verimliliği)
- ✅ Vite build (modern bundler)
- ✅ Drizzle ORM + index'ler (45+ index migration ile eklendi — Apr-26)
- ✅ React-window virtualization (büyük listelerde)

### 3.2 Performans Riskleri (YENİ — bu audit)

| # | Risk | Severity | Konum | Önerilen Fix |
|---|---|---|---|---|
| **P1** | `factory.ts` ~7000 satır tek dosya — değişiklik yapınca tüm endpoint regression riski | 🟡 ORTA | `server/routes/factory.ts` | Sprint 3 — modüler ayır (factory-batches, factory-plans, factory-recipes — kısmen yapıldı) |
| **P2** | `App.tsx` 944 satır + 266 route — initial JS bundle büyük | 🟡 ORTA | `client/src/App.tsx` | Lazy loading: `React.lazy()` + Suspense, route bazlı code splitting |
| **P3** | 30+ scheduler job tek process'te (FULL_AUDIT 9.3) — Replit autoscale'de paralel instance riski (advisory lock yok) | 🔴 YÜKSEK (autoscale öncesi) | `server/services/agent-scheduler.ts` | Sprint 2 — `pg_advisory_lock` veya distributed lock (Issue #11) |
| **P4** | OpenAI çağrıları rate limited ama cost guard yok | 🟡 ORTA | `server/ai.ts` | B10 (Task #275) — aylık bütçe + token sayacı |
| **P5** | `/api/me/dashboard-data` unified endpoint — widget collector pattern serializ çağrılar yapıyor olabilir | 🟡 ORTA | `unified-dashboard-routes.ts` | Profile et — paralel `Promise.all` doğrula |
| **P6** | `nav-registry.ts` 871 satır — her sayfa render'da rol bazlı filter yapılıyor | 🟢 DÜŞÜK | `client/src/lib/nav-registry.ts` | useMemo + role-based memoization (zaten var mı doğrula) |
| **P7** | Embedding storage `vector(1536)` — pgvector index var mı? | ❓ BELİRSİZ | Mr. Dobody RAG | DB inceleme: `\d academy_articles` ile vector index doğrula |

### 3.3 Performans Test Eksikleri

- ❌ Load test YOK (Pilot 270 kullanıcı + 1768 endpoint için kapasite testi yapılmadı)
- ❌ Lighthouse CI YOK
- ❌ Database slow query log monitoring YOK

---

## 4. PERSPEKTİF 3 — VERİ BÜTÜNLÜĞÜ & DB

### 4.1 ✅ Tamamlanan

- ✅ Schema/DB drift kapatıldı (Task #255, Apr-26): 13 eksik tablo, 4 UNIQUE, 83 index, 47 FK
- ✅ Migration süreci dökümante (replit.md + drizzle-kit baseline)
- ✅ Soft delete pattern (`deleted_at` çoğu tablo)
- ✅ Data lock mekanizması (status + zaman bazlı)

### 4.2 🟡 Açık Veri Bütünlüğü Sorunları

| # | Sorun | Severity | Konum | Çözüm |
|---|---|---|---|---|
| **D1** | `shift_attendance.check_out_time` NULL kalıyor (3 endpoint) | 🟡 ORTA → ✅ Task #273 IMPLEMENTED | branches.ts + factory.ts | Çözüldü, post-merge bekliyor |
| **D2** | `pdks_daily_summary` Excel-bazlı vs sistem `shift_attendance` arasında sync yok | 🟡 ORTA | Task #276 PROPOSED | B11 — kapanış endpoint'lerinde sync |
| **D3** | 42 kolon tipi/null mismatch (drift kapsamı dışı kalmış) | 🟡 ORTA | `docs/audit/db-drift-report-2026-04-26.md` | Sprint 2/3 — kolon kolon değerlendir |
| **D4** | 47 FK `NOT VALID` ile eklenmiş | 🟡 ORTA | Task #255 migration | Sprint 3 — `VALIDATE CONSTRAINT` çalıştır (background, downtime risk düşük) |
| **D5** | `users.work_start_date` var mı? (B3 plan dosyasında soru) | ❓ BELİRSİZ | schema-01.ts | İK izin bakiye sistemi için doğrulama gerekli |
| **D6** | Audit log tablosu kullanım % | ❓ BELİRSİZ | schema-XX | Hangi endpoint'ler audit log yazıyor, hangileri yazmıyor — denetlenmeli |
| **D7** | Soft-deleted kullanıcı PIN ile login olabilir mi? (TEST-MATRIX kontrol etmiş ama otomatik test yok) | 🟡 ORTA | kiosk login endpoint | Test ekle (B12 ile) |
| **D8** | Hard delete yapılmış olabilir mi? (md. 8 ile yasak) | ❓ BELİRSİZ | Audit log + DB | "Bu satır var mıydı?" rapor sistemi yok |

---

## 5. PERSPEKTİF 4 — UX & FRONTEND

### 5.1 ✅ İyi Pratikler

- ✅ Shadcn/ui + Tailwind + dark mode
- ✅ Mission Control 6 dashboard rol bazlı
- ✅ Mobile responsive (touch-friendly)
- ✅ i18n (Türkçe öncelik)
- ✅ KPIStrip, ModuleSidebar standardize

### 5.2 🟡 UX Sorunları (Pilot Day-1 Etkisi)

| # | Sorun | Severity | Etki | Çözüm |
|---|---|---|---|---|
| **U1** | Reçete detay sayfası nadiren spinner'da kalır (md. 28) | 🟢 DÜŞÜK (geçici çözüm var) | Hard refresh çözer | Post-pilot UX iyileştirme |
| **U2** | 326 sayfa, 208'i kök seviye → nav-registry karmaşık | 🟡 ORTA | Yeni geliştirici onboarding zor | Sprint 3 — klasör organizasyonu |
| **U3** | ~~16 rol için ROLE_MODULE_DEFAULTS yok~~ | ✅ ÇÖZÜLDÜ NO-OP (Task #281) | UI etkisi YOK — `role_module_permissions` DB 31 rol DOLU, `/api/me/permissions` normal döner. K2 düzeltmesi geçerli. |
| **U4** | Fabrika modülü 17 sayfa ama Day-1 scope S1+S2 (plan + batch) → fazla sayfa görünüyor olabilir | 🟡 ORTA | Eren'in beklentisi kafası karışabilir | F4 plan — module_flags ile gizle |
| **U5** | Kullanıcı dashboard'unda izin bakiye widget yok | 🟡 ORTA | Pilot personeli "kalan iznim ne?" sorabilir | B3 plan — yeni widget |
| **U6** | "Yardım" / "Kullanım kılavuzu" rolü bazlı içerik var mı? (`server/usage-guide-content.ts` kod tabanında) | ❓ BELİRSİZ | Onboarding zor | Doğrula + 31 rol için tamamla |
| **U7** | Bildirim merkezi 4 seviye var (operasyonel/taktik/stratejik/kişisel) — kullanıcı yorgunluğu? | ❓ BELİRSİZ | Pilot'ta ölçülecek | Day-1 sonrası retro'da değerlendir |
| **U8** | Loading state standardize değil (skeleton vs spinner vs blank) | 🟢 DÜŞÜK | UX tutarsızlığı | Sprint 3 — design system review |
| **U9** | Error boundary kapsamı belirsiz | 🟡 ORTA | Bir sayfada crash → tüm uygulama? | Audit + global ErrorBoundary |
| **U10** | Mobile kiosk ekranları gerçek tablet'te test edildi mi? | 🟡 ORTA | Touch + PWA + offline | Pre-Day-1 fiziksel test (CHECKLIST kapsıyor) |

---

## 6. PERSPEKTİF 5 — MEVZUAT (KVKK, 4857 İK, TGK)

### 6.1 KVKK (Kişisel Veri Koruma Kanunu)

| # | Kontrol | Durum | Detay |
|---|---|---|---|
| **M1** | Personel kişisel veri (TC kimlik, telefon, adres) şifrelenmiş mi? | ❓ BELİRSİZ | DB'de plaintext olabilir — audit gerekli |
| **M2** | Personel dosyası (PDF, sözleşme) sadece İK rolü erişebilir mi? | ❓ BELİRSİZ | Object storage RBAC doğrulanmalı |
| **M3** | Audit log — kim hangi kişisel veriye erişti? | ❓ BELİRSİZ | "Veri erişim logu" var mı? |
| **M4** | Sağlık raporu — sebep/teşhis YAZILMAZ kuralı | 🔴 EKSİK | B3 plan dosyasında zorunlu kıldı |
| **M5** | Veri silme talebi (KVKK 11. madde) için akış | ❌ YOK | Sprint 3 — KVKK compliance modülü |
| **M6** | Aydınlatma metni + açık rıza akışı | ❓ BELİRSİZ | Kullanıcı kayıt akışında var mı? |
| **M7** | Veri saklama süreleri politikası | ❌ YOK | Eski personel verisi ne kadar saklanır? |
| **M8** | Kiosk QR feedback — IP toplama YASAL mı? | ❓ BELİRSİZ | Müşteri feedback tarafında IP loglanıyor mu? |

### 6.2 4857 sayılı İş Kanunu

| # | Kontrol | Durum |
|---|---|---|
| **M9** | Yıllık izin hak hesabı (kıdem bazlı 14/20/26 gün) | ❌ EKSİK — B3 plan |
| **M10** | 18 altı + 50 üstü min 20 gün izin | ❌ EKSİK — B3 plan |
| **M11** | Hafta tatili (24 saat kesintisiz) | ❓ BELİRSİZ |
| **M12** | Yıllık izin ödeme (kullanılmayan izin işten ayrılırsa ödenir) | ❌ EKSİK |
| **M13** | Doğum izni (16 hafta), babalık izni (5 gün), evlilik izni (3 gün) | ❌ EKSİK — B3 plan |
| **M14** | Mesai limit (haftalık 45 saat) | ❓ BELİRSİZ — PDKS hesabında kontrol var mı? |
| **M15** | Asgari ücret + asgari geçim indirimi (AGİ) | ❓ BELİRSİZ |

### 6.3 TGK (Türk Gıda Kodeksi) — Etiket Mevzuatı

| # | Kontrol | Durum |
|---|---|---|
| **M16** | Besin değeri zorunlu beyan (kalori, protein, karbonhidrat, yağ, tuz) | 🟡 KISMİ (besin onay sistemi var) — B6 ile tamamlanır |
| **M17** | Alerjen vurgulama (14 ana alerjen, koyu/altı çizili) | 🟡 KISMİ — B6 ile tamamlanır |
| **M18** | Üretim/son kullanma tarihi | ❓ BELİRSİZ |
| **M19** | İzlenebilirlik (lot tracking) | 🟡 KISMİ — fabrika lot tablosu var |

---

## 7. PERSPEKTİF 6 — OPERASYONEL & DEVOPS

### 7.1 Mevcut

- ✅ Replit Workspace + Autoscale deploy
- ✅ Neon serverless Postgres
- ✅ Replit Object Storage + S3 uyumlu
- ✅ Drizzle migration süreci dökümante
- ✅ Workflow `Start application` healthy

### 7.2 🟡 Operasyonel Eksikler

| # | Eksik | Severity | Çözüm |
|---|---|---|---|
| **O1** | CI/CD pipeline YOK (push → otomatik test → deploy) | 🟡 ORTA | Sprint 3 — GitHub Actions veya Replit Deploy Pipeline |
| **O2** | Vitest test suite var ama düzenli koşmuyor (FULL_AUDIT) | 🔴 YÜKSEK | B12 + CI ile koşum |
| **O3** | Playwright E2E test YOK | 🔴 YÜKSEK | B12 (Task #277) |
| **O4** | Production monitoring (APM, error tracking) YOK | 🟡 ORTA | Sentry / LogRocket (Sprint 3) |
| **O5** | Log aggregation YOK (sadece Replit console log) | 🟡 ORTA | Production log retention politikası |
| **O6** | Backup otomasyonu — pilot Day-1 öncesi manuel | 🔴 YÜKSEK (Day-1) | Sprint 2 — pg_dump cron + S3 yedek |
| **O7** | Disaster recovery (DR) playbook YOK | 🟡 ORTA | Doc: "DB tamamen düşerse ne yapılır?" |
| **O8** | Health check endpoint formatı standardize değil | 🟢 DÜŞÜK | `/health` + `/health/db` + `/health/openai` standardize |
| **O9** | Secret rotation politikası YOK | 🟡 ORTA | SESSION_SECRET, OPENAI_API_KEY 6 ayda bir |
| **O10** | Feature flag sistemi (LaunchDarkly tarzı) YOK — sadece module_flags | 🟢 DÜŞÜK | Sprint 3 — A/B test desteği |

---

## 8. ROL-BAZLI DEĞERLENDİRME — 31 ROL

> **Mevcut TEST-MATRIX:** 13 rol kapsıyor (admin, ceo, cgo, gida_muhendisi, sef, fabrika_mudur, mudur, supervisor, barista, sube_kiosk, yatirimci_branch, muhasebe_ik, satinalma).
> **Bu rapor:** Eksik 18 rolü listeler + her rol için kritik durum.

### 8.1 Sistem Rolü (1)

| Rol | TEST-MATRIX | ROLE_MODULE_DEFAULTS | Durum | Aksiyon |
|---|---|---|---|---|
| `admin` | ✅ | ✅ (`['*']`) | İyi | — |

### 8.2 HQ Executive (2)

| Rol | TEST-MATRIX | ROLE_MODULE_DEFAULTS | Durum | Aksiyon |
|---|---|---|---|---|
| `ceo` (Aslan) | ✅ | ❌ EKSİK | 🔴 Modül görünürlüğü problem olabilir | Sprint 2 hafta 1 — defaults ekle |
| `cgo` | ✅ | ❌ EKSİK | 🔴 Aynı | Sprint 2 hafta 1 |

### 8.3 HQ Departman (8)

| Rol | TEST-MATRIX | ROLE_MODULE_DEFAULTS | Durum |
|---|---|---|---|
| `muhasebe_ik` (Mahmut) | ✅ | ❌ EKSİK | 🔴 Sprint 2 hafta 1 |
| `satinalma` (Samet) | ✅ | ✅ | İyi |
| `coach` (Yavuz) | ❌ | ✅ | 🟡 TEST-MATRIX'e ekle |
| `marketing` (Diana) | ❌ | ❌ | 🔴 İki kaynak da eksik |
| `trainer` (Ece) | ❌ | ✅ | 🟡 TEST-MATRIX'e ekle |
| `kalite_kontrol` (Ümran) | ❌ | ❌ | 🔴 İki kaynak da eksik |
| `gida_muhendisi` (Sema) | ✅ | ❌ EKSİK | 🔴 Defaults ekle |
| `fabrika_mudur` (Eren) | ✅ | ✅ | İyi |

### 8.4 HQ Eski/Legacy (5)

| Rol | TEST-MATRIX | ROLE_MODULE_DEFAULTS | Durum | Aksiyon |
|---|---|---|---|---|
| `muhasebe` (legacy) | ❌ | ✅ | 🟡 Hâlâ kullanılıyor mu? | Sprint 2 — kullanım denetimi, deprecated mi? |
| `teknik` (legacy) | ❌ | ✅ | 🟡 Aynı | Sprint 2 — denetim |
| `destek` | ❌ | ❌ | ❓ Hiç kullanılıyor mu? | Sprint 3 — temizle? |
| `fabrika` (legacy) | ❌ | ✅ | 🟡 `fabrika_mudur` ile fark? | Dökümante |
| `yatirimci_hq` | ❌ | ✅ | 🟡 yatirimci_branch ile fark? | Dökümante |

### 8.5 Branch Hiyerarşi (7)

| Rol | TEST-MATRIX | ROLE_MODULE_DEFAULTS | Durum |
|---|---|---|---|
| `stajyer` | ❌ | ❌ | 🔴 İki kaynak da eksik |
| `bar_buddy` | ❌ | ❌ | 🔴 Aynı |
| `barista` | ✅ | ✅ | İyi |
| `supervisor_buddy` | ❌ | ✅ | 🟡 TEST-MATRIX'e ekle |
| `supervisor` | ✅ | ✅ | İyi |
| `mudur` | ✅ | ❌ EKSİK | 🔴 Defaults ekle (KRİTİK — pilot kullanıcı) |
| `yatirimci_branch` | ✅ | ✅ | İyi |

### 8.6 Factory Floor (5)

| Rol | TEST-MATRIX | ROLE_MODULE_DEFAULTS | Durum |
|---|---|---|---|
| `uretim_sefi` | ❌ | ❌ | 🔴 İki kaynak da eksik |
| `fabrika_operator` | ❌ | ❌ | 🔴 Aynı |
| `fabrika_sorumlu` | ❌ | ❌ | 🔴 Aynı |
| `fabrika_personel` | ❌ | ❌ | 🔴 Aynı |
| `fabrika_depo` | ❌ | ❌ | 🔴 Aynı |

> **Not:** Factory floor 5 rol pilot Day-1 kapsamında olmayabilir (S0/S1+S2 scope), ama tanımları yapılmalı.

### 8.7 Factory Recipe (2)

| Rol | TEST-MATRIX | ROLE_MODULE_DEFAULTS | Durum |
|---|---|---|---|
| `sef` (Ümit) | ✅ | ❌ EKSİK | 🔴 Defaults ekle (pilot kullanıcı) |
| `recete_gm` | ❌ | ❌ | 🔴 İki kaynak da eksik (gida_muhendisi alternatifi mi?) |

### 8.8 Kiosk (1)

| Rol | TEST-MATRIX | ROLE_MODULE_DEFAULTS | Durum |
|---|---|---|---|
| `sube_kiosk` | ✅ | ❌ EKSİK | 🟡 Kiosk hiç modül görmemeli — defaults `[]` (boş) eklenebilir |

### 8.9 Rol Audit Özeti

- **Tam (TEST-MATRIX + Defaults):** 6 rol (admin, satinalma, barista, supervisor, fabrika_mudur, yatirimci_branch)
- **TEST-MATRIX var, Defaults eksik:** 7 rol (ceo, cgo, muhasebe_ik, gida_muhendisi, sef, mudur, sube_kiosk)
- **Defaults var, TEST-MATRIX eksik:** 5 rol (coach, trainer, supervisor_buddy, muhasebe-legacy, teknik-legacy, yatirimci_hq, fabrika-legacy)
- **İki kaynak da eksik:** 13 rol (marketing, kalite_kontrol, destek, stajyer, bar_buddy, factory floor 5, recete_gm)

**Toplam denetim açığı:** 25/31 rol = %81 eksik veya yarım.

---

## 9. SAYFA KATEGORİLERİ — 326 SAYFA

### 9.1 Sayfa Dağılımı

| Kategori | Sayfa | Durum | Sorun |
|---|---|---|---|
| **Kök seviye** | 208 | 🔴 Dağınık | Klasör yok, isimden kategori tahmin edilmek zorunda |
| **`admin/`** | 37 | 🟢 İyi organize | Hangi rol erişiyor? (admin + ceo?) |
| **`fabrika/`** | 17 | 🟢 | Day-1 scope S1+S2 → bir kısmı module_flags ile gizlenmeli |
| **`yonetim/`** | 11 | 🟡 admin/ ile fark? | Hangi rol? |
| **`iletisim-merkezi/`** | 11 | 🟢 | CRM modülü |
| **`akademi-hq/`** | 10 | 🟢 | LMS HQ |
| **`satinalma/`** | 9 | 🟢 | Samet |
| **`crm/`** | 8 | 🟢 | Müşteri |
| **`akademi-v3/`** | 5 | 🟢 | LMS v3 |
| **`sube/`** | 5 | 🟢 | Branch operasyonel |
| **`hq/`** | 2 | 🟡 | Sadece 2 sayfa? Diğerleri kök seviyede dağınık |
| **`kalite/`** | 1 | 🟡 | Sadece 1 sayfa? |

### 9.2 Sayfa-Bazlı Kritik Bulgular

| # | Sayfa | Bulgu |
|---|---|---|
| **S1** | `yonetim/ai-maliyetler.tsx` | ✅ AI maliyet sayfası MEVCUT — B10 (Task #275) öncesi hızlı kontrol gerek (UI var, backend tracking var mı?) |
| **S2** | `admin/ai-politikalari.tsx` | ✅ AI policy admin panel mevcut |
| **S3** | `admin/yapay-zeka-ayarlari.tsx` | ✅ AI ayar mevcut |
| **S4** | `admin/cop-kutusu.tsx` | ✅ Soft delete recovery mevcut (md. 8 ile uyumlu) |
| **S5** | `admin/yedekleme.tsx` | ✅ Backup UI mevcut — gerçek otomatik backup var mı doğrula (O6) |
| **S6** | `admin/aktivite-loglari.tsx` | ✅ Audit log UI mevcut (D6 — ne kadar dolu denetlenmeli) |
| **S7** | `admin/veri-kilitleri.tsx` | ✅ Data lock UI mevcut |
| **S8** | `admin/degisiklik-talepleri.tsx` | ✅ Change request workflow mevcut |
| **S9** | `admin/delegasyon.tsx` | 🔴 **G1 ile bağlantılı** — backend `delegation-routes.ts` AUTH YOK ama UI var |
| **S10** | `admin/email-ayarlari.tsx` | ✅ |
| **S11** | `admin/dobody-avatarlar.tsx` | ✅ Mr. Dobody avatar admin |
| **S12** | `admin/fabrika-pin-yonetimi.tsx` | ✅ Fabrika PIN admin (HQ kiosk PIN admin sayfası var mı? B1 plan ile bağlantılı) |
| **S13** | `admin/veri-disa-aktarma.tsx` | 🔴 `/api/export/*` 19 endpoint AUTH YOK (G5) ile bağlantılı — UI üzerinden zorlamalı RBAC |
| **S14** | `admin/fabrika-fire-sebepleri.tsx` | 🟢 |
| **S15** | Kök seviye `forgot-password.tsx` | ✅ Password reset akışı mevcut |
| **S16** | Kök seviye `academy-social-groups.tsx` | 🟢 LMS sosyal akış |

### 9.3 Eksik Sayfalar (Pilot/Sprint 2 İhtiyacı)

| # | Eksik Sayfa | İhtiyaç | Sprint |
|---|---|---|---|
| **N1** | İzin bakiye sayfası (kullanıcı + İK görünümü) | B3 (İzin sistemi) | Sprint 2 |
| **N2** | HQ kiosk PIN yönetimi (`admin/hq-pin-yonetimi.tsx`) | B1 (HQ PIN bcrypt) | Sprint 2 |
| **N3** | OpenAI cost tracking dashboard (S1 mevcut sayfa yeterli mi doğrula) | B10 | Sprint 2 |
| **N4** | Etiket statü yönetimi (taslak/onay/onaylı/revize) | B6 (reçete+etiket) | Sprint 3 |
| **N5** | KVKK veri silme talebi yönetimi | M5 | Sprint 3 |
| **N6** | Disaster recovery / health dashboard | O7 | Sprint 3 |
| **N7** | Pilot retro raporu sayfası | Pilot sonrası | — |

---

## 10. EKSİK + OPTİMİZE LİSTESİ — ÖNCELİK SIRALAMASI

### 🔴 KRİTİK — Sprint 2 Hafta 1 (Pilot bitimi sonrası ilk hafta)

| # | İş | Süre | Plan |
|---|---|---|---|
| 1 | **G1: `delegation-routes.ts` 5 endpoint AUTH ekle** | 1 saat | Yeni |
| 2 | **G2: `module-content-routes.ts` 5 endpoint AUTH ekle** | 1 saat | Yeni |
| 3 | **G5: `/api/export/*` 19 endpoint AUTH ekle** | 3 saat | FULL_AUDIT Issue #2 |
| 4 | ~~**K2/U3: ROLE_MODULE_DEFAULTS — 16 eksik rol ekle**~~ | ✅ ÇÖZÜLDÜ NO-OP (Task #281) | Bkz. §11.5 — dead code, `role_module_permissions` DB 31 rol DOLU |
| 5 | **B1: HQ PIN bcrypt + lockout** (Sprint 2 master backlog) | 4.5 saat | Plan ✅ |
| 6 | **G6/B9: Pilot "0000" parola değişimi akışı** | 2 saat | B1 ile birleşir |
| 7 | **P3: Scheduler advisory lock** (autoscale öncesi) | 3 saat | Yeni |
| 8 | **O6: pg_dump cron + S3 yedek otomasyonu** | 2 saat | Yeni |

**Toplam Sprint 2 Hafta 1:** ~18 saat

### 🟡 ORTA — Sprint 2 Hafta 2-3

| # | İş | Süre |
|---|---|---|
| 9 | B2 + B11: shift_attendance + pdks_daily_summary sync | 5 saat (B2 IMPLEMENTED, B11 ek scope) |
| 10 | B12: Kiosk vardiya E2E test | 3-4 saat |
| 11 | B7: Day-5 güvenlik paketi (Task #272 sonrası ek) | TBD |
| 12 | G3: crm-iletisim.ts auth doğrulama | 1 saat |
| 13 | G7: Login lockout DB'ye taşı | 3 saat |
| 14 | G8: ProtectedRoute strictRoles audit | 2 saat |
| 15 | K4: TEST-MATRIX'i 31 role genişlet | 4 saat |
| 16 | K3: Legacy rol denetimi + dökümante | 2 saat |

### 🟡 ORTA — Sprint 2 Hafta 4-6

| # | İş | Süre |
|---|---|---|
| 17 | B3: İzin/rapor/bakiye sistemi | 12 saat |
| 18 | B10: OpenAI cost monitoring | 3-4 saat |
| 19 | B5: Fabrika S3/S4 genişletme | 6-10 saat |
| 20 | B4: Ay sonu puantaj simülasyonu | 2 saat |
| 21 | P2: App.tsx lazy loading + code splitting | 4 saat |
| 22 | O2: Vitest CI entegrasyonu | 2 saat |
| 23 | M1-M8: KVKK audit + iyileştirme | 6 saat |

### 🟢 DÜŞÜK — Sprint 3+

| # | İş | Süre |
|---|---|---|
| 24 | B6: Reçete + besin + alerjen + etiket sistemi | 16-24 saat |
| 25 | B8: Rol Detaylı Rapor PDF | TBD |
| 26 | P1: factory.ts modüler ayrım | 8 saat |
| 27 | U2: 326 sayfa klasör reorganizasyonu | 6 saat |
| 28 | M5: KVKK veri silme akışı | 8 saat |
| 29 | O1, O4, O5, O8: CI/CD + monitoring + log + health | 12 saat |
| 30 | D3, D4: Drift kalan 42 mismatch + FK VALIDATE | 4 saat |

---

## 11.5 K2 / U3 DÜZELTMESİ — Modül Erişim Mekanizması Gerçek Haritası (Task #281, 2 May 2026)

K2 ve U3 bulguları **yanlış katmanı** işaret ediyordu. Sistemde **9 paralel rol/modül erişim mekanizması** var; gerçek tüketici DB tablosu zaten 31 rol için DOLU.

### Doğrulanmış gerçek mekanizma — `role_module_permissions` DB tablosu

```
psql sorgusu (2 May 2026):
  SELECT role, COUNT(*) FROM role_module_permissions GROUP BY role;
  → 31 rol, toplam 3127 satır
  → admin: 240, supervisor: 240, coach: 235, muhasebe: 231
  → ceo/cgo/mudur/sef/recete_gm/uretim_sefi/satinalma/trainer/fabrika_mudur/muhasebe_ik: 79
  → supervisor_buddy: 123, yatirimci_hq: 98
  → bar_buddy/barista/destek/fabrika*/gida_muhendisi/kalite_kontrol/marketing/stajyer/sube_kiosk/teknik/yatirimci_branch: 78
```

**Frontend kanal:** `GET /api/me/permissions` (`server/routes/certificate-routes.ts:751`) → `storage.getRolePermissions()` → `role_module_permissions` SELECT → `{ permissions: { module: actions[] } }` → mega-modules render.

**5 pilot rolün kritik modül kontrolü (PASS):**
| Rol | Modül sayısı | Kritik modüller |
|---|---|---|
| ceo | 79 | dashboard, hr, employees, equipment, shifts, tasks, users, akademi |
| cgo | 79 | dashboard, hr, employees, equipment, shifts, tasks |
| mudur | 79 | dashboard, employees, equipment, branch_inspection, branch_inventory, shifts |
| fabrika_mudur | 79 | factory_dashboard, factory_kiosk, factory_compliance, equipment, employees |
| sube_kiosk | 78 | dashboard, checklists, inventory, shifts, tasks, notifications |

### Sistemde 9 paralel modül erişim mekanizması

| # | Mekanizma | Kaynak | Durum | Tüketici |
|---|---|---|---|---|
| 1 | `role_module_permissions` DB | `shared/schema/schema-05.ts` | ✅ DOLU + KULLANILIYOR | `/api/me/permissions` → frontend mega-modules |
| 2 | `permission_actions` (269) + `role_permission_grants` (**0**) | `shared/schema` | ⚠️ YARIM RBAC v2 — `resolvePermissionScope` hep `false` döner | `permission-service.ts` |
| 3 | `module_flags` DB (93 satır, `target_role=NULL`) | `shared/schema` | ✅ kullanılıyor (kapı açma) | `requireModuleEnabled` middleware |
| 4 | `module-manifest.ts ALL_MODULES[].roles` | `shared/module-manifest.ts` | ⚠️ **FAIL-OPEN** (catch'te `next()`) | `requireManifestAccess` middleware |
| 5 | `MODULES[].roles` | `shared/modules-registry.ts` | ✅ | frontend `module-hub-page.tsx` |
| 6 | `dobody-proposals.ts` inline matris | `server/routes/dobody-proposals.ts:253-` | ✅ | Mr. Dobody scope |
| 7 | `dashboard_role_widgets` DB | `shared/schema` | ✅ | Komuta Merkezi 2.0 |
| 8 | `module-menu-config.ts allowedRoles` | `client/src/components/layout/` | ✅ | `RouteModuleSidebar` |
| 9 | `ROLE_MODULE_DEFAULTS` | `shared/modules-registry.ts:384` | ❌ **DEAD CODE, 0 import** | — (bu auditin yanlış işaret ettiği yer) |

### Pilot etkisi: SIFIR

CEO Aslan, mudur Erdem/Mahmut, fabrika_mudur Eren, sube_kiosk hepsi `role_module_permissions` üzerinden normal modül listesi görür. Audit'in "boş ekran" kaygısı geçersiz.

### Sprint 3'e taşınan işler

- **B21** — Modül erişim mimari konsolidasyon: 9 mekanizmayı haritala, naming drift kapat (`academy.ai` vs `academy_ai` vs `akademi-ai-assistant` — DB'de 243 distinct module vs 304 in `permission_modules`), RBAC v2 dead path (`role_permission_grants` boş) gömülü mü canlandır mı kararı.
- **B22** — `manifest-auth.ts` fail-open düzelt: `requireManifestAccess` middleware catch bloğu `next()` yerine `res.status(500)` dönmeli (G-serisi güvenlik bulgusu, pilot sonrası).

### Bu bölümün takibi

- `shared/modules-registry.ts:368` — `ROLE_MODULE_DEFAULTS` üstünde `@deprecated` JSDoc
- `replit.md` Role System notu düzeltildi
- `docs/audit/sprint-2-master-backlog.md` B14 → ÇÖZÜLDÜ NO-OP
- `docs/DECISIONS.md` madde 31

---

## 11. ÖNERİ — SPRINT 2 MASTER BACKLOG'A EKLENECEKLER

`docs/audit/sprint-2-master-backlog.md` mevcut B1-B12 listesine bu rapor sonucu **YENİ 8 iş** önerilir:

| Yeni # | İş | Severity | Süre | Açıklama |
|---|---|---|---|---|
| **B13** | Public endpoint sertleştirme (G1 + G2 + G5) | 🔴 KRİTİK | 5 saat | delegation, module-content, export endpoint'lerine AUTH ekle |
| ~~**B14**~~ | ~~ROLE_MODULE_DEFAULTS — 16 eksik rol tamamlama~~ | ✅ ÇÖZÜLDÜ NO-OP (Task #281) | — | Dead code, `role_module_permissions` DB 31 rol DOLU; bkz. §11.5 + DECISIONS#31 |
| **B15** | Scheduler advisory lock (P3) | 🔴 YÜKSEK | 3 saat | Autoscale öncesi ZORUNLU |
| **B16** | pg_dump cron + S3 yedek otomasyonu (O6) | 🔴 YÜKSEK | 2 saat | DR temeli |
| **B17** | Login lockout DB'ye taşı (G7) | 🟡 ORTA | 3 saat | Restart resistance |
| **B18** | TEST-MATRIX 31 role genişletme (K4) | 🟡 ORTA | 4 saat | Audit + dökümante |
| **B19** | Legacy rol denetimi + temizlik (K3) | 🟡 ORTA | 2 saat | muhasebe/teknik/destek/fabrika/yatirimci_hq |
| **B20** | KVKK audit + iyileştirme (M1-M8) | 🟡 ORTA | 6 saat | Hukuki risk |

**Sprint 2 toplam (B1-B20):** ~75-90 saat (~8-10 hafta)

---

## 12. SONUÇ

### 12.1 Sistem Genel Durumu

- ✅ **Pilot Day-1 için yeterli** — 4 birim kiosk testi geçti, 6 dashboard hazır, 11 commit pilot hazırlık
- ✅ **DB sağlığı temiz** — drift = 0
- ✅ **Sprint 1 tamam** — TEST-MATRIX, runbook'lar, plan dosyaları, GO/NO-GO checklist
- ⚠️ **Güvenlik kritik açıklar** — G1, G2, G5 (toplam 29 endpoint AUTH yok) — Sprint 2 hafta 1 zorunlu fix
- ✅ ~~**Rol/modül uyumsuzluğu** — 16/31 rol ROLE_MODULE_DEFAULTS'ta yok~~ — ÇÖZÜLDÜ NO-OP (Task #281): teşhis hatasıydı; gerçek mekanizma `role_module_permissions` DB tablosu 31 rol için DOLU. Mimari borç (9 paralel mekanizma) → Sprint 3 B21+B22.
- ⚠️ **Test coverage** — Vitest var ama düzenli koşmuyor, E2E yok
- 🟢 **Mevcut mimari sağlam** — büyük ama düzenli, refactor yerine hedefli iyileştirme yeterli

### 12.2 Sprint 2 Önerilen Yol Haritası

**Hafta 1 (KRİTİK güvenlik):**
- B13 (public endpoint AUTH) + B1 (HQ PIN) + ~~B14 (ROLE_MODULE_DEFAULTS)~~ ✅ NO-OP + B15 (advisory lock) + B16 (yedek ✅ Task #280)

**Hafta 2-3 (Pilot bug + test):**
- B11 (pdks sync) + B12 (E2E test) + B17 (lockout DB) + B19 (legacy rol)

**Hafta 4-6 (İK + maliyet + KVKK):**
- B3 (izin) + B10 (AI cost) + B20 (KVKK audit) + B5 (fabrika genişletme)

**Hafta 7-8 (Polish):**
- B4 (ay sonu) + B7 (Day-5 ek güvenlik) + B18 (TEST-MATRIX 31 rol)

### 12.3 Sprint 3+ (Post-Sprint 2)

- B6 (reçete+etiket) + B8 (rol PDF) + P1 (factory.ts refactor) + U2 (sayfa reorg) + M5 (KVKK silme) + O1/O4/O5 (CI/CD + monitoring)

---

## 13. İLİŞKİLİ DOKÜMANLAR

- `docs/audit/DOSPRESSO_FULL_AUDIT_2026-04-26.md` — Önceki tam audit (62 KB, 18 bölüm) — bu rapor onu **tamamlar**
- `docs/audit/pilot-readiness-current.md` — Pilot Day-1 hazırlık raporu
- `docs/audit/sprint-2-master-backlog.md` — Sprint 2 master backlog (B13-B20 ek önerilir)
- `docs/audit/db-drift-report-2026-04-26.md` — DB drift raporu
- `docs/audit/dospresso-system-map-and-roadmap-2026-04-27.md` — Sistem haritası
- `docs/audit/gida-muh-system-analysis-2026-04-27.md` — Gıda mühendisi sistem analizi
- `docs/TEST-MATRIX.md` — 13 rol smoke test (genişletilmeli — B18)
- `docs/DECISIONS.md` — 28 madde kararlar
- `docs/SPRINT-LIVE.md` — Aktif sprint canlı durum
- `docs/plans/*.md` — 4 plan dosyası (HQ PIN, shift_attendance, izin bakiye, fabrika MVP)
- `docs/runbooks/*.md` — 4 runbook (DB write, kiosk PDKS, git güvenlik, reçete+etiket)
- `docs/PILOT-DAY1-CHECKLIST.md` — Day-1 GO/NO-GO
- `docs/PILOT-DAY1-INCIDENT-LOG.md` — Day-1 hata günlüğü

---

> **Bu rapor READ-ONLY analizdir.** Hiçbir kod/DB değişikliği yapılmadı, sadece mevcut kod tabanı + audit dosyaları + ripgrep keşfi sonuçları derlendi. Owner GO ile B13-B20 işleri sprint 2 master backlog'a eklenir ve plan dosyaları üretilir (her biri ~30-45 dk DOCS).
