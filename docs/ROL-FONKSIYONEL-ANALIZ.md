# DOSPRESSO — Rol Bazlı Fonksiyonel Analiz
**Soru:** Her rol sistemi doğru yönetebiliyor mu? Doğru bilgiler, doğru aksiyonlar var mı?
**Tarih:** 2 Nisan 2026

---

## SUPERVİSOR — "Vardiyamı yönetmeliyim"

### ✅ Yapabiliyor
- Ekip canlı takip (kim vardiyada, kim molada)
- Ekipman sağlık görüntüleme
- Misafir geri bildirim görme + SLA ile yanıtlama
- Görevler + periyodik görev listesi
- Vardiya & izin özeti
- Kayıp eşya bildirimi
- Dobody aksiyonları

### ❌ Yapamıyor AMA Yapmalı
| Eksik | Neden Kritik | Aksiyon |
|-------|-------------|---------|
| **Checklist tamamlama durumu** | "Açılış checklist yapıldı mı?" göremiyorlar | Widget: Bugünün checklist'leri — kim tamamladı, kim tamamlamadı |
| **Hızlı görev oluştur butonu** | Ekibine anlık görev atayamıyor | Dashboard'a "+" butonu → hızlı görev dialog |
| **Vardiya devir teslim** | Vardiya değiştiğinde devir yapamıyor | Vardiya bitiş → devir teslim formu (notlar + sorunlar) |
| **Bugünün programı** | Bugün kim çalışıyor, kaçta geliyor bilmiyor | Widget: Bugün vardiya planı (kişi + saat) |
| **Stok uyarısı** | Müşteriye "bitti" demek zorunda | Widget: Kritik stok (bugün bitebilecekler) |
| **CRM destek kısayolu** | HQ'ya teknik destek isteyemiyor kolayca | Buton: "HQ'ya Destek Talebi" → CRM |
| **Personel performans hızlı bakış** | Ekibinin performansını göremiyorlar | Widget: Ekip performans sıralaması |
| **Mola dönüş kontrolü** | PDKS anomali göremiyor | Widget: Mola dönüş yapmayanlar (anlık) |

### 🤖 Dobody Supervisor'a Ne Söylemeli
```
"Ali 15dk geç kaldı — henüz giriş yapmadı"
"Açılış checklist tamamlanmadı — 30dk geçti"
"2 misafir geri bildirim SLA'ya yaklaşıyor — yanıtla"
"Dün Mehmet 3 görevi tamamlamadı"
"Bugün stok: süt yarın bitebilir"
```

---

## BARİSTA — "Bugün ne yapmam gerekiyor?"

### ✅ Yapabiliyor
- Performans skorunu görme
- Eğitim ilerleme takibi
- Görev listesi (bu hafta)
- Misafir geri bildirimleri görme
- Kayıp eşya bildirimi
- Onboarding (stajyer)
- Dobody aksiyonları

### ❌ Yapamıyor AMA Yapmalı
| Eksik | Neden Kritik | Aksiyon |
|-------|-------------|---------|
| **Bugünkü vardiya bilgisi** | Kaçta giriş/çıkış yapacağını bilmiyor | Widget: "Bugün: 08:00-17:00" + kalan süre |
| **Kiosk kısayolu** | Vardiya başlatmak için kiosk'a gitmeli | Buton: "Vardiyamı Başlat" → kiosk |
| **Bugünkü checklist** | Hangi checklist'i tamamlaması gerektiğini bilmiyor | Widget: Bugün checklist'lerim (tamamla butonu) |
| **Rozetler/Başarılar** | Motivasyon eksik | Widget: Kazanılan rozetler + yaklaşan hedefler |
| **Haftalık performans trend** | Sadece anlık skor var, trend yok | Grafik: Son 4 hafta performans |
| **Ekip sıralaması** | Nerede olduğunu bilmiyor | Widget: Şube sıralaması (anonim veya isimli) |
| **Günlük hedef** | "Bugün ne bekleniyor?" yok | Widget: Bugünün hedefleri (görev + satış) |

### 🤖 Dobody Barista'ya Ne Söylemeli
```
"Bugün vardiya: 08:00-17:00 — 15dk sonra başlıyor"
"Açılış checklist'ini tamamla"
"2 görevin var — 1'i bugün bitiyor"
"Eğitim modülü 'Latte Art' %80 — tamamla → rozet kazan"
"Bu hafta performansın %92 — harika devam et!"
```

---

## COACH — "Tüm şubeleri yönetmeliyim"

### ✅ Yapabiliyor
- Şube sağlık skorları (harita + liste)
- Uyum widget (vardiya, checklist, eğitim %)
- Eskalasyon listesi (tıklanabilir → CRM)
- Arıza, CRM, Personel MiniStats (tıklanabilir)
- 5 tab: Genel, Şubeler, Uyumsuz, Sıralama, Plan
- Uyumsuz şube listesi
- Dobody aksiyonları

### ❌ Yapamıyor AMA Yapmalı
| Eksik | Neden Kritik | Aksiyon |
|-------|-------------|---------|
| **Ziyaret planı** | "Bu hafta hangi şubeye gideceğim?" yok | Widget: Haftalık ziyaret takvimi + planlama |
| **Denetim durumu** | Yaklaşan/geciken denetimler göremiyorlar | Widget: Denetim takvimi + "45 gündür denetlenmedi" uyarı |
| **CAPA takip** | Açık düzeltici eylemler nerede? | Widget: CAPA listesi (deadline + sorumlu) |
| **Görev takip (atadıkları)** | "Atadığım görevlerin durumu?" yok | Widget: Atanan görevler — tamamlanan/geciken |
| **TopFlop sıralaması** | En iyi/kötü şube net değil | Widget: En iyi 3 + en kötü 3 (detay link) |
| **Hızlı görev atama** | Görev atamak için 3-4 tıklama gerekiyor | Buton: Dashboard'da "Hızlı Görev Ata" → dialog |
| **NPS trend grafiği** | Sadece anlık puan var | Grafik: Son 4 hafta NPS trendi (şube bazlı) |
| **Şube karşılaştırma** | 2 şubeyi yan yana karşılaştıramıyor | Araç: Şube A vs Şube B spider chart |

### 🤖 Dobody Coach'a Ne Söylemeli
```
"Lara checklist uyumu %52 — bu hafta ziyaret planla"
"3 CAPA deadline'ı bu hafta doluyor — kontrol et"
"Işıklar NPS 3.8→3.2 düştü — misafir şikayetleri incele"
"5 görev 7+ gündür gecikiyor — eskalasyon gerekli"
"Bu hafta en çok gelişen: Kemer (+8 puan)"
"Lara 45 gündür denetlenmedi — hijyen denetimi planla"
```

---

## TRAİNER — "Eğitim kalitesini yönetmeliyim"

### ✅ Yapabiliyor
- Şube sağlık skorları
- Uyum (eğitim, akademi, checklist %)
- Eskalasyon
- Arıza, CRM, Personel MiniStats
- Şube eğitim durumu (tab)
- Uyumsuz şubeler
- Dobody aksiyonları

### ❌ Yapamıyor AMA Yapmalı
| Eksik | Neden Kritik | Aksiyon |
|-------|-------------|---------|
| **Eğitim takvimi** | Planlanmış eğitimler nerede? | Widget: Bu hafta/ay eğitim programı |
| **Sertifika durumu** | Hangi personelde hangi sertifika var/eksik? | Widget: Sertifika matrisi (şube × sertifika) |
| **Quiz/Sınav sonuçları** | Başarı oranı, en zor konular? | Widget: Son quiz sonuçları + analiz |
| **Yeni ürün eğitim rollout** | Kaç şube yeni reçeteyi öğrendi? | Widget: Rollout durumu (şube bazlı %) |
| **Yetkinlik matrisi** | Şube bazlı: hangi barista ne biliyor? | Tablo: Personel × Skill (Latte Art, Pour Over...) |
| **Eğitim görev ata** | Eğitim görevi oluşturmak zor | Buton: "Eğitim Görevi Ata" → kolay form |
| **Onboarding takip** | Yeni personel nerede? | Widget: Onboarding pipeline (başlamadı/devam/tamamlandı) |

### 🤖 Dobody Trainer'a Ne Söylemeli
```
"2 yeni barista (Işıklar) onboarding tamamlamadı — 5. gün"
"Lara'da 3 barista 'Espresso Temelleri' sertifikası eksik"
"Yeni reçete rollout: 2/4 şube tamamladı — Lara + Kemer bekliyor"
"Bu hafta quiz başarı oranı: %72 — geçen hafta %68"
"Ali Barista tüm modülleri tamamladı — sertifika ver"
```

---

## MÜDÜR — "Şubemi yönetmeliyim"

### ✅ Yapabiliyor
- Şube skoru + franchise karşılaştırma
- Misafir GB + SLA
- Görevler (HQ'dan gelen)
- Personel durumu
- Stok durumu
- Arıza bildirimi
- Kayıp eşya
- Finans özeti (read)
- Dobody aksiyonları

### ❌ Yapamıyor AMA Yapmalı
| Eksik | Neden Kritik | Aksiyon |
|-------|-------------|---------|
| **Günlük özet (morning brief)** | Giriş yapınca "bugün dikkat et" yok | Widget: Dobody sabah brief'i |
| **Checklist uyum detayı** | Hangi checklist yapılmadı bilmiyor | Widget: Bugün checklist durumu (kırmızı/yeşil) |
| **Kasa kontrolü** | Günlük kasa raporu yok | Widget: Bugün kasa + sapma |
| **Fiks gider giriş kolaylığı** | Muhasebe'nin istediği veriyi giremiyor | Buton: "Fiks Gider Gir" → hızlı form |
| **Denetim sonuçları** | Kendi denetim geçmişini kolay göremiyorlar | Widget: Son denetim puanı + CAPA |
| **Vardiya planı özeti** | Bu haftanın vardiya planı | Widget: Haftalık vardiya tablosu |
| **CRM destek talebi takip** | Açtığı talebin durumunu göremiyorlar | Widget: Açık taleplerim (durum + SLA) |

### 🤖 Dobody Müdür'e Ne Söylemeli
```
"Günaydın! Bugün dikkat: 2 SLA yaklaşıyor, stok süt kritik"
"Dün kapanış checklist yapılmadı — kontrol et"
"Bu hafta NPS 3.4 — geçen hafta 3.8 (düşüş!)"
"HQ'dan 3 yeni görev geldi — deadline 2 gün"
"Fiks gider girişi 5 gündür bekliyor — muhasebe uyardı"
"Müşteri Ayşe 1 puan verdi: 'Bardak kirli' — incele"
```

---

## GENEL EKSİKLER (TÜM ROLLER)

### 1. Aksiyon Butonları Eksik
Çoğu dashboard'da sadece VERİ GÖSTERİMİ var, AKSİYON ALMA yok.
```
Olması gereken butonlar:
├── Coach: "Hızlı Görev Ata" + "Denetim Planla"
├── Supervisor: "Görev Oluştur" + "Checklist Ata"
├── Müdür: "HQ'ya Talep" + "Fiks Gider Gir"
├── Barista: "Vardiyamı Başlat" + "Checklist Tamamla"
└── Tüm: "Arıza Bildir" + "Kayıp Eşya Bildir"
```

### 2. Dobody Rol Bazlı Filtreleme
Şu an tüm Dobody aksiyonları herkese gösteriliyor.
```
Olması gereken:
├── CEO → Stratejik insight + eskalasyon
├── Coach → Şube performans + ziyaret önerisi
├── Supervisor → Ekip yönetimi + anlık uyarılar
├── Barista → Kişisel görev + eğitim hatırlatma
└── Her role SADECE kendini ilgilendiren aksiyonlar
```

### 3. Bağlantı/Link Eksikleri
```
Eksik navigasyonlar:
├── Supervisor → Checklist sayfasına link YOK
├── Barista → Kiosk'a doğrudan link YOK
├── Coach → Denetim sayfasına link YOK
├── Müdür → CRM destek talebi kısayol YOK
└── Trainer → Akademi/eğitim yönetimi link YOK
```

### 4. Widget'lar Bilgi Gösteriyor AMA Aksiyon Sunmuyor
```
MEVCUT:  "Arıza: 5 açık"     ← sadece sayı
OLMALI:  "Arıza: 5 açık [+ Bildir] [→ Detay]"  ← sayı + aksiyon

MEVCUT:  "Checklist: %52"    ← sadece yüzde
OLMALI:  "Checklist: %52 — 3 personel yapmadı [→ Takip Et]"

MEVCUT:  "Görev: 12 bekleyen" ← sadece sayı
OLMALI:  "Görev: 12 bekleyen [→ Gecikenleri Gör] [+ Yeni Görev]"
```
