# SPRINT LIVE — DOSPRESSO

Aktif sprintin canlı durumudur. Sprint kapanırken arşive alınır, yeni sprint için bu dosya sıfırlanır.

Son güncelleme: 3 Mayıs 2026 akşam (Mega-Sprint sonuç — 22/36 finding kapatıldı)

---

## 🎯 Wave B + Mega-Sprint SONUÇ (3 May 2026)

**5 Wave / 4 commit / 22 finding işlendi** — Sprint 3'ün ana risk mitigasyon kısmı tamamlandı:

| Wave | Finding'ler | Commit | Durum |
|---|---|---|---|
| **B-1** | F22 (factory stub) + F27 (bordro null) + F14 (PDKS 30dk - DOSPRESSO iç kuralı) | f7d6719b5 | ✅ MERGED |
| **B-2** | F16 (Coach module-content) + F02/F03/F05 NO-OP + F13 ertele | bfd16e90d | ✅ MERGED |
| **B-3** | F29 (KDV item-level) + F30 (cost config DB) + F31 ertele | 2f59a7b60 | ✅ MERGED |
| **B-4** | F04 (CEO toplam) + F07 (sectionWeight) + F34 (MUHASEBE dashboard) + F06/F25 NO-OP + F08/F21 ertele | 211972790 | ✅ MERGED |
| **Mega** | F18 (CareerTab placeholder UI) + F23 (production-ready helper) + F09 NO-OP + F19 ertele | (bu commit) | 🟡 BEKLEMEDE |

**Kapanış istatistiği (Sprint 2 + Sprint 3 Wave B):**
- Toplam 36 finding'den **22 kapandı / kapatıldı NO-OP** (61%)
- 7 Sprint 4'e ertelendi (B6/B21/W-D7 kapsamında)
- 7 finding hâlâ açık ama Pilot etkisi düşük

**Sprint 3 ana hedefler:**
- ✅ DB drift Bundle 1A 195→58 → **Bundle 1B (W-A3) ile 58→0** (#314 ✅ 3 May 2026)
- ✅ F33 13/13 sayfa guard
- ✅ PIN coverage %100
- ✅ pg_dump günlük backup (Wave A-2 ✅ — scheduler 03:00 UTC kayıtlı, ilk manuel backup 2026-05-03 5.66 MB Object Storage'da doğrulandı)
- ✅ Skill MD'ler güncel
- ✅ W-A3 Bundle 1B drift kapatma TAMAMLANDI (13 tablo + 36 idx/constraint, drift=0)

---

## Aktif Sprint

**Sprint 3 — Pilot Hazırlık + Risk Mitigasyon (12 May Pazartesi Pilot Day-1)**

Hedef: Pilot Day-1 (12 May 2026) öncesi açık 36 finding'in 21'i kapatılmalı, F33 13/13 sayfa guard, DB drift 0, PIN coverage %100 (zaten erişildi), eğitim materyali son hâli, pilot kullanıcı listesi doldurulmalı.

**Plan dosyası:** `docs/SPRINT-3-MASTER-PLAN.md` (3 May 2026)

---

## ⚡ Sprint 2 Kapanışı (2-3 May 2026 — 102 commit, ~24 saat marathon)

### Bundle 1A — DB Drift Kapatma (Task #305)
✅ DB drift 195 → 58 (-137); 42 kolon tipi/nullability + 60 idx + 28 FK + module_flags UNIQUE = kapatıldı. `migrations/sprint-2ext-drift-close.sql`.

### Wave A-2 — Günlük pg_dump Backup Cron (Task #280 / B16) ✅ 3 May 2026
✅ `server/backup.ts` `startDailyPgDumpScheduler()` → `server/index.ts` L387 mount edilmiş. Scheduler kayıtlı: ilk çalışma `2026-05-04T03:00:00.000Z` (her gece 03:00 UTC = TR 06:00). Manuel tetikleme başarılı: `db-backups/dospresso/2026-05-03/dump.dump` → **5.66 MB** Object Storage'da doğrulandı. Retention: 30 gün. Exclude: `audit_logs, notifications, scheduler_executions`. Runbook: `docs/runbooks/db-restore-from-backup.md`.

**Object Storage kanıtı (3 May 2026 20:00 UTC):**
```
db-backups/dospresso/2026-05-03/dump.dump | 5.66 MB | 2026-05-03T20:00:50.578Z
```

### Bundle 1B — W-A3 DB Drift Sıfırlama (Task #314) ✅ 3 May 2026
✅ DB drift 58 → **0**. 13 eksik tablo + 36 index/unique/FK migration apply edildi. `migrations/2026-05-03-bundle-1b-drift-close.sql`. Smoke test 5/5 HTTP 200 (`/api/notification-preferences`, `/api/branch-feedback-summary/1`, `/api/hq-support/tickets`, `/api/inventory/by-supplier/2`, `/api/trend-metrics`). `db-drift-check.ts` → 0 drift doğrulandı.

### Bundle 2 — F33 Route Guards + F36 PIN Coverage (Task #306)
✅ 5 sayfa guard sarımı (`/iletisim`, `/nfc-giris`, `/qr-tara`, `/bilgi-bankasi`, `/bildirimler`) + #325'te 3 daha (`/duyuru/:id`, `/akademi-ana`, `/ogrenme-yolum`) = 8/13 sayfa. **Kalan: 5 sayfa Wave A-1'de.** PIN coverage audit: %100 hedef belirlendi.

### Bundle 3 — Dashboard v4 → v5 Centrum (Task #307)
✅ Dashboard router v5 Centrum tek yola yönlendirildi, v4 ölü kodu silindi. F01 KAPATILDI. CEO/CGO/Coach/Trainer artık tek dashboard görür. Build break (orphan import) çözüldü.

### Bundle 4 — PDKS Sync Trio + Atomic Stok (Task #308)
✅ F10 (PILOT exclude) doğrulandı; ✅ F11 (Europe/Istanbul TZ) doğrulandı; ✅ F12 (shift_id FK gap) — 3 katmanlı fallback ladder (planned/nearest ±3gün/adhoc + warn). ✅ F28 (atomic stok race) — `applyAtomicInventoryMovement` helper + 3 endpoint (manuel hareket, mal kabul, kabul onay) + `SELECT FOR UPDATE` + 3 deneme retry (40001/40P01 SQLSTATE).

### Bundle 5 — Bordro AGI + Cari Recompute + Recipe Cost (Task #309)
✅ F26 (AGI 2026 mevzuat) — `calculateIncomeTax` doğru bracket akışı + damga muafiyeti. ✅ F32 (cari recompute) — `recomputeAccountBalance` + invariant check + 3 endpoint. ✅ F20 (lineCost null silent) — structured warn + coveragePercent UI badge. F17 (training/modules 404) — audit yanlışmış, endpoint mevcut.

### Bundle 7 — Şube Puantaj + Fazla Mesai E2E (#311 + #327)
✅ E2E test paketi: `tests/e2e/branch-attendance-settings.spec.ts` 3 senaryo (S1 müdür tolerans PATCH, S2 18dk geç+tolerans=20 lateMinutes, S3 worker overtime POST + müdür approve). Workflow: `.github/workflows/e2e-bundle7.yml` manuel (workflow_dispatch). Pattern: `kiosk-shift-closure.spec.ts` API-level Playwright + raw pg.

### F15 (#326) — Mr. Dobody Dinamik Geç Tolerans
✅ `late-arrival-tracker.ts` artık `payrollDeductionConfig` cascade'inden okur (fabrika branchId=0 → genel). Hardcoded `LATE_THRESHOLD_MINUTES=15` silindi. Unit test 5 senaryo `tests/unit/late-arrival-tracker.test.ts`.

### Task #324 — PIN Seed (F36 Phase 2)
✅ Pilot Day-1 hedefi %100 PIN kapsama. `branch_staff_pins` 31→127 aktif (+96), `factory_staff_pins` 13→14 aktif (+1). Migration: `migrations/2026-05-03-pin-seed-pilot.sql` + `scripts/pilot/27-pin-seed-missing.ts` (--dry-run/--apply, bcrypt rounds=10, BANNED_PINS, hash collision tarama). Pasif/silinmiş kullanıcı PIN'leri otomatik deaktive.

### Task #325 — Route Guard CI Regression Test
✅ `scripts/audit/route-guard-coverage.ts` + `.github/workflows/route-guard-coverage.yml` + `scripts/audit/public-routes-whitelist.json` (262 route, 32 bare, 0 violation baseline). Yeni guard'sız Route otomatik fail.

### Task #272 — Pilot Day-5 Güvenlik Sertleştirme
✅ `POST /api/auth/register` admin/ceo/muhasebe_ik korumalı (anonim 401). Helmet `frameguard: SAMEORIGIN`. authLimiter + passwordResetLimiter mount. Admin bootstrap log'u temizlendi (hash_prefix kaldırıldı).

### Task #273 — shift_attendance check_out Atomic
✅ Branch (3 endpoint), HQ end_of_day, Factory (2 endpoint) `db.transaction` içinde session UPDATE + `shift_attendance.check_out_time` UPDATE atomik. Backfill 0 aday (gerek yok).

### Task #274 — '0000' Parola Gate
✅ `resetNonAdminPasswords()` üretimde ASLA çalışmaz. `rotatePilotDefaultPasswords()` pilot_launched=true iken tek seferlik. `enforcePasswordChangeGate` HTTP 423 password_change_required.

### Task #276 — pdks_daily_summary Sync (B11)
✅ Şube/HQ/Fabrika kapanışlarında günlük sync.

### Task #277, #286 — Kiosk Vardiya Kapanış E2E (B12)
✅ E2E test 5/5 PASS.

### Task #278 — APP_AUDIT_REPORT
✅ 326 sayfa × 1985 endpoint × 806 FE çağrısı tarandı. 10 öksüz sayfa, 81 mega-modül alt sayfa, **118 kırık API çağrısı**, 1278 ölü endpoint adayı.

### Task #282 — 12 Kırık Link/Menü Düzeltmesi
✅ `/bordro→/bordrom`, `/hq-support→/hq-destek`, `/personel-profil→/profil`, `/finans→/mali-yonetim`, `/waste-executive→/waste`, vb. 9 dosya, 14 ekleme/15 silme.

### Task #283 v4 — 118 Kırık API Düzeltmesi
✅ Tüm FE→BE endpoint çağrıları kapandı. Branch PII source'da sanitize.

### Task #279 — Wave A-1 G1+G2 AUTH Doğrulama (NO-OP)
✅ `delegation-routes.ts` (5 endpoint) + `module-content-routes.ts` (5 endpoint) zaten korumalıydı (admin+ceo). Audit eskimiş, anonim 401 doğrulandı. **DECISIONS#29.**

### Task #280 — Wave A-2 pg_dump Cron + DR Playbook (B16)
✅ `scripts/backup/pg-dump-daily.ts` her gece 03:00 UTC. 30-gün retention, Object Storage. Restore runbook 10 adım, 2 imza zorunlu. **DECISIONS#30.**

### Task #281 — Wave A-3 B14 NO-OP Closure
✅ `ROLE_MODULE_DEFAULTS` dead code (0 import). Gerçek mekanizma `role_module_permissions` DB (3127 satır, 31 rol DOLU). Pilot etkisi SIFIR. **9 paralel rol mekanizması B21+B22 olarak Sprint 4'e taşındı.** **DECISIONS#31.**

### Task #284 — 91 Öksüz Sayfa Silme
✅ 326 → 305 sayfa. Repo temizlendi.

### Task #287 (B4) — Ay Sonu Puantaj Simülasyonu
✅ READ-ONLY simülasyon. `docs/audit/pdks-monthly-simulation-2026-05.md`.

### Task #288 — W0 Audit Script Reconstruction
✅ Audit pipeline temellendirildi.

### Task #302 — Repo Kökü Dokümantasyon Hijyeni
✅ 18 stale rapor `docs/archive/2026-Q1/` ve `docs/archive/2026-Q2/` altına taşındı. **STATUS.md güncel sayılarla yenilendi (372 kullanıcı, 31 rol, 305 sayfa, 1.985 endpoint, 455 tablo).** **DECISIONS#32.**

### Task #329 — Comprehensive Role × Module Audit
✅ 6 paralel kod-explorer subagent + 5 mekanik script-tarama. **36 finding (9 KRİTİK, 5 RBAC, 6 hesap-mantık, 3 stub, 1 kırık-API, 2 mevzuat, 3 hardcode, 2 veri-integrity, 3 UX, 3 infra).** Auto-türetilen 17 task (T-300 → T-316, ~44h). Kapsam: `docs/audit/comprehensive-2026-05/`.

---

## 📊 Sprint 2 → Sprint 3 Geçiş Bilançosu

### Kapatılan Finding'ler (36'dan 15'i)
F01 (Dashboard v4/v5), F10 (PILOT exclude), F11 (TZ), F12 (FK gap), F15 (geç tolerans), F17 (training endpoint mevcut), F20 (lineCost), F26 (AGI), F28 (atomic stok), F32 (cari), F33 (8/13 sayfa), F35 (DB drift Bundle 1A), F36 (PIN coverage)
**+ Plus:** Pilot Day-5 hardening, '0000' parola gate, shift_attendance check_out, pg_dump backup, 118 kırık API, 40 kırık link, 91 öksüz sayfa.

### Açık Kalan Finding'ler (~21)
F02, F03, F04, F05, F06, F07, F08, F09, F13, F14, F16, F18, F19, F21, F22, F23, F24, F25, F27, F29, F30, F31, F33 (5 sayfa kalan), F34

### Sayısal Değişim
| Metrik | Önce (2 May) | Sonra (3 May) |
|---|---|---|
| Sayfa | 326 | **305** (-21 öksüz) |
| DB drift | 195 | **58** (-137) |
| Kırık API | 118 | **0** |
| Kırık link | 40 | **0** |
| F33 sayfa | 13 | **5** (8 kapandı) |
| PIN coverage branch | %25 | **%100** (31→127) |
| PIN coverage factory | %93 | **%100** (13→14) |

---

## 🌊 Sprint 3 Wave Planı (Detay: SPRINT-3-MASTER-PLAN.md)

### Wave A — Pilot Day-1 Öncesi (3-11 May, 9 gün)
- **W-A1:** F33 kalan 5 sayfa guard sarımı (1.5h, isolated)
- **W-A2:** Skill MD batch update — `dospresso-roles-and-people` (30dk, DOCS)
- **W-A3:** Bundle 1B — 13 eksik tablo + bağlı 58 item, drift 58→0 (4h, isolated DB-write)
- **W-A4:** Eğitim materyali son hâli (manuel, owner)
- **W-A5:** Pilot kullanıcı listesi doldur (manuel, owner)
- **W-A6:** 8 May + 10 May smoke testler

### Wave B — Pilot Hafta 1 (12-18 May, 7 gün)
- **W-B1:** F22 — factory-f2 stok stub kaldır (3h)
- **W-B2:** F24 — Reçete versiyon → etiket revize otomasyonu (5h, mevzuat)
- **W-B3:** F27 — getPositionSalary null guard (1.5h)
- **W-B4:** F14 — PDKS classifyDay 30dk yuvarlama düzelt (1.5h)
- **W-B5:** Pilot Day-1 gün sonu rapor + incident review

### Wave C — Pilot Hafta 2-3 (19 May → 1 Jun, 14 gün)
- **W-C1:** F29 — KDV oranlarını parametrik yap (2h)
- **W-C2:** F30 — Fabrika saatlik ücreti settings'den oku (2h)
- **W-C3:** F31 — Döviz kuru handling (4h)
- **W-C4:** T-312 — RBAC bundle (F02, F05, F06, F13, F16) — 6h
- **W-C5:** T-315 — Recipe-cost bundle (F21, F23) — 4h
- **W-C6:** T-316 — UX-Dashboard bundle (F04, F18, F34) — 4h

### Wave D — Sprint 4 / Post-Pilot (~30 May+)
- W-D1: B1 HQ kiosk PIN bcrypt (4.5h)
- W-D2: B3 İzin/rapor bakiye sistemi (12h)
- W-D3: B5 Fabrika üretim MVP (6-10h)
- W-D4: B6 Reçete + besin + alerjen + etiket (16-24h)
- W-D5: **B21 — 9 paralel rol mekanizması konsolidasyonu (BÜYÜK, 20-30h)**
- W-D6: B22 — manifest-auth fail-open düzelt (4h)
- W-D7: Comprehensive ek tarama (CRM/Notification/Mr.Dobody) (8h)
- W-D8: B10 — OpenAI aylık harcama tavanı (3-4h)
- W-D9: B17 — Login lockout DB'ye taşı (3h)
- W-D10: B18 — TEST-MATRIX 31 role genişletme (4h)
- W-D11: B20 — KVKK audit + iyileştirme (6h)

---

## Çalışma Modeli (3 May 2026 Netleştirildi)

| Rol | Yapar | Yapmaz |
|---|---|---|
| **Aslan (Owner)** | GO/NO-GO, Replit chat, GitHub UI (PR merge), saha | Kod, DB write, döküman yazma |
| **Claude** | MD/plan/audit yaz, **local commit + GitHub push**, Replit prompt hazırla, sürekli MD tarama | Replit chat ile direkt konuşma, DB write |
| **Replit Agent** | Kod, DB, build, test, deploy, isolated paralel agent | Push (workflow scope), karar, plan |

Detay: `docs/SPRINT-3-MASTER-PLAN.md` Bölüm 5.

---

**Sprint 2 — Pilot Day-5 Sertleştirme**

Hedef: Pilot Day-1 öncesi personel kayıtları, kiosk giriş/çıkış akışı ve PDKS verisinin uçtan uca çalışır durumda olması.

---

## Tamamlanan İşler

1. **Personel import** — Excel kaynağından personel listesi sisteme alındı (Phase 1).
2. **PIN cleanup** — Eski/test PIN kayıtları temizlendi.
3. **PIN seed** — Aktif personel için kiosk PIN'leri yüklendi.
4. **HQ kiosk** — HQ birimi için kiosk akışı kuruldu.
5. **Işıklar PIN mode** — Işıklar şubesi PIN tabanlı kiosk girişine geçti.
6. **Backend kiosk güvenlik yaması** — Kiosk login endpoint'lerine ait güvenlik düzeltmeleri devreye alındı.
7. **4 birim kiosk giriş/çıkış testi** — Işıklar (basrisen), Lara (berkanbozdag), Fabrika (busradogmus), HQ (mahmut) için tam akış başarıyla tamamlandı; ilgili kayıtlar `PILOT_PRE_DAY1_TEST_2026_04_29` notu ile işaretli.
8. **GitHub hassas dosya cleanup** — Repo current tracking'inden hassas dosyalar çıkarıldı, `.gitignore` ile yeniden eklenmeleri engellendi (history rewrite YAPILMADI; bkz. `docs/DECISIONS.md` madde 18).
9. **P7.2 Reçete rol matrisi düzeltmesi** — CEO, gida_muhendisi, sef ve fabrika_mudur rollerinin reçete modülündeki backend + frontend yetkileri `docs/DECISIONS.md` madde 19-23 ile uyumlu olacak şekilde güncellendi.
10. **P7.2.1 CEO nutrition approval düzeltmesi** — `factory-recipe-nutrition.ts` `APPROVAL_ROLES` listesine `ceo` rolü eklendi; `/api/factory/recipes/:id/calculate-nutrition` rol kontrolü güncellendi.
11. **API 404 fallback düzeltmesi** — Tanımsız `/api/...` route'ları artık Vite HTML fallback yerine JSON 404 döner (`server/index.ts` middleware).
12. **TEST-MATRIX + runbook seti** (1 May 2026, commit `57a6c4c0c`) — `docs/TEST-MATRIX.md` (13 rol), `docs/runbooks/db-write-protocol.md`, `docs/runbooks/kiosk-pdks-test.md`, `docs/runbooks/git-security-cleanup.md`, `docs/runbooks/recipe-label-workflow.md` (913 satır toplam).
13. **HQ kiosk PIN güvenlik planı** (2 May 2026, commit `bf2ac7c94`) — `docs/plans/hq-kiosk-pin-security.md` (~250 satır): mevcut plaintext durum analizi, tehdit modeli, bcrypt + lockout + audit refactor planı, 4 faz implementasyon adımları, 15 test senaryosu, rollback, 7 açık karar. Implementasyon BEKLİYOR (owner GO).
14. **`shift_attendance` check-out bug planı** (2 May 2026, commit `bf2ac7c94`) — `docs/plans/shift-attendance-checkout-fix.md` (~280 satır): branch/HQ/factory 3 endpoint root cause, ortak utility refactor önerisi, 5 faz, 14 test, 6 açık karar. Implementasyon BEKLİYOR (owner GO).
15. **Pilot Day-1 GO/NO-GO checklist** (2 May 2026, commit `bf2ac7c94`) — `docs/PILOT-DAY1-CHECKLIST.md` (~200 satır): 7 kategori 50+ kontrol, 7 NO-GO senaryosu + tampon plan, saat-bazlı izleme tablosu, gün sonu değerlendirme şablonu.
16. **Pilot Day-1 incident log template** (2 May 2026, commit `bf2ac7c94`) — `docs/PILOT-DAY1-INCIDENT-LOG.md` (~210 satır): severity matrisi (P0-P3), eskalasyon zinciri, incident kayıt formatı, 6 P0/P1 acil runbook shortcut, gün sonu metrik tablosu.
17. **Pilot Day-5 güvenlik sertleştirme paketi** (2 May 2026, task #272) — `POST /api/auth/register` artık `isAuthenticated` + `admin/ceo/muhasebe_ik` rol kontrolü ile korumalı (anonim çağrı 401, yetkisiz 403); helmet `frameguard: { action: 'sameorigin' }` aktif (X-Frame-Options: SAMEORIGIN); `authLimiter` register ve `passwordResetLimiter` reset-password endpoint'lerine de mount edildi; `server/index.ts` admin bootstrap log'undan bcrypt `hash_prefix` ve `existing_hash_prefix` alanları kaldırıldı, sadece `pw_len`, `id`, `login_sim` kalır. Doğrulama notu: `docs/audit/pilot-day5-hardening-2026-05-02.md`.
18. **`shift_attendance` check-out kapanış bug'ı düzeltildi** (2 May 2026, task #273) — Branch (3 endpoint: kiosk shift-end, phone checkin shift_end, QR checkin shift_end), HQ end_of_day ve Factory (2 endpoint: shift-end, quick-end) akışlarında `branch_shift_sessions.check_out_time` UPDATE'iyle birlikte `shift_attendance.check_out_time` da güncelleniyor. Branch için `shift_attendance_id` linki üzerinden, HQ/Factory için kullanıcının açık SA kaydı lookup'ı ile. Backfill script (`scripts/backfill-shift-attendance-checkout.ts`) eklendi; dry-run 0 aday kayıt döndü (backfill gerekmedi, bkz. `docs/audit/shift-attendance-backfill-2026-05-02.md`). DECISIONS madde 15 "Çözüldü" notu ile arşivlendi.
24. **Task #282 — APP_AUDIT Bölüm 3 + 6.1: 12 kırık link/menü düzeltmesi** (2 May 2026) — APP_AUDIT_REPORT_2026-05.md Bölüm 3 (10 kırık link) + Bölüm 6.1 (3 menü kırık path) tamamı statik string düzeltmesi olarak çözüldü. **Düzeltme haritası:** `/bordro→/bordrom` (MissionControlMuhasebe ×2), `/hq-support→/hq-destek` (admin/index.tsx ×2), `/personel-profil→/profil` (egitim-programi.tsx ×2), `/finans→/mali-yonetim` (ceo-command-center.tsx), `/waste-executive→/waste` (fabrika-centrum.tsx), `/musteri-memnuniyeti→/misafir-memnuniyeti` (hq-dashboard.tsx), `/kalite-kontrol→/kalite-kontrol-dashboard` (hq-dashboard.tsx), `/qr-scanner→/qr-tara` (sube/dashboard.tsx), `/leave-requests→/izin-talepleri` (vardiya-planlama.tsx), `/overtime-requests→/mesai-talepleri` (vardiya-planlama.tsx); menü konfigi: `/stok-transferleri` kaydı silindi (sayfa yok), `/canli-izleme→/canli-takip` (module-menu-config.ts). `/kiosk` (menu-config:302) false positive — `cleanPath.includes("/kiosk")` NO_SIDEBAR kontrolü, navigation değil. **Audit Bölüm 1.1 doğrulama:** "öksüz import" listesindeki 5 sayfa (PersonelProfil, QRScanner, LeaveRequests, OvertimeRequests, HQSupport) gerçekte App.tsx'te route'lanmış (`/personel/:id`, `/qr-tara`, `/izin-talepleri`, `/mesai-talepleri`, `/hq-destek`) — regex tarama wildcard/parametreli route'ları kaçırmış, bu satırlar yanlış pozitif. 9 dosya değişti, 14 ekleme / 15 silme. LSP temiz, HMR sorunsuz, vite reload PASS.

23. **Pilot 5 gün uzatma + APP_AUDIT_REPORT teslim** (2 May 2026) — Owner kararı: pilot Day-1 5 gün ileri kaydırıldı, Sprint 2/3 işleri sırayla işlenir. Aynı turda Replit Agent Task #278 kapsamında `APP_AUDIT_REPORT_2026-05.md` (820 satır, 326 sayfa × 1985 endpoint × 806 FE çağrısı tek seferde tarandı) repo köküne düştü. Sayısal özet: 326 sayfa, 260 route, 10 gerçek öksüz sayfa, 81 mega-modül alt sayfası, 10 kırık link, 3 menü kırık path, 118 kırık API çağrısı (FE'de var, server'da yok), 1278 ölü endpoint adayı, 8 duplikat/legacy grup. Auto-türetilen 3 task: #282 (kırık link), #283 (eksik API), #284 IMPLEMENTED (91 öksüz sayfa).

22. **Wave A-3 / Task #281 — B14 ÇÖZÜLDÜ NO-OP + audit teşhis düzeltmesi** (2 May 2026) — Sprint 2 B14 ("ROLE_MODULE_DEFAULTS 16 eksik rol seed") ve audit K2/U3 bulguları **yanlış katmanı** işaret ediyordu. Doğrulama: `ROLE_MODULE_DEFAULTS` (`shared/modules-registry.ts:368`) **dead code** (0 import), gerçek mekanizma `role_module_permissions` DB tablosu (3127 satır, **31 rolün hepsi DOLU**) → `GET /api/me/permissions` üzerinden frontend mega-modules render. 5 pilot rol (ceo/cgo/mudur/fabrika_mudur/sube_kiosk) `psql` ile doğrulandı; kritik modüller (dashboard, hr, employees, equipment, shifts, tasks, factory_*) hepsi mevcut. **Pilot etkisi: SIFIR.** **Ek bulgu — mimari borç:** Sistemde 9 paralel rol/modül erişim mekanizması (RBAC v2 boş `role_permission_grants`, `manifest-auth` **fail-open** middleware, naming drift 243 vs 304 module) → Sprint 3 backlog'a B21 (konsolidasyon) + B22 (manifest-auth fail-open) eklendi. Aksiyon: `ROLE_MODULE_DEFAULTS` üstünde `@deprecated` JSDoc, `replit.md` notu düzeltildi, `sprint-2-master-backlog.md` B14 → ÇÖZÜLDÜ NO-OP, audit Bölüm 11.5 + 9 mekanizma haritası, DECISIONS#31. DB write YAPILMADI (sadece SELECT doğrulama).

21. **Wave A-2 / Task #280 — pg_dump günlük cron + Object Storage + DR playbook (B16)** (2 May 2026) — `scripts/backup/pg-dump-daily.ts` (~190 satır): `pg_dump --format=custom --compress=6` + Object Storage upload + 30 gün retention. `server/backup.ts` `startDailyPgDumpScheduler()` her gece 03:00 UTC çalışır (mevcut JSON-bazlı saatlik backup'tan ayrı). `server/index.ts` lazy-init'e mount edildi. Dry-run test PASS: 5.55 MB dump, 5.3s. Restore runbook (`docs/runbooks/db-restore-from-backup.md`, 10 adım, 2 imza zorunlu, ~45 dk). PILOT-DAY1-ROLLBACK-PLAN Seviye 5 ❌→✅ güncellendi. DECISIONS#30 yeni karar.

20. **Wave A-1 / Task #279 — G1+G2 AUTH doğrulama (NO-OP fix)** (2 May 2026) — `delegation-routes.ts` (5 endpoint) ve `module-content-routes.ts` (5 endpoint) kod incelemesi yapıldı. **Audit bulgusu eskimişti:** her iki router da `router.use(isAuthenticated)` + handler-level `isAdminRole(['admin','ceo'])` kontrolü ile zaten korumalı. 10/10 endpoint anonim `curl` ile **HTTP 401** döndü (canlı doğrulama). Kod değişikliği gerekmedi; audit doc G1+G2 + K1 "ÇÖZÜLDÜ" notu ile güncellendi. DECISIONS#29 yeni karar: pilot Day-1 öncesi mevcut admin/ceo only matrisi korunur (extra rol — coach/trainer/mudur — eklenmedi, minimum-risk yaklaşımı).

19. **Pilot '0000' parola sertleştirme paketi MERGED** (2 May 2026, task #274) — Audit Issue #10 kapatıldı. `server/index.ts` `resetNonAdminPasswords()` üretimde ASLA çalışmaz (sadece `NODE_ENV=development` + `ALLOW_PILOT_PASSWORD_RESET=1` env). Yeni `rotatePilotDefaultPasswords()` `pilot_launched=true` iken tek seferlik çalışır: bcrypt.compare ile hash'i `'0000'` eşleşen aktif non-admin kullanıcılara `mustChangePassword=true` atar; marker `site_settings.pilot_default_passwords_rotated=true`. `server/localAuth.ts` `isAuthenticated`'a `enforcePasswordChangeGate` eklendi: `mustChangePassword=true` ise sadece `/api/auth/user`, `/api/me/change-password`, `/api/logout`, `/api/auth/logout` whitelist; diğer korumalı API'ler **HTTP 423 password_change_required** döner. Kiosk token (authMethod=kiosk_token) gate'ten muaf.

---

## 🌊 BÜTÜNSEL DALGA PLANI (Wave A/B/C)

Sprint 2'nin 20 işi tek tek değil, **paralel dalga planı** ile çalışır. Detay: **`docs/SPRINT-2-WAVE-PLAN.md`** (~400 satır).

**Wave A (T-7 → T-1, Pilot Day-1 öncesi acil, 3 paralel task):**
- W-A1: I1 (G1+G2 AUTH fix — delegation-routes 5 + module-content-routes 5) — 1.5 saat
- W-A2: B16 (pg_dump cron + S3 + DR playbook) — 4 saat
- ~~W-A3: B14 (ROLE_MODULE_DEFAULTS 16 eksik rol)~~ — ✅ ÇÖZÜLDÜ NO-OP (Task #281, dead code, gerçek mekanizma `role_module_permissions` DB DOLU; bkz. DECISIONS#31 + audit §11.5)
- W-A4: Eğitim materyali (Sema/Eren/Aslan) — outline ✅ hazır
- W-A5: Pilot kullanıcı listesi doldurma (Owner)

**Wave B (Day-1 → Day-14, 6 iş):** B11 #276, B17 lockout DB, B19 legacy rol, B15 advisory lock, B18 TEST-MATRIX, B13 public endpoint.

**Wave C (Day-30+, 9 iş):** B1 HQ kiosk, B2 SA refactor, B3 izin, B5 fabrika, B4 PDKS Excel, B6 Mr. Dobody, B7-B10, B20 KVKK.

**5 kritik eksik kategori:** Teknik (T1-T5), Operasyonel (O1-O5), Kullanıcı/Eğitim (K1-K4), Mevzuat (M1-M4), Test/Kalite (Q1-Q4).

---

## Açık İşler

1. **HQ kiosk PIN güvenliği (B1)** — Plan ✅ hazır (`docs/plans/hq-kiosk-pin-security.md`); implementasyon owner GO bekliyor (~4.5 saat).
2. **İzin / rapor / ücretsiz izin bakiyeleri (B3)** — Plan ✅ hazır (`docs/plans/leave-balance-system.md`); implementasyon owner GO bekliyor (~12 saat).
3. **Ay sonu puantaj simülasyonu (B4)** — Pilot ay sonu öncesi tam puantaj kuru çalıştırması (~2 saat).
4. **Fabrika üretim MVP (B5)** — Plan ✅ hazır (`docs/plans/factory-production-mvp.md`, S1+S2 scope); implementasyon owner GO bekliyor (~6-10 saat).
5. **Reçete + besin + alerjen + etiket sistemi (B6)** — Workflow runbook ✅ var (`docs/runbooks/recipe-label-workflow.md`); implementasyon planı YOK (Sprint 3, ~16-24 saat).
6. **Sprint 2 backlog yeni 8 iş (B13-B20)** — Çok perspektifli audit sonucu eklenenler:
   - **B13** Public endpoint sertleştirme (delegation + module-content + export, 5 saat) 🔴 KRİTİK
   - ~~**B14** ROLE_MODULE_DEFAULTS — 16 eksik rol (2 saat)~~ ✅ **ÇÖZÜLDÜ NO-OP** (Task #281, 2 May — dead code, gerçek mekanizma DB'de DOLU; DECISIONS#31)
   - **B15** Scheduler advisory lock (3 saat) 🔴 YÜKSEK (autoscale öncesi zorunlu)
   - **B16** pg_dump cron + S3 yedek (2 saat) 🔴 YÜKSEK
   - **B17** Login lockout DB'ye taşı (3 saat) 🟡 ORTA
   - **B18** TEST-MATRIX 31 role genişletme (4 saat) 🟡 ORTA
   - **B19** Legacy rol denetimi + temizlik (2 saat) 🟡 ORTA
   - **B20** KVKK audit + iyileştirme (6 saat) 🟡 ORTA
7. **Replit otomatik IN_PROGRESS task'lar:**
   - **Task #276** — Şube/HQ/fabrika kapanışlarında `pdks_daily_summary` sync (B11)
   - **Task #277** — Kiosk vardiya kapanış E2E test (B12)

---

## Sonraki 3 Adım (öncelik sırası — 2 May 2026 akşam)

1. **Push** — Owner Replit Shell'den `git push origin main` ile origin/main güncelle (Task #272 + #273 merge sonrası bekleyen commit'ler push'lansın).
2. **Plan moduna geç + I1 öner** — Task #278 (G1+G2 acil AUTH fix) — `delegation-routes.ts` 5 + `module-content-routes.ts` 5 endpoint AUTH ekleme. Pilot Day-1 ÖNCESİ kritik (~1.5 saat isolated agent). Audit referansı: `docs/audit/system-multi-perspective-evaluation-2026-05-02.md` G1, G2.
3. **Owner karar — D1-D6** (audit B paketi):
   - D1: Pilot Day-1 tarihi?
   - D2: Pilot kullanıcı listesi (kim hangi rol)?
   - D3: Mr. Dobody Day-1 açık mı kapalı mı?
   - D4: Feature Freeze (15 Haziran'a kadar) ile Sprint 2 implementasyon işleri uyumlu mu?
   - D5: R3 (izin Day-1 scope — manuel/Excel mi)?
   - D6: R4 (fabrika scope S1+S2 mi)?

---

## Sprint 1 Çıktıları (Tamamlandı, 1-2 May 2026)

Toplam ~3,100 satır docs, 11 commit:
- **TEST-MATRIX + 4 runbook** (`57a6c4c0c`) — `docs/TEST-MATRIX.md` (13 rol), db-write-protocol, kiosk-pdks-test, git-security-cleanup, recipe-label-workflow (913 satır)
- **4 plan dosyası** (`bf2ac7c94` + ek) — HQ kiosk PIN security, shift_attendance fix, leave balance, factory production MVP
- **Pilot Day-1 hazırlık seti** — GO/NO-GO checklist, incident log template, readiness raporu
- **Sprint 2 master backlog** — `docs/audit/sprint-2-master-backlog.md` (B1-B20 toplam)
- **Çok perspektifli sistem audit** — `docs/audit/system-multi-perspective-evaluation-2026-05-02.md` (~520 satır, 31 rol × 326 sayfa, 6 perspektif, 5 kritik bulgu K1-K5, B13-B20 önerisi)

---

---

## Notlar

- Pilot test kayıtları (4 birim) gerçek operasyon değildir; raporlamalarda `notes='PILOT_PRE_DAY1_TEST_2026_04_29'` filtresi ile dışlanmalıdır.
- Aylık raporlamalar Excel kaynaklı `pdks_daily_summary` ve `pdks_monthly_stats` üzerinden hesaplandığı için pilot test kayıtları aylık maaş hesabını etkilemez.
- **Reçete detay sayfası — bilinen geçici davranış (T2.1, 29 Nis 2026):** Reçete detay sayfasında nadiren yükleme spinner'da kalma görülebilir. Geçici çözüm: sayfayı yenile / hard refresh (Cmd+Shift+R). Backend recipe API 200 dönüyor; kalıcı frontend UX iyileştirme post-pilot değerlendirilecek (bkz. `docs/DECISIONS.md` madde 28).
- **Çalışma modeli (2 May 2026):** ChatGPT + Claude şu an devre dışı, sadece Replit Agent ile ilerleniyor → divergence riski düşük, push acil değil ama tamponlu kalmak için yapılması önerilir.
- Detaylı ürün/operasyon kararları: `docs/DECISIONS.md`.
- Çalışma protokolü: `docs/COLLABORATION-PROTOCOL.md`.
