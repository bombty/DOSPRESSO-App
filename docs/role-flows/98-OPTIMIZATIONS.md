# 98 — Optimizasyonlar (Top 20 Öneri)
**Üretim Tarihi**: 2026-04-18  
**Format**: Her öneri **Cost** (efor), **Risk** (uygulama riski), **Gain** (kazanım) triplet içerir.  
**Sıralama**: ROI bazlı (gain × pilot kritikliği) / (cost + risk).

---

| # | Öneri | Öncelik | Cost (efor) | Risk | Gain (kazanım) |
|---|-------|---------|-------------|------|----------------|
| O01 | **Yatırımcı_HQ Dashboard Finansal Widget** | YÜKSEK | 4 saat | DÜŞÜK (read-only widget) | Yatırımcı raporlama tatmini, marka itibar, ek widget kayıt 4 satır SQL. |
| O02 | **Coach Onay Kuyruğu Widget** | YÜKSEK | 6 saat | DÜŞÜK (yeni widget) | Coach günde ~30 dk kazanım, onay bottleneck %50 azalır. |
| O03 | **Mudur branch_score_detail Widget** | YÜKSEK | 1 saat | SIFIR (mevcut widget atama) | Hiyerarşi tutarlılığı, müdür şubesini supervisor kadar net görür. |
| O04 | **Module Flags Cleanup & Naming Standardı** | YÜKSEK | 8 saat | ORTA (UI menü değişimi pilot ortasında) | Schema teknik borç ödenir, gelecek geliştirme hız 2x. |
| O05 | **Trainer Akademi Widget Set** | YÜKSEK | 4 saat | DÜŞÜK | Sertifika onay süresi 3 gün → 1 gün, eğitim throughput artar. |
| O06 | **Fabrika Müdür Mali Yetki Senkron** | YÜKSEK | 2 saat | SIFIR (yetki ekleme) | 403 hatası önlenir, müdür dashboard'u tam çalışır. |
| O07 | **SPOF Onaylayıcı Backup** | YÜKSEK | 12 saat | ORTA (yeni delegation logic) | Tatil/hastalık durumunda işler durmaz, %100 uptime onay. |
| O08 | **Stajyer Yetkilerini Daralt** | ORTA | 3 saat | DÜŞÜK (yetki kaldırma) | Veri güvenliği, eğitim odaklı net rol. |
| O09 | **Unified PDKS Widget** | ORTA | 16 saat | ORTA (5 widget kaldırma migration) | Dashboard sadelik, tek endpoint backend yükü %60 azalır. |
| O10 | **Mr. Dobody Dashboard Widget** | ORTA | 8 saat | DÜŞÜK | AI gap detection görünürlük, otomatik aksiyon hızı 3x. |
| O11 | **Sube Kiosk Vardiya Real-time Panosu** | ORTA | 12 saat | ORTA (WebSocket altyapı) | Müdür anlık görünüm, vardiya sapması anında tespit. |
| O12 | **CRM Sayfa Konsolidasyonu** | ORTA | 6 saat | DÜŞÜK (redirect ekleme) | Kullanıcı kafa karışıklığı sonu, bookmark stabilizasyonu. |
| O13 | **Branch Onboarding Wizard Bypass** | ORTA | 2 saat | SIFIR (UI buton) | Pilot lokasyonlar Pzt 09:00 hızla geçer, eğitim odaklı kullanım. |
| O14 | **Lost & Found HQ Sync** | DÜŞÜK | 4 saat | DÜŞÜK | Şube → HQ otomatik bildirim, manuel takip 0'a iner. |
| O15 | **CRM Marketing Bildirim Entegrasyon** | DÜŞÜK | 3 saat | SIFIR | Marka itibarı koruma, viral şikâyet erken tespit. |
| O16 | **Sube Kiosk Audit Trail Güçlendirme** | DÜŞÜK | 6 saat | DÜŞÜK | Audit izlenebilirlik, KVKK uyum, sorumluluk netleşir. |
| O17 | **Fabrika Legacy Rol Cleanup** | DÜŞÜK | 1 saat | SIFIR (silme) | Schema sadelik, gelecek confusion sıfır. |
| O18 | **Banner & Duyuru Birleştirme** | DÜŞÜK | 4 saat | DÜŞÜK | Tek komünikasyon merkezi, priority kuralı net. |
| O19 | **Iletisim_merkezi Redirect Banner** | DÜŞÜK | 1 saat | SIFIR | Eski URL kullanıcısı bilgilendirilir, bookmark günceller. |
| O20 | **Akademi Adaptive Engine UI Expose** | DÜŞÜK | 8 saat | DÜŞÜK | Trainer kişiselleştirilmiş öğrenme, eğitim verimi %20+. |

---

## Pilot Öncesi (28 Nis) MUST-DO
- O01, O03, O06 (toplam ~7 saat) — yatırımcı/mudur/fabrika dashboard tutarlılığı.
- O04 (8 saat) — module flag temizliği — IT + Aslan ortak karar.
- O13 (2 saat) — branch onboarding bypass — pilot lokasyonlar için kritik.
**Toplam: ~17 saat**

## Pilot İlk 2 Hafta NICE-TO-HAVE
- O02, O05, O07, O09 — Coach + Trainer + SPOF backup + PDKS unified.
**Toplam: ~38 saat**

## Pilot Sonrası 1. Ay
- O08, O10, O11, O12 — UX iyileştirmeler.
**Toplam: ~42 saat**

## Backlog (3+ Ay)
- O14-O20 — strüktürel düzenlemeler.
**Toplam: ~30 saat**

---

## Toplam Tahmini Efor
| Kategori | Cost | Risk Değerlendirmesi |
|----------|------|----------------------|
| Pilot öncesi MUST-DO | ~17 saat | Çoğunluğu DÜŞÜK risk, O04 ORTA risk (pilot ortası schema değişikliği). |
| Pilot ilk 2 hafta | ~38 saat | DÜŞÜK-ORTA, O07 (delegation) ORTA risk yeni logic. |
| Pilot sonrası 1. ay | ~42 saat | ORTA, O09 ve O11 backend değişiklik içerir. |
| Backlog | ~30 saat | DÜŞÜK risk hepsi. |
| **TOPLAM** | **~127 saat** | **~3-4 hafta**, çoğunluğu DÜŞÜK risk. |
