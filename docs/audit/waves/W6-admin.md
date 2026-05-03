# Wave W6 — ADMIN (Task #283.6) — **HIGH PRIORITY**

**Status:** PENDING (öncelikli)
**Mode:** Build + Plan (A1 module-flags KVKK riski)
**Tahmini süre:** ~6 saat (8 path + 1 N = 9)
**Risk:** YÜKSEK (modül erişim + setup wizard + delegasyon)

## Kapsam (8 path + 1 audit-recovered = 9)

| # | Method+Path | Server | Karar |
|---|---|---|---|
| A1 | `GET /api/module-flags/branch` | `/:branchId` | **a1** — KVKK riski, RBAC test smoke |
| A2 | `GET /api/trash` | `/tables` veya `:tableName` | **a2** |
| A3 | `GET /api/admin/branch-setup-status` | `/:branchId` | **a1** |
| A4 | `GET /api/admin/module-activation-checklist` | `/:moduleKey` | **a1** |
| A5 | `POST /api/admin/seed-equipment-training` | YOK | **b** — server impl (admin seed butonu, dev only) |
| A6 | `PATCH /api/admin/settings/branch_dashboard_allowed_roles` | YOK | **b** — server impl (yetkilendirme) |
| A7 | `POST /api/test-smtp` | YOK | **b** — server impl (setup wizard) |
| A8 | `POST /api/complete-setup` | YOK | **b** — server impl (setup wizard finalizasyon) |
| **N9** | **`GET /api/delegations`** (ve `POST`) | YOK | **b** — server impl (delegasyon yönetimi modülü) |

> **Not (N9):** `admin/delegasyon.tsx` GET (liste) + POST (yeni delegasyon) çağrılıyor. Yetkilendirme + RBAC bağımlı kritik modül.

## Acceptance

1. 4 a1/a2 endpoint patch (A1-A4).
2. 4 b endpoint server impl (A5-A8).
3. 1 N endpoint server impl (N9 delegations CRUD).
4. **RBAC smoke test** module-flags + delegations değişikliği sonrası.
5. Setup wizard end-to-end (test-smtp + complete-setup).
6. Trash listing + restore akışı çalışır.
7. Module activation checklist render eder.
8. Delegasyon yönetimi sayfası liste + yeni oluşturma çalışır.

## Paralel-güvenlik

Tüm dalgalarla paralel-güvenli (W4 ile sıralı değil — admin sayfaları upload kullanmıyor).

## Bağımlılık

B20 KVKK audit task'ı önceliklendirilmeli (A1 module-flags + N9 delegations riski).
