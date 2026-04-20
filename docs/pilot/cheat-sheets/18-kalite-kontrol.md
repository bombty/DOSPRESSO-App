# DOSPRESSO Cheat Sheet — Kalite Kontrol

**Hedef Kullanıcı**: Kalite kontrol sorumlusu — ürün denetim, hijyen, denetim, müşteri sağlık güvenliği
**Cihaz**: Bilgisayar + tablet (denetim sırasında)
**Erişim**: Kalite modülü, denetim kayıtları, alerjen yönetimi, müşteri sağlık raporları

---

## 1. Kalite Kontrol Nedir?

Sen DOSPRESSO'nun **müşteri sağlık güvenliği**nin son hattındasın. Hammadde kalite, üretim kalite, hijyen, alerjen yönetimi, sağlık denetimleri sende.

Yasal sorumluluk **çok yüksek**: alerjik reaksiyon, gıda zehirlenmesi gibi olaylarda ilk soru sana gelir.

---

## 2. Login Adımları

1. Tarayıcı → sistem aç
2. Kullanıcı adı: [örn `kalite_kontrol`]
3. Parola: SMS/WhatsApp
4. "Giriş Yap" → Kalite Kontrol Paneli

---

## 3. Ana Ekran (Kalite Kontrol Paneli)

| Widget | İçerik |
|--------|--------|
| **Aktif Alertler** | Reddedilen batch, kalite sorunu, hijyen uyarısı |
| **Denetim Takvim** | Bugün + bu hafta planlı şube denetimleri |
| **Alerjen Tablosu** | Tüm ürünler × alerjen matrix (güncel mi?) |
| **Müşteri Sağlık Raporları** | CRM'den gelen reaksiyon bildirimleri |
| **Hijyen Skor** | 22 şube hijyen puanı (denetimden) |
| **Lot/SKT Takip** | Geri çağırma gerekli ürünler |

---

## 4. Günlük İş Akışı

### Sabah
1. Aktif alert listesi → kritik öncelik
2. Bugünkü denetim planı
3. Müşteri sağlık raporları (varsa anlık müdahale)

### Gün İçi
1. Şube denetim (sahaya gidip kontrol)
2. Fabrika kalite onaylarını gözle (şef onayları)
3. Reddedilen batch sebep analiz

### Haftalık
1. 22 şube hijyen skor raporu → CGO/CEO
2. Yasal değişiklik takip (gıda kodeksi)
3. Eğitim ihtiyacı tespit (hijyen düşük şube → trainer)

---

## 5. Sık Kullanılan İşler

### Şube Denetimi (Saha)
1. Tablet açık → "Denetim" → şube seç
2. Checklist: hijyen, ekipman, malzeme, kişisel temizlik
3. Her madde puan (1-5) + foto + not
4. Genel hijyen skoru otomatik
5. Düşük skor (<3) → müdüre uyarı + trainer'a bildirim
6. Tekrar denetim takvim

### Müşteri Sağlık Reaksiyonu (Acil)
1. CRM'den bildirim (alerjik reaksiyon, zehirlenme şüphesi)
2. **24 saat içinde** araştırma başlat
3. Olay yeri (şube), tarih, saat, ürün, müşteri ifade
4. Reçete + alerjen + lot kontrol
5. **Yasal yükümlülük**: Sağlık Bakanlığı'na bildirim gerekli mi karar
6. CEO + recete_gm acil brifing

### Lot Geri Çağırma (Acil)
1. Sidebar → "Lot Yönetimi" → ürün/lot ara
2. Sebep yaz (sağlık riski, etiket hatası, vb.)
3. "Geri Çağırma" → tüm şubelere otomatik bildirim
4. Etkilenen müşteri varsa CRM'den iletişim
5. CEO + CGO + reçete GM otomatik bildirim

### Alerjen Listesi Güncelleme
1. Sidebar → "Alerjen" → ürün seç
2. Alerjen ekle/çıkar (gluten, süt, fındık, vb.)
3. Reçete GM'e onay gönder
4. Onay sonrası tüm menü/etiket güncellenir

---

## 6. Acil Durumlar

| Durum | Aksiyon |
|---|---|
| Müşteri alerjik reaksiyon (hastane) | 24 saat içinde araştırma + CEO + Sağlık Bakanlığı bildirim |
| Gıda zehirlenmesi şüphesi (toplu) | Acil lot geri çağırma + Sağlık Bakanlığı + hukuki |
| Tedarikçi mal kalite dışı | Reddet + iade + satınalma'ya bildirim + lot izole |
| Şube hijyen skoru kritik düştü | Trainer + müdür eğitim + 1 hafta sonra tekrar denetim |
| Yasal denetim geldi (haber yok) | Müdüre derhal haber, dokümanlar hazır mı kontrol |
| **Sistem yok** | Kâğıt denetim formu, sonra retroaktif gir |

---

## 7. Yardım

🚨 **ACİL DURUM**
- Yangın: **110**
- Sağlık: **112**
- Sistem içi: **Mr. Dobody'e yaz** (chat ikonundan)
  Mr. Dobody seni doğru kişiye otomatik yönlendirir (CEO / reçete GM / fabrika mudur / müdür)

📱 **Pilot İletişim**
- WhatsApp Pilot Grubu: "DOSPRESSO Pilot — HQ"
- Cheat sheet: `docs/pilot/cheat-sheets/18-kalite-kontrol.md`

---

## 8. Yapma!

❌ Müşteri sağlık raporunu "büyütmeyelim" diye gizleme — yasal sorumluluk
❌ Lot geri çağırmayı 24 saatten fazla geciktirme
❌ Alerjen listesini güncel tutmama — reaksiyon riski
❌ Şube denetimi tek başına atla (sürpriz denetim olmazsa öğrenme yok)
❌ Hijyen skoru "kabul edilebilir" diye düşük şubeyi tolere etme
❌ Yasal değişiklikleri haftalık takip etmeme — uyumsuzluk

---

## 9. Pilot Süresince Özel Notlar

- 4 pilot lokasyon (3 şube + Fabrika) **haftada 1 sürpriz denetim**
- Pilot ilk hafta her gün hijyen skoru CEO'ya rapor
- Pilot süresince **alerjen listesi değişikliği YAPMA** (sadece kritik)
- Pilot sonu denetim raporu 5 May Salı için hazır olmalı
