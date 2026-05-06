# 🔐 Access Mechanism Audit (Sprint 10 P-9)

> **Audit Security 4.5:** "9 paralel role/module access mekanizması" — pilot öncesi haritalama, post-pilot konsolidasyon.

**Tarih:** 6 May 2026
**Sahibi:** Claude (Sprint 10 P-9)
**Durum:** Pilot için **mevcut sistem dokunulmaz** (risk düşürmek için). Post-pilot Sprint 14+ ile konsolide edilecek.

---

## 🎯 Özet

DOSPRESSO platformunda **9 farklı access kontrol mekanizması** koşut çalışıyor. Bu, audit'in bulduğu "fragmented authorization" durumudur. Pilot için **mevcut sistem korunur**, sadece deprecation marker ve refactor planı eklenir. Tam konsolidasyon **post-pilot Sprint 14**'te yapılacak.

### Hızlı Sayım

| # | Mekanizma | Dosya | Kullanım | Risk |
|---|---|---|---|---|
| 1 | `requireManifestAccess()` middleware | `server/services/manifest-auth.ts` | 14 yerde | 🟢 Önerilen |
| 2 | `hasModuleAccess()` fn | `shared/module-manifest` | 14 yerde | 🟢 Önerilen (helper) |
| 3 | `canAccessModule()` fn | `server/services/manifest-auth.ts` | sınırlı | 🟡 Tekrar |
| 4 | `getModuleScope()` + `getScopeFilter()` + `resolveBranchScope()` | `server/services/manifest-auth.ts` | her route | 🟢 Gerekli |
| 5 | **Inline `user?.role === 'admin'` check'ler** | `server/routes/*.ts` | **135 yerde** | 🔴 Konsolide gerek |
| 6 | `isHQRole()`, `isBranchRole()` helper | `shared/schema/*` | sık | 🟢 Helper (OK) |
| 7 | Static role array'leri (`EXPORT_ROLES`, `HQ_ROLES`, vs.) | `server/**/*.ts` | 11+ farklı array | 🔴 Tek manifest'e taşı |
| 8 | `BRANCH_PIN_ADMIN_ROLES` inline | `server/routes/branches.ts:3589` | 1 yer | 🟡 Helper'a taşı |
| 9 | `UserRole.CEO` enum | `server/services/agent-escalation.ts` | sınırlı | 🟢 OK |

**En yüksek risk:** #5 (135 inline role check) ve #7 (11 farklı static array).

---

## 1️⃣ requireManifestAccess Middleware (🟢 ÖNERİLEN PATTERN)

**Konum:** `server/services/manifest-auth.ts:22`

**Açıklama:** DOSPRESSO'nun **resmi yetki sistemi**. Üç katmanlı kontrol:
1. Modül aktif mi (DB `module_flags` tablosu)
2. Rol modüle erişebilir mi (manifest)
3. Scope (own_branch / managed_branches / all_branches)

**Sprint 10 P-5 (6 May):** Fail-open → fail-closed güvenlik fix.

**Kullanım:**
```typescript
router.post('/api/shifts',
  isAuthenticated,
  requireManifestAccess('vardiya', 'create'),
  handler
);
```

**Yeni route'larda zorunlu kullanılır.** Bu, **gold standard**.

---

## 2️⃣ hasModuleAccess() Helper (🟢 ÖNERİLEN)

**Konum:** `shared/module-manifest`

**Açıklama:** Manifest'ten direkt sorgu — middleware kullanmadan rol/modül access check.

**Kullanım:**
```typescript
if (hasModuleAccess(user.role, 'vardiya', 'view')) { ... }
```

**OK:** Sırf middleware kullanmak istemediğinde alternatif. Ama tercih `requireManifestAccess`.

---

## 3️⃣ canAccessModule() (🟡 TEKRAR)

**Konum:** `server/services/manifest-auth.ts:103`

```typescript
export function canAccessModule(role: string, flagKey: string): boolean {
  return hasModuleAccess(role, flagKey, 'view');
}
```

**Sorun:** `hasModuleAccess(..., 'view')` ile aynı şey yapıyor.

**Post-pilot:** Deprecate, `hasModuleAccess` kullanılsın.

---

## 4️⃣ Scope Helpers — getModuleScope / getScopeFilter / resolveBranchScope (🟢 GEREKLİ)

**Konum:** `server/services/manifest-auth.ts:73-163`

**Açıklama:** `requireManifestAccess` çalıştıktan sonra `req.manifestScope` alanına yazar. Handler'lar bu scope'a göre branch filter uygular:
- `own_data` → sadece kendi kayıtları
- `own_branch` → kendi şubesi
- `managed_branches` → 5 + 23 + 24 (HQ + Fabrika + Işıklar — Mahmut)
- `all_branches` → tümü

**OK** ama 3 farklı fonksiyon kafa karıştırıcı:
- `getModuleScope` (read scope)
- `getScopeFilter` (req → filter object)
- `resolveBranchScope` (req → scope result + viewOnly opt)

**Post-pilot:** `resolveBranchScope` tek kullanılsın, diğer ikisi deprecate.

---

## 5️⃣ Inline Role Check'ler (🔴 EN YÜKSEK RİSK)

**Toplam:** **135 inline check** server/routes/ klasöründe.

**Top 10:**
| Dosya | Sayı |
|---|---|
| `server/routes/misc.ts` | 23 |
| `server/routes/hr.ts` | 22 |
| `server/routes/dobody-task-manager.ts` | 14 |
| `server/routes/shifts.ts` | 9 |
| `server/routes/branches.ts` | 8 |
| `server/routes/factory-recipes.ts` | 6 |
| `server/routes/lost-found-routes.ts` | 5 |
| `server/routes/employee-satisfaction-routes.ts` | 5 |
| `server/routes/tasks.ts` | 4 |
| `server/routes/factory.ts` | 4 |

**Sorun:** Her birinde tutarsız role logic'i. Manifest dışına çıkıyor.

**Örnek (`server/routes/branch-inventory.ts:23`):**
```typescript
if (role === 'admin' || role === 'ceo' || role === 'cgo') return true;
```

**Doğrusu olmalıydı:**
```typescript
if (hasModuleAccess(role, 'inventory', 'view')) return true;
```

**Post-pilot Sprint 14:** Otomatik refactor script'i yazılır:
- AST traversal ile inline check'leri tespit et
- `manifest-mapping.json` dosyasında her flag için "hangi rolün hangi action'ı yapabilir" tanımla
- Inline check'leri `hasModuleAccess` çağrısıyla değiştir

**Pilot süresince:** Yeni kod yazılırken **inline check kullanılmamalı**, code review'da yakala.

---

## 6️⃣ isHQRole / isBranchRole (🟢 HELPER, OK)

**Konum:** `shared/schema/role-helpers.ts` (veya benzeri)

**Açıklama:** Rol kategorisi check'leri. HQ rolleri 13 tane (admin, ceo, cgo, vs.), Branch rolleri (mudur, supervisor, barista, vs.).

**OK** — kategori-tabanlı kontroller için. Manifest ile çakışmıyor.

---

## 7️⃣ Static Role Array'leri (🔴 KONSOLİDE GEREKLİ)

**11+ farklı array** repo'da:

| Array | Dosya | Roller |
|---|---|---|
| `EXPORT_ROLES` | `server/export-routes.ts:14` | admin, ceo, cgo |
| `FACTORY_ROLES` | `server/services/employee-summary-service.ts:176` | (factory rolleri) |
| `RECIPIENT_ROLES` | `server/services/allergen-weekly-summary.ts:12` | admin, kalite_yoneticisi, gida_muhendisi |
| `FACTORY_ROLES` | `server/services/factory-scoring-service.ts:30` | (factory rolleri — duplicate!) |
| `HQ_OPS_ROLES` | `server/services/agent-escalation.ts:19` | COACH, CGO |
| `EXECUTIVE_ROLES` | `server/services/agent-escalation.ts:20` | CEO, CGO |
| `MEAL_ROLES` | `server/services/payroll-bridge.ts:524` | stajyer (config'den) |
| `TRAINEE_ROLES` | `server/agent/skills/recipe-finder.ts:44` | barista, bar_buddy, stajyer, supervisor_buddy |
| `TEST_ROLES` | `server/seed-test-users.ts:60` | (test seed) |
| `HQ_ROLES` | `server/scheduler/hq-kiosk-pin-audit.ts:21` | 13 HQ role |
| `BRANCH_PIN_ADMIN_ROLES` | `server/routes/branches.ts:3589` | admin, ceo, mudur |

**Sorun:** `FACTORY_ROLES` 2 farklı yerde duplicate. Tutarsızlık riski yüksek.

**Post-pilot Sprint 14:** Tek `shared/role-categories.ts` dosyasına taşı:
```typescript
export const ROLE_CATEGORIES = {
  EXECUTIVE: ['admin', 'ceo', 'cgo'] as const,
  HQ: ['admin', 'ceo', 'cgo', 'ceo_observer', ...] as const,
  FACTORY: ['fabrika', 'fabrika_personel', ...] as const,
  TRAINEE: ['barista', 'bar_buddy', ...] as const,
  ...
};
```

---

## 8️⃣ BRANCH_PIN_ADMIN_ROLES (🟡 KÜÇÜK — HELPER'A TAŞI)

**Konum:** `server/routes/branches.ts:3589` (set-pin endpoint içinde)

```typescript
const BRANCH_PIN_ADMIN_ROLES = ['admin', 'ceo', 'mudur'];
```

**Sorun:** Endpoint içinde inline. Tekrar kullanılması gerekirse copy-paste.

**Post-pilot:** `shared/role-categories.ts`'a taşı.

---

## 9️⃣ UserRole.CEO Enum (🟢 OK)

**Konum:** `server/services/agent-escalation.ts`

**Açıklama:** TypeScript enum/const ile rol literal'leri yerine sembolik kullanım.

**OK** — type-safety için iyi pattern. Ama rol enum'u `shared/schema`'da tek yerden gelmeli.

---

## 📋 Post-Pilot Sprint 14 Konsolidasyon Planı

### Aşama 1: Hazırlık (1 gün)
1. `shared/role-categories.ts` dosyası yarat — tüm static role array'leri toparla
2. `manifest-mapping.json` — 130+ inline role check için manifest mapping'i oluştur
3. ESLint custom rule: yeni inline role check engellenecek

### Aşama 2: Refactor (2-3 gün)
1. AST script ile inline check'leri tespit et + `hasModuleAccess` ile değiştir
2. `canAccessModule` deprecate, kullanan yerler `hasModuleAccess` kullansın
3. `getModuleScope` + `getScopeFilter` deprecate, `resolveBranchScope` tek kullanılsın
4. Static role array'leri `ROLE_CATEGORIES` ile değiştir

### Aşama 3: Test + Smoke (1 gün)
1. 4 lokasyon × 4 persona × her endpoint smoke test
2. Audit log'da yetki ihlali yok mu?
3. Performance: manifest lookup overhead'i

**Toplam:** 4-5 gün post-pilot iş.

---

## 🚦 Pilot Süresince (6 May - 18 May+)

| Yapılacak | Yapılmayacak |
|---|---|
| ✅ **Yeni route'larda `requireManifestAccess` kullanılır** | ❌ Mevcut kodu refactor etmek |
| ✅ Code review'da inline role check yakala | ❌ Static role array'leri konsolidasyon |
| ✅ Audit log'da yetki ihlali takip | ❌ Manifest schema değişikliği |
| ✅ Bu doküman güncel tutulur | ❌ Riskli refactor |

---

**Sprint 10 P-9 Sonuç:** Pilot için risk düşürüldü, post-pilot tam refactor için detaylı plan hazır. Audit'in 9-mekanizma bulgusu **dokümante edildi ve sahiplenildi**.
