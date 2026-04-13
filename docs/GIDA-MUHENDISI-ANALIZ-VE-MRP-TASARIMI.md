# DOSPRESSO — Gıda Mühendisi Görev Analizi & Malzeme Çekme Sistemi Tasarımı
## 14 Nisan 2026 — Kapsamlı Planlama Dokümanı

---

## 1. MEVCUT DURUM

### Sistemde VAR olan gıda mühendisi işlevleri:
| İşlev | Tablo/Endpoint | Durum |
|-------|---------------|:-----:|
| QC 2 aşamalı kontrol | factory_quality_checks, measurements, media | ✅ Çalışıyor |
| HACCP CCP noktaları | factory_recipe_steps (isCriticalControl, ccpNotes) | ✅ Reçete adımlarında |
| 14 AB/TR alerjen tespiti | factory_ingredient_nutrition (allergens jsonb) | ✅ Otomatik |
| Besin değer hesaplama | factory_ingredient_nutrition | ✅ Per-malzeme |
| LOT takibi (FIFO) | production_lots, factory_shipment_items | ✅ Sevkiyatta |
| Fire/zayi kaydı | factory_production_logs (actualWasteKg, actualLossGrams) | ✅ Per-üretim |
| Fire neden kodları | factory_waste_reasons (4 kategori, ciddiyet puanı) | ✅ |
| Kalite ölçüm standartları | factory_quality_specs | ✅ |
| Stok hareketi | inventory_movements (6 tip hareket) | ✅ |

### Sistemde OLMAYAN gıda mühendisi işlevleri:
| # | Eksik İşlev | Neden Kritik | Öncelik |
|---|-----------|-------------|:------:|
| 1 | **Hammadde kabul kontrolü** | Gelen malzeme kalite/sıcaklık/görsel kontrolü. Ret → üretim durur | 🔴 |
| 2 | **Tedarikçi sertifika takibi** | ISO/HACCP/Helal sertifika son kullanma uyarısı. Denetimde sorun olur | 🔴 |
| 3 | **Ürün bekletme (Hold/Release)** | Şüpheli ürünü satıştan çekme. Gıda güvenliği yasal zorunluluk | 🔴 |
| 4 | **DÖF (Düzeltici Önleyici Faaliyet)** | Kalite sorunu → kök neden → düzeltme → doğrulama döngüsü | 🟡 |
| 5 | **Raf ömrü izleme (FEFO)** | Son kullanma yaklaşan → uyarı → sevkiyat önceliği | 🟡 |
| 6 | **Mikrobiyolojik analiz takibi** | Swab test planı, lab sonuç kaydı, fail → aksiyon | 🟡 |
| 7 | **Allerjen beyannamesi PDF** | Ürün bazlı allerjen kartı oluşturma (müşteri/denetim için) | 🟡 |
| 8 | **Ürün spesifikasyon dokümanı** | Teknik veri kartı (müşteri/franchise teslim) | 🟢 |
| 9 | **Etiket bilgisi yönetimi** | İçerik sırası, besin tablosu, allerjen uyarısı → etiket çıktısı | 🟢 |
| 10 | **Denetim planlaması (iç denetim)** | Haftalık/aylık kontrol planı + otomatik atama | 🟢 |
| 11 | **İleri izlenebilirlik** | "Bu LOT hangi şubelere gitti?" ters sorgulama | 🟢 |

---

## 2. AKSİYON → ETKİ ZİNCİRİ (7 Senaryo)

### Senaryo 1: Sema QC'de ÜRÜNÜ REDDEDER
```
Sema: QC → "RET" kararı
  ↓
factory_quality_checks.decision = "rejected"
  ↓
├── production_lots.status = "rejected" (otomatik)
├── factory_inventory -= retEdilen miktar (stok düşer)
├── factory_production_logs.qualityScore düşer
├── Fabrika Müdür: Dobody bildirimi "QC ret — [ürün] [lot]"
├── Üretim Planı: O ürün için yeniden üretim gerekir → plan sapması
├── Sevkiyat: Bu lot sevk EDİLEMEZ → bekleyen siparişler etkilenir
├── Maliyet: Fire maliyeti += (malzeme + işçilik + enerji)
└── RGM: Reçete sorunu mu? → versiyon değişikliği gerekebilir
```

### Senaryo 2: Sema HACCP CCP Noktasında FAIL kaydeder
```
Sema: CCP kontrol → sıcaklık/pH dışında
  ↓
├── Üretim hattı DURUR (CCP fail = hat durması zorunlu)
├── O batch'teki TÜM ürünler "hold" statüsüne alınır
├── Fabrika Müdür + RGM: Acil bildirim
├── Sevkiyat: Tüm bekleyen sevkiyatlar kontrol edilir
├── DÖF süreci başlar (kök neden analizi)
├── Yasal risk: Gıda güvenliği ihlali kayıt altına alınır
└── Düzeltme sonrası: Sema doğrulama yapar → "release" veya "dispose"
```

### Senaryo 3: Sema ALLERJEN bilgisi günceller
```
Sema: Malzeme X → yeni allerjen "süt" eklendi
  ↓
├── factory_ingredient_nutrition.allergens güncellenir
├── Bu malzemeyi kullanan TÜM reçeteler etkilenir
│   ├── Reçete A: allerjen listesi otomatik yeniden hesaplanır
│   ├── Reçete B: aynı
│   └── Reçete C: aynı
├── Etiket bilgisi değişmeli → etiket yeniden basılmalı
├── Franchise şubeleri: Allerjen tablosu güncellenmeli
├── CRM: Alerjisi olan müşteri bildirimi (varsa kayıtlı)
└── RGM: Bildirim "Allerjen değişikliği — X ürünleri etkileniyor"
```

### Senaryo 4: Sema HAMMADDE KABUL'de malzemeyi reddeder
```
Sema: Gelen un → nem oranı yüksek → RET
  ↓
├── Tedarikçiye iade bildirimi
├── Stok: Beklenen giriş gerçekleşmez
├── Üretim: Bu malzemeyi kullanan reçeteler üretilemez
│   ├── Günlük üretim planı sapması
│   └── Malzeme çekme planı yeniden hesaplanır
├── Satınalma: Acil alternatif tedarik talebi
├── Maliyet: Acil tedarik genellikle daha pahalı
├── Fabrika Müdür: "Üretim X ürünü için malzeme yetersiz" uyarısı
└── Tedarikçi puanı düşer (supplier score)
```

### Senaryo 5: RGM reçete değişikliği yapar
```
RGM: Cinnabon reçetesi v3 → v4 (un oranı değişti)
  ↓
├── factory_recipe_versions: v4 snapshot oluşur (malzeme + adım + maliyet)
├── Eski v3: istatistikleri dondurulur (fire%, kalite, maliyet)
├── Yeni v4: izleme başlar
├── Kiosk: Operatörler yeni adımları görür (timer, sıcaklık, CCP değişmişse)
├── Malzeme çekme planı: Yeni miktarlar hesaplanır
├── Maliyet: Birim maliyet değişir → kârlılık etkilenir
├── Eğitim: Şef/operatörlere "reçete değişti" bildirimi
├── Sema: QC standartları güncellenmeli mi? (örn. yeni sıcaklık aralığı)
└── Dashboard: v3 vs v4 karşılaştırma widget'ı
```

### Senaryo 6: Gün sonu ARTAN MALZEME tespit edilir
```
Operatör: Gün sonu → 2.5 kg tereyağı kaldı
  ↓
├── production_area_leftovers: kayıt (malzeme, miktar, durum, sıcaklık)
├── Sistem analizi: Yarının planında tereyağı kullanan reçeteler?
│   ├── Cinnabon: 1.5 kg gerekli → ✅ Bu artandan karşılanabilir
│   ├── Donut glazür: 0.8 kg → ✅ Kalan 1.0 kg'dan 0.8 karşılanır
│   └── Toplam: 2.3 kg kullanılacak, 0.2 kg yeni çekilmeli
├── Yarının malzeme çekme planı otomatik güncellenir
│   └── Tereyağı: Plan 2.3 kg → Çekilecek 0.2 kg (artandan 2.1 kg zaten var)
├── Sema kontrolü: Artan malzeme hâlâ kullanılabilir mi? (sıcaklık, süre)
└── Eğer kullanılamaz → fire kaydı + fire nedeni
```

### Senaryo 7: Malzeme çekme planı oluşturulur (sabah)
```
Sistem (07:00): Günlük üretim planı → malzeme çekme planı hesapla
  ↓
├── Bugünkü reçeteler × batch sayıları → toplam malzeme ihtiyacı
├── Artan malzeme kontrolü (dünden kalan, kullanılabilir)
├── Net ihtiyaç = toplam - artan
├── Depo stok kontrolü: Yeterli mi?
│   ├── Yeterli → çekme listesi oluştur
│   └── Yetersiz → Satınalma + Fabrika Müdür uyarısı
├── Depocu: Çekme listesini alır → malzemeleri hazırlar
├── Operatör: Üretim alanında malzeme teslim alır → onaylar
├── Stok hareketi: inventory_movements (depo → üretim alanı transfer)
└── Gün sonu: Kullanılan + artan = toplam çekilen (mutabakat)
```

---

## 3. MALZEME ÇEKME SİSTEMİ (MRP-Light) — SCHEMA TASARIMI

### 3.1 Yeni Tablolar

```
A) daily_material_plans — Günlük malzeme ihtiyaç planı
   ├── id, planDate, status (draft|confirmed|completed)
   ├── createdBy, approvedBy, approvedAt
   ├── totalItemCount, totalCostEstimate
   ├── notes
   └── createdAt, updatedAt

B) daily_material_plan_items — Plan kalemleri
   ├── id, planId → daily_material_plans.id
   ├── inventoryId → inventory.id (hammadde/malzeme)
   ├── recipeId → factory_recipes.id (hangi reçete için)
   ├── batchCount (kaç batch üretilecek)
   ├── requiredQuantity (reçeteden hesaplanan)
   ├── leftoverQuantity (dünden kalan kullanılabilir)
   ├── netPickQuantity (çekilmesi gereken = required - leftover)
   ├── actualPickedQuantity (gerçek çekilen)
   ├── unit
   ├── pickedBy, pickedAt (kim çekti, ne zaman)
   ├── status (pending|picked|verified|short)
   └── notes

C) production_area_leftovers — Üretim alanı artan malzeme
   ├── id, recordDate
   ├── inventoryId → inventory.id
   ├── remainingQuantity, unit
   ├── condition (good|marginal|unusable)
   ├── storageTemp (°C kaydı — soğuk zincir kontrolü)
   ├── expiryRisk (boolean — raf ömrü yaklaşıyor mu)
   ├── usableForRecipes (jsonb — hangi reçetelerde kullanılabilir, sistem hesaplar)
   ├── usedInNextDay (boolean — ertesi gün kullanıldı mı)
   ├── usedQuantity (ne kadar kullanıldı)
   ├── wastedQuantity (fire olarak atılan)
   ├── wasteReason
   ├── recordedBy, verifiedBy (kayıt + gıda mühendisi doğrulama)
   └── createdAt

D) material_pick_logs — Malzeme çekme hareketleri (audit trail)
   ├── id, planItemId → daily_material_plan_items.id
   ├── inventoryId, quantity, unit
   ├── fromLocation (depo_ana|depo_soguk|depo_kuru)
   ├── toLocation (uretim_alani|hazirlk_masasi)
   ├── lotNumber, expiryDate (FEFO — en yakın SKT önce)
   ├── pickedBy, verifiedBy
   ├── movementId → inventory_movements.id (stok hareketi bağlantısı)
   └── createdAt
```

### 3.2 Mevcut Tablolarla Bağlantı Noktaları

```
inventory (hammadde stoku)
  ↕ inventory_movements (stok hareketi — "uretim_cikis" tipi)
  ↕ daily_material_plan_items (ne kadar çekilmeli)
  ↕ material_pick_logs (gerçek çekme kaydı)
  ↕ production_area_leftovers (gün sonu artan)

factory_recipes + factory_recipe_ingredients (reçete malzeme listesi)
  → daily_material_plan_items (batch × malzeme miktarı hesaplama)

weekly_production_plans + production_plan_items (haftalık plan)
  → daily_material_plans (günlük plana dönüştürme)

factory_production_logs (üretim kaydı)
  → daily_material_plan_items (plan vs gerçek mutabakat)
```

### 3.3 Günlük Akış (Saat Bazlı)

```
06:30  Sistem: Günlük üretim planı → malzeme çekme planı otomatik oluştur
       ├── Haftalık plandan bugünün üretim listesini çek
       ├── Her reçete × batch sayısı → malzeme ihtiyacı hesapla
       ├── Dünün artan malzemelerini kontrol et (usable olanlar)
       ├── Net çekilecek miktarı hesapla
       └── Depo stok yeterliliğini kontrol et (eksikse uyarı)

07:00  Depocu: Çekme listesini görür (kiosk veya tablet)
       ├── Malzemeleri FEFO sırasıyla hazırlar
       ├── Her malzemeyi tartıp onaylar
       ├── LOT numarası + SKT kaydeder
       └── "Hazır" işaretler

07:30  Operatör/Şef: Üretim alanında teslim alır
       ├── Miktarları doğrular
       ├── Sıcaklık kontrolü (soğuk zincir malzemeler)
       └── "Teslim aldım" onayı

07:30-17:00  Üretim devam eder (mevcut kiosk + production log sistemi)

17:00  Operatör: Gün sonu artan malzeme kaydı
       ├── Her malzeme için kalan miktarı girer
       ├── Durumu belirtir (iyi/sınırda/kullanılamaz)
       ├── Sıcaklık kaydı
       └── "Kullanılamaz" ise fire kaydı + neden

17:30  Sistem: Artan malzeme analizi
       ├── Yarının reçetelerini tara
       ├── Her artan malzemeyi eşleştir
       ├── "Kullanılabilir" olanları yarının planına ekle
       └── Yarının net çekme miktarını hesapla

18:00  Sema (Gıda Mühendisi): Gün sonu doğrulama
       ├── Artan malzeme koşullarını onaylar
       ├── Sıcaklık/durum riskli → fire kararı
       └── "Yarın kullanılabilir" onayı
```

### 3.4 Rol × Yetki Matrisi

| Aksiyon | Depocu | Operatör | Şef | Üretim Şefi | Fabrika Müdür | Gıda Müh. | RGM |
|---------|:------:|:--------:|:---:|:-----------:|:------------:|:---------:|:---:|
| Çekme planı görüntüle | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Malzeme çek (pick) | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Teslim al (receive) | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Artan malzeme kayıt | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Artan malzeme doğrula | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Fire kararı | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Plan oluştur/düzenle | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Stok yetersiz uyarı al | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| FEFO ihlali uyarı | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |

### 3.5 Artan Malzeme Eşleştirme Algoritması

```
Girdi: Dünün artanları + yarının üretim planı

Adım 1: Tüm artan malzemeleri listele (condition = good|marginal)
Adım 2: Yarının reçetelerinden malzeme ihtiyaç listesi çıkar
Adım 3: Her artan malzeme için:
   a) Yarının hangi reçetelerinde bu malzeme var?
   b) Ne kadar gerekli?
   c) Artan miktar ≥ gerekli → tam karşıla
   d) Artan miktar < gerekli → kısmi karşıla, kalanı depodan çek
   e) "marginal" durumdakiler → gıda mühendisi onayına sun
Adım 4: Net çekme listesi oluştur (toplam - artandan karşılanan)
Adım 5: FEFO kontrolü (artanın SKT'si uygun mu?)

Çıktı: Güncellenmiş çekme planı + artan kullanım raporu
```

---

## 4. GİDA MÜHENDİSİ DASHBOARD WIDGETLARI

### Sema (gida_muhendisi) Dashboard:
| Widget | Veri Kaynağı | Tıklanınca |
|--------|-------------|-----------|
| Bekleyen QC onayları | factory_quality_checks WHERE status='pending' | → /fabrika/kalite-kontrol |
| Bugünkü artan malzeme doğrulama | production_area_leftovers WHERE verifiedBy IS NULL | → Doğrulama ekranı |
| En çok fire veren ürünler (30 gün) | factory_production_logs GROUP BY recipeId | → Fire detay raporu |
| HACCP CCP uyarıları | factory_production_logs WHERE CCP fail | → CCP detay |
| Allerjen değişiklik bildirimleri | factory_ingredient_nutrition recent changes | → Allerjen yönetimi |
| Reçete versiyonu kalite trendi | production_logs × recipe_versions | → Versiyon karşılaştırma |
| Tedarikçi sertifika uyarısı | (yeni tablo — faz 2) | → Tedarikçi detay |
| FEFO uyarıları (SKT yaklaşan) | inventory WHERE expiryDate < NOW()+7d | → Stok detay |

### RGM (recete_gm) Dashboard:
| Widget | Veri Kaynağı | Tıklanınca |
|--------|-------------|-----------|
| Reçete versiyonları timeline | factory_recipe_versions | → Versiyon detay |
| Versiyon bazlı kalite/fire karşılaştırma | production_logs × versions | → Grafik |
| Maliyet değişim (versiyon bazlı) | recipe_versions.costSnapshot | → Maliyet analizi |
| Bekleyen reçete onayları | factory_recipe_versions WHERE status='pending' | → Onay ekranı |
| Günlük malzeme çekme planı durumu | daily_material_plans (bugün) | → Plan detay |
| Artan malzeme eşleştirme önerileri | production_area_leftovers × recipes | → Eşleştirme |
| Üretim planı sapması | plan vs actual (production_logs) | → Sapma raporu |
| Keyblend stok durumu | factory_keyblends stock levels | → Keyblend yönetimi |

---

## 5. FAZLAMA ÖNERİSİ

### Faz 0 — Acil Düzeltmeler (✅ YAPILDI)
- [x] recete_gm, sef, uretim_sefi → ROLE_MAPPING
- [x] gida_muhendisi sidebar → factory-recipes
- [x] gida_muhendisi branch yetki temizliği
- [x] Reçete versiyonlama altyapısı (schema + start-production capture)

### Faz 1 — Otomatik Versiyonlama (2-3 saat, SONRAKİ OTURUM)
- [ ] PATCH /api/factory/recipes/:id → düzenlemeden önce otomatik version snapshot
- [ ] costSnapshot kaydetme (malzeme + işçilik + enerji)
- [ ] Versiyon onay akışı (RGM onayı zorunlu)

### Faz 2 — Malzeme Çekme Sistemi Sprint 1 (4-6 saat)
- [ ] 4 yeni tablo: daily_material_plans, plan_items, leftovers, pick_logs
- [ ] Günlük çekme planı hesaplama API'si (reçete × batch → malzeme)
- [ ] Depocu çekme/onay endpoint'leri
- [ ] Artan malzeme kayıt endpoint'leri
- [ ] Stok hareketi entegrasyonu (inventory_movements bağlantısı)

### Faz 3 — Artan Malzeme Akıllı Eşleştirme (3-4 saat)
- [ ] Eşleştirme algoritması (artan → yarının reçeteleri)
- [ ] Gıda mühendisi doğrulama akışı
- [ ] Net çekme planı otomatik güncelleme
- [ ] FEFO kontrolü

### Faz 4 — Dashboard & Raporlama (3-4 saat)
- [ ] Gıda mühendisi dashboard widgetları
- [ ] RGM dashboard widgetları
- [ ] Reçete versiyonu kalite karşılaştırma grafiği
- [ ] Fire/zayi trend raporu (versiyon bazlı)
- [ ] Malzeme kullanım raporu (plan vs gerçek)

### Faz 5 — İleri Özellikler (gelecek sprintler)
- [ ] Hammadde kabul kontrolü (giriş QC)
- [ ] Tedarikçi sertifika takibi
- [ ] Ürün bekletme (Hold/Release) sistemi
- [ ] DÖF (Düzeltici Önleyici Faaliyet)
- [ ] Mikrobiyolojik analiz takibi
- [ ] Allerjen beyannamesi PDF
- [ ] İleri izlenebilirlik (lot → şube sorgusu)

---

## 6. ÖN KOŞULLAR

1. **Depocu rolü**: Sistemde tanımlı mı? Yoksa yeni rol oluşturulmalı (fabrika_depocu?)
2. **Inventory verisi**: inventory tablosunda hammadde/malzeme verileri yeterli mi? SKT, lot bilgisi var mı?
3. **Depo lokasyonları**: Kaç depo/bölüm var? (ana depo, soğuk depo, kuru depo)
4. **Yarı mamül akışı**: Keyblend üretim → ara stok → nihai ürüne malzeme olarak girme akışı nasıl?
5. **Ingredient bağlantısı**: factory_recipe_ingredients ↔ inventory tablosu bağlantısı kurulmalı
6. **Birim dönüşümü**: Reçetede gram, depoda kilogram — birim çevrimi gerekli mi?
