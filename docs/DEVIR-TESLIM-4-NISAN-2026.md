# DOSPRESSO — Oturum Devir Teslim Raporu
**Tarih:** 4 Nisan 2026 | **Son Commit:** 7665845
**GitHub:** bombty/DOSPRESSO-App | **Branch:** main
**Build:** ✅ (5.4mb, ~1m)

---

## 1. SİSTEM GENEL DURUM

| Metrik | Değer |
|--------|-------|
| Toplam Sayfa | 304+ |
| Route | 221 |
| Guard | 169 |
| Centrum Dashboard | 16/16 |
| Orphan (kalan) | 12 (duplicate/deprecated) |
| Backend Endpoint | 956 |
| Frontend Referanslanan | 549 |
| Service Worker | v20 |
| Pilot Hazırlık | %100 |

---

## 2. BU OTURUMDA YAPILAN İŞLER (Tam Liste)

### Ekipman Sistemi
- ✅ Ekipman Mega Modül v2: 4 sidebar → 9 sidebar
  - Dashboard (25 şube tek bakışta), Ekipman Listesi, Katalog & Kılavuzlar, Arıza Yönetimi
  - Servis Takip (yönetimden taşındı, 1260L), Bakım Takvimi (yeni)
  - Bilgi Bankası (yeni, 11 makale), Ayarlar (yönetimden taşındı, 1047L), Analitik
- ✅ /api/equipment/stats endpoint eklendi (Replit fix)
- ✅ /api/equipment-knowledge URL + HQ erişim fix (Replit fix)
- ✅ 3 kritik ekipman bug fix (metadata crash, dropdown tekrarı, reportedById)
- ✅ Teknik servis mail şablonu + Mail butonu
- ✅ Bilgi bankası 6 makale

### Vardiya/PDKS/Kiosk Sistemi
- ✅ **KRİTİK MİMARİ FIX:** shift_attendance HER kiosk check-in'de oluşturuluyor
  - ESKİ: Sadece `if (isLateArrival)` bloğu içinde → zamanında gelenler için kayıt YOK
  - YENİ: Her check-in'de shift bulma → yoksa adhoc shift → shift_attendance → penalty (sadece geç kalanlar)
  - Hem şube hem HQ kiosk düzeltildi
- ✅ Replit fix: adhoc shift status "confirmed", shiftType "morning", zaman "08:00:00"
- ✅ Replit fix: shift_attendance status "checked_in" (schema ile tutarlı)
- ✅ Backfill endpoint: POST /api/admin/pdks/backfill-attendance
- ✅ Backfill butonu /pilot-baslat sayfasına eklendi
- ✅ Dev backfill tamamlandı: 174 shift_attendance oluşturuldu
- ✅ Kiosk test: Ad-hoc shift created + shift_attendance created logları doğrulandı

### Fabrika
- ✅ Haftalık Üretim Planı UI (fabrika.tsx 5. tab)
  - Kategori filtreleme (badge), hafta navigasyonu (← Bu Hafta →)
  - Her ürün × 6 gün grid, mevcut planlar yeşil badge
  - Backend: POST /api/factory/production-plans (zaten vardı)

### Ana Sayfa & Navigasyon
- ✅ Ana sayfa kart reorganizasyonu: CEO 14→8, CGO 15→9, Admin 17→10
- ✅ 5 yeni hızlı erişim kartı (Denetim, Reçeteler, Şube Sağlık, Checklistler, Görevlerim)
- ✅ 19 orphan sayfa bağlandı (12,000+ satır kod aktifleştirildi)
- ✅ Route guard: 109 → 169 (+60 koruma)
- ✅ 5 centrum route guard (sube, supervisor, supbuddy, personel, yatırımcı)

### Sistem Atölyesi v3 (5 tab)
- ✅ Site Haritası — Manifest'ten canlı modül ağacı + izinler
- ✅ Rol Matrisi + Simülasyon — Rol tıkla → "Simüle Et" → ana sayfa kartları + izinler + kapsam
- ✅ Akışlar — 6 iş akışı adım adım
- ✅ Sağlık — 30 orphan sayfa detaylı analiz (durum + açıklama + önerilen roller)
- ✅ Notlar — Toplantı notları (DB kayıtlı)
- ✅ GET /api/sistem-atolyesi/metadata — canlı sistem verisi

### Cowork
- ✅ 3/5 → 5/5 tab: Timeline + Dosyalar eklendi

### PWA & Deploy
- ✅ PWA fullscreen meta tags (iOS + Android)
- ✅ Service Worker v19 → v20
- ✅ Replit: Neon ErrorEvent polyfill + duplicate import fix
- ✅ Replit: Admin şifre force reset (133200)

### Seed Data
- ✅ 30 gün test verisi: PDKS (~2000), Vardiya (~500), Checklist
- ✅ Seed 31→35 gün genişletildi (Nisan kapsar)
- ✅ Checklist loop 20→35 gün

### Dokümanlar
- ✅ docs/PROJE-SISTEMI-PLAN.md — Proje & Cowork v2 tam tasarım
- ✅ docs/ANASAYFA-KART-PLANI.md — Kart reorganizasyon planı
- ✅ docs/VARDIYA-FABRIKA-AUDIT.md — Vardiya/PDKS audit bulguları

---

## 3. PRODUCTION DURUMU

### Çalışıyor:
- Dev: ✅ login_sim=✅ OK, shift_attendance: 174, checklist Nisan: 18
- Son production deploy: publish gerekiyor (birkaç commit bekliyor)

### Production Deploy Adımları:
1. Replit'te Publish butonuna bas
2. 30 saniye bekle
3. admin / 133200 ile giriş
4. /pilot-baslat → "PDKS Devam Kaydı Backfill" butonuna bas
5. Kiosk girişi ile doğrula

---

## 4. BİLİNEN SORUNLAR & BEKLEYENLER

### Production Deploy
- [ ] Production "Internal Server Error" — son Replit fix'ler publish edilmeli
- [ ] module_flags unique constraint (production DB'de fix gerekebilir)
- [ ] workshop_notes tablosu production'da oluşturulmalı

### Kalan Orphan Sayfalar (12 — silinebilir/birleştirilebilir)
- admin-seed (test aracı → SİL)
- fabrika (eski → fabrika-centrum var)
- misafir-memnuniyeti-modul (eski → CRM mega var)
- guest-complaints + sikayetler (duplicate → BİRLEŞTİR)
- onboarding-programlar (duplicate → coach-onboarding-studio)
- academy-explore (duplicate → academy-landing)
- ai-assistant (bottom nav AI ile aynı)
- raporlar-finansal + raporlar-insight (→ Raporlar mega tab'a taşı)
- coach-content-library (→ academy content merge)

### Checklist Auto-Atama
- checklist_completions günlük otomatik oluşturma yok
- Kullanıcı /api/checklists/my-daily çağırdığında checklist listesi gelir ama completion oluşturmaz
- Manuel POST /api/checklist-completions/start gerekli

---

## 5. SONRAKİ OTURUM — PRİORİTE LİSTESİ

### 🔴 P0: Proje Sistemi v2 (Sprint 1-4)

**Sprint 1: Proje Detay Yeniden Tasarım (2-3 gün)**
Mevcut proje-detay.tsx (1113L) yeniden yazılacak:

```
6 TAB:
├── 📊 Dashboard — KPI + ilerleme + traffic light (🟢🟡🔴)
├── 📋 Görevler — Kanban (Todo/Devam/İnceleme/Tamamlandı)
├── 📅 Timeline — CSS Gantt chart (fazlar + görevler + milestones)
├── 👥 Ekip — Roller + iş yükü + dış paydaş davet
├── 💬 İletişim — Proje bazlı mesajlaşma
└── 📁 Dosyalar — Paylaşılan dökümanlar
```

Mevcut API'ler (15 endpoint, branches.ts'te):
- GET/POST /api/projects, GET/PATCH /api/projects/:id
- POST/DELETE /api/projects/:id/members
- POST /api/projects/:id/tasks, PATCH /api/project-tasks/:id
- POST /api/projects/:id/comments
- GET/POST /api/projects/:id/milestones
- POST /api/project-tasks/:id/subtasks
- POST /api/project-tasks/:id/dependencies

DB tabloları (10, tümü mevcut):
- projects, project_tasks, project_members, project_milestones
- project_phases, project_risks, project_comments
- project_budget_lines, project_task_dependencies, project_vendors

**Sprint 2: Timeline + Ekip Yönetimi (1-2 gün)**
- CSS-based Gantt (kütüphane gereksiz)
- Ekip rolleri: Lider, Editör, Katkıda Bulunan, İzleyici, Dış Paydaş
- İş yükü dağılım görünümü

**Sprint 3: Dış Paydaş + Franchise Birleştirme (1-2 gün)**
- /proje-erisim/:token route (dış paydaş sınırlı erişim)
- franchise_collaborators.accessToken zaten var — frontend route lazım
- Franchise 15 faz şablonu → projects tablosuna adapter
- Bildirim entegrasyonu

**Sprint 4: Polish (1 gün)**
- Proje portfolio dashboard (tüm projeler tek ekran)
- Arşiv sistemi (status: "archived")
- Şablon kütüphanesi
- Otomatik risk tespiti (geciken faz = risk)
- Proje kapanışta "öğrenilen dersler" formu

### 🟡 P1: Diğer Bekleyenler
- [ ] 12 orphan sayfa temizliği (duplicate silme)
- [ ] Conversation Hub (3 kolon, 6 tab — büyük feature)
- [ ] 74 eksik widget (fonksiyonel analiz gerekli)
- [ ] PDKS → Bordro otomatik aktarım
- [ ] HQ panoramik vardiya görünümü (22 şube)
- [ ] Gerçek zamanlı uyarı: "Ahmet 15dk'dır kiosk'a girmedi"
- [ ] İzin-vardiya çakışma kontrolü otomatik

---

## 6. WORKFLOW KURALLARI (değişmedi)

- Büyük feature/mimari → Claude → GitHub push
- Küçük hotfix → Replit Agent
- Replit `git reset --hard` KULLANMAMALI → `git pull --rebase`
- Her commit öncesi `npm run build` test
- Push: `git push origin HEAD:main`

---

## 7. ÖNEMLİ DOSYA KONUMLARI

| Dosya | Açıklama |
|-------|----------|
| shared/module-manifest.ts | 12 modül, 60 alt modül, rol izinleri |
| shared/schema/schema-06.ts | Proje tabloları (projects, tasks, members, milestones, phases, risks) |
| shared/schema/schema-10.ts | Franchise proje tabloları |
| server/routes/branches.ts | Proje API (15 endpoint) + Kiosk shift-start |
| server/routes/franchise-projects-routes.ts | Franchise proje API (17 endpoint) |
| client/src/pages/projeler.tsx | Proje listesi (751L) |
| client/src/pages/proje-detay.tsx | Proje detay (1113L) — YENİDEN YAZILACAK |
| client/src/pages/yeni-sube-detay.tsx | Franchise proje detay (3245L) |
| client/src/pages/ekipman-mega.tsx | Ekipman modül v2 (9 sidebar) |
| client/src/pages/sistem-atolyesi.tsx | Sistem Atölyesi v3 (5 tab) |
| client/src/pages/fabrika.tsx | Fabrika (5 tab, haftalık plan dahil) |
| client/src/pages/cowork.tsx | Cowork (5 tab) |
| client/src/components/home-screen/role-module-config.ts | Ana sayfa kartları |
| server/routes/sistem-atolyesi.ts | Sistem Atölyesi API |
| docs/PROJE-SISTEMI-PLAN.md | Proje v2 tam tasarım planı |
| docs/VARDIYA-FABRIKA-AUDIT.md | Vardiya/PDKS audit raporu |

---

## 8. REPLIT İÇİN BEKLEYEN GÖREVLER

```
1. Production publish yap
2. admin / 133200 ile giriş doğrula
3. /pilot-baslat → PDKS Backfill butonu → çalıştır
4. SQL doğrula:
   SELECT count(*) FROM shift_attendance; -- > 0
   SELECT count(*) FROM checklist_completions WHERE scheduled_date >= '2026-04-01'; -- > 0
5. Kiosk giriş testi → log'da [BRANCH-KIOSK] shift_attendance created
```

---

## 9. OTURUM BAŞLANGIÇ TALİMATI

Yeni oturumda şunu söyle:
> "Sprint 1 Proje Sistemi — devir teslim raporu docs/ klasöründe.
> Skill dosyalarını oku, proje-detay.tsx'i 6 tab ile yeniden yaz.
> API'ler hazır (15 endpoint branches.ts'te). Plan: docs/PROJE-SISTEMI-PLAN.md"
