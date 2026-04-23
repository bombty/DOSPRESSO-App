# Replit Bağımsız Analiz Raporu — Reçete Sistemi

**Hazırlayan:** Replit Agent (bağımsız analiz, Claude raporu sonradan okundu)
**Tarih:** 23 Nisan 2026
**Pilot:** 28 Nisan 2026 (5 gün kala)
**Mod:** Plan mode — sadece SQL + kod okuma + analiz, kod değişikliği YOK

---

## 1. Mevcut Durum (Görev 1)

### 1.1 Tablo Envanteri (Reçete ile ilgili 18 ana tablo)

| Tablo | Satır | Aktif | Durum |
|---|---|---|---|
| `factory_recipes` | 27 | 27 | **Aktif sistem (R-1/R-4 sprint)** |
| `factory_recipe_ingredients` | 218 | — | Aktif |
| `factory_recipe_steps` | 10 | — | Az dolu (sadece 10 adım, 27 reçete için) |
| `factory_recipe_versions` | 0 | — | **Tasarlanmış, hiç kullanılmıyor** |
| `factory_recipe_price_history` | 0 | — | **Audit boş** |
| `factory_ingredient_nutrition` | 111 | — | Bu sabah seed ile dolu |
| `factory_keyblends` | 2 | — | Gizli formül başarılı (12 ingredient) |
| `factory_keyblend_ingredients` | 12 | — | Aktif |
| `factory_production_logs` | 1 | — | **Yeni kiosk akışı, 1 kez test edilmiş** |
| `factory_production_batches` | 1 | — | Az |
| `factory_products` | 177 | 177 | 177 ürün ama sadece **27 reçeteli (%15)** |
| `product_recipes` | 12 | 12 | **Paralel sistem, hepsinde maliyet** |
| `product_recipe_ingredients` | 63 | — | Aktif |
| `recipes` | **145** | — | **LEGACY (eski şube reçete sistemi)** |
| `recipe_versions` | **74** | — | **LEGACY** |
| `recipe_categories` | 10 | — | LEGACY |
| `production_batches` | 33 | — | Eski üretim kayıtları aktif |
| `factory_production_runs` | 84 | — | Eski üretim kayıtları aktif |

**Çok kritik bulgu (Claude'un atladığı):** Sadece 2 değil, **3 paralel reçete sistemi** var:
1. `factory_recipes` (yeni, 27)
2. `product_recipes` (paralel, 12)
3. `recipes/recipe_versions/recipe_categories` (LEGACY, 145+74+10) — Claude bunu hiç bahsetmemiş

LEGACY tabloya hâlâ frontend'de bir referans var: `client/src/pages/fabrika/maliyet-yonetimi.tsx` PATCH `/api/recipes/:recipeId/ingredients/:ingredientId` çağırıyor.

### 1.2 FK Sağlığı (DB'deki gerçek)

```
factory_recipe_ingredients FK'ları:
✅ recipe_id → factory_recipes.id (CASCADE)
✅ keyblend_id → factory_keyblends.id (SET NULL)
❌ raw_material_id FK YOK (drift!) — schema'da inventory.id'ye references var
```

`factory_recipe_ingredients.raw_material_id`: 218 satırın 217'si dolu (%99,5), ama DB'de FK constraint yok → **orphan riski açık**.

`product_recipe_ingredients` (12 reçete):
```
✅ raw_material_id → raw_materials.id (RESTRICT)
✅ recipe_id → product_recipes.id (CASCADE)
```

**Mimari çelişki:**
- `product_recipe_ingredients` → `raw_materials` (240 satır)
- `factory_recipe_ingredients` → `inventory` (940 satır)
- İki ayrı master tablo, iki ayrı bağlantı stratejisi
- `recalculate-recipe-prices.ts` script `inventory.unit_cost` kullanıyor → kod **inventory** seçmiş

### 1.3 Veri Kapsamı

```
factory_recipes (27 aktif):
  cost_dolu: 12 (%44) ← Claude "0" demiş, bu YANLIŞ
  cost_sifir: 15
  allergen_dolu: 0  (Sema'nın 12 eksik reçete malzemesi → Task #129)
  nutrition_dolu: 0

product_recipes (12 aktif):
  cost_dolu: 12 (%100)

raw_materials price_last_updated:
  TÜM 240 satır = 23 Nis 16:48 (script bu sabah çalıştı!)
  son 30 gün: 185

ürün-reçete bağı: 27/27 reçete bir factory_product'a bağlı ✅
fakat 177 ürünün sadece 27'si reçeteli (150 ürün reçetesiz)
```

### 1.4 Maliyet Hesaplama Akışı (mevcut durum)

`server/scripts/recalculate-recipe-prices.ts` (Task #97/#98/#99) **gerçek ve çalışıyor:**
```
rawMaterialCost = Σ (amount × inventory.unit_cost / conversion_factor)
                  + keyblend ingredients dahil
unitCost        = (raw + labor + energy) / baseBatchOutput
factory_products.basePrice      = SUM(qty × inventory.unit_price)
factory_products.suggestedPrice = basePrice × profitMargin (default 1.01)
audit           = factory_recipe_price_history + factory_product_price_history
status          = applied | applied_partial | skipped_empty (coverage'a göre)
```

**Ama:**
- Cron yok — manuel çalıştırılıyor (`npx tsx server/scripts/recalculate-recipe-prices.ts`)
- Frontend'de "Yeniden hesapla" butonu yok
- `factory_recipe_price_history` tablosu DB'de var ama **0 satır** → script çalıştığı halde audit yazmıyor (sebep araştırılmalı: write hatası mı, conditional skip mı)
- 27 reçeteden 15'i hâlâ cost=0 (link script'in eksik kalan eşleşmeleri)

`factory-recipes.ts` GET endpoint'i (`/api/factory/recipes/:id`) reçete maliyetini dönüyor (line 253) ama frontend'de `fabrika-recete-duzenle.tsx`'te maliyet UI'ı görünmüyor.

### 1.5 UI Kullanımı

```
factory_recipes kullanan sayfalar (yeni sistem):
- fabrika-receteler.tsx (liste)
- fabrika-recete-detay.tsx
- fabrika-recete-duzenle.tsx
- fabrika-uretim-modu.tsx (kiosk)
- fabrika-centrum.tsx
- fabrika-stok-merkezi.tsx
- fabrika-keyblend-yonetimi.tsx

product_recipes kullanan sayfalar:
- fabrika/maliyet-yonetimi.tsx ← **Mahmut/RGM maliyet ekranı, sadece bu paralel sistemi görür!**

LEGACY `recipes` referansı:
- fabrika/maliyet-yonetimi.tsx (PATCH /api/recipes/:id/ingredients/:id)
- fabrika/uretim-planlama.tsx (recipes_categories?)
```

**Backend endpoint'ler (`server/routes/factory-recipes.ts`):**
- GET/POST/PATCH list, detay, ingredients (bulk + single), steps (bulk)
- POST `/lock`, POST `/start-production`, POST `/production-logs/:id/complete`
- GET `/calculate` (maliyet on-demand)
- GET/POST `/recipe-access` (kategori erişim)

**Eksik endpoint'ler (Claude tespiti DOĞRULANDI):**
- ❌ `DELETE /api/factory/recipes/:id/ingredients/:ingId` YOK
- ❌ `DELETE /api/factory/recipes/:id/steps/:stepId` YOK
- ❌ `PATCH /api/factory/recipes/:id/steps/:stepId` YOK (sadece bulk replace)
- ❌ Frontend'de inline edit + delete UI yok

### 1.6 Satınalma Akışı

`purchase_orders` + `purchase_order_items` + `purchase_order_payments` mevcut (3 tablo). AMA:
- "Fatura/PO girilince → raw_materials.unit_price güncelle → reçete recalc tetikle" zinciri **kodda yok**
- Mevcut pattern: Samet manuel `inventory.unit_cost` günceller → script manuel tetiklenir
- Bu sabah 16:48'de tüm 240 raw_materials güncellendi (toplu seed/import)

### 1.7 Muhasebe Entegrasyonu

- COGS endpoint yok
- Aylık reçete bazlı üretim raporu yok
- `factory_production_logs` boş (1 kayıt) → muhasebe için veri yok
- `factory_product_price_history` audit için hazır ama Mahmut'un göreceği rapor ekranı yok
- Mahmut'un mevcut maliyet ekranı = `/fabrika/maliyet-yonetimi` ama **product_recipes** (12 satır) → **factory_recipes (27)'den kopuk**

### 1.8 Kiosk Üretim Akışı

`fabrika-uretim-modu.tsx`:
- Reçete + adımlar + batch preset seçimi var
- `start-production` → `factory_production_logs` kayıt
- `complete` → output count + completion
- ✅ Adım listesi var, ✅ batch çarpan UI var
- ❌ Maliyet bilgisi gösterilmiyor (recipe.unitCost var ama UI'da yok)
- ❌ Adım checklist yok (tek tek tikleme)
- ❌ Timer UI'da net değil
- ❌ Fire/zayi otomatik hesap yok
- **Test durumu:** 84 production_runs (eski sistem), sadece 1 factory_production_logs (yeni sistem) → **kiosk akışı gerçekte hiç kullanılmıyor**

---

## 2. Perspektif Analizi (5 Puan Üzerinden)

### 2.1 RGM (Aslan) — **2/5**
- ✅ Reçete listele, oluştur, görüntüle
- ✅ Maliyet 12/27'de hesaplı (script çalıştı)
- ❌ Malzeme/adım düzenle/sil UI yok
- ❌ Maliyet UI'ı reçete ekranında görünmüyor
- ❌ Kar marjı, kategori ortalaması, fiyat artış uyarısı yok
- ❌ 15 reçetenin maliyeti hâlâ 0

### 2.2 GM / Sema — **1/5**
- ✅ 111 ingredient nutrition template hazır
- ❌ Reçete UI'da alerjen/besin gösterimi YOK
- ❌ 12 reçetenin malzemeleri eksik (Task #129)
- ❌ `factory_recipe_versions` boş → onay akışı çalışmıyor
- ❌ HACCP kritik kontrol noktası şema'da var ama UI yok
- ❌ Müşteri-yüz alerjen sayfası (/kalite/alerjen) yok (Task #130)

### 2.3 Satın Alma (Samet) — **2/5**
- ✅ raw_materials + inventory tablolarında fiyat alanları
- ✅ purchase_orders altyapısı var
- ❌ Fatura → fiyat güncelleme → reçete recalc otomatik trigger yok
- ❌ "Bu fiyat artışı X reçete + Y TL etki" raporu yok
- ❌ Tedarikçi karşılaştırma UI yok
- ❌ raw_materials vs inventory iki tablo karışıklığı (drift riski)

### 2.4 Muhasebe (Mahmut) — **1/5**
- ❌ Aylık COGS raporu yok
- ❌ Üretim partisi → muhasebe kaydı yok
- ❌ TMS-2 stok değerleme yok
- ⚠️ Mahmut'un mevcut ekranı (`/fabrika/maliyet-yonetimi`) sadece 12 product_recipe görüyor → 27 factory_recipe'i göremiyor (paralel sistem sorunu)
- ❌ `factory_recipe_price_history` boş (audit yazılmıyor)

### 2.5 Fabrika Kiosk / Üretim Şefi — **2/5**
- ✅ Reçete + adım + batch çarpan görünür
- ✅ Start/complete production flow var
- ❌ Maliyet bilgisi UI'da yok
- ❌ Adım checklist yok
- ❌ Fire otomatik hesap yok
- ❌ Hiç kullanılmamış (1 kayıt) → real-world test eksik

### 2.6 Üretim Operatörü — **1/5**
- ✅ Reçete read-only görüş
- ❌ Adım tikleme yok
- ❌ Fotoğraflı rehber alanı schema'da var ama 10 adım kayıtlı (27 reçeteden)
- ❌ Problem bildirme yok
- ❌ Timer entegrasyonu net değil

**Toplam ortalama: 1.5/5** — Sistem temel altyapı kurmuş, ama paydaşlar için **bitmemiş** durumda.

---

## 3. Bağımsız Çözüm Önerisi

### 3.1 Mimari Karar (sıfırdan kursak)

**Tek reçete sistemi:** `factory_recipes` kazansın. Sebepler:
- Schema en zengin (keyblend, versioning, nutrition, HACCP, station, equipment, energy hepsi var)
- 8+1 tablo → modüler
- Factory + üretim + kiosk akışı için tasarlanmış

**Master hammadde tablosu:** `inventory` kazansın.
- 940 satır (raw_materials 240'tan zengin)
- conversion_factor, purchase_unit, recipe_unit, last_purchase_price, unit_cost hepsi var
- recalc script zaten `inventory` kullanıyor
- `raw_materials` deprecate (READ-ONLY referans)

**Tablo sayısı (ideal):** 6 ana + 2 audit + 1 referans = **9 tablo**
1. `factory_recipes` (ana)
2. `factory_recipe_ingredients` (FK → inventory)
3. `factory_recipe_steps`
4. `factory_recipe_versions` (audit, otomatik snapshot)
5. `factory_recipe_price_history` (audit, recalc)
6. `factory_keyblends` + `factory_keyblend_ingredients`
7. `factory_production_logs`
8. `factory_ingredient_nutrition` (referans)
9. `factory_recipe_category_access` (RBAC)

**`product_recipes`, `recipes`, `recipe_versions`, `recipe_categories` → DEPRECATE.**

**Maliyet hesaplama nereye:**
- DB trigger DEĞIL (Drizzle migration karmaşıklığı, Postgres trigger debug zor)
- **Hibrit:** (a) On-demand `/api/factory/recipes/:id/calculate` (mevcut endpoint), (b) `inventory.unit_cost` UPDATE'inde event hook (Node.js side, materialized view yerine), (c) Gece cron (full recalc)

**Cache stratejisi:** `factory_recipes.costLastCalculated` 24 saat TTL. Frontend SWR tarzı stale-while-revalidate.

### 3.2 MVP (Pilot 5 gün)

**Kritik (must-have, pilot için ŞART):**
1. **Edit/Delete UI** (3 saat) — Claude R-5A doğru
2. **Maliyet UI kartı** (1 saat) — endpoint zaten var, sadece görünür yap
3. **15 cost=0 reçeteyi düzelt** (1 saat) — link script ikinci tur + manuel kayıp eşleme
4. **Mr. Dobody routing kontrol** — alerjen sorgusu Sema'ya yönlendiriliyor mu?

**Ertelenir:**
- Versiyonlama otomasyonu (R-5C)
- Kiosk maliyet UI (R-5E)
- Fatura → trigger akışı (R-5D)

**Kabul edilebilir hack:**
- Pilot süresince Sema 12 eksik reçeteyi manuel girer (Task #129)
- Mahmut'a geçici olarak "27 factory_recipe + 12 product_recipe birleştirilmiş" raw view gösterilir

### 3.3 Geleceğe Yatırım (2-4 hafta sonrası)

1. **Paralel sistem migration** — product_recipes + recipes/recipe_versions deprecate, tek sistem
2. **purchase_orders → recalc trigger** — fatura kaydında otomatik hammadde fiyat update + reçete recalc
3. **Müşteri-yüz alerjen sayfası** — `/menu/:id/alerjen` veya QR kod (Task #130)
4. **Versiyonlama otomatik snapshot** — recipe UPDATE'te trigger (event handler), versions tablosu otomatik dolar
5. **Mahmut COGS dashboard** — aylık factory_production_logs + factory_product_price_history aggregate

### 3.4 Riskler (canlıda neyi patlatır)

| Senaryo | Olasılık | Etki | Mitigasyon |
|---|---|---|---|
| Müşteri pilotta "alerjen var mı?" sorar, sistem cevap vermez | YÜKSEK | Yüksek (yasal) | Pilot öncesi Sema 12 reçeteyi tamamlar; basılı poster yedek |
| Mahmut Mayıs ay sonu COGS isteyince script çıktısı yetersiz | YÜKSEK | Orta | Excel export + recalc raporu (var, JSON) |
| Samet fiyat günceller, eski paralel sistem (product_recipes) güncellenmez | ORTA | Orta | Pilot süresi `product_recipes` READ-ONLY işaretle |
| Sema reçete versiyon yayınlar, kiosk eski versiyonla üretim yapar | DÜŞÜK | Yüksek | factory_production_logs.recipeVersionId zaten var, kiosk her başlangıçta GET ile en son versiyonu çeker |
| 15 reçetenin maliyeti 0 → satış fiyatı belirleme yanlış | YÜKSEK | Yüksek | Pilot öncesi link script ikinci tur ZORUNLU |
| factory_recipe_ingredients.raw_material_id orphan kalırsa silent fail | DÜŞÜK | Orta | FK constraint EKLE (DB drift fix) |
| LEGACY `recipes` (145) tablosuna yanlışlıkla yazma | DÜŞÜK | Orta | `fabrika/maliyet-yonetimi.tsx` PATCH /api/recipes/* çağrısı KALDIR |

### 3.5 5 Optimizasyon Fikri (Claude'unkilerden FARKLI)

Claude'un 7 fikri çoğunlukla altyapı (FK fix, caching, snapshot, bulk işlem). Benim 5 fikrim **iş zekası / ürün** odaklı:

1. **AI Maliyet Anomali Tespiti (Mr. Dobody)** — Hammadde fiyatı %20+ değişirse veya reçete unitCost geçen aydan %15+ saparsa Mr. Dobody otomatik olarak Aslan'a + Samet'e bildirim atar. `factory_recipe_price_history` + `factory_product_price_history` veriyle besler. Mevcut Mr. Dobody altyapısı (`server/agent/routing.ts`) ile entegre.

2. **Tedarikçi Auto-Switch (purchase_orders entegrasyon)** — Aynı hammadde için 2+ tedarikçi varsa, en uygun fiyatlıyı **highlight** et. Samet PO açarken otomatik öneri görür: "Un için Y tedarikçi 50 TL/kg, X tedarikçi 65 TL/kg → fark 15 TL × ayda 200 kg = 3000 TL".

3. **Reçete A/B Test Modu (versions ile)** — `factory_recipe_versions` aktif kullanılırsa, iki versiyonu paralel üret, `factory_production_logs` ile karşılaştır: "DON-001 v2 batch süresi v1'den %12 daha kısa, fire %3 daha az → versiyon değiştir önerisi".

4. **Müşteri-Yüz Alerjen + Besin QR Sayfası** — `/menu/:productId` public endpoint, QR kod ile menüden link. Müşteri telefonu kameraya tutar → ürün alerjenleri + 100gr besin tablosu görür. CRM `guest_feedback` ile bağla (alerjen şikayeti otomatik etiketlenir). **Yasal koruma + brand güveni.**

5. **Kapasite Bazlı Üretim Planlama Tetikleyici** — `production_plan_items` zaten var (mevcut altyapı). Yeni: reçete `productionTimeMinutes` + `requiredWorkers` + station kapasite ile haftalık plan **otomatik feasibility check**: "Pazartesi plan 200 donut, ama DON-001 1 batch=65 adet × 45 dk × 1 worker → günlük max 100 adet, plan revize gerek." `dobody-flow.ts` üzerinden otomatik öneri.

---

## 4. Claude ile Karşılaştırma

### 4.1 Anlaşma Noktaları

✅ **Edit/Delete UI eksikliği** — endpoint + UI ikisi de yok, kanıtlandı (R-5A doğru öncelik)
✅ **factory_recipe_versions boş** — versiyonlama altyapı var ama kullanılmıyor
✅ **Paralel sistem sorunu** (product_recipes + factory_recipes)
✅ **factory_recipe_ingredients.raw_material_id FK eksik** (DB drift)
✅ **15-alerjen ile 111 template hazır ama UI'da görünmüyor**
✅ **Kiosk maliyet bilgisi yok**
✅ **Üretim partisi → muhasebe entegrasyonu yok**
✅ **Maliyet formülü** — Claude'un formülü doğru, recalc script zaten bu mantıkla çalışıyor

### 4.2 Anlaşmazlıklar (Claude YANLIŞ veya EKSİK)

❌ **Claude: "factory_recipes maliyet=0"** — **YANLIŞ**. Bu sabah 16:48'de recalc script çalışmış, **27/12 reçetede maliyet dolu (%44)**. Tam değil ama "0" değil. raw_materials.price_last_updated tüm 240 satırda 23 Nis 16:48.

❌ **Claude: "raw_material_id → inventory.id YANLIŞ tablo, raw_materials olması gerek"** — **TARTIŞMALI**. Schema (line 216) bilinçli olarak `inventory` seçmiş, link-recipe-ingredients-to-inventory.ts (Task #98) bu kararı uygulamış, recalc script `inventory.unit_cost` üzerinden çalışıyor. inventory 940 satır + zengin alanlar (conversion_factor, purchase_unit, recipe_unit) raw_materials'tan üstün. **Doğru karar: `raw_materials` deprecate, `inventory` kazansın.** Claude tersini önermiş.

❌ **Claude LEGACY sistemden hiç bahsetmemiş** — `recipes` (145), `recipe_versions` (74), `recipe_categories` (10) tabloları var. `fabrika/maliyet-yonetimi.tsx` LEGACY `/api/recipes/:id/ingredients/:id` endpoint çağırıyor. Bu **3. paralel sistem**, Claude sadece 2'sini saymış.

❌ **Claude "185 hammadde" demiş** — DB'de raw_materials **240**, inventory **940**. (Belki "11-upsert seed"den hatırlıyor.)

❌ **Claude factory_recipe_price_history audit'in boş olduğunu fark etmemiş** — Recalc script audit yazıyor olmalı ama tablo boş (0 satır). Script'te conditional skip mı, write hatası mı araştırılmalı.

❌ **Claude 177 ürünün sadece 27'sinin reçeteli olduğunu (150 ürün reçetesiz) atlamış** — Bu Mahmut için en büyük problem (kapsam %15).

❌ **Claude `factory_production_logs`'un sadece 1 kayıt olduğunu, kiosk akışının REAL-WORLD HIÇ test edilmediğini belirtmemiş** — production_runs 84 (eski sistem aktif), yeni kiosk flow 1 kez denenmiş.

### 4.3 Sprint Önceliği — Karşılaştırma

| Sprint | Claude | Replit | Açıklama |
|---|---|---|---|
| R-5A (Edit/Delete UI) | 🔴 ŞART, 3 saat | 🔴 ŞART, 3 saat | Anlaşma |
| R-5B (Maliyet sistemi) | 🟠 İyi olur, 4 saat | 🟡 Hibrit, 1 saat | **Replit: maliyet ZATEN hesaplanıyor, sadece UI kartı + 15 boş reçete fix** |
| R-5C (Alerjen UI) | 🟡 Sonra, 2 saat | 🔴 ŞART, 1 saat | **Replit: yasal risk, müşteri sorabilir** |
| R-5D (Muhasebe) | 🟢 Pilot sonrası | 🟢 Pilot sonrası | Anlaşma |
| R-5E (Kiosk üretim) | 🟢 Pilot sonrası | 🟢 Pilot sonrası | Anlaşma |
| **YENİ R-5F:** LEGACY temizlik | yok | 🟡 Sonra | **Replit: `recipes` tablosuna yanlışlıkla yazma riski, fabrika/maliyet-yonetimi.tsx PATCH /api/recipes kaldır** |

**Replit önerisi:** R-5A (UI fix 3h) + R-5B-LITE (maliyet UI kartı + 15 boş reçete fix 2h) + R-5C-MIN (alerjen badge + 12 reçete malzeme tamamlama 1h) = **6 saat, pilot için yetiyor**.

### 4.4 Maliyet Formülü

```
rawMaterialCost = Σ (ingredient.amount × inventory.unit_cost / conversion_factor)
                  + keyblend ingredients (rekursif)
laborCost       = requiredWorkers × productionTimeMinutes × avgHourlyWage
energyCost      = equipmentKwh × kwhPrice + waterConsumptionLt × waterPrice
batchCost       = rawMat + labor + energy + overhead
unitCost        = batchCost / baseBatchOutput
```

**Genel olarak doğru.** İki ek:

1. **conversion_factor eklenmeli** (Claude formülde unutmuş) — recalc script zaten `amount × unit_cost / cf` kullanıyor (kg ↔ g birim dönüşümü). Bu kritik, özellikle pasta/donut için.

2. **overhead tanımı eksik** — Claude "overhead" demiş ama nereden geleceği belirsiz. Mevcut script'te overhead **YOK**. Önerim: pilot için 0, pilot sonrası `factory_overhead_config` tablosu (kira + amortisman + endirekt işçilik / aylık üretim adedi).

### 4.5 Pilot Kararı

**Replit önerisi: B+** (Claude'un B'sinden farklı):

- **Claude B:** R-5A + R-5B (7 saat) — full maliyet sistemi
- **Replit B+:** R-5A (3h, UI edit/delete) + R-5B-LITE (2h, maliyet UI kartı + 15 reçete fix) + R-5C-MIN (1h, alerjen badge + 12 reçete malzeme tamamlama) = **6 saat**

**Sebepler:**
1. Maliyet zaten **%44 hesaplanmış** — full sistem inşa etmeye gerek yok, mevcut çıktıyı UI'a bağla
2. Alerjen yasal risk → ertelemek pilot sonrası çok pahalıya patlayabilir (yasal şikayet)
3. 6 saat 1 günde sığar, pilot 28 Nis kesin

---

## 5. Sonuç — Aslan İçin Tek Soru

> **Aslan, hangi seçeneği onaylıyorsun?**
>
> **A)** Hiç dokunma, pilot sonrası çöz (RGM rahatsız, müşteri alerjen sorarsa risk)
>
> **B) [Claude]** R-5A + R-5B (7 saat) — Edit/Delete UI + tam maliyet sistemi
>
> **B+) [Replit önerisi]** R-5A + R-5B-LITE + R-5C-MIN (**6 saat, 1 gün**) — Edit/Delete UI + maliyet kartı (mevcut hesabı görünür yap) + alerjen badge + 12 boş reçete malzeme tamamlama
>
> **C)** R-5A + R-5B + R-5C (9 saat) — pilot riskli zamanlamada
>
> **Replit tavsiyesi: B+**. Çünkü maliyet altyapısı zaten %44 çalışıyor, UI eksik. Alerjen yasal risk → ertelemek pahalı. 6 saat = 1 gün → 28 Nis pilot için 4 gün boşluk kalır (test, fix, dökümantasyon).

---

## EK A: Action Items (Plan mode — kod değişikliği YOK, sadece task öneri)

Pilot öncesi (5 gün):
- [ ] **Task #135 (öneri):** Edit/Delete UI + DELETE endpoint'leri (R-5A) — 3 saat
- [ ] **Task #136 (öneri):** Maliyet UI kartı + 15 boş reçete link script ikinci tur (R-5B-LITE) — 2 saat
- [x] **Task #129 (mevcut):** 12 reçete malzeme tamamlama (Sema)
- [ ] **Task #137 (öneri):** Alerjen badge UI + ingredient_nutrition JOIN (R-5C-MIN) — 1 saat
- [x] **Task #130 (mevcut):** /kalite/alerjen müşteri sayfası (pilot sonrası)

Pilot sonrası (Sprint I):
- [ ] **Task #138 (öneri):** factory_recipe_price_history audit yazılmıyor — debug
- [ ] **Task #139 (öneri):** factory_recipe_ingredients.raw_material_id FK constraint ekle (DB drift)
- [ ] **Task #140 (öneri):** LEGACY `recipes` tablosu temizlik — fabrika/maliyet-yonetimi.tsx PATCH /api/recipes kaldır
- [ ] **Task #141 (öneri):** product_recipes deprecate migration (12 reçete factory_recipes'a taşıma)
- [ ] **Task #142 (öneri):** purchase_orders → raw_materials.unit_cost trigger zinciri
- [ ] **Task #143 (öneri):** Kiosk maliyet UI + checklist + fire (R-5E)
- [ ] **Task #144 (öneri):** Mahmut COGS aylık dashboard (R-5D)
- [ ] **Task #145 (öneri):** Mr. Dobody maliyet anomali AI tespiti (Replit fikir #1)

---

**Sonuç:** Sistem **işlevsel ama eksik**. Pilot 28 Nis için R-5A + R-5B-LITE + R-5C-MIN (6 saat) yeter. Tam çözüm 2-4 hafta. Asıl mimari sorun: **3 paralel reçete sistemi + 2 master hammadde tablosu** — pilot sonrası temizlik şart.
