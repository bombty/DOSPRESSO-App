---
name: dospresso-debug-guide
description: DOSPRESSO-specific debugging procedures for common issues. Covers 401/403 auth errors, stale TanStack cache, empty results, FK constraint errors, Radix UI crashes, HTTP 423 data locks, SLA timezone issues, TypeScript req.user pattern, kiosk auth failures, SLA business hours issues, and delegation system issues. Use when investigating any bug or unexpected behavior.
---

# DOSPRESSO Debug Checklist

## Quick Triage — Identify the Symptom

| Symptom | Jump to |
|---------|---------|
| 401 Unauthorized | §1 Auth |
| 403 Forbidden | §2 Role/Permission |
| Stale UI data | §3 TanStack Cache |
| Empty list / no data | §4 Branch Scope |
| FK constraint error | §5 Database |
| `dispatcher.useState` crash | §6 Radix |
| HTTP 423 Locked | §7 Data Lock |
| SLA/schedule off by hours | §8 Timezone |
| TypeScript `req.user` error | §9 TypeScript |
| Kiosk login/PIN fails | §10 Kiosk Auth |
| SLA deadline wrong | §11 SLA Business Hours |
| Delegated module not visible | §12 Delegation |

---

## §1 — 401 Unauthorized
User is not logged in or session expired.

```bash
grep -n "isAuthenticated" server/routes/[ROUTE_FILE].ts | head -5
```

Checklist:
- [ ] Endpoint has `isAuthenticated` middleware
- [ ] Session cookie (`connect.sid`) is present in request
- [ ] User exists and `is_active = true` in DB
- [ ] Passport `deserializeUser` succeeds (check server logs)

---

## §2 — 403 Forbidden
User is logged in but lacks the required role or permission.

```bash
grep -A 5 "[ENDPOINT_PATH]" server/routes/[ROUTE_FILE].ts | grep -i "role\|admin\|auth\|permission\|canAccess"
```

Checklist:
- [ ] Correct middleware used: `isAdmin`, `isHQOrAdmin`, `isSupervisorPlus`, `canAccess(module, action)`
- [ ] User's role matches what middleware expects
- [ ] Permission matrix in `shared/schema.ts` → `PERMISSIONS` grants this role the action on this module
- [ ] For `canAccess`: verify the `PermissionModule` key matches

---

## §3 — TanStack Query Stale Cache
Data updated via API but UI shows old value.

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['/api/specific-endpoint'] });
}
```

Checklist:
- [ ] Mutation's `onSuccess` invalidates the correct `queryKey`
- [ ] queryKey uses array segments for hierarchical keys: `['/api/resource', id]` not template literal
- [ ] `queryClient` imported from `@/lib/queryClient`
- [ ] No stale closure capturing old data in callbacks

Browser console debug:
```javascript
window.__TANSTACK_QUERY_CLIENT__?.getQueryCache().getAll().map(q => ({ key: q.queryKey, status: q.state.status }))
```

---

## §4 — Empty Results / Wrong Branch Scope
HQ user sees nothing (no branchId filter applied) or branch user sees other branch data.

Checklist:
- [ ] HQ roles: `branchId` should be NULL (sees all branches) — query should NOT filter by branchId
- [ ] Branch roles: `branchId` must match their assigned branch — query MUST filter
- [ ] Admin check pattern: `req.user.role === 'admin' ? req.query.branchId : req.user.branchId`
- [ ] Frontend sends `branchId` as query param for HQ views with branch selector

---

## §5 — FK Constraint / Database Errors
Foreign key violation or constraint error on INSERT/UPDATE.

```bash
grep -rn "references(" shared/schema.ts | grep "[TABLE_NAME]" | head -10
```

Checklist:
- [ ] Referenced record exists before inserting
- [ ] Correct column type (integer vs string ID)
- [ ] `users` table uses string IDs; all other tables use serial integer
- [ ] Soft-deleted records (`isActive: false`) may still be referenced — check if query filters them out

---

## §6 — Radix UI Crash (`dispatcher.useState`)
`null is not an object (evaluating 'dispatcher.useState')`

```bash
find node_modules/@radix-ui -mindepth 2 -name "node_modules" -type d 2>/dev/null
```

Must return empty. If nested packages found:
1. Identify which package caused nesting
2. Downgrade to compatible version (pin exact, no `^` caret)
3. Clear Vite cache: `rm -rf node_modules/.vite`
4. Bump Service Worker version in `client/public/service-worker.js`

---

## §7 — HTTP 423 Data Lock
User gets "Bu kayıt kilitli" when editing.

```sql
SELECT * FROM data_lock_rules WHERE table_name = '[TABLE]';
SELECT id, created_at FROM [TABLE] WHERE id = [RECORD_ID];
```

Checklist:
- [ ] Check `data_lock_rules` for the table's lock_after_days
- [ ] `record.created_at + lock_after_days > now()` → record is locked
- [ ] Locked records need a `data_change_request` (pending → approved) to modify
- [ ] Some tables lock immediately on approval/delivery (factory_quality_checks, factory_shipments)

---

## §8 — SLA / Timezone Issues
Scheduled jobs, escalation timers, or daily reports fire at wrong time.

Checklist:
- [ ] Server timezone vs Istanbul (UTC+3): agent-scheduler targets 07:00 TR for daily skills
- [ ] `new Date()` returns UTC on server — compare with `Europe/Istanbul`
- [ ] Quiet hours check in scheduler skips hourly skills during off-hours
- [ ] Drizzle timestamps use `with timezone` — verify queries account for TZ

---

## §9 — TypeScript req.user Pattern
`Property 'branchId' does not exist on type 'User'`

```typescript
import { AuthUser } from "../types/auth";
const user = req.user as AuthUser;
const branchId = user.branchId;
```

Always cast `req.user` to `AuthUser` (from `server/types/auth.ts`) before accessing custom properties. NEVER use `req.user as any`. The `AuthUser` type is centralized and covers all user fields (id, username, role, branchId, etc.).

---

## §10 — Kiosk Auth Failures
Kiosk login returns 401 or PIN verification fails.

Checklist:
- [ ] Endpoint uses `isKioskAuthenticated` (NOT `isAuthenticated`) — kiosk endpoints must use the kiosk middleware
- [ ] `x-kiosk-token` header is sent with the request from the kiosk client
- [ ] Kiosk sessions are PostgreSQL-backed (`kiosk_sessions` table) with 30s in-memory cache — sessions persist across server restarts with 8-hour TTL
- [ ] Expired sessions are cleaned on startup and hourly — check logs for `[Kiosk] Startup cleanup` or `[Kiosk] Cleaned up`
- [ ] Use `GET /api/kiosk/active-sessions` or `GET /api/factory/kiosk/active-sessions` (HQ-only) to check active kiosk auth sessions
- [ ] PIN is verified with `bcrypt.compare()` — if PIN was stored as plaintext, `migrateKioskPasswords()` should have hashed it on startup
- [ ] Check `pinLockedUntil` on user record — user may be locked out after failed attempts
- [ ] Device password is bcrypt-hashed in `factory_kiosk_config` (configKey='device_password') or `branch_kiosk_settings.kioskPassword`
- [ ] `migrateKioskPasswords()` runs on startup (`server/index.ts:156`) — check server logs for `[KioskMigration]` messages
- [ ] For web session fallback: user's role must be in `KIOSK_AUTHORIZED_ROLES` array (admin, fabrika_mudur, fabrika_operator, fabrika, supervisor, supervisor_buddy, coach)

```bash
grep -n "isKioskAuthenticated\|isAuthenticated" server/routes/factory.ts | grep -i "kiosk" | head -10
```

---

## §11 — SLA Business Hours Issues
SLA deadlines are calculated incorrectly or breach checks fire at wrong times.

Checklist:
- [ ] `sla_business_hours` table has exactly one row — if empty, defaults to 08:00–18:00 Mon–Fri Europe/Istanbul
- [ ] Timezone is `Europe/Istanbul` (UTC+3) — check `server/services/business-hours.ts` DEFAULT_CONFIG
- [ ] `addBusinessHours()` correctly skips weekends and non-work hours when computing deadlines
- [ ] `isWithinBusinessHours()` is called in `checkSlaBreaches()` — breaches are only marked during business hours
- [ ] `checkSlaBreaches()` in `server/services/ticket-routing-engine.ts:148` defers breach marking outside business hours
- [ ] `seedSlaRules()` in `server/seed-sla-rules.ts` seeds 24 rules (6 departments × 4 priorities) — called on startup from `server/index.ts`
- [ ] `sla_rules` table has rows for all departments: teknik, lojistik, muhasebe, marketing, trainer, hr

```bash
grep -rn "seedSlaRules\|checkSlaBreaches\|addBusinessHours\|isWithinBusinessHours" server/ --include="*.ts" | head -10
```

---

## §12 — Delegation System Issues
Delegated modules not visible to the target role, or delegation not activating.

Checklist:
- [ ] `module_delegations` table has a row with correct `moduleKey`, `fromRole`, `toRole`
- [ ] Delegation `isActive` is `true`
- [ ] For temporary delegations: `expiresAt` has not passed (compared with `new Date()`)
- [ ] For permanent delegations: `delegationType` is `'kalici'` — these never expire
- [ ] Active delegation query in `server/routes/delegation-routes.ts` filters by `toRole` matching current user's role
- [ ] CRM navigation integration checks `/api/delegations/active` to show delegated menu items
- [ ] Only admin and ceo roles can create/modify delegations (enforced in route)

```bash
grep -rn "delegations\|delegation" server/routes/delegation-routes.ts | head -10
```

---

## Common Crash Patterns

| Pattern | Root Cause | Fix |
|---------|-----------|-----|
| `toFixed is not a function` | API returns string/null, not number | `Number(value ?? 0).toFixed(1)` |
| `filtered.filter is not a function` | API returns `{data:[...]}` not `[...]` | `Array.isArray(data) ? data : (data?.data \|\| [])` |
| `destroy is not a function` | JSX `return <X/>` inside useEffect | Move returns outside useEffect, after all hooks |
| `Cannot read properties of undefined` | Missing optional chaining | `data?.stats?.rating` not `data.stats.rating` |
| `Importing a module script failed` | Syntax error in lazy-loaded component | Check the imported file for broken JSX/missing braces |
| PostgreSQL COUNT string concat | `COUNT()` returns string | Wrap with `Number()` in reduce/sum operations |

---

## §13 Module Flag Issues

### Symptoms
- Module visible when it should be hidden
- Module hidden when it should be visible
- Sub-module not responding to parent toggle
- Data collection stops when module UI is hidden
- `isModuleEnabled` always returns true
- Role-based override not working

### Triage Steps

1. **Check flag exists in DB:**
```sql
SELECT module_key, flag_level, flag_behavior, parent_key, target_role, is_enabled, scope, branch_id
FROM module_flags WHERE module_key = '<KEY>' AND deleted_at IS NULL;
```

2. **Check behavior type:** If `flag_behavior = 'always_on'`, the module ALWAYS returns true regardless of `is_enabled`.

3. **Check parent chain:** If module has `parent_key`, verify parent is enabled:
```sql
SELECT mf.module_key, mf.is_enabled, parent.module_key as parent, parent.is_enabled as parent_enabled, parent.flag_behavior
FROM module_flags mf
LEFT JOIN module_flags parent ON parent.module_key = mf.parent_key AND parent.scope = 'global' AND parent.deleted_at IS NULL
WHERE mf.module_key = '<KEY>' AND mf.deleted_at IS NULL;
```

4. **Check 4-level lookup priority:** Most specific match wins:
   - Level 1: branch + role (branchId=X, targetRole="barista")
   - Level 2: branch only (branchId=X, targetRole=NULL)
   - Level 3: global + role (scope="global", targetRole="barista")
   - Level 4: global default (scope="global", targetRole=NULL)
```sql
SELECT module_key, scope, branch_id, target_role, is_enabled
FROM module_flags WHERE module_key = '<KEY>' AND deleted_at IS NULL
ORDER BY CASE WHEN scope='branch' AND target_role IS NOT NULL THEN 1
              WHEN scope='branch' AND target_role IS NULL THEN 2
              WHEN scope='global' AND target_role IS NOT NULL THEN 3
              ELSE 4 END;
```

5. **Check role override conflicts:** If a global+role override exists but branch override also exists, branch wins:
```sql
SELECT * FROM module_flags WHERE module_key = '<KEY>' AND deleted_at IS NULL ORDER BY scope, target_role;
```

6. **Check context mismatch:** `ui_hidden_data_continues` behaves differently based on context:
   - `context="data"` → always true (data continues)
   - `context="ui"` or `context="api"` → respects isEnabled
   - If a route uses `requireModuleEnabled()` it passes `context="api"` and user's role

7. **Clear cache:** Module flags are cached for 60 seconds. Cache key includes moduleKey + branchId + role + context. Call `clearModuleFlagCache()` or restart server to force refresh.

8. **Check PATH_TO_MODULE_KEY_MAP:** If a path is not mapped, `getModuleKeyForPath()` returns null and the menu won't filter it.

9. **Seed didn't run:** Check startup logs for `[SEED] Module flags: X/Y flags upserted` (expect 31). If table didn't exist, CREATE TABLE must be run first.

10. **Dobody flags not working:** Check the 3 sub-modules: dobody.chat (DobodyMiniBar), dobody.flow (DobodyFlowMode), dobody.bildirim (notifications). Parent is `dobody` (always_on), so sub-modules can be toggled independently.

11. **Module disabled but page still accessible:** Check `client/src/App.tsx` — the route must be wrapped with `<ModuleGuard moduleKey="X">`. ModuleGuard uses `useModuleEnabled` hook → bulk `/api/module-flags/my-flags` endpoint.

12. **Branch health score not reflecting disabled modules:** `server/services/branch-health-scoring.ts` uses `isComponentEnabled()` with `context="data"`. Modules with `ui_hidden_data_continues` (pdks, vardiya) still contribute to scores even when UI is hidden. The `branchTasks` component (weight 0.12) maps to `sube_gorevleri` module key — when disabled, it's excluded and remaining weights recalculate proportionally.

12b. **Branch task score showing 0 or unexpected values:** Check `branch_task_instances` table has data for the branch in the last 30 days. Score formula: `(completed/total)*100 - min(overdue*5, 30)`. If total=0, returns neutralComponent (score=70, insufficientData=true). User-level score only counts instances where user is claimed_by or completed_by.

13. **Agent notifications still arriving for disabled module:** Check `SKILL_TO_MODULE_MAP` in `server/agent/skills/skill-notifications.ts`. Skills without mapping (burnout_predictor, security_monitor, cost_analyzer, team_tracker) always run. Skills with mapping check `isModuleEnabled(moduleKey, branchId, "api")` before delivering.

14. **Bulk flags endpoint returns unexpected values:** `/api/module-flags/my-flags` computes all 31 flags per user session (branchId + role). Cache TTL is 60s. Check if user's branchId and role are correctly set on the session.

---

## §14 — Branch Recurring Task Issues
Recurring tasks not generating daily instances, or task board showing empty.

Checklist:
- [ ] Scheduler running? Check logs for `[BRANCH-TASKS]`
- [ ] Module flag enabled? `SELECT * FROM module_flags WHERE module_key='sube_gorevleri' AND deleted_at IS NULL;`
- [ ] Override blocking? `SELECT * FROM branch_recurring_task_overrides WHERE deleted_at IS NULL;`
- [ ] Instances generated? `SELECT count(*) FROM branch_task_instances WHERE due_date = CURRENT_DATE;`
- [ ] Categories exist? `SELECT * FROM branch_task_categories;` (expected: 4 categories)
- [ ] Task assigned to correct branch? Check `branch_recurring_tasks.branch_id` matches user's branch

---

## §15 — Module Flag Page Protection Issues
Page accessible when module should be disabled, or ModuleGuard not showing.

Checklist:
- [ ] Flag exists? `SELECT * FROM module_flags WHERE module_key='[key]' AND deleted_at IS NULL;`
- [ ] my-flags endpoint returns correct state? `GET /api/module-flags/my-flags`
- [ ] ModuleGuard wrapping the route in `App.tsx`?
- [ ] `useModuleEnabled` hook working? Check browser console for `/api/module-flags/my-flags` response
- [ ] Cache stale? Module flags cached for 60s — restart server or wait

---

## §16 — Certificate Issues
Certificate not rendering, print not working, or settings missing.

Checklist:
- [ ] `certificate_settings` has 4 rows? `SELECT * FROM certificate_settings;`
- [ ] Certificate renderer loads? Check for Dancing Script font loading in network tab
- [ ] Print window opens? Check browser popup blocker
- [ ] DOSPRESSO logo renders? Check logo file path in public/ directory
- [ ] `issued_certificates` row exists? `SELECT * FROM issued_certificates WHERE user_id='[userId]' ORDER BY issued_at DESC LIMIT 5;`

---

## Quick Diagnostic Commands

```bash
curl -s http://localhost:5000/api/health
grep -i "error\|crash\|FATAL" /tmp/server.log 2>/dev/null | tail -10
grep -i "scheduler\|agent\|skill" /tmp/server.log 2>/dev/null | tail -5
```
