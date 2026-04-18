# DOSPRESSO Platform — Kapsamlı Anlayış Raporu

**Hazırlayan:** Claude (IT Danışman)
**Tarih:** 18 Nisan 2026, Cumartesi gecesi
**Amaç:** Aslan'ın "sistemin hedefi ne, roller nasıl, akışlar nelerdir, % kaç hazır" sorusuna tam ve dürüst cevap.
**Yöntem:** 65 stratejik doküman + 11 bugünkü commit + Replit raporları + kod tabanı okunarak sentezlendi.

---

## BÖLÜM 1 — DOSPRESSO NEDİR? (Özde Ne Amaçlıyor)

### 1.1 Tek Cümleyle

DOSPRESSO, **Türkiye'de 25+ şubeli bir Donut & Coffee Shop franchise zincirinin** (adın kökeni: **DO**nut + es**PRESSO**) merkez (HQ), fabrika ve şubeleri arasındaki tüm operasyonları tek bir platform üzerinden yöneten **rol bazlı kurumsal yönetim yazılımıdır**. Hedefi: her şubede aynı kalite, aynı prosedür, aynı standartla hizmet vermeyi sağlamak.

**Ürün yelpazesi:**
- **Donut'lar** — klasik + gourmet (DNT-001 → DNT-025, 25 çeşit). Fabrika'da merkezi üretilir, şubelere sevkiyat
- **Cinnaboom** — 6'lı paket cinnamon roll (3 çeşit: klasik, beyaz, siyah brownie)
- **Cheesecake** — 5 çeşit (klasik, çikolata, karamel, frambuaz, NY stili)
- **Brownie, Cookie, Ekmek** — küçük atıştırmalıklar
- **Kahve ürünleri** — espresso, americano, latte, filtre (şubede hazırlanır — SYR, KHV, CAY kodlu)
- **Satış fiyatları** — Donut ₺33-39, Cinnaboom ₺54 (6'lı), Cheesecake ₺76

### 1.2 İş Modelinin Temeli

DOSPRESSO'nun rekabet avantajı **ölçeklenebilir standart**. Bu şu demek:
- Lara şubesindeki bir Cinnaboom ile Işıklar şubesindeki Cinnaboom **aynı** olmalı (aynı reçete, aynı gramaj, aynı görsel — merkezi fabrikada üretilip dondurularak sevk ediliyor)
- Her şubede espresso hazırlamak 2 dakika sürmeli (eğitim + checklist ile)
- Müşteri hangi şubeye giderse gitsin **aynı deneyim**

Bu tutarlılık **yazılımla** sağlanır. Yoksa 25 şube × 25 farklı uygulama = kaos.

**Merkezi Üretim Modeli (Fabrika → Şube):**
- Fabrika **hamur ürünlerini** (donut, cinnaboom, cheesecake, brownie, cookie, ekmek) üretir
- Şok dondurucuda -35°C'ye kadar indirip -18°C'de depolanır
- Şubelere sevk edilir, şubede oda ısısında çözülüp satışa sunulur (48-72 saat raf ömrü)
- Şubede sadece **kahve + servis + ısıtma** yapılır (hazırlık değil)
- Bu model şubelerde mutfak/fırın gerektirmez → **düşük franchise maliyeti + tutarlı kalite**

### 1.3 Platform'un 3 Ana Fonksiyonu

**A) OPERASYONEL KONTROL** — Her şube ne yapıyor, ne zaman, nasıl? (checklist, vardiya, görev)

**B) KALİTE DENETİMİ** — Standartlar tutulyor mu? (denetim, fotoğraflar, skorlar)

**C) FİNANS & STOK** — Ne üretildi, ne satıldı, ne harcandı? (fabrika reçete maliyeti, bordro, satın alma)

Bu üçü birbirinden bağımsız çalışmıyor — üçünü de aynı platformda tek sistem altında birleştirmek DOSPRESSO'nun değer önerisi.

---

## BÖLÜM 2 — ORGANİZASYON YAPISI (3 Katman, 25+ Şube)

### 2.1 Fiziksel Yapı

```
HQ (Genel Merkez — Antalya)
├── Fabrika (üretim tesisi)
└── 25 Şube (20 aktif + 5 hedef 2 yılda 55'e ulaşmak)
```

**Önemli ayrım:**
- **HQ şubeleri** (Işıklar, Lara vb.) → doğrudan Aslan yönetiyor, Muhasebe-İK HQ bordrosu yapıyor
- **Yatırımcı şubeleri** (franchise sahibi olan şubeler) → bağımsız, kendi İK'larını yönetir, HQ sadece denetler

Bu ayrım **iş modelinin belirleyicisi**. HQ her şeyi yönetmez — sadece **standardı** dikter. Yatırımcı kendi bordrosunu, kendi personel işini yapar.

**Şube Çalışan Hiyerarşisi — Kariyer Yolu (ALTAN ÜSTE)**

Şube çalışanları **7 seviyeli bir kariyer yolunda** ilerler. Her seviyenin üstüne çıkmak için **Gate sınavı** geçmek, belli günleri tamamlamak ve skor eşiğini aşmak gerekir.

```
SEVIYE 7  │  Yatırımcı Şube (franchise sahibi — kendi şubesi)
          │       ▲ (yatırım yaparak)
SEVIYE 6  │  Müdür (şubenin genel yönetimi)
          │       ▲ (terfi — Gate-3 + süre + skor)
SEVIYE 5  │  Supervisor (günlük operasyon, vardiya, checklist)
          │       ▲ (terfi — Gate-2 + süre + skor)
SEVIYE 4  │  Supervisor Buddy (supervisor yardımcısı)
          │       ▲ (terfi — supervisor yetkileri öğrenme)
SEVIYE 3  │  Barista (temel operasyon — usta çalışan)
          │       ▲ (terfi — Gate-1 + 30 gün + composite >=70)
SEVIYE 2  │  Bar Buddy (barista yardımcısı)
          │       ▲ (terfi — Gate-0 sınavı 14 gün sonunda)
SEVIYE 1  │  Stajyer (14 günlük onboarding)
          │       ▲ (giriş — yeni işe alım)
```

**Özel durum:**
- **Yatırımcı Şube** bir terfi değil, **yatırımcı olarak satın alınan pozisyon**. Yatırımcı aynı zamanda Müdür olabilir (çoğu durumda öyle) ama bağımsız franchise sahibi olarak da sadece bir şubeyi temsil edebilir. HQ onun İK'sına karışmaz, kendi personelini kendi yönetir.

**Kariyer İlerlemesi (Detay):**

| # | Seviye | Terfi Şartı | Süre | Skor |
|---|--------|-------------|:--:|:--:|
| 1 | Stajyer | Yeni işe alım | — | — |
| 2 | Bar Buddy | Gate-0 sınavı geç | 14 gün | — |
| 3 | Barista | Gate-1 sınavı geç | +30 gün | >=70 |
| 4 | Supervisor Buddy | Supervisor önerisi + Coach onayı | +60 gün | >=75 |
| 5 | Supervisor | Gate-2 sınavı geç | +90 gün | >=80 |
| 6 | Müdür | Gate-3 + Coach + CGO onayı | +180 gün | >=85 |
| 7 | Yatırımcı Şube | Franchise satın alma (terfi değil) | — | — |

**Composite Score Kriterleri (her seviye için takip edilir):**
- Checklist tamamlama (%25)
- Eğitim + quiz sonuçları (%25)
- PDKS / devam (%25)
- Yönetici değerlendirmesi (%25)

**Skor Bölgeleri:**
- 90-100 → Yeşil (mükemmel, terfiye hazır)
- 75-89 → Amber (iyi, gelişime açık)
- 60-74 → Turuncu (warning zone)
- 0-59 → Kırmızı (danger zone — 3 ay üst üste danger = terfi geri alma)

---

### 2.2 Rol Hiyerarşisi (Şu An 27 Rol, Hedef 18)

**Sistem (1 rol)**
- Admin — tüm yetki, sistem ayarları

**Yönetim (2 rol)**
- CEO — tam erişim, stratejik karar (Aslan)
- CGO — operasyon + büyüme sorumlusu

**HQ Departmanları (12 rol)**
- Coach — şubeleri denetler, performans takip eder (Yavuz)
- Trainer — eğitim + reçete sorumlusu (Ece)
- Muhasebe İK — bordro + İK (HQ + Fabrika + Işıklar kapsamında) (Mahmut)
- Satın Alma — tedarik, sipariş (Samet)
- Marketing — pazarlama (Diana)
- Kalite Kontrol — fabrika QC + müşteri feedback (Ümran)
- Gıda Mühendisi — HACCP, gıda güvenliği (Sema)
- Fabrika Müdürü — üretim genel yönetim (Eren)
- Üretim Şefi — üretim hattı
- Teknik — ekipman + IT destek
- Destek — müşteri + operasyon destek
- Yatırımcı HQ — franchise yönetim

**Fabrika (4 rol)**
- Üretim Şefi — üretim hattı yönetimi
- Fabrika Operatörü — istasyon çalışanı
- Fabrika Sorumlusu — hat sorumlusu (0 kullanıcı — ölü rol)
- Fabrika Depo — depocu (malzeme çıkış)

**Fabrika Reçete (2 rol)**
- Şef (sef) — kategori bazlı reçete editi
- Reçete GM (recete_gm) — reçete genel müdür

**Şube (7 rol — YUKARIDAKI KARİYER YOLU)**
- Stajyer
- Bar Buddy
- Barista
- Supervisor Buddy
- Supervisor
- Müdür
- Yatırımcı Şube

**Kiosk (1 rol)**
- Şube Kiosk — sadece giriş/çıkış terminali (PIN bazlı)

**Kritik Bulgu:** 27 roldan **14'ü sadece 1 kişi tarafından kullanılıyor** (sef, recete_gm, cgo, marketing vs.). Bu "bus factor = 1" — o tek kişi ayrılırsa rol boşta kalır. Sprint E'de 27 → 18'e konsolide edilecek.

### 2.3 Veri Akışı Kuralı (Altın Kural)

```
Şube → HQ: VERİ AKAR (raporlar, performans, stok, bordro girdi)
HQ → Şube: SADECE GÖREV, DUYURU, POLİTİKA (veri geri akmaz)
Şube A ↔ Şube B: TAMAMEN YASAK (şubeler birbirini görmez)
```

Bu kural ihlal edilirse **P0 güvenlik bugı** sayılıyor. Kodun her yerinde `branchId` filtresi bu kuralı koruyor.

---

## BÖLÜM 3 — ROLE GÖRE GÜNLÜK AKIŞLAR

Her rol için "bir günün içinde ne yapıyor" şeklinde somutlaştırıyorum. Bu akışlar DOSPRESSO'nun **asıl değer önerisi** — sadece veri tutmak değil, **iş akışını standartlaştırmak**.

### 3.1 Barista — Şube Personeli (Günlük)

**Sabah 07:45**
1. Şubeye gelir, kiosk tabletinden **PIN + QR** ile check-in yapar
2. `shift_attendance` kaydı oluşur (geç mi zamanında mı sistemde görünür)
3. Kiosk'ta bugünkü vardiya + açılış checklist'i görünür

**Sabah 08:00–08:30**
4. Açılış checklist'ini doldurur (10 madde: ışıklar açık, kahve makinesi ısındı, süt stok kontrolü, kasa açılış, vs.)
5. Her madde için ✓ işaretler, fotoğraf varsa yükler
6. Supervisor onaylar → checklist "tamamlandı" olur → şube skoru artar

**Gün içi**
7. Görevler gelir (Supervisor veya Coach atar) → "Görevlerim" sayfasında
8. Her görevi tamamlar (gerekirse fotoğraf ile kanıtlar)
9. Ara/mola: kiosk'tan mola başlat/bitir
10. Ekipman sorunu çıkarsa QR ile **arıza bildirir** → anında teknik'e gider

**Akşam 17:45**
11. Kapanış checklist'i (vitrin boşalt, makine temizle, kasa sayım)
12. Kiosk'tan check-out
13. Sistem otomatik hesaplar: bugün kaç saat çalıştı, zamanında mıydı

**Dobody'nin rolü:**
- Sabah: "İyi günler, bugünkü 3 görevin var"
- Gün içi: "Checklist'in 2 maddesi eksik, mesai bitmeden tamamla"
- Akşam: "Bugün güzel çalıştın, skorun +2 arttı"

### 3.2 Supervisor — Şube Operasyon (Günlük)

**Sabah 07:30**
1. Kendi check-in yapar (kendi de vardiyalı)
2. Supervisor Centrum dashboard açar
3. Bugün hangi personel geliyor, kaç kişi, doluluk yeterli mi?

**Sabah 08:15**
4. Barista'nın açılış checklist'ini onaylar veya reddeder
5. Eksik bir şey varsa baristaya hatırlatma gönderir

**Gün içi**
6. Coach'tan gelen denetim raporlarını okur → eksikleri barista'ya görev olarak atar
7. Müşteri şikayeti gelirse (CRM) çözüm yönetir
8. Stok kontrolü: bugün ne eksiliyor? Fabrika'dan sipariş talep eder
9. Personel arası çatışma/sorun: disiplin kaydı açar

**Akşam 17:00**
10. Tüm barista'ların checklist onaylarını tamamlar
11. Kasa mutabakat (kasa açılış vs. kapanış)
12. Yarının vardiya planını gözden geçirir
13. Vardiya devir checklist'i doldurur → sonraki vardiya bilgili olur

**Dobody'nin rolü:**
- "3 şubede stok kritik seviyede — fabrika sipariş önerisi hazırladım, onayla"
- "Barista X'in composite skoru düştü, eğitim ataması öneriyorum"
- "Açılış checklist bugün 3 gün üst üste geç tamamlandı, nedeni inceler misin?"

### 3.3 Müdür — Şube Yönetimi (Günlük)

**Sabah 09:00**
1. Şube dashboard açar: dün kaç satış, kaç personel geldi, skorum ne?
2. Dobody brief: "Dün şu 3 konuda dikkat edilecek"

**Gün içi**
3. Haftalık vardiya planı yapar (personel × gün × saat)
4. Personel izin talepleri onaylar/reddeder
5. Yatırımcı'ya veya CGO'ya haftalık rapor gönderir
6. Bordro dönemi yakınsa PDKS verilerini kontrol eder

**Akşam**
7. Şubenin günlük KPI'larına bakar (müşteri adedi, ortalama ciro, NPS)

### 3.4 Coach — HQ Operasyon (Haftalık)

Coach **tüm şubeleri denetleyen** bir rol. Günlük değil, haftalık ritm çalışır.

**Haftanın başı (Pazartesi)**
1. Geçen hafta tüm şubelerin sağlık skorları → En düşük 3 şubeye odaklan
2. Bu hafta denetim programı (şehre göre rotasyon — Antalya bölgesi bu hafta)

**Şube ziyareti / uzaktan denetim**
3. Denetim şablonu seçer (Sabah Açılış / Kalite / Personel / Hijyen — 6 şablon, 175 madde)
4. Her madde için puan + not + fotoğraf
5. "Güler yüz" %30 ağırlıklı (müşteri deneyimi ağırlıklı)
6. Denetim sonrası **aksiyon maddeleri** oluşturur (eksikler için görev + deadline + sorumlu)
7. Supervisor/Müdür/Yatırımcı'ya denetim raporu gönderilir

**Escalation**
8. Aksiyon deadline'ı kaçarsa → otomatik CGO'ya escalation
9. Aynı hata 3 kez tekrar ederse → kapsamlı eğitim önerisi

**Dobody'nin rolü:**
- "Lara şubesinin denetim skoru 3 hafta üst üste düşüyor, kapsamlı inceleme öneriyorum"
- "16 şubede vardiya planı eksik — toplu hatırlatma hazırladım, onayla"

### 3.5 Fabrika Operatörü — Üretim (Günlük)

**Sabah 06:00**
1. Kiosk'ta PIN ile check-in
2. Bugünkü üretim planı görünür: "Donut 660 adet, Cinnaboom 380 adet"

**06:30–08:00 — Malzeme Hazırlık**
3. Depocu çekme listesine göre malzemeleri hazırlar
4. Operatör "Malzeme Geldi" bildirimi alır → teslim alır, tartar, doğrular

**08:00–16:00 — Üretim**
5. Reçete adımları kiosk'ta görünür (15 adım, her biri süre + açıklama)
6. Her adım için "Başladım / Bitirdim" tuşları
7. Batch tamamlanınca → Kalite Kontrol (2 aşama)
8. Red gelirse → üretim geri döner, tekrar

**16:00 — Kapanış**
9. Kalan malzemeleri tartar → "Artan Kayıt" formu (fire hesabı)
10. Gıda Mühendisi artanları doğrular
11. Ertesi gün bu artanlar yeni planın girdisi olur

**Dobody'nin rolü:**
- "Bu hafta donut fire oranı %25'e çıktı (normal %15), sebebi inceleniyor"
- "Yarın Cinnaboom üretimi için un stoğu sadece 1 gün yeter, sipariş ver"

### 3.6 Stajyer — Onboarding (14 Gün)

Stajyer sisteme ilk kez girdiğinde **otomatik 14 günlük onboarding paketi** atanır. Bu DOSPRESSO'nun en olgun akışlarından biri.

**Hafta 1 — Temel Oryantasyon**
- Gün 1: Hoş geldin, HACCP temelleri
- Gün 2: Hijyen, soğuk zincir
- Gün 3: Bar tanıtımı, POS sistem
- Gün 4: Espresso, süt buharlaştırma
- Gün 5: Filtre kahve, açılış prosedürü
- Gün 6: Kapanış prosedürü, müşteri iletişimi
- Gün 7: Hafta 1 quiz (20 soru) + mentor gözlem

**Hafta 2 — Pekiştirme**
- Gün 8–13: Pratik uygulamalar (latte, cappuccino, kasa, stok)
- Gün 14: **Gate-0 Sınavı** (quiz + 10 maddeli pratik gözlem)

**Gate-0 sonuç:**
- Geçerse → **Bar Buddy** seviyesine terfi
- Başarısızsa → 7 gün ek süre, tekrar
- İkinci başarısızlık → Coach inceleme

**Dobody'nin rolü:**
- Her sabah: "Bugün şu 3 modülü tamamlaman gerekiyor"
- Gün sonu: "Gün 5 tamamlandı! İyi iş"
- Gate öncesi: "Yarın Gate-0, bu 5 konuya tekrar bak"

### 3.7 CEO / Aslan — Stratejik Bakış (Haftalık/Aylık)

**Her sabah 09:00**
1. CEO Command Center: 4 mega KPI
   - Toplam ciro (tüm şubeler)
   - Şube sağlık skoru ortalaması
   - Kritik uyarılar (SLA aşımı, arıza >30 gün)
   - Bugünün Dobody brief'i

**Haftalık Pazartesi**
2. En iyi / en düşük 3 şube karşılaştırması
3. Yatırımcı performans raporu
4. Fabrika üretim vs. hedef
5. Yeni franchise pipeline durumu

**Aylık**
6. Bordro onayı (372 personel için)
7. Finansal rapor
8. Büyüme stratejisi (hedef 2 yılda 55 şube)

---

## BÖLÜM 4 — MODÜL BAZLI SİSTEM HARİTASI

DOSPRESSO 181 modüle bölünmüş. Ama ana 12 modül hepsini kapsıyor:

| # | Modül | Ne İşe Yarar | Durum | Pilot İçin Kritik mi? |
|---|-------|---|:--:|:--:|
| 1 | **Kiosk (Vardiya)** | Personel giriş/çıkış, PIN/QR, PDKS | ✅ Çalışıyor | **EVET** |
| 2 | **Checklist** | Açılış/kapanış/vardiya kontrolleri | ✅ 5,098 tamamlama (gerçek kullanım var) | **EVET** |
| 3 | **Görev Sistemi** | Görev atama, takip, tamamlama | ⚠️ %49 iptal oranı (UX sorunu) | **EVET** |
| 4 | **Denetim (Audit)** | Coach/Trainer şube denetimi, 6 şablon | ✅ Çalışıyor | Evet |
| 5 | **Akademi (Eğitim)** | Modül, quiz, sertifika | ⚠️ v1/v2/v3 paralel (karışık) | Kısmen |
| 6 | **Fabrika Üretim** | Reçete, batch, kalite, stok | ✅ 27/27 reçete ürüne bağlı | **EVET** |
| 7 | **Maliyet Analizi** | Reçete maliyeti, fatura fiyat sync | ✅ 143 malzeme, donut ₺17.02 | Evet |
| 8 | **Bordro (PDKS+Payroll)** | PDKS Excel, maaş hesapla | ❌ payroll_records 0 kayıt (hiç kullanılmamış) | **EVET** |
| 9 | **Ekipman & Arıza** | 177 ekipman, 75 arıza takibi | ✅ Çalışıyor (enum TR/EN normalize edildi) | Evet |
| 10 | **CRM & Müşteri GB** | Şikayet, ticket, NPS | ⚠️ DB'de crm_* tabloları yok, başka isimlerde | Hayır |
| 11 | **Duyuru / Announcement** | DuyuruStudioV2, feed | ✅ Çalışıyor | Evet |
| 12 | **Mr. Dobody** | Yarı otonom AI asistan | ⚠️ 20K bildirim spam (A6'da fix) | Kısmen |

**Destekleyici modüller:**
- Sistem Atölyesi (admin)
- Rol & Yetki Yönetimi
- Schema v3 (modül flags, izinler)
- CEO/CGO Command Center
- Centrum'lar (14 rol-bazlı hub)

---

## BÖLÜM 5 — SİSTEM ŞU AN NE KADAR HAZIR? (Dürüst Değerlendirme)

### 5.1 Sayısal Durum (18 Nisan itibarıyla)

| Metrik | Değer | Referans |
|--------|:-----:|----------|
| Database tablosu (schema kodunda) | 469 | 18,457 satır |
| Backend endpoint | 1,977 | Güncel sayım |
| Frontend sayfa | 316 | 239,696 satır TSX |
| Frontend route | 250 | App.tsx |
| Schema dosyası | 23 | shared/schema/ |
| Aktif kullanıcı | 331 | DB gerçek |
| Rol | 27 | Hedef 18 |
| Şube | 22 (20 aktif + HQ + Fabrika) | |
| Toplam kod | ~410,000 satır | Server + Client + Shared |
| Doküman | 65 markdown | docs/ |

**Replit'in "280 gerçek tablo" bulgusu:** Kod bazında 469 tablo tanımlı ama DB'ye push edilmemiş ~190 var. Yani **kodda plan var, DB'de gerçek uygulama yok**. Bu schema drift ciddi ama Sprint F'de ele alınacak.

### 5.2 Modül Bazlı Hazırlık Yüzdesi

Benim değerlendirmem, her modül için:

| Modül | Hazır % | Pilot için Yeterli mi | Eksik Ne |
|-------|:--:|:--:|------|
| Kiosk (Vardiya) | **95%** | ✅ | Minör UI cilası |
| Checklist | **85%** | ✅ | Günlük otomatik oluşturma yok |
| Fabrika Üretim | **85%** | ✅ | Batch açma UI eksik (kod var) |
| Maliyet Analizi | **90%** | ✅ | Cinnaboom/cheesecake hesaplanmamış |
| Denetim | **80%** | ✅ | Aksiyon escalation tam test edilmedi |
| Ekipman | **75%** | ✅ | 9 arıza >30 gün (SLA) |
| Görev | **60%** | ⚠️ | %49 iptal oranı — UX sorunu |
| Akademi | **50%** | ⚠️ | v1/v2/v3 karışık, 25 orphan sayfa |
| Bordro | **30%** | ❌ | 0 bordro kaydı! Hiç kullanılmamış |
| CRM | **40%** | ❌ | DB tabloları isim uyuşmazlığı |
| Dobody | **55%** | ⚠️ | 20K bildirim spam (A6'da fix) |
| Satınalma | **20%** | ❌ | Tüm modül kırıktı (A1'de düzelttim) |

**Ortalama hazırlık: ~65%**

### 5.3 Pilot Kapsam (Nisan 2026 Pilot)

Pilot = **HQ + Fabrika + 2 şube (Işıklar + Lara)**. Pilot için **gereken modüller**:

| Modül | Pilot Hazır mı? |
|-------|:--:|
| Kiosk | ✅ |
| Checklist | ✅ |
| Vardiya + PDKS | ✅ (Excel import çalışıyor) |
| Fabrika Üretim | ✅ |
| Denetim | ✅ |
| Ekipman | ✅ |
| Dobody basit | ⚠️ (A6 fix sonrası OK) |
| Bordro | ❌ (Pilot'ta manuel olabilir) |

**Sonuç:** Pilot için **~80% hazır**. Bordro pilot kapsamında manuel yapılabilir (372 personelin bordrosu bir ayda sistemde değil, Excel'de).

### 5.4 Tam Sistem (55 Şube Ölçek, 2 Yıl)

Tam ölçek için hedef hazırlık:
- Kodun kendisi: **65% hazır**
- Test coverage: **0% (test YOK)** — Sprint F'de ele alınacak
- CI/CD pipeline: **YOK** — Sprint F
- Observability (log + alert): **YOK** — Sprint H
- Performans optimizasyon: **Kısmen** — Sprint G

**8 haftalık yol haritasından sonra tahmini hazırlık: %90-95**. %100'e ulaşmak için pilot kullanıcılardan gelen geri bildirimlerle 2-3 ay daha ince ayar gerekir.

---

## BÖLÜM 6 — BEKLENTİLER VE GERÇEKLİK (Kritik Bölüm)

### 6.1 Beklentin (Aslan'ın Vizyonu)

Senin DOSPRESSO'dan beklediğin (dokümanlardan ve söylediklerinden anladığım):

1. **Tek Platformdan Tüm Operasyon** — 25 şube + fabrika + HQ tek yerden yönetilsin
2. **Standart Kalite** — her şubede aynı ürün, aynı servis
3. **Otomatik Operasyon** — sabah checklist, akşam kapanış, her şey kendiliğinden işlesin
4. **Veri Temelli Karar** — tahminle değil, rakamla yönet
5. **Mr. Dobody Asistanlığı** — her rol için "bugün şu 3 şeye odaklan" yönlendirmesi
6. **Franchise Ölçeklenebilirlik** — 25 → 55 şube sorunsuz büyüme
7. **Disiplinli İnsan Kaynakları** — vardiya, PDKS, bordro, eğitim, skorlama hepsi entegre
8. **Maliyet Şeffaflığı** — her ürünün gerçek maliyeti belli olsun (donut ₺17.02 gibi)
9. **Mobil-İlk** — şube personeli tablet/telefondan çalışsın
10. **Güvenli** — şubeler birbirini görmesin, sızıntı olmasın

### 6.2 Platform Bu Beklentileri Ne Ölçüde Karşılayacak?

Her beklenti için dürüst yüzde:

| # | Beklenti | Karşılama % | Not |
|---|----------|:--:|-----|
| 1 | Tek platform | **85%** | Çoğu modül var, entegrasyon kısmen |
| 2 | Standart kalite | **70%** | Denetim + reçete + checklist var, kullanım disiplini lazım |
| 3 | Otomatik operasyon | **60%** | Checklist günlük otomatik oluşturma YOK, manuel tetik |
| 4 | Veri temelli karar | **75%** | Dashboard'lar var ama 14 rol boş görüyor (E'de fix) |
| 5 | Dobody asistanlığı | **55%** | Altyapı var, ama %85 bildirim spam (A6'dan sonra %75) |
| 6 | Franchise ölçeklenebilirlik | **70%** | 25'e kadar kolay, 55'e performans işi (Sprint G) |
| 7 | Disiplinli İK | **60%** | 3 paralel puantaj sistemi (Sprint B'de birleşecek) |
| 8 | Maliyet şeffaflığı | **85%** | Donut var, Cinnaboom/Cheesecake bekliyor |
| 9 | Mobil-İlk | **80%** | Responsive çalışıyor, kiosk mode var |
| 10 | Güvenlik | **75%** | Şube izolasyonu sağlam, seed endpoint bugün güvenli hale geldi |

**Genel ortalama: ~72%**

### 6.3 "%100" Ne Zaman Olacak?

Benim gerçekçi tahminim:

| Zaman | Hazırlık % | Durum |
|-------|:--:|-------|
| **Şu an (18 Nisan)** | **72%** | Pilot için yeter, tam ölçek için eksik |
| **2 hafta sonra (Sprint A+B)** | **78%** | Veri konsolidasyon tamam, UI temiz |
| **4 hafta sonra (Sprint A-D)** | **85%** | Bordro çalışıyor, Satınalma açık, Akademi tek versiyon |
| **6 hafta sonra (Sprint A-F)** | **90%** | Test + CI var, güven artar |
| **8 hafta sonra (Sprint A-H)** | **95%** | Observability + performans, pilot sonrası iyileştirmeler |
| **Pilot + 2-3 ay sonra** | **~98%** | Gerçek kullanıcı geri bildirimleri işlendi |

**%100 sürekli hedef, ama yazılım asla "tamamen bitmez"**. 55 şubeye çıktıkça yeni gereksinimler doğacak (Sprint I, J, K).

---

## BÖLÜM 7 — GÖRDÜĞÜM EKSİKLER VE HATALAR

Dürüst olmak için — **sistem mükemmel değil**. Beni rahatsız eden şeyleri yazıyorum:

### 7.1 🔴 Kritik (Pilot'u Etkileyebilir)

**1. Bordro Hiç Kullanılmamış (0 kayıt)**
- `payroll_records` tablosu boş
- 10 endpoint yazılmış ama kimse test etmemiş
- Pilot'ta 372 personelin bordrosu bu sistem üzerinden hesaplanacaksa **acil test**
- Sprint D'de çözülecek

**2. 3 Paralel Puantaj Sistemi**
- `shift_attendance`, `pdks_excel_records`, `pdks_records` — hangisi doğru belirsiz
- Bordro hesabında hangi veri alınacak? Karar yok.
- Sprint B'de birleştirilecek

**3. Notification Spam (20,327 okunmamış)**
- Mr. Dobody ajanı saatte ~500 bildirim üretiyor
- %99.98 okunmamış, feed kullanılamaz hale gelmiş
- A6'da fix hazır, bugün push edilecek

**4. 14 Rol Boş Dashboard Görüyor**
- 27 roldan sadece 13'üne widget atanmış
- Stajyer, bar_buddy, gida_muhendisi vb. **giriş yapıyor ama boş ekran** görüyor
- Sprint E'de fix

**5. Test Coverage Sıfır**
- 410K satır kod için **hiç unit test yok**
- E2E test yok
- Bir değişiklik çok şey kırabilir, ama bunu görmenin tek yolu manuel test
- Sprint F'de çözülecek (10 E2E + Vitest)

### 7.2 🟡 Önemli (Ama Pilot'u Durdurmaz)

**6. 2,389 TypeScript Hatası**
- Build çalışıyor ama tip güvenliği bozuk
- IDE ipuçları yanıltıcı, refactor riskli
- Runtime etkilemiyor (pre-existing), Sprint F/H'de temizlenecek

**7. 170 Orphan Sayfa**
- App.tsx'te var ama sidebar'a bağlı değil
- Kim kullandığı bilinmiyor (access log yok)
- Ölü kod olabilir, olabilir de gizli kullanılan sayfa olabilir
- Sprint A5 + access log (minimal) ile çözülecek

**8. Akademi v1/v2/v3 Karışık**
- 3 paralel versiyon + 25 orphan akademi sayfası
- Hangi versiyon canlı belirsiz
- Sprint C'de birleşecek

**9. CRM DB'de Tablo YOK**
- Frontend `/crm` sayfası var, backend endpoint var
- Ama `crm_tickets`, `crm_messages` tablosu YOK — başka isimlerde saklıyor
- Sprint C'de düzgün isimlendirilecek

**10. Schema Drift (469 kod / 280 gerçek DB)**
- Kodda tanımlanmış 190 tablo DB'ye push edilmemiş
- Replit drizzle-kit push kullanıyor, migration history yok
- Risk: prod'da deploy edildiğinde neyin push edilmesi gerektiği belirsiz
- Sprint F6'da migration history açılacak

### 7.3 🟢 Minör (Uzun Vadede Düzelt)

**11. Bus Factor = 1 (13 rol tek kullanıcılı)**
- Tek kişi ayrılırsa rol boşta kalır
- Rol konsolidasyon Sprint E'de (27 → 18)

**12. 2 Ölü Rol**
- `fabrika_personel`, `fabrika_sorumlu` — 0 kullanıcı
- Sprint E'de silinecek

**13. Görev İptal Oranı %49**
- 1,327 görevin 650'si iptal
- UX sorunu — görev atama akışı net değil
- Sprint H ile beraber analiz edilecek

**14. task_comments = 0**
- Yorum sistemi var ama kullanılmıyor
- Muhtemelen frontend bağlantı eksik
- Sprint D ile beraber incelenecek

**15. 9 Arıza >30 Gün (SLA İhlal)**
- Açık arıza uzun süredir kapanmıyor
- Dobody escalation çalışıyor mu soru işareti
- Sprint G/H'de escalation otomasyonu

**16. Bundle Boyutu Büyük**
- Server 5.9 MB, Client 25 MB
- Yükleme yavaş
- Sprint G'de chunk split

**17. Performans Sorunları**
- `/api/cost-analysis/recipes` 131ms (yavaş)
- `/api/me/dashboard-data` 128ms (yavaş)
- Sprint G'de materialized view + cache

---

## BÖLÜM 8 — DOSPRESSO'NUN GERÇEK GÜCÜ

Negatifler bittik, şimdi olumlu:

### 8.1 Büyük Başarılar

**1. Kapsam**
- 469 tablo, 1,977 endpoint, 316 sayfa
- Bu **ciddi bir kurumsal platform**. 5 kişilik bir şirketin yapamayacağı ölçekte.
- İş mantığını kodla tanımlama çok iyi.

**2. Checklist Modülü — Gerçek Kullanım Kanıtı**
- 5,098 tamamlama kaydı
- Günde ~13 şube × 13 şablon = aktif kullanılıyor
- Sistem "ölü kod" değil, **gerçekten çalışıyor**.

**3. Schema Tasarımı**
- 23 modüler dosyaya bölünmüş, temiz
- Drizzle + Zod (backend + frontend tip paylaşımı)
- Duplicate export yok, merge conflict yok
- Profesyonel seviye.

**4. Rol Hiyerarşisi İncelikli**
- 27 rol iş gerçekliğini yansıtıyor
- Veri izolasyonu kuralları tutarlı
- "Şube birbirini görmez", "Yatırımcı bağımsız" gibi iş kuralları koda gömülmüş.

**5. Dokümentasyon**
- 65 markdown doküman (docs/)
- Kararlar belgelenmiş, nedenleri yazılmış
- Bu size **geçmişe bakma yetisi** veriyor — 2 ay sonra "neden böyle yapmıştık?" dediğinizde cevap var.

**6. Maliyet Sistemi**
- Bugün donut maliyetini ₺39.32'den ₺17.02'ye düşürdük (gerçek)
- Fatura fiyat sync 143 malzeme için çalışıyor
- Bu **iş kararlarını değiştirebilir** — %57 marj mı, %30 marj mı diye bilmek fiyatlandırmayı etkiler.

**7. Fabrika Entegrasyonu**
- Üretim planından reçete adımlarına, kalite kontrolden sevkiyata — 7 aşamalı pipeline
- 27 reçete, 177 ürün, hepsi bağlı
- Az sistemde olan karmaşıklık.

**8. Git Disiplini**
- Bugün 11 commit, hepsi anlamlı mesajla
- Merge conflict yok, senkron
- Son 2 ayda commit sayısı yüzlerce

### 8.2 Rekabet Avantajı

DOSPRESSO'nun yaptığı şey **Türkiye'de benzersiz** diyebilirim:
- Starbucks, Caribou gibi büyük zincirlerin özel yazılımları var ama Türk KOBİ boyutunda yok
- Tipik Türk franchise zincirleri Excel + WhatsApp ile çalışıyor
- DOSPRESSO **kurumsallaşma köprüsü** — işletmeyi işletmeden çıkarıp **sistem** haline getiriyor.

---

## BÖLÜM 9 — BENİM ÖNERİLERİM (Aslan'a)

### 9.1 Şu An Odaklanman Gerekenler

**1. Pilot'un Gerçekçi Kapsamını Koru**
- HQ + Fabrika + Işıklar + Lara → 4 birim, ~50-70 kullanıcı
- Tüm modülleri zorla kullandırma — sadece **kiosk + checklist + üretim + denetim**
- Bordro pilot'ta Excel'de kalsın — sistem paralel test edilsin

**2. Mr. Dobody Konusunda Gerçekçi Ol**
- "Tam otonom AI" değil, **yarı otonom öneri motoru** olarak sat
- Onay sonrası aksiyon alsın, kararı insan versin
- Güven kazandıkça otonomiyi artır

**3. Personele Eğitim Ver**
- Yazılım ne kadar iyi olursa olsun, **kullanıcı becerisi** kritik
- Pilot öncesi 2-3 günlük onsite eğitim
- "Gün içi kim neyi yapacak" açıkça konuşulsun

**4. Kullanıcı Geri Bildirim Mekanizması**
- Pilot'ta her hafta 30 dakikalık toplantı: "ne işe yaramıyor, ne sinir ediyor"
- Acil sorunları haftalık düzelt
- Backlog'u şeffaf tut

### 9.2 Uzun Vadeli Stratejim

**1. Feature Freeze'e Sadık Kal (8 hafta)**
- Senin "Cinnaboom maliyet" teşebbüsün gibi benim de yapmak istediğim onlarca yeni özellik var
- **HEPSİ Sprint I'ya** (Hafta 9+) ertelensin
- 8 hafta konsolidasyon = 10 yıl ömürlü platform

**2. Ölçeklenme Aşamasında Acele Etme**
- 25 → 55 şube 2 yıl hedefin ama **25'i sağlamlaştırmadan 30'a çıkma**
- Her 5 şube eklendiğinde 1 ay sistem soak testi

**3. Test Kültürü Kur (Sprint F)**
- Test yazma yavaşlatıyor ama **uzun vadede hızlandırır**
- Pilot sonrası her PR test zorunlu olsun
- 1 kırılmış test = merge yok

**4. Observability'ye Yatırım Yap (Sprint H)**
- Sentry + Pino + Slack alert
- Bir sorun olduğunda 5 dakika içinde bil
- "Kullanıcı şikayet etmeden önce Aslan duysun"

**5. Dobody'yi Akıllı Kullan**
- Başta az bildirim, insan onay
- Güven arttıkça otonomi arttır
- %60-70 otonomi hedefi realistik (%100 değil)

---

## BÖLÜM 10 — ÖZET VE TEK CÜMLELİK CEVAP

### Soruların Birer Cümlelik Cevabı

**DOSPRESSO'yu ne kadar iyi anladın?**
> Çok iyi. 65 dokümanı okudum, 11 commit bugün yazdım, 410K satırın mimarisi zihnimde. 6 ayda bir sistem değil, **olgun bir platform**.

**Sistemin hedefi?**
> 25 şubeli **Donut & Coffee Shop franchise zincirinde** (DOSPRESSO = DOnut + esPRESSO) **her şubede aynı kalite, aynı operasyon, aynı standart** — bunu yazılımla sağlamak. Merkezi fabrika üretir, dondurulmuş gönderir, şube sadece servis eder.

**Rollere göre görevler, akışlar?**
> 27 rol, 3 katman (HQ + Fabrika + Şube), her rolün günlük/haftalık ritmi belli. Stajyer 14 günlük onboarding → Bar Buddy → Barista → Supervisor yolu tanımlı. Coach şubeleri denetler, Müdür şubeyi yönetir, Aslan stratejiyi belirler.

**Sistem hazır olunca beklentimiz nedir?**
> 10 büyük beklenti var (tek platform, standart kalite, otomatik operasyon, veri-temelli karar, AI asistanlığı, ölçeklenebilirlik, disiplinli İK, maliyet şeffaflığı, mobil, güvenlik). **Beklentiler iyi tanımlanmış ve gerçekçi.**

**Beklentileri % kaç karşılayacak?**
> Şu an **%72**. 8 hafta sonra **%95**. Pilot + 2-3 ay sonra **%98**. %100 sürekli hareket eden hedef — sistem büyüdükçe yeni ihtiyaçlar doğar.

**Gördüğün eksiklikler, hatalar?**
> 17 madde tespit ettim: 5 kritik (bordro 0 kayıt, 3 paralel puantaj, notification spam, 14 rol boş dashboard, test yok), 5 önemli (TS errors, orphan sayfalar, akademi karışık, CRM tablo yok, schema drift), 7 minör. **Hepsi 8 haftalık roadmap'te ele alınıyor.**

### Son Söz

Aslan, **sistemin gücü bilinçli bir tasarımdan geliyor**. Dokümanlar, kararların nedenleri, iş kuralları — hepsi **düşünülmüş**. Bu "başlayıp kodu büyüten" bir proje değil, "iş modelini anlayıp sonra koda döken" bir proje.

Eksikler var ama **doğru yoldasın**. 8 haftalık disiplinli çalışma ile DOSPRESSO Türkiye'de öne çıkacak bir franchise yönetim platformu olur.

Sormak istediğin her şeyi **iş diliyle** sorabilirsin. Ben teknik detayları ben çözerim.

---

*Rapor son güncelleme: 18 Nisan 2026, 23:45*
*Hazırlayan: Claude (IT Danışman)*
*Veri kaynağı: 65 docs/ markdown, 11 bugünkü commit, Replit raporları, kod tabanı*
