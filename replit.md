# DOSPRESSO Franchise Management Platform

## Overview
DOSPRESSO is a comprehensive franchise management platform designed to centralize and streamline operations for a coffee/food franchise network. It integrates HR, factory management, training, finance, CRM, quality control, and equipment management across 22 locations (20 branches, 1 HQ, 1 Factory). The platform supports approximately 372 users with 31 distinct roles, providing efficient oversight and data management for a multi-location franchise business. Its purpose is to manage operations, enhance user experience, and drive business growth through data-driven insights.

## User Preferences
- Preferred communication: Simple, everyday language, Turkish preferred
- Fast implementation in Build mode, continues with "devam"
- DB schema changes via versioned migrations under `migrations/` (drizzle-kit push times out on this DB)
- ChatGPT + Claude geçici devre dışı, sadece Replit Agent ile ilerlenir.
- Plan/Build mode ayrımı titiz: DB write, schema, migration, env değişiklik için Plan moduna geçiş + isolated task agent + backup + dry-run + GO zorunlu.
- DOCS-ONLY işler Build modunda yapılabilir (plan dosyaları, audit, runbook, skill güncelleme).
- Force push yasak; commit/push owner Replit Shell'den manuel.
- `session-protocol` skill (`.agents/skills/session-protocol/SKILL.md`) her oturum sonu 5 adım zorunlu (devir teslim push, 4 skill update, docs/, replit.md memory, sonraki oturum talimatı).

## System Architecture

### UI/UX Decisions
The frontend is built with React 18, TypeScript, and Vite, utilizing Shadcn/ui, Tailwind CSS, CVA, and Lucide icons for a modern interface. It employs a modular layout featuring `ModuleLayout`, `ModuleSidebar`, and `KPIStrip` for structured content, alongside 6 role-based Mission Control dashboards. The design emphasizes mobile responsiveness, touch-friendly interactions, and role-specific quick actions. A server-driven collapsible sidebar dynamically generates navigation menus based on user roles and module feature flags.

### Technical Implementations
- **Authentication:** Session-based authentication via Passport.js supports both web (username/password with bcrypt) and kiosk (PIN-based with bcrypt) logins, incorporating security measures like password stripping, account lockout, and status management.
- **Role System:** A robust Role-Based Access Control (RBAC) system manages 31 roles across HQ, branches, and the factory. Permissions are defined through a static map, and `module_flags` offer granular control over module visibility, with access managed via the `role_module_permissions` DB table.
- **Database Schema:** The data model is extensive, organized into 23 modular schema files defining 455 `pgTable` covering users, roles, HR, academy, factory operations, CRM, and finance.
- **Key Architectural Patterns:**
    - **Soft Deletion:** Implemented using a `deleted_at` column across all core business tables.
    - **Data Locking:** Employs time and status-based data locking, supported by a change request workflow.
    - **Query Pattern:** Standardized usage of TanStack Query with `queryKey: ['/api/endpoint']`.
    - **Mutations:** `apiRequest` from `@lib/queryClient` is used for mutations, consistently followed by cache invalidation.

### Feature Specifications
- **Task System:** Features comprehensive task assignment, comments, evidence, status tracking, recurring tasks, bulk creation, verification, and rating, with CRM integration.
- **Production Planning:** Manages weekly production plans, items, daily records, and responsibilities, incorporating an approval hierarchy.
- **CRM:** A unified platform for communication, traditional CRM functions, and guest feedback, including QR feedback and task integration.
- **Academy:** A multi-version Learning Management System providing modules, quizzes, AI assistance, learning paths, certificates, badges, and analytics.
- **Factory:** Supports kiosk operations, shift management, quality control, lot tracking, station benchmarks, production batches, and worker scoring.
- **HR:** Manages the complete employee lifecycle, including documents, disciplinary actions, onboarding, attendance, leaves, and payroll.
- **Mr. Dobody (AI Agent):** A proactive AI agent designed for gap detection, task assignment, and workflow automation across operational categories.
- **Notification System:** A four-level notification system (operational, tactical, strategic, personal) with role-based filtering, category-based frequency control, archiving, and push notifications.
- **Mission Control Dashboards:** Six role-based dashboards deliver critical KPIs and insights through monthly snapshots of branch and factory performance.
- **Komuta Merkezi 2.0 (Dynamic Dashboard System):** A widget-based dashboard infrastructure with 24 registered widgets across 7 categories. It uses `dashboard_widgets` for registry and `dashboard_role_widgets` for per-role assignments. A unified API endpoint `GET /api/me/dashboard-data` delivers role-tailored widgets with real data, KPIs, and quick actions.
- **Late Arrival Detection:** Uses `LATE_THRESHOLD_MINUTES=15` and `SEVERE_LATE_MINUTES=60` global hard-coded constants. Mr. Dobody skill `late_arrival_tracker` runs daily, targeting specific roles.

## Pilot & Sprint Durumu (May 2026)
- **Pilot 5 gün UZATILDI** (2 May 2026, owner kararı). Feature freeze 18 Nis–15 Haz, sadece `fix/chore/docs/refactor/test` commit prefix.
- **Task #305 — Bundle 1A DB Drift Kapatma (MERGED, 3 May 2026):** drift 195 → 58 (kalan = #314 Bundle 1B 13 missing tables); 42 kolon drift TAM kapatıldı; ai_settings'e 6 yeni kolon. Migration `migrations/sprint-2ext-drift-close.sql`. **Bonus:** post-restart 3 ayrı runtime hata sınıfı (`monthly_budget_usd does not exist` ×6, `SLATracker TypeError` ×6, `skill.generateActions` ×5) stale connection collateral damage'ı olarak çözüldü → `dospresso-debug-guide §17 "Post-Migration Workflow Restart ZORUNLU"` maddesi eklendi.
- **Task #306 — Bundle 2 Day-1 Güvenlik (PARTIAL, 3 May 2026):** F33 guard sarımı (`client/src/App.tsx`): 6 gerçek riskli sayfa wrap'lendi → `/personel/:id` (HR/yönetim 11 rol), `/sube-vardiya-takibi` (8 rol), `/egitim/:id` (ModuleGuard akademi), `/izin-talepleri` + `/mesai-talepleri` (HR 9 rol), `/performans` (yönetim 9 rol). Pragmatik daraltma: F33 listesindeki 13 sayfanın 7'si zaten kişisel (/bildirimler, /performansim, /qr-tara, /bilgi-bankasi, /nfc-giris) veya guard'lı (/duyurular, /icerik-studyosu, /personel-onboarding-akisi). Mevcut `protected-route.tsx` + `module-guard.tsx` yeterli, yeni component üretilmedi. F36 PIN coverage audit: `scripts/audit/pin-coverage-2026-05.sql` + `docs/security/pin-coverage-2026-05-report.txt` (READ-ONLY). 176 aktif user, 31 unique branch PIN + 13 unique factory PIN. **BRANCH ihtiyacı 138 user, 115 satır eksik (%83)**, **FACTORY ihtiyacı 18 user, 2 eksik (%11)**. PIN seed migration BU TASK'TA YAPILMADI (DB write 117 row, owner GO + isolated agent + backup zorunlu) — ayrı follow-up önerildi.
- **Task #307 — Bundle 3 Dashboard Router v4↔v5 Çakışması (DONE, 3 May 2026):** F01 çözüldü + v4 ölü kod TAM silindi. **Routing fix (`client/src/App.tsx`):** 6 v4 route Centrum (v5) tek doğru yola yönlendirildi → `/control` ve `/franchise-ozet` `ROLE_CONTROL_PATH[role]` (role-aware), `/merkez-dashboard` → `/muhasebe-centrum`, `/kalite-kontrol-dashboard` → `/fabrika-centrum`, `/kocluk-paneli` → `/coach-kontrol-merkezi`, `/fabrika/dashboard` → `/fabrika-centrum` (FabrikaDashboardRedirect eski hedef `/fabrika`). **Dead code purge (18 dosya, ~2500 satır):** silinen — `client/src/components/mission-control/{DashboardRouter,DashboardModeToggle,MissionControlHQ,Coach,Muhasebe,Supervisor,Stajyer,Fabrika,Yatirimci,Dynamic}.tsx` (10), `client/src/hooks/useDashboardMode.ts`, `client/src/pages/{control-dashboard,merkez-dashboard,kalite-kontrol-dashboard,kocluk-paneli,franchise-ozet,hq-dashboard,benim-gunum,sube-ozet}.tsx` + `client/src/pages/fabrika/dashboard.tsx` (8). App.tsx 9 lazy import temizlendi. role-routes.ts comment v5'e güncellendi. App health 200, HMR clean, v4 referans scan = 0 hit. Geriye kalan mission-control içerik: `dashboard-section-config.ts`, `DobodyPanel.tsx`, `shared/`, `widgets/` (Komuta Merkezi 2.0 widget altyapısı, korunur).
- **Bekleyen bundle'lar (PROPOSED/PENDING):** #308 (PDKS Sync Trio + Atomic Stok), #309 (Mevzuat + Mali Fix), #310 (Mr.Dobody Skills), #314 (Bundle 1B drift kalanı 13 missing tables), #317 (PIN seed migration, plan mode).

## External Dependencies
- **OpenAI API**: Utilized for AI vision, chat, embeddings, and summarization.
- **AWS S3 / Replit Object Storage**: Cloud-based storage for files.
- **Neon Database**: Provides serverless PostgreSQL database services.
- **IONOS SMTP**: Used for sending email notifications.