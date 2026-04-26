# Sema Brief — DOSPRESSO Pilot Gıda Mühendisliği İş Paketi

**Pilot başlangıç:** 5 Mayıs 2026 Pazartesi 09:00
**Brief deadline:** 2 Mayıs 2026 Cuma 18:00 (pilot Day-1 öncesi tüm reçetelerin onaylı olması için)
**Senin rolün:** Gıda Mühendisi + Reçete Gıda Mühendisi — pilot reçetelerinin alerjen/besin/kalite bütünlüğünden sorumlu

---

## Merhaba Sema,

Pilot 10 gün uzakta. DOSPRESSO platform'unun gıda güvenliği ve etiketleme tarafındaki tüm sorumluluk senin alanında. Bu doküman, 5 Mayıs Pazartesi pilot başlamadan önce **bu hafta** halledilmesi gereken işleri net listelemek için. Profesyonel uzmanlığına güveniyorum — bu bir talimat listesi değil, koordinasyon paketi.

---

## 1. Sistem Erişimin: 2 Hesap, 1 Fark

Pilot başında **iki ayrı hesabın** aktif:

| Hesap | Rol | Yetki kapsamı |
|---|---|---|
| `sema` | Gıda Mühendisi (`gida_muhendisi`) | Alerjen onayı, besin değer onayı, kalite kontrol, denetim |
| `RGM` | Reçete Gıda Mühendisi (`recete_gm`) | Yukarıdakilerin **hepsi** + **Keyblend gizli reçete erişimi** |

**Pratik:** İki hesap arasındaki **tek somut fark Keyblend gizli reçeteler.** Diğer her şey (alerjen, besin, kalite, denetim) iki hesapta da aynı. Yani:

- Keyblend (Cinnabon icing, gizli sos, vs.) ile çalışacaksan **RGM hesabı kullan**
- Diğer her iş için ikisi de eşit — alıştığın hesabı kullanabilirsin

**R-6'da konsolide edilecek:** Pilot sonrası iki hesap birleştirilecek (Aslan onaylı), ama pilot süresince mevcut yapı kalsın. Karışıklık olmaması için kayıtlarda kim hangi hesapla giriş yaptıysa belli olacak.

---

## 2. Bu Hafta Yapılacak İş — Toplam 25 Reçete

İki paket halinde:

### Paket A: 12 Reçete — Alerjen + Besin Doldurma (öncelikli)

Bu reçeteler **şu an aktif** (id 2-12, 16) ama besin değer ve alerjen verileri eksik. Pilot Day-1'de etikette/QR'da yanlış veya eksik bilgi olmaması için **2 Mayıs Cuma'ya kadar tamamlanmalı**.

**Erişim:** `/kalite/besin-onay` (Bekleyenler sekmesi) — auto-pattern tahminleri burada listeli, sen onaylıyorsun.

**Akış:**
1. Bekleyenler listesinde her ingredient için sistemin önerdiği auto-pattern tahminini gör
2. Doğruysa onayla, yanlışsa düzelt
3. Onaylananlar ana pool'a gider, etikette/QR'da görünür

**Sayılar:** 54 hammadde auto-pattern ile tahmin edilmiş, 57 hammadde tamamen boş (manuel doldurman gerek). Pilot Day-1 için 12 aktif reçeteyi kapsayan hammaddeler kritik öncelik.

### Paket B: 13 Reçete — Malzeme Listesi Tamamlama (BONUS bulgu)

Pilot script'lerini kontrol ederken keşfedilen sorun: **13 aktif reçete (id 2-13, 16) boş — malzeme listesi yok.** Yani UI'da görünüyorlar ama içeriksizler.

Bu reçeteler şunlar: pilot menüsündeki ana ürünler. Sema veya RGM'den biri bunları doldurmalı.

**Erişim:** `/fabrika/recete/{id}/duzenle` her reçete için tek tek
- "Malzemeler" kartında "Yeni Malzeme Ekle" butonu
- Toplu içe aktarma istersen: "CSV İçe Aktar" (Replit'in bulk import işlevi var)

**Öneri:**
1. Önce hangi 13 reçetenin boş olduğunu listele (ben sana ID listesini ileteceğim)
2. Reçete defterinden veya Excel'den toplu CSV hazırlat
3. CSV import + ardından "Tüm Malzemelere Alerjen Tahmini Çalıştır" — sistem otomatik öneri verir

**⚠️ Önemli:** Reçeteler boş olduğu sürece pilot Day-1'de fabrika personeli üretim yapamaz (reçete malzeme listesi olmadan üretim başlamaz). Bu yüzden Paket B aslında Paket A'dan **daha öncelikli** olabilir — sen değerlendir.

---

## 3. Keyblend Reçeteler — RGM Hesabıyla

Pilot menüsünde keyblend (gizli formül) içeren ürünler varsa, bunlar **sadece RGM hesabınla** görünür ve düzenlenebilir. Diğer kullanıcılar (admin dahil) keyblend verisini ham/açık formatta göremez — sadece "Keyblend uygulandı" rozeti görür.

**Bilinen keyblend ürünler:**
- (Liste Replit'e sorulduğunda netleşecek — Cinnabon icing seed verilerinde olabilir, doğrulayacağız)

**Pratik:** Aslan veya Mahmut bile keyblend ham formülünü göremez. Bu **tasarım gereği**, formüllerin ticari sırrı koruma altında. Sen ve RGM (yani sen) tek erişen kişisin.

---

## 4. Pilot Day-1 Sabahı — Senin Rutinin

### Sabah (09:00 öncesi)
1. `sema` veya `RGM` hesabıyla giriş yap (Keyblend dokunacaksan RGM)
2. **Ana sayfa kontrol et:**
   - Bekleyen besin onayı var mı? (auto-pattern yeni hammadde gelmiş olabilir)
   - Bekleyen alerjen onayı var mı?
3. Pilot 4 şubenin (Işıklar, Lara, HQ, Fabrika) **bugünkü üretim planını** gör (Fabrika sayfası → "Bugünkü Üretim")

### Gün İçi
- Yeni reçete eklenirse veya değiştirilirse **otomatik bildirim** geliyor (`/iletisim` veya sağ üst zil)
- Sema'nın onayı gerekmedikçe sistem onay bekletmez (auto-approve admin/CGO için, ama besin/alerjen değişiklikleri her zaman GM onayına düşer)

### Akşam
- O gün üretilen ürünlerin **kalite raporu** kontrol et: `/kalite/uretim-rapor` (eğer ek bir kalite olayı varsa)

### Eskalasyon
| Durum | Aksiyon |
|---|---|
| Bir hammaddeye alerjen tahminim doğru mu emin değilim | Üretici fişine bak veya tedarikçiyi ara (Samet'le koordine) |
| Reçete malzemesi sistemde yok | Yeni hammadde aç (`/fabrika/hammaddeler` → "Yeni Hammadde") |
| Maliyet hesaplama yanlış görünüyor | Mahmut'a (HR/Muhasebe) WhatsApp veya admin'e (Aslan) |
| Keyblend formülde değişiklik gerekiyor | RGM hesabıyla `/fabrika/recete/{id}/duzenle` → "Keyblend" sekmesi |

---

## 5. Maliyet Onay Akışı — Senin Sorumluluğun Değil Ama Bilmen Lazım

Reçete maliyeti yeniden hesaplandığında:
- **Mahmut** veya **admin (Aslan)** maliyet onayını verir
- Sen sadece **besin değer + alerjen** onaylarsın
- Maliyet ile ilgili sorgulama gelirse "Mahmut'a yönlendir" diyebilirsin

**Pratik fark:**
| Onay türü | Kim onaylar? |
|---|---|
| Alerjen | Sen (sema veya RGM) |
| Besin değer | Sen (sema veya RGM) |
| Reçete versiyon kilidi | RGM (sen) veya admin |
| Maliyet | Mahmut veya admin |
| Kalite/üretim | Sen + Utku (CGO) ortaklaşa |

---

## 6. Kalite Kontrol — Sen ve Utku Ortaklaşa

Şu an Ümran ayrıldığı için kalite kontrol formal sahibi **Utku (CGO)**. Ama **gerçek kalite işi (gıda güvenliği, üretim hattı denetimi, alerjen kontrolü)** senin uzmanlık alanında.

**İş bölümü önerisi (sen + Utku koordine edersiniz):**
- **Senin alanın:** Gıda kimyası, alerjen, besin, üretim hattı kalite kontrol, mikrobiyal güvenlik
- **Utku'nun alanı:** Müşteri şikayet onayı, denetim checklist düzenleme, çapraz şube kalite karşılaştırma

Birbirinin alanına girmeniz gereken durumlar olur — WhatsApp koordinasyon yeter.

---

## 7. Bilinen Sistem Boşlukları (Pilot Day-1 İçin)

Sana sürpriz olmasın diye:

1. **Hammadde fiyat verileri eksik** — Samet bu hafta dolduracak. Sen sadece **alerjen ve besin değerine** odaklan.
2. **Coverage %22** — şu an reçete maliyet kapsamı çok düşük (R-5B sprint sonucu). Pilot Day-1'de "Maliyet hesapla" butonuna basarsan turuncu uyarı görürsün — bu normal, Samet'in işi.
3. **Manuel besin değer giriş** — auto-pattern tahminlerini Replit yeni geliştirdi (#227 sprint'i), sen Pazartesi'ye kadar bu özelliği test edip hata varsa bana ilet.

---

## 8. Sıkça Sorulan Sorular

**S: 12 reçeteyi 6 günde bitiremezsem ne olur?**
C: Pilot Day-1 etiketinde eksik bilgi olur. Önemli olan: **5 Mayıs sabahı 09:00'da pilot 4 şubede satılan ürünlerin etikette doğru alerjen göstermesi**. Bunu garanti et, kalan reçeteler pilot süresince tamamlanabilir.

**S: 13 boş reçete kim doldurmalı, sen mi RGM mi?**
C: Keyblend yoksa fark etmez, ikisinden biriyle yapabilirsin. Ama **tek hesapla yapman temizlik açısından iyi** — kim doldurduysa kayıtta belli olsun.

**S: Auto-pattern tahmini yanlış geliyor, ne yapayım?**
C: Tahmini reddet, doğrusunu manuel gir. Replit auto-pattern algoritmasını öğreniyor — yanlış tahmin sayısı azaldıkça sistem öğrenir.

**S: Bir hammaddenin alerjen profilini bilmiyorum.**
C: Üretici teknik fişine bak veya tedarikçiyi ara (Samet'le koordine). Sistem "bilmiyorum" girişi kabul etmez — boş bırakırsan etikette o ürün için "alerjen bilgisi alınmamıştır" notu çıkar (yasal sorun).

**S: Pilot başında stres olur mu?**
C: Olmayacak — sistem sağlam, R-5 sprint'iyle tüm besin/alerjen/maliyet altyapısı stabil. Sen sadece veriyi doğru gir, sistem etiketi otomatik oluşturur.

---

## 9. İletişim — Pilot Süresince

| Kişi | Rol | Ne için iletişim |
|---|---|---|
| **Aslan** | CEO + admin | Sistem hatası, scope kararı |
| **Mahmut** | İK + Muhasebe | Maliyet onayı, payroll soruları |
| **Samet** | Satınalma | Hammadde fiyat, tedarikçi sorgu |
| **Utku** | CGO + Kalite | Şikayet onayı, çapraz kalite |
| **Eren** | Fabrika Müdürü | Üretim hattı, kapasite |
| **Ümit** | Şef + Pasta Ustası | Reçete uygulama soruları |
| **Yavuz** | Franchise Koçu | Şube operasyon koordinasyonu |
| **Murat** | IT | Teknik altyapı, sayfa hatası |

---

## 10. Brief Onayı

Bu paketi okudun mu, anladın mı?
- [ ] 2 hesap (sema + RGM) farkı net — sadece keyblend RGM özel
- [ ] 12 reçete besin+alerjen, 13 reçete malzeme listesi → 2 May Cuma deadline
- [ ] Maliyet onay benim alanım değil (Mahmut/admin)
- [ ] Kalite kontrol Utku ile ortaklaşa
- [ ] Pilot Day-1 sabahı 08:30'da sistemde olacağım

**İmza / Onay:** _________________ **Tarih:** _________________

---

## Notlar (Pilot süresince ekleyeceğin)

```
[Tarih]: [Reçete/Hammadde] → [Aksiyon] → [Sonuç]
```

---

**Hazırlayan:** Aslan + DOSPRESSO IT
**Versiyon:** 1.0 (26 Nisan 2026)
**Sonraki revizyon:** Pilot Day-7 sonrası (12 Mayıs) gerçek kullanım deneyimine göre

---

## EK: Aslan'dan Sema'ya Mesaj

Sema, bu pilot benim için kritik. Senin uzmanlığın olmadan bu sistem çalışmaz — alerjen/besin verisi pilot Day-1'de etikette eksik veya yanlış olursa hem yasal sorun, hem müşteri güveni problemi. Bu yüzden 2 Mayıs Cuma deadline'ı kesin.

Eğer 12 reçete + 13 boş reçete tamamı için süre yetmezse, **öncelik sırası** belirle ve bana ilet. Pilot 4 şubenin **Day-1 menüsünde olan ürünleri** öncelikli yap. Diğerleri Day-7'ye kadar tamamlanabilir.

Sorularını cebimden anlık cevaplarım. Sistem üzerinde takıldığın yerleri Mr. Dobody'ye sor (sağ alt sohbet butonu) — DB'den anlık çekiyor.

Sağol, kolay gelsin. ☕

— Aslan
