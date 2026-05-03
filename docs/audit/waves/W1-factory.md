# Wave W1 — FACTORY (Task #283.1)

**Status:** PENDING (owner GO bekliyor)
**Bağımlılık:** Task #285 (categorization report v2.1 PASS) MERGED.
**Mode:** Build (FE patch ağırlıklı), kısmi Plan (MM1 method karar).
**Tahmini süre:** ~6 saat
**Risk:** ORTA (kiosk akışı)

## Kapsam

13 path-bazlı + 1 method-mismatch (MM1) = **14 method+path düzeltmesi** FACTORY modülünde.

### Path-bazlı 13 (a1/a2 kategorileri — FE patch)
| # | Method+Path | Server | FE dosya |
|---|---|---|---|
| F1 | `GET /api/product-costs` → `/:productId` ekle | `maliyet-routes.ts:1225` | `fabrika/maliyet-yonetimi.tsx:103,112,125` |
| F2 | `GET /api/mrp/daily-plan` → `/:date` | `mrp-routes.ts:223` | `fabrika-centrum.tsx:33`, `KioskMRPPanel.tsx:34,63` |
| F3 | `GET /api/cost-dashboard` → `/stats` | `maliyet-routes.ts:1152` | `fabrika/maliyet-yonetimi.tsx:113,126,144` |
| F4 | `GET /api/factory` → `/stock-counts` veya alt path | `daily-tasks-routes.ts:343` | `card-grid-hub.tsx:245`, `vardiya-uyumluluk.tsx:53,65` |
| F5 | `GET /api/factory-shifts/my-assignment` → `/:userId` | `factory-shift-routes.ts:857` | `fabrika/kiosk.tsx:2659,2698,2713` |
| F6 | `GET /api/factory/ingredient-nutrition` → `/:name` | `factory.ts` | `kalite/besin-onay.tsx:243,528` |
| F7 | `GET /api/factory/analytics/worker-score` → `/:userId` | `factory.ts:4739` | `fabrika/performans.tsx:258` |
| F8 | `GET /api/factory/collaborative-scores` → `/:stationId` | `factory.ts:3576` | `fabrika/kiosk.tsx:363` |
| F9 | `GET /api/factory/kiosk/station-worker-count` → `/:stationId` | `factory.ts:1297` | `fabrika/kiosk.tsx:388` |
| F10 | `GET /api/factory/quality-specs/station` → `/:stationId` | `factory.ts:2631` | `fabrika/kalite-kontrol.tsx:160` |
| F11 | `GET /api/factory-products` → `/:productId/recipe-info` | server | `maliyet-analizi.tsx:100` |
| F12 | `GET /api/factory/stats` | YOK — **kaldır FE** | `fabrika/index.tsx:148` |
| F13 | `GET /api/cost-analysis/recipe` → `/:id` | server | `maliyet-analizi.tsx:334` |

### Method-mismatch 1
| # | Method+Path | Server | Karar |
|---|---|---|---|
| MM1 | `GET /api/mrp/leftovers` | POST | **FE method düzelt** — POST body ile gönderilmeli (server `:date` body'de bekliyor olabilir; impl kontrolü gerekli) |

### W0 v2 Eklemesi: YOK

> Önceki commit'teki NS5 (`/api/factory/ingredient-nutrition/approved?qs`) v2 script ile false positive çıktı (`${qs}` querystring artifact, server'da base path mevcut); kaldırıldı.

## Acceptance Criteria

1. 13 path-bazlı endpoint için FE'de doğru `:param` veya sub-path ile çağrı yapılır (TanStack queryKey + apiRequest URL).
2. F12 `/api/factory/stats` FE'den kaldırılır (KM2.0 widget'larıyla değiştirildiğinden).
3. MM1 için server impl incelenir + FE method düzeltilir.
4. Tüm değişiklikler için `client/src/` içinde data-testid'ler korunur.
5. Etkilenen sayfalarda manuel smoke test (kiosk MRP, maliyet yönetimi, performans, kalite kontrol).

## Paralel-güvenlik

W1 dosyaları diğer dalgalarla çakışmaz. Paralel çalıştırılabilir.

## Mode disiplini

- DB write yok → Build modunda task agent ile.
- Plan moduna geçiş gerekmez (sadece FE patch + 1 method karar).
