# DOSPRESSO Pilot — Bulletproof Doğrulama Raporu v2

**Tarih:** 23 Nisan 2026 Perşembe 19:30
**Pilot GO-LIVE:** 28 Nisan 2026 Pazartesi 09:00 (**4 gün, 13 saat kaldı**)
**Kaynak:** Replit canlı DB taraması (30 SQL + 5 kod) + Claude kod analizi
**Rapor formatı:** 2-katmanlı (Sayfa 1 = Yönetim, Sayfa 2 = IT Danışman)

---

# 📋 SAYFA 1 — YÖNETİM ÖZETİ (30 saniyede anla)

## 🚦 Karar: 🟡 **GO-DEFER (Koşullu GO)**

> **4 kritik blocker var. Hepsi 24 saatte çözülebilir. Çözülmezse pilot 26 Nis 18:00'a ertelenmeli.**
> **Şu an yapılabilirse 28 Nis 09:00 GO-LIVE korunur.**

### 🔴 Kritik Blocker Tablosu

| # | Sorun | İş Etkisi | Risk | Sorumlu | Süre | Doğrulayacak | Durum |
|---|---|---|---:|---|---|---|---|
| **1** | 8-9 kullanıcı aynı bcrypt hash (PIN çakışması) | Barista PIN'iyle Aslan hesabı açılır. SGK'da "kim imzaladı?" belirsiz → **imzasız işlem suç** | 10/10 | Replit | 10 dk | Aslan | 🔴 SQL HAZIR |
| **2** | 4 pilot lokasyonda GPS NULL | Kiosk konum doğrulamaz. Her açılış supervisor PIN → Day-1 kaosu | 9/10 | **Aslan** | 15 dk | Claude | ⏳ BEKLİYOR |
| **3** | Lara `sube_kiosk` PIN'i yok | Lara kiosk açılamaz, baristalar giriş yapamaz | 10/10 | Replit | 1 dk | adminhq | 🔴 #1 kapsıyor |
| **4** | 28 Nis-4 May vardiya planı SIFIR | Bordro 480dk varsayar → maaş %15-30 yanlış → yasal risk | 9/10 | **Yavuz** | 2 saat | Aslan | ⏳ BRIEF |

### 🟠 Yüksek Risk

| # | Sorun | Risk | Sorumlu | Süre |
|---|---|---:|---|---|
| 5 | Mr. Dobody routing sadece 1 kural | 7/10 | Replit | 5 dk |
| 6 | 15-alerjen migration hatası | 6/10 | Claude fixed, Replit çalıştır | 5 dk |
| 7 | SGK 2026 audit edilmemiş | 7/10 | Mahmut | 1 saat |

### ✅ Bulletproof Alanlar

Bordro güvenlik ✅ | 2026 SGK parametreler ✅ | Orphan FK 0 ✅ | Snapshot cron ✅ | TypeScript 0 hata ✅ | 8/8 env ✅ | Disk %52 ✅

---

## 🎯 Aslan İçin 4 Aksiyon (25 dk)

### 1️⃣ GPS Koordinatları (15 dk)
📄 `docs/pilot/gps-koordinat-girme-rehberi.md`

### 2️⃣ Replit'e Mesaj (2 dk)
```
Sırayla çalıştır:
1. psql -f scripts/pilot/15-alerjen-temel-seed.sql
2. tsx scripts/pilot/17-pin-reseed.ts > /tmp/new-pins-23nis.csv
3. psql -f scripts/pilot/18-mr-dobody-routing-rules-seed.sql

#2 CSV'yi bana ilet. Sonra shred -u ile sil.
```

### 3️⃣ Yavuz Brief (5 dk)
WhatsApp: "Pilot haftası vardiya planı. 4 lokasyon × 7 gün. Deadline 27 Nis 18:00"

### 4️⃣ Token Yenile (3 dk)
GitHub Settings → PAT → Revoke + yeni oluştur

---

# 📋 SAYFA 2 — IT DANIŞMAN TEKNİK DETAY

## 🔧 Çözüm Scriptleri — Inline

### Çözüm #1: PIN Re-seed (Blocker #1 + #3)

**Sorun:** `branch_staff_pins.hashed_pin` kolonunda `UNIQUE` yok. Seed'de copy-paste ile aynı bcrypt hash çok kullanıcıya atanmış.

```bash
cd /home/runner/workspace
tsx scripts/pilot/17-pin-reseed.ts > /tmp/new-pins-23nis.csv
cat /tmp/new-pins-23nis.csv   # Aslan'a ilet
shred -u /tmp/new-pins-23nis.csv   # Dağıtım sonrası sil
```

**Doğrulama:**
```sql
SELECT hashed_pin, COUNT(*) FROM branch_staff_pins
WHERE branch_id IN (5, 8, 23, 24)
GROUP BY hashed_pin HAVING COUNT(*) > 1;
-- Beklenen: 0 satır
```

### Çözüm #2: GPS UPDATE

```sql
BEGIN;
UPDATE branches SET shift_corner_latitude = 36.XXXX, shift_corner_longitude = 30.XXXX WHERE id = 5;  -- Işıklar
UPDATE branches SET shift_corner_latitude = 36.XXXX, shift_corner_longitude = 30.XXXX WHERE id = 8;  -- Lara
UPDATE branches SET shift_corner_latitude = 36.XXXX, shift_corner_longitude = 30.XXXX WHERE id = 23; -- HQ
UPDATE branches SET shift_corner_latitude = 36.XXXX, shift_corner_longitude = 30.XXXX WHERE id = 24; -- Fabrika
COMMIT;
```

### Çözüm #3: Routing Seed

```bash
psql "$DATABASE_URL" -f scripts/pilot/18-mr-dobody-routing-rules-seed.sql
```

**Doğrulama:**
```sql
SELECT primary_role, COUNT(*) FROM agent_routing_rules
WHERE is_active = true GROUP BY primary_role;
-- Beklenen: 11 farklı rol
```

### Çözüm #4: Alerjen (v3 sema drift fix)

```bash
psql "$DATABASE_URL" -f scripts/pilot/15-alerjen-temel-seed.sql
```

**Doğrulama:**
```sql
SELECT COUNT(*) FROM factory_ingredient_nutrition;
-- Beklenen: ~111 kayıt
```

### Çözüm #5: Launch-Reset (Pazar 22:30)

```bash
pg_dump $DATABASE_URL > /tmp/pre-launch-backup-27nis.sql
psql "$DATABASE_URL" -f scripts/pilot/16-launch-reset.sql
```

---

## 📊 Replit Canlı DB Çıktısı (30 Sorgu Özeti)

### Kategori 1: Can Damarı (Q1-Q7)

**Q1 — Pilot lokasyon config:**
| id | name | lat | lng | radius | active | setup | kiosk_pwd |
|---|---|---|---|---|---|---|---|
| 5 | Işıklar | **NULL** | **NULL** | 50 | ✅ | ✅ | ✅ |
| 8 | Lara | **NULL** | **NULL** | 50 | ✅ | ✅ | ✅ |
| 23 | HQ | **NULL** | **NULL** | 50 | ✅ | ✅ | ✅ |
| 24 | Fabrika | **NULL** | **NULL** | 50 | ✅ | ✅ | ✅ |

**Q2 — Rol dağılımı:**
- Işıklar (5): **10 aktif** — 6× barista, 2× supervisor, 1× bar_buddy, 1× mudur
- Lara (8): **5 aktif** — 3× barista, 1× supervisor, 1× mudur
- HQ (23): **19 aktif** — tüm HQ rolleri + 3 admin
- Fabrika (24): **9 aktif** — fabrika_mudur, gida_muhendisi, recete_gm, sef, üretim_sefi, operator×2, depo, sorumlu

**Q3 — PIN durumu:**
- Işıklar 10/10 ✅ | Lara 5/6 ⚠️ | HQ 19/19 ✅ | Fabrika 5/9 ⚠️

**Q4 — Vardiya planı (28 Nis-4 May):** 4/4 lokasyon **0 plan** 🔴

**Q5 — Disabled modüller:** 13 global (pilot dışı — stok, fabrika.*, dobody.chat, delegasyon, iletisim_merkezi)

**Q6 — Son 24h session:** 0 (beklenen)

**Q7 — Routing altyapı:**
- agent_routing_rules: **1** 🔴
- dobody_scopes: 27 ✅
- escalation_config: 5 ✅
- Unread: **22,102** ⚠️

### Kategori 2: Bordro & Yasal (Q8-Q12) — ✅ Temiz

- Q8 Güvenlik kolonları (is_dry_run, data_source, calc_mode): ✅ hepsi var
- Q9 2026 SGK: 33.030 gross / 28.075,50 net ✅
- Q10 position_salaries: 19 pozisyon ✅
- Q11 Bordro hata: 2026 kayıt yok ✅
- Q12 PDKS 7g: Fabrika 4 kayıt, diğerleri 0 ⚠️ (beklenen)

### Kategori 3: Veri Bütünlüğü (Q13-Q16) — ✅ Hepsi 0

Orphan FK 0 | Soft-delete çelişki 0 | Duplicate vardiya 0 | Negatif değer 0

### Kategori 4: Cron (Q17-Q20)

- Q17: cron_execution_log tablosu yok (app log)
- Q18: branch_task_instances 7g **0** ⚠️ (recurring trigger boş)
- Q19: Snapshot ✅ 21-22 Nis dolu
- Q20: Bugün skor 0 (kiosk test yok)

### Kategori 5: Güvenlik (Q21-Q23)

- Q21: 0 şifresiz, 0 must_change ✅, 372 aktif
- Q22: Pilot adminler aktif ✅
- Q23: Audit 48h 1 kayıt ⚠️

### Kategori 6: Performans (Q24-Q27)

- Q24: notifications 28MB ✅ | Q25: Index'ler tam ✅
- Q26: pg_stat_statements yok (Neon aç) | Q27: 1 disabled conn ✅

### Kategori 7: Kod (T1-T5)

T1 TS 0 hata ✅ | T2 Log temiz ✅ | T3 Endpoint'ler healthy ✅ | T4 Disk %52 ✅ | T5 Env 8/8 ✅

### Kategori 8: Edge Case

- **E1 PIN çakışması:** 🔴 Blocker #1
- E2: 8+ saat açık 0 ✅
- **E4 Routing pilot rolleri:** 🔴 Blocker #5
- E5: supervisor_id kolonu yok → döngü imkansız ✅

---

## 📜 Geçmiş Bağlam (IT Danışman için)

**Pilot hazırlık timeline:**

- **14 Nis:** Devir başlangıç, 468 tablo / 1800 endpoint raporu
- **18-20 Nis:** Marathon sprint planning (A-H)
- **21 Nis:** Replit detaylı rapor (Sema/Eren eksik, 16 şube müdür login yok)
- **22 Nis:** Replit kapsamlı tarama 1 (9 blocker: checklist, GPS, vardiya, DRY_RUN)
- **23 Nis öğle:** Claude 4 sprint (S-Bordro/UX/GPS/Flag), 6 migration (10-15)
- **23 Nis akşam:** Replit pull + 10/11/12/13 başarılı, 14/15 şema drift
- **23 Nis 17:30:** Claude 14/15 düzeltti
- **23 Nis 18:30:** Replit bulletproof tarama → PIN çakışması + routing eksik
- **23 Nis 19:30:** Claude 17-pin-reseed.ts + 18-routing seed + bu rapor

**GPS konusu - "kim ne zaman söz verdi":**
- 21 Nis: "NULL, Aslan'dan bekleniyor"
- 22 Nis: "Hala NULL, brief gerekli"
- 23 Nis (bu rapor): "Hala NULL, rehber hazır, Aslan bugün/yarın vermeli"
- **3 gün hatırlatıldı, mobilite sırasında unutulmuş olabilir**

**PIN çakışması - neden şimdi keşfedildi:**
- Replit Kategori 8 "Edge Case" E1 sorgusu ilk kez sorulmuş
- Production sistem 3+ aydır var → canlıya çıkmadan yakalama kritik şans
- Pilot öncesi kapatılırsa **fiyat etiketi yok**

---

## 🎯 Pilot Hazırlık Skoru: **85/100** → Hedef **95/100**

**Kayıp 15 puan:**
- PIN çakışması: -6 | GPS NULL: -4 | Vardiya planı: -3 | Routing: -2

**Bu hafta çözülürse hepsi geri gelir.** Hiçbir kayıp "pilot sonrasına" bırakılmıyor.

---

## 📞 Sorumluluklar Net

| Kişi | Görev | Deadline |
|---|---|---|
| Aslan | GPS + token + 8 karar + brief | 24 Nis 12:00 |
| Claude | Blocker çıkarsa düzelt | On-demand |
| Replit | 15/17/18 SQL çalıştır + smoke | 26 Nis |
| Yavuz (Coach) | 150 satır vardiya planı | 27 Nis 18:00 |
| Sema (Gıda M.) | 111 alerjen verify | 26 Nis |
| Mahmut | SGK 2026 audit | 26 Nis |
| adminhq | Fabrika 4 PIN (17 kapsar) | 24 Nis |

---

## ⚠️ Karar Noktaları (24 saatlik pencere)

**24 Nis Cuma 18:00 itibariyle:**

- ✅ PIN reseed + GPS + routing seed TAMAMSA → **28 Nis GO-LIVE**
- ⏳ PIN + routing tamam, GPS bekliyor → **S-GPS fallback ile GO** (supervisor PIN her sabah)
- ❌ PIN reseed yapılmadıysa → **ERTELE (26 Nis 18:00)** — yasal risk taşınamaz

---

**Belge:** `docs/pilot/bulletproof-rapor-23nis.md`
**Sürüm:** v2.0 (Replit feedback entegre)
**Sonraki güncelleme:** 24 Nis 10:00 (Aslan aksiyonları sonrası)
**Yazar:** Claude (Replit verisi + IT danışman format)
