# FABRİKA REÇETE YÖNETİM SİSTEMİ — Final Plan v3
## Tarih: 7 Nisan 2026 | Durum: ONAYLANDI

---

## 1. VİZYON

Fabrika-içi kapalı, gizli formüllerin Keyblend sistemiyle korunduğu,
mamül/yarı mamül üretim zincirinin yönetildiği, besin değerlerinin
AI ile otomatik hesaplandığı endüstriyel reçete yönetim sistemi.
Şubelerden tamamen bağımsız.

---

## 2. YENİ ROLLER (2 adet)

### Mevcut roller korunur, 2 yeni eklenir:
```
MEVCUT:
  gida_muhendisi  → Sema  (gıda güvenliği, tüm reçeteleri GÖRÜR, keyblend gizli)

YENİ:
  sef             → Ümit Usta  (pasta şefi, sınırlı kategori, açık reçete düzenleme)
  recete_gm       → İlker  (reçete GM, keyblend MASTER, tam kontrol)
```

### Etkilenen dosyalar (2 yeni rol için):
1. `shared/schema/schema-01.ts` — UserRole enum'a SEF + RECETE_GM ekle
2. `shared/schema/schema-02.ts` — PERMISSIONS map'e 2 yeni rol ekle
3. `shared/module-manifest.ts` — modül erişimleri
4. `server/menu-service.ts` — sidebar items
5. `server/seed-roles.ts` — rol seed
6. Toplam: ~5 dosya değişikliği

---

## 3. YETKİ PİRAMİDİ

```
                 ADMIN
                   │ Her şeyi görür/düzenler
                   │
          RECETE GM (İlker)
          │ Keyblend MASTER — oluşturur, düzenler, görür
          │ Tüm reçetelere tam erişim
          │ Reçete kilitleme/açma
          │ GM1'e keyblend bileşen gösterme kontrolü
          │ Şefin erişim kategorilerini kontrol
          │
     GIDA MÜHENDİSİ (Sema)
     │ Tüm reçeteleri görür (tüm kategoriler)
     │ DÜZENLEYEMEZ
     │ Keyblend = sadece kod+ağırlık
     │ İlker'in açtığı keyblend bileşenlerini görür (oranlar HARİÇ)
     │
     ŞEF (Ümit Usta)
     │ SADECE izin verilen kategoriler
     │ Kilitli olmayan reçeteleri düzenleyebilir
     │ Yeni reçete oluşturabilir (izinli kategoride)
     │ Keyblend = sadece kod+ağırlık (gizli)
     │
     FABRİKA MÜDÜR / SORUMLU / OPERATÖR / PERSONEL
       Görüntüleme + batch ayarlama + üretime başlama
       Düzenleme YOK
```

---

## 4. REÇETE KİLİT SİSTEMİ (Per-Reçete)

```
Akış:
  1. Şef reçete oluşturur → durum: AÇIK (edit_locked=false)
  2. Reçete GM inceler → "Kilitle" → edit_locked=true
  3. Reçete GM bazı bileşenleri keyblend'e çevirir
  4. Şef artık sadece görüntüler
  5. Güncelleme gerekirse → Reçete GM kilidi açar → Şef düzenler → tekrar kilitler

DB:
  edit_locked     BOOLEAN DEFAULT FALSE
  locked_by       VARCHAR → users(id)
  locked_at       TIMESTAMPTZ
  lock_reason     TEXT
```

---

## 5. ŞEF KATEGORİ ERİŞİMİ (Dinamik)

```
factory_recipe_category_access (
  id              SERIAL PK,
  role            VARCHAR(30),          -- "sef"
  category        VARCHAR(50),          -- "cookie", "cinnamon_roll"
  can_view        BOOLEAN DEFAULT TRUE,
  can_edit        BOOLEAN DEFAULT TRUE,
  can_create      BOOLEAN DEFAULT TRUE,
  set_by          VARCHAR → users(id),  -- Kim ayarladı (recete_gm/admin)
  updated_at      TIMESTAMPTZ
)

Varsayılan kategoriler:
  ŞEF ERİŞEBİLİR:                ŞEF ERİŞEMEZ:
  ✅ cookie (kurabiye)            ❌ donut
  ✅ cinnamon_roll                ❌ konsantre
  ✅ borek_pogaca                 ❌ cikolata_toz
  ✅ kek_pasta                    ❌ baz_toz_surup
  ✅ tuzlu_hamur                  ❌ ozel_karisim

Admin/Reçete GM bu tabloyu admin panelden yönetir (dinamik).
```

---

## 6. KEYBLEND SİSTEMİ

### Gizlilik Katmanları
```
                    Admin  Reçete GM  Gıda Müh  Şef   Personel
Keyblend kodu       ✅      ✅         ✅        ✅     ✅
Keyblend ağırlık    ✅      ✅         ✅        ✅     ✅
Bileşen isimleri    ✅      ✅         ⚙️*       ❌     ❌
Bileşen oranları    ✅      ✅         ❌        ❌     ❌
Keyblend oluşturma  ✅      ✅         ❌        ❌     ❌
Keyblend düzenleme  ✅      ✅         ❌        ❌     ❌

⚙️* = Reçete GM per-keyblend kontrol eder:
  "KB-D01 bileşen isimlerini Sema görsün mü?" → evet/hayır
  Oranlar ASLA gösterilmez Gıda Müh'e
```

### API Güvenliği
```
GET /api/factory/recipes/:id
  → Tüm roller: malzeme listesinde keyblend = {type:"keyblend", code:"KB-D01", amount:69.5}
  → Keyblend alt bileşenleri ASLA bu response'ta dönmez

GET /api/factory/keyblends/:id/ingredients
  → Sadece admin + recete_gm (middleware kontrolü)
  → Gıda müh: sadece show_to_gm=true olanların isimleri (oranlar hariç)

POST /api/factory/keyblends
  → Sadece admin + recete_gm
```

### Alerjen Bildirimi (Yasal Zorunluluk)
```
Keyblend gizli OLSA BİLE alerjen bilgisi AÇIK gösterilir:
  
  🔒 Keyblend KB-D01 (Donut Premix): 69.5gr
  ⚠️ İçerir: Soya

Keyblend bileşenlerine is_allergen BOOLEAN eklenir.
Alerjenler her zaman görünür — gizlilik alerjen bildirimini engellemez.
```

---

## 7. MAMÜL / YARI MAMÜL

```
factory_recipes:
  output_type: "mamul" | "yari_mamul"
  parent_recipe_id: FK → factory_recipes(id)  -- tek seviye yeterli

Örnek:
  id:1 "Plain Donut Hamuru" (yari_mamul) → parent: null
  id:2 "Çikolata Glazed Donut" (mamul) → parent: 1
  id:3 "Strawberry Filled Donut" (mamul) → parent: 1

Gelecekte çoklu yarı mamül birleşimi gerekirse:
  factory_recipe_components junction table eklenir (şimdi değil)
```

---

## 8. BESİN DEĞER TABLOSU (AI Otomatik)

### Tetik: Malzeme listesi değiştiğinde otomatik hesaplanır

```
factory_recipes tablosunda:
  nutrition_facts         JSONB     -- 100gr besin tablosu
  nutrition_per_portion   JSONB     -- porsiyon başına
  allergens               TEXT[]    -- ["gluten","süt","yumurta","soya"]
  nutrition_calculated_at  TIMESTAMPTZ
  nutrition_confidence     INTEGER  -- AI güven skoru (0-100)
```

### nutrition_facts JSONB yapısı:
```json
{
  "energy_kcal": 425,
  "fat_g": 22.5,
  "saturated_fat_g": 14.2,
  "trans_fat_g": 0.1,
  "carbohydrate_g": 52.8,
  "sugar_g": 28.3,
  "fiber_g": 1.2,
  "protein_g": 5.8,
  "salt_g": 0.9,
  "portion_size_g": 45,
  "portions_per_batch": 65
}
```

### Hammadde Besin Referans Tablosu:
```
factory_ingredient_nutrition (
  id                SERIAL PK,
  ingredient_name   VARCHAR(255),
  energy_kcal       NUMERIC(8,2),  -- 100gr başına
  fat_g             NUMERIC(8,2),
  saturated_fat_g   NUMERIC(8,2),
  carbohydrate_g    NUMERIC(8,2),
  sugar_g           NUMERIC(8,2),
  fiber_g           NUMERIC(8,2),
  protein_g         NUMERIC(8,2),
  salt_g            NUMERIC(8,2),
  allergens         TEXT[],
  source            VARCHAR(20),   -- "manual"|"ai"|"usda"|"turkomp"
  confidence        INTEGER,
  verified_by       VARCHAR → users(id),
  created_at        TIMESTAMPTZ
)
```

### Alerjen Otomatik Tespiti (AB/TR 14 alerjen):
```
Un/gluten → Gluten | Süt tozu/whey → Süt/Laktoz | Yumurta → Yumurta
Soya → Soya | Fındık/fıstık → Kabuklu yemiş | Susam → Susam
Kereviz → Kereviz | Hardal → Hardal | Sülfitler → Sülfitler
Yumuşakçalar → Yumuşakçalar | Kabuklular → Kabuklular
Baklagiller → Lupin | Balık → Balık

Keyblend içindeki alerjenler de dahil!
```

---

## 9. ÜRETİM EKOSİSTEMİ PARAMETRELERİ

Her reçetede (factory_recipes tablosu):
```
-- Üretim süresi
prep_time_minutes         INTEGER    -- Ön hazırlık (40dk)
production_time_minutes   INTEGER    -- Üretim (120dk)
cleaning_time_minutes     INTEGER    -- Temizlik (20dk)

-- İstasyon/Makina
station_id                FK → factory_stations(id)
equipment_description     TEXT
equipment_kwh             NUMERIC(10,3)  -- KWh/batch
water_consumption_lt      NUMERIC(10,2)  -- Su lt/batch

-- Personel
required_workers          INTEGER

-- Verim & Kayıp
base_batch_output         INTEGER    -- Beklenen çıktı (2000 adet)
expected_unit_weight      NUMERIC    -- Birim ağırlık (gr/adet)
expected_waste_kg         NUMERIC    -- Fire beklentisi (1kg hamur)
expected_loss_grams       NUMERIC    -- Zayi beklentisi (500gr)
waste_tolerance_pct       NUMERIC    -- Kabul edilebilir fire %

-- Maliyet (hesaplanan)
raw_material_cost         NUMERIC    -- Hammadde
labor_cost                NUMERIC    -- İşçilik
energy_cost               NUMERIC    -- Enerji
total_batch_cost          NUMERIC    -- Toplam/batch
unit_cost                 NUMERIC    -- Birim maliyet
cost_last_calculated      TIMESTAMP
```

---

## 10. BATCH ÇARPANLARI

### Standart (sabit butonlar):
```
[×1] [×1.25] [×1.5] [×1.75] [×2]
```

### AR-GE (sabit butonlar):
```
[%5] [%10] [%25]
→ Baz 1 birim üzerinden: ×0.05, ×0.10, ×0.25
→ AR-GE üretimi zorunlu not gerektirir
→ Normal üretim raporlarından ayrılır
```

---

## 11. TABLO LİSTESİ (8 tablo — Replit önerisiyle optimize)

| # | Tablo | Amaç | Not |
|---|-------|------|-----|
| 1 | factory_recipes | Ana reçete | product_id FK → factory_products |
| 2 | factory_recipe_ingredients | Malzeme listesi | keyblend_id FK |
| 3 | factory_keyblends | Gizli formül tanımları | Sadece admin+recete_gm |
| 4 | factory_keyblend_ingredients | Keyblend iç bileşenleri | is_allergen, show_to_gm |
| 5 | factory_recipe_steps | Adım adım talimat | photo_urls JSONB[], timer |
| 6 | factory_production_logs | Üretim kayıt logu | session_id FK, is_arge |
| 7 | factory_recipe_versions | Versiyon geçmişi | snapshot + diff + onay |
| 8 | factory_recipe_category_access | Şef kategori erişimi | Dinamik, admin yönetir |
| +1 | factory_ingredient_nutrition | Hammadde besin değerleri | AI/manuel kaynak |

Replit önerileri uygulandı:
- factory_recipe_step_photos → steps.photo_urls JSONB[] (birleştirildi)
- factory_batch_presets → recipes.batch_presets JSONB (birleştirildi)
- product_id FK → factory_products (eklendi)
- session_id FK → factory_shift_sessions (eklendi)
- is_allergen → keyblend_ingredients (eklendi)

---

## 12. FABRİKA ↔ ŞUBE TAM İZOLASYON

```
FABRİKA (kapalı sistem):              ŞUBE (açık sistem):
├── factory_recipes                    ├── recipes
├── factory_recipe_ingredients         ├── recipe_ingredients
├── factory_keyblends                  ├── recipe_versions
├── factory_recipe_steps               ├── recipe_categories
├── /api/factory/recipes/*             ├── /api/recipes/*
├── Fabrika duyuru sistemi             ├── HQ duyuru sistemi
└── Fabrika kiosk                      └── Şube kiosk

ASLA BİRBİRİNE ERİŞEMEZ!
API middleware: fabrika endpoint'leri fabrika rollerini kontrol eder
Şube personeli /api/factory/* endpoint'lerine ERİŞEMEZ
```

---

## 13. MİGRASYON PLANI (Mevcut product_recipes → factory_recipes)

```
Sprint R-1: factory_recipes oluştur + 12 mevcut kayıtı migrate et
Sprint R-4: product_recipes'a DEPRECATED flag
Pilot sonrası: product_recipes DROP

DİKKAT: product_cost_calculations.recipeId FK bozulmamalı!
Migrasyon sırasında yeni cost endpoint'leri factory_recipes'a bağlanır.
```

---

## 14. SPRİNT PLANI (Replit süre revizyonuyla)

### Sprint R-1: Temel Yapı (8-10 saat)
- [ ] 2 yeni rol: sef, recete_gm (schema-01, schema-02, manifest, menu, seed)
- [ ] DB: 8 tablo + 1 nutrition tablosu oluşturma
- [ ] DB: product_recipes → factory_recipes migrasyon (12 kayıt)
- [ ] API: Reçete CRUD (admin + recete_gm + sef yetkili)
- [ ] API: Keyblend CRUD (admin + recete_gm, API güvenlik middleware)
- [ ] Frontend: /fabrika/receteler listesi (kartlar, mamül/yarı mamül badge)
- [ ] Frontend: /fabrika/receteler/:id detay (malzeme + batch + keyblend gizleme)
- [ ] Kategori erişim yönetimi (admin panel)

### Sprint R-2: Kiosk Üretim Modu (5-6 saat)
- [ ] Frontend: Üretim modu tam ekran (adım adım, fotoğraf, timer)
- [ ] Malzeme referans parse ({0001} → chip, keyblend → gizli chip)
- [ ] Timer sistemi (başlat, durdur, sıfırla, sesli bildirim)
- [ ] API: Üretim log (başlat, adım ilerle, tamamla, session_id bağla)
- [ ] Kiosk: "Reçeteler" butonu + üretim akışı
- [ ] Batch çarpan butonları (×1, ×1.25, ×1.5, ×1.75, ×2) + AR-GE

### Sprint R-3: Admin Panel + Keyblend + Kilit (6-7 saat)
- [ ] Admin: Reçete düzenleme sayfası (tam form)
- [ ] Admin: Keyblend yönetimi (tanımlama, bileşen, show_to_gm toggle)
- [ ] Reçete kilit sistemi (lock/unlock per reçete)
- [ ] Şef kategori erişim yönetimi UI
- [ ] Admin: Fotoğraf yükleme (adım fotoğrafları)
- [ ] Admin: Reçete geçici gizleme (is_visible toggle)
- [ ] AR-GE modu (zorunlu not, ayrı raporlama)

### Sprint R-4: Besin + Versiyon + Maliyet (5-6 saat)
- [ ] AI besin değer hesaplama (malzeme → 100gr tablo)
- [ ] Alerjen otomatik tespiti (14 AB/TR alerjen)
- [ ] Hammadde besin referans tablosu (factory_ingredient_nutrition)
- [ ] Versiyon diff (eski→yeni karşılaştırma)
- [ ] Onay mekanizması (şef değişiklik → recete_gm onay)
- [ ] Maliyet hesaplama entegrasyonu
- [ ] Seed: Cinnabon + Plain Donut tam reçete verisi

Toplam: ~25-29 saat (4 sprint)
