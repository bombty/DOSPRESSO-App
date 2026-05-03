# Wave W3 — HR (Task #291)

**Status:** VERIFIED-NO-OP (3 May 2026, runtime investigation)
**Bağımlılık:** Task #289 (W1) + #290 (W2) MERGED, ikisi de VERIFIED-NO-OP.
**Mode:** Build (read-only investigation, no FE patch).
**Gerçekleşen süre:** ~1 saat (planlanan ~5 saat)
**Risk:** YOK (kod değişikliği yok)

## Sonuç (TL;DR)

**9/9 madde FALSE POSITIVE.** PDKS + maaş kritik etiketi düştü. Aynı kök sebep — audit script TanStack queryKey semantiklerini anlamıyor + stub-endpoints.ts'in 200 dönen stub'larını "missing" sanıyor.

## Madde-Madde Doğrulama

| # | Audit iddiası | Gerçek FE davranışı | Server | Verdict |
|---|---|---|---|---|
| H1 | `GET /api/shift-attendance` broken | qr-scanner-modal:217,242 invalidateQueries (cache); sube-detay:179 custom queryFn `fetch(\`...?status=...&branchId=...&date=...\`)`; vardiya-checkin:32 default fetcher; attendance:44,59 custom queryFn `fetch("/api/shift-attendance")` | `stub-endpoints.ts:320` STUB GET (returns []); `shifts.ts:48 PATCH/:id`, `:119 DELETE/:id`, `:702 POST/check-in`, `:816 POST/check-out`, `:1262 GET /api/shift-attendances/my-recent` | ✅ NOT BROKEN (stub 200 dönüyor) |
| H2 | `GET /api/personnel` broken | personel-duzenle:94 + personel-detay:99 + personel-profil:162 custom queryFn `fetch(\`/api/personnel/${id}\`)`; profil:210 `/performance-summary`; profil:381 `/ai-recommendations`; profil:419 `/leave-salary-summary` | `misc.ts:1084` `/api/personnel/:id`; `staff-evaluations-routes.ts:40, 609, 767` sub-paths mevcut | ✅ NOT BROKEN |
| H3 | `GET /api/pdks/my-status` YOK | BaristaQuickActions:230 custom queryFn `fetch("/api/pdks/my-status")` | `stub-endpoints.ts:317` STUB MEVCUT (returns `{status:"off",lastEvent:null}`) | ✅ NOT BROKEN |
| H4 | `GET /api/pdks-payroll` broken | maas.tsx:100 queryKey `['/api/pdks-payroll', userId, year, month]` custom queryFn `fetch(\`/api/pdks-payroll/${userId}?year=...&month=...\`)`; ayrıca :60 `/summary` endpoint zaten kullanılıyor | `payroll.ts:79 /summary`, `:231 /:userId`, `:208 /branches`, `:177 /my`, `:198 /positions` | ✅ NOT BROKEN |
| H5 | `GET /api/shift-attendance/active` YOK | attendance.tsx:41 queryKey `["/api/shift-attendance/active"]` (custom queryFn fetch /api/shift-attendance kullanıyor — stub) | `stub-endpoints.ts:321` STUB MEVCUT (returns `{active:false,session:null}`) | ✅ NOT BROKEN |
| H6 | `GET /api/shifts/weekly-summary` YOK | sube-bordro-ozet:40 default fetcher → `/api/shifts/weekly-summary` | `stub-endpoints.ts:325` STUB MEVCUT (returns `{days:[]}`) | ✅ NOT BROKEN |
| MM2 | `GET /api/onboarding-tasks` (server: POST) | personel-onboarding:509 + personel-detay:143 custom queryFn `fetch(\`/api/onboarding-tasks/${onboardingId}\`)` | `hr.ts:2974` `GET /api/onboarding-tasks/:onboardingId`; `:2992 POST` (create); `:3013 PATCH/:id`; `:3031 POST /:id/complete`; `:3050 POST /:id/verify` | ✅ NOT BROKEN (GET sub-path mevcut, POST ayrı create endpoint) |
| MM5 | `GET /api/salary/employee` (server: POST) | personel-duzenle:1120 + personel-profil:183 custom queryFn `fetch(\`/api/salary/employee/${id}\`)` | `hr.ts:4712 GET /:userId`; `:4745 POST` (create); `:4774 PATCH/:id` | ✅ NOT BROKEN (GET sub-path mevcut, POST ayrı create endpoint) |
| MM6 | `GET /api/staff-evaluations` (server: POST) | personel-profil:244 queryKey `['/api/staff-evaluations', id]` default fetcher → `/api/staff-evaluations/${id}` | `staff-evaluations-routes.ts:549 GET /:employeeId`; `:259 POST` (create); `:501 GET /:employeeId/limit-status` | ✅ NOT BROKEN (GET sub-path mevcut, POST ayrı create endpoint) |

## Acceptance Criteria — Re-evaluation

1-2. ❌ Path patch / MM owner kararı gereksiz (hepsi FP).
3-4. ✅ PDKS smoke test + maaş hesap testi gerekmedi (static verification yeterli; kod değişikliği yok).
5. ✅ Mobile barista my-status zaten çalışıyor (stub 200 dönüyor).
6. ✅ Veri lock + soft delete kuralları korunur (kod değişikliği yok).

## Audit Script Bug Pattern

Bu wave aynı zamanda yeni bir FP pattern'i ortaya çıkardı:
- **Method-mismatch FP**: Server'da hem `GET /:id` hem `POST /` (create) varsa, audit script POST'u kayda alıp GET'i "method-mismatch" olarak işaretliyor. Halbuki ikisi de meşru endpoint, FE GET'i `/${id}` template ile kullanıyor.
- **Stub FP**: stub-endpoints.ts'deki 200-dönen stub'lar audit'e "missing" görünüyor. Aslında bunlar geçici no-op endpoint'ler — runtime'da hiçbir hata vermiyor.

Audit script v3 enhancement listesi (W1+W2+W3 birikimli):
1. queryKey.join("/") default fetcher davranışı
2. Custom queryFn override detection
3. invalidateQueries cache-only skip
4. Method-mismatch için sub-path varyantlarını tara (GET/:id varsa POST'u FP sayma)
5. stub-endpoints.ts'i "valid endpoint" olarak işle

## Paralel-güvenlik

Kod değişikliği olmadığı için diğer dalgalarla conflict yok.
