# DOSPRESSO Franchise Management Platform

## Quick Start
- **Run command**: `npm run dev` (workflow: "Start application")
- **Port**: 5000 (Express backend + Vite frontend on same port)
- **Dev URL**: Use `$REPLIT_DEV_DOMAIN` (not localhost) for browser preview

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite (SPA)
- **UI**: Shadcn/ui + Tailwind CSS + CVA
- **State**: TanStack Query v5
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL (Neon serverless) + pgvector
- **ORM**: Drizzle ORM 0.39
- **Auth**: Passport.js (Local strategy) + Session-based + Kiosk PIN auth
- **AI**: OpenAI (GPT-4o, GPT-4o-mini, Vision, Embeddings)
- **Storage**: AWS S3 (Replit Object Storage)
- **i18n**: i18next (TR, EN, AR, DE)

## Critical Rules
1. **User IDs are varchar** — `users` table uses string IDs, all other tables use serial integer
2. **Soft delete everywhere** — `isActive: false` + `deletedAt` timestamp, never hard DELETE on business data
3. **Data locks** — Time/status-based record locking (HTTP 423), change request workflow for locked records
4. **Turkish UI** — All user-facing strings use proper Turkish characters (ş ç ğ ı ö ü İ Ş Ç Ğ Ö Ü), error messages in Turkish
5. **Auth middleware required** — Every endpoint needs `isAuthenticated` or `isKioskAuthenticated`
6. **Kiosk auth** — Factory/branch kiosk endpoints use `isKioskAuthenticated` (not `isAuthenticated`), PIN verified with bcrypt, in-memory sessions with 8hr TTL
7. **req.user casting** — Always `const user = req.user as Express.User;` before accessing properties

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
sube_kiosk — auto-created kiosk account per branch for PDKS check-in/out

## Key Modules
- **Operations**: Dashboard, Tasks, Checklists, Equipment/Faults, Lost & Found, Branch Orders/Stock, Branch Task Board (recurring tasks)
- **HR & Shifts**: Staff Management, Shifts, Attendance (PDKS), Payroll
- **Factory**: Dashboard, Kiosk, Quality Control, Stations, Performance, Compliance, Shipments, Food Safety
- **Training & Academy**: Academy V3 (gamification, badges, leaderboard, learning paths, AI assistant), Knowledge Base
- **Audit & Analytics**: Quality Control, Branch Inspection, Health Score, Food Safety Dashboard
- **Finance & Procurement**: Accounting, Procurement, Inventory, Suppliers, Purchase Orders, Goods Receipt
- **CRM**: Dashboard, Feedback, Complaints, Campaigns, Analytics, Settings
- **İletişim Merkezi**: Support Tickets (SLA-tracked), HQ Tasks, Broadcasts, Dashboard
- **Delegation System**: Module-level role delegation (permanent/temporary)
- **Communication**: HQ Support, Notifications, AI Assistant, Agent Center
- **Franchise/Investor**: Investor profiles, contract tracking, branch performance
- **Webinar**: Webinar management and registration system
- **System**: Admin Panel, Content Studio, Projects, Security/Backups

## Branch Task Board (Sprint 1 + 2)
- **Tables**: `branchTaskCategories`, `branchRecurringTasks`, `branchTaskInstances`, `branchRecurringTaskOverrides` in `shared/schema.ts`
- **Seed**: `server/seed-branch-tasks.ts` — 4 categories (temizlik, bakim, stok, genel) + 4 sample HQ tasks. Registered in `server/index.ts` allSettled.
- **Scheduler**: `server/services/branch-task-scheduler.ts` — `generateDailyTaskInstances()` runs at 00:00-00:10 TR in master 10-min tick + startup catch-up. `markOverdueInstances()` runs alongside. Checks `branchRecurringTaskOverrides` before generating instances (skips overridden branches).
- **API**: `server/routes/branch-tasks.ts` — registered in `server/routes.ts`
  - `GET /api/branch-tasks/categories` — list categories
  - `GET /api/branch-tasks/templates` — list recurring task templates (HQ sees all, branch users see own branch)
  - `POST /api/branch-tasks/templates` — create template (admin/ceo/cgo/coach/trainer/mudur/supervisor)
  - `PATCH /api/branch-tasks/templates/:id` — update template
  - `DELETE /api/branch-tasks/templates/:id` — soft delete template
  - `GET /api/branch-tasks/templates/:id/overrides` — list branch overrides for a template
  - `POST /api/branch-tasks/templates/:id/overrides` — create override (disable for branch)
  - `DELETE /api/branch-tasks/overrides/:id` — remove override (re-enable)
  - `GET /api/branch-tasks/instances` — list task instances (filter by branchId, date, status)
  - `POST /api/branch-tasks/instances/:id/claim` — claim a task
  - `POST /api/branch-tasks/instances/:id/complete` — complete a task
  - `POST /api/branch-tasks/instances/:id/unclaim` — unclaim a task
  - `GET /api/branch-tasks/stats` — completion stats for a branch (includes score + scoreDetails when branchId scoped)
  - `GET /api/branch-tasks/score?branchId=5&days=30` — branch task score (0-100)
  - `GET /api/branch-tasks/score/user/:userId?branchId=5&days=30` — user's task score
  - `GET /api/branch-tasks/kiosk/instances` — today's tasks for kiosk branch (isKioskAuthenticated)
  - `POST /api/branch-tasks/kiosk/:id/claim` — kiosk claim task
  - `POST /api/branch-tasks/kiosk/:id/complete` — kiosk complete task
- **Override table**: `branchRecurringTaskOverrides` — per-branch template disabling with soft delete, unique index on (recurring_task_id, branch_id) WHERE deleted_at IS NULL
- **Görevler UI (Sprint 2)**: 3-tab page in `client/src/pages/tasks.tsx`
  - Tab 1 "Bana Atanan" — existing ad-hoc tasks (unchanged)
  - Tab 2 "Şube Görevleri" — today's branch task instances with claim/unclaim/complete, category filter chips, CompactKPIStrip
  - Tab 3 "Tekrarlayan Yönetimi" — template CRUD, grouped by category, HQ override toggle per branch (only visible for TEMPLATE_ROLES)
- **Dashboard Widget**: `client/src/components/widgets/todays-tasks-widget.tsx` — combined ad-hoc + branch tasks widget on `sube/dashboard.tsx`, progress bar, max 10 items
- **Kiosk Integration**: `KioskBranchTasks` component in `client/src/pages/sube/kiosk.tsx` — shows open branch tasks, claim/complete buttons, uses isKioskAuthenticated endpoints
- **Module flag**: `sube_gorevleri` (fully_hidden) in `server/seed-module-flags.ts`. Scheduler checks `isModuleEnabled("sube_gorevleri", branchId, "data")` before generating instances. Tab 2/3 hidden when disabled, widget hidden, kiosk section hidden.
- **Path mapping**: `/sube-gorevleri` and `/gorev-panosu` → `sube_gorevleri` in `PATH_TO_MODULE_KEY_MAP`
- **Roles**: TEMPLATE_ROLES (create/edit): admin, ceo, cgo, coach, trainer, mudur, supervisor. HQ_ROLES (see all branches): admin, ceo, cgo, coach, trainer, muhasebe_ik, satinalma, marketing, kalite_kontrol, gida_muhendisi, fabrika_mudur. Branch users scoped to their branchId.
- **Instance unique constraint**: `uq_branch_task_instance_recurring_branch_date` on (recurring_task_id, branch_id, due_date)
- **Composite Score Integration (Sprint 3)**: `branchTasks` component added to `server/services/branch-health-scoring.ts`
  - `scoreBranchTasks()` — queries branch_task_instances for completion rate (last 30 days), -5 pts per overdue task (max -30)
  - Weight: 0.12 (existing weights reduced proportionally: inspections 0.19, complaints 0.19, equipment 0.16, training 0.12, opsHygiene 0.11, customerSatisfaction 0.11)
  - `COMPONENT_MODULE_MAP["branchTasks"] = ["sube_gorevleri"]` — excluded when module disabled, weights recalculate proportionally
  - `calculateBranchTaskScore(branchId, userId?, dateRange?)` — exported for per-user and per-branch score queries
  - Score API: `GET /api/branch-tasks/score?branchId=X&days=30`, `GET /api/branch-tasks/score/user/:userId?branchId=X&days=30`
  - Stats endpoint enhanced: returns `score` and `scoreDetails` when branchId scoped

## Kiosk System
- **Factory Kiosk**: PIN-based auth for factory floor workers, device password in `factory_kiosk_config`, station assignment, shift tracking
- **Branch Kiosk**: PIN-based PDKS attendance for branch staff, device password in `branch_kiosk_settings`
- **Auth flow**: PIN verified with bcrypt, `createKioskSession()` returns UUID token, stored in `x-kiosk-token` header
- **Sessions**: In-memory `Map` in `server/localAuth.ts` (line 461), 8hr TTL, lost on server restart
- **Middleware**: `isKioskAuthenticated` checks `x-kiosk-token` header first, then falls back to web session for authorized roles
- **Startup**: `migrateKioskPasswords()` in `server/index.ts` auto-hashes any plaintext passwords on boot

## Module Feature Flags (Sprint 1 + 1B + 1C)
- **Table**: `module_flags` in `shared/schema.ts` — global + branch-level + role-level module toggles with behavior types
- **Columns**: `flag_level` (module/submodule/widget/function), `flag_behavior` (fully_hidden/ui_hidden_data_continues/always_on), `parent_key` (parent module for sub-modules), `target_role` (nullable, role-specific override)
- **Service**: `server/services/module-flag-service.ts` — `isModuleEnabled(key, branchId?, context?, userRole?)` with 60s cache, `requireModuleEnabled()` middleware (passes context="api" + user role), `getModuleFlagBehavior()` helper
- **4-level lookup priority**: branch+role > branch > global+role > global (most specific wins)
- **Behavior types**: `always_on` (always true, ignore isEnabled), `fully_hidden` (standard toggle), `ui_hidden_data_continues` (data context always true, ui/api respect isEnabled)
- **Parent-child**: Sub-modules inherit parent state — if parent disabled, children disabled too (except always_on parents)
- **Routes**: `server/routes/module-flags.ts` — CRUD for flags (admin only) + `/api/module-flags/check?moduleKey=X&context=ui` (authenticated, auto-uses user role)
- **Seed**: `server/seed-module-flags.ts` — 32 flags (21 modules + 8 factory sub-modules + 3 dobody sub-modules) upserted on startup with ALTER TABLE migration
- **Menu integration**: `buildMenuForUser()` in `server/menu-service.ts` filters sidebar items by module flag status (context="ui", passes user role)
- **Frontend hook**: `client/src/hooks/use-module-flags.ts` — `useModuleEnabled(moduleKey, context?)` returns `{ isEnabled, isLoading, isError }`
- **Module keys**: admin, dashboard, bordro, dobody, fabrika, satinalma (always_on); pdks, vardiya (ui_hidden_data_continues); checklist, gorevler, akademi, crm, stok, ekipman, denetim, iletisim_merkezi, raporlar, finans, delegasyon, franchise, sube_gorevleri (fully_hidden)
- **Factory sub-modules**: fabrika.sevkiyat, fabrika.sayim, fabrika.hammadde, fabrika.siparis, fabrika.vardiya, fabrika.kalite, fabrika.kavurma, fabrika.stok
- **Dobody sub-modules**: dobody.chat (DobodyMiniBar), dobody.bildirim (notifications), dobody.flow (DobodyFlowMode)
- **Admin UI**: Admin panel tab "Modül Bayrakları" in `client/src/pages/admin/module-flags.tsx` — toggle flags globally/per-branch/per-role, grouped by category (Sistem, Veri Toplama, Şube Modülleri, Fabrika Alt-Modülleri, Mr. Dobody)
- **Page Protection**: `client/src/components/module-guard.tsx` wraps route pages — shows lock screen when disabled. Applied in `App.tsx` for all toggleable modules
- **Bulk Flags API**: `GET /api/module-flags/my-flags` — returns all effective flags for current user in single call, used by `useMyModuleFlags()` hook
- **Score Integration**: `server/services/branch-health-scoring.ts` — disabled modules excluded from branch health scores, weights recalculated proportionally
- **Agent Filtering**: `server/agent/skills/skill-notifications.ts` — `SKILL_TO_MODULE_MAP` maps skill IDs to module keys, notifications suppressed for disabled modules

## Mobile Compactness Sprint
- **CompactKPIStrip**: `client/src/components/compact-kpi-strip.tsx` — Horizontal scrollable strip on mobile (<md), grid on desktop (md+). Props: `items: KPIItem[]`, `desktopColumns`, `desktopRenderer` (JSX for exact desktop parity). Applied to 18+ pages.
- **MobileFilterCollapse**: `client/src/components/mobile-filter-collapse.tsx` — Wraps filter sections to collapse on mobile by default with "Filtreler (N aktif)" toggle. Desktop unchanged. Applied to 6 filter pages.
- **scrollbar-hidden** CSS class (not scrollbar-hide) — used for hiding scrollbars on mobile scroll strips
- **Mobile test IDs**: CompactKPIStrip mobile items use `${testId}-mobile` suffix to avoid duplicate selectors

## Database Summary
- **Tables**: 379 in `shared/schema.ts`
- **Endpoints**: ~1340 across 48 route files in `server/routes/`
- **Pages**: 267 page components in `client/src/pages/`
- **Components**: 150 components in `client/src/components/`

## Agent Skills Reference
- `.agents/skills/dospresso-architecture/SKILL.md` — Full architecture map
- `.agents/skills/dospresso-debug-guide/SKILL.md` — Debug checklist & triage
- `.agents/skills/dospresso-quality-gate/SKILL.md` — Quality gate checklist
- `.agents/skills/dospresso-sprint-planner/SKILL.md` — Sprint planning rules
- `.agents/skills/dospresso-radix-safety/SKILL.md` — Radix UI package safety

## External Dependencies
- **OpenAI API**: AI vision, chat, embeddings, summaries
- **Replit Auth**: User authentication via OpenID Connect
- **AWS S3**: Cloud storage for uploads and backups
- **Neon Database**: Serverless PostgreSQL
- **IONOS SMTP**: Email notifications

## User Preferences
- Preferred communication: Simple, everyday language, Turkish preferred
- Fast implementation in Build mode, continues with "devam"
