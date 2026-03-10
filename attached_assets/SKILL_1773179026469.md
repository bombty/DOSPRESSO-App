---
name: dospresso-debug-guide
description: DOSPRESSO-specific debugging procedures for common issues. Covers auth chain debugging, TanStack Query cache issues, Drizzle ORM query problems, Radix UI crashes, and role-based access failures. Use when investigating any bug or unexpected behavior.
---

# DOSPRESSO Debug Guide

## Before Debugging — Common Root Causes

90% of DOSPRESSO bugs fall into these categories:
1. **Null/undefined crash** — API returns null, frontend calls .toFixed() or .map() on it
2. **Auth/permission denied** — wrong middleware or missing role check
3. **TanStack Query stale cache** — data updated but UI shows old value
4. **Radix UI crash** — nested packages in node_modules
5. **Wrong branch scope** — HQ user sees nothing (no branchId), or branch user sees other branch data

## Debug Procedure

### Step 1: Identify the Layer
```
Is it a frontend crash? → Check browser console for error
Is it wrong data? → Check API response (curl or Network tab)
Is it missing data? → Check database directly
Is it auth failure? → Check middleware chain
```

### Step 2: Auth Chain Debug

DOSPRESSO auth chain (in order):
```
Request → Session cookie → Passport deserialize → req.user populated
  → isAuthenticated check → Role check → Branch scope filter → Permission check
```

Debug each layer:
```bash
# 1. Does the user exist and is active?
echo "SELECT id, username, role, branch_id, is_active FROM users WHERE username='[username]';" | psql

# 2. Does the endpoint have auth middleware?
grep -n "[endpoint_path]" server/routes/*.ts | head -5

# 3. What role does the middleware expect?
grep -A 5 "[endpoint_path]" server/routes/*.ts | grep -i "role\|admin\|auth\|permission"

# 4. Is branch_id correctly scoped?
# HQ roles: branch_id should be NULL (sees all)
# Branch roles: branch_id must match their assigned branch
```

### Step 3: TanStack Query Cache Issues

Most common: Data was updated via API but the UI still shows old data.

```typescript
// Check if the mutation invalidates the correct query key:
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['/api/specific-endpoint'] });
  // NOT just queryKey: ['generic-key'] — must match exact endpoint
}
```

Debug: Add to browser console:
```javascript
// See all cached queries
window.__TANSTACK_QUERY_CLIENT__?.getQueryCache().getAll().map(q => ({ key: q.queryKey, state: q.state.status }))
```

### Step 4: Drizzle ORM Query Debug

```typescript
// Add .toSQL() to see the generated query:
const query = db.select().from(users).where(eq(users.role, 'barista'));
console.log(query.toSQL()); // Shows the actual SQL
```

Common Drizzle mistakes:
- Forgetting `.limit(1)` when expecting single result
- Using `eq()` with wrong type (string vs number for IDs)
- Missing `.returning()` on INSERT when you need the new record
- Not wrapping multiple operations in `db.transaction()`

### Step 5: Radix UI Crash (dispatcher.useState)

If you see `null is not an object (evaluating 'dispatcher.useState')`:
```bash
# Check for nested Radix packages
find node_modules/@radix-ui -mindepth 2 -name "node_modules" -type d 2>/dev/null

# If found, the solution is:
# 1. Identify which package caused it
# 2. Downgrade to compatible version
# 3. Verify no nested packages remain
# 4. Clear Vite cache: rm -rf node_modules/.vite
# 5. Bump Service Worker version
```

### Step 6: Data Lock Issues

If a user gets "Bu kayıt kilitli" (HTTP 423):
```bash
# Check lock rules for the table
echo "SELECT * FROM data_lock_rules WHERE table_name='[table]';" | psql

# Check when the record was created
echo "SELECT id, created_at FROM [table] WHERE id=[record_id];" | psql

# Calculate if lock period passed
# record_created_at + lock_after_days > now() → locked
```

## Quick Diagnostic Commands

```bash
# Server health
curl -s http://localhost:5000/api/health

# Server errors
grep -i "error\|crash\|FATAL" /tmp/server.log 2>/dev/null | tail -10

# Background jobs running
grep -i "scheduler\|agent\|job" /tmp/server.log 2>/dev/null | tail -5

# Database connectivity
echo "SELECT 1;" | psql

# Vite build check
npx vite build 2>&1 | grep -i "error\|fail" | head -5

# Active user sessions
echo "SELECT COUNT(*) FROM sessions;" | psql
```

## Role-Specific Debug Tips

- **Barista sees nothing**: Check branch_id is set and matches active branch
- **Admin sees too much**: Normal — admin bypasses SIDEBAR_ALLOWED_ITEMS
- **CGO sees individual performance items**: Check agent routing rules (should see summary only)
- **Supervisor gets wrong person's notification**: Check approval chain uses target person's branchId
- **Factory kiosk won't start**: Check PIN exists and isn't locked (3 failed attempts = 15min lock)
