---
name: dospresso-control-centrum
description: Control Centrum tasarım ve içerik kuralları. Dashboard, Control Center veya kiosk ekranı oluştururken/düzenlerken bu skill okunmalıdır. MEVCUT MissionControl sistemi, widget envanteri, Centrum tasarım kuralları, Dobody entegrasyonu, bildirim bütçesi ve migrasyon stratejisini içerir.
---

# DOSPRESSO Control Centrum — Tasarım & Migrasyon Kuralları

## 1. MEVCUT SİSTEM HARİTASI

Sistemde 3 paralel dashboard katmanı var. Hepsini bilmeden müdahale etme:

**A. Eski Sayfalar** (client/src/pages/)
hq-ozet.tsx, sube-ozet.tsx, benim-gunum.tsx, merkez-dashboard.tsx, franchise-ozet.tsx, kalite-kontrol-dashboard.tsx, hq-dashboard.tsx, fabrika/dashboard.tsx
→ `role-routes.ts` ROLE_CONTROL_PATH bunlara yönlendiriyor

**B. MissionControl** (components/mission-control/)
DashboardRouter → MissionControlHQ(709L), Coach(595L), Supervisor(504L), Muhasebe(217L), Fabrika(304L), Stajyer(331L), Yatirimci(489L), Dynamic(208L)
21 Widget, 10 Shared, dashboard-section-config.ts

**C. Centrum** (components/centrum/)
CentrumShell.tsx (177L) — KpiChip, DobodySlot, MiniStats, ProgressWidget, Widget, ListItem, CentrumShell
4 sayfa: CEO, CGO, Coach, Trainer

## 2. MİGRASYON — MC mantığı koru, Centrum tasarımı giydir

Card→Widget, CompactKPI→KpiChip, DobodySuggestionList→DobodySlot, CentrumShell wrapper, useQuery'ler aynen kalsın.

## 3. 15 ROL DASHBOARD İÇERİĞİ

### HQ Roller
**CEO:** Şube sağlık, eskalasyon, merkez bordro (Fab+HQ+Işık ayrı), diğer şube bordro, merkez fiks gider, şube fiks gider (girilmemiş uyarı), ürün maliyet, franchise KPI, upselling hedef, risk haritası, NPS franchise
**CGO:** Canlı arıza, şube sağlık, eskalasyon, gelir-gider, CRM teknik, canlı personel, uyum özeti, QC durumu, upselling, risk skoru
**Coach:** Şube sağlık, canlı arıza, CRM, canlı personel, Işıklar canlı (ayrı), eskalasyon, uyumsuz şubeler (Agent), Top3/Flop3, görev planı, eğitim, best practice
**Trainer:** Coach paralel + eğitim odaklı, upselling hedef belirleme, onboarding, akademi
**İK/Muhasebe:** 3 ayrı personel (Fab/HQ/Işık), merkez giderler, bordro, satınalma rapor
**Satınalma:** Kritik stok, fiyat güncelleme (aylık, eski vs yeni fark), sipariş giriş-çıkış, tedarikçi perf

### Fabrika/Depo
**Fabrika Müdür:** Plan vs gerçek, QC (bekleyen+yapılmayan uyarı), sevkiyat, personel skor, pasta şefi planı
**Depo:** Stok seviyeleri, LOT, sipariş giriş, sevkiyat hazırlama

### Şube Roller
**Müdür/Yatırımcı:** Ekip, franchise karşılaştırma, gelir-gider 3ay, fiks gider GİRİŞ (Dobody zorlar), HQ görevler, personel perf (en iyi/zayıf), sup perf, bordro, onboarding, akademi, misafir GB+SLA, Lost&Found, upselling, devir teslim, risk
**Supervisor:** Ekip canlı, ekipman, görevler+periyodik, değerlendirme (min 2/ay), onboarding, vardiya/izin, kendi perf, misafir GB+SLA, Lost&Found, devir teslim checklist
**Sup.Buddy:** Sorumlu personel, onboarding, sup'a rapor, misafir GB, Lost&Found
**Barista:** Haftalık görevler, eğitim, performans, misafir GB, Lost&Found, devir teslim
**BarBuddy:** Görevler, eğitim, Dobody hatırlatma, misafir GB, Lost&Found
**Stajyer:** Onboarding, eğitim, hatırlatma, misafir GB, Lost&Found
**Yatırımcı:** Read-only şube/franchise özet, misafir GB, son 3 ay kâr

## 4. YENİ GLOBAL COMPONENT'LER

DobodyTaskPlan, TopFlop, FeedbackWidget (QR+SLA), LostFoundBanner, QCStatusWidget, EscalationBadge, TimeFilter, UpsellTargetWidget, RiskScoreWidget, ShiftHandoverWidget, UsageAnalyticsWidget, NpsWidget

## 5. FRANCHISE EKSİK ALAN ENTEGRASYONLARI

### Upselling Hedef (campaigns tablosu genişlet)
CGO/Trainer belirler → şube takip → dashboard'da hedef vs gerçek. Kiosk üye artış takibi.

### NPS (customerFeedback'e +1 alan)
QR'dan sonra "Tavsiye eder misiniz?" 1-10. Tekrar ziyaret: telefon/email ile basit takip.

### Excel Import (geçici POS veri)
Muhasebe aylık kasa raporu upload → dailyCashReports → Dobody AI analizi (trend, anomali, tahmin)

### Vardiya Devir Teslim (3 bileşen)
Mola öncesi checklist (tamamlamadan çıkamaz), vardiya bitiş checklist, dijital devir formu (giden→gelen)

### Bölge/Cluster (branchClusters + branchClusterMembers)
Coach/Trainer cluster bazlı atanır. İlk: Antalya Merkez, Antalya Batı.

### Franchise Sözleşme (franchiseInvestors genişlet)
equipmentLicenseFee, royaltyExemptUntil, contractDocument. Performans skoru: Madde 6/A (personel+hijyen+ürün+müşteri).

### Sistem Kullanım (systemUsageLogs yeni tablo)
Sayfa yüklenme log, dijital olgunluk skoru, Dobody "3 gündür girmedi" uyarısı.

### Risk Skoru (5 boyut, mevcut verilerden hesapla)
Finansal %25, personel %20, müşteri %20, ekipman %15, uyum %20. ≤30 kritik, 31-60 dikkat, ≥61 sağlıklı.

### Best Practice (bestPractices yeni tablo)
Dobody analizi + Coach notları → tüm şubelere paylaşım. "Uyguladım" butonu.

## 6. TASARIM KURALLARI (değişmez)

Grid: Topbar → KPI Strip → 3 Kolon. Responsive 3→2→1.
KpiChip: alert/warn/ok/info/purple/neutral. Progress: ≥80 yeşil, ≥60 sarı, <60 kırmızı.
DobodySlot 3 mod: auto(✓), action(onayla/reddet), info(metin).
Eskalasyon 5 kademe: Sup→Müdür→Coach→CGO→CEO.
Zaman filtresi: Barista=Bugün, Müdür=Hafta, CEO=Ay.
Bildirim bütçesi: Stajyer 2-3/gün, Supervisor 4-5, Müdür 5-6, HQ 2-3, CEO 1-2.
Tüm widget'lar tıklanabilir → detay sayfasına. Dobody görev planı tüm rollerde.
