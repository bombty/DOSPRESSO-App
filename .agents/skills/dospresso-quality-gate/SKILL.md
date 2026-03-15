---
name: dospresso-quality-gate
description: DOSPRESSO 10-point quality checklist with PASS/FAIL output. Covers auth middleware, Turkish UI, null safety, Drizzle ORM, data locks, soft delete, dark mode, role access, endpoints vs DB tables, and TypeScript patterns. Run after every sprint build or code change.
---

# DOSPRESSO Quality Gate — 10-Point Checklist

Run after EVERY sprint build or significant code change. Report each item as PASS or FAIL.

---

## 1. Auth Middleware on All Endpoints
Every new/modified route must have auth middleware.

```bash
grep -rn "router\.\(get\|post\|put\|patch\|delete\)" server/routes/ --include="*.ts" | grep -v "isAuthenticated\|isHQOrAdmin\|isAdmin\|isSupervisorPlus\|isKioskAuthenticated\|canAccess" | grep -v "login\|register\|health\|setup\|public\|vapid" | tail -20
```

**PASS**: No unprotected endpoints found.
**FAIL**: Any route missing auth middleware.

---

## 2. Turkish UI — No ASCII Approximations
User-visible strings must use proper Turkish characters: ş ç ğ ı ö ü İ Ş Ç Ğ Ö Ü

```bash
grep -rn '"[^"]*"' client/src/ server/lib/ --include="*.tsx" --include="*.ts" | grep -v "className\|import\|require\|node_modules\|route\|path\|key\|type\|status" | grep -i "Sube\b\|Musteri\|Gorev\b\|Ozet\b\|Orani\|Muduru\|Basarili\|Tamamlandi\|Guncelle\|Olustur\|Degerlendir\|Iletisim\|uyarisi\|Gonder\b\|Sagligi\|cozum\|Egitim\b\|Kiosk Ac\b" | head -20
```

Also check for English text that should be Turkish:
```bash
grep -rn '"Save"\|"Cancel"\|"Delete"\|"Submit"\|"Loading\.\.\."\|"Error"\|"Success"\|"Close"' client/src/pages/ client/src/components/ --include="*.tsx" | grep -v "import\|className\|console\|aria-" | head -10
```

**PASS**: No ASCII-approximated Turkish or stray English strings.
**FAIL**: Any violation found.

---

## 3. Null Safety — No Unguarded Method Calls
DOSPRESSO's #1 crash cause: calling methods on null/undefined API data.

```bash
grep -rn "\.toFixed\|\.toLocaleString" client/src/ --include="*.tsx" | grep -v "Number(\|?? 0\||| 0\|node_modules" | head -20
```

```bash
grep -rn "\.map(\|\.filter(\|\.length\|\.reduce(" client/src/ --include="*.tsx" | grep "data\.\|result\.\|faults\.\|items\.\|records\." | grep -v "|| \[\]\|??\|Array.isArray\|node_modules" | head -20
```

**PASS**: All `.toFixed()` wrapped in `Number()`, all array methods guarded.
**FAIL**: Any unguarded call found.

---

## 4. Drizzle ORM — Transactions on Critical Tables
Write operations on these tables MUST use `db.transaction()`:
factory_shipments, monthly_payroll, branch_inventory, data_change_requests, factory_production_outputs

```bash
grep -rn "\.update(\|\.insert(\|\.delete(" server/routes/ --include="*.ts" | grep -i "shipment\|payroll\|inventory\|change_request\|production_output" | grep -v "transaction" | head -10
```

**PASS**: All critical writes wrapped in transactions.
**FAIL**: Any critical write outside a transaction.

---

## 5. Data Lock Compliance
PATCH/PUT/DELETE on locked tables must call `checkDataLock()` first.

Locked tables: purchase_orders (7d), factory_production_outputs (3d), branch_stock_movements (7d), pdks_records (3d), monthly_payroll (immediate), factory_quality_checks (on approval), factory_shipments (on delivery), customer_feedback (immediate).

**PASS**: All mutations on locked tables check data lock.
**FAIL**: Any mutation skipping the lock check.

---

## 6. Soft Delete — No Hard DELETE on Business Data
```bash
grep -rn "\.delete(" server/routes/ --include="*.ts" | grep -v "sessions\|tokens\|cache\|notification\|temp\|draft" | head -10
```

Correct pattern:
```typescript
await db.update(table).set({ isActive: false, deletedAt: new Date(), deletedBy: userId });
```

**PASS**: No hard deletes on business data.
**FAIL**: Any hard delete found (exceptions: sessions, tokens, cache, old notifications).

---

## 7. Dark Mode — No Hardcoded Colors Without Dark Variant
```bash
grep -rn "bg-white\|text-black\|border-gray-200" client/src/ --include="*.tsx" | grep -v "dark:\|print:\|QR\|certificate" | tail -10
```

**PASS**: No hardcoded light-mode-only colors.
**FAIL**: Any `bg-white`, `text-black`, etc. without a `dark:` variant.

---

## 8. Role-Based Access — Menu vs Permission Alignment
New pages must be registered in both:
1. `server/menu-service.ts` → sidebar items for allowed roles
2. `shared/schema.ts` → `PERMISSIONS` record for the role
3. `client/src/App.tsx` → lazy route definition

**PASS**: All new pages appear in sidebar, permissions, and routes.
**FAIL**: Any page missing from one of the three locations.

---

## 9. Endpoint ↔ DB Table Consistency
New API endpoints must reference existing tables. New tables must have corresponding API endpoints.

```bash
grep -rn "from(.*)" server/routes/ --include="*.ts" | grep -oP "from\(\K\w+" | sort -u > /tmp/route_tables.txt
grep -rn "pgTable" shared/schema.ts | grep -oP "pgTable\(\"\K[^\"]*" | sort -u > /tmp/schema_tables.txt
comm -23 /tmp/route_tables.txt /tmp/schema_tables.txt | head -10
```

**PASS**: All referenced tables exist in schema; all new tables have routes.
**FAIL**: Orphan references or unreachable tables.

---

## 10. TypeScript & React Patterns
Check for known anti-patterns:

a) `req.user` must be cast:
```bash
grep -rn "req\.user\." server/routes/ --include="*.ts" | grep -v "as Express\|as any\|req\.user\?" | head -10
```

b) useEffect must not contain JSX returns:
```bash
grep -rn "useEffect" client/src/ --include="*.tsx" -A 30 | grep -B 3 "return.*<\|return.*Loading" | grep -v "cleanup\|clearInterval\|clearTimeout\|removeEventListener" | head -10
```

c) Hooks before early returns:
```bash
for f in $(find client/src/pages -name "*.tsx"); do
  EARLY=$(grep -n "return.*Loading\|return.*Error\|return.*null" "$f" | head -1 | cut -d: -f1)
  HOOK=$(grep -n "useQuery\|useEffect\|useMemo\|useState" "$f" | tail -1 | cut -d: -f1)
  if [ -n "$EARLY" ] && [ -n "$HOOK" ] && [ "$EARLY" -lt "$HOOK" ]; then
    echo "FAIL: $f: early return at line $EARLY, hook at line $HOOK"
  fi
done 2>/dev/null | head -10
```

**PASS**: No uncast req.user, no JSX in useEffect, hooks before returns.
**FAIL**: Any violation found.

---

## Output Format

After running all checks, report:

```
DOSPRESSO Quality Gate — [DATE]
1. Auth Middleware:     PASS / FAIL (details)
2. Turkish UI:         PASS / FAIL (details)
3. Null Safety:        PASS / FAIL (details)
4. Drizzle Tx:         PASS / FAIL (details)
5. Data Lock:          PASS / FAIL (details)
6. Soft Delete:        PASS / FAIL (details)
7. Dark Mode:          PASS / FAIL (details)
8. Role Access:        PASS / FAIL (details)
9. Endpoint↔Table:     PASS / FAIL (details)
10. TypeScript/React:  PASS / FAIL (details)

Score: X/10 PASS
```
