# Wave W2 — BRANCH + DASHBOARD (Task #290)

**Status:** VERIFIED-NO-OP (3 May 2026, runtime investigation)
**Bağımlılık:** Task #289 (W1 VERIFIED-NO-OP) MERGED.
**Mode:** Build (read-only investigation, no FE patch gerekti).
**Gerçekleşen süre:** ~1 saat
**Risk:** YOK (kod değişikliği yok)

## Sonuç (TL;DR)

**11/11 madde FALSE POSITIVE.** W1 ile aynı kök sebep: audit script TanStack queryKey semantiklerini (queryKey.join("/"), custom queryFn override, invalidateQueries cache-only) anlamıyor.

## Madde-Madde Doğrulama

| # | Audit iddiası | Gerçek FE davranışı | Server | Verdict |
|---|---|---|---|---|
| B1 | `GET /api/branch-summary` broken | supervisor-centrum:17 default fetcher join → `/api/branch-summary/${branchId}`; MCSupervisor:77 + MCYatirimci:74 custom queryFn template literal | `branch-summary.ts:32` `:branchId` | ✅ NOT BROKEN |
| B2 | `GET /api/branch-feedback-summary` broken | MCSupervisor:117 + MCYatirimci:113 custom queryFn `/api/branch-feedback-summary/${branchId}` | `dashboard-data-routes.ts:540` `:branchId` | ✅ NOT BROKEN |
| B3 | `GET /api/branch-training-progress` broken | MCSupervisor:103 + MCYatirimci:99 custom queryFn `/api/branch-training-progress/${branchId}` | `dashboard-data-routes.ts:504` `:branchId` | ✅ NOT BROKEN |
| B4 | `GET /api/branches/kiosk/staff` broken | sube-pin-yonetimi:65 custom queryFn `fetch(\`/api/branches/${selectedBranch}/kiosk/staff\`)` | `branches.ts:2661` `/api/branches/:branchId/kiosk/staff` | ✅ NOT BROKEN |
| B5 | `GET /api/branch` broken | nfc-giris:33 default fetcher → `/api/branch` | `stub-endpoints.ts:404` STUB MEVCUT (200 dönüyor) | ✅ NOT BROKEN |
| B6 | `GET /api/branch-dashboard-v2` broken | sube/dashboard:208 custom queryFn `fetch(\`/api/branch-dashboard-v2/${branchId}\`)` | `branches.ts:5028` `:branchId` | ✅ NOT BROKEN |
| B7 | `GET /api/branch-inventory` broken | sube/siparis-stok:518 default fetcher join → `/api/branch-inventory/${branchId}` | `branch-inventory.ts:29` `:branchId` | ✅ NOT BROKEN |
| B8 | `GET /api/branches-list` broken — kaldır | dobody-gorev:181 queryKey `/api/branches-list` ama custom queryFn `fetch("/api/branches")` (gerçek call); ayrıca stub `/api/branches-list` da mevcut | `branches.ts:197` `/api/branches`; `stub-endpoints.ts:287` `/api/branches-list` | ✅ NOT BROKEN |
| B9 | `GET /api/branch-recipients` broken | smart-notification-dialog:57 custom queryFn `fetch(\`/api/branches/${branchId}/recipients\`)` (gerçek call); ayrıca stub `/api/branch-recipients` da mevcut | `branches.ts:244` `/api/branches/:branchId/recipients`; `stub-endpoints.ts:292` stub | ✅ NOT BROKEN |
| D1 | `GET /api/dashboard/branch` broken | MCSupervisor:89 custom queryFn `fetch(\`/api/dashboard/branch/${branchId}\`)` | `dashboard-data-routes.ts:347` `:branchId` | ✅ NOT BROKEN |
| D2 | `GET /api/dashboard/widget-data` broken | dashboard-widgets:59 default fetcher join → `/api/dashboard/widget-data/${widget.id}` | `dashboard-widgets-routes.ts:51` `:widgetId` | ✅ NOT BROKEN |

## Acceptance Criteria — Re-evaluation

1-3. ❌ Path patch / B8 kaldırma / B9 server impl gereksiz (hepsi FP).
4. ✅ Mission Control 6 dashboard smoke testi gerekmedi (static verification yeterli).
5. ✅ KM 2.0 widgets çalışıyor (D2 default fetcher doğru URL üretiyor).

## Audit Script v3 İhtiyacı

W1 ile aynı kritik bulgu — `scripts/audit/extract-broken-apis.mjs` v3 enhancement gerekli. Owner kararı bekleniyor.

## Paralel-güvenlik

Kod değişikliği olmadığı için diğer dalgalarla conflict yok.
