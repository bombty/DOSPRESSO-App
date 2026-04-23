# Sprint R-5 Uygulama Raporu — Replit Onayı İçin

**Tarih:** 23 Nis 2026 22:00
**Pilot:** 28 Nis 09:00 (4 gün 11 saat kaldı)
**Plan:** B+ (Claude + Replit ortak kararı, 7 saat toplam iş)
**Durum:** Backend R-5A %50 yapıldı → STOP → Rapor önce

---

## 📋 Özet

Claude kod yazmaya başladı (R-5A backend, PATCH/DELETE endpoint'ler) ama önce Replit'in onayını almak için durdu. Aşağıda:

1. **Şu ana kadar yapılanlar** (geri alınabilir, push edilmedi)
2. **Yapılacak tüm işler** (dosya + satır bazlı)
3. **Kim ne yapacak** (Claude vs Replit ayrımı)
4. **Test + doğrulama planı**
5. **Risk + rollback planı**

---

## ✅ ŞU ANA KADAR YAPILANLAR (LOCAL, PUSH EDİLMEDİ)

### Değişiklik 1: `server/routes/factory-recipes.ts`

**Yapılan:** Mevcut PATCH ingredient endpoint'inin yetkisi düzeltildi + DELETE ingredient + step CRUD endpoint'leri eklendi.

#### Eski PATCH ingredient (sorunlu):
```typescript
const INGREDIENT_EDIT_ROLES = ["admin", "ceo", "gida_muhendisi"];
```

**Problem:** `recete_gm` ve `sef` dahil değil. Bu yüzden Aslan ekranda "düzenleyemiyorum" demişti.

#### Yeni (düzeltilmiş):
```typescript
if (!RECIPE_EDIT_ROLES.includes(req.user.role)) // admin, recete_gm, sef
```

**Ek kolonlar PATCH'e eklendi:** `ingredientCategory`, `ingredientType`, `notes`

#### Yeni Eklenen Endpoint'ler:

1. **`DELETE /api/factory/recipes/:recipeId/ingredients/:id`**
   - Yetki: `RECIPE_EDIT_ROLES` (admin, recete_gm, sef)
   - Kilit kontrolü: `factoryRecipes.editLocked = true` ise sadece admin silebilir
   - Return: `{ success: true, deletedId }`

2. **`POST /api/factory/recipes/:id/steps`** (tekil adım ekleme)
   - Mevcut bulk endpoint var ama tekil yok, UI için gerek
   - Otomatik stepNumber atama (son + 1)
   - Yetki kontrolü + kilit kontrolü

3. **`PATCH /api/factory/recipes/:recipeId/steps/:id`**
   - Adım başlık, içerik, timer, tips, sıra numarası güncelleme

4. **`DELETE /api/factory/recipes/:recipeId/steps/:id`**
   - Adım silme, kilit kontrolü

**Toplam backend:** ~160 satır yeni kod, 1 satır değişti (yetki).

**Build test:** ✅ `esbuild` temiz (1006ms), TypeScript hatası yok.

---

## 📋 YAPILACAKLAR — Tam Plan

### 🔴 ADIM 1: Backend Tamamlama (Yapıldı — onay bekliyor)

**Dosya:** `server/routes/factory-recipes.ts`
**Durum:** ✅ Yazıldı, build temiz, push bekliyor

**Test senaryoları (Replit yapmalı):**
```bash
# 1. PATCH ingredient (recete_gm olarak login)
curl -X PATCH http://localhost:5000/api/factory/recipes/1/ingredients/3 \
  -H "Cookie: connect.sid=..." \
  -d '{"amount": 1600, "notes": "test"}'
# Beklenen: 200 OK + updated row (önceden 403 verirdi)

# 2. DELETE ingredient
curl -X DELETE http://localhost:5000/api/factory/recipes/1/ingredients/3 \
  -H "Cookie: connect.sid=..."
# Beklenen: 200 {success: true, deletedId: 3}

# 3. POST step (tekil)
curl -X POST http://localhost:5000/api/factory/recipes/1/steps \
  -d '{"title": "Test adım", "content": "Test içerik"}'
# Beklenen: 200 OK + yeni step row (stepNumber otomatik)

# 4. PATCH + DELETE step — benzer
```

---

### 🔴 ADIM 2: Frontend UI (3 saat, henüz başlanmadı)

**Dosya:** `client/src/pages/fabrika-recete-duzenle.tsx`
**Mevcut:** 317 satır
**Değişecek:** ~150 satır değişecek, 80 satır eklenecek

#### 2.1 State Eklemeleri (10 dk)
```typescript
// Yeni state'ler
const [editingIngredientId, setEditingIngredientId] = useState<number | null>(null);
const [editingStepId, setEditingStepId] = useState<number | null>(null);
const [editBuffer, setEditBuffer] = useState<any>({});
```

#### 2.2 Malzeme Satırı — Inline Edit + Sil (1 saat)

**Mevcut (read-only, 7 satır):**
```tsx
<div className="flex items-center gap-2 py-1.5 border-b">
  <Badge>{ing.refId}</Badge>
  <span>{ing.name}</span>
  <span>{ing.amount} {ing.unit}</span>
  <Badge>{ing.ingredientCategory}</Badge>
</div>
```

**Yeni (düzenlenebilir, ~30 satır):**
```tsx
<div className="flex items-center gap-2 py-1.5 border-b group hover:bg-muted/30">
  {editingIngredientId === ing.id ? (
    // EDIT MODE
    <>
      <Input value={editBuffer.name} onChange={...} className="flex-1" />
      <Input type="number" value={editBuffer.amount} onChange={...} className="w-20" />
      <Select value={editBuffer.unit} onChange={...}>...</Select>
      <Button size="sm" variant="ghost" onClick={saveEdit}><Check /></Button>
      <Button size="sm" variant="ghost" onClick={cancelEdit}><X /></Button>
    </>
  ) : (
    // READ MODE
    <>
      <Badge variant="outline" className="font-mono text-xs">{ing.refId}</Badge>
      <span className="flex-1 text-sm">{ing.name}</span>
      <span className="text-sm font-mono font-bold">{ing.amount} {ing.unit}</span>
      <Badge variant="secondary" className="text-[10px]">{ing.ingredientCategory}</Badge>
      {/* YENİ: Hover'da görünen butonlar */}
      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => startEditing(ing)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => deleteIngredient(ing.id)}>
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </div>
    </>
  )}
</div>
```

**Mutation'lar:**
```typescript
const updateIngredientMutation = useMutation({
  mutationFn: (data: { id: number, patch: any }) =>
    apiRequest("PATCH", `/api/factory/recipes/${id}/ingredients/${data.id}`, data.patch),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
    toast({ title: "Malzeme güncellendi" });
    setEditingIngredientId(null);
  },
});

const deleteIngredientMutation = useMutation({
  mutationFn: (ingId: number) =>
    apiRequest("DELETE", `/api/factory/recipes/${id}/ingredients/${ingId}`),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
    toast({ title: "Malzeme silindi" });
  },
});
```

**Onay dialog (sil için):**
```tsx
const deleteIngredient = (ingId: number) => {
  if (confirm("Bu malzemeyi silmek istediğinize emin misiniz?")) {
    deleteIngredientMutation.mutate(ingId);
  }
};
```

#### 2.3 Adım Satırı — Inline Edit + Sil (1 saat)

**Aynı pattern** (malzemedeki gibi), 30 satır:
- Edit mode: title, content, timerSeconds, tips inputs
- Read mode: mevcut gösterim + ✏️ + 🗑️
- Dialog onay sil için

#### 2.4 Import'lar + Icon'lar (5 dk)
```typescript
// Mevcut
import { ChevronLeft, Save, Plus, Trash2, Lock, Unlock, GripVertical } from "lucide-react";
// Ekle:
import { Pencil, Check, X } from "lucide-react";
```

#### 2.5 Build Test (15 dk)
```bash
cd client && npm run build
# Beklenen: 0 error, warnings OK
```

#### 2.6 Manual Test Senaryoları (30 dk, Replit yapmalı)
- RGM olarak login → reçete düzenle
- Malzeme tıklayıp edit → kaydet
- Malzeme tıklayıp sil → onay → silindi
- Aynısı adımlar için
- Hatalı veri: amount negatif, boş title → validation çalışıyor mu?

---

### 🟠 ADIM 3: R-5B-LITE Maliyet UI (2 saat)

#### 3.1 API — Maliyet Dökümü Kartı İçin Endpoint Kontrolü

**Öncelikle kontrol:** `/api/factory/recipes/:id` endpoint'i hâlihazırda şu alanları döndürüyor mu?
- `rawMaterialCost`, `laborCost`, `energyCost`, `totalBatchCost`, `unitCost`, `costLastCalculated`

**Replit bu sorguyu yapmalı:**
```sql
SELECT id, name, raw_material_cost, labor_cost, energy_cost,
       total_batch_cost, unit_cost, cost_last_calculated
FROM factory_recipes
WHERE id = 1 LIMIT 1;
```

Eğer kolonlar null ise → recalc endpoint çalışmıyor demektir (ayrı iş, R-5B-REPLIT kısmında).

#### 3.2 Maliyet Kartı UI (1 saat)

**`fabrika-recete-duzenle.tsx`'e yeni kart ekle** (malzemelerden sonra):

```tsx
{!isNew && (
  <Card className="mb-4 border-primary/20">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          💰 Maliyet Dökümü
          {recipe.costLastCalculated ? (
            <Badge variant="default" className="text-xs">Güncel</Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">Hesaplanmadı</Badge>
          )}
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => recalcMutation.mutate()}
          disabled={recalcMutation.isPending}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${recalcMutation.isPending ? 'animate-spin' : ''}`} />
          Yeniden Hesapla
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-1.5 text-sm">
        <CostRow label="Hammadde" value={recipe.rawMaterialCost} />
        <CostRow label="İşçilik" value={recipe.laborCost} />
        <CostRow label="Enerji" value={recipe.energyCost} />
        <div className="border-t pt-1.5 mt-1.5">
          <CostRow label="Batch Toplam" value={recipe.totalBatchCost} bold />
        </div>
        <div className="text-lg font-bold text-primary">
          <CostRow label={`Birim (${recipe.outputUnit})`} value={recipe.unitCost} bold large />
        </div>
        {recipe.costLastCalculated && (
          <p className="text-xs text-muted-foreground pt-2">
            Son hesap: {new Date(recipe.costLastCalculated).toLocaleString("tr-TR")}
          </p>
        )}
      </div>
    </CardContent>
  </Card>
)}
```

**Yardımcı component:**
```tsx
function CostRow({ label, value, bold = false, large = false }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
      <span>{label}:</span>
      <span className={`font-mono ${large ? 'text-lg' : ''}`}>
        {value ? Number(value).toFixed(2) : '—'} TL
      </span>
    </div>
  );
}
```

#### 3.3 Recalc Mutation
```typescript
const recalcMutation = useMutation({
  mutationFn: () => apiRequest("POST", `/api/factory/recipes/${id}/recalc-cost`),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
    toast({ title: "Maliyet yeniden hesaplandı" });
  },
});
```

**UYARI:** `/recalc-cost` endpoint'i **şu an var mı kontrol edilmeli**. Yoksa Replit'e eklemesini isteyeceğiz:

```bash
grep -n "recalc-cost\|recalc.*recipe" server/routes/factory-recipes.ts server/maliyet-routes.ts
```

#### 3.4 Malzeme Satırına Fiyat Kolonu (1 saat)

Her malzeme için birim fiyat + toplam TL göster. Bunun için:

**Backend:** `GET /api/factory/recipes/:id` endpoint'i malzemelerle birlikte hammadde fiyatını da dönmeli.

**Mevcut endpoint kontrol:**
```typescript
// server/routes/factory-recipes.ts, GET /:id
const ingredients = await db.select()
  .from(factoryRecipeIngredients)
  .where(eq(factoryRecipeIngredients.recipeId, id));
```

**Yeni (JOIN ile):**
```typescript
const ingredients = await db.select({
  ...factoryRecipeIngredients,
  rawMaterialPrice: rawMaterials.currentUnitPrice,
  rawMaterialUnit: rawMaterials.unit,
})
.from(factoryRecipeIngredients)
.leftJoin(rawMaterials, eq(factoryRecipeIngredients.rawMaterialId, rawMaterials.id))
.where(eq(factoryRecipeIngredients.recipeId, id));
```

**Dikkat:** Replit dedi ki **`raw_material_id → inventory.id` bilinçli karar**. O zaman:
- Seçenek A: `inventory` JOIN'i kullan (Replit'in önerisi)
- Seçenek B: Hem `raw_materials` hem `inventory` JOIN (daha zengin)

**Öneri:** `inventory` JOIN, Replit onaylıyor.

**UI satırına ekleme:**
```tsx
<span className="text-xs text-muted-foreground ml-2">
  {ing.rawMaterialPrice
    ? `${ing.rawMaterialPrice} TL/${ing.rawMaterialUnit} → ${(ing.amount * ing.rawMaterialPrice).toFixed(2)} TL`
    : '—'
  }
</span>
```

---

### 🟡 ADIM 4: R-5C-MIN Alerjen UI (1 saat)

#### 4.1 Backend — Ingredient Response Alerjenli Dönsün (30 dk)

**Mevcut GET /:id endpoint'ine ekle:**
```typescript
const ingredients = await db.select({
  ...factoryRecipeIngredients,
  allergens: factoryIngredientNutrition.allergens,  // JOIN ile alerjen
})
.from(factoryRecipeIngredients)
.leftJoin(factoryIngredientNutrition,
  eq(factoryRecipeIngredients.name, factoryIngredientNutrition.ingredientName))
.where(eq(factoryRecipeIngredients.recipeId, id));
```

#### 4.2 Alerjen Badge'leri (15 dk)

**Constants dosyası:** `client/src/lib/allergens.ts` (yeni)
```typescript
export const ALLERGEN_ICONS = {
  gluten: '🌾',
  süt: '🥛',
  yumurta: '🥚',
  fındık: '🥜',
  fıstık: '🌰',
  soya: '🫘',
  susam: '🫘',
  sülfit: '🍷',
};

export const ALLERGEN_LABELS = {
  gluten: 'Gluten',
  süt: 'Süt/Laktoz',
  yumurta: 'Yumurta',
  fındık: 'Fındık',
  fıstık: 'Fıstık',
  soya: 'Soya',
  susam: 'Susam',
  sülfit: 'Sülfit',
};
```

**Malzeme satırına ekle:**
```tsx
{ing.allergens?.length > 0 && (
  <div className="flex gap-1">
    {ing.allergens.map((a: string) => (
      <Badge key={a} variant="destructive" className="text-[10px] px-1.5">
        {ALLERGEN_ICONS[a as keyof typeof ALLERGEN_ICONS] || '⚠️'}
      </Badge>
    ))}
  </div>
)}
```

#### 4.3 Reçete Toplam Alerjen Kartı (15 dk)

```tsx
{uniqueAllergens.length > 0 && !isNew && (
  <Card className="mb-4 border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-orange-700 dark:text-orange-400">
        ⚠️ Alerjen Uyarısı
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="flex gap-1.5 flex-wrap">
        {uniqueAllergens.map((a: string) => (
          <Badge key={a} variant="destructive">
            {ALLERGEN_ICONS[a]} {ALLERGEN_LABELS[a]}
          </Badge>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Bu reçete {uniqueAllergens.length} alerjen içeriyor. Müşteri bilgilendirmesi gerekli.
      </p>
    </CardContent>
  </Card>
)}
```

**Unique allergens hesaplama:**
```typescript
const uniqueAllergens = useMemo(() => {
  const all = ingredients.flatMap(i => i.allergens || []);
  return [...new Set(all)];
}, [ingredients]);
```

---

### 🎁 ADIM 5: BONUS R-5D Müşteri QR Sayfası (1 saat)

#### 5.1 Yeni Route + Sayfa

**Dosya:** `client/src/pages/kalite-alerjen-public.tsx` (yeni)

```tsx
export default function KaliteAlerjenPublic() {
  const { productId } = useParams();

  // Public endpoint (auth YOK)
  const { data: product } = useQuery({
    queryKey: ["/api/public/product-allergens", productId],
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <img src={product.coverPhotoUrl} alt={product.name} />
          <CardTitle>{product.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <h3>⚠️ Alerjen Bilgisi</h3>
          <div className="flex gap-2 flex-wrap">
            {product.allergens.map(a => (
              <Badge variant="destructive" className="text-lg py-2 px-4">
                {ALLERGEN_ICONS[a]} {ALLERGEN_LABELS[a]}
              </Badge>
            ))}
          </div>

          <h3 className="mt-4">🥗 Besin Değerleri (100gr)</h3>
          <table className="w-full text-sm">
            <tr><td>Enerji</td><td>{product.nutrition.energyKcal} kcal</td></tr>
            <tr><td>Yağ</td><td>{product.nutrition.fatG} g</td></tr>
            {/* vb */}
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 5.2 Public Endpoint (Auth YOK!)

**Dosya:** `server/routes/public-allergens.ts` (yeni)

```typescript
// GET /api/public/product-allergens/:productId
router.get("/api/public/product-allergens/:productId",
  async (req: Request, res: Response) => {
    // Auth YOK - public endpoint
    const productId = Number(req.params.productId);

    const [product] = await db.select({
      id: factoryProducts.id,
      name: factoryProducts.name,
      coverPhotoUrl: factoryProducts.coverPhotoUrl,
      allergens: factoryRecipes.allergens,
      nutrition: factoryRecipes.nutritionFacts,
    })
    .from(factoryProducts)
    .leftJoin(factoryRecipes, eq(factoryRecipes.productId, factoryProducts.id))
    .where(eq(factoryProducts.id, productId));

    if (!product) return res.status(404).json({ error: "Ürün bulunamadı" });

    res.json(product);
  }
);
```

**GÜVENLİK:** Sadece alerjen + besin bilgisi. Maliyet, reçete adımları, malzeme listesi YOK (rakiplere gider).

#### 5.3 Route Register
```typescript
// server/routes.ts
app.use(publicAllergensRoutes);
```

#### 5.4 QR Kod Üretimi
Public URL örnek: `https://dospresso.com/kalite/alerjen/27`
Bu URL'i QR koda dönüştürmek **pilot sonrası** bir iş (basılı etiketler).

---

## 📊 Toplam Değişiklik Özeti

| Dosya | Durum | Satır Ekleme | Satır Değişim |
|---|---|---|---|
| `server/routes/factory-recipes.ts` | ✅ Yapıldı | +160 | ~5 |
| `client/src/pages/fabrika-recete-duzenle.tsx` | ⏳ Bekliyor | +200 | ~50 |
| `client/src/lib/allergens.ts` | 🆕 Yeni | +30 | 0 |
| `client/src/pages/kalite-alerjen-public.tsx` | 🆕 Yeni | +80 | 0 |
| `server/routes/public-allergens.ts` | 🆕 Yeni | +40 | 0 |
| `server/routes.ts` | ⏳ | +2 | 0 |

**Toplam:** ~500 satır ekleme, ~55 satır değişim.

---

## 👥 Kim Ne Yapacak

### Claude (7 saat):
1. ✅ **R-5A Backend** (1 saat, yapıldı) — DELETE/PATCH endpoint'ler
2. ⏳ **R-5A Frontend** (2 saat) — Malzeme/adım edit/delete UI
3. ⏳ **R-5B-LITE Frontend** (2 saat) — Maliyet kartı + fiyat kolonları
4. ⏳ **R-5C-MIN Frontend** (1 saat) — Alerjen badge + özet
5. ⏳ **R-5D Frontend + Backend** (1 saat) — Müşteri QR sayfası

### Replit (1-1.5 saat):
1. **Backend test** (15 dk) — Endpoint'leri curl ile dene
2. **Maliyet recalc kontrolü** (15 dk) — 15 cost=0 reçete için endpoint var mı?
   - Varsa: `POST /api/factory/recipes/bulk-recalc` çağır
   - Yoksa: Claude yazacak, Replit çağıracak
3. **Smoke test** (30 dk) — UI akışları
4. **Alerjen JOIN performans** (15 dk) — GET /:id endpoint'i yavaşladı mı?

### Aslan (10 dk):
- Replit Build mode onayı ver → Claude işi push edebilsin
- Pilot başlamadan önce bir reçeteyi test et

---

## 🧪 Test Planı

### Fonksiyonel Testler (Replit):

```bash
# ADIM 1: Backend endpoint'ler
./test-recipe-endpoints.sh

# Beklenen çıktı:
# ✅ PATCH ingredient: 200 OK (recete_gm olarak)
# ✅ DELETE ingredient: 200 OK
# ✅ POST step: 200 OK + auto stepNumber
# ✅ PATCH step: 200 OK
# ✅ DELETE step: 200 OK
# ✅ Kilitli reçetede sadece admin düzenleyebildi
# ✅ sef rolü: ingredient edit OK, sil OK
# ✅ barista rolü: 403 forbidden
```

### UI Testleri (Claude build → Aslan test):

1. **RGM olarak giriş** → Reçete aç → Malzeme tıkla → Edit → Kaydet ✅
2. **RGM olarak** → Reçete aç → Malzeme tıkla → Sil → Onay → Silindi ✅
3. **RGM olarak** → Reçete aç → Adım düzenle ✅
4. **Sema (gida_muhendisi)** → Alerjen kartı görüyor mu?
5. **Kilitli reçete** → admin olmayan edit edemiyor ✅
6. **Public URL** → Auth'suz → Ürün alerjen + besin görünüyor ✅

### Performans Testleri (Replit):

```sql
-- Recete GET endpoint JOIN performansı
EXPLAIN ANALYZE
SELECT ... FROM factory_recipe_ingredients
LEFT JOIN rawMaterials ON ...
LEFT JOIN factory_ingredient_nutrition ON ...
WHERE recipe_id = 1;

-- Beklenen: <50ms
```

---

## ⚠️ Riskler + Rollback Planı

### Risk 1: Kilit mekanizması bozarsa
**Etki:** Pilot sırasında kimse reçete düzenleyemez.
**Rollback:** `UPDATE factory_recipes SET edit_locked = false;` ile unlock et.
**Önleme:** Admin her durumda düzenler (kodda mevcut).

### Risk 2: Frontend build failure
**Etki:** UI yeni component'ler nedeniyle build fail.
**Rollback:** `git revert HEAD` + push force.
**Önleme:** Her değişiklik sonrası `npm run build` test.

### Risk 3: Alerjen JOIN yavaş
**Etki:** Reçete sayfası 500ms+ yükleniyor.
**Rollback:** JOIN kaldır, ayrı endpoint yap (`GET /api/factory/recipes/:id/allergens`).
**Önleme:** EXPLAIN ANALYZE ile kontrol.

### Risk 4: Public endpoint açığı
**Etki:** Rakip müşteri sayfasından reçete bilgisi çalabilir.
**Önleme:**
- Rate limit (10 req/dk)
- Sadece alerjen + besin (malzeme/maliyet/adım YOK)
- `productId` UUID değil integer → brute-force mümkün ama sadece ürünün public bilgisi açığa çıkar

---

## ✅ Onay Kontrol Listesi

### Replit'in onaylaması gerekenler:

- [ ] **Backend plan doğru mu?** (PATCH yetki + DELETE + step CRUD)
- [ ] **Frontend kapsamı yeterli mi?** Yoksa ek bir şey lazım mı?
- [ ] **`raw_material_id → inventory` konusu netleşti mi?** (ingredient JOIN inventory ile mi raw_materials ile mi?)
- [ ] **`/api/factory/recipes/:id/recalc-cost` endpoint'i var mı?** Yoksa Claude yapmalı
- [ ] **Bulk recalc için hangi endpoint?** (`POST /api/factory/recipes/bulk-recalc` yeni mi, var mı?)
- [ ] **Public endpoint güvenlik riski kabul edilebilir mi?**
- [ ] **Alerjen JOIN performans endişesi var mı?**

### Aslan'ın onaylaması gerekenler:

- [ ] **Plan B+ (7 saat) kapsamı onaylandı** → Claude başlayabilir ✅
- [ ] **Müşteri QR BONUS yapılsın** → Replit'in task'ı ile örtüşüyor ✅

---

## 📋 Sonraki Adımlar

**Eğer Replit ONAY verirse:**

1. Claude R-5A frontend'i tamamlar (2 saat, bu gece)
2. Commit + push → Replit backend test eder
3. Claude R-5B-LITE + R-5C-MIN (3 saat, yarın sabah)
4. Claude R-5D müşteri QR (1 saat, yarın öğle)
5. Replit bulk recalc + smoke test (1 saat, yarın öğle)

**Toplam:** Yarın 15:00'e kadar hepsi tamam.

**Eğer Replit DEĞİŞİKLİK isterse:**
- Farklı kapsam öner
- Claude revize eder
- 30 dk sonra yeniden başla

---

**Rapor sonu.** Replit değerlendirmesi + Aslan onayı bekleniyor. ☕
