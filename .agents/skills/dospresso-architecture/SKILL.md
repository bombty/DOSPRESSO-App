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
├── pages/          # 267 page components
├── components/     # 148 components (custom + Shadcn UI)
├── contexts/       # DobodyFlow, Theme, Auth
├── hooks/          # Custom React hooks
├── lib/            # Utilities, role-routes.ts
└── App.tsx         # Root with providers + lazy route definitions

server/
├── routes/         # 46 route files, ~1320 endpoints
├── agent/          # Mr. Dobody agent system
│   ├── skills/     # 16 agent skills + 2 utilities
│   └── routing.ts  # Smart notification routing
├── services/       # agent-scheduler, data-lock, change-tracking, business-hours
├── lib/            # Business logic (pdks-engine, payroll-engine)
├── menu-service.ts # Sidebar blueprint + RBAC menu config
├── seed-sla-rules.ts # SLA defaults seeded on startup
└── shared/schema.ts # 375 tables, 15533 lines
```

## Role System (27 Roles)

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
fabrika_operator, fabrika_sorumlu, fabrika_personel

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
    const branchId = req.user.role === 'admin' ? req.query.branchId : req.user.branchId;
    const data = await db.select().from(table).where(eq(table.branchId, branchId));
    res.json(data);
  } catch (error) {
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
- `isKioskAuthenticated` middleware (`server/localAuth.ts:500`): checks `x-kiosk-token` header first, then falls back to web session for authorized roles
- `createKioskSession(userId)` → returns UUID token stored in in-memory `Map` with 8hr TTL (`server/localAuth.ts:461`)
- PIN verification uses `bcrypt.compare()` — PINs stored as bcrypt hashes
- `pinLockedUntil` field on user record for lockout after failed attempts
- Device passwords stored in `factory_kiosk_config` (configKey='device_password') and `branch_kiosk_settings` (kioskPassword column) — both bcrypt-hashed
- `migrateKioskPasswords()` runs on server startup (`server/index.ts:156`) to auto-hash any plaintext passwords

### TypeScript req.user Pattern:
```typescript
const user = req.user as Express.User;
const branchId = user.branchId;
```

### Error Responses (always Turkish, never stack traces):
```json
{ "error": "Bu işlem için yetkiniz bulunmamaktadır." }
```

## Agent System (Mr. Dobody)

### 16 Agent Skills:
ai-enrichment, burnout-predictor, contract-tracker, cost-analyzer, customer-watcher, daily-coach, food-safety, performance-coach, production-director, security-monitor, stock-assistant, stock-predictor, supplier-tracker, team-tracker, training-optimizer, waste-analyzer

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

### Shift → PDKS → Payroll:
Shift planning → Kiosk check-in/out → PDKS records → Payroll calculation
- Daily = monthly/30, absent days deducted, overtime ×1.5

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

### Module Keys (31 total)
- **always_on** (6): admin, dashboard, bordro, dobody, fabrika, satinalma
- **ui_hidden_data_continues** (3): pdks, vardiya, fabrika.vardiya
- **fully_hidden** (22): checklist, gorevler, akademi, crm, stok, ekipman, denetim, iletisim_merkezi, raporlar, finans, delegasyon, franchise, fabrika.sevkiyat, fabrika.sayim, fabrika.hammadde, fabrika.siparis, fabrika.kalite, fabrika.kavurma, fabrika.stok, dobody.chat, dobody.bildirim, dobody.flow

### Key Files
- **Schema**: `shared/schema.ts` — `moduleFlags` table definition
- **Service**: `server/services/module-flag-service.ts` — `isModuleEnabled(key, branchId?, context?, userRole?)`, `requireModuleEnabled()`, `getModuleFlagBehavior()`, `PATH_TO_MODULE_KEY_MAP`
- **Routes**: `server/routes/module-flags.ts` — CRUD (admin only) + `/api/module-flags/check?moduleKey=X&context=ui`
- **Seed**: `server/seed-module-flags.ts` — 31 flags (20 modules + 8 fabrika sub-modules + 3 dobody sub-modules), ALTER TABLE migration on startup
- **Menu**: `server/menu-service.ts` — `buildMenuForUser()` filters sidebar items with context="ui" and user role
- **Hook**: `client/src/hooks/use-module-flags.ts` — `useModuleEnabled(moduleKey, context?)`
- **Dobody integration**: `client/src/components/dobody-mini-bar.tsx` (dobody.chat), `client/src/components/dobody-flow-mode.tsx` (dobody.flow)

### Graceful Degradation
When a module is disabled, composite scores and analytics recalculate without it. No crashes — disabled modules are simply excluded from calculations.

## Permission Modules
88 permission module keys defined in `shared/schema.ts` as `PermissionModule` type.
Key groups: dashboard, tasks, checklists, equipment, faults, hr, training, factory_*, academy_*, satinalma, crm_*, food_safety, branch_inspection, cost_management.
Full permission matrix in `PERMISSIONS` record maps each role to allowed actions per module.
