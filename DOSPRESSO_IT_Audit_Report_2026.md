# DOSPRESSO Franchise Yönetim Platformu
## Kapsamlı IT Denetim Raporu

**Rapor Tarihi:** 19 Mart 2026  
**Rapor Türü:** Teknik Denetim & Stratejik Değerlendirme  
**Hazırlayan:** Otonom Sistem Denetimi  
**Gizlilik:** Şirkete Özel — IT Danışman ve Üst Yönetim İçin

---

## İÇİNDEKİLER

1. [Yönetici Özeti](#1-yönetici-özeti)
2. [Platform Genel Görünümü](#2-platform-genel-görünümü)
3. [Altyapı ve Teknoloji Yığını](#3-altyapı-ve-teknoloji-yığını)
4. [Veritabanı Analizi](#4-veritabanı-analizi)
5. [Kullanıcı ve Rol Yapısı](#5-kullanıcı-ve-rol-yapısı)
6. [Şube Ağı Analizi](#6-şube-ağı-analizi)
7. [Modül Bazlı Olgunluk Değerlendirmesi](#7-modül-bazlı-olgunluk-değerlendirmesi)
8. [API Sağlık Raporu](#8-api-sağlık-raporu)
9. [Güvenlik Değerlendirmesi](#9-güvenlik-değerlendirmesi)
10. [Performans ve Ölçeklenebilirlik](#10-performans-ve-ölçeklenebilirlik)
11. [Otomasyon ve Zamanlayıcı Sistemi](#11-otomasyon-ve-zamanlayıcı-sistemi)
12. [AI ve Agent Sistemi](#12-ai-ve-agent-sistemi)
13. [Fabrika Modülü Detaylı Analiz](#13-fabrika-modülü-detaylı-analiz)
14. [Rol Bazlı Kullanıcı Deneyimi Analizi](#14-rol-bazlı-kullanıcı-deneyimi-analizi)
15. [Kod Kalitesi ve Teknik Borç](#15-kod-kalitesi-ve-teknik-borç)
16. [Eksik Özellikler ve Boşluk Analizi](#16-eksik-özellikler-ve-boşluk-analizi)
17. [Risk Değerlendirmesi](#17-risk-değerlendirmesi)
18. [Stratejik Öneriler](#18-stratejik-öneriler)
19. [Önerilen Yol Haritası](#19-önerilen-yol-haritası)
20. [IT Danışman İçin Tartışma Soruları](#20-it-danışman-için-tartışma-soruları)

---

## 1. YÖNETİCİ ÖZETİ

### Platform Durumu: ÇALIŞIR DURUMDA — İYİLEŞTİRME GEREKTİRİR

DOSPRESSO, 2 günde 19+ sprint ile inşa edilmiş, kapsamlı bir franchise yönetim platformudur. Platform teknik olarak ayakta ve temel iş süreçlerini desteklemektedir. Ancak hızlı geliştirme sürecinin doğal sonucu olarak:

- **38 frontend API çağrısı** backend karşılığı olmadan bırakılmıştır
- **15-20 sayfa** eksik API'ler nedeniyle kısmen veya tamamen çalışmamaktadır
- **1 API** 500 Internal Server Error vermektedir (Bordro)
- Toplam **374 veritabanı tablosu**, **1,365+ API endpoint**, **168 frontend route** mevcuttur
- Platform 20 aktif şube, 264 kayıtlı kullanıcı (58 aktif) ve 20 farklı rol ile çalışmaktadır

### Kritik Bulgular

| Seviye | Bulgu | Etki |
|--------|-------|------|
| KRİTİK | 38 eksik backend API endpoint | 15-20 sayfada kırık/boş bölümler |
| KRİTİK | Bordro modülü 500 hatası | Şube müdürleri maaş verilerine erişemiyor |
| YÜKSEK | misc.ts dosyası 13,216 satır | Bakım ve geliştirme zorluğu |
| YÜKSEK | Fabrika alt-modülleri eksik | Kavurma, sayım, hammadde yönetimi yok |
| ORTA | ~1,000 adet `: any` tip kullanımı | Runtime hata riski |
| ORTA | Push bildirim abonesi 0 | Mobil bildirimler çalışmıyor |
| DÜŞÜK | Dark mode uyumsuz 28 renk | Görsel tutarsızlık |

---

## 2. PLATFORM GENEL GÖRÜNÜMÜ

### 2.1 Ne İşe Yarıyor?

DOSPRESSO, çok şubeli bir kahve franchise ağını tek bir platformdan yönetmek için tasarlanmış kurumsal bir yazılımdır. Kapsamı:

- **İnsan Kaynakları:** Personel yönetimi, vardiya planlama, devam takibi (PDKS), izin yönetimi, bordro
- **Eğitim Akademisi:** Modül tabanlı eğitim, quiz sistemi, sertifika basımı, AI destekli içerik üretimi
- **Operasyon Yönetimi:** Görev atama, kontrol listeleri, ekipman takibi, SLA yönetimi
- **Fabrika Yönetimi:** Üretim takibi, istasyon yönetimi, kalite kontrol, kiosk sistemi
- **Satınalma & Stok:** Tedarikçi yönetimi, sipariş takibi, envanter sayımı
- **CRM & İletişim:** Destek talepleri, müşteri geri bildirimi, kampanya yönetimi
- **Finans:** Maliyet yönetimi, bordro, finansal raporlama
- **AI Asistanı (Mr. Dobody):** 18 otomatik beceri, günlük analiz, performans koçluğu

### 2.2 Rakamlarla Platform

| Metrik | Değer |
|--------|-------|
| Toplam veritabanı tablosu | 374 |
| Veritabanı boyutu | 86 MB |
| Backend API endpoint | ~1,365 |
| Frontend sayfa dosyası | 277 |
| Frontend bileşen dosyası | 153 |
| Backend route dosyası | 49 |
| Servis dosyası | 22 |
| Schema satır sayısı | 15,697 |
| Frontend route | 168 |
| Module flag | 32 (21 modül + 11 alt-modül) |
| Agent (AI) becerisi | 18 |
| Zamanlayıcı görev | 28 |
| Desteklenen dil | 4 (Türkçe, İngilizce, Arapça, Almanca) |

---

## 3. ALTYAPI VE TEKNOLOJİ YIĞINI

### 3.1 Frontend

| Teknoloji | Versiyon | Kullanım |
|-----------|---------|----------|
| React | 18 | UI framework |
| TypeScript | - | Tip güvenliği |
| Vite | - | Build/dev server |
| Tailwind CSS | - | Stil |
| Shadcn/ui | - | Bileşen kütüphanesi |
| TanStack Query | v5 | Veri yönetimi / cache |
| Wouter | - | Yönlendirme |
| i18next | - | Çoklu dil desteği |
| CVA | - | Bileşen varyant yönetimi |

### 3.2 Backend

| Teknoloji | Versiyon | Kullanım |
|-----------|---------|----------|
| Node.js | - | Runtime |
| Express.js | - | HTTP framework |
| TypeScript | - | Tip güvenliği |
| Drizzle ORM | - | Veritabanı etkileşimi |
| Passport.js | - | Kimlik doğrulama |
| bcrypt | - | Parola hashleme |
| pgvector | - | Vektör arama (AI) |

### 3.3 Veritabanı ve Altyapı

| Bileşen | Teknoloji |
|---------|-----------|
| Ana veritabanı | PostgreSQL (Neon Serverless) |
| Dosya depolama | AWS S3 / Replit Object Storage |
| E-posta | IONOS SMTP |
| AI | OpenAI GPT-4o, GPT-4o-mini, Vision, Embeddings |
| Kimlik doğrulama | Passport.js (Local + Kiosk PIN) |
| Oturum yönetimi | PostgreSQL-backed sessions |

### 3.4 Mimari Kararlar

- **Soft Deletion:** Tüm iş-kritik veriler `isActive: false` + `deletedAt` ile silinir, veri kaybı önlenir
- **Veri Kilitleme:** Zaman/durum bazlı kayıt kilitleme (HTTP 423), kilitli veriler için değişiklik talebi akışı
- **Module Flags:** Modüller global, şube ve rol bazında açılıp kapatılabilir (`fully_hidden`, `ui_hidden_data_continues`, `always_on`)
- **Kiosk Sistemi:** PIN tabanlı kimlik doğrulama, PostgreSQL-backed oturumlar, 8 saat TTL, 30 saniye in-memory cache
- **RBAC:** 27 farklı rol tanımı ile granüler erişim kontrolü

---

## 4. VERİTABANI ANALİZİ

### 4.1 Genel İstatistikler

- **Toplam tablo:** 374
- **Toplam boyut:** 86 MB
- **En büyük tablo:** notifications (37,113 kayıt)

### 4.2 Tablo Bazlı Veri Hacimleri

#### Yoğun Kullanılan Tablolar (>100 kayıt)

| Tablo | Kayıt Sayısı | Açıklama |
|-------|-------------|----------|
| notifications | 37,113 | Sistem bildirimleri |
| shifts | 12,459 | Vardiya kayıtları |
| checklist_completions | 4,919 | Kontrol listesi tamamlamaları |
| reminders | 3,140 | Hatırlatmalar |
| audit_logs | 1,559 | Denetim günlüğü |
| tasks | 1,177 | Görev atamaları |
| agent_pending_actions | 444 | AI agent bekleyen aksiyonlar |
| pdks_records | 386 | Devam takibi kayıtları |
| users | 264 | Kullanıcılar |
| factory_products | 163 | Fabrika ürünleri |
| equipment | 153 | Ekipman envantei |
| recipes | 145 | Ürün reçeteleri |
| stock_count_items | 115 | Sayım kalemleri |

#### Orta Kullanımlı Tablolar (1-100 kayıt)

| Tablo | Kayıt Sayısı | Açıklama |
|-------|-------------|----------|
| backup_records | 85 | Yedekleme kayıtları |
| branch_task_instances | 80 | Şube görev örnekleri |
| factory_production_runs | 74 | Üretim partileri |
| equipment_faults | 54 | Ekipman arızaları |
| training_modules | 51 | Eğitim modülleri |
| leave_requests | 35 | İzin talepleri |
| module_flags | 34 | Modül bayrakları |
| user_training_progress | 27 | Eğitim ilerlemesi |
| sla_rules | 24 | SLA kuralları |
| customer_feedback | 23 | Müşteri geri bildirimi |
| branches | 22 | Şubeler |
| support_tickets | 10 | Destek talepleri |
| factory_stations | 9 | Fabrika istasyonları |
| announcements | 5 | Duyurular |
| suppliers | 5 | Tedarikçiler |
| agent_action_outcomes | 5 | Agent sonuçları |
| projects | 5 | Projeler |
| stock_counts | 4 | Sayım kayıtları |
| certificate_settings | 4 | Sertifika ayarları |
| branch_task_categories | 4 | Şube görev kategorileri |
| quiz_results | 3 | Quiz sonuçları |
| hq_support_tickets | 3 | HQ destek talepleri |
| project_tasks | 3 | Proje görevleri |
| onboarding_programs | 2 | Onboarding programları |
| lost_found_items | 2 | Kayıp eşya |

#### Boş Tablolar (0 kayıt — Dikkat Gerektirir)

| Tablo | Beklenen Kullanım |
|-------|-------------------|
| purchase_orders | Satınalma siparişleri |
| campaigns | CRM kampanyaları |
| campaign_branches | Kampanya-şube ilişkileri |
| campaign_metrics | Kampanya metrikleri |
| push_subscriptions | Push bildirim abonelikleri |
| kiosk_sessions | Kiosk oturumları |
| issued_certificates | Basılmış sertifikalar |
| onboarding_instances | Onboarding atamaları |
| branch_stock_movements | Şube stok hareketleri |
| equipment_catalog | Ekipman kataloğu |

### 4.3 Veritabanı Değerlendirmesi

**Güçlü Yönler:**
- Kapsamlı şema tasarımı (374 tablo, iyi normalleştirilmiş)
- Soft deletion altyapısı mevcut
- Audit log tablosu aktif kullanımda (1,559 kayıt)
- Yedekleme sistemi çalışıyor (85 kayıt, saatlik)

**Zayıf Yönler:**
- 10+ kritik tablo tamamen boş (hiç veri girilmemiş)
- Bazı tablo isimleri frontend beklentileriyle uyuşmuyor (ör: `issued_certificates` vs frontend'in beklediği `certificates`)
- pg_stat istatistikleri güncel değil (ANALYZE çalıştırılmalı)

---

## 5. KULLANICI VE ROL YAPISI

### 5.1 Rol Hiyerarşisi

Platformda 20 aktif rol tanımlanmıştır. Bu roller 6 hiyerarşik katmanda gruplandırılır:

#### Katman 1: Sistem Yönetimi
| Rol | Aktif Kullanıcı | Konum | Yetki Kapsamı |
|-----|----------------|-------|---------------|
| admin | 3 | HQ | Tam sistem erişimi, tüm modüller |

#### Katman 2: Üst Yönetim
| Rol | Aktif Kullanıcı | Konum | Yetki Kapsamı |
|-----|----------------|-------|---------------|
| ceo | 2 | HQ | CEO command center, tüm şube verileri |
| cgo | 1 | HQ | Büyüme odaklı raporlar, franchise |

#### Katman 3: HQ Departman Yöneticileri
| Rol | Aktif Kullanıcı | Konum | Yetki Kapsamı |
|-----|----------------|-------|---------------|
| coach | 1 | HQ | Şube denetimi, koçluk, eğitim |
| trainer | 1 | HQ | Akademi yönetimi, eğitim içerikleri |
| kalite_kontrol | 1 | HQ | Kontrol listeleri, kalite denetimi |
| gida_muhendisi | 1 | HQ | Gıda güvenliği, HACCP |
| muhasebe_ik | 1 | HQ | Bordro, İK işlemleri |
| satinalma | 1 | HQ | Tedarikçiler, siparişler |
| marketing | 1 | HQ | CRM, kampanyalar |
| fabrika_mudur | 1 | HQ | Fabrika tüm operasyonlar |

#### Katman 4: Şube Yönetimi
| Rol | Aktif Kullanıcı | Konum | Yetki Kapsamı |
|-----|----------------|-------|---------------|
| mudur | 1 | Işıklar | Kendi şubesi: personel, vardiya, görevler |
| supervisor | 2 | Işıklar, Fabrika | Operasyon denetimi, onay akışları |
| supervisor_buddy | 1 | Fabrika | Buddy sistemi, yeni personel rehberliği |
| yatirimci_branch | 4 | 4 farklı şube | Finansal raporlar, şube performansı |

#### Katman 5: Saha Personeli
| Rol | Aktif Kullanıcı | Konum | Yetki Kapsamı |
|-----|----------------|-------|---------------|
| barista | 7 | Işıklar | Görevler, eğitim, vardiya görüntüleme |
| bar_buddy | 1 | Işıklar | Buddy sistemi |
| stajyer | 4 | Fabrika | Temel eğitim, sınırlı erişim |
| fabrika_operator | 6 | Fabrika | Kiosk, üretim kaydı |

#### Katman 6: Kiosk Kullanıcıları
| Rol | Aktif Kullanıcı | Konum | Yetki Kapsamı |
|-----|----------------|-------|---------------|
| sube_kiosk | 18 | Her şubede 1 | PDKS, vardiya bilgisi, görev tamamlama |

### 5.2 Kullanıcı Dağılımı Değerlendirmesi

- **Toplam kayıtlı:** 264 kullanıcı
- **Aktif:** 58 kullanıcı (%22)
- **HQ personeli:** 15 kullanıcı (admin + departman yöneticileri)
- **Şube personeli:** 15 kullanıcı (mudur, barista, supervisor vb.)
- **Fabrika personeli:** 12 kullanıcı (operator, stajyer, supervisor)
- **Kiosk kullanıcıları:** 18 (her şubede 1)
- **Yatırımcılar:** 4

**Dikkat:** %78 kullanıcı aktif değil. Bu, test hesapları veya pasif personelden kaynaklanıyor olabilir. Temizleme yapılmalı.

---

## 6. ŞUBE AĞI ANALİZİ

### 6.1 Şube Dağılımı

| Şehir | Şube Sayısı | Şubeler | Personel |
|-------|-------------|---------|----------|
| Antalya | 5+2 | Işıklar, Mallof, Markantalya, Lara, Beachpark + HQ + Fabrika | 25+12 |
| Gaziantep | 3+1 | İbrahimli, İbnisina, Üniversite, Nizip | 5 |
| Konya | 2 | Meram, Bosna | 3 |
| Samsun | 2 | Marina, Atakum | 2 |
| Batman | 1 | Batman | 1 |
| Düzce | 1 | Düzce | 1 |
| Siirt | 1 | Siirt | 1 |
| Kilis | 1 | Kilis | 1 |
| Şanlıurfa | 1 | Şanlıurfa | 1 |

**Toplam:** 20 aktif şube (18 perakende + 1 HQ + 1 Fabrika)

### 6.2 Personel Yoğunluğu Analizi

| Şube | Personel | Durum |
|------|----------|-------|
| Işıklar | 12 | Tam kadro (pilot şube) |
| Fabrika | 12 | Tam kadro |
| Antalya Mallof | 2 | Kısıtlı (kiosk + yatırımcı) |
| Gaziantep İbrahimli | 2 | Kısıtlı |
| Konya Meram | 2 | Kısıtlı |
| Diğer 14 şube | 1'er | Sadece kiosk kullanıcısı |

**Kritik Gözlem:** 14 şubede yalnızca 1 kiosk kullanıcısı var. Bu şubelerde gerçek personel hesapları oluşturulmamış veya henüz sisteme dahil edilmemiş olabilir.

---

## 7. MODÜL BAZLI OLGUNLUK DEĞERLENDİRMESİ

Her modül 4 olgunluk seviyesinde değerlendirilmiştir:

- **SEVİYE 4 (Üretim):** Tam çalışır, aktif veri, kullanıcılar memnun
- **SEVİYE 3 (Beta):** Temel özellikler çalışır, bazı eksikler var
- **SEVİYE 2 (Alfa):** Frontend var, backend kısmen eksik, veri az
- **SEVİYE 1 (Planlı):** Kod mevcut ama çalışmıyor veya API eksik
- **SEVİYE 0 (Yok):** Hiç başlanmamış

### 7.1 Modül Olgunluk Matrisi

| Modül | Olgunluk | Module Flag | Backend API | Frontend UI | Veri | Not |
|-------|----------|-------------|-------------|-------------|------|-----|
| **Dashboard HQ** | SEVİYE 4 | always_on | 7 endpoint aktif | Tam | 3,039+ | Çalışıyor, pending-approvals widget hariç |
| **Dashboard CEO** | SEVİYE 4 | always_on | Command center aktif | Tam | - | Çalışıyor |
| **Bildirimler** | SEVİYE 4 | - | Tam | Tam | 37,113 | Çalışıyor, push abonesi 0 |
| **Görevler** | SEVİYE 4 | fully_hidden | 2,319 satır route | Tam | 1,177 | Modül kapalı ama API aktif |
| **Vardiya Yönetimi** | SEVİYE 4 | ui_hidden | 2,591 satır route | Tam | 12,459 | UI gizli, veri akıyor |
| **Kontrol Listeleri** | SEVİYE 4 | fully_hidden | Tam | Tam | 4,919 | Modül kapalı ama yoğun veri |
| **Mesajlaşma** | SEVİYE 4 | - | Tam | Tam | Aktif | Thread bazlı mesajlaşma |
| **Mr. Dobody (AI)** | SEVİYE 4 | always_on | 731 satır agent route | Tam | 444 aksiyon | 18 skill aktif |
| **Fabrika Temel** | SEVİYE 3 | always_on | 6,590 satır route | 17 sayfa | 74 üretim | Temel özellikler çalışıyor |
| **Akademi Temel** | SEVİYE 3 | fully_hidden | 3 route dosyası | HQ + öğrenci | 51 modül | Temel eğitim + quiz çalışıyor |
| **PDKS (Devam Takibi)** | SEVİYE 3 | ui_hidden | 357 satır route | Tam | 386 | UI gizli, veri kaydı aktif |
| **Ekipman/Arıza** | SEVİYE 3 | fully_hidden | 1,511 satır route | Tam | 54 arıza, 153 ekipman | Modül kapalı |
| **İK (İzin/Mesai)** | SEVİYE 3 | - | 6,815 satır route | Tam | 35 izin | Çalışıyor |
| **Satınalma** | SEVİYE 3 | always_on | Tedarikçi aktif | Tam | 5 tedarikçi | Sipariş 0, aktif kullanılmıyor |
| **SLA Yönetimi** | SEVİYE 3 | - | Aktif | Tam | 24 kural | Otomatik ihlal kontrolü çalışıyor |
| **Şube Görevleri** | SEVİYE 3 | fully_hidden | 808 satır route | Tam | 80 görev | Modül kapalı |
| **Reçeteler** | SEVİYE 3 | - | Aktif | Tam | 145 | Reçete veritabanı dolu |
| **İletişim Merkezi** | SEVİYE 3 | fully_hidden | 1,492 satır route | Tam | 10 bilet | Destek talep sistemi |
| **Sertifika Sistemi** | SEVİYE 3 | - | Aktif | Tam | 1 tasarım, 0 basım | Tasarım var, henüz basım yok |
| **Delegasyon** | SEVİYE 3 | fully_hidden | 166 satır route | Tam | 0 | Yetki devri modülü kapalı |
| **Onboarding** | SEVİYE 2 | - | Kısmen | Tam | 2 program, 0 atama | Program tanımlı, atama yok |
| **CRM** | SEVİYE 2 | fully_hidden | Bilet var, müşteri yok | 10 sayfa | 23 geri bildirim | /api/crm/customers EKSIK |
| **Bordro/Maaş** | SEVİYE 2 | always_on | 500 HATASI | Tam | - | /api/payroll/records 500 veriyor |
| **Proje Yönetimi** | SEVİYE 2 | - | Temel | Tam | 5 proje | Basit proje takibi |
| **Franchise/Yatırımcı** | SEVİYE 2 | fully_hidden | Kısmen | Tam | 1 yatırımcı | /api/franchise/performance EKSIK |
| **Kayıp Eşya** | SEVİYE 2 | - | Aktif | Tam | 2 | Basit kayıt sistemi |
| **Akademi Gelişmiş** | SEVİYE 1 | - | 12 API EKSIK | UI var | - | Streaks, achievements, study groups yok |
| **Bilgi Bankası** | SEVİYE 1 | - | 2 API EKSIK | Tam | - | Tamamen çalışmıyor |
| **Fire Yönetimi** | SEVİYE 1 | - | Route dosyası var (660 satır) ama REGISTER EDİLMEMİŞ | UI var | - | app.use ile bağlanmamış |
| **Şube Sağlık Skoru** | SEVİYE 1 | - | Route dosyası var (67 satır) ama REGISTER EDİLMEMİŞ | UI var | - | app.use ile bağlanmamış |
| **Koçluk Oturumları** | SEVİYE 1 | - | API EKSIK | UI var | - | /api/coaching/sessions yok |
| **Admin Menü Editörü** | SEVİYE 1 | - | 7 API EKSIK | UI var | - | Menü yapılandırma çalışmıyor |
| **AI-NBA Öneriler** | SEVİYE 1 | - | Route var (264 satır) ama REGISTER EDİLMEMİŞ | Widget var | - | Akıllı öneri motoru |
| **Quick Actions** | SEVİYE 1 | - | Route var (270 satır) ama REGISTER EDİLMEMİŞ | Widget var | - | Hızlı aksiyon grid'i |
| **Fabrika Kavurma** | SEVİYE 1 | fully_hidden | API EKSIK | - | - | Alt-modül tanımlı, API yok |
| **Fabrika Sayım** | SEVİYE 1 | fully_hidden | API EKSIK | - | - | Alt-modül tanımlı, API yok |
| **Fabrika Hammadde** | SEVİYE 1 | fully_hidden | API EKSIK | - | - | Alt-modül tanımlı, API yok |
| **Fabrika Sevkiyat** | SEVİYE 1 | fully_hidden | API EKSIK | - | - | Alt-modül tanımlı, API yok |
| **Performans Değerlendirme** | SEVİYE 1 | - | Rate limited | UI var | - | Henüz uygulanmamış |
| **Veri Dışa Aktarma** | SEVİYE 1 | - | API EKSIK | - | - | /api/data-management/export yok |
| **Çöp Kutusu** | SEVİYE 1 | - | Route var (130 satır) ama kayıt sırasında sorun olabilir | UI var | - | Silinen kayıtları listeleme |

### 7.2 Module Flag Durumu

Platformda dinamik modül yönetim sistemi mevcuttur. Mevcut durum:

**Her Zaman Açık (always_on):** admin, bordro, dashboard, dobody, fabrika, satinalma

**Tamamen Gizli (fully_hidden):** akademi, checklist, crm, delegasyon, denetim, ekipman, finans, franchise, gorevler, iletisim_merkezi, raporlar, stok, sube_gorevleri + tüm fabrika alt-modülleri

**UI Gizli / Veri Aktif (ui_hidden_data_continues):** pdks, vardiya, fabrika.vardiya

**Değerlendirme:** Modüllerin çoğu `fully_hidden` durumunda. Bu, ya henüz hazır olmadıkları ya da bilinçli olarak kapatıldıkları anlamına gelir. Module flag sistemi bu geçişi güvenli bir şekilde yönetiyor — doğru bir yaklaşım.

---

## 8. API SAĞLIK RAPORU

### 8.1 Genel Durum

| Kategori | Sayı | Yüzde |
|----------|------|-------|
| Test edilen API path | 200 | %100 |
| Çalışan API | 162 | %81 |
| Eksik API (backend yok) | 38 | %19 |
| 500 Hata veren API | 1 | %0.5 |

### 8.2 Tam Eksik API Listesi (38 adet)

#### Akademi Sistemi (15 eksik API)

| API Path | Çağıran Bileşen | İş Etkisi |
|----------|----------------|-----------|
| /api/academy/achievement-stats | akademi-v3 | Başarı istatistikleri görüntülenemez |
| /api/academy/adaptive-recommendations | akademi-v3 | Kişiselleştirilmiş öneriler çalışmaz |
| /api/academy/advanced-analytics | akademi-hq | Gelişmiş analitik eksik |
| /api/academy/ai-assistant | akademi-v3 | AI eğitim asistanı çalışmaz |
| /api/academy/ai-generate-onboarding | akademi-hq | Otomatik onboarding oluşturma yok |
| /api/academy/ai-generate-program | akademi-hq | Otomatik program oluşturma yok |
| /api/academy/career-progress | akademi-v3 CareerTab | Kariyer ilerlemesi görüntülenemez |
| /api/academy/exam-requests-approved | akademi-hq | Onaylanan sınav talepleri listelenemez |
| /api/academy/exam-requests-pending | akademi-hq | Bekleyen sınav talepleri listelenemez |
| /api/academy/exam-requests-team | akademi-v3 | Ekip sınav talepleri görüntülenemez |
| /api/academy/progress-overview | akademi-v3 | İlerleme özeti eksik |
| /api/academy/quiz-results | akademi-v3 | Quiz sonuç geçmişi yok |
| /api/academy/recipe (+ recipe-versions, recipe-notifications) | akademi | Reçete eğitim modülü kırık |
| /api/academy/streak-tracker | akademi-v3 | Seri takibi çalışmaz |
| /api/academy/study-groups | akademi-v3 | Çalışma grupları çalışmaz |

#### Admin Sistemi (10 eksik API)

| API Path | Çağıran Bileşen | İş Etkisi |
|----------|----------------|-----------|
| /api/admin/pending-approvals | Dashboard HQ widget | Onay bekleyen öğeler görüntülenemez |
| /api/admin/roles | Admin yetkilendirme | Rol tanımları yönetilemez |
| /api/admin/role-grants | Admin yetkilendirme | Rol yetkileri atanamaz |
| /api/admin/mega-modules/config | Admin modül yönetimi | Mega modül yapılandırması çalışmaz |
| /api/admin/mega-modules/items | Admin modül yönetimi | Modül öğeleri yönetilemez |
| /api/admin/mega-modules/add-module | Admin modül yönetimi | Yeni modül eklenemez |
| /api/admin/menu/items (+order, sections, visibility-rules) | Admin menü editörü | Sidebar menü düzenlenemez |
| /api/admin/dobody/avatars/upload (+bulk-update) | Admin avatar yönetimi | Avatar yüklenemez |
| /api/admin/ai-settings/test (+email, service-email) | Admin ayarlar | AI/email test fonksiyonları çalışmaz |
| /api/admin/users/bulk-import | Admin kullanıcılar | Toplu kullanıcı aktarımı yok |

#### Operasyon ve Raporlama (13 eksik API)

| API Path | Çağıran Bileşen | İş Etkisi |
|----------|----------------|-----------|
| /api/knowledge-base/articles | knowledge-base.tsx, global-search | Bilgi bankası tamamen çalışmaz |
| /api/knowledge-base/categories | knowledge-base.tsx | Bilgi bankası kategorileri yok |
| /api/branch-health (+/scores) | sube-saglik-skoru.tsx | Şube sağlık puanları görüntülenemez |
| /api/coaching/sessions | koçluk sayfası | Koçluk oturumları yönetilemez |
| /api/crm/customers | CRM sayfaları | Müşteri veritabanı yok |
| /api/quick-action | Çoklu dashboard widget'ları | Hızlı aksiyon butonları çalışmaz |
| /api/ai-nba/recommendations | Dashboard widget | AI iş önerileri çalışmaz |
| /api/my-day/summary | benim-gunum.tsx | Günlük özet eksik |
| /api/action-cards/generate | Dashboard widget | Aksiyon kartı oluşturma çalışmaz |
| /api/waste (+/reports) | Fire yönetimi sayfaları | Fire takibi çalışmaz |
| /api/payroll | Bordro sayfaları | Bordro listesi yok |
| /api/salary/records | Maaş sayfası | Maaş kayıtları görüntülenemez |
| /api/shift-rules | Vardiya kuralları | Vardiya kuralları yönetilemez |

### 8.3 500 Hata Veren API

| API Path | Hata Mesajı | Etki |
|----------|-------------|------|
| /api/payroll/records | "Bordro kayıtları alınamadı" | Şube müdürleri maaş verilerine erişemiyor |

### 8.4 Register Edilmemiş Route Dosyaları

Aşağıdaki route dosyaları mevcut ancak `server/routes.ts` içinde `app.use()` ile kayıt edilmemiş olabilir veya farklı path'lerde mount edilmiştir:

| Dosya | Satır | Durum |
|-------|-------|-------|
| waste.ts | 660 | Route mevcut, API çağrıları karşılıksız |
| branch-health.ts | 67 | Route mevcut, API çağrıları karşılıksız |
| ai-nba.ts | 264 | Route mevcut, API çağrıları karşılıksız |
| quick-action.ts | 270 | Route mevcut, API çağrıları karşılıksız |
| trash.ts | 130 | Route mevcut, kısmen çalışıyor olabilir |
| employee-types.ts | 303 | Route mevcut, API çağrıları karşılıksız |

**Önemli Not:** Bu dosyalar yazılmış, sadece `app.use()` ile Express'e bağlanmamış. Bağlama işlemi genellikle 1-2 satırlık bir düzeltmedir.

---

## 9. GÜVENLİK DEĞERLENDİRMESİ

### 9.1 Kimlik Doğrulama

| Kontrol | Durum | Not |
|---------|-------|-----|
| Oturum bazlı kimlik doğrulama (Passport.js) | UYGUN | Local + Kiosk PIN stratejileri |
| isAuthenticated middleware kullanımı | UYGUN | 1,322 kullanım noktası |
| Kiosk kimlik doğrulama (isKioskAuthenticated) | UYGUN | 17 kullanım noktası |
| Korumasız POST/PATCH/DELETE endpoint | YOK | Tüm router'lar router.use(isAuthenticated) ile korunuyor |
| Kasıtlı public endpoint | 2 ADET | /api/feedback/submit, /api/customer-feedback/public (müşteri anketleri — doğru) |
| Parola hashleme | UYGUN | bcrypt kullanılıyor |
| Kiosk PIN güvenliği | UYGUN | bcrypt-hashed, brute-force korumalı, rate limiting |

### 9.2 Yetkilendirme

| Kontrol | Durum | Not |
|---------|-------|-----|
| Rol bazlı erişim kontrolü (RBAC) | UYGUN | 20 farklı rol, menu-service ile dinamik |
| Module flag sistemi | UYGUN | Global/şube/rol bazlı modül erişimi |
| Veri izolasyonu (şube bazlı) | UYGUN | HQ tüm verileri görür, şube yöneticisi sadece kendi şubesini |

### 9.3 Veri Güvenliği

| Kontrol | Durum | Not |
|---------|-------|-----|
| SQL Injection koruması | UYGUN | Drizzle ORM (3,872 parametreli sorgu) + 500 raw SQL (paramterized) |
| Rate limiting | UYGUN | 34 kullanım noktası, özellikle login ve hassas endpointlerde |
| Audit logging | UYGUN | 1,559 kayıt, kullanıcı işlemleri takip ediliyor |
| Soft deletion | UYGUN | Veri kaybı önleniyor |
| Yedekleme | UYGUN | Saatlik otomatik yedekleme (85 kayıt) |

### 9.4 Güvenlik Riskleri

| Risk | Seviye | Açıklama |
|------|--------|----------|
| SESSION_SECRET yönetimi | DÜŞÜK | Environment variable olarak saklanıyor (doğru) |
| Hassas veri ifşası | DÜŞÜK | API yanıtlarında hashedPassword alanı dönüyor — filtrelenmeli |
| Push subscription boş | ORTA | Hiçbir kullanıcı push bildirimi almıyor, güvenlik uyarıları dahil |

---

## 10. PERFORMANS VE ÖLÇEKLENEBİLİRLİK

### 10.1 Sunucu Performansı

| Metrik | Değer | Değerlendirme |
|--------|-------|---------------|
| Sunucu başlatma süresi | ~44 saniye (28 scheduler) | KABUL EDİLEBİLİR |
| Ortalama API yanıt süresi | 10-50ms (basit sorgular) | İYİ |
| En yavaş API yanıtı | /api/me/menu ~963ms | DİKKAT — optimize edilmeli |
| /api/shifts | ~344ms | KABUL EDİLEBİLİR |
| /api/academy/branch-analytics | ~305ms | KABUL EDİLEBİLİR |
| Veritabanı boyutu | 86 MB | İYİ — büyüme alanı var |

### 10.2 Potansiyel Performans Sorunları

| Sorun | Adet | Risk |
|-------|------|------|
| N+1 sorgu (await in loop) | 12 | ORTA — büyük veri setlerinde yavaşlama |
| Bildirim tablosu boyutu | 37,113 | DİKKAT — 90 gün temizleme aktif |
| Reminder tablosu | 3,140 | DÜŞÜK — periyodik temizleme var |
| misc.ts dosya boyutu | 13,216 satır | ETKİ YOK (runtime) — bakım zorluğu |

### 10.3 Ölçeklenebilirlik Değerlendirmesi

**Mevcut kapasite:** 20 şube, 264 kullanıcı — sorunsuz
**Öngörülen sınır:** 100+ şube, 1000+ kullanıcı durumunda:
- Menü servisi (963ms) darboğaz olabilir — cache katmanı gerekir
- Bildirim tablosu milyon satırı geçecek — partitioning gerekir
- Scheduler'lar tek process'te çalışıyor — job queue'ya taşınmalı

---

## 11. OTOMASYON VE ZAMANLAYICI SİSTEMİ

### 11.1 Aktif Zamanlayıcılar (28 görev)

| Zamanlayıcı | Sıklık | İşlev |
|-------------|--------|-------|
| Görev hatırlatma | 10 dakika | Tamamlanmamış görevler için bildirim |
| Onboarding tamamlama | 10 dakika | Tamamlanan onboarding'ler için yönetici bildirimi |
| Bildirim arşivleme | Günlük 02:00 | 90 günden eski bildirimleri temizle |
| SKT son kullanma kontrolü | 6 saat | Son kullanma tarihi yaklaşan ürünleri kontrol et |
| Zamanlanmış görev teslimi | 5 dakika | Tetikleyici bazlı görev atamaları |
| SLA kontrol | 15 dakika | SLA ihlallerini tespit et ve bildir |
| Fotoğraf temizleme | 6 saat | Süresi dolmuş kontrol listesi fotoğraflarını sil |
| Feedback analizi | Haftalık Pazartesi 08:00 | Müşteri geri bildirim pattern analizi |
| Teklif hatırlatma | 24 saat | Tedarikçi teklif hatırlatmaları |
| Stok uyarı | Saatlik | Minimum stok seviyesi kontrolü |
| Agent günlük analiz | Günlük 06:00 | AI bazlı günlük performans analizi |
| Agent haftalık özet | Haftalık Pazartesi 08:00 | Haftalık performans raporu |
| Agent event check | 15 dakika | Olay tetiklemeli kontroller |
| Agent escalation | Saatlik | Tırmanma kontrolü |
| Skill günlük | Günlük 07:00 | Günlük AI skill çalıştırma |
| Skill haftalık | Haftalık Pazartesi 09:00 | Haftalık AI skill çalıştırma |
| Kuyruk kontrolü | 30 dakika | Skill kuyruğu işleme |
| Inactive user check | Günlük 02:00 | Pasif kullanıcı tespiti |
| Outcome tracking | Günlük 08:00 | Sonuç takibi |
| Shift session cleanup | Günlük 03:00 | Vardiya oturum temizleme |
| Backup scheduler | Saatlik | Otomatik veritabanı yedekleme |
| Bildirim temizleme | Günlük | Eski bildirimleri temizle |
| Feedback SLA | Saatlik | Müşteri geri bildirim SLA kontrolü |
| Danger zone | Aylık 1. gün | Tehlikeli bölge analizi |
| Stock alert | Saatlik | Stok uyarıları |
| Webinar reminder | 10 dakika | Webinar hatırlatmaları |
| Composite score | Günlük 03:00 | Bileşik performans skoru hesaplama |
| Task trigger | Günlük 08:00 | Görev tetikleme kontrolü |

### 11.2 Değerlendirme

Zamanlayıcı sistemi kapsamlı ve iyi yapılandırılmış. 28 farklı görev, işletmenin ihtiyaçlarını otomatik olarak karşılıyor. Tek risk noktası: tümü tek bir Node.js process'inde çalışıyor. Yüksek yük altında ayrı bir worker process'e taşınması değerlendirilmelidir.

---

## 12. AI VE AGENT SİSTEMİ (MR. DOBODY)

### 12.1 AI Beceri Envanteri

Platform, "Mr. Dobody" adlı AI asistanı ile 18 farklı otomatik beceri çalıştırmaktadır:

| Beceri | İşlev | Çalıştırma |
|--------|-------|------------|
| ai-enrichment | Veri zenginleştirme | Olay bazlı |
| burnout-predictor | Tükenmişlik tahmini | Günlük |
| contract-tracker | Sözleşme takibi | Günlük |
| cost-analyzer | Maliyet analizi | Günlük |
| customer-watcher | Müşteri izleme | Saatlik |
| daily-coach | Günlük koçluk | Günlük |
| food-safety | Gıda güvenliği | Günlük |
| performance-coach | Performans koçluğu | Haftalık |
| production-director | Üretim yönetimi | Günlük |
| security-monitor | Güvenlik izleme | Saatlik |
| skill-notifications | Beceri bildirimleri | Gerçek zamanlı |
| stock-assistant | Stok asistanı | Saatlik |
| stock-predictor | Stok tahmini | Günlük |
| supplier-tracker | Tedarikçi takibi | Günlük |
| team-tracker | Ekip takibi | Günlük |
| training-optimizer | Eğitim optimizasyonu | Haftalık |
| waste-analyzer | Fire analizi | Günlük |

### 12.2 Agent Durumu

| Metrik | Değer |
|--------|-------|
| Bekleyen aksiyonlar | 444 |
| Tamamlanan aksiyonlar | 5 |
| AI log kayıtları | 6 |
| Agent çalıştırma sayısı | 4 |

**Değerlendirme:** Agent sistemi altyapı olarak güçlü, ancak 444 bekleyen aksiyon birikmiş durumda. Bunların neden işlenmediği incelenmeli. Tamamlanan aksiyon sayısı (5) ile bekleyen aksiyon sayısı (444) arasındaki orantısızlık dikkat çekicidir.

---

## 13. FABRİKA MODÜLÜ DETAYLI ANALİZ

### 13.1 Mevcut Durum

Fabrika modülü, platformun en kapsamlı ikinci modülüdür (6,590 satır backend route, 17 frontend sayfa).

#### Aktif Özellikler

| Özellik | Durum | Veri |
|---------|-------|------|
| Üretim takibi | AKTIF | 74 üretim partisi |
| İstasyon yönetimi | AKTIF | 9 istasyon |
| Ürün veritabanı | AKTIF | 163 ürün |
| Kiosk sistemi | AKTIF | Username+PIN girişi (bcrypt) |
| Vardiya planlama | AKTIF | UI var |
| Performans metrikleri | AKTIF | Puan hesaplama |
| Kalite kontrol | AKTIF | Temel kontrol |
| Maliyet yönetimi | AKTIF | Hesaplama sistemi |
| Dashboard | AKTIF | Özet görünüm |

#### Alt-Modül Durumu (Module Flags)

| Alt-Modül | Flag Durumu | Backend | İş İhtiyacı |
|-----------|-------------|---------|-------------|
| fabrika.hammadde | fully_hidden | API EKSIK | Hammadde giriş/çıkış takibi |
| fabrika.kavurma | fully_hidden | API EKSIK | Kavurma süreci takibi |
| fabrika.sayim | fully_hidden | API EKSIK | Envanter sayımı |
| fabrika.sevkiyat | fully_hidden | API EKSIK | Şubelere sevkiyat |
| fabrika.siparis | fully_hidden | API EKSIK | Şube siparişleri |
| fabrika.stok | fully_hidden | API EKSIK | Fabrika stok yönetimi |
| fabrika.kalite | fully_hidden | Kısmen | Gelişmiş kalite kontrol |
| fabrika.vardiya | ui_hidden_data_continues | AKTIF | Vardiya verileri aktif |

### 13.2 Fabrika İçin Endüstriyel Standart Gereksinimler

Bir kahve fabrikası için endüstri standartlarında bir yönetim sistemi şunları içermelidir:

#### A. Hammadde Yönetimi (Raw Material Management)
- Hammadde girişi (lot numarası, tedarikçi, miktar, birim fiyat)
- SKT (Son Kullanma Tarihi) takibi
- FIFO (First In, First Out) envanter yönetimi
- Tedarikçi kalite skoru
- Minimum stok seviyesi uyarıları
- Hammadde analiz sertifikaları

#### B. Kavurma Yönetimi (Roasting Management)
- Kavurma planı oluşturma (günlük/haftalık)
- Kavurma profili takibi (sıcaklık, süre, fan hızı)
- Parti numarası bazlı izlenebilirlik
- Kalite notları (aroma, renk, nem)
- Kavurma operatörü bazlı performans
- Cupping (tadım) skorları

#### C. Üretim Planlama ve Takip
- Mevcut: Üretim partisi kaydı ✓
- Eksik: Üretim planı oluşturma (talep bazlı)
- Eksik: Makine verimliliği (OEE) hesaplama
- Eksik: Planlı/plansız duruş takibi
- Eksik: Üretim hattı darboğaz analizi

#### D. Sayım ve Envanter
- Periyodik sayım planı (haftalık/aylık)
- Barkod/QR kod ile hızlı sayım
- Sayım farkı raporları
- Düzeltme onay akışı (çift imza)
- Stok değeri hesaplama (FIFO/Ağırlıklı ortalama)

#### E. Sevkiyat Yönetimi
- Şube sipariş toplama
- Sevkiyat planı oluşturma
- Teslimat onayı (şube tarafında)
- Nakliye maliyeti takibi
- Eksik/hasarlı ürün bildirimi

#### F. Kalite Kontrol (Gelişmiş)
- HACCP kontrol noktaları
- Mikrobiyal analiz sonuçları
- Sıcaklık/nem logları (IoT entegrasyonu potansiyeli)
- Müşteri şikayeti bazlı geri izleme
- Tedarikçi denetim sonuçları

#### G. Fire ve Kayıp Yönetimi
- Fire nedeni kategorileri
- Maliyet etkisi hesaplama
- Trend analizi (hangi istasyonda ne kadar fire)
- Fire azaltma hedefleri
- Benchmark karşılaştırma

### 13.3 Fabrika Modülü Öncelik Sıralaması

| Sıra | Özellik | Neden Öncelikli |
|------|---------|----------------|
| 1 | Hammadde giriş/çıkış | Maliyet kontrolü, FIFO zorunluluğu |
| 2 | Kavurma takibi | Kalite tutarlılığı, izlenebilirlik |
| 3 | Sayım modülü | Stok doğruluğu, kayıp tespiti |
| 4 | Sevkiyat yönetimi | Şube operasyonları, teslimat takibi |
| 5 | Fire yönetimi | Maliyet optimizasyonu, trend analizi |
| 6 | Gelişmiş kalite kontrol | HACCP uyumu, müşteri güveni |

---

## 14. ROL BAZLI KULLANICI DENEYİMİ ANALİZİ

### 14.1 Admin Rolü

**Eriştiği modüller:** Tümü
**Çalışan özellikler:**
- Kullanıcı yönetimi (oluşturma, düzenleme, silme)
- Module flag yönetimi
- Yedekleme sistemi
- Duyuru yayınlama
- Agent (Mr. Dobody) yönetimi

**Kırık/eksik özellikler:**
- Pending-approvals widget (HQ dashboard'da hata gösteriyor)
- Mega-modül yapılandırması (7 API eksik)
- Menü editörü (5 API eksik)
- Rol ve yetki yönetimi (/api/admin/roles, /api/admin/role-grants eksik)
- Toplu kullanıcı aktarımı (/api/admin/users/bulk-import eksik)
- AI/Email test fonksiyonları (3 API eksik)

**Kullanıcı etkisi:** YÜKSEK — Admin, sistemin "beyni". Mega-modül ve menü yönetimi olmadan yapılandırma değişiklikleri doğrudan veritabanında yapılmak zorunda.

### 14.2 CEO Rolü

**Eriştiği modüller:** Dashboard, raporlar, tüm şube verileri
**Çalışan özellikler:**
- CEO Command Center
- HQ Dashboard (özet istatistikler)
- Şube karşılaştırma
- Agent (Mr. Dobody) akışı

**Kırık/eksik özellikler:**
- Şube sağlık skoru (/api/branch-health eksik)
- Franchise performans (/api/franchise/performance eksik)
- AI-NBA önerileri (/api/ai-nba/recommendations eksik)
- Finansal raporlama detayları

**Kullanıcı etkisi:** ORTA — Temel dashboard çalışıyor, ancak derinlemesine analitik araçları eksik.

### 14.3 Şube Müdürü (mudur) Rolü

**Eriştiği modüller:** Kendi şubesi: personel, vardiya, görevler, devam takibi
**Çalışan özellikler:**
- Şube dashboard'u (branch-summary API çalışıyor)
- Görev atama ve takip
- Vardiya planlama
- Personel yönetimi (kendi şubesi)
- İzin talepleri
- Kontrol listeleri

**Kırık/eksik özellikler:**
- Bordro/Maaş görüntüleme (500 hatası — KRİTİK)
- Şube sağlık skoru
- Quick actions widget'ı

**Kullanıcı etkisi:** KRİTİK — Bordro 500 hatası günlük işleri doğrudan etkiler.

### 14.4 Coach Rolü

**Eriştiği modüller:** Çoklu şube denetimi, koçluk
**Çalışan özellikler:**
- Coach summary (tüm şube özeti)
- Şube denetim sayfası
- Eğitim modülü yönetimi

**Kırık/eksik özellikler:**
- Koçluk oturumları (/api/coaching/sessions eksik — ANA FONKSİYON)
- Bilgi bankası

**Kullanıcı etkisi:** YÜKSEK — Coach'un ana işlevi olan koçluk oturumları çalışmıyor.

### 14.5 Trainer Rolü

**Eriştiği modüller:** Akademi HQ yönetimi
**Çalışan özellikler:**
- Eğitim modülü oluşturma/düzenleme
- Quiz yönetimi
- Webinar yönetimi
- Sertifika tasarımı

**Kırık/eksik özellikler:**
- Sınav talepleri (3 API eksik)
- Gelişmiş analitik
- AI ile otomatik içerik üretimi (2 API eksik)

**Kullanıcı etkisi:** ORTA — Temel eğitim yönetimi çalışıyor, gelişmiş özellikler eksik.

### 14.6 Fabrika Müdürü (fabrika_mudur) Rolü

**Eriştiği modüller:** Tüm fabrika operasyonları
**Çalışan özellikler:**
- Fabrika dashboard
- Üretim takibi
- İstasyon yönetimi
- Kiosk yönetimi
- Performans metrikleri

**Kırık/eksik özellikler:**
- Hammadde yönetimi (tamamen eksik)
- Kavurma takibi (tamamen eksik)
- Sayım modülü (tamamen eksik)
- Sevkiyat yönetimi (tamamen eksik)
- Fire yönetimi (route var ama register edilmemiş)

**Kullanıcı etkisi:** YÜKSEK — Temel üretim çalışıyor ama endüstriyel yönetim araçları eksik.

### 14.7 Barista / Stajyer Rolü

**Eriştiği modüller:** Eğitim, görevler, vardiya
**Çalışan özellikler:**
- Akademi (eğitim modülleri, quizler)
- Görev listesi ve tamamlama
- Vardiya görüntüleme
- Sertifika görüntüleme (yeni eklendi)

**Kırık/eksik özellikler:**
- Streak tracker (motivasyon aracı)
- Achievement/başarı sistemi
- Study groups
- Career progress

**Kullanıcı etkisi:** DÜŞÜK — Temel eğitim çalışıyor, gamification eksik.

### 14.8 Fabrika Operatörü Rolü

**Eriştiği modüller:** Kiosk, üretim kaydı
**Çalışan özellikler:**
- Fabrika kiosk (username+PIN girişi ✓)
- Üretim kaydı oluşturma
- Vardiya bilgisi

**Kırık/eksik özellikler:** Yok — kiosk sistemi tam çalışıyor.
**Kullanıcı etkisi:** YOK — En temel kullanıcı, çalışan özellikler yeterli.

### 14.9 Kiosk (sube_kiosk) Rolü

**Eriştiği modüller:** PDKS, görev tamamlama
**Çalışan özellikler:**
- Şube kiosk girişi
- PDKS (parmak basma)
- Temel görev görüntüleme

**Kırık/eksik özellikler:** Push bildirim yok (abonelik 0).
**Kullanıcı etkisi:** DÜŞÜK

### 14.10 Yatırımcı (yatirimci_branch) Rolü

**Eriştiği modüller:** Finansal raporlar, şube performansı
**Çalışan özellikler:**
- Franchise yatırımcı paneli
- Şube bazlı finansal veriler

**Kırık/eksik özellikler:**
- Franchise performans (/api/franchise/performance eksik)
- Detaylı finansal raporlama

**Kullanıcı etkisi:** ORTA — Yatırımcılar detaylı performans verilerine erişemiyor.

---

## 15. KOD KALİTESİ VE TEKNİK BORÇ

### 15.1 Dosya Boyutu Analizi

**Kritik Büyüklükteki Dosyalar (>3,000 satır):**

| Dosya | Satır | Risk | Öneri |
|-------|-------|------|-------|
| server/routes/misc.ts | 13,216 | KRİTİK | 10+ modüle bölünmeli |
| client/src/pages/ik.tsx | 7,134 | YÜKSEK | Alt bileşenlere ayırılmalı |
| server/routes/hr.ts | 6,815 | YÜKSEK | Modüllere bölünmeli |
| server/routes/factory.ts | 6,590 | YÜKSEK | Alt-modüllere bölünmeli |
| server/routes/operations.ts | 5,658 | YÜKSEK | Modüllere bölünmeli |
| server/routes/branches.ts | 4,385 | ORTA | Refactor değerlendirilmeli |
| client/src/pages/fabrika/maliyet-yonetimi.tsx | 3,859 | ORTA | Alt bileşenlere ayırılmalı |
| server/routes/admin.ts | 3,504 | ORTA | Refactor değerlendirilmeli |
| client/src/pages/yonetim/akademi.tsx | 3,374 | ORTA | Alt bileşenlere ayırılmalı |
| client/src/pages/yeni-sube-detay.tsx | 3,245 | ORTA | Alt bileşenlere ayırılmalı |

### 15.2 Tip Güvenliği

| Metrik | Değer | Risk |
|--------|-------|------|
| `: any` kullanımı (frontend sayfaları) | ~1,000 | ORTA |
| Schema satır sayısı | 15,697 | - |
| Interface/type tanımı | Kapsamlı | İYİ |

### 15.3 Kod Kalitesi Metrikleri

| Metrik | Değer | Değerlendirme |
|--------|-------|---------------|
| console.log (sunucu route'ları) | 56 | Temizlenmeli |
| console.log (frontend sayfaları) | 3 | KABUL EDİLEBİLİR |
| Dark mode uyumsuz renk | 28 | Düzeltilmeli |
| bg-white without dark variant | 2 | KABUL EDİLEBİLİR |
| Hardcoded text colors | 28 | Düzeltilmeli |
| useQuery error handling coverage | 402/999 (%40) | İYİLEŞTİRİLMELİ |

---

## 16. EKSİK ÖZELLİKLER VE BOŞLUK ANALİZİ

### 16.1 Kritik Boşluklar (İş Etkisi Yüksek)

| Boşluk | Açıklama | Etkilenen Roller |
|--------|----------|------------------|
| Bordro 500 hatası | Maaş verileri görüntülenemiyor | mudur, muhasebe_ik |
| Admin pending-approvals | Dashboard widget hatalı | admin, ceo |
| Fabrika alt-modülleri | Kavurma, sayım, hammadde, sevkiyat | fabrika_mudur |
| Bilgi bankası | Tamamen çalışmıyor | Tüm roller |
| Koçluk oturumları | API yok | coach |

### 16.2 Orta Öncelikli Boşluklar

| Boşluk | Açıklama | Etkilenen Roller |
|--------|----------|------------------|
| Akademi gelişmiş | 12 eksik API | barista, stajyer, trainer |
| Şube sağlık skoru | API register edilmemiş | ceo, coach |
| Fire yönetimi | Route var ama register edilmemiş | fabrika_mudur, kalite_kontrol |
| CRM müşteri veritabanı | API yok | marketing |
| Admin menü/modül yönetimi | 7 API eksik | admin |
| Push bildirimler | 0 abone | Tüm roller |

### 16.3 Düşük Öncelikli Boşluklar

| Boşluk | Açıklama |
|--------|----------|
| AI-NBA önerileri | Route var ama register edilmemiş |
| Quick actions | Route var ama register edilmemiş |
| Veri dışa aktarma | API yok |
| Çöp kutusu | Route var, kısmen çalışıyor |
| Performans değerlendirme | Henüz başlanmamış |

---

## 17. RİSK DEĞERLENDİRMESİ

### 17.1 Teknik Riskler

| Risk | Olasılık | Etki | Önlem |
|------|----------|------|-------|
| misc.ts bakım hatası | YÜKSEK | YÜKSEK | Dosyayı modüllere bölmek |
| Tip güvenliği hataları (`: any`) | ORTA | ORTA | Aşamalı tip ekleme |
| N+1 sorgu performans sorunu | DÜŞÜK | ORTA | Batch sorguya dönüştürme |
| Tek process scheduler riski | DÜŞÜK | YÜKSEK | Worker process ayrımı |
| Veritabanı büyüme | DÜŞÜK | ORTA | Partitioning planı |

### 17.2 İş Riskleri

| Risk | Olasılık | Etki | Önlem |
|------|----------|------|-------|
| Kullanıcı güven kaybı (kırık sayfalar) | YÜKSEK | YÜKSEK | Eksik API'leri tamamla veya modülleri kapat |
| Bordro erişilemezlik | YÜKSEK | KRİTİK | 500 hatasını hemen düzelt |
| Yeni şube ekleme zorluğu | ORTA | ORTA | Personel oluşturma akışını otomatikleştir |
| Veri kaybı | DÜŞÜK | KRİTİK | Yedekleme sistemi aktif ✓ |
| Güvenlik ihlali | DÜŞÜK | KRİTİK | Auth katmanı güçlü ✓ |

### 17.3 Operasyonel Riskler

| Risk | Olasılık | Etki | Önlem |
|------|----------|------|-------|
| Agent aksiyon birikimi (444 bekleyen) | YÜKSEK | ORTA | Aksiyon işleme hızını artır |
| Push bildirim eksikliği | YÜKSEK | ORTA | Service worker + subscription akışını tamamla |
| 14 şubede yetersiz personel hesabı | ORTA | ORTA | Toplu kullanıcı oluşturma |

---

## 18. STRATEJİK ÖNERİLER

### 18.1 Acil Müdahale (İlk 1-2 Hafta)

1. **Bordro 500 hatasını düzeltin** — Şube müdürlerinin günlük işlerini etkiliyor
2. **Register edilmemiş route dosyalarını bağlayın** — waste.ts, branch-health.ts, ai-nba.ts, quick-action.ts, trash.ts, employee-types.ts zaten yazılmış, sadece `app.use()` ile bağlanması gerekiyor
3. **Tamamlanmamış modülleri `fully_hidden` yapın** — Kullanıcılar kırık sayfaları görmemeli

### 18.2 Kısa Vadeli (1-2 Ay)

4. **Fabrika alt-modüllerini tamamlayın** — Hammadde, kavurma, sayım en öncelikli
5. **Akademi gelişmiş özelliklerini tamamlayın** — Sınav talepleri, quiz sonuçları
6. **Admin menü/modül yönetimi API'lerini ekleyin** — Sistem yapılandırmasını kolaylaştırır
7. **misc.ts dosyasını bölün** — 13K satırlık dosya bakım kabusudur

### 18.3 Orta Vadeli (2-4 Ay)

8. **CRM müşteri veritabanını oluşturun** — Franchise büyüme stratejisi için gerekli
9. **Raporlama ve dışa aktarma** — CEO/yatırımcı memnuniyeti
10. **Push bildirim sistemini aktifleştirin** — Mobil kullanıcı deneyimi
11. **Bilgi bankası modülünü tamamlayın** — Kurumsal bilgi yönetimi

### 18.4 Uzun Vadeli (4-6 Ay)

12. **Koçluk oturumları modülünü oluşturun** — Coach rolünün ana fonksiyonu
13. **Performans değerlendirme sistemi** — HR süreçleri
14. **Tip güvenliği iyileştirmesi** — `: any` temizleme, runtime hata azaltma
15. **Ölçeklenebilirlik hazırlığı** — Job queue, cache katmanı, DB partitioning

---

## 19. ÖNERİLEN YOL HARİTASI

### Faz 1: Stabilizasyon (Hafta 1-2)
- Bordro 500 hatasını düzelt
- 6 register edilmemiş route dosyasını bağla
- Tamamlanmamış modülleri `fully_hidden` yap
- Admin pending-approvals stub'ı ekle
- **Beklenen sonuç:** Kullanıcılar hata görmez, mevcut özellikler sorunsuz çalışır

### Faz 2: Fabrika Sprint (Hafta 3-6)
- Hammadde giriş/çıkış modülü
- Kavurma takip modülü
- Sayım modülü
- Fire yönetimi (route zaten var, tamamla)
- **Beklenen sonuç:** Fabrika endüstriyel seviyede yönetilebilir

### Faz 3: Akademi ve Eğitim (Hafta 7-9)
- Sınav talep sistemi tamamlama
- Quiz sonuç geçmişi
- Career progress (kariyer ilerlemesi)
- Streak tracker (motivasyon)
- **Beklenen sonuç:** Eğitim sistemi tam fonksiyonel

### Faz 4: CRM ve Raporlama (Hafta 10-13)
- Müşteri veritabanı
- Kampanya yönetimi aktivasyonu
- Raporlama dashboardları
- Excel/PDF dışa aktarma
- **Beklenen sonuç:** Pazarlama ve yönetim raporları hazır

### Faz 5: İyileştirme ve Ölçekleme (Hafta 14-20)
- Kod kalitesi (misc.ts bölme, tip güvenliği)
- Push bildirim sistemi
- Koçluk oturumları
- Performans değerlendirme
- Admin menü editörü
- **Beklenen sonuç:** Platform kurumsal kalitede

---

## 20. IT DANIŞMAN İÇİN TARTIŞMA SORULARI

### Stratejik Kararlar

1. **Modül Önceliklendirme:** 32 module flag'den sadece 6'sı `always_on`. Hangi modüller açılmalı ve hangi sırayla?

2. **Fabrika Derinliği:** Fabrika modülü basit üretim takibi mi kalacak, yoksa tam ERP seviyesinde (hammadde lot takibi, FIFO, kavurma profilleri, OEE) mi olacak?

3. **CRM Kapsamı:** Sadece destek talepleri mi, yoksa müşteri sadakat programı, segmentasyon, otomatik kampanyalar dahil mi?

4. **14 Şube Personeli:** 14 şubede sadece kiosk kullanıcısı var. Bu şubeler için personel hesapları ne zaman oluşturulacak?

5. **AI Agent Birikimi:** 444 bekleyen agent aksiyonu birikmiş. Bunların öncelik sıralaması ve işleme stratejisi ne olmalı?

### Teknik Kararlar

6. **Monolitik vs Modüler:** Mevcut yapı tek bir Node.js process'inde çalışıyor. Microservice'lere geçiş düşünülüyor mu?

7. **Mobil Uygulama:** PWA yeterli mi, yoksa native mobil uygulama (iOS/Android) gerekli mi?

8. **Offline Çalışma:** Kiosk ve saha personeli için internet kesintisi durumunda çalışma senaryosu var mı?

9. **Entegrasyonlar:** Muhasebe yazılımı (Luca, Paraşüt vb.), ödeme sistemi, IoT sensörler ile entegrasyon planı var mı?

10. **Veri Saklama Politikası:** 37K+ bildirim, 12K+ vardiya. Eski verilerin arşivleme/temizleme politikası ne olmalı?

### Yatırım Kararları

11. **DevOps Yatırımı:** CI/CD pipeline, staging environment, otomatik test altyapısı ne zaman kurulacak?

12. **Ekip Büyütme:** Mevcut geliştirme hızı (2 günde 19 sprint) sürdürülebilir mi? Kaç geliştirici gerekli?

13. **SLA Taahhütleri:** Müşteri (franchise sahipleri) için uptime garantisi ve yanıt süresi taahhüdü var mı?

---

## EKLER

### EK A: Tam Tablo Listesi (İlk 50)

374 tablodan veri içerenlerin tam listesi Bölüm 4.2'de verilmiştir.

### EK B: Tam API Endpoint Listesi

1,365+ endpoint'in tam listesi `server/routes/` dizininde bulunan 49 dosyada tanımlıdır.

### EK C: Module Flag Referansı

32 module flag'in tam listesi ve davranış açıklamaları Bölüm 7.2'de verilmiştir.

---

**Rapor Sonu**

*Bu rapor, DOSPRESSO platformunun 19 Mart 2026 tarihindeki durumunu yansıtmaktadır. Otomatik araçlar ve doğrudan veritabanı/API testleri ile hazırlanmıştır. Bulguların yorumlanması ve önceliklendirmesi için IT danışman ile birlikte çalışılması önerilir.*
