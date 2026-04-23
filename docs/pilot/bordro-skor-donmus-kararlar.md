# Pilot Bordro / Skor / Sistem Donmuş Kararları

**Tarih:** 21 Nisan 2026 (Güncelleme: 23 Nis 2026 — pilot 5 May'a ertelendi)
**Karar Mercii:** Aslan (CEO)
**Geçerlilik:** Pilot süresince (**5 May - 11 May 2026** + 1 hafta uzatma opsiyonu)

> Bu doküman pilot süresince **DEĞİŞMEYECEK** sistem ayarlarını listeler.

---

## ⚠️ Pilot Tarih Güncellemesi (23 Nis 2026)

**Orijinal plan:** 28 Nis 2026 Pazartesi 09:00
**Güncel plan:** **5 May 2026 Pazartesi 09:00** (+1 hafta)

**Gerekçe:**
- Sistemin tam çalıştığından emin olmak için ek 1 hafta tampon
- PIN dağıtımı (36 kullanıcı) sakin yapılacak
- GPS koordinatları pilot öncesi girilecek
- Sema alerjen verify tamamlanacak
- Mahmut SGK audit bitirilecek
- Yavuz vardiya planı iki hafta için hazırlayacak (5 May - 11 May)

**Öncelik:** Aceleye getirmek yerine **doğru başlatmak**.

---

## 8 Karar — Aslan Onayı 23 Nis 2026 ✅

### ✅ KARAR 1 — Bordro DataSource: Kiosk
- Pilot süresince bordro **sadece kiosk verisinden** hesaplanır
- PDKS Excel import devre dışı
- **Onay:** ✅ 23 Nis 2026

### ✅ KARAR 2 — Bordro DRY_RUN Modu (Mayıs Bordrosu)
- Mayıs 31 bordrosu **DRY_RUN modunda** çalışır
- SGK gerçek bildirimi YAPILMAZ
- Haziran'dan itibaren gerçek mod
- **Onay:** ✅ 23 Nis 2026

### ✅ KARAR 3 — Skor Sıfırlama 4 May Pazar 22:30
- `launch-reset.sql` çalıştırılır (monthly_snapshots korunur)
- Skor formülleri temiz başlar
- **Onay:** ✅ 23 Nis 2026

### ✅ KARAR 4 — Skor Banner Pilot İlk Hafta (5-11 May)
- "📊 Pilot ilk hafta — skorlar toplama dönemi. Gerçek değerlendirme 12 May'dan sonra."
- Demotivasyon önleme
- **Onay:** ✅ 23 Nis 2026

### ✅ KARAR 5 — Personel Rotasyon YASAK
- Pilot süresince lokasyonlar arası rotasyon YOK
- Yeni personel alımı YOK
- **Onay:** ✅ 23 Nis 2026

### ✅ KARAR 6 — Mola Eşiği 90 → 120 dk (Geçici)
- Pilot ilk hafta mola 120 dk alarm
- 12 May'dan sonra 90 dk'ya döner
- **Onay:** ✅ 23 Nis 2026

### ✅ KARAR 7 — Yeni Modül/Rol/Branch YASAK
- Pilot süresince sistem dondurulur
- Sadece acil bug fix (3 taraflı onay)
- **Onay:** ✅ 23 Nis 2026

### ✅ KARAR 8 — GPS Manuel Bypass + Audit
- GPS başarısızsa supervisor PIN ile onay
- S-GPS Sprint 3 ile kod hazır
- Max %5 manuel bypass alarmı
- **Onay:** ✅ 23 Nis 2026

---

## Karar Özet Tablosu

| # | Karar | Etki | Onay |
|---|-------|------|------|
| 1 | Bordro DataSource: kiosk | Tek otorite | ✅ |
| 2 | Bordro DRY_RUN | SGK koruma | ✅ |
| 3 | Skor reset 4 May Pazar 22:30 | Temiz başlangıç | ✅ |
| 4 | Skor banner ilk hafta | Demotivasyon önleme | ✅ |
| 5 | Personel rotasyon YASAK | Sistem stabilite | ✅ |
| 6 | Mola eşiği 90 → 120 dk | Spam önleme | ✅ |
| 7 | Yeni modül/rol/branch YASAK | Kararlılık | ✅ |
| 8 | GPS manuel bypass + audit | Blocker önleme | ✅ |

**TÜM 8 KARAR ONAYLANDI — 23 Nisan 2026, Aslan.**

---

## Güncel Pilot Programı (5 May 2026)

| Tarih | Gün | İş | Sorumlu |
|---|---|---|---|
| 23-24 Nis | Perş-Cuma | PIN dağıtım (36 kullanıcı) | Aslan |
| 24 Nis | Cuma | Yavuz/Sema/Mahmut brifing | Aslan |
| 25-26 Nis | Ctesi-Pazar | Sema alerjen verify | Sema |
| 26 Nis | Ctesi | Mahmut SGK 2026 audit | Mahmut |
| 27-30 Nis | Pzt-Perş | GPS koordinatları + son testler | Aslan + Replit |
| 1 May | Cuma | **İlk smoke test (50/55 eşiği)** | Tüm ekip |
| 2-3 May | Ctesi-Pazar | Yavuz vardiya planı (5-11 May) | Yavuz |
| 3 May | Pazar | **İkinci smoke test + final check** | Tüm ekip |
| 4 May | Pzt 22:30 | Launch-reset çalıştır | Replit |
| 5 May | Pzt 08:00 | adminhq parola rotasyon | adminhq |
| **5 May** | **Pzt 09:00** | 🚀 **PİLOT GO-LIVE** | **Tüm ekip** |
| 11 May | Pzt | Pilot 1 hafta değerlendirme | Aslan + ekip |
| 12 May | Salı | Skor banner kalkar, 90dk mola döner | Sistem |

---

## Tarih Revizeleri (Not)

**Eski → Yeni:**
- 28 Nis GO-LIVE → **5 May GO-LIVE**
- 27 Nis Pazar 22:30 launch-reset → **4 May Pazar 22:30**
- 5 May normal mod → **12 May normal mod**
- 26 Nis smoke test → **1 May smoke test** (+ 3 May ikinci)

---

**Belge:** `docs/pilot/bordro-skor-donmus-kararlar.md`
**Sürüm:** v2.0
**Son güncelleme:** 23 Nis 2026 — Aslan onayıyla
