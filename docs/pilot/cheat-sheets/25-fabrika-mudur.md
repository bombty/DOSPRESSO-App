# DOSPRESSO Cheat Sheet — Fabrika Müdürü

**Hedef Kullanıcı**: Fabrika Müdürü (fabrika_mudur) — üretim hattı, vardiya, batch, kalite, HACCP sorumlusu
**Cihaz**: Fabrika ofisi bilgisayarı (asıl) + fabrika kiosk tabletleri (denetim)
**Erişim**: Tüm fabrika modülleri (51 tablo), üretim planı, kalite, reçete okuma, stok

---

## 1. Fabrika Müdürü Nedir?

Sen DOSPRESSO fabrikasının **günlük operasyon başısın**. 22 şubeye mamul yetiştirmek + kalite tutarlılığı + personel güvenliği senin sorumluluğunda.

**Günün 3 asıl alanı:**
1. **Üretim** — Günlük hedef, batch planı, stok yeterliliği
2. **Ekip** — Vardiya dağılımı, worker scoring, izin/rapor
3. **Kalite** — HACCP uyumu, batch verification, fire takibi

Şef ve Reçete Gıda Mühendisi (RGM) ile birlikte çalışırsın ama **günlük üretim kararı senindir.**

---

## 2. Login Adımları

1. Fabrika ofisinde bilgisayar aç
2. Tarayıcı → sistem aç
3. Kullanıcı adı: `eren`
4. Parola: SMS/WhatsApp
5. "Giriş Yap" → Fabrika Kumanda Paneli açılır

Fabrika kioskuna bakmak istersen tablete git, kendi PIN'inle giriş yap (kiosk şifresi ayrı).

---

## 3. Ana Ekran (Fabrika Kumanda)

| Widget | İçerik |
|---|---|
| **Günün Üretim Planı** | 4 vardiya × istasyon hedef tablosu |
| **Aktif Vardiya** | Şu an çalışanlar (canlı, kiosk bağlantılı) |
| **Batch Durumu** | Açık batch, onay bekleyen, tamamlanan |
| **Kalite Alarmları** | HACCP + spec sapma uyarıları (kırmızı) |
| **Stok Uyarısı** | Kritik hammadde + ambalaj (Samet'e ileti) |
| **Worker Skorları** | Günlük sıralama |
| **Fire + Artık** | Günlük kayıp metre |

---

## 4. Günlük Akış (Tipik İş Günü)

**08:00 — Gün Başlangıcı**
1. Kumanda paneli aç, dün özet oku
2. Fabrika kiosk vardiya başlangıcı kontrol et (gece vardiyası bitti mi?)
3. Günün hedef tablosunu ekiple paylaş (sözlü brifing 5 dk)
4. Reçete + batch spec'leri onayla (yeni sürüm varsa)

**Saat Başı**
- Stok + fire + kalite sayfasına göz at
- Ekip skor (kiosk'tan) anormal bir şey var mı?
- Dobody "günlük özet" bildirimi → önemli noktalar

**12:00-14:00 — Öğle Vardiya Değişimi**
- Vardiya giriş/çıkış doğru mu (kiosk raporu)
- Fiili üretim vs planlanan farkı incele

**17:00 — Gün Sonu**
1. Günün üretim raporu onayla (sistem otomatik üretir)
2. Fire sebeplerini işaretle (waste_reasons)
3. Yarınki plan taslağı oluştur
4. Kritik durumları CGO'ya Cowork ile bildir

---

## 5. Sık Kullanılan İşlemler

### Batch Onayı (Günde 5-10 kez)
1. Sidebar → "Üretim" → "Batch" → Onay Bekleyen
2. Kart aç: reçete sürümü, malzeme çekişi, spec değerleri
3. Kalite verification (Sema'dan gelen) kontrol et
4. ONAYLA → Batch çalışmaya başlar
5. Şüphelisin varsa: Sema (GM) ile görüş, sonra onayla/ret

### Vardiya Planı (Haftalık — Pazar akşamı)
1. Sidebar → "Vardiya" → "Plan" → Yeni Hafta
2. 4 vardiya (06-14, 14-22, 22-06, gündüz) × 7 gün × istasyon
3. Coach (yavuz) ile koordinasyon et (şubeye gönderilecek ekip var mı?)
4. Kaydet → Kioska otomatik yüklenir

### Stok Kritik Uyarı → Sipariş
1. Widget "Kritik Stok" açılıyorsa
2. Satınalma (Samet) otomatik bildirim aldı, kontrol et
3. Acil mi? → Samet'e Cowork DM veya WhatsApp Pilot grubuna yaz

### Fire / Kayıp Kayıt
1. Üretim sonrası operatör sisteme girişi yapmış
2. Sidebar → "Fire" → Günlük
3. Sebep kategorisi (hammadde/ekipman/insan) onayla
4. Anormal patern varsa ekiple "ne oldu?" konuş

---

## 6. Acil Durum

🚨 **ACİL DURUM**
- Yangın: **110** | Sağlık: **112**
- Gıda güvenliği ihlali (HACCP): Sema'ya Cowork acil DM + telefonla ara
- Ekipman arızası üretim durduracak boyutta: CGO'ya Cowork + WhatsApp Pilot grubu
- İşçi kazası: 112 + İSG sorumlusu (adminhq) + bildirim

📱 **Pilot İletişim**
- WhatsApp Pilot Grubu: "DOSPRESSO Pilot — Fabrika"
- Cowork: Sema (GM), Aslan (RGM), Samet (Satınalma), Yavuz (Coach)
- Mr. Dobody otomatik uyarı sistemi (karşılıklı sohbet değil)

---

## 7. Kritik Kurallar

❌ **YAPMA:**
- Sema'nın onayı olmadan üretime geçme (HACCP)
- Reçete değişikliği tek başına onaylama (RGM izni şart)
- Kalite spec değerinden sapan batch'i "idare eder" diye geçirme
- Çalışan eğitimsiz makine kullanmasın (ilk gün = kiosk quiz zorunlu)
- SKT yaklaşan hammaddeyi "dursun" deme (FIFO kural)

✅ **YAP:**
- Her batch başında kalite spec oku, ekibe hatırlat
- Günlük 3 brifing: açılış + öğle + kapanış (5 dk her biri)
- Kalite sapması anında durdurma yetkin var, kullan
- Fire oranı %5 üstüne çıkıyorsa hemen sebep araştır
- Yeni reçete pilot-1. haftada yayınlanmaz (Aslan/RGM kararı)

---

## 8. Pilot İlk Hafta (28 Nis - 4 May)

**Pilot için özel kurallar:**
- Yeni reçete yayınlama yasak (istisna: Aslan onayı)
- Yeni operatör alımı yok (mevcut ekiple)
- Gece vardiyası (22-06) personel rotasyonu yok
- Günlük brifing zorunlu (pilot deneyimi topla)
- Sorun gördüğün an Yavuz (Coach) + Aslan'a Cowork DM

**Pilot Günü Hedefleri (taslak):**
- Gün 1 (28 Nis): Sistem uyumluluk %100 ölçümü (kiosk açık mı, vardiya planı doğru mu?)
- Gün 2-3: Üretim hattı tam kapasite + kalite 0 sapma hedefi
- Gün 4-7: Worker skor analizi + iyileştirme noktaları

---

## 9. Tablet / Kiosk İpuçları

- Fabrika kioskuna sadece görsel izleme için bak, müdahale etme (gerekirse operatöre sözlü uyar)
- Kiosk tablet ekranı %100 parlaklık tutulur (üretim alanı aydınlık)
- Tablet şarj cihazı 2 tane olmalı (1 yedek — sen sorumlusun)
- Kiosk token'ı ayda 1 rotasyon (adminhq yapacak)

---

## 10. İlk Gün Checklist (Pilot Öncesi)

- [ ] Kumanda panelindeki tüm widget'lar yükleniyor mu?
- [ ] Fabrika kiosku açılıyor mu, PIN'le login olabiliyor muyum?
- [ ] Sema ile test batch onay akışı denendi mi?
- [ ] RGM (Aslan) ile reçete versiyonlama testi yapıldı mı?
- [ ] Yavuz ile vardiya planı görüşüldü mü?
- [ ] WhatsApp Pilot "Fabrika" grubuna eklendim mi?
- [ ] Cowork'te Aslan, Sema, Samet, Yavuz ile DM açtım mı?

---

**Belge:** docs/pilot/cheat-sheets/25-fabrika-mudur.md
**Sürüm:** v1.0 · 21 Nis 2026
