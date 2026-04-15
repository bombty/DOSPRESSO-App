# DOSPRESSO Fabrika Üretim Stok Takip Sistemi — Tasarım Dokümanı

## Günlük Üretim Akışı (7 Aşama)

```
06:00  Üretim Şefi → Plan oluştur (reçete × batch)
       ↓
06:30  Sistem → Malzeme ihtiyaç hesapla (artan düş, net çekme listesi)
       ↓
07:00  Depocu → Kiosk/tablet'te çekme listesi görünür → malzeme hazırla
       ↓
07:30  Depocu → "Hazırladım" bas → Operatör kiosk'ta "Malzeme Geldi" bildirimi
       ↓
08:00  Operatör → Teslim al, tart, doğrula → Üretim başla
       ↓
       Üretim süreci (reçete adımları kiosk'ta, batch kayıt)
       ↓
16:00  Operatör → Kalan malzemeleri tart → "Artan Kayıt" formu
       ↓
16:30  Gıda Müh → Artanları doğrula (sıcaklık, durum, fire)
       ↓
       Ertesi gün → Artan malzemeler yeni plana otomatik dahil
```

## Kim Neyi Görmeli? (Görünürlük Matrisi)

### Kiosk Ekranı (Üretim Alanı)

| Bilgi | Operatör | Sorumlu | Şef/Kiosk |
|-------|:--------:|:-------:|:---------:|
| Bugünkü üretim planı (ürün × batch) | ✅ | ✅ | ✅ |
| Malzeme durumu (geldi/bekliyor) | ✅ | ✅ | ✅ |
| Reçete adımları | ✅ | ✅ | ✅ |
| Malzeme gramajları | ✅ | ✅ | ✅ |
| Keyblend içeriği | ❌ | ❌ | ❌ (sadece kod) |
| Maliyet bilgisi | ❌ | ❌ | ❌ |
| "Teslim Aldım" butonu | ✅ | ✅ | ✅ |
| "Artan Kayıt" formu | ✅ | ✅ | ✅ |
| Batch başlat/tamamla | ✅ | ✅ | ✅ |

### Yönetim Ekranı (Dashboard/Centrum)

| Bilgi | Depocu | Üretim Şefi | Fabrika Müdür | RGM | Gıda Müh |
|-------|:------:|:-----------:|:------------:|:---:|:--------:|
| Çekme listesi | ✅ | ✅ | ✅ | ✅ | 👁 |
| Stok durumu (tüm depo) | ✅ | ✅ | ✅ | ✅ | 👁 |
| Plan oluştur/düzenle | ❌ | ✅ | ✅ | ✅ | ❌ |
| Artan malzeme listesi | 👁 | ✅ | ✅ | ✅ | ✅ |
| Artan doğrulama | ❌ | ❌ | ❌ | ❌ | ✅ |
| Maliyet raporu | ❌ | 👁 | ✅ | ✅ | ❌ |
| Fire raporu | ❌ | ✅ | ✅ | ✅ | ✅ |
| Stok hareketleri | ✅ | ✅ | ✅ | ✅ | 👁 |
| Düşük stok uyarısı | ✅ | ✅ | ✅ | ✅ | ❌ |

(✅ = tam erişim, 👁 = sadece görüntüleme, ❌ = erişim yok)

## Kiosk Entegrasyonu — Üretim Malzeme Paneli

### Kiosk'ta yeni bölüm: "Üretim Malzeme"

```
┌─────────────────────────────────────────────┐
│  📦 Üretim Malzeme Durumu          15 Nisan │
├─────────────────────────────────────────────┤
│  ▶ Bugünkü Plan                             │
│    Donut ×2 batch | Cheesecake ×1 batch     │
│    Cinnabon ×3 batch                        │
│                                             │
│  📋 Malzeme Durumu                          │
│    ✅ 14/17 kalem teslim alındı             │
│    ⏳ 3 kalem depodan bekleniyor            │
│    → Un 60 KG, Şeker 10 KG, Maya 2 KG      │
│                                             │
│  ⚠️ Dünden Artan (3 kalem)                  │
│    Un: 2.5 KG (iyi) | Şeker: 800g (iyi)    │
│    Krema: 1.2 KG (sınırda — bugün kullan!)  │
│                                             │
│  [Teslim Al]  [Artan Kayıt]  [Eksik Bildir] │
└─────────────────────────────────────────────┘
```

### İş Akışı Detayı

**Aşama 1: Plan → Kiosk Bağlantısı**
- Üretim şefi plan oluşturduğunda (POST /api/mrp/generate-daily-plan)
- Plan factory_production_logs'a da yazılır
- Kiosk bu planı çeker (GET /api/mrp/daily-plan/today)
- Her istasyona atanan reçeteler gösterilir

**Aşama 2: Malzeme Takibi**
- Kiosk'ta her malzemenin durumu: bekliyor → hazırlandı → teslim alındı
- Depocu "Hazırladım" basınca → kiosk'ta bildirim
- Operatör "Teslim Aldım" basınca → malzeme kullanıma hazır
- Eksik malzeme → "Eksik Bildir" → Dobody'ye bildirim

**Aşama 3: Üretim Sırasında**
- Batch başlatıldığında sistem o batch için kullanılacak malzemeyi "rezerve" eder
- Batch tamamlandığında kullanılan malzeme stoktan düşer
- Fire varsa ayrı kaydedilir

**Aşama 4: Gün Sonu Tartım**
- Kiosk'ta "Artan Kayıt" butonu
- Bugün çekilen ama kullanılmayan malzemeler listelenir
- Her biri için: kalan miktar (tartım), durum, sıcaklık
- Kaydet → ertesi günkü plana otomatik dahil

## Mevcut Altyapı (Hazır)

| Bileşen | Durum |
|---------|:-----:|
| daily_material_plans tablosu | ✅ |
| daily_material_plan_items tablosu | ✅ |
| production_area_leftovers tablosu | ✅ |
| material_pick_logs tablosu | ✅ |
| POST generate-daily-plan API | ✅ |
| GET daily-plan/:date API | ✅ |
| PATCH pick / verify API | ✅ |
| POST leftovers API | ✅ |
| Stok Merkezi sayfası (4 tab) | ✅ (Replit yaptı) |
| Kiosk üretim malzeme paneli | ❌ (yapılacak) |
| Kiosk → MRP bağlantısı | ❌ (yapılacak) |
| Batch → stok düşme otomasyonu | ❌ (yapılacak) |
| Dobody düşük stok bildirimi | ❌ (yapılacak) |

## Yapılacak İşler (Öncelik Sırasıyla)

### Sprint 1: Kiosk Üretim Malzeme Paneli
1. Kiosk'ta "Üretim Malzeme" bölümü ekle
2. Bugünkü MRP planını kiosk'ta göster
3. "Teslim Aldım" butonu (operatör)
4. Dünden artan malzeme uyarısı

### Sprint 2: Gün Sonu Tartım
5. Kiosk'ta "Artan Kayıt" formu (basitleştirilmiş)
6. Hızlı tartım girişi (malzeme → gram)
7. Fotoğraf ekleme (opsiyonel)

### Sprint 3: Stok Otomasyonu
8. Batch tamamlandığında otomatik stok düşme
9. Fire hesaplama (çekilen - kullanılan - artan = fire)
10. Dobody düşük stok bildirimi (scheduler)

### Sprint 4: Raporlama
11. Günlük üretim malzeme raporu
12. Haftalık fire analizi
13. Malzeme verimlilik skoru
