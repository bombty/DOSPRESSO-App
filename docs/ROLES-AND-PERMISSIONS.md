# DOSPRESSO — Roller ve Yetkiler (27 Rol)
**Son güncelleme:** 5 Nisan 2026

---

## ROL HİYERARŞİSİ

```
SİSTEM
└── Admin (sistem yönetimi, yetki kaydırma)

YÖNETİM (tüm şubeleri görür)
├── CEO (tam erişim, stratejik karar)
└── CGO (operasyon sorumlusu, büyüme)

HQ DEPARTMAN (tüm şubeleri görür, kendi alanında)
├── Muhasebe İK (bordro + İK — geçici olarak İK dahil, HQ+Fabrika+Işıklar)
├── Muhasebe (mali işler — eski rol, aktif)
├── Satın Alma (tedarik zinciri, sipariş)
├── Coach (şube denetim + performans)
├── Trainer (eğitim + reçete)
├── Marketing (pazarlama + sosyal medya)
├── Kalite Kontrol (fabrika QC + müşteri feedback)
├── Gıda Mühendisi (gıda güvenliği + HACCP)
├── Fabrika Müdürü (üretim + stok + personel)
├── Teknik (ekipman + IT destek)
├── Destek (müşteri + operasyon destek)
└── Yatırımcı HQ (franchise yönetim, yatırımcı ilişkileri)

ŞUBE (sadece kendi şubesini görür)
├── Müdür (şubenin genel yönetimi)
├── Supervisor (günlük operasyon, vardiya, checklist)
├── Supervisor Buddy (supervisor yardımcısı)
├── Barista (temel operasyon)
├── Bar Buddy (barista yardımcısı)
├── Stajyer (onboarding, eğitim)
└── Yatırımcı Şube (franchise sahibi — kendi şubesi)

FABRİKA (fabrika verilerini görür)
├── Üretim Şefi (üretim hattı yönetimi — pasta şefi dahil)
├── Fabrika Operatörü (istasyon çalışması)
├── Fabrika Sorumlusu (hat sorumlusu)
└── Fabrika Personeli (genel fabrika işleri)

KİOSK (sistem rolü)
└── Şube Kiosk (giriş/çıkış terminali)
```

---

## DETAYLI ROL TANIMLARI

### YÖNETİM

**CEO** — Tam erişim. Tüm modüller, tüm veriler.
- Dashboard: ceo-command-center (KPI + şube haritası + Dobody)
- Görür: her şey
- Dobody: haftalık brief, proje risk, genel performans

**CGO** — Operasyon + büyüme odaklı.
- Dashboard: cgo-teknik-komuta
- Görür: şube performans, franchise pipeline, ekipman, denetim
- Göremez: maaş detayları, TCKN
- Dobody: şube karşılaştırma, arıza trend, performans düşüş

### HQ DEPARTMAN

**Coach** — Şube denetim + performans takibi.
- Dashboard: coach-kontrol-merkezi
- Görür: tüm şube skorları, denetim, eğitim durumu, personel performans
- Göremez: maaş, maliyet, tedarikçi fiyat, TCKN
- Dobody: denetim hatırlatma, skor trend uyarı, eğitim eksik tespiti

**Trainer** — Eğitim + reçete sorumlusu.
- Dashboard: trainer-egitim-merkezi
- Görür: eğitim modülleri, quiz sonuçları, sertifikalar, reçeteler
- Göremez: maaş, maliyet, TCKN
- Dobody: sertifika bitiş uyarısı, eğitim tamamlama takibi

**Muhasebe İK** — Bordro + İK (geçici olarak HQ+Fabrika+Işıklar İK dahil).
- Dashboard: muhasebe-centrum
- Görür: bordro, PDKS, maaş, izin (HQ+Fabrika+Işıklar kapsamında)
- Göremez: yatırımcı şube İK detayları
- Dobody: PDKS eksik uyarısı, bordro hatırlatma, izin bakiye

**Satın Alma** — Tedarik zinciri yönetimi.
- Dashboard: satinalma-centrum
- Görür: stok seviyeleri, tedarikçiler, siparişler, fabrika üretim planı
- Göremez: maaş, personel detayları, TCKN
- Dobody: kritik stok uyarısı, sipariş önerisi, fiyat karşılaştırma

**Kalite Kontrol** — Fabrika QC + müşteri feedback.
- Dashboard: kalite-kontrol-dashboard
- Görür: QC sonuçları, müşteri feedback, denetim, checklist
- Göremez: maaş, TCKN
- Dobody: QC red oranı uyarısı, müşteri şikayet paterni

**Gıda Mühendisi** — Gıda güvenliği + HACCP.
- Görür: fabrika üretim, kalite, reçeteler, gıda güvenliği eğitimleri
- Göremez: maaş, TCKN, şube satış
- Dobody: gıda güvenliği uyarısı, LOT SKT takibi

**Marketing** — Pazarlama + kampanya.
- Dashboard: marketing-centrum
- Görür: CRM, kampanyalar, müşteri analiz
- Göremez: maaş, maliyet, TCKN
- Dobody: NPS trend, kampanya performans

**Teknik** — Ekipman + IT destek.
- Görür: ekipman, arıza, servis talepleri
- Göremez: maaş, TCKN
- Dobody: bakım gecikme, tekrar arıza, servis SLA

**Destek** — Müşteri + operasyon destek.
- Dashboard: destek-centrum
- Görür: CRM ticket'ları, müşteri şikayetleri
- Göremez: maaş, maliyet, TCKN
- Dobody: açık ticket uyarısı, SLA yaklaşma

**Fabrika Müdürü** — Fabrika genel yönetimi.
- Dashboard: fabrika-centrum
- Görür: üretim planı, QC, stok, LOT, sevkiyat, fabrika personeli
- Göremez: şube satış, HQ muhasebe, maaş detayları
- Dobody: üretim planı eksik, SKT uyarısı, fire oranı, hammadde stok

### ŞUBE

**Müdür** — Şubenin genel yönetimi.
- Dashboard: sube-centrum
- Görür: kendi şubesi — vardiya, personel, stok, ekipman, denetim sonuçları
- Göremez: diğer şubeler, HQ muhasebe, fabrika maliyet, maaş
- Dobody: vardiya eksik, stok kritik, denetim aksiyon, arıza

**Supervisor** — Günlük operasyon yönetimi.
- Dashboard: supervisor-centrum
- Görür: kendi şubesi — vardiya, checklist, stok, ekipman
- Göremez: maaş, maliyet, diğer şubeler
- Dobody: checklist hatırlatma, vardiya eksik, stok sipariş, arıza bildir
- Skor etkisi: şube denetim skoru Supervisor'ı ETKİLER

**Supervisor Buddy** — Supervisor yardımcısı.
- Dashboard: supbuddy-centrum
- Sınırlı operasyon yetkisi
- Dobody: görev hatırlatma

**Barista** — Temel operasyon.
- Dashboard: personel-centrum (Benim Günüm)
- Görür: kendi görevleri, vardiya, eğitim, checklist
- Göremez: şube skoru, maaş, stok detayı, denetim
- Dobody: checklist hatırlatma, eğitim hatırlatma, vardiya bilgi
- Skor etkisi: personel denetim skoru BİREYSEL etkiler

**Bar Buddy / Stajyer** — En sınırlı erişim.
- Görür: kendi görevleri ve eğitimleri
- Dobody: onboarding adımları, eğitim hatırlatma

**Yatırımcı Şube** — Franchise sahibi.
- Dashboard: yatirimci-centrum
- Görür: kendi şubesi genel performans, denetim sonuçları
- Kendi İK'sını yönetir
- Göremez: HQ iç verileri, diğer şubeler
- Dobody: şube performans özeti, denetim aksiyon

### FABRİKA

**Üretim Şefi** — Üretim hattı yönetimi (pasta şefi dahil).
- Dashboard: fabrika dashboard
- Görür: üretim planı, reçeteler, istasyon performansı, personel
- Göremez: şube, HQ muhasebe, maaş
- Dobody: üretim planı hatırlatma, istasyon performans, fire uyarısı

**Fabrika Operatörü** — İstasyon çalışması.
- Dashboard: fabrika kiosk
- Görür: kendi istasyonu, günlük hedef, reçete
- Dobody: görev hatırlatma, hedef takibi

**Fabrika Sorumlusu** — Hat sorumlusu.
- Dashboard: fabrika kiosk
- Görür: kendi hattı, personel, üretim kayıtları
- Dobody: hat performans, eksik personel

**Fabrika Personeli** — Genel fabrika işleri.
- Dashboard: fabrika kiosk
- Görür: kendi görevleri
- Dobody: görev hatırlatma

---

## DİNAMİK YETKİ KAYDIRMA

### Neden gerekli:
- İK departmanı henüz yok → Muhasebe geçici üstleniyor
- Tatil/izin durumunda başka bir kişi görevleri devralar
- Geçici proje ekipleri farklı yetkilere ihtiyaç duyar

### Nasıl çalışır:
```
Admin paneli → Yetkilendirme bölümü:
  
  Kaynak Rol: [Coach]
  Hedef Rol: [Trainer]
  Kaydırılan Modüller: [✓ Denetim] [✓ Şube Performans] [□ Eğitim]
  Yetki Seviyesi: [Sadece Görüntüle / Düzenleme / Tam Yetki]
  Süre: [Geçici: 15 Nisan — 30 Nisan] veya [Süresiz]
  Neden: [Yıllık izin]
  
  → Kaydet
  → Mr. Dobody yeni sorumluya bildirim gönderir
  → Eski sorumlunun bekleyen işlerini listeler
  → Süre dolunca otomatik geri alır
```

### Mr. Dobody entegrasyonu:
```
Yetki kaydırıldığında:
  → Yeni sorumluya: "Coach yetkisi size aktarıldı. 3 bekleyen denetim var."
  → Eski sorumluya: "Yetkileriniz Trainer'a aktarıldı (15-30 Nisan)"
  
Süre dolduğunda:
  → Otomatik geri al
  → Her iki tarafa bildirim
  → Ara dönemde yapılan işlerin raporu
```

---

## VERİ ERİŞİM MATRİSİ

| Veri | CEO | Coach | Muhasebe | Supervisor | Barista | Fab.Müd | Ürt.Şefi |
|------|:---:|:-----:|:--------:|:----------:|:-------:|:-------:|:--------:|
| Tüm şube skorları | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kendi şube skoru | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Maaş bilgileri | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Fabrika maliyet | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Tedarikçi fiyat | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| TCKN/kişisel | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Diğer şube | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Üretim verileri | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Reçeteler | ✅ | ✅ | ❌ | ❌ | basit | ✅ | ✅ |

---

## ŞUBE İK YÖNETİMİ

```
HQ + Fabrika + Işıklar:
  → Muhasebe İK yönetir (geçici İK dahil)
  → İleride ayrı İK rolü eklenecek

Yatırımcı Şubeleri:
  → Her şube KENDİ İK'sını yönetir
  → Puantaj, giriş/çıkış, skor → şube yöneticisine rapor
  → HQ (Coach, Trainer, CGO) sadece GÖRÜNTÜLER
  → Mr. Dobody vardiya uyum raporu → şube yöneticisine

Muhasebe → yatırımcı şube İK'sına KARIŞMAZ
```
