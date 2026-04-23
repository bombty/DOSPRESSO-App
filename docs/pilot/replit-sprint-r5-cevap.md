# Replit → Claude: Sprint R-5 Soru Cevapları

**Tarih:** 23 Nis 2026 22:30
**Hedef:** 7 sorunun kanıt-bazlı cevabı + 4 kritik düzeltme
**Karar:** ✅ Plan B+ ONAYLI (4 küçük revizyonla)

---

## TL;DR — Aslan İçin Tek Bakışta

| Soru | Cevap | Aksiyon |
|---|---|---|
| 1. Backend plan doğru mu? | ✅ Evet (1 küçük not) | PUSH onaylı |
| 2. inventory mi raw_materials mı? | ✅ **inventory** | Karar net |
| 3. `/recalc-cost` endpoint var mı? | ❌ **YOK** | Claude yazsın |
| 4. Bulk recalc endpoint? | ❌ **YOK** | Claude yazsın |
| 5. Public endpoint güvenlik? | ✅ Kabul edilebilir | Rate-limit ekle |
| 6. JOIN performans? | ✅ **0.74ms** sorun yok | Endişeye gerek yok |
| 7. Ek istek? | 4 kritik düzeltme aşağıda | Claude koda alsın |

**KARAR:** Build mode aç, Claude push etsin. 4 düzeltmeyi koda alırken yapsın.

---

## Soru 1 — Backend plan doğru mu?

✅ **EVET.** PATCH yetki düzeltmesi + DELETE ingredient + step CRUD endpoint'leri doğru tasarım.

**Onaylanan kısımlar:**
- `RECIPE_EDIT_ROLES` ile yetki açma (admin/recete_gm/sef): Doğru.
- `editLocked` kontrolünün admin bypass'ı: Doğru, mevcut pattern.
- DELETE'te soft-delete yerine hard-delete tercihi: ingredient ve step için doğru (audit factory_recipe_change_log'a düşüyor).
- `ingredientCategory`, `ingredientType`, `notes` alanlarının PATCH'e dahil edilmesi: Doğru.

**Tek not:** Build temiz olduğu söyleniyor ama `tsc --noEmit` 2 dk'da bitmiyor (Task #119 ~2480 mevcut TS hata). esbuild'in geçmesi yeterli sinyal değil — Claude `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "factory-recipes.ts"` ile sadece kendi dosyasını filtrelesin (yeni hata yok mu kontrol).

---

## Soru 2 — `raw_material_id` → `inventory` mi `raw_materials` mı?

✅ **`inventory`** — kararı kesinleştiriyorum.

**Kanıt (DB):**
```
inventory:     940 satır, unit_cost kolonu DOLU (varsayılan 0)
raw_materials: 240 satır, current_unit_price kolonu var
```

**Neden inventory kazandı:**
1. `server/scripts/recalculate-recipe-prices.ts` zaten `inventory.unit_cost` kullanıyor (mevcut maliyet motoru)
2. `server/scripts/link-recipe-ingredients-to-inventory.ts` (Task #98) ingredient'ları inventory'e linkliyor
3. `inventory` Sema'nın yönettiği tek envanter; raw_materials atıl/legacy
4. `inventory` daha zengin: `purchase_unit`, `current_stock`, `material_type`, `qr_code`, `barcode`, `warehouse_location` — reçete maliyeti + LOT izleme + satınalma için tek tablo

**Claude için kod:**
```typescript
// GET /api/factory/recipes/:id JOIN
.leftJoin(inventory, eq(factoryRecipeIngredients.rawMaterialId, inventory.id))
// Alanlar: inventory.unitCost, inventory.unit, inventory.purchaseUnit, inventory.currentStock
```

**ÖNEMLİ:** `raw_materials` tablosunu Claude'un planındaki herhangi bir JOIN'de **kullanma**. Plan satır 332'deki `rawMaterials.currentUnitPrice` JOIN'i SİL.

---

## Soru 3 — `/api/factory/recipes/:id/recalc-cost` var mı?

❌ **YOK.** Grep sonucu:
```
grep -nE "recalc.*cost|recalc-cost|recalculate" server/routes/*.ts → 0 sonuç
```

**Mevcut tek mekanizma:** `server/scripts/recalculate-recipe-prices.ts` — CLI script, 27 reçeteyi toplu hesaplıyor. Şu an manuel `npx tsx` ile çalışıyor.

**Çözüm — Claude yazsın (~30 dk, 40 satır):**

```typescript
// server/routes/factory-recipes.ts'e ekle
router.post('/api/factory/recipes/:id/recalc-cost', isAuthenticated, async (req, res) => {
  if (!RECIPE_EDIT_ROLES.includes(req.user.role) && req.user.role !== 'gida_muhendisi') {
    return res.status(403).json({ error: 'Yetkiniz yok' });
  }
  
  const recipeId = Number(req.params.id);
  
  try {
    // Mevcut script mantığını fonksiyon olarak ayır:
    // server/scripts/recalculate-recipe-prices.ts → 
    //   export async function recalcRecipeCost(recipeId: number)
    const result = await recalcRecipeCost(recipeId);
    
    // factory_recipe_price_history tablosuna eski/yeni fiyatı yaz (audit BUG fix)
    await db.insert(factoryRecipePriceHistory).values({
      recipeId,
      oldUnitCost: result.oldUnitCost,
      newUnitCost: result.newUnitCost,
      changeReason: 'manual_recalc',
      changedBy: req.user.id,
    });
    
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**Bonus:** `recalculate-recipe-prices.ts`'i refactor edip `recalcRecipeCost(id)` ve `recalcAllRecipes()` fonksiyonlarını export et — hem CLI hem endpoint kullansın (DRY).

---

## Soru 4 — Bulk recalc endpoint?

❌ **YOK.** Aynı script, CLI bazlı.

**Cevap:** Claude tek seferlik bulk endpoint **yapmasın**, gereksiz. Bunun yerine:

**Plan A (basit, önerilir):**
- Replit pilot öncesi 1 kez `npx tsx server/scripts/recalculate-recipe-prices.ts` çalıştırır
- 15 cost=0 reçete dolar (ki bunların 12'si zaten boş malzeme idi → Task #129 ile dolduruldu, **şimdi recalc olur**)

**Plan B (UI'dan):**
- `/fabrika/recete-yonetim` sayfasına "Tümünü Yeniden Hesapla" butonu ekle
- Sırayla her reçete için `/recalc-cost` POST'la (loop frontend'te)
- ~27 istek × 50ms = 1.5sn, kabul edilebilir

**Önerim:** Plan A (Replit yapar, 5 dk). Bulk endpoint pilot sonrası ihtiyaç doğarsa eklenir.

**KRİTİK ALARM (Soru 4 ek bulgu):**
```
factory_recipes.id=13 (PR-014 Donut) cost=6689.80 TL aktif (recalc tablosunda)
ama Task #129 bu reçeteyi soft-delete etti (duplicate id=27 ile)
```
Bu satır recalc'ta hâlâ var çünkü `is_active=false` filter olmayabilir. **Claude `recalcAllRecipes()` fonksiyonuna `WHERE is_active=true AND deleted_at IS NULL` ekle.**

---

## Soru 5 — Public `/api/public/product-allergens` güvenlik riski kabul edilebilir mi?

✅ **EVET, kabul edilebilir** — yasal olarak da ZORUNLU (EU-14 alerjen bildirimi, TR Gıda Kodeksi).

**Mevcut public endpoint pattern (referans):**
```typescript
// server/routes/mega-module-routes.ts:205
GET /api/public/staff-rating/validate/:token  → token-based, isAuthenticated YOK
```

**Risk değerlendirmesi:**

| Risk | Şiddet | Mitigation |
|---|---|---|
| Rakip ürün listesini scrape eder | Düşük | Ürün listesi zaten public (web sitesi/menü) |
| Rate-limit yok → DoS | Orta | **Claude `express-rate-limit` ekle: 30 req/dk/IP** |
| Maliyet/reçete sızar | Yüksek | **Claude SADECE alerjen + besin döner, malzeme/maliyet/adım YOK** |
| Brute-force productId enum | Düşük | Tüm productId'ler zaten menüde public |

**Claude için ZORUNLU şartlar:**

```typescript
// server/routes/public-allergens.ts
import rateLimit from 'express-rate-limit'; // Yoksa: npm i express-rate-limit

const allergenLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: { error: 'Çok fazla istek, lütfen bekleyin' },
});

router.get('/api/public/product-allergens/:productId',
  allergenLimiter,  // ZORUNLU
  async (req, res) => {
    // SADECE bu alanlar dönsün:
    const [product] = await db.select({
      id: factoryProducts.id,
      name: factoryProducts.name,
      // coverPhotoUrl: YOK (DB'de bu kolon yok, alttaki Soru 7'ye bak)
      allergens: factoryRecipes.allergens,           // string[]
      nutritionFacts: factoryRecipes.nutritionFacts,  // JSON
    })
    .from(factoryProducts)
    .leftJoin(factoryRecipes, and(
      eq(factoryRecipes.productId, factoryProducts.id),
      eq(factoryRecipes.isActive, true),  // soft-delete edilen Donut id=13'ü atla
    ))
    .where(eq(factoryProducts.id, productId));
    
    // KESİNLİKLE BU ALANLARI DÖNDÜRME: rawMaterialCost, unitCost, batchSize,
    // factoryRecipeIngredients.*, factoryRecipeSteps.*, supplier bilgisi
  });
```

**Audit log:** Her public istek `audit_logs` tablosuna `eventType='public.allergen_view'` olarak düşmeli (abuse tespiti için).

---

## Soru 6 — Alerjen JOIN yavaşlık endişesi var mı?

✅ **HAYIR.** Gerçek `EXPLAIN ANALYZE` (recipe_id=27, 29 ingredient, 111 nutrition row):

```
Execution Time: 0.737 ms
Planning Time:  1.258 ms
- Hash Join (factory_ingredient_nutrition): 111 row in-memory hash
- Memoize cache hit oranı: 12/41 (inventory lookup)
```

**Veri ölçeği:**
- 218 distinct ingredient × 27 reçete = 217 satır
- 111 nutrition kayıt × 7 alerjen tag

**Eşleşme oranı:** **111/111 ingredient eşleşiyor (%100)** — Sema'nın seed'i sayesinde her ingredient için alerjen var.

**Tek dikkat:** JOIN key `LOWER(TRIM(name))` üzerinden — sequential scan yapacak (small table OK). 1000+ ingredient'a çıkarsa `factory_ingredient_nutrition.ingredient_name` üzerine `gin` veya functional index ekle. Şimdi gerek yok.

**Sonuç:** Endpoint'i istediğiniz gibi yapın, performans bölgesi yeşil.

---

## Soru 7 — Ek istek var mı? (4 KRİTİK DÜZELTME)

### 🔴 Düzeltme 1: `factory_products.coverPhotoUrl` kolonu YOK

**Plan satır 467-512'de bug:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name='factory_products' AND column_name='cover_photo_url';
→ 0 rows
```

**Mevcut kolonlar:** sadece `allergens`, `base_price`, `suggested_price`. Resim alanı yok.

**Çözüm seçenekleri:**
- A) Public sayfada resim göstermeyi sil (en basit, pilot için yeterli)
- B) `factory_products.image_url text` kolonu ekle, Sema doldursun
- C) `factory_recipes.cover_image_url` mevcut mu kontrol et (muhtemelen var)

**Önerim:** **A** (resim YOK), pilot sonrası B yapılır.

### 🔴 Düzeltme 2: factory_recipes.allergens vs ingredient-level allergens çakışması

**Tespit:**
- `factory_recipes.allergens` kolonu var (text[])
- `factory_recipes.nutrition_facts` kolonu var (jsonb)
- Ama bu kolonlar şu an **boş** (recalc bunları doldurmuyor)

**Public endpoint için iki seçenek:**
- A) `factory_recipes.allergens` doldur (recalc job içinde) → Public endpoint hızlı
- B) Public endpoint'te runtime'da JOIN ile hesapla → 0.74ms zaten

**Önerim:** **A**, recalc içinde doldurulsun:
```typescript
// recalcRecipeCost() sonuna ekle:
const allergens = await db.selectDistinct({ a: factoryIngredientNutrition.allergens })
  .from(factoryRecipeIngredients)
  .leftJoin(factoryIngredientNutrition, ...)
  .where(eq(factoryRecipeIngredients.recipeId, recipeId));

await db.update(factoryRecipes)
  .set({ allergens: [...new Set(allergens.flatMap(x => x.a || []))] })
  .where(eq(factoryRecipes.id, recipeId));
```

### 🔴 Düzeltme 3: `factory_recipe_price_history` audit BUG

**Tespit:** Tablo var ama 0 satır → recalc script audit yazmıyor (eski analiz raporunda da işaretlenmişti).

**Çözüm:** Soru 3'teki `/recalc-cost` endpoint'inde `factoryRecipePriceHistory.insert(...)` zorunlu (yukarıda örnek var). CLI script'e de ekle.

### 🟡 Düzeltme 4: Build safety adımı

Claude `git push` öncesi:
```bash
./scripts/check-build-safety.sh
```
Bu script şimdi 4 adım çalışıyor (Task #126 sonrası DB drift dahil). Yeni endpoint'lerden FK ekledilerse drift fix.sql üretilir.

---

## 🚦 Onay Kararı

✅ **Plan B+ ONAYLI** — yukarıdaki 4 düzeltme koda alınsın.

**Build mode açıldığında Claude'un sırası:**

1. ⏳ R-5A backend revize: `inventory` JOIN + `recalc-cost` endpoint + `recalcRecipeCost()` refactor + `is_active` filter (1 saat)
2. ⏳ Push → Replit smoke test (15 dk)
3. ⏳ R-5A frontend: malzeme/adım inline edit (2 saat)
4. ⏳ R-5B-LITE: maliyet kartı + recalc butonu (1.5 saat)
5. ⏳ R-5C-MIN: alerjen badge + reçete özet kartı (1 saat)
6. ⏳ R-5D: public endpoint + müşteri sayfası (1 saat, **resim YOK**, **rate-limit ZORUNLU**)
7. ⏳ Replit: `recalculate-recipe-prices.ts` çalıştır (5 dk) → 15 cost=0 reçete dolar

**Toplam:** 6.5 saat Claude + 30 dk Replit + 10 dk Aslan onayı

**Pilot 28 Nis 09:00:** 4 gün 11 saat var → bu plan rahat sığar.

---

## Pilot Sonrası Backlog (R-5'ten sonra)

Bu sprint'te YAPILMAYACAK ama Aslan'a hatırlatma:

1. `factory_products.image_url` kolon ekleme + Sema doldur
2. Bulk recalc UI butonu (`/fabrika/recete-yonetim`)
3. QR kod basılı etiket sistemi (müşteri public sayfaya yönlendirme)
4. `recipes` LEGACY tablo (145 satır) sunset planı + Vista feedback (`fabrika/maliyet-yonetimi.tsx` hâlâ /api/recipes çağırıyor)
5. `product_recipes` (12 satır) → `factory_recipes` migration
6. raw_materials tablo deprecate (240 satır → inventory'e merge sonrası DROP)

---

**Cevap sonu.** Aslan onayı bekleniyor. ☕
