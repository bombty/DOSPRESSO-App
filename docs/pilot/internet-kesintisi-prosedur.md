# İnternet Kesintisi Prosedürü

**Aslan Kararı**: 19 Nis 2026 — Kâğıt form YAZILMAZ, sadece WhatsApp prosedürü  
**Geçerlilik**: 28 Nis - 5 May 2026 pilot süresince  
**Mantık**: Şubelerde uzun süreli kesinti olası değil; kullanıcılar manuel takip yapar, sistem gelince retroaktif girer.

---

## 1. Tespit & Bildirim (5 Dakika)

### Adım 1 — Kullanıcı Tespit Eder
- Sayfa açılmıyor / "Bağlantı yok" mesajı
- Telefondan diğer site açılıyor mu? (sistem kendi mi yoksa internet mi?)

### Adım 2 — Lokasyon Yöneticisi WhatsApp'ta Bildirir
WhatsApp pilot grubuna mesaj:
```
🌐 İnternet kesintisi
Lokasyon: [HQ/Fabrika/Işıklar/Lara]
Saat başı: HH:MM
Etki: Tüm sistem / Sadece DOSPRESSO / Diğer
Tahmini süre: [biliyorsa]
```

### Adım 3 — IT/Aslan Kabul Eder
- IT 🟢 reaksiyonla "Kabul" işareti
- IT internet sağlayıcı (Türk Telekom / Vodafone) durumu kontrol eder
- Sistem kendi sorunuysa → Aslan + Agent'a eskalasyon

---

## 2. Kesinti Sırasında — Manuel Takip

### Kullanıcı Sorumluluğunda
Her kullanıcı kendi telefonuna NOT alır:

**Şablon (kişisel WhatsApp notu veya not defteri):**
```
[Saat] - [Yapılan iş] - [Detay]

Örnek:
10:30 - Müşteri şikayeti aldım - Masa 5, kahve soğuk, ücret iadesi yapıldı
10:45 - Stok sayım - Süt 12 lt kaldı
11:00 - Vardiya değişimi - Ali geldi, Mehmet çıktı
```

### Lokasyon Yöneticisi Sorumluluğunda
- Müşteri yanıtsız bırakılmaz (telefon, manuel sipariş)
- Kasa/POS sistemi DOSPRESSO'dan bağımsız çalışır (mevcut altyapı)
- Acil olmayan task'lar internet gelene kadar bekletilebilir

---

## 3. Sistem Geri Geldiğinde — Retroaktif Giriş

### Adım 1 — IT Doğrulaması
- IT WhatsApp'tan "🟢 Sistem aktif" mesajı atar
- Tüm lokasyon yöneticilerinden onay bekler

### Adım 2 — Kullanıcılar Manuel Notları Sisteme Girer
Her kullanıcı:
- Login olur (parola hâlâ geçerli)
- Yapılan task'ları **gerçek saatleriyle** sisteme girer:
  - Görev oluştur → Açıklama: "**[RETROAKTİF GİRİŞ — internet kesintisi 10:30-12:00]**"
  - `completed_at` saatini manuel düzelt (sadece supervisor+ rolleri)
- Müşteri şikayeti varsa CRM'e girer
- Stok değişiklikleri sayım sayfasından girer

### Adım 3 — Lokasyon Yöneticisi Doğrulama
- Yöneticiler ekibinin retroaktif girişlerini kontrol eder
- Eksik kalanları WhatsApp'tan hatırlatır
- Tamamlandığında "✅ [Lokasyon] retroaktif giriş tamam" mesajı

---

## 4. Audit & Raporlama

### Audit Log
Retroaktif girişler `audit_logs` tablosuna otomatik düşer:
```
action: TASK_CREATE_RETROACTIVE
details: { offline_period_start, offline_period_end, manual_entry: true }
```

### Day-1 Raporu Etkisi
- Kesinti süresi raporda belirtilir
- Eşik 1 (Login success rate) hesabında **kesinti süresi düşülür** (denominator)
- Eşik 2 (Task completion) **etkilenmez** (retroaktif girişler sayılır)

---

## 5. Kesinti Süresi Eşikleri (Karar Tablosu)

| Süre | Aksiyon |
|---|---|
| < 30 dk | Bekle, internet gelecek |
| 30 dk - 2 saat | Manuel takip + WhatsApp güncelleme |
| 2 - 4 saat | Aslan + IT kriz toplantısı (telefon konferans) |
| > 4 saat | Pilot için "down day" — Day-1 ölçümü ertelenir |

---

## 6. Sıkça Sorulan Sorular (Lokasyon Yöneticilerine)

**S: Müşteri şikayet etti, sisteme giremiyorum, ne yapayım?**  
C: Telefonuna not al, internet gelince CRM → şikayet → "[RETROAKTİF GİRİŞ]" tag'iyle gir.

**S: Vardiya değişimi yaptık ama PDKS'e giremedik?**  
C: Lokasyon yöneticisi WhatsApp'ta saatleri ilan eder, sonradan IT manuel girer.

**S: Stok sayımı bitti ama internet yok?**  
C: Kâğıda yaz, fotoğrafla, internet gelince sisteme gir. Fotoğraf yöneticide saklanır.

**S: 4 saat kesinti olursa pilot iptal mi?**  
C: Hayır, "down day" sayılır, ertesi gün normal devam.

---

## 7. Pazartesi 08:00 Öncesi Hazır Olması

- [ ] Bu prosedür 4 WhatsApp grubuna pinli mesaj olarak iletildi
- [ ] Lokasyon yöneticileri prosedürü okudu (👍 reaksiyon)
- [ ] IT'nin internet sağlayıcı destek hatları hazır (TT / Vodafone numara)
- [ ] Aslan'ın acil durum protokolü tanımlı (4 saat üstü kesinti senaryosu)

**Sorumlu**: IT (dokümantasyon dağıtımı), Aslan (4+ saat senaryosu kararı)
