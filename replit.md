# DOSPRESSO Franchise Management Platform

## Overview
DOSPRESSO is a comprehensive franchise management platform designed to centralize and streamline operations for a coffee/food franchise network. It integrates HR, factory management, training, finance, CRM, quality control, and equipment management across 22 locations. The platform supports approximately 372 users with 31 distinct roles, providing efficient oversight and data management for a multi-location franchise business. Its purpose is to manage operations, enhance user experience, and drive business growth through data-driven insights.

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
- **Late Arrival Detection (F15 partial):** Branch-scoped tolerance now dynamic via `branch_kiosk_settings.lateToleranceMinutes` — read in `payroll-engine.ts` L43/76, `routes/branches.ts` L2922, `routes/factory.ts` L1100, `routes/pdks.ts` L333. **Açık tek nokta:** `server/agent/skills/late-arrival-tracker.ts` L6-7 hâlâ hardcoded `LATE_THRESHOLD_MINUTES=15` / `SEVERE_LATE_MINUTES=60` — Mr. Dobody daily run yine global eşik kullanır (branch override etkisiz). #311 Bundle 7 follow-up.
- **Şube Puantaj + Fazla Mesai Onay (#311 Bundle 7, kısmi):** Şube ayarları `branch_kiosk_settings` (schema-09) üzerinden — yeni `branch_attendance_settings` tablosu açılmadı, mevcut tablo genişletildi. Default seed `routes/branches.ts` L2586-2592 upsert ile otomatik. Onay workflow: `overtime_requests` (schema-05 L142, status `pending|approved|rejected`) + endpoint'ler `routes/misc.ts` L1182-1327 (GET/POST/approve/reject). UI: `pages/pdks.tsx` `KioskToleranceSettings` + `pages/overtime-requests.tsx`. **Eksik:** `attendance_settings_audit` tablosu yok, `docs/runbooks/attendance-settings.md` runbook yok (taslak yazıldı), Bundle 7'ye özel e2e test yok.
- **Route Guards (F33):** All authenticated routes are role-restricted via `ProtectedRoute`/`HQOnly`/`ExecutiveOnly`/`ModuleGuard`/`FabrikaOnly`. Bare `component={...}` Route'larda direct URL leak riski → Bundle 2'de `/iletisim`, `/nfc-giris`, `/qr-tara`, `/bilgi-bankasi`, `/bildirimler` sarıldı; #325 ile `/duyuru/:id`, `/akademi-ana`, `/ogrenme-yolum` da kapatıldı. CI regression koruması: `scripts/audit/route-guard-coverage.ts` + `.github/workflows/route-guard-coverage.yml` + `scripts/audit/public-routes-whitelist.json` (262 route, 32 bare, 0 violation baseline). Yeni guard'sız Route otomatik fail.
- **Kiosk PIN Coverage (F36):** Pilot Day-1 hedefi %100 PIN kapsama erişildi (#324). `branch_staff_pins` 31→127 aktif (+96), `factory_staff_pins` 13→14 aktif (+1). Migration: `migrations/2026-05-03-pin-seed-pilot.sql` + `scripts/pilot/27-pin-seed-missing.ts` (--dry-run/--apply, bcrypt rounds=10, crypto.randomInt, BANNED_PINS, hash collision tarama, tek transaction, ON CONFLICT idempotent). Pasif/silinmiş kullanıcı PIN'leri otomatik deaktive. Snapshot: `*_bk_20260503` tabloları. Audit: `scripts/audit/pin-coverage-2026-05.sql` (read-only, 0 eksik).

## External Dependencies
- **OpenAI API**: Utilized for AI vision, chat, embeddings, and summarization.
- **AWS S3 / Replit Object Storage**: Cloud-based storage for files.
- **Neon Database**: Provides serverless PostgreSQL database services.
- **IONOS SMTP**: Used for sending email notifications.