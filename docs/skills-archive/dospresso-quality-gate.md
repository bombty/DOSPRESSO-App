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

### 3a. toFixed/toLocaleString — ALWAYS wrap with Number()
```bash
grep -rn "\.toFixed\|\.toLocaleString" client/src/ --include="*.tsx" | grep -v "Number(\|?? 0\||| 0\|node_modules" | head -20
```

```typescript
// WRONG: stats.avgRating.toFixed(1)
// WRONG: stats?.avgRating?.toFixed(1)  ← still crashes if avgRating is string
// CORRECT: Number(stats?.avgRating ?? 0).toFixed(1)

// WRONG: salary.toLocaleString()
// CORRECT: Number(salary ?? 0).toLocaleString('tr-TR')
```

### 3b. Array methods — API may return object instead of array
```bash
grep -rn "\.map(\|\.filter(\|\.length\|\.reduce(" client/src/ --include="*.tsx" | grep "data\.\|result\.\|faults\.\|items\.\|records\." | grep -v "|| \[\]\|??\|Array.isArray\|node_modules" | head -20
```

```typescript
// WRONG: data.map(...)
// WRONG: faults.filter(...)

// CORRECT — handle both array and {data:[]} format:
const items = Array.isArray(data) ? data : (data?.data || data?.items || []);
items.map(...)
```

### 3c. API Response Format Verification (Runtime Check)
Some DOSPRESSO APIs return `{data: [...]}` not `[...]`. Known cases:
- `/api/faults` → returns `{data: [...]}`
- `/api/agent/actions` → returns `{actions: [...]}`
- `/api/notifications` → may return `{notifications: [...]}`

ALWAYS normalize in useQuery or useMemo:
```typescript
const { data: rawFaults } = useQuery({ queryKey: ['/api/faults'] });
const faults = useMemo(() => 
  Array.isArray(rawFaults) ? rawFaults : (rawFaults?.data || []),
  [rawFaults]
);
```

### 3d. PostgreSQL COUNT() returns string — wrap with Number()
```bash
grep -rn "reduce\|\.total\|\.count" client/src/ --include="*.tsx" | grep -v "Number(\|parseInt\|node_modules" | grep "total\|count" | head -10
```

```typescript
// WRONG: data.reduce((s, o) => s + o.total, 0)  → "035" string concat
// CORRECT: data.reduce((s, o) => s + Number(o.total), 0)  → 8
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

## 9. React Hooks Safety

### 9a. useEffect must NOT contain JSX returns
```bash
grep -rn "useEffect" client/src/ --include="*.tsx" -A 30 | grep -B 3 "return.*<\|return.*Loading\|return.*Error\|return.*null" | grep -v "cleanup\|clearInterval\|clearTimeout\|removeEventListener" | head -10
```

```typescript
// WRONG — JSX inside useEffect:
useEffect(() => {
  if (isLoading) return <LoadingState />;  // CRASH: "destroy is not a function"
}, []);

// CORRECT — early returns BEFORE hooks, or AFTER all hooks:
if (isLoading) return <LoadingState />;
useEffect(() => { ... }, []);
```

### 9b. Hooks must come BEFORE early returns
```bash
# Find files where isLoading/isError return appears BEFORE a useQuery/useEffect
for f in $(find client/src/pages -name "*.tsx"); do
  EARLY=$(grep -n "return.*Loading\|return.*Error\|return.*null" "$f" | head -1 | cut -d: -f1)
  HOOK=$(grep -n "useQuery\|useEffect\|useMemo\|useState" "$f" | tail -1 | cut -d: -f1)
  if [ -n "$EARLY" ] && [ -n "$HOOK" ] && [ "$EARLY" -lt "$HOOK" ]; then
    echo "⚠️ $f: early return at line $EARLY, hook at line $HOOK"
  fi
done 2>/dev/null | head -10
```

## 10. Runtime API Format Testing

CRITICAL: After every sprint, verify API response formats match frontend expectations.

```bash
# Login and test actual API responses
COOKIE=$(curl -s -c - -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"adminhq","password":"TestPass123!"}' | grep connect.sid | awk '{print $NF}')

for EP in "/api/faults" "/api/equipment" "/api/notifications" "/api/agent/actions?status=pending" "/api/feedback?branchId=5"; do
  RESP=$(curl -s -b "connect.sid=$COOKIE" "http://localhost:5000$EP" | head -c 50)
  if echo "$RESP" | grep -q '^\['; then echo "$EP → array (OK)";
  elif echo "$RESP" | grep -q '^{'; then echo "$EP → OBJECT (check frontend handles this!)";
  fi
done
```

## 11. Radix UI Package Safety

NEVER install Radix packages with `^` caret. Pin exact versions.
After ANY npm install, check:
```bash
find node_modules/@radix-ui -mindepth 2 -name "node_modules" -type d 2>/dev/null
```
Must return empty. If nested packages found → downgrade the new package.

## 12. Service Worker

After any frontend changes, bump the cache version in `client/public/service-worker.js`.

## 13. Agent System Health

Verify background jobs still running:
```bash
grep -i "scheduler\|agent\|skill\|escalation\|outcome" /tmp/server.log 2>/dev/null | tail -10
```

Verify agent routing rules exist:
```bash
echo "SELECT COUNT(*) FROM agent_routing_rules;" | psql
```

## 14. Madde 37 — Pre-Code Discipline (Pilot Hazırlık 2026)

Cumartesi-Pazar 18-19 Nis 2026 marathon'unda öğrenilen ve disiplin protokolüne dahil edilmiş kurallar.

### §17 Silent Timing Failure
Scheduler `setTimeout(0)` ile çağrılırsa Node.js event loop'a hemen alınmaz; bazı driver/connection bağlamlarında **sessizce hiç çalışmaz**. Mutlaka `setTimeout(fn, n)` ile minimum 100ms verin veya `setImmediate(fn)` kullanın. Sprint 18 Nis: B.5 monthly payroll scheduler bu pattern yüzünden 3 ay çalışmamış.

### §18 PostgreSQL 25P02 (in_failed_transaction)
Bir transaction içinde `INSERT` veya `UPDATE` hata fırlatırsa, **sonraki tüm sorgular** "current transaction is aborted" hatası verir. **Çözüm:** Her batch işleminde her döngü iterasyonu için **kendi try/catch'i** olmalı VE hata olunca `await db.execute(sql\`ROLLBACK\`)` çağrılmalı, sonra döngü devam etmeli. Sprint 18 Nis: bordro batch'inde 1 user fail edince diğer 286 user da fail etti.

### §19 Aggregate Duplicate Risk
İki ayrı kod yolundan **aynı aggregate tablosuna** INSERT yapılırsa, scheduler her iki yolu çağırırsa duplicate kaydı oluşur. **Çözüm:** UNIQUE constraint ekle (PK ya da composite UNIQUE) veya UPSERT kullan (`ON CONFLICT DO UPDATE`). Sprint 18 Nis: B.5 startMonthlyPayroll + Replit startPdks duplicate keşfedildi (Claude 112 satır kod silindi).

### §20 Schema Drift Önce Doğrula
Replit ile schema'da yeni tablo/kolon eklendiğinde, `npx drizzle-kit push` çalıştırılmadan önce **DB'de gerçekten ne var?** kontrol edilmeli:
```bash
echo "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='factory_product';" | psql
```
Sprint 18 Nis: factory_product / recipe_price_history schema'da vardı ama DB'de yoktu. 3 migration manual SQL ile düzeltildi.

### §21 Bağımlılıklar Önce
Yeni feature için tablo/kolon oluştururken `references()` Drizzle FK kullanılıyorsa, **bağımlılık ait tablonun aynı schema-XX.ts dosyasında ÖNCE tanımlı** olduğunu kontrol et. Yoksa cascade order patlar. Sprint A.2 task_escalation_log: tasks/users/branches schema-02.ts'te 2652-3021 satırlarında, ben sonuna ekledim → güvenli.

### §22 Build BOTH Backend + Frontend
Schema değişiklikleri (özellikle yeni `export type`) frontend build'i de bozabilir (eğer client tarafında o tipi import edip kullanıyorsa). Backend build temizse rahatlama, **vite build'i de** her sprint sonunda koş:
```bash
npx esbuild server/index.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/test.js
npx vite build  # 1m 30s+ ama ZORUNLU
```

### §23 Flag/Config Runtime Etki Kontrolü ⭐
`module_flags` veya `feature_flags` gibi tablolarda `is_enabled=false` görünce **otomatik blocker varsayma**. Önce grep ile o flag'in kodda gerçekten okunduğunu kontrol et:
```bash
grep -rn "useModuleFlag\|module_flags\|isEnabled" client/src/ server/ --include="*.ts" --include="*.tsx" | head -10
```
**18-19 Nis 2026 dersi**: Replit F02 incelemesinde `pages/fabrika/*.tsx`'te `useModuleFlag` çağrısı **0 sonuç** çıktı. Module flag'lerin runtime'da etkisi YOK — sadece admin panel görünüyor. F01 "13 modül kapalı" panik üzerinden 3 saatlik fix planı yapıldı, sonradan iptal edildi. **Pilot hazırlığında 3 saat tasarruf.**

### §24 SQL Yazmadan Önce Schema Kolon Doğrulama ⭐⭐
`SELECT u.name`, `INSERT ... users(name)` gibi SQL yazarken **kolon varsayımı YAPMA**. Önce gerçek schema'yı grep ile gör:
```bash
grep -A 30 "export const users = pgTable" shared/schema/schema-02.ts
# users tablosunda 'name' YOK — gerçek: first_name + last_name + username
```
**19 Nis 2026 dersi**: B.1 consistency-check SQL'de `u.name AS user_name` yazdım. Replit Task #114 testinde HTTP 500 hatası: `column u.name does not exist`. Düzeltme: `COALESCE(u.first_name || ' ' || u.last_name, u.username, 'Bilinmiyor') AS user_name`. **Özellikle LEFT JOIN + SELECT kombinasyonlarında** her tablonun gerçek kolonlarını grep ile teyit et. Diğer örnek tehlikeli varsayımlar:
- `branches.name` → DOĞRU (var)
- `tasks.title` → YANLIŞ (gerçek: `description`)
- `users.id` → string (varchar UUID), int değil

### §25 Replit İnisiyatif Kod Review ⭐
Replit kendiliğinden kod yazdığında (örn Sprint D STEP 2), Claude **mutlaka sonradan `git show <commit>` ile incele**. Replit'in commit message'ları yanıltıcı olabilir (örn "Fix silent failures" başlığı ama dosya değişmemiş — sadece attached_assets eklenmiş). Bilinçli atlamalar (transaction guard atlaması gibi) pilot öncesi uygun olabilir ama Sprint I'a (pilot sonrası) **mutlaka not edilmelidir**. 19 Nis Sprint D STEP 2: Replit transaction guard atlamış, Claude review ile onayladı (CRITICAL log monitör görünürlüğü yeterli pilot için).

## 15. critLog Pattern (Sprint E — 19 Nis 2026)

Silent failure'ların admin paneline yansıması için `critLog()` helper kullan.

### Eski (KÖTÜ — silent swallow):
```typescript
try {
  await db.insert(pdksRecords).values({...});
} catch (pdksErr) {
  console.error("PDKS hook error (non-blocking):", pdksErr); // ← STDOUT'A SADECE
}
```

### Yeni (DOĞRU — DB persist + admin görünür):
```typescript
import { critLog } from "../lib/crit-log";

try {
  await db.insert(pdksRecords).values({...});
} catch (pdksErr) {
  // critLog() içinde console.error + DB insert birlikte
  critLog("PDKS-SYNC", "Branch kiosk giris: pdks yazılamadı", {
    userId, branchId, error: pdksErr instanceof Error ? pdksErr.message : String(pdksErr),
  }, "branches.ts:2924").catch(() => {});
}
```

### Tag konvansiyonları:
- `PDKS-SYNC` — pdks_records ↔ shift_attendance tutarsızlığı
- `HQ-KIOSK` — HQ kiosk işlemi
- `FAB-KIOSK` — Factory kiosk işlemi
- `AGENT-FAIL` — Mr. Dobody agent skill fail
- `MIGRATION-ERR` — Startup migration error
- `SCHEDULER-ERR` — Background job error

### Admin görünüm:
- `/admin/critical-logs` — UI sayfa (Sprint E UI henüz Replit'te)
- `GET /api/admin/critical-logs/summary` — 24h özet
- `GET /api/admin/critical-logs?days=7&tag=PDKS-SYNC` — filtre

### `.catch(() => {})`:
critLog kendi başına async + non-blocking. Hata olursa pipeline'ı bozmasın diye `.catch(() => {})` ile sessiz yutma.

## 16. TR Datetime Helper (Sprint D — 19 Nis 2026)

`now.toISOString().split('T')[0]` UTC tarih verir. Türkiye saat sınırını (UTC+3) aşan check-in'lerde **yanlış güne yazma riski** var.

### Eski (KÖTÜ):
```typescript
const dateStr = now.toISOString().split('T')[0];  // UTC
const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
```

### Yeni (DOĞRU):
```typescript
import { trDateString, trTimeString, trTimeStringShort } from "../lib/datetime";

const dateStr = trDateString(now);    // 'YYYY-MM-DD' TR saatinde
const timeStr = trTimeString(now);    // 'HH:MM:SS' TR saatinde
const timeShort = trTimeStringShort(now);  // 'HH:MM'
```

### Helper içeriği (`server/lib/datetime.ts`):
```typescript
const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Istanbul',
  year: 'numeric', month: '2-digit', day: '2-digit',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Istanbul',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

export function trDateString(date = new Date()) {
  return DATE_FORMATTER.format(date);
}

export function trTimeString(date = new Date()) {
  return TIME_FORMATTER.format(date).replace(/^24:/, '00:');  // edge case
}
```

### Hangi Yerlerde Kullan:
- `pdks_records.record_date` ve `record_time` insert ederken (kiosk)
- `shifts.shift_date` günlük tarih oluştururken
- `monthly_attendance_summaries.period_month` (`YYYY-MM` formatı)
- Audit log timestamp'leri kullanıcıya görünüyorsa
- Backfill SQL'lerinde `AT TIME ZONE 'Europe/Istanbul'`

### NEREDE KULLANMA:
- API response `generatedAt` timestamp (UTC standart)
- audit_logs.created_at (DB defaultNow())
- console.log timestamp'leri (Replit logs zaten UTC göstersin)
