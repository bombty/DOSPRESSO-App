# DOSPRESSO Cheat Sheet — Şef (Fabrika)

**Hedef Kullanıcı**: Fabrika şefi (sef rolü) — üretim hattının teknik sorumlusu, reçete uygulama, kalite onayı
**Cihaz**: Fabrika tableti (kiosk) + ofis bilgisayarı (üretim planı)
**Erişim**: Reçete, üretim batch onayı, kalite kontrol, lot/SKT, ekip yönlendirme

---

## 1. Şef Nedir, Mudur'dan Farkı?

- **Fabrika Mudur (Eren)**: İdari yönetim, satınalma, mali, personel
- **Üretim Şefi (uretim_sefi)**: Vardiya planı, ekip dağılımı, hedefler
- **Şef (sef) — SEN**: Reçete doğruluğu, kalite onayı, batch'in teknik kararı

Üretim hattı durduğunda **sen onay verirsin** — operatörler/işçiler sana bağlı.

---

## 2. Login Adımları

### Yöntem A — Fabrika Tableti (Kiosk)
1. Fabrika girişi tablet → "Fabrika Kiosk"
2. Adını listeden seç
3. PIN gir (4 haneli)
4. "Giriş" → Üretim ekranı

### Yöntem B — Ofis Bilgisayarı
1. Tarayıcı → sistem aç
2. Kullanıcı adı: [size verilen, örn `sef_fabrika_1`]
3. Parola: SMS/WhatsApp
4. "Giriş Yap" → Fabrika dashboard (üretim planı, reçete, kalite)

---

## 3. Ana Ekran (Fabrika Şef)

| Bölüm | İçerik |
|---|---|
| **Bugün Üretim Planı** | Hangi ürün, kaç batch, hangi vardiya |
| **Aktif Batch'ler** | Sürmekte olan üretim, hangi adımda |
| **Reçete Kütüphanesi** | Tüm ürün reçeteleri, son güncelleme tarihi |
| **Kalite Bekleyen** | Numune sonucu bekleyen batch'ler (senin onayını bekliyor) |
| **Lot/SKT Uyarıları** | Yaklaşan SKT, eksik lot kayıtları |
| **Görev Havuzu** | Şube bazlı + Fabrika spesifik (6 daily görev) |

---

## 4. Günlük İş Akışı (4 Adım)

### Vardiya Başı (06:00 / 14:00 / 22:00)
1. Kiosk girişi → PIN
2. Üretim planını aç → bugünkü batch listesi
3. Reçete son sürüm mü kontrol et (sol üst tarih)
4. Üretim Şefi ile 5 dk brifing (sözlü) — özel durum varsa not al

### Üretim Sırasında
1. Operatörler batch başlatır → sen reçete ataması yap
2. Hammadde tartım uygunluğu kontrol et (sistem otomatik flag verir)
3. Kritik adımlarda (pişirme süresi, soğutma, paketleme) **gözlem yap**
4. Numune al → kalite kontrol kayıt **sen yaparsın** (operatör değil)

### Kalite Onayı (Her Batch İçin)
1. "Kalite Bekleyen" widget → batch seç
2. Numune sonucu (renk, tat, doku, ağırlık)
3. Onay/Red:
   - **Onay** → otomatik stok girişi + paketleme
   - **Red** → batch **DURDURULUR**, gerekçe yaz, üretim_sefi + fabrika_mudur'a bildirim
4. Lot numarası ata + SKT belirle (reçeteden otomatik gelir, doğrula)

### Vardiya Sonu
1. Onay bekleyen batch kalmadığını teyit et (kalmasın!)
2. Sıradaki vardiyaya not bırak: özel durum, devam eden batch
3. "Vardiya Bitir" → otomatik check-out

---

## 5. Sık Kullanılan İşler

### Reçete Güncelleme (Acil Değişiklik)
1. Sidebar → "Reçete" → ürün seç
2. "+ Yeni Sürüm" (eski sürüm silinmez, arşivlenir)
3. Değişikliği yaz + gerekçe (zorunlu)
4. **Recete_gm onayına gider** — sen tek başına yayınlayamazsın
5. Recete_gm onayladıktan sonra sıradaki batch'ten itibaren aktif

### Kalite Sorunu Eskalasyonu
1. Batch reddedildi → Mission Control "Kalite Alert" otomatik açılır
2. Sebep: hammadde mi, ekipman mı, operatör hatası mı? — kategori seç
3. Hammadde ise → satınalma'ya bildirim
4. Ekipman ise → bakım talebi (ekipman modülünden)
5. Operatör ise → uretim_sefi'ne bildirim (eğitim/uyarı kararı)

### Lot Kayıt Düzeltme (Geriye Dönük)
1. Sidebar → "Lot Yönetimi" → batch ID ara
2. **Sadece son 24 saat içinde** düzeltebilirsin (data lock)
3. Daha eski → fabrika_mudur'a "Değişiklik Talebi" aç

### SKT Yaklaşan Ürün
1. Dashboard "SKT Uyarıları" → kırmızı liste
2. 7 günden az kalan ürünler → satış'a "Acil Çıkış" bayrağı
3. 3 günden az → otomatik **kullanılamaz** durumuna geçer

---

## 6. Acil Durumlar

| Durum | Aksiyon |
|---|---|
| Hammadde standart dışı (renk/koku) | Tüm üretimi DURDUR → Numune sakla → satınalma + kalite_kontrol |
| Ekipman bozuldu (kritik) | Ekipman → "Acil Arıza" → bakım + uretim_sefi'ne anında bildirim |
| Lot numarası karıştı (yanlış basılmış) | Hemen üretimi durdur, fabrika_mudur'a haber, geri çağırma değerlendirilir |
| Operatör eksik geldi | uretim_sefi'ne bildirim, batch sayısını azalt |
| Yangın/su baskını | **İnsan güvenliği önce** → 112 + fabrika_mudur, sistem sonra |
| **Sistem çalışmıyor** | Kâğıt formla devam et (acil reçete + kalite formu fabrika ofisinde), 24 saat içinde retroaktif gir |

---

## 7. Yardım

🚨 **ACİL DURUM**
- Yangın: **110**
- Sağlık: **112**
- **Sistem sorunu:** Cowork (mesaj) → Müdür veya Supervisor'a DM
- **Pilot süresince:** WhatsApp "DOSPRESSO Pilot" grubu **birincil kanal**
- **Not:** Mr. Dobody otomatik uyarı sistemi (karşılıklı sohbet değil)

📱 **Pilot İletişim**
- WhatsApp Pilot Grubu: "DOSPRESSO Pilot — Fabrika"
- Cheat sheet: `docs/pilot/cheat-sheets/08-sef-fabrika.md`

---

## 8. Yapma!

❌ Reçete güncellemesini recete_gm onayı olmadan yayınlama (yapamazsın zaten, deneme)
❌ Kalite onayını "vakit yok" diye atla — geri dönüşü yok, ürün çıkar
❌ Lot numarası boş bırakma — yasal sorumluluk
❌ Reddedilen batch'i sessizce "düzelt" → her red kayıtlı kalmalı
❌ Numuneleri at — minimum 7 gün sakla (denetim gelirse)
❌ Operatöre "ben yetki veriyorum" deyip kalite kuralını esnetme — sen şefsin, kuralı sen koruyorsun

---

## 9. Pilot Süresince Özel Notlar

- **Pilot 4 lokasyondan biri Fabrika**: senin batch onayların pilot başarı kriterine doğrudan etki eder.
- **6 daily görev şablonu Fabrika'ya özel** (üretim hattı pre-shift temizlik, hammadde sıcaklık kontrol, üretim raporu yazma, atık ayrıştırma, soğuk hava deposu sıcaklık log, ürün dağıtım hazırlık) — Görev Havuzu'nda görürsün.
- **Pilot ilk hafta (28 Nis-4 May)**: günde 1 kez **fabrika_mudur'a sözlü brifing** ver (sistem bildirimi yetmez, yüz yüze).
- **Çift kontrol**: Pilot süresince kritik batch'leri uretim_sefi de gözden geçirsin (4 göz).

---

## 10. Tablet/Kiosk İpuçları

- Eldivenle dokunmatik → çıkar
- Soğuk hava deposunda ekran soluk → tablet sıcakta tut, 1 dk önceden çıkar
- Foto çekerken ürün net + flaş aç (parlak ışık altında bile)
- 5 dk hareketsiz → otomatik logout
- Kalite sonucu girerken **tek hane yanlış = batch yanlış kararı** → 2 kez kontrol et
