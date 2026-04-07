# FABRİKA REÇETE YÖNETİM SİSTEMİ — Kapsamlı Plan v2
## Tarih: 7 Nisan 2026 | Onay: Aslan

---

## 1. VİZYON

DOSPRESSO'ya özel gizli formüllerin korunduğu, endüstriyel üretim sürecinin uçtan uca yönetildiği, fabrika-içi kapalı bir reçete sistemi. Şubelerden tamamen bağımsız. Keyblend sistemiyle ticari sırlar korunur.

---

## 2. TEMEL PRENSİPLER

### 2.1 Fabrika ↔ Şube Tam İzolasyonu
```
FABRİKA REÇETE SİSTEMİ              ŞUBE REÇETE SİSTEMİ
(Bu plan)                            (Mevcut recipes tablosu)
─────────────────────                ─────────────────────
Gizli formüller                      Kahve/içecek reçeteleri
Keyblend kodları                     Bardak boyut varyantları
Endüstriyel üretim                   Barista hazırlık
Mamül/yarı mamül takip               Menü kartı görselleri
Ayrı DB tabloları                    Ayrı DB tabloları
Ayrı API endpoint'leri               Ayrı API endpoint'leri
Ayrı duyuru sistemi (fabrika-içi)    HQ duyuru sistemi

ASLA BİRBİRİNE ERİŞEMEZ!
Şube personeli fabrika reçetelerini GÖREMEZ.
Fabrika reçeteleri HQ duyuru sistemine AKMAZ.
```

### 2.2 Keyblend Gizli Formül Sistemi
```
ADMIN GÖRÜNÜMÜ (tam):
  Keyblend "KB-D01" = Donut Premix
    ├── DATEM (E472e): 15gr
    ├── SSL (E481): 15gr
    ├── Soya unu: 30gr
    ├── Askorbik asit (E300): 3gr
    ├── CMC (E466): 5gr
    └── Xanthan gam (E415): 1.5gr
  Toplam: 69.5gr

FABRİKA PERSONEL GÖRÜNÜMÜ (gizli):
  Keyblend "KB-D01" (Donut Premix): 69.5gr
  → Raftan KB-D01 etiketli poşeti al, tart, karışıma ekle

ŞEF GÖRÜNÜMÜ (konfigüre edilebilir):
  Admin belirler: Şef keyblend içeriğini görebilir mi?
  → Varsayılan: GÖREMEZ (personel gibi)
  → Admin açarsa: tam görür
```

### 2.3 Mamül vs Yarı Mamül
```
YARI MAMÜL (Semi-finished):
  Plain Donut → kızartma sonrası düz donut çıkar
  Bu bir bitmiş ürün DEĞİL → başka mamüllere dönüşür:
    ├── Çikolata Glazed Donut (dolgu: çikolata glaze)
    ├── Strawberry Filled Donut (dolgu: çilek)
    ├── Cinnamon Sugar Donut (süsleme: tarçınlı şeker)
    └── Boston Cream Donut (dolgu: krema, kaplama: çikolata)

MAMÜL (Finished Product):
  Cinnabon Roll → pişirme + şoklama + paketleme = BİTMİŞ ürün
  Çikolata Glazed Donut → yarı mamül + dolgu = BİTMİŞ ürün
```

---

## 3. YETKİ MATRİSİ

### Roller
| Rol | Kod | Kişi |
|-----|-----|------|
| Admin | admin | Sistem yöneticisi |
| Şef | sef* | Ümit Usta |
| Fabrika Müdür | fabrika_mudur | — |
| Gıda Mühendisi | gida_muhendisi | — |
| Fabrika Sorumlu | fabrika_sorumlu | — |
| Fabrika Operatör | fabrika_operator | — |
| Fabrika Personel | fabrika_personel | — |

*`sef` yeni rol olarak eklenecek (veya mevcut bir role permission verilecek)

### Yetki Tablosu
| Yetki | admin | sef | fabrika_mudur | gida_muh | f_sorumlu | f_operator | f_personel |
|-------|:-----:|:---:|:------------:|:--------:|:---------:|:----------:|:----------:|
| Reçete listesi görme | ✅ | ✅ | ✅ | ✅ | ✅ | ✅(atanan) | ✅(atanan) |
| Reçete detay görme | ✅ | ✅ | ✅ | ✅ | ✅ | ✅(atanan) | ✅(atanan) |
| Keyblend İÇERİĞİ görme | ✅ | ⚙️ ayarla | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reçete oluşturma | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reçete düzenleme | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reçete silme/gizleme | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Keyblend tanımlama | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Fotoğraf yükleme | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Batch ayarlama | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Üretime başlama | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| AR-GE üretimi | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reçete geçici gizleme | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 4. VERİTABANI TASARIMI

### 4.1 factory_recipes — Ana Reçete Tablosu (Yeni)
```sql
factory_recipes (
  id                    SERIAL PRIMARY KEY,
  
  -- Temel bilgiler
  name                  VARCHAR(255) NOT NULL,        -- "Cinnabon Full Revizyon"
  code                  VARCHAR(20) NOT NULL UNIQUE,  -- "CIN-001", "DON-001"
  description           TEXT,                          -- Kısa açıklama
  category              VARCHAR(50),                   -- "cinnamon_roll", "donut", "kurabiye"
  cover_photo_url       TEXT,                          -- Kapak fotoğrafı
  
  -- Üretim sınıflandırma
  output_type           VARCHAR(20) NOT NULL DEFAULT 'mamul',  -- "mamul" | "yari_mamul"
  parent_recipe_id      INTEGER REFERENCES factory_recipes(id), -- Yarı mamülden türeyen mamül
  
  -- Batch bilgileri
  base_batch_output     INTEGER NOT NULL DEFAULT 1,   -- Baz batch çıktı miktarı (ör: 65 adet)
  output_unit           VARCHAR(20) DEFAULT 'adet',   -- "adet", "kg", "lt"
  total_weight_grams    INTEGER,                       -- Toplam hamur/karışım ağırlığı (gr)
  
  -- Üretim süresi
  prep_time_minutes     INTEGER DEFAULT 0,             -- Ön hazırlık süresi
  production_time_minutes INTEGER DEFAULT 0,           -- Üretim süresi
  cleaning_time_minutes INTEGER DEFAULT 0,             -- Temizlik süresi
  
  -- İstasyon/Makina
  station_id            INTEGER REFERENCES factory_stations(id), -- Hangi istasyonda
  equipment_description TEXT,                           -- Kullanılan ekipman açıklaması
  equipment_kwh         NUMERIC(10,3) DEFAULT 0,       -- Makina KW/h
  water_consumption_lt  NUMERIC(10,2) DEFAULT 0,       -- Su tüketimi (lt/batch)
  
  -- Personel
  required_workers      INTEGER DEFAULT 1,             -- Gereken personel sayısı
  
  -- Verim & Fire
  expected_output_count INTEGER,                       -- Beklenen çıktı adedi
  expected_waste_kg     NUMERIC(10,3) DEFAULT 0,       -- Beklenen fire (kg)
  expected_loss_grams   NUMERIC(10,2) DEFAULT 0,       -- Beklenen zayi (gr)
  waste_tolerance_pct   NUMERIC(5,2) DEFAULT 5,        -- Kabul edilebilir fire %
  expected_unit_weight  NUMERIC(10,3),                  -- Birim ağırlık (gr/adet)
  
  -- Maliyet (hesaplanan)
  raw_material_cost     NUMERIC(12,4) DEFAULT 0,       -- Hammadde maliyeti (1 batch)
  labor_cost            NUMERIC(12,4) DEFAULT 0,       -- İşçilik maliyeti
  energy_cost           NUMERIC(12,4) DEFAULT 0,       -- Enerji maliyeti
  total_batch_cost      NUMERIC(12,4) DEFAULT 0,       -- Toplam batch maliyeti
  unit_cost             NUMERIC(12,4) DEFAULT 0,       -- Birim maliyet (batch_cost / output)
  cost_last_calculated  TIMESTAMP,
  
  -- Gizlilik
  recipe_type           VARCHAR(20) DEFAULT 'OPEN',    -- "OPEN" | "KEYBLEND" (kısmi gizli)
  is_visible            BOOLEAN DEFAULT TRUE,           -- Admin geçici gizleme
  
  -- Versiyonlama
  version               INTEGER DEFAULT 1,
  
  -- Teknik notlar (markdown)
  bakers_percentage     TEXT,                           -- Baker's yüzdeler
  technical_notes       TEXT,                           -- Teknik notlar
  change_log            TEXT,                           -- Değişiklik geçmişi
  
  -- Yönetim
  created_by            VARCHAR REFERENCES users(id),
  updated_by            VARCHAR REFERENCES users(id),
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
)
```

### 4.2 factory_recipe_ingredients — Reçete Malzemeleri
```sql
factory_recipe_ingredients (
  id                    SERIAL PRIMARY KEY,
  recipe_id             INTEGER NOT NULL REFERENCES factory_recipes(id) ON DELETE CASCADE,
  
  -- Malzeme tanımı
  ref_id                VARCHAR(10) NOT NULL,          -- "0001", "0002" (adım referansı)
  name                  VARCHAR(255) NOT NULL,          -- "Orta-güçlü un (W250-280)"
  
  -- Miktar
  amount                NUMERIC(12,4) NOT NULL,         -- Baz batch miktarı
  unit                  VARCHAR(20) NOT NULL,            -- "gr", "ml", "kg", "adet"
  
  -- Sınıflandırma
  ingredient_type       VARCHAR(20) DEFAULT 'normal',   -- "normal" | "keyblend"
  ingredient_category   VARCHAR(50) DEFAULT 'ana',      -- "ana", "katki", "lezzet", "dolgu", "susleme"
  
  -- Keyblend bağlantısı (ingredient_type='keyblend' ise)
  keyblend_id           INTEGER REFERENCES factory_keyblends(id),
  
  -- Hammadde bağlantısı (stok takibi için)
  raw_material_id       INTEGER REFERENCES raw_materials(id),
  
  sort_order            INTEGER DEFAULT 0,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(recipe_id, ref_id)
)
```

### 4.3 factory_keyblends — Gizli Formül Tanımları (SADECE ADMİN)
```sql
factory_keyblends (
  id                    SERIAL PRIMARY KEY,
  
  code                  VARCHAR(20) NOT NULL UNIQUE,    -- "KB-D01", "KB-C01"
  name                  VARCHAR(255) NOT NULL,          -- "Donut Premix", "Cinnabon Spice"
  description           TEXT,                            -- Açıklama
  total_weight          NUMERIC(12,4),                   -- Toplam ağırlık (hesaplanan)
  
  -- Şef erişimi
  chef_can_view         BOOLEAN DEFAULT FALSE,           -- Şef içeriği görebilir mi?
  
  -- Hazırlık talimatı (keyblend'i hazırlayan kişi için — sadece admin)
  preparation_notes     TEXT,                            
  
  is_active             BOOLEAN DEFAULT TRUE,
  created_by            VARCHAR REFERENCES users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
)
```

### 4.4 factory_keyblend_ingredients — Keyblend İçindeki Gizli Bileşenler
```sql
factory_keyblend_ingredients (
  id                    SERIAL PRIMARY KEY,
  keyblend_id           INTEGER NOT NULL REFERENCES factory_keyblends(id) ON DELETE CASCADE,
  
  name                  VARCHAR(255) NOT NULL,          -- "DATEM (E472e)"
  amount                NUMERIC(12,4) NOT NULL,          -- Miktar (keyblend 1 birim için)
  unit                  VARCHAR(20) NOT NULL,            -- "gr", "ml"
  
  raw_material_id       INTEGER REFERENCES raw_materials(id),
  sort_order            INTEGER DEFAULT 0,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
)
```

### 4.5 factory_recipe_steps — Adım Adım Üretim Talimatları
```sql
factory_recipe_steps (
  id                    SERIAL PRIMARY KEY,
  recipe_id             INTEGER NOT NULL REFERENCES factory_recipes(id) ON DELETE CASCADE,
  
  step_number           INTEGER NOT NULL,
  title                 VARCHAR(255) NOT NULL,          -- "Yaş maya aktivasyonu"
  content               TEXT NOT NULL,                   -- "{0011} mayayı suda eritin..."
  
  -- Fotoğraf
  photo_url             TEXT,                            -- Ana adım fotoğrafı
  photo_caption         TEXT,
  
  -- Zamanlayıcı
  timer_seconds         INTEGER,                         -- null = timer yok
  
  -- Üretim detayları
  temperature_celsius   INTEGER,                         -- 180°C
  equipment_needed      TEXT,                             -- "Spiral mikser, 1. vites"
  
  -- HACCP
  is_critical_control   BOOLEAN DEFAULT FALSE,           -- HACCP kontrol noktası
  ccp_notes             TEXT,                             -- CCP detayı
  
  -- İpucu
  tips                  TEXT,                             -- Uyarı/ipucu
  
  sort_order            INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
)
```

### 4.6 factory_recipe_step_photos — Adım Çoklu Fotoğraf
```sql
factory_recipe_step_photos (
  id                    SERIAL PRIMARY KEY,
  step_id               INTEGER NOT NULL REFERENCES factory_recipe_steps(id) ON DELETE CASCADE,
  photo_url             TEXT NOT NULL,
  caption               TEXT,
  sort_order            INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
)
```

### 4.7 factory_batch_presets — Batch Çarpan Şablonları
```sql
factory_batch_presets (
  id                    SERIAL PRIMARY KEY,
  recipe_id             INTEGER NOT NULL REFERENCES factory_recipes(id) ON DELETE CASCADE,
  
  name                  VARCHAR(100) NOT NULL,          -- "Standart", "1.5x", "Çift"
  multiplier            NUMERIC(5,2) NOT NULL,          -- 1.00, 1.25, 1.50, 1.75, 2.00
  preset_type           VARCHAR(20) DEFAULT 'standard', -- "standard" | "arge"
  
  -- AR-GE preset'leri (preset_type='arge')
  -- Çarpanlar: 0.05, 0.10, 0.25
  
  is_default            BOOLEAN DEFAULT FALSE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
)
```

### 4.8 factory_production_logs — Üretim Kayıt Logu
```sql
factory_production_logs (
  id                    SERIAL PRIMARY KEY,
  recipe_id             INTEGER NOT NULL REFERENCES factory_recipes(id),
  
  batch_multiplier      NUMERIC(5,2) NOT NULL DEFAULT 1,
  expected_output       INTEGER,                         -- Beklenen çıktı
  actual_output         INTEGER,                         -- Gerçek çıktı
  
  -- Zaman
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  
  -- Kim
  started_by            VARCHAR REFERENCES users(id),
  completed_by          VARCHAR REFERENCES users(id),
  
  -- Durum
  status                VARCHAR(20) DEFAULT 'in_progress', -- in_progress|completed|aborted
  step_progress         JSONB DEFAULT '{}',               -- {"1": true, "2": true, "3": false}
  
  -- Fire & Zayi
  actual_waste_kg       NUMERIC(10,3),
  actual_loss_grams     NUMERIC(10,2),
  
  -- AR-GE
  is_arge               BOOLEAN DEFAULT FALSE,
  arge_notes            TEXT,                              -- AR-GE zorunlu not
  
  -- QC
  quality_score         INTEGER,                           -- 0-100
  qc_notes              TEXT,
  
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
)
```

### 4.9 factory_recipe_versions — Reçete Versiyon Geçmişi
```sql
factory_recipe_versions (
  id                    SERIAL PRIMARY KEY,
  recipe_id             INTEGER NOT NULL REFERENCES factory_recipes(id),
  version_number        INTEGER NOT NULL,
  
  -- Snapshot (değişiklik anındaki tam kopya)
  ingredients_snapshot   JSONB,                           -- Tüm malzemeler
  steps_snapshot         JSONB,                           -- Tüm adımlar
  
  -- Kim, ne zaman, neden
  changed_by            VARCHAR REFERENCES users(id),
  change_description    TEXT NOT NULL,                    -- "Un miktarı 5000→4800 düşürüldü"
  change_diff           JSONB,                            -- {"ingredients": [{field: "amount", old: 5000, new: 4800}]}
  
  -- Onay
  status                VARCHAR(20) DEFAULT 'pending',   -- pending|approved|rejected
  approved_by           VARCHAR REFERENCES users(id),
  approved_at           TIMESTAMPTZ,
  rejection_reason      TEXT,
  
  created_at            TIMESTAMPTZ DEFAULT NOW()
)
```

---

## 5. KEYBLEND SİSTEMİ DETAY

### Akış
```
ADMİN PANEL:
  1. Keyblend tanımla: KB-D01 "Donut Premix"
  2. İçerik ekle: DATEM 15gr + SSL 15gr + Soya 30gr + ...
  3. Toplam ağırlık otomatik hesaplanır: 69.5gr
  4. Şef erişimi: açık/kapalı

REÇETE OLUŞTURMA:
  Admin reçete yazarken bir malzemeyi "Keyblend" olarak işaretler:
    - ingredient_type: "keyblend"
    - keyblend_id: KB-D01
    - name: "Keyblend KB-D01 (Donut Premix)"
    - amount: 69.5gr (keyblend toplam ağırlığı)

FABRİKA KİOSK (personel görünümü):
  Malzeme listesinde:
    ✅ Un (W250-280): 5000gr
    ✅ Toz şeker: 600gr
    ✅ Su (28-30°C): 2150gr
    🔒 Keyblend KB-D01 (Donut Premix): 69.5gr  ← gizli, sadece kod+ağırlık
    ✅ Yaş maya: 250gr
    ✅ Vanilya özütü: 35ml

  Adım metninde:
    "Kuru malzemelere {KB-D01} ekleyin ve 1. viteste karıştırın."
    → "[69.5gr KB-D01] ekleyin ve 1. viteste karıştırın."

ADMİN GÖRÜNÜMÜ (keyblend açık):
    🔓 Keyblend KB-D01 (Donut Premix): 69.5gr
      └── DATEM (E472e): 15gr
      └── SSL (E481): 15gr  
      └── Soya unu: 30gr
      └── Askorbik asit: 3gr
      └── CMC: 5gr
      └── Xanthan gam: 1.5gr
```

### Batch Ölçeklendirmede Keyblend
```
Baz batch (×1): Keyblend KB-D01 = 69.5gr
×1.5 batch:     Keyblend KB-D01 = 104.25gr
×2 batch:       Keyblend KB-D01 = 139gr

Admin görünümünde alt bileşenler de ölçeklenir:
  ×2: DATEM 30gr + SSL 30gr + Soya 60gr + ...
```

---

## 6. MAMÜL / YARI MAMÜL SİSTEMİ

### Veri Yapısı
```
factory_recipes:
  id: 1, name: "Plain Donut Hamuru", output_type: "yari_mamul"
  id: 2, name: "Çikolata Glazed Donut", output_type: "mamul", parent_recipe_id: 1
  id: 3, name: "Strawberry Filled Donut", output_type: "mamul", parent_recipe_id: 1
  id: 4, name: "Cinnabon Roll", output_type: "mamul", parent_recipe_id: null
```

### UI Gösterimi
```
REÇETE LİSTESİ:

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 📸 Plain     │  │ 📸 Cinnabon  │  │ 📸 Brownie   │
│    Donut     │  │    Roll      │  │    Çikolata  │
│              │  │              │  │              │
│ YARI MAMÜL   │  │ MAMÜL        │  │ MAMÜL        │
│ 🔄 3 türev   │  │ ✅ Bitmiş     │  │ ✅ Bitmiş     │
│              │  │              │  │              │
│ 48 adet/batch│  │ 65 adet/batch│  │ 80 adet/batch│
└──────────────┘  └──────────────┘  └──────────────┘

Plain Donut tıklandığında → Türevleri gösterir:
  ├── Çikolata Glazed Donut (MAMÜL)
  ├── Strawberry Filled Donut (MAMÜL)
  ├── Cinnamon Sugar Donut (MAMÜL)
  └── Boston Cream Donut (MAMÜL)
```

---

## 7. ÜRETİM EKOSİSTEMİ PARAMETRELERİ

Her reçete kartında şu bilgiler gösterilir:

```
┌─────────────────────────────────────────────────────┐
│ Cinnabon Full Revizyon                    [MAMÜL]   │
│                                                      │
│ 📊 ÜRETİM PARAMETRELERİ                            │
│                                                      │
│ Batch Çıktısı:     65 adet                          │
│ Birim Ağırlık:     ~120gr/adet                      │
│ Toplam Hamur:      7800gr (7.8 kg)                  │
│                                                      │
│ ⏱ ZAMAN (1 batch)                                   │
│ Ön Hazırlık:       40 dk                            │
│ Üretim:            2 saat                            │
│ Temizlik:          20 dk                             │
│ TOPLAM:            3 saat                            │
│                                                      │
│ 👥 PERSONEL:       2 kişi                           │
│                                                      │
│ 🏭 İSTASYON:       Spiral Mikser + Şoklama Dolabı  │
│ ⚡ Enerji:          3.5 KWh / batch                  │
│ 💧 Su:             15 lt / batch                     │
│                                                      │
│ 📉 KAYIP BEKLENTİSİ                                │
│ Fire (hamur):      ~1 kg (beklenen)                  │
│ Zayi:              ~500 gr (beklenen)                │
│ Tolerans:          %5                                │
│                                                      │
│ 💰 MALİYET (1 batch)                                │
│ Hammadde:          ₺420                              │
│ İşçilik:           ₺85                               │
│ Enerji:            ₺12                               │
│ TOPLAM:            ₺517                              │
│ Birim:             ₺7.95/adet                        │
│                                                      │
│ [×1] [×1.25] [×1.5] [×1.75] [×2]  [🔬AR-GE]       │
│                                                      │
│              [🍳 Üretime Başla]                      │
└─────────────────────────────────────────────────────┘
```

---

## 8. ADMİN REÇETE YÖNETİM PANELİ

### Admin → Fabrika → Reçete Yönetimi Sayfası
```
┌─────────────────────────────────────────────────────┐
│ 🔧 Reçete Yönetimi (Admin)           [+ Yeni Reçete]│
│                                                      │
│ TAB'lar: [Reçeteler] [Keyblend'ler] [Versiyon Geçmişi]│
│                                                      │
│ ── REÇETELER TAB ──                                  │
│                                                      │
│ │ Reçete         │ Tip      │ Durum  │ Keyblend │ ⚙ │
│ ├────────────────┼──────────┼────────┼──────────┼───┤
│ │ Cinnabon Roll  │ MAMÜL    │ ✅ Aktif│ KB-C01   │ ✏️│
│ │ Plain Donut    │ Y.MAMÜL  │ ✅ Aktif│ KB-D01   │ ✏️│
│ │ Brownie        │ MAMÜL    │ 👁 Gizli│ —        │ ✏️│
│ │ Croissant      │ Y.MAMÜL  │ ✅ Aktif│ KB-CR01  │ ✏️│
│                                                      │
│ ── KEYBLEND'LER TAB ──                              │
│                                                      │
│ │ Kod     │ İsim          │ Ağırlık │ Bileşen │ Şef│
│ ├─────────┼───────────────┼─────────┼─────────┼────┤
│ │ KB-D01  │ Donut Premix  │ 69.5gr  │ 6 adet  │ ❌ │
│ │ KB-C01  │ Cinnabon Spice│ 45gr    │ 4 adet  │ ✅ │
│ │ KB-CR01 │ Croissant Mix │ 82gr    │ 5 adet  │ ❌ │
│                                                      │
│ Keyblend detay (tıklayınca açılır):                  │
│ KB-D01 içeriği:                                      │
│   DATEM (E472e): 15gr                                │
│   SSL (E481): 15gr                                   │
│   Soya unu: 30gr                                     │
│   Askorbik asit (E300): 3gr                          │
│   CMC (E466): 5gr                                    │
│   Xanthan gam (E415): 1.5gr                         │
│   TOPLAM: 69.5gr                                     │
└─────────────────────────────────────────────────────┘
```

---

## 9. SPRİNT PLANI (Güncellenmiş)

### Sprint R-1: Temel Yapı + DB (6-7 saat)
- [ ] Yeni rol: `sef` (veya mevcut role permission ekle)
- [ ] DB: factory_recipes, factory_recipe_ingredients, factory_recipe_steps tabloları
- [ ] DB: factory_keyblends, factory_keyblend_ingredients tabloları
- [ ] DB: factory_batch_presets, factory_production_logs tabloları
- [ ] DB: factory_recipe_step_photos, factory_recipe_versions tabloları
- [ ] API: Reçete CRUD (admin + sef yetkili)
- [ ] API: Keyblend CRUD (sadece admin)
- [ ] Frontend: /fabrika/receteler listesi (kartlar, mamül/yarı mamül badge)
- [ ] Frontend: /fabrika/receteler/:id detay (malzeme + batch + keyblend gizleme)

### Sprint R-2: Üretim Modu + Kiosk (5-6 saat)
- [ ] Frontend: Üretim modu tam ekran (adım adım, fotoğraf, timer)
- [ ] Malzeme referans parse ({0001} → chip, keyblend → gizli chip)
- [ ] Timer sistemi (başlat, durdur, sıfırla, sesli bildirim)
- [ ] API: Üretim log (başlat, adım ilerle, tamamla)
- [ ] Kiosk: "Reçeteler" butonu + reçete listesi + üretim akışı
- [ ] Batch çarpan butonları (×1, ×1.25, ×1.5, ×1.75, ×2)

### Sprint R-3: AR-GE + Admin Panel (4-5 saat)
- [ ] AR-GE modu (×0.05, ×0.10, ×0.25, zorunlu not)
- [ ] Admin: Reçete düzenleme sayfası
- [ ] Admin: Keyblend yönetimi (tanımlama, bileşen, şef erişimi toggle)
- [ ] Admin: Reçete geçici gizleme (is_visible toggle)
- [ ] Admin: Fotoğraf yükleme (adım fotoğrafları)

### Sprint R-4: Versiyon + Maliyet + Entegrasyon (4-5 saat)
- [ ] Versiyon diff (eski→yeni karşılaştırma)
- [ ] Onay mekanizması (şef değişiklik → admin onay)
- [ ] Mamül/yarı mamül türev ilişkisi UI
- [ ] Maliyet hesaplama (hammadde + işçilik + enerji)
- [ ] Seed: Cinnabon + Plain Donut reçetesi (tam veri)
- [ ] Üretim parametreleri dashboard (zaman, personel, kayıp)

---

## 10. ASLAN ONAY SORULARI

1. ✅ Şef rolü — `sef` olarak ekliyoruz, Ümit Usta
2. ✅ Batch çarpanlar — ×1, ×1.25, ×1.5, ×1.75, ×2 (sabit)
3. ✅ AR-GE — ×0.05 (%5), ×0.10 (%10), ×0.25 (%25)
4. ✅ Kiosk — sadece görüntüleme + batch + üretim. Düzenleme admin+şef
5. ✅ Fotoğraf — admin yükler
6. ✅ Duyuru — fabrika-içi kalır, HQ/şube duyuru sistemine AKMAZ
7. ✅ Fabrika ↔ Şube — tamamen bağımsız sistem
8. ✅ Keyblend — gizli formül, admin tanımlar, personel sadece kod+ağırlık görür
9. ✅ Mamül/Yarı Mamül — output_type + parent_recipe_id ile ilişkilendirme
10. ✅ Üretim parametreleri — zaman (hazırlık+üretim+temizlik), personel, KWh, su, fire, zayi
