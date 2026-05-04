# 🏭 FABRİKA MODÜLÜ AUDIT RAPORU — 4 MAYIS 2026 GECE

> **Yazan:** Claude
> **Saat:** 21:30-22:15 (45 dk derin tarama)
> **Bağlam:** Aslan istedi — "fabrika modülü detaylı kontrol et, üretim planlama V2 dışında ne var?"
>
> **Sonuç:** Fabrika modülü kod tarafı **ÇOK BÜYÜK** (~21,000 satır), birçok özellik **backend'de yazılmış ama UI eksik**. Pilot için en kritik 4 gap belirlendi.

---

## 📊 GENEL BOYUT

| Bileşen | Miktar |
|---|---|
| Schema dosyaları | 3 (schema-08, schema-22-factory-recipes, schema-18-production-planning, schema-23-mrp-light) |
| Tablolar (fabrika ile ilgili) | ~40+ |
| Backend route dosyaları | 6 (factory.ts, factory-recipes.ts, factory-recipe-nutrition.ts, factory-allergens.ts, factory-f2.ts, production-planning-routes.ts, mrp-routes.ts) |
| Toplam endpoint | ~200+ |
| Frontend sayfa sayısı | 9 ana + 4 admin + components |
| Toplam kod | ~21,000 satır |

---

## 🚨 KRİTİK BULGULAR

### Bulgu 1 — 4 Paralel Üretim Takip Sistemi

| # | Sistem | Tablolar | Amaç | Durum |
|---|---|---|---|---|
| **A** | Eski günlük plan | `factory_production_plans` | "Bu gün ne üretelim" | ⚠️ DEPRECATED (bugün tab'lara "eski" badge eklendi) |
| **B** | Yeni haftalık plan | `weekly_production_plans` + `production_plan_items` + `daily_production_records` | Plan → günlük kayıt → fire | ✅ TAMAMLANDI (TASK-URETIM-PLANLAMA-V2) |
| **C** | Reçete bazlı log | `factory_production_logs` (versiyon snapshot ile) | Hangi reçete kim tarafından üretildi | ⚠️ Sadece üretim modu kullanıyor |
| **D** | Vardiya bazlı runs | `factory_production_runs` + `factory_production_outputs` + `factory_shift_sessions` | Vardiya başladı/bitti, kim hangi makinede | ⚠️ Backend var, UI YOK |

**Karar:** A deprecate edildi ✅. B operasyonel. C ve D **muhtemelen ayrı amaçlar**:
- C = reçete versiyon takibi (kalite/audit için)
- D = vardiya yönetimi (puantaj entegrasyonu için)

İkisi de geçerli olabilir ama **D'nin frontend'i hiç yok** (factory-f2.ts → 268 satır → 0 UI).

---

### Bulgu 2 — Factory F2 Modülü (Üretim↔Vardiya Dashboard) UI'sız

**Dosya:** `server/routes/factory-f2.ts` (268 satır, 3 endpoint)

| Endpoint | Backend | UI |
|---|---|---|
| `GET /api/factory/production-dashboard` | ✅ Hazır | ❌ Yok |
| `GET /api/factory/stock-kpi` | ✅ Hazır | ❌ Yok |
| `GET /api/factory/shift-production/:sessionId` | ✅ Hazır | ❌ Yok |

**Memory'inde** "F2: production↔shift dashboard, stock KPI" yazıyor — ama UI hiç yapılmamış. **Aslan'ın bu modülü hatırlaması lazım**: gerçekten gerekli mi yoksa terkedilmiş mi?

---

### Bulgu 3 — MRP-Light (Ara Depo Malzeme Çekme) Eksik UI

**Dosya:** `server/routes/mrp-routes.ts` (616 satır, 11 endpoint)
**Schema:** `schema-23-mrp-light.ts` (4 tablo: dailyMaterialPlans, dailyMaterialPlanItems, productionAreaLeftovers, materialPickLogs)

**Bu sistem TAM Aslan'ın sorduğu işi yapıyor:**
> "Üretim planı → malzeme ihtiyacı → depodan çekme → artan kayıt"

| Endpoint | Backend | UI Durumu |
|---|---|---|
| `POST /api/mrp/generate-daily-plan` | ✅ | ✅ fabrika-stok-merkezi |
| `GET /api/mrp/daily-plan/:date` | ✅ | ✅ KioskMRPPanel + fabrika-stok-merkezi |
| `POST /api/mrp/daily-plan/:id/confirm` (HQ onay) | ✅ | ❌ **EKSİK UI** |
| `POST /api/mrp/plan-items/:id/pick` | ✅ | ⚠️ Kısmen |
| `POST /api/mrp/plan-items/:id/verify` | ✅ | ✅ KioskMRPPanel |
| `GET /api/mrp/leftovers` | ✅ | ✅ KioskMRPPanel |
| `POST /api/mrp/leftovers` | ✅ | ✅ KioskMRPPanel |
| `GET /api/mrp/leftovers/:date` | ✅ | ✅ |
| `POST /api/mrp/leftovers/:id/verify` | ✅ | ❌ **EKSİK UI** |
| `GET /api/mrp/pick-logs` | ✅ | ⚠️ Kısmen |
| `POST /api/mrp/deduct-stock` | ✅ | ❌ **EKSİK UI** |
| `POST /api/mrp/calculate-waste` | ✅ | ❌ **EKSİK UI** |

**4 endpoint UI'da yok.** Ama bunlar **kritik akış için** gerekli:
- `confirm` → HQ Coach onaylamadan çekim olmasın
- `leftovers/:id/verify` → kalan malzeme doğrulama (akşam kapanışı)
- `deduct-stock` → çekilen malzemeyi depodan otomatik düş
- `calculate-waste` → fire hesabı

---

### Bulgu 4 — Reçete Sisteminde Eksik UI

**Dosya:** `server/routes/factory-recipes.ts` (2364 satır, 40 endpoint)

| Endpoint | Amaç | UI |
|---|---|---|
| `POST /api/factory/recipes/:id/lock` | Reçete kilitle (üretime girince değiştirilemez) | ❌ Yok |
| `POST /api/factory/recipes/:id/calculate` | Reçete maliyet/besin hesapla | ❌ Yok |
| `POST /api/factory/recipes/bulk-recalc` | Tüm reçeteleri toplu yeniden hesapla | ❌ Yok |
| `POST /api/factory/recipes/:id/calculate-nutrition` | **Otomatik besin değeri hesapla** | ❌ Yok |
| `POST /api/factory/recipes/:id/approve-grammage` | Gramaj onayla | ✅ recete-detay'da var |
| `GET /api/factory/recipes/:id/approvals` | Onay listesi | ✅ |
| `POST /api/factory/recipes/:id/start-production` | Üretim başlat | ✅ uretim-modu |

**Aslan'ın sorduğu "besin değerleri otomatik hesaplama"** → `calculate-nutrition` endpoint var ama **UI'da trigger yok!** Reçete editöründe bir "Besin Değerlerini Otomatik Hesapla" butonu eklenmesi yeterli.

---

### Bulgu 5 — Reçete Kilitleme (Production Lock) İhmal

`POST /api/factory/recipes/:id/lock` — bir reçete üretime girince değiştirilmeyi engellemek için var. **UI yok = kullanılmıyor.**

Bu **kalite/audit risk**: birisi üretim sırasında reçete değiştirebilir, üretim ile reçete uyuşmaz. Pilot için **risk değil** ama 1-2 ay içinde eklenmesi gereken bir feature.

---

## 📋 RAPORLU MODÜLLERIN DETAYI

### 1. Reçete Sistemi
**Sayfa:** `fabrika-receteler.tsx`, `fabrika-recete-detay.tsx`, `fabrika-recete-duzenle.tsx`
**Backend:** factory-recipes.ts (2364 satır), 40 endpoint
**Durum:** ✅ ÇOK İYİ — snapshot, restore, approval, gramaj onayı hepsi UI'da

**Eksikler (P2):**
- Reçete kilitleme UI butonu (lock/unlock)
- Otomatik besin değeri hesaplama trigger
- Bulk recalc trigger (tüm reçeteleri yeniden hesapla)

### 2. Üretim Modu (start production)
**Sayfa:** `fabrika-uretim-modu.tsx` (541 satır)
**Backend:** factory.ts içinde + factory-recipes.ts içinde start-production
**Durum:** ✅ ÇALIŞIYOR

### 3. Üretim Planlama (V2 — Sistem B)
**Sayfa:** `fabrika/uretim-planlama.tsx` + 2 component (DailyRecord + Responsibilities)
**Backend:** production-planning-routes.ts, 14 endpoint
**Durum:** ✅ TAMAMLANDI BUGÜN (TASK-URETIM-PLANLAMA-V2)

### 4. MRP-Light (Ara Depo Çekme)
**Sayfa:** `fabrika-stok-merkezi.tsx` + components/kiosk/KioskMRPPanel
**Backend:** mrp-routes.ts, 11 endpoint
**Durum:** ⚠️ KISMEN — 4 endpoint UI'da yok

**Eksikler (P1 — pilot öncesi):**
- HQ onay UI (confirm daily plan)
- Leftover verify (akşam kapanış)
- Stok düşme trigger
- Fire hesaplama trigger

### 5. Besin Değeri Sistemi
**Sayfa:** Reçete sayfasında entegre
**Backend:** factory-recipe-nutrition.ts (1249 satır), 10 endpoint
**Durum:** ✅ İYİ — onay/audit/history hepsi UI'da

**Eksik (P1):**
- `POST /recipes/:id/calculate-nutrition` UI butonu (otomatik hesaplama)

### 6. Allergen Sistemi
**Backend:** factory-allergens.ts (1281 satır), 6 endpoint
**Durum:** ✅ ÇOK İYİ — public + quality + print log hepsi UI'da

### 7. Factory F2 (Production↔Shift Dashboard)
**Backend:** factory-f2.ts (268 satır), 3 endpoint
**Durum:** ❌ UI YOK — backend var ama hiç kullanılmıyor

**Bulgu:** Bu modül **terkedilmiş** olabilir veya **post-pilot** için bekliyor. Aslan'ın kararı gerekli.

### 8. Quality Control
**Backend:** factory.ts içinde 11 endpoint (quality + qc)
**UI:** İyi durumda

### 9. Diğer
- Kiosk (23 endpoint) — pilot için kritik, UI tamam
- Analytics (10 endpoint) — UI mevcut
- AI Reports (4 endpoint) — UI mevcut
- HACCP, Lots, Orders, Shipments, Roasting, Teams — UI mevcut

---

## 🎯 ÖNCELİKLİ AKSIYON LİSTESİ

### P1 — Pilot Öncesi (12 May'a 8 gün)
- [ ] **MRP HQ Onay UI** — `/api/mrp/daily-plan/:id/confirm` butonu (1 saat)
- [ ] **MRP Leftover Verify UI** — akşam kapanış flow (1 saat)
- [ ] **Reçete "Besin Değerlerini Otomatik Hesapla" butonu** — `calculate-nutrition` (30 dk)
- [ ] **MRP Stok Düşme Trigger UI** — pick onayı sonrası (1 saat)

**Toplam:** ~3-4 saat

### P2 — Post-Pilot (1-2 hafta)
- [ ] **Reçete Lock UI** (production lock) — kalite kontrol için
- [ ] **Bulk Recalc UI** — tüm reçeteleri yeniden hesapla butonu
- [ ] **Factory F2 Dashboard UI** — vardiya↔üretim birleşik dashboard (var ama UI'sız)
- [ ] **Eski Sistem A kaldırılması** — 1 ay sonra factory_production_plans tablosu silinebilir

### P3 — İsteğe Bağlı (2-3 ay)
- [ ] Reçete versiyon UI (history/diff)
- [ ] AI nutrition/allergen calculation otomatik trigger
- [ ] Fire hesaplama dashboard (calculate-waste trigger)

---

## 💡 TAVSİYELER

### Tavsiye 1: P1 Aksiyonları Pilot Öncesi
3-4 saatlik iş, **pilot için kritik**. MRP UI eksiklikleri tamamlanmazsa fabrikada manuel kayıt + Excel ile çalışma riski var.

### Tavsiye 2: Factory F2 Kararı
Aslan **karar vermeli**: F2 dashboard kullanılacak mı? Eğer evet → 4-6 saatlik UI yapımı. Eğer hayır → backend kodu temizlenmeli (268 satır ölü kod).

### Tavsiye 3: 4 Sistem Konsolidasyonu (Post-Pilot)
1-2 ay sonra:
- Sistem A (`factory_production_plans`) tamamen kaldırılır
- Sistem C (`factory_production_logs`) ve D (`factory_production_runs`) farklı amaçlar için kalır ama belge yapılır
- Sistem B (yeni) ana sistem olur

### Tavsiye 4: Endpoint Cleanup
~200 endpoint'in 15-20 tanesi UI'da kullanılmıyor. **Pilot sonrası audit + cleanup** yapılabilir.

---

## 📊 DB SORGULARI (yarın çalıştırmak için)

Replit'te yarın çalıştırılması gereken:

```sql
-- Faktorya tablo doluluk
SELECT 'factory_recipes' tbl, COUNT(*) n FROM factory_recipes
UNION ALL SELECT 'factory_keyblends', COUNT(*) FROM factory_keyblends
UNION ALL SELECT 'factory_production_logs', COUNT(*) FROM factory_production_logs
UNION ALL SELECT 'factory_production_runs', COUNT(*) FROM factory_production_runs
UNION ALL SELECT 'factory_production_outputs', COUNT(*) FROM factory_production_outputs
UNION ALL SELECT 'factory_shift_sessions', COUNT(*) FROM factory_shift_sessions
UNION ALL SELECT 'daily_material_plans', COUNT(*) FROM daily_material_plans
UNION ALL SELECT 'material_pick_logs', COUNT(*) FROM material_pick_logs
UNION ALL SELECT 'production_area_leftovers', COUNT(*) FROM production_area_leftovers
UNION ALL SELECT 'factory_ingredient_nutrition', COUNT(*) FROM factory_ingredient_nutrition
UNION ALL SELECT 'factory_recipe_approvals', COUNT(*) FROM factory_recipe_approvals
UNION ALL SELECT 'factory_recipe_label_print_logs', COUNT(*) FROM factory_recipe_label_print_logs
ORDER BY 2 DESC;

-- Son 30 gün'ün gerçek kullanımı
SELECT 'factory_recipes' tbl, COUNT(*) FROM factory_recipes WHERE updated_at > NOW() - INTERVAL '30 days'
UNION ALL SELECT 'factory_production_logs', COUNT(*) FROM factory_production_logs WHERE created_at > NOW() - INTERVAL '30 days'
UNION ALL SELECT 'factory_production_runs', COUNT(*) FROM factory_production_runs WHERE start_time > NOW() - INTERVAL '30 days'
UNION ALL SELECT 'daily_material_plans', COUNT(*) FROM daily_material_plans WHERE created_at > NOW() - INTERVAL '30 days'
UNION ALL SELECT 'material_pick_logs', COUNT(*) FROM material_pick_logs WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY 2 DESC;

-- factory_production_plans (Sistem A — gerçekten ölü mü?)
SELECT plan_date, COUNT(*) FROM factory_production_plans
GROUP BY plan_date
ORDER BY plan_date DESC LIMIT 20;
```

---

## 🤔 ASLAN'IN KARAR VERMESİ GEREKEN ŞEYLER

1. **F2 Dashboard kalsın mı, gitsin mi?** (vardiya↔üretim birleşik dashboard, backend var, UI yok)
2. **MRP P1 eksikleri pilot öncesi tamamlansın mı?** (~3-4 saat iş)
3. **Reçete Lock pilot öncesi mi sonrası mı?** (kalite audit önemi)
4. **Otomatik besin değeri hesaplama UI butonu eklensin mi?** (30 dk iş)

---

## 📝 EK NOTLAR

### Kod Kalitesi Gözlemi
- Tablolar isimlendirme tutarlı (`factory_*`, `branch_*`)
- Schema dosyaları iyi organize (08, 22, 23 — versiyonlu)
- Ama **paralel sistemler** (4 üretim takip sistemi) **mimari borç**
- Endpoint sayısı çok fazla (130+ tek dosyada factory.ts) — bölünebilir

### Mr.Dobody İlgili
Şu an Mr.Dobody **38 skill** içeriyor ama hiçbiri factory'i deep monitor etmiyor. Post-pilot:
- "Stok seviyesi düştü" skill (mevcut: stock-predictor — sadece şube)
- "Üretim verimi düştü" skill
- "Fire oranı yüksek" skill
- "Reçete onayı bekliyor" skill

### Pilot Etki
Pilotta sadece **Fabrika #24** kullanılacak. 4 şubeden biri = %25. Ama fabrika **tüm şubelere malzeme/ürün gönderiyor**, dolayısıyla fabrika modülü tüm pilotu etkileyen kritik bir bileşen.

**Pilot için fabrika modülü hazır mı?** EVET — bugünkü Sistem B + mevcut MRP UI ile günlük operasyon yapılabilir. P1 eksikleri zenginleştirir ama bloker değil.
