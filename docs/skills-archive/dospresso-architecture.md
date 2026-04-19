---
name: dospresso-architecture
description: Complete architecture reference for DOSPRESSO franchise management platform. Covers tech stack, database schema, API patterns, role system, module connections, and coding conventions. Use when adding new features, routes, components, or tables.
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

## Project Structure
```
client/src/
├── pages/          # 169 page components
├── components/     # 69 custom + 53 Shadcn UI
├── contexts/       # DobodyFlow, Theme, Auth
├── hooks/          # Custom React hooks
├── lib/            # Utilities, role-routes.ts
└── App.tsx         # Root with providers

server/
├── routes/         # 40 route files, 1229 endpoints
├── agent/          # Mr. Dobody agent system
│   ├── skills/     # 12+ agent skills
│   └── routing.ts  # Smart notification routing
├── lib/            # Business logic (pdks-engine, payroll-engine)
├── services/       # data-lock, change-tracking
└── shared/schema.ts # 349 tables, 14854 lines
```

## Role System (21 Roles)

### Branch Roles (work at a specific branch):
barista, bar_buddy, stajyer, supervisor, supervisor_buddy, mudur, yatirimci_branch

### HQ Roles (see all branches):
ceo, cgo, admin, coach, trainer, marketing, muhasebe, muhasebe_ik, satinalma, kalite_kontrol, gida_muhendisi, teknik, destek, yatirimci_hq

### Factory Roles:
fabrika_mudur, fabrika_operator, fabrika_sorumlu, fabrika_personel

## Sidebar Rules
- Max 6 items per role (except admin)
- Defined in: server/menu-service.ts → SIDEBAR_ALLOWED_ITEMS
- Roles with ≤6 items get flat sidebar (no groups/accordions)
- Admin gets grouped sidebar

## API Conventions

### Route Pattern:
```typescript
router.get("/api/resource", isAuthenticated, async (req, res) => {
  try {
    // Branch-scoped for branch roles:
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

### Error Responses (always Turkish, never stack traces):
```json
{ "error": "Bu işlem için yetkiniz bulunmamaktadır." }
```

## Critical Business Logic Chains

### Factory → Branch Stock:
Production → QC (2-stage) → LOT → Shipment → Branch Inventory
- ALL status changes use transactions + FOR UPDATE
- FIFO LOT assignment by expiry date

### Shift → PDKS → Payroll:
Shift planning → Kiosk check-in/out → PDKS records → Payroll calculation
- Daily = monthly/30, absent days deducted, overtime ×1.5

### Agent Routing:
Agent skill generates action → routing.ts finds correct recipient by category →
primary_role gets notification + task → escalation after N days → CGO sees summary

## Module Connections (Key Dependencies)
- Composite Score depends on: checklist, training, attendance, feedback, tasks
- Payroll depends on: PDKS, position_salaries, scheduled_offs
- Mr. Dobody Flow depends on: all modules (generates role-specific tasks)
- Factory shipment depends on: inventory, LOT, quality checks
- Badge unlock depends on: training completions, quiz results

## Database Naming Conventions
- Table names: snake_case (factory_products, branch_inventory)
- Column names: camelCase in Drizzle schema (branchId, createdAt)
- Timestamps: always with timezone
- Soft delete: isActive boolean + deletedAt timestamp
- IDs: serial integer (not UUID, except users table which uses string IDs)

## Sprint 27 Data Protection Tables
- `data_lock_rules` — 13 time-based lock rules per table
- `data_change_requests` — change request workflow (pending → approved/rejected)
- `record_revisions` — immutable revision history for all changes
- `data_change_log` — field-level change tracking

## API Response Format Variations
IMPORTANT: Not all APIs return arrays. Known object-wrapped responses:
- `/api/faults` → `{data: [...]}`
- `/api/agent/actions` → `{actions: [...]}`
- `/api/admin/dobody-tasks` → `{tasks: [...]}`
- Most other endpoints → direct array `[...]`

Frontend MUST normalize: `Array.isArray(data) ? data : (data?.data || [])`

## Pilot Hazırlık 2026 — Yeni Helper Library (server/lib/)

### server/lib/datetime.ts (Sprint D — 19 Nis 2026)
TR timezone (Europe/Istanbul) için merkezi formatter. UTC↔TR sınır geçişi bug'ını önler.

```typescript
import { trDateString, trTimeString, trTimeStringShort } from "../lib/datetime";

const dateStr = trDateString(now);    // 'YYYY-MM-DD' (TR saatinde)
const timeStr = trTimeString(now);    // 'HH:MM:SS'
const timeShort = trTimeStringShort(now);  // 'HH:MM'
```

**Hangi yerlerde kullan**:
- Tüm kiosk handler'larda (branches.ts, factory.ts) PDKS insert ederken
- Backfill SQL'lerinde `AT TIME ZONE 'Europe/Istanbul'`
- Monthly summary period_month (YYYY-MM)

### server/lib/crit-log.ts (Sprint E — 19 Nis 2026)
Silent failure'ların admin paneline yansıması için.

```typescript
import { critLog } from "../lib/crit-log";

try {
  await db.insert(pdksRecords).values({...});
} catch (pdksErr) {
  critLog("PDKS-SYNC", "Branch kiosk giris: pdks yazılamadı", {
    userId, branchId, error: pdksErr instanceof Error ? pdksErr.message : String(pdksErr),
  }, "branches.ts:2924").catch(() => {});
}
```

**Tag konvansiyonları**: PDKS-SYNC, HQ-KIOSK, FAB-KIOSK, AGENT-FAIL, MIGRATION-ERR, SCHEDULER-ERR

## Pilot Hazırlık 2026 — Yeni Tablolar

### task_escalation_log (Sprint A.2)
Notification spam Plan A.2 — tasks loop'ta 7-gün dedup için.
- `task_id`, `escalation_level`, `sent_at`, `target_user_id`, `branch_id`
- INDEX: (task_id, escalation_level, sent_at), (sent_at)
- Etki: ~900/gün spam → ~0
- TODO Sprint I: DB-level UNIQUE(task_id, escalation_level) constraint

### monthly_attendance_summaries (Var olan ama Sprint B.3 ile scheduler eklendi)
- UPSERT yapısı (UNIQUE(user_id, period_month))
- Scheduler: `startPdksMonthlyAttendanceSummaryScheduler()` — ayın 1'i 01:00 TR
- Startup catch-up: 3 ay (idempotent)
- 141 user × 3 ay = 423 satır (test edildi 19 Nis)

### system_critical_logs (Sprint E)
Silent failure görünürlüğü için.
- `tag`, `message`, `context jsonb`, `source_location`, `status`, `acknowledged_*`
- INDEX: created_at DESC, status, tag
- Endpoint: `/api/admin/critical-logs` (admin/ceo/cgo/adminhq)
- Sayfa: `/admin/critical-logs` (UI Replit'te yapılacak)

## Pilot Hazırlık 2026 — Yeni Endpoint'ler

### GET /api/pdks/consistency-check (Sprint B.1)
**Salt-okunur** PDKS pipeline tutarsızlık analizi.
- Query: `?days=30&branchId=5`
- Yetki: admin, ceo, cgo, muhasebe_ik
- Çıktı: `missing_shift_attendance` + `missing_pdks_record` + diagnosis
- Pilot KRİTİK metrik: `missing_pdks_record.count`

### GET /api/pilot/day-status (Sprint G)
4 sayısal eşik otomatik ölçer + GO/ATTENTION/NO_GO karar.
- Query: `?date=2026-04-28` (varsayılan: bugün TR)
- Yetki: admin, ceo, cgo, adminhq
- Eşikler: login >%95, task >10/şube, error <%5, smoke >7/8
- 3/4 kuralı: 3+ sağlanırsa pilot devam
- Sayfa: `/admin/pilot-dashboard`

### GET /api/admin/critical-logs (Sprint E)
Silent failure log listesi.
- Query: `?tag=PDKS-SYNC&status=new&days=7&limit=50`
- POST /:id/ack — admin "gördüm" işaretle
- GET /summary — 24h özet (dashboard widget)

## Pilot Hazırlık 2026 — Aktif Schedulerlar

server/index.ts içinde:
- `startPdksMonthlyPayrollScheduler()` — ayın 1'i 04:00 TR
- `startPdksMonthlyAttendanceSummaryScheduler()` — ayın 1'i 01:00 TR (Sprint B.3)
- `startFranchiseEscalationScheduler()` — her 6 saat (A.2 dedup ile)

Migration startup'ta:
- `migrateEscalationTables()`
- `migrateCrmTaskTables()`
- `migrateCriticalLogsTable()` (Sprint E)

## Pilot 4 Lokasyon — Branch ID'ler

```typescript
const PILOT_BRANCH_IDS = [5, 8, 23, 24];
// 5 = Işıklar
// 8 = Lara
// 23 = HQ
// 24 = Fabrika
```

Pilot başlangıcı: 28 Nisan 2026 Salı 09:00 (FAZAL: Işıklar+HQ → 24 saat → Lara+Fabrika)
