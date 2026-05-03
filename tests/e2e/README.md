# Kiosk Vardiya Kapanış E2E Test Paketi (Task #286 / B12)

Sprint 2 kapsamında DOSPRESSO kiosk vardiya kapanış akışlarının (Branch shift-end,
HQ end_of_day, Factory shift-end normal + quick-end, Auto-checkout) regresyonunu
yakalamaya yönelik **Playwright API-level** test paketi. UI testi YOKTUR (B1
task'ında ayrıca yapılacak).

## Ne test eder

| # | Senaryo | Endpoint | Doğrulama |
|---|---------|----------|-----------|
| 1 | Branch kiosk shift-end | `POST /api/branches/:branchId/kiosk/login` + `/shift-end` | `branch_shift_sessions.status = 'completed'`, `check_out_time IS NOT NULL` |
| 2 | HQ end_of_day | `POST /api/hq/kiosk/login` + `/shift-start` + `/exit` (`exitReason='end_of_day'`) | `hq_shift_sessions.status = 'completed'` |
| 3 | Factory shift-end normal | `POST /api/factory/kiosk/login` + `/start-shift` + `/end-shift` | `factory_shift_sessions.status = 'completed'` |
| 4 | Factory quick-end | `POST /api/factory/kiosk/quick-end` | session + ±5dk pencere içindeki `shift_attendance` kapanır |
| 5 | Auto-checkout scheduler smoke | `branch_kiosk_settings.auto_close_time` kolonu + stale-session select pattern | Scheduler'ın hedefleyeceği satır gerçekten select edilebiliyor (real trigger ÇAĞRILMIYOR) |

## Önkoşullar

- **Dev server çalışıyor olmalı:** `Start application` workflow `http://localhost:5000`'da up.
- **DATABASE_URL set olmalı:** Replit ortamında otomatik mevcut.
- **DB'de en az 1 branch + 1 factory station bulunmalı** (pilot DB'sinde mevcut).
- **Playwright kurulu olmalı:** `npm install --no-save @playwright/test` (browser indirme GEREKMEZ — sadece test runner kullanılıyor).

## Çalıştırma

```bash
# Tüm suite
npx playwright test --config=playwright.config.ts

# Sadece kiosk shift-closure
npx playwright test tests/e2e/kiosk-shift-closure.spec.ts

# Tek senaryo (test başlığı pattern)
npx playwright test -g "Senaryo 1"

# Verbose
npx playwright test --reporter=line
```

> **Not:** `package.json` "forbidden_changes" kapsamında olduğu için `npm run`
> script EKLENMEDİ. Owner onayıyla `"test:e2e:kiosk-shift": "playwright test
> tests/e2e/kiosk-shift-closure.spec.ts"` script'i sonradan eklenebilir.

## Test Data Stratejisi

- Her test **kendi kullanıcısını seed eder**: `firstName/lastName = "TEST_E2E_*"` prefix.
- Her test **kendi cleanup'ını yapar**: `afterAll` hook ile `branch_staff_pins`,
  `users`, `shift_attendance`, `*_shift_sessions`, `pdks_records` siler.
- **Mevcut branch'ler kullanılır** (yeni branch insert edilmez — branches tablosu
  çok FK'lı).
- Cleanup başarısızlığı durumunda manuel temizlik:
  ```sql
  DELETE FROM users WHERE first_name LIKE 'TEST_E2E_%';
  -- (Cascade: bağlı PIN, session, attendance kayıtlarını da elle sil)
  ```

## Bilinen Sınırlamalar

1. **HQ + Factory PIN provisioning:** Bazı kurulumlarda HQ ve Factory için
   ayrı PIN tabloları kullanılıyor olabilir. Test bu durumda `test.skip(...)`
   ile graceful skip yapar (status≠200 dönerse).
2. **Auto-checkout real trigger:** `server/index.ts` içindeki `setInterval`
   global scheduler doğrudan tetiklenmiyor (real data'yı etkilerdi). Senaryo 5
   sadece scheduler'ın **hedefleme query'sini** doğruluyor. Real scheduler
   verification için ayrı task açılmalı (HTTP trigger endpoint'i + test-only
   guard).
3. **Branch kiosk shift-start endpoint'i:** Eğer login session create etmiyorsa
   test manuel `INSERT INTO branch_shift_sessions` yapıyor. Bu, prod davranışı
   simüle eder ama gerçek HTTP path'ini test etmez.
4. **CI integration YOK:** Suite manuel/cron koşar. CI workflow ekleme ayrı
   task'ta yapılmalı.

## Regresyon Bulursa

Test fail olursa:
1. **Hatayı not et** (test output + DB state screenshot).
2. **Production fix YAPMA** — fix ayrı task açılır (Task #286 sadece test üretir).
3. Owner'a issue listesi sun.

## Dosya Yapısı

```
tests/e2e/
├── README.md                       (bu dosya)
├── kiosk-shift-closure.spec.ts     (5 senaryo)
└── helpers/
    ├── db.ts                       (raw pg pool)
    └── seed.ts                     (test user/PIN seed + cleanup)

playwright.config.ts                (kök, API-only config, no browser)
```

## Sonraki Adımlar

- **B1 task:** Branch kiosk PIN login UI testi (Playwright browser-mode).
- **CI workflow:** GitHub Actions / Replit cron entegrasyonu.
- **Auto-checkout real trigger:** Test-only HTTP endpoint (env-guard) + bu
  paketin Senaryo 5'i tam testlere dönüştürülmesi.
