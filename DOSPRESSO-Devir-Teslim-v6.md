# DOSPRESSO — DEVİR TESLİM DOKÜMANI v6
## 29 Mart 2026 — Tam Kapsamlı Final

---

# HIZLI BAŞLANGIÇ

```bash
cd /home/claude/DOSPRESSO-App
git pull origin main
git log --oneline -5  # Son commit: 14eaeb80 (34 toplam)
```

Eğer repo yoksa:
```bash
cd /home/claude
git clone https://github.com/bombty/DOSPRESSO-App.git
cd DOSPRESSO-App
git config user.email "claude@dospresso.dev"
git config user.name "Claude AI"
npm install
```

**ÖNEMLİ:** Her kod değişikliğinden ÖNCE skill dosyalarını oku:
```
/mnt/skills/user/dospresso-architecture/SKILL.md
/mnt/skills/user/dospresso-debug-guide/SKILL.md
/mnt/skills/user/dospresso-quality-gate/SKILL.md
/mnt/skills/user/dospresso-design-system/SKILL.md
```

---

# 1. PROJE BAĞLAMI

## Ne?
**DOSPRESSO:** Türk kahve franchise zinciri yönetim platformu.
React 18 + Express + Drizzle ORM + PostgreSQL (Neon) + Dark/Light theme.

## Boyut?
395.477 satır kod, 281 sayfa, 247 bileşen, 1.551 endpoint, 349 tablo, 31 agent skill, 33 servis dosyası.

## Kim?
- **HQ** (Merkez Ofis) + **Fabrika** + **25 şube** (hedef: 55 şube, 2 yıl)
- **Aslan** = lead developer / owner. Replit'te test eder, Claude kodlar.
- **Utku** = CGO. Teknik departman + fabrika.

## İş Modeli
- Muhasebe sadece HQ(branchId=5) + Fabrika(23) + Işıklar(24) İK/bordrosundan sorumlu
- Coach ve Trainer tüm şubelerden sorumlu (denetim + eğitim)
- Her yatırımcı şubesi bağımsız İK yönetimi yapar
- Veri akışı tek yön: şube → HQ (tersi yasak)
- Mr. Dobody (AI agent): pattern bildirimi + onay mekanizmalı otonom aksiyon

## Pilot
- **Tarih:** ~14 Nisan 2026
- **Şubeler:** Fabrika + HQ + Işıklar + Lara
- **Amaç:** Kullanıcı alışkanlığı oluşturmak, gerçek ortamda test
- **Giriş noktası:** Fabrika kiosk (vardiya + üretim + QC)

---

# 2. TASARIM SİSTEMİ (Kesinleşmiş)

## Light Mode
```
HEADER:      Kırmızı (#c0392b) — marka kimliği, beyaz logo+metin
BOTTOM NAV:  Navy (#0a1628) — sakin taban, aktif sekme beyaz, pasif beyaz/40
ARKA PLAN:   Off-white (#f8f6f3) — saf beyaz DEĞİL, hafif krem ton
KARTLAR:     Beyaz (#fff) + sıcak border (#e8e4df)
AYIRICILAR:  Hafif krem (#f0ece7) — kart içi separator
METİN:       Koyu lacivert (#1a2536) ana, gri (#4a5568) ikincil
```

## Dark Mode
```
HEADER:      Koyu lacivert (#0c1a2e)
BOTTOM NAV:  Koyu lacivert (#0c1a2e), aktif kırmızı (#c0392b)
ARKA PLAN:   #0a1628
KARTLAR:     #0f1d32 + border (#1a2d48)
METİN:       Krem (#f2e6d0) ana, gri-kahve (#8a7d6d) ikincil
LOGO:        Kırmızı (#c0392b) — her iki modda aynı
```

## Layout Kuralları
- Bottom nav: Sabit 4 item → Ana Sayfa | Bildirim | Dobody | Profil (tüm roller)
- Mobil widget: 2 kolon (uzun sayfa olmasın)
- Desktop widget: 3 kolon (max-width 1200px)
- Kompakt padding: KPI 4px, widget 8-10px
- Kiosk: tam ekran, header/nav YOK, min 56px butonlar
- Ana sayfa: modül kartları grid → tıklayınca sidebar'lı detay
- Mr. Dobody: her dashboard'da özet + öneri kartı

## Tailwind Kuralları
- YASAK: bg-white, text-black, bg-[#hardcoded], border-gray-200
- KULLAN: bg-card, text-foreground, border-border, bg-muted

## CGO (Utku) Rol Tanımı
Teknik departmanı yönetir:
- Fabrika üretim detayı (hedef/gerçek/fire/QC)
- Tüm şubelerin ekipman sağlığı + arıza bildirim akışı
- Bakım takvimi + servis sorumluluğu (HQ vs şube — ekipmana göre CGO belirler)
- CRM'den gelen teknik geri bildirimler → CGO'ya düşer
- Her cihazın teknik servis sorumlusu (HQ mu, şube mi) CGO tarafından düzenlenir

---

# 3. BU OTURUMDA TAMAMLANAN İŞLER (8 commit)

## Commit Geçmişi
```
14eaeb80  Sprint 4b: P2 Plan vs gerçek UI widget
fc20a60f  Replit runtime hata düzeltmeleri — 3 kritik + 1 migration
bddafe18  Sprint 4a devam: bg-white fix + toFixed crash önleme
43b3a015  Sprint 4a: Tasarım tutarlılığı — light mode + bottom nav + hook fix
9abead40  Sprint 3c: Pilot hazırlık — plan güncelleme + recipeId + tarama raporu
b15ec545  Sprint 3: İK scope entegrasyonu tamamlandı — 7/7 endpoint
c9affd2e  Sprint 3: İK iki katmanlı mimari — Faz 1-3
(önceki commit'ler zaten push'lıydı)
```

## Sprint 3 — İK İki Katmanlı Mimari ✅
- ik.tsx: 7120 → 1762 satır (%75 küçülme), 7 yeni dosya
- useIKScope hook: all_branches / managed_branches / own_branch / own_data
- 8 İK endpoint scope-aware (manifest-auth + resolveBranchScope helper)
- managed_branches: muhasebe sadece [5, 23, 24]
- Bonus: gorev-detay.tsx + module-flags.tsx duplicate fix

## Sprint 3c — Pilot Hazırlık ✅
- P0: log-production + quick-complete → plan actualQuantity otomatik güncelleme
- P1: Factory scoring scheduler — zaten çalışıyormuş (index.ts:567)
- 21 perspektif tam sistem taraması → DOSPRESSO-TARAMA-RAPORU.md

## Sprint 4a — Tasarım Tutarlılığı + Crash Fix ✅
- Light mode: off-white arka plan, sıcak border/muted tonları (index.css)
- Kırmızı header light mode, navy dark mode (app-header.tsx)
- Bottom nav: 4 item sabit, navy bg, aktif beyaz (bottom-nav.tsx)
- 8 bileşende bg-white → bg-card fix
- toFixed crash fix: muhasebe(20+), performans, dashboard, üretim-planlama
- equipment.tsx tek gerçek hook safety fix

## Sprint 4b — Pilot Özellik (Kısmen) ⏳
- P1 recipeId: migration + log-production + quick-complete otomatik reçete çözümleme ✅
- P2 Plan vs gerçek UI widget: KPI kartı + takvim progress bar ✅
- Replit 3 runtime hata düzeltildi ✅
- auto_close_time migration eklendi ✅

---

# 4. TAM SİSTEM TARAMASI ÖZETİ (21 Perspektif)

## Gerçek Hata Sayıları (Düzeltilmiş Analiz)
| Sorun | İlk Rapor | Gerçek | Not |
|-------|-----------|--------|-----|
| Hook safety violation | 56 sayfa | **1 dosya** | equipment.tsx (DÜZELTİLDİ) |
| Korumasız toFixed | 258 | ~200 kalan | Pilot sayfaları düzeltildi |
| Array safety ihlali | 205 | 205 | Henüz dokunulmadı |
| Korumasız endpoint | 55 | 55 | Henüz dokunulmadı |
| Rate limiting | YOK | YOK | Pilot için risk |

## Pozitif Sürprizler (Zaten Hazır Olan Sistemler)
- ✅ Açık görev sistemi + kiosk claim/complete endpoint'leri (branch-tasks.ts 906 sat)
- ✅ Misafir QR geri bildirim: 7 dil, konum doğrulama, fotoğraf upload
- ✅ Personel QR puanlama: token + public rating sayfası
- ✅ Push bildirim: web-push + VAPID + service worker
- ✅ PWA: manifest.json + offline queue + cache v19
- ✅ Email: nodemailer + 6 şablon
- ✅ Orphaned shift otomatik kapanma: fabrika + şube + HQ gece yarısı
- ✅ Audit trail: 558 kayıt noktası
- ✅ 14 dashboard, 51 rapor endpoint, 19 rapor sayfası
- ✅ HQ dashboard: 8 rol bazlı görünüm
- ✅ Factory scoring: 796 sat, 5 boyutlu, scheduler aktif (günlük 02:00, haftalık Pzt 03:00)
- ✅ Müşteri geri bildirim → şube sağlık skoru otomatik bağlantı
- ✅ Agent: 1929 sat engine + scheduler + escalation + 31 skill + routing
- ✅ ErrorBoundary global + lazy load
- ✅ i18n: 5190 çeviri çağrısı
- ✅ Sidebar: 21 rol × menü özelleştirmesi + blueprint doğrulama
- ✅ Data lock: 15 kontrol noktası

## Yapısal Riskler (Pilot Sonrası)
- Rate limiting YOK — kiosk PIN brute force riski
- factory.ts: 102 write op transaction dışında (sadece 4 tx)
- N+1 query: employee-documents endpoint
- 386 filtresiz/limitsiz SELECT — 55 şubede performans riski
- WebSocket/SSE YOK — polling 10dk interval
- Manifest auth sadece %7 (111/1551 endpoint)
- 505 ad-hoc rol kontrolü
- 9 duplicate endpoint

---

# 5. DEVAM EDEN SPRINT PLANI

## Sprint 4b Kalan (Sonraki Oturum) — ~10 saat
```
[ ] Şube kiosk: açık görev listesi + "Görevi Al" butonu        (~3 saat)
    → Backend HAZIR: /api/branch-tasks/kiosk/instances (GET)
    → Backend HAZIR: /api/branch-tasks/kiosk/:id/claim (POST)
    → Backend HAZIR: /api/branch-tasks/kiosk/:id/complete (POST)
    → Frontend: sube/kiosk.tsx working ekranına tab/section ekle

[ ] Şube kiosk: bildirimler + duyurular sekmesi               (~2 saat)
    → Backend HAZIR: /api/notifications (GET)
    → Backend HAZIR: /api/announcements (GET)
    → Frontend: kiosk working ekranına bildirim/duyuru kartları

[ ] Şube kiosk: ekip durumu (kim vardiyada/molada/yok)         (~3 saat)
    → Backend: /api/branches/:id/kiosk/staff zaten personel listesi döner
    → Frontend: working ekranında ekip grid + status dot

[ ] PDKS anomali: mola dönüşü giriş unuttuysa kiosk uyarısı   (~2 saat)
    → Backend: break-end sonrası check-in kontrolü
    → Frontend: kiosk ekranında banner uyarı
```

## Sprint 5a — E2E Test (Hafta 2 başı)
```
[ ] Fabrika: kiosk → üretim → QC → plan güncelleme → çıkış
[ ] Şube: kiosk → giriş → açık görev al → tamamla → skor
[ ] QR misafir geri bildirim → şube skoru etkisi
[ ] Reçete → üretim → QC sonucu → hikaye raporu
[ ] HQ dashboard → tüm şube verileri doğru mu
[ ] Duyuru oluştur → tüm kiosk'larda görünüyor mu
```

## Sprint 5b — Veri + Cilalama (Hafta 2 sonu)
```
[ ] Test verisi temizle, pilot şubeler için gerçek personel
[ ] Fabrika ürün + istasyon + reçete + benchmark verisi
[ ] Vardiya şablonları (fabrika 3, şube 4)
[ ] Pilot kullanıcı PIN'leri
[ ] Kiosk dokunmatik UX optimizasyonu
[ ] Coach/supervisor canlı personel takip
```

## Pilot Sonrası (Sprint 6+)
```
[ ] Kalan toFixed 200 fix + array safety 205 fix
[ ] CRM 19 endpoint auth düzeltme
[ ] Manifest auth 111 → 500+ endpoint
[ ] QR sevkiyat sistemi
[ ] Mr. Dobody otonom aksiyonlar
[ ] Muhasebe Logo import → AI raporlama
[ ] Mega dosya bölümleme (factory 7547, hr 7452)
[ ] 55 şube ölçeklendirme
```

---

# 6. MODÜL DURUM MATRİSİ

| Modül | Backend | Frontend | Pilot? | Not |
|-------|---------|----------|--------|-----|
| Fabrika Kiosk | %95 | %90 | ✅ | recipeId + plan güncelleme tamamlandı |
| Vardiya/PDKS | %95 | %90 | ✅ | Engine çalışıyor |
| Bordro | %85 | %80 | ✅ | Temel hesaplama hazır |
| İK Scope | %95 | %90 | ✅ | 8 endpoint scope-aware |
| Reçete | %95 | %85 | ✅ | Versiyonlama + üretim bağı |
| QC | %90 | %80 | ✅ | 2 aşamalı (teknisyen + mühendis) |
| Üretim Plan | %90 | %85 | ✅ | Plan vs gerçek UI eklendi |
| Sevkiyat/LOT | %85 | %80 | ✅ | LOT oluşturma + takip |
| Şube Kiosk | %85 | %70 | ⚠️ | Görev var, bildirim/açık görev/ekip EKSİK |
| Mr. Dobody | %70 | %60 | ❌ | Skill testi yapılmadı |
| Akademi | %60 | %50 | ❌ | 42 empty state |
| CRM | %50 | %40 | ❌ | 19 endpoint auth sorunlu |
| Satınalma | %40 | %30 | ❌ | Pilot dışı |
| Muhasebe | %55 | %50 | ⚠️ | toFixed düzeltildi |

---

# 7. KRİTİK DOSYALAR REHBERİ

## En Büyük Backend Dosyalar
```
server/storage.ts           8862 sat  — Tüm CRUD (bölünmeli)
server/routes/factory.ts    7580 sat  — 45+ endpoint
server/routes/hr.ts         7452 sat  — İK (scope eklendi)
server/routes/operations.ts 5770 sat  — Görev/checklist
server/routes/branches.ts   4761 sat  — Şube + kiosk endpoint'leri
server/routes/admin.ts      4148 sat  — Admin paneli
```

## Pilot Kritik Frontend Dosyalar
```
client/src/pages/fabrika/kiosk.tsx         2854 sat  — Fabrika kiosk
client/src/pages/sube/kiosk.tsx            1562 sat  — Şube kiosk (DÜZENLENECEK)
client/src/pages/fabrika/uretim-planlama.tsx 1480 sat — Plan vs gerçek (güncellendi)
client/src/pages/muhasebe.tsx              2434 sat  — toFixed düzeltildi
client/src/pages/vardiya-planlama.tsx      2329 sat  — Vardiya planlama
```

## Tasarım Sistemi Dosyaları
```
client/src/index.css                       — CSS değişkenleri (light/dark)
client/src/styles/dospresso-design-system.css — DS v2 CSS vars
client/src/components/app-header.tsx       — Header (kırmızı light/navy dark)
client/src/components/bottom-nav.tsx       — Bottom nav (4 item, navy bg)
client/src/contexts/theme-context.tsx      — Theme provider
client/src/lib/design-tokens.ts            — Semantic renk token'ları
```

## Backend Servisler
```
server/lib/pdks-engine.ts                  221 sat  — Gün sınıflandırma + fazla mesai
server/lib/payroll-engine.ts               219 sat  — Bordro hesaplama
server/services/factory-scoring-service.ts 796 sat  — 5 boyutlu fabrika skoru
server/services/branch-health-score.ts     — Şube sağlık skoru (düzeltildi)
server/services/manifest-auth.ts           — Scope-based yetki + resolveBranchScope
server/services/agent-engine.ts            763 sat  — Agent motoru
server/services/agent-scheduler.ts         622 sat  — Zamanlanmış agent işleri
server/agent/routing.ts                    132 sat  — Agent aksiyon yönlendirme
server/agent/skills/                       31 dosya — Agent skill'leri
```

---

# 8. ŞUBE KİOSK REHBERİ (Sonraki Sprint İçin)

## Mevcut Yapı (sube/kiosk.tsx)
```
Steps: password → select-user → enter-pin → working → end-shift-summary → qr-scan → qr-action

Working ekranında mevcut:
- Çalışma süresi sayacı
- Vardiya: Başla / Mola / Bitir butonları
- userTasks: atanmış görevler listesi (API'den geliyor)
- userChecklists: atanmış checklistler (API'den geliyor)
- Arıza bildirimi dialog

EKSİK (Sprint 4b'de eklenecek):
- Açık görevler (branch-tasks, herkesin alabileceği)
- Bildirimler + duyurular
- Ekip durumu (kim vardiyada/molada/yok)
- PDKS anomali uyarısı
```

## Hazır Backend Endpoint'ler
```
GET  /api/branch-tasks/kiosk/instances    — Bugünkü şube görevleri
POST /api/branch-tasks/kiosk/:id/claim    — Görev sahiplen
POST /api/branch-tasks/kiosk/:id/complete — Görev tamamla
GET  /api/notifications                   — Kullanıcı bildirimleri
GET  /api/announcements                   — Duyurular
GET  /api/branches/:id/kiosk/staff        — Şube personel listesi
GET  /api/branches/:id/kiosk/session/:uid — Aktif oturum + görevler + checklistler
```

## Veri Yükleme Noktası
`fetchSessionDetails()` fonksiyonu (L502) session + tasks + checklists yüklüyor.
Buraya bildirim + açık görev + ekip durumu eklenecek.

---

# 9. REPLİT KONTROL PROTOKOLÜ

Her sprint sonrası Replit'ten kontrol iste:

1. **Veritabanı:** Yeni kolon/tablo migration çalıştı mı?
2. **UI:** Light/dark mode doğru mu? Bottom nav 4 item mi?
3. **Fonksiyonel:** Kiosk akışı çalışıyor mu?
4. **Log:** Console'da yeni hata var mı?

Bu oturumda Replit 3 kritik runtime hata yakaladı:
- Import eksikliği (factory.ts + branches.ts) → uygulama başlamıyordu
- Duplicate kod (hr.ts) → syntax error
- Yanlış kolon adı (branch-health-score.ts) → 18 şubede hata

**Ders:** Build geçmesi ≠ çalışıyor. Runtime testi zorunlu.

---

# 10. ROL × MODÜL MATRİSİ

| Rol | İK | Vardiya | Bordro | Ops | Fabrika | Ekipman |
|-----|-----|---------|--------|-----|---------|---------|
| admin | All★ | All★ | All★ | All★ | All★ | All★ |
| ceo | All-R | All-R | All-R | All-R | All-R | All-R |
| cgo | All-R | All-R | All-R | All-R | All★ | All★ |
| muhasebe_ik | Mgd★ | Mgd-R | Mgd★ | — | — | — |
| coach | All-R | All-R | — | All★ | — | — |
| mudur | Own★ | Own★ | Own-R | Own★ | — | Own-R |
| fabrika_mudur | — | Fab★ | — | — | Fab★ | Fab★ |

★=Tam yetki, R=Read-only, Mgd=Managed(5,23,24), Fab=Fabrika, Own=Kendi şubesi

---

# 11. ÖNCEKİ OTURUM TRANSKRİPTLERİ

```
/mnt/transcripts/2026-03-29-10-22-57-dospresso-sprint3-ik-pilot-design.txt  ← BU OTURUM
/mnt/transcripts/2026-03-28-23-11-46-dospresso-design-sprint-full-session.txt
/mnt/transcripts/2026-03-28-20-41-45-dospresso-design-sprint-full-session.txt
/mnt/transcripts/2026-03-28-17-28-32-dospresso-design-sprint-full-session.txt
/mnt/transcripts/2026-03-28-11-44-59-dospresso-design-sprint-full-session.txt
/mnt/transcripts/2026-03-28-08-09-01-dospresso-design-sprint-security.txt
```

---

# 12. YENİ OTURUM BAŞLATMA ŞİFRESİ

Şunu yaz:
> "DOSPRESSO Sprint 4b devam. Son commit: 14eaeb80 (34 commit). Şube kiosk'a açık görev + bildirim + ekip durumu ekle. Önce skill dosyalarını oku, sonra sube/kiosk.tsx ve branch-tasks.ts'i incele. Backend endpoint'leri hazır — sadece frontend entegrasyonu lazım."

---

# 13. SCHEDULER JOB'LARI (37 aktif)

| Job | Sıklık | İşlev |
|-----|--------|-------|
| master-tick-10min | 10 dk | Orphaned shift kapanma + PDKS kontrol |
| tick-1hr | 1 saat | Arıza escalation + stok uyarı |
| factory-scoring-daily | Günlük 02:00 | Fabrika çalışan skorları hesapla |
| factory-scoring-weekly | Pazartesi 03:00 | Haftalık fabrika skorları |
| task-delivery | 10 dk | Açık görev oluşturma/dağıtım |
| skt-expiry | 1 saat | Son kullanma tarihi kontrolü |
| gap-detection-daily | Günlük | Eksik veri tespiti |
| notification-cleanup-daily | Günlük | Eski bildirimleri temizle |
| pdks-auto-weekend-offs | 10 dk | Hafta sonu programlı izin |
| pdks-weekly-summary | Haftalık | PDKS haftalık özet |
| pdks-daily-absence | Günlük | Devamsızlık tespiti |
| pdks-monthly-payroll | Aylık | Bordro hesaplama |
| agent-scheduler | Sürekli | Mr. Dobody 31 skill çalıştırma |

# 14. SCHEMA DOSYA HARİTASI

| Dosya | Tablo | İçerik |
|-------|-------|--------|
| schema-01.ts | 2 | Temel session/config |
| schema-02.ts | 19 | Users, branches, roles, permissions |
| schema-03.ts | 36 | Tasks, checklists, notifications |
| schema-04.ts | 36 | CRM, customer_feedback, campaigns |
| schema-05.ts | 36 | HR: employees, documents, disciplinary |
| schema-06.ts | 36 | HR: leave, onboarding, satisfaction |
| schema-07.ts | 30 | Inventory, suppliers, purchase orders |
| schema-08.ts | 35 | Factory: stations, sessions, outputs, QC, scoring |
| schema-09.ts | 27 | Kiosk settings, PDKS, shifts, attendance |
| schema-10.ts | 42 | Recipes, production records, lots, shipments |
| schema-11.ts | 42 | Academy, career, quizzes, webinars |
| schema-12.ts | 52 | Agent: skills, actions, routing, escalation |
| schema-13.ts | 6 | Knowledge base, FAQ |
| schema-14.ts | 1 | Relations (Drizzle) |
| schema-15.ts | 8 | Ajanda/calendar |
| schema-16.ts | 2 | Financial |
| schema-17.ts | 3 | Monthly snapshots |
| schema-18.ts | 5 | Production planning |

# 15. ENVIRONMENT DEĞİŞKENLERİ

```
DATABASE_URL          — PostgreSQL (Neon) bağlantı
PORT                  — Express port (default 5000)
NODE_ENV              — production/development
SMTP_HOST             — Email sunucu
SMTP_PORT             — Email port
SMTP_USER             — Email kullanıcı
SMTP_PASSWORD         — Email şifre
SMTP_FROM_EMAIL       — Gönderici adres
VAPID_PUBLIC_KEY      — Web push public key
VAPID_PRIVATE_KEY     — Web push private key
ADMIN_BOOTSTRAP_PASSWORD — İlk admin şifresi
REPLIT_DEPLOYMENT_URL — Replit deploy URL
```

# 16. BİLİNEN UYARILAR / MINOR BUGLAR

| Uyarı | Dosya | Durum |
|-------|-------|-------|
| Duplicate key "/merkez-dashboard" | breadcrumb-navigation.tsx L27+L170 | Minor — çalışmayı etkilemiyor |
| auto_close_time kolonu eksik | branch_kiosk_settings | Migration eklendi (fc20a60f), Replit restart gerekli |
| Fabrika kiosk default PIN 0000 | factory.ts + factoryKioskConfig | Pilot öncesi değiştirilmeli |

# 17. MOCKUP REFERANSLARI (Bu Oturumda Oluşturulan)

Bu oturumda 4 mockup oluşturuldu (visualizer widget olarak, dosya olarak kaydedilmedi):
1. **CEO Dashboard** — desktop dark + mobil light (KPI strip, şube sağlığı, en iyi/kötü, Mr. Dobody)
2. **Coach Dashboard** — desktop dark (şube haritası, checklist takibi, personel, aksiyonlar)
3. **CGO Dashboard** — desktop dark + mobil light (fabrika üretim, arızalar, ekipman, CRM teknik, bakım, servis akışı)
4. **Light mode A/B karşılaştırma** — kırmızı header + navy footer seçildi

# 18. FABRIKA ÜRETİM ZİNCİRİ (Tam Akış)

```
ŞEF: Haftalık üretim planı girer
  → factoryProductionPlans (productId, stationId, targetQuantity, planDate)

PERSONEL: Kiosk'tan vardiya başlatır
  → factoryShiftSessions (userId, stationId, status=active)

PERSONEL: Üretim kaydeder (log-production / quick-complete)
  → factoryProductionOutputs (quantity, waste, productRecipeId=otomatik)
  → factoryProductionPlans.actualQuantity otomatik güncellenir (P0)
  → productionLots otomatik oluşur (LOT numarası)
  → factoryInventory güncellenir (stok artar)
  → Yüksek fire (%5+) → fabrika_mudur bildirim

QC: Kalite kontrol (2 aşama)
  → factoryQualityChecks (teknisyen → mühendis onay)

SCORING: Günlük 02:00
  → factoryWorkerScores (üretim %35, devam %25, kalite %15, mola %15, fire %10)
```

# 19. GİT STRATEJİSİ

- Tek branch: `main`
- Commit mesajları: `Sprint X: kısa açıklama` formatı
- Her sprint sonrası push
- Replit otomatik pull + deploy
- Conflict çözümü: Claude'un kodu öncelikli (Replit düzeltmeleri pull ile alınır)
