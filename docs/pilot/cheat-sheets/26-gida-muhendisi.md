# DOSPRESSO Cheat Sheet — Gıda Mühendisi

**Hedef Kullanıcı**: Gıda Mühendisi (gida_muhendisi) — HACCP, gıda güvenliği, alerjen, beslenme değerleri sorumlusu
**Cihaz**: Fabrika ofisi bilgisayarı (asıl) + fabrika kiosk tabletleri (kalite kontrol)
**Erişim**: Reçete okuma, beslenme/alerjen tablosu, kalite spec + verification, HACCP denetim

---

## 1. Gıda Mühendisi (GM) Nedir?

Sen DOSPRESSO'nun **gıda güvenliği tek başı**sın. Her reçetede:
- Alerjen beyanı
- Beslenme değerleri (kalori, protein, yağ, karbonhidrat)
- HACCP uyumu
- Yasal uyum (Türk Gıda Kodeksi)

senin sorumluluğunda. Reçete Gıda Mühendisi (RGM) reçete içeriği kararı verir, **sen gıda güvenliği + yasal uyumu denetler + onaylarsın.**

**Kendini şöyle düşün:** RGM "bu reçete" der, sen "bu reçete tüketiciye güvenli + yasal" dersin.

---

## 2. Login Adımları

1. Fabrika ofisinde bilgisayar aç
2. Tarayıcı → sistem aç
3. Kullanıcı adı: `sema`
4. Parola: SMS/WhatsApp
5. "Giriş Yap" → Gıda Güvenliği Paneli açılır

Kiosk tabletlerine bak, test için giriş yap (kiosk şifresi ayrı).

---

## 3. Ana Ekran (Gıda Güvenliği Paneli)

| Widget | İçerik |
|---|---|
| **Onay Bekleyen Reçete** | RGM'nin gönderdiği, senin onayını bekleyen reçeteler |
| **HACCP Durumu** | Günlük sıcaklık/nem kontrolleri, sapma var mı |
| **Alerjen Tablosu** | Tüm ürünlerin alerjen listesi (süt, yumurta, gluten, fındık vb.) |
| **Beslenme Değerleri** | Kalori/makro bilgileri + etiket hazırlığı |
| **Kalite Spec Sapma** | Batch'lerde spec dışı ölçümler (fire sebepleri) |
| **Denetim Raporu** | Kalite Kontrol (Ümran)'dan gelen şube denetim sonuçları |

---

## 4. Günlük Akış

**09:00 — Açılış**
1. Panel aç, gece vardiyası HACCP değerleri oku (sıcaklık anomali var mı?)
2. Onay Bekleyen reçete var mı? → Her biri için 15-30 dk inceleme
3. Dün batch'lerinde kalite sapma kayıtları incele

**Saat Başı**
- Fabrika HACCP otomatik ölçümleri (sıcaklık, nem) kontrol et
- Alarm varsa anında Eren (Fabrika Müdürü)'e haber ver

**14:00 — Öğle Sonrası**
- Pilot süresince: öğle sonrası kısa fabrika turu (gözle denetim)
- Herhangi bir nokta kiosk'a değil, Cowork DM ile Eren'e bildir

**17:00 — Gün Sonu**
1. Günün HACCP raporu onayla (sistem otomatik üretir, sen imzalarsın)
2. Onay bekleyen reçete kaldı mı? → RGM'ye ertelemeli yanıt ver
3. Haftalık denetim raporu hazırlığı (her Cuma akşamı)

---

## 5. Sık Kullanılan İşlemler

### Reçete Onayı (Asıl İşin)
1. Sidebar → "Reçeteler" → "Onay Bekleyen"
2. Reçete kartı aç — RGM açıklaması + hammadde listesi + adımlar
3. **3 Kontrol Noktası:**
   - **Alerjen:** Yeni hammadde alerjen içeriyor mu? → `factory_ingredient_nutrition` güncelle
   - **Beslenme:** Kalori/makro doğru hesaplanmış mı?
   - **HACCP:** Kritik kontrol noktası var mı? (Örn. pişirme sıcaklığı 75°C)
4. OK ise "Onayla" → Reçete üretime girebilir
5. Sorun varsa "Geri Gönder" + not yaz (RGM'ye)

### Alerjen Güncelleme (Yeni Hammadde Girdiğinde)
1. Samet yeni hammadde sipariş etti → Sidebar "Hammadde" → "Yeni"
2. Hammadde kartı aç, "Alerjen" sekmesine git
3. Tablodan işaretle: Süt, Yumurta, Gluten, Soya, Fındık, Badem vb.
4. Kaydet → Otomatik tüm reçetelere alerjen etkisi yansır

### HACCP Sapması Tespit
1. Widget "HACCP Durumu" kırmızıysa tıkla
2. Detay aç: hangi istasyon, hangi saat, hangi değer?
3. Eren'e Cowork DM: "X istasyonunda 82°C yerine 68°C gördüm, batch durdurulmalı"
4. Eren batch durdurma kararı verir, sen HACCP denetim raporuna düşer

### Beslenme Etiketi
1. Pilot için gerekli olmayabilir (ürün ambalaj yok)
2. Pilot sonrası: Marketing (Diana) senden beslenme değerlerini ister
3. Sidebar → "Beslenme" → Ürün seç → PDF etiket çıktısı

---

## 6. Acil Durum

🚨 **ACİL DURUM**
- Yangın: **110** | Sağlık: **112**
- Gıda zehirlenmesi şüphesi / HACCP KRİTİK ihlal:
  - Eren (Fabrika Müdürü) + Aslan (CEO/RGM) acil Cowork
  - Üretim durdurma yetkisi sende + Eren'de ortak
  - Şube yayılım riski → Yavuz (Coach) tüm şubelere bildirim
- Alerjen karışması → Geri çağırma protokolü (pilot sonrası yazılacak)

📱 **Pilot İletişim**
- WhatsApp Pilot Grubu: "DOSPRESSO Pilot — Fabrika"
- Cowork: Eren (Fabrika Müdürü), Aslan (RGM/CEO), Ümran (Kalite Kontrol)
- Mr. Dobody otomatik uyarı sistemi (karşılıklı sohbet değil)

---

## 7. Kritik Kurallar

❌ **YAPMA:**
- Reçete kontrol etmeden onay verme (hızlı onay = gıda zehirlenmesi riski)
- Alerjen tablosunu "boş" bırakma — her hammadde mutlaka işaretli olmalı
- HACCP sapması gördüğünde "idare eder" deme → Anında bildir
- Pilot süresince yeni etiket/ambalaj kararı alma (pilot sonrası iş)

✅ **YAP:**
- Her reçete onayında 3 kontrol: Alerjen + Beslenme + HACCP
- Günlük fabrika turu (en az 1 kez, öğle sonrası)
- Ümran (Kalite) ile haftalık koordinasyon (şube denetim sonuçları)
- Yeni hammadde = zorunlu alerjen analizi (ilk satın alma günü)

---

## 8. Pilot İlk Hafta (28 Nis - 4 May)

**Pilot için özel kurallar:**
- Yeni reçete yayınlamaya "anında değil" tavrı — RGM (Aslan)'a "önce pilot bitsin" de
- Günlük HACCP raporu Aslan'a Cowork DM ile özet gönder (akşam 17:30)
- Alerjen tablosu pilot öncesi %100 dolu olmalı (eksik varsa 26 Nis Cumartesi'ye kadar tamamla)
- Pilot 4 lokasyona her gün 1 kez sistemden rapor bak (uzaktan gözlem)

**İlk Hafta Görevlerin:**
- Gün 1: HACCP bazal ölçüm + HQ rapor
- Gün 2-3: Batch kalite sapması < %2 hedefi
- Gün 4-5: Alerjen tablosu %100 eksiksizlik kontrol
- Gün 6-7: Haftalık denetim raporu (Cuma 17:00)

---

## 9. Ekip Koordinasyonu

**Ana partner kişilerin:**
- **Eren (Fabrika Müdürü):** Günlük operasyon + HACCP uygulama
- **Aslan (RGM/CEO):** Reçete içerik kararı + strateji
- **Ümran (Kalite Kontrol):** Şube denetimleri + müşteri şikâyetleri
- **Samet (Satınalma):** Yeni hammadde alerjen bilgisi

**Haftalık toplantı:** Cuma 15:00 — Eren + Ümran + Sen (45 dk)
Konu: Haftalık HACCP özet + kalite iyileştirme noktaları

---

## 10. İlk Gün Checklist (Pilot Öncesi)

- [ ] Panel açılıyor mu, widget'lar yükleniyor mu?
- [ ] Alerjen tablosu eksiksiz mi? (Her hammaddede en az 1 işaret var mı? "Yok" bile işaretli olmalı)
- [ ] Son 30 gün HACCP raporu hazır mı?
- [ ] Eren + Aslan + Ümran ile Cowork DM açtım mı?
- [ ] WhatsApp Pilot "Fabrika" grubuna eklendim mi?
- [ ] Acil durum protokolü okudum mu? (Bu cheat-sheet + HACCP manual)
- [ ] Tek başına sorumluluğum olan 2 konuyu biliyor muyum? (HACCP + Alerjen)

---

**Belge:** docs/pilot/cheat-sheets/26-gida-muhendisi.md
**Sürüm:** v1.0 · 21 Nis 2026
