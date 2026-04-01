# DOSPRESSO — Rol Bazlı Erişim, Yetki ve Görev Matrisi
**Tarih:** 2 Nisan 2026 | **Versiyon:** 2.0
**Perspektifler:** Güvenlik, İş Akışı, Franchise Yönetimi, UX, Teknik

---

## BÖLÜM 1: TEMEL PRENSİPLER

### 1.1 Veri İzolasyonu Kuralları
```
KURAL 1: Şube ↔ Şube izolasyonu
  Lara personeli Işıklar verisini ASLA göremez.
  Işıklar personeli Lara verisini ASLA göremez.

KURAL 2: Şube → Fabrika izolasyonu
  Şube personeli Fabrika verisini ASLA göremez.
  Fabrika personeli Şube verisini ASLA göremez.

KURAL 3: Yukarı akış (tek yön)
  Veri şubeden → HQ'ya akar (raporlar, performans, stok).
  HQ'dan → şubeye SADECE görev, duyuru, politika gider.
  Şubeler arası yatay veri akışı YASAK.

KURAL 4: HQ tam görünürlük
  HQ rolleri TÜM şubelerin verisini görebilir (aggregated).
  HQ rolleri Fabrika verisini görebilir.

KURAL 5: En az yetki prensibi
  Her rol SADECE işini yapmak için gereken veriyi görür.
  Barista finans verisini görmez.
  Stajyer personel yönetimini görmez.
```

### 1.2 Rol Hiyerarşisi
```
SEVIYE 1 — SİSTEM:     Admin (tüm erişim)
SEVIYE 2 — YÖNETİM:    CEO, CGO
SEVIYE 3 — HQ OPS:     Coach, Trainer
SEVIYE 4 — HQ DESTEK:  Muhasebe, Satınalma, Marketing, Teknik, Destek
SEVIYE 5 — FABRİKA:    Fabrika Müdür, Üretim Şefi, Kalite Kontrol, Gıda Müh.
SEVIYE 6 — FABRİKA ZN: Fabrika Operatör, Fabrika Personel
SEVIYE 7 — ŞUBE YÖN:   Müdür, Yatırımcı (Şube)
SEVIYE 8 — ŞUBE OPS:   Supervisor, Supervisor Buddy
SEVIYE 9 — ŞUBE PERS:  Barista, Bar Buddy, Stajyer
SEVIYE 10 — KİOSK:     Şube Kiosk (sadece kiosk ekranı)
```

---

## BÖLÜM 2: ROL BAZLI DETAYLI ERİŞİM MATRİSİ

### 2.1 CEO / Admin

| Kategori | Erişim | Scope | Sayfa |
|----------|--------|-------|-------|
| Dashboard | ✅ CEO Command Center | Tüm şubeler | /ceo-command-center |
| Şubeler | ✅ Tüm şube listesi + detay | Tüm | /subeler |
| Fabrika | ✅ Tüm fabrika verileri | Tüm | /fabrika-centrum |
| Depo | ✅ Depo + lojistik | Tüm | /depo-centrum |
| Personel/İK | ✅ Tüm personel | Tüm | /ik |
| Finans | ✅ Tüm gelir-gider-bordro | Tüm | /muhasebe-centrum |
| CRM | ✅ Tüm talepler + GB | Tüm | /crm |
| Operasyon | ✅ Görevler, checklist, denetim | Tüm | /gorevler |
| Raporlar | ✅ Tüm raporlar | Tüm | /raporlar |
| Görev | ✅ Oluştur, ata, onayla | Tüm | /task-atama |
| Admin | ✅ Rol yetkileri, ayarlar | — | /admin/* |
| Dobody | ✅ Tüm insight + aksiyon | — | Her dashboard |

### 2.2 CGO (Teknik Direktör)

| Kategori | Erişim | Scope | Sayfa |
|----------|--------|-------|-------|
| Dashboard | ✅ CGO Teknik Komuta | Tüm şubeler | /cgo-teknik-komuta |
| Ekipman | ✅ Arıza yönetimi + bakım | Tüm | /ekipman |
| CRM | ✅ Teknik talepler | Teknik dept | /crm?dept=teknik |
| Fabrika | ✅ Ekipman + QC | Tüm | /fabrika-centrum |
| Personel | ✅ Teknik ekip | Tüm | /ik |
| Görev | ✅ Teknik görev oluştur | Tüm | /task-atama |
| ❌ | Finans detayı, bordro | — | — |

### 2.3 Coach (Şube Performans Sorumlusu)

| Kategori | Erişim | Scope | Sayfa |
|----------|--------|-------|-------|
| Dashboard | ✅ Coach Kontrol Merkezi | Tüm şubeler | /coach-kontrol-merkezi |
| Şubeler | ✅ Tüm şube sağlık skoru | Tüm | /sube-saglik-skoru |
| Denetim | ✅ Planlama + yürütme | Tüm şubeler | /denetimler |
| Operasyon | ✅ Görev ata + checklist oluştur | Tüm şubeler | /gorevler |
| CRM | ✅ Şube talepleri + GB | Tüm | /crm |
| Personel | ✅ Performans takip | Tüm | /ik |
| Fabrika | ✅ Görüntüle (read) | — | /fabrika-centrum |
| Görev | ✅ Şube'ye görev oluştur | Tüm | /task-atama |
| ❌ | Finans detayı, bordro, admin | — | — |

### 2.4 Trainer (Eğitim Sorumlusu)

| Kategori | Erişim | Scope | Sayfa |
|----------|--------|-------|-------|
| Dashboard | ✅ Eğitim Merkezi | Tüm şubeler | /trainer-egitim-merkezi |
| Eğitim | ✅ Modül + quiz + sertifika | Tüm | /akademi |
| Denetim | ✅ Eğitim denetimi | Tüm şubeler | /denetimler |
| Operasyon | ✅ Eğitim görev ata | Tüm | /gorevler |
| CRM | ✅ Eğitim talepleri | Eğitim dept | /crm?dept=trainer |
| Personel | ✅ Eğitim durumu | Tüm | /ik |
| ❌ | Finans, ekipman, fabrika detayı | — | — |

### 2.5 Muhasebe / İK

| Kategori | Erişim | Scope | Sayfa |
|----------|--------|-------|-------|
| Dashboard | ✅ İK & Muhasebe Merkezi | HQ+Fab+Işıklar | /muhasebe-centrum |
| Personel | ✅ Bordro, izin, devam | HQ+Fab+Işıklar | /ik |
| Finans | ✅ Gelir-gider, maliyet | Tüm (read) | /muhasebe |
| Raporlar | ✅ Finansal raporlar | — | /raporlar |
| ❌ | Operasyon, ekipman, CRM, fabrika üretim | — | — |

### 2.6 Satınalma

| Kategori | Erişim | Scope | Sayfa |
|----------|--------|-------|-------|
| Dashboard | ✅ Satınalma Merkezi | Tüm | /satinalma-centrum |
| Stok | ✅ Stok yönetimi + sipariş | Tüm | /stok |
| Tedarikçi | ✅ Tedarikçi yönetimi | — | /stok |
| CRM | ✅ Lojistik talepler | Lojistik dept | /crm?dept=lojistik |
| ❌ | Personel, finans detayı, operasyon, fabrika üretim | — | — |

### 2.7 Fabrika Müdür / Üretim Şefi

| Kategori | Erişim | Scope | Sayfa |
|----------|--------|-------|-------|
| Dashboard | ✅ Fabrika Kontrol Merkezi | Fabrika | /fabrika-centrum |
| Üretim | ✅ Plan, üretim, QC | Fabrika | /fabrika |
| Depo | ✅ Stok, LOT, sevkiyat | Fabrika | /depo-centrum |
| Personel | ✅ Fabrika personeli | Fabrika | /ik (fabrika scope) |
| Reçete | ✅ Reçete yönetimi | — | /receteler |
| ❌ | Şube verileri, HQ finans, CRM şube | — | — |

### 2.8 Müdür (Şube Yöneticisi / Yatırımcı)

| Kategori | Erişim | Scope | Sayfa |
|----------|--------|-------|-------|
| Dashboard | ✅ Şube Kontrol Merkezi | KENDİ şube | /sube-centrum |
| Personel | ✅ Kendi şube personeli | KENDİ şube | /ik |
| Görevler | ✅ HQ'dan gelenleri tamamla + alt görev oluştur | KENDİ şube | /gorevler |
| Checklist | ✅ Personele ata + takip | KENDİ şube | /checklistler |
| Denetim | ✅ Kendi sonuçlarını GÖR (read-only) | KENDİ şube | /denetimler |
| Ekipman | ✅ Arıza bildir + takip | KENDİ şube | /ekipman |
| Stok | ✅ Stok durumu | KENDİ şube | /stok |
| CRM | ✅ Destek talebi oluştur + misafir GB yanıtla | KENDİ şube | /crm |
| Finans | ✅ Kendi şube gelir-gider (read) | KENDİ şube | Centrum widget |
| Kayıp Eşya | ✅ Oluştur + yönet | KENDİ şube | /kayip-esya |
| ❌ | Diğer şubeler, Fabrika, HQ yönetim, bordro detayı | — | — |

### 2.9 Supervisor

| Kategori | Erişim | Scope | Sayfa |
|----------|--------|-------|-------|
| Dashboard | ✅ Supervisor Merkezi | KENDİ şube | /supervisor-centrum |
| Görevler | ✅ Ekibine dağıt + takip | KENDİ vardiya | /gorevler |
| Checklist | ✅ Tamamlama takibi | KENDİ vardiya | /checklistler |
| Personel | ✅ Ekip performansı (sınırlı) | KENDİ ekip | /ik (sınırlı) |
| Ekipman | ✅ Arıza bildir | KENDİ şube | /ekipman |
| CRM | ✅ Destek talebi + GB yanıtla | KENDİ şube | /crm |
| Kayıp Eşya | ✅ Oluştur + yönet | KENDİ şube | /kayip-esya |
| ❌ | Finans, bordro, diğer şubeler, Fabrika, HQ, denetim oluşturma | — | — |

### 2.10 Barista / Bar Buddy

| Kategori | Erişim | Scope | Sayfa |
|----------|--------|-------|-------|
| Dashboard | ✅ Benim Günüm | KENDİ veri | /personel-centrum |
| Kiosk | ✅ Vardiya giriş/çıkış | KENDİ | /sube/kiosk |
| Görevler | ✅ Atanan görevleri tamamla | KENDİ | Kiosk + /gorevler |
| Checklist | ✅ Açılış/kapanış checklist tamamla | KENDİ | Kiosk |
| Eğitim | ✅ Kendi eğitim modülleri | KENDİ | /akademi |
| Performans | ✅ Kendi performans skoru | KENDİ | /performansim |
| Kayıp Eşya | ✅ Bildir | KENDİ şube | /kayip-esya |
| ❌ | Personel yönetimi, finans, ekipman yönetimi, stok, CRM yönetimi, denetim, raporlar, Fabrika, HQ | — | — |

### 2.11 Stajyer

| Kategori | Erişim | Scope | Sayfa |
|----------|--------|-------|-------|
| Dashboard | ✅ Onboarding ekranı | KENDİ | /personel-centrum |
| Kiosk | ✅ Vardiya giriş/çıkış | KENDİ | /sube/kiosk |
| Eğitim | ✅ Onboarding görevleri | KENDİ | /akademi |
| ❌ | Neredeyse her şey | — | — |

### 2.12 Yatırımcı (Şube)

| Kategori | Erişim | Scope | Sayfa |
|----------|--------|-------|-------|
| Dashboard | ✅ Read-only özet | KENDİ şube | /yatirimci-centrum |
| Raporlar | ✅ Performans + finans raporu | KENDİ şube | /raporlar |
| Misafir GB | ✅ Görüntüle (SLA yok) | KENDİ şube | Centrum widget |
| ❌ | Operasyon, personel yönetimi, CRM, görev oluşturma | — | — |

---

## BÖLÜM 3: GÜNLÜK İŞ AKIŞI (ROL BAZLI)

### 3.1 CEO Günlük Akışı
```
08:00 → Giriş → CEO Command Center
  ↓ Şube sağlık haritasına bak (hangi şube kritik?)
  ↓ Eskalasyonları kontrol et (SLA aşan var mı?)
  ↓ Dobody insight'ları oku (önemli pattern var mı?)
  ↓ Bordro/finans özeti gözden geçir
  ↓ Gerekirse: görev oluştur, onay ver
17:00 → Haftalık: Raporları incele, Coach ile görüşme
```

### 3.2 Coach Günlük Akışı
```
08:00 → Giriş → Coach Kontrol Merkezi
  ↓ Şube sağlık skorları (hangisi düştü?)
  ↓ Uyum widget (checklist uyum düşen var mı?)
  ↓ Geciken görevler kontrol
  ↓ Dobody önerileri (hangi şubeyi ziyaret etmeliyim?)
  ↓ Misafir NPS trendini kontrol et
  ↓ Gerekirse: Şube'ye görev ata, denetim planla
SAHA → Şube ziyareti → Denetim yürütme → CAPA oluştur
17:00 → Şube karşılaştırma, eskalasyon takip
```

### 3.3 Müdür Günlük Akışı
```
08:00 → Giriş → Şube Kontrol Merkezi
  ↓ Bugünün görevlerini gör
  ↓ Açılış checklist yapıldı mı kontrol
  ↓ Misafir geri bildirimleri — SLA dahilinde yanıtla
  ↓ Arıza bildirimleri kontrol
  ↓ Stok durumu kontrol
  ↓ Gerekirse: Supervisor'a görev ata
  ↓ HQ'dan gelen görevleri tamamla
18:00 → Kapanış: Günlük özet, kasa kontrolü
```

### 3.4 Supervisor Günlük Akışı
```
08:00 → Vardiya başlangıcı
  ↓ Ekip durumu (kim vardiyada, kim geç?)
  ↓ Günün görevlerini ekibe dağıt
  ↓ Checklist tamamlama takibi
  ↓ Misafir GB varsa yanıtla
12:00 → Mola dönüş kontrolü (PDKS)
  ↓ Görev ilerleme takibi
18:00 → Kapanış: Checklist, devir teslim
```

### 3.5 Barista Günlük Akışı
```
08:00 → Kiosk'tan vardiya başlat
  ↓ Açılış checklist tamamla
  ↓ Atanan görevleri gör + tamamla
  ↓ Eğitim modülü varsa tamamla
18:00 → Kapanış checklist + vardiya bitir
```

---

## BÖLÜM 4: TEKNİK UYGULAMA PLANI

### 4.1 Route Guard Matrisi

```
ADMIN ONLY:
  /admin/*, /setup

HQ ONLY (ExecutiveOnly):
  /merkez-dashboard, /sube-bordro-ozet, /sube-uyum-merkezi
  /coach-uyum-paneli, /task-atama, /task-takip
  /canli-takip, /cowork, /gelismis-raporlar
  /ik-raporlari, /kasa-raporlari, /e2e-raporlar

FABRİKA ONLY (FabrikaOnly):
  /fabrika/*, /fabrika-centrum, /depo-centrum
  /hq-fabrika-analitik, /kalite-kontrol-dashboard

ROL SPESİFİK:
  /ceo-command-center → ceo, admin
  /cgo-teknik-komuta → cgo, admin, ceo
  /coach-kontrol-merkezi → coach, admin, ceo
  /trainer-egitim-merkezi → trainer, admin, ceo
  /muhasebe-centrum → muhasebe_ik, muhasebe, admin, ceo
  /satinalma-centrum → satinalma, admin, ceo

HQ + ŞUBE YÖNETİM:
  /ik → HQ + mudur + supervisor
  /ekipman → HQ + mudur + supervisor (kendi şube)
  /stok → HQ + mudur + supervisor + satinalma
  /crm → HQ + mudur + supervisor
  /raporlar → HQ + mudur + yatirimci_branch

TÜM AUTHENTICATED:
  /, /profil, /performansim, /akademi
  /vardiyalarim, /bildirimler
  /gorevler (ModuleGuard ile scope)
  /checklistler (ModuleGuard ile scope)
  /kayip-esya (scope filter — kendi şube)

ŞUBE SPESIFIK (kendi şube verisi):
  /sube-centrum → mudur, supervisor, supervisor_buddy
  /supervisor-centrum → supervisor, supervisor_buddy
  /personel-centrum → barista, bar_buddy, stajyer
  /yatirimci-centrum → yatirimci_branch

KIOSK:
  /sube/kiosk → sube_kiosk, barista, stajyer
  /fabrika/kiosk → fabrika_operator, fabrika_personel
```

### 4.2 API Scope Filtering

```
Her API endpoint şu kontrolleri yapmalı:

1. isAuthenticated → giriş yapmış mı?
2. requireManifestAccess(module, action) → modül yetkisi var mı?
3. getScopeFilter(req) → hangi veriyi görebilir?

Scope türleri:
  all_branches → HQ rolleri (CEO, Coach, CGO, Trainer, Muhasebe)
  managed_branches → Muhasebe (HQ+Fab+Işıklar)
  own_branch → Müdür, Supervisor (sadece kendi şubesi)
  own_data → Barista, Stajyer (sadece kendi verisi)
```

### 4.3 Sidebar Navigation Filtering

```
MEVCUT SORUN: Sidebar tüm kullanıcılara aynı menüyü gösteriyor.
Bir Supervisor URL yazarak Fabrika sayfasına gidemez (route guard engeller)
AMA sidebar'da Fabrika linkini görebilir — kafa karıştırıcı.

ÇÖZÜM: Sidebar menüsü rol bazlı filtrelenmeli.
module-menu-config.ts → role-based menu filtering ekle.
Veya: sidebar'ı tamamen kaldır, sadece home screen kartlarından navigate et.
```

### 4.4 Korumasız Route'lar (Düzeltilmesi Gereken)

Toplam 93 korumasız route tespit edildi. Kritik olanlar:
```
/subeler → HQ only (şube listesi tüm şubeleri gösterir)
/subeler/:id → HQ + kendi şube müdürü
/crm → HQ + mudur + supervisor
/personel-detay/:id → HQ + kendi şube yönetimi
/personel-duzenle/:id → HQ only
/gelismis-raporlar → HQ only
/ayin-elemani → HQ + mudur
/personel-qr-tokenlar → HQ only
/ekipman → HQ + mudur + supervisor
/stok → HQ + mudur + satinalma
```

---

## BÖLÜM 5: GÖREV VE SORUMLULUK MATRİSİ

### 5.1 Kim Kime Görev Atar?

```
CEO    →  Coach, CGO, Trainer, tüm şubeler
CGO    →  Teknik ekip, şubelere (teknik görev)
Coach  →  Müdür, Supervisor (tüm şubeler)
Trainer→  Müdür, Supervisor (eğitim görevi)
Müdür  →  Supervisor, Barista (kendi şubesi)
Sup    →  Barista, Stajyer (kendi ekibi)
Dobody →  Tüm rollere (otomatik, onay mekanizmalı)
```

### 5.2 Onay Zinciri

```
Görev tamamlandı → Supervisor onayı → (gerekirse) Müdür onayı
CAPA oluşturuldu → Müdür tamamlar → Coach kontrol eder
Denetim yapıldı → Coach değerlendirir → Müdür aksiyon alır
Misafir şikayet → Müdür yanıtlar → (SLA aşarsa) Coach'a eskalasyon
Arıza bildirimi → Supervisor onayı → CGO'ya yönlendirilir
İzin talebi → Müdür onayı → (gerekirse) Muhasebe onayı
```

### 5.3 Eskalasyon Zinciri

```
Seviye 1: Sorumlu kişi (SLA: 24s)
Seviye 2: Bir üst yönetici (SLA: 48s)
Seviye 3: HQ departman (SLA: 72s)
Seviye 4: CEO/CGO (acil)

Örnekler:
  Arıza: Supervisor → Müdür → CGO → CEO
  Misafir şikayet: Müdür → Coach → CEO
  Geciken görev: Sorumlu → Supervisor → Coach → CEO
  SLA aşım: Departman → CGO → CEO
```

### 5.4 Mr. Dobody Otomasyon Kuralları

```
PATTERN TESPİTİ:
  "Lara 3 gündür kapanış checklist yapmadı" → Coach'a bildir
  "Işıklar NPS son 2 haftada %15 düştü" → Coach'a bildir
  "Teknik departman ort çözüm süresi hedef üstü" → CGO'ya bildir
  "Ali Barista 5 gündür tüm görevleri zamanında" → rozet öner

OTOMATİK GÖREV:
  Misafir 1-2 puan → Müdür'e "İncele" görevi
  Checklist 3+ gün yapılmadı → Supervisor'a uyarı
  Denetim <60 puan → CAPA oluştur
  Ekipman arıza → CGO'ya teknik görev
  Stok kritik → Satınalma'ya sipariş hatırlatma

OTOMATİK ESKALASYON:
  Görev 48s gecikti → Supervisor → Müdür → Coach
  CRM talep SLA aşıldı → departman → CGO/CEO
  CAPA deadline aşıldı → Coach → CEO
```

---

## BÖLÜM 6: MEVCUT DURUM VS OLMASI GEREKEN

### 6.1 Route Guard Durumu
```
Korumalı route:   34  (✅ düzeltildi)
Korumasız route:  93  (⚠️ düzeltilmeli)
Toplam:          127
```

### 6.2 Acil Düzeltilmesi Gerekenler
```
1. /subeler → HQ only guard eklenmeli
2. /crm → HQ + mudur + supervisor guard
3. /ekipman → HQ + mudur + supervisor guard  
4. /stok → HQ + mudur + satinalma guard
5. /personel-detay/:id → scope filter
6. /personel-duzenle/:id → HQ only
7. Sidebar menüsü → rol bazlı filtre
8. 85+ diğer korumasız route → tek tek incelenip guard eklenmeli
```

### 6.3 Sidebar Filtreleme Planı
```
Şube personeli sidebar'da şunları GÖRMEMELI:
  ❌ Fabrika
  ❌ Depo
  ❌ Muhasebe
  ❌ Satınalma
  ❌ Admin
  ❌ Şubeler (tüm şube listesi)
  ❌ Gelişmiş raporlar
  ❌ Task atama (HQ)
```

---

*Bu doküman Aslan onayından sonra uygulanacaktır.*
*Korumasız 93 route tek tek incelenip guard eklenecektir.*
