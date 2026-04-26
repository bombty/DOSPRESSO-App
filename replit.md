# DOSPRESSO Franchise Management Platform

## Overview
DOSPRESSO is a comprehensive franchise management platform designed to centralize and streamline operations for a coffee/food franchise network. It integrates HR, factory management, training, finance, CRM, quality control, and equipment management across 22 locations (20 branches, 1 HQ, 1 Factory). The platform aims to support 270 users with 29 distinct roles, providing efficient oversight and data management for a multi-location franchise business.

## User Preferences
- Preferred communication: Simple, everyday language, Turkish preferred
- Fast implementation in Build mode, continues with "devam"
- DB schema changes via versioned migrations under `migrations/` (drizzle-kit push times out on this DB)

## Migration Süreci (Task #255 — 26 Nis 2026)
Schema/DB drift'i kapatıldı (13 eksik tablo, 4 UNIQUE, 83 index, 47 FK) ve drizzle-kit baseline'ı oluşturuldu. Bundan sonra şema değişiklikleri:

1. **Schema dosyasını düzenle** → `shared/schema/schema-*.ts`.
2. **Migration üret** → `npx drizzle-kit generate --name=<aciklayici-isim>`. Çıktı `migrations/00NN_<isim>.sql` ve `meta/_journal.json` güncellenir.
3. **DB'ye uygula** → `psql "$DATABASE_URL" -f migrations/00NN_<isim>.sql` (veya destructive değilse `drizzle-orm/migrator`'ı tetikleyen bir script).
4. **Sunucu boot'unda raw DDL kullanma.** Tablo yarat / kolon ekle gibi her şey versiyonlu bir migration dosyasına gitmeli. `server/index.ts` içindeki ham DDL'ler kaldırıldı.
5. **Drift kontrolü** → `tsx scripts/db-drift-check.ts` herhangi bir zamanda çalıştırılabilir; `Eksik tablo / index / FK / UNIQUE = 0` döndürmesi beklenir.

Yardımcı dosyalar:
- `migrations/0000_baseline.sql` — drizzle-kit'in canlı şemadan çıkardığı baseline (yeniden çalıştırılmaz; `tsx scripts/db-mark-baseline-applied.ts` ile "uygulandı" işaretlendi).
- `migrations/task-255-close-drift.sql` — eksik 13 tablo + UNIQUE + index + FK (FK'ler `NOT VALID` ile eklendi).
- `migrations/task-255-startup-ddl.sql` — eski boot-time DDL'in versiyonlanmış hali (kiosk_sessions, branch_kiosk_settings kolonları, branches.setup_complete, users.onboarding_complete).
- `docs/audit/db-drift-report-2026-04-26.md` — tam drift raporu, kapsam dışı 42 kolon-tipi/null mismatch listesi dahil.

## System Architecture

### UI/UX Decisions
The frontend is built with React 18, TypeScript, and Vite, utilizing Shadcn/ui, Tailwind CSS, CVA, and Lucide icons for a modern interface. It employs a modular layout featuring `ModuleLayout`, `ModuleSidebar`, and `KPIStrip` for structured content, alongside 6 role-based Mission Control dashboards using `DashboardKpiStrip`. The design emphasizes mobile responsiveness, touch-friendly interactions, and role-specific quick actions. A server-driven collapsible sidebar dynamically generates navigation menus based on user roles and module feature flags.

### Technical Implementations
- **Authentication:** Session-based authentication via Passport.js supports both web (username/password with bcrypt) and kiosk (PIN-based with bcrypt) logins, incorporating security measures like password stripping, account lockout, and status management.
- **Role System:** A robust Role-Based Access Control (RBAC) system manages 29 roles across HQ, branches, and the factory. Permissions are defined through a static map, and `module_flags` offer granular control over module visibility.
- **Database Schema:** The data model is extensive, organized into 16 modular schema files covering various domains including users, roles, HR, academy, factory operations, CRM, and finance.
- **PDKS Excel Import:** A dedicated 5-table system handles the import of attendance data from external Excel files.
- **Key Architectural Patterns:**
    - **Soft Deletion:** Implemented using a `deleted_at` column across all core business tables.
    - **Data Locking:** Employs time and status-based data locking, supported by a change request workflow.
    - **Query Pattern:** Standardized usage of TanStack Query with `queryKey: ['/api/endpoint']`.
    - **Mutations:** `apiRequest` from `@lib/queryClient` is used for mutations, consistently followed by cache invalidation.

### Feature Specifications
- **Task System:** Features comprehensive task assignment (single and multi-user), comments, evidence, status tracking, recurring tasks, bulk creation, verification, and rating, with CRM integration.
- **Production Planning:** Manages weekly production plans, items, daily records, and responsibilities, incorporating an approval hierarchy.
- **CRM:** A unified platform for communication, traditional CRM functions, and guest feedback, including QR feedback and task integration.
- **Academy:** A multi-version Learning Management System providing modules, quizzes, AI assistance, learning paths, certificates, badges, and analytics.
- **Factory:** Supports kiosk operations, shift management, quality control, lot tracking, station benchmarks, production batches, and worker scoring.
- **HR:** Manages the complete employee lifecycle, including documents, disciplinary actions, onboarding, attendance, leaves, and payroll.
- **Mr. Dobody (AI Agent):** A proactive AI agent designed for gap detection, task assignment, and workflow automation across operational categories.
- **Notification System:** A four-level notification system (operational, tactical, strategic, personal) with role-based filtering, category-based frequency control, archiving, and push notifications.
- **Mission Control Dashboards:** Six role-based dashboards deliver critical KPIs and insights through monthly snapshots of branch and factory performance.
- **Komuta Merkezi 2.0 (Dynamic Dashboard System):** A widget-based dashboard infrastructure with 24 registered widgets across 7 categories. It uses `dashboard_widgets` for registry and `dashboard_role_widgets` for per-role assignments. A unified API endpoint `GET /api/me/dashboard-data` delivers role-tailored widgets with real data, KPIs, and quick actions. Pilot tune (Task #240, 26 Apr 2026): `mudur` rolüne 11 widget (Erdem, Andre), `supervisor` rolüne 12 widget (Basri) atandı, sıralama "branch_status → pdks_attendance → pdks_absence → todays_tasks → quick_actions" ile pilot Day-1 akışına optimize edildi (`scripts/pilot/23-mudur-supervisor-dashboard-pilot-tune.sql`). Roller `mudur` ve `supervisor` (NOT `sube_mudur`/`sube_supervisor`). **Frontend mapping (Task #240b):** `WidgetRenderer.tsx`'e `pdks_attendance` (PdksYoklamaWidget — branchId user'dan, fallback PdksDevamsizlikWidget) ve `pdks_absence` (PdksDevamsizlikWidget scope="all") eklendi; PdksWidget zaten `client/src/components/mission-control/shared/PdksWidget.tsx`'te mevcuttu, sadece widgetMap kaydı eksikti. `branch_score_detail` (sadece supervisor, 1 widget) hâlâ GenericStatWidget fallback ile render olur — post-pilot iyileştirme. Backend collector pattern: `widgetDataCollectors[widget.dataSource]` (line 55-227, unified-dashboard-routes.ts); pdks_* widget'lar REST endpoint'i (`/api/pdks/branch-attendance`, `/api/pdks/dashboard-summary`) frontend'de kendi içinde fetch eder, backend collector gerektirmez. **Fabrika pilot tune (26 Apr 2026):** `fabrika_mudur` (Eren) için 10 widget yeniden sıralandı, default_open=true seti: factory_production → todays_tasks → qc_stats → pending_shipments → equipment_faults; collapsed: equipment_maintenance, staff_count, financial_overview, ai_briefing, quick_actions (`scripts/pilot/25-fabrika-mudur-dashboard-pilot-tune.sql`).
- **Late Arrival Detection:** `LATE_THRESHOLD_MINUTES=15` ve `SEVERE_LATE_MINUTES=60` global hard-coded sabitler (`server/agent/skills/late-arrival-tracker.ts:6-10`). Mr. Dobody skill `late_arrival_tracker` günlük çalışır, target roles: supervisor, mudur, fabrika_mudur, cgo, coach, trainer. Aylık eşikler: 2+ geç = uyarı, 4+ geç = eskalasyon. `pdks-engine.ts:classifyDay` günlük worked/absent/leave klasifikasyonu yapar (late sınıflandırma içermez — late tracking ayrı skill ile yapılır). Per-branch override yok (Task #241 doğrulandı, kodda sabit, branch_kiosk_settings'te kolon yok — pilot için yeterli).

## External Dependencies
- **OpenAI API**: Utilized for AI vision, chat, embeddings, and summarization.
- **AWS S3 / Replit Object Storage**: Cloud-based storage for files.
- **Neon Database**: Provides serverless PostgreSQL database services.
- **IONOS SMTP**: Used for sending email notifications.