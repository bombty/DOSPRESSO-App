# SPRINT 3 — DOSPRESSO Master Plan

**Tarih:** 3 Mayıs 2026
**Owner:** Aslan
**Pilot Day-1:** 12 Mayıs 2026 Pazartesi (kesinleşti — D1 kararı, en güvenli +9 gün tampon)
**Sprint Süresi:** 3 May — ~30 May (4 hafta)
**Mode:** Plan + 3 Wave (paralel)

---

## 1. Karar Özeti (D1-D4)

| # | Karar | Değer | Gerekçe |
|---|---|---|---|
| **D1** | **Pilot Day-1 tarihi** | **12 May 2026 Pazartesi** | 9 günlük tampon → smoke test + son hardening + eğitim materyali son hâli |
| **D2** | Sıralama stratejisi | **Risk-bazlı** | En kritik güvenlik / mevzuat / veri bütünlüğü önce |
| **D3** | Bu hafta 3 paralel iş | **K1+K3+Y6** | F33 kalan 5 sayfa guard + skill update + Bundle 1B 13 eksik tablo |
| **D4** | Comprehensive ek tarama | **Pilot sonrası** | CRM/Notification/Mr.Dobody audit, Sprint 4'e ertelendi |

---

## 2. Pilot Day-1: 12 Mayıs 2026 Pazartesi 09:00

### 2.1 Pilot Kapsamı (Hibrit C — Sabit)

| Tip | Birim | Kullanıcı | Pilot? |
|---|---|---|---|
| Şube | Antalya Lara (b8) | Andre + Berkan + 3 barista | ★ AKTİF |
| Şube | Mavi Boncuk Işıklar (b5) | Erdem + Basri + 6 barista | ★ AKTİF |
| Fabrika | Fabrika (b24) | Eren + Sema + Ümit + 7 personel | ★ AKTİF |
| HQ | Merkez Ofis (b23) | Aslan + Mahmut + Samet + 8 personel | ★ AKTİF |
| Diğer 16 şube | – | – | Hazırlık modu (`setup_complete=false`) |

### 2.2 Pilot Tarihçesi (evolution)
- 28 Nis 2026 → 5 May → 4 May → **5 May → +5 gün → 12 May 2026** (3 May 2026 owner kararı)

### 2.3 8 Donmuş Karar (23 Nis Aslan onaylı, 11 May - 25 May arası geçerli)
1. Bordro DataSource: Sadece kiosk ✅
2. Bordro DRY_RUN (May 31'e kadar) ✅
3. Skor sıfırlama: **11 May Pazar 22:30** (`launch-reset.sql`) ✅
4. Skor banner pilot ilk hafta ✅
5. Personel rotasyon YASAK ✅
6. Mola eşiği 90 → 120 dk (geçici, **19 May'dan sonra 90 dk**) ✅
7. Yeni modül/rol/branch YASAK pilot süresince ✅
8. GPS manuel bypass + supervisor PIN audit ✅

---

## 3. Bütünsel Dalga Planı (Wave A/B/C/D)

### 🌊 WAVE A — Pilot Day-1 Öncesi Acil (3 May → 11 May, 9 gün)

**Hedef:** Pilot Day-1 GO için olmazsa olmazlar. Aynı anda 3 paralel isolated agent.

| # | İş | Süre | Mode | Sorumlu | Bağımlılık |
|---|---|---|---|---|---|
| **W-A1** | F33 kalan 5 sayfa guard sarımı (`/personel/:id`, `/egitim/:id`, `/personel-onboarding-akisi`, `/icerik-studyosu`, `/duyurular`) | 1.5h | Plan + isolated agent | Replit Agent | Yok |
| **W-A2** | Skill MD batch update (`dospresso-roles-and-people` F36 + supervisor overtime + Bundle 7) | 30dk | Build (DOCS) | Replit Agent | Yok |
| **W-A3** | Bundle 1B — 13 eksik tablo + bağlı 3 unique + 23 idx + 19 FK (drift 58→0) | 4h | Plan + isolated agent (DB-write seed) | Replit Agent | Yok |
| **W-A4** | Eğitim materyali son hali (Sema + Eren + Aslan kendileri) | ~15h | Build (manuel) | Owner ekibi | Outline ✅ hazır |
| **W-A5** | Pilot kullanıcı listesi doldurma (`docs/PILOT-USER-LIST-2026-05.md`) | 30dk | Build (owner) | Aslan + Eren | Owner verisi |
| **W-A6** | Smoke test 4 birim son re-test (PILOT_PRE_DAY1_TEST_2026_05_11) | 2h | Manuel | Owner + Replit | Day-0 (11 May) |

**Owner aksiyonu (1 kez):** Plan moduna geç → W-A1, W-A2, W-A3 paralel onayla → 1 hafta sonra hepsi merge'e hazır.

**NO-GO eğer:** W-A1 başarısız (5 sayfa hâlâ guard'sız), W-A3 başarısız (drift 58'de kalırsa Bundle 1B), W-A4 eksik (eğitim materyali yok), W-A5 boş (pilot kullanıcı tanımsız).

---

### 🌊 WAVE B — Pilot Hafta 1 (12 May → 18 May, 7 gün)

**Hedef:** Pilot çalışırken kritik veri bütünlüğü ve mevzuat işleri. Aynı anda 2 paralel isolated agent.
**Politik kural:** P0/P1 incident olursa Wave B durur, hot-fix moduna geç.

| # | İş | Süre | Mode | Bağımlılık |
|---|---|---|---|---|
| **W-B1** | F22 — factory-f2 stok stub kaldır (üretim planlama gerçek envanter) | 3h | Plan + isolated agent | Yok |
| **W-B2** | F24 — Reçete versiyon → etiket revize otomasyonu (gıda mevzuat) | 5h | Plan + isolated agent | Yok |
| **W-B3** | F27 — getPositionSalary null guard + alarm (sessiz bordro fail önleme) | 1.5h | Plan + isolated agent | Yok |
| **W-B4** | F14 — PDKS classifyDay 30dk yuvarlama düzelt (mesai kaybı önleme) | 1.5h | Plan + isolated agent | Yok |
| **W-B5** | Pilot Day-1 gün sonu rapor + incident review (her gün) | 1h/gün | Manuel | Owner |

---

### 🌊 WAVE C — Pilot Hafta 2-3 (19 May → 1 Jun, 14 gün)

**Hedef:** Bundle T-300 serisi + finansal parametre ve hesap-mantık iyileştirme. Aynı anda 2 paralel isolated agent.

| # | İş | Süre | Mode | Bağımlılık |
|---|---|---|---|---|
| **W-C1** | F29 — KDV oranlarını parametrik yap (gıda %1/%10 doğru) | 2h | Plan + isolated agent | Yok |
| **W-C2** | F30 — Fabrika saatlik ücreti `factory_cost_settings`'den oku | 2h | Plan + isolated agent | Yok |
| **W-C3** | F31 — Döviz kuru handling (TRY varsayımı kaldır) | 4h | Plan + isolated agent | Yok |
| **W-C4** | T-312 — RBAC bundle (F02, F05, F06, F13, F16) | 6h | Plan + isolated agent | Yok |
| **W-C5** | T-315 — Recipe-cost bundle (F21, F23, F27 — F27 zaten W-B3'te) | 4h | Plan + isolated agent | W-B3 bittikten sonra |
| **W-C6** | T-316 — UX-Dashboard bundle (F04, F18, F34) | 4h | Plan + isolated agent | Yok |

---

### 🌊 WAVE D — Sprint 3 Sonu / Sprint 4 Başı (post-pilot, ~30 May+)

**Hedef:** Mimari borç + büyük yapısal işler. Sprint 4'e devredilebilir.

| # | İş | Süre | Mode | Bağımlılık |
|---|---|---|---|---|
| **W-D1** | B1 — HQ kiosk PIN bcrypt + lockout + audit (post-pilot kritik güvenlik) | 4.5h | Plan + isolated agent | Pilot Day-30 sonrası |
| **W-D2** | B3 — İzin/rapor/ücretsiz izin bakiye sistemi tam | 12h | Plan + isolated agent | Pilot Day-14 sonrası |
| **W-D3** | B5 — Fabrika üretim MVP (S1+S2) implementasyon | 6-10h | Plan + isolated agent | Pilot stabilize sonrası |
| **W-D4** | B6 — Reçete + besin + alerjen + etiket sistemi tam (B6) | 16-24h | Plan + isolated agent | W-B2 (F24) sonrası |
| **W-D5** | **B21 — 9 paralel rol mekanizması konsolidasyonu (BÜYÜK MİMARİ)** | 20-30h | Plan + isolated agent | Pilot stabilize sonrası |
| **W-D6** | B22 — manifest-auth fail-open düzelt | 4h | Plan + isolated agent | B21 sonrası |
| **W-D7** | Comprehensive ek tarama (CRM/Notification/Mr.Dobody) | 8h | DOCS-ONLY | Pilot Day-30 sonrası |
| **W-D8** | B10 — OpenAI aylık harcama tavanı + uyarı | 3-4h | Plan + isolated agent | Pilot Day-14 sonrası |
| **W-D9** | B17 — Login lockout DB'ye taşı | 3h | Plan + isolated agent | Yok |
| **W-D10** | B18 — TEST-MATRIX 31 role genişletme | 4h | DOCS-ONLY | Yok |
| **W-D11** | B20 — KVKK audit + iyileştirme | 6h | DOCS-ONLY → Plan | Yok |

---

## 4. Sprint 3 Toplam Tahmin

| Wave | İş Sayısı | Süre | Mode | Tarih |
|---|---|---|---|---|
| Wave A | 6 | 23h (paralel ~9 gün) | Plan + Build | 3 May → 11 May |
| Wave B | 5 | 11h (paralel ~7 gün) | Plan | 12 May → 18 May |
| Wave C | 6 | 22h (paralel ~14 gün) | Plan | 19 May → 1 Jun |
| Wave D | 11 | 80-100h | Plan + DOCS | Post-pilot ~30 May+ |
| **TOPLAM** | **28 iş** | **~140h** | – | **3 May → ~30 Haz (8 hafta)** |

---

## 5. Çalışma Modeli (Net Sözleşme)

### 5.1 Roller
| Rol | Yapar | Yapmaz |
|---|---|---|
| **Aslan (Owner)** | GO/NO-GO, Replit chat, GitHub UI (PR merge), saha | Kod, DB write, döküman yazma |
| **Claude** | MD/plan/audit yaz, **local commit + GitHub push**, Replit prompt hazırla, sürekli MD tarama, durum raporu | Replit chat ile direkt konuşma, DB write, runtime test |
| **Replit Agent** | Kod, DB, build, test, deploy, isolated paralel agent | Push (workflow scope sorunu), karar, plan |

### 5.2 İletişim Akışı
```
Aslan → Claude: "X istiyorum" / "Replit cevabı bu"
Claude → Plan/MD/karar yazar, local commit
Claude → GitHub'a push
Claude → Aslan'a 2 link verir: branch + PR URL
Aslan → GitHub UI'dan PR merge
Claude → Replit için prompt yazar (uygulama varsa)
Aslan → Promptu Replit chat'e yapıştırır
Replit → Cevap üretir
Aslan → Replit cevabını Claude'a iletir
Claude → Değerlendirir, sıradaki adım
```

### 5.3 İletişim Standardı (Her Claude mesajı)
```
🎯 ŞU AN: [konu, 1 cümle]
✅ SENİN ADIMIN: [tek tek, sırayla]
❓ BANA LAZIM: [bilgi/onay/karar]
⏳ SONRAKİ: [bu adım bitince]
```

### 5.4 Kurallar
1. **Token, şifre, hassas veri sohbete YAZMA** — kaçınılmazsa işten hemen sonra iptal
2. **Bir seferde tek karar/adım**
3. **Her büyük commit sonrası MD/skill update** (otomatik sorumluluk)
4. **Replit Agent push yapamaz** → Claude push yapar (yetkili token ile)
5. **Anlamadığım konuyu sorarım** — bilgisiz tahmin etmem
6. **Force push YASAK** — `replit.md` L13 + user preference

### 5.5 Replit Prompt Şablonu
```
MODE: [PLAN/BUILD/DOCS-ONLY/READ-ONLY]
TASK: [tek cümle hedef]
CONTEXT: [neden, hangi dosya/karar/audit referansı]
ACCEPTANCE: [bittiğinde ne görmek istiyoruz]
RISK: [neye dikkat]
ESTIMATED: [süre]
```

### 5.6 Risk Bayrakları
- 🟢 **Güvenli** — DOCS, test, audit (Claude tek başına)
- 🟡 **Orta** — Kod refactor, küçük endpoint (Replit + Claude)
- 🔴 **Yüksek** — DB write, schema, kritik akış (Replit isolated + 2 imza Aslan onayı)

---

## 6. Pilot Day-1 (12 May 2026) Plan

### 6.1 Tarih Çizelgesi

| Tarih | Gün | İş | Sorumlu |
|---|---|---|---|
| 3-10 May | – | Wave A paralel çalışır (W-A1, W-A2, W-A3) | Replit |
| 8 May | Cuma | **İlk smoke test (50/55 eşiği)** | Tüm ekip |
| 9 May | Ctesi | Yavuz vardiya planı (12 May - 18 May) | Yavuz |
| 10 May | Pazar | **İkinci smoke test + final check** | Tüm ekip |
| 11 May | Pzt 22:30 | Launch-reset çalıştır | Replit |
| 12 May | Pzt 08:00 | adminhq parola rotasyon | adminhq |
| **12 May** | **Pzt 09:00** | 🚀 **PİLOT GO-LIVE** | **Tüm ekip** |
| 18 May | Pzt | Pilot 1. hafta değerlendirme | Aslan + ekip |
| 19 May | Salı | Skor banner kalkar, 90dk mola döner | Sistem |

### 6.2 GO/NO-GO Koşulları (Aslan imzalı)
1. **HQ kiosk plaintext PIN risk kabulü** (md. 14, post-pilot W-D1)
2. **Pilot Day-1 izin akışı** manuel/Excel (W-D2 post-pilot)
3. **Fabrika üretim modülü Day-1 minimal** (W-B1 + W-D3)
4. **Tüm Wave A işleri merge** (W-A1 + W-A2 + W-A3 + W-A5)

---

## 7. Açık Riskler (Pilot Süresince İzlenecek)

| # | Risk | Olasılık | Etki | Mitigasyon |
|---|---|---|---|---|
| R1 | F22 üretim stok yanlış | Orta | Yüksek | W-B1 acil fix |
| R2 | F24 etiket mevzuat ihlali | Düşük | Yüksek | W-B2 + Sema manuel kontrol |
| R3 | F27 bordro üretmez sessiz | Düşük | Yüksek | W-B3 + Mahmut izleme |
| R4 | F29 KDV beyanname yanlış | Orta | Orta | W-C1 + Mahmut Excel kontrol |
| R5 | Operasyonel (kiosk açılmaz, Wi-Fi) | Yüksek | Orta | Cheat sheet + destek hattı |
| R6 | İnsan ('0000' parola unutulur) | Yüksek | Düşük | mustChangePassword gate ✅ |
| R7 | Teknik (PDKS sync edge case) | Düşük | Orta | Bundle 4 ✅ ile azaltıldı |

---

## 8. Sprint 3 Çıktısı Beklentisi

### Pilot Day-1 (12 May) için
- ✅ 36 finding'in 21'i kapatılmış (Bundle 1A-7 + Wave A)
- ✅ DB drift 0 (Bundle 1B sonrası)
- ✅ F33 13/13 sayfa guard
- ✅ PIN coverage %100
- ✅ pg_dump günlük backup
- ✅ Skill MD'ler güncel
- ✅ Eğitim materyali hazır

### Pilot Day-30 (~12 Jun) sonu için
- ✅ Wave A + B + C tamam (17 iş)
- ✅ 36 finding'in 30+'ı kapatılmış
- ✅ Tüm pilot hafta 1 + 2-3 işleri kapanmış
- ✅ Sprint 4 hazır (Wave D başlar)

---

## 9. Sprint 3 Sonrası (Sprint 4 — ~Haziran)

- W-D1 → W-D11 (mimari borç + büyük yapısal işler)
- B21 (9 mekanizma konsolidasyonu) Sprint 4 ana iş
- Comprehensive CRM/Notification/Mr.Dobody audit
- Pilot kapsam genişletme (16 hazırlık şubesi)

---

## 10. Referanslar

| Konu | Dosya |
|---|---|
| Karar arşivi | `docs/DECISIONS.md` |
| Sprint 2 backlog (eski) | `docs/audit/sprint-2-master-backlog.md` |
| Comprehensive findings | `docs/audit/comprehensive-2026-05/findings-raw.md` |
| Wave plan (eski) | `docs/SPRINT-2-WAVE-PLAN.md` |
| Pilot Day-1 checklist | `docs/PILOT-DAY1-CHECKLIST.md` |
| Pilot kullanıcı listesi | `docs/PILOT-USER-LIST-2026-05.md` |
| Test matrisi | `docs/TEST-MATRIX.md` |
| Çalışma protokolü | `docs/COLLABORATION-PROTOCOL.md` |
| Agent ownership | `docs/AGENT-OWNERSHIP.md` |
| Plan dosyaları | `docs/plans/` |
| Runbook'lar | `docs/runbooks/` |

---

**Bu plan owner Aslan tarafından 3 May 2026 onaylanmıştır.**
**Sıradaki revizyon:** Pilot Day-7 (19 May 2026) — Wave A retrospektif + Wave B mid-sprint review.
