# DOSPRESSO — Rol, Dashboard ve Menü Denetim Raporu

**Tarih:** 14 Mart 2026  
**Hazırlayan:** Sistem Denetimi  
**Kapsam:** 24 rol, dashboard yönlendirmeleri, sidebar menü içerikleri, widget erişimleri  
**Kaynak dosyalar:** `shared/schema.ts`, `server/menu-service.ts`, `client/src/lib/role-visibility.ts`, `client/src/pages/dashboard.tsx`

---

## 1. Sistem Rolleri Özeti (24 Rol)

| # | Rol Kodu | Türkçe Ad | Kapsam | Gerçek Kullanıcı |
|---|----------|-----------|--------|------------------|
| | **HQ — Yönetici Roller** | | | |
| 1 | `admin` | Sistem Yöneticisi | HQ | — |
| 2 | `ceo` | CEO | HQ (Executive) | — |
| 3 | `cgo` | CGO (Operasyon Sorumlusu) | HQ (Executive) | — |
| | **HQ — Departman Rolleri** | | | |
| 4 | `muhasebe_ik` | Muhasebe & İK | HQ | Mahmut |
| 5 | `satinalma` | Satın Alma | HQ | Samet |
| 6 | `coach` | Coach (Şube Performans) | HQ | Yavuz |
| 7 | `marketing` | Pazarlama & Grafik | HQ | Diana |
| 8 | `trainer` | Eğitim Sorumlusu | HQ | Ece |
| 9 | `kalite_kontrol` | Kalite Kontrol | HQ | Ümran |
| 10 | `gida_muhendisi` | Gıda Mühendisi | HQ | Sema |
| 11 | `fabrika_mudur` | Fabrika Müdürü | HQ | Eren |
| | **HQ — Eski/Yedek Roller** | | | |
| 12 | `muhasebe` | Muhasebe (eski) | HQ | — |
| 13 | `teknik` | Teknik (eski) | HQ | — |
| 14 | `destek` | Destek (eski) | HQ | — |
| 15 | `fabrika` | Fabrika (eski) | HQ | — |
| 16 | `yatirimci_hq` | HQ Yatırımcı | HQ | — |
| | **Şube Rolleri** | | | |
| 17 | `mudur` | Şube Müdürü | Branch | — |
| 18 | `supervisor` | Supervisor | Branch | — |
| 19 | `supervisor_buddy` | Supervisor Buddy | Branch | — |
| 20 | `barista` | Barista | Branch | — |
| 21 | `bar_buddy` | Bar Buddy | Branch | — |
| 22 | `stajyer` | Stajyer | Branch | — |
| 23 | `yatirimci_branch` | Şube Yatırımcı | Branch | — |
| | **Fabrika Zemin Rolleri** | | | |
| 24 | `fabrika_operator` | Fabrika Operatörü | Factory | — |
| 25 | `fabrika_sorumlu` | Fabrika Sorumlusu | Factory | — |
| 26 | `fabrika_personel` | Fabrika Personeli | Factory | — |

---

## 2. Dashboard Yönlendirme Matrisi

Her rol giriş yaptığında hangi dashboard'a yönlendirilir:

| Rol | Yönlendirme Sayfası | Dashboard Tipi |
|-----|---------------------|----------------|
| **`admin`** | `/hq-ozet` | HQ Özet (CEO Command) |
| **`ceo`** | `/hq-ozet` | HQ Özet → CEO Command Center |
| **`cgo`** | `/hq-ozet` | HQ Özet → CGO Command Center |
| **`muhasebe_ik`** | `/` → HQ Dashboard | HQ Departman Dashboard (İK paneli) |
| **`satinalma`** | `/` → HQ Dashboard | HQ Departman Dashboard (Satınalma) |
| **`coach`** | `/` → HQ Dashboard | HQ Departman Dashboard (Coach) |
| **`marketing`** | `/` → HQ Dashboard | HQ Departman Dashboard (Marketing) |
| **`trainer`** | `/` → HQ Dashboard | HQ Departman Dashboard (Trainer) |
| **`kalite_kontrol`** | `/` → HQ Dashboard | HQ Departman Dashboard (Kalite) |
| **`gida_muhendisi`** | `/` → HQ Dashboard | HQ Departman Dashboard (Gıda Güv.) |
| **`fabrika_mudur`** | `/` → HQ Dashboard | HQ Departman Dashboard (Fabrika) |
| **`muhasebe`** | `/` → HQ Dashboard | HQ Dashboard (genel) |
| **`teknik`** | `/` → HQ Dashboard | HQ Dashboard (genel) |
| **`destek`** | `/` → HQ Dashboard | HQ Dashboard (genel) |
| **`fabrika`** | `/` → HQ Dashboard | HQ Dashboard (genel) |
| **`yatirimci_hq`** | `/` → HQ Dashboard | HQ Dashboard (genel) |
| **`mudur`** | `/` | CardGridHub + Widgets |
| **`supervisor`** | `/` | CardGridHub + Widgets |
| **`supervisor_buddy`** | `/` | CardGridHub + Widgets |
| **`barista`** | `/` | CardGridHub + Widgets |
| **`bar_buddy`** | `/` | CardGridHub + Widgets |
| **`stajyer`** | `/` | CardGridHub + Widgets |
| **`yatirimci_branch`** | `/` | CardGridHub + Widgets |
| **`fabrika_operator`** | `/fabrika/dashboard` | Fabrika Dashboard (redirect) |
| **`fabrika_sorumlu`** | `/fabrika/dashboard` | Fabrika Dashboard (redirect) |
| **`fabrika_personel`** | `/fabrika/dashboard` | Fabrika Dashboard (redirect) |

### Dashboard Tipleri Açıklama:
- **HQ Özet:** CEO/CGO/Admin özel komut merkezi — tüm şube özeti, AI banner, kritik KPI'lar
- **HQ Departman Dashboard:** Her departmana özel metrikler ve kısayollar (lazy loaded)
- **CardGridHub + Widgets:** Şube rolleri için modül kartları, hızlı işlemler ve widget'lar
- **Fabrika Dashboard:** Üretim, vardiya, kalite odaklı panel

---

## 3. Sidebar Menü İçerikleri (Rol Bazlı)

### 3.1 HQ Yönetici Roller

#### `admin` — Sistem Yöneticisi
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Ana Sayfa |
| İK & Vardiya | Personel |
| Eğitim | Akademi, Bilgi Bankası |
| Denetim & Analitik | Performans, Raporlar, Misafir Memnuniyeti, Şube Sağlık Skoru |
| CRM | CRM, Yatırımcılar |
| İletişim | Merkez Destek, Bildirimler, İletişim Merkezi, AI Asistan, Agent Merkezi, Kılavuz |
| Yönetim | Şubeler |

#### `ceo` — CEO
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Ana Sayfa |
| Denetim & Analitik | Raporlar |
| CRM | CRM, Yatırımcılar |
| İletişim | Bildirimler, İletişim Merkezi, AI Asistan |

#### `cgo` — CGO
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Ana Sayfa |
| Denetim & Analitik | Raporlar, Misafir Memnuniyeti |
| CRM | CRM, Yatırımcılar |
| İletişim | Bildirimler, İletişim Merkezi |
| Yönetim | Şubeler |

---

### 3.2 HQ Departman Rolleri

#### `muhasebe_ik` — Muhasebe & İK (Mahmut)
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Ana Sayfa |
| İK & Vardiya | Personel |
| Denetim & Analitik | Raporlar |
| Finans & Tedarik | PDKS, Maaş Hesaplama |
| İletişim | Bildirimler, İletişim Merkezi |

#### `satinalma` — Satın Alma (Samet)
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Ana Sayfa |
| Denetim & Analitik | Raporlar |
| Finans & Tedarik | Satınalma, Stok |
| İletişim | Bildirimler, İletişim Merkezi |

#### `coach` — Coach (Yavuz)
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Ana Sayfa |
| Eğitim | Akademi |
| Denetim & Analitik | Misafir Memnuniyeti, Şube Denetim |
| CRM | CRM |
| İletişim | Bildirimler, İletişim Merkezi |
| Yönetim | Şubeler |

#### `marketing` — Pazarlama (Diana)
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Ana Sayfa |
| Denetim & Analitik | Raporlar, Misafir Memnuniyeti |
| CRM | CRM |
| Pazarlama | Kampanyalar |
| İletişim | Bildirimler |

#### `trainer` — Eğitim Sorumlusu (Ece)
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Ana Sayfa |
| Eğitim | Akademi, Bilgi Bankası |
| Denetim & Analitik | Şube Denetim |
| İletişim | Bildirimler, İletişim Merkezi |

#### `kalite_kontrol` — Kalite Kontrol (Ümran)
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Ana Sayfa |
| Fabrika | Kalite Kontrol |
| Denetim & Analitik | Kalite Denetimi, Misafir Memnuniyeti, Gıda Güvenliği |
| İletişim | Bildirimler |

#### `gida_muhendisi` — Gıda Mühendisi (Sema)
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Ana Sayfa |
| Fabrika | Fabrika Paneli, Kalite Kontrol |
| Denetim & Analitik | Raporlar, Gıda Güvenliği |
| İletişim | Bildirimler |

#### `fabrika_mudur` — Fabrika Müdürü (Eren)
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Fabrika | Fabrika Paneli, Giriş/Çıkış Kiosk, Kalite Kontrol, Üretim İstasyonları, Performans |
| İletişim | Bildirimler |

---

### 3.3 HQ Eski/Yedek Roller

#### `muhasebe` — Muhasebe (eski)
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Ana Sayfa |
| Finans & Tedarik | Muhasebe, PDKS, Maaş Hesaplama |
| İletişim | Bildirimler |

#### `teknik` — Teknik (eski)
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Ana Sayfa |
| Operasyon | Ekipman, Arızalar |
| Denetim & Analitik | Raporlar |
| İletişim | Bildirimler |

#### `destek` — Destek (eski)
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Ana Sayfa |
| Operasyon | Arızalar |
| İletişim | Merkez Destek, Bildirimler |
| Yönetim | Şubeler |

#### `fabrika` — Fabrika (eski)
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Fabrika | Fabrika Paneli, Giriş/Çıkış Kiosk, Kalite Kontrol, Üretim İstasyonları |
| İletişim | Bildirimler |

#### `yatirimci_hq` — HQ Yatırımcı
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Ana Sayfa |
| Denetim & Analitik | Raporlar |
| İletişim | Bildirimler |

---

### 3.4 Şube Rolleri

#### `mudur` — Şube Müdürü
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Şube Ana Sayfa |
| Operasyon | Görevler, Şube Stok & Sipariş |
| Denetim & Analitik | Raporlar, Misafir Memnuniyeti |
| CRM | CRM |
| İletişim | Bildirimler, İletişim Merkezi |

#### `supervisor` — Supervisor
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Şube Ana Sayfa |
| Operasyon | Görevler, Şube Stok & Sipariş |
| Denetim & Analitik | Misafir Memnuniyeti |
| CRM | CRM |
| İletişim | Bildirimler, İletişim Merkezi, AI Asistan |

#### `supervisor_buddy` — Supervisor Buddy
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Şube Ana Sayfa |
| Operasyon | Görevler |
| İletişim | Bildirimler, Merkez Destek, AI Asistan |

#### `barista` — Barista
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Şube Ana Sayfa |
| Operasyon | Görevler |
| Eğitim | Akademi |
| İletişim | Bildirimler |

#### `bar_buddy` — Bar Buddy
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Şube Ana Sayfa |
| Operasyon | Görevler |
| Eğitim | Akademi |
| İletişim | Bildirimler |

#### `stajyer` — Stajyer
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Şube Ana Sayfa |
| Eğitim | Akademi |
| İletişim | Bildirimler, Merkez Destek |

#### `yatirimci_branch` — Şube Yatırımcı
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Ana Sayfa | Şube Ana Sayfa |
| Denetim & Analitik | Raporlar |
| İletişim | Bildirimler |

---

### 3.5 Fabrika Zemin Rolleri

#### `fabrika_operator` — Fabrika Operatörü
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Fabrika | Fabrika Paneli, Giriş/Çıkış Kiosk |
| İletişim | Bildirimler, Kılavuz |

#### `fabrika_sorumlu` — Fabrika Sorumlusu
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Fabrika | Fabrika Paneli, Giriş/Çıkış Kiosk, Kalite Kontrol |
| İletişim | Bildirimler |

#### `fabrika_personel` — Fabrika Personeli
| Bölüm | Menü Öğeleri |
|-------|-------------|
| Fabrika | Fabrika Paneli, Giriş/Çıkış Kiosk |
| İletişim | Bildirimler |

---

## 4. Widget Erişim Matrisi

Dashboard'da hangi roller hangi widget'ları görebilir:

| Widget | HQ Exec | HQ Dept | Şube Yönetim | Şube Personel | Fabrika |
|--------|---------|---------|--------------|----------------|---------|
| Unified Hero | Tüm | Tüm | Tüm | Tüm | Tüm |
| Compact Stats | Tüm | Tüm | Tüm | Tüm | Tüm |
| AI Özet | ceo, admin | — | — | — | — |
| Şube Scorecard | — | coach | Tüm | Tüm | — |
| Personel Durumu | admin | ik | mudur, sup, sup_buddy | — | fab_mudur |
| Kritik Uyarılar | Tüm HQ | Tüm HQ | mudur, sup, sup_buddy | — | fab_mudur |
| Hızlı İşlemler | Tüm | Tüm | Tüm | Tüm | Tüm |
| Modül Kartları | Tüm HQ | Tüm HQ | mudur, sup, sup_buddy | — | fab_mudur |
| AI NBA Önerileri | Tüm | Tüm | Tüm | Tüm | Tüm |
| Aktivite Timeline | — | Tüm HQ | sup, sup_buddy | — | — |
| Atadıklarım | admin, ceo, cgo | coach, trainer, teknik, destek, muhasebe_ik, satinalma, marketing, kalite_kontrol, gida_muhendisi | mudur, sup | — | fab_mudur |
| Feedback (Şube) | — | — | mudur, sup, sup_buddy | — | — |
| Feedback (HQ) | Tüm HQ | Tüm HQ | — | — | — |

---

## 5. Modül Erişim Matrisi (Kart Grid)

| Modül | admin | ceo/cgo | muhasebe_ik | satinalma | coach | trainer | kalite_kontrol | gida_muh | fab_mudur | mudur | supervisor | barista | stajyer |
|-------|-------|---------|-------------|-----------|-------|---------|----------------|----------|-----------|-------|------------|---------|---------|
| operations | x | x | — | — | x | — | — | x | x | x | x | x | — |
| equipment | x | x | — | — | — | — | — | — | x | x | x | — | — |
| training | x | x | — | — | x | x | — | — | x | x | x | x | x |
| hr | x | x | x | — | x | — | — | — | x | x | x | — | — |
| reports | x | x | x | x | x | x | x | x | x | x | — | — | — |
| factory | x | x | — | x | — | — | x | x | x | — | — | — | — |
| satinalma | x | x | x | x | — | — | — | — | x | — | — | — | — |
| newshop | x | x | — | — | — | — | — | — | — | — | — | — | — |
| admin | x | x | — | — | — | — | — | — | — | — | — | — | — |

---

## 6. Alt Menü Navigasyonu (Bottom Nav / Quick Nav)

| Rol | Navigasyon Öğeleri |
|-----|-------------------|
| `ceo` | home, ai, notifications, search, profile |
| `cgo` | home, ai, branches, notifications, profile |
| `admin` | home, admin, notifications, search, profile |
| `muhasebe_ik` | home, crm, notifications, search, profile |
| `satinalma` | home, crm, notifications, search, profile |
| `coach` | home, branches, crm, notifications, profile |
| `marketing` | home, notifications, search, calendar, profile |
| `trainer` | home, tasks, notifications, search, profile |
| `kalite_kontrol` | home, quality, notifications, search, profile |
| `gida_muhendisi` | home, quality, notifications, search, profile |
| `teknik` | home, fault, crm, notifications, profile |
| `destek` | home, fault, notifications, search, profile |
| `fabrika_mudur` | home, tasks, factory, notifications, profile |
| `mudur` | home, tasks, notifications, fault, profile |
| `supervisor` | home, tasks, notifications, fault, profile |
| `supervisor_buddy` | home, tasks, notifications, fault, profile |
| `barista` | home, academy, myshifts, fault, profile |
| `bar_buddy` | home, academy, myshifts, fault, profile |
| `stajyer` | home, academy, notifications, profile |
| `yatirimci_hq` | home, branches, notifications, search, profile |
| `yatirimci_branch` | home, branches, notifications, profile |
| `fabrika_operator` | home, factory, myshifts, notifications, profile |
| `fabrika_sorumlu` | home, factory, myshifts, profile |
| `fabrika_personel` | home, factory, myshifts, profile |

---

## 7. Hızlı İşlem Butonları (Dashboard)

| Rol | Hızlı İşlemler |
|-----|----------------|
| `ceo` | Duyurular, Görevler, Şubeler |
| `cgo` | Duyurular, Görevler, Raporlar |
| `admin` | Kullanıcılar, Ayarlar, Sistem |
| `muhasebe_ik` | Faturalar, İzinler, Devam Takibi |
| `satinalma` | Tedarikçiler, Mal Kabul |
| `coach` | Yeni Görev, Personel, Görevler |
| `marketing` | Kampanyalar, Duyurular |
| `trainer` | Kurslar, Yeni Görev |
| `kalite_kontrol` | Denetimler, Şubeler |
| `gida_muhendisi` | Denetimler, Kalite |
| `fabrika_mudur` | Üretim, Personel, Kalite, Stok, Görevler, Vardiya |
| `mudur` | Yeni Görev, Vardiya, İzinler, Personel |
| `supervisor` | Yeni Görev, Vardiya, İzinler, Personel, Misafir Feedback |
| `barista` | Kontrol Listesi, İzinler, Kayıp Eşya |
| `bar_buddy` | Kontrol Listesi |
| `stajyer` | İzinler |
| `fabrika_operator` | Üretim, Kalite |
| `fabrika_sorumlu` | Üretim, Kalite |
| `fabrika_personel` | Üretim |

---

## 8. Menü Filtreleme Mimarisi

```
Kullanıcı Giriş → /api/me/menu
  ↓
1. MENU_BLUEPRINT (9 bölüm, 40+ öğe) — Static tanım
  ↓
2. Scope Filtresi → HQ / Branch / Admin kapsamına göre eleme
  ↓
3. SIDEBAR_ALLOWED_ITEMS → Rol bazlı beyaz liste (varsa sadece izin verilenler)
  ↓
4. canAccessModule() → Dinamik izin kontrolü (permission_modules tablosu)
  ↓
5. Sonuç → Filtrelenmiş menü JSON (bölümler + badge sayıları)
```

### Filtreleme Katmanları:
1. **Scope (HQ/Branch):** `scope: "hq"` olan öğeler şube rollerine gösterilmez
2. **Sidebar Whitelist:** Her rol için izin verilen menü öğe ID'leri listesi
3. **Dynamic Permissions:** `permission_modules` tablosundaki 123 modül x 21 rol matrisi (2028 kayıt)
4. **alwaysVisible:** `usage-guide` gibi bazı öğeler tüm rollere açık

---

## 9. Güvenlik Notları

| Kontrol | Durum | Detay |
|---------|-------|-------|
| Server-side menü filtresi | ✅ | Menü backend'de filtrelenir, frontend'e yalnızca izin verilen öğeler gönderilir |
| Çift katmanlı yetkilendirme | ✅ | Menü görmek ≠ erişim hakkı — her API endpoint ayrıca rol kontrolü yapar |
| Dinamik izin sistemi | ✅ | Admin panelinden modül izinleri runtime'da değiştirilebilir |
| Session limiti | ✅ | Max 2 eşzamanlı oturum |
| 60 gün inaktif deaktivasyonu | ✅ | Otomatik hesap kapatma |
| Rate limiting | ✅ | Login endpoint agresif rate limit |
| RBAC kontrol noktası sayısı | — | 14 CRM endpoint, 50+ diğer endpoint'lerde |

---

## 10. Departman Dashboard Yolları

Departman rollerinin özel dashboard'ları:

| Rol | Dashboard Yolu |
|-----|---------------|
| `ceo` | `/ceo-command-center` |
| `cgo` | `/cgo-command-center` |
| `muhasebe_ik` | `/hq-dashboard/ik` |
| `satinalma` | `/hq-dashboard/satinalma` |
| `coach` | `/hq-dashboard/coach` |
| `marketing` | `/hq-dashboard/marketing` |
| `trainer` | `/hq-dashboard/trainer` |
| `kalite_kontrol` | `/hq-dashboard/kalite` |
| `gida_muhendisi` | `/gida-guvenligi-dashboard` |
| `fabrika_mudur` | `/hq-dashboard/fabrika` |

---

**Rapor Sonu**
