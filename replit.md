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
- **Operations**: Dashboard, Tasks, Checklists, Equipment/Faults, Lost & Found, Branch Orders/Stock
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

## Kiosk System
- **Factory Kiosk**: PIN-based auth for factory floor workers, device password in `factory_kiosk_config`, station assignment, shift tracking
- **Branch Kiosk**: PIN-based PDKS attendance for branch staff, device password in `branch_kiosk_settings`
- **Auth flow**: PIN verified with bcrypt, `createKioskSession()` returns UUID token, stored in `x-kiosk-token` header
- **Sessions**: In-memory `Map` in `server/localAuth.ts` (line 461), 8hr TTL, lost on server restart
- **Middleware**: `isKioskAuthenticated` checks `x-kiosk-token` header first, then falls back to web session for authorized roles
- **Startup**: `migrateKioskPasswords()` in `server/index.ts` auto-hashes any plaintext passwords on boot

## Module Feature Flags (Sprint 1 + 1B)
- **Table**: `module_flags` in `shared/schema.ts` — global + branch-level module toggles with behavior types
- **Columns (Sprint 1B)**: `flag_level` (module/submodule/widget/function), `flag_behavior` (fully_hidden/ui_hidden_data_continues/always_on), `parent_key` (parent module for sub-modules)
- **Service**: `server/services/module-flag-service.ts` — `isModuleEnabled(key, branchId?, context?)` with 60s cache, `requireModuleEnabled()` middleware (passes context="api"), `getModuleFlagBehavior()` helper
- **Behavior types**: `always_on` (always true, ignore isEnabled), `fully_hidden` (standard toggle), `ui_hidden_data_continues` (data context always true, ui/api respect isEnabled)
- **Parent-child**: Sub-modules inherit parent state — if parent disabled, children disabled too (except always_on parents)
- **Routes**: `server/routes/module-flags.ts` — CRUD for flags (admin only) + `/api/module-flags/check?moduleKey=X&context=ui` (authenticated)
- **Seed**: `server/seed-module-flags.ts` — 28 flags (20 modules + 8 factory sub-modules) upserted on startup with ALTER TABLE migration
- **Menu integration**: `buildMenuForUser()` in `server/menu-service.ts` filters sidebar items by module flag status (context="ui")
- **Frontend hook**: `client/src/hooks/use-module-flags.ts` — `useModuleEnabled(moduleKey, context?)` returns `{ isEnabled, isLoading, isError }`
- **Module keys**: admin, dashboard, bordro, dobody, fabrika, satinalma (always_on); pdks, vardiya (ui_hidden_data_continues); checklist, gorevler, akademi, crm, stok, ekipman, denetim, iletisim_merkezi, raporlar, finans, delegasyon, franchise (fully_hidden)
- **Factory sub-modules**: fabrika.sevkiyat, fabrika.sayim, fabrika.hammadde, fabrika.siparis, fabrika.vardiya, fabrika.kalite, fabrika.kavurma, fabrika.stok

## Database Summary
- **Tables**: 376 in `shared/schema.ts`
- **Endpoints**: ~1326 across 47 route files in `server/routes/`
- **Pages**: 267 page components in `client/src/pages/`
- **Components**: 148 components in `client/src/components/`

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
