# ⏳ PENDING — Bekleyen İşler

> **5 büyük sprint planı, pilot 18 May.** Yeni oturum: bu dosyayı okuyup sprint sırasına git.

**Son güncelleme:** 6 May 2026, 14:50 (Audit sonrası 5-sprint pilot planı)
**Pilot tarihi:** **18 May 2026 Pazartesi 10:00** (11 May'dan ertelendi — Claude Code audit önerisi kabul, D-42)

---

## 🔥 ŞU AN AKTİF: SPRINT 9 — Bordro & Personel Verisi (6-8 May)

**Hedef:** Sistem gerçek 35 personel + doğru net/brüt hesabıyla çalışsın.

### P-1: Mahmut Bey Bordro Doğrulama 🔴 ASLAN
**Süre:** 30 dk telefon
**Sahibi:** Aslan
**Deadline:** Bugün/yarın

Excel'deki 5 pozisyon için BRÜT rakamlarını al, tax-calculator ile karşılaştır.

| Pozisyon | NET | Excel BRÜT? | Claude Hesap | Sapma |
|---|---|---|---|---|
| Stajyer | 33.000 | ? | 41.064,64 | ? |
| Bar Buddy | 36.000 | ? | 45.959,30 | ? |
| Barista | 41.000 | ? | 54.117,11 | ? |
| Sup Buddy | 45.000 | ? | 60.643,34 | ? |
| Supervisor | 49.000 | ? | 67.169,60 | ? |

### P-2: tax-calculator → payroll-engine entegre 🔴 CLAUDE
**Süre:** 1 saat | **Bağımlılık:** P-1

1. Mahmut'un brüt rakamlarına göre `TR_2026` parametrelerini kalibre
2. `payroll-engine.ts` satır 285-303 refactor (asgari ücret kontrolü NET cinsinden)
3. Bordro UI'da brüt + tüm kesintiler tablosu

### P-3: payroll_parameters.minimum_wage_net migration 🔴 CLAUDE + REPLIT
**Süre:** 30 dk | **Bağımlılık:** P-2

`ALTER TABLE payroll_parameters ADD COLUMN minimum_wage_net INTEGER;`

### P-4: 35 Personel UPSERT (Sprint 8e) 🔴 CLAUDE + REPLIT
**Süre:** 45 dk | **Deadline:** 7 May | **Bağımlılık:** P-3

Migration zaten hazır: `migrations/2026-05-05-sprint-8-data-cleanup-personnel-sync.sql`. 35 personel UPSERT + 18 fake şube + 119 fake personel pasifleştir.

---

## ⏭️ SIRADA: SPRINT 10 — Güvenlik & Manifest (8-9 May)

| # | İş | Süre | Risk |
|---|---|---|---|
| P-5 | Manifest-auth fail-open fix | 1-2 saat | 🔴 Kritik |
| P-6 | Pre-commit hook (marker + token + secret) | 30 dk | 🟠 Yüksek |
| P-7 | HQ kiosk PIN bcrypt | 2 saat | 🟠 Yüksek |
| P-8 | 1804 console.error → structured logger | 4 saat | 🟡 Orta |
| P-9 | 9 paralel role/module access konsolidasyonu | 4 saat | 🟡 Orta |
| P-10 | PAYROLL_DRY_RUN=true default | 30 dk | 🟢 Düşük |

---

## ⏭️ SIRADA: SPRINT 11 — Pilot Hazırlık & Demo (9-11 May)

| # | İş | Süre | Risk |
|---|---|---|---|
| P-11 | Pilot Day-1 Dry-Run (4 lokasyon × 30 dk) | 4 saat | 🔴 Kritik |
| P-12 | Andre + Eren + Sema demo | 1.5 saat | 🔴 Kritik |
| P-13 | Mahmut bordro Excel→sistem geçişi | 1 saat | 🔴 Kritik |
| P-14 | Yavuz coach 19 şube → pilot 4 lok UI | 1 saat | 🟡 Orta |
| P-15 | 4 kritik bordro senaryosu test | 30 dk | 🔴 Kritik |
| P-16 | Day-1 checklist (her lokasyon için) | 2 saat | 🟡 Orta |

---

## ⏭️ SIRADA: SPRINT 12 — Compliance & KVKK (11-13 May)

| # | İş | Süre | Risk |
|---|---|---|---|
| P-17 | KVKK politika + customer_feedback retention | 2 saat | 🟠 Yüksek |
| P-18 | Damga vergisi 2026 muafiyeti payroll-engine kontrol | 1 saat | 🟡 Orta |
| P-19 | TGK 2017/2284 etiket Sprint 7 v3 doğrula | 2 saat | 🟡 Orta |
| P-20 | e-Fatura/e-Arşiv plan (post-pilot doküman) | 2 saat | 🟢 Düşük |
| P-21 | payroll_parameters 2026 TAHMİN→KESİN (Mahmut imzalı) | 1 saat | 🔴 Kritik |

---

## 🛠️ SPRINT 13 — Buffer + Pilot Day-1 (14-25 May)

| # | İş | Tarih | Risk |
|---|---|---|---|
| P-22 | 4 gün buffer (sürpriz fix'ler) | 14-17 May | 🟡 Orta |
| P-23 | 🎉 PILOT DAY-1 | 18 May 10:00 | 🔴 Kritik |
| P-24 | Canlı izleme + günlük check-in | 18-25 May | 🔴 Kritik |

---

## 📊 SPRINT İLERLEME

| Sprint | Tarih | Durum | İş Sayısı | Kritik |
|---|---|---|---|---|
| 9: Bordro & Personel | 6-8 May | 🔄 Aktif | 4 | 1 |
| 10: Güvenlik & Manifest | 8-9 May | ⏳ Bekliyor | 6 | 1 |
| 11: Pilot Hazırlık | 9-11 May | ⏳ Bekliyor | 6 | 4 |
| 12: Compliance | 11-13 May | ⏳ Bekliyor | 5 | 1 |
| 13: Buffer + Pilot | 14-25 May | ⏳ Bekliyor | 3 | 2 |

**Toplam:** 24 ana iş, 9 kritik. Süre: 12 gün (6-18 May).

---

## ⚠️ AUDIT'TE KAPATILAN 3 YANLIŞ ALARM (D-42)

Audit raporu gece geç saatte yazıldı, dünkü çözümleri bilmiyordu:

1. ✅ `score_parameters tablo DB'de yok` → Sprint 8a Task #351 ile eklendi (PR #27)
2. ✅ `Stajyer 33.000 < asgari 33.030` → D-40 v2 ile NET/BRÜT karışıklık çözüldü
3. ✅ `position_salaries unique constraint yok` → Sprint 8c Task #354 ile eklendi (PR #28)

**Gerçek hazırlık seviyesi:** Audit'in dediği %65 değil, **~%72-75**.

---

**Hazırlayan:** Claude (claude.ai web/iPad, 6 May 2026 14:50)
**Versiyon:** v2.0 (5 büyük sprint planı, pilot 18 May)
