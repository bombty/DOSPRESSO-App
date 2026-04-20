# DOSPRESSO Cheat Sheet — Barista

**Hedef Kullanıcı**: Şube barista (kahve hazırlama, müşteri servisi, vardiya görevleri)
**Cihaz**: Şube tableti (kiosk modu) + kendi telefonun (Benim Günüm)
**Erişim**: Vardiya başlat/bitir, görev üstlen, checklist tamamla, duyuru oku

---

## 1. Login Adımları

### Yöntem A — Şube Tableti (Kiosk)
1. Tablet ekranı → "Şube Kiosk"
2. Adını listeden seç
3. PIN gir (4 haneli, sana verildi)
4. "Giriş" → Vardiya ekranı

### Yöntem B — Kendi Telefonun
1. Tarayıcıda sistem aç (link grup mesajında)
2. Kullanıcı adı: [size verilen, örn `barista_isiklar_2`]
3. Parola: SMS/WhatsApp ile geldi
4. "Giriş Yap" → "Benim Günüm" sayfası

---

## 2. Ana Ekran (Şube Kiosk)

| Bölüm | İçerik |
|---|---|
| **Vardiya Durumu** | Giriş saati, kalan süre, bugünkü mesai |
| **Görev Havuzu** | "Üstlen" butonlu kırmızı kartlar (12 görev) |
| **Bugünkü Skorum** | Tamamlanan + gecikmiş görev sayısı (0-100 puan) |
| **Duyurular** | Müdür/HQ duyurusu — okuyup "Anladım" |
| **Telefondan Aç** | Quiz, eğitim için telefonuna gönderir |

---

## 3. Günlük İş Akışı (3 Adım)

### Vardiya Başı (08:00 / 16:00)
1. Kiosk girişi → adın + PIN
2. Açılış checklist'i tamamla (espresso makinesi sıcaklık, süt taze mi, vitrin temiz mi)
3. Görev Havuzu'ndan 1-2 görev üstlen ("🙋 Üstlen" butonu)

### Vardiya Sırasında
1. Müşteri servisi → siparişler
2. Üstlendiğin görevleri yap, kart yeşil olur ("✓ Sende")
3. Bittiğinde "Tamamla" butonu (foto gerekiyorsa çek)
4. Vitrin/bar temizliğini sürekli kontrol et

### Vardiya Sonu
1. Kapanış checklist'i (sayım, çöp, makine kapatma)
2. "Vardiya Bitir" → otomatik check-out
3. Sıradaki vardiyaya not bırak (varsa kalan iş)

---

## 4. Sık Kullanılan İşler

### Görev Üstlenme
1. Kiosk → "Şube Görev Havuzu"
2. Kırmızı kartlardan birini seç
3. "🙋 Üstlen" → kart yeşile döner
4. İşi yap, sonra "Tamamla" (foto isteniyorsa çek)

### Duyuru Okuma
1. Vardiyaya başlarken duyuru ekranı çıkar
2. Oku → "Okudum ve Anladım"
3. Quiz'li duyurularda: "📱 Quiz telefonunuzdan tamamlanmalı" toast'ı görürsün
4. Vardiya bitimine kadar **kendi telefonundan** Benim Günüm'e gir → Quiz'i çöz

### Eğitim Modülü Tamamlama (Telefondan)
1. Telefondan giriş yap → "Benim Günüm"
2. "Eğitimlerim" → atanan modülü aç
3. Videoları/metni oku → quiz çöz
4. %75+ alırsan modül tamamlanır, sertifika gelir

### Müşteri Şikayeti Geldi
1. Kibarca dinle, supervisor'ı çağır
2. Kendin CRM'e kayıt **AÇMA** — supervisor yapar
3. Müşterinin gitmesini bekle, ortam normale dönsün

---

## 5. Acil Durumlar

| Durum | Aksiyon |
|---|---|
| Espresso makinesi bozuldu | Supervisor'a haber → "Görev Havuzu" yedek liste |
| Süt bitti / hammadde yok | Supervisor'a haber, manuel kâğıt nota yaz |
| Vitrin temiz değil + denetim geliyor | Supervisor'a hızlı haber |
| Kasada para açığı | **Kendi başına çözme** → mudur'a haber |
| **Tablet donmuş / sistem yok** | Kâğıda yaz (vardiya başla, görev yap), sonra supervisor retroaktif girsin |

---

## 6. Yardım

- **WhatsApp**: "DOSPRESSO Pilot — [Şube]"
- **Supervisor**: [vardiya supervisor telefon]
- **Mudur**: [mudur telefon]
- **IT/Destek**: [IT telefon]
- **Cheat sheet**: `docs/pilot/cheat-sheets/06-barista.md`

---

## 7. Yapma!

❌ PIN'ini başka baristaya söyleme — skorlar karışır
❌ Üstlendiğin görevi yapmadan başkasına atma — skorun düşer
❌ Quiz'li duyuruyu kioskta atla, telefondan **mutlaka** çöz — supervisor görür
❌ Foto isteyen görevi fotoğrafsız tamamlama — sayılmaz
❌ Vardiya başlatmadan iş yapma — mesai sayılmaz
❌ Çıkışta "Vardiya Bitir" demeden git — sistem açık kalır

---

## 8. Tablet/Kiosk İpuçları

- Eldivenlerle dokunmatik çalışmaz → çıkar
- Süt köpüğü/su damlası ekrana → bezle hemen sil
- 5 dk hareketsiz → otomatik logout (tekrar PIN gir)
- Görev kartı yeşil = "✓ Sende" → senin işin
- Görev kartı kırmızı = boşta → ilk gelen alır
- Kart gri/saydam = başkası üstlenmiş, dokunma
