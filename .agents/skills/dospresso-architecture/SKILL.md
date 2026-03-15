---
name: dospresso-architecture
description: Complete architecture reference for DOSPRESSO franchise management platform. Covers tech stack, database schema, API patterns, 26-role system, module connections, CI colors, app layout, agent system, and coding conventions. Use when adding new features, routes, components, or tables.
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
├── pages/          # 269 page components (168 root + 101 in subdirs)
├── components/     # 149 components (71 custom + 78 in subdirs including Shadcn UI)
├── contexts/       # DobodyFlow, Theme, Auth
├── hooks/          # Custom React hooks
├── lib/            # Utilities, role-routes.ts
└── App.tsx         # Root with providers + lazy route definitions

server/
├── routes/         # 46 route files, ~1313 endpoints
├── agent/          # Mr. Dobody agent system
│   ├── skills/     # 16 agent skills + 2 utilities
│   └── routing.ts  # Smart notification routing
├── services/       # agent-scheduler, data-lock, change-tracking
├── lib/            # Business logic (pdks-engine, payroll-engine)
├── menu-service.ts # Sidebar blueprint + RBAC menu config
└── shared/schema.ts # 373 tables, 15434 lines
```

## Role System (26 Roles)

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
1. `isAuthenticated` — is user logged in?
2. Role check — `isAdmin`, `isHQOrAdmin`, `isSupervisorPlus`
3. Permission check — `canAccess('module', 'view')`
4. Branch scope — filter data by user's branchId

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
Communication: HQ Support, Notifications, AI Assistant, Agent Center
System: Admin Panel, Content Studio, Projects, Security/Backups

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

## Permission Modules
88 permission module keys defined in `shared/schema.ts` as `PermissionModule` type.
Key groups: dashboard, tasks, checklists, equipment, faults, hr, training, factory_*, academy_*, satinalma, crm_*, food_safety, branch_inspection, cost_management.
Full permission matrix in `PERMISSIONS` record maps each role to allowed actions per module.
