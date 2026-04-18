# Şube Destek Hattı Prosedürü

**Aslan Onayı**: 19 Nis 2026 — kurulumu Aslan yapacak, prosedürü agent yazıyor  
**Aktif Süre**: 28 Nis - 5 May 2026, **08:00-20:00** (12 saat)  
**Format**: 4 ayrı WhatsApp grubu (lokasyon başına)

---

## 1. WhatsApp Grup Yapısı (4 Grup)

| # | Grup Adı | Lokasyon ID | Üyeler |
|---|---|---|---|
| 1 | `DOSPRESSO Pilot — HQ` | 23 | Aslan + IT + HQ Mudur + 2 Supervisor |
| 2 | `DOSPRESSO Pilot — Fabrika` | 24 | Aslan + IT + Fabrika Mudur (Eren) + Vardiya Sefleri |
| 3 | `DOSPRESSO Pilot — Işıklar` | 5 | Aslan + IT + Mudur + Supervisor |
| 4 | `DOSPRESSO Pilot — Lara` | 8 | Aslan + IT + Mudur + Supervisor |

**Kurulum Sorumlu**: Aslan (Pazar 27 Nis 22:00 öncesi)  
**Davet Format**: WhatsApp grup linki + lokasyon yöneticisi telefonuna SMS

---

## 2. SLA (Service Level Agreement)

| Aciliyet | Tanım | Hedef Cevap Süresi |
|---|---|---|
| 🚨 **KIRMIZI** | Sistem login olmuyor / veri kaybı | **5 dk** |
| 🟠 **TURUNCU** | Sayfa açılmıyor / hata mesajı | **15 dk** |
| 🟡 **SARI** | UI bug / yavaşlık | **1 saat** |
| 🟢 **YEŞİL** | Soru / nasıl yapılır | **2 saat** |

**08:00-20:00 dışı**: Sadece KIRMIZI vakaya cevap (Aslan kişisel telefon).

---

## 3. Mesaj Formatı (Standart Şablon)

Lokasyon yöneticisinden gelen mesaj:
```
🚨 [KIRMIZI/TURUNCU/SARI/YEŞİL]
Lokasyon: [HQ/Fabrika/Işıklar/Lara]
Kullanıcı: [adınız]
Sorun: [1-2 cümle]
Ne yapıyordum: [tıkladım, yazdım, vb.]
Ekran görüntüsü: [eklenmeli]
Saat: [HH:MM]
```

**Örnek**:
```
🟠 TURUNCU
Lokasyon: Lara
Kullanıcı: Mehmet (mudur)
Sorun: "Görev oluştur" butonuna basınca beyaz ekran
Ne yapıyordum: Yeni görev formunu doldurup kaydet'e bastım
Ekran görüntüsü: [foto]
Saat: 10:23
```

---

## 4. Eskalasyon Zinciri

```
Lokasyon Kullanıcı
        ↓
   Lokasyon Mudur (WhatsApp grup mesajı)
        ↓
   IT (cevap < SLA süresi)
        ↓ (çözemezse)
   Aslan (karar mercii)
        ↓ (kritik veri kaybı)
   Replit Agent (rollback / hot fix)
```

---

## 5. Rotasyon (12 Saat Aktif Cevap)

| Zaman Dilimi | Birinci Sorumlu | Yedek |
|---|---|---|
| 08:00-12:00 | IT | Aslan |
| 12:00-16:00 | IT | Aslan |
| 16:00-20:00 | Aslan | IT |

**Yedek**: Birinci sorumlu 5 dk içinde cevap vermezse otomatik devreye girer.

---

## 6. Çözüm Tipi Bazında Aksiyon

| Sorun Tipi | İlk Aksiyon | Sahip |
|---|---|---|
| Login fail | Parola sıfırla (`/admin/users` → reset) | IT |
| 403 hata | Role kontrolü → Aslan onay → patch | Agent |
| 500 hata | Server log → restart workflow | Agent |
| Veri kaybolma | DB sorgu → audit log → recovery | Agent + Aslan |
| UI bug | Screenshot al → Sprint A note | IT |
| Nasıl yapılır | Cheat sheet linki gönder | IT |

---

## 7. Günlük Özet Raporu (Her Gün 19:00)

Her gün 19:00'da IT bu özeti yazacak (her grup için ayrı):
```
📊 Pilot Day-N Özeti — [Lokasyon]
- Toplam mesaj: N
- 🚨 KIRMIZI: N (ortalama cevap: X dk)
- 🟠 TURUNCU: N (ortalama cevap: X dk)
- 🟡 SARI: N
- 🟢 YEŞİL: N
- Çözülen: N | Pending: N | Sprint A'ya: N
```

Bu özetler `docs/pilot/destek-log/day-N.md` altında konsolide edilir.

---

## 8. Pazartesi Gün Sonu Rapor Sorumluluğu

- IT: 4 lokasyonun WhatsApp özetini birleştir → `day-1-report.md` §C
- Aslan: Karar verir (kritik sorun varsa Sprint A escalate)
- Agent: Eğer rollback gerekirse uygular

---

## 9. Kuralları (Tüm Üyelere İletilecek)

1. **Tek konu, tek mesaj** — birden çok sorun varsa ayrı mesaj
2. **Ekran görüntüsü ZORUNLU** (KIRMIZI hariç, KIRMIZI'da hızlı yaz)
3. **Saat yaz** — log eşleştirmesi için
4. **Cevap onayla** — IT cevap verince "👍" reaksiyon, çözüldüyse "✅"
5. **Off-topic yasak** — sadece pilot konusu

---

## 10. Pazartesi 08:00 Öncesi Hazır Olması

- [ ] 4 WhatsApp grup kuruldu (Aslan)
- [ ] Tüm lokasyon mudurleri eklendi
- [ ] IT + Aslan tüm gruplara üye
- [ ] Bu prosedür tüm gruplara pinli mesaj olarak iletildi
- [ ] Cheat sheet linkleri pinlendi

**Sorumlu**: Aslan (kurulum), IT (dokümantasyon dağıtımı)
