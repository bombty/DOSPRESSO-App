# DOSPRESSO Cheat Sheet — Fabrika Depo Sorumlusu

**Hedef Kullanıcı**: Fabrika depo sorumlusu (fabrika_depo) — hammadde giriş/çıkış, stok sayım, sevkiyat hazırlık
**Cihaz**: Fabrika tableti (kiosk) + barkod okuyucu
**Erişim**: Stok girişi, çıkış, sayım, lot/SKT kayıt, şube sevkiyat hazırlığı

---

## 1. Fabrika Depo Nedir?

Sen fabrikanın "lojistik kalbi"sin. 3 ana sorumluluk:
1. **Hammadde Girişi**: Tedarikçiden gelen malları sisteme kaydet, lot/SKT bilgisi gir
2. **Üretim Çıkışı**: Üretim için hammadde ver, batch'e bağla
3. **Şube Sevkiyatı**: 22 şubeye sevkiyat paketleri hazırla, kuryeyle gönder

Hatalı stok kaydı = üretim duruyor + şubeler malsız kalıyor. Disiplin önemli.

---

## 2. Login Adımları

### Yöntem A — Fabrika Tableti (Kiosk)
1. Fabrika depo girişi tablet → "Fabrika Kiosk"
2. Adını listeden seç
3. PIN gir (4 haneli)
4. "Giriş" → Stok Yönetimi ekranı

### Yöntem B — Depo Ofisi Bilgisayarı
1. Tarayıcı → sistem aç
2. Kullanıcı adı: [örn `depo_fabrika_1`]
3. Parola: SMS/WhatsApp
4. "Giriş Yap"

---

## 3. Ana Ekran (Fabrika Depo)

| Bölüm | İçerik |
|---|---|
| **Stok Durumu** | Tüm hammadde + bitmiş ürün, miktar, SKT |
| **Bugün Giriş** | Tedarikçi siparişleri (gelen) |
| **Bugün Çıkış** | Üretim talep + şube sevkiyat hazırlığı |
| **Düşük Stok Uyarısı** | Kritik seviyenin altındaki maddeler (kırmızı) |
| **SKT Yaklaşan** | 7 gün içinde SKT dolacak ürünler |
| **Sayım Görevleri** | Haftalık + aylık sayım planı |

---

## 4. Günlük İş Akışı (4 Adım)

### Vardiya Başı (06:00)
1. Kiosk girişi → PIN
2. "Bugün Giriş" listesi → tedarikçilerden ne gelecek?
3. "Bugün Çıkış" listesi → üretim ve şube sevkiyat
4. Düşük stok uyarısı varsa → satınalma'ya hatırlatma

### Tedarikçi Hammadde Girişi
1. Mal geldi → "+ Yeni Giriş"
2. Tedarikçi seç → ürün seç → miktar
3. **Lot numarası** zorunlu (paket üzerinde)
4. **SKT** zorunlu (paket üzerinde)
5. Sıcaklık kontrolü (soğuk zincir gerekli ürünlerde) → not yaz
6. Foto çek (paket + lot + SKT görünür) → **zorunlu**
7. "Kaydet" → stok otomatik artar

### Üretim Çıkışı (Şef talebi)
1. Şef batch için hammadde istedi → "Üretim Talebi" widget
2. Reçeteye göre miktar otomatik hesaplı
3. Hammadde lot numarası seç (FIFO — eski lot önce)
4. "Çıkış Onayla" → stok düşer, batch'e bağlanır

### Şube Sevkiyat Hazırlığı
1. Sidebar → "Şube Sevkiyat" → bugünkü liste
2. Şube seç → sipariş listesi (mudur tarafından girilmiş)
3. Sipariş paketle → barkod oku/yaz
4. "Sevkiyat Hazır" → kurye bilgilendirme

### Vardiya Sonu
1. Stok kapanış kontrolü → bugünkü giriş+çıkış doğru mu?
2. Sayım sapması varsa → "Düzeltme" + sebep (zorunlu)
3. "Vardiya Bitir"

---

## 5. Sık Kullanılan İşler

### Sayım (Haftalık / Aylık)
1. Sidebar → "Sayım" → bugünkü liste
2. Ürün seç → fiziki say → sistem miktarı ile karşılaştır
3. Sapma varsa → sebep yaz (kırılma, fire, hata)
4. Onayla → fabrika_mudur'a otomatik rapor

### Lot/SKT Düzeltme (Geriye Dönük)
1. Sidebar → "Lot Yönetimi" → ürün ara
2. **Sadece son 24 saat** içinde düzeltebilirsin (data lock)
3. Daha eski → fabrika_mudur'a "Değişiklik Talebi" aç

### Düşük Stok Bildirimi (Acil)
1. Stok widget → "Düşük Seviye" → ilgili madde
2. "Acil Sipariş" butonu → satınalma'ya gider
3. Üretim devam edebilir mi? → Şef'e haber (alternatif var mı)
4. Yoksa → fabrika_mudur'a anında haber

### SKT Yaklaşan Ürün Yönetimi
1. Dashboard "SKT Uyarıları" → kırmızı liste
2. **7 gün** kalanlar → "Acil Çıkış" → satış'a bayrak
3. **3 gün** kalanlar → otomatik **kullanılamaz** statüsüne geçer
4. **Süresi geçmiş** → fire kaydı (zorunlu fotoğraf + sebep)

---

## 6. Acil Durumlar

| Durum | Aksiyon |
|---|---|
| Tedarikçi yanlış ürün getirdi | Kabul **etme**, kayıt **açma**, satınalma + tedarikçiye haber |
| Soğuk zincir kırıldı (sıcaklık yüksek) | Ürün **alma**, kayıt **açma**, fotoğraf çek, satınalma'ya rapor |
| Lot numarası eksik (paket üzerinde yok) | Tedarikçi'ye iade, kayıt **açma** |
| Stok sayım sapması büyük (%5+) | fabrika_mudur'a anında haber, sistem hatası mı insan hatası mı |
| Şube sevkiyatı eksik kaldı | Kuryeye **eksik notu** ver, mudur'a haber, ertesi gün tamamla |
| Yangın / sel / büyük hasar | **Önce insan**, sonra hasar fotoğrafı, fabrika_mudur + sigorta |
| **Sistem çalışmıyor** | Kâğıt giriş formu (depo ofisinde) → 24 saat içinde retroaktif |

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
- Cheat sheet: `docs/pilot/cheat-sheets/12-fabrika-depo.md`

---

## 8. Yapma!

❌ Lot/SKT bilgisi olmadan giriş yapma — yasal sorumluluk
❌ Foto çekmeden hammadde girişi — denetim riski
❌ FIFO'ya uymadan eski stoku göz ardı et — fire artar
❌ Sayım sapmasını gizleme veya küçültme — denetim çıkmaz
❌ Soğuk zincir kırılan ürünü kabul etme (gıda güvenliği)
❌ Şube sevkiyatına "yarın gelir" deyip eksik gönderme — şube malsız kalır

---

## 9. Pilot Süresince Özel Notlar

- Pilot 4 lokasyondan 3'ü şube + Fabrika → senin sevkiyatın **3 şubeyi** doğrudan etkiliyor (Işıklar 5, Lara 8 + diğer pilot lokasyonlar varsa).
- Pilot ilk hafta her sevkiyat için **çift kontrol**: sen paketle + üretim_sefi onaylasın.
- Düşük stok uyarısı pilot süresince **anlık** (cron 10 dk) çalışıyor → kaçırma.
- Sayım sapma toleransı pilot ilk hafta **%2** (normalde %5) — daha sıkı.

---

## 10. Tablet/Kiosk İpuçları

- Soğuk depo'da tablet ekranı soluk → bezle ısıt veya ofise getir
- Barkod okuyucu çalışmıyor → manuel lot numarası gir, foto da ekle
- Foto çekerken: lot + SKT + ürün etiketi **aynı karede** görünmeli
- 5 dk hareketsiz → otomatik logout
- Sevkiyat barkodu okumadan "Hazır" dedirmez → atlamayın
