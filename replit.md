# DOSPRESSO Franchise Management Platform

## Overview
DOSPRESSO is a comprehensive franchise management platform designed to centralize and streamline operations for a coffee/food franchise network. It integrates HR, factory management, training, finance, CRM, quality control, and equipment management across 22 locations (20 branches, 1 HQ, 1 Factory). The platform supports approximately 372 users with 31 distinct roles across 326 frontend pages and 1,768 backend endpoints, providing efficient oversight and data management for a multi-location franchise business.

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
The frontend is built with React 18, TypeScript, and Vite, utilizing Shadcn/ui, Tailwind CSS, CVA, and Lucide icons for a modern interface. It employs a modular layout featuring `ModuleLayout`, `ModuleSidebar`, and `KPIStrip` for structured content, alongside 6 role-based Mission Control dashboards using `DashboardKpiStrip`. The design emphasizes mobile responsiveness, touch-friendly interactions, and role-specific quick actions. A server-driven collapsible sidebar dynamically generates navigation menus based on user roles and module feature flags.

### Technical Implementations
- **Authentication:** Session-based authentication via Passport.js supports both web (username/password with bcrypt) and kiosk (PIN-based with bcrypt) logins, incorporating security measures like password stripping, account lockout, and status management.
- **Role System:** A robust Role-Based Access Control (RBAC) system manages 31 roles across HQ, branches, and the factory. Permissions are defined through a static map, and `module_flags` offer granular control over module visibility, with the actual access mechanism served via `role_module_permissions` DB table through `GET /api/me/permissions`.
- **Database Schema:** The data model is extensive, organized into 23 modular schema files defining 455 `pgTable` covering users, roles, HR, academy, factory operations, CRM, and finance.
- **PDKS Excel Import:** A dedicated 5-table system handles the import of attendance data from external Excel files.
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
- **Pilot 5 gün UZATILDI** (2 May 2026, owner kararı) — Day-1 acelesi yok, Sprint 2/3 sırayla işlenir.
- **APP_AUDIT_REPORT_2026-05.md** (Task #278, repo kökü, 820 satır) — 326 sayfa × 1985 endpoint × 806 FE çağrısı tek tarama. Sayısal özet: 326 sayfa, 260 route, 10 gerçek öksüz sayfa, 81 mega-modül alt sayfası, 10 kırık link, 3 menü kırık path, 118 kırık API çağrısı, 1278 ölü endpoint adayı, 8 duplikat/legacy grup. Auto-türetilen 3 task: #282 ✅ IMPLEMENTED, #283 (eksik API), #284 ✅ IMPLEMENTED.
- **Task #282 — 12 kırık link/menü düzeltmesi (IMPLEMENTED, 2 May 2026):** APP_AUDIT Bölüm 3 (10 link) + Bölüm 6.1 (3 menü) statik string replace ile çözüldü. Düzeltme haritası (yanlış→doğru): `/bordro→/bordrom`, `/hq-support→/hq-destek`, `/personel-profil→/profil`, `/finans→/mali-yonetim`, `/waste-executive→/waste`, `/musteri-memnuniyeti→/misafir-memnuniyeti` (×2 yer: hq-dashboard + dashboard-section-config), `/kalite-kontrol→/kalite-kontrol-dashboard`, `/qr-scanner→/qr-tara`, `/leave-requests→/izin-talepleri`, `/overtime-requests→/mesai-talepleri`, `/stok-transferleri` menü kaydı silindi (sayfa yok), `/canli-izleme→/canli-takip`. `/kiosk` (menu-config:302) false positive (NO_SIDEBAR check). Audit Bölüm 1.1 "öksüz import" yanlış pozitif: 5 sayfa wildcard/parametreli route'lara bağlı (`/personel/:id`, `/qr-tara`, `/izin-talepleri`, `/mesai-talepleri`, `/hq-destek`). 10 dosya, 14+/16-. LSP temiz, HMR PASS. Architect APPROVED. Açık takip: `dashboard-section-config.ts`'te `/denetim`, `/kalite`, `/tedarikciler`, `/siparisler` ek doğrulama bekliyor.
- **Sırada:** Task #283 (118 kırık API çağrısı) — kapsam geniş, Plan moduna geçilip dalgalara bölünmeli.

## External Dependencies
- **OpenAI API**: Utilized for AI vision, chat, embeddings, and summarization.
- **AWS S3 / Replit Object Storage**: Cloud-based storage for files.
- **Neon Database**: Provides serverless PostgreSQL database services.
- **IONOS SMTP**: Used for sending email notifications.