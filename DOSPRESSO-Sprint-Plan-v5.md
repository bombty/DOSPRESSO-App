# DOSPRESSO Control Centrum v5 — Birleşik Sprint Planı
**Tarih:** 1 Nisan 2026 | **Onaylayan:** Aslan (Product Owner)
**Strateji:** MissionControl mantığını koru, Centrum tasarımını giydir
**Toplam:** 10 sprint + pre-sprint, ~80 saat, 30+ dosya

---

## TESPİT EDİLEN SORUNLAR (1 Nisan 2026 — Görsel Test)

### ✅ Düzeltildi (commit 97b7116)
| # | Sorun | Çözüm |
|---|-------|-------|
| T1 | KPI çok satırlı (flex-col) | KpiChip → flex items-center (tek satır yatay) |
| T2 | Widget font'ları çok küçük (9px) | Widget 12px, içerik 11px, meta 10px |
| T3 | Light mode sarı metin okunamıyor | warn: #d97706 → #92400e (koyu amber) |
| T4 | Light mode ikon gölgesi yok | box-shadow: 0 2px 8px rgba(0,0,0,0.15) |
| T5 | Widget header rgba şeffaf | #192838 solid (her iki mod) |
| T6 | Dobody eski mor tint | Option C: #b42a2a header + #192838 gövde |
| T7 | Badge'ler dark modda soluk | Dolgulu renk + beyaz metin (her iki mod) |

### ⏳ Bekleyen Sorunlar
| # | Sorun | Öncelik | Sprint |
|---|-------|---------|--------|
| T8 | Kiosk token bug (sube/kiosk.tsx kioskToken localStorage'a kaydetmiyor) | 🔴 Pilot | Pre-S3 |
| T9 | CGO boş veri (Arıza 0, SLA 0, CRM 0) — endpoint dönüş veya seed data eksik | 🔴 | Pre-S3 |
| T10 | Arıza Yönetimi sayfası eski tasarım (CentrumShell değil) | 🟡 | S4 |
| T11 | 9 Centrum sayfasında font/renk tutarlılık kontrolü | 🟡 | S5C |
| T12 | Tüm rollerde kontrol merkezi veri bağlantı doğrulaması | 🔴 | Pre-S3 |
| T13 | CEO ana sayfa + command center Replit screenshot eksik | 🟡 | Replit |

---

## PRE-SPRINT: BUG FIX + VERİ DOĞRULAMA (2 saat)

**P1. Kiosk Token Bug Fix** (15dk)
Dosya: `client/src/pages/sube/kiosk.tsx`
Fix: `onSuccess` handler'a `if (data.kioskToken) localStorage.setItem("kiosk-token", data.kioskToken)` ekle
(`fabrika/kiosk.tsx`'te zaten var — aynı pattern)

**P2. CGO Veri Bağlantıları** (1s)
- `/api/faults` → CGO'ya 0 dönüyor mu, seed data var mı kontrol et
- `/api/iletisim/tickets?department=teknik` → CRM widget boş
- `/api/agent/branch-health` → Şube sağlık verisi kontrol et
- `/api/hq/kiosk/active-sessions` → Personel live tracking
- `/api/agent/actions?status=pending` → Dobody aksiyonları
- Her endpoint'i curl ile test et, boş ise seed data ekle

**P3. Tüm Dashboard Veri Doğrulama** (45dk)
CEO, CGO, Coach, Trainer dashboard'larını gez:
- Her widget'ta veri görünüyor mu?
- Tıklanabilir widget'lar doğru sayfaya gidiyor mu?
- KPI'lar API'den canlı veri çekiyor mu?
- Boş widget'larda "Veri yok" mesajı gösteriliyor mu?

---

## MEVCUT DURUM

| Metrik | Değer |
|--------|-------|
| Centrum sayfaları | 4 (CEO, CGO, Coach, Trainer) |
| MissionControl | 8 component (3357L), 21 widget (664L), 10 shared |
| Backend endpoint | 1577 (çoğu mevcut) |
| CentrumShell | 177L, 7 export |
| Kasa sistemi | Bağımsız (ileride API) |

---

## BÖLÜM 1: CENTRUM DASHBOARD (S1–S5, ~38 saat)

### SPRINT 1: ALTYAPI (4 saat)

**1A. CentrumShell Genişletme** → `client/src/components/centrum/CentrumShell.tsx`
Yeni component'lar: TimeFilter (Bugün|Hafta|Ay|Çeyrek), DobodySlot 3-mod (auto/action/info), EscalationBadge, TopFlop, DobodyTaskPlan, FeedbackWidget (GB+SLA), LostFoundBanner, QCStatusWidget
~250 satır ekleme

**1B. Role Routes** → `client/src/lib/role-routes.ts`
Yeni path'ler: /muhasebe-centrum, /satinalma-centrum, /fabrika-centrum, /depo-centrum, /sube-centrum, /personel-centrum, /yatirimci-centrum

### SPRINT 2: HQ ROLLERİ (12 saat)

**2A. CEO** → `ceo-command-center.tsx` (752L → ~900L)
Eklenen: Merkez bordro (Fab/HQ/Işık ayrı), diğer şube bordro, merkez fiks gider, şube fiks gider (girilmemiş uyarı), ürün maliyet, QC özet, TimeFilter
Endpoint: `/api/dashboard/executive`, `/api/hr/ik-dashboard`, `/api/branch-financial-summary`, `/api/factory/qc/stats`

**2B. CGO** → `cgo-teknik-komuta.tsx` (287L → ~500L)
Eklenen: Şube sağlık sıralaması, eskalasyon kutusu, gelir-gider, franchise KPI, QC durumu, canlı personel, tüm widget tıklanabilir
Endpoint: `/api/agent/branch-health`, `/api/factory/qc/stats`, `/api/hq/kiosk/active-sessions`

**2C. Coach** → `coach-kontrol-merkezi.tsx` (419L → ~700L)
5 sekme: Genel (sağlık+uyum+eskalasyon+arıza+CRM+canlı personel+Işıklar canlı+eğitim), Şube Takip (kart grid), Uyumsuzlar (Agent 4 kritik şube), Sıralama (Top3/Flop3), Görev Planı (DobodyTaskPlan)
Endpoint: `/api/dashboard/coach`, `/api/faults`, `/api/iletisim/dashboard`, `/api/agent/branch-health`

**2D. Trainer** → `trainer-egitim-merkezi.tsx` (271L → ~550L)
Coach paraleli + eğitim odaklı: onboarding, akademi, gecikmiş eğitim, uyumsuz şubeler, sıralama, görev planı

**2E. İK/Muhasebe (YENİ)** → `muhasebe-centrum.tsx` (~400L)
Kaynak: MissionControlMuhasebe.tsx (217L)
3 ayrı personel widget (Fab/HQ/Işık), merkez giderler, şubeler bordro, satınalma rapor bağlantısı
Endpoint: `/api/dashboard/finance`, `/api/hr/ik-dashboard`, `/api/branch-financial-summary`

**2F. Satınalma (YENİ)** → `satinalma-centrum.tsx` (~350L)
Kaynak: MissionControlDynamic.tsx (208L)
Kritik stok, aylık fiyat güncelleme (eski vs yeni fark), sipariş giriş-çıkış, tedarikçi performans
Endpoint: `/api/inventory`, `/api/purchase-orders`, `/api/suppliers`

### SPRINT 3: FABRİKA + DEPO (6 saat)

**3A. Fabrika (YENİ)** → `fabrika-centrum.tsx` (~450L)
Kaynak: MissionControlFabrika.tsx (304L)
Üretim plan vs gerçek, QC genişletilmiş (bekleyen lot + yapılmayan QC uyarısı + gecikme süresi), sevkiyat, personel skor (üretim/vardiya/hız/fire), pasta şefi haftalık planı, vardiya
Endpoint: `/api/factory/production-stats`, `/api/factory/qc/stats`, `/api/factory/quality-overview`

**3B. Depo/Lojistik (YENİ)** → `depo-centrum.tsx` (~300L)
Stok seviyeleri, LOT takibi, sipariş giriş, sevkiyat hazırlama
Endpoint: `/api/factory/inventory`, `/api/factory/shipments`

### SPRINT 4: ŞUBE ROLLERİ (10 saat)

**4A. Müdür/Yatırımcı (YENİ)** → `sube-centrum.tsx` (~550L)
4 sekme (Genel/Finans/Personel/Görev Planı), misafir GB+SLA, Lost&Found, franchise karşılaştırma, fiks gider GİRİŞ (Dobody zorlar), en iyi/en zayıf personel, sup performansı
Endpoint: `/api/branch-summary`, `/api/branch-feedback-summary`, `/api/branch-financial-summary`, `/api/lost-found`

**4B. Supervisor (YENİ)** → `supervisor-centrum.tsx` (~450L)
Ekip canlı, ekipman, misafir GB+SLA, Lost&Found, görevler+periyodik, değerlendirme 0/2 zorunlu, onboarding, vardiya/izin, kendi performans

**4C. Sup.Buddy (YENİ)** → `supbuddy-centrum.tsx` (~250L)
Sorumlu personel, misafir GB, Lost&Found, onboarding takip

**4D. Barista/BarBuddy/Stajyer (YENİ)** → `personel-centrum.tsx` (~400L)
Role göre farklı: Barista (görev+perf+eğitim), BarBuddy (görev+eğitim+mentörlük), Stajyer (onboarding+eğitim)
Tümü: misafir GB, Lost&Found

**4E. Yatırımcı (YENİ)** → `yatirimci-centrum.tsx` (~250L)
Read-only: şube performans, misafir GB (SLA yok), uyum, son 3 ay kâr

### SPRINT 5: QC + TEMİZLİK (6 saat)

**5A.** CGO + Fabrika QC genişletme (yapılmayan QC uyarısı, gecikme süresi, haftalık trend)
**5B.** Eski sayfalar → redirect (hq-ozet→CEO, sube-ozet→sube, benim-gunum→personel vb.)
**5C.** Quality gate: build test, Turkish UI, dark mode, responsive, error/loading state
**5D.** Admin Tema Özelleştirme (3 saat)
Yeni tablo: `theme_settings` (settingKey text PK, darkValue text, lightValue text, updatedAt, updatedBy)
Varsayılan kayıtlar:
  - bg: #0c0f14 / #edeae4
  - card: #141820 / #ffffff
  - border: #1e2530 / #ddd8d0
  - widgetHeader: #192838 / #192838
  - dobodyHead: #b42a2a / #b42a2a
  - dobodyBody: #192838 / #192838
  - primary: #ef4444 / #dc2626
  - headerBg: (app header)
  - navBg: (bottom nav)
Yeni endpoint: `GET /api/admin/theme-settings`, `PUT /api/admin/theme-settings`
Yeni sayfa: `client/src/pages/admin/tema-ayarlari.tsx`
  - Renk seçici (color picker) her ayar için
  - Dark / Light ayrı tab
  - Canlı önizleme (değişiklik anında görünür)
  - Kaydet → DB güncelle → CSS variables runtime'da uygula
  - Sıfırla (varsayılana dön) butonu
Frontend: ThemeProvider'a DB'den yüklenen renkleri inject et
  - `useQuery("/api/admin/theme-settings")` → CSS custom properties güncelle
  - Sayfa yüklendiğinde DB renkleri `:root`'a yazılır

---

## BÖLÜM 2: FRANCHISE ÖZELLİKLERİ (S6–S10, ~38 saat)

### SPRINT 6: UPSELLİNG HEDEF + MÜŞTERİ NPS (9 saat)

**6A. Upselling Hedef Sistemi**
Yeni tablo: `upselling_campaigns` (ürün, hedef, süre, CGO/Trainer belirler)
Yeni tablo: `upselling_branch_tracking` (şube bazlı gerçekleşen vs hedef)
Yeni tablo: `kiosk_membership_tracking` (kiosk üye artırma hedefi)
Kampanya tipleri: upsell (ek ürün), new_product (yeni), combo (paket)
Dashboard: CGO/Trainer kampanya oluştur, Coach/Müdür hedef takip
4 endpoint + 3 widget

**6B. Müşteri NPS (Basit)**
`customerFeedback` tablosuna ekle: npsScore (1-10), isRepeatVisitor (boolean)
QR formuna "Önerir misiniz?" sorusu
Tekrar ziyaretçi: aynı telefon 2+ kez → otomatik işaret
Dashboard: Müdür NPS trend, Coach/CEO şube karşılaştırma
2 endpoint + 2 widget

### SPRINT 7: VARDİYA DEVİR TESLİM (6 saat)

**7A. Mola Öncesi Checklist**
Mevcut checklist sistemi kullanılır → `checklistTemplates`'e "pre_break" type
Kiosk mola butonu → checklist zorunlu → tamamlamadan mola başlamaz
İçerik: bar temizliği, müşteri bekleme, ekipman kontrol, açık görev

**7B. Vardiya Bitiş Checklist**
`checklistTemplates`'e "end_shift" type
İçerik: kasa kontrol, hızlı stok, ekipman kapatma/temizlik, misafir GB kontrol, kayıp eşya

**7C. Dijital Devir Formu**
Yeni tablo: `shift_handover` (outgoing/incoming user, ekipman durumu jsonb, stok uyarılar jsonb, bekleyen görevler, müşteri notlar, genel not, isAcknowledged)
Gelen vardiya onaylamadan dashboard'da uyarı
Dashboard: Supervisor devir teslim widget, Dobody "devir yapılmadı" uyarısı

### SPRINT 8: EXCEL İMPORT + AI SKİLL'LER (5 saat)

**8A. Excel Import (Geçici POS Verisi)**
Yeni endpoint: `POST /api/finance/excel-import`
Format: tarih, şube, toplam satış, nakit, kart, ürün bazlı (opsiyonel)
Import → `branchFinancialSummary` güncelle
Import → `branchMonthlySnapshots` güncelle
Muhasebe/CEO erişimi

**8B. AI Skill'ler (5 yeni Dobody skill)**
`financial-trend-analyzer`: Import veriden gelir/gider trendi
`branch-comparison-insight`: "Kemer neden Lara'dan %40 iyi?"
`cost-optimization-advisor`: Maliyet düşürme önerileri
`seasonal-pattern-detector`: Mevsimsel satış pattern'ı
`personnel-efficiency-calculator`: Import gelir + vardiya = verimlilik

### SPRINT 9: BÖLGE + SÖZLEŞME + KULLANIM (10 saat)

**9A. Bölge/Cluster Yönetimi**
Yeni tablo: `branch_regions` (ad, açıklama, müdür, aktif)
`branches` tablosuna: `regionId` (nullable)
Dashboard: CEO bölge haritası, Coach bölge filtre, Dobody "bölge düşüşte" uyarısı
2 endpoint + migration + filtre widget

**9B. Franchise Sözleşme Entegrasyonu**
`franchiseInvestors` tablosuna ekle: equipmentListJson (jsonb), licenseFee, licenseFeePaymentStatus, franchiseAgreementUrl
İçe aktarma: Sözleşmeden franchise alan bilgileri, ekipman listesi, lisans bedeli
Dashboard: CEO yenileme uyarıları, Muhasebe tahsilat, Dobody "sözleşme 60 gün" uyarısı
3 endpoint + import + widget

**9C. Sistem Kullanım Analitikleri**
Yeni tablo: `user_activity_logs` (userId, branchId, action, pagePath, sessionDuration)
Yeni tablo: `branch_digital_adoption` (aylık: login, unique user, avg session, en çok/az kullanılan, skor)
Middleware: her sayfa görüntülemede log
Dashboard: CEO/CGO dijital olgunluk skoru, Coach "şube kullanmıyor" uyarısı
Dobody: "Lara 5 gündür giriş yapmadı"
3 endpoint + middleware + widget

### SPRINT 10: RİSK + BEST PRACTICE (8 saat)

**10A. Risk Yönetimi (5 Boyut)**
Yeni tablo: `branch_risk_scores` (finansal, personel, müşteri, ekipman, uyum risk + composite skor + seviye)
Yeni Dobody skill: `risk-assessment-engine` (haftalık otomatik hesaplama)
Eşik aşılırsa Coach/CGO'ya eskalasyon
Dashboard: CEO risk haritası, CGO ekipman+uyum, Coach personel+müşteri
3 endpoint + skill + widget

**10B. Best Practice Paylaşımı**
Yeni tablo: `best_practices` (şube, başlık, kategori, etki metriği, etki değeri, HQ onaylı)
Yeni Dobody skill: `best-practice-detector` (metrik iyileşme tespiti → "Kemer %60→%90, nasıl?")
Dashboard: Coach/Trainer best practice listesi, Müdür diğer şubelerden öğrenme
2 endpoint + skill + widget

---

## GENEL ÖZET

| Sprint | İçerik | Dosya | Saat |
|--------|--------|-------|------|
| **Pre** | **Bug fix + veri doğrulama** | **3** | **2** |
| S1 | Altyapı (CentrumShell + routes) | 2 | 4 | ✅ |
| S2 | HQ rolleri (CEO+CGO+Coach+Trainer+İK+Satınalma) | 6 | 12 | ✅ |
| S3 | Fabrika QC + Depo detay | 2 | 6 | 🔴 Pilot |
| S4 | Şube rolleri (Müdür+Sup+Buddy+Personel+Yatırımcı) | 5 | 10 |
| S5 | QC + temizlik + quality gate + admin tema + tasarım tutarlılığı | 6+ | 9 |
| S6 | Upselling hedef + Müşteri NPS | 5 | 9 |
| S7 | Vardiya devir teslim (3 parça) | 4 | 6 |
| S8 | Excel import + 5 AI skill | 3 | 5 |
| S9 | Bölge + Sözleşme + Kullanım analitik | 8 | 10 |
| S10 | Risk yönetimi + Best practice | 5 | 8 |
| **TOPLAM** | | **49+ dosya** | **~81 saat** |

---

## KRİTİK KURALLAR

1. Her sprint sonunda `npm run build` — fail = commit yok
2. MC useQuery'leri koru — endpoint değişikliği minimum
3. DobodySlot her sayfada, autonomyLevel backend'den
4. TimeFilter tüm widget'ları etkiler (period parametresi)
5. Misafir GB şube rollerinde, SLA sadece Müdür+Supervisor
6. Lost&Found sadece aktif kayıp eşya varsa
7. QC widget Fabrika+CGO — yapılmayan QC kırmızı uyarı
8. Fiks gider Müdür'de — Dobody girilmemişse zorlar
9. Kasa sistemi bağımsız — gelir verisi Excel import ile (geçici)
10. Devir teslim: mola → checklist zorunlu, vardiya bitiş → checklist zorunlu
11. Franchise sözleşme: sadece alan bilgileri, ekipman listesi, lisans bedeli import
12. Sistem kullanım: pilot için kritik — kim kullanıyor ölçülmeli
