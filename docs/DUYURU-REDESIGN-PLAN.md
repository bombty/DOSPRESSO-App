# DOSPRESSO Duyuru Sistemi — Yeniden Tasarım Planı
## 7 Nisan 2026

---

## MEVCUT SORUNLAR (Screenshot Analizi)

### 1. BannerEditor Popup Layout Bozuk
- Dialog 5xl genişlikte ama içerik düzgün yerleşmiyor
- Mobil/tablet'te canvas alanı çok küçük, araçlar sıkışık
- Önizleme (2:1 oran) ile gerçek çıktı uyumsuz
- Gradient renk seçici kesilmiş (sağ taraf görünmüyor)

### 2. ImageStudio (Görsel Stüdyo) Popup
- Kırpma alanı çok küçük (sol alt köşede sıkışmış)
- 5 sekme (Kırp/Arkaplan/Ayar/Filtre/Şekil) mobilde kullanılamaz
- Yakınlaştırma/döndürme slider'ları çok ince

### 3. Genel Tasarım Sorunları
- Gradient presetler (Kahve/Sunset/Ocean/Forest) çok basit
- DOSPRESSO marka ruhu yansımıyor
- Profesyonel ürün yerleştirme desteği yok
- Taslak → Yayın akışı kullanıcı için karmaşık

---

## YENİDEN TASARIM PLANI

### Faz 1: BannerEditor Yeniden Yazımı (1713 satır → ~800 satır)

**Mevcut yapı (sorunlu):**
```
BannerEditor (1713 satır, monolitik)
├── Canvas (HTML5 Canvas manipülasyonu)
├── Metin ekleme/düzenleme
├── Gradient arka plan
├── Görsel yükleme
├── ImageStudio entegrasyonu
├── Taslak kaydetme
└── Duyuru yayınlama
```

**Yeni yapı (modüler):**
```
DuyuruStudioV2/
├── DuyuruStudio.tsx          — Ana layout (responsive grid)
├── CanvasPreview.tsx          — Canlı önizleme (16:9 / 3:1 / 1:1)
├── ToolPanel.tsx              — Araç paneli (sidebar)
│   ├── BackgroundPanel.tsx    — Arka plan seçici
│   ├── TextPanel.tsx          — Metin ekleme/düzenleme
│   ├── ImagePanel.tsx         — Görsel yükleme + AI arkaplan silme
│   └── TemplatePanel.tsx      — Hazır şablonlar
├── GradientPresets.tsx        — DOSPRESSO branded gradientler
├── PublishFlow.tsx            — Taslak → Onay → Yayın akışı
└── hooks/
    ├── useCanvas.ts           — Canvas state yönetimi
    └── useAutoSave.ts         — Otomatik taslak kaydetme
```

### Faz 2: DOSPRESSO Branded Arka Planlar

**Profesyonel gradient presetleri:**
```
DOSPRESSO Signature:
  - Espresso Dark: #1a0f0a → #3d2314 → #0d0806 (koyu kahve)
  - Latte Warm: #e8d5b7 → #c4a67d → #8b6914 (sıcak bej-altın)
  - Mocha Blend: #3a1f0d → #6b3a1f → #c69c6d (kahve karışım)
  - Cream & Coffee: #faf3e8 → #d4b896 → #6b4226 (krem-kahve)
  
Mevsimsel:
  - Summer Fresh: #ff6b35 → #f7931e → #ffd700 (turuncu-altın)
  - Winter Cozy: #2c1810 → #4a2c1a → #1a0f0a (kış sıcaklığı)
  - Spring Bloom: #ff9a9e → #fecfef → #ffecd2 (pastel bahar)
  
Kurumsal:
  - DOSPRESSO Red: #cc1f1f → #8b1414 → #4a0a0a (kırmızı kurumsal)
  - Navy Elegance: #192838 → #0c1520 → #1a2f45 (lacivert şık)
  - Clean White: #ffffff → #f5f5f5 → #e8e8e8 (temiz beyaz)
```

**Hazır şablon yapıları:**
1. **Yeni Ürün Lansmanı** — Ürün fotoğrafı merkez, gradient arka plan, fiyat etiketi
2. **Reçete Değişikliği** — Before/After layout, kırmızı uyarı banner
3. **Kampanya** — Büyük başlık, countdown timer, CTA butonu
4. **Eğitim Duyurusu** — İkon + açıklama, tarih/saat bilgisi
5. **Kanuni/Politika** — Ciddi ton, belge ikonu, zorunlu okuma badge

### Faz 3: Responsive Layout

**Desktop (>1024px):**
```
┌─────────────────────────────────────────────┐
│ [← Geri]  Duyuru Stüdyosu  [Taslak] [Yayınla] │
├──────────────────┬──────────────────────────┤
│                  │                          │
│   CANVAS         │   ARAÇ PANELİ            │
│   ÖNİZLEME       │   ├── Arka Plan          │
│   (canlı)        │   ├── Metin              │
│                  │   ├── Görsel             │
│                  │   └── Şablon             │
│                  │                          │
├──────────────────┴──────────────────────────┤
│  Boyut: [3:1 Banner] [16:9] [1:1 Kare]     │
└─────────────────────────────────────────────┘
```

**Mobil/Tablet (<1024px):**
```
┌───────────────────────────┐
│ [←] Duyuru Stüdyosu [Yayınla] │
├───────────────────────────┤
│                           │
│   CANVAS ÖNİZLEME         │
│   (tam genişlik)          │
│                           │
├───────────────────────────┤
│ [Arka Plan] [Metin] [Görsel] [Şablon] │
├───────────────────────────┤
│                           │
│   AKTİF ARAÇ PANELİ       │
│   (bottom sheet)          │
│                           │
└───────────────────────────┘
```

### Faz 4: ImageStudio Optimizasyonu

**Mevcut (899 satır, 5 sekme):**
- Kırp, Arkaplan (AI silme), Ayar, Filtre, Şekil
- Popup içinde popup — UX kötü

**Yeni yaklaşım:**
- ImageStudio DuyuruStudio'nun bir paneli olarak entegre
- AI arkaplan silme → tek buton (loading state ile)
- Kırpma → canvas üzerinde doğrudan (popup değil)
- Filtre → 6 preset (Original, Warm, Cool, Vintage, B&W, High Contrast)

---

## DUYURU SİSTEMİ GENEL REVIEW

### Mevcut Dosyalar (5410 satır toplam):
| Dosya | Satır | Durum | Aksiyon |
|-------|-------|-------|---------|
| banner-editor.tsx | 1713 | ❌ Bozuk layout | Baştan yaz |
| ImageStudio.tsx | 899 | ⚠️ Mobil uyumsuz | Sadeleştir |
| icerik-studyosu.tsx | 789 | ✅ Çalışıyor | Küçük iyileştirme |
| announcements.tsx | 1269 | ✅ Çalışıyor | TipTap entegrasyon OK |
| AnnouncementAnalytics.tsx | 239 | ✅ İyi | Değişiklik yok |
| AnnouncementHeaderBanner.tsx | 110 | ✅ İyi | Değişiklik yok |
| duyuru-detay.tsx | 391 | ✅ İyi | Değişiklik yok |

### Çalışan Kısımlar (dokunma):
- ✅ Duyuru oluşturma (announcements.tsx — TipTap editör)
- ✅ Analitik dashboard
- ✅ Header banner + dismiss
- ✅ Landing page (/duyuru/:id)
- ✅ Acknowledgment + quiz
- ✅ Kiosk entegrasyonu
- ✅ Dobody takip

### Yeniden Yazılacak:
- ❌ BannerEditor (1713 → ~800 satır, modüler)
- ⚠️ ImageStudio (899 → ~400 satır, entegre)

---

## UYGULAMA PLANI

### Sprint D-R1 (Yeni oturum, ~3-4 saat):
1. DuyuruStudioV2 temel layout (responsive grid)
2. CanvasPreview (HTML5 Canvas → modern CSS/SVG)
3. DOSPRESSO branded gradient presetleri (12 preset)
4. BackgroundPanel + TextPanel
5. Hazır şablon yapıları (5 tip)

### Sprint D-R2 (~2-3 saat):
1. ImagePanel (AI arkaplan silme entegrasyonu)
2. PublishFlow (taslak → onay → yayın)
3. Eski BannerEditor → yeni DuyuruStudioV2 geçişi
4. ImageStudio sadeleştirme
5. Mobil/tablet responsive test

### Sprint D-R3 (~1-2 saat):
1. Ürün yerleştirme (isolated product image + arka plan)
2. Template customization
3. Dark mode uyumluluk
4. Replit E2E test
