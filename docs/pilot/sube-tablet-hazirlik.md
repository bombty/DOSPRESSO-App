# Pilot Şube Tablet Hazırlık Listesi

**Tarih:** 21 Nisan 2026
**Hazırlık Deadline:** 26 Nisan 2026 Cumartesi 18:00
**Sorumlu:** Şube Müdürleri + Coach (yavuz) destek

---

## Pilot 4 Lokasyon

| Lokasyon | branchId | Müdür | Tablet sayısı | Yedek tablet |
|----------|----------|-------|----------------|---------------|
| Işıklar | 5 | (DB sorgu) | 2 (kasa + bar) | 1 |
| Lara | 8 | (DB sorgu) | 2 (kasa + bar) | 1 |
| HQ | 23 | adminhq | 1 (resepsiyon) | 0 (telefon yedek) |
| Fabrika | 24 | eren | 3 (giriş + üretim + depo) | 1 |

---

## Tablet Başına Hazırlık (Her Tablet için Tekrar)

### Donanım Kontrol
- [ ] Şarj %100
- [ ] Powerbank yedek (en az 10000 mAh)
- [ ] Şarj kablosu (USB-C veya Lightning)
- [ ] Tablet standı sabit (kasa veya duvar)
- [ ] Ekran temiz (toz, parmak izi yok)

### Yazılım Kontrol
- [ ] **Tarayıcı güncel** (Chrome/Safari son sürüm)
- [ ] **Tarayıcı cache temizlendi** (yeni başlangıç)
- [ ] **GPS izni VERİLDİ** (sistem ayar + tarayıcı izin) ⚠️ KRİTİK
- [ ] **Konum servisi açık** (cihaz seviyesinde)
- [ ] **WiFi otomatik bağlanma** (şube WiFi'sine kayıtlı)
- [ ] **Yedek mobil internet** (4G hotspot teyit edildi)
- [ ] DOSPRESSO URL kısayolu home screen'de
- [ ] Tarayıcıda DOSPRESSO favori
- [ ] WhatsApp yüklü + Pilot Grubu üye

### Hesap / Login
- [ ] Şube müdürü PIN biliyor (1Password)
- [ ] Test barista hesabı sıfırlandı (smoke test için)
- [ ] Yedek müdür PIN'i (Coach + Aslan'da)
- [ ] Kiosk ekran kilidi YOK (otomatik kapanma 30 dk)

### Test Login Çekimi (26 Nis Cumartesi)
- [ ] Tarayıcı → DOSPRESSO aç
- [ ] Ana sayfa yükleniyor mu (5 sn altı)
- [ ] PIN ile login dene → 1 başarılı, 1 yanlış PIN test
- [ ] Shift-start dene → GPS izin pop-up çıkıyor mu
- [ ] GPS izni verildikten sonra shift başlıyor mu
- [ ] Shift-end dene
- [ ] Logout

### Acil Durum Kit
- [ ] Yedek tablet (Lara, Işıklar, Fabrika için 1)
- [ ] Tablet PIN sıfırlama prosedürü (kâğıt nüsha)
- [ ] WhatsApp Pilot Grubu QR kod (yeni katılım için)
- [ ] adminhq telefon (kritik teknik sorun için)
- [ ] Cheat sheet PDF (printout, tablet yanında)

---

## GPS İzin Kontrol Prosedürü (Kritik)

### iPad (Safari)
1. Ayarlar → Gizlilik & Güvenlik → Konum Servisleri → AÇIK
2. Ayarlar → Safari → Konum → "İzin Sor" veya "İzin Ver"
3. DOSPRESSO sitesi → ilk kez konum istediğinde "İzin Ver"
4. Test: Console'da `navigator.geolocation.getCurrentPosition(p => console.log(p))` çalışmalı

### Android Tablet (Chrome)
1. Ayarlar → Konum → AÇIK + "Yüksek Doğruluk"
2. Chrome → Ayarlar → Site Ayarları → Konum → DOSPRESSO için "İzin Verildi"
3. Test: aynı console komutu

### Test Kabul Kriteri
- [ ] Tablet 4 lokasyon koordinatlarına ≤100m yakın gözüküyor (Google Maps ile karşılaştır)
- [ ] Kiosk shift-start sayfasında "Konum doğrulandı" mesajı çıkıyor
- [ ] Eğer "konum hatası" çıkıyorsa → IT danışman GÖREV 2 (geoRadius düzeltme)

---

## Şube Bazlı Özel Notlar

### Işıklar (branchId=5)
- Pilot ana lokasyon, Aslan + Replit Agent + Coach Day-1 burada
- Tablet sayısı: 2 + 1 yedek
- WhatsApp Grubu: "DOSPRESSO Pilot — Işıklar"
- Day-1 saat 09:00 herkes burada toplanma

### Lara (branchId=8)
- Pilot ikinci lokasyon, Coach (yavuz) Day-1 burada
- Tablet sayısı: 2 + 1 yedek
- WhatsApp Grubu: "DOSPRESSO Pilot — Lara"

### HQ (branchId=23)
- Tablet sayısı: 1 (resepsiyon kiosk)
- HQ rolleri kendi cihazlarından login (laptop)
- WhatsApp Grubu: "DOSPRESSO Pilot — HQ"

### Fabrika (branchId=24)
- Tablet sayısı: 3 (giriş + üretim + depo) + 1 yedek
- 3 vardiya = 3 tablet aktif kullanım
- Eren (fabrika_mudur) kendi laptop'tan login
- WhatsApp Grubu: "DOSPRESSO Pilot — Fabrika"
- Üretim alanında nem/sıcaklık tablet ömrünü etkileyebilir → günlük kontrol

---

## 26 Nis Cumartesi Smoke Test Checklist

**Sorumlu:** Coach (yavuz) + Şube Müdürleri + Replit Agent (uzaktan kontrol)

| # | Adım | Sorumlu | Lokasyon | Beklenen |
|---|------|---------|----------|----------|
| 1 | Tüm tabletler şarj %100 | Şube müdürleri | 4 lokasyon | ✅ |
| 2 | GPS izni verildi mi | Şube müdürleri | 4 lokasyon | ✅ Console test PASS |
| 3 | Tarayıcı cache temiz | Şube müdürleri | 4 lokasyon | ✅ |
| 4 | Test PIN ile login | Şube müdürleri | 4 lokasyon | ✅ Login başarılı |
| 5 | Shift-start (GPS) | Şube müdürleri | 4 lokasyon | ✅ Konum onaylı |
| 6 | Mola test (5 dk) | Şube müdürleri | 4 lokasyon | ✅ Mola kaydı |
| 7 | Shift-end | Şube müdürleri | 4 lokasyon | ✅ Vardiya kapandı |
| 8 | Logout + tarayıcı kapat | Şube müdürleri | 4 lokasyon | ✅ |

**Smoke skoru:** 8/8 = ✅ Pilot için hazır
**Smoke skoru:** ≤6/8 = ⚠️ Aslan brifing + 27 Nis ekstra çalışma

---

## Yedek Plan (Kâğıt Mod)

Sistem çökmesi veya tüm tabletler arızalanırsa:
1. Kâğıt nöbet defteri (her şubede 1)
2. Personel adı + giriş saati + çıkış saati + mola süresi manuel kayıt
3. Sistem geri geldiğinde retroaktif veri girişi (24 saat içinde)
4. Şube müdürü WhatsApp Pilot Grubu'na bildirim ("Sistem yok, kâğıt moda geçtik")

---

**Sahip:** Replit Agent (hazırlık) → Coach + Şube Müdürleri (yürütme) → Aslan (Day-1 onay)
**Versiyon:** v1.0 / 21 Nis 2026
