# DOSPRESSO Cheat Sheet — Fabrika İşçisi (fabrika_operator)

**Hedef Kullanıcı**: Fabrika üretim ekibi (Fabrika lokasyonu, ID 24)  
**Cihaz**: Tablet / Kiosk (factory floor)  
**Erişim**: Üretim, vardiya, kalite, stok girişi

---

## 1. Login (Kiosk / Tablet)

### Yöntem A — Kiosk (PIN)
1. Fabrika girişinde tablet → "Kiosk Modu"
2. Adınızı seç (liste)
3. PIN gir (size verildi, 4 haneli)
4. "Giriş" → Vardiya başlatma ekranı

### Yöntem B — Tablet (Username)
1. Tablet tarayıcı aç
2. Username + parola
3. "Giriş Yap" → Fabrika dashboard

---

## 2. Ana Ekran (Fabrika Operatör)

| Bölüm | İçerik |
|---|---|
| **Vardiya Durumu** | Başlangıç, kalan süre, ekipte kim var |
| **Bugün İşler** | Üretim batch, paketleme, kalite kontrol |
| **Kalite Alert** | Standart dışı ürün varsa kırmızı uyarı |
| **Stok** | Mevcut hammadde + bitirme tahmini |

---

## 3. Günlük İş Akışı (3 Adım)

### Vardiya Başı (06:00 / 14:00 / 22:00)
1. Kiosk girişi → PIN
2. "Vardiya Başlat" → fabrika girişine yaslan
3. Üretim emri al: "Bugün Üretim" → batch listesi

### Üretim Sırasında
1. Batch başlat: "Yeni Batch" → ürün seç + miktar
2. Adımlar: hammadde tartım → karıştırma → pişirme → soğutma
3. Her adımda fotoğraf çek + zaman damgası
4. Kalite kontrol: numune al → test sonucu gir
5. "Batch Tamamla" → otomatik stok güncellemesi

### Vardiya Sonu
1. "Vardiya Bitir" → otomatik check-out
2. Üretim raporu otomatik (manuel müdahale yok)
3. Sıradaki vardiyaya not bırak (varsa)

---

## 4. Sık Kullanılan İşler

### Kalite Sorunu Bildirme
1. Mission Control → "Kalite Alert"
2. "+ Yeni Sorun" → batch seç + açıklama + foto
3. Süpervizor + kalite_kontrol rolüne otomatik gider
4. Üretim **DURDURULUR** (sistem otomatik flag yapar)

### Hammadde Bitti Bildirme
1. Stok widget'ı → "Düşük Seviye" → ilgili madde
2. "Acil Sipariş" → satınalma role gider
3. Üretim devam edebilir (alternatif batch yoksa dur)

### Ekipman Arızası
1. Sidebar → "Ekipman" → arızalı ekipman seç
2. "+ Arıza Bildir" → açıklama + foto
3. Bakım ekibine otomatik task

---

## 5. Acil Durumlar

| Durum | Aksiyon |
|---|---|
| Kalite kontrolden geçemedi | "Kalite Alert" + batch durdurma |
| İşçi sakatlandı | İlk yardım + supervisor'a haber |
| Ekipman bozuldu | Ekipman → "Acil Arıza" |
| Hammadde bitti | Stok → "Acil Sipariş" |
| **Sistem çalışmıyor** | Vardiya supervisor'a kâğıda yaz, sonra retroaktif gir |

---

## 6. Yardım

- **WhatsApp**: "DOSPRESSO Pilot — Fabrika"
- **Vardiya Supervisor**: [telefon]
- **Fabrika Mudur (Eren)**: [telefon]
- **IT**: [IT telefon]
- **Cheat sheet**: `docs/pilot/cheat-sheets/05-fabrika-iscisi.md`

---

## 7. Yapma!

❌ PIN'ini başkasına söyleme — başkasına atılır  
❌ Batch fotoğraflarını çekmeden tamamla deme — kalite ihlali  
❌ Kalite sorununu görmezden gelme — yasal sorumluluk  
❌ Vardiya başlatmadan üretim yapma — sayım eksik kalır  
❌ Sıradaki vardiyaya not bırakmadan çıkma — devamlılık bozulur

---

## 8. Tablet/Kiosk İpuçları

- Eldivenlerle dokunmatik çalışmaz → çıkar
- Ekran çok parlaksa → soğuk hava modunda görünmeyebilir, gölgele
- Kiosk modu zaman aşımı: 5 dk hareketsiz → otomatik logout
- Foto çekerken: ürün net görünsün, flaş kullan
