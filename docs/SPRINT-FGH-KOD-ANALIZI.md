# Sprint F + G + H — Kod Analizi

**Tarih:** 18 Nisan 2026 (Cumartesi akşam — son 45 dakika)
**Kapsam:** Test altyapısı + Performans + Observability
**Hazırlayan:** Claude (IT Danışman)

---

## 🧪 SPRINT F — Test Altyapısı (Hafta 6)

### Mevcut Durum

```
Kütüphane:     vitest ^4.0.10 ✅ kurulu
Config:        vitest.config.ts ✅ var
Test dosyası:  3 adet (46 test toplam)
Script:        ❌ package.json'da "test" yok!
Playwright:    ❌ kurulu değil (E2E yok)
```

**Mevcut 3 test:**
| Dosya | Satır | Test Sayısı |
|-------|:--:|:--:|
| `server/services/academy-rbac.test.ts` | 129 | 16 |
| `server/services/pii-redactor.test.ts` | 130 | 20 |
| `server/storage.test.ts` | 129 | 10 |

### 🎯 Sprint F Plan (3 gün — Hafta 6)

**F.1: package.json script ekle (0.1 gün)** 🟢
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage",
"test:e2e": "playwright test"
```

**F.2: Kritik Modül Unit Test Yazımı (1.5 gün)** 🔴
Pilot öncesi en kritik 5 modül için test kapsamı:
- **Bordro calculator** (`/api/payroll/calculate-unified`) — 51 kayıt üreten motor
- **PDKS aggregate** (Sprint B'de yazılacak) — saatler/günler/aylar doğru mu
- **Recipe base_price** — 143 malzemeden reçete maliyeti doğru hesap
- **Kariyer gate check** — user composite score + gate geçti mi
- **Dashboard widget access control** — her rol doğru widget görüyor mu

Hedef: **Her kritik akış için 5-10 test.**

**F.3: Playwright Kurulum + 5 E2E Test (1 gün)** 🟡
```bash
npm install --save-dev @playwright/test
npx playwright install
```

5 kritik kullanıcı akışı:
1. Stajyer login → dashboard → görevlerim
2. Barista kiosk check-in → PDKS kayıt
3. Müdür denetim oluştur → aksiyon öner
4. Muhasebe bordro hesapla → PDF export
5. Fabrika operator batch başlat → QC tamamla

**F.4: CI/CD Pipeline (0.5 gün)** 🟡
`.github/workflows/ci.yml`:
- PR açıldığında `npm run build` çalışsın
- `npm test` çalışsın, fail ederse merge engel
- Playwright E2E testleri (hızlı 5 tane)
- Type check (`tsc --noEmit`)

### Acceptance
- ✅ `npm test` çalışıyor, 3 mevcut + 30+ yeni test
- ✅ 5 E2E test playwright ile çalışıyor
- ✅ GitHub Actions PR'da test çalıştırıyor
- ✅ Test coverage >%40 (kritik modüllerde %80+)

### Durum: "Altyapı Var, İçerik Eksik"
Vitest kurulu, config hazır, **sadece test yazımı lazım.** Bu %80 kolaylık demek.

---

## ⚡ SPRINT G — Performans (Hafta 7)

### Mevcut Durum

```
Index sayısı:        895 (drizzle schema'da)       ✅ İyi
N+1 query riski:     6 muhtemel yer                 ⚠️
SELECT * kullanımı:  1,186 yer                      ⚠️ Over-fetching
Cache altyapı:       In-memory cache var            ✅ (Redis yok)
Materialized view:   0 kullanım                      🟡
En büyük sayfa:      maliyet-yonetimi.tsx 3,859 sat. ⚠️
```

### 🎯 Sprint G Plan (3-4 gün — Hafta 7)

**G.1: N+1 Query Fix (1 gün)** 🔴
6 muhtemel yer:
- `server/routes/dashboards-routes.ts:149` — branchPerformance loop
- `server/routes/messaging-routes.ts:180` — roleUsers loop INSERT ⚠️
- `server/routes/hr.ts:6791` — performances select

Fix pattern:
```typescript
// YANLIŞ (N+1)
for (const user of users) {
  const perf = await db.select().from(performance).where(eq(performance.userId, user.id));
}

// DOĞRU (1 query)
const userIds = users.map(u => u.id);
const perfs = await db.select().from(performance).where(inArray(performance.userId, userIds));
const perfMap = new Map(perfs.map(p => [p.userId, p]));
```

**G.2: SELECT * → Column Selection (0.5 gün)** 🟡
1,186 yer çok fazla, kritik olanları seç:
- Dashboard endpoint'leri (sık çağrılan)
- Liste endpoint'leri (pagination varsa)
- Mobile endpoint'leri (bandwidth tasarrufu)

Fix pattern:
```typescript
// Önce:
db.select().from(users)

// Sonra:
db.select({ 
  id: users.id, 
  name: users.name, 
  role: users.role 
}).from(users)
```

**G.3: Materialized View — Raporlar (1 gün)** 🟡
Pahalı raporlar için:
- `branch_performance_summary` (şube KPI'ları)
- `monthly_staff_rankings` (aylık personel sıralaması)
- `recipe_cost_analysis` (reçete maliyet analizi)

Haftalık/aylık refresh scheduler.

**G.4: Frontend Bundle Split (1 gün)** 🟡
En büyük sayfalar:
| Sayfa | Satır | Lazy load edilmeli mi? |
|-------|:--:|:--:|
| maliyet-yonetimi.tsx | 3,859 | ✅ Evet |
| yonetim/akademi.tsx | 3,374 | ✅ Evet |
| yeni-sube-detay.tsx | 3,245 | ✅ Evet |
| fabrika/kiosk.tsx | 2,897 | ✅ Evet |

`React.lazy()` + `Suspense` + route-based splitting.

**G.5: Cache İyileştirme (0.5 gün)** 🟡
Mevcut in-memory cache var ama kullanımı sınırlı. Kritik endpoint'ler için:
- `/api/users` (tüm kullanıcılar) — 1 dk cache
- `/api/branches` (şubeler) — 5 dk cache
- `/api/roles` (rol listesi) — 10 dk cache
- `/api/dashboard/widgets/:role` — 1 dk cache

### Acceptance
- ✅ 6 N+1 query fix edildi
- ✅ Kritik 100 endpoint'te column selection
- ✅ 3 materialized view + scheduler
- ✅ Top 5 büyük sayfa lazy-loaded
- ✅ Cache TTL kritik endpoint'lerde

### Durum: "Çoğu Altyapı İyi, Detay İyileştirme"
895 index demek DB tarafı iyi. 1,186 SELECT * zarar vermiyor ama over-fetching var. Asıl iş **frontend bundle size.**

---

## 👁️ SPRINT H — Observability (Hafta 8)

### Mevcut Durum

```
Logger:              ❌ Yok (564 console.log, 2323 console.error)
Sentry:              ❌ Yok
Prometheus/metrics:  ❌ Yok
audit_logs tablosu:  ✅ Var, 19 yerde INSERT
Error tracking:      ❌ Global yok
Slow query log:      ❌ Yok
```

**Bu en büyük eksiklik!** DOSPRESSO production'a çıkınca hata takibi için hiçbir altyapı yok.

### 🎯 Sprint H Plan (4-5 gün — Hafta 8)

**H.1: Pino Logger Kurulum (0.5 gün)** 🔴
```bash
npm install pino pino-pretty
```

Server/lib/logger.ts oluştur:
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'production' 
    ? undefined 
    : { target: 'pino-pretty' },
});
```

**H.2: console.log → logger Migration (1 gün)** 🟡
564 console.log + 2323 console.error = **2,887 yer**. Otomatik script:
```bash
# Dikkatli find+replace
sed -i 's/console\.log(/logger.info(/g' server/**/*.ts
sed -i 's/console\.error(/logger.error(/g' server/**/*.ts
```

Her dosyaya `import { logger } from '../lib/logger'` ekle.

**H.3: Sentry Integration (1 gün)** 🔴 KRİTİK
```bash
npm install @sentry/node @sentry/react
```

Backend:
```typescript
// server/index.ts
import * as Sentry from '@sentry/node';
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

Frontend: aynı init.

**H.4: Slow Query Log (0.5 gün)** 🟡
Drizzle'a 500ms üzeri query'leri logla:
```typescript
// server/db.ts
export const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      const start = performance.now();
      // execute
      const duration = performance.now() - start;
      if (duration > 500) {
        logger.warn({ query, duration, params }, 'Slow query');
      }
    }
  }
});
```

**H.5: 404 Tracking + Unused Endpoint Report (0.5 gün)** 🟡
Sprint A5'te öğrendik — kullanılmayan endpoint'ler olabilir. Her endpoint'in kaç kez çağrıldığını logla:
```typescript
// Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
    }, 'HTTP');
  });
  next();
});
```

Haftalık rapor: en az çağrılan 20 endpoint.

**H.6: Health Check Endpoint (0.5 gün)** 🟢
```typescript
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDB(),
    cache: cache.healthy(),
    scheduler: schedulersRunning(),
    timestamp: new Date().toISOString(),
  };
  const allHealthy = Object.values(checks).every(v => v === true || typeof v === 'string');
  res.status(allHealthy ? 200 : 503).json(checks);
});
```

**H.7: Alerting (0.5 gün)** 🟡
Sentry'den Slack/Email alert:
- Error rate > 10/min → Slack #alerts
- Slow query > 2s → Slack #perf
- Health check fail → Slack #critical

### Acceptance
- ✅ Pino logger tüm server'da aktif
- ✅ console.* sıfıra yakın (migration tamam)
- ✅ Sentry backend + frontend connected
- ✅ Slow query log aktif (>500ms)
- ✅ 404 + endpoint usage tracking
- ✅ `/health` endpoint çalışıyor
- ✅ Slack alert en az 3 kural

### Durum: "EN BÜYÜK EKSİKLİK"
Sprint H **production-readiness** için **kritik**. Pilot'ta sorun olunca:
- Sentry olmadan hatayı göremezsin
- Logger olmadan debug edemezsin
- Slow query log olmadan performans sorunu izleyemezsin

**Öncelikle Sentry kurulumu** (pilot öncesi).

---

## 📊 Sprint F/G/H Özet Tablo

| Sprint | Süre | En Büyük Eksik | Kritiklik |
|:--:|:--:|---|:--:|
| **F** Test | 3 gün | Test dosyası (3/46) + E2E yok | 🟡 Orta |
| **G** Performans | 3-4 gün | Bundle size + N+1 (6) | 🟡 Orta |
| **H** Observability | 4-5 gün | **Sentry yok, 2887 console.log** | 🔴 **YÜKSEK** |

---

## 💡 Önemli Öneri: Sprint H'yi Öne Al

Şu anki sırası:
```
A (tamam) → B → C → D → E → F → G → H
```

**Benim önerim:**
```
A (tamam) → B → C → D → E → H (Sentry!) → F → G
```

**Neden:**
- Pilot öncesi Sentry kritik (hata takibi)
- Test altyapısı (F) önemli ama pilot'ta "daha sonra" olabilir
- Performans (G) 25 kullanıcı için bugün iyi, 200 kullanıcı için Sprint G öne çıkar

**Ama:** Aslan'ın kararı. "15 Haziran pilot" hedefine göre Sprint H kritikliği değişir.

---

## 📦 8 Haftalık Roadmap (Final — Bugünkü Analizler Sonrası)

| Sprint | Hafta | İçerik | Süre |
|:--:|:--:|---|:--:|
| A | 1 | ✅ Stop the Bleeding (6/6 tamam) | 1 gün |
| B | 2 | Attendance Pipeline Repair | 2-3g |
| C | 3 | Gate aktivasyon + Audit migration + CRM dashboard | 4-5g |
| D | 4 | Bordro schema temizliği + Satınalma aktivasyonu | 4.5g |
| E | 5 | Dashboard widget + 5 hayalet rol + supervisor_buddy | 2.5g |
| F | 6 | Test altyapı: 30+ test + 5 E2E + CI/CD | 3g |
| G | 7 | N+1 fix + SELECT optimization + bundle split | 3-4g |
| H | 8 | **Sentry + Pino + Slow query + Health check + Alert** | 4-5g |

**Toplam: 8 hafta = Pilot hazır sistem.**

---

## 🎯 Aslan'a Soru

1. **Sprint H öne alınsın mı?** Sentry olmadan pilot riskli
2. **Test yazımı (Sprint F) tam ayrılan 3 gün mü hak ediyor, yoksa her sprint sonu küçük test paketi mi?**
3. **Frontend bundle size 3,859 satırlık sayfa — manual split mi lazım, yoksa lazy load yeterli mi?**

Bu üç karar 8 haftalık planın fine-tune'unu belirler.
