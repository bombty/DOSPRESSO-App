# Andre Brief — DOSPRESSO Pilot Lara Franchise Operasyonu

**Pilot başlangıç:** 5 Mayıs 2026 Pazartesi 09:00
**Brief deadline:** 3 Mayıs 2026 Cumartesi 18:00
**Senin rolün:** Lara Franchise Sahibi + Müdür — şube işletmesi, personel, müşteri deneyimi

---

## Merhaba Andre,

Pilot 5 Mayıs'ta başlıyor. Lara 4 pilot lokasyondan biri (Işıklar, HQ, Fabrika ile birlikte). Sen Lara'nın hem **franchise sahibi** hem **operasyonel müdürüsün** — bu özel bir konum, çünkü pilot içinde tek franchise şube. İşletme kararların seninle, ama sistem üzerinden Aslan ve ekibi de Lara'yı takip eder. Bu brief 3 sayfa, profesyonel iş paketi olarak hazırlandı.

---

## 1. Sistem Erişimin

| Alan | Bilgi |
|---|---|
| **Kullanıcı adı** | `laramudur` |
| **Pilot şifre** | `0000` (ilk girişte değiştirmeni öneririz) |
| **Sistem rolü** | `mudur` |
| **Şube atama** | Antalya Lara (#8) |
| **Şube tipi** | Franchise (sen sahibisin) |
| **URL** | https://dospresso.app (veya pilot URL'i) |

### Ana Sayfaların
- **`/dashboard`** — Komuta Merkezi (sabah ilk açacağın sayfa)
- **`/sube/8`** — Lara şube detay sayfası
- **`/vardiya-planlama`** — Vardiya planı
- **`/pdks`** — PDKS giriş/çıkış kayıtları
- **`/iletisim`** — CRM/mesajlaşma (HQ ekibiyle iletişim)

### Şube Kiosk
- **`/sube/kiosk/8`** — Personel giriş/çıkış kiosku (tablette açık dururken)
- 4 aşamalı login: cihaz şifresi → personel seç → 4 haneli PIN → duyuru onay → çalışma ekranı
- **Pilot Day-1 öncesi tablet kiosk modu açık olmalı**

---

## 2. Komuta Merkezi — Senin 11 Widget'lı Dashboard'un

Pilot Day-1 sabahı `/dashboard` açtığında **5 ana widget** açık karşılayacak:

| Widget | Ne gösterir |
|---|---|
| **Şube Durumu** (branch_status) | Lara'nın bugünkü genel sağlığı (yeşil/sarı/kırmızı) |
| **PDKS Yoklama** (pdks_attendance) | Bugün giren/çıkan personel sayısı, oran |
| **PDKS Devamsızlık** (pdks_absence) | Eksik personel listesi, geç giriş alarmı |
| **Bugünün Görevleri** (todays_tasks) | Lara için bekleyen/tamamlanan görevler |
| **Hızlı Aksiyon** (quick_actions) | Vardiya gör, izin onayla, bildirim aç |

Aşağıda **6 ek widget** kapalı durumda — istediğin zaman aç:
- Vardiya özeti, müşteri feedback, eğitim ilerleme, satış özeti, vd.

---

## 3. Franchise Olmanın Sistem Üzerindeki Anlamı

Lara, pilot 4 şubeden tek franchise. Bu sana özel **3 fark** getiriyor:

### Fark 1: İzin Onayı Sende
Personelin biri izin istediğinde:
- **Lara (Franchise):** İstek **sana** gelir, sen onaylarsın
- (Karşılaştırma — Işıklar HQ-owned: İstek HQ'ya gider, CEO + Mahmut onaylar)

Bu sana operasyonel özgürlük sağlar. Yavuz (Franchise Koçu) izinleri **görür** ama onaylamaz.

### Fark 2: Sevkiyat = Satış (Fatura)
Fabrikadan Lara'ya gelen ürün:
- **Lara:** Sale tipi (sen ürünü Aslan'dan **satın alıyorsun**, fatura kesilir)
- (Karşılaştırma — Işıklar: Internal transfer, fatura YOK)

Sistem bu farkı otomatik tutuyor. Sen sadece sipariş verir, gelen ürünü kabul edersin. Mahmut tarafında fatura kesilir.

### Fark 3: Yatırımcı Raporu
- Lara'nın performansı yatırımcılar (Mehmet, yatirimci_hq) tarafından görülür — pilot süresince Lara'nın PDKS, satış, müşteri feedback özetleri yatırımcı dashboard'unda paylaşılır
- Sen bu rapora erişemezsin (sadece executive seviye), ama bilgin olsun

---

## 4. Lara Aktif Personel ve Kiosk

### 16 PIN'li Personel Kayıtlı
Lara'da pilot başında 16 aktif personel kioskta giriş yapabilir. Sen müdür olarak hepsini görüyorsun.

### Supervisor Konusu — Aslan'la Konuşman Gereken
Şu anda DB'de iki hesap var:
- `laramudur` (Sen — Andre, müdür)
- `larasupervisor` (generic, henüz gerçek kişi atanmamış)

**Aslan ile konuş:** Lara için supervisor kim olacak?
- Sen mi (çift rol: müdür + supervisor olabilir)?
- Yoksa ekibinden başka biri mi?

Pilot Day-1 öncesi netleşmesi lazım. Eğer kişi atayacaksan Aslan DB'den isim güncelleyecek.

### Kiosk Giriş Akışı
1. Personel kiosk'a yaklaşır (tablette `/sube/kiosk/8` açık)
2. Listeden ismini seçer
3. 4 haneli PIN'ini girer (default 0000, değiştirilmeli)
4. Sabah duyurusu varsa okur ve "okudum" der
5. Çalışma ekranına geçer

### Kayıt Edilen Veriler
- Giriş/çıkış zamanı (saniye hassasiyetle)
- Konum (lat/long)
- Giriş fotoğrafı + AI dress code skoru

### Geç Giriş Eşikleri
- **15 dk geç** → "Late"
- **60 dk geç** → "Severe Late" — Mr. Dobody otomatik bildirim atar
- Aynı kişi ayda 2x late → sen + supervisor'a uyarı
- Ayda 4+ → Yavuz (Coach) + Utku (CGO) bildirim
- Şube genel %20+ devamsızlık → Yavuz'a otomatik mesaj

### Mola Takibi
- Default: 60 dk mola, max 90 dk
- 90 dk geçilirse uyarı

---

## 5. Vardiya Planı

3 yöntemle kurulabilir (Excel YOK):

1. **Şablondan toplu üret** — Şablon kur, sonra 14 günlük plan tek tıkla oluşur
2. **Geçen haftayı kopyala** — Lara'da son 30 günde **210 vardiya kaydı** var, kopyalayıp düzenleyebilirsin (avantaj sende)
3. **Manuel sürükle-bırak** — `/vardiya-planlama` sayfası

**Pilot Day-1 öncesi:** 5–18 Mayıs için 2 haftalık vardiya girilmiş olmalı. Yavuz veya sen kurarsın.

---

## 6. Aylık Puantaj — Otomatik

Pilot için kolay haber: **Excel'le manuel puantaj YOK.**

- Kiosk giriş/çıkış kayıtları otomatik `monthly_payroll` tablosuna gider
- **Scheduler her ayın 1'i, TR saati 04:00–04:10** arası otomatik hesaplama
- Sen `/pdks` sayfasından geçen ayın özeti görürsün
- **Franchise olduğun için ödeme akışı sende** — sistem hesaplar, sen personeline ödersin

Lara'nın aylık puantaj gelir-gider tablosu sana ekstra rapor olarak sunulabilir (Aslan ile konuşurun).

---

## 7. Pilot Day-1 Sabahı — Senin Rutinin

### 08:00 — Şube Açılışı
1. Şubeyi aç, ekipliğini topla
2. Tabletteki kiosk URL'i (`/sube/kiosk/8`) yüklü, internet OK
3. Sabah duyurusu varsa ekranda görünüyor mu (HQ'dan duyuru atılabilir)

### 09:00 — Pilot Başlangıç
1. Senin hesabınla (`laramudur`) `/dashboard` aç → Komuta Merkezi
2. **5 ana widget'ı** kontrol et: Şube Durumu yeşil mi? PDKS Yoklama doluyor mu?
3. İlk personeli kiosktan giriş yaparken izle, sorun yoksa devam

### 12:00 — Öğle Kontrolü
1. PDKS Devamsızlık widget'ına bak
2. Bugünün görevleri tamamlanıyor mu (todays_tasks)
3. Müşteri feedback geldi mi (kapalı widget'ı aç)
4. Fabrika sevkiyatı (Eren'den) gelmiş mi

### 17:00 — Akşam
1. Personel çıkış yapıyor — kiosktan
2. Eksik çıkış varsa kontrol et
3. Bugünün PDKS özeti `/pdks` sayfasında
4. Bugünün satış özeti şubene ait

### Akşam — Yavuz/Aslan ile Kısa Özet
Pilot ilk haftası her akşam kısa WhatsApp:
- Bugün personel devam durumu
- Müşteri feedback
- Şikayet/sorun var mı
- Sevkiyat / stok durumu

---

## 8. Eskalasyon — Sorun Çıktığında

### Personel/Vardiya Sorunu (Senin Sorumluluğun)
| Durum | Aksiyon |
|---|---|
| Personel kiosk'a giremiyor | Önce şifre/PIN deneyin → çözmüyorsa Aslan'a (admin) WhatsApp |
| Geç giriş alarmı | Kişi 1-2 gün üst üste 15 dk: tolere et. Aynı kişi 2x: kendisiyle konuş |
| Mola dönmedi (90 dk geçti) | Kişiyi bul, sorun mu var? Sistem otomatik uyarı atıyor |
| İzin talebi geldi | Senin onayın → onayla/reddet (HQ'ya bildirim gider, ama karar sende) |
| Vardiya değişikliği | `/vardiya-planlama` → değiştir |

### Müşteri/Operasyon
| Durum | Aksiyon |
|---|---|
| Ürün şikayeti | `/iletisim` → "Yeni şikayet" → Utku'ya (CGO + Kalite) gider |
| Sevkiyat eksik/geç | Eren'i (Fabrika) ara |
| Kalite sorunu | Sema'ya ulaş |
| Stok bitti | Samet'i (Satınalma) ara — hammadde tedariği |

### Sistem Sorunu
| Durum | Aksiyon |
|---|---|
| Sayfa hata veriyor | `/iletisim` → "Yeni teknik talep" → Murat (IT) atanır |
| Kiosk donuyor | Tableti yeniden başlat (off-on) |
| PIN unutuldu | Aslan'a (admin) WhatsApp — manuel reset (#237 ile yakında otomatikleşecek) |

### Acil Durum (Sistem Çökmesi)
1. Aslan'ı ara
2. Personellere "kağıda yazın" de
3. Sistem geri gelince Mahmut Excel'den manuel import edebilir

---

## 9. Sıkça Sorulan Sorular

**S: Yavuz Lara'nın işine ne kadar karışacak?**
C: Yavuz Lara'yı **görüyor**, ama operasyonel kararlar sende. Yavuz daha çok şube sağlık göstergesi, performans, eğitim koordinasyonu için. İzin onayı, vardiya kararı, müşteri ilişkisi senin alanın.

**S: Bana özel franchise raporu var mı?**
C: Pilot ilk fazında yok — sadece müdür widget'larını görüyorsun. Pilot sonrası franchise sahibi için özel rapor (gelir-gider, satış trend, yatırımcı paylaşımı) eklenecek (R-6 backlog).

**S: Personel hesaplarını ben yönetiyorum mu, HQ mu?**
C: HQ (Aslan/admin). Yeni personel eklenecekse Aslan'a istekle iletirsin, o admin yetkisiyle açar. Sen sadece mevcut personel için PDKS, vardiya, izin işi yaparsın.

**S: Lara'da kasap/satış cihazı var mı, sisteme bağlı mı?**
C: Pilot ilk fazında satış cihazı entegrasyonu YOK. Sen müşteri satışlarını manuel takip edersin (kasiyer not eder), aylık raporlama HQ'ya bildirim üzerinden olur. Pilot sonrası entegrasyon planlanıyor.

**S: Andre olarak supervisor da olabilir miyim (çift rol)?**
C: Sistemde teknik olarak mümkün ama önerilir mi? Aslan ile konuş — pilot süresinde tek hesap kullanırsan basitlik kazanır, supervisor için ekibinden biri seçilirse daha sağlıklı.

---

## 10. İletişim — Pilot Süresince

| Kişi | Rol | Ne için |
|---|---|---|
| **Aslan** | CEO + admin | Sistem hatası, scope kararı, franchise konuları, acil |
| **Yavuz** | Franchise Koçu | Pilot koordinasyon, performans, eğitim |
| **Mahmut** | İK + Muhasebe | PDKS, payroll, fatura |
| **Samet** | Satınalma | Hammadde, stok, fatura |
| **Sema** | Gıda Müh. | Reçete, alerjen, kalite |
| **Eren** | Fabrika Müdürü | Sevkiyat, ürün |
| **Utku** | CGO + Kalite | Şikayet onay, çapraz kalite |
| **Murat** | IT | Teknik altyapı |

---

## 11. Brief Onayı

Bu paketi okudun mu, anladın mı?
- [ ] Sistem rolüm ve yetkilerim net (`mudur`, Lara #8, Franchise)
- [ ] Komuta Merkezi'nde 5 ana widget'ı tanıdım
- [ ] Franchise farkları (izin sende, sevkiyat satış, fatura) — biliyorum
- [ ] Geç giriş eşikleri net (15 dk Late, 60 dk Severe)
- [ ] Supervisor konusunda Aslan ile konuşacağım (kim atanacak)
- [ ] Pilot Day-1 sabahı 08:00'de hazır olacağım

**İmza / Onay:** _________________ **Tarih:** _________________

---

## Notlar (Pilot süresince)

```
[Tarih]: [Olay] → [Aksiyon] → [Sonuç]
```

---

**Hazırlayan:** Aslan + DOSPRESSO IT
**Versiyon:** 1.0 (26 Nisan 2026)
**Sonraki revizyon:** Pilot Day-7 sonrası (12 Mayıs)

---

## EK: Aslan'dan Andre'ye Mesaj

Andre, Lara pilot için **özel bir konumda** — tek franchise şube. Bu sana hem operasyonel özgürlük veriyor (izin/vardiya senin elinde), hem de daha fazla sorumluluk getiriyor (şubenin başarısı doğrudan senin işletme kararlarına bağlı).

Pilot ilk haftası **birlikte yakın çalışacağız**. Her gün kısa görüşelim — sistem'de takıldığın yerleri anlık çözelim. Yavuz uzaktan koordine edecek, ben acil durumlar için her an açığım.

Lara'nın başarısı pilot'un başarısı için kritik. Senin işletmecilik tecrübenle DOSPRESSO sisteminin birleşmesi pilot'un en güçlü kanıtı olacak. ☕

— Aslan
