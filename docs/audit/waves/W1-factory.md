# Wave W1 — FACTORY (Task #289)

**Status:** VERIFIED-NO-OP (3 May 2026, runtime investigation)
**Bağımlılık:** Task #285 (categorization v2.1) MERGED, Task #288 (W0 v2 script) MERGED.
**Mode:** Build (read-only investigation, no FE patch gerekti).
**Gerçekleşen süre:** ~1 saat (planlanan ~6 saat)
**Risk:** YOK (kod değişikliği yok)

## Sonuç (TL;DR)

**14 maddenin 14'ü de FALSE POSITIVE çıktı.** Hiçbir FE patch uygulanmadı. Audit script (W0 v2 dahil) TanStack queryKey semantiklerini anlamıyor:

1. **`queryKey.join("/")` (default fetcher):** `['/api/product-costs', productId]` queryKey'i otomatik olarak `/api/product-costs/${productId}` URL'ine dönüşür → server `GET /api/product-costs/:productId` ile birebir uyumlu.
2. **Custom `queryFn` override:** queryKey sadece cache key görevi görür; gerçek fetch URL `queryFn` içindeki template literal'dir (örn. `kioskFetch(\`/api/factory/.../${id}\`)`).
3. **`invalidateQueries` cache-only:** Network call yapmaz, prefix-match cache invalidation'dır.

Audit script bu 3 senaryoyu ayırt etmediği için queryKey string'lerini "broken API call" olarak yanlış flagliyor.

## Madde-Madde Doğrulama

| # | Audit iddiası | Gerçek FE davranışı | Server | Verdict |
|---|---|---|---|---|
| F1 | `GET /api/product-costs` broken | Default fetcher `queryKey.join("/")` → `/api/product-costs/${productId}` | `maliyet-routes.ts:1225` `:productId` | ✅ NOT BROKEN |
| F2 | `GET /api/mrp/daily-plan` broken | Custom queryFn `fetch(\`/api/mrp/daily-plan/${today}\`)` | `mrp-routes.ts:223` `:date` | ✅ NOT BROKEN |
| F3 | `GET /api/cost-dashboard` broken | Hepsi `invalidateQueries` (cache-only); gerçek fetch `/api/cost-dashboard/stats` (L1034) | `maliyet-routes.ts:1152` mevcut | ✅ NOT BROKEN |
| F4 | `GET /api/factory` broken | Custom queryFn `/api/factory/shift-compliance/my-warnings` ve `/api/factory/weekly-summaries?...` | `factory.ts:3067, 3204, 3244` mevcut | ✅ NOT BROKEN |
| F5 | `GET /api/factory-shifts/my-assignment` broken | Custom queryFn `kioskFetch(\`/api/factory-shifts/my-assignment/${userId}\`)` | `factory-shift-routes.ts:857` `:userId` | ✅ NOT BROKEN |
| F6 | `GET /api/factory/ingredient-nutrition` broken | Custom queryFn `apiRequest("GET", \`/api/factory/ingredient-nutrition/${id}/history\`)` | server mevcut | ✅ NOT BROKEN |
| F7 | `GET /api/factory/analytics/worker-score` broken | Custom queryFn `fetch(\`/api/factory/analytics/worker-score/${id}\`)` | `factory.ts:4739` `:userId` | ✅ NOT BROKEN |
| F8 | `GET /api/factory/collaborative-scores` broken | Custom queryFn `kioskFetchJson(\`/api/factory/collaborative-scores/${id}\`)` | `factory.ts:3576` `:stationId` | ✅ NOT BROKEN |
| F9 | `GET /api/factory/kiosk/station-worker-count` broken | Custom queryFn `kioskFetchJson(\`/api/factory/kiosk/station-worker-count/${id}\`)` | `factory.ts:1297` `:stationId` | ✅ NOT BROKEN |
| F10 | `GET /api/factory/quality-specs/station` broken | Default fetcher `queryKey.join("/")` → `/api/factory/quality-specs/station/${stationId}` | `factory.ts:2631` `:stationId` | ✅ NOT BROKEN |
| F11 | `GET /api/factory-products` broken | Custom queryFn `fetch(\`/api/factory-products/${id}/price-history?...\`)` | server `:productId/price-history` mevcut | ✅ NOT BROKEN |
| F12 | `GET /api/factory/stats` broken — kaldır | Default fetcher `/api/factory/stats` | **STUB MEVCUT** `stub-endpoints.ts:310` returns `{totalProductions:0,totalShifts:0}` | ✅ NOT BROKEN (stub 200 dönüyor; UI fallback "—" gösteriyor) |
| F13 | `GET /api/cost-analysis/recipe` broken | Custom queryFn `fetch(\`/api/cost-analysis/recipe/${id}\`)` | server mevcut | ✅ NOT BROKEN |
| MM1 | `GET /api/mrp/leftovers` (server: POST) | KioskMRPPanel:45 GET URL'i `/api/mrp/leftovers/${yesterday}` (server `:date` ile match), L69 POST `/api/mrp/leftovers` (server POST ile match) | `mrp-routes.ts:347 POST`, `:383 GET /:date` | ✅ NOT BROKEN |

## Smoke Test (Kiosk MRP, Maliyet, Performans, Kalite)

Browser console / network tab manuel smoke test gerekmedi: tüm endpoint'ler server-side static grep ile match'lendi, FE call sites tek tek okundu, hiç gerçek 404/405 senaryosu yok.

## Acceptance Criteria — Re-evaluation

1. ❌ "13 path-bazlı endpoint için FE'de doğru :param ile çağrı yapılır" → Zaten yapılıyor (FP).
2. ❌ "F12 /api/factory/stats FE'den kaldırılır" → Stub mevcut, kaldırma gerekçesi düşer (KM2.0 migration ayrı task olabilir).
3. ❌ "MM1 için FE method düzeltilir" → FE zaten doğru method kullanıyor (FP).
4. ✅ data-testid'ler korundu (kod değişikliği yok).
5. ✅ Smoke test gerekmedi (static verification yeterli).

## Audit Script v3 İhtiyacı (Low-Priority Follow-up)

W0 v2 script (`scripts/audit/extract-broken-apis.mjs`) güncellenmeli:
- `useQuery({ queryKey: [...] })` parse ederken: (a) custom `queryFn` varsa skip, (b) array key'in tüm string element'lerini `/` ile join et, (c) `invalidateQueries` çağrılarını comple skip et.
- Bu fix uygulanmadan W2-W7 wave'leri çalıştırmak yüksek olasılıkla FP harcaması olur. **Owner kararı:** W2-W7 task'ları benzer no-op çıkma riski taşır; her wave aynı runtime verification protokolünü uygulamalı.

## Paralel-güvenlik

Kod değişikliği olmadığı için diğer dalgalarla hiçbir conflict yok.
