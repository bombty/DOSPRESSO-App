# DOSPRESSO — Fabrika Sistemi
**En karmaşık modül. Üretim, kalite kontrol, LOT takip, reçete, fire, stok, sevkiyat.**

---

## 1. ÜRETİM AKIŞI (Pipeline)

```
Hammadde Girişi
  ↓
Reçete Seçimi (hangi ürün üretilecek)
  ↓
Üretim Planı (haftalık/günlük)
  ↓
Üretim Başlat (production_batches)
  ↓ ← istasyon bazlı, personel atanmış
Yarı Mamül (ara ürün)
  ↓
Mamül (bitmiş ürün)
  ↓
Kalite Kontrol — Aşama 1 (görsel + ölçüm)
  ↓ RED → üretim geri döner
Kalite Kontrol — Aşama 2 (detaylı test)
  ↓ RED → imha veya yeniden işleme
LOT Oluşturma (son kullanma tarihi + takip numarası)
  ↓
Fabrika Stok (factory_inventory)
  ↓
Sevkiyat Planı (hangi şubeye ne kadar)
  ↓
Sevkiyat (factory_shipments + items)
  ↓ ← şube teslim onayı gerekli
Şube Stok (branch_inventory)
```

## 2. DB TABLOLARI

### Üretim (schema-08.ts):
```
factory_products          — ürün tanımları (kahve, şurup, hamur vs.)
production_batches        — üretim partileri (batch no, tarih, durum)
factory_production_runs   — üretim çalıştırmaları (istasyon bazlı)
factory_production_outputs — üretim çıktıları (miktar, fire, kalite)
factory_production_plans  — üretim planları (haftalık grid)
factory_daily_targets     — günlük hedefler
```

### İstasyon & Personel:
```
factory_stations          — üretim istasyonları (kavurma, öğütme, paketleme)
factory_station_benchmarks — istasyon performans kıyaslamaları
factory_station_targets   — istasyon bazlı hedefler
factory_staff_pins        — personel PIN girişi (kiosk)
factory_shift_sessions    — vardiya oturumları
factory_session_events    — oturum olayları (başla, bitir, mola)
factory_break_logs        — mola kayıtları
factory_worker_scores     — işçi performans skorları
factory_teams             — takımlar
factory_team_members      — takım üyeleri
factory_team_sessions     — takım oturumları
```

### Kalite Kontrol:
```
factory_quality_specs     — kalite spesifikasyonları (nem, boyut, renk)
factory_quality_assignments — kalite kontrol görevlendirmeleri
factory_quality_checks    — kalite kontrol kayıtları (2 aşama)
factory_quality_measurements — ölçüm sonuçları
factory_quality_media     — kalite fotoğrafları
factory_ai_reports        — AI kalite analiz raporları
```

### LOT & Stok:
```
production_lots           — LOT kayıtları (lot no, SKT, miktar)
factory_inventory         — fabrika stok (ürün × miktar)
waste_lots                — fire/atık LOT'ları
```

### Sevkiyat:
```
factory_shipments         — sevkiyat kayıtları (şube, tarih, durum)
factory_shipment_items    — sevkiyat kalemleri (LOT bazlı)
branch_inventory          — şube stok (sevkiyat sonrası)
branch_stock_movements    — şube stok hareketleri
```

### Hammadde & Tedarik (schema-09, schema-10):
```
raw_materials             — hammadde tanımları
raw_material_price_history — fiyat geçmişi
inventory                 — genel envanter
inventory_movements       — stok hareketleri (giriş/çıkış/transfer/fire)
suppliers                 — tedarikçiler
product_suppliers         — ürün-tedarikçi bağlantısı
purchase_orders           — satınalma siparişleri
purchase_order_items      — sipariş kalemleri
```

### Reçete (schema-06):
```
recipe_categories         — reçete kategorileri (sıcak içecek, soğuk, yiyecek)
recipes                   — reçeteler (malzeme listesi, hazırlama)
recipe_versions           — versiyon geçmişi
recipe_notifications      — reçete değişiklik bildirimleri
```

## 3. KALİTE KONTROL (2 Aşama)

```
Aşama 1 — Hızlı Kontrol:
  ✓ Görsel inceleme (renk, boyut, koku)
  ✓ Temel ölçümler (ağırlık, nem)
  ✓ Fotoğraf çekimi (kanıt)
  → GEÇER: Aşama 2'ye ilerle
  → RED: üretim geri döner, imha veya yeniden işleme

Aşama 2 — Detaylı Test:
  ✓ Laboratuvar ölçümleri (spesifikasyona uygunluk)
  ✓ Tat testi (cupping score)
  ✓ AI görsel analiz (opsiyonel)
  → GEÇER: LOT oluşturulur
  → RED: imha, fire kaydı oluşturulur

Kalite Kontrol Kilidi:
  Onaylanan kontrol anında kilitlenir (data_lock)
  Değişiklik → change_request workflow
```

## 4. LOT TAKİP SİSTEMİ

```
Her üretim partisinden LOT oluşturulur:
  - LOT numarası (benzersiz, takip edilebilir)
  - Üretim tarihi
  - Son kullanma tarihi (SKT)
  - Miktar (kg/adet)
  - Kalite kontrol referansı
  - Durum (aktif, sevk edildi, son kullanma yakın, imha)

FIFO Kuralı:
  Sevkiyatta en eski SKT'li LOT önce gönderilir
  Sistem otomatik sıralar — manuel seçim opsiyonel

SKT Takibi:
  30 gün kala → uyarı (sarı)
  7 gün kala → acil uyarı (kırmızı)
  SKT geçmiş → sevkiyata çıkamaz, imha sürecine girer
```

## 5. FİRE HESAPLARI

```
Fire Türleri:
  - Üretim firesi (hammadde → mamül dönüşüm kaybı)
  - Kalite red firesi (QC'den geçemeyen)
  - SKT firesi (son kullanma geçmiş)
  - Kırık/hasar firesi
  - Numune/test firesi

Fire Kaydı:
  waste_lots tablosunda:
    - fire miktarı
    - fire nedeni (factory_waste_reasons)
    - sorumlu personel
    - tarih
    - kalite kontrol referansı (varsa)

Fire Oranı Takibi:
  Aylık fire oranı = toplam fire / toplam üretim × 100
  Hedef: < %3 (sektör ortalaması)
  %5 üzeri → Dobody uyarı → yönetim müdahale
```

## 6. REÇETE SİSTEMİ

```
Reçete İçeriği:
  - Ürün adı + kategori
  - Malzeme listesi (hammadde × miktar × birim)
  - Hazırlama adımları
  - Porsiyon/verim miktarı
  - Maliyet hesabı (hammadde fiyatlarından otomatik)
  - Fotoğraf (referans görsel)
  - Versiyon numarası

Reçete Versiyonlama:
  Her değişiklik yeni versiyon oluşturur
  Eski versiyonlar arşivlenir
  Şubelere bildirim gönderilir (recipe_notifications)

Maliyet Hesaplama:
  Reçete maliyeti = Σ(malzeme_miktarı × birim_fiyat)
  Fiyat değişince otomatik güncellenir
  BU BİLGİ SADECE HQ/Muhasebe GÖRÜR — şubeler göremez!
```

## 7. GIDA GÜVENLİĞİ

```
Zorunlu Kayıtlar:
  - Sıcaklık takibi (soğuk zincir)
  - Temizlik/dezenfeksiyon logları
  - Personel hijyen kontrolleri
  - Hammadde kabul kontrolleri
  - HACCP kritik kontrol noktaları

LOT İzlenebilirlik:
  Herhangi bir ürün geri çağrılırsa:
  LOT no → hangi partiden → hangi hammaddelerden → hangi şubelere gitti
  TAM İZLENEBİLİRLİK (gıda yönetmeliği gereği)
```

## 8. FABRİKA ROLLERİ

```
fabrika_mudur    — Genel yönetim, üretim planı onayı
fabrika_sorumlu  — Üretim hattı yönetimi, personel atama
fabrika_operator — İstasyon çalışması, üretim kaydı
fabrika_personel — Genel fabrika işleri

Erişim:
  Fabrika rolleri → fabrika verilerini görür
  Fabrika rolleri → şube satış, HQ muhasebe GÖREMEZ
  HQ (CEO/CGO/Muhasebe) → fabrika verilerini görür
  Şube → fabrika verilerini GÖREMEZ (sadece sevkiyat)
```

## 9. ÖNEMLİ DOSYA KONUMLARI

```
shared/schema/schema-08.ts     — Fabrika tabloları (ana)
shared/schema/schema-09.ts     — Envanter, tedarikçi, satınalma
shared/schema/schema-10.ts     — Hammadde, franchise proje
shared/schema/schema-11.ts     — Fire LOT'ları
shared/schema/schema-12.ts     — Sevkiyat, üretim LOT, şube stok
shared/schema/schema-06.ts     — Reçete tabloları
server/routes/factory.ts       — Fabrika API'leri
client/src/pages/fabrika.tsx   — Fabrika ana sayfa (5 tab)
```
