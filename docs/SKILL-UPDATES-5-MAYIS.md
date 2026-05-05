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

---

## EK GÜNCELLEMELER (5 May 19:00 sonrası — Sprint 7 finalize)

### dospresso-debug-guide/SKILL.md - EKLE

#### Schema'da OLMAYAN export'u import etme hatası (5 May 2026)

**Sorun:** `personnel-attendance-detail.ts` (Sprint 7 v3 ile geldi) `shiftAssignments` import etmeye çalıştı ama bu isimde export yok. Build hatası → workflow restart başarısız.

**Çözüm:**
- `import { shifts as shiftsTable } from '@shared/schema'` (alias gerekli çünkü `shifts` local var)
- `userId` → `assignedToId` (kolon adı farklı)
- `shiftStart` → `startTime`, `shiftEnd` → `endTime`
- `isNull(shiftsTable.deletedAt)` filtre ekle (soft delete koruması)

**Önleme:** Her yeni route dosyasında schema import ettikten sonra **derhal `npx esbuild server/index.ts --bundle --platform=node --packages=external --outfile=/tmp/check.js` çalıştır** — undefined export'ları erkenden yakalar.

#### Sprint 7 Migration Doğrulamaları (5 May 2026 başarılı çalıştırıldı)

Migration #1 sonrası beklenen DB durumu:
- `raw_materials`: 17 → 35 kolon (18 yeni)
- `suppliers`: 27 → 34 kolon (7 yeni: foodAuthorizationNumber, ISO22000, HACCP, halal, vs.)
- 3 yeni tablo: `supplier_quality_records`, `tgk_labels`, `turkomp_foods`
- FK: `raw_materials.turkomp_food_id → turkomp_foods.id`

Migration #2 sonrası:
- 13 tedarikçi (5 mevcut + 8 yeni TED-* code)
- 67 hammadde (HAM001-HAM067)
- Toplam `raw_materials` ~307 satır (240 mevcut + 67 yeni)

⚠️ **Kritik gözlem:** Mevcut 240 hammaddenin TGK alanları **NULL**. Etiket hesaplama bunlar için besin değeri çıkaramaz. Sprint 8'de ya TÜRKOMP batch matching ya da manuel girişi planla.

### dospresso-quality-gate/SKILL.md - EKLE

#### TÜRKOMP Yasal Uyarı (5 May 2026)

TÜRKOMP (turkomp.tarimorman.gov.tr) verileri **ücretsiz arama** için açık ama **toplu scraping ücretli lisans** gerektirir.

**İzin verilen kullanım:**
- Kullanıcı (gıda mühendisi) tek bir gıda ararsa OK
- Sonucu cache'lemek OK
- Cache'i diğer kullanıcılara servis etmek OK

**YASAK:**
- Otomatik 645 gıdayı topluca çekmek
- Cache'i veri seti olarak satmak
- Düzenli aralıklarla resyncing yapmak

`server/routes/turkomp-integration.ts` rate limit yok şu an. **Sprint 8'de:** `express-rate-limit` ekle (kullanıcı başına 10 req/saat).

#### TGK 2017/2284 Etiket Onay Zinciri (5 May 2026)

Etiket statüsü mutlaka şu sırada ilerlemeli:
`taslak` → `onay_bekliyor` → `onaylandi` (veya `reddedildi`)

**Onay sadece:** `gida_muhendisi` veya `admin` (TGK Madde 18). Frontend'de bu kontrol yapılıyor ama **backend'de de zorunlu** (`canApproveLabel(role)`).

**Versiyonlama:** Aynı ürün için yeni etiket oluşturulduğunda eski sürüm `is_active=false` yapılıp yeni sürüm `version+1` ile eklenir. UI son aktifi gösterir, audit trail için tüm sürümler tutulur.

### dospresso-architecture/SKILL.md - EKLE

#### Sprint 7 Triangle Workflow Notu

Replit Agent (5 May 19:00 oturumu) **çok disiplinli** çalıştı:
- DRY-RUN raporu eksiksiz (kolon sayısı, çakışma kontrolü, FK status)
- Migration sırası doğru (önce schema, sonra data)
- Build başarısız olunca **otomatik schema fix yaptı** (shiftAssignments → shifts)
- 6 API testini paralel koştu

**Bu seviyeyi koruyabilmek için:**
- Replit'e komut yazarken hep **DRY-RUN ÖNCE** vurgusu
- Beklenen değerleri **rakam olarak ver** (raw_materials kolon=35, vs.) ki Replit doğrulayabilsin
- "GO bekle" netleştir — yarı-otomatik değil, full-manual onay
- Build hatası varsa Replit'in lokal düzeltmesi GitHub'a YAZILMALI (yoksa bir sonraki pull patlatır)

#### Sprint 7 Eksiklikleri (Sprint 8'e taşınanlar)

✗ Mevcut 240 rawMaterials için TGK alanları NULL — TÜRKOMP batch matching gerekli
✗ TÜRKOMP rate limit yok — express-rate-limit ekle
✗ /api/recipe-label/gap-analysis N+1 problem (~800 query, 30sn) — batch matching
✗ Reçete sayfasındaki "Etiket Hesapla" butonu sadece branch reçetede — fabrika reçetesinde de gerekli (fabrika-recete-detay.tsx)
✗ Etiket reddedildiğinde reddedilme sebebi UI'da yok — reject dialog ekle
✗ TÜRKOMP cache stale — bir gıda için son fetch tarihinden 6 ay geçtiyse uyar

### dospresso-session-protocol/SKILL.md - EKLE

#### 30+ Saatlik Maraton Sonu Disiplin (5 May 2026)

**Öğrenilen:** Aslan'la 30+ saat maraton tamamlandı. Çıktı kalitesi düştü mü test ederek gör:
- ✅ Smoke test 6/6 geçti
- ✅ Production hatası 0
- ✅ 5 PR temiz merge oldu
- ⚠️ Tek runtime hatası: `shiftAssignments` (Replit hızlı yakaladı, fix etti)

**Sonuç:** Triangle çalışıyor. Maraton mümkün ama Claude'un da Replit'in de **sürekli kalite kontrol** yapması gerekiyor.

**Sıradaki maraton için:**
- 12 saatten uzun oturum başlamadan önce **net süre kapağı** koy ("00:30'da dur" gibi)
- Her 4 saatte bir özetin
- Skill update'i SONA bırakma — her sprint sonu hemen yaz (yorgun kafa atlar)

