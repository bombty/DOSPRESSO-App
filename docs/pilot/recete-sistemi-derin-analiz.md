# Reçete Sistemi — Multi-Perspektif Derin Analiz

**Tarih:** 23 Nisan 2026
**Kapsam:** Fabrika reçete sistemi + tüm paydaş akışları
**Durum:** Pilot 5 gün kala — **3 kritik mimari sorun tespit edildi**

---

## 🚨 Yönetici Özeti

Sistem **2 paralel reçete mimarisi** içeriyor ve ikisi birbirinden **izole** çalışıyor:

1. **`product_recipes` (Eski sistem)** — Maliyet hesaplar, satın almayla bağlı
2. **`factory_recipes` (Yeni sistem, R-1/R-4 sprint)** — Maliyet hesaplamıyor, satın almadan kopuk

**Kullanıcılar yeni sistemi kullanıyor → maliyet bilgisi yok.**

Buna ek olarak 2 kritik UI eksikliği var:
- Malzeme düzenleme/silme butonu yok (sadece ekleme)
- Adım düzenleme/silme butonu yok (sadece ekleme)

---

## 🎭 6 Perspektif Değerlendirmesi

### 1️⃣ RGM (Aslan) Perspektifi — Reçete Stratejisi

**Mevcut acı noktalar:**
- ✅ Reçete ekleyebiliyor
- ❌ Var olan malzemeyi düzenleyemiyor (tek çözüm: sil-yeniden ekle, ama silme yok!)
- ❌ Reçete maliyeti bilinmiyor → satış fiyatı sezgisel
- ❌ Reçete kilidi (editLocked) var ama kimin ne zaman değiştirdiği net değil

**İhtiyaç:**
- Reçete için **stratejik görünüm:** Maliyet / satış fiyatı / kar marjı
- Değişiklik geçmişi (kim ne zaman ne değiştirdi)
- Hammadde fiyat artışında otomatik uyarı ("X reçetesi %15 pahalandı")

### 2️⃣ GM / Gıda Mühendisi (Sema) Perspektifi — HACCP + Kalite

**Mevcut acı noktalar:**
- ✅ Alerjen tablosu hazır (15-alerjen seed ile 111 template)
- ❌ Malzemelerde alerjen görünmüyor (UI'da gösterilmiyor)
- ❌ Besin değeri hesaplaması (100gr başına) UI'da görünmüyor
- ❌ Versiyon hazırlayıp onay akışı tam değil (`factory_recipe_versions` tablosu boş)

**İhtiyaç:**
- Her malzeme için: alerjen bayrakları + besin değeri (100gr başına)
- Reçete sayfasında toplam besin değeri + alerjen listesi
- Onay akışı: "Taslak → GM inceler → Yayınla" (versiyonlama)
- İki reçete versiyonunu yan yana karşılaştır

### 3️⃣ Satın Alma (Samet) Perspektifi — Hammadde Fiyat Yönetimi

**Mevcut acı noktalar:**
- ✅ 185 hammadde `raw_materials` tablosunda (11-upsert ile)
- ❌ Reçete malzemesi `raw_materialId → inventory.id`'ye referans (YANLIŞ tablo!)
- ❌ Fiyat güncelleme reçeteyi trigger etmiyor
- ❌ "Bu fiyat artışı hangi reçeteleri etkiler?" sorusuna cevap yok

**İhtiyaç:**
- Reçete malzemesi `raw_materials` tablosuna bağlanmalı
- Samet fiyat günceller → etkilenen reçeteler otomatik yeniden hesaplanır
- "Hammadde X 1000 TL'den 1200 TL'ye çıkarsa toplam etki" raporu
- Tedarikçi bazlı fiyat karşılaştırma

### 4️⃣ Muhasebe (Mahmut) Perspektifi — Maliyet Muhasebesi

**Mevcut acı noktalar:**
- ❌ Reçete maliyet = 0 TL (hesap yok)
- ❌ Üretim partisinde maliyet dökümü yok (üretim planlamada TL bilinmiyor)
- ❌ TMS-2 stok değerleme için reçete bazlı hammadde tüketimi belirsiz
- ❌ Aylık maliyet raporu yok

**İhtiyaç:**
- Her reçetede: Hammadde + işçilik + enerji + genel gider + toplam birim maliyet
- Üretim partisi tamamlandığında otomatik maliyet muhasebesi kaydı
- Aylık aggregate: Ürün × üretim adedi × birim maliyet = toplam COGS
- Fiyatlandırma rehberi: "Bu reçetenin min satış fiyatı X, hedef %40 marj ile Y"

### 5️⃣ Fabrika Kiosk / Üretim Şefi (Ümit) Perspektifi — Operasyonel

**Mevcut acı noktalar:**
- ❌ Kiosk'ta reçete gösterimi: "Malzemeler ve miktarlar" — ama **hiç maliyet bilgisi yok**
- ❌ Batch ×1.25 / ×1.5 seçince sadece miktar ölçekleniyor, fire/zayi hesabı yok
- ❌ "Bu batch'te 500 TL hammadde kullandın" bilgisi yok
- ❌ Reçete içindeki adım değişirse kiosk'a bildirim gitmiyor

**İhtiyaç:**
- Kiosk üretim ekranı: "Bu batch toplam 450 TL + 2 işçi × 30dk = 520 TL"
- Fire toleransı aşılırsa alarm ("Fire %8 — normalde %5, dikkat")
- Reçete güncellemesi → aktif kiosk'a duyuru (zorunlu onay ile)

### 6️⃣ Üretim Sefi + Üretim Operatörü — Günlük İş

**Mevcut acı noktalar:**
- ✅ Reçeteyi görebiliyorlar (read-only OK)
- ❌ Hangi adımda olduklarını işaretleyemiyorlar (checklist yok)
- ❌ "Bu adımda 5 dakika fazla takıldım" → sistem kaydetmiyor
- ❌ Fire ölçümü manuel, otomatik hesap yok

**İhtiyaç:**
- Adım adım kiosk UI (her adım + timer + tik işareti)
- Fotoğraflı talimatlar (her kritik adımda ref görsel)
- Fire/zayi otomatik hesap (baz miktar vs çıktı)

---

## 🗺️ Mevcut Akış — Nereden Nereye

```
┌─────────────┐   ❌ Bağlı değil   ┌──────────────────┐
│ Satınalma   │───Fatura/fiyat───>│ raw_materials    │
│ (Samet)     │                   │ (185 hammadde)   │
└─────────────┘                   └──────────────────┘
                                          │
                                          │  ❌ FK yanlış
                                          ▼
                                  ┌──────────────────────┐
                                  │ factory_recipe       │
                                  │ _ingredients         │
                                  │  → inventory.id      │ ❌
                                  │  (raw_materials.id   │
                                  │   olması gerek)      │
                                  └──────────────────────┘
                                          │
                      ┌───────────────────┼─────────────┐
                      │                   │             │
                      ▼                   ▼             ▼
              ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
              │ factory_     │  │ factory_    │  │ factory_     │
              │ recipes      │  │ production_ │  │ worker_      │
              │ (27 reçete)  │  │ batches     │  │ scores       │
              │ Maliyet = 0  │  │             │  │              │
              └──────────────┘  └─────────────┘  └──────────────┘
                      │
                      │ ❌ Bağlı değil (paralel sistem!)
                      │
              ┌───────▼──────────┐
              │ product_recipes  │
              │ (eski sistem)    │
              │ Maliyet HESAPLAR │
              └──────────────────┘
```

**Sonuç:** Yeni sistem (`factory_recipes`) satın almadan kopuk, maliyet hesaplamıyor, eski paralel sistem (`product_recipes`) hesaplıyor ama kimse kullanmıyor.

---

## 🎯 İdeal Akış — Hedeflenmeli

```
┌─────────────┐
│ Satınalma   │ Fatura/fiyat günceller
│ (Samet)     │
└──────┬──────┘
       │
       ▼
┌──────────────────┐  Trigger: fiyat değişti
│ raw_materials    │──────────────────────┐
│ (master)         │                      │
└──────────────────┘                      │
       ▲                                  ▼
       │ FK (doğru)          ┌────────────────────────┐
       │                     │ cost-recalc scheduler  │
       │                     │ (otomatik yeniden hesap)│
       │                     └────────────────────────┘
       │                                  │
┌──────┴──────────────────┐               │
│ factory_recipe          │               │
│ _ingredients            │               │
│ → raw_materials.id ✅   │               │
└──────┬──────────────────┘               │
       │                                  │
       │                                  ▼
       │                     ┌────────────────────────┐
       │                     │ factory_recipes        │
       │                     │ rawMaterialCost ✅     │
       │                     │ laborCost, energyCost  │
       │                     │ totalBatchCost         │
       │                     │ unitCost               │
       │                     └────────────────────────┘
       │                                  │
       │                      ┌───────────┼──────────────┐
       │                      │           │              │
       ▼                      ▼           ▼              ▼
  [GM/Sema UI]        [Kiosk UI]   [Muhasebe]    [RGM Dashboard]
  Alerjen+besin       Batch maliyet  COGS raporu  Kar marjı analizi
```

---

## 📋 Güncellenmiş Sprint R-5 Kapsamı

**Süre tahmini: 8-10 saat (2 gün)**

### ALT SPRINT R-5A: Acil Pilot Düzeltmeleri (3 saat)
**Pilot 28 Nis öncesi ŞART**

1. **Malzeme düzenleme/silme UI** (1 saat)
   - Her satır için ✏️ + 🗑️ butonu
   - Miktar + birim + kategori inline düzenleme
   - Optimistic update + toast

2. **Adım düzenleme/silme UI** (1 saat)
   - Her adım için ✏️ + 🗑️ butonu
   - Title + content + timer + tips düzenleme
   - Sürükle-bırak sıralama (drag-handle zaten import edilmiş)

3. **Backend endpoint'ler** (1 saat)
   - `DELETE /api/factory/recipes/:id/ingredients/:ingId`
   - `PATCH /api/factory/recipes/:id/steps/:stepId`
   - `DELETE /api/factory/recipes/:id/steps/:stepId`

**Sonuç:** RGM + Sema reçete düzenleyebilir hale gelir.

### ALT SPRINT R-5B: Maliyet Sistemi (4 saat)
**Pilot 28 Nis'e yetişebilir ama ertelenebilir**

4. **FK düzeltmesi** (30 dk)
   - `factoryRecipeIngredients.rawMaterialId` → `raw_materials.id` (şema + migration)
   - Mevcut kayıtlarda `name` match ile bulk update (best-effort)

5. **Reçete maliyet hesaplama servisi** (1.5 saat)
   - `server/services/factory-recipe-cost-service.ts` yeni
   - `calculateFactoryRecipeCost(recipeId)`:
     - Malzeme × birim fiyat toplam (`raw_materials.current_unit_price`)
     - İşçilik: `requiredWorkers × productionTimeMinutes × ortalama_saatlik_ucret`
     - Enerji: `equipmentKwh × kwh_fiyat + waterConsumptionLt × su_fiyat`
     - `factory_recipes` tablosuna yazar

6. **Fiyat değişikliği trigger** (1 saat)
   - `raw_materials` UPDATE → etkilenen reçeteleri yeniden hesapla
   - `factory_recipe_price_history` kayıt (audit)

7. **Maliyet UI kartı** (1 saat)
   - Reçete düzenleme sayfasında "Maliyet Dökümü" kartı
   - Toplam hammadde: X TL
   - İşçilik: Y TL
   - Enerji: Z TL
   - Birim maliyet: W TL
   - "Yeniden hesapla" butonu

### ALT SPRINT R-5C: Alerjen + Besin Değeri (2 saat)
**Pilot sonrasına ertelenebilir**

8. **Malzeme satırında alerjen gösterimi** (30 dk)
   - `factoryIngredientNutrition` JOIN
   - Badge'ler: 🌾 gluten, 🥛 süt, 🥚 yumurta vb.

9. **Reçete toplam alerjen özeti** (30 dk)
   - Unique allergens (tüm malzemelerin union'u)
   - Tek kart olarak göster

10. **Besin değeri kartı (100gr başına)** (1 saat)
    - `factory_recipes.nutritionFacts` kullan (AI hesaplar)
    - Manuel tetikleme butonu: `/calculate-nutrition`

### ALT SPRINT R-5D: Muhasebe Entegrasyonu (2 saat)
**Pilot sonrası — Sprint I**

11. **Üretim partisi → muhasebe kaydı**
12. **Aylık COGS raporu**
13. **Fiyatlandırma rehberi UI**

### ALT SPRINT R-5E: Kiosk Üretim UI (3 saat)
**Pilot sonrası — Sprint I**

14. **Batch maliyet göstergesi kiosk'ta**
15. **Adım adım kontrollü akış (checklist)**
16. **Fire otomatik hesap**

---

## 🎯 Pilot İçin Kritik Öncelik

| Alt Sprint | Pilot Kritikliği | Süre | Kim İçin |
|---|---|---|---|
| **R-5A** (Malzeme/adım düzenleme) | 🔴 ŞART | 3 saat | RGM + Sema |
| **R-5B** (Maliyet sistemi) | 🟠 İyi olur | 4 saat | Mahmut + Aslan |
| **R-5C** (Alerjen UI) | 🟡 Sonra | 2 saat | Sema + müşteri |
| **R-5D** (Muhasebe) | 🟢 Pilot sonrası | 2 saat | Mahmut |
| **R-5E** (Kiosk üretim) | 🟢 Pilot sonrası | 3 saat | Üretim ekibi |

---

## 💡 Optimizasyon Önerileri

### 1. Tek Reçete Sistemi (Mimari)
**Sorun:** `product_recipes` + `factory_recipes` paralel.
**Öneri:** `factory_recipes` kazansın, `product_recipes` deprecate.
- Migration: product_recipes → factory_recipes veri taşıma
- `product_recipes` tablosu READ-ONLY (eski referans için)
- Tüm endpoint'ler factory_recipes'e yönlendirilir.

### 2. Maliyet Hesaplama Caching
**Sorun:** Her sayfa açılışında hesaplama yavaş olabilir.
**Öneri:** `factory_recipes.costLastCalculated` kullan, 24 saatte bir cache invalidate.
- Sadece hammadde fiyatı değişince trigger yeniden hesap
- Batch endpoint: `POST /api/factory/recipes/recalc-all` (gece cron)

### 3. Versiyonlama Otomasyonu
**Sorun:** `factory_recipe_versions` boş, versiyonlama manuel.
**Öneri:** Her kayıt sırasında snapshot al:
```typescript
// recipe updated event
INSERT INTO factory_recipe_versions
SELECT *, gen_random_uuid() as snapshot_id FROM factory_recipes WHERE id = ?;
```

### 4. Keyblend Güvenlik
**Sorun:** Keyblend gizli formül ama malzeme listesinde adı görünebilir.
**Öneri:** `ingredientType='keyblend'` olan satırlar sadece RGM + şef görür:
- Diğer roller "Gizli karışım #1" gösterir
- Admin panel: hangi reçetede keyblend var?

### 5. Fire Tolerans Uyarıları
**Sorun:** Üretimde fire %8 çıktı, ama sistem sessiz.
**Öneri:** Batch kaydı sırasında:
```
if fire > wasteTolerancePct:
  createNotification(target=fabrika_mudur, type="fire_aşımı")
```

### 6. Reçete-Ürün Çift Yönlü Senkronizasyon
**Sorun:** Reçete değişince `factory_products.suggestedPrice` güncellenmiyor.
**Öneri:** Trigger:
```
recipe.unitCost changed → product.suggestedPrice = unitCost * (1 + targetMargin)
→ Aslan'a "Önerilen fiyat güncellendi, onayla" bildirim
```

### 7. Bulk İşlemler
**Sorun:** 185 hammadde, her birini tek tek güncellemek yorucu.
**Öneri:**
- Bulk fiyat import Excel (Samet ayda 1 günceller)
- Bulk reçete maliyet recalc
- Bulk alerjen verify (Sema)

---

## 🔴 Kritik Kararlar — Aslan'a Sorulacak

### 1. Paralel Reçete Sistemi Ne Olacak?
- A) `product_recipes` deprecate, `factory_recipes` kazansın (önerim)
- B) İkisi birlikte yaşasın, veri senkron tutulsun (karmaşık)
- C) `product_recipes` kazansın, `factory_recipes` silinsin (R-1/R-4 sprint'ini geri al)

### 2. Pilot İçin Ne Kadar Yapalım?
- A) Sadece R-5A (3 saat) → düzenleme/silme ekle, maliyet pilot sonrası
- B) R-5A + R-5B (7 saat) → maliyet dahil tam çözüm
- C) Hepsi (12 saat) → pilot gecikebilir

### 3. Maliyet Formülü Doğru mu?
Mevcut öneri:
```
rawMaterialCost = Σ(ingredient.amount × rawMaterial.currentUnitPrice)
laborCost = requiredWorkers × productionTimeMinutes × avgHourlyWage
energyCost = equipmentKwh × kwhPrice + waterConsumptionLt × waterPrice
batchCost = rawMaterialCost + laborCost + energyCost + overhead
unitCost = batchCost / (baseBatchOutput × multiplier)
```

Mahmut'un onaylaması gerek.

### 4. Kim Fiyat Günceller?
- A) Samet sadece `raw_materials.current_unit_price` (önerim)
- B) Samet + Mahmut ortak
- C) Faturadan otomatik

---

## 📊 Etki Özeti

| Alan | Şu An | R-5A sonrası | R-5A+B sonrası |
|---|---|---|---|
| RGM reçete düzenleme | ❌ | ✅ | ✅ |
| Sema alerjen girişi | ❌ | ❌ | ❌ (R-5C gerek) |
| Samet fiyat trigger | ❌ | ❌ | ✅ |
| Mahmut COGS | ❌ | ❌ | ✅ |
| Kiosk maliyet | ❌ | ❌ | ⚠️ (R-5E gerek) |
| Pilot başlayabilir | 🟡 | ✅ | ✅ |

---

**Hazırlayan:** Claude
**Sonraki adım:** Aslan 4 kararı verir → Sprint R-5 başlar
