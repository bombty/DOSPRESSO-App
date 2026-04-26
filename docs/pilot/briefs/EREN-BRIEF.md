# Eren Brief — DOSPRESSO Pilot Fabrika Operasyonu

**Pilot başlangıç:** 5 Mayıs 2026 Pazartesi 09:00
**Brief deadline:** 3 Mayıs 2026 Cumartesi 18:00
**Senin rolün:** Fabrika Müdürü — fabrika üretim planı, kapasite, ekip ve ürün kalitesi senin sorumluluğunda

---

## Merhaba Eren,

Pilot 5 Mayıs'ta başlıyor. Fabrika 4 pilot lokasyondan biri (Işıklar, Lara, HQ ve Fabrika). Sen pilot süresince fabrikanın günlük operasyonel sağlığından sorumlusun. Sema ve RGM (yine Sema) reçete ve kalite tarafında, Sen ise üretim ve ekip tarafında. Bu brief 3 sayfa, profesyonel iş paketi olarak hazırlandı.

---

## 1. Sistem Erişimin

| Alan | Bilgi |
|---|---|
| **Kullanıcı adı** | `eren` |
| **Pilot şifre** | `0000` (ilk girişte değiştirmen önerilir) |
| **Sistem rolü** | `fabrika_mudur` |
| **Şube atama** | Fabrika (#24) |
| **URL** | https://dospresso.app (veya pilot URL'i) |

### Ana Sayfaların
- **`/fabrika/dashboard`** — Komuta Merkezi (sabah ilk açacağın sayfa)
- **`/fabrika/kiosk`** — Üretim takip kiosku (operatörler için, sen de görebilirsin)
- **`/fabrika/uretim-plan`** — Bugünkü üretim planı detay sayfası

---

## 2. Komuta Merkezi — Senin 10 Widget'lı Dashboard'un

Pilot Day-1 sabahı `/fabrika/dashboard` açtığında **5 ana widget** açık karşılayacak:

| Widget | Ne gösterir |
|---|---|
| **Bugünkü Üretim** (factory_production) | Bugün yapılması planlanan ürünler + ne kadar tamamlandı (yüzde) |
| **Bugünün Görevleri** (todays_tasks) | Üretim listesi, sıraya göre |
| **Kalite Kontrol** (qc_stats) | Bugün test edilen ürün sayısı, fire oranı, kalite skoru |
| **Bekleyen Sevkiyatlar** (pending_shipments) | Pilot 4 şubeye giden bugünkü siparişler |
| **Ekipman Arızaları** (equipment_faults) | Aktif arıza varsa burada uyarı çıkar |

Aşağıda **5 ek widget** kapalı durumda — istediğin zaman aç:
- Ekipman bakım takvimi (equipment_maintenance)
- Personel sayımı (staff_count)
- Finansal özet (financial_overview)
- AI brifing (ai_briefing — Mr. Dobody'nin sabah özeti)
- Hızlı aksiyon (quick_actions)

---

## 3. Üretim Planı Sistemi — Excel YOK, Hepsi Sistem İçinde

**Önemli:** Eskiden Excel'den okuduğumuz üretim planları **artık sistemin içinde**. `factory_production_plans` tablosunda gün gün, ürün ürün liste tutuluyor.

### Pilot Day-1 Öncesi Hazırlık (3 May Cmt'ye kadar)
1. **5–18 Mayıs için 2 haftalık üretim planı sisteme girilmiş olmalı.** Senin veya Aslan'ın `/fabrika/uretim-plan` sayfasından her gün için planlanan ürünleri girmesi lazım.
2. **Mevcut reçete malzemeleri kontrol et.** Sema brief'inde de var: 13 reçete (id 2-13, 16) **şu an malzeme listesi BOŞ**. Sema veya RGM bu reçeteleri doldurmadan operatör fabrikada üretim yapamaz.

### Operatörün Görüntüsü (Kiosk)
Fabrika kioskunda bir operatör reçeteyi başlattığında:
- Bugünkü plan listesinden ürün seçer
- **Faz bazlı ilerleme:** Hazırlık → Üretim → Temizlik (3 ana faz, butonla geçer)
- ⚠️ **Reçete adımları kart-kart DEĞİL.** Sistem operatöre "Adım 1/9 → 2/9" gibi göstermiyor; malzeme listesi MRP panelden geliyor, üretim sırası operatörün deneyimine bağlı
- Üretim sonunda toplam miktar + fire kayıt edilir (`logProductionMutation`)

**Bu pilot için yeterli.** Adım bazlı reçete takibi R-6 (pilot sonrası) sprintinde planlanıyor.

---

## 4. Personel ve Kiosk Girişi

### Fabrika Aktif Personel (10 PIN)
Sistemde 10 aktif fabrika personeli (PIN destekli kiosk girişi) var. Kim olduğunu kontrol et:
- Kullanıcı adları + roller `/admin/users` sayfasından görünür (sadece admin görebilir, sen göremeyebilirsin)
- Sema (Gıda Mühendisi + RGM)
- Ümit Şef (sef rolü) ve Ümit Pasta Ustası (uretim_sefi rolü) — ⚠️ İkisi gerçekten ayrı rol, aynı kişi (Ümit Usta) iki rol yapıyor

### PIN Sistemi
- 4 haneli PIN (default 0000, herkes değiştirmeli)
- `factory_staff_pins` tablosu
- Operatör kiosk'a girer → PIN'i çevirir → günün üretim planını görür

### ⚠️ PIN Sıfırlama (Pilot Day-1 Risk)
Eğer bir operatör PIN'ini unutursa **ŞU AN sistemde admin için sıfırlama butonu yok** (Aslan veya admin DB'den manuel günceller). Bu Pilot Day-1 öncesi kapatılacak (#237 sprint'i — admin panelinde tek tıkla PIN reset).

Pilot 5 Mayıs öncesi #237 hazır olmazsa: **PIN unutan operatörü Aslan'a yönlendir**, manuel reset.

---

## 5. Pilot Day-1 Sabahı — Senin Rutinin

### 08:30 — Sistem Açılışı Önce
1. Kahveni hazırla ☕
2. `eren` hesabıyla giriş yap → `/fabrika/dashboard`
3. Komuta Merkezi'nin 5 ana widget'ı dolu mu kontrol et:
   - Bugünkü üretim planı görünüyor mu?
   - Görev listesi hazır mı?
   - Bekleyen sevkiyatlar var mı?

### 09:00 — Pilot Başlangıç
1. **Operatörlere kiosk login bildir** — herkes PIN'iyle giriş yapsın
2. **İlk üretim faz değişikliklerini izle** — kiosk üzerinden senin dashboard'una akar
3. Sema veya Aslan'dan herhangi bir uyarı geldi mi (`/iletisim` mesajları)

### 12:00 — Öğle Kontrolü
1. Üretim planı yüzdesi nasıl gidiyor? (Bugünün yarısında %50 hedef)
2. Fire oranı normalin üzerinde mi (qc_stats widget)
3. Bekleyen sevkiyatlar Lara ve Işıklar'a gitmiş mi (pending_shipments)

### 17:00 — Vardiya Sonu
1. Operatörler kiosk'tan çıkış yapar
2. **Vardiya özeti** otomatik oluşur (factory-scoring-service.ts günlük skor hesaplar)
3. ⚠️ "Tek tuşla gün sonu PDF" şu an YOK. Vardiya özetini ekrandan oku, gerekirse screenshot al

### Akşam — Aslan'a Günlük Özet
Pilot ilk haftası her akşam Aslan'a kısa WhatsApp:
- Bugün üretim hedefini tutturduk mu
- Sevkiyat zamanında çıktı mı
- Şikayet/sorun var mı

---

## 6. Eskalasyon — Sorun Çıktığında

### Üretim Sorunu
| Durum | Aksiyon |
|---|---|
| Ekipman arıza | equipment_faults widget'ında kayıt aç → Murat'a (IT) WhatsApp atla |
| Reçete malzemesi yok / yanlış | Sema veya RGM'e ulaş (alerjen/besin) → Samet'e (satınalma) ulaş (hammadde) |
| Hammadde stok azaldı | Samet'i ara — hammadde fiyat ve stok onun alanı |
| Kalite şikayeti | Sema veya Utku (CGO + Kalite Kontrol) — şikayet onayı Utku'da |

### Sistem Sorunu
| Durum | Aksiyon |
|---|---|
| Kiosk login olmuyor | Aslan'a WhatsApp (admin) — şifre/PIN reset |
| Sayfa hata veriyor (500) | `/iletisim` → "Yeni teknik talep" → Murat (IT) atanır |
| Üretim planı eksik | Aslan veya Sema'ya bildirim yap |
| Sevkiyat veri yanlış | Mahmut (HR/Muhasebe) — fatura işi |

### Acil Durum
1. Aslan'ı ara (telefon, sistem dışı)
2. Operatörlere "kağıda yazın" de
3. Sistem geri gelince Mahmut PDKS Excel'den manuel girebilir (fallback hâlâ aktif)

---

## 7. Pilot Sonrası — Day-30 ve Sonrası

Pilot başarılı geçerse (5 May–4 Haz):
- 12 May Antalya bölgesi şubeleri açılır → Mallof, Markantalya, Beachpark hammadde sevkiyatları başlar
- 19 May Gaziantep, 26 May Konya/Samsun
- Senin scope'un büyür: 4 şubeye sevkiyat → 8 → 15 → 20
- Reçete adım bazlı takip UI'ı (R-6) hazır olur — operatör kart-kart üretim yapabilir

---

## 8. Sıkça Sorulan Sorular

**S: Operatör reçetede yanlış yaparsa ne olur?**
C: Üretim sonu fire oranı yüksek çıkar, qc_stats widget'ında kırmızı görünür. Sema veya RGM ile konuşup reçete adımlarını kontrol et.

**S: Bugünün üretim planını ben mi giriyorum?**
C: Hayır — pilot için Aslan veya Sema baştan girer (5–18 May 2 haftalık plan). Sen sadece kontrol edip onaylıyorsun. Pilot sonrası Day-1 sonrası rutinde sen de planlama yaparsın.

**S: Şubeden gelen sipariş otomatik mi geliyor?**
C: Evet — şube sayfasından sipariş açıldığında "Bekleyen Sevkiyatlar" widget'ına düşer. Sen onaylar, sevkiyat hazırlanır.

**S: Lara franchise olduğu için fatura keseceğim, Işıklar'a internal transfer mi?**
C: Evet — sistem otomatik ayırır. Lara siparişi → "satış" kaydı → fatura kesilir. Işıklar siparişi → "internal transfer" → maliyet hesaplanır, fatura YOK.

**S: Mahmut'a PDKS Excel hâlâ atayım mı?**
C: Hayır — kiosk verisi otomatik gidiyor `monthly_payroll` tablosuna, scheduler ayın 1'i 04:00 hesaplar. Excel sadece kiosk arıza olursa fallback.

---

## 9. İletişim — Pilot Süresince

| Kişi | Rol | Ne için |
|---|---|---|
| **Aslan** | CEO + admin | Sistem hatası, üretim planı kararı, acil |
| **Sema** | Gıda Müh. + RGM | Reçete, alerjen, besin, kalite |
| **Samet** | Satınalma | Hammadde fiyat, tedarikçi sorgu, stok |
| **Mahmut** | İK + Muhasebe | PDKS, payroll, fatura |
| **Utku** | CGO + Kalite | Şikayet onay, çapraz kalite |
| **Yavuz** | Franchise Koçu | Şube koordinasyonu (Işıklar/Lara) |
| **Murat** | IT | Teknik altyapı, sayfa hatası |
| **Ümit** | Şef + Pasta Ustası | Reçete uygulama, fabrika el işi |

---

## 10. Brief Onayı

Bu paketi okudun mu, anladın mı?
- [ ] Sistem rolüm ve yetkilerim net (`fabrika_mudur`, Fabrika #24)
- [ ] Komuta Merkezi'nde 5 ana widget'ı tanıdım
- [ ] Üretim planı Excel'de değil, sistem içinde — biliyorum
- [ ] Faz bazlı üretim takibi (3 faz, adım bazlı değil) — biliyorum
- [ ] PIN sıfırlama bilgisi (#237 hazır değilse Aslan'a yönlendir)
- [ ] Pilot Day-1 sabahı 08:30'da sistemde olacağım

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

## EK: Aslan'dan Eren'e Mesaj

Eren, sen pilot Day-1'in **operasyonel kalbi**sin. Fabrika düzgün çalışmazsa Lara'ya zamanında ürün gitmez, Işıklar müşteriye servis edemez. Bu yüzden sabah 08:30'da hazır olman, sistem widget'larını okur okumaz aksiyonu başlatman çok önemli.

Bilgisayar veya mobil herhangi bir yerde takılırsan Mr. Dobody'ye sor (sağ alt sohbet) — DB'den anlık çekiyor. Sorun büyürse hemen beni ara, sistem dışı çözeriz.

Sağol, pilot başarılı geçecek. ☕

— Aslan
