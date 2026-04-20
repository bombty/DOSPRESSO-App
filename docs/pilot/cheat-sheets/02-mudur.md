# DOSPRESSO Cheat Sheet — Şube Müdürü (mudur)

**Hedef Kullanıcı**: Lokasyon yöneticisi  
**Erişim**: Kendi şubesi (HR, Task, Stok, Ekipman, Akademi)

---

## 1. Login Adımları

1. Tarayıcıda sistem adresini aç
2. Kullanıcı adı: [size verilen username, örn `mudur_lara`]
3. Parola: ilk girişte size SMS/WhatsApp ile geldi
4. **İlk giriş**: parola değiştirme dialog'u **çıkmamalı** (pre-pilot ayarı)
5. "Giriş Yap" → Mission Control (Mudur) dashboard

---

## 2. Ana Ekran (Mission Control — Mudur)

| Widget | Ne Gösterir |
|---|---|
| **Şube Skoru** | Bugünkü performans (görev tamamlama, müşteri memnuniyeti, stok) |
| **Bugün Açık Görevler** | Size atanmış + ekibinizin görevleri |
| **Personel Durumu** | Kim mesaide, kim izinli, kim geç kaldı |
| **Stok Uyarısı** | Düşük stok ürünleri (otomatik satınalma önerisi) |
| **Son Müşteri Şikayetleri** | CRM'den gelen feedback'ler |

---

## 3. Günlük İş Akışı (3 Adım)

### Sabah (08:00 — Vardiya Açılış)
1. Mission Control → "Bugün Açık Görevler" listesini gözden geçir
2. Personele görev ata: "+ Yeni Görev" → role + son tarih + açıklama
3. Vardiya kontrol: PDKS → "Bugünkü Mesai" → eksik check-in varsa SMS at

### Öğlen (12:00-15:00)
1. CRM → bugünkü müşteri feedback'leri
2. Stok kontrol: `/satinalma/stok` → kritik seviye altı ürün varsa sipariş
3. Ekipman: `/ekipman/arizalar` → açık arıza varsa sevkiyat takip

### Akşam (20:00 — Vardiya Kapanış)
1. Tamamlanmamış görevleri yarına ertele veya başkasına devret
2. Günsonu raporu: "Şube Skoru" widget'ından bugünkü skoru not et
3. Bildirimleri temizle (sağ üst çan)

---

## 4. Sık Kullanılan Sayfalar

| Aksiyon | URL Kısa Yolu |
|---|---|
| Yeni görev oluştur | Sidebar → "Görevler" → "+ Yeni" |
| Personel listesi | Sidebar → "İK" → "Personel" |
| Stok kontrol | Sidebar → "Satınalma" → "Stok" |
| Vardiya planı | Sidebar → "İK" → "Vardiyalar" |
| Müşteri şikayet | Sidebar → "CRM" → "Şikayetler" |
| Şube skoru detayı | Mission Control → "Şube Skoru" widget'ına tıkla |

---

## 5. Acil Durumlar

| Durum | Aksiyon |
|---|---|
| Personel acil izin istedi | İK → "İzin Talepleri" → onay/red |
| Müşteri ciddi şikayet | CRM → "Yeni Şikayet" → ilgili rolle eskalasyon |
| Ekipman bozuldu | Ekipman → "Arıza Bildir" → fotoğraf + açıklama |
| Stok kritik | Satınalma → "Acil Sipariş" |
| **Sistem çalışmıyor** | WhatsApp Pilot Grubu → 🟠 TURUNCU mesaj |

---

## 6. Yardım

🚨 **ACİL DURUM**
- Yangın: **110**
- Sağlık: **112**
- Sistem içi: **Mr. Dobody'e yaz** (chat ikonundan)
  Mr. Dobody seni doğru kişiye otomatik yönlendirir (HQ Coach / Admin / Aslan)

📱 **Pilot İletişim**
- WhatsApp Pilot Grubu: "DOSPRESSO Pilot — [Şube Adı]"
- Cheat sheet: `docs/pilot/cheat-sheets/02-mudur.md`

---

## 7. Yapma! (Common Pitfalls)

❌ Personeli silme — **deaktive et** (geçmiş veri korunsun)  
❌ Tamamlanmış görevi yeniden açma — yeni görev oluştur  
❌ Stok sayımını rastgele dalga geçen değer girme — gerçek sayım yap  
❌ Müşteri şikayetini sileme — "çözüldü" işaretle, log için kalır  
❌ Vardiya planını günü gününe yapma — 3 gün önceden yap
