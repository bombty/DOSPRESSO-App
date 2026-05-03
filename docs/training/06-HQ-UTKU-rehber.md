# 🏛️ HQ — UTKU (CGO + Kalite) Rehber

> **Pilot Day-1: 12 May 2026 Pazartesi 09:00**
> **Hedef:** Utku (`cgo` rolü, +Kalite Kontrol Ümran'dan devraldı)
> **Sahibi:** Aslan (HQ eğitimi sahibi + onay)

---

## ⚠️ ÖNEMLİ: Çift Rol Durumu

Utku **CGO** rolünde sistemde, ama 25 Apr 2026'dan beri **Ümran'ın yerine kalite kontrol** görevi de yapıyor.

**Bilinen kısıt:** CGO rolünde checklist/complaints/product_complaints CRUD yetkisi tam değil. Pilot öncesi:
- (a) Yetki eklenecek (kod fix, Sprint 4'e ertelendi)
- (b) Veya Sema'ya delege edilecek
- (c) Veya Aslan üzerinden aksiyon

**Pilot süresince:** Kalite kontrol işlerinde **Aslan'a escalate** et — geçici çözüm.

---

## 🎯 Pilot Süresince Görevin

### CGO Rolü
1. **Operasyon takibi** — Şubelerin günlük performansı
2. **Müşteri şikayetleri** — Yavuz'dan eskalasyon, çözüm üretme
3. **Büyüme metrikleri** — Pilot başarı KPI takibi
4. **Aslan'ın sağ kolu** — Stratejik karar destek

### Kalite Kontrol Geçici Görev
1. **Şikayet → ürün şikayeti yönlendirme** — Hangi şikayet ürünü etkiler?
2. **Sema/Eren ile koordinasyon** — Kalite sorunu üretim mü, hammadde mı?
3. **CAPA (corrective action) takibi** — Düzeltici aksiyon kapanışı

---

## 1️⃣ Komuta Merkezi — CGO Dashboard

### Telefondan Açtığında
**Menü:** Komuta Merkezi → CGO Dashboard

### Görüceğin KPI'lar
- **Şube günlük ciro** — 4 pilot birim (Lara, Işıklar, HQ, Fabrika)
- **Vardiya başarı oranı** — kaç kişi düzgün başlatıp bitirdi
- **Aktif şikayet** — yeni gelen + bekleyen
- **Operasyon hatası** — kiosk donma, sistem yavaşlama
- **Mr. Dobody notları** — AI agent uyarıları

### Tıklanabilir Widget'lar
Her KPI'a tıklayınca detay → **drill-down** mantığı.

---

## 2️⃣ Müşteri Şikayet Yönetimi

### Yavuz Sana Şikayet Eskalasyonu Yaptı
Şube müdürü Yavuz'a iletti, Yavuz yetersiz kalır → senin telefonuna bildirim:
> "Lara'da müşteri ürünün bayatladığını söylüyor — Yavuz'dan escalate"

### Adımlar
```
1. Sistem → "CRM" → "Eskalasyon Listesi"
2. Şikayeti aç → detayları oku
3. Karar:
   (a) Müşteriyi ara, çöz → "Çözüldü" işaretle + not
   (b) Üretim/kalite sorunuysa → Sema/Eren'e ilet
   (c) Yetersizsen → Aslan'a escalate
4. Çözüm tarihi + iletişim notu yaz
```

### Ürün Şikayeti (Pilot için Önemli)
**Ürün şikayeti:** Müşteri belirli bir ürünü beğenmedi/sorunlu (örn. donut bayat, kahve soğuk).

```
Sistem → "Ürün Şikayetleri"
→ Yeni şikayet → ürün adı + tarih + müşteri
→ "Hangi şubeden alındı?" → şube seç
→ "Hangi reçete versiyonu?" → sistem otomatik doldurur
→ Sema'ya bildirim otomatik gider
```

⚠️ **CGO rolünde bu CRUD eksik olabilir.** O zaman Aslan'a/Sema'ya WhatsApp at, manuel tut.

---

## 3️⃣ Kalite Kontrol Geçici Görev

### Sema Sana Bir Reçete Göndermek İsteyebilir
> "Cinnabon yeni versiyon → onay için bakman lazım"

### Yapacakların
**ÖNEMLİ:** Reçete onayı **Sema + Aslan ortak**, sen sadece izleyebilirsin.

```
1. Sistem → "Fabrika" → "Reçete Listesi"
2. Cinnabon → versiyon geçmişi
3. "Onaylı / Onaysız" durumu kontrol
4. Sorun varsa Sema'ya WhatsApp:
   "Bu reçetede X malzeme görünmüyor"
```

### CAPA (Düzeltici Aksiyon) Takibi
Müşteri şikayet → ürün hatası → CAPA açılır:
```
Sistem → "CAPA" → "Açık CAPA'lar"
→ Listede senin sorumluluğundaki olanlar
→ SLA deadline → tarihten önce kapatma zorunlu
→ Eylemler tamam → "CAPA Kapatma"
```

---

## 4️⃣ Pilot Başarı KPI Takibi

### Haftalık Aslan Toplantısı (Cuma 16:00)

Pilot başarı metriklerini sun:

```
📊 Hafta X Pilot Performans

🟢 Kullanım Oranı
- Lara: %___
- Işıklar: %___
- HQ: %___
- Fabrika: %___

🟢 Şikayet
- Toplam: ___ adet
- Çözüldü: ___ adet (___ saat ortalama)
- Açık: ___ adet (en eski: ___ saat)

🟢 Operasyon Hatası
- Kiosk donma: ___ kez
- Sistem hatası: ___ kez

🟢 Eylem Önerisi
- Sorun 1: ____ → çözüm önerisi
- Sorun 2: ____
```

---

## 5️⃣ Mr. Dobody (AI Agent) Senden İsterse

Mr. Dobody otonom aksiyon önerebilir:
> "Utku, Lara'da 3 gün üst üste kullanım %50'nin altında — şube müdürüne bildirim göndereyim mi?"

### Cevap
- **Onay** → Mr. Dobody Andre'ye otomatik mesaj atar
- **Red** → Sebep yaz
- **Kendin** → Andre'yi sen ararsın

---

## ⚠️ KIRMIZI ÇİZGİLER

❌ **Reçete onayı** — Sen onaylayamazsın, Sema + Aslan
❌ **Bordro/PDKS işlemleri** — Mahmut'un işi, sen karışma
❌ **Şube personel işten çıkarma kararı** — Aslan + İK
❌ **Tedarikçi seçimi** — Samet'in işi
❌ **Sistem ayarı değiştirme** — Murat (IT) + Aslan

---

## 📞 Acil Hat

- **Aslan (CEO):** _______ — stratejik karar
- **Yavuz (Coach):** _______ — saha eskalasyon
- **Sema (Gıda Müh.):** _______ — kalite + reçete
- **Eren (Fabrika):** _______ — üretim sorunu
- **Mahmut (Muhasebe):** _______ — finansal soru

---

## 🎓 Pilot İlk Hafta Eğitim

### Aslan ile Birlikte
- 12 May Pazartesi — Komuta Merkezi turu, KPI'lar tanıtım
- 13 May Salı — İlk şikayet eskalasyonu pratiği
- 14-16 May — Sema + Eren ile kalite kontrol akışı
- 17 May — Hafta sonu performans değerlendirme

### CGO Yetki Eksiği Çözümü
**Pilot süresince geçici:** CRUD gerektiren işlerde Aslan'a yaz, Aslan üzerinden hallet.
**Sprint 4'te kalıcı:** B19 task — CGO rolüne `complaints/product_complaints/checklist` CRUD yetkisi eklenecek.

### Senin Notların
Her şikayet eskalasyonunda **kayıt tut:**
- Şikayet tipi
- Çözüm süresi
- Tekrarlanan tema var mı (sistem mi, eğitim mi, hammadde mi)?

Hafta sonu Aslan'a sun.

---

*v1.0 — 3 May 2026 — Aslan hazırlar, Utku ile birlikte uygular*
