# DOSPRESSO — Sprint 2 Bütünsel Dalga Planı (Wave Plan)

> **Amaç:** Sprint 2'nin 20 işini (B1-B20) tek tek değil, **paralel dalga**lar halinde, bağımlılıkları net şekilde çalıştırmak.
> **Felsefe:** İsolated task agent'lar paralel çalışır → 3-4 iş aynı anda merge'e hazır olabilir. Tek tek owner GO bekleyip 1-1 ilerlemek pilot Day-1'i geciktirir.
> **Tarih:** 2 May 2026 — Pilot Day-1: _______ (Owner D1 kararı bekliyor; öneri: 9 May 2026 = T+7 gün)

---

## 1. Mevcut Durum Özet

| Alan | Durum | Not |
|---|---|---|
| **Pilot Day-1 hedef** | _______ | Owner kararı yok, öneri: 9 May 2026 |
| **Sprint 2 toplam iş** | 20 (B1-B20) | ~75-90 saat tahmini |
| **MERGED** | 4 task (#272 güvenlik, #273 SA atomic, #274 parola gate, #277 E2E test) | Sprint 2'nin %20'si |
| **IN_PROGRESS** | 1 task (#276 pdks_daily_summary) | B11 |
| **Plan hazır, GO bekliyor** | 4 plan (B1 HQ kiosk, B2 SA fix, B3 izin, B5 fabrika) | Owner GO |
| **Plansız (sadece backlog satır)** | 11 iş (B4, B6-B10, B13-B20) | Plan ya da direkt task delegate |
| **Aktif task agent kapasitesi** | 1 anda max ~3-4 paralel | Replit isolated environment |

---

## 2. Bağımlılık Haritası (Dependency Graph)

```
┌─────────────── ACİL (Pre-Day-1, T-7→T-1) ───────────────┐
│                                                          │
│   I1 (G1+G2 AUTH fix) ─┐                                │
│                        ├─→ Pilot Day-1 GO                │
│   B16 (pg_dump cron) ──┤                                │
│                        │                                 │
│   B14 (ROLE_MODULE_DEFAULTS 16 rol) ──┘                 │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌─────────────── KRİTİK (Day-1 → Day-7) ──────────────────┐
│                                                          │
│   B11 (pdks_daily_summary) #276 IN_PROGRESS             │
│   B17 (login lockout DB) ─→ multi-instance scale öncesi │
│   B19 (legacy rol denetim) ─→ B14 sonrası               │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌─────────────── ORTA (Day-7 → Pilot sonu) ───────────────┐
│                                                          │
│   B1 (HQ kiosk PIN bcrypt) — plan hazır                 │
│   B2 (SA refactor utility) — plan hazır                 │
│   B3 (izin bakiye) — plan hazır                         │
│   B5 (fabrika MVP S1+S2) — plan hazır                   │
│   B15 (scheduler advisory lock)                         │
│   B18 (TEST-MATRIX 31 role genişletme)                  │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌─────────────── DÜŞÜK (Post-pilot) ──────────────────────┐
│                                                          │
│   B4 (PDKS Excel import iyileştirme)                    │
│   B6 (Mr. Dobody open)                                  │
│   B7-B10 (CRM, Akademi, finansal raporlar)              │
│   B13 (public endpoint sertleştirme)                    │
│   B20 (KVKK audit)                                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 3. ÖNERİLEN — 3 DALGA PLANI (Wave A/B/C)

### 🌊 WAVE A — Pre-Day-1 Acil (T-7 → T-1, ~5 iş, paralel)

**Hedef:** Pilot Day-1 GO için olmazsa olmazlar.
**Süre:** 1 hafta, 3 paralel task agent
**Paralel başlat:** 3 task aynı anda

| # | İş | Tahmini | Mode | Sorumlu | Bağımlılık |
|---|---|---|---|---|---|
| **W-A1** | I1 — G1+G2 AUTH fix (delegation-routes 5 + module-content-routes 5) | 1.5 saat | Plan + isolated agent | Replit Agent | Yok |
| **W-A2** | B16 — pg_dump cron + S3 upload + restore playbook | 4 saat | Plan + isolated agent | Replit Agent | Yok |
| **W-A3** | B14 — ROLE_MODULE_DEFAULTS 16 eksik rol | 2 saat | Plan + isolated agent (DB-write seed) | Replit Agent | Yok |
| **W-A4** | Eğitim materyali üretim | ~15 saat | Build (Sema/Eren/Aslan kendileri) | Owner ekibi | Outline ✅ hazır |
| **W-A5** | Pilot kullanıcı listesi doldurma | ~2 saat | Build (owner) | Aslan + Eren | Owner verisi |

**Owner aksiyonu (1 kez):** Plan moduna geç, yukarıdaki 3 task'i paralel onayla → 1 hafta sonra hepsi merge'e hazır.

**NO-GO eğer:** W-A1 başarısız (G1+G2 AUTH açık), W-A2 başarısız (DR yok), W-A4 eksik (eğitim yok), W-A5 boş (kim pilot bilinmiyor).

---

### 🌊 WAVE B — Day-1 → Day-14 (Pilot süresince hot-fix + sertleştirme, ~6 iş)

**Hedef:** Pilot çalışırken paralel iyileştirme. Pilot kullanıcı bildirimi düşükse devam, P0/P1 olursa Wave B durur, hot-fix'e geç.
**Süre:** 2 hafta, 2-3 paralel task agent
**Paralel başlat:** 2 task aynı anda

| # | İş | Tahmini | Mode | Bağımlılık |
|---|---|---|---|---|
| **W-B1** | B11 #276 — pdks_daily_summary sync | 2 saat | Build (IN_PROGRESS) | Yok |
| **W-B2** | B17 — login lockout DB taşı | 3 saat | Plan + agent | DB write |
| **W-B3** | B19 — legacy rol denetim + temizlik | 2 saat | Plan + agent | W-A3 (B14) sonrası |
| **W-B4** | B15 — scheduler advisory lock (multi-instance hazır) | 3 saat | Plan + agent | Yok |
| **W-B5** | B18 — TEST-MATRIX 31 role genişletme | 4 saat | Build (DOCS) | Yok |
| **W-B6** | B13 — public endpoint sertleştirme | 3 saat | Plan + agent | Yok |

**Owner aksiyonu:** Day-1 sonrası retro toplantısında Wave B önceliklerini gözden geçir, sıralama Pilot kullanıcı feedback'ine göre güncellenebilir.

---

### 🌊 WAVE C — Post-Pilot (Day-30+, ~9 iş)

**Hedef:** Pilot başarılı bittikten sonra rollout için iyileştirmeler. Pilot bittiğinde ne öğrendiğimize göre sıralama değişir.
**Süre:** 4-6 hafta
**Paralel başlat:** 2-3 task

| # | İş | Tahmini | Bağımlılık |
|---|---|---|---|
| **W-C1** | B1 — HQ kiosk PIN bcrypt + lockout | 4.5 saat | Plan ✅ hazır |
| **W-C2** | B2 — SA endpoint refactor (ortak utility) | 6 saat | Plan ✅ hazır |
| **W-C3** | B3 — izin bakiye sistemi | 8 saat | Plan ✅ hazır |
| **W-C4** | B5 — fabrika MVP S1+S2 | 12 saat | Plan ✅ hazır |
| **W-C5** | B4 — PDKS Excel import iyileştirme | 4 saat | — |
| **W-C6** | B6 — Mr. Dobody pilot mode aç | 2 saat | Pilot Day-3 sonrası |
| **W-C7** | B7-B10 — CRM/Akademi/Finansal/Notification iyileştirme | ~15 saat | — |
| **W-C8** | B20 — KVKK uyumluluk audit | 6 saat | — |
| **W-C9** | Mobile responsive son rötuş | 4 saat | Pilot mobile feedback sonrası |

---

## 4. PARALEL ÇALIŞMA STRATEJİSİ

### 4.1 Aynı Anda Çalışabilen İşler (Wave A örneği)

**Paralel grup 1 (Hafta T-7 başlangıcı):**
- W-A1 (G1+G2 AUTH fix) — `server/routes/delegation-routes.ts` + `server/routes/module-content-routes.ts`
- W-A2 (pg_dump cron) — `scripts/backup/`, `package.json` script ekleme
- W-A3 (ROLE_MODULE_DEFAULTS) — `migrations/00NN_role_module_defaults.sql`

→ **3 farklı dosya seti, 0 çakışma riski**, 3 isolated task agent paralel çalışır.

**Paralel grup 2 (Hafta T-3 başlangıcı):**
- W-A4 (Eğitim materyali) — Owner ekibi (Sema PDF, Eren video, Aslan tanıtım)
- W-A5 (Pilot kullanıcı listesi) — Owner doldurur

→ Owner ekibi paralel, agent gerekmez.

### 4.2 Çakışma Olabilecek İşler (Sıralı)

- B14 → B19: B14 önce (yeni roller eklenir), sonra B19 (legacy temizlik)
- B11 → B2: B11 (pdks_daily_summary) önce çözülmeli, B2 (SA refactor) sonra
- B17 → B15: B17 (login lockout DB) ve B15 (scheduler advisory lock) ikisi de DB schema değişikliği — ama farklı tablolar, paralel olabilir

### 4.3 Hot-fix Önceliği

Pilot Day-1 sonrası bir P0 incident olursa:
1. Tüm Wave B çalışan task agent'lar **DURDURULUR**
2. Hot-fix tek odaklanma → 1 task agent + Replit Agent (build modunda)
3. Hot-fix merge → Wave B yeniden başlar

---

## 5. KRİTİK EKSİKLER (Bütünsel Resim)

### 5.1 Teknik Eksikler (Pilot Day-1 NO-GO Riski)

| # | Eksik | Etki | Çözüm | Sorumlu |
|---|---|---|---|---|
| **T1** | **G1+G2 AUTH bug** — 10 endpoint anonim erişim | KRİTİK güvenlik | W-A1 | Replit Agent |
| **T2** | **pg_dump cron yok** — DR seviye 5 çalışmaz | KRİTİK veri kaybı | W-A2 | Replit Agent |
| **T3** | **ROLE_MODULE_DEFAULTS eksik 16 rol** | 16 rol yanlış modül erişimi | W-A3 | Replit Agent |
| **T4** | **Login lockout in-memory** — multi-instance scale'de bypass | Orta (pilot tek instance OK) | W-B2 | Replit Agent |
| **T5** | **Scheduler advisory lock yok** — multi-instance scale'de duplikasyon | Orta (pilot tek instance OK) | W-B4 | Replit Agent |

### 5.2 Operasyonel Eksikler (Pilot Day-1 Etkin Kullanım)

| # | Eksik | Etki | Çözüm | Sorumlu |
|---|---|---|---|---|
| **O1** | **Pilot kullanıcı listesi boş** | Day-1'de kim hangi rolde belli değil | W-A5 (template hazır) | Owner |
| **O2** | **Pilot Day-1 tarihi belirsiz** | Tüm planlama buna bağlı | D1 kararı | Owner |
| **O3** | **WhatsApp pilot grubu kurulmadı** | İletişim kanalı yok | T-7 günde kurulum | Owner |
| **O4** | **Neon point-in-time test edilmedi** | DR seviye 4 belirsiz | 1 saat test | Owner |
| **O5** | **Eren + Aslan rollback drill yok** | İncident anında karışıklık | 1 saatlik prova | Owner + Eren |

### 5.3 Kullanıcı/Eğitim Eksikleri (Pilot Day-1 Bilgi Eksikliği)

| # | Eksik | Etki | Çözüm | Sorumlu |
|---|---|---|---|---|
| **K1** | **Genel kullanım kılavuzu PDF** | Kullanıcı sisteme nasıl gireceğini bilmiyor | Outline ✅ hazır, içerik gerek | Sema |
| **K2** | **Kiosk PDKS rehber PDF + video** | Vardiya çalışanı kafası karışık | Outline ✅ hazır | Eren |
| **K3** | **Pilot tanıtım video (90 sn)** | "Neden bu sistem?" sorusu cevapsız | Outline ✅ hazır | Aslan |
| **K4** | **Day-1 sözlü brif planı yok** | Sabah eksik kalanlar için tampon | 1 sayfa kart | Aslan |

### 5.4 Mevzuat/Hukuk Eksikleri

| # | Eksik | Etki | Çözüm | Sorumlu |
|---|---|---|---|---|
| **M1** | **KVKK uyumluluk denetim eksik** | Yasal risk (orta) | W-C8 (B20) | Owner + hukuk danışman |
| **M2** | **WhatsApp grup KVKK onay metni yok** | Pilot kullanıcı yazılı onay vermeli | 1 sayfa onay metni | Owner |
| **M3** | **Veri saklama süresi politikası yok** | Eski PDKS/CRM verisi ne kadar tutulacak? | Owner kararı | Owner |
| **M4** | **Müşteri verisi (CRM) export politikası yok** | Müşteri "verimi sil" derse ne yapılır? | KVKK madde 11 | Owner + hukuk |

### 5.5 Test/Kalite Eksikleri

| # | Eksik | Etki | Çözüm | Sorumlu |
|---|---|---|---|---|
| **Q1** | **TEST-MATRIX 13 rol kapsıyor, 31 rol için eksik** | 18 rol smoke test yok | W-B5 (B18) | Replit Agent |
| **Q2** | **E2E test sadece kiosk shift-end** | Diğer kritik akışlar test'siz | Pilot sonrası genişlet | Replit Agent |
| **Q3** | **Performance test yok** | Yük altında nasıl davrandığı belirsiz | Pilot sonrası | Replit Agent |
| **Q4** | **Security pen-test yok** | Bilinen güvenlik açıkları kapatıldı, bilinmeyen var mı? | Pilot sonrası external | Owner |

---

## 6. ÖNERİLER (Sıralı)

### 6.1 Hemen (Bugün-Yarın)

1. **Owner D1 kararı** — Pilot Day-1 tarihi (öneri: 9 May 2026 = T+7)
2. **Owner D2 kararı** — Pilot kullanıcı listesi → `PILOT-USER-LIST-2026-05.md` doldur
3. **Owner Plan moduna geç** — Wave A'nın 3 task'ini paralel başlat (W-A1 + W-A2 + W-A3)
4. **Owner WhatsApp grup kur** — T-7 günde kurulumun ilk adımı

### 6.2 Bu Hafta (T-7 → T-1)

5. **Wave A çalışırken paralel:** Eğitim materyali üretimi (Sema/Eren/Aslan)
6. **T-3 günde:** Tüm materyaller WhatsApp'ta paylaşılır
7. **T-1 günde:** Final hazırlık checklist (PILOT-DAY1-CHECKLIST üzerinden)

### 6.3 Pilot Süresince (Day-1 → Day-30)

8. **Wave B paralel başlat** — P0/P1 olmazsa Day-3'ten itibaren
9. **Günlük retro** — Day-1 ilk hafta saat 22:00 mini anket
10. **Haftalık retro** — Pazar 18:00 30-45 dk

### 6.4 Post-Pilot (Day-30+)

11. **Wave C başlat** — Pilot başarılıysa (KPI: %X kullanım, %Y memnuniyet)
12. **Rollout planı** — Wave C bitince genel açılış (~50+ kullanıcı)
13. **Sprint 3 planlama** — Wave C sonrası yeni döngü

---

## 7. ZAMAN ÇİZELGESİ (Önerilen)

```
T-7 (Bugün, 2 May) ─→ Owner Plan moduna geç, Wave A başlat
T-6 (3 May)        ─→ Eğitim materyali üretim başlangıç
T-5 (4 May)        ─→ Wave A 3 task'in 1'i merge'e hazır olabilir
T-4 (5 May)        ─→ Wave A tüm task merge, eğitim materyali %50
T-3 (6 May)        ─→ Eğitim materyali %100, WhatsApp dağıtımı
T-2 (7 May)        ─→ Pilot kullanıcı "okudum" onayları
T-1 (8 May)        ─→ Final hazırlık + rollback drill
DAY-1 (9 May)      ─→ 🚀 PİLOT BAŞLAR
Day-1 → Day-7      ─→ Yoğun monitoring, hot-fix, daily mini retro
Day-7 → Day-14     ─→ Wave B paralel başlat (P0/P1 yoksa)
Day-14 → Day-30    ─→ Wave B devam, haftalık retro
Day-30+            ─→ Pilot retro, Wave C başlat veya pilot uzat
```

---

## 8. METRİK / BAŞARI KRİTERİ

| Wave | Başarı Kriteri | Ölçüm |
|---|---|---|
| **Wave A** | 3 task MERGED + eğitim ✅ + kullanıcı listesi ✅ | T-1 günü tüm checkbox işaretli |
| **Wave B** | 6 task MERGED, 0 P0, max 3 P1 | Day-14 retro |
| **Wave C** | 9 task MERGED, pilot KPI %80+ memnuniyet | Day-60 retro |

---

## 9. RİSK YÖNETİMİ

| Risk | Olasılık | Etki | Tampon |
|---|---|---|---|
| Wave A 1 task gecikme | Orta | Day-1 ertelenir | T-3 günde durum kontrolü, gecikirse Day-1 +3 gün ertele |
| Eğitim materyali yetişmez | Düşük | Day-1 NO-GO | T-3'te yarı hazırsa sözlü brif tampon, Day-1 yine yapılır |
| Pilot Day-1 P0 incident | Orta | Wave B durur | ROLLBACK-PLAN seviye 1-3 hazır, 5 dk içinde geri dönüş |
| Owner ChatGPT/Claude tekrar açar | Düşük | Divergence | Lessons-learned doc'unda K4 kuralı net, push pending takip |
| Pilot kullanıcı düşük katılım | Orta | Pilot uzatılır | İletişim plan + günlük retro ile motivasyon |

---

## 10. İLİŞKİLİ DOKÜMANLAR

- `docs/SPRINT-LIVE.md` — Aktif sprint, bu plan SPRINT-LIVE'a referansla
- `docs/audit/sprint-2-master-backlog.md` — B1-B20 detay
- `docs/audit/system-multi-perspective-evaluation-2026-05-02.md` — Çok perspektifli audit
- `docs/audit/agent-lessons-learned-2026-05-02.md` — Agent davranış kuralları (K1-K6)
- `docs/PILOT-DAY1-CHECKLIST.md` — Day-1 GO/NO-GO
- `docs/PILOT-DAY1-ROLLBACK-PLAN.md` — İncident response
- `docs/PILOT-USER-LIST-2026-05.md` — Pilot kullanıcı template
- `docs/PILOT-COMMUNICATION-PLAN.md` — İletişim plan
- `docs/PILOT-EGITIM-MATERYALI-OUTLINES.md` — Eğitim outline

---

> **Bu dalga planı canlıdır. Owner D1 kararı sonrası tarihler güncellenir, Wave A başladığında ilerlemeler bu dökümana yansır.**
