# DOSPRESSO — Kapsamlı Teknik Audit Raporu

**Tarih:** 26 Nisan 2026
**Versiyon:** 1.0 (Birleşik / Güncel)
**Hazırlayan:** Replit Task Agent (Task #252)
**Kapsam:** Kod, şema, runtime, güvenlik, performans, dağıtım — tek dosya, 18 bölüm
**Önceki raporlar:** `DOSPRESSO_IT_Audit_Report_2026.md` (12 Mart), `MEGA_SPRINT_AUDIT_REPORT.md` (19 Mart), `LAUNCH_READINESS_REPORT.md` (19 Mart), `PRELAUNCH_AUDIT_REPORT.md` (19 Mart), `KIOSK_AUDIT_REPORT.md` (16 Mart). Bu rapor onları **birleştirir ve günceller**, eski dosyalar silinmemiştir.

---

## ⚠️ Kritik Yönetici Özeti (TL;DR)

| Konu | Durum | Aksiyon |
|------|-------|---------|
| **`npm run build`** | ❌ FAIL — `client/src/pages/fabrika-recete-duzenle.tsx:242` `historyLoading` çift tanım | Hotfix gerekli (Issue #1) |
| **`npm run dev` ("Start application" workflow)** | ❌ FAIL — Aynı sebep (Vite tarama hatası) | Aynı hotfix çözer |
| **`npm run check` (TypeScript)** | ✅ PASS (0 hata) | — |
| **DB tablosu** | 444 (canlı) / 455 (Drizzle export) — **11 tablo drift** | Audit (Issue #5) |
| **Public endpoint** | 55 adet (kiosk + feedback + export + setup) | `/api/export/*` 19 endpoint **auth yok**, üretimde tehlikeli (Issue #2) |
| **Test coverage** | Vitest mevcut ama düzenli koşmuyor (CI yok) | Phase 6 |
| **AI maliyeti** | Rate limiter var (saatlik 20), bütçe alarmı yok | Issue #14 |
| **Scheduler** | 30+ job tek process'te — Replit autoscale'de **çoklu instance riski** | Issue #11 |
| **Pilot env değişkenleri** | `PAYROLL_LOCKED_DATASOURCE`, `PAYROLL_DRY_RUN`, `PILOT_BREAK_MINUTES_OVERRIDE`, `PDKS_EXCEL_IMPORT_ENABLED` set edilmiş — pilot sonrası temizlenmeli | Faz 7 |

> **Sıralama önerisi:** Önce build hotfix (Faz 1), sonra public endpoint sertleştirme (Faz 2), sonra şema drift senkronizasyonu (Faz 3).

---

## Bölüm 1 — Proje Genel Bakış

### 1.1 Misyon
DOSPRESSO; kahve/yiyecek franchise zincirinin (20 şube + 1 HQ + 1 Fabrika = 22 lokasyon) operasyonel, finansal, üretim, eğitim, kalite, müşteri ilişkileri ve insan kaynakları süreçlerini **tek bir platformda** merkezîleştiren büyük bir tam yığın web uygulamasıdır.

### 1.2 Hedef Kitle ve Boyut
- **Toplam tasarımsal kullanıcı:** ~270
- **Aktif veritabanı kullanıcısı (canlı sayım):** **372**
- **Rol sayısı (UserRole enum):** **31** (legacy dahil; `shared/schema/schema-01.ts:53–98`)
- **Modül sayısı (Mega-modül):** 11 ana grup, 100+ alt modül (`shared/modules-registry.ts`, `shared/module-manifest.ts`)
- **Frontend sayfa sayısı:** 219 (`client/src/pages/`)
- **Backend route dosyası:** ~120 dosya, ~2 005 endpoint (yaklaşık `rg` sayımı)

### 1.3 İş Modülleri (high-level)
| Mega-modül | Kapsam |
|------------|--------|
| Dashboard / Mission Control | 6 rol bazlı dashboard, "Komuta Merkezi 2.0" widget sistemi (24 widget) |
| Operations | Görevler, denetim v2, geri bildirim, müşteri şikayet |
| Equipment | Ekipman & arıza, bakım, kalibrasyon |
| HR / İK | Personel yaşam döngüsü, PDKS, izin, bordro, disiplin |
| Training / Akademi | LMS v1/v2/v3, quiz, sertifika, badge |
| Kitchen / Reçete | Şube reçeteleri, mutfak |
| Factory | Fabrika kiosk, vardiya, KQK, lot, üretim batch |
| Reports / Insight | KPI, snapshot, AI özet |
| New Shop / Onboarding | Şube açılış sihirbazı, franchise yatırımcı |
| Satınalma | Tedarikçi, sipariş, fiyat geçmişi |
| Admin | Yetkilendirme, modül flagleri, ayarlar |

### 1.4 Çevre
- Replit Workspace (NixOS, Node.js 20, PostgreSQL 16)
- Üretim: Replit Autoscale (`.replit:[deployment]`)
- Veritabanı: Neon serverless Postgres
- Object storage: Replit Object Storage + AWS S3 uyumlu (`server/objectStorage.ts`)

---

## Bölüm 2 — Tech Stack

### 2.1 Frontend
- **React 18.3.1** + **TypeScript 5.6.3** + **Vite 5.4.20** (`vite.config.ts`)
- **Wouter 3.3.5** (routing)
- **TanStack Query v5.60.5** (data fetching, `client/src/lib/queryClient.ts`, `staleTime=5 dk`, `gcTime=10 dk`, `retry=3`)
- **Tailwind CSS 3.4.17** + **shadcn/ui** + **Radix primitives** (overrides ile sürüm sabit, `package.json:171–179`)
- **react-hook-form 7.55** + **@hookform/resolvers/zod** + **drizzle-zod** form/validation
- **react-i18next 16.5** + i18next-http-backend (Türkçe öncelik)
- **framer-motion 11.18**, **recharts 2.15**, **react-big-calendar 1.19**, **react-window 2.2**
- **html5-qrcode**, **qrcode.react**, **jspdf 3.0**, **html2canvas**, **pdf-lib**, **exceljs**, **xlsx**

### 2.2 Backend
- **Express 4.21.2** + **Passport 0.7** (LocalStrategy + session)
- **express-session 1.18** + **connect-pg-simple 10** (Postgres'e session store, 8 saatlik TTL — `server/localAuth.ts:74–98`)
- **bcrypt 6.0** (hash; tüm parolalar)
- **drizzle-orm 0.39** + **@neondatabase/serverless 0.10** + **ws** (WebSocket pool, `server/db.ts:1–20`)
- **express-rate-limit 8.2** (6 farklı limiter — `server/routes.ts`)
- **helmet 8.1** (CSP + Permissions-Policy + CORS, `server/routes.ts`)
- **multer 2.0** (dosya yükleme, 20 MB JSON limiti `server/index.ts:93–99`)
- **nodemailer 7.0** (IONOS SMTP), **resend 6.5**
- **web-push 3.6** (VAPID push)
- **openai 6.8** (GPT, embeddings, vision)
- **@replit/object-storage 1.0** + **@google-cloud/storage 7.17** (object IO)
- **archiver 7**, **sharp 0.34**, **pdf-parse 2.4**

### 2.3 Build / Test
- `npm run dev`: `tsx server/index.ts` (single process)
- `npm run build`: `vite build && esbuild server/index.ts → dist/`
- `npm run check`: `tsc --noEmit`
- `npm run db:push`: `drizzle-kit push`
- **Vitest 4.0.10** mevcut, fakat `package.json`'da `test` script'i **tanımlı değil** → CI kapısı yok (Issue #18).
- Mevcut testler (`*.test.ts`): `server/storage.test.ts`, `server/services/academy-rbac.test.ts`, `server/services/pii-redactor.test.ts`, `shared/lib/ingredient-canonical.test.ts` — toplam 4 dosya.

### 2.4 Replit Integrations
- `javascript_openai_ai_integrations:1.0.0`
- `javascript_database:1.0.0`
- `javascript_object_storage:1.0.0`
- `javascript_log_in_with_replit:1.0.0`

---

## Bölüm 3 — Dosya / Klasör Ağacı (Üst Seviye)

```
/
├── client/                       219 sayfa, ~248K satır TSX
│   └── src/
│       ├── App.tsx               (938 satır — tüm route binding'leri)
│       ├── main.tsx              (44 satır — service worker + i18n)
│       ├── pages/                219 dosya
│       │   ├── admin/   akademi-hq/  akademi-v3/  crm/
│       │   ├── fabrika/ hq/  iletisim-merkezi/  kalite/
│       │   ├── satinalma/  sube/  yonetim/
│       ├── components/           ~250 dosya
│       │   ├── protected-route.tsx (140 sat, role/group guard)
│       │   ├── module-guard.tsx   (58 sat, module-flag guard)
│       │   ├── global-ai-assistant.tsx
│       │   ├── mr-dobody.tsx
│       │   ├── ui/  layout/  mission-control/  dashboards/  centrum/
│       ├── contexts/   theme-context.tsx, dobody-flow-context.tsx
│       ├── hooks/      useAuth.ts, use-module-flags.ts, useNetworkStatus.tsx, …
│       └── lib/        queryClient.ts, i18n.ts, lazy-with-retry.ts
│
├── server/                       80 dosya, ~153K satır TS
│   ├── index.ts                  (1 745 sat — tek giriş; 30+ scheduler init)
│   ├── routes.ts                 (1 489 sat — orkestratör; 122 router.use)
│   ├── routes/                   ~115 modüler route dosyası
│   │   ├── factory.ts            (7 983 sat) ← en büyük route dosyası
│   │   ├── hr.ts                 (7 471 sat)
│   │   ├── operations.ts         (5 846 sat)
│   │   ├── branches.ts           (5 597 sat)
│   │   ├── admin.ts              (4 260 sat)
│   │   ├── audit-v2.ts           (1 136 sat)
│   │   ├── unified-dashboard-routes.ts
│   │   └── …
│   ├── localAuth.ts              (594 sat — Passport + kiosk session)
│   ├── db.ts                     (20 sat — Neon pool)
│   ├── storage.ts                (8 881 sat — IStorage interface ⚠ büyük)
│   ├── ai.ts                     (3 441 sat — OpenAI wrappers)
│   ├── ai-motor.ts, ai-assistant-context.ts
│   ├── audit.ts, audit-scoring.ts
│   ├── cache.ts                  (in-memory cache + AI rate limiter)
│   ├── reminders.ts              (1 696 sat — bildirim/SLA scheduler)
│   ├── scheduler-manager.ts      (timer registry)
│   ├── scheduler/                hq-kiosk-pin-audit.ts
│   ├── middleware/               csrf.ts (tek dosya)
│   ├── lib/                      payroll-engine.ts, pdks-engine.ts, dobody-*, …
│   ├── data/                     (statik veri seed/yardımcıları)
│   ├── services/                 ~35 servis (agent, scoring, snapshot, …)
│   ├── agent/                    Mr. Dobody routing + skills/
│   │   └── skills/               20+ skill (late-arrival, food-safety, daily-coach, …)
│   └── 23 adet seed-*.ts
│
├── shared/                       ~20K satır TS
│   ├── schema.ts                 (23 sat — re-export hub)
│   ├── schema/                   schema-01..23 (16 modüler dosya)
│   │   ├── schema-01.ts          (440 sat — UserRole, sessions)
│   │   ├── schema-02.ts          (3 596 sat — PERMISSIONS map ⚠ en büyük)
│   │   ├── schema-22-factory-recipes.ts (653 sat)
│   │   └── …
│   ├── permissions.ts            (122 sat — Akademi RBAC)
│   ├── modules-registry.ts       (384 sat — mega-modül kayıt)
│   ├── module-manifest.ts        (617 sat — modül yetki matrisi)
│   ├── ai-nba-config.ts          (T1..T8 task bucket'ları, role groups)
│   └── lib/ ingredient-canonical.ts(.test.ts)
│
├── migrations/                   16 elle yazılmış SQL + boş drizzle journal
│   └── meta/_journal.json        (boş — drizzle-kit migrasyonu kullanılmıyor)
│
├── scripts/                      ~25 script (pilot/, reports/, db-drift, p0_indexes, …)
│   ├── pilot/                    27 SQL/TS pilot fixture
│   ├── reports/                  PDF rol raporu üreticileri
│   ├── post-merge.sh             (auto rebase sonrası)
│   ├── check-build-safety.sh
│   ├── db-drift-check.ts + db-drift-fix.sql
│   └── p0_indexes.sql
│
├── seeds/                        audit_template.json, audit_rules.json
├── docs/                         100+ markdown (sprint, devir, plan, audit, …)
├── attached_assets/              **1.1 GB** ⚠ büyük (PDF/PNG havuzu)
├── dospresso_backup.sql          **18.6 MB** ⚠ tek dosya yedek
└── replit.md, AGENTS.md          (kalıcı bilgi/kural dosyaları)
```

### 3.1 Büyük / Riskli Dosya Listesi (>1 MB ya da >2 000 satır)

| Dosya | Boyut/Satır | Risk |
|-------|-------------|------|
| `dospresso_backup.sql` | 18.6 MB | Repo şişiyor; `.gitignore`'a eklenmeli, ayrı backup bucket'a taşınmalı |
| `attached_assets/` | 1.1 GB | 22 MB tekrarlayan reçete PDF'leri × 6 kopya; deduplication şart (Issue #16) |
| `attached_assets/Reçete 08.2025_*.pdf` | 22 MB × 6 | Aynı dosyanın 6 kopyası farklı timestamp ile |
| `attached_assets/Ürün_Katalog_*.pdf` | 9.1 MB | Object storage'a taşınabilir |
| `client/src/pages/fabrika/maliyet-yonetimi.tsx` | 3 859 sat | Refactor adayı |
| `client/src/pages/yonetim/akademi.tsx` | 3 374 sat | Refactor adayı |
| `client/src/pages/yeni-sube-detay.tsx` | 3 245 sat | `AGENTS.md`'de "Sprint 3'e kadar dokunma" notu var |
| `server/storage.ts` | 8 881 sat | God-object; alt-storage'lara bölünmeli |
| `server/routes/factory.ts` | 7 983 sat | Route dosyası şiştiyor |
| `server/routes/hr.ts` | 7 471 sat | Aynı |
| `server/routes/operations.ts` | 5 846 sat | Aynı |
| `shared/schema/schema-02.ts` | 3 596 sat | PERMISSIONS map devasa; veri tabanına taşınması düşünülebilir |

---

## Bölüm 4 — Frontend Mimarisi

### 4.1 Giriş
- `client/src/main.tsx` (44 sat): root mount + i18n + service worker temizliği (`dospresso-v13` cache'i hariç hepsini siler) + sadece üretimde SW register.
- `client/src/App.tsx` (938 sat): tüm route binding'leri. `Switch` + `Route` (wouter), `lazyWithRetry`, `LazyErrorBoundary`, `BreadcrumbProvider`, `NetworkStatusProvider`, `ThemeProvider`, `DobodyFlowProvider`, `QueryClientProvider`. Onboarding sihirbazı `BranchOnboardingWizard` + `RoleOnboardingWizard` ekran üstüne overlay olarak basıyor.

### 4.2 Routing & Koruma Katmanları
1. **`ProtectedRoute`** (`client/src/components/protected-route.tsx`): `useAuth` ile kullanıcıyı çek, rol/grup eşle.
   - 31 rolü 4 gruba (`admin/hq/sube/fabrika`) eşleyen statik harita (line 12–43).
   - **`admin` → `strictRoles=false` ise her şeyi görür**; `strictRoles=true` ile baypas kapatılır.
   - `isBranchOnlyContext` (kiosk modu) tüm çocukları auth'suz geçirir → kiosk için kasıtlı.
2. **`ModuleGuard`** (`module-guard.tsx`, 58 sat): `use-module-flags` hook'u ile flag kapatılmış modüllere `<Redirect to="/access-denied">`.
3. **Redirect/Login**: `useAuth().isAuthenticated` false ise `<Redirect to="/login" />` (App.tsx).

### 4.3 Veri Katmanı
- `client/src/lib/queryClient.ts`: `apiRequest` + `getQueryFn`.
  - `credentials: 'include'`, kiosk token varsa `x-kiosk-token` header'ı.
  - `REQUEST_TIMEOUT = 15 000 ms` AbortController ile.
  - **HTTP 423** (kayıt kilidi) yakalanıp `LockedRecordDialog`'a iletiliyor — global pattern.
  - **`offlineFirst` networkMode**, query default `staleTime=5 dk`, mutations exponential backoff (3 retry).
- TanStack Query v5; query keys tipik olarak array (`['/api/x', id]`) — `replit.md`'de bu standart yazılı.

### 4.4 Sidebar & Mission Control
- Server-driven menü (`server/menu-service.ts` + `buildMenuForUser`); rol & module flag bazlı.
- `RouteModuleSidebar` (sayfa kapsamlı modül sidebar'ı) + `BottomNav` (mobil) + `AppHeader` (üst).
- Komuta Merkezi 2.0: `dashboard_widgets` (registry), `dashboard_role_widgets` (rol başına atama). API: `GET /api/me/dashboard-data` (`server/routes/unified-dashboard-routes.ts`). 24 widget, 7 kategori.
- WidgetRenderer pattern (`client/src/components/mission-control/`); pdks-* widget'lar kendi REST endpoint'lerinden çekiyor (collector pattern dışı).

### 4.5 Tema, i18n
- `ThemeProvider` (light/dark/system, localStorage sync) — design_guideline ile uyumlu.
- `i18next-http-backend` ile dil paketi; `useLanguageSync` aktif. Türkçe varsayılan.
- Service worker: `main.tsx` mevcut SW kayıtlarını **unregister** ediyor; üretimde yeni `service-worker.js` kayıt — bu offline kullanım için kritik ama mevcut SW dosyası kontrol edilmedi (Issue #19).

### 4.6 Frontend Riskleri
| # | Risk | Lokasyon |
|---|------|----------|
| F1 | **Build kırık** — `historyLoading` çift tanım | `pages/fabrika-recete-duzenle.tsx:120` ve `:242` |
| F2 | `App.tsx` 938 satır + 200+ Route — sürdürülemez; route gruplama gerek | `App.tsx` |
| F3 | `yeni-sube-detay.tsx` 3 245 satır, AGENTS notu "dokunma" | `pages/yeni-sube-detay.tsx` |
| F4 | Service worker stratejisi versiyon-tabanlı temizlik (`dospresso-v13`) — manuel arttırma riski | `main.tsx:14–19` |
| F5 | `attached_assets/` 1.1 GB; bundle'a sızma riski yok ama Vite `fs.strict=true` ile dosya servis kontrol altında | `vite.config.ts:38–41` |

---

## Bölüm 5 — Backend Mimarisi

### 5.1 Giriş ve Middleware Stack
**`server/index.ts`** (1 745 sat) sırası:
1. `ErrorEvent.message` patch (Neon'un Node 18+ çakışması için, line 41–54).
2. `process.on('unhandledRejection' / 'uncaughtException')` — kritik: Neon "only a getter" hatasını swallow eder (line 63–80).
3. `app.set('trust proxy', 1)`.
4. `express.json({ limit: '20mb', verify })` + `express.urlencoded`.
5. Request log middleware (line 101–129) — 80 char trim.
6. `await registerRoutes(app)` (`server/routes.ts`).
7. Global error handler.
8. `setupVite(app, server)` (dev) / `serveStatic(app)` (prod).
9. `tryListen` + EADDRINUSE retry (5 deneme, 1 sn arayla).

**`server/routes.ts`** (`registerRoutes`, 1 489 sat):
- Helmet (CSP directives, `frameguard:false`, COEP false, COOP cross-origin).
- Manuel CORS middleware (production: 3 whitelisted origin; dev: allow all).
- Permissions-Policy header.
- 6 farklı `rateLimit`:
  - `generalLimiter`: 100 req / 1 dk
  - `authLimiter`: 50 / 1 dk (kullanılmamış görünüyor — sadece `loginLimiter` aktif, Issue #20)
  - `loginLimiter`: 50 / 15 dk (`/api/login`)
  - `passwordResetLimiter`: 3 / 1 saat
  - `sensitiveApiLimiter`: 20 / 1 saat (`/api/ai/`)
  - `agentRunLimiter`: 5 / 1 saat (`/api/agent/run-now`)
- `auditMiddleware()` (her isteği `audit_logs`'a yazıyor — performans yükü).
- `csrfProtection` (kendi orta katman, double-submit token; istisna whitelist `server/middleware/csrf.ts`).
- Sonra **122 adet `app.use(...Router)`** çağrısı ile modüler router'lar bağlanıyor.

### 5.2 Ana Servisler
- **`server/storage.ts`** (8 881 sat): `IStorage` interface — tek dev dosya. CRUD'un büyük kısmı buradan akıyor; route'lar bu interface'i çağırıyor (en azından eski yazılan kısımlar). Yeni route'lar genelde `db` import edip Drizzle ile direkt sorgu yazıyor.
- **`server/db.ts`**: Neon pool, `max=25` connection, `idleTimeout=30 sn`, `connectionTimeout=10 sn`. WebSocket constructor `ws` paketinden.
- **`server/cache.ts`**: in-memory `cache` ve `aiRateLimiter` (sırasıyla in-process cache + sliding-window rate limit; çoklu instance için **paylaşımsız** — Issue #11).
- **`server/permission-service.ts`**: scope filter helper'ları (`resolvePermissionScope`, `applyScopeFilter`).
- **`server/menu-service.ts`**: rol+modül flag bazlı sidebar üretici.
- **`server/security.ts`**: `sanitizeUser*` helpers (parolayı yanıttan striple).
- **`server/audit.ts`**: tüm API isteklerini logla; `audit-scoring.ts` skor üretir.
- **`server/reminders.ts`** (1 696 sat): bildirim/SLA mega-scheduler.

### 5.3 Route Dosyaları (~115)
Yapı: `server/routes/<modul>.ts` → `Router()` export → `routes.ts`'te `app.use(router)`. Bazı eski dosyalar register fonksiyonu pattern'i kullanıyor (`registerCRMRoutes(app)` vb). Karışık.

**Devasa dosyalar (>2 000 satır):**
- `routes/factory.ts` (7 983), `routes/hr.ts` (7 471), `routes/operations.ts` (5 846), `routes/branches.ts` (5 597), `routes/admin.ts` (4 260), `ai.ts` (3 441), `routes/shifts.ts` (3 259), `maliyet-routes.ts` (2 876), `routes/academy.ts` (2 875), `routes/tasks.ts` (2 642), `routes/factory-recipes.ts` (2 311), `satinalma-routes.ts` (2 284), `routes/academy-v2.ts` (2 260).

→ "fat-route" anti-pattern; her bir dosya kendi içinde 50–200 endpoint barındırıyor. Sorumluluk dağıtımı zayıf (Issue #6).

### 5.4 Auth Middleware Kullanımı
- **`isAuthenticated`** (`server/localAuth.ts:isAuthenticated`) — passport `req.isAuthenticated()` kontrolü + kiosk token bypass.
- 129 dosyada `isAuthenticated` kullanılıyor.
- **55 endpoint auth'suz** (Bölüm 14'te listelendi).

### 5.5 Kiosk Sistemi
- `kiosk_sessions` tablosu (token, userId, stationId, expires_at) — `server/index.ts:189–207` kendisi `CREATE TABLE IF NOT EXISTS` ile garanti ediyor (ham SQL).
- Kiosk parolası bcrypt'le hash'leniyor; legacy plain-text varsa startup'ta migrate (`migrateKioskPasswords()` — line 209–273).
- Branch & HQ & Factory kiosk girişleri ayrı endpoint'ler.

### 5.6 Backend Riskleri
| # | Risk | Lokasyon |
|---|------|----------|
| B1 | God-object `storage.ts` 8 881 sat | `server/storage.ts` |
| B2 | Fat-route dosyaları (>5 000 sat × 4) | `server/routes/{factory,hr,operations,branches}.ts` |
| B3 | `routes.ts` da 1 489 sat — cowork router 2× kayıt (line ile bak `app.use(coworkRouter)` 2 kez) | `server/routes.ts` |
| B4 | Karışık route kayıt deseni (router + register fn) | tüm route'lar |
| B5 | `unhandledRejection` log ama exit yok → process zombie risk | `server/index.ts:56–80` |
| B6 | `uncaughtException` Neon hatasını "non-fatal" sayıyor → veri tutarsızlığı riski | `server/index.ts:63–66` |
| B7 | `helmet({ frameguard:false })` — clickjacking | `server/routes.ts` (Issue #15) |

---

## Bölüm 6 — Database Mimarisi

### 6.1 Boyut
- **Canlı tablo sayısı (`pg_tables WHERE schemaname='public'`):** **444**
- **Drizzle export `pgTable` sayısı:** **455**
- **Drift:** 11 tablo Drizzle'da var DB'de yok **veya** isim farkı (Issue #5; `scripts/db-drift-check.ts` zaten mevcut, çıktısı raporlanmamış).
- **Toplam kullanıcı:** 372 (canlı sayım).
- **Migration durumu:** `migrations/meta/_journal.json` **BOŞ** → drizzle-kit migration history yok. Tüm DDL ya `server/index.ts` içindeki ham SQL ya da `migrations/*.sql` (16 task'a özel) ya da `scripts/*.sql` ile uygulanmış. `replit.md`'de "DB schema changes via raw psql (drizzle-kit push times out)" notu açıklayıcı ama **şema değişikliği versiyonlanmıyor** (Issue #4).

### 6.2 Domain Bölümlemesi (Schema Modüller)
| Dosya | Satır | İçerik (özet) |
|-------|-------|----------------|
| `schema-01.ts` | 440 | sessions, UserRole enum (31), HQ/BRANCH/FACTORY rol setleri, sidebar menü tipleri |
| `schema-02.ts` | 3 596 | PERMISSIONS map + users + roles + branches + ekipman + temel CRM/HR/finance tipleri (devasa, refactor adayı) |
| `schema-03.ts` | 1 265 | Ek HR/PDKS şemaları |
| `schema-04.ts` | 1 273 | Akademi/eğitim tabloları |
| `schema-05.ts` | 1 280 | Görev / checklist |
| `schema-06.ts` | 1 266 | Franchise projeleri (10 tablo, AGENTS.md'de özel kural) |
| `schema-07.ts` | 1 225 | Müşteri geri bildirim, kalite |
| `schema-08.ts` | 1 286 | Fabrika ürün, üretim batch, branch order |
| `schema-09.ts` | 1 305 | Reçete, malzeme |
| `schema-10.ts` | 1 263 | Stok, sayım |
| `schema-11.ts` | 1 270 | Bildirim, kullanıcı pref |
| `schema-12.ts` | 1 439 | CRM, müşteri |
| `schema-13.ts` | 166 | Branch task scheduler, kiosk session, escalation config |
| `schema-14-relations.ts` | 171 | Drizzle relations |
| `schema-15-ajanda.ts` | 172 | Ajanda, todo, calendar, notification policies |
| `schema-16-financial.ts` | 38 | Mali tablolar (küçük) |
| `schema-17-snapshots.ts` | 70 | Aylık snapshot |
| `schema-18-production-planning.ts` | 101 | Haftalık üretim planı |
| `schema-19-workshop.ts` | 28 | Atölye notları (mini) |
| `schema-20-audit-v2.ts` | 239 | Denetim v2 (9 tablo: templates, categories, questions, audits, responses, personnel, actions, comments) |
| `schema-21-dobody-proposals.ts` | 106 | Dobody öneri/öğrenme |
| `schema-22-factory-recipes.ts` | 653 | Fabrika reçete v2 (keyblends, ingredients, snapshots, nutrition, price history, label print logs) |
| `schema-23-mrp-light.ts` | 174 | MRP light sistemi |

### 6.3 Anahtar Pattern'ler
- **Soft-delete:** `deleted_at TIMESTAMPTZ` çoğu çekirdek tabloda var (`AGENTS.md` zorunlu kılıyor).
- **Custom `vector`:** `schema-01.ts:27–37` pgvector(1536) — embedding amaçlı (AI). DB'de pgvector extension'ın gerçekten kurulu olduğu doğrulanmalı.
- **`pgEnum`** ile bazı enumlar veritabanı seviyesinde sabit.
- **Drizzle relations** ayrı dosya (`schema-14-relations.ts`).

### 6.4 SQL & Seed Dosyaları
- `scripts/p0_indexes.sql` — performans index'leri (eklemenin uygulandığı bilinmiyor; Issue #13).
- `migrations/task-*.sql` 16 dosya — task bazlı manuel migration; her biri standalone, koşulu manuel.
- `scripts/pilot/00..26-*.sql/.ts` — pilot için fixture/temizlik (rollback eşli).
- `seeds/audit_template.json` + `audit_rules.json` — denetim seed verisi.
- `dospresso_backup.sql` (18.6 MB) repo içinde durmamalı (Issue #16).

### 6.5 DB Riskleri
| # | Risk |
|---|------|
| D1 | Migration journal boş; şema değişiklik geçmişi yok — geri dönüş zor |
| D2 | 11 tablo drift (Drizzle/DB) — silent failure riski |
| D3 | `server/index.ts` startup'ta `CREATE TABLE IF NOT EXISTS` ham SQL bloğu — schema source-of-truth ikilemi |
| D4 | `dospresso_backup.sql` repo içinde 18 MB |
| D5 | pgvector kurulu mu doğrulanmadı |
| D6 | 444 tablo + 31 rol + 100+ modül kombinasyonu için RLS yok; uygulama seviyesi scope filter'a tam bağımlılık |

---

## Bölüm 7 — Auth, RBAC, Kiosk

### 7.1 Web Auth
- **Strategy:** `passport-local` (`server/localAuth.ts`).
- **Session:** PG-backed `connect-pg-simple`, `sessions` tablosu, **TTL = 8 saat** (1 vardiya).
- **Cookie:** `httpOnly`, `secure` (sadece prod), `sameSite: 'lax'`, `maxAge=8h`, `proxy:true`.
- **Lockout:** 10 yanlış / 15 dk → 15 dk kilit. Memory-Map (`loginAttempts`) — **çoklu instance'da ayrılır** (Issue #11).
- **Şifre:** bcrypt cost 10. `AGENTS.md`'ye göre Türkçe error mesajları (`"Kullanıcı adı veya şifre hatalı"`).

### 7.2 Bootstrapping
- `bootstrapAdminUser()` (line 461–509): `ADMIN_BOOTSTRAP_PASSWORD` env zorunlu, set değilse `process.exit(1)`.
- **HER STARTUP'ta admin parolası env'den force-reset ediliyor** + `accountStatus='approved'` + `mustChangePassword=false`.
- Pilot modunda `resetNonAdminPasswords` (log'larda görüldü: 157 kullanıcı `"0000"` parolaya reset edildi). Pilot bittiğinde temizlenmeli (Issue #17).

### 7.3 Kiosk Auth
- **`branch_kiosk_settings`**: branch başına `kiosk_password` (bcrypt), `allow_pin`, `allow_qr`, `auto_close_time`.
- **`factory_kiosk_config`**: `device_password` (bcrypt).
- **`kiosk_sessions`**: token (64 char), 8 saat default, expires_at temizliği startup + scheduler'da (`cleanupExpiredKioskSessions`).
- Public endpoint'ler kiosk için doğal olarak auth'suz (`/api/branches/:id/kiosk/login`, `/api/factory/kiosk/login`, `/api/kiosk/qr-checkin`, vs).
- **Kritik bağlantı:** `KIOSK_AUDIT_REPORT.md` (Mart 2026) referans alınmalı; PIN audit scheduler `server/scheduler/hq-kiosk-pin-audit.ts` her gece çalışıyor.

### 7.4 RBAC
- 31 rol (`UserRole`) — Bölüm 1.2'de listelendi.
- **`PERMISSIONS` map** (`shared/schema/schema-02.ts`): `Record<UserRoleType, Record<PermissionModule, PermissionAction[]>>`. Rol başına modül başına izin.
- **Path → Permission mapping:** `PATH_TO_PERMISSION_MAP` (route guard için frontend'te de kullanılıyor).
- **3 koruma katmanı:**
  1. Server: `isAuthenticated` middleware
  2. Server: `hasPermission(role, module, action)` (tipik kullanım)
  3. Server: `applyScopeFilter` (`server/permission-service.ts`) — branchId vb scope.
- **Frontend `ProtectedRoute`:** sadece UI guard; gerçek koruma backend'de.
- **`module_flags` & `dashboard_role_widgets`:** dinamik runtime kontrol; admin paneli (`pages/admin/yetkilendirme.tsx` 2 182 sat) ile yönetiliyor.

### 7.5 Bilinen Auth/RBAC Riskleri
| # | Risk |
|---|------|
| A1 | `ProtectedRoute`'ta `userRole === 'admin'` baypas — `strictRoles=true` her sayfada zorlanmıyor |
| A2 | 55 public endpoint listesi içinde `/api/export/*` 19 adet — **gerçek operasyonel veri auth'suz** |
| A3 | Login lockout in-memory → reset/restart sonrası sıfırlanır + autoscale'de paralel instance ayrı sayar |
| A4 | `register` endpoint'i tamamen public (`/api/auth/register`) — abuse riski; sadece davet üzerine olmalı (Issue #21) |
| A5 | Pilot parola "0000" 157 kullanıcı için aktif (`server/index.ts` startup log'u) |

---

## Bölüm 8 — AI Katmanı (Mr. Dobody, GPT, Embeddings)

### 8.1 OpenAI Entegrasyonu
- `server/ai.ts` (3 441 sat) — tek büyük facade. Fonksiyonlar:
  - `analyzeTaskPhoto`, `analyzeFaultPhoto`, `analyzeDressCodePhoto` (Vision)
  - `generateArticleEmbeddings`, `generateEmbedding` (Embeddings)
  - `answerQuestionWithRAG`, `answerTechnicalQuestion`
  - `generateAISummary`, `generateQuizQuestionsFromLesson`, `generateFlashcardsFromLesson`
  - `evaluateBranchPerformance`, `diagnoseFault`, `generateTrainingModule`
  - `processUploadedFile`, `generateBranchSummaryReport`, `generateArticleDraft`
  - `generatePersonalSummaryReport`, `verifyChecklistPhoto`
  - `generateEquipmentKnowledgeFromManual`, `researchEquipmentTroubleshooting`
- `server/ai-motor.ts` — `generateTrainingMaterialBundle` (LMS materyal üretici).
- `server/ai-assistant-context.ts` — `gatherAIAssistantContext` (sayfa bağlamı toplayıcı).
- **API Key:** `OPENAI_API_KEY` veya `AI_INTEGRATIONS_OPENAI_API_KEY` (her ikisi env'de mevcut).
- **Rate limit:** `sensitiveApiLimiter` `/api/ai/` 20 req / saat / kullanıcı.
- **Cost guard:** Yok — kullanıcı/günlük token bütçesi tutulmuyor (Issue #14).

### 8.2 Mr. Dobody Agent
- `server/agent/routing.ts` + `server/agent/skills/`:
  - `late-arrival-tracker.ts` (15 dk eşik, aylık 2/4 uyarı)
  - `daily-briefing.ts`, `daily-coach.ts`, `factory-daily-summary.ts`
  - `food-safety.ts`, `compliance-reporter.ts`
  - `payroll-reminder.ts`, `burnout-predictor.ts`, `career-progression-tracker.ts`
  - `cost-analyzer.ts`, `cross-module-insight.ts`, `customer-watcher.ts`
  - `equipment-lifecycle-tracker.ts`, `contract-tracker.ts`
  - `branch-task-tracker.ts`, `auto-todo-from-ticket.ts`, `ai-enrichment.ts`, `action-plan-generator.ts`
- **Scheduler:** `startAgentScheduler()` (`server/services/agent-scheduler.ts`) — startup'tan 30 sn sonra başlar.
- **Güvenlik kuralı (`AGENTS.md` §9):** *"Çıktıyı filtreleme DEĞİL, girdiye erişimi kısıtla"* — agent skill'leri `server/services/agent-safety.ts`'i kullanmalı.
- **Eskalasyon:** `server/services/agent-escalation.ts` + `franchise-escalation.ts` 5-kademe eskalasyon (`startFranchiseEscalationScheduler`).

### 8.3 AI Politika & Brifing
- `server/services/ai-policy-engine.ts` + `routes/ai-policy-admin.ts` — admin AI politikalarını yönetebiliyor.
- `server/services/ai-dashboard-briefing.ts` — günlük brifing üreticisi.
- `server/lib/dobody-message-generator.ts`, `dobody-action-executor.ts`, `dobody-action-templates.ts`, `dobody-suggestions.ts` (1 374 sat), `dobody-workflow-engine.ts`, `dobody-special-periods.ts`.

### 8.4 AI Riskleri
| # | Risk | Detay |
|---|------|-------|
| AI-1 | **Bütçe alarmı yok** | Aylık OpenAI maliyeti izleniyor mu? Bilinmiyor |
| AI-2 | Halüsinasyon riski | LMS quiz/flashcard üretimleri AI'dan; gözden geçirme akışı? |
| AI-3 | PII redaction | `server/services/pii-redactor.ts` mevcut (test'i de var) — kullanıldığı yerler audit edilmeli |
| AI-4 | Agent skill'leri DB'ye direkt erişiyor olabilir | Scope filter'ı tüm skill'lerde uygulanıyor mu? Test yok |
| AI-5 | Embedding storage (vector(1536)) | pgvector kurulu mu doğrulanmadı |

---

## Bölüm 9 — Scheduler / Cron Sistemi

### 9.1 Scheduler Manager
- `server/scheduler-manager.ts` (~80 sat): `setInterval/setTimeout` registry. Job ekleme/silme, name-based.
- `startupTime + 30 sn` lazy-init pattern (`server/index.ts:377–441`).

### 9.2 Aktif Job'lar (server/index.ts'den çıkarıldı)
1. `initReminderSystem()` — reminder loop
2. `startOnboardingCompletionSystem()`
3. `startNotificationArchiveSystem()`
4. `startMaster10MinTick()` — 10 dakikada bir
5. `startSktExpiryCheckJob()` — son kullanma tarihi
6. `startScheduledTaskDeliveryJob()`
7. `startSLACheckSystem()`
8. `startPhotoCleanupSystem()`
9. `startFeedbackPatternAnalysisSystem()`
10. `startStaleQuoteReminderSystem()`
11. `startFeedbackSlaCheckSystem()`
12. `startStockAlertSystem()`
13. `startConsolidatedHourlyJobs()`
14. `startAgentScheduler()` — Mr. Dobody
15. `startDailyGapDetection()`
16. `startWeeklyBackupScheduler()`
17. `startTrackingCleanup()`
18. `startNotificationCleanupJob()`
19. `startFactoryScoringScheduler()`
20. `startHqKioskPinAuditScheduler()`
21. `startFranchiseEscalationScheduler()`
22. `scheduleFactoryAutoCheckout()` / `scheduleBranchAutoCheckout()` / `scheduleHQAutoCheckout()`
23. `startPdksAutoWeekendScheduler()`
24. `startPdksWeeklySummaryScheduler()`
25. `startPdksDailyAbsenceScheduler()`
26. `startPdksMonthlyPayrollScheduler()`
27. `startPdksMonthlyAttendanceSummaryScheduler()`

→ Toplam **30+ named job**, hepsi tek-process Node'da koşuyor.

### 9.3 Scheduler Riskleri
| # | Risk |
|---|------|
| S1 | **Replit autoscale → çoklu instance** ihtimali var. Bu durumda her instance scheduler'ı tekrar başlatır → çift bildirim, çift bordro hesaplaması |
| S2 | İş kilidi (DB advisory lock) yok — race condition |
| S3 | Cleanup job'ları stale'lenirse session/cache şişer |
| S4 | 30+ job'un her biri try/catch'le sarılı değil — biri hata atarsa diğerlerini dolaylı etkileyebilir |
| S5 | Health check sadece startup'ta (`performHealthCheck` 1 kez) — periyodik değil |

---

## Bölüm 10 — Build, TypeCheck, Test (Tam Çıktılar)

### 10.1 `npm run check` (tsc --noEmit)
```
> rest-express@1.0.0 check
> tsc
(0 hata, 0 uyarı — başarılı)
```
✅ TypeScript geçiyor.

### 10.2 `npm run build`
```
> vite build && esbuild server/index.ts ...
A PostCSS plugin did not pass the `from` option to `postcss.parse`. (uyarı)
✓ 3966 modules transformed.
x Build failed in 17.96s
error during build:
[vite:esbuild] Transform failed with 1 error:
client/src/pages/fabrika-recete-duzenle.tsx:242:8: ERROR:
  The symbol "historyLoading" has already been declared
file: client/src/pages/fabrika-recete-duzenle.tsx:242:8
240|    const canManageSnapshots = ["admin", "recete_gm"].includes(...);
241|    const [historyOpen, setHistoryOpen] = useState(false);
242|    const { data: snapshotHistory = [], isLoading: historyLoading } = useQuery<...>
```
❌ **BUILD KIRIK — P0 Critical.** Aynı satır `:120` ve `:242`. 4 ayrı render bloğunda kullanılıyor. Çözüm: `useQuery`'nin sonuçlarını alias'lamak (`isLoading: historyLoadingQuery`) **veya** `useState`'i kaldırmak.

### 10.3 `npm run dev` (Workflow "Start application")
Aynı hata (Vite tarama esnasında):
```
✘ [ERROR] The symbol "historyLoading" has already been declared
client/src/pages/fabrika-recete-duzenle.tsx:242:8
The symbol "historyLoading" was originally declared here:
client/src/pages/fabrika-recete-duzenle.tsx:120:8
```
**Workflow status: FAILED.** Dev sunucu çalışmıyor → preview boş → kullanıcı sistemi göremez.

### 10.4 Test Komutu
- `package.json`'da `test` script'i tanımlı **değil**.
- Vitest kurulu (`vitest@4.0.10`, `vitest.config.ts` var, 1 KB).
- Mevcut test dosyaları (4):
  - `server/storage.test.ts`
  - `server/services/academy-rbac.test.ts`
  - `server/services/pii-redactor.test.ts`
  - `shared/lib/ingredient-canonical.test.ts`
- `npx vitest run` ayrıca koşturulmadı (build kırık olduğu için kapsam belirsiz).

### 10.5 Diğer Diagnostics
- LSP / TypeScript: temiz.
- ESLint config: yok (varsayılan tsx + Vite parser dışında lint katmanı bulunmadı).

---

## Bölüm 11 — Runtime Sağlığı

### 11.1 Workflow Durumu
| Workflow | Durum | Not |
|----------|-------|-----|
| `Start application` | ❌ FAILED | Vite scan hatası (bkz. 10.3) |
| `artifacts/mockup-sandbox: Component Preview Server` | ✅ RUNNING | port 23636 |

### 11.2 Startup Log'u (kısaltılmış, saat 20:36)
```
🧹 AI log cleanup job started (daily at 03:30 Europe/Istanbul)
[academy-v3] isRequired → isMandatory migration applied
[FAB-KIOSK] Phase + waste + recipe columns migration applied.
[FAB-SEED] 7 station benchmarks seeded.
[FAB-KIOSK] Device credentials seeded.
serving on port 5000
🔌 DB diagnostics: connected=true, NODE_ENV=development, users=372
🔐 Admin bootstrap: pw_len=6, existing_hash_len=60
✅ Admin password force-reset (id=0ccb206f-...): login_sim=✅ OK
🔑 Reset passwords for 157 non-admin active users to "0000" (pilot mode)
✅ Admin user verified: accountStatus=approved, isActive=true
[KioskMigration] All kiosk passwords already hashed
─── (Vite tarama → CRASH) ───
```

### 11.3 Curl ile Sağlık (Sunucu DOWN olduğundan başarısız)
```bash
$ curl -sS -o /tmp/h.json -w "HTTP=%{http_code}\n" \
       http://localhost:5000/api/health
HTTP=000  # bağlantı yok
$ curl -sS -o /tmp/m.json -w "HTTP=%{http_code}\n" \
       http://localhost:5000/api/auth/user
HTTP=000  # bağlantı yok
```
Beklenen davranış (build düzeltilirse):
- `GET /api/health` → 200 (public, no auth)
- `GET /api/auth/user` → 401 (oturum yok)
- `GET /api/me/dashboard-data` → 401 (oturum yok)

### 11.4 Browser Console
```
[vite] connecting...
[vite] connected.
[vite] server connection lost. Polling for restart...
Service Worker registration failed: {}
```
SW kayıt hatası dev'de doğal (üretimde register ediliyor); fakat connection lost = backend down → Bölüm 10.3 hotfix'i ile çözülür.

### 11.5 Frontend Mockup Preview
`artifacts/mockup-sandbox` workflow'u sağlıklı; `/__mockup/` route'u ulaşılabilir. Ana uygulama preview'i çalışmıyor (build down).

---

## Bölüm 12 — API & Endpoint Yüzeyi

### 12.1 Sayılar
- `app|router.get/post/put/patch/delete(...)` toplam yaklaşık **2 005** endpoint.
- 122 `app.use(router)` çağrısı.
- 129 dosyada `isAuthenticated` referansı.
- **55 endpoint auth'suz** (public + kiosk + export + setup).

### 12.2 Public/Auth'suz Endpoint Listesi (tam)
**Health & system:**
- `GET /api/health`
- `POST /api/system/crash-report`
- `GET /api/setup/status`
- `GET /api/branch-dashboard-allowed-roles`
- `GET /api/public/branches`, `GET /api/public/settings`

**Auth ve register:**
- `POST /api/auth/register` *(⚠ tamamen public — kapatılmalı)*
- `POST /api/auth/forgot-password` *(passwordResetLimiter aktif)*
- `POST /api/auth/reset-password/:token`

**Kiosk (kasıtlı public):**
- `POST /api/branches/:branchId/kiosk/verify-password`
- `GET /api/branches/:branchId/kiosk/staff`
- `POST /api/branches/:branchId/kiosk/login`
- `GET /api/branches/:branchId/kiosk/session/:userId`
- `GET /api/branches/:branchId/kiosk/lobby`
- `GET /api/branches/:branchId/kiosk/display-qr`
- `GET /api/hq/kiosk/staff`, `POST /api/hq/kiosk/login`
- `POST /api/factory/kiosk/login`, `POST /api/factory/kiosk/login-by-username`, `POST /api/factory/kiosk/device-auth`
- `POST /api/kiosk/qr-checkin`
- `GET /api/kiosk/qr-status/:userId/:branchId`

**Müşteri geri bildirim (kasıtlı public — token bazlı):**
- `GET /api/feedback/branch/:token`
- `POST /api/feedback/submit`
- `GET /api/feedback-form-settings/branch/:branchId`
- `GET /api/feedback-form-settings/token/:token`
- `GET /api/feedback-custom-questions/public/:branchId`
- `POST /api/customer-feedback/public`

**Personel QR/Rating (kasıtlı public — token bazlı):**
- `GET /api/staff-qr/:token`, `POST /api/staff-qr/:token/rate`
- `GET /api/public/staff-rating/validate/:token`
- `POST /api/public/staff-rating`

**Public allergens & ürün (kasıtlı public):**
- `GET /api/public/urun/:code`
- `GET /api/public/allergens/recipes`, `GET /api/public/allergens/recipes/:id`

**Files (token bazlı):**
- `GET /api/files/public/:token`

**❌ EXPORT (KORUMASIZ — ciddi sızıntı riski):**
- `GET /api/export/branches`, `users`, `tasks`, `equipment`, `faults`, `checklists`,
  `checklist-assignments`, `announcements`, `shifts`, `leave-requests`, `inventory`,
  `suppliers`, `purchase-orders`, `training-modules`, `training-progress`,
  `notifications`, `maintenance-logs`, `performance-metrics`, **`/api/export/all`**

→ **19 adet export endpoint'i auth'suz.** `GET /api/export/users` herkese tüm kullanıcıları döker. **Bu Issue #2 — P0 Critical.**

### 12.3 İlginç Pattern'ler
- `routes.ts` içinde `app.use(coworkRouter)` **2 kez** çağrılmış (line aramada).
- `csrfProtection` whitelist'i `server/middleware/csrf.ts`'te; export endpoint'leri muhtemelen GET olduğu için CSRF'siz geçiyor ama auth eksikliği daha büyük problem.

---

## Bölüm 13 — Frontend / UI Sağlığı

### 13.1 Sayfa Sayısı ve Boyutları
- 219 sayfa.
- 38 sayfa ≥ 50 KB (büyük dosyalar).
- En büyük 14 sayfa Bölüm 3.1'de.

### 13.2 Lazy / Code Splitting
- `App.tsx` `lazyWithRetry` + `LazyErrorBoundary` kullanıyor → her sayfa lazy chunk.
- Suspense fallback mevcut.

### 13.3 Tailwind / Theme
- `tailwind.config.ts` — `darkMode: ["class"]`, custom `dospresso-*` palette + standart shadcn token'ları + `chart-1..5` + `sidebar-*`.
- HSL formatında değişkenler (kural ile uyumlu).
- `tw-animate-css`, `tailwindcss-animate`, `@tailwindcss/typography` plugin'leri.
- Dark/light toggle `ThemeProvider`'da.

### 13.4 Test ID Kapsamı
`AGENTS.md` ve guidelines `data-testid` zorunlu kılıyor. Manuel doğrulama yapılmadı; örnek olarak `protected-route.tsx` `data-testid="loading-auth"`, `data-testid="access-denied"` mevcut.

### 13.5 Frontend Build Çıktısı
`dist/public` mevcut (eski build — Apr 1) ama güncellemiyor (current build kırık).

---

## Bölüm 14 — Güvenlik (Hands-on)

### 14.1 Secret Sızıntı Taraması
| Pattern | Bulunan | Konum |
|---------|---------|-------|
| `sk-[A-Za-z0-9]{20,}` | **0** | (temiz) |
| `BEGIN PRIVATE KEY` | **0** | (temiz) |
| Hardcoded `password=...` | 4 örnek | hepsi açıklamalı/UI label/seed default (`Dospresso2024!` `seed-comprehensive` operations seed; `sifre123` HR import/export bash help; `password: '****'` log mask) |

→ **Repo içinde gerçek API key veya parola sızıntısı bulunmadı.** ✅

### 14.2 Tanımlı Env Değişkenleri (sadece isim)
| Env | Var? | Kullanım |
|-----|------|----------|
| `DATABASE_URL` | ✅ | Postgres bağlantısı |
| `SESSION_SECRET` | ✅ | Express session imzalama |
| `ADMIN_BOOTSTRAP_PASSWORD` | ✅ | Admin parolası (her startup force-reset) |
| `OPENAI_API_KEY` | ✅ | OpenAI |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | ✅ | İkincil OpenAI key (Replit integration) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | ✅ | Custom base URL |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | ✅ | Web push (`.replit:[userenv.shared]` üzerinden) |
| `PAYROLL_LOCKED_DATASOURCE` | ✅ (`kiosk`) | Pilot kilidi |
| `PAYROLL_DRY_RUN` | ✅ (`true`) | Pilot kuru çalışma |
| `PILOT_BREAK_MINUTES_OVERRIDE` | ✅ (`120`) | Pilot mola eşiği |
| `PDKS_EXCEL_IMPORT_ENABLED` | ✅ (`false`) | Pilot kapalı |
| `SMTP_HOST/PORT/USER/PASSWORD/FROM_EMAIL` | ❓ | E-posta gönderim için — `.env.example`'da var, runtime'da set olduğu doğrulanmadı |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | ❓ | `.replit`'te `objectStorage.defaultBucketID` ayrı |
| `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` | ❓ | Object storage |
| `APP_BASE_URL`, `REPLIT_DEPLOYMENT_URL`, `REPLIT_DEV_DOMAIN`, `REPL_SLUG` | ✅ | URL üretimi |
| `FACTORY_HOURLY_WAGE`, `FACTORY_KWH_PRICE`, `FACTORY_WATER_PRICE` | ❓ | Maliyet hesaplaması (default'lar var mı?) |
| `ALLOW_SEED_IN_PRODUCTION` | ❓ | Seed kapısı |
| `ALLOW_UNKNOWN_INGREDIENTS` | ❓ | Reçete validasyonu |
| `COVERAGE_THRESHOLD`, `WRITE_PARTIAL` | ❓ | Test/script flag |

→ Hassas değer **hiçbiri** raporda gösterilmedi.

### 14.3 Helmet & CSP
- CSP directives uygulanıyor (script/style/img/connect/font-src — `server/routes.ts`).
- `frameguard: false` → **clickjacking riski** (Issue #15). `crossOriginEmbedderPolicy: false`, `crossOriginResourcePolicy: cross-origin` — Replit iframe preview için gerekli ama prod'da daraltılmalı.
- CORS production whitelist: `REPLIT_DEV_DOMAIN`, `${REPL_SLUG}.replit.app`, `dospresso.com`. Dev'de `true` (her şeyi kabul).
- Permissions-Policy: camera, microphone, geolocation hepsi `()` (kapalı). QR tarayıcı için `camera=(self)` eksik olabilir.

### 14.4 Rate Limiting
- 6 limiter (Bölüm 5.1).
- `authLimiter` tanımlı ama hiçbir yere mount edilmemiş — ölü kod (Issue #20).
- IP-based (express-rate-limit default) — proxy arkasında `trust proxy: 1` ile doğru IP alınıyor.

### 14.5 SQL Injection
- Drizzle ORM güvenli; `sql\`\`` template tag'ları parametre interpolation güvenli.
- Manuel SQL daha çok `server/index.ts` startup migration'larında ve `scripts/*.sql`'de — kullanıcı girdisi yok.
- Endpoint handler'larda raw SQL örnek tarandı: `db.execute(sql\`...\${userInput}\`)` pattern güvenli.
- Risk: `scripts/db-drift-check.ts`, `db-drift-fix.sql` gibi script'lerde manuel kontrol gerekli (kullanıcıya karşı değil, geliştirici için).

### 14.6 Upload / File Risk
- `multer` kullanılıyor (route'larda dağınık). Boyut limiti, mime kontrolü, virus tarama → her dosyada manuel; merkezi politika yok.
- `server/objectStorage.ts` + `objectAcl.ts` ACL uygulanıyor (object-level permission).
- `uploads/` lokal dizin var → üretimde object storage'a tamamen taşınmalı.

### 14.7 Hassas Loglar
- `server/index.ts:481` admin password force-reset log'u **hash prefix'i logluyor** (`$2b$10$2FHGq…`) — bcrypt prefix değer üretmek için yetersiz olduğundan kabul edilebilir, fakat üretim log'unda olmamalı (Issue #22).
- `[Pre-Pilot] N users' mustChangePassword cleared` ve `Reset passwords for 157 non-admin … to "0000"` gibi pilot log'ları üretimde silinmeli.

### 14.8 KVKK / PII
- `server/services/pii-redactor.ts` mevcut (test ile birlikte). Kapsamı: AI prompt'larına gönderilen veriden TCKN, telefon, e-posta gibi alanların redaksiyonu varsayılıyor. Kullanım yerleri audit edilmeli.

### 14.9 Güvenlik Riskleri Özeti
| # | Risk |
|---|------|
| SEC-1 | `/api/export/*` 19 endpoint auth'suz — **VERI SIZINTISI** |
| SEC-2 | `/api/auth/register` public |
| SEC-3 | Pilot parolası "0000" 157 kullanıcıda |
| SEC-4 | Helmet `frameguard: false` |
| SEC-5 | `unhandledRejection` swallow → silent failure |
| SEC-6 | Login lockout in-memory, autoscale risk |
| SEC-7 | Password hash prefix log'u |
| SEC-8 | Multer merkezi limit yok |

---

## Bölüm 15 — Performans & Ölçeklenebilirlik

### 15.1 Bundle / Frontend
- Build kırık olduğundan ölçüm alınamadı; en son başarılı build çıktısı `dist/public` (1 Nis), `npx vite build` çıktısı: 3 966 modül, ~18 sn transform süresi.
- Chunk strategy: Lazy route (`lazyWithRetry`) + Vite default rollup chunking.
- 2 000–4 000 satırlık sayfalar (≥6 adet) tek chunk → ilk yükleme yavaşlatabilir.

### 15.2 Backend
- Express tek-thread; 30+ scheduler aynı process'te.
- Neon pool `max=25` connection — orta yük için yeterli; 372 user × refetch staleness ile potansiyel olarak yetersiz kalabilir.
- `auditMiddleware()` her isteği DB'ye yazıyor → high QPS'te bottleneck (Issue #23).
- TanStack `staleTime=5 dk` → çoğu sayfa cache'ten dönüyor (rahatlatıcı).

### 15.3 Olası N+1 Sorguları
- Storage interface'inde foreach içinde tekil get çağrısı yaygın olabilir (`storage.ts` 8 881 sat). Kapsamlı audit önerilir (Issue #6).
- `routes/factory.ts`, `routes/hr.ts` uzunluğu N+1 riskini artırıyor.

### 15.4 Index / DB Performans
- `scripts/p0_indexes.sql` mevcut; uygulanma durumu **belirsiz** (Issue #13).
- 444 tablo + soft-delete → her sorguda `WHERE deleted_at IS NULL` index gerek.

### 15.5 Cache Katmanı
- `server/cache.ts` in-memory; çoklu instance'da tutarsız.
- `aiRateLimiter` aynı şekilde in-memory.
- TTL/eviction stratejisi `cache.ts` içinde tanımlı (memoizee tabanlı).

### 15.6 Static Asset
- `attached_assets/` 1.1 GB — repo şişmesi; Replit'te clone/pull yavaşlar.
- 22 MB reçete PDF'i × 6 kopya → deduplication ile ~110 MB tasarruf.

### 15.7 Performans Riskleri
| # | Risk |
|---|------|
| P1 | Audit middleware yazma yükü |
| P2 | In-memory cache + 30 scheduler scaling barrier |
| P3 | İndex eksikliği (p0_indexes uygulanmamış olabilir) |
| P4 | 1.1 GB asset / 18 MB SQL backup repo'da |
| P5 | Devasa sayfa chunk'ları |

---

## Bölüm 16 — Top 30 Issues (Severity • Dosya • Sebep • Etki • Düzeltme • İzole?)

| # | Sev | Dosya / Konum | Ne Yanlış | Neden Önemli | Önerilen Düzeltme | İzole? |
|---|-----|---------------|-----------|--------------|-------------------|--------|
| 1 | **CRITICAL** | `client/src/pages/fabrika-recete-duzenle.tsx:120,242` | `historyLoading` çift tanım | Build & dev sunucu kırık, sistem **down** | useQuery'nin `isLoading`'ini `historyLoadingQuery` olarak alias'la **veya** `useState<boolean>`'i sil | ✅ |
| 2 | **CRITICAL** | `server/export-routes.ts` (19 route) | `/api/export/*` auth'suz | Tüm kullanıcı/şube/maliyet verisi public | Hepsine `isAuthenticated` + `requireRole(EXECUTIVE_ROLES)` ekle | ✅ |
| 3 | **HIGH** | `server/routes.ts:registerRoutes` | `POST /api/auth/register` public | Spam hesap, abuse | Kapatın **veya** invite-only token'a bağlayın | ✅ |
| 4 | **HIGH** | `migrations/meta/_journal.json` boş | Drizzle migration tarihi yok | Şema değişiklikleri versiyonlanmamış; rollback imkânsız | `drizzle-kit generate` ile baseline migration üret; gelecek değişiklikler `db:push` yerine generate+apply | ✅ |
| 5 | **HIGH** | DB 444 / Drizzle 455 tablo | 11 tablo drift | Çalışma zamanında "table not found" riski | `scripts/db-drift-check.ts` ile diff al, eksik tabloları ya silinmiş kabul et ya da yeniden yarat | ⚠ orta risk |
| 6 | **HIGH** | `server/storage.ts` 8 881 sat | God-object | Sürdürülemez; PR çakışması; N+1 risk | Domain bazlı 6–8 alt-storage'a böl (UserStorage, HRStorage, FactoryStorage, …) | ❌ büyük refactor |
| 7 | **HIGH** | `server/index.ts:63–80` | `uncaughtException` Neon hatasını swallow | Sessiz veri tutarsızlığı | Hata türünü daralt; kritik hatalarda graceful shutdown ile exit | ✅ |
| 8 | **HIGH** | `client/src/components/protected-route.tsx:78` | `admin` rol baypas (strictRoles=false default) | Rol bazlı sayfa yetkisini admin için her zaman geçer; istenmeyen yerlere erişim olabilir (UI seviyesi) | `strictRoles` default'unu route bazında düşün; backend'de zaten korumalı ama UI'da tutarlılık | ✅ |
| 9 | **HIGH** | `server/routes.ts` (helmet) | `frameguard: false` | Clickjacking | `frameguard: { action: 'sameorigin' }` (Replit preview için CSP frame-ancestors ile dengele) | ✅ |
| 10 | **HIGH** | `server/index.ts` (pilot password reset) | 157 user "0000" parola | Güvenlik felaketi (üretim öncesi) | Pilot bittiğinde `users.mustChangePassword=true` zorla; ilk girişte şifre değişikliği iste | ✅ pilot bitince |
| 11 | **HIGH** | Tüm scheduler'lar (`server/services/*-scheduler*`) | In-process, autoscale'de duplicate | Çift bordro, çift bildirim | DB advisory lock (`pg_advisory_lock(<job_id>)`) her job başında | ❌ orta refactor |
| 12 | **MEDIUM** | `dospresso_backup.sql` (18.6 MB), `attached_assets/` (1.1 GB) | Repo şişmesi | Clone/pull yavaş; Replit storage limit | `.gitignore`; Object Storage / external bucket'a taşı; tarihsel asset'leri arşivle | ✅ |
| 13 | **MEDIUM** | `scripts/p0_indexes.sql` | Uygulanma durumu belirsiz | Sorgu yavaşlığı | `psql` ile uygula; uygulanan index'leri `database_indexes` audit tablosunda izle | ✅ |
| 14 | **MEDIUM** | `server/ai.ts` + `routes/ai-*.ts` | OpenAI maliyet bütçesi yok | Halüsinasyon + bütçe aşımı | Per-user/per-role günlük token quotası (`server/cache.ts` + DB); aylık alarm | ✅ |
| 15 | **MEDIUM** | `server/routes.ts` | `app.use(coworkRouter)` 2 kez | Çift handler chain — endpoint mantığı bozulabilir | Tekilleştir | ✅ |
| 16 | **MEDIUM** | `attached_assets/Reçete 08.2025_*.pdf × 6` | Aynı 22 MB dosya 6 kopya | 110 MB israf | `sha1sum` ile deduplikasyon | ✅ |
| 17 | **MEDIUM** | `server/index.ts:481` | bcrypt hash prefix log | Operasyonel sızıntı (zayıf) | Üretimde log seviyesini `warn`'e çek; hash hiç loglanmasın | ✅ |
| 18 | **MEDIUM** | `package.json` | `test` script yok, CI yok | Regresyon güvencesi yok | `"test": "vitest run"` + GitHub Actions/Replit deploy hook | ✅ |
| 19 | **MEDIUM** | `client/src/main.tsx:14–19` | SW versiyon-tabanlı manuel temizlik | Yeni versiyonda kullanıcı eski cache yiyor | Workbox/precacheManifest stratejisine geç **veya** server'dan version endpoint | ✅ |
| 20 | **LOW** | `server/routes.ts` | `authLimiter` tanımlı, mount edilmemiş | Ölü kod | Sil veya `/api/auth/*`'e mount | ✅ |
| 21 | **MEDIUM** | `server/permission-service.ts` + tüm route'lar | Scope filter konsistansı | Şube verisi karışma riski | Otomatik test: her route için "barista olarak çağır → 403" | ❌ test altyapısı |
| 22 | **LOW** | Pilot env'lerin üretime kalması | `PAYROLL_DRY_RUN=true`, `PILOT_BREAK_MINUTES_OVERRIDE=120` | Üretimde yanlış davranış | Pilot bittiğinde `.replit:[userenv.shared]`'den temizle | ✅ |
| 23 | **MEDIUM** | `server/audit.ts` | Her isteği DB'ye yazıyor | Yüksek QPS bottleneck | Async batch insert; sadece mutation'ları logla | ✅ |
| 24 | **MEDIUM** | `server/routes/{factory,hr,operations,branches}.ts` | Fat-route 5–8K satır | PR çakışması, anlamsız diff'ler | Alt route'lara böl (örn `/api/factory/recipe`, `/api/factory/shift`) | ❌ büyük |
| 25 | **MEDIUM** | `server/middleware/csrf.ts` (tek dosya) | CSRF whitelist genişletme zorluğu | Eksik koruma riski | OWASP best-practice double-submit token doğrula; whitelist'i ayrı config'e al | ✅ |
| 26 | **LOW** | `service-worker.js` (varlık doğrulanmadı) | Var mı yok mu belirsiz | Üretimde 404 | `client/public/service-worker.js` mevcut mu kontrol; yoksa SW kayıt çağrısını kaldır | ✅ |
| 27 | **LOW** | `App.tsx` 938 sat | 200+ Route tek dosyada | Sürdürülemez | Route group'lara böl (`routes/branch.tsx`, `routes/hq.tsx` vs) | ✅ |
| 28 | **LOW** | `shared/schema/schema-02.ts` 3 596 sat | PERMISSIONS map devasa | Roller eklenince derleme yavaşlar | DB tabanlı yetki matrisi; build-time generate | ❌ |
| 29 | **LOW** | `server/routes.ts:routes import` | Mixed pattern (`registerXRoutes(app)` + router export) | Kod okuma zorluğu | Tek pattern'e standardize (Router export) | ✅ |
| 30 | **LOW** | `server/services/agent-safety.ts` kullanım kapsamı | Tüm skill'ler kullanıyor mu? | AI sızıntı | Skill'leri tek-tek tara; eksik olanlara ekle; test yaz | ⚠ orta |

---

## Bölüm 17 — Phased Fix Plan (7 Faz)

### Faz 1 — Build & Start (1–2 saat)
**Amaç:** Sistemi ayağa kaldırmak.
- [ ] **#1**: `historyLoading` çakışmasını düzelt (1 satır alias).
- [ ] `npm run build` ve `npm run dev` yeşil.
- [ ] `Start application` workflow başarılı.
- [ ] `curl /api/health` 200 dönüyor.
- [ ] `curl /api/auth/user` 401 dönüyor.

### Faz 2 — Auth & Güvenlik Sertleştirme (4–8 saat)
**Amaç:** Veri sızıntılarını kapatmak.
- [ ] **#2**: `/api/export/*` 19 endpoint'e `isAuthenticated` + executive role kontrolü.
- [ ] **#3**: `/api/auth/register` kapat veya invite-only.
- [ ] **#9**: Helmet `frameguard: { action: 'sameorigin' }`.
- [ ] **#10**: Pilot bitince mustChangePassword zorla.
- [ ] **#17**: Hash prefix log'u kaldır.
- [ ] **#20**: Ölü `authLimiter`'ı temizle veya mount et.

### Faz 3 — Schema & Migration (1 gün)
**Amaç:** Şemayı versiyonlamak ve drift'i kapatmak.
- [ ] **#4**: `drizzle-kit generate` baseline migration.
- [ ] **#5**: `scripts/db-drift-check.ts` çalıştır, çıktıyı raporla.
- [ ] 11 tablo drift'i ya yeniden yarat ya da `pgTable` tanımından sil.
- [ ] Startup'taki ham `CREATE TABLE` migration'larını ayrı `migrations/`'a taşı.

### Faz 4 — Core Modüller İyileştirme (1 hafta)
**Amaç:** Devasa dosyaları parçalamak, dayanıklılık.
- [ ] **#6**: `storage.ts`'i 6–8 alt-storage'a böl.
- [ ] **#24**: `routes/{factory,hr,operations,branches}.ts`'i alt route'lara böl.
- [ ] **#27**: `App.tsx` route gruplarına böl.
- [ ] **#15**: `app.use(coworkRouter)` çift kaydı düzelt.
- [ ] **#7**: `uncaughtException` filtresi daralt.

### Faz 5 — Dashboard / Permission / Modül Flag (3 gün)
**Amaç:** Pilot kalitesini garantilemek.
- [ ] **#21**: Her endpoint için scope-filter test (barista→403, mudur→200, vb.).
- [ ] **#8**: `ProtectedRoute.strictRoles` policy net.
- [ ] **#28**: PERMISSIONS map → DB'ye taşımayı planla (uzun vadeli).
- [ ] Module flag tutarlılığı (skill: `dospresso-quality-gate`'i koş).

### Faz 6 — AI / Scheduler / Test (1 hafta)
**Amaç:** Çok-instance hazır + AI bütçesi.
- [ ] **#11**: Her scheduler job'una `pg_advisory_lock` ekle.
- [ ] **#14**: OpenAI günlük token bütçesi + alarm.
- [ ] **#23**: Audit middleware async batch.
- [ ] **#18**: `package.json` `"test": "vitest run"`, CI hook.
- [ ] **#26**: SW dosya varlığı doğrula veya kaldır.
- [ ] PII redactor kullanım denetimi (#30).

### Faz 7 — Performans & Dağıtım (3 gün)
**Amaç:** Üretim performansı ve repo temizliği.
- [ ] **#13**: `p0_indexes.sql` uygula, sonuç tablosu.
- [ ] **#12**: `dospresso_backup.sql` repo'dan çıkar; `.gitignore`'a ekle; bucket'a taşı.
- [ ] **#16**: `attached_assets/` deduplikasyon (sha1 bazlı script).
- [ ] **#22**: Pilot env'lerini `.replit`'ten temizle.
- [ ] Bundle analizi (vite-plugin-visualizer).
- [ ] Health check endpoint genişlet (DB ping, queue size, scheduler heartbeat).

---

## Bölüm 18 — Sahibinden Cevap Bekleyen Sorular

> Aşağıdaki sorulara net cevap olmadan sistem **%100 güvenli ve doğru** üretim moduna geçirilemez.

### 18.1 Pilot & Üretim Ayrımı
1. **Pilot bitiş tarihi resmen ne?** `replit.md`'de "28 Nis – 5 May 2026" yazıyor; bugün **26 Nis**. 5 Mayıs sonrası `.replit:[userenv.shared]` kısmındaki `PAYROLL_DRY_RUN=true`, `PILOT_BREAK_MINUTES_OVERRIDE=120`, `PDKS_EXCEL_IMPORT_ENABLED=false` set'leri **temizlenecek mi?**
2. **157 kullanıcının "0000" parolası**: Pilot sonrası ilk girişte zorunlu şifre değiştirme istenecek mi? Yoksa toplu reset için kanal (SMS/e-posta) hazır mı?
3. **Pilot SQL fixture'ları (`scripts/pilot/00..26-*.sql`)**: Pilot sonrasında DB'den ayrılacak/silinecek mi yoksa kalıcı mı?

### 18.2 Veritabanı
4. **DB tablo drift (11 tablo)**: Eksik tablolar gerçekten silinmiş eski tablolar mı, yoksa eklemeyi unuttuğumuz yeni tablolar mı? Karar: drop edelim mi yoksa create mi?
5. **`drizzle-kit push` neden timeout oluyor?** Neon connection pool ayarı mı, yoksa şema büyüklüğü mü? Migration stratejisi `generate` vs `push` hangisi seçilecek?
6. **`pgvector` extension** Neon'da kurulu mu? `vector(1536)` kullanan embedding tabloları çalışıyor mu? Test edildi mi?

### 18.3 Auth / Güvenlik
7. **`POST /api/auth/register` public**: Kullanılıyor mu yoksa unutulmuş mu? Invite-only token sistemine geçirilecek mi?
8. **`/api/export/*` korumasız**: Bu endpoint'ler kim tarafından kullanılıyor (BI tool, manuel CSV indirme)? Ekleyebileceğimiz auth modeli (API key? Session?) hangisi olmalı?
9. **CORS production whitelist** doğru mu? `dospresso.com` aktif domain mi yoksa `dospresso.replit.app` mi?
10. **CSP frame-ancestors**: Replit preview iframe'inde sistem çalışsın diye `frameguard:false`. Üretimde sadece kendi domain'imiz gömüldüğüne göre `frame-ancestors 'self' https://dospresso.com` kabul edilebilir mi?

### 18.4 AI / Mr. Dobody
11. **OpenAI aylık bütçe limiti** belirlendi mi? Token başına alarm eşiği ne olmalı?
12. **AI generated quiz/flashcard onayı**: Hangi rol AI çıktısını onaylamalı? Şu an direkt yayınlanıyor mu?
13. **Mr. Dobody scope-safety**: Skill'lerin hangi kullanıcı kapsamında çalıştığı doğrulanmış mı? (Örn. fabrika skill'i şube verisi okuyamaz.)

### 18.5 Operasyon
14. **Replit deployment tipi `autoscale`**. Birden fazla instance kalkarsa hangi scheduler tek instance'da koşmalı? (Bordro? Bildirim? AI brifing?)
15. **`SMTP_*` env değişkenleri**: IONOS'a hâlâ giden parola çalışıyor mu? Test e-postası gönderildi mi?
16. **`uploads/` dizini**: Üretimde object storage'a tamamen geçildi mi yoksa hâlâ lokal dosya yazılıyor mu?

### 18.6 Süreç / Karar
17. **`yeni-sube-detay.tsx` (3 245 sat)**: AGENTS.md'de "Sprint 3'e kadar dokunma" notu var. Sprint 3 tarihi ne? Bu yasak hâlâ geçerli mi?
18. **CHANGELOG / sürüm**: Şu an `package.json:version=1.0.0` (sabit). Pilot sonrası versiyonlama (semver?) başlasın mı?
19. **Backup stratejisi**: `dospresso_backup.sql` (18 MB) repo'da. Üretimde Neon point-in-time recovery aktif mi? Manuel haftalık backup hangi bucket'a gidiyor?
20. **Eski raporlar**: 7 adet eski audit/launch raporu (`MEGA_SPRINT_AUDIT_REPORT.md`, `LAUNCH_READINESS_REPORT.md` vb.) mevcut. `docs/audit/`'a arşivlenip kök dizinden silinsinler mi?

---

## Ek A — Bu Raporun Üretim Yöntemi

- **Komutlar koşturuldu (sadece okuma):**
  - `ls`, `find`, `wc -l`, `du`, `rg`, `psql "$DATABASE_URL" -c "\dt"`, `psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_tables..."`
  - `npm run check` (✅ 0 hata)
  - `npm run build` (❌ build kırık)
  - `refresh_all_logs` (workflow & browser console)
- **Hiçbir yazma operasyonu yapılmadı:** kod, schema, env, package.json, workflow, DB içeriği değiştirilmedi. Sadece bu yeni rapor `docs/audit/DOSPRESSO_FULL_AUDIT_2026-04-26.md` oluşturuldu.
- **Hiçbir gerçek secret değeri raporda yer almadı.** Sadece env değişkeni isimleri ve var/yok bilgisi.
- **Eski raporlara dokunulmadı.** Bu rapor onları **birleştirir**, üzerine yazmaz.

---

## Ek B — Hızlı Komut Cep Defteri (Sonraki Engineer İçin)

```bash
# Build & start
npm run check          # tsc, hızlı doğrulama
npm run build          # tam build
npm run dev            # tek-process dev (Vite + Express)

# DB
psql "$DATABASE_URL" -c "\dt"                       # tablo listesi
psql "$DATABASE_URL" -c "SELECT version();"          # PG version
tsx scripts/db-drift-check.ts                       # drift raporu

# Pilot
cat scripts/pilot/16-launch-reset.sql               # pilot reset planı
cat scripts/pilot/26-lara-mudur-b8-ibrahim-deactivate.sql

# Workflow
# UI'dan "Restart workflow" → Start application

# Audit/Test
npx vitest run                                       # mevcut 4 test dosyasını koş
npx tsx server/scripts/e2e-tests.ts                  # smoke e2e

# Repo temizliği
git ls-files --others --exclude-standard | head     # tracked olmayan
du -sh attached_assets/* | sort -h | tail -10       # büyük asset
sha1sum attached_assets/*.pdf | sort | uniq -d -w40 # dup detect
```

---

**Rapor sonu.** 26 Nis 2026 — Replit Task #252.
