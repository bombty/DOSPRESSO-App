# DOSPRESSO — Roller ve Yetkiler
**21 rol, 4 grup, veri erişim matrisi**

---

## HQ Rolleri (tüm şubeleri görür)

### CEO
Tam erişim. Tüm modüller, tüm veriler, tüm şubeler.
Dashboard: Portfolio özet, şube haritası, finansal KPI'lar.

### CGO (Chief Growth Officer)
Büyüme odaklı. Franchise açılış, şube performans, pazarlama.
Dashboard: Franchise pipeline, şube skor haritası, büyüme metrikleri.

### Admin
Sistem yönetimi. Kullanıcı oluşturma, rol atama, modül ayarları.
Dashboard: Sistem sağlığı, kullanıcı yönetimi, parametre ayarları.

### Coach
Şube denetimi + eğitim. Tüm şubelere denetim yapabilir.
Dashboard: Denetim takvimi, şube skorları, eğitim durumu.
GÖREMEZ: Muhasebe detayları, maaşlar, tedarikçi fiyatları.

### Trainer (Eğitmen)
Eğitim yönetimi. Eğitim modülleri oluşturma, personel gelişim.
Dashboard: Eğitim tamamlanma, sertifika durumu, quiz sonuçları.
GÖREMEZ: Finansal veriler.

### Muhasebe
HQ + Fabrika + Işıklar mali işleri. Bordro, gelir-gider.
Dashboard: Bordro durumu, gelir-gider özeti, bütçe sapması.
GÖREMEZ: Yatırımcı şubelerin İK detayları.

### Muhasebe İK
Muhasebe + İK birleşik rol. Personel İK işlemleri + mali.
Kapsam: HQ + Fabrika + Işıklar (yatırımcı şubeleri HARİÇ).

### Satınalma
Tedarik zinciri. Sipariş, tedarikçi, fiyat karşılaştırma.
Dashboard: Stok durumu, sipariş takibi, tedarikçi performansı.
GÖREMEZ: Personel verileri, maaşlar.

### Diğer HQ: marketing, kalite_kontrol, gida_muhendisi, teknik, destek, yatirimci_hq

---

## Şube Rolleri (sadece kendi şubesini görür)

### Müdür (mudur)
Şubenin genel yönetimi. Vardiya, personel, stok, operasyon.
GÖREMEZ: Diğer şubeler, HQ muhasebe, fabrika maliyet.

### Yatırımcı Şube (yatirimci_branch)
Franchise sahibi. Kendi şubesinin genel performansını görür.
Kendi İK'sını yönetir (HQ muhasebe karışmaz).
GÖREMEZ: HQ iç verileri, diğer şubeler.

### Supervisor
Şube günlük operasyon. Vardiya, checklist, personel takibi.
Denetim skoru Supervisor'ı ETKİLER.
GÖREMEZ: Maaş detayları, HQ verileri.

### Supervisor Buddy
Supervisor yardımcısı. Sınırlı operasyon yetkisi.
Denetim skoru Sup. Buddy'i ETKİLER.

### Barista
Temel operasyon. Kendi görevleri, vardiya, eğitim.
Denetim ŞUBE skoru Barista'yı ETKİLEMEZ.
Personel denetim skoru BİREYSEL olarak etkiler.
GÖREMEZ: Şube skoru detayı, finansal veri, diğer personel verileri.

### Bar Buddy, Stajyer
En sınırlı erişim. Kendi görevleri ve eğitimleri.

---

## Fabrika Rolleri

### Fabrika Müdürü (fabrika_mudur)
Fabrika genel yönetimi. Üretim planı, personel, kalite.
GÖREMEZ: Şube satış, HQ muhasebe detayları.

### Fabrika Sorumlu, Operatör, Personel
Üretim hattı işleri. İstasyon bazlı çalışma.
GÖREMEZ: Şube verileri, HQ verileri.

---

## Veri Erişim Matrisi

| Veri | CEO | Coach | Muhasebe | Supervisor | Barista | Fabrika |
|------|-----|-------|----------|------------|---------|---------|
| Tüm şube skorları | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Kendi şube skoru | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Denetim sonuçları | ✅ | ✅ | ❌ | ✅(kendi) | ❌ | ❌ |
| Maaş bilgileri | ✅ | ❌ | ✅(HQ) | ❌ | ❌ | ❌ |
| Fabrika maliyet | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Tedarikçi fiyat | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Personel TCKN | ❌ | ❌ | ✅(HQ) | ❌ | ❌ | ❌ |
| Diğer şube verisi | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Üretim verileri | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Reçete detayları | ✅ | ✅ | ❌ | ❌ | ✅(basit) | ✅ |
