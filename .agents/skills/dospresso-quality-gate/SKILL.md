---
name: dospresso-quality-gate
description: DOSPRESSO 36-point quality checklist with PASS/FAIL output. Covers auth middleware, Turkish UI, null safety, Drizzle ORM, data locks, soft delete, dark mode, role access, endpoints vs DB tables, TypeScript patterns, kiosk auth, bcrypt security, SLA consistency, CRM endpoint auth, kiosk role safety, module flag consistency, mobile compactness, F33 route guard wrap (#306/#325 CI coverage), F36 PIN seed coverage (#324), F15 dynamic late tolerance (per-branch settings vs hardcoded), and Five-Role Mental Review (Engineer/Operations/QA/PM/Compliance — owner-approved 3 May 2026). Run after every sprint build or code change.
---

# DOSPRESSO Quality Gate — 35-Point Checklist

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

---

## 22. Recipe Auto-Versioning
PATCH /api/factory/recipes/:id must create version snapshot before update.

```bash
grep "skipVersion\|changeDescription\|factoryRecipeVersions.*insert\|ingredientsSnapshot\|costSnapshot" server/routes/factory-recipes.ts | wc -l
```

**PASS**: 5+ lines found (version snapshot logic present).
**FAIL**: Auto-versioning code missing from PATCH endpoint.

---

## 23. Inventory Price Structure
inventory table must have dual price columns + inventory_price_history table must exist.

```bash
echo "SELECT column_name FROM information_schema.columns WHERE table_name='inventory' AND column_name IN ('market_price','material_type','purchase_unit','recipe_unit','conversion_factor','market_price_updated_at') ORDER BY column_name;" | psql $DATABASE_URL
echo "SELECT count(*) FROM information_schema.tables WHERE table_name='inventory_price_history';" | psql $DATABASE_URL
```

**PASS**: 6 columns + 1 table found.
**FAIL**: Missing inventory price infrastructure.

---

## 24. RGM/Sef Dashboard Module Config
recete_gm and sef must have module cards in ROLE_MODULES and be in FACTORY_ROLES.

```bash
grep "recete_gm:" client/src/components/home-screen/role-module-config.ts
grep "sef:" client/src/components/home-screen/role-module-config.ts
grep "recete_gm\|\"sef\"" client/src/components/mission-control/DashboardRouter.tsx
```

**PASS**: Both roles have ROLE_MODULES entries and are in FACTORY_ROLES.
**FAIL**: "0 modül" on dashboard — role config missing.

---

## 25. Role Consistency Matrix
All 30 non-kiosk roles must exist in: PERMISSIONS, ROLE_MAPPING, SIDEBAR, ROLE_MODULES, ROLE_HOME_ROUTES.

```bash
python3 -c "
import re
files = {
  'PERM': 'shared/schema/schema-02.ts',
  'MAP': 'client/src/components/protected-route.tsx',
  'SIDE': 'server/menu-service.ts',
  'MOD': 'client/src/components/home-screen/role-module-config.ts',
  'HOME': 'client/src/lib/role-routes.ts',
}
for name, path in files.items():
  with open(path) as f: c = f.read()
  roles = set(re.findall(r'(\w+):\s*[\[\{]', c))
  print(f'{name}: {len(roles)} roles')
"
```

**PASS**: 30/31 roles consistent (sube_kiosk excluded).
**FAIL**: Missing role in any file — add before commit.

---

## 26. Sidebar Blueprint Coverage
Every MENU_BLUEPRINT item must be assigned to at least 1 role.

```bash
grep 'id: "' server/menu-service.ts | wc -l
# Compare with roles that use them
```

**PASS**: 0 unassigned blueprint items.
**FAIL**: Unused sidebar items found — assign to appropriate roles.

---

## 27. MRP-Light Tables
4 MRP tables must exist in schema-23 and be exported.

```bash
grep "pgTable" shared/schema/schema-23-mrp-light.ts | grep -v import | wc -l
grep "schema-23" shared/schema.ts
```

**PASS**: 4 tables, export present.
**FAIL**: MRP schema missing or not exported.

## 28. Maliyet Analizi Yapısı

Cost analysis router registered + 5 endpoint aktif:

```bash
grep "costAnalysisRouter" server/routes.ts
grep -c "router\.\(get\|post\)" server/routes/cost-analysis-routes.ts
# Expected: 5+ endpoints (recipes, recipe/:id, profit-summary, settings, donut-scenarios)
```

SALES_PRICES map minimum 10 ürün içerir:
```bash
grep -c "\".*-00[1-9]\"" server/routes/cost-analysis-routes.ts
# Expected: ≥10 (DON, CIN, CHE×5, BRW×2, COK×2, EKM×2)
```

Cost analysis sayfası 6+ role erişilebilir:
```bash
grep "factory-cost-analysis" server/menu-service.ts | wc -l
# Expected: ≥7 (sidebar item + 6 role allowed list)
```

**PASS**: 5 endpoint, SALES_PRICES map ≥10 ürün, 6+ rol.
**FAIL**: Endpoint veya fiyat eksik.

## 29. Reçete Malzeme Ayrıştırma (Keyblend Transparency)

DON-001 reçetesinin keyblend bileşenleri ayrıştırılmış olmalı (tek "Katkı Maddeleri" satırı ❌):

```bash
psql $DATABASE_URL -c "
SELECT ingredient_type, COUNT(*) 
FROM factory_recipe_ingredients fri
JOIN factory_recipes fr ON fr.id = fri.recipe_id
WHERE fr.code = 'DON-001'
GROUP BY ingredient_type;
"
# Expected: keyblend ≥10, hammadde ≥15 (29 toplam)
```

**PASS**: Keyblend bileşenleri ayrı satırlarda (CMC, DATEM, SSL, L-sistein, aromalar).
**FAIL**: Tek "Katkı Maddeleri" satırı (doğru hesap yapılamaz).


---

## Madde 20 — Seed Script DB Sync (17.04.2026)

Seed script çalıştırmadan önce hedef tablonun gerçek DB şemasıyla uyumlu olduğunu doğrula.

```bash
# Seed INSERT listesindeki kolonların NOT NULL + varlık kontrolü
psql "$DATABASE_URL" -c "\d <hedef_tablo>" | grep -E "not null|^ \w"

# Seed script'teki INSERT kolonlarını listele
grep -E "INSERT INTO|VALUES" server/seed-*.ts
```

**PASS:** Tüm NOT NULL kolonlar INSERT'te var (örn. `ref_id` varchar(10) NOT NULL), UPDATE SET listesi yalnızca var olan kolonları referans ediyor.
**FAIL:** "null value in column ... violates not-null constraint" (code 23502) veya "column ... does not exist" (code 42703). Örnek: `seed-donut-recipe-v2.ts` orijinali → bkz. `dospresso-debug-guide` §21.

---

## Madde 30 — Fatura Fiyat Senkronizasyonu (18.04.2026)

Envanter fiyatları muhasebe fatura verileriyle senkron olmalı. Ayda bir veya yeni fatura bloğu geldiğinde çalıştırılır.

```bash
# Script çalıştır (idempotent, aynı fiyatı tekrar yazmak zararsız)
npx tsx server/scripts/update-prices-from-invoices.ts

# Doğrulama
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM inventory_price_history WHERE source = 'excel_import' AND created_at > NOW() - INTERVAL '24 hours';"
```

**PASS:**
- `inventory.lastPurchasePrice` son fatura tutarı ile eşit
- `inventory_price_history` her malzeme için `source='excel_import'` kaydı var
- Değişim %10'u aşan malzemeler loglanmış (🔴 işaretli)

**FAIL:**
- Envanterde yok olan kod script output'unda uyarı veriyor → manuel inventory seed gerekli
- `pricePerKg=null` olan 54 malzeme var (paket ağırlığı belirsiz) → Aslan'dan manuel netleştirme

Kaynak: `server/data/invoice-prices.json` (143 malzeme, 2024-2026 Bombtea muhasebe)

---

## Madde 31 — Recipe ↔ Product Mapping (18.04.2026)

`factory_recipes` tablosundaki her reçete `factory_products` ile `productId` ile bağlı olmalı. Yetim reçete (productId=NULL) olmamalı.

```bash
# Doğrulama
psql "$DATABASE_URL" -c "
SELECT 'linked' as status, COUNT(*) FROM factory_recipes WHERE product_id IS NOT NULL
UNION ALL
SELECT 'orphan', COUNT(*) FROM factory_recipes WHERE product_id IS NULL;
"

# Script (eksik ürünleri otomatik oluşturur, mapping tablosundan)
npx tsx server/scripts/fix-recipe-product-mapping.ts
```

**PASS:**
- orphan = 0 (tüm reçeteler ürüne bağlı)
- Mapping tablosunda (`RECIPE_PRODUCT_MAP`) her reçete için hedef SKU tanımlı
- Yeni ürünler otomatik oluşuyorsa isimlendirme `FP-*` prefix'i kullanıyor

**FAIL:**
- `productId IS NULL` satır var → mapping tamamlanmamış
- SKU prefix tutarsızlığı (BROW vs BRW gibi) → mapping açıkça tanımlanmalı

Hedef durum (18.04.2026 sonrası): **27/27 eşleşme, 0 orphan.**

---

## Madde 32 — Seed Endpoint Production Safeguard (18.04.2026 — Sprint A4)

Production ortamında `/api/seed/*` endpoint'leri env flag olmadan çalışmamalı.

```bash
# Code review
grep -c "SEED_GUARDS" server/routes/seed.ts  # 20 olmalı (1 tanım + 19 endpoint)

# Middleware zincirini doğrula
grep -A 2 "productionSafeGuard" server/routes/seed.ts | head -10
```

**PASS:**
- `SEED_GUARDS = [isAuthenticated, requireAdmin, productionSafeGuard]` tanımlı
- Tüm 19 seed endpoint `...SEED_GUARDS` kullanıyor (eski `isAuthenticated, requireAdmin` pattern yok)
- Production'da `ALLOW_SEED_IN_PRODUCTION` env yoksa 403 dönüyor
- Her çağrı console.log ile izlenebilir (`[SEED-CALL]`, `[SEED-PROD-BLOCKED]`)

**FAIL:**
- `SEED_GUARDS` sayısı <20 → bazı endpoint eski pattern kullanıyor
- Production'da env flag olmadan 200 döndü → middleware zinciri bozuk

---

## Madde 33 — Feature Freeze Disiplini (18.04.2026)

8 haftalık pilot hazırlık sprinti süresince (18 Nisan → 15 Haziran 2026) **yeni özellik geliştirilmez.**

**PASS:**
- Commit mesajları `feat(roadmap):`, `fix(security):`, `chore(data):`, `docs:` öneklerinden başlıyor
- Yeni route eklenmemiş (sadece kırık link düzeltmesi)
- Yeni tablo eklenmemiş (sadece mevcut tablolara kolon/index)
- Yeni endpoint eklenmemiş (sadece mevcut endpoint hot-fix)

**FAIL:**
- `feat:` commit'inde yeni modül/tablo/sayfa var → Sprint I (Hafta 9) backlog'una al
- Cinnaboom/cheesecake/brownie gibi yeni maliyet analiz feature'ı → DURDUR

Referans: `docs/PILOT-HAZIRLIK-8-HAFTA-YOL-HARITASI.md`

---

## Madde 34 — Dormant Modül Raporlamada Doğru Dil (18.04.2026)

**Kural:** Bir modülün DB'de 0/az kaydı var diye "bozuk" veya "eksik" demek yasak.

**PASS:**
- Rapor/commit'te dormant modül kelimesi kullanılıyor
- "Hazır, aktivasyon bekleniyor" gibi nötr ifade
- Referans verilmiş: `docs/SISTEM-ANLAYIS-RAPORU-18-NISAN-2026.md` Bölüm 4.1

**FAIL:**
- "Bu modül çalışmıyor" (dormant olabilir)
- "Modül eksik, yapılmalı" (kod var, aktivasyon sorunu)
- "Silinmeli" (ilerde gerekli olabilir)

**Bilinen dormant modüller:** Franchise Projects (20 tablo), Gate Sınav (18 tablo), Factory Shipments (5 tablo), Employee Onboarding (3 tablo)

**Önleme:** Rapor yazarken `SELECT COUNT(*)` sorgusu yap + Aslan'a sor "aktif mi, dormant mı?"

---

## Madde 35 — Endpoint Silme Öncesi Frontend Usage Check (18.04.2026 — Sprint A5 dersi)

**Kural:** Herhangi bir backend endpoint silmeden önce frontend'de kullanılıp kullanılmadığı kontrol edilmeli. Aksi takdirde 404 + kırık sayfa riski.

**PASS:**
```bash
# Silmeden önce kontrol:
grep -rn "/api/silinecek-endpoint" client/src/ --include="*.ts" --include="*.tsx"
# 0 sonuç → silinebilir ✅
# 1+ sonuç → DURMA, frontend kırılır
```

**FAIL:**
- Silinmiş bir endpoint frontend'de hala çağrılıyor → 404 (prod) veya SPA fallback (dev — §26)
- Silme commit'inde sadece server/ değişiklikleri var, client/ değişmemiş (hem sil hem client'tan kaldır lazım)

**Alternatif (silmek yerine):** Stub endpoint bırak, response'a `_deprecated: true` + `_message: "Bu endpoint kullanımdan kaldırıldı"` ekle. Frontend'i Sprint D/E'de temizle.

**Sprint A5 Yaklaşımı:** 52 stub endpoint'ten 14'ü frontend'de kullanılmıyordu → silindi. 38'i kullanılıyordu → bırakıldı, Sprint D/E/F'de düzgünleştirilecek.

---

## Madde 36 — Sprint Bitiş Checklist (Replit Verification)

Her sprint sonunda Replit'ten **bağımsız DB doğrulaması** iste:

**PASS kriterleri:**
- Sprint hedef metriği (count) Replit SQL ile doğrulandı
- Browser smoke test yapıldı (auth olmadan 401 beklenmeli, 404 değil)
- Build başarılı (`npm run build` exit 0)
- Workflow restart sonrası "System health: HEALTHY"
- Regresyon yok (kullanılan endpoint'ler hala çalışıyor)

**FAIL kriterleri:**
- Sadece Claude'un kodda kontrol ettiğine güvenilmiş (Replit DB ile kontrol YOK)
- Browser smoke test atlanmış
- Build warning'leri ignored (bazen error'a dönüşebilir)

**Sprint A Verification Örneği:** A1-A6 her biri için Replit raporu alındı, sayısal acceptance doğrulandı.

## Madde 37 — Pre-Code Table Write-Path Inventory (18.04.2026 — Sprint B.1 Dersi)

**Bağlam:** 18 Nisan 2026 gece, pdks_records → shift_attendance aggregate job iskeleti yazıldı (300 satır). Ertesi gün Replit DB raporu geldi: `shift_attendance` zaten 175 kayıt, **6 farklı yerden** INSERT alıyor (kiosk real-time dahil). İskelet gereksiz, duplicate risk. Silmek gerekti.

**Kök neden:** Kod yazılmadan önce "hedef tabloya kim yazıyor?" sorusu sorulmamıştı. Kickstart dokümanındaki "tablo boş → aggregate gerekli" anlatısı kuşkusuz kabul edildi.

**6 Kural — Her Yeni Job/Service/Scheduler Öncesi:**

### 1. Tablo Yazıcı Envanteri ZORUNLU

Yeni bir job/service/scheduler bir tabloya yazacaksa, önce tüm yazıcıları listele:

```bash
grep -rn "insert.*TABLO_NAME\|update.*TABLO_NAME\|INSERT INTO TABLO_NAME" server/ --include="*.ts"
```

**Sonuç 2+ yer ise → DUR.** Mimari analiz yap, çakışmayı haritala, sonra kod yaz.

### 2. Replit DB Teyidi ÖNCE, Kod Yazımı SONRA

"Paralel çalışma" (Replit cevabı beklerken kod yazmak) **yasak**. Gerekçe:
- Replit cevabı ~5 dk
- Kod yazımı 1-2 saat
- Hatalı kod düzeltme maliyeti: saatlerce

5 dk bekleme vs saatlerce düzeltme — trade-off net.

### 3. Sprint Başı "Kuşku Listesi" — 5 Zorunlu Soru

Her yeni Sprint iş'ine başlamadan önce cevapla:

| # | Soru | Cevap kaynağı |
|---|---|---|
| 1 | Hedef tablo şu an kaç kayıt? | Replit SQL |
| 2 | Hedef tabloya kim yazıyor? | `grep -rn "insert.*TABLO" server/` |
| 3 | Hedef tablodan kim okuyor? | `grep -rn "from(TABLO\|SELECT.*TABLO" server/` |
| 4 | Değişikliğim hangi yazıcılarla çakışır? | Mimari diyagram |
| 5 | Varsayımım yanlışsa ilk ipucu ne? | Risk anti-plan |

**5 soruya cevap yoksa → kod yazma.**

### 4. Dokümantasyondaki Anlatıyı Sorgula

Kendi eski dokümanların (kickstart kit, devir-teslim, rapor) **dokunulmaz değil**. Önceki Claude oturumu hata yapabilir.

Her anlatı → canlı DB'den teyit (Replit). "Geçen hafta bu böyleydi" garanti değil — DB değişir, kod değişir.

### 5. Risk Classifier — Her Öneri Etiketlensin

| Risk | Tanım | Zorunlu Prosedür |
|:--:|---|---|
| 🟢 Low | Tek-dosya fix, mevcut pattern kopyası | Direkt yaz + Quality Gate |
| 🟡 Medium | Yeni dosya, mevcut tablo etkiler | Grep + Replit count + Quality Gate |
| 🔴 High | Yeni job/scheduler/servis, çoklu tablo | Tam envanter + Replit DB teyidi + 5 Kuşku Sorusu + contract doc |

**Risk etiketi verilmeden kod yazma.** Sprint B.1 🔴 High'tı, 🟡 Medium gibi işlendi → hata.

### 6. Sprint Başı "Contract Document" Template

Her 🟡/🔴 iş için Sprint başında şu doldur (Claude yazar, Replit doğrular):

```markdown
## [Sprint adı] Contract

**Hedef:** [ne yapılacak, tek cümle]
**Risk:** 🟢 / 🟡 / 🔴
**Etkilenen tablolar:** [liste]
**Her tablonun yazıcıları (grep sonucu):** 
  - tablo_x: server/routes/a.ts:L1, server/routes/b.ts:L2
**Her tablonun okuyucuları (grep sonucu):**
  - tablo_x: server/services/c.ts:L3
**Çakışma haritası:** [benim yazdığım path diğerleriyle çatışıyor mu?]
**Idempotency planı:** [aynı iş iki kez çalışsa ne olur]
**Test stratejisi:** [nasıl doğrulanacak]
**Hipotez yanlış çıkarsa plan B:** [geri çekilme stratejisi]
```

Bu doldurulmadan kod yazma yasak.

---

**Öz özet — bu madde neden var?**
18 Nis 2026: 300 satır iskelet gereksiz yere yazıldı. Replit DB raporu 5 dk daha beklense idi, iskelet hiç yazılmayacaktı. **Disiplin > hız.** Bu altı kural o disiplini somutlaştırıyor.

**Referans:** DEVIR-TESLIM-18-NISAN-2026-GECE.md + memory #21

---

## Madde 39 — Archive Before Delete

**Kural:** Silinecek her büyük dosya grubundan (10+ dosya) önce ders çıkarılmadan silme yapılamaz.

**Protokol:**
1. **Kategorize et** — Dosyaları tema/sprint/konu'ya göre grupla
2. **Pattern çıkar** — Her grupta tekrarlayan bulgu, karar, hata, çözüm
3. **Skill'e aktar** — İlgili pattern'leri skill dosyalarına yaz (referans + özet + lesson)
4. **Archive özet yaz** — "Bu gruptan şu dersler çıktı" dokümanı
5. **SONRA sil** (Madde 38 üçlü onay ile)

**Neden:** Silme = institutional memory loss. 6 aylık düşünce geçmişi "çöp" diye atılırsa 6 ay sonra aynı problemleri yeniden çözeriz.

**Örnek uygulama:**
`attached_assets/` klasörü 1693 dosya silinmeden önce:
- `docs/REPLIT-LESSONS-EXTRACTION-PROMPT.md` → Replit'e görev
- `docs/ATTACHED-ASSETS-CATEGORIZATION.md` → Replit kategorize eder
- `docs/ATTACHED-ASSETS-LESSONS-ARCHIVE.md` → Özet + top 20 ders
- Mevcut skill dosyalarına pattern eklemeleri
- **Ondan sonra** Cat C silme

**Kural ihlali emsali:** 18 Nis 2026 gece — Claude "gereksiz dosya" deyip direkt silme önerdi. Aslan "ders çıkardın mı?" diye sordu. Madde 39 doğdu.

**Triggers:**
- ✓ 10+ dosya toplu silme
- ✓ Klasör silme (contains history)
- ✓ Legacy kod/doküman toplu arşiv
- ✓ Sprint/modül "emekli" etme

**Exempt:**
- Debug artifacts (log, cache, build output) — bunlardan ders yok
- Otomatik üretilen dosyalar (runtime reports) — Replit'in `server/data/*recalc*.json` gibi
- Binary cache dosyaları


---

## Madde 30 — Pilot Kritik Log Görünürlüğü (stub, Task #117)

**Bağlam:** 28.04.2026 pilot sırasında karar rolleri (admin/ceo/cgo/adminhq) `/admin/critical-logs` panelini her 30 sn'de bir refresh eder. Yeni eklenen `try { db.insert(pdksRecords)... } catch` blokları MUTLAKA `critLog()` ile sarılı olmalı; çıplak `console.error` pilot karar dashboard'una düşmez.

~~~bash
# Her catch (pdksErr|e) bloğunda critLog kullanımı zorunlu
grep -rn "catch (pdksErr\|catch (e:" server/routes/*.ts server/index.ts | wc -l
grep -rn "critLog(" server/routes/*.ts server/index.ts | wc -l
# critLog satır sayısı ≥ kiosk/pdks try/catch sayısı olmalı
~~~

**Gerekçe:** B.1 missing_pdks_record bulgusu (19.04.2026) — silent swallow Sprint D ↔ E bridge'i kırmıştı. Aslan kararı: artık her PDKS hook çağrısı görünür.

**PASS:** Tüm pdks/kiosk catch blokları critLog ile, tag taksonomisi `PDKS-SYNC|HQ-KIOSK|FAB-KIOSK|MOBILE-QR|AUTO-CLOSE` içinde.
**FAIL:** `console.error` ile sessizce yutan herhangi bir kiosk/PDKS handler.

> **NOT (Aslan):** Bu maddenin içeriği pilot Day-1 raporundan sonra kalıcı kabule bağlanacak (eşik: 5 gün × 0 silent swallow regresyonu).

---

## Madde 31 — Sprint Cross-Wire Audit (stub, Task #117)

**Bağlam:** Sprint D (silent failure pattern) ↔ Sprint E (`system_critical_logs` + UI) arasında bridge bütünlüğü. Tek başına Sprint D iyi, tek başına Sprint E iyi — ama D'nin çıktıları E'nin tablo şemasıyla uyuşmazsa pilot dashboard boş kalır.

~~~bash
# system_critical_logs şeması mevcut + indeksleri kullanılıyor mu?
psql "$DATABASE_URL" -c "\d system_critical_logs" | grep -E "tag|status|created_at"
# critLog tag'leri admin filter SelectItem ile uyumlu mu?
grep -E "PDKS-SYNC|HQ-KIOSK|FAB-KIOSK|MOBILE-QR|AUTO-CLOSE" client/src/pages/admin/critical-logs.tsx
~~~

**PASS:** D'nin ürettiği her tag, E'nin tagColor() fonksiyonunda renk hint'ine sahip; summary endpoint last_7d_by_tag içinde gözlemlenebiliyor.
**FAIL:** Yeni tag eklendi ama UI tagColor()'da varsayılan kırmızıya düşüyor (görsel tutarlılık kaybı).

> **NOT (Aslan):** Pilot Day-1 sonunda `last_24h.unread_24h` 0'dan büyük olduğu durum sayısı kabule bağlı kriter olacak.

---

## Madde 32 — Silent Failure Coverage (stub, Task #117)

**Bağlam:** sprint-d-fix-plan STEP 3 audit (19.04.2026) toplam 13 silent yer tespit etti — 11'i kapatıldı (6 P0 Sprint D, 5 P1/P2 Task #117). Pilot sonrası yeni handler eklenirken regresyon olmaması için coverage takip eder.

~~~bash
# 'PDKS hook error' veya 'auto-checkout error' gibi çıplak console.error sayısı 0 olmalı
grep -rn "console.error.*PDKS\|console.error.*pdks\|console.error.*auto.checkout" server/ | grep -v "node_modules" | wc -l
# Beklenen: 0
~~~

**PASS:** Çıplak console.error ile yutulan PDKS/auto-checkout hata sayısı = 0.
**FAIL:** Geri dönüş varsa (yeni route eklendi, eski pattern sızdı) — Task #117 commit'inden önceki baseline'a düşmüş demektir.

> **NOT (Aslan):** Madde 30-32 birlikte "Pilot Görünürlük Üçlüsü" sayılır. Tek başlarına pass etmeleri yetmez; Day-1 raporunda üçü birden ✓ olmalı.


---

## Madde 40 — Schema-DB Pre-Endpoint Sync Check (25.04.2026 — Sprint R-5 Dersi)

**Bağlam:** Sprint R-5 sırasında 3 schema-DB drift tespit edildi (debug-guide §29). Drizzle schema'da kolon/tablo tanımlı ama gerçek DB'de yok → endpoint compile olur, sadece runtime'da PG `42703`/`42P01` hatası verir, frontend boş veri ile sessiz başarısız olur.

### Kontrol

Yeni endpoint pull edildikten sonra (Replit Agent ya da Claude push'undan önce/sonra):

```bash
# 1. Endpoint'in dokunduğu Drizzle tablosunu bul
ENDPOINT_FILE="server/routes/<endpoint>.ts"
rg -n "pgTable\.|factory[A-Z]|hr[A-Z]" "$ENDPOINT_FILE" | head -10

# 2. Her tablo için DB ile karşılaştır
for TABLE in factory_ingredient_nutrition factory_recipes; do
  echo "=== $TABLE ==="
  PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE \
    -c "\d $TABLE" | rg "^ [a-z_]+"
done

# 3. Endpoint'i gerçekten çağır (TypeScript compile yeterli değil)
curl -s -b /tmp/admin.txt -w "\nHTTP: %{http_code}\n" \
  "http://localhost:5000/api/<endpoint>"
```

**PASS:** HTTP 200, expected shape geliyor.
**FAIL:** HTTP 500 + workflow log'unda `column "X" does not exist` veya `relation "Y" does not exist` → ALTER TABLE / CREATE TABLE gerek (debug-guide §29).

### Pilot Pre-Launch Zorunlu

Pilot 5 May'a kadar tüm recipe/nutrition/factory endpoint'leri bu kontrolü geçmiş olmalı. Aksi halde Day-1'de manager/baş şef boş veriyle karşılaşır, "platform çalışmıyor" diye geri dönüş olur.

> **NOT (Aslan):** Drift #2 (`trans_fat_g`) ve #3 (`history table`) sıraya alındı, pilot zamanı geldiğinde fix edilecek.

---

## 36. Five-Role Mental Review (3 May 2026 - Owner Onayı)

**Her büyük değişiklikten ÖNCE 5 rolü zihinsel olarak çalıştır.** Çelişki çıkarsa açıkça belirt: "Engineer der ki X, Operations der ki Y".

### Rol 1 — PRINCIPAL ENGINEER (Kod Kalitesi)
20 yıl backend deneyimi, distributed systems uzmanı. Sor:
- Bu değişiklik 6 ay sonra hâlâ doğru mu?
- Test coverage var mı? Edge case'ler düşünüldü mü?
- Concurrency/race condition var mı? Transaction güvenli mi?
- Geriye uyumlu mu? Mevcut data bozulur mu?
- Error path nedir? Sessiz fail var mı?

### Rol 2 — FRANCHISE F&B OPERATIONS EXPERT (Gerçek Dünya)
15 yıl franchise yönetimi, kahve/donut zincirleri. Sor:
- Pazartesi sabah 9'da pilotta ne olur?
- Yorgun barista yanlış basabilir mi?
- Wi-Fi koparsa ne olur?
- Hangi rolün işine yarar, hangisi gözden kaçar?
- Müdür/supervisor/barista bunu nasıl kullanacak?

### Rol 3 — SENIOR QA ENGINEER (Hata Bulma)
3 test senaryosu zorunlu:
- **Happy path:** Beklenen kullanım
- **Edge case:** Sınır değerler, null, boş, çok büyük
- **Failure:** Network kopması, timeout, validation hatası
- Regression risk değerlendirmesi
- Smoke test önerisi (8 May / 10 May için)

### Rol 4 — PRODUCT MANAGER (Önceliklendirme)
- Effort × Impact matrisi
- Pilot etki seviyesi: 🔴 Yüksek / 🟡 Orta / 🟢 Düşük
- Sprint kapsamı kararı: Şimdi mi, Sprint 4 mi?
- Owner onayı gerekli mi?

### Rol 5 — COMPLIANCE OFFICER (Yasal/Mevzuat)
- Türkiye İş Kanunu (PDKS, mesai, AGI, asgari ücret)
- Gıda mevzuatı (TGK etiket, alerjen, üretim)
- Vergi (KDV %1/%10/%18, e-fatura, e-arşiv)
- KVKK (kişisel veri, audit log, consent)

### Çıktı Formatı

```
🏛️ ENGINEER: [Bulgu/onay]
🏪 OPERATIONS: [Bulgu/onay]
🧪 QA: [3 senaryo + regression]
📋 PM: [Effort × Impact + Pilot seviye]
🛡️ COMPLIANCE: [Mevzuat değerlendirme]

ÇELIŞKİ (varsa): [Engineer X istiyor, Operations Y istiyor — karar?]
SORULAR (Aslan için): [Bilgisiz tahmin etmem, sorular]
```

### Ne Zaman Çalıştır?

| Durum | 5 Rol Zorunlu mu? |
|---|---|
| Küçük fix (NO-OP, comment, typo) | ❌ Atlat |
| Backend kod değişikliği | ✅ Engineer + QA |
| Pilot etkili değişiklik | ✅ + Operations + PM |
| Mevzuat/finansal | ✅ + Compliance |
| Mimari karar | ✅ Hepsi |
| Yeni özellik | ✅ Hepsi |
| Bundle/sprint planlama | ✅ Hepsi |

### DOSPRESSO Bağlamı (Hatırla)

- 22 birim, 372 kullanıcı, 31 rol
- Pilot Day-1: **12 May 2026 Pazartesi 09:00**
- 4 pilot birim: Antalya Lara (b8), Mavi Boncuk Işıklar (b5), Fabrika (b24), Merkez HQ (b23)
- Kritik kişiler:
  - Aslan (CEO, owner)
  - Yavuz (Coach, tüm şubeler)
  - Sema (Gıda Müh., reçete/etiket)
  - Eren (Fabrika Müd.)
  - Mahmut (Muhasebe-İK, bordro/PDKS)
  - Samet (Satınalma)
- Pilot freeze: 18 Nis - 15 Haz, sadece `fix/chore/docs/refactor/test` commit prefix
- Force push YASAK (`replit.md` L13)
- DOSPRESSO iç kuralı: 30dk altı fazla mesai 0 + yönetici onayı (DECISIONS#39)

### Örnek Çıktı

**Senaryo:** F29 KDV item-level değişikliği (Wave B-3)

```
🏛️ ENGINEER: Item-level taxRate doğru — geriye uyumlu (default 18 sürdü).
   Risk: parseFloat null guard yok (taxRate undefined ise NaN).
   Test: taxRate=null edge case kontrol edilmeli.

🏪 OPERATIONS: Samet siparişe %1 (gıda) yazarsa doğru hesaplanır mı?
   Şu an UI'da taxRate seçilebiliyor mu kontrol et.
   Mahmut: "Mayıs sonu beyannamede %1 vs %18 farkı görünür."

🧪 QA: 
   - Happy: %18 sipariş → toplam doğru
   - Edge: taxRate=null → NaN olmamalı (parseFloat fallback "18")
   - Failure: 1000 item parallel → performans

📋 PM: 🟡 Orta etki. Pilot Day-1 önce yapıldı doğru karar.
   Effort: 30dk. Impact: KDV beyannamesi doğruluğu.

🛡️ COMPLIANCE: Türkiye KDV %1 gıda (un, süt, ekmek), %10 yemek hizmet, %18 diğer.
   Önemli: e-fatura'da satır bazında KDV kodu doğru olmalı (gelecek entegrasyon).

ÇELIŞKİ: YOK
SORULAR: Mahmut (muhasebe) Mayıs sonu bordro çalıştığında doğrula.
```


---

## Madde 41 — Express Route Ordering Audit (4 May 2026, Branch Recipes Dersi)

**KURAL:** Yeni route dosyası oluştururken veya mevcut router'a yeni endpoint eklerken, wildcard route'lar (`/:id`, `/:slug`) **her zaman sabit path'lerden SONRA** tanımlanmalı.

**RİSK:** Yanlış sıra → `Number("search")` = `NaN` → PostgreSQL 500 hatası.

**KONTROL:**
```bash
# Yeni router dosyasında route sırası audit
grep -n "router\.\(get\|post\|patch\|put\|delete\)" server/routes/[FILE].ts
# /:id, /:slug gibi wildcard'lar dosyanın SONUNDA olmalı
```

**İKİNCİL SAVUNMA:** Her wildcard handler'a NaN guard eklenmeli:
```typescript
const id = Number(req.params.id);
if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID" });
```

**Detaylı:** `dospresso-debug-guide` §31

---

## Madde 42 — Şube ↔ Fabrika İzolasyon Doğrulama (4 May 2026, Branch Recipe Sistemi)

**KURAL (DECISIONS#30):** Şube reçete sistemi (`branch_*` tablolar) fabrika tablolarına SIFIR FK referans verir. Mutlak izolasyon.

**KONTROL (her yeni branch_* tablo eklendiğinde):**
```bash
# branch_* tablolarda factory_* referansı var mı?
grep -E "references.*factory" shared/schema/schema-24-branch-recipes.ts
# Beklenen: SIFIR satır

# branch_* sadece global tablolara (users) referans verebilir
grep "references" shared/schema/schema-24-branch-recipes.ts
# Beklenen: sadece users.id ve aynı schema-24 içi referanslar
```

**İHLAL DURUMUNDA:** Schema-24'e fabrika tablosu import edildiyse → IMMEDIATE ROLLBACK + Aslan onayı.

---

## Madde 43 — Görsel Upload — 3 Boyut + EXIF Sıfırla (4 May 2026)

**KURAL:** Ürün/içerik görselleri upload edilirken her zaman 3 boyut otomatik üretilmeli + EXIF metadata sıfırlanmalı (KVKK).

**STANDART (server/routes/branch-recipes.ts pattern):**
- Thumbnail: 200×200, WebP %80 (liste)
- Card: 600×400, WebP %85 (mobil kart, PRIMARY)
- Hero: 1200×800, WebP %90 (detay)
- Sharp `.rotate()` (EXIF auto-fix) + `.removeAlpha()` (KVKK)
- Mime whitelist: image/jpeg, image/png, image/webp
- Max 10 MB

**KONTROL:**
```bash
grep -A 5 "uploadFromBytes" server/routes/[FILE].ts
# 3 boyut Promise.all ile paralel olmalı
# EXIF rotate + removeAlpha çağrılmalı
```
