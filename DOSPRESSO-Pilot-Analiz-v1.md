# DOSPRESSO — Pilot Öncesi Gap Analizi v1
**Tarih:** 31 Mart 2026 | **Commit:** `bdb9d85c` | **Pilot:** ~14 Nisan 2026
**Yöntem:** GitHub kodu baştan sona tarandı, 10 mockup görselyle karşılaştırıldı, simülasyon sonuçları doğrulandı.

---

## ÖZET BULGULAR

| Kategori | Adet |
|----------|------|
| v8'de P0 yazılmış ama aslında **çalışıyor** | 3 |
| Simülasyonda P0 denen ama aslında **çalışıyor** | 4 |
| Gerçek eksik — pilot için **kritik** (P0) | 4 |
| Gerçek eksik — pilot için **önemli** (P1) | 5 |
| Pilot sonrası (P2) | 4 |

---

## BÖLÜM 1: "P0 BUG" DENİLENLER — ASLINDA ÇALIŞIYOR ✅

### 1.1 Kiosk Token Bug → ÇÖZÜLMÜŞ
- **Dosya:** `client/src/pages/sube/kiosk.tsx` satır 514
- **Kod:** `if (data.kioskToken) localStorage.setItem("kiosk-token", data.kioskToken);`
- **Durum:** Zaten mevcut. loginMutation onSuccess içinde doğru yerde.

### 1.2 `/sube-kiosk` Route Eksik → ZATEN TANIMLI
- **Dosya:** `client/src/App.tsx` satır 349-350
- **Kod:** `<Route path="/sube/kiosk/:branchId">` ve `<Route path="/sube/kiosk">`
- **Not:** v8'de `/sube-kiosk` yazılmış, doğru path `/sube/kiosk` — bu çalışıyor.

### 1.3 CGO Error Boundary → GLOBAL BOUNDARY VAR
- **Dosya:** `client/src/App.tsx` satır 334-541
- **Kod:** `LazyErrorBoundary` tüm lazy-loaded route'ları sarıyor + satır 769'da genel `ErrorBoundary`
- **Durum:** CGO sayfasına özel boundary yok ama global boundary beyaz sayfa riskini önlüyor.

---

## BÖLÜM 2: SİMÜLASYONDA "EKSİK" DENİLEN AMA ÇALIŞANLAR ✅

### 2.1 Coach Görev Tamamlanma Bildirimi → ÇALIŞIYOR
- **Dosya:** `server/routes/tasks.ts` satır 680-690
- **Kod:** `task_completed` notification → `assignedById` kişisine (Coach) gönderiliyor
- **Ek:** HQ admin'lere de "Görev İnceleme Bekliyor" bildirimi gidiyor

### 2.2 CRM Teknik Talep CGO'da → ÇALIŞIYOR
- **Dosya:** `client/src/pages/cgo-teknik-komuta.tsx` satır 164
- **Kod:** `TabsTrigger value="tickets"` — CRM Teknik sekmesi var
- **Query:** `/api/iletisim/tickets?department=teknik&status=acik,islemde`

### 2.3 Task ilerleme Takibi (X/Y) → ÇALIŞIYOR
- **Dosya:** `client/src/pages/task-takip.tsx` satır 184-189
- **Kod:** `completedCount/totalAssigned` progress bar + "3/8 tamamladı" gösterimi
- **Schema:** `crm-task-migration.ts` satır 11-12 → `total_assigned`, `completed_count` kolonları

### 2.4 Misafir HQ İç Not + Şube Yanıt → ÇALIŞIYOR
- **Dosya:** `client/src/pages/crm-mega.tsx` satır 431, 446-464
- **Kod:** `MisafirHqNote` component + "Misafire Yanıt Yaz (SLA Kapsamında)" form
- **Schema:** `crm-task-migration.ts` satır 37-47 → `hq_note`, `branch_response_text`, `feedback_status` vb.

---

## BÖLÜM 3: GERÇEK EKSİKLER — PİLOT KRİTİK (P0)

### P0-1: CRM HQ-İç 3. Kanal
- **Mockup:** IMG_1164 — "HQ-İç (4)" sekmesi, sadece HQ personeli arası iç mesajlar
- **Kod:** `crm-mega.tsx` satır 130-131 → sadece 2 kanal: `franchise` ve `misafir`
- **Eksik:** 3. sekme (`hq_ic`) + filtreleme mantığı + sadece HQ personeline görünürlük
- **Etki:** HQ personeli kendi arası iletişim için CRM kullanamıyor
- **Efor:** ~2-3 saat

### P0-2: CGO Canlı Personel Widget
- **Mockup:** IMG_1163 — "Canlı Personel Durumu: Aktif 24, Mola 3, Devamsız 1"
- **Kod:** `cgo-teknik-komuta.tsx` → Bu widget YOK
- **Backend:** `/api/hq/kiosk/active-sessions` endpoint MEVCUT (branches.ts satır 4154)
- **Eksik:** CGO sayfasına MiniStats widget eklenmeli (backend hazır, sadece frontend)
- **Etki:** CGO canlı personel takibi yapamıyor
- **Efor:** ~1 saat

### P0-3: Misafir 2★ Otomatik HQ Müdahale Eşiği
- **Mockup:** IMG_1169 — "2★ altı → otomatik HQ müdahale eşiği tanımsız"
- **Kod:** Hiçbir yerde rating threshold → otomatik eskalasyon mantığı yok
- **Schema:** `hq_intervention_required` boolean var (migration satır 45)
- **Eksik:** Feedback kaydedilirken rating < 2 ise `hq_intervention_required = true` + bildirim
- **Etki:** Düşük puanlı misafir geri bildirimleri HQ'ya otomatik yansımıyor
- **Efor:** ~2 saat (backend rule + notification)

### P0-4: Misafir SLA Deadline Kolonu Boş
- **Mockup:** IMG_1169 — "SLA deadline kolonu yok → şube ne zaman cevaplıyor?"
- **Kod:** `sla_deadline` kolonu var ama feedback oluşturulurken SET EDİLMİYOR
- **Eksik:** Feedback POST endpoint'inde `slaDeadline = now + sla_deadline_hours` hesaplanmalı
- **Etki:** SLA takibi çalışmıyor (deadline null olunca breach hesaplanamaz)
- **Efor:** ~1 saat

---

## BÖLÜM 4: GERÇEK EKSİKLER — ÖNEMLİ (P1)

### P1-1: Cowork Timeline + Bilgi/Dosya Sekmeleri
- **Mockup:** IMG_1168 — 5 sekme: Sohbet ✅, Tasks ✅, Timeline ❌, Bilgi/Dosya ❌, Üyeler ✅
- **Kod:** `cowork.tsx` satır 24 → sadece 3 tab: `chat`, `tasks`, `members`
- **Eksik:** `timeline` (kronolojik aktivite akışı) + `files` (dosya/bilgi havuzu) sekmeleri
- **Efor:** ~3-4 saat

### P1-2: Conversation Hub (Yeni Sayfa)
- **Mockup:** IMG_1165-66 — 3 kolon UI: Liste | Chat Thread | Detay Paneli
- **Kod:** Hiçbir dosya, route veya component YOK
- **Not:** En büyük yeni özellik. 6 tab (Tümü, Destek Talebi, Misafir Sesi, Görev Thread, İç Mesaj, Dobody)
- **Efor:** ~8-12 saat (yeni sayfa + yeni endpoint'ler)
- **Karar:** Pilot sonrasına ertelenebilir mi?

### P1-3: Task Atama Şube Chip Seçici İyileştirme
- **Mockup:** IMG_1167 — Şube seçimi chip'lerle, rol filtreli, "3 şube, ~8 kişi" özeti
- **Kod:** `task-atama.tsx` → Şube ve rol seçimi var AMA chip UI + özet gösterimi eksik
- **Efor:** ~2 saat

### P1-4: Coach SourceType Kaydı
- **Mockup:** IMG_1171 — "Görev kaynağı (Coach mı, Sistem mi?) kaydedilmiyor"
- **Kod:** `coach-kontrol-merkezi.tsx` satır 308 → sourceType hep `hq_manual`
- **Eksik:** Coach oluşturduğunda `coach_manual` olmalı (veya en azından `hq_manual` + createdBy ile ayrılmalı)
- **Efor:** ~30 dakika

### P1-5: CRM Duplikat URL Temizliği
- **Mockup:** IMG_1171 — "3 duplikat URL: /crm, /iletisim-merkezi, /destek"
- **Kod:** App.tsx satır 372-534 → redirect'ler var: `/iletisim` → `/crm`, `/misafir-geri-bildirim` → `/crm?channel=misafir`
- **Durum:** Redirect'ler çalışıyor AMA eski URL'ler hâlâ tanımlı (gereksiz route yığını)
- **Efor:** ~1 saat (temizlik)

---

## BÖLÜM 5: PİLOT SONRASI (P2)

| # | İş | Referans |
|---|-----|---------|
| P2-1 | Plan vs Actual UI widget (Fabrika) | Fabrika sayfası |
| P2-2 | PDKS anomaly alerts (kiosk ekranında) | PDKS sistemi |
| P2-3 | Notifications/announcements display | Bildirim sistemi |
| P2-4 | FIXME sayfaları: equipment.tsx, kayip-esya.tsx, misafir-geri-bildirim.tsx | Çeşitli |

---

## BÖLÜM 6: SAYFA BAZLI HAZIRLIK SKORLARI (Düzeltilmiş)

| Sayfa | Simülasyon | Gerçek | Fark Nedeni |
|-------|-----------|--------|-------------|
| CEO Komuta | — | **%90** | KPI chips + health map + Dobody slot + eskalasyon hepsi var |
| CGO Teknik | %60 | **%75** | Teknik talep tab var, canlı personel widget eksik |
| Coach Kontrol | %50 | **%70** | Görev atama + bildirim var, sourceType iyileştirme gerekli |
| Trainer Eğitim | — | **%85** | 4 KPI chip + eğitim uyum haritası + Dobody slot var |
| CRM | %65 | **%70** | SLA altyapısı + iç not var, HQ-İç kanal eksik |
| Misafir Sesi | %30 | **%50** | İç not + şube yanıt var, threshold + SLA deadline eksik |
| Görev Atama | %55 | **%75** | sourceType + progress bar + bulk atama çalışıyor |
| Görev Takip | — | **%80** | Kaynak etiketi + progress + filtre çalışıyor |
| Cowork | — | **%60** | 3/5 sekme çalışıyor, Timeline + Dosya eksik |
| Kiosk | — | **%85** | Token + route + team-status + announcements hepsi var |

**Franchise Genel Hazırlık:** ~%73 (simülasyonun öngördüğü %50-60'tan çok daha iyi)

---

## BÖLÜM 7: ÖNERİLEN PİLOT SPRİNT PLANI

### Sprint P0 — "Pilot Ready" (~8 saat, 1 commit)

```
Commit 1: Pilot P0 Fix'leri
├── P0-1: CRM HQ-İç 3. kanal (crm-mega.tsx — 3. sekme)
├── P0-2: CGO Canlı Personel widget (cgo-teknik-komuta.tsx — MiniStats)
├── P0-3: Misafir 2★ threshold (feedback endpoint — auto intervention)
├── P0-4: Misafir SLA deadline set (feedback POST — slaDeadline hesaplama)
└── P1-4: Coach sourceType fix (coach-kontrol-merkezi.tsx — 1 satır)
```

### Sprint P1 — "Pilot Polish" (~6 saat, 1 commit)

```
Commit 2: Pilot Polish
├── P1-1: Cowork Timeline + Dosya sekmeleri
├── P1-3: Task Atama chip UI iyileştirme
└── P1-5: CRM duplikat URL temizliği
```

### Pilot Sonrası — "Conversation Hub Sprint"

```
Commit 3+: Conversation Hub
├── P1-2: Conversation Hub yeni sayfa + endpoint'ler
├── P2-1: Plan vs Actual widget
├── P2-2: PDKS anomaly alerts
└── P2-3: Notifications display
```

---

## BÖLÜM 8: MOCKUP → KOD EŞLEŞTİRME

| Mockup | Sayfa | Durum |
|--------|-------|-------|
| IMG_1162 | CEO Komuta Merkezi | ✅ %90 eşleşiyor |
| IMG_1163 | CGO Teknik Komuta | 🟡 Canlı personel widget eksik |
| IMG_1163-bottom + IMG_1164 | Coach Kontrol (3 Sekme) | ✅ 3 sekme var, sourceType iyileştirme P1 |
| IMG_1164 | Trainer Eğitim Merkezi | ✅ %85 eşleşiyor |
| IMG_1164 | CRM 3 Kanal | 🔴 HQ-İç kanal eksik |
| IMG_1165 | Conversation Hub | 🔴 Hiç uygulanmamış |
| IMG_1166 | Centrum Görünürlük Matrisi + Task Oluştur | ✅ Matrix bilgi amaçlı, task form çalışıyor |
| IMG_1167 | Task Takip + Cowork | 🟡 Task ✅, Cowork 3/5 sekme |
| IMG_1168-1169 | Simülasyon Sonuçları | 📊 Referans (yukarıda düzeltilmiş skorlar) |
| IMG_1170-1171 | Uygulama Planı + Simülasyon Devam | 📊 Referans |

---

## BÖLÜM 9: TEKNİK NOTLAR

### Runtime Migration (17 kolon)
`server/services/crm-task-migration.ts` her startup'ta çalışıyor:
- Tasks: `source_type`, `task_group_id`, `total_assigned`, `completed_count`, `notify_assigner`, `target_role`, `target_branch_ids` (7 kolon)
- Customer Feedback: `sla_deadline_hours`, `branch_response_at`, `branch_response_text`, `branch_responder_id`, `hq_note`, `hq_note_by_id`, `hq_note_at`, `hq_intervention_required`, `hq_intervention_at`, `feedback_status` (10 kolon)

### Cowork Endpoint'leri (9 adet)
`server/routes/cowork-routes.ts`:
- GET/POST `/api/cowork/channels`
- GET/POST `/api/cowork/channels/:id/messages`
- GET/POST `/api/cowork/channels/:id/tasks`
- PATCH `/api/cowork/tasks/:taskId`
- GET/POST `/api/cowork/channels/:id/members`

### Error Boundary Zinciri
`App.tsx`: `ErrorBoundary` (global) → `LazyErrorBoundary` (chunk loading) → Sayfa components

### Kiosk Auth Akışı
`/sube/kiosk/:branchId` → PIN login → `localStorage.setItem("kiosk-token")` → tüm fetch'lerde `x-kiosk-token` header → `isKioskOrAuthenticated` middleware

---

*Bu doküman GitHub kodu baştan sona taranarak oluşturulmuştur. Simülasyon sonuçları gerçek kodla doğrulanmış ve düzeltilmiştir.*
