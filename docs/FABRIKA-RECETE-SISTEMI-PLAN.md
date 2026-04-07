# FABRİKA REÇETE YÖNETİM SİSTEMİ — Kapsamlı Plan
## Tarih: 7 Nisan 2026 | Onay Bekliyor: Aslan

---

## 1. VİZYON

Fabrika personeli kiosk ekranından:
1. Ürün seçer → reçeteyi görür
2. Batch miktarını ayarlar (×1, ×1.5, ×2, ×3 veya AR-GE %10)
3. "Üretime Başla" tıklar → adım adım fotoğraflı rehber açılır
4. Her adımda malzeme miktarları batch'e göre otomatik hesaplanır
5. Timer'lı adımlarda geri sayım başlar
6. Üretim tamamlandığında üretim kaydı otomatik oluşturulur

---

## 2. MEVCUT DURUM ANALİZİ

### İKİ AYRI reçete sistemi var:

| Sistem | Tablo | Amaç | Durum |
|--------|-------|------|-------|
| Şube Reçeteleri | `recipes` + `recipeVersions` + `recipeIngredients` | Kahve/içecek reçeteleri (barista kullanır) | AKTİF, versiyonlu |
| Fabrika Reçeteleri | `productRecipes` + `productRecipeIngredients` | Üretim reçeteleri (fabrika kullanır) | AKTİF ama EKSİK |

### Fabrika Reçetelerinde EKSİK olan:
- ❌ Adım adım üretim talimatları (steps) → sadece malzeme listesi var
- ❌ Fotoğraflı adımlar
- ❌ Batch ölçeklendirme (porsiyon çarpanı)
- ❌ AR-GE modu
- ❌ Timer sistemi
- ❌ Kiosk entegrasyonu
- ❌ Malzeme referans sistemi ({ingredient_id})

---

## 3. YETKİ MATRİSİ

| Rol | Reçete Görüntüle | Reçete Düzenle | Reçete Oluştur | Versiyon Onayla | Batch Seçimi | AR-GE Modu |
|-----|:-:|:-:|:-:|:-:|:-:|:-:|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ceo | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| pasta_sefi* | ✅ | ✅ | ✅ | ❌ (öneri→onay) | ✅ | ✅ |
| fabrika_mudur | ✅ | ❌ READ ONLY | ❌ | ✅ | ✅ | ✅ |
| fabrika_sorumlu | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| fabrika_operator | ✅ (atanan ürün) | ❌ | ❌ | ❌ | ✅ | ❌ |
| fabrika_personel | ✅ (atanan ürün) | ❌ | ❌ | ❌ | ❌ | ❌ |

*`pasta_sefi` yeni rol mü yoksa mevcut bir rol mü? → **ASLAN'A SORU**
- Seçenek A: Yeni rol ekle (`pasta_sefi`)
- Seçenek B: Mevcut `fabrika_sorumlu` veya `gida_muhendisi` kullanılsın
- Seçenek C: Yetki bazlı (`recipe_edit` permission'ı olan herkes)

### Düzenleme Akışı (Onay Mekanizması)
```
Pasta Şefi → Reçete düzenler → "Değişiklik Önerisi" oluşur
  → Fabrika Müdür / Admin → Onaylar veya Reddeder
  → Onaylanınca → Yeni versiyon aktif olur
  → Eski versiyon arşivlenir (diff görüntülenebilir)
```

---

## 4. VERİTABANI TASARIMI (Yeni Tablolar)

### 4.1 factory_recipe_steps — Üretim Adımları
```
factory_recipe_steps
├── id (serial PK)
├── recipe_id (FK → product_recipes.id)
├── step_number (integer, sıra)
├── title (varchar 255) — "Yaş maya aktivasyonu"
├── content (text) — "{0011} yaş mayayı suda eritin..." (malzeme ref'li)
├── photo_url (text) — Adım fotoğrafı
├── photo_caption (text) — Fotoğraf açıklaması
├── timer_seconds (integer, nullable) — 300 = 5 dakika
├── temperature_celsius (integer, nullable) — 180°C
├── equipment_needed (text) — "Spiral mikser, 1. vites"
├── critical_control_point (boolean) — HACCP kontrol noktası mı?
├── ccp_notes (text) — CCP ise kontrol detayı
├── tips (text) — İpucu/uyarı
├── sort_order (integer)
├── created_at (timestamp)
├── updated_at (timestamp)
```

### 4.2 factory_recipe_step_photos — Adım Çoklu Fotoğraf
```
factory_recipe_step_photos
├── id (serial PK)
├── step_id (FK → factory_recipe_steps.id)
├── photo_url (text)
├── caption (text)
├── sort_order (integer)
├── created_at (timestamp)
```

### 4.3 factory_batch_presets — Batch Ölçek Şablonları
```
factory_batch_presets
├── id (serial PK)
├── recipe_id (FK → product_recipes.id)
├── name (varchar 100) — "Standart", "Çift Batch", "AR-GE Deneme"
├── multiplier (numeric 5,2) — 1.00, 1.50, 2.00, 3.00, 0.10
├── preset_type (varchar 20) — "standard" | "arge"
├── is_default (boolean) — varsayılan mı?
├── notes (text)
├── created_by (FK → users.id)
├── created_at (timestamp)
```

### 4.4 factory_production_logs — Üretim Takip Logu
```
factory_production_logs
├── id (serial PK)
├── recipe_id (FK → product_recipes.id)
├── batch_multiplier (numeric) — hangi çarpanla üretildi
├── started_at (timestamp)
├── completed_at (timestamp)
├── started_by (FK → users.id)
├── completed_by (FK → users.id)
├── status (varchar) — "in_progress" | "completed" | "aborted"
├── step_progress (jsonb) — {"s1": true, "s2": true, "s3": false}
├── notes (text)
├── quality_score (integer) — QC puanı (sonradan girilir)
├── is_arge (boolean) — AR-GE üretimi mi?
├── arge_notes (text) — AR-GE notları
├── branch_id (integer) — Fabrika branch ID
├── created_at (timestamp)
```

### Mevcut Tabloları DEĞİŞTİRME

`product_recipes` tablosuna EK kolonlar:
```sql
ALTER TABLE product_recipes ADD COLUMN IF NOT EXISTS
  base_servings INTEGER DEFAULT 1,           -- Baz porsiyon/batch (ör: 65 adet)
  serving_unit VARCHAR(20) DEFAULT 'adet',   -- "adet", "kg", "lt"
  total_weight_grams INTEGER,                -- Toplam hamur/karışım ağırlığı
  category VARCHAR(50),                       -- "cinnamon_roll", "donut", "kurabiye"
  difficulty VARCHAR(20) DEFAULT 'medium',    -- "easy", "medium", "hard"
  estimated_total_minutes INTEGER,            -- Tahmini toplam süre
  bakers_percentage_notes TEXT,               -- Baker's yüzdeler (markdown)
  technical_notes TEXT,                        -- Teknik notlar (markdown)
  change_log TEXT,                             -- Değişiklik geçmişi
  cover_photo_url TEXT,                        -- Kapak fotoğrafı
  is_arge_enabled BOOLEAN DEFAULT TRUE;       -- AR-GE modu açık mı?
```

`product_recipe_ingredients` tablosuna EK:
```sql
ALTER TABLE product_recipe_ingredients ADD COLUMN IF NOT EXISTS
  ref_id VARCHAR(10),                         -- "0001", "0002" (adım içi referans)
  ingredient_category VARCHAR(50),            -- "ana", "katki", "lezzet", "dolgu"
  sort_order INTEGER DEFAULT 0;
```

---

## 5. FRONTEND MİMARİSİ

### 5.1 Sayfa Yapısı

```
/fabrika/receteler                    → Reçete listesi (kartlar)
/fabrika/receteler/:id                → Reçete detay (malzeme + adımlar + notlar)
/fabrika/receteler/:id/uretim         → Üretim modu (adım adım, tam ekran)
/fabrika/receteler/:id/duzenle        → Düzenleme (pasta şefi + admin)
/fabrika/receteler/yeni               → Yeni reçete oluşturma
```

### 5.2 Reçete Listesi Sayfası
```
┌─────────────────────────────────────────────────────┐
│ 🍞 Fabrika Reçeteleri          [+ Yeni Reçete]     │
│                                                      │
│ [Tümü] [Cinnamon Roll] [Donut] [Kurabiye] [AR-GE]  │
│                                                      │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│ │ 📸            │ │ 📸            │ │ 📸            │  │
│ │              │ │              │ │              │  │
│ │ Cinnabon     │ │ Glazed Donut │ │ Brownie      │  │
│ │ Full Rev.    │ │ Klasik       │ │ Çikolata     │  │
│ │              │ │              │ │              │  │
│ │ 65 adet/batch│ │ 48 adet/batch│ │ 80 adet/batch│  │
│ │ 23 malzeme   │ │ 15 malzeme   │ │ 12 malzeme   │  │
│ │ 10 adım      │ │ 8 adım       │ │ 6 adım       │  │
│ │ ~4.5 saat     │ │ ~3 saat      │ │ ~2 saat      │  │
│ │              │ │              │ │              │  │
│ │ [Üretime Başla]│ [Üretime Başla]│ [Üretime Başla]│  │
│ └──────────────┘ └──────────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 5.3 Reçete Detay Sayfası
```
┌─────────────────────────────────────────────────────┐
│ ← Geri    Cinnabon Full Revizyon    [🔧 Düzenle]   │
│                                                      │
│ [Malzemeler] [Adımlar] [Teknik Notlar] [Geçmiş]    │
│                                                      │
│ ── BATCH AYARI ──────────────────────────────────── │
│                                                      │
│  Baz: 65 adet    Batch Çarpanı:                     │
│                                                      │
│  [×0.5] [×1] [×1.5] [×2] [×3] [AR-GE (%10)]       │
│                                                      │
│  veya özel: [___] adet                              │
│                                                      │
│  Seçili: ×2 = 130 adet                              │
│                                                      │
│ ── MALZEMELER ───────────────────────────────────── │
│                                                      │
│  ▸ Ana Malzemeler                                    │
│    Orta-güçlü un (W250-280)     10000 gr            │
│    Modifiye nişasta              300 gr              │
│    Vital wheat gluten            100 gr              │
│    Toz şeker                     1200 gr             │
│    ...                                               │
│                                                      │
│  ▸ Katkı/İmprover Paketi                            │
│    DATEM (E472e)                 30 gr               │
│    SSL (E481)                    30 gr               │
│    ...                                               │
│                                                      │
│  ▸ Lezzet Malzemeleri                               │
│    Vanilya özütü                 70 ml               │
│                                                      │
│                    [🍳 Üretime Başla]                │
└─────────────────────────────────────────────────────┘
```

### 5.4 Üretim Modu (Kiosk Tam Ekran) — EN KRİTİK
```
┌─────────────────────────────────────────────────────┐
│  ← Geri    Adım 4 / 10    İleri →                  │
│  ═══════════════●════════════                       │
│                                                      │
│  📸 [ADIM FOTOĞRAFI — büyük, net]                   │
│                                                      │
│  ─────────────────────────────────────              │
│                                                      │
│  Sıvı Ekleme + Hidrasyon                            │
│                                                      │
│  Kalan [4300gr Su] suyu (~3800-3900gr) 28-30°C'de   │
│  hazırlayın. [550gr Yumurta tozu] yumurta tozunu    │
│  suda iyice çözün (2 dk çırpın — topak kalmasın).   │
│  [150gr İnvert şeker] invert şekeri ve              │
│  [150gr Gliserin] gliserini ekleyin.                │
│                                                      │
│  💡 İPUCU: Su sıcaklığı 30°C'yi geçmemelidir!      │
│                                                      │
│  ⚠️ HACCP: İç sıcaklık kontrolü yapın              │
│                                                      │
│  ┌────────────────────────────┐                     │
│  │  ⏱ Sıvı Ekleme + Hidrasyon│                     │
│  │     04:00                   │                     │
│  │  [▶ Başlat] [⟲ Sıfırla]   │                     │
│  └────────────────────────────┘                     │
│                                                      │
│  Batch: ×2 (130 adet)    Sıcaklık: 28-30°C         │
└─────────────────────────────────────────────────────┘
```

### 5.5 Malzeme Referans Chip Tasarımı
```
Normal metin [4300gr Su] normal metin devam eder

Chip stili:
- Arka plan: bg-amber-100 dark:bg-amber-900/30
- Border: border-amber-300 dark:border-amber-700
- Metin: font-semibold text-amber-800 dark:text-amber-200
- Border-radius: rounded-md
- Padding: px-1.5 py-0.5
- Tıklama: tooltip ile tam malzeme adı gösterilir
```

### 5.6 AR-GE Modu
```
┌─────────────────────────────────────────────────────┐
│  🔬 AR-GE Deneme Üretimi                           │
│                                                      │
│  Baz reçete: 65 adet                                │
│  AR-GE miktar: %10 = 6-7 adet                      │
│                                                      │
│  ⚠️ AR-GE üretimi — normal üretim sayılmaz         │
│  📝 AR-GE notları zorunlu                           │
│                                                      │
│  [Deneme notu: ________________________________]    │
│  [________________________________]                  │
│                                                      │
│  [🔬 AR-GE Üretimine Başla]                        │
└─────────────────────────────────────────────────────┘

AR-GE üretimi tamamlandığında:
- factory_production_logs.is_arge = true
- Normal üretim raporlarından ayrılır
- AR-GE notu zorunlu (ne denendi, sonuç ne)
- QC akışına girmez (isteğe bağlı)
```

---

## 6. API TASARIMI

### Reçete CRUD
```
GET    /api/factory/recipes                    → Tüm fabrika reçeteleri
GET    /api/factory/recipes/:id                → Reçete detay (malzeme + adım + fotoğraf)
POST   /api/factory/recipes                    → Yeni reçete (admin, pasta_sefi)
PATCH  /api/factory/recipes/:id                → Güncelle (admin, pasta_sefi)
DELETE /api/factory/recipes/:id                → Soft delete (admin)
```

### Adım Yönetimi
```
GET    /api/factory/recipes/:id/steps          → Reçete adımları
POST   /api/factory/recipes/:id/steps          → Adım ekle
PATCH  /api/factory/recipes/:id/steps/:stepId  → Adım güncelle
DELETE /api/factory/recipes/:id/steps/:stepId  → Adım sil
POST   /api/factory/recipes/:id/steps/:stepId/photo → Fotoğraf yükle
POST   /api/factory/recipes/:id/steps/reorder  → Sıralama değiştir
```

### Batch & Üretim
```
GET    /api/factory/recipes/:id/batch-presets   → Batch şablonları
POST   /api/factory/recipes/:id/start-production → Üretim başlat
PATCH  /api/factory/production-logs/:id         → Üretim güncelle (adım ilerle)
POST   /api/factory/production-logs/:id/complete → Üretim tamamla
GET    /api/factory/production-logs             → Üretim geçmişi
```

### Scaled Malzeme Hesaplama
```
GET    /api/factory/recipes/:id/calculate?multiplier=2.0
→ Tüm malzemeleri çarpanla hesaplar, {ref_id} referanslarıyla döner
```

---

## 7. KİOSK ENTEGRASYONU

### Fabrika Kiosk Ana Ekranına Ekleme
Mevcut fabrika kiosk ekranında yeni buton:
```
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Vardiya  │ │ Üretim   │ │ 📖       │
│ Başlat   │ │ Kayıt    │ │ REÇETELER│
│          │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘
```

### Kiosk Reçete Akışı
```
Kiosk Ana → "Reçeteler" → Ürün Listesi → Ürün Seç
  → Batch Ayarı (×1, ×2, ×3, AR-GE)
  → "Üretime Başla"
  → Adım 1 [fotoğraf + metin + timer]
  → Adım 2 ...
  → "Üretim Tamamlandı" → Log kaydedilir
```

### Kiosk Özel UI Kuralları
- BÜYÜK font (kiosk'ta uzaktan okunacak)
- BÜYÜK butonlar (eldiven ile dokunulacak)
- Fotoğraflar BÜYÜK ve NET
- Timer sesi YÜKSEK (fabrika gürültüsü)
- Malzeme chip'leri BÜYÜK ve renkli
- Adım geçişi: hem buton hem swipe

---

## 8. REÇETE DIFF / VERSİYON GEÇMİŞİ

Pasta şefi reçete değiştirdiğinde:
```
┌─────────────────────────────────────────────────────┐
│  📋 Reçete Değişikliği — Onay Bekliyor              │
│                                                      │
│  Cinnabon Full Revizyon — v3 → v4                   │
│  Değiştiren: Pasta Şefi Mehmet                      │
│  Tarih: 7 Nisan 2026                                │
│                                                      │
│  ── DEĞİŞİKLİKLER ──                               │
│                                                      │
│  Malzeme: Toz şeker                                 │
│    ESKİ: 600gr    YENİ: 550gr  (-50gr)              │
│                                                      │
│  Adım 3: Sıvı ekleme                               │
│    ESKİ: "28-30°C'de hazırlayın"                    │
│    YENİ: "26-28°C'de hazırlayın" (sıcaklık düşürüldü)│
│                                                      │
│  Yeni Adım: "İstirahat (30 dk)"                     │
│    (Adım 5 olarak eklendi)                           │
│                                                      │
│  Değişiklik Notu: "Hamur yapışkanlığı azaltıldı,    │
│  su sıcaklığı düşürülerek gluten oluşumu kontrol    │
│  altına alındı."                                     │
│                                                      │
│  [✅ Onayla]  [❌ Reddet]  [💬 Yorum Yaz]          │
└─────────────────────────────────────────────────────┘
```

---

## 9. SPRİNT PLANI

### Sprint R-1: Temel Yapı (5-6 saat)
- [ ] DB: factory_recipe_steps, factory_recipe_step_photos, factory_batch_presets tabloları
- [ ] DB: product_recipes ve product_recipe_ingredients'a ek kolonlar
- [ ] API: CRUD endpoints (reçete, adım, fotoğraf)
- [ ] API: Batch hesaplama endpoint'i
- [ ] Frontend: /fabrika/receteler listesi (kartlar)
- [ ] Frontend: /fabrika/receteler/:id detay (malzeme + batch ayarı)

### Sprint R-2: Üretim Modu (4-5 saat)
- [ ] Frontend: Üretim modu tam ekran (adım adım, fotoğraf, timer)
- [ ] Malzeme referans parse sistemi ({0001} → chip)
- [ ] Timer sistemi (başlat, durdur, sıfırla, sesli bildirim)
- [ ] API: Üretim log (başlat, adım ilerle, tamamla)
- [ ] Kiosk entegrasyonu (fabrika kiosk ana ekranına "Reçeteler" butonu)

### Sprint R-3: AR-GE + Yetki + Diff (3-4 saat)
- [ ] AR-GE modu (%10 üretim, zorunlu not)
- [ ] Reçete düzenleme sayfası (pasta şefi + admin)
- [ ] Onay mekanizması (değişiklik önerisi → Fabrika Müdür onayı)
- [ ] Versiyon diff görüntüleme (eski → yeni)
- [ ] Reçete bildirimi (değişiklik yapıldığında ilgililere notification)

### Sprint R-4: İleri Özellikler (3-4 saat)
- [ ] Seed data: Cinnabon reçetesi (tam veri)
- [ ] Baker's yüzdeler tablosu (markdown render)
- [ ] Reçete yazdırma modu
- [ ] Dobody entegrasyonu (reçete değişikliği bildirimi)
- [ ] Maliyet hesaplama entegrasyonu (product_recipes maliyetiyle birleşir)

---

## 10. SEED VERİSİ — CİNNABON REÇETE ÖRNEĞİ

İlk seed olarak tam Cinnabon reçetesi yüklenecek:
- 23 malzeme (3 grup: ana, katkı, lezzet)
- 10+ adım (her adımda fotoğraf placeholder)
- 3 batch preset (×1, ×2, AR-GE %10)
- Baker's yüzdeler tablosu
- Baz porsiyon: 65 adet

Bu reçete veri yapısını doğrulamak ve UI'ı test etmek için kullanılacak.

---

## 11. ASLAN'A SORULAR

1. **Pasta Şefi rolü**: Yeni rol mü ekleyelim (`pasta_sefi`), yoksa mevcut `gida_muhendisi` veya `fabrika_sorumlu` mu kullanalım?

2. **Batch çarpanları**: Sabit preset'ler mi (×1, ×1.5, ×2, ×3) yoksa serbest sayı girişi de olsun mu?

3. **AR-GE üretim oranı**: %10 sabit mi, yoksa serbest oran girilsin mi (%5, %10, %25)?

4. **Kiosk erişimi**: Fabrika kiosk'tan reçete düzenlenebilir mi, yoksa sadece görüntüleme + üretim modu mu?

5. **Fotoğraf kaynağı**: Adım fotoğrafları kim çekecek/yükleyecek? Pasta şefi mi, admin mi?

6. **Duyuru entegrasyonu**: Reçete değiştiğinde otomatik duyuru mu oluşsun, yoksa manuel mi gönderilsin?

7. **Mevcut recipes tablosu**: Şube kahve reçeteleri + fabrika üretim reçeteleri ayrı mı kalacak, yoksa birleştirilsin mi?
