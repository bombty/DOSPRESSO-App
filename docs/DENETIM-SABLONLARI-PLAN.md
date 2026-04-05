# DOSPRESSO Denetim Şablonları — Kapsamlı Plan

## GENEL YAPI

Her denetim şablonu = 1 `auditTemplate` + N `auditTemplateItem`
Her item: checkbox (evet/hayır), rating (1-5), text (serbest metin), photo (fotoğraf zorunlu), number (sayısal değer — derece vs.)

### Şablon Tipleri
1. **Tam Şube Denetimi** — Tüm kategoriler tek seferde (Coach/Trainer kullanır)
2. **İstasyon Bazlı Hızlı Denetim** — Tek istasyon (Supervisor günlük kontrol)
3. **Personel Değerlendirme** — Bireysel personel denetimi
4. **Ekipman Denetimi** — Sadece cihaz/ekipman kontrolü
5. **Hijyen & Gıda Güvenliği** — HACCP odaklı denetim

### Puan Ağırlıkları (Tam Şube Denetimi)
| Kategori | Ağırlık |
|----------|---------|
| Gıda Güvenliği & Sıcaklık | %25 |
| Bar İçi İstasyonlar | %20 |
| Temizlik & Hijyen | %15 |
| Ekipman & Teknoloji | %10 |
| Depo & Stok | %10 |
| Dış Mekan & İç Mekan | %8 |
| Personel | %7 |
| Yasal Uygunluk | %5 |

---

## KATEGORİ 1: DIŞ MEKAN (exterior)
*AVM şubeleri için: sadece giriş alanı maddeleri uygulanır*

| # | Madde | Tip | Fotoğraf |
|---|-------|-----|----------|
| 1.1 | Dış cephe genel görünüm (boya, kaplama, temizlik) | rating | ✅ |
| 1.2 | Tabela ışığı yanıyor mu? | checkbox | ✅ |
| 1.3 | Tabela temiz ve hasarsız mı? | checkbox | |
| 1.4 | Dış alan masa/sandalye düzeni ve temizliği | rating | |
| 1.5 | Camlar temiz mi? Kırık/çatlak var mı? | checkbox+text | ✅ |
| 1.6 | Kırık, bozulmuş veya tehlike arz eden mobilya var mı? | checkbox+text | ✅ |
| 1.7 | Giriş kapısı sorunsuz çalışıyor mu? Engel var mı? | checkbox | |
| 1.8 | Dış alanda menü panosu ve güncel fiyatlar mevcut mu? | checkbox | ✅ |
| 1.9 | Dış alan aydınlatma yeterli mi? (akşam saatleri) | checkbox | |
| 1.10 | Engelli rampa/erişim uygun mu? | checkbox | |

---

## KATEGORİ 2: TEŞHİR & SATIŞ ALANI (display_sales)

| # | Madde | Tip | Fotoğraf |
|---|-------|-----|----------|
| 2.1 | Teşhir dolabında olması gereken ürünler sunuluyor mu? | checkbox+text | ✅ |
| 2.2 | Ürün sunumu ve düzeni standarda uygun mu? | rating | ✅ |
| 2.3 | Raf temizliği | rating | |
| 2.4 | Kasa önü satış ürünleri (cross-sell ürünler) mevcut mu? | checkbox | |
| 2.5 | Fiyat etiketleri güncel ve okunabilir mi? | checkbox | |
| 2.6 | Allerjen bilgi kartları görünür yerde mi? | checkbox | |
| 2.7 | Checkout bölümü malzemeleri tam mı? Temiz mi? | rating | |

---

## KATEGORİ 3: TEKNOLOJİ & SİSTEM (technology)

| # | Madde | Tip | Fotoğraf |
|---|-------|-----|----------|
| 3.1 | Kasa sistemi sorunsuz çalışıyor mu? | checkbox | |
| 3.2 | Kiosk sistemi sorunsuz çalışıyor mu? | checkbox | |
| 3.3 | Müşteri ekranı çalışıyor mu? | checkbox | |
| 3.4 | Menü ekranları güncel mi? Tüm ekranlar okunabilir mi? | checkbox+text | ✅ |
| 3.5 | Yazıcılar (fiş/etiket) çalışıyor mu? | checkbox | |
| 3.6 | Wi-Fi çalışıyor mu? Hız yeterli mi? | checkbox | |
| 3.7 | Güvenlik kameraları çalışıyor mu? | checkbox | |

---

## KATEGORİ 4: BAR İÇİ — FOOD STATION (bar_food)

| # | Madde | Tip | Fotoğraf | Kabul Aralığı |
|---|-------|-----|----------|---------------|
| 4.1 | Teşhir dolabı donut bölümü sıcaklığı | number | | 16-22°C |
| 4.2 | Sandviç/pasta dolabı sıcaklığı | number | | 2-7°C |
| 4.3 | Teşhir dolabı ışıkları yanıyor mu? | checkbox | |
| 4.4 | Fırın temiz mi? | checkbox | ✅ |
| 4.5 | Fırın ön ayarları doğru mu? (ayar detayları) | text | |
| 4.6 | Derin dondurucu sıcaklığı | number | | -15 ile -22°C |
| 4.7 | Derin dondurucu temiz mi? Buzlanma var mı? | checkbox | ✅ |
| 4.8 | Gıda ürünleri SKT/STT kontrolleri yapıldı mı? | checkbox+text | ✅ |
| 4.9 | Cross-kontaminasyon riski var mı? (çiğ/pişmiş ayrımı) | checkbox | |

---

## KATEGORİ 5: BAR İÇİ — COFFEE STATION (bar_coffee)

| # | Madde | Tip | Fotoğraf | Kabul Aralığı |
|---|-------|-----|----------|---------------|
| 5.1 | 1. Espresso makinası kalibrasyon durumu | rating | |
| 5.2 | 1. Makina — tek shot espresso süresi (saniye) | number | | 25-30 sn |
| 5.3 | 1. Makina — double shot espresso süresi (saniye) | number | | 25-30 sn |
| 5.4 | 1. Makina — lezzet/tat değerlendirmesi | rating | |
| 5.5 | 2. Espresso makinası kalibrasyon durumu | rating | |
| 5.6 | 2. Makina — tek shot espresso süresi | number | | 25-30 sn |
| 5.7 | 2. Makina — double shot espresso süresi | number | | 25-30 sn |
| 5.8 | 2. Makina — lezzet/tat değerlendirmesi | rating | |
| 5.9 | Şurup baz grupları tam mı? Son kullanma tarihi uygun mu? | checkbox+text | |
| 5.10 | Buz hazneleri dolu mu? | checkbox | |
| 5.11 | Makinalar temiz mi? Günlük bakım yapılmış mı? | checkbox | ✅ |
| 5.12 | Süt köpürtme uçları temiz mi? | checkbox | |

---

## KATEGORİ 6: BAR İÇİ — TEA STATION (bar_tea)

| # | Madde | Tip | Fotoğraf | Kabul Aralığı |
|---|-------|-----|----------|---------------|
| 6.1 | Çay makinası çalışıyor mu? | checkbox | |
| 6.2 | Çay makinası su sıcaklığı | number | | 92-94°C |
| 6.3 | Filtre kahve makinası hazır mı? Eksik/kırık var mı? | checkbox+text | |
| 6.4 | Demleme setup'ları standarda uygun mu? | checkbox | |
| 6.5 | Çay çeşitleri tam mı? SKT kontrol | checkbox+text | |

---

## KATEGORİ 7: BAR İÇİ — CREAMICE STATION (bar_creamice)

| # | Madde | Tip | Fotoğraf |
|---|-------|-----|----------|
| 7.1 | Blender'ler çalışıyor mu? Temiz mi? | checkbox | |
| 7.2 | Blender hazneleri sorunsuz mu? (çatlak, sızıntı) | checkbox | |
| 7.3 | Blender önünde olması gereken malzemeler tam mı? | checkbox+text | |
| 7.4 | Baz şuruplar mevcut mu? SKT kontrol | checkbox+text | |
| 7.5 | Toz grupları tam mı? SKT kontrol | checkbox+text | |
| 7.6 | Buz hazneleri dolu mu? | checkbox | |

---

## KATEGORİ 8: BAR İÇİ — GENEL (bar_general)

| # | Madde | Tip | Fotoğraf |
|---|-------|-----|----------|
| 8.1 | Kasa alanı temiz mi? | checkbox | |
| 8.2 | 1. Buzdolabı temizliği | rating | |
| 8.3 | 1. Buzdolabı sıcaklığı | number | 2-6°C |
| 8.4 | 2. Buzdolabı temizliği | rating | |
| 8.5 | 2. Buzdolabı sıcaklığı | number | 2-6°C |
| 8.6 | Tezgah altı dondurucu temizliği | rating | |
| 8.7 | Tezgah altı dondurucu sıcaklığı | number | -15 ile -22°C |
| 8.8 | Lavabo/evye temiz mi? | checkbox | |
| 8.9 | Bar içi genel zemin temizliği | rating | |
| 8.10 | Bar içi SKT/STT kontrolleri tamamlandı mı? | checkbox+text | ✅ |

---

## KATEGORİ 9: DEPO (storage)

| # | Madde | Tip | Fotoğraf | Kabul Aralığı |
|---|-------|-----|----------|---------------|
| 9.1 | Kullanıt malzeme (bardak, kapak, peçete) yeterliliği | checkbox+text | |
| 9.2 | Kullanıt malzeme FIFO uygulanmış mı? | checkbox | |
| 9.3 | Gıda raf düzeni standarda uygun mu? | rating | ✅ |
| 9.4 | Gıda raflarında FIFO uygulanmış mı? | checkbox | |
| 9.5 | Şurup raf sistemi düzenli mi? FIFO? | checkbox | |
| 9.6 | Kahve ve toz grupları raf düzeni | rating | |
| 9.7 | Tehlike arz eden yerleşim var mı? (ağır üstte, devrilme riski) | checkbox+text | ✅ |
| 9.8 | -18°C soğuk hava deposu/dolabı sıcaklığı | number | | -15 ile -22°C |
| 9.9 | -18°C dolabı temizlik ve düzen | rating | |
| 9.10 | +4°C dolabı (çözündürme, yoğurt vs.) sıcaklığı | number | | 2-6°C |
| 9.11 | +4°C dolabı düzen, temizlik, FIFO | rating | |
| 9.12 | Tüm gıda ürünlerinde SKT/STT kontrolleri | checkbox+text | ✅ |
| 9.13 | Süresi geçmiş ürün var mı? | checkbox+text | ✅ |
| 9.14 | Depo zemin temizliği | rating | |
| 9.15 | Zemin kaygan mı? Tehlike arz eden durum? | checkbox | |
| 9.16 | Buz makinası ağzı kapalı mı? | checkbox | |
| 9.17 | Buz kalitesi (şeffaf=iyi, puslu/kırık=kötü) | rating | ✅ |
| 9.18 | Su filtresi son değişim tarihi | text | |
| 9.19 | Su filtresi değişim raporu mevcut mu? | checkbox | |
| 9.20 | Pest kontrol (haşere belirtisi var mı?) | checkbox | |

---

## KATEGORİ 10: SUPERVİSOR ALANI (supervisor_area)

| # | Madde | Tip | Fotoğraf |
|---|-------|-----|----------|
| 10.1 | Supervisor masası düzenli ve temiz mi? | rating | |
| 10.2 | İK evrakları kilitli dolapta mı? | checkbox | |
| 10.3 | Fatura giriş/çıkış dosyaları düzenli mi? | checkbox | |
| 10.4 | Müzik lisans belgeleri mevcut ve güncel mi? | checkbox | |
| 10.5 | Tüm personellerin sigorta giriş bildirgesi var mı? | checkbox+text | |
| 10.6 | Sigorta girişlerinde aykırılık var mı? | checkbox+text | |
| 10.7 | İş sağlığı ve güvenliği evrakları güncel mi? | checkbox | |
| 10.8 | Vardiya çizelgesi asılı/görünür mü? | checkbox | |

---

## KATEGORİ 11: ŞUBE İÇİ GENEL (interior)

| # | Madde | Tip | Fotoğraf |
|---|-------|-----|----------|
| 11.1 | İç mekan mobilya kontrolü (kırık, dökük, bozuk) | checkbox+text | ✅ |
| 11.2 | Eksik masa/sandalye var mı? | checkbox+text | |
| 11.3 | Genel iç mekan temizliği | rating | |
| 11.4 | Misafir açısından rahat bir ortam mı? | rating | |
| 11.5 | Aydınlatma sistemi (patlamış ampül, bozuk aplik) | checkbox+text | |
| 11.6 | Çatıdan akma/sızma var mı? | checkbox | ✅ |
| 11.7 | Camlarda kırıklık/çatlak var mı? | checkbox | |
| 11.8 | Ses sistemi doğru ayarda mı? | checkbox | |
| 11.9 | Merkez onaylı playlist çalıyor mu? | checkbox | |
| 11.10 | Klima/ısıtma sistemi çalışıyor mu? Ortam sıcaklığı uygun mu? | checkbox | |
| 11.11 | Koku sorunu var mı? | checkbox | |

---

## KATEGORİ 12: TUVALET — ERKEK (restroom_male)

| # | Madde | Tip | Fotoğraf |
|---|-------|-----|----------|
| 12.1 | Genel temizlik | rating | ✅ |
| 12.2 | Sabun mevcut mu? | checkbox | |
| 12.3 | Kağıt havlu veya el kurutma makinası mevcut ve çalışıyor mu? | checkbox | |
| 12.4 | Klozet temiz mi? Kırık/dökük var mı? | checkbox+text | |
| 12.5 | Kapılar sorunsuz çalışıyor mu? (kilit dahil) | checkbox | |
| 12.6 | Lambalar/aydınlatma çalışıyor mu? | checkbox | |
| 12.7 | Tuvalet kağıdı mevcut mu? | checkbox | |
| 12.8 | Koku sorunu var mı? | checkbox | |
| 12.9 | Çöp kovası mevcut ve temiz mi? | checkbox | |
| 12.10 | Ayna temiz ve hasarsız mı? | checkbox | |

---

## KATEGORİ 13: TUVALET — KADIN (restroom_female)
*Aynı maddeler (12.1-12.10) + ek:*

| # | Madde | Tip | Fotoğraf |
|---|-------|-----|----------|
| 13.11 | Hijyenik ped çöp kutusu mevcut mu? | checkbox | |

---

## KATEGORİ 14: PERSONEL DEĞERLENDİRME (personnel)
*Her mevcut personel için ayrı ayrı doldurulur. Bağımsız şablon olarak da kullanılabilir.*

### 14-A: MİSAFİR DENEYİMİ & GÜLER YÜZ (Ağırlık: %30 — EN KRİTİK)

| # | Madde | Tip | Not |
|---|-------|-----|-----|
| 14.1 | ⭐ Güler yüzlü mü? Samimi ve sıcak bir tavır sergiliyor mu? | rating (1-5) | EN ÖNEMLİ KRİTER |
| 14.2 | Misafiri kapıda/kasada selamlıyor mu? (göz teması + sözel) | rating | |
| 14.3 | Misafire ismiyle hitap ediyor mu? (düzenli müşterilerde) | checkbox | |
| 14.4 | Sipariş alırken sabırlı ve yardımcı mı? | rating | |
| 14.5 | Ürün sunumunda "Afiyet olsun" diyor mu? | checkbox | |
| 14.6 | Misafir ayrılırken vedalaşıyor mu? "İyi günler, tekrar bekleriz" | checkbox | |
| 14.7 | Zor/sinirli müşteriye nasıl yaklaşıyor? (gözlem veya senaryo) | rating | |
| 14.8 | Misafir şikayetine yaklaşımı profesyonel mi? | rating | |

### 14-B: ÜRÜN BİLGİSİ & YETKİNLİK (Ağırlık: %25)

| # | Madde | Tip | Not |
|---|-------|-----|-----|
| 14.9 | Menüdeki ürünleri tanıyor mu? (rastgele 3 ürün sor) | rating | Sözlü test |
| 14.10 | Ürün içeriklerini biliyor mu? (allerjen soru: "Bunda fındık var mı?") | rating | |
| 14.11 | Ürün önerisi yapabiliyor mu? ("Ne önerirsiniz?" sorusuna cevap) | rating | |
| 14.12 | Upselling yapıyor mu? ("Yanına kurabiye ister misiniz?") | checkbox | |
| 14.13 | Espresso ayar bilgisi (shot süresi, öğütme, tamping) | rating | Barista rolü için |
| 14.14 | Reçete bilgisi — son değişiklikleri biliyor mu? | checkbox+text | |
| 14.15 | Kasa kullanım yetkinliği (hızlı ve doğru) | rating | |
| 14.16 | Alternatif süt seçeneklerini biliyor mu? (soya, badem, yulaf farkları) | checkbox | |

### 14-C: DRESS CODE & KİŞİSEL BAKIM (Ağırlık: %15)

| # | Madde | Tip | Fotoğraf | Not |
|---|-------|-----|----------|-----|
| 14.17 | DOSPRESSO üniforması giyiyor mu? | checkbox | ✅ | |
| 14.18 | Üniforma temiz ve ütülü mü? | checkbox | | |
| 14.19 | İsimlik takıyor mu? | checkbox | | |
| 14.20 | Ayakkabı uygun mu? (kapalı, kaymaz, temiz) | checkbox | | |
| 14.21 | Saç bakımı — uzun saçlar toplanmış/ağ içinde mi? | checkbox | | Gıda güvenliği |
| 14.22 | Sakal/bıyık düzenli ve bakımlı mı? | checkbox | | |
| 14.23 | Tırnak kısa, temiz ve ojeli değil mi? | checkbox | | Gıda güvenliği |
| 14.24 | Takı kuralı — yüzük (evlilik hariç), bilezik, piercing yok mu? | checkbox | | |
| 14.25 | Parfüm/koku aşırı değil mi? (kahve aromasını bastırmamalı) | checkbox | | |
| 14.26 | Genel kişisel hijyen (ter kokusu, ağız kokusu) | checkbox | | Hassas konu — özel not |

### 14-D: HİJYEN KURALLARINA UYUM (Ağırlık: %10)

| # | Madde | Tip | Not |
|---|-------|-----|-----|
| 14.27 | El yıkama sıklığı (gözlem: para sonrası, yemek öncesi, tuvalet sonrası) | rating | |
| 14.28 | Eldiven kullanımı gerektiğinde kullanıyor mu? | checkbox | |
| 14.29 | Yiyeceklere çıplak elle dokunmuyor mu? | checkbox | Kritik |
| 14.30 | Öksürük/hapşırık esnasında ağzını kapatıyor mu? Yiyecekten uzaklaşıyor mu? | checkbox | |
| 14.31 | Bardak/kupayı üst kısmından tutmuyor mu? (alt/kulptan tutmalı) | checkbox | |
| 14.32 | Telefon kullanımı — bar içinde kişisel telefon kullanıyor mu? | checkbox | Yasak |

### 14-E: TAKIM RUHU & İLETİŞİM (Ağırlık: %15)

| # | Madde | Tip | Not |
|---|-------|-----|-----|
| 14.33 | Ekip arkadaşlarıyla iletişimi olumlu mu? | rating | |
| 14.34 | Yardımlaşma — iş yoğunluğunda destek oluyor mu? | rating | |
| 14.35 | İstasyon devir teslimini düzgün yapıyor mu? | checkbox | |
| 14.36 | Supervisor/müdür talimatlarına uyuyor mu? | checkbox | |
| 14.37 | Proaktif mi? (boş durmuyor, yapılacak iş arıyor) | rating | |
| 14.38 | Stres altında sakin kalabiliyor mu? (yoğun saatlerde gözlem) | rating | |
| 14.39 | Yeni gelen ekip arkadaşına yardımcı mı? | checkbox | |
| 14.40 | Vardiya saatlerine uyum (geç kalma, erken çıkma) | checkbox | PDKS verisinden |

### 14-F: GELİŞİM & MOTİVASYON (Ağırlık: %5)

| # | Madde | Tip | Not |
|---|-------|-----|-----|
| 14.41 | Eğitimlere katılım durumu | checkbox | Sistemden kontrol |
| 14.42 | Öğrenme isteği var mı? Yeni teknik/reçete deniyor mu? | rating | |
| 14.43 | Geri bildirime açık mı? | rating | |
| 14.44 | İyileştirme önerisi sunuyor mu? | checkbox | |
| 14.45 | Genel motivasyon ve enerji seviyesi | rating | |

### PERSONEL PUANLAMA ÖZETİ
| Alt Kategori | Ağırlık | Max Puan |
|--------------|---------|----------|
| Misafir Deneyimi & Güler Yüz | %30 | 40 |
| Ürün Bilgisi & Yetkinlik | %25 | 40 |
| Dress Code & Kişisel Bakım | %15 | 50 |
| Hijyen Kuralları | %10 | 30 |
| Takım Ruhu & İletişim | %15 | 40 |
| Gelişim & Motivasyon | %5 | 25 |
| **TOPLAM** | **%100** | **225** |

**Sonuç kategorileri:**
- 200-225: ⭐ Mükemmel — ödül/terfi adayı
- 170-199: ✅ İyi — standart karşılıyor
- 140-169: ⚠️ Gelişime açık — aksiyon planı gerekli
- <140: ❌ Yetersiz — acil iyileştirme + takip

---

## KATEGORİ 15: GÜVENLİK & YASAL (safety_legal)
*Aslan'ın listesinde olmayan ama sektör standardı olan maddeler*

| # | Madde | Tip | Fotoğraf |
|---|-------|-----|----------|
| 15.1 | İlk yardım çantası mevcut ve eksiksiz mi? | checkbox | ✅ |
| 15.2 | İlk yardım çantası son kontrol tarihi | text | |
| 15.3 | Yangın söndürücüler yerinde ve dolum tarihi geçerli mi? | checkbox+text | ✅ |
| 15.4 | Yangın alarm sistemi çalışıyor mu? | checkbox | |
| 15.5 | Acil çıkış yolları açık ve işaretli mi? | checkbox | ✅ |
| 15.6 | Acil çıkış levhaları aydınlatmalı mı? | checkbox | |
| 15.7 | İSG (İş Sağlığı Güvenliği) panosu güncel mi? | checkbox | |
| 15.8 | Elektrik panosu erişilebilir ve kapalı mı? | checkbox | |
| 15.9 | Islak zemin uyarı levhası mevcut mu? | checkbox | |
| 15.10 | Personel acil durum eğitimi yapılmış mı? | checkbox | |

---

## ŞABLON YAPILARI

### 1. Tam Şube Denetimi (Coach/Trainer)
Tüm 15 kategori dahil. ~120+ madde. Süre: 60-90 dk.
AVM şubeleri için Kategori 1 (Dış Mekan) otomatik atlanır.

### 2. Günlük Açılış Kontrolü (Supervisor)
Seçili maddeler: 4.1, 4.2, 5.1-5.8, 6.2, 8.3, 8.5, 8.7 (sıcaklıklar) + 2.1, 8.1
~20 madde. Süre: 10-15 dk.

### 3. Hijyen & Gıda Güvenliği Denetimi
Kategoriler: 4, 5, 6, 7, 8, 9 (sadece gıda/sıcaklık maddeleri)
~40 madde. Süre: 20-30 dk.

### 4. Personel Değerlendirme
Kategori 14. Her personel için ayrı form.
~12 madde × personel sayısı. Süre: personel başına 5 dk.

### 5. Ekipman Denetimi
Kategoriler: 3, 4 (ekipman), 5 (makinalar), 6 (makinalar), 7 (blender), 9.16-9.19
~30 madde. Süre: 15-20 dk.

### 6. Hızlı Tur Denetimi (15 dakika)
Her kategoriden 1-2 kritik madde. ~15-20 madde.
Anomali bulunursa "Tam Denetim Gerekli" flag'ı.

---

## MR. DOBODY ENTEGRASYONU

### Otomatik Denetim Tetikleme
- Dobody event: `audit_trigger` — koşul bazlı denetim önerisi
- Örnek: "3 gün üst üste sıcaklık uyarısı → Gıda Güvenliği Denetimi öner"
- Örnek: "Müşteri şikayeti ≥3 → Hızlı Tur Denetimi tetikle"

### Denetim Sonucu Aksiyonları
- Skor <70 → Dobody otomatik "İyileştirme Planı" görev oluşturur
- Kritik madde fail → Anlık bildirim Coach/Trainer'a
- Sıcaklık aralık dışı → Ekipman arıza kaydı otomatik oluştur

### AI Destekli Denetim
- Fotoğraf yükleme → GPT-4 Vision analizi (temizlik skoru, ürün sunumu)
- Serbest metin notları → AI özetleme ve önceliklendirme
- Geçmiş denetim karşılaştırma → trend analizi

---

## TOPLAM
- 15 kategori (personel 6 alt kategoriye ayrıldı)
- ~175 madde (tam denetim + personel)
- 6 şablon tipi
- 3 Dobody entegrasyon noktası
- Sıcaklık kontrolleri: 8 nokta (kabul aralıkları tanımlı)
- Fotoğraf gerektiren: ~25 madde
- Personel değerlendirme: 45 madde, 6 alt kategori, 225 puan, güler yüz %30 ağırlık
