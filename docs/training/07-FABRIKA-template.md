# 🏭 FABRİKA EĞİTİM MATERYALİ — ŞABLON

> **Pilot Day-1: 12 May 2026 Pazartesi 09:00**
> **Hedef:** Eren (`fabrika_mudur`) + Sema (`recete_gm`/`gida_muhendisi`) + Ümit (`sef`/`uretim_sefi`) + Buşra (`fabrika_personel`) + diğer fabrika personeli
>
> **Sahibi:** **Sema + Eren + Aslan ortak hazırlar**, **Aslan onaylar**
> **Format:** Bu dosya ŞABLON — Sema + Eren içeriği doldurur

---

## 📋 Bu Şablonu Nasıl Kullanırsınız?

1. **Sema + Eren** birlikte oturarak bu dosyayı kelime kelime doldurun
2. **Yorum tagi** `// (?)` veya `_______` olan yerleri gerçek bilgiyle doldurun
3. Tamamlanan dokumanı **Aslan'a gönderin** → onay alınınca pilot için yayınlanır
4. **Hedef teslim:** 9 Mayıs 2026 Cuma 18:00 (Day-1'den 3 gün önce)

---

## 🎯 Fabrika Pilot Görevleri (Genel)

### Eren (Fabrika Müdürü)
1. _______
2. _______
3. _______
4. _______

### Sema (Reçete GM + Gıda Müh.)
1. _______
2. _______
3. _______
4. _______

### Ümit (Şef + Üretim Şefi)
1. _______
2. _______

### Buşra (Fabrika Personeli)
1. _______
2. _______

### Operatörler (3-4 kişi, isimleri TBD)
1. _______
2. _______

---

## 1️⃣ Reçete Sistemi Eğitimi (Sema + RGM)

### Reçete Görüntüleme
```
Kiosk veya bilgisayar → "Fabrika" → "Reçeteler"
→ Reçete listesi (Cinnabon, Donut, vb.)
→ Reçete aç → tüm malzemeler + gramaj görünür
```

### Reçete Onayı (3 Scope)
**Production-Ready için 3 onay GEREKLİ:**
1. **Gramaj** (üretim formülü) — Sema/RGM onaylar
2. **Besin** (nutrition) — Sema onaylar
3. **Alerjen** — Sema onaylar

**Ne zaman üretime hazır:** Üçü de **invalidatedAt = NULL** olmalı.

### Reçete Değişikliği Yaparsa Ne Olur?
- Reçete malzeme/gramaj değişti → **eski onaylar otomatik invalid olur** (Task #180)
- Yeni onay alınana kadar **etiket basılamaz** (F23 production-ready helper)
- Bu, **TGK gıda mevzuatı uyumu** için zorunlu

### Eğitim Notları (Sema dolduracak)
- _______
- _______

---

## 2️⃣ Üretim Batch Sistemi (Eren + Ümit)

### Yeni Batch Başlat
```
Kiosk → "Üretim" → "Yeni Batch"
→ Hangi reçete? (Cinnabon)
→ Hangi versiyon? (otomatik en güncel)
→ Hedef miktar (kaç adet/kg)
→ "Başlat"
```

### Batch Sırasında
- Operatör hammadde tartar → kiosktan girer
- Sapma varsa kayıt edilir
- Kalite kontrol noktası → Ümit imzalar

### Batch Tamamla
```
"Tamamla" → çıktı miktarı
→ Sapma analizi (hedef vs. gerçek)
→ Lot numarası otomatik üretilir
→ Etiket basma yetkisi açılır
```

### Eğitim Notları (Eren + Ümit dolduracak)
- _______
- _______

---

## 3️⃣ Kalite Kontrol (Sema + QC)

### Hammadde Kabul
```
Samet'ten gelen hammadde → "Mal Kabul"
→ Numune al → kalite kontrol formu
→ Onay/Red → Samet'e bildirim
```

### Üretim Sırası Kontrol
- Her batch'in en az 1 noktasında numune
- Test sonucu sisteme girilir
- Negatif sonuç → batch durdurulur, CAPA açılır

### Eğitim Notları (Sema dolduracak)
- _______
- _______

---

## 4️⃣ Etiket Basma (Sema + Eren onayı)

### Etiket Basma Yetkisi
- Reçete **Production-Ready** olmalı (3 scope onaylı)
- Batch tamamlanmış olmalı
- Lot numarası verilmiş olmalı

### Etiket İçeriği
- Ürün adı + lot no + üretim tarihi + son tüketim tarihi
- Besin tablosu (sistem otomatik üretir)
- Alerjen uyarısı (sistem otomatik)
- Üretici adresi + sertifika no

### Lot Tekrarı Kontrolü (F25)
**Sistem otomatik kontrol eder:** Aynı lot daha önce basıldıysa **uyarı verir**.
Eğer bilinçli tekrar gerekiyorsa: yetkili `allowDuplicateLot=true` yapar.

### Eğitim Notları (Sema dolduracak)
- _______
- _______

---

## 5️⃣ Maliyet Hesaplama (Eren + Mahmut koordinasyon)

### Reçete Maliyet
```
Sistem → "Fabrika" → "Maliyet Hesaplama"
→ Reçete seç (Cinnabon)
→ Otomatik hesaplanır:
  - Hammadde maliyeti (Samet fiyatlarından)
  - İşçilik (Mahmut parametreleri)
  - Enerji (Eren fabrika ölçümleri)
  - Toplam → birim maliyet
```

### Eğitim Notları (Eren + Aslan dolduracak)
- _______
- _______

---

## 6️⃣ Vardiya ve PDKS (Eren)

### Fabrika Vardiya Sistemi
- 3 vardiya: 06:00-14:00, 14:00-22:00, 22:00-06:00
- Vardiya değişiminde **devir teslim formu** doldurulur
- Sema + Eren her vardiyayı izler

### Eğitim Notları (Eren dolduracak)
- _______
- _______

---

## 7️⃣ Acil Durumlar

### Üretim Hatası / Kalite Sorunu
1. Eren'e bildir
2. Üretim DURDUR
3. Sema'ya WhatsApp
4. Aslan'a bildir
5. CAPA aç → düzeltici aksiyon planla

### Kiosk Donar / Sistem Çöker
1. Murat'a (IT) bildir
2. Manuel kayıt tut (defterle)
3. Sistem çalışınca girişleri yap

### Hammadde Eksik
1. Samet'e bildir
2. Üretim planını revize et
3. Aslan'a bildir

---

## 📊 Pilot İlk Hafta Hedefleri (Eren + Sema + Aslan dolduracak)

| Hedef | Beklenen |
|---|---|
| Üretim hedef tutturma | %___ |
| Kalite kontrol başarı | %___ |
| Vardiya başarı | %___ |
| Reçete onay süresi | < ___ dk |
| Etiket basma hatasız | %100 |

---

## ⚠️ KIRMIZI ÇİZGİLER (Sema + Eren dolduracak)

❌ _______
❌ _______
❌ _______
❌ _______

---

## 📞 Acil Hat

- **Eren (Fabrika Müd.):** _______
- **Sema (Reçete GM):** _______
- **Aslan (CEO):** _______
- **Mahmut (Muhasebe):** _______
- **Samet (Satınalma):** _______

---

## 🎓 Pilot İlk Hafta Eğitim Akışı (Sema + Eren + Aslan birlikte hazırlar)

### Pre-Pilot (5-10 Mayıs)
- _______
- _______

### Pilot İlk Gün (12 May)
- 06:00 — _______
- 09:00 — _______
- 14:00 — _______
- 22:00 — _______

### Pilot İlk Hafta (12-18 May)
- _______
- _______

---

## ✅ Onay Bloğu

| Hazırlayan | İmza | Tarih |
|---|---|---|
| Sema (Reçete GM) | _______ | _______ |
| Eren (Fabrika Müd.) | _______ | _______ |
| **Aslan (Onay)** | _______ | _______ |

---

## 📝 Notlar

> **Sema + Eren'e Not:**
> - Bu şablonu rehber olarak kullanın, gerçek operasyon detayları sizde
> - Kelime kelime doldurmaya çalışın, sonra Aslan'la birlikte gözden geçirin
> - Anlaşılmayan kısım varsa Aslan'a sorun, Aslan da Claude'a iletir
> - Hedef: 9 May Cuma 18:00'a kadar tüm bölümler dolu olsun

> **Aslan'a Not:**
> - Sema + Eren'in cevapları **gerçek operasyon bilgisi** — sen onaylayacaksın
> - Onayladıktan sonra dosyayı `docs/training/07-FABRIKA-rehberi.md` olarak kaydet
> - PDF'e çevir, fabrikada her vardiya için 1 kopya bastır

---

*v1.0 ŞABLON — 3 May 2026 — Sema + Eren + Aslan dolduracak, Aslan onaylayacak*
