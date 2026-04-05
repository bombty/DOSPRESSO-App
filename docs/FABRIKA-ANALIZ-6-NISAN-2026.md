# DOSPRESSO Fabrika Sistemi — Kapsamlı Analiz
## 6 Nisan 2026

---

## KRİTİK BUGLAR (Hemen düzeltilmeli)

### BUG-F1: Üretim Planla yeni sayfa açıyor
**Dosya:** `client/src/pages/fabrika/kiosk.tsx` satır 1477
**Sorun:** `window.open('/fabrika/uretim-planlama', '_blank')` — Kiosk'tan yeni tarayıcı sekmesi açıyor
**Etki:** Kiosk deneyimini kırıyor, kullanıcı kaybolabilir, geri dönemeyebilir
**Çözüm:** Üretim planlamayı kiosk içinde inline panel olarak göster

### BUG-F2: Türkçe karakter hataları
**Dosya:** `client/src/pages/fabrika/kiosk.tsx`
- Satır 1494: "Molaya Cik" → "Molaya Çık"
- Satır 1508: "Ariza Bildir" → "Arıza Bildir"

### BUG-F3: Takvim tarih formatı bozuk
**Screenshot #10'da görülen:** "1.775.427.032.387" yerine tarih göstermeli
**Dosya:** `client/src/pages/fabrika/uretim-planlama.tsx`
**Sorun:** Epoch timestamp'ı doğrudan gösteriyor, format edilmemiş

---

## MİMARİ SORUNLAR (Sprint bazlı çözülmeli)

### SORUN-F1: Batch Spec ↔ Üretim Planı kopukluğu
**Durum:** factoryBatchSpecs tablosu mevcut ve iyi yapılandırılmış:
- productId, machineId, batchWeightKg, expectedPieces, targetDurationMinutes
**Eksik:** 
- `minWorkers` — Bu ürünü üretmek için minimum kaç kişi gerekli?
- `maxWorkers` — Maksimum kaç kişi çalışabilir?
- `prepDurationMinutes` — Ön hazırlık süresi
- `expectedWastePercent` — Beklenen fire oranı
- `recipeId` alanı var ama recipes tablosuyla entegrasyon zayıf

**Olması gereken akış:**
```
Ürün seç → BatchSpec otomatik yüklenir → İstasyon zaten belli → 
Kaç batch? → Tahmini süre/çıktı otomatik hesaplanır
```

**Şu anki akış:**
```
Ürün seç + İstasyon seç (gereksiz) + Batch ağırlık gir + Hedef adet gir → Manuel
```

### SORUN-F2: İstasyon → Ürün → Reçete otomatik bağlantı eksik
**Durum:** factoryStations.productTypeId var — istasyon hangi ürünü üretiyor biliniyor
**Eksik:** Kiosk'ta istasyon seçildiğinde, o istasyonun batch spec'i otomatik yüklenmeli
**Sonuç:** Kullanıcı istasyon + ürün ayrı ayrı seçmek zorunda kalıyor

### SORUN-F3: Vardiya başlangıcı ≠ Üretim başlangıcı
**Durum:** autoStartShift login'de çalışıyor ✅ (doğru)
**Ama:** Kullanıcı worker-home'da istasyon seçmeden sadece vardiyada olabilir
**Eksik:** Vardiya süresini istasyondan bağımsız takip etmek (şu an station assignment sonrası başlıyor gibi)

### SORUN-F4: Minimum personel kontrolü yok
**Senaryo:** Donut hamur hattında 3 kişi çalışıyor. Biri molaya çıkmak istiyor.
**Olması gereken:** Sistem uyarmalı: "Donut Hamur Hattı minimum 3 kişi gerektirir. 1 kişi molaya çıkarsa 2 kişi kalır — üretim kalitesi etkilenebilir."
**Gerekli:**
1. factoryBatchSpecs'e `minWorkers` alanı ekle
2. Mola isteğinde aktif istasyondaki kişi sayısını kontrol et
3. Min altına düşecekse uyar (engelleme değil, uyarı)

### SORUN-F5: Yetkilendirme eksik
**Screenshot'lardan:** Eren ve Ümit usta üretim planı yapabilir, diğerleri sadece üretim yapabilir
**Durum:** Kiosk'ta herkes "Üretim Planla" butonunu görüyor
**Çözüm:** Fabrika rollerine göre kısıtlama:
- `fabrika_mudur` + `fabrika_sorumlu` (Eren, Ümit) → Plan oluşturabilir
- `fabrika_operator` + `fabrika_personel` → Sadece üretim yapabilir
- Plan oluşturma butonu yetkisiz kullanıcılara gösterilmemeli

---

## EKSİK ÖZELLİKLER

### ÖZELLİK-F1: Reçete detayları batch spec'te
BatchSpec'e eklenmesi gerekenler:
```
minWorkers: integer          — Minimum çalışan sayısı
maxWorkers: integer          — Maksimum çalışan sayısı  
prepDurationMinutes: integer — Ön hazırlık süresi (dk)
expectedWastePercent: numeric — Beklenen fire oranı (%)
ingredientsList: text        — Hammadde listesi (JSON)
qualityCheckpoints: text     — Ara kontrol noktaları (JSON)
```

### ÖZELLİK-F2: Üretim sonrası karşılaştırma
Her üretim tamamlandığında:
- Batch spec hedefleri vs gerçekleşen karşılaştırma
- Beklenen adet vs gerçek adet
- Beklenen süre vs gerçek süre
- Beklenen fire vs gerçek fire
- Sapma %'si ve trend

### ÖZELLİK-F3: Anlık istasyon personel takibi
Her istasyonda kaç kişi aktif çalışıyor? 
- Real-time gösterim (fabrika dashboard'da zaten "Aktif Personel" var)
- Min altındaysa kırmızı uyarı
- Mola talebi geldiğinde otomatik kontrol

### ÖZELLİK-F4: Kiosk içi ara kontroller
Belirli üretim aşamalarında zorunlu kontrol noktaları:
- Hamur sıcaklığı kontrolü (donut üretimi)
- Tartım doğrulama (batch spec'e göre)
- Görsel kalite kontrolü (fotoğraf)
- Batch spec'teki qualityCheckpoints alanından dinamik yükleme

### ÖZELLİK-F5: Mr. Dobody fabrika entegrasyonu genişletme
Mevcut eventler: production_plan_missing, qc_rejection_high, lot_skt_approaching, raw_material_critical
Eklenmesi gerekenler:
- `production_underperform` — Gerçekleşen < %80 hedef
- `station_understaffed` — İstasyonda min altı personel
- `batch_duration_exceeded` — Batch süresi hedefin %150'sini aştı
- `waste_rate_high` — Fire oranı beklenenin 2 katı

---

## ÖNCELİK SIRASI

### Hemen (Bu oturum):
1. ✅ BUG-F2: Türkçe karakter düzelt
2. ⏳ BUG-F1: Üretim Planla → kiosk içi panel
3. ⏳ SORUN-F5: Yetkilendirme (plan butonu gizle)

### Kısa vade (Sonraki oturum):
4. SORUN-F1: BatchSpec'e minWorkers, maxWorkers, prepDuration ekle
5. SORUN-F4: Mola öncesi min personel kontrolü
6. SORUN-F2: İstasyon seçildiğinde batch spec otomatik yükle
7. ÖZELLİK-F2: Üretim sonrası hedef/gerçek karşılaştırma

### Orta vade:
8. ÖZELLİK-F4: Ara kontrol noktaları
9. ÖZELLİK-F5: Dobody yeni fabrika eventleri
10. BUG-F3: Takvim tarih format düzeltme
11. ÖZELLİK-F3: Real-time personel takibi

---

## MEVCUT SİSTEM DURUMU (İyi çalışanlar)

✅ Kiosk PIN girişi + kullanıcı seçimi
✅ autoStartShift — giriş yapınca otomatik vardiya başlatma
✅ İstasyon listesi ve atama
✅ Fazla (hazırlık → üretim → temizlik → tamamlandı) akışı
✅ Mola sistemi (başlat/bitir + süre takibi)
✅ Üretim kayıt (miktar + fire + neden)
✅ Arıza bildirimi
✅ Vardiya bitirme + özet
✅ QC modu (kalite kontrol girişi ayrı)
✅ Batch Spesifikasyonları (Vardiya Planlama sekmesi)
✅ 9 istasyon tanımlı (Donut Hamur, Konsantre, Cheesecake, Mamabon, Wrapitos, Cookies, Donut Süsleme, Donut Paketleme, Cinnaboom)
✅ Haftalık plan grid (5 Nis - 11 Nis 2026)
✅ Kalite kontrol sistemi (Bekleyen/Müh.Onay/Onaylanan/Reddedilen)
✅ Fire sebepleri yönetimi
✅ Fabrika dashboard (istasyon durumu, aktif personel, düşük stok uyarısı)
