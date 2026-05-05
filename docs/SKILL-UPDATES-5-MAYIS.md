# SKILL UPDATES — 5 Mayıs 2026

Bu dosya `/mnt/skills/user/dospresso-*/SKILL.md` dosyalarına eklenecek
yeni kuralları içerir. Read-only oldukları için önce burada toplanır,
sonra Aslan tarafından manuel kopyalanır veya bir sonraki Claude
oturumda manifest update ile eklenir.

## dospresso-architecture/SKILL.md - EKLE

### TGK 2017/2284 Modülleri (Sprint 7)

**Yeni tablolar:**
- `raw_materials` - 18 yeni TGK alanı (brand, materialGroup, contentInfo, allergenPresent, allergenDetail, crossContamination, storageConditions, energyKcal, fat, saturatedFat, carbohydrate, sugar, protein, salt, fiber, tgkCompliant, halalCertificateUrl, expiryDays, countryOfOrigin)
- `suppliers` - 7 mevzuat alanı (foodAuthorizationNumber, ISO22000, HACCP, halal certified)
- `supplier_quality_records` - QC kayıtları (kabul/şartlı/red)
- `tgk_labels` - TGK etiketleri (taslak/onay_bekliyor/onaylandi)
- `turkomp_foods` - TÜRKOMP cache (645 gıda potansiyeli)

**Yeni endpoint'ler (~22):**
- `/api/girdi/*` - 5 endpoint (CRUD + soft delete)
- `/api/girdi-stats/*` - 2 endpoint (overview, allergen-matrix)
- `/api/tedarikci-kalite/*` - 2 endpoint (QC kayıt + performance)
- `/api/tgk-label/*` - 4 endpoint (calculate, save, approve, list)
- `/api/turkomp/*` - 5 endpoint (search, fetch, apply, cache, ek SQL)
- `/api/recipe-label/*` - 4 endpoint (calculate-branch, calculate-factory, save, gap-analysis)
- `/api/recete/:type/:id/calculate-label` - Replit eklemesi (factory için)

**Yeni sayfa:**
- `/girdi-yonetimi` - 5 tab (Liste, Alerjen, Etiket, Tedarikçi, Üretim Gap)

**Yeni roller (revize):**
- `gida_muhendisi` - TGK etiket onaylayabilir
- `kalite_kontrol` - QC kayıt giriş
- `kalite` - read-only (yeni)
- `sef` (Ümit Usta) - factory recipe + label hesap
- `recete_gm` (İlker) - factory recipe + label hesap

### TÜRKOMP Yasal Notu

**KRİTİK:** TÜRKOMP (turkomp.tarimorman.gov.tr) verileri:
- Bireysel/manuel arama: ÜCRETSİZ ✅
- Toplu scraping/veri satışı: ÜCRETLİ LİSANS ❌

Sistemimiz SADECE manual arama + tek tek getirme yapar. Cache'lenir
ama yeniden dağıtılmaz. Aslan'ın talep etmesi durumunda toplu lisans
alımı değerlendirilir.

### Schema Tuzakları (yeni)

**factoryRecipeIngredients.rawMaterialId** aslında `inventory.id` referansı
(rawMaterials.id DEĞİL). Bu yapısal bir uyumsuzluk - yeni reçete-etiket
hesaplama için **smart matching** yaklaşımı kullanılır:

```typescript
// YANLIŞ - inventory.id'den rawMaterials.id beklemek
const ingredients = await db.select()
  .from(factoryRecipeIngredients)
  .innerJoin(rawMaterials, eq(factoryRecipeIngredients.rawMaterialId, rawMaterials.id));
// → boş döner (FK uyumsuz)

// DOĞRU - smart matching ile fuzzy
const match = await smartMatchIngredient(ingredient.name);
// → name üzerinden eşleşir
```

**branchRecipeIngredients** FREE-TEXT (`ingredientName: 'süt'`).
rawMaterials FK YOK. Smart matching gerekli.

## dospresso-quality-gate/SKILL.md - EKLE

### Yeni Quality Gate Items (Sprint 7)

28. **TGK uyumlu hammadde**: Üretimde kullanılan tüm hammaddelerin
    raw_materials'da `tgk_compliant=TRUE` veya manuel doğrulama notu olmalı.

29. **Alerjen tutarlılığı**: Bir hammadde alerjen içeriyorsa
    `allergen_detail` boş olmamalı. Allerjen listesi:
    gluten, kabuklular, yumurta, balık, yer fıstığı, soya, süt,
    sert kabuklu yemiş, kereviz, hardal, susam, sülfit,
    yaban fasulyesi, yumuşakça (TGK Madde 9 - 14 büyük alerjen).

30. **TGK etiket onay zinciri**: Üretime giren her ürün için
    en az bir `tgk_labels` kaydı olmalı, status='onaylandi' ve
    approved_by_id NULL olmamalı (gıda mühendisi imzası).

31. **TÜRKOMP yasal**: turkomp-integration.ts'de toplu scraping
    fonksiyonu OLMAMALI (ücretli lisans gerekli). Sadece tek tek
    fetch izinli.

32. **Hammadde-Reçete tutarlılığı**: Üretim ürünleri için
    /api/recipe-label/gap-analysis çalıştırıldığında
    readinessPercent ≥ %80 olmalı (pilot eşiği).

## dospresso-debug-guide/SKILL.md - EKLE

### Sprint 7 Debug Senaryoları

**Sorun: Etiket hesaplama boş dönüyor**
1. Reçete var mı? → `SELECT * FROM branch_recipes WHERE product_id = ?`
2. Ingredient'lar var mı? → `SELECT * FROM branch_recipe_ingredients WHERE recipe_id = ?`
3. Ingredient adları rawMaterials ile eşleşiyor mu? → smart match dene
4. RawMaterials'da besin değerleri dolu mu? → `energy_kcal IS NOT NULL`

**Sorun: PDF indirilmiyor**
1. jsPDF import edildi mi? → `import { downloadTGKLabel } from "@/lib/tgk-label-pdf"`
2. Browser console'da hata? → CORS, font, image yükleme
3. Ürün adı çok uzun mu? → splitTextToSize çalışıyor

**Sorun: TÜRKOMP fetch 502 dönüyor**
1. URL doğru mu? → `https://turkomp.tarimorman.gov.tr/food-{slug}-{id}`
2. User-Agent header eklenmiş mi? → bot detection olabilir
3. Rate limit? → 1 saniye bekle, tekrar dene

**Sorun: Gap analizi yavaş**
1. N+1 query problemi → her ürün için 2 query (recipe + ingredients) + her ingredient için 1 smart match query
2. 100 ürün × ortalama 8 ingredient = 800+ query (~30 sn)
3. Çözüm: Batch matching (gelecek iyileştirme)
4. Geçici: enabled: false + manuel tetikle

## dospresso-session-protocol/SKILL.md - EKLE

### Sprint Stratejisi (Big Sprints)

5 May 2026'da öğrenildi: **Mega sprint daha verimli**
- Tek branch, çoklu commit (v1, v2, v3, ...)
- Tek mega PR, atomic merge
- PR yorgunluğu azalır
- Sprint 6 zaten 4 bölüm aldı (Bölüm 3+4 birlikte) - bu da örnek

### Triangle Workflow Güçlendirmesi

Replit aynı session'da Claude'un işini tamamlayabilir.
Örnek: 5 May 2026, Claude `/api/recipe-label/*` yazarken Replit
`/api/recete/:type/:id/calculate-label` ekledi (paralel iş).

Komut sonrası Claude check yapmalı:
```bash
git status --short  # Replit değişiklikleri var mı?
git diff <file>     # Replit ne yapmış?
```

Çakışma çözmek yerine **paralel çalışsınlar** - iki endpoint farklı
yaklaşımlar. UI hangisini çağıracağını seçer.
