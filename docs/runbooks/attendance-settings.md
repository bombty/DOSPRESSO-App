# Şube Puantaj Ayarları + Fazla Mesai Onay — Runbook

**Bundle:** #311 (Bundle 7 — F14/F15 kısmi delivery)
**Owner:** Aslan
**Son güncelleme:** 03.05.2026 (Task #328 audit log eklendi)

---

## 1. Amaç
Her şubenin kendine özel geç-gelme toleransı, vardiya başlangıç/bitiş saati, mola süresi ve fazla mesai politikası tanımlayabilmesi; fazla mesainin (overtime) bordroya yansımadan önce şube müdürü tarafından onaylanması.

## 2. Mevcut Durum (5/7 delivery)

| Madde | Durum | Konum |
|---|---|---|
| Şube ayarları schema | ✅ VAR (mevcut tablo genişletildi) | `branch_kiosk_settings` (schema-09 L297-330) |
| Default seed (22 şube) | ✅ Otomatik upsert | `server/routes/branches.ts` L2586-2592 |
| Engine refactor (PDKS+payroll dinamik tolerans) | ✅ KISMEN | `payroll-engine.ts` L43/76, `routes/pdks.ts` L333 |
| Fazla mesai onay tablosu | ✅ VAR | `overtime_requests` (schema-05 L142) |
| Onay endpoint'leri | ✅ VAR | `routes/misc.ts` L1182-1327 |
| HQ admin UI | ✅ VAR | `pages/pdks.tsx` `KioskToleranceSettings` |
| Şube müdürü onay UI | ✅ VAR | `pages/overtime-requests.tsx` |
| **`attendance_settings_audit` tablosu** | ✅ #328 | `shared/schema/schema-09.ts` L344-363 + migration `2026-05-03-attendance-settings-audit.sql` + PATCH handler `routes/pdks.ts` L387-417 + GET `/api/branches/:id/attendance-audit` + UI accordion `pages/pdks.tsx` `AttendanceAuditList` |
| **`late-arrival-tracker.ts` dinamik okuma** | ✅ #326 | `resolveLateThreshold` → `payrollDeductionConfig` cascade |
| **Bundle 7 e2e test** | ✅ #327 | `tests/e2e/branch-attendance-settings.spec.ts` (S1 müdür PATCH tolerans, S2 18dk geç+tolerans=20→penalty yok, S3 overtime POST→approve) — default playwright config, gate yok |

## 3. Kullanım — HQ Admin (CEO/CGO/Admin/Muhasebe_IK)

1. **Sol menü → PDKS / Vardiya Takibi**
2. Üstteki **Kiosk Ayarları** sekmesine geç
3. Şube seç → düzenlenebilir alanlar:
   - `defaultShiftStartTime` / `defaultShiftEndTime` (HH:mm)
   - `lateToleranceMinutes` (varsayılan 15)
   - `earlyLeaveToleranceMinutes` (varsayılan 15)
   - `defaultBreakMinutes` (varsayılan 60)
   - `maxBreakMinutes` (varsayılan 90)
   - `autoCloseTime` (TR saati, varsayılan 22:00)
4. **Kaydet** → `PATCH /api/branches/:id/kiosk-settings`

**Audit (Task #328):** Her field değişikliği `attendance_settings_audit` tablosuna kayıt edilir (kim/ne zaman/eski-yeni). HQ Admin Kiosk Ayarları kartında "Değişiklik Geçmişi (son 90 gün)" accordion'undan görünür. Endpoint: `GET /api/branches/:id/attendance-audit?limit=50&days=90` (admin/ceo/cgo/muhasebe_ik).

## 4. Kullanım — Şube Müdürü (Fazla Mesai Onayı)

1. **Sol menü → İK → Fazla Mesai Talepleri** (veya `/mesai-talepleri`)
2. Bekleyen (`pending`) talepleri gör
3. Her talep için:
   - **Onayla** → `PATCH /api/overtime-requests/:id/approve` → `status='approved'` → bordroya yansır
   - **Reddet** → `PATCH /api/overtime-requests/:id/reject` → `status='rejected'` → bordroya yansımaz

**Yetki:** sadece `mudur` + `supervisor` (kendi şubesi) ve `admin/ceo/cgo/muhasebe_ik` (tüm şubeler).

## 5. Bilinen Açıklar (Phase 2 / follow-up)

### ~~A. Audit tablosu yok~~ ✅ #328
**Çözüm:** `attendance_settings_audit` (`branch_id, changed_by_id, field_name, old_value, new_value, changed_at`) + index `(branch_id, changed_at)`. PATCH handler değişen her field için 1 row insert (tek transaction). GET endpoint son 90 gün, RBAC: admin/ceo/cgo/muhasebe_ik.

### ~~B. Otomatik test boşluğu~~ ✅ #327
**Çözüm:** `tests/e2e/branch-attendance-settings.spec.ts` (3 senaryo, HTTP-level: müdür PATCH tolerans, kiosk shift-start late+tolerans, overtime POST→approve).
**Çalıştır (dev server açık olmalı):**
```
npx playwright test --config=playwright.config.ts tests/e2e/branch-attendance-settings.spec.ts
```
**CI:** `.github/workflows/e2e-bundle7.yml` — manuel (workflow_dispatch only). Otomatik gate yok: `drizzle-kit push` bu DB'de timeout veriyor + fresh CI Postgres seed pipeline ayrı task. Manuel run için `E2E_DATABASE_URL` ve `E2E_SESSION_SECRET` secret'ları seed'li DB'ye işaret etmeli.

## 6. İlgili Dosyalar

- `shared/schema/schema-09.ts` (L297-330) — `branchKioskSettings`
- `shared/schema/schema-05.ts` (L142) — `overtimeRequests`
- `server/lib/payroll-engine.ts` (L43, L76)
- `server/routes/pdks.ts` (L333)
- `server/routes/branches.ts` (L2586-2592, L2922)
- `server/routes/misc.ts` (L1182-1327)
- `client/src/pages/pdks.tsx` (`KioskToleranceSettings`)
- `client/src/pages/overtime-requests.tsx`
- `server/agent/skills/late-arrival-tracker.ts` — `resolveLateThreshold` helper (#326)
