# DOSPRESSO Franchise Management Platform

## Overview
DOSPRESSO is a comprehensive franchise management platform for a coffee/food franchise network (22 locations: 20 branches + 1 HQ + 1 Factory). It streamlines operations across HR, factory management, training, finance, CRM, quality, and equipment. The platform supports 28 distinct roles, 270 users, 386 DB tables, 96 backend route files, and 277 frontend pages.

## User Preferences
- Preferred communication: Simple, everyday language, Turkish preferred
- Fast implementation in Build mode, continues with "devam"
- DB schema changes via raw psql (drizzle-kit push times out)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| UI Library | Shadcn/ui, Tailwind CSS, CVA, Lucide icons |
| State | TanStack Query v5 (object form only) |
| Routing | Wouter |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL (Neon serverless), Drizzle ORM |
| Vector DB | pgvector (embeddings) |
| Auth | Passport.js (local + kiosk PIN strategies), session-based |
| AI | OpenAI GPT-4o, GPT-4o-mini, Vision, Embeddings |
| Storage | AWS S3 (Replit Object Storage) |
| Email | IONOS SMTP |
| i18n | i18next (TR, EN, AR, DE) |

## System Architecture

### Authentication
- **Web Login:** `/api/login` with username/password (bcrypt hashed in `hashed_password` column)
- **Kiosk PIN:** `factory_staff_pins` table with `hashed_pin` column (bcrypt), `branch_staff_pins` for branches
- **Session-based:** Express session with PostgreSQL store
- **Security:** Password stripping from responses, account lockout, `account_status` field (approved/pending/locked)
- **AuthUser type:** `server/types/auth.ts` — always use instead of `req.user as any`

### Role System (28 Roles)
```
HQ Roles: admin, ceo, cgo, muhasebe_ik, satinalma, coach, marketing, trainer,
          kalite_kontrol, gida_muhendisi, muhasebe, teknik, destek, yatirimci_hq
Branch Roles: supervisor, mudur, barista, stajyer, bar_buddy, supervisor_buddy,
              yatirimci_branch, sube_kiosk
Factory Roles: fabrika_mudur, uretim_sefi, fabrika_operator, fabrika_sorumlu, fabrika_personel
Special: fabrika (legacy)
```
- Role detection: `isHQRole()`, `isBranchRole()`, `isFactoryRole()` in `shared/schema/schema-01.ts`
- Static permissions: `PERMISSIONS` map in `shared/schema/schema-02.ts`
- Dynamic permissions: `role_permissions` table (currently empty, static fallback active)
- Module feature flags: `module_flags` table (33 flags), global/branch/role-level toggling

### Database Schema (18 Schema Files)
```
shared/schema/schema-01.ts    — Users, roles, branches, core types
shared/schema/schema-02.ts    — PERMISSIONS map, checklists, equipment, tasks
shared/schema/schema-03.ts    — HR, attendance, leaves, warnings
shared/schema/schema-04.ts    — Academy, badges, certificates
shared/schema/schema-05.ts    — Factory, quality, kiosk
shared/schema/schema-06.ts    — CRM, feedback, campaigns
shared/schema/schema-07.ts    — Notifications, messaging
shared/schema/schema-08.ts    — AI agent, rules engine
shared/schema/schema-09.ts    — Equipment extended
shared/schema/schema-10.ts    — Branch tasks, recurring
shared/schema/schema-11.ts    — Waste management
shared/schema/schema-12.ts    — Onboarding v2
shared/schema/schema-13.ts    — Data management, change requests
shared/schema/schema-14-relations.ts — Drizzle relations
shared/schema/schema-15-ajanda.ts    — Agenda, todos, notes
shared/schema/schema-16-financial.ts — Financial, cari, payroll
shared/schema/schema-17-snapshots.ts — Monthly branch/factory snapshots
shared/schema/schema-18-production-planning.ts — Production planning
```

### Key Architectural Patterns
- **Soft Deletion:** `deleted_at` column on all business tables
- **Data Locking:** Time/status-based locks with change request workflow
- **Collapsible Sidebar:** Server-driven menu via `/api/me/menu`, `SIDEBAR_ALLOWED_ITEMS` per role in `server/menu-service.ts`
- **Module Layout:** `ModuleLayout` + `ModuleSidebar` + `KPIStrip` for module pages (Equipment, HR, Academy, Factory)
- **Mission Control:** 6 role-based dashboards using `DashboardKpiStrip`
- **Query Pattern:** `queryKey: ['/api/endpoint']` — default fetcher handles URL, no custom queryFn needed
- **Mutations:** Use `apiRequest` from `@lib/queryClient`, always invalidate cache after
- **Mobile Compactness:** Touch-friendly UI, role-based quick actions

## Frontend Structure

### Pages (277 total)
```
client/src/pages/
├── admin/                    — 24 admin pages
│   ├── kullanicilar.tsx      — User management
│   ├── module-flags.tsx      — Feature flag management
│   ├── dobody-gorev-yonetimi.tsx — Mr. Dobody task management
│   └── ...
├── fabrika/                  — Factory pages
│   ├── kiosk.tsx             — Factory kiosk (PIN login, production, QC)
│   ├── dashboard.tsx         — Factory dashboard
│   ├── uretim-planlama.tsx   — Production planning (Weekly Plan + Comparison tabs)
│   ├── vardiya-planlama.tsx  — Shift planning
│   └── ...
├── tasks.tsx (1881 lines)    — Task management
├── gorev-detay.tsx (2030)    — Task detail
├── crm-mega.tsx              — Unified CRM (Franchise/Misafir/Task channels)
├── ekipman-mega.tsx          — Equipment module (ModuleLayout)
├── akademi-mega.tsx          — Academy module
├── ik.tsx                    — HR module
├── ajanda.tsx                — Agenda (calendar, todos, notes)
├── bildirimler.tsx           — Notifications
└── ...
```

### Component Structure
```
client/src/components/
├── ui/                       — 53 Shadcn UI primitives
├── module-layout/            — ModuleLayout, ModuleSidebar, KPIStrip
├── shared/                   — KPIPills
├── mission-control/          — 6 dashboard components + DobodyPanel
├── dashboard/                — AlertPanel, BranchComparisonTable, DateRangeFilter, EmptyStateCard, TrendChart
├── widgets/                  — Quick actions, stats, calendar, hero, timeline
├── hr/                       — DisciplinaryDialogs, OnboardingTaskDialog
├── fabrika/                  — WeeklyPlanTab, PlanComparisonTab
├── mobile/                   — BaristaQuickActions, SupervisorQuickBar
├── collapsible-sidebar.tsx   — Main app sidebar (server-driven)
├── app-header.tsx            — Header with profile dropdown (Profilim, Destek, Çıkış)
├── quick-task-modal.tsx      — Quick task creation (799 lines)
├── dobody-task-assign-dialog.tsx — Mr. Dobody task assignment
└── daily-task-panel.tsx      — Daily task panel
```

## Backend Structure

### Route Files (96 total, key ones)
```
server/routes/
├── tasks.ts (2319)           — Task CRUD, assignment, verification, rating
├── factory.ts (7440)         — Factory operations, kiosk, QC, shifts
├── hr.ts (7389)              — HR management, employees, attendance
├── operations.ts (5771)      — Operational endpoints
├── branches.ts (4388)        — Branch management
├── admin.ts (3502)           — Admin endpoints
├── shifts.ts (2999)          — Shift management
├── academy.ts (2902)         — Academy v1
├── academy-v2.ts (2259)      — Academy v2
├── crm-iletisim.ts (1564)    — CRM/Communication center
├── equipment.ts (1511)       — Equipment management
├── production-planning-routes.ts (493) — Production planning API
├── quick-action.ts (395)     — Quick actions (supervisor+)
├── hq-support-routes.ts (218) — HQ support tickets
└── ...
```

### Services (29 services)
```
server/services/
├── agent-engine.ts           — AI agent engine
├── agent-scheduler.ts        — Agent scheduling
├── branch-health-scoring.ts  — Branch health scores
├── factory-scoring-service.ts — Factory worker scoring
├── cross-module-analyzer.ts  — Cross-module intelligence
├── branch-financial-service.ts — Branch P&L
├── payroll-calculation-service.ts — SGK/tax calculations
├── monthly-snapshot-service.ts — Monthly KPI snapshots
├── module-flag-service.ts    — Feature flag evaluation
├── notification-level-filter.ts — Role-based notification filtering
├── shiftScheduler.ts         — Shift AI planner
├── waste-rules.ts            — Waste management rules
└── ...
```

### Menu System
- `server/menu-service.ts` — Builds role-specific sidebar menus
- `MENU_BLUEPRINT` — Master menu definition with sections/items
- `SIDEBAR_ALLOWED_ITEMS` — Per-role item ID whitelist
- Scope filtering: admin/hq/branch/factory
- Module flag integration: items hidden if module disabled
- Permission check: `canAccessModule()` against static PERMISSIONS or dynamic role_permissions

### Seed Files (22 seed files)
- Auto-run on startup: roles, admin menu, recipes, academy categories, module flags, permissions, service requests, audit templates, branch tasks, factory products/stations/suppliers
- Key data: 22 branches, 145 recipes, 100 factory products (16 categories), 33 module flags, 124 permission modules, 28 roles

## Key Modules

### Task System
- **DB:** `tasks` (47 columns, 1202 records), `task_assignees`, `task_evidence`, `task_ratings`, `task_status_history`, `task_steps`, `task_triggers`
- **Assignment:** Dual system — `assigned_to_id` (single, legacy, 99% used) + `task_assignees` (multi, new, barely used)
- **Status flow:** beklemede → devam_ediyor → foto_bekleniyor → incelemede → onaylandi/reddedildi/iptal_edildi
- **Priority:** Mixed language (EN: low/medium/high + TR: orta/yüksek/kritik)
- **Features:** Recurring tasks, bulk creation, verification, rating, checker workflow, evidence, auto-generation via triggers

### Production Planning (Sprint 10)
- **Tables:** `weekly_production_plans`, `production_plan_items`, `daily_production_records`, `production_responsibilities`
- **API:** `/api/production-planning/*` — plans CRUD, copy-from-last-week, comparison, responsibilities
- **Approval hierarchy:** draft → suggested → approved (PLAN_MANAGE_ROLES: uretim_sefi, fabrika_sorumlu, trainer / APPROVE_ROLES: admin, ceo, cgo, fabrika_mudur, coach)
- **UI:** WeeklyPlanTab (453 lines), PlanComparisonTab (175 lines) in uretim-planlama.tsx
- **Kiosk:** "Üretim Planla" button opens `/fabrika/uretim-planlama` in new tab
- **Responsibilities:** Ümit (uretim_sefi) → 70 products (bakery/pastry), Eren (fabrika_mudur) → 93 products (beverages/syrups)

### CRM (Unified)
- Merged İletişim Merkezi + CRM + Misafir Memnuniyeti
- Three channels: Franchise, Misafir, Görevler (Tasks)
- Task channel shows ajanda todos (not actual tasks table)
- QR feedback support

### Academy
- V1/V2/V3 systems, 8 categories, module editor, quiz, AI assistant
- Learning paths, certificates, badges, leaderboard, streak tracker
- Supervisor panel, cohort/branch analytics

### Factory
- Kiosk (PIN auth), shift management, QC, lot tracking
- Station benchmarks, production batches, quality measurements
- Scoring service (daily/weekly worker scores)
- Food safety, compliance, shipments

### HR
- Employee management, documents, disciplinary, onboarding
- Attendance, leaves, overtime, warnings
- Payroll calculation (SGK/tax), salary management
- Employee types, benefits, satisfaction scores

### Mr. Dobody (AI Agent)
- Proactive gap detection across 15 categories
- Skills: payroll reminders, career progression, equipment lifecycle, supply chain
- Task assignment dialog, flow completions
- Avatars, daily briefings, action outcomes

### Notification System
- 4 levels: operational/tactical/strategic/personal
- Role-based filtering (CEO = strategic only)
- Category-based frequency, archiving
- Push notifications (VAPID), "Dobody Aksiyon Al" quick-actions
- Preferences per user

### Mission Control Dashboards
- 6 role-based: Executive/HQ, Coach, Muhasebe, Supervisor, Stajyer, Factory
- Monthly snapshots: `branch_monthly_snapshots`, `factory_monthly_snapshots` (30+ KPIs)
- Dashboard API: `/api/dashboard/{executive,coach,branch/:id,finance,factory,barista}`
- Date filtering: today/week/month/quarter/custom

## Known Issues / Technical Debt

### Priority (Needs Fix)
1. **Task priority mixed language:** EN (low/medium/high) + TR (orta/yüksek/kritik) in same table
2. **Dual task assignment:** `assigned_to_id` vs `task_assignees` — 99% uses old single-assign
3. **CRM Task channel disconnected:** Shows ajanda todos, not actual tasks
4. **5 KPI components:** DashboardKpiStrip, KPIStrip (ModuleLayout), CompactKPIStrip, KPIPills, custom KPICell (MissionControlHQ) — needs standardization

### Awareness
- `drizzle-kit push` times out — always use raw psql for schema changes
- Header profile dropdown minimal (only Profilim, Destek, Çıkış)
- No "Görev Ata" quick action in header
- ModuleLayout sidebar vs CollapsibleSidebar are separate systems
- `role_permissions` DB table is empty (static PERMISSIONS map used as fallback)

## Branch IDs
```
Lara=8, Işıklar=5, HQ=23, Factory=24
```

## Critical Files — DO NOT MODIFY
```
server/localAuth.ts     — Auth strategies
server/vite.ts          — Vite dev server setup
vite.config.ts          — Vite configuration
package.json            — Dependencies (use packager tool)
drizzle.config.ts       — Drizzle config
```

## External Dependencies
- **OpenAI API**: AI vision, chat, embeddings, summarization
- **Replit Auth**: User authentication integration
- **AWS S3 / Replit Object Storage**: Cloud file storage
- **Neon Database**: Serverless PostgreSQL
- **IONOS SMTP**: Email notifications (SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL)
