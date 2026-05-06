# 🎯 PILOT DAY-1 CHECKLIST (18 May 2026 Pazartesi)

> **Sprint 11 P-16:** Pilot ilk günün her lokasyonda hatasız geçmesi için adım-adım prosedür.
>
> **Pilot Saat:** 18 May Pazartesi **10:00**
>
> **Lokasyonlar:** Işıklar #5 (HQ-owned), Lara #8 (franchise), Merkez HQ #23, Fabrika #24

**Hazırlayan:** Claude
**Tarih:** 6 May 2026
**Versiyon:** v1.0 (Cuma dry-run sonrası revize edilecek)

---

## 🌅 PRE-DAY-1 (16-17 May Hafta Sonu)

### 16 May Cumartesi (T-2)
- [ ] **Aslan:** Tüm 4 lokasyon birim başkanlarına SMS — "Pazartesi 10:00 sistem canlı, hazır olun"
- [ ] **Aslan:** Andre/Eren/Sema/Mahmut/Yavuz'a son hatırlatma
- [ ] **Claude:** PAYROLL_DRY_RUN=true confirm + audit_logs son 7 gün scan (anomali var mı?)
- [ ] **Replit:** pg_dump full backup (`backups/pre-pilot-day1-2026-05-17.sql`)
- [ ] **Replit:** Workflow restart, 1 saat smoke test

### 17 May Pazar (T-1)
- [ ] **Aslan:** Saat 18:00 Pilot stand-by call (Andre + Eren + Sema + Mahmut + Yavuz dahil) — 30 dk
- [ ] **Claude:** `/api/health` endpoint kontrol — hepsi 200 OK
- [ ] **Claude:** Mr. Dobody scheduler kontrol — son 24 saat çalıştı mı?
- [ ] **Aslan:** Pazar 22:00 — son sistem kontrolü, son durum raporu

---

## 🌅 DAY-1 SABAH (18 May Pazartesi 06:00-10:00)

### 06:00 — Sistem Hazırlık (Claude + Replit)
- [ ] Workflow restart
- [ ] DB connection healthy
- [ ] Last 1 hour log → 0 ERROR
- [ ] PAYROLL_DRY_RUN=true confirm (env var)
- [ ] Pre-commit hook aktif (`git config core.hooksPath` = `scripts/git-hooks`)

### 07:00 — Aslan Mobile (iPad) Kontrol
- [ ] Login: `aslan@dospresso.com.tr` (CEO rolü)
- [ ] `/dashboard` → 4 lokasyon kart görünüyor mu?
- [ ] `/ik-merkezi` → açılıyor mu, Mahmut göreceği gibi?
- [ ] `/dobody-merkezi` → 3-mode (auto/action/info) kart aktif mi?

### 08:00 — Manuel Smoke Test (Aslan)
- [ ] Login → Logout → Login (session OK)
- [ ] Bir bordro görüntüle (`/ik/bordro` test bordro)
- [ ] Bir izin talebi görüntüle (`/ik/izin-talep`)
- [ ] Kiosk QR'ları yazdırılmış mı?

### 09:00 — Lokasyon Birim Başkanlarına SMS
**Aslan'dan:**
> "Günaydın. Saat 10:00'da sistem canlıya geçti. İlk check-in'leri kiosk üzerinden yapın. Sorun varsa derhal beni arayın. Başarılı bir gün olsun."

---

## 🏪 IŞIKLAR #5 (HQ-OWNED ŞUBE)

### Sorumlu: Şube Müdürü + Aslan (HQ destek)

### 09:30 — Açılış Hazırlık
- [ ] Kiosk tableti güç açık, internet bağlı
- [ ] `/kiosk/branch/5` URL açık
- [ ] Müdür login: `kiosk-isiklar@dospresso.com.tr` veya QR ile
- [ ] Bugünün shift listesi görünüyor (5-6 personel)

### 10:00 — Pilot Day-1 Resmi Başlangıç
- [ ] **İLK CHECK-IN:** Müdür kiosktan check-in yapar (PIN ile)
- [ ] Sonuç: shift_attendance kaydı oluşmalı + dashboard'da görünmeli
- [ ] Müdür Aslan'a WhatsApp: "Işıklar açıldı, ilk giriş başarılı ✅"

### 10:00-12:00 — Personel Check-in
- [ ] Tüm personel sırayla kiosktan check-in
- [ ] Geç kalan varsa late=true işareti otomatik
- [ ] Müdür kiosk monitör ekranından kim girdi/girmedi takibi

### 12:00-13:00 — Mola Senaryosu
- [ ] Personel mola verir (kiosktan "Mola" butonu)
- [ ] 5 dk sonra anomali notify çalışmamalı (90 dk eşik)
- [ ] Personel döner, mola bitti

### 13:00-17:00 — Operasyon
- [ ] Mola bitiş kayıtları
- [ ] Çıkış/giriş normal
- [ ] Müdür WhatsApp: 3 saatte bir durum raporu Aslan'a

### 17:00 — Çıkış + Bordro Önizleme
- [ ] Tüm personel çıkış check-in
- [ ] Müdür `/ik-merkezi` üzerinden günün özet bordrosunu görür
- [ ] **DRY-RUN MODU AKTİF:** Bordro hesaplanır, kaydedilir, ama SGK bildirimi YOK

### 18:00 — Day-1 Sonuç (Aslan + Müdür)
- [ ] WhatsApp: "Işıklar Day-1 sonuç: X personel, X check-in, X anomali"
- [ ] Sorun listesi (varsa)

---

## 🏪 LARA #8 (FRANCHISE — ANDRE)

### Sorumlu: Andre (yatırımcı + müdür çift role)

### 09:30 — Açılış Hazırlık
- [ ] Andre login: kendi yatırımcı/müdür hesabı
- [ ] Lara dashboard görünüyor mu?
- [ ] Personel listesi (Berkan + diğerleri) doğru mu?

### 10:00 — Pilot Resmi Başlangıç
- [ ] Andre WhatsApp: "Lara açıldı, ilk check-in başarılı ✅"
- [ ] Berkan ve diğer personel sırayla kiosk
- [ ] **Telefon-only akış:** Berkan iPhone'dan kiosk QR taradı mı?

### 10:00-13:00 — Operasyon (mobil odak)
- [ ] Mola, çıkış, geliş hareketleri
- [ ] Andre yatırımcı dashboard → satış live takip (varsa)
- [ ] Mr. Dobody bildirim göndermiş mi (anomali için)?

### 13:00-15:00 — Pause / Mola Saatleri
- [ ] Berkan kısa mola (5 dk) — kiosk'ta uyarı yok ✅
- [ ] 30 dk mola — kiosk'ta uyarı yok ✅
- [ ] 90 dk geçtiyse Mr. Dobody Andre'ye haber

### 15:00-17:00 — Akşam Vardiyası
- [ ] Vardiya değişimi (sabah → öğleden sonra)
- [ ] Yeni personel check-in

### 17:00-18:00 — Day-1 Bitiş
- [ ] Andre `/ik` → günün bordro özeti
- [ ] Sapma %5 üstünde mi? Excel ile karşılaştır
- [ ] WhatsApp Aslan'a rapor

---

## 🏢 MERKEZ HQ #23

### Sorumlu: Mahmut (HR/Bordro) + Aslan (CEO)

### 09:30 — HQ Kiosk Açılış
- [ ] Mahmut kiosktan check-in (HQ kiosk PIN bcrypt ile — Sprint 10 P-7 sonrası)
- [ ] Bugün için phone fallback değil, gerçek bcrypt PIN kullanılmalı
- [ ] Eğer fallback kullanıldıysa: audit_logs'a `kiosk.hq_pin_phone_fallback` kaydı düştü mü?

### 10:00 — HQ Personel Check-in
- [ ] Tüm HQ personeli (Aslan, Mahmut, Andre x2 [HQ + Lara], Yavuz, vs.) kiosktan check-in
- [ ] Mahmut yan ofiste, kiosk üzerinden değil — sıkıntı?

### 10:00-12:00 — Mahmut Bordro Workflow
- [ ] Mahmut Excel açar (mevcut bordro Excel'i)
- [ ] Sistem `/ik-merkezi/bordro-onay` açar
- [ ] **4 senaryoyu çapraz kontrol** (P-15 dokümanına bakın):
  - [ ] Stajyer NET 33.000 → Excel ile karşılaştır
  - [ ] Tam ay supervisor → Excel ile karşılaştır
  - [ ] PDKS eksik gün senaryo
  - [ ] FM + tatil senaryo

### 12:00 — KARAR Anı
- [ ] Sapma %5 altında ise → ✅ Pilot devam, Mahmut imzalar
- [ ] Sapma %5-10 ise → 🟡 Aslan + Mahmut + Claude çağrılır, debug
- [ ] Sapma %10+ ise → 🔴 PILOT DURDUR, Excel mode'a geri dön

### 13:00-17:00 — Mahmut Sistem Tek Başına
- [ ] Mahmut kendi başına 2 saat sistem kullanır
- [ ] İzin onayı, mesai onayı, bordro onayı (DRY-RUN mode)
- [ ] Kafası karışan yer var mı? Aslan'a not düşer

### 17:00-18:00 — HQ Day-1 Sonuç
- [ ] Mahmut + Aslan değerlendirme
- [ ] WhatsApp: "HQ Day-1 sonuç: bordro %X uyum, X anomali, X öneri"

---

## 🏭 FABRIKA #24 (EREN)

### Sorumlu: Eren (Fabrika Müdürü)

### 09:30 — Tablet Workflow Hazırlık
- [ ] Fabrika tableti güç açık (Eren'in iPad'i)
- [ ] `/kiosk/factory/24` veya benzeri açık
- [ ] Eren login: `eren@dospresso.com.tr` (factory rolü)
- [ ] Bugünün üretim batch'leri görünüyor mu?

### 10:00 — Fabrika Açılış
- [ ] Eren check-in
- [ ] Üretim ekibi check-in (5-7 personel)
- [ ] Recipe LOCK'lar aktif (factory_recipes — branch personeli erişemez)

### 10:00-13:00 — Üretim Batch
- [ ] İlk batch (örn. donut hamuru) başlat
- [ ] Recipe ekrandan görün (Sema'nın onayladığı)
- [ ] Batch tamamlanma → maliyet hesabı doğru mu?
- [ ] Allergen scan — 14 allerjen çıkıyor mu?

### 13:00-17:00 — İkinci Vardiya
- [ ] Vardiya değişimi
- [ ] Yeni batch
- [ ] Eren tablet workflow rahat mı? UI yeterli mi?

### 17:00-18:00 — Fabrika Sonuç
- [ ] Eren WhatsApp: "Fabrika Day-1 sonuç: X batch, X kg üretim, X anomali"

---

## ⚠️ ACİL DURUM PROSEDÜRÜ

### 🔴 KRITIK — Pilot Hemen Durdur
- Bordro hesabı %10+ sapma → tüm lokasyonlar Excel mode'a dön
- DB connection 5 dk+ kesintisi → Claude + Replit acil müdahale
- Manifest-auth fail-closed yetkisiz erişim → log incele, hot fix
- Kullanıcı veri kaybı → backup'tan restore (16 May Cumartesi backup'ı)

### 🟡 ORTA — Hot Fix Gerek
- Tek lokasyon UI sorunu → diğerleri etkilenmeden fix push
- Mr. Dobody yanlış notification → scheduler durdurma + fix
- Kiosk PIN fallback spike → bcrypt migration eksik kullanıcılar

### 🟢 DÜŞÜK — İzleme + Sonraki Sprint
- Performance yavaşlık (response 2 sn+) → Sprint G index audit
- UI kafa karıştırıcı → kullanıcı geri bildirimi topla, Sprint 12

---

## 📞 ACİL İLETİŞİM

| Sorumlu | Rol | İletişim | Not |
|---|---|---|---|
| Aslan | CEO, karar verici | WhatsApp + Telefon | Pilot Day-1'in patronu |
| Mahmut | Bordro/HR | WhatsApp | Bordro sapma sorularında |
| Andre | Lara müdür | WhatsApp + Telefon | Lara için ana iletişim |
| Eren | Fabrika | WhatsApp | Fabrika için |
| Sema | Reçete GM | WhatsApp | Reçete sorunlarında |
| Yavuz | Coach | WhatsApp | 19 şube genel |
| Claude | Architecture | claude.ai çat | Code/system sorunları |
| Replit Agent | DB/build | Replit IDE | DB/migration sorunları |

---

## 📊 Day-1 Sonuç Raporu Şablonu (18 May 18:00)

```
📊 PILOT DAY-1 SONUÇ — 18 May 2026

LOKASYON SAYIMI:
- Işıklar #5: ✅ / ⚠️ / 🔴 (X personel, X check-in)
- Lara #8: ✅ / ⚠️ / 🔴 (X personel, X check-in)  
- HQ #23: ✅ / ⚠️ / 🔴 (X personel, X check-in)
- Fabrika #24: ✅ / ⚠️ / 🔴 (X batch, X kg)

KRITIK BULGULAR:
1. _____
2. _____
3. _____

BORDRO SAPMA (Mahmut + Excel):
- Senaryo 1 (Stajyer): %X
- Senaryo 2 (Supervisor): %X
- Senaryo 3 (PDKS eksik): %X
- Senaryo 4 (FM + tatil): %X
- ORTALAMA: %X

KARAR (Aslan):
[ ] Day-2 devam (✅ %5 altı sapma, 0 kritik bulgu)
[ ] Day-2 devam ama hot fix gerek (🟡 1-2 sapma, Claude/Replit gece çalışır)
[ ] PILOT DURDUR (🔴 %10+ sapma veya kritik bulgu)

ÖNCELIK SIRASI YARIN:
1. _____
2. _____
3. _____
```

---

## 🔗 İlgili Dosyalar

- `docs/SPRINT-11-P15-BORDRO-SENARYOLARI.md` (4 senaryo detay)
- `docs/PENDING.md` (genel sprint planı)
- `docs/DECIDED.md` D-42 (pilot 18 May kararı)
- `docs/PAYROLL-NET-BRUT-REVISION-PLAN-2026-05-06.md`

---

**Hazırlayan:** Claude
**Tarih:** 6 May 2026, 19:30
**Versiyon:** v1.0 (Cuma dry-run sonrası revize edilecek)
