# ⏳ PENDING — Bekleyen İşler (v6.0 — 11 May Gece)

> **PILOT 13 MAY 15:00 — 37 SAAT KALDI**

**Son güncelleme:** 11 May 2026, 02:45
**Pilot tarihi:** **13 Mayıs 2026 Çarşamba 15:00**

---

## 🎯 BUGÜNKÜ DURUM (11 May 02:30)

| İş | Durum | Sahip |
|----|-------|-------|
| 10-11 May Mega Maraton | ✅ Tamam (15+ commit) | Claude |
| Long-shift sistem | ✅ Kod hazır | Claude |
| Kümülatif mola fix | ✅ Push'lı | Claude |
| PIN reset sistem | ✅ Push'lı | Claude |
| Skill MD'ler (4 dosya) | ✅ Güncel (1746 satır) | Claude |
| Devir teslim v2 | ✅ Push'lı (1197 satır) | Claude |
| Long-shift migration | ⏳ ÇALIŞTIRILACAK | Replit/Aslan |
| PR mergele | ⏳ Bekliyor | Aslan |
| Mola kümülatif test | ⏳ Bekliyor | Aslan |
| PIN reset mail test | ⏳ Bekliyor | Aslan |

---

## 🔥 ŞU AN AKTİF (Pilot Hazırlık)

### PENDING-001: PR Mergele 🔴 ASLAN
**Süre:** 1 dk | **Sahip:** Aslan
- URL: https://github.com/bombty/DOSPRESSO-App/pulls
- Branch: `claude/kiosk-mega-improvements-2026-05-10`
- 15+ commit, 6500+ satır

### PENDING-002: Long-Shift Migration 🔴 REPLİT/ASLAN
**Süre:** 1 dk | **Sahip:** Replit Agent veya Aslan
```bash
psql "$DATABASE_URL" -1 -f migrations/2026-05-11-long-shift-auto-close.sql
```
- 3 yeni column: auto_closed, auto_closed_reason, auto_closed_at
- Bu olmadan tick-1hr scheduler crash eder

### PENDING-003: Mahmut Bordro 5 BRÜT 🔴 ASLAN
**Süre:** 30 dk telefon | **Deadline:** Pilot öncesi
- 5 pozisyon BRÜT figürleri
- `PAYROLL_DRY_RUN=false` set et

### PENDING-004: HQ PIN Setup 🟡 ASLAN
**Süre:** 5 dk | **Sahip:** Aslan
- eren + hqkiosk PIN tanımla (UI veya SQL)
- Manuel görev

### PENDING-005: WhatsApp Sema 🟡 SEMA
**Süre:** ~2 saat | **Deadline:** 12 May Salı
- 36 hammadde (HAM-1000-HAM-1035): fiyat + besin
- DOREO + Golden Latte aktivasyon
- 4 pilot reçete: Besin Hesapla + Gramaj Onayla

### PENDING-006: Fabrika 3 User Doğrulama 🟡 ASLAN
**Süre:** 5 dk | **Deadline:** 13 May sabah
- 3 unknown passive user

### PENDING-007: Test (4 Senaryo) 🔴 ASLAN
**Süre:** 15 dk | **Sahip:** Aslan

#### Test A: Mola Kümülatif (45+15)
1. Personel PIN gir → vardiya başlat → 5 dk mola → bitir
2. Toast: "(5 dk yapıldı, 55 dk hakkın kaldı)"
3. Tekrar mola → 55 dk başlat (60 değil!)

#### Test B: PIN Reset Mail
1. Bilerek 8 yanlış PIN gir → kilit
2. "PIN'imi Unuttum" tıkla → email gir → gönder
3. 1-2 dk sonra mail gelmeli

#### Test C: HQ Canlı Vardiya
1. /hq/canli-vardiya aç
2. 25 şube grid + 10sn auto refresh

#### Test D: KVKK Modal (v1.1)
1. Personel PIN gir
2. KVKK modal otomatik aç
3. Onayla → vardiya devam

---

## ⚠️ POST-PILOT (13 May Sonrası, Sprint 14+)

### TECH DEBT
- [ ] **~1500 sub-12px font** (proje geneli)
- [ ] **Dual payroll tables** cleanup (monthly_payroll vs monthly_payrolls)
- [ ] **account_status normalize** (active vs approved)
- [ ] **5 phantom fabrika roles** (zero users)
- [ ] **/ik route hatası** (önceki devirlerden)
- [ ] **Console.log temizlik** (~2887 yer, Sentry/Pino ile değiştir)

### KVKK & COMPLIANCE
- [ ] **VERBIS kaydı** (KVKK Kurulu gerekirse)
- [ ] **DPO atanması** (resmi)
- [ ] **Neon Frankfurt'a taşıma** (US-East yerine, opsiyonel)
- [ ] **Yıllık politika revizyon** (otomatik)

### YENİ ÖZELLIKLER
- [ ] **Aylık puantaj otomatik PDF** + Partner bildirim
- [ ] **Excel POS import** (franchise için)
- [ ] **WebSocket realtime** (polling yerine)
- [ ] **Mola süresi dinamik** (vardiya süresine göre m.68)
- [ ] **Partner dashboard** (kendi şubesi)

### MONITORING
- [ ] **Sentry entegrasyonu**
- [ ] **Pino logger**
- [ ] **Backup scheduler** (günlük otomatik)
- [ ] **Health check endpoint** (/health)

---

## 📊 İSTATİSTİKLER

- **Commit sayısı:** 15+ (10-11 May, son maraton)
- **Satır kod:** ~6500
- **Skill MD:** 4 dosya, 1746 satır
- **Doküman:** 142 markdown
- **TypeScript hata:** 0
- **Pre-existing issue:** ~1500 (post-pilot)

---

## 🆕 SON KARARLAR (Bu Maratondan)

1. **D-NEW-001:** Mola günlük kümülatif (parçalı destek)
2. **D-NEW-002:** PIN 5 → 8 deneme limit
3. **D-NEW-003:** 10 saat vardiya uyarı, 12 saat oto kapat
4. **D-NEW-004:** KVKK v1.1 yurtdışı aktarım beyanı
5. **D-NEW-005:** Time line üzerinde mola bar (countdown)
6. **D-NEW-006:** Font min 12px caption, 14px body (DIN-1450)
7. **D-NEW-007:** Triangle workflow Replit no-push kuralı

---

*Hazırladı: Claude — 11 May 2026 02:45*
