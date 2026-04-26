# Erdem Brief — DOSPRESSO Pilot Işıklar Şube Operasyonu

**Pilot başlangıç:** 5 Mayıs 2026 Pazartesi 09:00
**Brief deadline:** 3 Mayıs 2026 Cumartesi 18:00
**Senin rolün:** Işıklar Şube Müdürü — günlük operasyon, personel, müşteri deneyimi

---

## Merhaba Erdem,

Pilot 5 Mayıs'ta başlıyor. Işıklar 4 pilot lokasyondan biri (Lara, HQ, Fabrika ile birlikte). Sen Işıklar'ın günlük operasyonel sorumlususun. Yavuz (Franchise Koçu) seninle koordine olacak; sen şubenin içinde, o tüm pilot şubeleri uzaktan takip edecek. Bu brief 3 sayfa, profesyonel iş paketi olarak hazırlandı.

---

## 1. Sistem Erişimin

| Alan | Bilgi |
|---|---|
| **Kullanıcı adı** | `mudur5` |
| **Pilot şifre** | `0000` (ilk girişte değiştirmen önerilir) |
| **Sistem rolü** | `mudur` |
| **Şube atama** | Antalya Işıklar (#5) |
| **Şube tipi** | HQ-owned (bombtea) — yani merkez ofise bağlı |
| **URL** | https://dospresso.app (veya pilot URL'i) |

### Ana Sayfaların
- **`/dashboard`** — Komuta Merkezi (sabah ilk açacağın sayfa)
- **`/sube/5`** — Işıklar şube detay sayfası
- **`/vardiya-planlama`** — Vardiya planı (ekipliklerini buradan kurarsın)
- **`/pdks`** — PDKS giriş/çıkış kayıtları
- **`/iletisim`** — CRM/mesajlaşma (Yavuz, Aslan, Mahmut'la iletişim)

### Şube Kiosk
- **`/sube/kiosk/5`** — Personel giriş/çıkış kiosku (tablette açık dururken)
- 4 aşamalı login: cihaz şifresi → personel seç → 4 haneli PIN → duyuru onay → çalışma ekranı
- **Pilot Day-1 öncesi tablet kiosk modu açık olmalı**

---

## 2. Komuta Merkezi — Senin 11 Widget'lı Dashboard'un

Pilot Day-1 sabahı `/dashboard` açtığında **5 ana widget** açık karşılayacak:

| Widget | Ne gösterir |
|---|---|
| **Şube Durumu** (branch_status) | Işıklar'ın bugünkü genel sağlığı (yeşil/sarı/kırmızı) |
| **PDKS Yoklama** (pdks_attendance) | Bugün giren/çıkan personel sayısı, oran |
| **PDKS Devamsızlık** (pdks_absence) | Eksik personel listesi, geç giriş alarmı |
| **Bugünün Görevleri** (todays_tasks) | Şube için bekleyen/tamamlanan görevler |
| **Hızlı Aksiyon** (quick_actions) | Vardiya gör, izin onayla, bildirim aç gibi |

Aşağıda **6 ek widget** kapalı durumda — istediğin zaman aç:
- Vardiya özeti, müşteri feedback, eğitim ilerleme, satış özeti, vd.

---

## 3. Personel ve PDKS Sistemi

### Işıklar Aktif Personel (12 PIN'li)
Işıklar'da pilot başında 12 aktif personel kioskta giriş yapabilir. Sen müdür olarak hepsini görüyorsun, supervisor (Basri Şen) ile birlikte vardiya kuruyorsun.

### Kiosk Giriş Akışı
1. Personel kiosk'a yaklaşır (tablette `/sube/kiosk/5` açık)
2. Listeden ismini seçer
3. 4 haneli PIN'ini girer (default 0000, değiştirilmeli)
4. Sabah duyurusu varsa okur ve "okudum" der
5. Çalışma ekranına geçer (vardiya başlar)

### Kayıt Edilen Veriler
- Giriş/çıkış zamanı (saniye hassasiyetle)
- Konum (lat/long, kiosk'un GPS'inden)
- Giriş fotoğrafı (kiosk kamerasından)
- AI dress code skoru (bu ay aktif olmayabilir, ama veri yazılıyor)

### Geç Giriş Tespiti
Sistemde 2 seviye:
- **15 dk geç** → "Late" kaydı, otomatik takip başlar
- **60 dk geç** → "Severe Late" — Mr. Dobody otomatik bildirim atar

### Aylık Bildirim Eşikleri (Mr. Dobody otomatik)
- **Aynı kişi ayda 2x late** → Warning: sen + Basri'ye bildirim
- **Ayda 4+ late** → Escalation: Yavuz (Coach) + Utku (CGO) bildirim
- **Şube genel %20+ devamsızlık** → Yavuz'a otomatik mesaj

### Mola Takibi
- Personel kioskta "Mola Başlat" / "Mola Bitir" butonlarına basar
- **Pilot Işıklar default:** 60 dk mola, 90 dk maximum
- 90 dk geçilirse otomatik uyarı

---

## 4. Vardiya Planı — Yavuz Sana Yardım Edecek

Vardiya planı **3 yöntemle kurulabilir** (Excel YOK):

1. **Şablondan toplu üret** — Önce şablon kur ("Standart Hafta — 2 vardiya"), sonra 14 günlük plan tek tıkla oluşur
2. **Geçen haftayı kopyala** — Lara'da örnek var, Işıklar için aynı pattern
3. **Manuel sürükle-bırak** — `/vardiya-planlama` sayfası, saat/gün ızgarası

**Pilot Day-1 öncesi:** 5–18 Mayıs için 2 haftalık vardiya girilmiş olmalı. Yavuz sana bu konuda yardım edecek; sen sadece şubenin gerçek personel saatlerini ona ilet.

---

## 5. Aylık Puantaj — Otomatik

Pilot için iyi haber: **Excel'le manuel puantaj YOK.**

- Kiosk giriş/çıkış kayıtları otomatik `monthly_payroll` tablosuna gider
- **Scheduler her ayın 1'i, TR saati 04:00–04:10** arası otomatik hesaplama yapar
- Sen rapor edileceği zaman `/pdks` sayfasından geçen ayın özeti görürsün
- Mahmut (HR/Muhasebe) tarafında payroll otomatik gelir, ek iş yok

**Sadece kiosk arıza olursa** Mahmut Excel ile manuel girer (fallback). Normalde Excel gerek yok.

---

## 6. Pilot Day-1 Sabahı — Senin Rutinin

### 08:00 — Şube Açılışı
1. Sen ve Basri (supervisor) gelin, kioskları kontrol edin
2. Tablet açık, kiosk URL'i (`/sube/kiosk/5`) yüklü, internet bağlantısı OK
3. Sabah duyurusu varsa ekranda görünüyor mu (Aslan veya Yavuz HQ'dan duyuru atabilir)

### 09:00 — Pilot Başlangıç
1. Senin hesabınla (`mudur5`) `/dashboard` aç → Komuta Merkezi
2. **5 ana widget'ı** kontrol et: Şube Durumu yeşil mi? PDKS Yoklama doluyor mu?
3. İlk personeli kiosk'tan giriş yaparken izle, sorun yoksa devam

### 12:00 — Öğle Kontrolü
1. PDKS Devamsızlık widget'ına bak — geç giren var mı?
2. Bugünün görevleri tamamlanıyor mu (todays_tasks)
3. Müşteri feedback geldi mi (kapalı widget'ı aç)

### 17:00 — Akşam
1. Personel çıkış yapıyor — kiosk'tan
2. Eksik çıkış varsa (kioksuz çıkmış personel) Basri ile kontrol et
3. Bugünün PDKS özeti `/pdks` sayfasında

### Akşam — Yavuz'a Günlük Özet
Pilot ilk haftası her akşam Yavuz'a kısa WhatsApp:
- Bugün personel devam durumu
- Geç giren / mola dönmeyen var mı
- Şikayet/sorun var mı

---

## 7. Eskalasyon — Sorun Çıktığında

### Personel/Vardiya Sorunu
| Durum | Aksiyon |
|---|---|
| Personel kiosk'a giremiyor | Önce şifre/PIN deneyin → çözmüyorsa Aslan'a (admin) WhatsApp |
| Geç giriş alarmı geldi | Kişi 1-2 gün üst üste 15 dk: tolere et. Aynı kişi 2x: kendisiyle konuş + Basri'ye bildir |
| Mola dönmedi (90 dk geçti) | Kişiyi bul, bir sorun mu var? Sistem otomatik uyarı atıyor |
| Vardiya planında değişiklik gerek | `/vardiya-planlama` → değiştir, ya da Yavuz'a "şu kişi yarın gelmeyecek" bildir |

### Müşteri/Operasyon Sorunu
| Durum | Aksiyon |
|---|---|
| Ürün şikayeti | `/iletisim` → "Yeni şikayet" → Utku'ya (CGO + Kalite) gider |
| Sevkiyat eksik | Eren'i (Fabrika) ara — bekleyen sevkiyat onun listesinde |
| Kalite sorunu | Sema'ya ulaş (alerjen/besin/kalite) |

### Sistem Sorunu
| Durum | Aksiyon |
|---|---|
| Sayfa hata veriyor (500) | `/iletisim` → "Yeni teknik talep" → Murat (IT) atanır |
| Kiosk donuyor | Tableti yeniden başlat (off-on), sonra kiosk URL'ini yeniden aç |
| PIN unutuldu | Aslan'a (admin) WhatsApp — manuel reset (#237 ile yakında otomatikleşecek) |

### Acil Durum (Sistem çökmesi)
1. Aslan'ı ara
2. Personellere "kağıda yazın" de — giriş/çıkış manuel kayıt
3. Sistem geri gelince Mahmut Excel'den manuel import edebilir

---

## 8. Lara Franchise Farkından Sen Etkilenmiyorsun

Bilmen gereken: Işıklar **HQ-owned** (merkez ofise bağlı), Lara **franchise** (Andre'nin işletmesi). İki şubenin akışları biraz farklı:

**Senin durumun (Işıklar):**
- İzin onayı: Personel istek atar → CEO (Aslan) + Mahmut onaylar (HQ tarafı)
- Sevkiyat: Internal transfer (maliyet hesabı, fatura YOK)
- Yatırımcı raporu yok (HQ kendi şubesi)

**Lara'nın durumu:**
- İzin onayı şubedeki Andre'ye gider
- Sevkiyat satış (fatura kesilir)

**Pratik:** Sen iki şubenin akışlarına tek sayfada bakabilirsin (Yavuz'un Komuta Merkezi gibi), ama sadece Işıklar'ın işlerinde aktif aksiyon alırsın.

---

## 9. Sıkça Sorulan Sorular

**S: Vardiyada bir kişi gelmediyse ne yapayım?**
C: PDKS Devamsızlık widget'ına düşer. Önce kişiyi ara — bir sorun mu var? İzin almışsa onayla. Habersiz gelmediyse Mahmut'a "X kişi gelmedi, izinsiz" bildirimi yap.

**S: Yavuz Lara'nın işine de karışıyor mu?**
C: Yavuz teknik olarak ikisini de görüyor. Ama günlük operasyonel kararlar (vardiya, izin, küçük şikayet) senin alanında. Yavuz daha çok "büyük resim" — şube sağlığı, performans, eğitim takibi.

**S: Aslan ne zaman benimle iletişime geçer?**
C: Pilot ilk haftası her akşam kısa özet konuşması olabilir. Sistem hatası, kritik şikayet, büyük müşteri olayında günün herhangi bir saatinde.

**S: Bilgisayarsız bir kişi nasıl PDKS yapar?**
C: Tabletteki kiosk yeterli — bilgisayar gerekmiyor. Personel sadece kiosk önüne gelip ismini seçip PIN'ini girecek.

**S: Pilot başında ben de kiosk'tan giriş yapıyor muyum?**
C: Evet — sen de personelsin. Kioskta `mudur5` veya isminle ara, PIN'inle gir.

---

## 10. İletişim — Pilot Süresince

| Kişi | Rol | Ne için |
|---|---|---|
| **Aslan** | CEO + admin | Sistem hatası, scope kararı, acil |
| **Yavuz** | Franchise Koçu | Pilot koordinasyon, günlük performans |
| **Basri** | Işıklar Supervisor | Vardiya, mola, günlük operasyon |
| **Mahmut** | İK + Muhasebe | PDKS, payroll, izin onay HQ tarafı |
| **Utku** | CGO + Kalite | Şikayet onay |
| **Sema** | Gıda Müh. | Reçete, alerjen, kalite |
| **Eren** | Fabrika Müdürü | Sevkiyat, ürün |
| **Murat** | IT | Teknik altyapı |

---

## 11. Brief Onayı

Bu paketi okudun mu, anladın mı?
- [ ] Sistem rolüm ve yetkilerim net (`mudur`, Işıklar #5)
- [ ] Komuta Merkezi'nde 5 ana widget'ı tanıdım
- [ ] PDKS otomatik (Excel YOK), aylık puantaj scheduler ile gelir
- [ ] Geç giriş eşikleri net (15 dk Late, 60 dk Severe)
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

## EK: Aslan'dan Erdem'e Mesaj

Erdem, Işıklar pilot için **en kritik test şubesi.** Burası bizim referans şubemiz — sistem burada düzgün çalışırsa diğer şubelere açılış kararı verme imkanımız olur. Sen Day-1'de sistem üzerinde küçük problemleri bile not et, paylaş — pilot süresinde her gün biraz daha iyileştiriyoruz.

Yavuz'u günlük takip için kullan, ama büyük kararlar için doğrudan beni ara. Sağol, başarı dileklerimle. ☕

— Aslan
