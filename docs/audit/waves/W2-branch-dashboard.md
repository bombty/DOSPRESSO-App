# Wave W2 — BRANCH + DASHBOARD (Task #283.2)

**Status:** PENDING
**Mode:** Build
**Tahmini süre:** ~5 saat
**Risk:** ORTA (mission control + Komuta Merkezi 2.0)

## Kapsam (11 path)

### BRANCH (9)
| # | Method+Path | Server | FE dosya |
|---|---|---|---|
| B1 | `GET /api/branch-summary` → `/:branchId` | `branch-summary.ts:32` | `MissionControlSupervisor.tsx:77`, `MissionControlYatirimci.tsx:74`, `supervisor-centrum.tsx:17` |
| B2 | `GET /api/branch-feedback-summary` → `/:branchId` | `dashboard-data-routes.ts:540` | `MissionControlSupervisor.tsx:117`, `MissionControlYatirimci.tsx:113` |
| B3 | `GET /api/branch-training-progress` → `/:branchId` | `dashboard-data-routes.ts:504` | `MissionControlSupervisor.tsx:103`, `MissionControlYatirimci.tsx:99` |
| B4 | `GET /api/branches/kiosk/staff` → `/:branchId/kiosk/staff` | `branches.ts` | `admin/sube-pin-yonetimi.tsx:65,93` |
| B5 | `GET /api/branch` → `/score` | `lost-found-routes.ts:803` | `nfc-giris.tsx:33` |
| B6 | `GET /api/branch-dashboard-v2` → `/:branchId` | `branches.ts:5013` | `sube/dashboard.tsx:208` |
| B7 | `GET /api/branch-inventory` → `/:branchId` | `branch-inventory.ts:29` | `sube/siparis-stok.tsx:518` |
| B8 | `GET /api/branches-list` | YOK — **kaldır FE**, `/api/branches` kullan | `admin/dobody-gorev-yonetimi.tsx:181` |
| B9 | `GET /api/branch-recipients` | YOK — **server impl** veya kaldır | `smart-notification-dialog.tsx:57` |

### DASHBOARD (2)
| # | Method+Path | Server | FE dosya |
|---|---|---|---|
| D1 | `GET /api/dashboard/branch` → `/:branchId` | `dashboard-data-routes.ts:347` | `MissionControlSupervisor.tsx:89` |
| D2 | `GET /api/dashboard/widget-data` → `/:widgetId` | `dashboard-widgets-routes.ts:51` | `dashboard-widgets.tsx:59` |

## Acceptance

1. 9 a1 endpoint `:branchId`/sub-path FE patch.
2. B8 kaldırılır (`/api/branches`'e yönlendir).
3. B9 owner kararı: server impl mi, kaldır mı?
4. Mission Control 6 dashboard'unda smoke test (Yatırımcı, Supervisor, Personel, Sube, HQ, Fabrika).
5. KM 2.0 dashboard widgets'ta widget verisi düzgün yüklenir.

## Paralel-güvenlik

W1, W3, W5, W6, W7 ile paralel-güvenli. W4 ile sıralı (W4 announcements/banner'lara dokunabilir).
