# DOSPRESSO Franchise Management Platform
# IT Danışman Detaylı Audit Raporu

**Tarih:** 26 Mart 2026
**Platform:** DOSPRESSO Franchise Yönetim Sistemi
**Versiyon:** Production-Ready (Pilot Öncesi)
**Hazırlayan:** Sistem Mimarı / IT Audit

---

## 1. GENEL BAKIŞ

### 1.1 Proje Tanımı
DOSPRESSO, çok şubeli bir kahve/gıda franchise ağı için geliştirilmiş kapsamlı franchise yönetim platformudur. HR, fabrika yönetimi, eğitim, finans, CRM, kalite kontrol ve ekipman yönetimi dahil çeşitli departmanları merkezi olarak yönetmeyi hedefler.

### 1.2 Kapsam
| Metrik | Değer |
|--------|-------|
| Toplam Lokasyon | 22 (20 şube + 1 HQ + 1 Fabrika) |
| Aktif Şube | 20 |
| Toplam Kullanıcı | 270 |
| Aktif Kullanıcı | 64 |
| Farklı Rol Sayısı | 21 benzersiz rol |
| Veritabanı Tablo Sayısı | 388 |

### 1.3 Rol Dağılımı (Aktif Kullanıcılar)
| Rol | Sayı | Açıklama |
|-----|------|----------|
| sube_kiosk | 18 | Şube kiosk hesapları |
| barista | 10 | Barista personel |
| fabrika_operator | 6 | Fabrika operatörleri |
| stajyer | 4 | Stajyer personel |
| yatirimci_branch | 4 | Şube yatırımcıları |
| supervisor | 3 | Şube süpervizörleri |
| admin | 3 | Sistem yöneticileri |
| ceo | 2 | CEO |
| mudur | 2 | Şube müdürleri |
| muhasebe_ik | 1 | Muhasebe/IK |
| trainer | 1 | Eğitmen |
| coach | 1 | Koç |
| marketing | 1 | Pazarlama |
| cgo | 1 | CGO |
| gida_muhendisi | 1 | Gıda mühendisi |
| fabrika_mudur | 1 | Fabrika müdürü |
| kalite_kontrol | 1 | Kalite kontrol |
| satinalma | 1 | Satın alma |
| bar_buddy | 1 | Bar buddy |
| supervisor_buddy | 1 | Süpervizör buddy |
| uretim_sefi | 1 | Üretim şefi |

---

## 2. TEKNİK MİMARİ

### 2.1 Teknoloji Yığını (Tech Stack)

#### Frontend
| Teknoloji | Versiyon | Kullanım |
|-----------|----------|----------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Tip güvenliği |
| Vite | 5.x | Build tool & dev server |
| Tailwind CSS | 3.x | Stil sistemi |
| Shadcn/ui + Radix UI | Latest | Bileşen kütüphanesi |
| TanStack Query | v5 | Veri yönetimi & cache |
| Wouter | Latest | Client-side routing |
| Lucide React | Latest | İkon kütüphanesi |
| i18next | Latest | Çoklu dil desteği |

#### Backend
| Teknoloji | Versiyon | Kullanım |
|-----------|----------|----------|
| Node.js | 20.20.0 | Runtime |
| Express.js | 4.x | HTTP sunucu |
| TypeScript | 5.x | Tip güvenliği |
| Passport.js | Latest | Kimlik doğrulama |
| Drizzle ORM | Latest | Veritabanı ORM |
| bcrypt | Latest | Şifre hash |

#### Veritabanı & Altyapı
| Teknoloji | Kullanım |
|-----------|----------|
| PostgreSQL (Neon) | Ana veritabanı |
| Replit Object Storage / AWS S3 | Dosya depolama |
| IONOS SMTP | E-posta bildirimleri |
| OpenAI API | AI özellikleri |

### 2.2 Kod Tabanı İstatistikleri
| Metrik | Sayı |
|--------|------|
| Server Route Dosyaları | 98 |
| Schema Dosyaları | 19 |
| Sayfa Bileşenleri | 171 |
| UI Bileşenleri | 192+ |
| NPM Dependencies | 118 |
| NPM DevDependencies | 23 |

### 2.3 Veritabanı İstatistikleri (Aktif Veriler)
| Tablo | Kayıt Sayısı |
|-------|-------------|
| notifications | 24,257 |
| users | 270 |
| scheduled_offs | 216 |
| factory_products | 163 |
| module_flags | 35 |
| reminders | 16 |
| dashboard_role_widgets | 6 |
| audit_logs | 3 |
| sessions | 1 |

> **Not:** Sistem pilot öncesi aşamada olduğundan, operasyonel veri tabloları (görevler, vardiyalar, stok, finans vb.) henüz boş veya minimal düzeydedir.

---

## 3. MODÜL VE ÖZELLİK ANALİZİ

### 3.1 Ana Modüller

| # | Modül | Durum | Açıklama |
|---|-------|-------|----------|
| 1 | **Komuta Merkezi (Mission Control)** | Aktif | 6 role özel dashboard + dinamik widget sistemi |
| 2 | **İnsan Kaynakları (HR)** | Aktif | Tam yaşam döngüsü: belgeler, disiplin, onboarding, izin, maaş |
| 3 | **Akademi (Academy)** | Aktif | LMS: modüller, quizler, sertifikalar, AI destekli öğrenme |
| 4 | **Fabrika Operasyonları** | Aktif | Kiosk, vardiya, kalite kontrol, lot takibi, istasyon benchmarları |
| 5 | **CRM** | Aktif | İletişim, müşteri geri bildirim, QR desteği, görev entegrasyonu |
| 6 | **Finans** | Aktif | Cari hesaplar, satın alma, bordro hesaplama |
| 7 | **Ekipman Yönetimi** | Aktif | Arıza takibi, bakım planlaması |
| 8 | **PDKS (Personel Devam Kontrol)** | Aktif | Kiosk giriş/çıkış, vardiya, 45 saat kontrolü, otomatik izin |
| 9 | **Görev Yönetimi** | Aktif | Tekli/çoklu atama, onay/red, tekrarlayan görevler |
| 10 | **Kalite Denetim** | Aktif | Şube denetimleri, puanlama |
| 11 | **Bildirim Sistemi** | Aktif | 4 seviyeli (operasyonel, taktik, stratejik, kişisel) |
| 12 | **Mr. Dobody (AI Agent)** | Aktif | Proaktif boşluk tespiti, görev ataması |
| 13 | **Raporlama** | Aktif | Çapraz modül analizleri, aylık snapshot'lar |
| 14 | **Üretim Planlama** | Aktif | Haftalık planlar, onay hiyerarşisi |

### 3.2 Zamanlayıcılar (Schedulers)
| # | Zamanlayıcı | Zamanlama | İşlev |
|---|------------|-----------|-------|
| 1 | Fabrika Puanlama | Günlük 02:00 | İşçi performans puanları |
| 2 | AI Log Temizleme | Günlük 03:30 | Eski AI loglarını temizle |
| 3 | Fabrika Auto-Checkout | 20:30 | Otomatik çıkış |
| 4 | Şube Auto-Checkout | Saatlik | Otomatik çıkış |
| 5 | HQ Auto-Checkout | Saatlik | HQ otomatik çıkış |
| 6 | PDKS Hafta Sonu İzin | Aylık | HQ için Cmt/Paz otomatik izin |
| 7 | PDKS Haftalık 45 Saat | Pazar 23:00 | Haftalık çalışma saati özeti |
| 8 | PDKS Günlük Devamsızlık | Günlük 08:30 | Devamsızlık/geç kalma raporu |
| 9 | PDKS Aylık Bordro | Ayın 1'i 04:00 | Otomatik bordro hesaplama |
| 10 | Agent Scheduler | Periyodik | Mr. Dobody AI görevleri |
| 11 | Haftalık Yedekleme | Haftalık | Sistem yedekleme |
| 12 | Master Tick (10dk) | 10 dakika | Genel bakım döngüsü |
| 13 | Saatlik Tick | 1 saat | Periyodik kontroller |

---

## 4. GÜVENLİK DENETİMİ

### 4.1 Kimlik Doğrulama (Authentication)

#### 4.1.1 Güçlü Yönler
| # | Özellik | Detay | Durum |
|---|---------|-------|-------|
| 1 | Şifre Hash | bcrypt kullanımı (hem web hem kiosk) | ✅ Güvenli |
| 2 | Session Yönetimi | PostgreSQL tabanlı session store | ✅ Güvenli |
| 3 | Cookie Güvenliği | httpOnly: true, secure: production, sameSite: lax | ✅ Güvenli |
| 4 | Session Fixation | Login sonrası session.regenerate() çağrısı | ✅ Korumalı |
| 5 | Eşzamanlı Oturum | Kullanıcı başına max 2 aktif oturum | ✅ Sınırlı |
| 6 | Hesap Kilitleme | 15 dakikada 10 başarısız deneme → 15 dk kilitleme | ✅ Aktif |
| 7 | Admin Bildirim | Kilitleme sonrası admin'e otomatik bildirim | ✅ Aktif |
| 8 | Rate Limiting | Login endpoint'lerine uygulanmış | ✅ Aktif |
| 9 | Hassas Veri Filtreleme | Rol bazlı alan filtreleme (şifre, telefon vb.) | ✅ Aktif |
| 10 | Audit Logging | Login/logout ve kritik işlemler loglanıyor | ✅ Aktif |

#### 4.1.2 Kiosk Güvenliği
| # | Özellik | Detay | Durum |
|---|---------|-------|-------|
| 1 | PIN Sistemi | 4 haneli PIN, bcrypt ile hashlenmiş | ✅ Güvenli |
| 2 | PIN Kilitleme | 5 başarısız deneme → 30 dk blok | ✅ Aktif |
| 3 | Token TTL | UUID tabanlı token, 8 saat ömürlü | ✅ Sınırlı |

#### 4.1.3 Risk Alanları

| # | Risk | Seviye | Detay | Öneri |
|---|------|--------|-------|------|
| R1 | Memory-based Lockout | ORTA | Hesap kilitleme in-memory Map'te tutuluyor. Çoklu sunucu ortamında senkronize olmaz | Redis veya PostgreSQL'e taşınmalı |
| R2 | CSRF Koruması | ORTA | Explicit CSRF middleware yok. `sameSite: lax` kısmi koruma sağlıyor | CSRF token middleware eklenmeli |
| R3 | Hardcoded Branch IDs | DÜŞÜK | Bazı route'larda `HQ_BRANCH_ID = 23` gibi sabit değerler | Konfigürasyon tablosuna taşınmalı |

### 4.2 Yetkilendirme (Authorization)

#### 4.2.1 Güçlü Yönler
- 21 farklı rol tanımlı (HQ, şube, fabrika kategorileri)
- Modül-Aksiyon-Kapsam (Module-Action-Scope) matrisi
- `self`, `branch`, `global` kapsam seviyeleri
- Module flag sistemi ile granüler özellik kontrolü
- ProtectedRoute ve ModuleGuard frontend bileşenleri

#### 4.2.2 Risk Alanları

| # | Risk | Seviye | Detay | Öneri |
|---|------|--------|-------|------|
| R4 | HR Route Yetkilendirme | YÜKSEK | `server/routes/hr.ts` içindeki birçok endpoint sadece `isAuthenticated` kullanıyor, `requireRole` yok. Herhangi bir oturum açmış kullanıcı hassas HR verilerine erişebilir | Her HR endpoint'ine uygun `requireRole` middleware eklenmeli |
| R5 | Tutarsız Yetki Kontrolü | ORTA | Bazı dosyalarda `requireRole` kullanılırken, bazılarında handler içi kontrol yapılıyor | Tek bir standart yaklaşım belirlenmeli |

### 4.3 SQL Güvenliği

| # | Risk | Seviye | Detay | Dosya |
|---|------|--------|-------|-------|
| R6 | SQL Injection Riski | YÜKSEK | `dashboard-data-routes.ts` içinde `sql.raw()` ile string interpolation kullanılıyor. `startDate`, `endDate` gibi kullanıcı girdileri doğrudan SQL string'ine enjekte ediliyor | `dashboard-data-routes.ts` |
| — | Drizzle ORM (Diğer) | GÜVENLİ | Diğer route dosyalarında Drizzle'ın `sql` tagged template kullanılıyor (prepared statement) | Genel |

**Detay (R6):** `safeCount()` ve `safeRows()` helper fonksiyonları `db.execute(sql.raw(query))` çağrısı yapıyor. `branchId` integer parse ediliyor ancak `startDate`, `endDate`, `today` gibi tarih parametreleri doğrudan interpolation ile SQL string'ine ekleniyor.

**Örnek:**
```typescript
// RİSKLİ PATTERN:
safeCount(`SELECT count(*) FROM shift_attendance WHERE branch_id = ${branchId} AND date = '${today}'`)

// GÜVENLİ PATTERN (önerilen):
db.execute(sql`SELECT count(*) FROM shift_attendance WHERE branch_id = ${branchId} AND date = ${today}`)
```

### 4.4 Frontend Güvenliği

| # | Kontrol | Durum | Detay |
|---|---------|-------|-------|
| 1 | Hardcoded Credentials | ✅ Temiz | Frontend'te sabit şifre/API anahtarı yok |
| 2 | XSS (dangerouslySetInnerHTML) | ✅ Düşük Risk | Sadece `chart.tsx` içinde CSS style bloğu için kullanılıyor, kullanıcı girdisi işlenmiyor |
| 3 | Env Variable Sızıntısı | ✅ Temiz | Hassas sunucu değişkenleri (OPENAI_API_KEY vb.) frontend'e açılmamış |
| 4 | Session Yönetimi | ✅ Güvenli | `credentials: 'include'` ile oturum tabanlı auth |
| 5 | Hassas Veri | ✅ Temiz | Şifre, token gibi veriler client'a gönderilmiyor |

---

## 5. ALTYAPI VE PERFORMANS

### 5.1 Ortam Değişkenleri (Environment Variables)

| Değişken | Kullanım | Durumu |
|----------|----------|--------|
| DATABASE_URL | PostgreSQL bağlantısı | ✅ Ayarlı |
| SESSION_SECRET | Session şifreleme | ✅ Ayarlı |
| ADMIN_BOOTSTRAP_PASSWORD | Admin şifre senkronu | ✅ Ayarlı |
| SMTP_HOST/PORT/USER/PASSWORD | E-posta bildirimleri | ✅ Ayarlı |
| SMTP_FROM_EMAIL | Gönderen adresi | ✅ Ayarlı |
| DEFAULT_OBJECT_STORAGE_BUCKET_ID | Dosya depolama | ✅ Ayarlı |
| OPENAI_API_KEY | AI özellikleri | ✅ Ayarlı (entegrasyon) |
| VAPID_PUBLIC/PRIVATE_KEY | Push bildirimler | ⚠️ Kontrol edilmeli |
| RESEND_API_KEY | Resend email servisi | ❌ Eksik (kullanılmıyor olabilir) |

### 5.2 Deployment Hazırlığı

| # | Kontrol | Durum | Not |
|---|---------|-------|-----|
| 1 | Production Build | ✅ | Vite production build yapılandırılmış |
| 2 | Session Store | ✅ | PostgreSQL tabanlı (connect-pg-simple) |
| 3 | Cookie Güvenliği | ✅ | Production'da secure: true |
| 4 | Hata Yakalama | ✅ | try/catch + console.error pattern'i |
| 5 | Health Check | ✅ | `performHealthCheck()` mevcut |
| 6 | Backup | ✅ | Haftalık otomatik yedekleme |
| 7 | Graceful Shutdown | ⚠️ | Kontrol edilmeli |

---

## 6. RİSK ÖZETİ VE ÖNCELİKLENDİRME

### 6.1 Kritik Riskler (Hemen Çözülmeli)

| # | Risk | Etki | Çözüm Süresi |
|---|------|------|-------------|
| R4 | HR endpoint'lerinde eksik role kontrolü | Veri sızıntısı — herhangi bir oturum açmış kullanıcı personel verilerine erişebilir | 2-4 saat |
| R6 | SQL injection riski (dashboard-data-routes.ts) | Veritabanı manipülasyonu | 4-6 saat |

### 6.2 Orta Riskler (1-2 Hafta İçinde)

| # | Risk | Etki | Çözüm Süresi |
|---|------|------|-------------|
| R1 | In-memory lockout (tek sunucu sınırlaması) | Çoklu sunucu ortamında bypass edilebilir | 2-3 saat |
| R2 | CSRF koruması eksik | State-changing isteklerde cross-site saldırı riski | 3-4 saat |
| R5 | Tutarsız yetkilendirme pattern'i | Bakım zorluğu, gözden kaçan açıklar | 1-2 gün |

### 6.3 Düşük Riskler (Planlanan Sprint'te)

| # | Risk | Etki |
|---|------|------|
| R3 | Hardcoded branch ID'ler | Konfigürasyon esnekliği kaybı |

---

## 7. POZİTİF BULGULAR

| # | Alan | Detay |
|---|------|-------|
| 1 | **Mimari Olgunluk** | 98 route dosyası, 19 schema dosyası, 171 sayfa ile modüler ve ölçeklenebilir yapı |
| 2 | **Rol Sistemi** | 21 farklı rol ile granüler erişim kontrolü |
| 3 | **Şifre Güvenliği** | bcrypt hash tüm şifre türlerinde (web + kiosk PIN) |
| 4 | **Session Güvenliği** | Session fixation koruması, eşzamanlı oturum sınırı, PostgreSQL session store |
| 5 | **Frontend Güvenliği** | Hardcoded credential yok, XSS riski minimal |
| 6 | **Otomatik İşlemler** | 13 zamanlayıcı ile kapsamlı otomasyon |
| 7 | **AI Entegrasyonu** | Mr. Dobody ile proaktif iş zekası |
| 8 | **Audit Trail** | Login/logout ve kritik işlemler loglanıyor |
| 9 | **Modül Flag Sistemi** | Granüler özellik açma/kapama |
| 10 | **Dark Mode** | Tema desteği ve font ölçekleme |

---

## 8. ÖNERİLER

### 8.1 Acil Aksiyon Planı (Pilot Öncesi)

1. **HR Route Güvenliği**: Tüm HR endpoint'lerine `requireRole(['admin','ceo','muhasebe_ik','mudur'])` ekle
2. **SQL Parametreleme**: `dashboard-data-routes.ts` içindeki tüm `sql.raw()` kullanımlarını Drizzle `sql` tagged template'e dönüştür
3. **CSRF Middleware**: `csurf` veya benzeri CSRF koruması ekle

### 8.2 Kısa Vadeli (İlk 3 Ay)

4. **Lockout Persistance**: In-memory lockout'u PostgreSQL'e taşı
5. **API Rate Limiting**: Tüm mutation endpoint'lerine rate limit ekle
6. **Error Handling**: Global error handler ve structured logging (winston/pino)
7. **API Versioning**: `/api/v1/` prefix'i ekle

### 8.3 Orta Vadeli (3-6 Ay)

8. **Monitoring**: APM entegrasyonu (Sentry, Datadog vb.)
9. **Load Testing**: Pilot öncesi yük testi (270 kullanıcı simülasyonu)
10. **Backup Testi**: Yedekleme geri yükleme prosedürü oluştur ve test et
11. **Penetration Test**: Profesyonel pentest yaptır
12. **API Dokümantasyonu**: Swagger/OpenAPI entegrasyonu

---

## 9. SONUÇ

DOSPRESSO platformu, mimari olarak olgun ve kapsamlı bir franchise yönetim sistemidir. 388 veritabanı tablosu, 98 API route dosyası ve 171 sayfa bileşeni ile geniş bir işlevsellik yelpazesi sunmaktadır.

**Güçlü yönler:** Modern teknoloji yığını, modüler mimari, sağlam kimlik doğrulama altyapısı, kapsamlı otomasyon (13 zamanlayıcı), AI entegrasyonu.

**İyileştirme gereken alanlar:** HR endpoint yetkilendirmesi (YÜKSEK), SQL injection riski (YÜKSEK), CSRF koruması (ORTA), in-memory lockout sınırlaması (ORTA).

Kritik güvenlik bulgularının (R4, R6) pilot lansmanı öncesinde çözülmesi şiddetle tavsiye edilir.

---

*Bu rapor, kod tabanının statik analizi ve veritabanı incelemesi temel alınarak hazırlanmıştır. Canlı ortam penetrasyon testi ve yük testi ayrıca yapılmalıdır.*
