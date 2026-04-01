# DOSPRESSO — 1 Aylık Gerçekçi Test Verisi Planı
**Amaç:** Pilot öncesi tüm dashboard'ları canlı verilerle test etmek
**Kapsam:** 4 pilot şube (Fabrika, HQ, Işıklar, Lara) + 30 günlük simülasyon
**Sıfırlama:** Pilot başlangıcında admin panelinden tek tıkla sıfırlanacak

---

## VERİ KAPSAMI

### Zaman: 1 Mart — 1 Nisan 2026 (30 gün)
### Şubeler: Fabrika (id:24), HQ (id:1), Işıklar (id:?), Lara (id:?)

---

## MODÜL BAZLI VERİ

### 1. PDKS & Vardiya (Tüm şubeler)
```
Her şube, her gün, her personel için:
- Vardiya giriş (08:00-09:00 arası rastgele)
- Mola giriş/çıkış (12:00-13:00)
- Vardiya çıkış (17:00-18:30)
- %10 geç kalma (5-30dk arası)
- %5 erken çıkış
- %3 devamsızlık (izinsiz)
- %2 izinli (yıllık/mazeret)

Sonuç: ~2000 PDKS kaydı (30 gün × ~15 aktif personel × 4 şube)
```

### 2. Görevler / Tasks
```
HQ → Şube görevleri (CRM görev atama):
- 50 görev (30 günde)
- %60 tamamlanmış, %20 gecikmiş, %20 beklemede
- Öncelik: %20 kritik, %30 yüksek, %30 orta, %20 düşük
- Atayan: Coach (20), Trainer (15), CEO (5), CGO (10)
- Atanan: Müdür, Supervisor, Barista çeşitli

Periyodik görevler (Operasyon):
- 10 şablon (açılış, kapanış, temizlik, stok sayım, ekipman kontrol)
- Her gün 4 şubede çalışmış → 120 instance
- %75 tamamlanmış, %15 gecikmiş, %10 kaçırılmış

Alt görevler:
- Her görevde 2-5 alt görev
- Fotoğraf eklenmiş olanlar: %40
```

### 3. Checklist
```
Şablonlar (5 tane):
- Günlük açılış checklist (8 madde)
- Günlük kapanış checklist (6 madde)
- Haftalık temizlik checklist (12 madde)
- Haftalık ekipman kontrol (8 madde)
- Aylık derin temizlik (15 madde)

Tamamlama: 30 gün × 4 şube × günlük 2 = 240 kayıt
- %80 tam tamamlanmış
- %15 kısmi (bazı maddeler atlanmış)
- %5 hiç yapılmamış
- Lara: %52 uyum (kötü — Coach dikkat etmeli)
- Işıklar: %78 uyum (orta)
- Fabrika: %91 uyum (iyi)
- HQ: %85 uyum
```

### 4. Müşteri Geri Bildirim (Misafir Sesi)
```
Toplam: 150 geri bildirim (30 gün × ~5/gün dağıtılmış)
- Şube dağılımı: Lara 40, Işıklar 45, HQ 35, Diğer 30
- Puan dağılımı: ⭐1: %5, ⭐2: %10, ⭐3: %25, ⭐4: %35, ⭐5: %25
- NPS hesaplama: Lara 3.2, Işıklar 3.8, HQ 4.1, Genel 3.7
- Şikayet kategorileri: servis %30, temizlik %25, ürün %20, bekleme %15, diğer %10
- %50'sine yanıt verilmiş (SLA dahilinde)
- %10'u SLA aşmış (eskalasyon)

Yorum örnekleri:
"Kahve harika ama bekleme süresi uzun" (⭐3)
"Personel çok ilgili, teşekkürler" (⭐5)
"Tuvalet temizliği yetersiz" (⭐2)
"Her zaman geliyorum, kalite tutarlı" (⭐4)
```

### 5. Arıza / Ekipman
```
Toplam: 80 arıza (57 mevcut + 23 yeni)
- %40 çözülmüş (resolved)
- %25 devam ediyor (in_progress)
- %20 açık (open)
- %15 beklemede (waiting_parts)
- Ekipman: espresso makinesi %35, değirmen %20, buzdolabı %15, bulaşık %10, diğer %20
- Öncelik: kritik %15, yüksek %25, orta %40, düşük %20
- SLA aşan: 8 arıza (eskalasyon gereken)
- Ort çözüm süresi: 28 saat
- Lara'da 12 arıza (en çok — sorunlu şube)
```

### 6. Destek Talepleri (CRM)
```
Toplam: 60 ticket (41 mevcut + 19 yeni)
Departman dağılımı:
- Teknik: 20 (CGO ilgi alanı)
- Lojistik: 12
- Muhasebe: 10
- Eğitim: 8
- Marketing: 5
- İK: 5

Durum: %50 çözülmüş, %30 açık, %20 işlemde
SLA durumu: %15 SLA aşmış
Ort yanıt süresi: 18 saat
```

### 7. Denetim
```
Şablonlar: 4 (mevcut)
- Hijyen denetimi
- Servis kalitesi denetimi
- Ekipman denetimi
- Genel operasyon denetimi

Instance'lar: 16 (4 şube × 4 denetim türü)
- Son 30 günde gerçekleştirilmiş
- Puanlar: Lara 45-55 (kötü), Işıklar 65-75 (orta), Fabrika 80-90 (iyi), HQ 70-80
- CAPA: 6 açık düzeltici eylem
  - 3 Lara (hijyen, ekipman, servis)
  - 2 Işıklar (ekipman, eğitim)
  - 1 HQ (genel)
```

### 8. Fabrika Üretim
```
30 günlük üretim verisi:
- Günlük 15-25 üretim koşusu
- Ürünler: Türk kahvesi, espresso, filtre, soğuk kahve, tatlı çeşitleri
- Hedef vs gerçek: %78-92 arası verimlilik
- QC: 200 lot, %88 onay, %8 koşullu, %4 red
- Fire oranı: %3-7 arası (hedef <%5)
- Sevkiyat: 120 sevk, %95 zamanında

Depo:
- 25 ürün stokta
- 5 kritik seviyede (yeniden sipariş gerekli)
- Sipariş hazırlama: 80 sipariş, ort 2.5 saat
```

### 9. Finans
```
Şube bazlı gelir-gider (30 gün):
- Lara: Gelir ₺78K, Gider ₺62K, Kâr ₺16K
- Işıklar: Gelir ₺92K, Gider ₺71K, Kâr ₺21K
- HQ: Gelir — (merkez), Gider ₺145K
- Fabrika: Gelir — (üretim), Gider ₺210K

Bordro (aylık):
- Fabrika: ₺128K (14 personel)
- HQ: ₺95K (12 personel)
- Işıklar: ₺42K (8 personel)
- Lara: ₺38K (7 personel)

Fiks giderler: Kira, elektrik, su, internet — şube bazlı
```

### 10. Bildirimler & Duyurular
```
Mevcut 16,107 bildirim — TEMİZLE → Son 30 gün kalacak şekilde arşivle
Yeni duyurular: 5 adet
- "Yeni espresso reçetesi yayınlandı" (1 Mart)
- "Ramazan mesai düzenlemesi" (10 Mart)
- "Hijyen denetim haftası" (15 Mart)
- "Yeni personel oryantasyon" (20 Mart)
- "Pilot başlangıç hazırlıkları" (28 Mart)
```

### 11. Cowork Kanalları
```
Varsayılan kanallar (6):
- #genel (tüm HQ)
- #teknik (CGO + teknik ekip)
- #egitim (Trainer + Coach)
- #finans (Muhasebe + CEO)
- #operasyon (Coach + Supervisor'lar)
- #pilot-hazirlik (geçici — pilot ekibi)

Her kanalda 5-15 mesaj (test verisi)
```

---

## ADMIN SIFIRLAMA BUTONU

```
Admin > Yönetim > Veri Yönetimi

[🔴 Test Verilerini Sıfırla]

Bu işlem:
✓ Test görevlerini siler (sourceType = 'seed_test')
✓ Test geri bildirimleri siler
✓ Test arıza kayıtlarını siler
✓ Test checklist tamamlamalarını siler
✓ Test denetim sonuçlarını siler
✓ Test PDKS kayıtlarını siler
✓ Test bildirimleri siler

Bu işlem SİLMEZ:
✗ Kullanıcı hesapları
✗ Şube bilgileri
✗ Şablonlar (checklist, denetim, görev)
✗ Reçeteler
✗ Sistem ayarları
✗ Rol/izin tanımları

[Onaylıyorum — Sıfırla]
```

**Teknik:** Tüm seed verilere `sourceType: 'seed_test'` veya `isSeedData: true` flag'i eklenir. Sıfırlama sadece bu flag'li kayıtları siler.

---

## SEED SCRIPT YAPISI

```
server/seed-pilot-simulation.ts

1. Tarih aralığı belirle (1 Mart - 1 Nisan)
2. Pilot şube ID'lerini al
3. Her şubedeki personeli al
4. 30 gün döngüsü:
   a. PDKS kayıtları oluştur
   b. Checklist tamamlama oluştur
   c. Görevler oluştur + tamamla
   d. Müşteri geri bildirim oluştur
   e. Arıza kayıtları oluştur
   f. Destek talepleri oluştur
5. Denetim sonuçları oluştur
6. Fabrika üretim verileri oluştur
7. Finans verileri oluştur
8. Cowork kanalları + mesajlar oluştur
9. Duyurular oluştur

Tahmini çalışma süresi: 30-60 saniye
Tahmini kayıt sayısı: ~5000-8000 yeni kayıt
```

---

## TAHMİNİ GELİŞTİRME SÜRESİ

| İş | Süre |
|-----|------|
| seed-pilot-simulation.ts yazımı | 4-5 saat |
| Admin sıfırlama endpoint + butonu | 1 saat |
| Test + doğrulama | 1 saat |
| **TOPLAM** | **6-7 saat** |
