# SPRINT LIVE — DOSPRESSO

Aktif sprintin canlı durumudur. Sprint kapanırken arşive alınır, yeni sprint için bu dosya sıfırlanır.

Son güncelleme: 2 Mayıs 2026

---

## Aktif Sprint

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
