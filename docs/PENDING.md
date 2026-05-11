# ⏳ PENDING — Bekleyen İşler (v6.0 — 11 May Update)

> **PILOT 13 MAY 15:00 — ~35 SAAT KALDI. PR #72 + #73 merge edildi, Sprint 14a tamam.**

**Son güncelleme:** 11 May 2026 (PR #72 hotfix merge + PR #73 Sprint 14a merge + migration'lar çalıştırıldı)
**Pilot tarihi:** **13 Mayıs 2026 Çarşamba 15:00** (önceki tarihler: 5 May → 12 May → 13 May, D-45 final)

---

## 🎯 BUGÜNKÜ DURUM (11 May)

| Sprint/PR | Durum | İlerleme |
|---|---|---|
| 5-10 May Maraton | ✅ **8 PR mergele** | %100 |
| PR #65 (MEGA pilot prep) | ✅ Mergeli | — |
| PR #72 (Mola kümülatif + PIN reset mail) | ✅ Mergeli (11 May 00:43) | — |
| PR #73 (Sprint 14a — Mola sayaç fabrika + HQ) | ✅ Mergeli | — |
| Migration: long-shift-auto-close | ✅ Çalıştı (0/0/0) | DB zaten temizdi |
| Migration: hq-factory-break-tracking | ✅ Çalıştı (7 backfilled) | hq_break_logs VAR, factory.break_minutes VAR |
| Pilot Hazırlık | 🟢 **%99.999** | Sadece test + Aslan business işleri |

---

## 🔥 ŞU AN AKTİF (11 May → 13 May 15:00)

### P-1: Mahmut Bey Bordro Doğrulama 🔴 ASLAN
**Süre:** 30 dk telefon | **Deadline:** 11-12 May | **Sahibi:** Aslan
Excel'deki 5 pozisyon BRÜT rakamlarını al, Replit `PAYROLL_DRY_RUN=false` yapıp hesaplasın.

### P-NEW (HQ-PIN-RESET) 🔴 ASLAN
**Süre:** 5 dk + WhatsApp | **Deadline:** 13 May Çar 14:00 | **Sahibi:** Aslan
- Sadece **eren + hqkiosk** PIN eksik
- Manuel SQL veya UI'dan tanımla
- **YENİ kolaylık:** PR #72 ile PIN reset mail endpoint'i de var (`/api/kiosk/pin-reset/request`)

### P-SEMA: 36 Yeni Hammadde + 4 Reçete 🟡 SEMA
**Süre:** ~2 saat | **Deadline:** 12 May Salı | **Sahibi:** Sema
1. `/girdi-yonetimi` filtre HAM-1000+ → 36 hammadde için fiyat + besin + tedarikçi + aktivasyon (~72 dk)
2. DOREO + Golden Latte aktive (kategori düzelt) (~5 dk)
3. 4 pilot reçete: "Besin Hesapla" + "Gramaj Onayla" → auto-label tetiklenir (~20 dk)

### P-14A-TEST: Sprint 14a Kiosk Manuel Test 🟡 ASLAN
**Süre:** 30 dk | **Deadline:** 12 May | **Sahibi:** Aslan
- HQ kiosk (`/hq/kiosk`): mola başlat → 5 dk → moladan dön → BreakReturnSummary gözükmeli → tekrar mola → "kalan 55 dk" göstermeli
- Fabrika kiosk (`/fabrika/kiosk`): aynı 45+15 senaryosu, BreakCountdown gözükmeli (eskiden basit timer vardı)
- Şube kiosk (`/sube/kiosk`): aynı senaryo regresyon kontrolü (PR #72'den sonra bozulmamış olmalı)

### P-DRY-RUN: Pilot Day-1 Dry-Run 🟡 ASLAN + 4 LOK BAŞKANI
**Süre:** 4 saat | **Deadline:** 12 May 14:00-18:00 | **Sahibi:** Aslan
- 4 lokasyon × 30 dk simülasyon (Işıklar, Lara, HQ, Fabrika)
- Checklist: docs/SPRINT-11-P16-PILOT-DAY1-CHECKLIST.md (400 satır)

---

## ⚠️ POST-PILOT (13 May sonrası)

| # | İş | Sebep | Süre |
|---|---|---|---|
| PP-1 | Çift bordro tablo birleştirme | `monthly_payroll` vs `monthly_payrolls` | 1 sprint |
| PP-2 | `account_status` normalize ('active') | Dual değer raporları yanlış | 3 gün |
| PP-3 | `leave_balances` carry-over fix | remaining > entitlement anomali | 2 gün |
| PP-4 | `pdks_employee_mappings` doldurma | Excel import güvenliği | 3 gün |
| PP-5 | 15 PDKS sayfası D-44 hub'da topla | UX kaosu | 1 sprint |
| PP-6 | 3 kiosk endpoint → 1 standart | API consistency | 1 sprint |
| PP-7 | 36 açık branch temizlik | Git hijyeni | 30 dk |
| **PP-NEW** | **Long-shift auto-close + monitor scheduler** | D-55 — pilot için ertelendi | 1 sprint |

---

## 📊 11 MAY PR'LARI

| PR | Konu | Durum |
|---|---|---|
| #65 | MEGA pilot prep + KVKK temizlik (10 May) | ✅ Merge edildi |
| #66-#70 | Çeşitli (ara PR'lar) | ✅ |
| #71 | Kiosk mega improvements + KVKK m.11 (10 May gece → 11 May 00:43) | ✅ Merge edildi |
| **#72** | **Hotfix: Mola kümülatif + PIN reset mail** | ✅ Merge edildi (11 May) |
| **#73** | **Sprint 14a: Mola sayaç fabrika + HQ** | ✅ Merge edildi (11 May) |

---

## 🗓️ TAM TARİH (13 MAY 15:00 BAZLI)

```
11 May Pzt ────────── ŞU AN (Sprint 14a tamam, doc update push'lanıyor)
12 May Salı ───────── Aslan: kiosk test + Mahmut + HQ PIN + Sema'nın işi + 14-18 dry-run
13 May Çar 09-14 ──── Final smoke + audit + backup + HQ PIN dağıt
13 May Çarşamba 15:00 ─ 🎉 PILOT (4 lokasyon)
```

---

## 🤔 BELİRSİZ — Fabrika Müdürü Teyit Edecek (13 May Sabahı)

### Pasif Fabrika User'ları (3 belirsiz)

Fabrika müdürü 13 May sabahı 3 belirsiz user için karar verecek:
- Çalışıyor → AKTİVE et + PIN ata
- İşten ayrılmış → DROP (KVKK soft archive: `deleted_at = NOW()`, `account_status = 'archived'`)

SQL:
```sql
SELECT id, username, first_name, last_name, role, is_active, deleted_at
FROM users
WHERE branch_id = 24
  AND (is_active = false OR deleted_at IS NOT NULL)
  AND username NOT IN ('fatiharslanstj')
ORDER BY username;
```

---

## 📚 ARŞİV — Önceki Sprint Detayları

<details><summary>Tıkla aç (Sprint 11/12/13/14a detayları)</summary>

## 🎯 BUGÜNKÜ DURUM (6 May 23:55)

| Sprint | Durum | İlerleme |
|---|---|---|
| 9: Bordro & Personel | ⏳ Mahmut'a kilitli | tax-calculator hazır, refactor 8 May Cuma sonrası |
| 10: Güvenlik & Manifest | ✅ **BİTTİ** | 6/6 iş + HQ PIN UI ekstra |
| 11: Pilot Hazırlık | 🔄 2/6 hazır | P-15 + P-16 doküman ✅, P-11/12/13/14 fiziksel |
| 12: Compliance & KVKK | ✅ **BİTTİ (6/8)** | P-17/18/19/20 hepsi tamam, sadece P-21 Mahmut'a bağlı |
| **13: Gıda Mühendisi Fix + D-44** | ✅ **BİTTİ** | 4 fix + mimari prensip + Sprint 14 plan |
| 14: Buffer + Pilot | ⏳ 14-25 May | Pilot 18 May 10:00 |

---

## 🔥 ŞU AN AKTİF: Aslan'a Bağlı (Mahmut + Replit + Personel)

### P-1: Mahmut Bey Bordro Doğrulama 🔴 ASLAN
**Süre:** 30 dk telefon | **Deadline:** 8 May Cuma | **Sahibi:** Aslan

Excel'deki 5 pozisyon BRÜT rakamlarını al, tax-calculator ile karşılaştır.

### P-NEW (HQ-PIN-RESET) 🔴 ASLAN — KRİTİK BLOCKER
**Süre:** 30 dk | **Deadline:** 12 May Pazartesi (pilot öncesi) | **Sahibi:** Aslan

Bugün (6 May) keşfedildi + HQ PIN UI bugün yapıldı (`/admin/hq-pin-yonetimi`).

**Yapılacak:**
1. `/admin/hq-pin-yonetimi` aç (Replit deploy sonrası)
2. 19 HQ user için memorable PIN gir
3. "Toplu Reset" butonu
4. "PIN Listesini Kopyala" → her kullanıcıya **özel WhatsApp DM**
5. Pilot Day-1'de herkes giriş yapsın

### P-Replit-Migration (Sprint 10 P-7) ✅ EXECUTED — 7 May 2026 sabah
**Replit Agent EXECUTE edildi (Task #356)**

PRE_CHECK sonuçları (canlı DB):
- HQ user phone_number NOT NULL: **0** (hepsi NULL)
- Existing HQ branch_staff_pins (branch_id=23): **18 satır** (zaten bcrypt'te)
- pgcrypto installed: ❌ → CREATE EXTENSION çalıştı

Migration etkisi:
- INSERT: **0 satır** (phone NULL olduğu için WHERE eşleşmedi — beklenen)
- pgcrypto extension: ✅ kuruldu
- audit_logs: ✅ 1 kayıt (`action=migration.bcrypt_hash`, `event_type=kiosk.hq_pin_bulk_migration`)
- branch_staff_pins toplam HQ PIN: **18 satır** (değişmedi)

POST_CHECK ✅ — Lazy migration fallback kalıcı (HQ user'lar PIN reset UI'sından PIN alacak).

Backup'lar: schema 1.3M + data 1.2M (`docs/audit/backups/` git-ignored).

### P-Sprint-8c (position_salaries UNIQUE Constraint) ✅ EXECUTED — 7 May 2026 sabah
**Replit Agent EXECUTE edildi (Task #352)**

PRE_CHECK:
- Constraint zaten exists: `position_salaries_code_effective_unique` (commit `55978c171` daha önceden uygulanmış)
- Duplicate (position_code + effective_from): **0 satır** ✅
- Toplam kayıt: **19 satır** temiz

Migration: idempotent çalıştı (DO $$ bloğu "already exists" dedi, hata vermedi).
Backup: schema 1.2MB + data 2.7KB.
EXIT_CODE: 0 ✅

### P-2/3/4: Sprint 9 Devamı 🟢 ÇALIŞMA HAZIR
**Bağımlılık:** P-1 (Mahmut brüt rakamları)

P-1 tamamlandıktan sonra:
- tax-calculator parametreleri kalibre (10 dk)
- payroll-engine refactor (30 dk)
- payroll_parameters migration (15 dk)
- 35 personel UPSERT (Sprint 8e, 45 dk)

---

## ✅ SPRINT 10 — BİTTİ (6/6 İŞ + HQ PIN UI)

| # | İş | Süre | Durum |
|---|---|---|---|
| ✅ P-5 | manifest-auth fail-closed | 30 dk | Mergelendi |
| ✅ P-6 | Pre-commit hook | 1 saat | Mergelendi |
| ✅ P-10 | PAYROLL_DRY_RUN opt-in | 20 dk | Mergelendi |
| ✅ P-7 | HQ kiosk PIN bcrypt + UI | 1.5 saat | Mergelendi (PR #36) |
| ✅ P-8 | Pino logger + console override | 50 dk | Mergelendi (PR #35) |
| ✅ P-9 | Access mechanism audit + script | 45 dk | Mergelendi (PR #37) |

---

## 🟢 SPRINT 11 — Pilot Hazırlık & Demo (9-11 May)

### Hazır Dokümanlar (2/6)
- ✅ **P-15:** 4 kritik bordro senaryosu (`docs/SPRINT-11-P15-BORDRO-SENARYOLARI.md`, 280 satır)
- ✅ **P-16:** Day-1 Checklist (`docs/SPRINT-11-P16-PILOT-DAY1-CHECKLIST.md`, 400 satır)

### Sırada (4 fiziksel oturum)

| # | İş | Süre | Deadline | Sahibi |
|---|---|---|---|---|
| P-11 | Pilot Day-1 Dry-Run (4 lokasyon × 30 dk) | 4 saat | 9 May 14:00-18:00 | Aslan + 4 lok başkanı |
| P-12 | Andre + Eren + Sema Demo (3 persona × 30 dk) | 1.5 saat | 10 May Pazar | Aslan |
| P-13 | Mahmut bordro Excel→sistem (4 senaryo) | 1 saat | 10 May Pazar | Aslan + Mahmut |
| P-14 | Yavuz Coach 19 şube → 4 lok UI scope | 1 saat | 10 May | Aslan + Yavuz |

---

## ✅ SPRINT 12 — Compliance (6/8 BİTTİ)

| # | İş | Süre | Durum |
|---|---|---|---|
| ✅ P-17 | KVKK Veri İşleme Politikası | 1.5 saat | Mergelendi (PR #40) |
| ✅ P-18 | Damga vergisi 2026 muafiyeti doğrulama | 30 dk | Mergelendi (PR #41) |
| ✅ **P-19** | **TGK 2017/2284 etiket doğrulama** | 1.5 saat | **Push'lı, mergele bekliyor** |
| ✅ **P-20** | **e-Fatura/e-Arşiv post-pilot plan** | 1 saat | **Push'lı, mergele bekliyor** |
| ⏳ P-21 | payroll_parameters 2026 KESİN (Mahmut imzalı) | 1 saat | Mahmut'a bağlı (Cuma 8 May) |
| ⏳ P-22 | KVKK aydınlatma metni şube ekranlarında | 1 saat | Pilot Day-1 öncesi |

**Sprint 12 başarı:** 6/8 = %75 BİTTİ. Sadece Mahmut + KVKK fiziksel hazırlık kaldı.

### P-19 Sonuç (TGK Compliance Audit)

- **Compliance Skoru: 73.5/100** (pilot için yeterli, hedef post-pilot >90)
- ✅ **TAM (10 alan):** Gıda adı, malzeme, alerjen, net miktar, SKT, üretici, beslenme bildirimi (8 öğe), onay zinciri
- 🟡 **KISMEN (3 alan):** crossContamination, storageConditions, kullanım talimatı (manuel doldurma)
- 🔴 **EKSİK (2 alan):** Belirgin bileşen yüzdesi (Madde 9/d), **Lot/Parti numarası (Madde 9/k — kritik)**
- 🟢 **N/A (3 alan):** Menşe ülke, alkol, gıda onay no

**Pilot için:** Lot numarası Eren manuel girer (kağıt → sonra sistem). Sprint 14'te otomatik üretim.

### P-20 Sonuç (e-Fatura Plan)

- **Yasal son tarih:** 1 Temmuz 2026 (DOSPRESSO bilanço esası → CİRO FARK ETMEZ, ZORUNLU)
- **Önerilen geçiş:** 15 Haziran 2026 (2 hafta tampon)
- **Maliyet:** ~95,000 TL kurulum + 72,500 TL/yıl
- **ROI Y1:** **+785,000 TL net kazanç**
- **Sprint 18-20:** Haziran içinde implementasyon

---

## ✅ SPRINT 13 — Gıda Mühendisi Fix + D-44 (BİTTİ)

**Tetikleyici:** Aslan'ın Sema (gida_muhendisi) rolüyle yaptığı canlı test (6 May 22:00) — 3 crash + 1 mimari hata tespit.

| # | İş | Süre | Durum |
|---|---|---|---|
| ✅ F1 | TÜRKOMP `searchResults.map` crash → unwrap | 5 dk | Mergelendi |
| ✅ F2 | Tedarikçi `defectRate.toFixed undefined` → null safety | 5 dk | Mergelendi |
| ✅ F3 | Etiket Hesapla productId crash → empty state | 15 dk | Mergelendi |
| ✅ F4 | Sidebar "Etiket Hesapla" link kaldır | 5 dk | Mergelendi |
| ✅ D-44 | Bağlam-İçi Tab Prensibi (DECIDED.md) | 30 dk | Mergelendi |
| ✅ S14-PLAN | Sprint 14 mimari refactor plan (510 satır) | 1 saat | Mergelendi |

**D-44 prensibi:** Tüm DOSPRESSO platformu için yeni mimari kural. Detay sayfaları içinde sekmeler, sidebar minimal. **İçerik rol-bağımsız**, **aksiyonlar rol-spesifik**.

---

## ⏳ SPRINT 14-22 — Post-Pilot Roadmap

| Sprint | Süre | İçerik | Önceliği |
|---|---|---|---|
| 14 | 1 hafta | Reçete Hub Refactor (10 sekme) — D-44 | 🔴 Yüksek |
| 15 | 1 hafta | Hammadde Hub Refactor (5 sekme) | 🟠 Orta |
| 16 | 1 hafta | Mr. Dobody Dashboard (rol-bağımsız) | 🟠 Orta |
| 17 | 3 gün | Sidebar Final Temizliği | 🟡 Düşük |
| **18** | **2 hafta** | **e-Fatura entegratör + mali mühür (Haziran başı)** | 🔴 **YASAL** |
| **19** | **2 hafta** | **e-Fatura platform geliştirme (102 saat)** | 🔴 **YASAL** |
| **20** | **2 hafta** | **e-Fatura production geçiş (15 Haziran)** | 🔴 **YASAL** |
| 21 | 1 hafta | e-Defter entegrasyonu (Temmuz) | 🔴 Yasal |
| 22+ | sürekli | Mr. Dobody otomasyon (e-Fatura, mevzuat takip) | 🟢 İyileştirme |

**🚨 1 Temmuz 2026:** e-Fatura yasal zorunluluk başlar.

---

## 📊 PR DURUMU (10 PR — 8 Mergeli + 2 Push'lı)

| # | Branch | Durum |
|---|---|---|
| ✅ | sprint-10-p8-pino-logger | Mergelendi (PR #35) |
| ✅ | sprint-10-p7-hq-pin-management-ui | Mergelendi (PR #36) |
| ✅ | sprint-10-p9-access-mechanism-audit | Mergelendi (PR #37) |
| ✅ | sprint-11-p15-p16-pilot-prep | Mergelendi (PR #38) |
| ✅ | sprint-10-closing-pending-v3 | Mergelendi (PR #39) |
| ✅ | sprint-12-p17-kvkk-policy | Mergelendi (PR #40) |
| ✅ | sprint-12-p18-damga-verification | Mergelendi (PR #41) |
| ✅ | sprint-13-gida-muhendisi-fixes | Mergelendi (Sprint 13 + D-44) |
| 🟡 | **sprint-12-p19-tgk-verification** | **Push'lı, mergele bekliyor** |
| 🟡 | **sprint-12-p20-efatura-postpilot-plan** | **Push'lı, mergele bekliyor** |
| 🟡 | **sprint-12-closing-pending-v4** | **Bu PR, mergele bekliyor** |

---

## 🎯 PILOT 18 MAY YOL HARITASI

```
7 May Perşembe (yarın):
  - Aslan: Mergele 3 son PR (P-19, P-20, PENDING v4)
  - Replit deploy
  - HQ PIN UI test + 19 PIN set + WhatsApp dağıt
  - Replit P-7 migration EXECUTE

8 May Cuma:
  - Mahmut bordro çağrı (5 brüt rakam)
  - tax-calculator kalibre + payroll-engine refactor

9 May Cuma 14:00-18:00:
  - Pilot Day-1 Dry-Run (P-11, 4 lokasyon × 30 dk)

10 May Pazar:
  - Andre + Eren + Sema demo (P-12)
  - Mahmut bordro Excel→sistem (P-13)
  - Yavuz UI scope (P-14)

11-13 May (Sprint 12 kalan):
  - P-21 payroll_parameters KESİN (Mahmut imzalı)
  - P-22 KVKK aydınlatma metni şube ekranları

14-17 May:
  - Buffer (4 gün) — son ayar
  - Pilot tüm sistemlerin son testi

🎉 18 May Pazartesi 10:00:
  PILOT DAY-1 — 4 lokasyon canlı

18-25 May:
  - Pilot canlı izleme + günlük check-in

25 May+ (Post-pilot):
  - Sprint 14: Reçete Hub Refactor (D-44)
  - Sprint 15-17: Diğer refactor + Mr. Dobody Dashboard
  - 🚨 Sprint 18-20: e-Fatura geçiş (Haziran)
  - 🚨 1 Temmuz: e-Fatura yasal zorunluluk başlar
```

---

## 📂 Dökümanlar İndeksi

| Doküman | Konu |
|---|---|
| `docs/PENDING.md` | Açık iş listesi (bu dosya) |
| `docs/DECIDED.md` | Kalıcı kararlar (D-1...D-44) |
| `docs/DEVIR-TESLIM-6-MAYIS-2026-AKSAM.md` | Devir teslim akşam (19:30) |
| `docs/DEVIR-TESLIM-6-MAYIS-2026-GECE-V2.md` | **Devir teslim final (gece 23:55) — YENİ** |
| `docs/SPRINT-11-P15-BORDRO-SENARYOLARI.md` | 4 bordro test senaryosu |
| `docs/SPRINT-11-P16-PILOT-DAY1-CHECKLIST.md` | Day-1 checklist |
| `docs/KVKK-VERI-ISLEME-POLITIKASI.md` | KVKK politika v1.0 |
| `docs/SPRINT-12-P18-DAMGA-VERGISI-DOGRULAMA.md` | Damga vergisi audit |
| `docs/SPRINT-12-P19-TGK-COMPLIANCE-AUDIT.md` | **TGK 2017/2284 audit (73.5/100) — YENİ** |
| `docs/SPRINT-12-P20-EFATURA-POSTPILOT-PLAN.md` | **e-Fatura geçiş planı (1 Tem son tarih) — YENİ** |
| `docs/SPRINT-14-MIMARI-REFACTOR-PLAN.md` | D-44 prensibi + 510 satır plan |

---

**Son güncelleme:** 6 May 2026, 23:55 (Sprint 12 P-19+P-20 tamamlandı, Sprint 13 D-44 prensibi, devir-teslim final)

</details>

---

## 🤔 BELİRSİZ — Fabrika Müdürü Teyit Edecek (13 May Sabahı)

### Pasif Fabrika User'ları (6 toplam)

| Username | Aslan Cevabı (10 May Gece) | Aksiyon |
|---|---|---|
| `fatiharslanstj` | ❌ FATİH ARSLAN YOK fabrikada | Pasif kalsın (doğru) |
| `umit` (Pasta Şefi) | ✅ ÇALIŞIYOR | Aktive (10 May gece SQL) |
| `arifeyildirim0` | ✅ ÇALIŞIYOR | Aktive (10 May gece SQL) |
| **3 belirsiz user** | ⏳ Bilinmiyor | **Fabrika müdürü 13 May sabahı teyit etsin** |

### Belirsiz 3 User'ı Bulma SQL

```sql
SELECT id, username, first_name, last_name, role, is_active, deleted_at
FROM users
WHERE branch_id = 24
  AND (is_active = false OR deleted_at IS NOT NULL)
  AND username NOT IN ('fatiharslanstj')
ORDER BY username;
```

Pilot günü (13 May) fabrika müdürü her bir user için karar verecek:
- Çalışıyor → AKTIVE et + PIN ata
- İşten ayrılmış → DROP (KVKK soft archive: `deleted_at = NOW()`, `account_status = 'archived'`)

