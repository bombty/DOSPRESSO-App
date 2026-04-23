# REPLIT İÇİN KAPSAMLI ANALİZ GÖREVİ — Reçete Sistemi

**Gönderen:** Claude (Aslan oturumu)
**Tarih:** 23 Nis 2026
**Pilot:** 28 Nis (5 gün kala)
**Mod:** Plan mode (kod yazma, sadece analiz + öneri)

---

## 🎯 AMAÇ

DOSPRESSO fabrika reçete sistemini **derinlemesine anlamanı** istiyorum. Claude'un bir analizi var ama tek taraflı olmasın diye senin de **bağımsız bakış açını** alıyorum. Sonunda **ortak bir plan** oluşturacağız.

**Claude'un analizi:** `docs/pilot/recete-sistemi-derin-analiz.md` (okumadan önce kendi analizini yap, sonra karşılaştır).

---

## 📊 GÖREV 1 — Sistemi Sıfırdan Anla

Plan mode'da aşağıdaki 8 kategoriyi incelemeni istiyorum. **Kod okuma + DB sorguları yaparak** gerçek durumu çıkar:

### 1.1 Tablo Envanteri
```sql
-- Reçete ile ilişkili TÜM tabloları listele
SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as col_count,
       (SELECT pg_stat_get_live_tuples(c.oid) FROM pg_class c WHERE c.relname = t.table_name) as row_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND (table_name LIKE '%recipe%'
       OR table_name LIKE '%ingredient%'
       OR table_name LIKE '%raw_material%'
       OR table_name LIKE '%inventory%'
       OR table_name LIKE '%keyblend%'
       OR table_name LIKE '%cost%')
ORDER BY table_name;
```

**Soru:**
- Hangi tablolar aktif kullanılıyor, hangileri dormant?
- `product_recipes` vs `factory_recipes` — hangisi daha çok INSERT alıyor son 30 gün?
- Hangi tabloda hangi veri türü?

### 1.2 Foreign Key Sağlığı
```sql
-- factory_recipe_ingredients FK'ları (DB'deki gerçek durum)
SELECT
  tc.table_name, kcu.column_name,
  ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('factory_recipe_ingredients', 'product_recipe_ingredients',
                        'factory_recipes', 'product_recipes', 'raw_materials', 'inventory');
```

**Soru:**
- `factory_recipe_ingredients.raw_material_id` DB'de hangi tabloya FK? (Claude şema'da `inventory.id` diyor ama DB drift olabilir)
- `raw_materials.inventory_id` bağlantısı nasıl kurulmuş?
- Orphan referans var mı?

### 1.3 Veri Kapsamı
```sql
SELECT 'factory_recipes' as tbl, COUNT(*) as total, COUNT(*) FILTER (WHERE is_active) as active FROM factory_recipes
UNION ALL SELECT 'factory_recipe_ingredients', COUNT(*), NULL FROM factory_recipe_ingredients
UNION ALL SELECT 'factory_recipe_steps', COUNT(*), NULL FROM factory_recipe_steps
UNION ALL SELECT 'factory_recipe_versions', COUNT(*), NULL FROM factory_recipe_versions
UNION ALL SELECT 'factory_recipe_price_history', COUNT(*), NULL FROM factory_recipe_price_history
UNION ALL SELECT 'factory_ingredient_nutrition', COUNT(*), NULL FROM factory_ingredient_nutrition
UNION ALL SELECT 'product_recipes', COUNT(*), COUNT(*) FILTER (WHERE is_active) FROM product_recipes
UNION ALL SELECT 'product_recipe_ingredients', COUNT(*), NULL FROM product_recipe_ingredients
UNION ALL SELECT 'raw_materials', COUNT(*), COUNT(*) FILTER (WHERE is_active) FROM raw_materials
UNION ALL SELECT 'inventory', COUNT(*), NULL FROM inventory
UNION ALL SELECT 'factory_keyblends', COUNT(*), NULL FROM factory_keyblends;
```

**Soru:**
- Hangi tablo dolu, hangi boş? (factory_recipe_versions, price_history dahil)
- `factory_recipes.rawMaterialCost` alanı tüm kayıtlarda 0 mı, bazılarında dolu mu?

### 1.4 Maliyet Hesaplama Akışı
```bash
# Mevcut maliyet hesaplama kodları
grep -rn "rawMaterialCost\|calculateRecipeCost\|totalUnitCost" server/ --include="*.ts" | head -20
```

**Soru:**
- `product_recipes` için hesaplama NEREDE? Hangi endpoint tetikler?
- `factory_recipes` için hesaplama VAR MI? Varsa nerede?
- İki sistem birbirinden haberdar mı?

### 1.5 UI Kullanımı — Frontend Grep
```bash
# Hangi sayfalar hangi sistemi kullanıyor?
grep -rn "productRecipes\|product-recipes\|product_recipes" client/src --include="*.tsx" | head -10
grep -rn "factoryRecipes\|factory-recipes\|factory_recipes" client/src --include="*.tsx" | head -10
```

**Soru:**
- Kullanıcı arayüzünde hangi endpoint'ler çağrılıyor?
- RGM, Sema, Kiosk hangi sayfaları açıyor?
- `fabrika-recete-duzenle.tsx` — ne eksik, ne var?

### 1.6 Satınalma Akışı
```sql
-- Son 30 günde raw_materials fiyat güncellemesi oldu mu?
SELECT COUNT(*) as updates, MAX(price_last_updated) as last_update,
       MIN(price_last_updated) as first_update
FROM raw_materials WHERE price_last_updated >= NOW() - INTERVAL '30 days';

-- Fatura tablosu var mı? Invoice akışı?
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE '%invoice%' OR table_name LIKE '%fatura%';
```

**Soru:**
- Satınalma → hammadde fiyat güncelleme akışı var mı?
- Fatura girişi reçete maliyetini trigger ediyor mu?
- Samet'in rol yetkileri: ne yapabilir, ne yapamaz?

### 1.7 Muhasebe Entegrasyonu
```bash
grep -rn "COGS\|cost_of_goods\|muhasebe.*kayıt\|accounting" server/ --include="*.ts" | head -10
```

**Soru:**
- Üretim partisi tamamlanınca muhasebe kaydı oluşuyor mu?
- Mahmut'un ekranında reçete maliyeti görünüyor mu?
- Aylık raporlama var mı?

### 1.8 Kiosk Üretim Akışı
```bash
# Fabrika kiosk üretim sayfası
find client/src/pages -name "*fabrika*" -o -name "*uretim*" | head -10
```

**Soru:**
- Operatör reçeteyi nasıl başlatır?
- Hangi bilgileri görür (miktar, süre, maliyet)?
- Batch tamamlandıktan sonra ne olur (fire, onay, kayıt)?

---

## 🎭 GÖREV 2 — 6 Perspektif Analizi

Aşağıdaki paydaşların **ideal iş akışını** tanımla. Sistemde hangisi **çalışıyor**, hangisi **eksik**?

### 2.1 RGM (Aslan) — Reçete Stratejisi
- İdeal: Reçete ekler, düzenler, kilitler, maliyet + kar marjı görür
- Mevcut: ?

### 2.2 GM / Gıda Mühendisi (Sema) — HACCP + Kalite
- İdeal: Alerjen ekler, besin değeri hesaplatır, versiyon onaylar, HACCP uyum
- Mevcut: ?

### 2.3 Satın Alma (Samet) — Hammadde Fiyat
- İdeal: Fatura girer, fiyat günceller, etkilenen reçeteleri görür, tedarikçi karşılaştırır
- Mevcut: ?

### 2.4 Muhasebe (Mahmut) — Maliyet Muhasebesi
- İdeal: Aylık COGS raporu, üretim kaydı, TMS-2 stok değerleme
- Mevcut: ?

### 2.5 Fabrika Kiosk / Üretim Şefi — Operasyonel
- İdeal: Batch başlatır, adım adım takip, fire otomatik hesap, maliyet görünür
- Mevcut: ?

### 2.6 Üretim Operatörü — Günlük İş
- İdeal: Adım checklisti, timer, fotoğraflı rehber, problem bildir
- Mevcut: ?

Her biri için **5 puan üzerinden değerlendir**: (1 = çalışmıyor, 5 = mükemmel).

---

## 💡 GÖREV 3 — Bağımsız Çözüm Önerisi

**Claude'un analizinin ne önerdiği önemsiz. Sen sıfırdan çöz:**

### 3.1 Mimari Karar
Eğer bu sistemi **sıfırdan kurmak** gerekse:
- Kaç tablo olur?
- İki reçete sistemi (product + factory) birleşmeli mi, ayrı mı kalmalı?
- Maliyet hesaplama nerede (DB trigger, cron, on-demand)?
- Cache stratejisi?

### 3.2 Minimum Viable Product (MVP)
Pilot için **mutlak minimum** ne? (Pilot 5 gün sonra):
- Hangi fix kritik?
- Hangi özellik ertelenebilir?
- Hangi hack kabul edilebilir?

### 3.3 Geleceğe Yatırım
Pilot sonrası (2-4 hafta içinde) **stratejik olarak ne yapılmalı?**
- Paralel sistem problemi
- Muhasebe entegrasyonu
- Kiosk üretim akışı
- Versiyonlama otomasyonu

### 3.4 Riskler
Bu sistemin **canlıda patlatabileceği** senaryolar:
- Mahmut Mayıs ay sonu bordroda ne görür?
- Samet yeni fiyat girerse kimin ekranı güncellenir?
- Sema reçete versiyonu yayınlarsa kiosk'a bildirim gider mi?
- Pilot 1. hafta müşteri alerjen sorarsa cevap nasıl bulunur?

### 3.5 Optimizasyon Fikirleri
Claude 7 fikir verdi. **Sen farklı 5 fikir üret.** Örneğin:
- AI destekli reçete optimizasyonu (maliyet düşürme önerisi)?
- A/B testing (iki reçete versiyonunu karşılaştır)?
- Tedarikçi otomatik switch (ucuzsa değiş)?

---

## 🎯 GÖREV 4 — Ortak Planı Yazma

Analizin bittikten sonra **Claude ile ortak bir plan** oluşturmamız gerek. Şu formatta raporla:

### 4.1 Anlaşma Noktaları
"Claude'un X teşhisi doğru" veya "Claude şunu yanlış anlamış, gerçek Y"

### 4.2 Anlaşmazlıklar
"Claude A diyor, ben B diyorum çünkü..."

### 4.3 Sprint Önceliği (Ortak)
Claude 5 alt sprint (R-5A/B/C/D/E) önerdi. Sen:
- Aynı sıralamayı kabul eder misin?
- Farklı bir sıralama önerir misin?
- Bazılarını birleştirir veya ayırır mısın?

### 4.4 Maliyet Formülü (Ortak)
Claude'un önerdiği:
```
rawMaterialCost = Σ(ingredient.amount × rawMaterial.currentUnitPrice)
laborCost = workers × productionTime × hourlyWage
energyCost = kwh × kwhPrice + waterLt × waterPrice
batchCost = rawMat + labor + energy + overhead
unitCost = batchCost / output
```

Sen bu formüle katılıyor musun? Eksik veya yanlış gördüğün?

### 4.5 Pilot Kararı
Pilot 28 Nis. 5 gün var. **Senin önerin**:
- A) Hiçbir şey yapma, pilot sonrası çözeriz (risksiz ama RGM rahatsız)
- B) Sadece R-5A UI fix (3 saat, pilot OK)
- C) R-5A + R-5B maliyet (7 saat, daha tam)
- D) Başka bir yol

---

## 📋 ÇIKTI FORMATI

Lütfen şu formatta raporla (markdown):

```markdown
# Replit Bağımsız Analiz Raporu — Reçete Sistemi

## 1. Mevcut Durum (Görev 1 sonuçları)
### 1.1 Tablolar + satır sayıları
### 1.2 FK sağlığı (DB'deki gerçek)
### 1.3 Veri kapsamı
...

## 2. Perspektif Analizi (Görev 2)
### RGM: X/5 - Neden
### GM: X/5 - Neden
...

## 3. Bağımsız Çözüm Önerisi (Görev 3)
### 3.1 Mimari
### 3.2 MVP
### 3.3 Gelecek
### 3.4 Riskler
### 3.5 5 Optimizasyon Fikri

## 4. Claude ile Karşılaştırma (Görev 4)
### Anlaşma
### Anlaşmazlık
### Sprint önceliği
### Maliyet formülü
### Pilot kararı (A/B/C/D)

## 5. Sonuç — Aslan İçin Tek Soru
"Aslan, A/B/C/D'den hangisini seçiyorsun?"
```

---

## ⏱️ SÜRE VE MAALİYET

**Tahmin:** 20-30 dakika (Plan mode, sadece SQL + kod okuma + analiz)
**Cost:** Düşük (kod yazma YOK, DB değişimi YOK)
**Çıktı:** `docs/pilot/replit-recete-analiz-raporu.md` (yeni dosya)

---

## 💬 Son Not

Bu analiz **senin özgür görüşün.** Claude'un raporunu önce okuma, ön yargıyla bakma. Sistemi senin gözünden tazelikle incele.

Sonuçta ikimizin analizini birleştirip Aslan'a **ortak bir tavsiye** sunacağız. Eğer bazı noktalarda Claude ile anlaşmazsan, tartışma yaratmaktan çekinme — bu ikili düşünce kalitesini artıracak.

**Başla.** ☕
