---
name: dospresso-quality-gate
description: DOSPRESSO 17-point quality checklist with PASS/FAIL output. Covers auth middleware, Turkish UI, null safety, Drizzle ORM, data locks, soft delete, dark mode, role access, endpoints vs DB tables, TypeScript patterns, kiosk auth, bcrypt security, SLA consistency, CRM endpoint auth, kiosk role safety, module flag consistency, and mobile compactness. Run after every sprint build or code change.
---

# DOSPRESSO Quality Gate — 17-Point Checklist

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

a) `req.user` must be cast to AuthUser (NEVER `as any`):
```bash
grep -rn "req\.user as any" server/ --include="*.ts" | head -10
grep -rn "req\.user\." server/routes/ --include="*.ts" | grep -v "as AuthUser\|as Express\|req\.user\?" | head -10
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

## 11. Kiosk Auth — Kiosk Endpoints Use `isKioskAuthenticated`
All kiosk-related endpoints must use `isKioskAuthenticated`, not `isAuthenticated`.

```bash
grep -rn "kiosk" server/routes/ --include="*.ts" -i | grep "router\.\(get\|post\|put\|patch\|delete\)" | grep -v "isKioskAuthenticated" | grep -v "isAuthenticated.*kiosk\|kiosk.*config\|kiosk.*settings\|kiosk.*account\|kiosk.*seed\|kiosk.*migrate\|kiosk.*password" | head -10
```

**PASS**: All kiosk endpoints use `isKioskAuthenticated`.
**FAIL**: Any kiosk endpoint using `isAuthenticated` instead.

---

## 12. bcrypt Password Security — No Plaintext Passwords or PINs
Kiosk passwords and PINs must be stored as bcrypt hashes. Seed scripts must use `bcrypt.hash()`.

```bash
grep -rn "kioskPassword\|device_password\|\.pin\b" server/ --include="*.ts" | grep -i "set\|insert\|values\|update" | grep -v "bcrypt\|hash\|\$2b\$\|\$2a\$\|compare\|startsWith\|migration\|select\|\.get\|\.delete" | head -10
```

**PASS**: No plaintext password/PIN storage found.
**FAIL**: Any password or PIN stored without bcrypt hashing.

---

## 13. SLA Business Hours Consistency
`sla_rules` must have rows for all 6 departments × 4 priorities (24 rows). `sla_business_hours` should have at most 1 row.

```bash
grep -c "department:" server/seed-sla-rules.ts
```

Expected: 24 SLA_DEFAULTS entries. Also verify `seedSlaRules()` is called on startup:
```bash
grep -n "seedSlaRules" server/index.ts | head -5
```

**PASS**: 24 SLA rules defined, seed function called on startup.
**FAIL**: Missing departments/priorities or seed not called.

---

## 14. CRM Endpoint Auth — All crm-iletisim.ts Endpoints Have Auth
All endpoints in `server/routes/crm-iletisim.ts` must be protected by auth middleware.

```bash
grep -n "router\.\(get\|post\|put\|patch\|delete\)" server/routes/crm-iletisim.ts | head -30
```

Check that `router.use(isAuthenticated)` is applied at the top of the file:
```bash
grep -n "router.use(isAuthenticated)" server/routes/crm-iletisim.ts
```

**PASS**: `router.use(isAuthenticated)` is present, covering all routes.
**FAIL**: Any route missing auth middleware.

---

## 15. Kiosk Role Safety — sube_kiosk + Factory Roles Route Correctly
`sube_kiosk` role and factory roles must redirect to their correct kiosk paths, not to standard dashboards.

```bash
grep -rn "sube_kiosk" client/src/lib/role-routes.ts server/menu-service.ts | head -10
```

**PASS**: `sube_kiosk` and factory roles have kiosk-specific home paths.
**FAIL**: Kiosk roles redirect to standard dashboard or have no route mapping.

---

## Output Format

---

## 16. Module Flag Consistency
All new modules must have a corresponding flag in `server/seed-module-flags.ts`.

```bash
echo "SELECT count(*) as flag_count FROM module_flags WHERE deleted_at IS NULL;" | psql $DATABASE_URL
```

**PASS**: Expected 34 flags (as of March 2026). All new modules have flags.
**FAIL**: New module added without flag seed, or count does not match.

---

## 17. Mobile Compactness
New pages with KPI/stat cards must use CompactKPIStrip. New pages with filters must use MobileFilterCollapse on mobile.

```bash
grep -rn "grid.*col.*[3-5]" client/src/pages/ --include="*.tsx" | grep -v "CompactKPIStrip\|compact-kpi" | head -10
```

**PASS**: All stat-heavy pages use CompactKPIStrip for mobile view.
**FAIL**: Page has 3+ stat cards in a grid without mobile-optimized layout.

---

## 18. Payroll/QC Service Integrity
New payroll and QC services must use existing engines, not duplicate logic.

```bash
ls -la server/lib/payroll-engine.ts server/lib/pdks-engine.ts server/services/payroll-calculation-service.ts server/utils/pdf-generator.ts server/agent/skills/qc-tracker.ts 2>/dev/null
```

```bash
grep -rn "createAutoLot" server/routes/factory.ts | head -5
```

**PASS**: All service files exist. `createAutoLot()` called at production insert points. No duplicate payroll logic.
**FAIL**: Missing service files or duplicate calculation logic found.

---

After running all checks, report:

```
DOSPRESSO Quality Gate — [DATE]
1.  Auth Middleware:     PASS / FAIL (details)
2.  Turkish UI:         PASS / FAIL (details)
3.  Null Safety:        PASS / FAIL (details)
4.  Drizzle Tx:         PASS / FAIL (details)
5.  Data Lock:          PASS / FAIL (details)
6.  Soft Delete:        PASS / FAIL (details)
7.  Dark Mode:          PASS / FAIL (details)
8.  Role Access:        PASS / FAIL (details)
9.  Endpoint↔Table:     PASS / FAIL (details)
10. TypeScript/React:   PASS / FAIL (details)
11. Kiosk Auth:         PASS / FAIL (details)
12. bcrypt Security:    PASS / FAIL (details)
13. SLA Consistency:    PASS / FAIL (details)
14. CRM Endpoint Auth:  PASS / FAIL (details)
15. Kiosk Role Safety:  PASS / FAIL (details)
16. Module Flags:       PASS / FAIL (details)
17. Mobile Compactness: PASS / FAIL (details)

18. Payroll/QC Svc:   PASS / FAIL (details)

Score: X/21 PASS
```

---

## 19. sql.raw Usage — No Unparameterized Queries
Known files with sql.raw (baseline April 2026):
- dashboard-data-routes.ts: 3 (utility functions, 39 callers — migration planned)
- unified-dashboard-routes.ts: 3 (same pattern)
- seed.ts: 3 (dev-only, INTERVAL interpolation)
- system-health.ts: 1 (table name check)
Total baseline: 10. Refactored: production-planning-routes (18→0), inventory-count (1→0), operations (1→0).

```bash
grep -rn "sql\.raw\|sql\.unsafe" server/routes/*.ts server/services/*.ts server/lib/*.ts 2>/dev/null | grep -v "node_modules" | wc -l
```

**PASS**: Count matches known baseline (10). No NEW sql.raw added.
**FAIL**: New sql.raw usage found — must use Drizzle operators or parameterized `sql` template.

---

## 20. Sidebar ↔ Route Protection Alignment
Module menu items must not show pages the user cannot access.

```bash
# Check module-menu-config items against App.tsx protections
grep -n "path:" client/src/components/layout/module-menu-config.ts | while read line; do
  path=$(echo "$line" | grep -oP 'path:\s*"\K[^"]+')
  protection=$(grep "$path" client/src/App.tsx | grep -oP 'FabrikaOnly|HQOnly|ExecutiveOnly|ProtectedRoute' | head -1)
  if [ -n "$protection" ]; then
    echo "CHECK: $path → $protection"
  fi
done
```

**PASS**: No menu items point to pages with incompatible role protections.
**FAIL**: Menu item visible to roles that can't pass the route guard.

---

## 21. Payroll Unified Columns
monthly_payroll table must have all unified engine columns.

```bash
echo "SELECT column_name FROM information_schema.columns WHERE table_name='monthly_payroll' AND column_name IN ('sgk_employee','income_tax','stamp_tax','agi','gross_total','data_source','calculation_mode','cumulative_tax_base','total_employer_cost') ORDER BY column_name;" | psql $DATABASE_URL
```

**PASS**: 9 rows returned.
**FAIL**: Missing unified payroll columns.
