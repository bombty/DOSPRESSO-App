# Wave W6 — ADMIN (Task #283.6) — **HIGH PRIORITY**

**Status:** PENDING (öncelikli)
**Mode:** Build + Plan (A1 module-flags KVKK riski)
**Tahmini süre:** ~5 saat
**Risk:** YÜKSEK (modül erişim + setup wizard)

## Kapsam (8 path)

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

## Acceptance

1. 4 a1 endpoint patch.
2. 4 b endpoint server impl.
3. **RBAC smoke test** module-flags değişikliği sonrası.
4. Setup wizard end-to-end (test-smtp + complete-setup).
5. Trash listing + restore akışı çalışır.
6. Module activation checklist render eder.

## Paralel-güvenlik

Tüm dalgalarla paralel-güvenli (W4 ile sıralı değil — admin sayfaları upload kullanmıyor).

## Bağımlılık

B20 KVKK audit task'ı önceliklendirilmeli (A1 module-flags riski).
