---
name: dospresso-quality-gate
description: DOSPRESSO-specific quality control checks after every sprint build. Covers auth middleware, Turkish UI, Drizzle ORM patterns, dark mode, role-based access, factory chain integrity, and agent system health. Use after completing any code changes or sprint tasks.
---

# DOSPRESSO Quality Gate

Run these checks after EVERY sprint build or significant code change.

## 1. Authentication & Authorization

DOSPRESSO uses these specific middleware patterns:
- `isAuthenticated` — basic login check
- `isHQOrAdmin` — HQ roles only
- `isAdmin` — admin role only  
- `isSupervisorPlus` — supervisor, mudur, or higher
- `canAccess(permissionModule, action)` — granular permission check
- `isKioskAuthenticated` — factory kiosk PIN-based auth

Check ALL new/modified endpoints have appropriate auth:
```bash
grep -rn "router\.\(get\|post\|put\|patch\|delete\)" server/routes/ --include="*.ts" | grep -v "isAuthenticated\|isHQOrAdmin\|isAdmin\|isSupervisorPlus\|isKioskAuthenticated\|canAccess" | grep -v "login\|register\|health\|setup\|public\|vapid" | tail -20
```

## 2. Turkish UI Standards

NEVER use ASCII approximations in user-visible strings:
- ş not s, ç not c, ğ not g, ı not i, ö not o, ü not u
- İ not I (capital İ), Ş not S, Ç not C, Ğ not G, Ö not O, Ü not U

Common violations to scan:
```bash
grep -rn '"[^"]*"' client/src/ server/lib/ --include="*.tsx" --include="*.ts" | grep -v "className\|import\|require\|node_modules\|route\|path\|key\|type\|status" | grep -i "Sube\b\|Musteri\|Gorev\b\|Ozet\b\|Orani\|Muduru\|Basarili\|Tamamlandi\|Guncelle\|Olustur\|Degerlendir\|Iletisim\|uyarisi\|Gonder\b\|Sagligi\|cozum\|Egitim\b\|Kiosk Ac\b" | head -20
```

Also check for English text that should be Turkish:
```bash
grep -rn '"Save"\|"Cancel"\|"Delete"\|"Submit"\|"Loading\.\.\."\|"Error"\|"Success"\|"Close"' client/src/pages/ client/src/components/ --include="*.tsx" | grep -v "import\|className\|console\|aria-" | head -10
```

## 3. Null Safety (Crash Prevention)

DOSPRESSO's #1 crash cause: calling methods on undefined API responses.

Check ALL `.toFixed()`, `.map()`, `.filter()`, `.length` calls:
```bash
grep -rn "\.toFixed\|\.toLocaleString" client/src/ --include="*.tsx" | grep -v "??\||| 0\|?\.toFixed" | head -10
```

Every API response must be null-guarded:
```typescript
// WRONG: stats.avgRating.toFixed(1)
// CORRECT: (stats?.avgRating ?? 0).toFixed(1)

// WRONG: data.map(...)
// CORRECT: (data || []).map(...)
```

## 4. Drizzle ORM Patterns

- ALL write operations on critical tables MUST use transactions:
  - factory_shipments status changes
  - payroll calculations
  - branch_inventory updates
  - change request approvals
- Use `eq()`, `and()`, `or()` — never raw SQL for WHERE clauses
- Always check `.returning()` is used when you need the inserted/updated record
- Use `sql\`...\`` template literals for complex queries (parameterized, safe from injection)

## 5. Data Lock Compliance

These tables have time-based locks (data_lock_rules):
- purchase_orders: 7 days
- factory_production_outputs: 3 days
- branch_stock_movements: 7 days
- pdks_records: 3 days
- monthly_payroll: immediate
- factory_quality_checks: on approval
- factory_shipments: on delivery
- customer_feedback: immediate

Any PATCH/PUT/DELETE on these tables MUST call `checkDataLock()` first.

## 6. Soft Delete Rule

NEVER use hard DELETE on business data. Always:
```typescript
await db.update(table).set({ isActive: false, deletedAt: new Date(), deletedBy: userId });
```

Exceptions: sessions, tokens, cache, old notifications.

## 7. Dark Mode Compatibility

No hardcoded colors without dark variant:
```bash
grep -rn "bg-white\|text-black\|border-gray-200" client/src/ --include="*.tsx" | grep -v "dark:\|print:\|QR\|certificate" | tail -10
```

## 8. Error & Loading States

Every page with useQuery MUST have:
```typescript
if (isLoading) return <LoadingState />;
if (isError) return <ErrorState onRetry={() => refetch()} />;
```

## 9. Radix UI Package Safety

NEVER install Radix packages with `^` caret. Pin exact versions.
After ANY npm install, check:
```bash
find node_modules/@radix-ui -mindepth 2 -name "node_modules" -type d 2>/dev/null
```
Must return empty. If nested packages found → downgrade the new package.

## 10. Service Worker

After any frontend changes, bump the cache version in `client/public/service-worker.js`.

## 11. Agent System Health

Verify background jobs still running:
```bash
grep -i "scheduler\|agent\|skill\|escalation\|outcome" /tmp/server.log 2>/dev/null | tail -10
```

Verify agent routing rules exist:
```bash
echo "SELECT COUNT(*) FROM agent_routing_rules;" | psql
```
