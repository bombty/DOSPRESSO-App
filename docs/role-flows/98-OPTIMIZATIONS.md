# 98 — Optimizasyonlar (Top 20 Öneri)
**Üretim Tarihi**: 2026-04-18  
**Sıralama**: ROI bazlı (etki × pilot kritikliği) / efor.

---

| # | Öneri | Öncelik | Tahmini Efor | Açıklama |
|---|-------|---------|--------------|----------|
| O01 | **Yatırımcı_HQ Dashboard'una Finansal & Şube Sağlık Widget Ekle** | YÜKSEK | 4 saat | `dashboard_role_widgets` tablosuna `financial_overview`, `branch_status`, `customer_feedback`, `qc_stats` widget'ları yatirimci_hq için ekle. Read-only PERMISSIONS uyumlu. |
| O02 | **Coach Onay Kuyruğu Widget'ı** | YÜKSEK | 6 saat | Coach'a yeni `pending_approvals` widget ekle: eğitim onayları + denetim follow-up + supervisor onboarding gates tek liste. |
| O03 | **Mudur'a branch_score_detail Widget Ekle** | YÜKSEK | 1 saat | Supervisor'da olan widget mudur'a da eklenmeli — hiyerarşi tutarlılığı. |
| O04 | **Module Flags Cleanup & Naming Standardı** | YÜKSEK | 8 saat | 13 disabled global flag'in audit edilmesi. fabrika.hammadde vs fabrika.production gibi paralel naming birleştirme. Migration script. |
| O05 | **Trainer Akademi Widget Set'i** | YÜKSEK | 4 saat | Trainer'a `pending_certifications`, `pending_quiz_grades`, `student_progress` widget'ları ekle. |
| O06 | **Fabrika Müdür Mali Yetki Senkron** | YÜKSEK | 2 saat | PERMISSIONS'da fabrika_mudur için `accounting: [view, create]` ekle veya widget kaldır. Şu an 403 riski. |
| O07 | **SPOF Onaylayıcı Backup** | YÜKSEK | 12 saat | Recete_gm, kalite_kontrol, gida_muhendisi için `delegasyon` modülünü aktive et + yedek onaylayıcı atama UI. |
| O08 | **Stajyer Yetkilerini Daralt** | ORTA | 3 saat | `stajyer` PERMISSIONS'dan tasks.create, messages.create kaldır. Eğitim odaklı sıkı kapsama. |
| O09 | **Unified PDKS Widget** | ORTA | 16 saat | 5 PDKS widget'ı tek role-aware widget'a birleştir — backend role-based projection. |
| O10 | **Mr. Dobody Dashboard Widget** | ORTA | 8 saat | AI agent'ın gap detection sonuçlarını dashboard widget olarak göster — admin/coach/cgo için. |
| O11 | **Sube Kiosk Vardiya Panosu** | ORTA | 12 saat | Mudur ana sayfasına real-time şu an aktif vardiya panosu (kim açtı, kim molada). Kiosk login'lerden anlık feed. |
| O12 | **CRM Sayfa Konsolidasyonu** | ORTA | 6 saat | `/crm` ve `/crm-mega` analiz, kanonik URL belirleme, redirect ekleme. |
| O13 | **Branch Onboarding Hızlı Bypass** | ORTA | 2 saat | Pilot şubeleri için "manual mark complete" butonu mudur'a — wizard'ı atla. |
| O14 | **Lost & Found HQ Sync** | DÜŞÜK | 4 saat | Şube'de kayıt → HQ'da aynı record'u görme (notification + listing sync). |
| O15 | **CRM Marketing Bildirim** | DÜŞÜK | 3 saat | `marketing` rolüne yeni şikâyet/feedback push bildirim entegrasyonu. |
| O16 | **Sube Kiosk Audit Trail Güçlendirme** | DÜŞÜK | 6 saat | Her PIN-login için ek "operatör adı" capture (manuel input) → audit log enrichment. |
| O17 | **Fabrika & Sef Rol Birleştirme** | DÜŞÜK | 1 saat (karar) | `fabrika`, `fabrika_sorumlu`, `fabrika_personel` rolleri 0 user — schema cleanup. |
| O18 | **Banner & Duyuru Birleştirme** | DÜŞÜK | 4 saat | İkisini tek "Komünikasyon Merkezi" altında birleştir, priority/visibility şeması netleştir. |
| O19 | **Iletisim_merkezi Kalıcı Yönlendirme Banner** | DÜŞÜK | 1 saat | Eski URL'e gidenlere "Bu sayfa /crm'e taşındı" toast bildirim. |
| O20 | **Akademi Adaptive Engine Aktivasyon** | DÜŞÜK | 8 saat | Trainer & coach için adaptive engine'i UI'da expose et — şu an backend var, frontend yok. |

---

## Pilot Öncesi (28 Nis) MUST-DO
- O01, O03, O06 (toplam ~7 saat) — yatırımcı/mudur/fabrika dashboard tutarlılığı.
- O04 (8 saat) — module flag temizliği — IT + Aslan ortak karar.
- O13 (2 saat) — branch onboarding bypass — pilot lokasyonlar için kritik.

## Pilot İlk 2 Hafta NICE-TO-HAVE
- O02, O05, O07, O09 — Coach + Trainer + SPOF backup + PDKS unified.

## Pilot Sonrası 1. Ay
- O08, O10, O11, O12 — UX iyileştirmeler.

## Backlog (3+ Ay)
- O14-O20 — strüktürel düzenlemeler.

---

## Toplam Tahmini Efor
| Kategori | Saat |
|----------|------|
| Pilot öncesi MUST-DO | ~17 |
| Pilot ilk 2 hafta | ~38 |
| Pilot sonrası 1. ay | ~42 |
| Backlog | ~30+ |
| **TOPLAM** | **~127 saat (~3-4 hafta)** |
