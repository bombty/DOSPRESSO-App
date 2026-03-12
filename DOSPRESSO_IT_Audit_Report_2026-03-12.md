# DOSPRESSO Franchise Management Platform
# IT Durum Audit Raporu
**Tarih:** 12 Mart 2026
**Hazırlayan:** Sistem Geliştirme Ekibi
**Versiyon:** Sprint 30C sonrası

---

## 1. GENEL BAKIS

| Metrik | Değer |
|--------|-------|
| Platform Durumu | **AKTIF - CALISIYOR** |
| Sunucu Portu | 5000 |
| Veritabanı Bağlantısı | Aktif (PostgreSQL/Neon Serverless) |
| Veritabanı Boyutu | **83 MB** |
| Toplam Tablo Sayısı | **353** |
| Toplam Index Sayısı | **1.216** |
| Sunucu Başlangıç Süresi | ~3.7 sn (seed) + 30 sn (lazy scheduler init) |
| Zamanlayıcı İş Sayısı | **24 job** (33'ten optimize edildi) |
| Son Sistem Sağlığı | **HEALTHY** |

---

## 2. KULLANICI ve ROL YAPISI

### 2.1 Genel Kullanıcı İstatistikleri

| Metrik | Değer |
|--------|-------|
| Toplam Kayıtlı Kullanıcı | 245 |
| Aktif Kullanıcı | **38** |
| Aktif Rol Çeşidi | **19** |
| Bağlı Şube Sayısı | **22** |

### 2.2 Role Göre Aktif Kullanıcı Dağılımı

| Rol | Aktif Kullanıcı |
|-----|----------------|
| barista | 7 |
| fabrika_operator | 5 |
| yatirimci_branch | 4 |
| stajyer | 4 |
| supervisor | 2 |
| ceo | 2 |
| admin | 2 |
| kalite_kontrol | 1 |
| satinalma | 1 |
| muhasebe_ik | 1 |
| trainer | 1 |
| coach | 1 |
| marketing | 1 |
| mudur | 1 |
| supervisor_buddy | 1 |
| cgo | 1 |
| gida_muhendisi | 1 |
| fabrika_mudur | 1 |
| bar_buddy | 1 |

### 2.3 Yetkilendirme Sistemi (RBAC)

| Bileşen | Değer |
|---------|-------|
| Tanımlı Sistem Rolleri | 21 |
| İzin Modülleri | 303 (123 kayıt defterinde) |
| Rol-Modül Kombinasyonu | 2.028 |
| Rol Şablonları | 17 |

---

## 3. VERITABANI DETAY

### 3.1 Ana Modül Tabloları ve Kayıt Sayıları

| Modül / Tablo | Kayıt Sayısı |
|---------------|-------------|
| Kullanıcılar (users) | 245 |
| Şubeler (branches) | 22 |
| Görevler (tasks) | 1.169 |
| Bildirimler (notifications) | 36.374 |
| Denetim Kayıtları (audit_logs) | 1.250 |
| Ekipman (equipment) | 153 |
| Tarifler (recipes) | 145 |
| Eğitim Modülleri (training_modules) | 51 |
| Kontrol Listeleri (checklists) | 13 |
| AI Agent Logları (ai_agent_logs) | 451 (12 farklı çalışma tipi) |
| Kariyer İlerleme (user_career_progress) | 8 |
| Webinarlar (webinars) | 3 |

### 3.2 Eğitim Modülü Kategori Dağılımı (Standardize Edilmiş)

| Kategori | Modül Sayısı |
|----------|-------------|
| barista_temelleri | 17 |
| yonetim | 12 |
| onboarding | 7 |
| genel_gelisim | 7 |
| hijyen_guvenlik | 5 |
| ekipman | 2 |
| musteri_iliskileri | 1 |
| **Toplam** | **51** |

### 3.3 Yeni Eklenen Tablolar (Sprint 30C)

| Tablo | Açıklama | Durum |
|-------|----------|-------|
| webinars | Canlı webinar yönetimi | Aktif, 3 seed kayıt |
| webinar_registrations | Webinar katılımcı kayıtları | Aktif, unique constraint mevcut |
| training_modules.is_mandatory | Zorunlu modül işaretleme | Kolon eklendi (boolean, default false) |
| training_modules.deadline_days | Tamamlama süresi (gün) | Kolon eklendi (integer, nullable) |

---

## 4. API YAPISI

### 4.1 Academy API Versiyonları

| API | Prefix | Durum | Açıklama |
|-----|--------|-------|----------|
| Academy V1 | /api/academy/* | Aktif | Temel eğitim yönetimi |
| Academy V2 | /api/v2/academy/* | Aktif | Gate sistemi, kariyer, içerik paketleri |
| Academy V3 | /api/v3/academy/* | **YENİ** | Home data, modüller, webinarlar |

### 4.2 Academy V3 Endpoint Listesi (Yeni)

| HTTP | Endpoint | Yetki | Açıklama |
|------|----------|-------|----------|
| GET | /api/v3/academy/home-data | Tüm giriş yapmış | Kariyer, zorunlu modüller, onboarding, ekip, webinarlar |
| GET | /api/v3/academy/modules | Tüm giriş yapmış | Filtrelenebilir modül listesi (kategori, zorunlu, arama) |
| GET | /api/v3/academy/webinars | Tüm giriş yapmış | Rol bazlı webinar listesi |
| POST | /api/v3/academy/webinars | HQ rolleri | Yeni webinar oluşturma |
| PATCH | /api/v3/academy/webinars/:id | HQ rolleri | Webinar güncelleme |
| POST | /api/v3/academy/webinars/:id/register | Tüm giriş yapmış | Webinara kayıt (rol + durum kontrolü) |
| DELETE | /api/v3/academy/webinars/:id/register | Tüm giriş yapmış | Webinar kaydını silme |

---

## 5. ZAMANLANMIS ISLER (SCHEDULER)

### 5.1 Scheduler Mimarisi

| Özellik | Detay |
|---------|-------|
| Yönetim Sınıfı | SchedulerManager (Map tabanlı, tekil iş takibi) |
| Toplam İş | **24** (önceki: 33 — %27 azaltma) |
| Gecikmeli Başlatma | 30 saniye (lazy init) |
| Graceful Shutdown | Tüm interval/timeout'lar SchedulerManager.stop() ile temizleniyor |

### 5.2 Konsolide Edilmiş Ana Tick'ler

| Tick | Periyot | İçerdiği İşler |
|------|---------|----------------|
| master-tick-10min | 10 dk | Hatırlatmalar, vardiya hatırlatma, onboarding, bildirim arşivleme, composite score (03:00), görev tetikleme (08:00) |
| tick-1hr | 1 saat | Stok uyarı, feedback SLA, tehlike bölgesi (ayın 1'i) |
| agent-hourly-tick | 1 saat | Eskalasyon, skill'ler, yönlendirme |

### 5.3 Diğer Zamanlayıcılar

| İş | Periyot |
|----|---------|
| SLA kontrol | 15 dk |
| Zamanlanmış görev teslimi | 5 dk |
| SKT son kullanma kontrolü | 6 saat |
| Fotoğraf temizleme | 6 saat |
| Teklif hatırlatma | 24 saat |
| Feedback pattern analizi | Haftalık (Pazartesi 08:00) |
| AI günlük analiz | Günlük (06:00 TR) |
| AI haftalık özet | Haftalık (Pazartesi 08:00 TR) |
| Skill zamanlayıcı - günlük | Günlük (07:00 TR) |
| Skill zamanlayıcı - haftalık | Haftalık (Pazartesi 09:00 TR) |
| Kuyruk kontrolü | 30 dk |
| İnaktif kullanıcı kontrolü | Günlük (02:00 TR) |
| Sonuç takibi | Günlük (08:00 TR) |
| Backup | Saatlik (RPO <= 1 saat) |
| AI log temizleme | Günlük (03:30 TR) |

---

## 6. GUVENLIK

### 6.1 Kimlik Doğrulama ve Oturum

| Özellik | Durum |
|---------|-------|
| Kimlik Doğrulama | Replit Auth (OpenID) + Yerel şifre (PIN/parola) |
| Oturum Yönetimi | Express session + secure cookie |
| Eşzamanlı Oturum Limiti | Maks. 2 |
| Otomatik Deaktivasyon | 60+ gün inaktif kullanıcılar |
| Rate Limiting | /api/login agresif limitleme (2 hızlı deneme = 15 dk kilit) |

### 6.2 API Güvenliği

| Özellik | Durum |
|---------|-------|
| CSP Headers | Aktif |
| CORS Whitelist | Aktif |
| Permissions-Policy | Aktif |
| Referrer-Policy | Aktif |
| Hata Yanıtları | Sanitize edilmiş (detay gizli) |
| Webinar Kayıt Kontrolü | Rol + durum validasyonu mevcut |

### 6.3 Veri Koruma (Sprint 27+)

| Özellik | Durum |
|---------|-------|
| Soft Delete | Tüm ana tablolarda deleted_at |
| Audit Logging | Alan düzeyinde değişiklik takibi (data_change_log) |
| Data Lock | 13 kilit kuralı, HTTP 423 yanıtı |
| Değişiklik Talebi | Kilitli kayıtlar için change request workflow |
| Revizyon Geçmişi | record_revisions tablosu |

---

## 7. SEED (BASLANGIC VERISI) PERFORMANSI

| Özellik | Detay |
|---------|-------|
| Seed Süresi | **~3.7 sn** |
| Paralelleştirme | Promise.allSettled ile eşzamanlı |
| İdempotent | Evet — tekrar çalışmada skip |

### 7.1 Seed Durumu (Son Başlatma)

| Seed | Durum | Detay |
|------|-------|-------|
| Roller | Skip | 21 rol mevcut, 0 yeni |
| Admin Menü | Skip | 13 bölüm, 60 öğe mevcut |
| Tarifler | Skip | 145 tarif, 10 kategori mevcut |
| Akademi Kategorileri | Skip | 8 kategori, 0 migrasyon |
| Servis Talepleri | Skip | 6 kayıt mevcut |
| İzin Modülleri | Skip | 123 modül değişmedi |
| Rol İzinleri | Skip | 2.028 kombinasyon korunuyor |
| Rol Şablonları | Insert | 17 şablon (onConflictDoNothing) |
| Denetim Şablonu | Skip | Varsayılan şablon mevcut |

---

## 8. AKTIF WEBINARLAR

| ID | Başlık | Tarih | Süre | Durum |
|----|--------|-------|------|-------|
| 1 | Yeni Ürün Tanıtımı: Berry Serisi | 15 Mart 2026 | 60 dk | Planlandı |
| 2 | KVKK Güncellemesi | 20 Mart 2026 | 45 dk | Planlandı |
| 3 | Q1 Değerlendirme | 28 Mart 2026 | 90 dk | Planlandı |

---

## 9. BILINEN SORUNLAR / DIKKAT EDLIECEK NOKTALAR

| # | Konu | Önem | Açıklama |
|---|------|------|----------|
| 1 | Bildirim hacmi yüksek | Orta | 36.374 bildirim — arşivleme/temizleme stratejisi gözden geçirilmeli |
| 2 | Feedback SLA ihlalleri | Orta | 3 devam eden SLA ihlali (Gaziantep İbrahimli, Antalya Lara, Işıklar) |
| 3 | Throttled bildirimler | Düşük | Bazı kullanıcılar günlük bildirim limitine (20) ulaşıyor |
| 4 | Zorunlu modül tanımlanmamış | Bilgi | is_mandatory henüz hiçbir modülde true olarak işaretlenmemiş |
| 5 | Onboarding ataması yok | Bilgi | employee_onboarding_assignments tablosu boş — 4 stajyer var |
| 6 | Role permissions grants boş | Bilgi | role_permissions tablosunda 0 kayıt (role_module_permissions kullanılıyor olabilir) |
| 7 | Port çakışması riski | Düşük | Sunucu kapatılırken port 5000 bazen meşgul kalabiliyor — 5 deneme retry mevcut |

---

## 10. TEKNOLOJI YIGINI OZET

### Frontend
- React 18 + TypeScript + Vite
- Shadcn/ui (Radix UI tabanlı)
- TanStack Query v5
- Wouter (routing)
- i18next (TR, EN, AR, DE)
- Tailwind CSS (dark mode destekli)

### Backend
- Node.js + Express.js + TypeScript
- Drizzle ORM (PostgreSQL)
- Replit Auth (OpenID) + Passport.js
- SchedulerManager (merkezi zamanlayıcı)

### Veritabanı
- PostgreSQL (Neon Serverless)
- pgvector (embedding desteği)
- 353 tablo, 1.216 index
- 83 MB boyut

### Dış Servisler
- OpenAI API (AI vision, chat, embedding)
- IONOS SMTP (e-posta bildirimleri)
- AWS S3 (dosya depolama)

---

## 11. SON SPRINT DEGISIKLIKLERI (Sprint 30C)

### Bug Fix'ler
1. **academy-my-path.tsx**: Boş durum mesajı düzeltildi — sadece seviye 5'te "Tebrikler" gösterilir, aksi halde "Kariyer yolunuz henüz başlatılmamış" mesajı ve MapPin ikonu
2. **academy-ai-panel.tsx**: AI öneri butonları deepLink varsa yönlendirme, yoksa detay dialogu açıyor

### Veritabanı Değişiklikleri
- training_modules tablosuna is_mandatory ve deadline_days kolonları eklendi
- Kategori standardizasyonu yapıldı (ekipman: 2, yonetim: 12 satır güncellendi)
- webinars ve webinar_registrations tabloları oluşturuldu
- 3 örnek webinar seed edildi

### Yeni API (Academy V3)
- 7 yeni endpoint (/api/v3/academy/*)
- Mevcut academy.ts ve academy-v2.ts dosyalarına dokunulmadı

### Scheduler Optimizasyonu (Task #3)
- SchedulerManager ile merkezi yönetim
- 33 job'dan 24'e konsolidasyon (%27 azalma)
- Seed parallelleştirme ve idempotent hale getirme
- 30 sn lazy init ile port çakışması riski azaltıldı

---

*Rapor sonu — 12 Mart 2026, 19:30 TR*
