---
name: dospresso-debug-guide
description: DOSPRESSO-specific debugging procedures for common issues. Covers 401/403 auth errors, stale TanStack cache, empty results, FK constraint errors, Radix UI crashes, HTTP 423 data locks, SLA timezone issues, TypeScript req.user pattern, kiosk auth failures, SLA business hours issues, delegation system issues, and Drizzle schema vs DB column mismatches. Use when investigating any bug or unexpected behavior.
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
| Drizzle INSERT → HTTP 500 | §17 Schema-DB Kolon Uyuşmazlığı |
| Dobody şube analizi çalışmıyor | §18 Dobody branchPerf Undefined |
| Görev patlaması (yüzlerce overdue) | §19 Scheduler Max Instance Limiti |
| CRM görev tab duplikasyonu | §20 CRM Task Channel Duplikasyonu |
| Seed script INSERT → NOT NULL violation | §21 Seed Script DB Kolon Uyumsuzluğu |

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

## §17 — Drizzle Schema vs DB Kolon Uyuşmazlığı (HTTP 500)

**Belirti:**
- POST endpoint HTTP 500 dönüyor ("Seed başarısız" veya genel error mesajı)
- Server logda: `error: column "X" of relation "Y" does not exist`
- Drizzle INSERT statement başarısız oluyor

**Neden Oluşur:**
IT danışman raw SQL ile tablo oluşturduğunda, Drizzle schema'daki bazı kolonları
CREATE TABLE'a eklemeyi unutuyor. Drizzle ORM, INSERT sırasında schema'da tanımlı
TÜM kolonları SQL'e dahil eder → PostgreSQL hata verir.

**Bu Oturumda Görülen Örnek (Sprint R-1):**
- Tablo: `factory_keyblend_ingredients`
- Eksik kolonlar: `allergen_type VARCHAR(50)`, `show_name_to_gm BOOLEAN`
- DB'de sadece `is_allergen` ve `show_to_gm` vardı (farklı isimle!)

**Teşhis:**
```bash
# DB gerçek kolonlarını gör
PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" \
  -c "\d factory_tablo_adi"

# Drizzle schema kolonlarını gör (yorum satırlarını filtrele)
grep -A 40 "^export const factoryTabloAdi\s*=" shared/schema/schema-22-factory-recipes.ts \
  | grep 'varchar\|boolean\|integer\|numeric\|text\|timestamp\|serial' \
  | grep -oP '"[a-z_]+"'
```

**Fix:**
```sql
ALTER TABLE factory_tablo_adi
  ADD COLUMN IF NOT EXISTS kolon_adi VARCHAR(50),
  ADD COLUMN IF NOT EXISTS baska_kolon BOOLEAN DEFAULT false;
```

**Önleme Checklist:**
- [ ] Yeni tablo oluştururken Drizzle schema ile SQL'i yan yana karşılaştır
- [ ] `psql \d [tablo]` çıktısındaki kolonlar Drizzle schema ile tam eşleşiyor mu?
- [ ] Drizzle schema'da comment değerleri ("gluten", "soya", "gr", "ml") kolon ismi gibi görünebilir — dikkatli oku
- [ ] Kolon ismi farklılığına dikkat: DB'de `show_to_gm` varken schema `show_name_to_gm` bekleyebilir

---

## §18 — Dobody branchPerf Undefined (Şube Analizi Çalışmıyor)

**Belirti:**
- Mr. Dobody agent şube yönetim analizi kategorisi hiç çalışmıyor
- Server logda: `branchPerf is not defined` (agent-engine.ts:268 civarı)
- Agent diğer skill'leri çalıştırıyor ama şube bazlı performans analizi atlanıyor

**Kök Neden:**
`server/services/agent-engine.ts` satır ~148 civarında `branchPerf` değişkeni tanımlanmadan
satır ~268'de kullanılıyor. Eksik satır: `let branchPerf: any[] = [];`

**Fix:**
```typescript
// agent-engine.ts, satır ~148 civarına ekle:
let branchPerf: any[] = [];
```

**Etki:** Bu fix olmadan Dobody'nin şube karşılaştırma, düşük performans uyarısı ve
branch-level analiz skill'leri çalışamıyor. Tek satır fix.

**Durum:** Tespit edildi (7 Nisan 2026 analizi), henüz uygulanmadı (Faz 1 kapsamında planlandı ama cancel edildi).

---

## §19 — Scheduler Görev Patlaması (Yüzlerce Overdue Birikmesi)

**Belirti:**
- `/sube-gorevleri` sayfasında yüzlerce overdue görev görünüyor
- `branch_task_instances` tablosunda 479+ overdue pending kayıt birikmiş
- Şube çalışanları görev listesinde gerçek görevleri bulamıyor

**Kök Neden:**
`server/services/branch-task-scheduler.ts` → `generateDailyTaskInstances()`:
- Her gün çalışıyor (startup + 08:00)
- Aynı gün dedup: `ON CONFLICT (recurring_task_id, branch_id, due_date) DO NOTHING`
- **AMA:** Max açık instance limiti YOK
- Tamamlanmamış eski instance'lar birikmeye devam ediyor
- Pilot döneminde kimse görev tamamlamadığı için birikim kontrolsüz büyüdü

**Planlanan Fix (henüz uygulanmadı):**
```typescript
// generateDailyTaskInstances içine:
// "Bu şube + recurring_task için 3'ten fazla tamamlanmamış instance varsa oluşturma"
const openCount = await db.select({ count: sql`count(*)` })
  .from(branchTaskInstances)
  .where(and(
    eq(branchTaskInstances.recurringTaskId, template.id),
    eq(branchTaskInstances.branchId, branchId),
    inArray(branchTaskInstances.status, ['pending', 'overdue'])
  ));
if (openCount[0].count >= 3) continue; // skip
```

**Geçici Temizlik (pilot öncesi):**
```sql
-- Overdue olanları toplu temizle
UPDATE branch_task_instances SET status = 'cancelled'
WHERE status IN ('overdue', 'pending') AND due_date < CURRENT_DATE - INTERVAL '7 days';
```

**İlgili Dosyalar:** `server/services/branch-task-scheduler.ts`, `shared/schema/schema-03.ts`

---

## §20 — CRM Task Channel Duplikasyonu

**Belirti:**
- CRM İletişim Merkezi'ndeki "Görevler" tab'ı ile Operasyon → "Görev Takip" sayfası aynı veriyi gösteriyor
- Kullanıcılar iki farklı yerden aynı görevleri görüyor → karışıklık

**Kök Neden:**
- CRM `task` channel'ı → `/api/tasks` endpoint → `tasks` tablosu
- Operasyon task-takip sayfası → `/api/tasks` endpoint → `tasks` tablosu (AYNI!)
- Bunlar ayrı: CRM HQ Tasks tab'ı → `/api/iletisim/hq-tasks` → `hq_tasks` tablosu (bu CRM'e özgü)

**Karıştırılmaması Gereken Ayrım:**
| Bileşen | Endpoint | Tablo | Bağımsız mı? |
|---|---|---|---|
| CRM "Görevler" tab | `/api/tasks` | `tasks` | HAYIR — task-takip ile aynı |
| Operasyon task-takip | `/api/tasks` | `tasks` | HAYIR — CRM ile aynı |
| CRM "HQ Görevler" tab | `/api/iletisim/hq-tasks` | `hq_tasks` | EVET — CRM'e özgü |

**Planlanan Çözüm (henüz uygulanmadı):**
- CRM'den "Task" channel'ını kaldır
- Yerine ticket detay sayfasına "Görev Oluştur" butonu ekle
- Operasyon → task-takip TEK görev merkezi olsun

**İlgili Dosyalar:** `client/src/pages/crm-mega.tsx`, `server/routes/crm-iletisim.ts`

---

## Quick Diagnostic Commands

```bash
curl -s http://localhost:5000/api/health
grep -i "error\|crash\|FATAL" /tmp/server.log 2>/dev/null | tail -10
grep -i "scheduler\|agent\|skill" /tmp/server.log 2>/dev/null | tail -5
```

---

## Role & Sidebar Access Debugging

### Symptom: User can't access a page (403 or blank screen)
1. Check ROLE_MAPPING in `client/src/components/protected-route.tsx`
   - Role must be mapped to a group (e.g., fabrika, hq, branch)
   - FabrikaOnly requires group `fabrika`, HQOnly requires group `hq`
2. Check route protection in `client/src/App.tsx`
   - FabrikaOnly, HQOnly, ExecutiveOnly, ProtectedRoute wrappers
3. Check API endpoint auth: `requireRole()` or `requireManifestAccess()`

```bash
# Quick check: is role in ROLE_MAPPING?
grep "fabrika_depo" client/src/components/protected-route.tsx

# Quick check: what group is the role in?
grep "ROLE_MAPPING" -A50 client/src/components/protected-route.tsx | grep "your_role"
```

### Symptom: Sidebar item missing for a role
1. Check MENU_BLUEPRINT has the item (id + path)
2. Check SIDEBAR_ALLOWED_ITEMS has the item for that role
3. Check moduleKey matches an enabled module

```bash
# Is item in blueprint?
grep 'id: "factory-mrp"' server/menu-service.ts

# Is item assigned to role?
grep -A5 "recete_gm:" server/menu-service.ts
```

### Symptom: HomeScreen shows 0 modules
1. Check `client/src/components/home-screen/role-module-config.ts` has the role
2. Check module-manifest.ts has the role in at least one module
3. Run: `grep "your_role:" client/src/components/home-screen/role-module-config.ts`

### Role Consistency Matrix Check
```bash
python3 -c "
import re
for name, path in [('PERM','shared/schema/schema-02.ts'),('MAP','client/src/components/protected-route.tsx'),('SIDE','server/menu-service.ts'),('MOD','client/src/components/home-screen/role-module-config.ts'),('HOME','client/src/lib/role-routes.ts')]:
  with open(path) as f: c = f.read()
  roles = set(re.findall(r'(\w+):\s*[\[\{\'\\']', c))
  print(f'{name}: {len(roles)} roles')
"
```

## §21 — Maliyet Hesaplama Yanlışlıkları (Cost Analysis Errors)

**Semptom:** Reçete maliyeti gerçeğin 2-3 katı veya hiç hesaplanmıyor

**Tipik hatalar:**

### 1. Paket fiyatı KG fiyatı olarak kullanılmış (maya vakası)
```
Yaş Maya 500g × 24 paket = 12 KG, fiyat ₺925
Yanlış: ₺925/KG  → 1 kg × 925 = ₺925 ❌
Doğru: ₺925/12KG = ₺77/KG → 1 kg × 77 = ₺77 ✅
```
**Çözüm:** `conversion_factor` kolonunu paket ağırlığına eşitle (gram olarak)

### 2. Keyblend karışımı tek ₺/KG ile hesaplanmış
```
"Katkı Maddeleri" 1265g × ₺9.21/g = ₺11,651 ❌ ASIRI YANLIŞ
Gerçek: 14 ayrıştırılmış bileşen (CMC+DATEM+SSL+Xanthan+L-sistein+aromalar)
        Toplam ~480g, ortalama ₺215/KG → ₺103 ✅
```
**Çözüm:** Reçete malzemelerini ayrıştırılmış olarak gir. `ingredient_type: 'keyblend'` etiketi koy.

### 3. Birim dönüşüm unutulmuş (LT vs KG)
```
Creamice Base 950ml (0.95 LT ≈ 0.95 KG)
Fiyat ₺199.75/paket → ₺199.75/0.95 = ₺210.26/KG
```

### Debug Adımları:
```bash
# 1. Envanter fiyatı doğru mu?
psql $DATABASE_URL -c "SELECT code, name, market_price, conversion_factor FROM inventory WHERE code = 'H-1082';"
# conversion_factor = paket ağırlığı (gram). 12000 = 12 KG paket

# 2. Reçete malzeme bağlantısı var mı?
psql $DATABASE_URL -c "
SELECT fri.name, fri.amount, fri.ingredient_type, i.code, i.market_price, i.conversion_factor
FROM factory_recipe_ingredients fri
LEFT JOIN inventory i ON i.id = fri.raw_material_id
WHERE fri.recipe_id = 1;
"

# 3. Hesap doğru mu?
# amount (g) × market_price / conversion_factor = cost (₺)
# 1000 × 925 / 12000 = ₺77.08 ✅
```

### Aslan Metodolojisi (Donut Örnek):
- **Hamur:** 29 ayrıştırılmış malzeme (keyblend ayrı işaretli) — 41 KG parti
- **Kızartma yağı:** 20g emilim × ₺86.27/KG = ₺1.73
- **Elektrik:** 57.82 KWh × ₺6 / 630 adet = ₺0.55
- **Personel:** 2 kişi × 2 saat × ₺76.25 / 630 = ₺0.48
- **Topping:** 10g konfiseri × ₺249/KG = ₺2.49 (Beyaz/Sütlü/Bitter ort)
- **Dolgu:** 12g × ₺260/KG = ₺3.12 (Vizyon/Frambuaz/Waffle/Lotus/Karamel ort)
- **Ambalaj:** ₺1.50
- **Toplam:** Sade ₺7.33 → Kaplamalı ₺9.82 → Klasik ₺12.85 (satış ₺39.60 = %68-81 marj)

### SALES_PRICES Map Güncelleme:
```ts
// server/routes/cost-analysis-routes.ts
const SALES_PRICES = {
  "DON-001": 39.60, "CIN-001/002/003": 54.35,
  "CHE-001/002/003/004": 76.00, "CHE-005": 115.62 (San Sebastian),
  "BRW-001/002": 49.50, "COK-001/002": 49.50,
  "EKM-001": 49.50, "EKM-002": 56.80,  // Blueberry Crown
};
```
Not: Satış fiyatları şubelere fabrika çıkış fiyatı (KDV hariç). Fiyat listesi Excel dosyasından alındı.


---

## §21 — Seed Script DB Kolon Uyuşmazlığı (17.04.2026)

IT danışmanın yazdığı seed script'ler (örn. `seed-donut-recipe-v2.ts`) DB'deki gerçek kolonlarla eşleşmeyebilir. İki tipik hata:

### A) NOT NULL constraint violation
```
error: null value in column "ref_id" of relation "factory_recipe_ingredients" violates not-null constraint
code: '23502'
```

Sebep: Seed INSERT deyimi `ref_id` kolonunu yazmıyor ama kolon NOT NULL. `factory_recipe_ingredients.ref_id` varchar(10) NOT NULL, unique (recipe_id, ref_id).

Hotfix: Döngü indeksinden otomatik üret:
```ts
const refId = `D${String(i + 1).padStart(3, "0")}`; // D001..D029
```

### B) Olmayan kolona UPDATE
```
error: column "expected_unit_weight_unit" of relation "factory_recipes" does not exist
code: '42703'
```

Sebep: Seed script eski schema draft'ına göre yazılmış; production schema'da o kolon hiç oluşturulmamış.

Hotfix: UPDATE SET listesinden o satırı kaldır. Kontrol:
```bash
psql "$DATABASE_URL" -c "\d factory_recipes" | grep -E "kolon_adı"
```

### Önlem
Seed script çalıştırmadan önce:
```bash
psql "$DATABASE_URL" -c "\d <hedef_tablo>"
```
ile NOT NULL ve mevcut kolonları doğrula. Unique constraint varsa (recipe_id+ref_id gibi) deterministik üretim kullan.

---

## §22 — Recipe-Product Mapping Drift (18.04.2026 — Replit Audit keşfi)

**Semptom:** `factory_recipes.productId` tüm satırlarda `NULL`, "üretim planlama reçete seçince ürün göstermiyor".

**Kök sebep:** Prefix tutarsızlığı — reçete kodları 3 harfli (`DON-`, `CIN-`, `CHE-`, `BRW-`), ürün SKU'ları 4-5 harfli (`DNT-`, `CINNA-`, `CHEE-`, `BROW-`). Otomatik eşleşme imkansız, mantıksal mapping gerekli.

**Debug:**
```sql
-- Orphan sayısı
SELECT COUNT(*) FROM factory_recipes WHERE product_id IS NULL;
-- 27 ise: hiç eşleşme yok, 0 ise: tamam

-- Prefix farkını gör
SELECT DISTINCT SUBSTRING(code FROM 1 FOR 4) FROM factory_recipes
UNION ALL
SELECT DISTINCT SUBSTRING(sku FROM 1 FOR 4) FROM factory_products;
```

**Çözüm:** `server/scripts/fix-recipe-product-mapping.ts` — mantıksal eşleme tablosu (`RECIPE_PRODUCT_MAP`) kullanır, eksik ürünleri `FP-*` prefix ile otomatik oluşturur.

**Önleme:** Yeni reçete/ürün eklendiğinde `RECIPE_PRODUCT_MAP`'e ekle, seed'de `productId` doldur.

---

## §23 — Fatura Fiyat Senkronizasyon Drift (18.04.2026)

**Semptom:** "Maliyet hesabı gerçek alım fiyatından farklı" — örn. maya ₺1,869/KG (yanlış, paket fiyatı) veya keyblend ₺9,210/KG (yanlış, gram fiyatı).

**Kök sebep:** Excel'den elle fiyat girilmesi → paket fiyatı KG fiyatı olarak kaydedildi, küçük bileşen fiyatı da tüm keyblend fiyatı olarak atandı.

**Debug:**
```sql
-- Şüpheli yüksek fiyatlar
SELECT code, name, last_purchase_price
FROM inventory
WHERE last_purchase_price > 1000
ORDER BY last_purchase_price DESC
LIMIT 20;

-- Price history'de kaynağı gör
SELECT price, source, notes, effective_date
FROM inventory_price_history
WHERE inventory_id = <id>
ORDER BY effective_date DESC;
```

**Çözüm:** `npx tsx server/scripts/update-prices-from-invoices.ts` — 143 malzemenin son fatura fiyatını gerçek muhasebe Excel'inden alır, `source='excel_import'` ile izlenebilir.

**Önleme:** Envanter kaydı oluşturulurken:
- İsimde **mutlaka paket ağırlığı** yaz (`Yaş Maya 500 gr*24`, `Un 25 kg`)
- Fiyat **paket başına** yazılır (`lastPurchasePrice`), `unitCost` da aynı (script hesabını yapacak)
- Paket içeriği belirsizse `packageSizeKg=null` bırak, manuel fiyat/KG hesabı yapma

---

## §24 — Feature Freeze İhlal Tespiti (18.04.2026 — 8 haftalık sprint boyunca)

**Semptom:** Sprint A-H arasında "yeni özellik eklendi" benzeri bir commit var.

**Kontrol:**
```bash
# Commit öneklerini kontrol et
git log --oneline --since="2026-04-18" --until="2026-06-15" | grep -E "^[a-f0-9]+ feat:" | head

# Yeni route/tablo kontrolü
git diff --stat origin/main~50 HEAD -- shared/schema/ client/src/pages/ server/routes/
```

**Önleme:**
- Her commit öncesi `.agents/skills/dospresso-session-protocol/SKILL.md` § Feature Freeze bölümünü oku
- Aslan'dan gelen "Cinnaboom maliyet hesabı" gibi istekler → nazikçe "Sprint I'ya (9. hafta) ertelendi" de
- **İstisnalar**: kritik güvenlik fix (A4 gibi), kırık link düzeltmesi (A1), veri konsolidasyon (B)

---

## §25 — Seed Production Blocked (18.04.2026 — Sprint A4 sonrası yeni davranış)

**Semptom:** Admin olarak `/api/admin/seed-*` çağırıyor, production'da 403 alıyor.

**Çözüm:** Bu artık **beklenen davranış**. Seed endpoint'leri production'da kapalı. Açmak için:

1. Replit Secrets → `ALLOW_SEED_IN_PRODUCTION=true` ekle
2. Workflow restart (yeni env değeri yüklenmesi için)
3. Seed çalıştır (tek sefer)
4. Secrets'tan flag'i SIL veya `false` yap
5. Workflow restart

**Önleme:** Dev ortamda bu check çalışmıyor, dev DB'de her zaman izinli. Production'da **kasıtlı bariyer** — audit log `[SEED-PROD-BLOCKED]` mesajı bırakır.

---

## §26 — Vite SPA Fallback: Silinen API Endpoint 200 Dönüyor (Dev Mode)

**Semptom:** Bir API endpoint'i `server/routes/stub-endpoints.ts` veya başka dosyadan sildin, ama `curl` hala 200 dönüyor. 404 vermiyor.

**Sebep:** Dev modda Vite middleware Express'in üzerine biniyor. Express `/api/foo` için route handler bulamıyor, Vite devreye giriyor, **SPA fallback** olarak `index.html` döndürüyor (45-50 KB HTML).

```bash
# Test komutu:
curl -s -o /dev/null -w "%{http_code} (%{size_download}B)\n" \
  http://localhost:5000/api/silinmis-endpoint

# Beklenen (dev):    200 (46345B)  ← Vite SPA fallback, NORMAL
# Beklenen (prod):   404 (0B)       ← Gerçek Express davranışı
```

**Çözüm:** Bu bir bug DEĞİL — kasıtlı React SPA davranışı. Yapılabilecekler:

**1. Test etmek için:**
```bash
# Response body'ye bak: HTML mi JSON mu?
curl -s http://localhost:5000/api/silinmis-endpoint | head -5
# HTML geldi → SPA fallback (endpoint gerçekten silinmiş)
# JSON geldi → endpoint hala var, başka dosyadadır
```

**2. Gerçek durumu doğrulamak için:**
```bash
# Express route definition'ını ara
grep -rn '"/api/silinmis-endpoint"' server/routes/ --include="*.ts"
# Hiç sonuç → silinmiş ✅
# 1+ sonuç → hala var, başka dosyada
```

**3. Prod benzeri test için:**
```bash
# Production build + start
npm run build && npm start
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/silinmis-endpoint
# Beklenen: 404 ✅
```

**Önleme:** Sprint A5 verification sırasında Replit bu pattern'i buldu. **Silme + smoke test yaparken yalnızca HTTP status'a bakma, response body'yi de kontrol et** (HTML = SPA fallback, JSON = route var).

**Referans:** Sprint A5 Replit raporu (18 Nis 2026 commit `137ba7b2`) — "İlk testte tüm silinenler 200 verdi, derinleştim, Vite SPA fallback çıktı"

---

## §27 — Dormant Module "Eksik" Sanmak (18.04.2026 — Rapor hatası dersi)

**Semptom:** Bir modülün DB'de 0 veya çok az kaydı var (`factory_shipments=2`, `gate_attempts=0`). Rapor yazarken "bu modül bozuk, eksik, kullanılmıyor" diye sunmak.

**Sebep:** Bu modüller **kasıtlı olarak dormant** olabilir — pilot sonrası aktif edilecek ya da başka sistem kullanılıyor olabilir. "Kodda var = kullanılıyor" varsayımı yanlış.

**Doğru yaklaşım:**

1. **Önce Aslan'a sor:** "Bu modül aktif mi, yoksa ilerde mi kullanılacak?"
2. **Raporda dil dikkat:** 
   - ❌ "Modül bozuk / eksik / kullanılmıyor"
   - ✅ "Modül hazır, aktivasyon bekleniyor"
   - ✅ "DOSPRESSO kapsamı dışında (başka sistem)"
3. **Sprint planına eklemeden önce Aslan onayı al**

**Bilinen dormant modüller (18 Nis 2026):**
| Modül | Tablo | Kayıt | Durum |
|-------|:--:|:--:|-------|
| Franchise Projects | 20 | 0 | Yeni şube açılışında aktif |
| Gate Sınav Sistemi | 18 | 0 | Pilot sonrası hibrit terfi |
| Factory Shipments | 5 | 2 | Dış sistem, opsiyonel |
| Employee Onboarding | 3 | 2 | Pilot'ta aktif |

**Önleme:** Bir modül için "bozuk" demeden önce `conversation_search` ile Aslan'ın önceki açıklamasına bak, `docs/SISTEM-ANLAYIS-RAPORU-18-NISAN-2026.md` Bölüm 4.1'i oku.


---

## §28 — Yanlış Tabloya Bakmak: Bordro Dersi (18.04.2026)

**Semptom:** Bir modül için "0 kayıt, hiç kullanılmamış" raporlanır. Sonra DB'ye başka bir tablo ile bakılınca modül aslında aktif çıkar.

**Örnek (Nisan 2026):**
```
Claude raporu: "Bordro modülü kullanılmamış — payroll_records=0"
Gerçek: monthly_payroll=51 kayıt, 2 ay aktif kullanım
```

Yani `payroll_records` tablosu aslında **farklı amaçlı/boş**, asıl bordro tablosu `monthly_payroll`'du.

**Neden olur:**
- 3 paralel isim: `monthly_payrolls` (eski), `monthly_payroll` (yeni), `payroll_records` (ayrı)
- İlk bakılan tablo dead schema olduğunda yanılgı
- Kod tarafı "3 tablo var konsolide et" der, DB "tek tablo çalışıyor" der

**Çözüm (Önleme):**

1. **Bir modül için rapor yazmadan önce TÜM ilgili tabloları tara:**
   ```sql
   -- Örnek: bordro
   SELECT 'monthly_payrolls' as tbl, COUNT(*) FROM monthly_payrolls
   UNION ALL SELECT 'monthly_payroll', COUNT(*) FROM monthly_payroll
   UNION ALL SELECT 'payroll_records', COUNT(*) FROM payroll_records;
   ```

2. **Tek tablo 0 ise, o modülü "kullanılmıyor" ilan etme.** Farklı isimlendirme varyantları olabilir:
   - `monthly_X` vs `monthly_Xs` (tekil/çoğul)
   - `X_records` vs `X_entries` vs `X_log`
   - `X` vs `X_v2`

3. **Kod'dan ipucu al:**
   ```bash
   # Hangi endpoint bordro yazıyor?
   grep -rn "INSERT INTO.*monthly\|insert.*MonthlyPayroll\|insert.*Payroll" server/ --include="*.ts"
   ```

**Audit trail:** Bir modül için "dormant" demeden önce:
- ✅ Frontend ne çağırıyor? (grep client/src/)
- ✅ Hangi tablo INSERT alıyor? (grep server/)
- ✅ Her tablonun count'u var mı?
- ✅ Aynı domain'de N farklı tablo var mı?

**Referans:** Sprint D raporu (18 Nis 2026, commit `fd37f0f1`) — "monthly_payroll=51 keşfi"

---

## §17 — Silent Timing Failure (Scheduler)

### Semptom
Tablo 0 kayıt ama:
- Scheduler kodu sağlam, master-tick'e register edilmiş
- `log("scheduler started")` çıktısı server log'unda var
- `INSERT` query'si kodda var, `onConflictDoNothing()` ile idempotent
- Hiç hata yok, hiç exception yok — sadece boş tablo

### Root Cause
Scheduler tetik penceresi dar (örn. sadece Pazar 23:00-23:10 veya ayın 1'i 01:00). Server restart/deploy o pencereyi kaçırdıysa, bir sonraki pencereye kadar tablo BOŞ kalır. **Silent failure** — ne log, ne notification.

### Tanı
```bash
# Scheduler'ın register edildiği saati bul
grep -B 2 -A 5 "registerInterval\|setInterval" server/index.ts | grep -B 5 "TABLO_ADI"

# Pencere dar mı? (spesifik gün + saat + dakika koşulu)
# ÖRN: if (now.getDay() === 0 && now.getHours() === 23 && now.getMinutes() < 10)
```

### Fix Pattern
Startup catch-up: scheduler register'dan sonra non-blocking bir retro hesap çağır.

```typescript
async function catchUpSummaries(periods: number = 4): Promise<void> {
  for (let i = 0; i < periods; i++) {
    const targetEnd = new Date();
    targetEnd.setDate(targetEnd.getDate() - 1 - (i * PERIOD_DAYS));
    try {
      await calculateSummary(targetEnd); // idempotent olmalı
    } catch (e) {
      console.error(`Catch-up period -${i} error:`, e);
    }
  }
}

function startScheduler() {
  schedulerManager.registerInterval(...);

  // Non-blocking startup catch-up
  catchUpSummaries(4).catch(e => console.error("Startup catch-up error:", e));
}
```

**Gereksinim:** Hedef fonksiyon parametreli olmalı (weekEndDate / monthEndDate) + `onConflictDoNothing()` idempotent.

**Referans:** Sprint B.2 fix (18 Nis 2026) — `server/index.ts` catchUpWeeklySummaries

---

## §18 — PG Transaction Partial Success Impossible (25P02)

### Semptom
Batch INSERT içinde bir query fail oldu, sonrakiler de fail ediyor:
```
error: current transaction is aborted, commands ignored until end of transaction block
code: 25P02
```

### Root Cause
Postgres'te transaction içinde herhangi bir query fail olursa, transaction ABORT durumuna geçer. Sonraki tüm query'ler **savepoint yoksa** 25P02 hatası verir. Try/catch bu durumu çözmez — transaction aborted flag tx seviyesinde tutulur.

### Anti-pattern (YAPMA)
```typescript
await db.transaction(async (tx) => {
  for (const item of items) {
    try {
      await tx.insert(table).values(item);  // ❌ 1. item fail ederse
    } catch (e) {
      log(e);                                // ❌ ... 2. item de fail eder (25P02)
    }
  }
});
```

### Fix Pattern A: Her item bağımsız (önerilen)
```typescript
// Transaction YOK — her item kendi bağımsız INSERT'i
for (const item of items) {
  try {
    await db.insert(table).values(item);
  } catch (e) {
    log(e); // diğer item'ler etkilenmez
  }
}
```

### Fix Pattern B: Savepoint (karmaşık batch için)
```typescript
await db.transaction(async (tx) => {
  for (const item of items) {
    await tx.transaction(async (sp) => {  // nested = savepoint
      await sp.insert(table).values(item);
    }).catch(e => log(e)); // savepoint'e rollback
  }
});
```

### Karar
Aggregate/batch işler için **Pattern A** (bağımsız INSERT) yeterli ve basit. Ancak referential integrity critical (örn. order + order_items) ise Pattern B gerekli.

**Referans:** Sprint B.1 (18 Nis 2026) — `server/services/pdks-to-shift-aggregate.ts`

---

## §19 — Aggregate Job Duplicate Risk (Unknown Write-Path)

### Semptom
Yeni bir aggregate/scheduler/job yazıyorsun, iskeleti hazırladın. Sonra fark ediyorsun:
- Hedef tablo **zaten dolu** (beklediğinden çok fazla kayıt)
- Başka bir kod path'i **zaten** o tabloya yazıyor
- Senin job'ın yazınca **duplicate/çakışma** oluşacak

### Root Cause
Kod yazmadan önce **hedef tablonun mevcut yazıcıları** taranmamış. Yalnızca okuma zincirini analiz etmek (bordro nereden besleniyor) yeterli değil — **yazma zincirini** de bilmek zorunlu. Büyük sistemlerde bir tablo 5-10 farklı yerden yazılabilir (kiosk real-time, backfill endpoint, manuel UI, migration script, başka servis, vs).

### Tanı
Şu grep'i yeni kod yazmadan önce ZORUNLU çalıştır:

```bash
# Drizzle style
grep -rn "insert\.\{0,20\}TABLO\|update\.\{0,20\}TABLO" server/ --include="*.ts" | head

# Raw SQL style
grep -rn "INSERT INTO TABLO\|UPDATE TABLO SET" server/ --include="*.ts" | head

# Direkt referans (sadece import edilen yerler)
grep -rln "import.*TABLO\|from.*TABLO" server/ --include="*.ts"
```

Örnek (18 Nis 2026 — shift_attendance):
```bash
$ grep -rn "shiftAttendance\|shift_attendance" server/ --include="*.ts" | \
    grep -iE "insert|update|upsert|values\(|\.set\("
server/routes/branches.ts:2977         # kiosk shift-start real-time
server/routes/branches.ts:4174
server/routes/factory.ts:1146          # factory kiosk
server/routes/guest-complaints-routes.ts:133
server/routes/pdks.ts:774              # backfill endpoint
server/storage.ts:4214                 # genel
server/tracking.ts:40                  # tracking
```
→ 7 farklı yazıcı. Yeni aggregate yazmak = duplicate katastrofu.

### Fix Pattern

**Eğer envanter sonucu çakışma varsa:**

1. **İş kapsamını değiştir** — belki aggregate yazmak yerine, mevcut yazıcıları konsolide etmek gerekiyor
2. **Farklı tabloya yaz** — shift_attendance yerine shift_attendance_aggregate gibi ayrı tablo
3. **İptal et** — iş zaten yapılıyor, yeni bir job gereksiz

**Eğer envanter sonucu tek yazıcı varsa:**
1. Normal devam, ama idempotency stratejisini dokümante et
2. UNIQUE constraint eklemeyi düşün (race condition koruması)

### Quality Gate §37 Bağlantısı

Bu pattern oluşmadan önce §37 "Pre-Code Table Write-Path Inventory" kuralları uygulanmalı:
- Kural 1: Yazıcı envanteri ZORUNLU
- Kural 3: Sprint başı 5 Kuşku Sorusu
- Kural 5: Risk classifier (🔴 High = yeni job/scheduler)

**Referans:** Sprint B.1 dersi (18 Nis 2026 gece) — 300 satır pdks-to-shift-aggregate.ts yazıldı, ertesi gün iptal edildi çünkü kiosk zaten shift_attendance'a real-time yazıyordu.

### Önleme — Self-Check Soru
Yeni bir job/service yazmaya başlamadan önce kendine sor:

> "Bu tabloya şu an başka kim yazıyor?"

Cevabı bilmiyorsan, grep'i çalıştırana kadar kod yazma.
