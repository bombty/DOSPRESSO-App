# Sprint R-5 — Pilot Öncesi Reçete Sistemi Tamamlama

**Tarih:** 23 Nis 2026
**Pilot:** 28 Nis Pazartesi 09:00 (5 gün kaldı)
**Prensip:** Pilot EKSİKSİZ başlasın — R-5A, R-5B, R-5C tamamlanır

---

## 🎯 Aslan Direktifleri (23 Nis)

1. ✅ **Şube-Fabrika izolasyonu MUTLAK** — Paralel sistem birleştirilmeyecek
2. ✅ **Pilot eksiksiz başlasın** — Maliyet + alerjen + UI dahil
3. ✅ **Samet fiyat günceller** (satınalma tek yetkili)
4. ✅ **Mahmut maliyet formülüne danışılır** (onay gerek, değişiklik yapmaz)
5. ✅ **Admin her zaman tam yetkili**

---

## 📋 Sprint Kapsamı — 3 Alt Parça (Pilot Öncesi)

### ALT SPRINT R-5A: UI Düzeltme (3 saat)

**Hedef:** RGM + Sema reçeteyi tam düzenleyebilir.

#### Backend (1 saat)
- `PATCH /api/factory/recipes/:id/ingredients/:ingId` — **VAR** (test edilmeli)
- `DELETE /api/factory/recipes/:id/ingredients/:ingId` — **YENİ**
- `PATCH /api/factory/recipes/:id/steps/:stepId` — **YENİ**
- `DELETE /api/factory/recipes/:id/steps/:stepId` — **YENİ**
- Yetki kontrolü: `RECIPE_EDIT_ROLES` = `["admin", "recete_gm", "sef"]`

#### Frontend (2 saat)
**`fabrika-recete-duzenle.tsx`:**
- Her malzeme satırında:
  - Inline edit (miktar + birim)
  - ✏️ Edit butonu (kategori değiştir)
  - 🗑️ Sil butonu (onay dialog ile)
- Her adım satırında:
  - ✏️ Edit butonu (title + content + timer + tips)
  - 🗑️ Sil butonu (onay dialog ile)
  - ⋮⋮ Drag-handle (sürükle-bırak sıralama)

**Teknik detay:**
- `useMutation` pattern (TanStack Query)
- Optimistic update (UI önce, API sonra)
- Toast bildirim (başarı/hata)

---

### ALT SPRINT R-5B: Maliyet Sistemi (4 saat)

**Hedef:** Reçete maliyeti doğru hesaplanır, satınalma fiyat değiştirince otomatik güncellenir.

#### 1. FK Düzeltmesi (30 dk)
**Sorun:** `factoryRecipeIngredients.rawMaterialId` → `inventory.id` (yanlış)
**Çözüm:** `raw_materials.id`'ye referans değiştir

```sql
-- scripts/pilot/19-recipe-fk-fix.sql
ALTER TABLE factory_recipe_ingredients
DROP CONSTRAINT IF EXISTS factory_recipe_ingredients_raw_material_id_fkey;

ALTER TABLE factory_recipe_ingredients
ADD CONSTRAINT factory_recipe_ingredients_raw_material_id_fkey
FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id) ON DELETE SET NULL;

-- Mevcut kayıtlarda best-effort match
UPDATE factory_recipe_ingredients fri
SET raw_material_id = rm.id
FROM raw_materials rm
WHERE LOWER(TRIM(fri.name)) = LOWER(TRIM(rm.name))
  AND fri.raw_material_id IS NULL;
```

#### 2. Yetki Güncellemesi (30 dk)
**Samet'e `raw_materials` UPDATE yetkisi:**

`server/routes/raw-materials.ts` (veya satınalma routes):
- `satinalma` rolü `current_unit_price`, `last_purchase_price` update edebilir
- `admin` zaten tam yetkili
- Diğer roller READ-ONLY

#### 3. Maliyet Hesaplama Servisi (1.5 saat)

**Dosya:** `server/services/factory-recipe-cost-service.ts` (YENİ)

```typescript
export async function calculateFactoryRecipeCost(recipeId: number) {
  // 1. Malzemeleri + hammadde fiyatlarını çek
  const ingredients = await db
    .select({
      amount: factoryRecipeIngredients.amount,
      unit: factoryRecipeIngredients.unit,
      rawMaterialPrice: rawMaterials.currentUnitPrice,
      rawMaterialUnit: rawMaterials.unit,
    })
    .from(factoryRecipeIngredients)
    .leftJoin(rawMaterials, eq(factoryRecipeIngredients.rawMaterialId, rawMaterials.id))
    .where(eq(factoryRecipeIngredients.recipeId, recipeId));

  // 2. Hammadde maliyeti hesapla (birim dönüşümü dahil)
  const rawMaterialCost = ingredients.reduce((sum, ing) => {
    const price = Number(ing.rawMaterialPrice || 0);
    const amount = Number(ing.amount);
    // Birim eşleşmesi (gr/kg, ml/lt dönüşümü)
    const converted = convertUnit(amount, ing.unit, ing.rawMaterialUnit);
    return sum + (converted * price);
  }, 0);

  // 3. Reçete metadata
  const [recipe] = await db.select().from(factoryRecipes)
    .where(eq(factoryRecipes.id, recipeId));

  // 4. İşçilik (Mahmut onaylı formül)
  const avgHourlyWage = await getAverageHourlyWage(); // config'ten
  const laborCost = (recipe.requiredWorkers || 1)
                  * (recipe.productionTimeMinutes || 0) / 60
                  * avgHourlyWage;

  // 5. Enerji (Mahmut onaylı formül)
  const kwhPrice = await getConfig("energy_kwh_price"); // 3.5 TL/kWh varsayılan
  const waterPrice = await getConfig("water_lt_price"); // 0.08 TL/lt varsayılan
  const energyCost = Number(recipe.equipmentKwh || 0) * Number(kwhPrice)
                   + Number(recipe.waterConsumptionLt || 0) * Number(waterPrice);

  // 6. Genel gider (overhead, %10 default)
  const overheadPct = await getConfig("overhead_percentage"); // 10
  const overhead = (rawMaterialCost + laborCost + energyCost) * (Number(overheadPct) / 100);

  // 7. Toplam batch maliyeti
  const totalBatchCost = rawMaterialCost + laborCost + energyCost + overhead;

  // 8. Birim maliyet
  const unitCost = totalBatchCost / (recipe.baseBatchOutput || 1);

  // 9. DB'ye yaz
  await db.update(factoryRecipes)
    .set({
      rawMaterialCost: rawMaterialCost.toFixed(4),
      laborCost: laborCost.toFixed(4),
      energyCost: energyCost.toFixed(4),
      totalBatchCost: totalBatchCost.toFixed(4),
      unitCost: unitCost.toFixed(4),
      costLastCalculated: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(factoryRecipes.id, recipeId));

  // 10. Fiyat history (audit)
  await db.insert(factoryRecipePriceHistory).values({
    recipeId,
    rawMaterialCost: rawMaterialCost.toFixed(4),
    totalBatchCost: totalBatchCost.toFixed(4),
    unitCost: unitCost.toFixed(4),
    changedAt: new Date(),
    triggerSource: 'manual', // veya 'raw_material_price_change'
  });

  return { rawMaterialCost, laborCost, energyCost, overhead, totalBatchCost, unitCost };
}
```

**Endpoint'ler:**
- `POST /api/factory/recipes/:id/recalc-cost` — Manuel tetikleme (admin/recete_gm)
- `POST /api/factory/recipes/recalc-all` — Bulk recalc (admin only, cron)

#### 4. Fiyat Trigger (1 saat)

**`server/services/raw-material-price-hook.ts` (YENİ):**

```typescript
// raw_materials UPDATE sonrası tetiklenir
export async function onRawMaterialPriceChange(
  rawMaterialId: number,
  oldPrice: number,
  newPrice: number,
  changedBy: string
) {
  // Bu hammaddeyi kullanan tüm reçeteleri bul
  const affectedRecipes = await db
    .selectDistinct({ recipeId: factoryRecipeIngredients.recipeId })
    .from(factoryRecipeIngredients)
    .where(eq(factoryRecipeIngredients.rawMaterialId, rawMaterialId));

  // Her birini yeniden hesapla
  for (const { recipeId } of affectedRecipes) {
    await calculateFactoryRecipeCost(recipeId);
  }

  // Mr. Dobody bildirim (eğer %10+ değişmişse)
  const changePct = Math.abs((newPrice - oldPrice) / oldPrice * 100);
  if (changePct >= 10) {
    await notifyRawMaterialPriceChange({
      rawMaterialId,
      oldPrice,
      newPrice,
      changePct,
      affectedRecipeCount: affectedRecipes.length,
      changedBy,
    });
  }
}
```

#### 5. Maliyet UI (1 saat)

**`fabrika-recete-duzenle.tsx` yeni kart:**

```tsx
<Card className="mb-4">
  <CardHeader>
    <CardTitle>💰 Maliyet Dökümü</CardTitle>
    <Button size="sm" onClick={recalcMutation.mutate}>
      <RefreshCw /> Yeniden Hesapla
    </Button>
  </CardHeader>
  <CardContent>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Hammadde:</span>
        <span className="font-mono">{recipe.rawMaterialCost} TL</span>
      </div>
      <div className="flex justify-between">
        <span>İşçilik:</span>
        <span className="font-mono">{recipe.laborCost} TL</span>
      </div>
      <div className="flex justify-between">
        <span>Enerji:</span>
        <span className="font-mono">{recipe.energyCost} TL</span>
      </div>
      <div className="flex justify-between font-bold border-t pt-2">
        <span>Toplam Batch:</span>
        <span className="font-mono">{recipe.totalBatchCost} TL</span>
      </div>
      <div className="flex justify-between text-lg font-bold">
        <span>Birim Maliyet:</span>
        <span className="font-mono text-primary">{recipe.unitCost} TL</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Son hesap: {formatDate(recipe.costLastCalculated)}
      </p>
    </div>
  </CardContent>
</Card>
```

**Malzeme satırlarına fiyat kolonu ekle:**
```tsx
<span className="text-xs text-muted-foreground">
  {ing.rawMaterialPrice} TL/{ing.rawMaterialUnit}
  → {(ing.amount * ing.rawMaterialPrice).toFixed(2)} TL
</span>
```

---

### ALT SPRINT R-5C: Alerjen UI (2 saat)

**Hedef:** Sema alerjen görür, gerekirse günceller. Müşteri soru sorarsa cevap verilebilir.

#### 1. Malzeme satırında alerjen badge (30 dk)

```tsx
// factory_ingredient_nutrition JOIN ile
<div className="flex gap-1">
  {ing.allergens?.map(a => (
    <Badge variant="destructive" className="text-[10px]">
      {ALLERGEN_ICONS[a]} {a}
    </Badge>
  ))}
</div>
```

#### 2. Reçete toplam alerjen kartı (30 dk)

```tsx
<Card>
  <CardTitle>⚠️ Alerjen Özeti</CardTitle>
  <CardContent>
    <div className="flex gap-2 flex-wrap">
      {uniqueAllergens.map(a => (
        <Badge variant="destructive">{ALLERGEN_LABELS[a]}</Badge>
      ))}
    </div>
    <p className="text-xs mt-2 text-muted-foreground">
      Kaynak: {ingredientsWithAllergens.length} malzemeden türetildi
    </p>
  </CardContent>
</Card>
```

#### 3. Alerjen inline edit (1 saat)

Sema direkt malzeme satırından alerjen ekleyebilir:
- Click → dropdown (8 alerjen)
- Multiple select
- Save → `factory_ingredient_nutrition` UPDATE
- Sonra reçete toplam alerjen otomatik güncellenir

---

## 📋 Alt Sprint R-5D, R-5E (Pilot Sonrası)

**R-5D Muhasebe Entegrasyonu (2 saat)** — Sprint I:
- Üretim partisi → muhasebe kaydı
- Aylık COGS raporu
- Fiyatlandırma rehberi

**R-5E Kiosk Üretim UI (3 saat)** — Sprint I:
- Batch maliyet göstergesi
- Adım checklist
- Fire otomatik hesap

---

## ⏱️ Zamanlama

**Claude yapacak (bu gece + yarın):**

| Saat | İş | Süre |
|---|---|---|
| **Bu gece 22:00-01:00** | R-5A: UI düzenleme (backend + frontend) | 3 saat |
| **Yarın sabah 09:00-13:00** | R-5B: Maliyet sistemi | 4 saat |
| **Yarın öğle 14:00-16:00** | R-5C: Alerjen UI | 2 saat |
| **Yarın akşam 17:00-18:00** | Test + commit + push | 1 saat |

**Toplam: 10 saat (bugün + yarın)**

**Replit yapacak (yarın akşam):**
- 19-recipe-fk-fix.sql çalıştır
- Build + smoke test
- Maliyet hesaplama bulk tetikle (27 reçete)

---

## 🔴 Aslan'dan Son Onay Bekleyen

### 1. Maliyet Formülü (Mahmut'a danış)

```
rawMaterialCost = Σ(malzeme × hammadde birim fiyatı)
laborCost = işçi sayısı × üretim süresi (saat) × ortalama saatlik ücret
energyCost = kWh × kWh fiyatı + su lt × su fiyatı
overhead = (hammadde + işçilik + enerji) × %10 (genel gider)
batchCost = rawMat + labor + energy + overhead
unitCost = batchCost / baz batch çıktı
```

**Parametreler (DB'ye eklenmeli, Mahmut onaylı):**
- `energy_kwh_price`: 3.50 TL/kWh (sanayi tarife)
- `water_lt_price`: 0.08 TL/lt
- `overhead_percentage`: 10
- `average_hourly_wage`: 205 TL/saat (2026 ortalama)

**Mahmut'a sor:** Bu değerler doğru mu? Overhead %10 mu, yoksa başka bir oran mı?

### 2. Satınalma Yetki Matrisi

**Önerim:**
```
Rol         | raw_materials UPDATE | factory_recipes cost | factory_products price
-----------|----------------------|----------------------|----------------------
admin      | ✅ Tam yetki         | ✅ Tam yetki         | ✅ Tam yetki
satinalma  | ✅ Fiyat kolonları   | ❌ Sadece okur       | ❌ Okur
recete_gm  | ❌ Okur              | ✅ Tetikleyebilir    | ✅ Öner
muhasebe   | ❌ Okur              | ❌ Sadece okur       | ❌ Okur (raporlama)
ceo/cgo    | ❌ Okur              | ❌ Sadece okur       | ❌ Okur
```

**Aslan'a sor:** Bu matrix doğru mu?

### 3. Fiyat Değişiklik Trigger

Samet fiyat günceller → **otomatik mi, manuel mi** reçete maliyeti güncellensin?

- **A) Otomatik + Mr. Dobody bildirimi** (önerim) — Samet günceller, sistem hemen recalc eder, %10+ değişimde RGM'ye bildirim
- **B) Manuel** — Samet günceller, sonra Aslan/RGM "recalc all" butonuna basar
- **C) Geceleme cron** — Samet günceller, ertesi gün 03:00'de toplu recalc

---

## 🎯 Başlamaya Hazır mıyım?

Aslan'dan **3 onay** bekliyorum:

1. **Maliyet formülü Mahmut'a uygun mu?** (kWh 3.50, su 0.08, overhead %10, saatlik 205)
2. **Yetki matrisi kabul mü?** (satınalma sadece fiyat, muhasebe sadece okur)
3. **Trigger A/B/C?** (otomatik / manuel / cron)

Bu 3 onay gelince hemen R-5A'ya başlıyorum, 3 saat sonra malzeme düzenleme hazır.
