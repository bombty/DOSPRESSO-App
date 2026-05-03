# DOSPRESSO Kiosk Sistemi — IT Güvenlik Audit Raporu

**Tarih:** 16 Mart 2026  
**Hazırlayan:** DOSPRESSO Teknik Ekip  
**Kapsam:** Kiosk Güvenlik Mimarisi, Kimlik Doğrulama, Erişim Kontrolü  
**Durum:** Sprint 30 — Tamamlandı

---

## 1. YÖNETİCİ ÖZETİ

DOSPRESSO kiosk sistemi, şube ve fabrika ortamlarında çalışan personelin vardiya başlatma, üretim kaydı ve mola takibi yapmasına olanak sağlayan paylaşımlı terminal uygulamasıdır. Bu rapor, Sprint 27-30 arasında yapılan güvenlik iyileştirmelerini ve mevcut güvenlik durumunu detaylandırmaktadır.

### Kritik Bulgular
| # | Konu | Önceki Durum | Mevcut Durum | Risk |
|---|------|-------------|-------------|------|
| 1 | Kiosk şifreleri düz metin | Tüm şubelerde düz metin "0000" | bcrypt hash (salt=10) | ÇÖZÜLDÜ |
| 2 | Kiosk erişim modeli | Web session auth gerektiriyordu | Public route + cihaz şifresi + PIN | ÇÖZÜLDÜ |
| 3 | Brute-force koruması | Yoktu | PIN: 3 deneme/15dk kilitlenme | ÇÖZÜLDÜ |
| 4 | Fabrika kiosk yetkilendirme | Tüm roller erişebiliyordu | Admin-only kısayol butonu | ÇÖZÜLDÜ |
| 5 | Varsayılan cihaz şifresi | "0000" (düz metin) | "0000" (hash'lenmiş) — değiştirilmeli | UYARI |

---

## 2. KİOSK MİMARİSİ

### 2.1 Genel Yapı

Kiosk sistemi üç katmanlı bir güvenlik modeli kullanır:

```
┌─────────────────────────────────────────────────┐
│               KATMAN 1: Fiziksel Erişim         │
│  Kiosk cihazı fiziksel olarak şubede/fabrikada  │
│  Sadece o lokasyondaki personel erişebilir      │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│            KATMAN 2: Cihaz Şifresi              │
│  Kiosk'a giriş için şube/fabrika bazlı şifre   │
│  bcrypt hash ile saklanır                       │
│  Endpoint: /api/branches/:id/kiosk/verify-pass  │
│  Endpoint: /api/factory/kiosk/device-auth       │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│             KATMAN 3: Personel PIN              │
│  Her çalışanın bireysel 4-6 haneli PIN kodu     │
│  bcrypt hash ile saklanır                       │
│  3 başarısız deneme → 15 dakika kilitlenme      │
│  Endpoint: /api/branches/:id/kiosk/login        │
│  Endpoint: /api/factory/kiosk/login             │
└─────────────────────────────────────────────────┘
```

### 2.2 Kiosk Türleri

| Kiosk Türü | URL | Cihaz Auth Endpoint | Kullanım |
|-----------|-----|---------------------|----------|
| Fabrika Kiosk | `/fabrika/kiosk` | `POST /api/factory/kiosk/device-auth` | Üretim, vardiya, mola, arıza |
| Şube Kiosk | `/sube/kiosk/:branchId` | `POST /api/branches/:id/kiosk/verify-password` | PDKS, vardiya, mola |
| HQ Kiosk | `/hq/kiosk` | `POST /api/factory/kiosk/device-auth` | Merkez ofis PDKS |

---

## 3. KİMLİK DOĞRULAMA SİSTEMİ

### 3.1 Web Auth vs Kiosk Auth Karşılaştırması

| Özellik | Web Kimlik Doğrulama | Kiosk Kimlik Doğrulama |
|---------|---------------------|----------------------|
| Kimlik | Bireysel kullanıcı (`req.user`) | Şube/İstasyon bazlı (`branchAuth` / `kioskUserId`) |
| Tanımlayıcı | Kullanıcı adı + şifre | Cihaz şifresi + Personel PIN |
| Token Türü | `connect.sid` çerezi (Cookie) | `x-kiosk-token` başlığı (Header) |
| Yetki Kapsamı | Kullanıcı rolüne göre | İstasyon/şube bağlamına göre |
| Oturum Süresi | 8 saat | 8 saat (vardiya süresi) |
| Oturum Depolama | PostgreSQL `sessions` tablosu | In-memory `Map` (kioskSessions) |
| Hedef Kullanım | Yönetim / HQ / Bireysel uygulamalar | Paylaşımlı dükkan/fabrika terminalleri |

### 3.2 Cihaz Kimlik Doğrulama Akışı

**Şube Kiosk (`POST /api/branches/:branchId/kiosk/verify-password`)**
1. İstek gövdesinden `username` ve `password` alınır
2. `branch_kiosk_settings` tablosundan kayıtlı hash çekilir
3. Hash yoksa varsayılan `'0000'`'ın hash'i ile karşılaştırılır
4. `bcrypt.compare()` ile doğrulama yapılır
5. Düz metin şifre tespit edilirse istek reddedilir (güvenlik önlemi)
6. Başarılı → kiosk personel seçim ekranına geçiş

**Fabrika Kiosk (`POST /api/factory/kiosk/device-auth`)**
1. İstek gövdesinden `username` ve `password` alınır
2. `factory_kiosk_config` tablosundan `device_password` kaydı çekilir
3. `bcrypt.compare()` ile doğrulama yapılır
4. Başarılı → fabrika istasyon seçim ekranına geçiş

### 3.3 PIN Kimlik Doğrulama Akışı

**Şube PIN (`POST /api/branches/:branchId/kiosk/login`)**
1. Personel listeden seçilir veya PIN girilir
2. `branch_staff_pins` tablosundan `hashed_pin` çekilir
3. `bcrypt.compare()` ile doğrulama
4. Başarısız → `failedAttempts` sayacı artırılır
5. 3 başarısız deneme → `pinLockedUntil` 15 dakika ileriye ayarlanır
6. Kilitlenme durumunda admin'lere `pin_lockout` bildirimi gönderilir
7. Başarılı → kiosk oturumu (`x-kiosk-token`) oluşturulur (8 saat TTL)

**Fabrika PIN (`POST /api/factory/kiosk/login`)**
1. Aynı mantık, `factory_staff_pins` tablosu kullanılır
2. 3 deneme limiti, 15 dakika kilitlenme
3. Başarılı → kiosk oturumu oluşturulur

---

## 4. ŞİFRE DEPOLAMA VE HASH'LEME

### 4.1 Veritabanı Tabloları

| Tablo | Kolon | Tip | Açıklama |
|-------|-------|-----|----------|
| `branches` | `kiosk_username` | varchar(50) | Kiosk cihaz kullanıcı adı (şube adı) |
| `branches` | `kiosk_password` | varchar(100) | Kiosk cihaz şifresi (bcrypt hash) |
| `branch_kiosk_settings` | `kiosk_password` | varchar(255) | Şube kiosk ayar şifresi (bcrypt hash) |
| `factory_kiosk_config` | `value` (key='device_password') | text | Fabrika cihaz şifresi (bcrypt hash) |
| `branch_staff_pins` | `hashed_pin` | varchar(255) | Şube personel PIN (bcrypt hash) |
| `factory_staff_pins` | `hashed_pin` | varchar(255) | Fabrika personel PIN (bcrypt hash) |

### 4.2 Hash Migrasyonu (Sprint 28)

Sprint 28'de tüm kiosk şifreleri düz metinden bcrypt hash'e taşınmıştır:

- **Dosya:** `server/index.ts` → `migrateKioskPasswords()` fonksiyonu
- **Kapsam:** 19 şube + fabrika + tüm branch_kiosk_settings kayıtları
- **Algoritma:** bcrypt, salt round = 10
- **Tespit Mekanizması:** Hash'in `$2b$`, `$2a$`, `$2y$` ile başlayıp başlamadığı kontrol edilir
- **Çalışma Zamanı:** Sunucu her başlatıldığında otomatik kontrol eder
- **Güvenlik:** Düz metin şifre ile giriş yapılmaya çalışılırsa istek reddedilir

```
Migrasyon Akışı:
Sunucu başlar → migrateKioskPasswords() çalışır →
  ├─ branches tablosu: kiosk_password kontrolü → hash'lenmemişse hash'le
  ├─ branch_kiosk_settings: kiosk_password kontrolü → hash'lenmemişse hash'le
  └─ factory_kiosk_config: device_password kontrolü → hash'lenmemişse hash'le
```

---

## 5. ERİŞİM KONTROLÜ VE YETKİLENDİRME

### 5.1 Kiosk Route Erişim Modeli

| Route | Erişim Türü | Koruma | Açıklama |
|-------|-------------|--------|----------|
| `/fabrika/kiosk` | PUBLIC | Cihaz şifresi + PIN | Fiziksel erişim + 2 katmanlı auth |
| `/sube/kiosk/:id` | PUBLIC | Cihaz şifresi + PIN | Fiziksel erişim + 2 katmanlı auth |
| `/hq/kiosk` | PUBLIC | Cihaz şifresi + PIN | Fiziksel erişim + 2 katmanlı auth |

**Gerekçe:** Kiosk cihazları genellikle standart web oturumu olmadan çalışan paylaşımlı terminallerdir. Giriş yapmadan kiosk URL'sine erişen kullanıcı, yalnızca cihaz şifresi giriş ekranını görür. Cihaz şifresi + PIN bilmeden hiçbir işlem yapamaz.

### 5.2 Dashboard Kiosk Buton Görünürlüğü

Dashboard'lardaki "Kiosk Aç" kısayol butonları rol bazlı gizlenir:

| Dashboard | Görünür Roller | Gizli Roller |
|-----------|---------------|-------------|
| Fabrika Dashboard | `admin` | Diğer tüm roller |
| Şube Dashboard | `admin`, `mudur`, `supervisor` | `barista`, `stajyer`, `bar_buddy`, diğerleri |

### 5.3 RBAC Sistemi (Genel Platform)

Platform genelinde 26 rol tanımlı, modül bazlı yetkilendirme:

- **Yetki Kapsamları:** `self` (kendi verisi), `branch` (şube verisi), `global` (tüm veri)
- **Backend Kontrolü:** `hasPermission(user, module, action)` fonksiyonu
- **Frontend Kontrolü:** `useDynamicPermissions` hook + `canSeeNavItem` helper
- **Rol Grupları:** `isHQRole()`, `isBranchRole()`, `isFactoryFloorRole()` helper fonksiyonları

---

## 6. BRUTE-FORCE KORUMASI

### 6.1 Web Login Koruması

| Parametre | Değer |
|-----------|-------|
| Maksimum deneme | 10 deneme |
| Zaman penceresi | 15 dakika |
| Kilitlenme süresi | 15 dakika |
| Rate limit | `authLimiter` (express-rate-limit) |
| Admin bildirimi | Kilitlenme olduğunda tüm admin'lere bildirim |
| Depolama | In-memory `Map` (`loginAttempts`) |

### 6.2 Kiosk PIN Koruması

| Parametre | Değer |
|-----------|-------|
| Maksimum deneme | 3 deneme |
| Kilitlenme süresi | 15 dakika |
| Kilitlenme alanı | `pinLockedUntil` (veritabanı) |
| Admin bildirimi | `pin_lockout` güvenlik bildirimi |
| IP bazlı limit | `checkKioskRateLimit` — 5 deneme / 30 dk blok |

### 6.3 Kiosk Cihaz Şifresi Koruması

| Parametre | Değer |
|-----------|-------|
| IP bazlı rate limit | `kioskLoginAttempts` — 5 deneme / 30 dk blok |
| Düz metin reddi | Hash'lenmemiş şifre tespit edilirse 500 hatası |

---

## 7. OTURUM YÖNETİMİ

### 7.1 Web Oturumları

| Parametre | Değer |
|-----------|-------|
| Oturum deposu | PostgreSQL (`sessions` tablosu, connect-pg-simple) |
| TTL | 8 saat |
| Cookie güvenliği | `httpOnly: true`, `secure: true` (production), `sameSite: lax` |
| Eşzamanlı oturum limiti | Kullanıcı başına max 2 oturum |
| Limit aşımı | En eski oturum silinir, güvenlik audit kaydı oluşturulur |

### 7.2 Kiosk Oturumları

| Parametre | Değer |
|-----------|-------|
| Oturum deposu | In-memory `Map` (`kioskSessions`) |
| TTL | 8 saat (vardiya süresi) |
| Token türü | UUID v4 (`x-kiosk-token` header) |
| Doğrulama | `validateKioskSession()` — token + süre kontrolü |

---

## 8. SPRINT 27-30 DEĞİŞİKLİK KAYDI

### Sprint 27: KioskGuard Admin-Only Kısıtlama
- Fabrika/HQ kiosk erişimi sadece `admin` rolüne sınırlandırıldı
- Şube kiosk erişimi `admin`, `mudur`, `supervisor` rollerine sınırlandırıldı
- "Kiosk Aç" butonları yetkisiz rollerden gizlendi
- **Sorun:** Kiosk route'ları public path'lerden çıkarıldı

### Sprint 28: Kiosk Şifre Hash'leme
- 19 şubenin tümünde düz metin şifreler bcrypt hash'e dönüştürüldü
- Fabrika kiosk cihaz şifresi hash'lendi
- `branch_kiosk_settings` kolon genişliği varchar(255)'e güncellendi
- Otomatik migrasyon fonksiyonu eklendi (sunucu başlangıcında çalışır)

### Sprint 29: İlave Güvenlik Düzeltmeleri
- KioskGuard'a `isLoading` kontrolü eklendi (race condition düzeltmesi)
- Barista/stajyer/bar_buddy rollerinden "Kiosk Aç" butonu gizlendi
- Dashboard'da ModuleCard kiosk erişimi admin-only yapıldı

### Sprint 30: Kiosk Erişim Modeli Düzeltmesi
- **Kök Neden Analizi:** Sprint 27'de kiosk route'ları `PUBLIC_PATH_PREFIXES`'ten çıkarılmıştı
- Bu durum, giriş yapmamış kullanıcıların kiosk sayfasına erişememesine neden oldu
- `AuthCatchAllToLogin` (catch-all redirect) kiosk route'larını `/login`'e yönlendiriyordu
- KioskGuard render edilmeden önce redirect gerçekleşiyordu
- **Çözüm:** 
  - `/fabrika/kiosk`, `/hq/kiosk`, `/sube/kiosk` public path'lere eklendi
  - KioskGuard pass-through yapıldı (güvenlik cihaz auth + PIN'de)
  - Dashboard kısayol butonları hâlâ rol bazlı gizli

---

## 9. GÜVENLİK DEĞERLENDİRMESİ

### 9.1 Güçlü Yanlar

| Alan | Detay | Durum |
|------|-------|-------|
| Şifre depolama | bcrypt hash, salt=10 | UYGUN |
| PIN koruması | 3 deneme limiti, 15 dk kilitlenme | UYGUN |
| Admin bildirimi | Kilitlenme durumunda otomatik bildirim | UYGUN |
| Düz metin reddi | Hash'lenmemiş şifre ile giriş reddedilir | UYGUN |
| Otomatik migrasyon | Her sunucu başlangıcında hash kontrolü | UYGUN |
| Rate limiting | IP bazlı + kullanıcı bazlı çift katmanlı | UYGUN |
| Oturum güvenliği | httpOnly, secure, sameSite çerez politikası | UYGUN |
| Eşzamanlı oturum limiti | Max 2 oturum, aşımda eski silme | UYGUN |

### 9.2 Dikkat Edilmesi Gereken Konular

| # | Konu | Risk | Öneri |
|---|------|------|-------|
| 1 | Varsayılan cihaz şifresi "0000" | ORTA | Her şubeye benzersiz güçlü şifre atanmalı |
| 2 | Kiosk oturumları in-memory | DÜŞÜK | Sunucu yeniden başladığında oturumlar kaybolur; üretim için Redis/DB'ye taşınabilir |
| 3 | Kiosk URL'leri herkese açık | DÜŞÜK | Cihaz şifresi + PIN 2. katman koruma sağlar; IP kısıtlaması eklenebilir |
| 4 | Brute-force sayacı in-memory | DÜŞÜK | Sunucu yeniden başlama sonrası sıfırlanır; DB'ye taşınabilir |
| 5 | PIN uzunluğu kısıtlaması yok | DÜŞÜK | Minimum 4 haneli PIN zorunluluğu eklenebilir |

### 9.3 Öneriler

1. **[ÖNCELİK YÜKSEK]** Tüm şubelerin cihaz şifrelerini "0000"den benzersiz güçlü şifrelere değiştirin
2. **[ÖNCELİK ORTA]** Kiosk erişimini belirli IP aralıklarına sınırlandırma (opsiyonel)
3. **[ÖNCELİK ORTA]** Kiosk oturum deposunu in-memory'den PostgreSQL'e taşıma
4. **[ÖNCELİK DÜŞÜK]** Brute-force sayaçlarını veritabanına taşıma
5. **[ÖNCELİK DÜŞÜK]** Kiosk giriş/çıkış aktivitelerini audit log'a kaydetme

---

## 10. DOSYA REFERANSLARİ

| Dosya | İçerik |
|-------|--------|
| `client/src/App.tsx` | PUBLIC_PATH_PREFIXES, KioskGuard, Route tanımları |
| `server/localAuth.ts` | Login, session, brute-force, kiosk middleware |
| `server/routes/branches.ts` | Şube kiosk verify-password, PIN login, shift ops |
| `server/routes/factory.ts` | Fabrika kiosk device-auth, PIN login, üretim ops |
| `server/index.ts` | `migrateKioskPasswords()` — hash migrasyon fonksiyonu |
| `shared/schema.ts` | Tablo tanımları: branches, branch_kiosk_settings, staff_pins |
| `client/src/pages/fabrika/kiosk.tsx` | Fabrika kiosk frontend |
| `client/src/pages/sube/kiosk.tsx` | Şube kiosk frontend |
| `client/src/pages/fabrika/dashboard.tsx` | Fabrika dashboard kiosk buton görünürlüğü |
| `client/src/pages/sube/dashboard.tsx` | Şube dashboard kiosk buton görünürlüğü |

---

## 11. SONUÇ

DOSPRESSO kiosk sistemi, Sprint 27-30 boyunca önemli güvenlik iyileştirmelerinden geçmiştir:

1. **Şifre güvenliği** düz metinden bcrypt hash'e yükseltilmiştir
2. **Brute-force koruması** PIN girişleri için 3-deneme/15-dk kilitlenme uygulanmıştır
3. **Erişim modeli** web auth bağımlılığından kiosk'a özel 2 katmanlı auth'a geçirilmiştir
4. **Rol bazlı görünürlük** dashboard kısayol butonlarında uygulanmıştır
5. **Rate limiting** IP ve kullanıcı bazlı çift katmanlı koruma eklenmiştir

Sistemin mevcut güvenlik durumu **kabul edilebilir** düzeydedir. Varsayılan "0000" şifresinin değiştirilmesi en öncelikli eylem olarak önerilmektedir.

---

*Bu rapor DOSPRESSO platformunun mevcut kod tabanı incelenerek hazırlanmıştır.*
