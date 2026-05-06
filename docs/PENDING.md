# ⏳ PENDING — Bekleyen İşler (v4.0)

> **Sprint 10 BİTTİ. Sprint 11 P-15+P-16 hazır. Sprint 12 6/8 BİTTİ. Sprint 13 (gıda mühendisi fix + D-44) BİTTİ. Pilot 18 May.**

**Son güncelleme:** 6 May 2026, 23:55 (Sprint 12 P-19 + P-20 tamamlandı, Sprint 13 D-44 prensibi kabul, devir-teslim final)
**Pilot tarihi:** 18 May 2026 Pazartesi 10:00

---

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

### P-Replit-Migration (Sprint 10 P-7) 🟠 REPLIT
**Süre:** 30 dk | **Sahibi:** Replit Agent

Replit'e prompt verildi (saat 22:00). Plan mode + isolated agent + pg_dump ile EXECUTE bekliyor. 0 yeni INSERT yapacak (sadece audit trail).

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
