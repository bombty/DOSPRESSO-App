# DOSPRESSO Cheat Sheet — Satınalma

**Hedef Kullanıcı**: Satınalma sorumlusu — tedarikçi yönetimi, sipariş, fiyat müzakere, stok besleme
**Cihaz**: Bilgisayar (asıl) + telefon
**Erişim**: Satınalma modülü, tedarikçi listesi, sipariş, stok uyarıları

---

## 1. Satınalma Nedir?

Sen DOSPRESSO'nun **tedarik zinciri**ni yönetirsin. Hammadde + ekipman + hizmet alımı + tedarikçi ilişkisi senin sorumluluğunda. Hatalı/geç sipariş = üretim/şube duruşu.

---

## 2. Login Adımları

1. Tarayıcı → sistem aç
2. Kullanıcı adı: [örn `satinalma`]
3. Parola: SMS/WhatsApp
4. "Giriş Yap" → Satınalma Paneli

---

## 3. Ana Ekran (Satınalma Paneli)

| Widget | İçerik |
|--------|--------|
| **Düşük Stok Uyarıları** | Fabrika + 22 şube — kırmızı kalemler |
| **Aktif Siparişler** | Açılmış siparişler, tahmini varış |
| **Tedarikçi Performans** | Vaktinde teslim %, fiyat trendi |
| **Yeni Talep** | Şubelerden gelen acil sipariş |
| **Bütçe Takibi** | Aylık satınalma bütçesi vs gerçekleşen |
| **Fiyat Trend** | Hammadde fiyat değişimi (son 30 gün) |

---

## 4. Günlük İş Akışı

### Sabah
1. Düşük stok uyarıları → öncelik sırala
2. Aktif siparişlerin teslimat takvimi
3. Acil talep listesi (gece geldi mi?)

### Gün İçi
1. Tedarikçi sipariş açma
2. Tedarikçi takip (geç gelenler)
3. Yeni talep onay/red
4. Fiyat müzakere (haftalık 1-2 görüşme)

### Akşam
1. Yarın gelecek teslimatların depo'ya bildirimi
2. Açık sipariş güncel durum

### Haftalık
1. Tedarikçi performans değerlendirme
2. Bütçe vs gerçekleşen, CGO/muhasebe brifing
3. Alternatif tedarikçi araştırma (en az 1 kategori/hafta)

---

## 5. Sık Kullanılan İşler

### Yeni Sipariş Açma
1. Sidebar → "Sipariş" → "+ Yeni"
2. Tedarikçi seç → ürün listesi (multi-select)
3. Miktar + birim fiyat (sistemden gelir)
4. Teslimat tarih + yeri (Fabrika veya şube)
5. Onay (>50K TL bütçe için CGO + CEO onayı)
6. "Gönder" → tedarikçiye otomatik mail/SMS

### Düşük Stok Sipariş (Otomatik Tetikli)
1. Stok widget kırmızı → tıkla
2. Sistem önerilen sipariş miktarı (önceki tüketim baz)
3. Onay/değiştir
4. Tedarikçi otomatik seçilir (ana tedarikçi)
5. "Onayla" → sipariş açılır

### Tedarikçi Değiştirme
1. Sidebar → "Tedarikçiler" → ürün ara
2. Mevcut tedarikçi performans + alternatif liste
3. Test sipariş (küçük miktar)
4. Kalite + hız + fiyat değerlendir
5. Ana tedarikçi değişikliği → recete_gm + kalite_kontrol onayı

### Acil Talep İşleme (Şube/Fabrika)
1. "Yeni Talep" widget → bekleyen
2. Talep sebep oku (gerçekten acil mi?)
3. Onay/red + sebep
4. Onay → en hızlı tedarikçi + acil sipariş
5. Talep edene takip bildirim

---

## 6. Acil Durumlar

| Durum | Aksiyon |
|---|---|
| Kritik hammadde tükendi (üretim duruyor) | En hızlı tedarikçi + acil sipariş + CGO bilgilendir |
| Tedarikçi mal teslim etmedi | Alternatif tedarikçi + tedarikçi'ye uyarı |
| Fiyat ani artış (%20+) | CGO + CEO brifing, alternatif araştır |
| Kalite sorunu (gelen mal standart dışı) | İade + kalite_kontrol bilgilendir + sözleşme uyarı |
| Tedarikçi iflası/kapanma | Acil alternatif (en az 2-3 tedarikçi yedekte olmalı) |
| **Sistem çökmesi** | Telefon + WhatsApp ile sipariş, sonra retroaktif |

---

## 7. Yardım

🚨 **ACİL DURUM**
- Yangın: **110**
- Sağlık: **112**
- Sistem içi: **Mr. Dobody'e yaz** (chat ikonundan)
  Mr. Dobody seni doğru kişiye otomatik yönlendirir (CGO / fabrika depo / muhasebe / kalite kontrol)

📱 **Pilot İletişim**
- WhatsApp Pilot Grubu: "DOSPRESSO Pilot — HQ"
- Cheat sheet: `docs/pilot/cheat-sheets/17-satinalma.md`

---

## 8. Yapma!

❌ Tek tedarikçiye bağımlı kalma — minimum 2 alternatif
❌ Fiyat müzakere etmeden sipariş açma
❌ Bütçe limitini onaysız aşma
❌ Düşük stok uyarısını "yarın bakarım" deyip ertele — üretim duruyor
❌ Tedarikçi performansını yıl sonunda kontrol et — haftalık olmalı
❌ Kalite sorununu "küçük miktar" deyip geçiştir — patern haline gelir

---

## 9. Pilot Süresince Özel Notlar

- Pilot 4 lokasyonun düşük stok uyarıları **anlık** (normalde 4 saatte bir)
- Pilot ilk hafta **alternatif tedarikçi listesi hazır olmalı** (her ana hammadde için 2 yedek)
- Pilot süresince yeni tedarikçi denemesi YAPMA (mevcut + bilinen)
- Acil sipariş onay süresi pilot süresince **15 dk** (normalde 1 saat)
