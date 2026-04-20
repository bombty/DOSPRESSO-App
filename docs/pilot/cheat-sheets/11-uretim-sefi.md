# DOSPRESSO Cheat Sheet — Üretim Şefi (Fabrika)

**Hedef Kullanıcı**: Fabrika üretim şefi (uretim_sefi) — vardiya planı, ekip dağılımı, üretim hedefi, batch koordinasyonu
**Cihaz**: Fabrika tableti (kiosk) + ofis bilgisayarı (planlama)
**Erişim**: Vardiya planı, batch atama, operatör yönlendirmesi, hedef takibi

---

## 1. Üretim Şefi Nedir, Şef'ten Farkı?

- **Şef (sef)**: Reçete + kalite + batch teknik onay (ürünün **doğru üretildi mi?**)
- **Üretim Şefi (uretim_sefi) — SEN**: Plan + ekip + hedef (ürün **planlandığı gibi üretildi mi?**)

Sen üretimin "trafiğini" yönetirsin. Şef ise üretimin "kalite kapısı."

---

## 2. Login Adımları

### Yöntem A — Fabrika Tableti (Kiosk)
1. Fabrika girişi tablet → "Fabrika Kiosk"
2. Adını listeden seç
3. PIN gir (4 haneli)
4. "Giriş" → Üretim Planı ekranı

### Yöntem B — Ofis Bilgisayarı
1. Tarayıcı → sistem aç
2. Kullanıcı adı: [size verilen, örn `uretim_sefi_1`]
3. Parola: SMS/WhatsApp
4. "Giriş Yap" → Fabrika dashboard

---

## 3. Ana Ekran (Fabrika Üretim Şefi)

| Bölüm | İçerik |
|---|---|
| **Bugün Üretim Planı** | Hangi ürün, kaç batch, hangi vardiya |
| **Vardiya Ekibi** | Hazır operatörler, eksik kim, hangi istasyona kim |
| **Batch İlerlemesi** | Her batch hangi adımda (hammadde/karıştırma/pişirme/paketleme) |
| **Hedef vs Gerçekleşen** | Bugünkü plan kaç % tutturuldu |
| **Ekipman Durumu** | Hangi ekipman aktif, arızalı, bakımda |
| **Görev Havuzu** | Fabrika 6 daily görevi + global temizlik/bakım |

---

## 4. Günlük İş Akışı (4 Adım)

### Vardiya Başı (06:00 / 14:00 / 22:00)
1. Kiosk girişi → PIN
2. Üretim planını aç → bugünkü hedef batch sayısı
3. Vardiya ekibi sayımı (eksik varsa fabrika_mudur'a haber)
4. Operatörleri istasyonlara dağıt (hammadde / karıştırma / pişirme / paketleme)
5. Şef ile 5 dk koordinasyon (reçete sürümü, kalite kriteri)

### Üretim Sırasında
1. Batch ilerlemesi gözle (5-10 dk arayla dashboard)
2. Geride kalan operatöre yardım gönder
3. Hammadde bitiyor uyarısı geldi → satınalma'ya hızlı bildirim
4. Şef batch reddederse → sebep oku, **operatör eğitim notu** al

### Vardiya Sonu
1. Hedef vs gerçekleşen tablosu (yüzde olarak)
2. Açık batch'leri sonraki vardiyaya devret (devir notu yaz)
3. Eksik kalan üretim varsa → ertesi gün planına ekle (fabrika_mudur onayı)
4. Ekip performans notu (kim verimli, kim zorlandı)

### Haftalık (Pazartesi)
1. Geçen hafta hedef tutturma yüzdesi → fabrika_mudur'a rapor
2. Sıradaki hafta üretim planı (recete_gm + fabrika_mudur'la)

---

## 5. Sık Kullanılan İşler

### Vardiya Atama (Operatör Dağılımı)
1. "Vardiya Ekibi" → "+ Atama"
2. Operatör seç → istasyon seç (hammadde/karıştırma/pişirme/paketleme)
3. Önemli: rotasyon yap → aynı kişi hep aynı istasyonda olmasın
4. "Kaydet" → operatör kioskta görür

### Batch Yeniden Atama (Operatör Düştü)
1. Aktif batch'lerden eksik kalan → "Devret" butonu
2. Müsait operatör seç → otomatik bildirim
3. Devredilen operatöre yarım kalma sebebi yaz (sistem hatası, izin, vb.)

### Hedef Sapması (Geride Kaldık)
1. Dashboard "Hedef vs Gerçekleşen" sarı/kırmızı
2. Sebep tespit et: ekipman, hammadde, ekip eksik?
3. **Pilot süresince:** Sapma %20+ ise fabrika_mudur'a hemen haber
4. Telafi planı: ek vardiya, hedef düşürme veya yarın

### Ekip Performans Notu
1. Vardiya sonu → "Ekip Notu" widget
2. Her operatör için 1-5 puan + 1-2 cümle
3. **Pilot süresince:** Tüm puanlar fabrika_mudur'a açık görünür

---

## 6. Acil Durumlar

| Durum | Aksiyon |
|---|---|
| Ekip kişi eksik (vardiya başı) | fabrika_mudur'a hemen haber, hedef düşür |
| Ekipman bozuldu (kritik) | Teknik bakım modülü → "Acil Arıza" + üretim **DURDUR** |
| Hammadde bitti (kritik) | satınalma + fabrika_mudur, batch askıya al |
| Şef batch reddetti | Sebep oku → ekip eğitim notu, sonraki batch düzeltme |
| Hedefte %30+ sapma | fabrika_mudur'a anında telefon (sistem mesajı yetmez) |
| Operatör sakatlandı | İlk yardım → fabrika_mudur + İK |
| **Sistem çalışmıyor** | Kâğıt + ofis tahta üzerinde plan, sonra retroaktif gir |

---

## 7. Yardım

🚨 **ACİL DURUM**
- Yangın: **110**
- Sağlık: **112**
- Sistem içi: **Mr. Dobody'e yaz** (chat ikonundan)
  Mr. Dobody seni doğru kişiye otomatik yönlendirir (şef / fabrika mudur / reçete GM / satınalma / teknik bakım)

📱 **Pilot İletişim**
- WhatsApp Pilot Grubu: "DOSPRESSO Pilot — Fabrika"
- Cheat sheet: `docs/pilot/cheat-sheets/11-uretim-sefi.md`

---

## 8. Yapma!

❌ Şef'in reçete kararına müdahale etme — o kalite kapısı, sen plan
❌ Operatöre "kalite kontrolü atla, hızlan" deme — yasal sorumluluk
❌ Hedef sapmasını gizle — fabrika_mudur eninde sonunda görür
❌ Vardiya ekip notunu boş geçme — performans skor sistemi buna bağlı
❌ Sistem dışı plan değişikliği yapma (sözlü → kayıt yok = sorumluluk yok)
❌ Operatörü 4 saatten uzun aynı istasyona atama (yorgunluk + verim düşer)

---

## 9. Pilot Süresince Özel Notlar

- Pilot 4 lokasyondan biri Fabrika → senin hedef tutturma yüzden pilot başarı kriterine doğrudan etki eder.
- **6 daily görev şablonu Fabrika'ya özel** (Görev Havuzu'nda görürsün): üretim hattı pre-shift temizlik, hammadde sıcaklık kontrol, üretim raporu yazma, atık ayrıştırma, soğuk hava deposu sıcaklık log, ürün dağıtım hazırlık.
- Pilot ilk hafta günde 1 kez **fabrika_mudur'a sözlü brifing** (sistem bildirimi yetmez).
- **Çift kontrol**: Pilot süresince kritik batch'leri şef + sen birlikte gözden geçirin.

---

## 10. Tablet/Kiosk İpuçları

- Eldivenle dokunmatik → çıkar
- Soğuk hava deposunda ekran soluk → tablet sıcakta tut
- Vardiya ekibi listesinde isim yanında 🟢 = aktif, 🔴 = eksik, 🟡 = izinli
- 5 dk hareketsiz → otomatik logout
- Hedef vs gerçekleşen yüzdesi 5 dk arayla otomatik güncellenir (yenileme şart değil)
