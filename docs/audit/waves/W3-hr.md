# Wave W3 — HR (Task #283.3) — **HIGH PRIORITY**

**Status:** PENDING (öncelikli)
**Mode:** Build (+ Plan moduna geçiş MM5 maaş method karar için)
**Tahmini süre:** ~5 saat (MM2/MM5/MM6 dahil)
**Risk:** YÜKSEK (PDKS + maaş)

## Kapsam (6 path-bazlı + 3 method-mismatch = 9)

### Path-bazlı 6
| # | Method+Path | Server | FE dosya | Karar |
|---|---|---|---|---|
| H1 | `GET /api/shift-attendance` (ve POST) | `PATCH/DELETE :id`; GET base yok | `qr-scanner-modal.tsx:217,242`, `sube-detay.tsx:175`, `vardiya-checkin.tsx:32`, `attendance.tsx:103` | **a1** — sub-path veya `/api/shift-attendances/my-recent` (s ile) çağır |
| H2 | `GET /api/personnel` | `:id/performance-summary` | `personel-duzenle.tsx:92,195`, `personel-detay.tsx:97`, `personel-profil.tsx:79,160,208` | **a1** — `:id` patch veya `/api/users` rotasına geç |
| H3 | `GET /api/pdks/my-status` | YOK | `mobile/BaristaQuickActions.tsx:228,230` | **b** — server impl |
| H4 | `GET /api/pdks-payroll` | `/summary` veya `:userId` | `maas.tsx:100` | **a2** — `/summary` ekle |
| H5 | `GET /api/shift-attendance/active` | YOK | `attendance.tsx:41` | **a** — `/api/shift-attendances/my-recent` rename |
| H6 | `GET /api/shifts/weekly-summary` | YOK | `sube-bordro-ozet.tsx:40` | **b** — server impl |

### Method-mismatch 3
| # | Method+Path | Server | Karar |
|---|---|---|---|
| MM2 | `GET /api/onboarding-tasks` | POST | **FE method düzelt** — onboarding task fetch GET olmalı, server'a `GET /api/onboarding-tasks?branchId=...` ekle veya FE'yi POST + body'ye çevir |
| MM5 | `GET /api/salary/employee` | POST | **PLAN MODU** — Maaş hesabı kritik; server tasarımı incele, owner kararı al |
| MM6 | `GET /api/staff-evaluations` | POST | **FE method düzelt** — server muhtemelen filter body bekliyor; FE GET → POST'a geç veya server GET endpoint ekle |

## Acceptance

1. 6 path-bazlı endpoint patch.
2. MM2/MM5/MM6 için her biri owner-onaylı karar (FE patch veya server impl).
3. **PDKS smoke test** (Task #287 B4 ay sonu sim ile bağımlılık).
4. **Maaş hesap testi** (MM5 sonrası — kritik).
5. Mobile barista quick actions'ta my-status butonu çalışır.
6. Veri lock + soft delete kuralları korunur.

## Paralel-güvenlik

Diğer dalgalarla paralel-güvenli.

## Bağımlılık

Task #287 (B4 ay sonu puantaj sim) bu wave **sonrası** koşulmalı.
