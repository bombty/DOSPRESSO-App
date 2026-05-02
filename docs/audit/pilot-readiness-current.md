# PİLOT READINESS — GÜNCEL DURUM RAPORU

Replit Agent gözünden DOSPRESSO pilot Day-1 hazırlık durum tespiti.

Rapor tarihi: 2 Mayıs 2026  
Hazırlayan: Replit Agent (READ-ONLY analiz + mevcut docs derleme)  
Kapsam: Sprint 1 — Personel + Kiosk + PDKS Pilot Hazırlığı  
Pilot Day-1 hedef tarihi: **owner ile netleşecek**

---

## 1. YÖNETİCİ ÖZETİ

| Kategori | Durum | Yorum |
|---|---|---|
| **Personel altyapısı** | 🟢 HAZIR | Excel import + PIN seed tamam, 4 birim test geçti |
| **Kiosk + PDKS akışı** | 🟢 HAZIR (1 bilinen risk) | Branch + Factory bcrypt ile güvenli; HQ kiosk plaintext (kabul edilen risk) |
| **Mission Control dashboard** | 🟢 HAZIR | mudur (11), supervisor (12), fabrika_mudur (10) widget pilot için optimize |
| **Reçete + besin onayı** | 🟢 HAZIR | CEO + gida_muhendisi + sef + fabrika_mudur rolleri DECISIONS md. 19-23 ile uyumlu |
| **Dokümantasyon** | 🟢 HAZIR | TEST-MATRIX, 4 runbook, 2 plan, Day-1 checklist, incident log template |
| **DB sağlığı** | 🟢 HAZIR | drift = 0, baseline migration uygulandı |
| **Açık teknik borç** | 🟡 KABUL EDİLEN RİSK | shift_attendance check_out NULL (kayıt bütünlüğü, maaş etkilemez) |
| **Açık güvenlik riski** | 🟡 KABUL EDİLEN RİSK | HQ kiosk plaintext PIN (post-pilot fix planlı) |
| **İzin/rapor altyapısı** | 🔴 EKSİK | Pilot Day-1'de izin akışı kullanılacaksa risk var |
| **Fabrika üretim modülü** | 🔴 MVP EKSİK | Eren'in Day-1 kullanım kapsamı netleşmedi |

### GO/NO-GO Sonuç

🟢 **GO ÖNERİLİR — koşullu** — Aşağıdaki şartlar sağlanırsa:

1. **HQ kiosk plaintext PIN risk kabulü** owner imzalı (md. 14, post-pilot fix planlanır)
2. **shift_attendance NULL bug risk kabulü** owner imzalı (md. 15, plan hazır, post-pilot fix opsiyonel)
3. **Pilot Day-1 izin akışı** kullanılmayacaksa veya manuel (Excel) yürütülecekse
4. **Fabrika üretim modülü Day-1 kapsamı** owner tarafından minimal/read-only olarak sınırlanmışsa

---

## 2. TAMAMLANANLAR (Detay)

### Altyapı + DB (1-8 maddeler — Sprint 1 başlangıç)
- ✅ Personel import (Excel → DB, Phase 1)
- ✅ PIN cleanup (eski/test PIN'ler silindi)
- ✅ PIN seed (aktif personel için bcrypt hash'li PIN'ler `branch_staff_pins` + `factory_staff_pins`)
- ✅ HQ kiosk akışı kuruldu (⚠️ plaintext PIN ile, bilinen kabul risk)
- ✅ Işıklar şubesi PIN-mode geçişi
- ✅ Backend kiosk güvenlik yamaları
- ✅ 4 birim kiosk uçtan uca test (Işıklar/Lara/Fabrika/HQ, `PILOT_PRE_DAY1_TEST_2026_04_29` notu)
- ✅ GitHub hassas dosya cleanup (current tracking, history rewrite YAPILMADI — md. 18)

### Reçete + Besin Onay (9-10 maddeler — DECISIONS md. 19-23)
- ✅ CEO/Aslan reçete tam yetki (CRUD + onay)
- ✅ gida_muhendisi besin/alerjen/gramaj yetkisi
- ✅ sef reçete edit YOK, üretim takip VAR
- ✅ fabrika_mudur read-only
- ✅ CEO nutrition approval düzeltmesi (`APPROVAL_ROLES` listesine `ceo` eklendi)

### Backend Stabilite (11 madde)
- ✅ `/api/...` 404 fallback JSON döner (Vite HTML fallback yerine)

### Dokümantasyon (12-16 maddeler — 2 May 2026)
- ✅ `docs/TEST-MATRIX.md` — 13 rol smoke test (161 satır)
- ✅ `docs/runbooks/db-write-protocol.md` — DB write protokolü (126 satır)
- ✅ `docs/runbooks/kiosk-pdks-test.md` — 4 birim kiosk test akışı (211 satır)
- ✅ `docs/runbooks/git-security-cleanup.md` — Git güvenlik (228 satır)
- ✅ `docs/runbooks/recipe-label-workflow.md` — Reçete + etiket workflow (184 satır)
- ✅ `docs/plans/hq-kiosk-pin-security.md` — HQ PIN bcrypt refactor planı (~250 satır, implementasyon beklemede)
- ✅ `docs/plans/shift-attendance-checkout-fix.md` — Branch+HQ+Factory check-out fix planı (~280 satır, implementasyon beklemede)
- ✅ `docs/PILOT-DAY1-CHECKLIST.md` — Day-1 GO/NO-GO checklist (~200 satır)
- ✅ `docs/PILOT-DAY1-INCIDENT-LOG.md` — Hata günlüğü template (~210 satır)

---

## 3. AÇIK RİSKLER

### 3.1 Kabul Edilen Riskler (Pilot Sonrası Fix)

| # | Risk | Severity | Kabul Mercii | Fix Planı |
|---|---|---|---|---|
| R1 | HQ kiosk plaintext PIN (`branches.ts:4122`) | 🔴 KRİTİK | Owner (md. 14) | `docs/plans/hq-kiosk-pin-security.md` (~4.5 saat) |
| R2 | `shift_attendance.check_out_time` NULL kalır | 🟡 ORTA (audit only, maaş etkisiz) | Owner (md. 15) | `docs/plans/shift-attendance-checkout-fix.md` (~3 saat) |

### 3.2 Pilot Day-1 Öncesi Karar Bekleyen Riskler

| # | Risk | Severity | Karar Bekliyor |
|---|---|---|---|
| R3 | İzin/rapor/ücretsiz izin bakiye sistemi eksik | 🔴 YÜKSEK (Day-1'de personel izin sorabilir) | Owner: Day-1'de izin akışı kullanılacak mı? Yoksa manuel Excel mi? |
| R4 | Fabrika üretim MVP scope belirsiz | 🟡 ORTA | Owner: Eren Day-1'de hangi üretim modülünü kullanacak? Read-only mi, write mı? |
| R5 | Reçete + besin + alerjen + etiket sistemi (Sprint 2) | 🟢 DÜŞÜK (post-pilot) | Owner: Day-1'de sadece mevcut reçete API yeterli mi? |
| R6 | Ay sonu puantaj simülasyonu yapılmadı | 🟡 ORTA | Owner: Day-1 sonrası ay sonu (~30 May) öncesi tampon yeterli mi? |

### 3.3 Bilinen Geçici Davranışlar (Pilot Süresince Kabul)

| # | Davranış | İlgili |
|---|---|---|
| T1 | Reçete detay sayfası nadiren spinner'da kalır → hard refresh çözer | DECISIONS md. 28, T2.1 |

---

## 4. PİLOT ÖNCESİ ZORUNLU İŞLER

### Mutlaka Yapılması Gerekenler (Pre-Day-1)

| # | İş | Süre | Sorumlu |
|---|---|---|---|
| Z1 | DB backup (Day-0 akşamı + Day-1 sabah) | 10 dk | Owner / Replit Agent |
| Z2 | DB drift = 0 doğrulama | 2 dk | Replit Agent |
| Z3 | Workflow `Start application` healthy | 1 dk | Replit Agent |
| Z4 | Tüm pilot kullanıcı login smoke test (TEST-MATRIX) | 30 dk | Owner |
| Z5 | 4 birim kiosk fiziksel kontrol (cihaz + internet + URL) | 15 dk | Birim sorumluları |
| Z6 | Pilot kullanıcı listesi yazdırılması (PIN değeri YAZILMAZ) | 10 dk | Owner |
| Z7 | DAY-1 incident log template'i mobil cihazlarda erişilebilir | 5 dk | Owner |
| Z8 | Replit Agent + Owner Day-1 boyunca canlı destek hazır | — | Owner + Replit |

### Kuvvetle Önerilen (Pre-Day-1, Eğer Vakit Varsa)

| # | İş | Süre | Faydası |
|---|---|---|---|
| O1 | shift_attendance check-out fix implementasyonu | ~3 saat | Day-1 kayıt bütünlüğü temiz |
| O2 | İzin akış kararı (kullanılacak mı?) | 30 dk owner kararı | Belirsizlik kapanır |
| O3 | Fabrika üretim Day-1 scope kararı | 30 dk owner kararı | Eren'in beklentisi netleşir |

### Yapılmaması Gerekenler (Pre-Day-1)

| # | İş | Sebep |
|---|---|---|
| H1 | HQ kiosk PIN bcrypt refactor (R1) | Karar: post-pilot (md. 14). Day-1 öncesi yapılırsa schema değişikliği + seed riski yüksek |
| H2 | Sprint 2 reçete+etiket sistemi | Scope kayması, post-pilot işi |
| H3 | Yeni feature ekleme | Pilot kapsamı dondurulmuş |

---

## 5. PİLOT SONRASI İŞLER (Sprint 2 Backlog)

| # | İş | Plan Dosyası | Süre |
|---|---|---|---|
| P1 | HQ kiosk PIN bcrypt + lockout + audit | `docs/plans/hq-kiosk-pin-security.md` | ~4.5 saat |
| P2 | shift_attendance check-out fix (yapılmadıysa) | `docs/plans/shift-attendance-checkout-fix.md` | ~3 saat |
| P3 | İzin / rapor / ücretsiz izin bakiyeleri | YOK (yazılacak) | TBD |
| P4 | Ay sonu puantaj simülasyonu | YOK | ~2 saat (READ-ONLY simülasyon) |
| P5 | Fabrika üretim MVP | YOK (yazılacak) | TBD |
| P6 | Reçete + besin + alerjen + etiket sistemi | `docs/runbooks/recipe-label-workflow.md` (workflow var, plan yok) | TBD |
| P7 | Pilot Day-5 güvenlik sertleştirme paketi (Task #272) | YOK (Replit propose, owner inceleme) | TBD |
| P8 | Rol Detaylı Rapor PDF (26 Rol) | YOK (Task #259, follow-up) | TBD |

---

## 6. REPLİT GÖZÜNDEN GO/NO-GO

### 🟢 GO Sebepleri

1. **Sistemin temel akışları çalışıyor** — Personel + kiosk + PDKS + dashboard + reçete onay tamam.
2. **Test edilmiş 4 birim** — Pre-Day-1 smoke test başarılı (`PILOT_PRE_DAY1_TEST_2026_04_29`).
3. **Detaylı dokümantasyon** — Day-1 sırasında acil müdahale için TEST-MATRIX + 4 runbook + checklist + incident log.
4. **Açık riskler tanımlı + fix planlı** — R1, R2 için detaylı plan dosyaları hazır, owner GO ile her an başlatılabilir.
5. **DB sağlığı temiz** — drift = 0, baseline uygulandı, migration süreci dokümante.
6. **Rollback hazır** — Day-1 sırasında DB backup + git revert + kiosk Excel fallback senaryoları açık.

### 🔴 NO-GO Sebepleri (Eğer Owner Karşılayamazsa)

1. **R3 (izin akışı)** — Day-1'de personel izin talebi gelirse manuel akış yoksa kaos riski.
2. **R4 (fabrika üretim scope)** — Eren'in beklentisi netleşmediyse Day-1'de "üretim modülü çalışmıyor" şikayeti çıkabilir.
3. **Yedek personel hazır değilse** — Aslan/Eren/Ümit/Sema/RGM'den biri Day-1'e gelemezse rol boşalır.

### 🟡 Koşullu GO

- R1, R2 için risk kabulü owner imzalı (md. 14, md. 15)
- R3 için "Day-1'de izin akışı manuel" kararı yazılı
- R4 için fabrika üretim Day-1 scope yazılı (read-only mi, write mı, hangi sayfalar)
- Yedek pilot kullanıcılar için B-planı yazılı

---

## 7. HANGİ İŞLER DB WRITE GEREKTİRİR?

| İş | DB Write? | Protokol |
|---|---|---|
| HQ kiosk PIN refactor (R1) | ✅ EVET | DB-WRITE protokolü (`docs/runbooks/db-write-protocol.md`): yeni tablo (`hq_staff_pins`) + PIN seed |
| shift_attendance fix (R2) | ⚠️ KOŞULLU | Backfill yapılırsa EVET (eski kayıt UPDATE), sadece kod fix yapılırsa HAYIR |
| İzin altyapısı (R3) | ✅ EVET (muhtemelen) | Yeni tablolar + bakiye seed |
| Ay sonu puantaj (R6) | ❌ HAYIR (READ-ONLY simülasyon) | SELECT only |
| Fabrika üretim MVP (R4) | ⚠️ KOŞULLU | Mevcut tablolar yeterse HAYIR, yeni alan/tablo gerekirse EVET |
| Reçete + etiket (R5) | ✅ EVET | Yeni tablolar (etiket statüleri, revize history) |
| Day-5 güvenlik paketi (#272) | ❌ HAYIR (kod değişikliği) | Sadece middleware + endpoint refactor |

---

## 8. HANGİ İŞLER SADECE KOD/DOCS İŞİDİR?

| İş | Mod | Süre |
|---|---|---|
| Day-5 güvenlik paketi (#272) | Kod (middleware + endpoint) | TBD |
| shift_attendance fix kod kısmı | Kod (3 endpoint) | ~1.5 saat |
| Mevcut UI iyileştirmeleri | Kod (frontend) | TBD |
| Yeni plan dokümanları (R3, R4, R5) | Docs only | her biri ~30-45 dk |
| Sprint 2 master backlog | Docs only | ~30 dk |
| Pilot Day-1 hazırlık dokümanları | Docs only (✅ TAMAM) | bitti |

---

## 9. ÖZET ÖNERİ (Replit Agent Görüşü)

### Pilot Day-1 ÖNCESİ Mutlaka

1. ✅ Z1-Z8 (zorunlu) yapılır
2. ⚠️ R3 + R4 için owner kararı yazılı (`DECISIONS.md` yeni madde)
3. ⚠️ Day-1 GO/NO-GO checklist owner tarafından sabah doldurulur

### Pilot Day-1 ÖNCESİ Önerilen

1. shift_attendance check-out fix (R2/O1) — düşük risk + 3 saat → kayıt bütünlüğü Day-1'den temiz
2. R3 için minimum izin akışı kararı (manuel mi, sistem mi)

### Pilot Day-1 ÖNCESİ YAPILMAMASI Önerilen

1. HQ kiosk PIN refactor (R1) — schema değişikliği + seed riski Day-1 öncesi 24 saatte yüksek
2. Sprint 2 işleri (R5, P5, P6)

### Pilot Day-1 SONRASI (Sprint 2 Sırası)

1. **P1 (HQ PIN)** — En kritik güvenlik açığı, ilk fix
2. **P2 (shift_attendance)** — Day-1 öncesi yapılmadıysa burada
3. **P3 (İzin altyapısı)** — Personel sayısı arttıkça kritik
4. **P5 (Fabrika üretim MVP)** — Eren ve fabrika ekibi için
5. **P4 (Ay sonu puantaj)** — Pilot ayının kapanışı için
6. **P6 (Reçete + etiket)** — TGK uyumluluğu için
7. **P7 (Day-5 güvenlik)** — Yan iş paketi
8. **P8 (Rol PDF rapor)** — Yatırımcı/audit raporu

---

## 10. EK BİLGİ — DOKÜMANTASYON HARİTASI

```
docs/
├── DECISIONS.md                          (28 madde, tüm kararlar)
├── SPRINT-LIVE.md                        (canlı sprint durumu)
├── COLLABORATION-PROTOCOL.md             (çalışma modeli)
├── TEST-MATRIX.md                        (13 rol smoke test)
├── PILOT-DAY1-CHECKLIST.md               (Day-1 GO/NO-GO)
├── PILOT-DAY1-INCIDENT-LOG.md            (Day-1 hata günlüğü template)
├── runbooks/
│   ├── db-write-protocol.md              (acil DB write)
│   ├── kiosk-pdks-test.md                (4 birim test)
│   ├── git-security-cleanup.md           (git acil müdahale)
│   └── recipe-label-workflow.md          (reçete + etiket akışı)
├── plans/
│   ├── hq-kiosk-pin-security.md          (R1 plan)
│   └── shift-attendance-checkout-fix.md  (R2 plan)
└── audit/
    ├── pilot-readiness-current.md        (BU DOSYA)
    ├── DOSPRESSO_FULL_AUDIT_2026-04-26.md (62 KB tam audit)
    ├── dospresso-system-map-and-roadmap-2026-04-27.md
    ├── gida-muh-system-analysis-2026-04-27.md
    └── db-drift-report-2026-04-26.md
```

---

> **Bu rapor pilot Day-1 öncesi son durum tespitidir. Owner tarafından gözden geçirilip GO/NO-GO kararı için kullanılır. Her güncelleme yeni bir tarihli kopya olarak `docs/audit/pilot-readiness-YYYY-MM-DD.md` adıyla arşivlenebilir.**
