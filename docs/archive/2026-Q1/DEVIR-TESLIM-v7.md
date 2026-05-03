# DOSPRESSO — Devir Teslim v7
**Tarih:** 30 Mart 2026  
**Commit:** (build sonrası güncellenecek)  
**Branch:** main  

---

## Proje Özeti

| Metrik | Değer |
|--------|-------|
| Toplam commit | 48+ |
| Son sprint | Mega Sprint 1 (Blok A + B + yeni görevler) |
| Pilot hedef | 14 Nisan 2026 |
| Pilot şubeler | Fabrika, HQ, Işıklar, Lara |

---

## Bu Oturumda Tamamlanan (30 Mart 2026)

### Blok A — Kiosk UX v5 (Timeline Tasarım)
- **Yeni tasarım:** Kartlar kaldırıldı → Timeline satırları
- **Personel butonları:** Yeşil (aktif), Sarı (mola), Kırmızı (gecikmeli/yok), Mavi (sonraki vardiya), Gri (izinli)
- **Bölüm başlıkları:** Aktif & molada / Gecikmeli / Sonraki vardiya / İzinli bugün / Vardiya planlanmamış
- **Saat ekseni:** 08-22 arası tick çizgileri + saat etiketleri
- **Bar içi saatler:** Giriş saati + bitiş saati etiketleri
- **Geç tespit:** 15dk tolerans, 60dk+ = missing (backend `late/missing` status)
- **QR üstte**, duyurular + bildirimler altta
- **off/not_scheduled** ayrımı — hepsi görünür, gruplar ayrı
- **56px dokunmatik** buton boyutları (48px height)

### Blok B — Mesai Talebi Sistemi
- **Kiosk formu:** Vardiya bitti ekranında + çalışma ekranında
- **4 neden:** Gelmeyen Personel / Rush Time / Yönetici Talebi / Diğer
- **Yönetici talebi:** Seçilince yönetici adı alanı açılır
- **Backend:** `/api/overtime-requests` (zaten vardı, direkt bağlandı)
- **Supervisor dashboard:** Bekleyen mesai widget'ı (onay/red butonları)

### Bug Fixler
- **Login race condition:** `setStep('working')` önce, arka plan fetch sonra
- **Mola bitir fallback:** `sessionId` yoksa `userId` ile DB'den buluyor
- **PDKS anomali:** Kendi kullanıcıyı göstermiyor (`uid` ile filtre)
- **Session sync polling:** Working ekranında 5sn'de bir senkronize
- **Mola bandı:** Header'a sabit sarı bant → scroll gerektirmez

### Mega Sprint 1 — Yeni Görevler
- **`/api/overtime-summary`:** Şube bazlı bu ay mesai özeti endpoint'i
- **HQ Vardiya sayfası:** Mesai özet widget'ı (şube bazlı, bekleyen + onaylı + red)
- **`admin/sube-pin-yonetimi.tsx`:** Şube seç → personel listesi → 4 haneli PIN ata
- **admin-mega.tsx:** Şube PIN Yönetimi route eklendi (`sube-pin-yonetimi` grubu)

---

## Kritik Dosyalar

```
client/src/pages/sube/kiosk.tsx          — Şube kiosk (2100+ satır)
client/src/pages/sube-ozet.tsx           — Supervisor dashboard (mesai widget)
client/src/pages/hq-vardiya-goruntuleme.tsx — HQ vardiya + mesai özet
client/src/pages/admin/sube-pin-yonetimi.tsx — YENİ: Şube PIN yönetimi
client/src/pages/admin-mega.tsx          — Admin panel router
client/src/lib/queryClient.ts            — apiRequest (x-kiosk-token)
server/routes/branches.ts               — Kiosk endpoints (5000+ satır)
server/routes/misc.ts                   — overtimeRequests endpoints
```

---

## Mevcut Endpoint'ler (Kiosk)

| Endpoint | Auth | Açıklama |
|----------|------|----------|
| `POST /api/branches/:id/kiosk/login` | Public | PIN ile giriş |
| `GET /api/branches/:id/kiosk/lobby` | Public | Ana ekran verisi |
| `GET /api/branches/:id/kiosk/display-qr` | isKioskOrAuth | QR kod |
| `POST /api/branches/:id/kiosk/shift-start` | isKioskOrAuth | Vardiya başlat |
| `POST /api/branches/:id/kiosk/break-start` | isKioskOrAuth | Mola başlat |
| `POST /api/branches/:id/kiosk/break-end` | isKioskOrAuth | Mola bitir (sessionId veya userId) |
| `POST /api/branches/:id/kiosk/shift-end` | isKioskOrAuth | Vardiya bitir |
| `GET /api/branches/:id/kiosk/session/:userId` | isKioskOrAuth | Aktif session |
| `GET /api/branches/:id/kiosk/team-status` | isKioskOrAuth | Ekip durumu |
| `GET /api/branches/:id/kiosk/announcements` | isKioskOrAuth | Duyurular |
| `GET /api/branches/:id/kiosk/notifications/:userId` | isKioskOrAuth | Bildirimler |
| `POST /api/kiosk/phone-checkin` | isAuthenticated | Telefon QR |
| `POST /api/branches/:id/kiosk/set-pin` | isAuthenticated (admin/mudur) | PIN ata |
| `GET /api/overtime-summary` | isAuthenticated | HQ mesai özeti |

---

## Şube Kiosk Personel Durumları

| Status | Renk | Açıklama |
|--------|------|----------|
| `active` | Yeşil | Vardiyada, giriş yapmış |
| `on_break` | Sarı/Amber | Molada |
| `late` | Kırmızı | 15-60dk geç (vardiya başlamış, giriş yok) |
| `missing` | Koyu Kırmızı | 60dk+ geç (gelmedi sayılır) |
| `scheduled` | Mavi | Vardiyası var, henüz gelme saati olmamış |
| `off` | Gri (soluk) | Bugün izinli |
| `not_scheduled` | Gri (çok soluk) | Bugün vardiya planlanmamış |

---

## Kalan Görevler

### Pilot için Zorunlu (14 Nisan)
- [ ] **Mola bitir son test** — Replit'te Basri Şen ile test et
- [ ] **Pilot personel PIN tanımla** — Admin paneli `Şube PIN Yönetimi`'nden
- [ ] **Vardiya şablonları** — 4 pilot şube için (Işıklar, Lara, Fabrika, HQ)
- [ ] **Fabrika E2E test** — kiosk → üretim → QC → plan akışı
- [ ] **Şube E2E test** — kiosk → giriş → görev → çıkış

### Pilot Sonrası (Sprint 3)
- [ ] Manifest auth genişletme (111 → 500+ endpoint)
- [ ] ~200 toFixed crash fix (toplu script)
- [ ] 205 array safety ihlali
- [ ] CRM 19 endpoint auth eksik
- [ ] Rate limiting kiosk PIN brute force
- [ ] Mr. Dobody otonom aksiyonlar

---

## Sonraki Oturum Başlatma Şifresi

> "DOSPRESSO Mega Sprint 2 — E2E Test. Son commit: (güncel). Pilot personel PIN'leri tanımlandı mı? Vardiya şablonları girildi mi? Evet ise: Fabrika kiosk E2E test yap. Değilse: önce admin `Şube PIN Yönetimi`'nden PIN tanımla, sonra test."

---

## Mimari Notlar

- `branchShiftSessions.status`: active / on_break / completed / abandoned
- `scheduledOffs.offDate`: tek sütun (startDate/endDate yok), `branchId` nullable
- `isKioskOrAuthenticated`: hem kiosk token hem web session kabul eder
- QR akışı: kiosk tablet → QR gösterir → personel telefon okuttur → `POST /api/kiosk/phone-checkin` → kiosk 5sn polling ile yakalar
- Mesai talebi: kiosk form → `/api/overtime-requests` → supervisor `sube-ozet`'te onaylar → HQ `hq-vardiya-goruntuleme`'de özetlenir
- **Login race fix:** `setStep('working')` önce, arka plan veri fetch'i `data.user.id` ile (selectedUser race yok)
- **Break-end fallback:** `sessionId || userId` — birisi null olsa bile çalışır
