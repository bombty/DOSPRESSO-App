# Wave W7 — DİĞER (FINANCE + EQUIPMENT + VERSIONED + MISC) (Task #283.7)

**Status:** PENDING
**Mode:** Build
**Tahmini süre:** ~6 saat (MM3/MM4/MM7 dahil)
**Risk:** ORTA

## Kapsam (12 path-bazlı + 3 method-mismatch = 15)

### FINANCE (1)
| # | Method+Path | Server | Karar |
|---|---|---|---|
| FN1 | `GET /api/cash-reports` | YOK | **b** — server impl (finans modülü kritik) |

### EQUIPMENT (1) + Method-mismatch 2
| # | Method+Path | Server | Karar |
|---|---|---|---|
| EQ1 | `GET /api/troubleshooting` | `/:equipmentType` | **a1** |
| MM3 | `GET /api/fault-service-tracking` | POST | **FE method düzelt** veya server GET alias |
| MM4 | `POST /api/service-requests` | GET | **server alias** veya FE'de query param GET |

### VERSIONED (1)
| # | Method+Path | Server | Karar |
|---|---|---|---|
| V1 | `GET /api/v2/branch-on-shift` | `/:branchId` | **a1** |

### W0 v2 EKLEMESİ (1 yeni — NS1)
| # | Method+Path | Server | Karar |
|---|---|---|---|
| NS1 | `GET /api/inventory/by-supplier` | `/:supplierId` | **a1** — :param patch (SATINALMA mal kabul) |

> NS2-NS4 (önceki commit'te) v2 script ile false positive çıktı (template literal parsing bug ve `${qs}` artifact); kaldırıldı.

### MISC (9) + Method-mismatch 1
| # | Method+Path | Server | Karar |
|---|---|---|---|
| M4 | `GET /api/cari` | `/stats` | **a2** |
| M5 | `GET /api/quality/allergens/print-log` | YOK | **owner karar** — impl veya kaldır |
| M6 | `GET /api/employee-dashboard` | `/:userId` | **a1** |
| M7 | `GET /api/public/staff-rating/validate` | `/:token` | **a1** |
| M8 | `GET /api/public/urun` | `/:code` | **a1** |
| M9 | `GET /api/qr/equipment` | `/:id` | **a1** |
| M10 | `GET /api/qr/inventory` | `/:id` | **a1** |
| M11 | `GET /api/analytics` | `/dashboard` | **a2** |
| M12 | `GET /api/analytics/summary` | YOK | **kaldır FE** |
| MM7 | `POST /api/notifications` | GET | **server alias** veya FE GET'e geç (mobile/SupervisorQuickBar) |

## Acceptance

1. 12 path-bazlı patch.
2. 3 method-mismatch karar.
3. Cash reports server impl (kritik finans).
4. QR scan akışı (equipment + inventory) smoke test.
5. Public urun sayfası render eder.
6. Mobile supervisor quick bar notifications butonu çalışır.

## Paralel-güvenlik

Tüm dalgalarla paralel-güvenli.
