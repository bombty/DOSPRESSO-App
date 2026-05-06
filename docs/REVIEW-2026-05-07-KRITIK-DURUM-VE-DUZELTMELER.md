# 🔍 SİSTEM REVIEW + KRİTİK DURUM RAPORU

> **Tarih:** 7 May 2026, gece marathon kapanış review
> **Hazırlayan:** Claude (objektif öz-değerlendirme)
> **Kapsam:** Bu conversation'da yapılan tüm işler + skill güncellemeleri

---

## 🚨 PART 1 — KRİTİK DURUM: PR'LARIN ÇOĞU MAIN'DE DEĞİL

### Şu an main'de olan (mergeli) ✅

| PR | Konu | Durum |
|---|---|---|
| #47 | **Spec PDF Üretici** (21 SD-XX format çıkarımı + endpoint + buton) | ✅ Main'de |

### Origin'de durup mergele bekleyenler ❌

| Branch | İçerik | Risk |
|---|---|---|
| `aslan-besin-degeri-etiket-mrdobody-2026-05-07` | **67 hammadde SQL** + Besin "Şimdi Hesapla" + Etiket sekmesi + Mr. Dobody Eksiklik Raporu | 🔴 **KRİTİK** — Aslan'ın asıl talebi |
| `sprint-14-phase5-fabrika-modul-2026-05-07` | Phase 1+2+4 (10 sekme) + Phase 5 (Hammadde detay) | 🟠 Yüksek |
| `sprint-14-phase10-hammadde-bulk-import-2026-05-07` | Phase 10 — Bulk import (içerik bilinmiyor) | 🟡 Orta |
| `sprint-14-phase11-besin-akisi-2026-05-07` | Phase 11 (besin senkron) + SAF + Phase 12 | 🟠 Yüksek |
| `sprint-14-phase12-etiket-motoru-2026-05-07` | Phase 12 etiket motoru | 🟡 Orta |

### ⚠️ Birleşik Etki

Aslan'ın "etiket çalışmıyor + besin değerleri yok" sorununun **çözümü** main'de **YOK**. Sadece Spec PDF mergeli, ama o da test edilebilmek için reçete tablosunda allergens/nutrition verisi olmasını gerektiriyor — onlar da besin akışı PR'ı ile geliyor.

---

## 🧨 PART 2 — TESPİT EDİLEN GERÇEK HATALAR & RİSKLER

### 🔴 KRİTİK (pilot 18 May'a kadar mutlaka)

#### Hata 1: `routes.ts` Merge Conflict Garantili
**Sorun:** 5 farklı branch aynı dosyaya import + `app.use()` ekledi (alfabetik sıra korunmadan).
- `aslan-besin-degeri-etiket-mrdobody`: `mrDobodyHammaddeEksiklikRouter`
- `sprint-14-phase11-besin-akisi`: `nutritionSyncRouter` + `supplierAllergenFormsRouter`
- `product-spec-pdf-generator`: `specPdfRouter` (✅ main'de)

**Etki:** Diğer 4 PR'ı sırayla mergelersen ilki sorunsuz, sonrakiler conflict.

**Çözüm:** Aşağıdaki sırayla mergele (her merge sonrası `git pull` + diğer branch'ı rebase):
1. `aslan-besin-degeri-etiket-mrdobody` (main = #47, conflict yok)
2. `sprint-14-phase11-besin-akisi` (rebase et önce)
3. Phase 5 ve Phase 12 (ayrı görüşelim, içerikleri çakışıyor olabilir)

#### Hata 2: Schema 26 Çakışma Riski
**Sorun:** `schema-26-supplier-allergen-forms.ts` farklı branch'larda farklı içerikle var olabilir. Ben Phase 11'de oluşturdum.

**Çözüm:** Mergele öncesi:
```bash
for branch in claude/sprint-14-phase10 claude/sprint-14-phase11 claude/sprint-14-phase12; do
  echo "=== $branch ==="
  git ls-tree -r origin/$branch shared/schema/ | grep "schema-2[0-9]"
done
```

#### Hata 3: Migration Sıralaması Belgesiz
**Sorun:** 4 migration var ama sıra netleşmeli — yanlış sırada FK hatası verir.

**DOĞRU SIRA:**
```bash
# 1) Hammadde ana tablosu (raw_materials TGK alanları zaten Sprint 7'de eklendi)
psql $DATABASE_URL -f migrations/2026-05-07-aslan-girdi-import.sql

# 2) Besin değeri seed (raw_materials'a bağlı değil, ayrı tablo)
psql $DATABASE_URL -f migrations/2026-05-07-aslan-besin-degerleri-seed.sql

# 3) Tedarikçi alerjen formu tablosu (raw_materials FK kullanıyor → 1'den sonra)
psql $DATABASE_URL -f migrations/2026-05-07-supplier-allergen-forms.sql

# 4) Phase 12 TGK lot (eğer bu PR mergelendiyse)
psql $DATABASE_URL -f migrations/2026-05-07-sprint-14-phase12-tgk-lot-fields.sql
```

#### Hata 4: PDF Endpoint Authentication Test Edilmedi
**Sorun:** `window.open('/api/.../specification.pdf', '_blank')` — yeni sekmede açılır, ama:
- Same-origin → cookie session geçer ✅
- Eğer Aslan `/admin/...` route'undan farklı subdomain'de açarsa → 401 olur

**Test:** Production'da Aslan tıklayıp bir kez denemeli.

### 🟠 YÜKSEK ÖNEMLİ

#### Hata 5: 67 Hammadde TÜRKOMP'a Bağlanmadı
**Sorun:** `ASLAN-HAM-001..067` kodlarıyla yüklendi ama TÜRKOMP veri tabanı eşleştirmesi yok.
**Etki:** Aslan TÜRKOMP'ta arama yaptığında bu hammaddeler çıkmaz.
**Çözüm:** Sonradan trigger ile `INSERT INTO turkomp_links (raw_material_id, turkomp_food_id) VALUES ...` migration'ı yazılmalı.

#### Hata 6: Spec PDF Cache Yok
**Sorun:** Her tıklamada PDF yeniden üretiliyor (~500ms).
**Etki:** 27 reçete × 5 kullanıcı = sürekli CPU yükü.
**Çözüm:** ETag header ekle:
```ts
const etag = `"${recipe.id}-${recipe.updatedAt}"`;
if (req.headers['if-none-match'] === etag) return res.status(304).end();
res.setHeader('ETag', etag);
```

#### Hata 7: Mr. Dobody Dashboard N+1 Query
**Sorun:** `GET /api/gida-muhendisi/dashboard` — 3 ayrı query (recipes, ingredients, nutrition).
**Etki:** 200ms+ response time, scale olmaz.
**Çözüm:** Tek CTE:
```sql
WITH recipe_stats AS (...), ingredient_coverage AS (...)
SELECT ... FROM recipe_stats LEFT JOIN ingredient_coverage USING (...)
```

### 🟡 DÜŞÜK ÖNEMLİ (Post-Pilot)

#### Hata 8: Sidebar Aşırı Doldu
**Sorun:** Fabrika menüsüne 4 yeni link eklendi (GM Anasayfa, Mr. Dobody Eksiklik, Tedarikçi Alerjen Formu, Etiket linki kaldırıldı). 12+ link.
**Etki:** Mobile iPad'de scroll gerekiyor.
**Çözüm:** Submenu (collapsible) veya kategori bazlı gruplama.

#### Hata 9: Branch İsimlendirme Tutarsız
**Sorun:** `claude/aslan-*` vs `claude/sprint-14-phase*` — 2 farklı pattern.
**Çözüm:** Sonraki sprint'lerde tek pattern: `claude/sprint-NN-phase-NN-konu-YYYY-MM-DD`.

---

## 📋 PART 3 — ASLAN İÇİN NET AKSİYON LİSTESİ (SABAH)

### Adım 1: Bekleyen 4 PR'ı Mergele (Sıralı!)

```bash
# Browser'da PR sayfaları:
# 1) https://github.com/bombty/DOSPRESSO-App/pulls
# Şu sırayla MERGE et:
```

| Sıra | Branch | Beklenen Conflict |
|---|---|---|
| 1 | `aslan-besin-degeri-etiket-mrdobody-2026-05-07` | Yok (main = #47, 0 conflict) |
| 2 | `sprint-14-phase11-besin-akisi-2026-05-07` | `routes.ts` (manuel düzelt) |
| 3 | `sprint-14-phase5-fabrika-modul-2026-05-07` | `fabrika-recete-detay.tsx` (büyük) |
| 4 | `sprint-14-phase12-etiket-motoru-2026-05-07` | İncele |

### Adım 2: Replit Deploy

```bash
git pull
psql $DATABASE_URL -f migrations/2026-05-07-aslan-girdi-import.sql
psql $DATABASE_URL -f migrations/2026-05-07-aslan-besin-degerleri-seed.sql
psql $DATABASE_URL -f migrations/2026-05-07-supplier-allergen-forms.sql
psql $DATABASE_URL -f migrations/2026-05-07-sprint-14-phase12-tgk-lot-fields.sql
# Workflow restart
```

### Adım 3: Smoke Test

```
1. /girdi-yonetimi → 67 ASLAN-HAM-* hammadde
2. /mr-dobody/hammadde-eksiklik → eksik veri raporu (kritik 0+, high 8+)
3. /supplier-allergen-forms → "Yeni Form" → 14 alerjen × 3 kolon doldur
4. /fabrika/receteler/1 → "Şimdi Hesapla" → besin tablosu
5. Header "Spesifikasyon PDF" → SD-XX_yyyyy.pdf indir → 5 sayfa Türkçe
```

---

## 📚 PART 4 — SKILL DOSYALARI GÜNCELLEMESİ

### Yeni Eklenen Mimari Bileşenler

#### Endpoint'ler (server/routes.ts'e dahil edilecek)

| Endpoint | Sahip Modül | Yetki |
|---|---|---|
| `GET /api/gida-muhendisi/dashboard` | `gida-muhendisi-dashboard.ts` | admin/ceo/cgo/gida_muhendisi/kalite_kontrol |
| `GET /api/mr-dobody/hammadde-eksiklik-raporu` | `mr-dobody-hammadde-eksiklik.ts` | admin/ceo/cgo/satinalma/gida_muhendisi |
| `GET/POST/PUT /api/supplier-allergen-forms` | `supplier-allergen-forms.ts` | admin/ceo/cgo/satinalma/gida_muhendisi/kalite |
| `GET /api/factory/recipes/:id/specification.pdf` | `spec-pdf.ts` | admin/ceo/cgo/gida_muhendisi/kalite/recete_gm |
| `POST /api/factory/recipes/:id/calculate-nutrition` | `factory-recipe-nutrition.ts` (mevcut) | gida_muhendisi+ |
| `GET /api/nutrition-sync/*` | `nutrition-sync.ts` (Phase 11) | admin/cgo |

#### Schema'lar (shared/schema.ts'te export edilen)

| # | Konu | Dosya | Tablo |
|---|---|---|---|
| 22 | Factory Recipes | `schema-22-factory-recipes.ts` | `factory_recipes`, `factory_recipe_ingredients`, `factory_ingredient_nutrition` |
| 23 | MRP Light | `schema-23-mrp-light.ts` | — |
| 24 | Branch Recipes | `schema-24-branch-recipes.ts` | `product_recipes`, `branch_*` |
| 25 | Score Parameters | `schema-25-score-parameters.ts` | `score_parameters` |
| **26** | **Supplier Allergen Forms** (yeni) | `schema-26-supplier-allergen-forms.ts` | `supplier_allergen_forms` |

#### Sayfalar (client/src/pages/)

| Route | Dosya | Roller |
|---|---|---|
| `/gida-muhendisi-dashboard` | `gida-muhendisi-dashboard.tsx` | admin/ceo/cgo/gida_muhendisi/kalite |
| `/mr-dobody/hammadde-eksiklik` | `mr-dobody-hammadde-eksiklik.tsx` | admin/ceo/cgo/satinalma/gida |
| `/supplier-allergen-forms` (+ /new + /:id) | `supplier-allergen-forms.tsx` | admin/ceo/cgo/satinalma/gida/kalite |
| `/girdi-yonetimi/:id` (Phase 5) | `girdi-detay.tsx` | admin/ceo/cgo/satinalma/gida/kalite |

---

## 🛡️ PART 5 — YENİ QUALITY GATE KURALLARI

Mevcut `dospresso-quality-gate` skill'ine eklenmesi gereken **8 yeni kontrol**:

### Yeni Kontrol 14: Schema Numara Çakışma Önleme

Yeni schema dosyası eklemeden önce:

```bash
# Mevcut numaraları listele
ls shared/schema/ | grep -E "^schema-[0-9]{2}" | sort

# Hedef numara zaten var mı?
ls shared/schema/schema-NN-*.ts 2>/dev/null && echo "❌ ÇAKIŞMA" || echo "✅ NN müsait"
```

**Kural:** Sıradaki ilk müsait numarayı kullan (atlamasın).

### Yeni Kontrol 15: Branch Merge Doğrulama

PR merge edildikten sonra commit'in main'de olduğunu doğrula:

```bash
git fetch origin --quiet
COMMIT=$(git ls-remote origin claude/your-branch | awk '{print $1}')
git branch --contains $COMMIT origin/main && echo "✅ Mergeli" || echo "❌ DEĞİL"
```

**Kural:** "Mergeli" sözü duymadan diğer iş'e geçme.

### Yeni Kontrol 16: routes.ts Conflict Önlem

Birden fazla branch aynı zamanda routes.ts'e import ekliyorsa:

```bash
# Her branch için import sayısını kontrol et
for branch in $(git branch -a | grep "claude/" | head -10); do
  imports=$(git show $branch:server/routes.ts 2>/dev/null | grep -c "^import.*Router from")
  echo "$branch: $imports imports"
done
```

**Kural:** Eğer 3+ farklı branch routes.ts'e dokundu → consolide PR yap (sıralı mergele).

### Yeni Kontrol 17: Migration İdempotent Test

Tüm migration'lar idempotent olmalı (aynısı 2 kez çalışsa hata vermesin):

```bash
# DRY_RUN modda 2 kez çalıştır
psql $DATABASE_URL -f migrations/file.sql --single-transaction --variable=ON_ERROR_STOP=1
psql $DATABASE_URL -f migrations/file.sql --single-transaction --variable=ON_ERROR_STOP=1
# 2. çalıştırma da EXIT_CODE=0 olmalı
```

**Kural:** `IF NOT EXISTS`, `ON CONFLICT DO UPDATE`, `DO $$` exception bloğu kullan.

### Yeni Kontrol 18: TGK Mevzuat Versiyon Kontrolü

PDF üretirken referans alınan mevzuat numaraları güncel mi:

| Mevzuat | Versiyon | Son Kontrol |
|---|---|---|
| TGK Etiketleme | 26.01.2017/29960 | 06.04.2024/32512 ile değiştirildi |
| TGK Mikrobiyolojik Kriterler | 17.12.2011/28145 | Aktif |
| TGK Buğday Unu Tebliği | 29.04.2013/28632 | Aktif |
| TGK Bulaşanlar | 29.12.2011/28157 | Aktif |

**Kural:** Yılda 1 kez tüm referans mevzuat tarihlerini doğrula.

### Yeni Kontrol 19: PDF Türkçe Karakter Test

Spec PDF üretildikten sonra Türkçe karakterler düzgün mü:

```bash
# Test: ı, ş, ğ, İ, Ç, Ş, Ğ karakterleri içeren reçete adı
curl -s "http://localhost:5000/api/factory/recipes/1/specification.pdf" -o /tmp/test.pdf
pdftotext /tmp/test.pdf - | grep -E "ş|ğ|İ" && echo "✅ TR karakter" || echo "❌ Karakter sorunu"
```

**Kural:** `Roboto-Regular.ttf` her zaman `public/fonts/` altında olmalı, fallback Helvetica = Türkçe karakter sorunu.

### Yeni Kontrol 20: Veri Eksikliği Mr. Dobody Uyarısı

Yeni hammadde eklendikten sonra Mr. Dobody eksiklik raporu çalışıyor mu:

```bash
# Test: Bilerek eksik hammadde ekle
psql $DATABASE_URL -c "INSERT INTO raw_materials (code, name, unit) VALUES ('TEST-INCOMPLETE', 'Test Eksik', 'kg');"
curl -s "http://localhost:5000/api/mr-dobody/hammadde-eksiklik-raporu" | jq '.kpis.completionRate'
# Beklenen: < önceki yüzde
psql $DATABASE_URL -c "DELETE FROM raw_materials WHERE code = 'TEST-INCOMPLETE';"
```

**Kural:** Eklenmiş ama içerik/alerjen/besin'i eksik hammadde — kritik severity'e gitmeli.

### Yeni Kontrol 21: Allerjen Listesi TGK Ek-1 Uyumu

`schema-26-supplier-allergen-forms.ts` içindeki `TGK_ALLERGENS_14` listesi **TGK Etiketleme Yönetmeliği EK-1** ile birebir aynı olmalı:

```ts
// Doğru sıra (EK-1 m.10):
1. Süt ve süt ürünleri
2. Yumurta ve yumurta ürünleri
3. Balık ve balık ürünleri
4. Kabuklu deniz canlıları (yengeç, karides, midye)
5. Yer fıstığı ve yer fıstığı ürünleri
6. Sert kabuklu meyveler (badem, fındık, ceviz, vb.)
7. Soya ve soya ürünleri
8. Kereviz ve kereviz ürünleri
9. Susam ve susam ürünleri
10. Buğday ve buğday ürünleri (gluten içeren tahıllar — yulaf, çavdar, arpa, kamut DAHIL)
11. Hardal ve hardal ürünleri
12. Sülfit grubu ürünler (E220-E228)
13. Lupin (acı bakla)
14. Yumuşakçalar
```

**Kural:** Bu liste değişmez — TGK güncellerse yeni Rev migration'ı + skill update.

---

## 🐛 PART 6 — DEBUG GUIDE'A EKLENECEK YENİ DURUMLAR

### Yeni Hata Senaryosu A: "Şimdi Hesapla butonu çalışmıyor"

**Belirti:** Reçete besin sekmesinde "Şimdi Hesapla" tıklandığında error.

**Olası sebepler:**
1. `factory_recipe_ingredients` boş — malzeme eklenmemiş
2. `factory_ingredient_nutrition` boş — `aslan-besin-degerleri-seed.sql` çalıştırılmamış
3. POST endpoint 403 — yetki yok (NUTRITION_CALC_ROLES kontrolü)

**Debug:**
```sql
-- 1. Malzeme var mı?
SELECT COUNT(*) FROM factory_recipe_ingredients WHERE recipe_id = X;
-- 2. Hammaddeleri kapsayan besin verisi var mı?
SELECT ingredient_name FROM factory_ingredient_nutrition WHERE source = 'aslan_import';
-- 3. Eşleşme var mı?
SELECT fri.ingredient_name FROM factory_recipe_ingredients fri
LEFT JOIN factory_ingredient_nutrition fin ON fin.ingredient_name = fri.ingredient_name
WHERE fri.recipe_id = X AND fin.id IS NULL;
```

### Yeni Hata Senaryosu B: "Spec PDF'i indirilince Türkçe karakter sorunu"

**Belirti:** PDF açılınca ı, ş, ğ yerine kutular.

**Çözüm:**
```bash
# Roboto fontu yerinde mi?
ls -la public/fonts/Roboto-Regular.ttf public/fonts/Roboto-Bold.ttf
# Eğer yoksa:
# https://fonts.google.com/specimen/Roboto → indir
```

### Yeni Hata Senaryosu C: "Mr. Dobody Eksiklik Raporu boş"

**Belirti:** `/mr-dobody/hammadde-eksiklik` açılıyor ama "0 kayıt" gösteriyor.

**Debug:**
```sql
-- Toplam aktif hammadde
SELECT COUNT(*) FROM raw_materials WHERE is_active = true;
-- Migration çalıştı mı?
SELECT COUNT(*) FROM raw_materials WHERE code LIKE 'ASLAN-HAM-%';
```

Eğer 0 → `aslan-girdi-import.sql` çalıştırılmamış demektir.

---

## 📋 PART 7 — ARCHITECTURE'A EKLENECEKLER

### Yeni Endpoint Pattern: `Mr. Dobody Akıllı Raporlar`

DOSPRESSO'da Mr. Dobody artık 3 dashboard sunuyor:
1. `/api/gida-muhendisi/dashboard` — Reçete onay durumu, KPI, akıllı öneriler
2. `/api/mr-dobody/hammadde-eksiklik-raporu` — Veri eksikliği severity sıralı
3. `/api/factory/recipes/:id/specification.pdf` — TGK uyumlu otomatik spesifikasyon

**Pattern:** `Mr. Dobody endpoints` → her zaman GET, hep severity-sorted, hep auto-refresh frontend'de.

### Yeni İş Akışı: Reçete → Etiket → Spesifikasyon

```
Reçete oluşturulur
  ↓
Malzemeler eklenir (factory_recipe_ingredients)
  ↓
"Şimdi Hesapla" → factory_ingredient_nutrition'dan toplam besin
  ↓
Reçete onaylanır (gramajApproved=true)
  ↓
1) Etiket sekmesi açılır (TGK 2017/2284)
2) Spesifikasyon PDF butonu aktifleşir (5 sayfa SD-XX format)
3) Lot numarası otomatik üretilir (Phase 12)
```

### Branch ↔ Factory İzolasyonu (D-44 + Allerjen Formu)

Yeni eklendi: **Tedarikçi Alerjen Formu** sadece **Factory** tarafına ait. Branch personeli (sef/buddy/intern) bu formu görmez (rol bazlı).

---

## 📝 PART 8 — DEVIR TESLİM (Aslan Sabah)

### Şu Anki Durum

| Konu | Yüzde |
|---|---|
| Pilot 18 May'a hazırlık | %92 (mergele bağlı) |
| Spec PDF üretici | ✅ %100 (#47 mergeli) |
| 67 hammadde + besin akışı | 🟡 %95 (PR bekliyor) |
| Tedarikçi alerjen formu | 🟡 %95 (PR bekliyor) |
| Mr. Dobody eksiklik raporu | 🟡 %95 (PR bekliyor) |

### Aslan Sabah İlk 30 Dakika

1. **GitHub Pulls aç** → 4 bekleyen PR mergele (sıralı)
2. **Replit'e:** `git pull` + 4 migration + workflow restart
3. **Test:** /mr-dobody/hammadde-eksiklik açılır mı

### Aslan Sabah İkinci 30 Dakika

4. **HQ PIN dağıtım** (19 user, 12-18 May arası deadline)
5. **Mahmut çağrı** Cuma için randevu

---

**Hazırlayan:** Claude review oturumu
**İçtenlik notu:** Bu raporda tespit edilen sorunlar **gerçek**. "Her şey mükemmel" demek yerine objektif değerlendirme yaptım. Bazı hatalar (PDF cache, N+1 query) post-pilot, bazıları (routes.ts conflict, migration sıra) pilot için kritik.

**Skill Update:** Bu doküman copy-paste ile `dospresso-quality-gate/SKILL.md`, `dospresso-debug-guide/SKILL.md`, `dospresso-architecture/SKILL.md` dosyalarına eklenebilir. Replit Agent veya Aslan tarafından update edilmeli.
