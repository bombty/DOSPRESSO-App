# DOSPRESSO Cheat Sheet — Fabrika Müdür

**Hedef Kullanıcı**: Fabrika Müdürü (Eren) — fabrika operasyon liderliği, üretim + kalite + personel + lojistik
**Cihaz**: Bilgisayar (asıl) + telefon + saha
**Erişim**: Tüm fabrika modülleri (üretim, kalite, depo, reçete, vardiya, personel)
**Pilot lokasyonu:** Fabrika (branchId=24)

---

## 1. Fabrika Müdür Nedir?

Sen DOSPRESSO **Fabrika operasyonunun lideri**sin. Üretim şefi + reçete GM + kalite kontrol + sef + depo senin altında. Şubelere mal akışı, fabrika personel, üretim planlama senin sorumluluğunda. CEO + CGO'ya direkt rapor.

---

## 2. Login Adımları

1. Tarayıcı → sistem aç
2. Kullanıcı adı: `eren`
3. Parola: 1Password (pilot ilk gün adminhq verir)
4. "Giriş Yap" → MC Supervisor (fabrika görünümü) → `/fabrika` veya `/sube-centrum`

---

## 3. Ana Ekran (Fabrika Mission Control)

| Widget | İçerik |
|--------|--------|
| **Bugün Üretim Planı** | Vardiya bazlı plan, tamamlanma % |
| **Aktif Vardiyalar** | 3 vardiya × kim çalışıyor |
| **Kalite Skor** | Bugün üretilen batch'lerin kalite onay oranı |
| **Stok Durumu** | Hammadde + bitmiş ürün depo |
| **Personel Sapma** | Devamsızlık, geç kalma, ek mesai |
| **Şubelere Sevkiyat** | Bugün gidecek + bekleyen |
| **Açık Sorunlar** | Ekipman arızası, kalite reddi, üretim duruşu |

---

## 4. Günlük İş Akışı

### Sabah (06:00-08:00)
1. Gece vardiyası özeti (sef + üretim_sefi raporu)
2. Bugün üretim planı + vardiya kontrol
3. Hammadde stok kontrol (kritik düşük var mı)
4. Sevkiyat planı (hangi şubeye ne gidecek)

### Gün İçi
1. Saha turlama (fabrika içi gözlem)
2. Kalite onayları (sef'in batch onay sürecini izle)
3. Şube müdürleri ile koordineli (sipariş + sevkiyat sorunları)
4. CEO/CGO ile günlük brifing (öğle)

### Akşam (16:00-22:00)
1. Vardiya değişim koordinasyonu
2. Gün sonu üretim raporu
3. Yarın için planlama

### Haftalık
1. Pazartesi: hafta üretim planı + stratejik değerlendirme
2. Cuma: hafta sonu hazırlık (kapasite + personel)
3. Aylık satınalma planı (samet ile koordineli)

---

## 5. Sık Kullanılan İşler

### Vardiya Planlama (Fabrika)
1. Sidebar → "Vardiya Planlama"
2. Hafta tablosu → 3 vardiya (06-14, 14-22, 22-06)
3. Personel atama (drag-drop)
4. Kayıt → personele otomatik bildirim
5. Coach (yavuz) ile koordineli (HQ tüm şubelere yetkili)

### Üretim Planı Onayı
1. Sidebar → "Üretim Planı" → bekleyen taslaklar
2. Üretim şefinin haftalık taslağı incele
3. Hammadde stok yeterli mi kontrol
4. Onay → sef'e iletim, batch'ler oluşturulur

### Personel Disiplin / İK
1. Sidebar → "İK" → ilgili personel
2. Devamsızlık + performans + disiplin geçmişi
3. Disiplin tutanağı (gerekirse) + İK koordineli (mahmut)
4. Karar → personele bildirim + sistem kaydı

### Şubelere Sevkiyat Planlama
1. Sidebar → "Sevkiyat" → bekleyen şube siparişleri
2. Önceliklendirme (acil + bölge gruplama)
3. Kurye/araç tahsis
4. Sevkiyat onayı → çıkış kaydı

---

## 6. Acil Durumlar

| Durum | Aksiyon |
|---|---|
| Üretim hattı durdu (ekipman) | Teknik (murat.demir) acil + alternatif hattı değerlendir |
| Kalite reddi (büyük batch) | Kalite kontrol (umran) + reçete GM + araştırma + telafi |
| Vardiya açığı (acil personel) | Coach (yavuz) + acil çağrı + ek mesai onayı |
| Hammadde acil tükenme | Satınalma (samet) + acil sipariş + üretim önceliklendirme |
| Şubeye sevkiyat geç kaldı | Acil kurye + ilgili şube müdürüne brifing |
| Yangın/sel/iş kazası | İnsan güvenliği önce, 110/112, sonra İK + CEO |
| **Sistem yok** | Kâğıt + WhatsApp ile koordineli, 24 saat içinde retroaktif gir |

---

## 7. Yardım

🚨 **ACİL DURUM**
- Yangın: **110**
- Sağlık: **112**
- Sistem içi: **Mr. Dobody'e yaz** (chat ikonundan)
  Mr. Dobody seni doğru kişiye otomatik yönlendirir (sef / üretim şefi / reçete GM / satınalma / kalite / coach / CEO)

📱 **Pilot İletişim**
- WhatsApp Pilot Grubu: "DOSPRESSO Pilot — Fabrika"
- Cheat sheet: `docs/pilot/cheat-sheets/25-fabrika-mudur.md`

---

## 8. Yapma!

❌ Üretim planını sef ile koordinesiz onayla — kalite riski
❌ Personel disiplini İK olmadan tek başına ver
❌ Sevkiyat gecikmesi şubeye haber vermeden bırak
❌ Vardiya değişimini Coach'a bildirmeden yap (HQ koordinasyon)
❌ Hammadde uyarısını "yarın bakarım" deyip ertele
❌ Kalite reddini kayıt dışı bırak — denetim riski

---

## 9. Pilot Süresince Özel Notlar

- **Sen pilot 4 lokasyondan biri** (Fabrika branchId=24) — günde 1 brifing CEO'ya
- Pilot ilk hafta üretim planı **manuel onay** (Mr. Dobody otomatik öneri devre dışı)
- Pilot süresince yeni personel alımı YAPMA (mevcut ekip yeterli)
- Pilot Day-1 raporu Salı akşam fabrika kısmı senin tarafından doldurulur
- Coach (yavuz) ile pilot başlamadan önce vardiya planı 27 Nis Pazar 18:00'a hazır olmalı
