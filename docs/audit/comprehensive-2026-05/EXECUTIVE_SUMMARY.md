# COMPREHENSIVE ROLE × MODULE AUDIT — Executive Summary
**Tarih:** 3 May 2026 | **Owner:** Aslan | **Scope:** 31 rol × tüm modüller (HR/Akademi/Fabrika/Finans/CRM/Şube/PDKS/Mr.Dobody/Mission Control)
**Yöntem:** 6 paralel kod-explorer + 5 mekanik script-tarama
**Kaynak detay:** `docs/audit/comprehensive-2026-05/findings-raw.md` (36 bulgu)

---

## 1. Bulgu Sınıflandırması — 36 Adet

| Sınıf | Adet | Tipik Etki |
|---|---:|---|
| KRİTİK (veri kaybı / hesap hatası / yetki bypass) | **9** | F01, F10, F11, F12, F20, F26, F28, F32, F33 |
| YETKİ / RBAC eksiği | **5** | F02, F05, F06, F13, F16 |
| HESAP-MANTIK / formül | **6** | F04, F07, F14, F15, F26, F30 |
| EKSİK-IMPL / stub | **3** | F18, F22, F27 |
| KIRIK-API / 404 | **1** | F17 |
| UYUMLULUK / mevzuat | **2** | F24 (etiket revize), F29 (KDV) |
| HARDCODE / parametreleştirme | **3** | F29, F30, F31 |
| UX / dokümantasyon | **3** | F08, F19, F23 |
| VERİ-INTEGRİTY (cross-table sync) | **2** | F21, F32 |
| INFRA (drift, dashboard router, PIN seed) | **2** | F34, F35, F36 |

**Toplam KRİTİK ölçütü karşılayan bulgu: 9** — pilot Day-1'i etkileyen 4 tanesi: **F10 (PILOT etiketi exclude), F11 (TZ), F12 (shift_id FK), F33 (Authenticated guard sızıntısı)**.

---

## 2. Pilot Etkisi — Day-1 İçin Acil 4 İş

| # | Bulgu | Neden Acil | Önerilen Çözüm | Mode |
|---|---|---|---|---|
| **P1** | F10 + F11 + F12 (PDKS sync trio) | 42 eksik kayıt buradan; pilot ilk hafta bordro yanlış çıkacak | Kontrollü dry-run + sync_log raporu üret, eşik altı düzeltme task'ı | **Plan + isolated** |
| **P2** | F33 (13 sayfa guard'sız) | Stajyer `/izin-talepleri`, `/mesai-talepleri`, `/personel/:id`, `/performans` direkt URL ile açabilir | 13 sayfaya `ModuleGuard` veya `ProtectedRoute` sarımı (toplu PR) | **Plan + isolated** |
| **P3** | F36 (PIN seed coverage) | Day-1'de PIN'siz personel kiosk'a giremez | Read-only SQL ile coverage raporu, eksikse seed migration | **Plan + read-only** sonra Plan + isolated |
| **P4** | F01 (Dashboard router v4 vs v5) | CEO/CGO/Coach/Trainer pilot demo'da iki farklı dashboard görür | DashboardRouter v5 routelara migrate / v4 deprecate | **Plan + isolated** |

---

## 3. Yüksek Öncelik (Pilot 1. Hafta)

| # | Bulgu | Açıklama | Mode |
|---|---|---|---|
| H1 | F26 (AGI formülü) | Asgari ücret muafiyeti yanlış basitleştirilmiş; pilot personel net maaşı sapacak | Plan + isolated (mevzuat doğrulama + unit test) |
| H2 | F28 (satınalma stok race) | Eşzamanlı POS+sayım hatalı stok; pilot şube açılışta riskli | Plan + isolated (atomic SQL increment) |
| H3 | F20 (lineCost null silent) | Maliyet eksik raporlanır; CEO finans dashboard yanılır | Plan + isolated (throw + alert) |
| H4 | F32 (cari currentBalance cache) | Mutabakat sapması | Plan + isolated (recompute trigger) |
| H5 | F24 (reçete versiyon → etiket revize) | Gıda mevzuat riski | Plan + isolated (versiyon-bazlı etiket invalidation) |
| H6 | F22 (factory-f2 stok stub) | Üretim planlama gerçek değil | Plan + isolated (kolon ekle + query güncelle) |
| H7 | F35 (42 kolon drift) | Sessiz hata kaynağı | Plan + isolated migration |
| H8 | F17 (`/api/training/modules` 404) | Akademi HQ ModullerTab boş | Build (DOCS) → endpoint kaydı doğrula → Plan + isolated patch |

---

## 4. Orta Öncelik (Pilot 2. Hafta)

F02, F03, F05, F06, F07, F13, F14, F15, F16, F21, F23, F27, F29, F30, F31, F34, F18, F04 — toplam 18 bulgu. 

Her biri ayrı task değil; konuya göre **5 bundle** öneriyorum:
- **B-RBAC** (F02, F05, F06, F13, F16): Şube + HQ yetki tutarlılığı
- **B-PDKS-MANTIK** (F14, F15): Mesai yuvarlama + geç eşiği kaynağı
- **B-FİNANS-PARAMETRE** (F29, F30, F31): KDV/saatlik ücret/döviz settings tablosuna taşı
- **B-RECIPE-COST** (F21, F23, F27): Kategori sync + sign-off + null guard
- **B-UX-DASHBOARD** (F04, F18, F34): CEO partial-data flag + CareerTab gate + MUHASEBE dashboard

---

## 5. Düşük Öncelik / Dokümantasyon

F08 (Buddy modül gizleme), F09 (CAPA SLA monitör), F19 (Mr.Dobody kapsam), F25 (Lot override) — runbook'a eklenecek.

---

## 6. Önerilen Yeni Project Tasks (Owner Onayı Bekliyor)

| # | Başlık | Mode | Süre | Risk |
|---|---|---|---|---|
| **T-300** | P1: PDKS sync trio düzelt (F10+F11+F12) | Plan + isolated | 6h | YÜKSEK |
| **T-301** | P2: 13 sayfaya ProtectedRoute/ModuleGuard sarımı (F33) | Plan + isolated | 3h | ORTA |
| **T-302** | P3: PIN seed coverage raporu + eksik seed (F36) | Plan + isolated | 2h | DÜŞÜK |
| **T-303** | P4: DashboardRouter v5 migrate (F01) | Plan + isolated | 4h | ORTA |
| **T-304** | H1: AGI/asgari ücret bordro formülü düzelt (F26) | Plan + isolated | 4h | YÜKSEK |
| **T-305** | H2: Satınalma atomic stok update (F28) | Plan + isolated | 3h | YÜKSEK |
| **T-306** | H3: lineCost null guard + alarm (F20) | Plan + isolated | 2h | ORTA |
| **T-307** | H4: cari currentBalance recompute trigger (F32) | Plan + isolated | 3h | ORTA |
| **T-308** | H5: Reçete versiyon → etiket revize otomasyonu (F24) | Plan + isolated | 5h | ORTA |
| **T-309** | H6: factory-f2 stok stub kaldır (F22) | Plan + isolated | 3h | DÜŞÜK |
| **T-310** | H7: 42 kolon drift kapat (F35) | Plan + isolated | 4h | ORTA |
| **T-311** | H8: `/api/training/modules` doğrula + patch (F17) | DOCS sonra Plan | 2h | DÜŞÜK |
| **T-312** | B-RBAC bundle (F02, F05, F06, F13, F16) | Plan + isolated | 6h | ORTA |
| **T-313** | B-PDKS-MANTIK bundle (F14, F15) | Plan + isolated | 3h | ORTA |
| **T-314** | B-FİNANS-PARAMETRE bundle (F29, F30, F31) | Plan + isolated | 4h | DÜŞÜK |
| **T-315** | B-RECIPE-COST bundle (F21, F23, F27) | Plan + isolated | 5h | ORTA |
| **T-316** | B-UX-DASHBOARD bundle (F04, F18, F34) | Plan + isolated | 4h | DÜŞÜK |

**Toplam:** 17 task / ~63h.
**Gerçek tahmin (W1-W7 deneyimine göre %30 indirim):** ~44h.

---

## 7. Sıradaki Owner Kararı

1. **GO P1-P4** (acil 4 task) → ben Plan moduna geçip propose edeyim mi?
2. **GO H1-H8** sırayla mı, yoksa risk önceliklendirme ile mi (T-300/304/305 önce)?
3. **B-bundle'lar** ayrı mı, monolitik mi?
4. **DOCS-ONLY ek tarama** istiyor musun (CRM/Notification/Mr.Dobody için ayrı dalga)?
