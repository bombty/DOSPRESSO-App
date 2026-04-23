# DOSPRESSO Franchise Management Platform

## Overview
DOSPRESSO is a comprehensive franchise management platform designed for a coffee/food franchise network. Its primary purpose is to streamline and centralize operations across various departments including HR, factory management, training, finance, CRM, quality control, and equipment management for 22 locations (20 branches, 1 HQ, 1 Factory). The platform aims to support a large user base (270 users) with diverse roles (29 distinct roles) and manage extensive data, enabling efficient management and operational oversight for a multi-location franchise business.

## User Preferences
- Preferred communication: Simple, everyday language, Turkish preferred
- Fast implementation in Build mode, continues with "devam"
- DB schema changes via raw psql (drizzle-kit push times out)

## 🔥 Aktif Paralel İşler (IT danışmanları dikkat!)

**Her oturum başında kontrol et — çakışma riskini önle.**

### IN_PROGRESS Tasks (Replit, henüz commit edilmemiş olabilir)
<!-- Replit günceller: task başlatınca ekle, bitince sil -->

_(Şu an boş — son 30+ Replit task'ı 23 Nis sabah merge oldu, push edildi: commit `1a8b9d4bc`)_

### Sprint R-5 (Claude, aktif planlama)
- **Plan:** `docs/pilot/sprint-r5-uygulama-raporu.md`
- **Replit cevap:** `docs/pilot/replit-sprint-r5-cevap.md`
- **Durum (23.04.2026 öğleden sonra):**
  - ✅ **R-5D Müşteri QR**: PUSH EDİLDİ (Claude commit `3abb342`) — `musteri-alerjen-public.tsx`, public endpoint, rate limit 30/dk
  - ✅ **R-5A Backend**: PUSH EDİLDİ (Claude commit `d631ed2`) — #131 canonical layer korundu, PATCH yetki fix, 4 yeni endpoint (DELETE ingredient + steps CRUD)
  - 🟢 **R-5A Frontend**: BAŞLAYABİLİR — `fabrika-recete-duzenle.tsx` Replit task'larıyla stabil, çakışma yok
  - ✅ **R-5B Maliyet Backend**: PUSH EDİLDİ (Claude commit `4716ebb`) — `factory-recipe-cost-service.ts` yeni servis (670 satır), 2 endpoint (`recalc-cost` + `bulk-recalc`), price_history audit fix. **Smoke test bekliyor (Aslan Build mode onayı).**
  - ⚪ **R-5A/B/C Frontend**: smoke test sonrası başlar (~4.5 gün toplam)

### Kurallar
1. **Her Claude oturumu başında:** bu bölümü oku, IN_PROGRESS task'ların dosyalarına dokunmadan önce Replit'e sor.
2. **Her Replit task başlangıcı:** bu tabloya ekle (dosya path ile).
3. **Her task commit sonrası:** bu tablodan sil.
4. **Çakışma varsa:** sıralı çalış, paralel değil.

---


## Session State (23.04.2026 - Task #126 / #176)
- **DB drift kontrolü** (`scripts/db-drift-check.ts`) — tüm drift türleri tek script altında:
  - Eksik tablo, eksik kolon, kolon tipi/nullability uyuşmazlığı, UNIQUE, index, FK
  - `tsx scripts/db-drift-check.ts` → rapor + `scripts/db-drift-fix.sql`
  - `--check` → CI modu (gerçek drift varsa exit 1)
  - `--strict` → resolve edilemeyen FK'leri de fail say (cross-file circular import temizlendiğinde)
  - Eksik `updated_at` kolonları için task #156/#168 pattern'i (ADD + backfill + DEFAULT NOW + NOT NULL + BEFORE UPDATE trigger) otomatik üretilir
  - Tip/nullability mismatch'leri auto-fix DEĞİL (veri kaybı riski) — sadece raporlanır
  - `scripts/check-build-safety.sh` 4. adım olarak entegre (DATABASE_URL set ise)
  - Task #176'da `task-168-scan-updated-at-drift.ts` ve `task-168-updated-at-drift-fix.sql` kaldırıldı.
  - Bilinen kısıt: cross-file circular import içeren tabloların FK'leri sessizce atlanır (UNIQUE/index etkilenmez)

## Session State (23.04.2026 - Task #123)
- **Rebase recovery + PIN reseed + routing seed** tamamlandı:
  - Yarım kalan interaktif rebase (Replit checkpoint kaynaklı) abort edildi → `git pull --no-rebase` ile Claude'un 3 dosyası local'e geldi (commit aralığı `e80c5d296..66b8512e1`, merge commit `fd446608e`)
  - `scripts/pilot/17-pin-reseed.ts`: 27 user CSV (`/tmp/new-pins-23nis.csv`) — sadece `users.branchId` bazında; HQ/cross-branch user'ların `branch_staff_pins` kayıtlarını kapsamadı
  - **17b-pin-reseed-by-pin-table.ts** (yeni patch): `branch_staff_pins` + `factory_staff_pins` tablosundaki TÜM aktif user'lara benzersiz bcrypt hash → 41 branch + 14 factory = 55 PIN reseed (`/tmp/new-pins-23nis-full.csv`)
  - `scripts/pilot/18-mr-dobody-routing-rules-seed.sql`: 15 yeni routing kuralı (toplam 16 aktif, 9 rol kapsamı: cgo×2, coach×2, fabrika_mudur×2, gida_muhendisi×1, kalite_kontrol×2, mudur×2, muhasebe_ik×1, supervisor×2, trainer×2)
  - `scripts/pilot/15-alerjen-temel-seed.sql`: 3. denemede `factory_ingredient_nutrition.ingredient_name` kolonunda DB'de UNIQUE constraint eksikti (Drizzle schema-22'de `.unique()` tanımlı ama DB drift) → manuel `ALTER TABLE ADD CONSTRAINT factory_ingredient_nutrition_name_unique UNIQUE (ingredient_name)` sonrası 111 template kayıt oluştu (15/27 reçete coverage; Sema kalan 12 reçetenin malzemelerini eklemeli)
- **E1 PIN duplicate doğrulaması**: pilot 4 lokasyon (5,8,23,24) `branch_staff_pins` + `factory_staff_pins` her ikisi de **0 duplicate satır**
- **Server restart**: 0 ERROR, 145 reçete + 79 module flag + 17 role template + 2431 role permission seedleri temiz
- Adminhq operasyonel parolası 1Password'da; pre-pilot rotasyon 28 Nis 08:00 (parolalar repo'da saklanmaz)

## Session State (21.04.2026)
- **Optimizasyon paketi tamamlandı** (Aslan onayı): 10 düzeltme, 5 yeni dosya
  - `00-pilot-hesap-referansi.md`: 27 rol × gerçek username master tablo + dashboard rotaları
  - `25-fabrika-mudur.md` (eren), `26-gida-muhendisi.md` (sema), `27-yatirimci-branch.md` (4 user) — eksik rol cheat-sheet'leri
  - `mr-dobody-yonlendirme-matrisi.md`: AI agent eskalasyon (4 seviye) + role routing kontrol listesi (kod referanslarıyla)
- **Düzeltmeler**: 16-muhasebe → `muhasebe_ik` rol + `mahmut` username; 22-coach → 27 Nis Pazar 18:00 deadline + API doğrulama; 01-admin → parola rotasyon notu; 04-kurye → DB'de yok uyarısı; vardiya-ui-test-raporu → API smoke test sonuçları (201/200 OK)
- **DB doğrulama (21 Nis)**: 27 rol mevcut, 11 HQ rolünün hepsi DB'de, gerçek username'ler tespit (aslan/utku/mahmut/samet/umran/diana/murat.demir/ece/yavuz/ayse.kaya/mehmet.ozkan/eren/sema)
- **Vardiya API smoke test**: bulk-create 201 + delete 200 → ÇALIŞIYOR (önceki "Mart'tan beri çökmüş" iddiası YANLIŞ)
- **Mr. Dobody doğrulama**: `/api/ai/chat`, `agent-escalation.ts`, `agent/routing.ts`, `dobody-flow.ts` aktif — cheat-sheet'lerdeki "Mr. Dobody seni doğru kişiye yönlendirir" iddiası dayanaklı

## Session State (19.04.2026)
- **Task #113 Pilot Hardening tamamlandı** (10 adım, ~14 dosya): 
  - `docs/pilot/`: success-criteria, README, github-push-runbook, destek-hatti-prosedur, internet-kesintisi-prosedur, db-izolasyon-raporu, sprint-1-f02-fix-plan, yuk-testi-raporu, mobil-test-raporu, day-1-report (template)
  - `docs/pilot/cheat-sheets/`: admin, mudur, supervisor, kurye, fabrika-iscisi (5 rol × 1 sayfa)
  - `docs/AGENT-OWNERSHIP.md`: Replit Agent + Claude path matrix
  - `scripts/pilot/00-db-isolation.sql`: Pazar 22:30 mantıksal izolasyon
  - `scripts/pilot/yuk-testi-5-user.ts`: gerçek 5-user test (adminhq 4-step ✅ avg 178ms, max 463ms)
- **Pilot lokasyonları**: branch_id 5 (Işıklar), 8 (Lara), 23 (HQ), 24 (Fabrika)
- **Yük testi gerçek bulgu**: `/api/login` (`/api/auth/login` değil), test usernames pilot öncesi parolalarla doğrulanmalı
- **Aslan kararları**: 4 sayısal eşik (login >%95, task >10/lokasyon, error <%5, smoke ≥7/8); pilot 28 Nis kesin
- Önceki commit: `18896c813` (Sprint A5) → `3f2350515` (sistem değerlendirme) → `e4cfce7c1` (Task #117: silent try/catch migrate 5 yer + quality-gate Madde 30-32 stub + sourceLocation drift fix, push GitHub auth bekliyor — Claude path)
- Bekleyen: #92 fabrika_depo leftovers, #93 düşük stok→satınalma, #94 LOT/SKT
- Adminhq operasyonel parolası 1Password'da; pre-pilot rotasyon 28 Nis 08:00 (parolalar repo'da saklanmaz)

## System Architecture

### UI/UX Decisions
The platform utilizes React 18, TypeScript, and Vite for the frontend, with Shadcn/ui, Tailwind CSS, CVA, and Lucide icons for a consistent and modern UI. It implements a module layout (`ModuleLayout`, `ModuleSidebar`, `KPIStrip`) for structured module pages (e.g., Equipment, HR, Academy, Factory) and 6 role-based Mission Control dashboards using `DashboardKpiStrip`. The design prioritizes mobile compactness with touch-friendly UIs and role-based quick actions. A server-driven collapsible sidebar dynamically builds menus based on user roles and module flags.

### Technical Implementations
- **Authentication:** Session-based authentication using Passport.js supports both web (username/password with bcrypt) and kiosk (PIN-based with bcrypt) logins. Security features include password stripping, account lockout, and account status management.
- **Role System:** A robust role-based access control system defines 29 distinct roles across HQ, branches, and factory. Permissions are managed via a static map (`PERMISSIONS`) and can be dynamically extended. Module feature flags (`module_flags` table) allow granular control over module visibility at global, branch, and role levels.
- **Database Schema:** The data model is extensive, organized across 16 modular schema files, covering core entities like users, roles, branches, HR, academy, factory operations, CRM, notifications, PDKS Excel import, and financial data.
- **PDKS Excel Import:** 5-table system (pdks_excel_imports, pdks_excel_records, pdks_daily_summary, pdks_monthly_stats, pdks_employee_mappings) for importing attendance data from external Excel files. Route: `server/routes/pdks-excel-import.ts`, Frontend: `client/src/pages/pdks-excel-import.tsx`.
- **Key Architectural Patterns:**
    - **Soft Deletion:** Implemented across all business tables using a `deleted_at` column.
    - **Data Locking:** Time and status-based data locking with a change request workflow.
    - **Query Pattern:** Standardized TanStack Query usage with `queryKey: ['/api/endpoint']` for efficient data fetching.
    - **Mutations:** `apiRequest` from `@lib/queryClient` for mutations, always followed by cache invalidation.

### Feature Specifications
- **Task System:** Comprehensive task management including assignment (single and multi-user with acceptance/rejection flow), comments, evidence, status tracking, recurring tasks, bulk creation, verification, and rating. Integrates with CRM and includes a new task creation dialog.
- **Production Planning:** Manages weekly production plans, items, daily records, and responsibilities with an approval hierarchy (draft, suggested, approved).
- **CRM:** A unified CRM platform merging communication, traditional CRM, and guest feedback, including QR feedback support and task integration.
- **Academy:** A multi-version learning management system supporting modules, quizzes, AI assistance, learning paths, certificates, badges, and analytics.
- **Factory:** Dedicated kiosk operations, shift management, quality control, lot tracking, station benchmarks, production batches, and worker scoring.
- **HR:** Full employee lifecycle management including documents, disciplinary actions, onboarding, attendance, leaves, payroll calculation, and salary management.
- **Mr. Dobody (AI Agent):** A proactive AI agent for gap detection, task assignment, and workflow completion across various operational categories.
- **Notification System:** Four-level notification system (operational, tactical, strategic, personal) with role-based filtering, category-based frequency control, archiving, and push notifications.
- **Mission Control Dashboards:** Six role-based dashboards provide critical KPIs and insights using monthly snapshots of branch and factory performance.
- **Komuta Merkezi 2.0 (Dynamic Dashboard System):** Widget-based dashboard infrastructure with 19 registered widgets across 7 categories (operasyon, personel, fabrika, finans, egitim, musteri, ekipman). Uses `dashboard_widgets` table for widget registry and `dashboard_role_widgets` table for per-role widget assignments (13 roles configured). Unified endpoint `GET /api/me/dashboard-data` returns role-tailored widgets with real data, KPIs, and quick actions. Admin CRUD via `/api/admin/mc-widgets` and `/api/admin/dashboard-role-widgets`. Route file: `server/routes/unified-dashboard-routes.ts`.

### Pilot Launch & Branch Onboarding
- **Pilot Launch Page** (`/pilot-baslat`): Admin-only page for resetting system data before pilot go-live. Supports selective cleanup of notifications, audit logs, performance scores/metrics, and checklist histories. Includes password reset with mustChangePassword enforcement and double confirmation.
- **Branch Onboarding Wizard**: Automatically shown to branch managers/supervisors when a branch has `setupComplete=false`. Three-step wizard: personnel upload, gap analysis, setup completion.
- **Module Activation Checklist**: Reusable component showing required setup items for newly activated modules (satınalma, hr, checklist, akademi, kalite, fabrika).
- **Pre-Pilot Migration**: Server startup clears all `mustChangePassword=true` flags, disabling the forced password change dialog during pre-pilot phase.
- **Schema**: `branches.setup_complete` boolean column added to track branch onboarding status.
- **API Endpoints**: `POST /api/admin/pilot-launch`, `GET /api/admin/branch-setup-status/:branchId`, `POST /api/admin/branch-setup-complete/:branchId`, `GET /api/admin/module-activation-checklist/:moduleKey`, `GET /api/admin/onboarding-status`

## External Dependencies
- **OpenAI API**: Utilized for AI vision, chat, embeddings, and summarization capabilities.
- **AWS S3 / Replit Object Storage**: Used for cloud-based file storage.
- **Neon Database**: Provides serverless PostgreSQL database services.
- **IONOS SMTP**: Handles email notifications.