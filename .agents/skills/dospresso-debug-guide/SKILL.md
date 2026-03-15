---
name: dospresso-debug-guide
description: DOSPRESSO-specific debugging procedures for common issues. Covers 401/403 auth errors, stale TanStack cache, empty results, FK constraint errors, Radix UI crashes, HTTP 423 data locks, SLA timezone issues, and TypeScript req.user pattern. Use when investigating any bug or unexpected behavior.
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
const user = req.user as Express.User;
const branchId = user.branchId;
```

Always cast `req.user` before accessing custom properties. The Express User type is extended in the project but TypeScript sometimes loses the augmentation.

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

## Quick Diagnostic Commands

```bash
curl -s http://localhost:5000/api/health
grep -i "error\|crash\|FATAL" /tmp/server.log 2>/dev/null | tail -10
grep -i "scheduler\|agent\|skill" /tmp/server.log 2>/dev/null | tail -5
```
