# Yavuz Brief — DOSPRESSO Pilot Koçluk Rehberi

**Pilot başlangıç:** 5 Mayıs 2026 Pazartesi 09:00
**Süre:** İlk 30 gün (yoğun gözlem fazı), sonrası kademeli yayılım
**Senin rolün:** Franchise Koçu — pilot şubelerin operasyonel sağlığı senin sorumluluğunda
**Brief deadline:** 3 Mayıs 2026 Cumartesi 18:00 (pilot öncesi tüm hazırlıkların bitmesi için)

---

## 1. Senin Yetki ve Sorumluluk Alanın

### Pilot Scope (5 Mayıs Day-1)
| Şube | Tip | Senin yetkin | Notlar |
|---|---|---|---|
| **Antalya Işıklar** (#5) | HQ-owned (bombtea) | ✅ Tam yetki — vardiya değiştir, izin onayla, denetim aç | HQ paralelinde işliyor |
| **Antalya Lara** (#8) | Franchise | ✅ Tam takip + müdahale | Lara'da izin onayı şube müdürüne gider, sen bunu **görüyorsun** ama onaylamıyorsun |
| Merkez Ofis (HQ #23) | HQ | Senin scope dışı | Burası Aslan + departmanların alanı |
| Fabrika (#24) | Üretim | Senin scope dışı | Eren ve Sema'nın alanı |

### HQ Koç Ekibi
| Kişi | Rol | Sistem rolü |
|---|---|---|
| **Yavuz** (sen) | Franchise Koçu | `coach` — tüm şubeler |
| **Utku** | CGO + Kalite Kontrol | `cgo` — tüm şubeler executive yetkili |
| **Ece** | Eğitim + Koçluk | `coach` (yeni atandı, eskiden trainer'dı) |

**Önemli:** Üçünüz de tüm şubelere erişebilir. Pilot sırasında **iş bölümü** sözel — sen Işıklar/Lara'ya odaklan, Utku kalite/şikayet, Ece eğitim ve gelişim. Birbirinizin alanına girmek isterseniz koordine edin.

---

## 2. Pilot Day-1 Öncesi Hazırlık (3 Mayıs Cmt 18:00'a kadar)

### A) Vardiya Planı Kurulumu (en kritik iş)
**2 haftalık plan girilmiş olmalı:** 5–18 Mayıs.

3 yöntem var, hangisini kullanırsan kullan:
1. **Şablondan toplu üret** — Önce şablon kur (örn. "Standart Hafta — 2 vardiya"), sonra tarih aralığı seç → tek tıkla 14 günlük plan oluşur
2. **Geçen haftayı kopyala** — Lara'da zaten geçmiş veri var (son 30 günde 210 vardiya), kopyalayıp düzenle
3. **Manuel sürükle-bırak** — `/vardiya-planlama` sayfasında saat/gün ızgarasında tek tek

**⚠️ Excel ile toplu yükleme YOK.** Sistem vardiyada Excel import desteklemiyor. Şablon + kopyala kullanmazsan 30+ vardiyayı tek tek girmek 1-2 saatini alır.

### B) Personel Hesaplarını Doğrula
Aşağıdaki hesapları **bizzat ara**, kullanıcı adı + PIN bildiklerini onayla:

| Şube | Müdür | Supervisor |
|---|---|---|
| Işıklar | Erdem Yıldız | Basri Şen |
| Lara | "Lara Müdür" ⚠️ | "Lara Supervisor" ⚠️ |

**⚠️ Lara'da generic isimler var.** Aslan franchise sahibiyle iletişime geçecek, gerçek isimler bu hafta sisteme yazılacak. Sen kendi tarafında "Lara Müdür" hesabıyla giriş yapabildiğini test et.

### C) Pilot Dışı 18 Şube — "Hazırlık Modu"
Sistem 22 şube içeriyor. **Sadece 4'ü pilot scope'unda** (Işıklar, Lara, HQ, Fabrika). Diğer 18'i **`setup_complete=false`** durumunda — yani:
- Yöneticileri login olunca **Onboarding Wizard** otomatik açılır (personel Excel yükleme adımı)
- Senin dashboard'unda **"Hazırlık modunda"** rozetiyle görünür
- KPI rakamlarına dahil edilmez

Bu şubeler için **pilot sırasında pasif gözlem yap**. Aktif yönetim isteme. Day-30 sonrası Aslan kademeli açacak.

---

## 3. Komuta Merkezi — Senin Ana Sayfan

**URL:** `/dashboard/coach` (giriş yapınca otomatik açılır)

### Üst Bant — 4 KPI Kart
1. **Şube Sayısı** — pilot 4 (Işıklar, Lara, HQ, Fabrika)
2. **Toplam Personel** — pilot ekiplerinin toplam sayısı
3. **Açık Arıza** — sistem/ekipman sorun sayısı
4. **Açık Ticket** — destek talepleri (CRM)

### Ana Paneller
- **Şube Sağlık Haritası** — pilot 4 şubeyi renk kodlu görürsün:
  - 🟢 Healthy: PDKS düzenli, görev tamamlanmış, feedback iyi
  - 🟡 Warning: 1-2 alanda eksik
  - 🔴 Critical: Birden fazla alanda problem (geç giriş, eksik personel, düşük feedback)
- **PDKS Devamsızlık Widget** — bugün mevcut/toplam (ör. 8/12), bu ay geç giriş sayısı, şube sıralaması
- **Bugünün Görevleri** — bekleyen / tamamlanan / gecikmiş (TopFlop ranking)
- **Eğitim İlerleme** — atama tamamlama yüzdesi (Ece'nin alanı, ama sen de görürsün)
- **Müşteri Feedback** — son 7 gün ortalama puan + hacim
- **Hızlı Aksiyon** — "X şubede checklist eksik" gibi alarmlar (tıklayınca direkt o şubeye gidersin)

---

## 4. Günlük Rutin (Pilot Day-1 ila Day-30)

### Sabah (09:00 — pilot başlama saati)
1. Komuta Merkezi'ni aç
2. **Şube Sağlık Haritası** kontrol et — kırmızı varsa o şubeye git, hangi widget kırmızı bak
3. **PDKS Devamsızlık** widget'ında bugün gelmesi gereken vs gelen sayısını kıyasla
4. Geç giriş alarmı varsa: 15 dk = "Late" (tolere et), 60 dk = "Severe Late" (şube müdürünü ara)

### Öğle (12:00–14:00)
1. **Bugünün Görevleri** widget'ı — gecikmiş görev varsa müdüre WhatsApp at
2. **Müşteri Feedback** — sabahtan beri yeni feedback geldi mi? Düşük puan varsa şubeye dön

### Akşam (kapanış 22:00 sonrası)
1. PDKS çıkış kayıtlarını kontrol et — eksik çıkış (kiosk'tan çıkmadan gitmiş personel) varsa müdürle ertesi sabah konuş
2. Günü Mr. Dobody'nin "Günlük Özet" mesajıyla kapat (sistem otomatik gönderiyor)

### Hafta sonunda (Pazar)
1. Geçen haftanın **PDKS rapor** indir (CSV) — saatleri, geç girişleri, eksik vardiyaları gör
2. Mahmut'a (HR/Muhasebe) WhatsApp: "Geçen hafta normaldi" veya "Şu noktada sapma var"
3. Önümüzdeki hafta vardiya planını gözden geçir, gerekirse düzenle

---

## 5. Eskalasyon — Sorun Çıktığında Ne Yapmalısın

### Geç Giriş Eskalasyon Eşikleri (sistem otomatik tetikler)
| Sıklık | Aksiyon |
|---|---|
| 1-2 gün üst üste 15 dk | Tolere — sadece kayıt |
| Aynı kişi ayda 2x | **Warning** bildirimi → şube müdürü + supervisor |
| Aynı kişi ayda 4+ | **Escalation** bildirimi → sen + Utku (CGO) |
| Şube genel %20+ devamsızlık | Mr. Dobody otomatik sana mesaj atar |

### Sistem Hatası / Teknik Problem
**Senin yetkinde olmayan şeyler:**
| Sorun | Kime ne zaman |
|---|---|
| Kiosk PIN çalışmıyor | **Aslan'a WhatsApp** (admin yetkisi gerekiyor — sistem bunu hızlıca düzeltecek `#237` sprint'i ile) |
| Sayfa hata veriyor (500) | `/iletisim` → "Yeni teknik talep" → Murat Demir'e (IT) atanır |
| Yanlış maliyet/fatura görüyorum | Mahmut + Samet (HQ ofis) |
| Reçete hatası / alerjen sorunu | Sema (Gıda Mühendisi) |
| Müşteri şikayeti onay bekliyor | Utku (CGO + Kalite Kontrol) |

### Acil Durum (Pilot Day-1 sırasında çökme)
1. Aslan'ı ara (telefon, sistem dışı)
2. Pilot şubeleri WhatsApp grupla bilgilendir ("sistem geçici, kağıda yazın")
3. Düzeldiği zaman PDKS girişlerini elle Excel'den import et (Mahmut yapar)

---

## 6. Şube Yönetim Farkı — Bilmen Gereken 1 Şey

**Işıklar (HQ-owned) ile Lara (Franchise) arasında 3 noktada akış farklı:**

| Konu | Işıklar | Lara |
|---|---|---|
| **İzin onayı** | Kişi izin ister → CEO + Mahmut onaylar | Kişi izin ister → **Lara Müdürü** onaylar (sen sadece görürsün) |
| **Fabrika sevkiyatı** | Internal transfer (maliyet hesabı yapılır, fatura YOK) | Sale (satış kaydı + fatura kesilir) |
| **Yatırımcı raporu** | Yok (HQ'nun kendi şubesi) | Mehmet (yatirimci_hq) görür |

**Pratik:** Aynı sayfa, aynı butonlar görürsün, ama Lara'da "izin onaylama" butonuna basamazsın (yetkisiz hatası alırsın). Bu **bug değil**, tasarım. Eğer Lara müdürü izin onaylamıyorsa **WhatsApp ile onu hatırlat**, sen bypass edemezsin.

---

## 7. Pilot Sonrası — Day-30 ve Sonrası

Pilot başarılı olursa (5 Mayıs–4 Haziran):
- Kademeli açılış: 12 May Antalya bölgesi (Mallof, Markantalya, Beachpark) → 19 May Gaziantep → 26 May Konya/Samsun → vd.
- Senin scope'un büyür — 4 şube → 8 → 15 → 20
- Vardiya giriş/çıkış takibi **tamamen sistem üzerinden** olacak (şu an Excel hâlâ kullanılıyor olabilir, geçiş süreci)
- Ece'nin koçluk yetkisi netleşir, paralel akış kurarsınız

---

## 8. Sıkça Sorulan Sorular

**S: Vardiya planlamamı bittiyse nasıl bilirim?**
C: `/vardiya-planlama` sayfasında 5–18 Mayıs aralığını gör. Boş gün varsa kırmızı, dolu yeşil. Tüm günler yeşilse hazır.

**S: Kişiye bir mesaj nasıl atarım sistemden?**
C: `/iletisim` → "Yeni mesaj" → personel seç. WhatsApp gibi çalışır.

**S: Komuta Merkezi'nde gördüğüm rakamlar yanlış geliyor.**
C: Hangi widget? Mr. Dobody'ye sor (sağ alt köşedeki sohbet butonu) — "Lara'nın bugünkü PDKS sayısı kaç?" gibi. Mr. Dobody DB'den anlık çeker.

**S: Pilot başlamadan bir gün önce (4 May Pazar) ne yapayım?**
C: Final kontrol:
1. 2 haftalık vardiya yüklü mü
2. Komuta Merkezi 4 yeşil kart gösteriyor mu (Lara dahil)
3. Aslan/Utku/Ece WhatsApp grup hazır mı
4. Erdem + Basri + Lara müdürü test login yapıp dashboard görüyor mu

---

## 9. İletişim — Pilot Süresince Kim Kim?

| Kişi | Rol | Ne için ararsın |
|---|---|---|
| **Aslan** | CEO | Kritik sistem hatası, scope kararı |
| **Utku** | CGO + Kalite | Şikayet onayı, denetim, branş kararı |
| **Ece** | Koç + Eğitim | Eğitim atama, gelişim raporu |
| **Mahmut** | İK + Muhasebe | PDKS Excel, payroll, izin onay HQ tarafı |
| **Samet** | Satınalma | Hammadde fiyat, fatura |
| **Sema** | Gıda Müh. | Alerjen, besin değer, reçete onayı |
| **Murat** | IT | Teknik altyapı, server hatası |
| **Diana** | Pazarlama | Görsel, kampanya, sosyal medya |
| **Ayşe** | Destek | CRM ticket, müşteri talebi |

---

## 10. Brief Onayı

Bu dokümanı okudun mu, anladın mı?
- [ ] Yetki kapsamım net (Işıklar tam, Lara tam takip + müdahale, HQ/Fabrika scope dışı)
- [ ] 3 May Cmt'ye kadar 2 haftalık vardiya kuracağım
- [ ] Komuta Merkezi'ni denedim, KPI'lar ve widget'lar tanıdık
- [ ] Eskalasyon listesi telefonumda kayıtlı
- [ ] Pilot Day-1 sabahı 08:30'da sistemde olacağım

**İmza / Onay:** _________________ **Tarih:** _________________

---

## Notlar (Pilot süresince ekleyeceğin)

```
[Tarih]: [Olay] → [Aksiyon] → [Sonuç]
```

---

**Hazırlayan:** Aslan + DOSPRESSO IT
**Versiyon:** 1.0 (25 Nisan 2026)
**Sonraki revizyon:** Pilot Day-7 sonrası (12 Mayıs) gerçek kullanım deneyimine göre
