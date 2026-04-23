# DOSPRESSO Cheat Sheet — Teknik (IT/Bakım)

**Hedef Kullanıcı**: Teknik sorumlu — ekipman bakım, IT destek, sistem altyapı
**Cihaz**: Bilgisayar (asıl) + telefon + saha araç çantası
**Erişim**: Ekipman modülü, bakım planı, IT ticket, altyapı izleme

---

## 1. Teknik Nedir?

Sen DOSPRESSO operasyonunun **fiziksel + dijital altyapısı**ndan sorumlusun:
1. **Ekipman bakım**: Espresso makineleri, soğutucular, fırın, vb.
2. **IT destek**: Tablet, kiosk, ağ, sistem erişim sorunları
3. **Altyapı**: İnternet, elektrik, güvenlik kamera

Ekipman arıza = şube/fabrika duruşu. Hızlı müdahale kritik.

---

## 2. Login Adımları

1. Tarayıcı → sistem aç
2. Kullanıcı adı: [örn `teknik`]
3. Parola: SMS/WhatsApp
4. "Giriş Yap" → Teknik Panel

---

## 3. Ana Ekran (Teknik Panel)

| Widget | İçerik |
|--------|--------|
| **Aktif Arıza Talepleri** | Açık tickets, öncelik (kritik/normal) |
| **Bakım Takvimi** | Bu hafta planlı bakım, garanti süresi yaklaşan |
| **Ekipman Sağlık** | 22 şube + Fabrika ekipman durumu |
| **IT Ticket** | Tablet/kiosk/erişim sorunları |
| **Altyapı İzleme** | İnternet uptime, sunucu, kamera durumu |
| **Sarf Stok** | Yedek parça, filtre, vb. |

---

## 4. Günlük İş Akışı

### Sabah
1. Aktif arıza listesi → kritik öncelik
2. Bugünkü planlı bakım
3. Gece sistem uyarıları (varsa)

### Gün İçi
1. Saha müdahale (kritik arıza)
2. Uzaktan IT destek (tablet/kiosk sıfırlama vb.)
3. Yedek parça sipariş (satınalma ile)

### Haftalık
1. Pazartesi: hafta bakım planı
2. Bütün ekipman sağlık kontrolü
3. CGO/CEO'ya altyapı raporu

---

## 5. Sık Kullanılan İşler

### Acil Arıza Müdahale
1. Sidebar → "Arıza" → ticket aç
2. Telefon ile şube/fabrika ile koordine
3. Geçici çözüm var mı? (örn yedek tablet)
4. Saha gidiş gerekli → araç + parça hazırla
5. Müdahale sonrası ticket kapat + sebep + önlem

### Planlı Bakım
1. Sidebar → "Bakım Takvimi" → bugün listesi
2. Şube ile randevu (en az ertesi günden bildirim)
3. Bakım yap + checklist doldur
4. Foto/video çek
5. Sonraki bakım tarihi otomatik atanır

### IT Destek (Uzaktan)
1. Sidebar → "IT Ticket" → bekleyen
2. Sorun tipi (login / kiosk / tablet / yazıcı)
3. Telefon/ekran paylaşımı ile çöz
4. Çözüm dokümante (sonraki sefere)
5. Çözülmediyse → saha gidiş

### Ekipman Garanti Yönetimi
1. Sidebar → "Ekipman" → ekipman seç
2. Garanti süresi + servis sözleşmesi kontrol
3. Garantide → tedarikçi servis
4. Garanti dışı → kendi servis veya 3. taraf
5. Sözleşme yenileme yaklaşan → muhasebe brifing

---

## 6. Acil Durumlar

| Durum | Aksiyon |
|---|---|
| Şube espresso makinesi bozuldu | Anında müdahale (saha) — şube duruşu kritik |
| Fabrika ana üretim hattı bozuldu | Acil + üretim_sefi + fabrika_mudur, alternatif değerlendir |
| Tüm şubelerde sistem erişim sorunu | IT altyapı, sunucu, ISP eskalasyon, müdürlere bildirim |
| Internet kesintisi (1 şube) | Mobil hotspot çözümü, ISP ile koordineli |
| Güvenlik kamera çalışmıyor | Hemen onar (yasal kayıt zorunlu) |
| **Yangın/sel ekipman hasarı** | İnsan güvenliği önce, sonra hasar tespit + sigorta |

---

## 7. Yardım

🚨 **ACİL DURUM**
- Yangın: **110**
- Sağlık: **112**
- **Sistem sorunu:** Cowork (mesaj) → Müdür veya Supervisor'a DM
- **Pilot süresince:** WhatsApp "DOSPRESSO Pilot" grubu **birincil kanal**
- **Not:** Mr. Dobody otomatik uyarı sistemi (karşılıklı sohbet değil)

📱 **Pilot İletişim**
- WhatsApp Pilot Grubu: "DOSPRESSO Pilot — HQ"
- Cheat sheet: `docs/pilot/cheat-sheets/20-teknik.md`

---

## 8. Yapma!

❌ Kritik arızayı "yarın bakarım" deyip ertele
❌ Bakım sonrası foto/checklist atlamak — denetim/garanti riski
❌ Geçici çözümü kalıcı bırakmak (örn jumper kablo)
❌ IT şifre/erişim bilgisini sözlü ver — sistemden yetkilendir
❌ Ekipman garanti süresini takip etmemek — para kaybı
❌ Yedek parça stok bitirmek — kritik arızada çözüm yok

---

## 9. Pilot Süresince Özel Notlar

- Pilot 4 lokasyonun **tüm ekipmanı** pilot öncesi sağlık kontrolünden geçmiş olmalı
- Pilot süresince saha müdahale süresi hedefi **2 saat** (normalde 4 saat)
- Pilot ilk hafta yedek tablet stoku 3 adet (her lokasyon için)
- IT ticket ortalama çözüm hedefi pilot süresince **30 dk** (normalde 1 saat)
- Pilot süresince planlı bakım YAPMA (sadece acil müdahale)
