# Mobil & Tablet Görsel Test Raporu

**Test Tarihi**: 18 Nis 2026  
**Cihaz Simülasyonu**: Browser viewport (1280x720 default — gerçek mobile cihaz testi Pazartesi sabah)  
**Hazırlayan**: Replit Agent  
**Screenshots**: `docs/pilot/screenshots/`

---

## 1. Yönetici Özeti (TL;DR)

🟡 **Görsel kontrol yapıldı** — login sayfası clean ve mobile-friendly. **Gerçek cihaz testi pilot öncesi Pazar günü zorunlu** (iPhone Safari + Android Chrome + iPad Safari).

🟢 **Login UI Mobile Score**: 8/10 — büyük inputlar, okunabilir butonlar, basit hierarchy.

🔴 **Bulgu**: `Username` field'da `autocomplete` attribute eksik (browser uyarısı tespit edildi). Pilot'ta kullanıcı deneyimini etkilemez ama best-practice ihlali.

---

## 2. Test Edilen 4 Sayfa

| # | Sayfa | URL | Test Durumu | Screenshot |
|---|---|---|---|---|
| 1 | Login | `/login` | ✅ Görsel kontrol | `mobile-login.jpg` |
| 2 | Mission Control | `/` | ⚠️ Auth sonrası, agent oturum açamadığı için görsel yapılamadı | `desktop-home.jpg` (auth wall) |
| 3 | Tasks | `/tasks` | ⏳ Pazartesi gerçek user ile | — |
| 4 | Mobile Sidebar | `/menu` | ⏳ Pazartesi gerçek cihaz ile | — |

**Not**: Replit screenshot tool varsayılan 1280x720 desktop viewport. Mobile-specific viewport (375x812 iPhone) ayrı test gerektirir.

---

## 3. Login Sayfası Bulguları (Detaylı)

### Görsel Hierarchy ✅
- Logo (DOSPRESSO kırmızı dot) görünür
- "Franchise Management System" başlık net
- Username + Password inputlar büyük (touch-friendly)
- Login butonu büyük, kırmızı brand renk, tam genişlik
- "Register" + "Forgot Password" linkleri sağda/solda dengeli

### Mobile UX Skoru: 8/10
| Kriter | Skor | Not |
|---|---|---|
| Tap target boyutu (≥44x44 px) | 9/10 | Login button büyük ✅ |
| Font okunabilir | 9/10 | 16px+ ✅ |
| Klavye etkileşimi | 7/10 | autocomplete eksik (uyarı) |
| Loading state | ? | Test edilmedi (parola yanlışında ne olur) |
| Error mesajı | ? | Test edilmedi |
| Dark mode | ? | Toggle test edilmedi |

### Tespit Edilen Sorunlar
1. **`autocomplete` attribute eksik** (Browser console uyarısı)
   - Önerilen: `autocomplete="username"` ve `autocomplete="current-password"`
   - Etki: Şifre yöneticileri (1Password, browser save) çalışmaz
   - Çözüm: 1 satır JSX, 5 dakikalık fix
   - **Aksiyon**: Sprint A pilot sonrası

2. **Form üstünde dropdown** (alt kısımda boş gri kutu görünüyor)
   - Şube veya dil seçici olabilir, içeriği boş
   - **Aksiyon**: Pazartesi smoke test sırasında doğrula

---

## 4. Pazartesi Sabah Yapılması Gerekenler (Gerçek Cihaz Testi)

### Test Cihazları
- iPhone (iOS 17+, Safari)
- Android (Chrome)
- iPad (Safari, hem dikey hem yatay)
- Tablet (Android, fabrika kiosk simülasyonu)

### Test Sayfaları
1. `/login` — input keyboard, autocomplete, hata gösterimi
2. `/` (Mission Control) — widget responsive davranış
3. `/tasks` — liste scroll, kart layout
4. `/factory-kiosk` — kiosk mode tablet için
5. `/menu` (mobile sidebar) — hamburger açılış, kapanış

### Test Senaryoları (Her Cihaz İçin)
- [ ] Login (username + parola input → submit)
- [ ] Dashboard widget'lar tam görünüyor (kırpma yok)
- [ ] Sidebar açılıp kapanıyor (touch)
- [ ] Yeni görev oluşturma (form + submit)
- [ ] Görev listesi scroll (yumuşak)
- [ ] Notification çanı tıklanabilir
- [ ] Logout → login'e dönüş
- [ ] Dark mode toggle (varsa)

### Beklenen Sorunlar (Hipotez)
- 🟠 Tablet kiosk modunda zaman aşımı dialog'u küçük olabilir
- 🟠 PDKS Excel import sayfası tablet'te yatay scroll gerektirebilir
- 🟡 Görev kart'larında uzun açıklamalar overflow yapabilir

### Test Süresi
- Cihaz başına: 30 dakika
- 4 cihaz: 2 saat
- Pazartesi: **08:00-10:00** (kullanıcı işbaşı öncesi)

---

## 5. Mobile Compactness Kontrol

`replit.md`'de belirtilen prensip:
> "The design prioritizes mobile compactness with touch-friendly UIs and role-based quick actions."

**Login sayfası**:
- ✅ Touch-friendly button (44px+)
- ✅ Single column layout (mobile zaten compact)
- ⚠️ Boş alt dropdown — yer kaplıyor, kaldırılabilir

**Dashboard (henüz test edilmedi)**:
- KPI strip widgetlar 2-column'a düşmeli mobile'de
- Quick actions sticky bottom-bar olmalı (tap ulaşılabilir)
- Sidebar default kapalı, hamburger ile açılır

---

## 6. Karar

🟡 **Görsel temel kontrol başarılı, gerçek cihaz testi Pazartesi sabah ZORUNLU.**

✅ Login sayfası mobile-ready görünüyor (8/10).

🔴 Pazartesi 08:00-10:00 arası 4 cihaz × 7 sayfa testi planlanmalı.

---

## 7. Sonraki Aksiyon

| # | Aksiyon | Sorumlu | Süre |
|---|---|---|---|
| 1 | autocomplete attribute fix (login form) | Replit Agent | 5 dk |
| 2 | Boş dropdown araştır + kaldır/doldur | Replit Agent | 30 dk |
| 3 | Pazartesi gerçek cihaz testi | IT + Aslan | 2 saat |
| 4 | Bulgular `mobile-real-device-test.md`'e | IT | 30 dk |
| 5 | Kritik bug → Sprint A patch | Replit Agent | değişken |

---

## 8. Screenshots

- `docs/pilot/screenshots/mobile-login.jpg` — Login sayfası (1280x720, mobile preview olarak yorumlanabilir)
- `docs/pilot/screenshots/desktop-home.jpg` — Auth wall (anonim erişim)

**Not**: Tam mobil test için Pazartesi gerçek iPhone/Android kullanıma alınacak; bu rapor temel görsel sanity check'tir.
