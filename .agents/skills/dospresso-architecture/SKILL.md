---
name: dospresso-architecture
description: Complete architecture reference for DOSPRESSO franchise management platform. Covers tech stack, database schema, API patterns, 27-role system, module connections, CI colors, app layout, agent system, kiosk auth, and coding conventions. Use when adding new features, routes, components, or tables.
---

# DOSPRESSO Architecture Map

## Tech Stack
- Frontend: React 18 + TypeScript + Vite (SPA, NOT Next.js)
- UI: Shadcn/ui + Tailwind CSS + CVA
- State: TanStack Query v5
- Backend: Node.js + Express.js + TypeScript
- Database: PostgreSQL (Neon serverless) + pgvector
- ORM: Drizzle ORM 0.39
- Auth: Passport.js (Local strategy) + Session-based
- AI: OpenAI (GPT-4o, GPT-4o-mini, Vision, Embeddings)
- Storage: AWS S3 (Replit Object Storage)
- i18n: i18next (TR, EN, AR, DE)

## CI Colors
DOSPRESSO uses a Navy Blue + Light Blue Gradient + Red Accent corporate palette.
- Primary (buttons, active states): Red `0 84% 52%` (light) / `0 84% 55%` (dark)
- Sidebar primary matches the main primary red
- All color vars defined in `client/src/index.css` using HSL space-separated format

## Project Structure
```
client/src/
├── pages/          # 313 page components
├── components/     # 148 components (custom + Shadcn UI)
├── contexts/       # DobodyFlow, Theme, Auth
├── hooks/          # Custom React hooks
├── lib/            # Utilities, role-routes.ts
└── App.tsx         # Root with providers + 155 lazy route definitions

server/
├── routes/         # 111 route files, ~1708+ endpoints
├── agent/          # Mr. Dobody agent system
│   ├── skills/     # 29 agent skills + 2 utilities
│   └── routing.ts  # Smart notification routing
├── services/       # agent-scheduler, data-lock, change-tracking, business-hours, payroll-bridge
├── lib/            # Business logic (pdks-engine, payroll-engine)
├── menu-service.ts # Sidebar blueprint + RBAC menu config
├── seed-sla-rules.ts # SLA defaults seeded on startup
└── shared/schema/  # 463 tables across 22 modular schema files (barrel: shared/schema.ts)
```

## Role System (30 Roles)

### System:
admin

### Executive:
ceo, cgo

### HQ Department Roles:
muhasebe_ik, satinalma, coach, marketing, trainer, kalite_kontrol, gida_muhendisi, fabrika_mudur

### Legacy HQ Roles:
muhasebe, teknik, destek, fabrika, yatirimci_hq

### Branch Roles (lowest → highest):
stajyer, bar_buddy, barista, supervisor_buddy, supervisor, mudur, yatirimci_branch

### Factory Floor Roles:
fabrika_operator, fabrika_sorumlu, fabrika_personel, sef, recete_gm, uretim_sefi

### Kiosk Roles:
sube_kiosk — auto-created kiosk account per branch, used for PDKS check-in/out at branch kiosks

### Role Groupings (shared/schema.ts):
- `HQ_ROLES` — admin + ceo + cgo + all HQ department + legacy roles
- `EXECUTIVE_ROLES` — admin + ceo + cgo
- `BRANCH_ROLES` — stajyer through yatirimci_branch
- `FACTORY_FLOOR_ROLES` — fabrika_operator, fabrika_sorumlu, fabrika_personel
- `DEPARTMENT_DASHBOARD_ROUTES` — maps roles to dedicated dashboard paths

## App Layout
- SidebarProvider wraps the app (Shadcn sidebar primitives)
- Sidebar menu items defined in `server/menu-service.ts` → `SIDEBAR_ALLOWED_ITEMS`
- Max 6 items per role (except admin)
- Roles with ≤6 items get flat sidebar (no groups/accordions)
- Admin gets grouped sidebar
- Routes are lazy-loaded in `client/src/App.tsx`
- Role-specific home paths defined in `client/src/lib/role-routes.ts`

## API Conventions

### Route Pattern:
```typescript
router.get("/api/resource", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const branchId = user.role === 'admin' ? req.query.branchId : user.branchId;
    const data = await db.select().from(table).where(eq(table.branchId, branchId));
    res.json(data);
  } catch (err: unknown) {
    console.error("[Module] error:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Veriler yüklenirken bir hata oluştu." });
  }
});
```

### Auth Middleware Order:
1. `isAuthenticated` — is user logged in? (web session)
2. `isKioskAuthenticated` — kiosk token or authorized web session (for kiosk endpoints)
3. Role check — `isAdmin`, `isHQOrAdmin`, `isSupervisorPlus`
4. Permission check — `canAccess('module', 'view')`
5. Branch scope — filter data by user's branchId

### Kiosk Auth Pattern:
Kiosk endpoints use `isKioskAuthenticated` instead of `isAuthenticated`.
```typescript
router.post('/api/factory/kiosk/start-shift', isKioskAuthenticated, async (req, res) => { ... });
```
- `isKioskAuthenticated` middleware (`server/localAuth.ts`): async, checks `x-kiosk-token` header first, then falls back to web session for authorized roles
- `createKioskSession(userId)` → async, returns UUID token stored in `kiosk_sessions` PostgreSQL table with 8hr TTL + 30s in-memory cache layer
- All session functions are async: `createKioskSession`, `validateKioskSession`, `updateKioskStation`, `deleteKioskSession`
- Sessions persist across server restarts; expired sessions cleaned on startup + hourly
- `GET /api/factory/kiosk/active-sessions` — HQ-only endpoint to view active kiosk auth sessions
- PIN verification uses `bcrypt.compare()` — PINs stored as bcrypt hashes
- `pinLockedUntil` field on user record for lockout after failed attempts
- Device passwords stored in `factory_kiosk_config` (configKey='device_password') and `branch_kiosk_settings` (kioskPassword column) — both bcrypt-hashed
- `migrateKioskPasswords()` runs on server startup (`server/index.ts:156`) to auto-hash any plaintext passwords

### TypeScript req.user Pattern:
```typescript
import { AuthUser } from "../types/auth";
const user = req.user as AuthUser;
const branchId = user.branchId;
```
NEVER use `(req.user as any)` — always use `AuthUser` type from `server/types/auth.ts`.

### Error Responses (always Turkish, never stack traces):
```json
{ "error": "Bu işlem için yetkiniz bulunmamaktadır." }
```

## Agent System (Mr. Dobody)

### 29 Agent Skills:
ai-enrichment, burnout-predictor, contract-tracker, cost-analyzer, customer-watcher, daily-coach, food-safety, performance-coach, production-director, qc-tracker, security-monitor, stock-assistant, stock-predictor, supplier-tracker, team-tracker, training-optimizer, waste-analyzer, payroll-reminder, career-progression-tracker, equipment-lifecycle-tracker, supply-chain-monitor, daily-briefing, smart-reminder, auto-todo-from-ticket, plus additional skills added in recent sprints

### training-optimizer (Enhanced):
Weekly skill targeting trainer/coach/ceo/cgo/admin. 11 insight types:
1. overall_completion_rate — assignment completion % (30d)
2. low_completion_modules — modules with <40% completion
3. high_completion_modules — modules with >90% completion
4. hardest_quiz_questions — quizzes with >50% fail rate
5. quiz_score_trends — 30d vs 60d average score comparison
6. branch_training_comparison — inactive branches, low/top performers
7. personal_training_recommendations — overdue assignments, failed-not-retried
8. onboarding_status — incomplete onboarding >7 days
9. usage_report — weekly branch usage rates
10. certification_pipeline — pending exams, recent certificates
11. quiz_gap_detection — modules without quizzes, few questions
Data sources: trainingAssignments, trainingCompletions, userTrainingProgress, userQuizAttempts, quizResults, quizQuestions, moduleQuizzes, userCareerProgress, examRequests, employeeOnboardingProgress, issuedCertificates, branches, users
Test endpoint: GET /api/agent/test-skill/training_optimizer (admin only)

### Utilities:
skill-registry.ts (loads/runs skills by schedule), skill-notifications.ts (queued delivery)

### Scheduling:
- `agent-scheduler.ts` runs hourly/daily/weekly ticks
- Hourly: escalation + skills + routing (skips quiet hours)
- Daily: runs at 07:00 TR time
- Weekly: scheduled skills

### Routing:
Agent skill generates action → `routing.ts` finds correct recipient by category →
primary_role gets notification + task → escalation after N days → CGO sees summary

## Critical Business Logic Chains

### Factory → Branch Stock:
Production → QC (2-stage) → LOT → Shipment → Branch Inventory
- ALL status changes use transactions + FOR UPDATE
- FIFO LOT assignment by expiry date

### Shift → PDKS → Payroll (Unified Engine):
Shift planning → Kiosk check-in/out → PDKS records → Payroll calculation
- Motor 1 (pdks-engine): PDKS → gün sınıflandırma → PdksMonthSummary
- Motor 2 (payroll-calculation-service): SGK/vergi/AGI hesaplama
- Bridge (payroll-bridge): Motor1 + Motor2 birleşik, Excel adapter, kiosk/excel dual source
- monthly_payroll tablosu: SGK, vergi, AGI, kümülatif vergi matrahı, dataSource (kiosk/excel), calculationMode (unified/simple)
- API: POST /api/payroll/calculate-unified (branchId, year, month, dataSource, importId)
- PDF generator: `server/utils/pdf-generator.ts` (pdf-lib)
- PDF export: `GET /api/payroll/export/pdf/:year/:month`

### Recipe System (Factory):
- 9 tables in schema-22: factory_recipes, ingredients, steps, keyblends, keyblend_ingredients, production_logs, recipe_versions, category_access, ingredient_nutrition
- 4-tier permission: admin > recete_gm > sef > view-only (gida_muhendisi, operators)
- Keyblend secret: only admin + recete_gm see contents. Others see name + total percentage only
- Auto-versioning: PATCH /api/factory/recipes/:id → snapshot (ingredients + steps + cost) BEFORE update
  - RGM/Admin edit → auto-approved. Sef edit → pending (needs RGM approval)
  - skipVersion: true for minor changes (name/description only)
- Production logs: recipeVersionId + recipeVersionNumber captured at start-production
- QC link: production_logs.qualityScore + qcNotes
- 14 EU/TR allergens auto-detected from ingredients
- rawMaterialId FK: factory_recipe_ingredients → inventory (for MRP-Light)

### Inventory Price Structure:
- Dual price: lastPurchasePrice (gerçek alım) + marketPrice (güncel piyasa, ürün fiyatlama)
- inventory_price_history: fiyat geçmişi (purchase/market), kaynak (excel_import/manual/purchase_order)
- materialType: HM/YM/MM/TM/TK (Excel import mapping)
- Unit conversion: purchaseUnit (KG/ADET) ↔ recipeUnit (g/ml) via conversionFactor
- Excel Import API: POST /api/inventory/import-excel (preview + import modes, 408 material parse)
- Price update API: PATCH /api/inventory/:id/market-price (satınalma monthly update)

### Protected Route Group Mapping (client/src/components/protected-route.tsx):
- `admin` → ['admin']
- `ceo`, `cgo` → ['admin', 'hq']
- `muhasebe`, `muhasebe_ik`, `teknik`, `destek`, `coach`, `satinalma`, `marketing`, `trainer`, `kalite_kontrol`, `gida_muhendisi` → ['hq']
- `fabrika`, `fabrika_mudur` → ['fabrika', 'hq']
- `fabrika_operator`, `sef`, `recete_gm`, `uretim_sefi` → ['fabrika']
- `supervisor`, `supervisor_buddy`, `barista`, `bar_buddy`, `stajyer`, `mudur`, `yatirimci_branch` → ['sube']
- Guards: HQOnly=['admin','hq'], FabrikaOnly=['admin','hq','fabrika'], ExecutiveOnly=explicit role list

### Key Role Notes:
- `gida_muhendisi` (Sema): Factory-only, QC approve, food safety. NO branch_orders/inventory. Has factory-recipes sidebar (read-only)
- `recete_gm` (RGM): Full recipe control + Keyblend + production planning + cost analysis. Fabrika group
- `sef`: Recipe edit (category-restricted), production mode. Fabrika group

## Module Connections (Key Dependencies)
- Composite Score depends on: checklist, training, attendance, feedback, tasks
- Payroll depends on: PDKS, position_salaries, scheduled_offs
- Mr. Dobody Flow depends on: all modules (generates role-specific tasks)
- Factory shipment depends on: inventory, LOT, quality checks
- Badge unlock depends on: training completions, quiz results
- Academy V3 depends on: training, badges, leaderboard, learning paths, AI assistant
- CRM depends on: customer feedback, complaints, campaigns
- Branch inspection depends on: quality audit, health score

## Completed Modules
Operations: Dashboard, Tasks, Checklists, Equipment/Faults, Lost & Found, Branch Orders/Stock
HR & Shifts: Staff Management, Shifts, Attendance (PDKS), Payroll
Factory: Dashboard, Kiosk, Quality Control, Stations, Performance, Compliance, Shipments, Food Safety
Training & Academy: Academy V3 (gamification, badges, leaderboard, learning paths, AI assistant), Knowledge Base
Audit & Analytics: Quality Control, Branch Inspection, Health Score, Food Safety Dashboard
Finance & Procurement: Accounting, Procurement (Satınalma), Inventory, Suppliers, Purchase Orders, Goods Receipt
CRM: Dashboard, Feedback, Complaints, Campaigns, Analytics, Settings
İletişim Merkezi: Support Tickets (SLA-tracked), HQ Tasks, Broadcasts, Dashboard — `server/routes/crm-iletisim.ts`
Delegation System: Module-level role delegation (permanent/temporary) — `server/routes/delegation-routes.ts`
SLA Business Hours: Configurable work hours, business-hour-aware SLA deadlines — `server/services/business-hours.ts`
Kiosk System: Factory + Branch PIN auth, device passwords, shift tracking — `server/routes/factory.ts` kiosk endpoints
Franchise/Investor: Investor profiles, contract tracking, branch performance — `server/routes/franchise-investors.ts`
Webinar: Webinar management and registration system
Communication: HQ Support, Notifications, AI Assistant, Agent Center
System: Admin Panel, Content Studio, Projects, Security/Backups

### İK Module Enhancement:
- İK Dashboard KPIs: `GET /api/hr/ik-dashboard` (document stats, disciplinary stats)
- Document CRUD: `GET/POST /api/hr/employees/:userId/documents`, `PATCH .../verify`, `DELETE`
- Disciplinary CRUD: `GET/POST /api/hr/disciplinary`, `PATCH .../status`, `POST .../respond`
- Auto-lot creation: `createAutoLot()` in factory.ts (3 production insert points)
- QC Stats: `GET /api/factory/qc/stats` (today/week quality checks and lots)
- QC Tracker skill: `server/agent/skills/qc-tracker.ts` (daily, targets gida_muhendisi/kalite_kontrol/fabrika_mudur)
- AuthUser type: `server/types/auth.ts` (centralized type for req.user)

## New Tables (Recent Sprints)
- `support_tickets` — İletişim Merkezi tickets with SLA tracking
- `support_ticket_comments` — Ticket comments (internal/external)
- `ticket_attachments` — File attachments on tickets
- `hq_tasks` — HQ internal task assignment system
- `broadcast_receipts` — Announcement delivery confirmations
- `sla_rules` — Department × priority SLA hour limits (seeded by `server/seed-sla-rules.ts`)
- `sla_business_hours` — Single-row config for work hours and timezone
- `factory_kiosk_config` — Factory kiosk device settings (device_password, etc.)
- `branch_kiosk_settings` — Branch kiosk passwords and config
- `kiosk_sessions` — PostgreSQL-backed kiosk auth sessions (token, user_id, station_id, expires_at)
- `module_delegations` — Module-level role delegation records
- `module_departments` — Department definitions for delegation
- `module_department_topics` — Topic categories within departments
- `franchise_investors` — Investor profiles with contract data
- `franchise_investor_branches` — Investor ↔ branch associations
- `franchise_investor_notes` — Meeting notes for investors
- `factory_station_benchmarks` — Station performance benchmarks
- `webinars` — Webinar definitions
- `webinar_registrations` — Webinar attendance records

## New Route Files (Recent Sprints)
- `server/routes/crm-iletisim.ts` — İletişim Merkezi (tickets, HQ tasks, broadcasts, dashboard, SLA)
- `server/routes/delegation-routes.ts` — Module delegation CRUD
- `server/routes/module-content-routes.ts` — Module content and topic management
- `server/routes/franchise-investors.ts` — Franchise investor management
- `server/routes/franchise-summary.ts` — Franchise performance summaries
- `server/routes/academy-v3.ts` — Academy V3 with webinars
- `server/routes/change-requests.ts` — Data change request workflow for locked records
- `server/routes/dobody-task-manager.ts` — Mr. Dobody task management
- `server/routes/dobody-avatars.ts` — Dynamic avatar system for Mr. Dobody
- `server/routes/dobody-flow.ts` — Guided workflow mode for daily tasks
- `server/routes/coach-summary.ts` — Coach role dashboard summaries
- `server/routes/hq-summary.ts` — HQ executive dashboard summaries

## Database Naming Conventions
- Table names: snake_case (factory_products, branch_inventory)
- Column names: camelCase in Drizzle schema (branchId, createdAt)
- Timestamps: always with timezone
- Soft delete: isActive boolean + deletedAt timestamp
- IDs: serial integer (not UUID, except users table which uses string IDs)

## Data Protection Tables
- `data_lock_rules` — time-based lock rules per table
- `data_change_requests` — change request workflow (pending → approved/rejected)
- `record_revisions` — immutable revision history for all changes
- `data_change_log` — field-level change tracking

## API Response Format Variations
IMPORTANT: Not all APIs return arrays. Known object-wrapped responses:
- `/api/faults` → `{data: [...]}`
- `/api/agent/actions` → `{actions: [...]}`
- `/api/admin/dobody-tasks` → `{tasks: [...]}`
- Most other endpoints → direct array `[...]`

Frontend MUST normalize: `Array.isArray(data) ? data : (data?.data || data?.actions || data?.tasks || data?.items || [])`

## Module Feature Flag System
Table: `module_flags` in `shared/schema.ts` — global + branch-level + role-level module toggles with behavior types.

### Table Columns
- `moduleKey` (varchar 100) — unique module identifier
- `scope` (varchar 20) — "global" or "branch"
- `branchId` (integer, nullable) — NULL for global, branch ID for overrides
- `isEnabled` (boolean) — toggle state
- `flagLevel` (varchar 20) — "module" | "submodule" | "widget" | "function"
- `flagBehavior` (varchar 30) — "fully_hidden" | "ui_hidden_data_continues" | "always_on"
- `parentKey` (varchar 100, nullable) — parent moduleKey for sub-modules
- `targetRole` (varchar 50, nullable) — NULL = all roles, "barista" = only that role

### 4-Level Lookup Priority (most specific wins)
1. **Level 1**: branch + role override (branchId=X, targetRole="barista")
2. **Level 2**: branch override (branchId=X, targetRole=NULL)
3. **Level 3**: global + role override (scope="global", targetRole="barista")
4. **Level 4**: global default (scope="global", targetRole=NULL)

### Behavior Types
1. **always_on** — always returns true regardless of isEnabled. Used for core modules (admin, dashboard, fabrika, satinalma, bordro, dobody).
2. **fully_hidden** — standard toggle. When disabled, module is completely hidden from UI and API returns 403.
3. **ui_hidden_data_continues** — when context="data", always returns true (data collection continues even if UI is hidden). Used for pdks, vardiya, fabrika.vardiya.

### Parent-Child Hierarchy
Sub-modules have a `parentKey` pointing to their parent module. If parent is disabled, all children are disabled too (exception: always_on parents are never disabled).

### Factory Sub-Modules (8)
fabrika.sevkiyat, fabrika.sayim, fabrika.hammadde, fabrika.siparis, fabrika.vardiya, fabrika.kalite, fabrika.kavurma, fabrika.stok

### Dobody Sub-Modules (3)
dobody.chat (DobodyMiniBar), dobody.flow (DobodyFlowMode), dobody.bildirim (notification delivery)

### Module Keys (34 total)
- **always_on** (6): admin, dashboard, bordro, dobody, fabrika, satinalma
- **ui_hidden_data_continues** (3): pdks, vardiya, fabrika.vardiya
- **fully_hidden** (22): checklist, gorevler, akademi, crm, stok, ekipman, denetim, iletisim_merkezi, raporlar, finans, delegasyon, franchise, fabrika.sevkiyat, fabrika.sayim, fabrika.hammadde, fabrika.siparis, fabrika.kalite, fabrika.kavurma, fabrika.stok, dobody.chat, dobody.bildirim, dobody.flow

### Key Files
- **Schema**: `shared/schema.ts` — `moduleFlags` table definition
- **Service**: `server/services/module-flag-service.ts` — `isModuleEnabled(key, branchId?, context?, userRole?)`, `requireModuleEnabled()`, `getModuleFlagBehavior()`, `PATH_TO_MODULE_KEY_MAP`
- **Routes**: `server/routes/module-flags.ts` — CRUD (admin only) + `/api/module-flags/check?moduleKey=X&context=ui`
- **Seed**: `server/seed-module-flags.ts` — 34 flags (23 modules + 8 fabrika sub-modules + 3 dobody sub-modules), ALTER TABLE migration on startup
- **Menu**: `server/menu-service.ts` — `buildMenuForUser()` filters sidebar items with context="ui" and user role
- **Hook**: `client/src/hooks/use-module-flags.ts` — `useModuleEnabled(moduleKey, context?)`
- **Dobody integration**: `client/src/components/dobody-mini-bar.tsx` (dobody.chat), `client/src/components/dobody-flow-mode.tsx` (dobody.flow)
- **Admin UI**: `client/src/pages/admin/module-flags.tsx` — tab "modul-bayraklari" in admin-mega.tsx, 5 category cards, branch override management, role-based overrides accordion
- **Page Protection**: `client/src/components/module-guard.tsx` — wraps route pages, shows lock screen when disabled. Applied in `App.tsx` for all toggleable modules
- **Bulk Flags**: `GET /api/module-flags/my-flags` — single endpoint returns all effective flags for current user (branchId + role), used by `useMyModuleFlags()` hook
- **Score Integration**: `server/services/branch-health-scoring.ts` — `isComponentEnabled()` checks module flags before including components in health score. Uses context="data" so pdks/vardiya always included. Components: inspections(0.19), complaints(0.19), equipment(0.16), training(0.12), opsHygiene(0.11), customerSatisfaction(0.11), branchTasks(0.12). `branchTasks` maps to `sube_gorevleri` module key
- **Agent Filtering**: `server/agent/skills/skill-notifications.ts` — `SKILL_TO_MODULE_MAP` maps skill IDs to module keys. Notifications skipped for disabled modules

### Graceful Degradation
When a module is disabled:
- Route pages show ModuleGuard lock screen ("Bu modül şu anda aktif değildir")
- Sidebar menu items filtered via `buildMenuForUser()` (context="ui")
- Branch health scores recalculate proportionally without disabled components
- Agent notifications for that module are suppressed (throttled)
- Data collection continues for `ui_hidden_data_continues` modules (pdks, vardiya)

## Mobile UI Components
- CompactKPIStrip (`client/src/components/compact-kpi-strip.tsx`) — horizontal scroll strip on mobile, grid on desktop. Used in 19+ pages.
- MobileFilterCollapse (`client/src/components/mobile-filter-collapse.tsx`) — auto-collapse filters on mobile, expand on desktop. Used in 7+ pages.
- Pattern: mobile (<md) gets compact view, desktop (md+) stays unchanged.

## Branch Recurring Tasks
- Tables: `branch_recurring_tasks` (templates), `branch_task_instances` (daily), `branch_task_categories` (4), `branch_recurring_task_overrides`
- Scheduler: generates daily instances at startup + 08:00 TR, marks overdue
- UI: 3-tab Görevler page (Bana Atanan / Şube Görevleri / Tekrarlayan Yönetimi)
- Dashboard: TodaysTasksWidget (combined ad-hoc + recurring)
- Kiosk: KioskBranchTasks section
- Score: branchTasks component in health scoring (weight 0.12)
- Module flag: `sube_gorevleri`

## Certificate System
- Tables: `issued_certificates`, `certificate_settings`
- Templates: 5 role transition + module completion
- Renderer: `client/src/components/certificate-renderer.tsx`
- Features: Dancing Script handwriting font, DOSPRESSO logo watermark, vintage seal, dual signatures
- HQ: SertifikaTab in akademi-hq (create/preview/print)
- API: `/api/certificates` (CRUD), `/api/certificate-settings` (signer config)

## Permission Modules
88 permission module keys defined in `shared/schema.ts` as `PermissionModule` type.
Key groups: dashboard, tasks, checklists, equipment, faults, hr, training, factory_*, academy_*, satinalma, crm_*, food_safety, branch_inspection, cost_management.
Full permission matrix in `PERMISSIONS` record maps each role to allowed actions per module.
