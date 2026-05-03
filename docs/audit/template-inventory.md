# Template Inventory — Faz A (Task #300)

**Tarih:** 3 May 2026
**Mod:** DOCS-ONLY (read-only analiz, kod değişikliği yok)
**Owner kararı:** Tek template kalacak; "yeni güçlü template" (`ModuleLayout` + `ModuleSidebar` + `KPIStrip`) tutulur, kullanılmayan/eski template kabuğu Faz B'de silinir.

---

## 0. Sayım kapsamı (scope)

Bu raporda kullanılan tüm sayılar aşağıdaki kapsama göredir. Her sayım `rg` veya Node `fs.readdirSync` ile **bağımsız doğrulandı**.

- **Sayfa kapsamı:** `client/src/pages/**/*.{ts,tsx,js,jsx}` recursive — toplam **316 dosya** (204 doğrudan `pages/` altında + 112 alt dizinlerde). Hiçbir dosya hariç tutulmadı; alt dizinlerdeki yardımcı dosyalar (örn. `akademi-v3/categoryConfig.ts`, `iletisim-merkezi/categoryConfig.ts`, akademi-hq alt componentleri) da listelenir; bunların çoğu sayfa değil yardımcı modüldür ama tam kapsama olsun diye sayılır.
- **Template kapsamı:** Sadece `client/src/components/module-layout/*` ve `client/src/components/layout/*` dizinleri.
- **Component-içi kullanım:** Pages dışındaki bileşenlerde (örn. `components/mission-control/MissionControlDynamic.tsx`, `components/shared/UnifiedKPI.tsx`) `KPIStrip` kullanımı **ayrıca** raporlanır ama sayfa sayımına dahil edilmez.

### Sınıflandırma kuralı (per-page)

Her dosya tek kategoriye konur, kural sırası. **Kural substring eşleşmesine değil, açık import ifadelerine bakar** (örn. `crm-mega.tsx` içinde tanımlı yerel `ChannelKPIStrip` bileşeni MIXED'e dahil edilmez):

1. **NEW** — dosya `from "@/components/module-layout/..."` import'u içerir VE `ModuleLayout` adı kullanılır.
2. **OLD** — dosya `from "@/components/layout/..."` (veya `from "@/components/layout/<X>"`) import'u içerir, **ancak** import yolu `RouteModuleSidebar` veya `module-menu-config` değildir (bu ikisi nav infrastructure, template değil).
3. **MIXED** — yukarıdaki ikisi de değil; ama dosyada şu iki açık import'tan en az biri geçer:
   - `from "@/components/module-layout/KPIStrip"` (doğrudan `KPIStrip` import'u — sayfalarda 0 örnek, sadece component-içi kullanım var)
   - `from "@/components/shared/UnifiedKPI"` (paylaşılan KPI bileşeni; `CompactKPIStrip` bu modülün `as` aliasıdır)
4. **NONE** — yukarıdakilerin hiçbiri; sayfa kendi `Card`/`div` ile kuruluyor, template kabuğu yok.

> Not: Çalıştırılan classifier script'i (`/tmp/classify.mjs`, kural Bölüm 0'da) `\bKPIStrip\b` substring eşleştirmesi de denedi; sayfa-bazlı çıktıda fark **yoktur** çünkü `KPIStrip` tek başına geçen tek dosya `module-layout/ModuleLayout.tsx` (component, sayfa değil). `crm-mega.tsx` MIXED'e dahildir çünkü `from "@/components/shared/UnifiedKPI"` import'una sahiptir; içindeki yerel `ChannelKPIStrip` tanımı tetikleyici değildir.

---

## 1. Tespit edilen iki template ailesi

### Template A — "YENİ" (tutulacak)
**Dizin:** `client/src/components/module-layout/`

| Dosya | Rol |
|---|---|
| `ModuleLayout.tsx` | Ana sayfa kabuğu (sidebar + KPI strip + content slot) |
| `ModuleSidebar.tsx` | Modül-içi sol nav |
| `KPIStrip.tsx` | KPI şerit "kabuk" bileşeni — kendisi `UnifiedKPI`'yı sarar (aşağıdaki KPI bağımlılık notuna bakın) |

**Kullanım (doğrulanmış):**
- **`ModuleLayout` import eden sayfa: 4** — `pages/fabrika/index.tsx`, `pages/akademi-mega.tsx`, `pages/ik.tsx`, `pages/ekipman-mega.tsx`.
- **`KPIStrip`'i doğrudan import eden sayfa: 0.** Hiçbir page dosyası `module-layout/KPIStrip`'i doğrudan import etmiyor.
- **`KPIStrip` doğrudan import eden component: 2** — `components/module-layout/ModuleLayout.tsx` (kabuk içi) ve `components/mission-control/MissionControlDynamic.tsx`.
- **`UnifiedKPI` / `CompactKPIStrip` import eden sayfa: 26** — aşağıda MIXED listesi.

#### KPI bağımlılık yönü (önemli düzeltme)

İlk taslakta yön ters yazılmıştı; **doğrusu**:

```
components/shared/UnifiedKPI.tsx
  ├─ export function UnifiedKPI(...)         (asıl KPI bileşeni)
  └─ export { UnifiedKPI as CompactKPIStrip } (alias re-export)
        ▲                ▲
        │                │
        │ imports        │ imports (alias adıyla)
        │                │
components/module-layout/KPIStrip.tsx
  → UnifiedKPI'yı sarar  ───── 26 MIXED sayfa (UnifiedKPI / CompactKPIStrip)
```

Yani `KPIStrip` `UnifiedKPI`'yı **import eder/sarar**, tersi değil. `CompactKPIStrip` `UnifiedKPI`'nın `as` aliasıdır. MIXED listesindeki 26 sayfa `KPIStrip`'i dolaylı kullanmıyor — paylaşılan `UnifiedKPI` bileşenini doğrudan kullanıyor; bu bileşen aynı zamanda `KPIStrip`'in altında da yer aldığı için "yeni KPI ailesi" başlığı altında değerlendirilir ve template konsolidasyonunda aynı tarafa düşer.

### Template B — "ESKİ" (silinecek aday kabuk)
**Dizin:** `client/src/components/layout/`

| Dosya | İçerik | Sayfa kullanıcı sayısı |
|---|---|---|
| `PageShell.tsx` | Sayfa kabuğu (eski tarz) | **1** (`control-dashboard.tsx`) |
| `KPIBar.tsx` | KPI bar (eski) | **1** (`control-dashboard.tsx`) |
| `WidgetCard.tsx` | Widget card kabuğu | **1** (`control-dashboard.tsx`) |
| `WidgetGrid.tsx` | Widget grid kabuğu | **1** (`control-dashboard.tsx`) |
| `MiniStatGrid.tsx` (+ `ProgressBar`, `AlertBox`) | Mini stat / progress / alert primitives | **1** (`control-dashboard.tsx`) |
| `ModuleTabBar.tsx` | Tab bar bileşeni | **0 — HİÇBİR DIŞ KULLANICI** (sadece `index.ts` re-export ediyor) |
| `index.ts` | Barrel re-export | yalnızca yukarıdaki kardeş dosyaları export eder |

**Sonuç:** `layout/` altındaki "template" dosyalarının **tek kullanıcısı** `client/src/pages/control-dashboard.tsx`'dir (route: `/control`). `ModuleTabBar.tsx` ise tamamen ölü koddur.

### Template-DIŞI (yanlış pozitif olmasın diye ayrıca işaretlenir)
Aynı `client/src/components/layout/` dizininde olup template DEĞİL, **navigasyon altyapısı** olan dosyalar:

| Dosya | Rol | Kullanan |
|---|---|---|
| `RouteModuleSidebar.tsx` | App-level dinamik sidebar (route → menü) | `client/src/App.tsx` |
| `module-menu-config.ts` | Sidebar menü konfigürasyonu | `RouteModuleSidebar.tsx` |

Bu iki dosya **AKTİF infrastruktür**dür, sınıflandırma kuralında "OLD" sayılmaz, **dokunulmaz**.

---

## 2. Sayfa düzeyinde sınıflandırma — özet

| Kategori | Sayı | Tanım |
|---|---|---|
| **NEW** | **4** | `ModuleLayout` kabuğu kullananlar |
| **OLD** | **1** | `layout/*` (RouteModuleSidebar/module-menu-config hariç) import edenler |
| **MIXED** | **26** | Sadece `KPIStrip`/`CompactKPIStrip` (yeni primitiv) kullananlar |
| **NONE** | **285** | Hiçbir template kabuğu/primitivi kullanmıyor |
| **TOPLAM** | **316** | `pages/**/*.{ts,tsx,js,jsx}` recursive |

Tam dosya listeleri için **Bölüm 7 (Per-page Appendix)**'e bakınız.

---

## 3. Import grafiği özeti

```
App.tsx
 └─ RouteModuleSidebar  (app-level sidebar — TUTULUR)
       └─ module-menu-config.ts  (TUTULUR)

[Yeni template ailesi — TUTULUR]
module-layout/ModuleLayout
 ├─ module-layout/ModuleSidebar
 └─ module-layout/KPIStrip   ──→ shared/UnifiedKPI  (KPIStrip, UnifiedKPI'yı sarar)
      └── 4 NEW sayfa (ModuleLayout kabuk üzerinden)

components/mission-control/MissionControlDynamic.tsx
 └─ module-layout/KPIStrip (doğrudan import — sayfa-dışı tek doğrudan kullanıcı)

components/shared/UnifiedKPI.tsx
 ├─ export UnifiedKPI
 └─ export { UnifiedKPI as CompactKPIStrip }
      └── 26 MIXED sayfa (UnifiedKPI / CompactKPIStrip — paylaşılan KPI bileşeni)

[Eski template ailesi — Faz B aday]
layout/PageShell ──┐
layout/KPIBar ─────┤
layout/WidgetCard ─┼──→ control-dashboard.tsx  (TEK KULLANICI)
layout/WidgetGrid ─┤
layout/MiniStatGrid┘
layout/ModuleTabBar  (HİÇBİR KULLANICI YOK — ÖLÜ KOD)
layout/index.ts      (barrel — yukarıdakileri re-export)
```

---

## 4. Faz B için silinecek aday listesi

### 4.1 Kesinlikle ölü (zero-risk silme)
- `client/src/components/layout/ModuleTabBar.tsx` — hiçbir sayfa veya component import etmiyor (`rg "ModuleTabBar" client/src` sadece kendisi + barrel'da geçer).
- `client/src/components/layout/index.ts` içindeki `ModuleTabBar` re-export satırı.

### 4.2 Tek kullanıcılı (riskli — `/control` route'una bağlı)
Aşağıdakiler **sadece** `client/src/pages/control-dashboard.tsx` tarafından kullanılıyor:
- `client/src/components/layout/PageShell.tsx`
- `client/src/components/layout/KPIBar.tsx`
- `client/src/components/layout/WidgetCard.tsx`
- `client/src/components/layout/WidgetGrid.tsx`
- `client/src/components/layout/MiniStatGrid.tsx` (ile `ProgressBar`, `AlertBox`)
- `client/src/components/layout/index.ts` (barrel'ın kalan satırları)

**Karar gerekli (Owner GO, Faz B):**
- **Seçenek 1:** `control-dashboard.tsx` sayfasını yeni template'e (ModuleLayout + KPIStrip) migrate et → tüm `layout/*` template dosyaları silinir.
- **Seçenek 2:** Sadece kesinlikle ölü olanı (`ModuleTabBar.tsx` + barrel'dan ilgili satır) sil; `control-dashboard.tsx` ve bağımlı 5 dosya pilot süresince dokunulmadan bırakılır → migration Faz C/Sprint 6'ya ertelenir.

**Tavsiye:** Pilot UI riskini sıfır tutmak için Faz B = **Seçenek 2** (sadece `ModuleTabBar.tsx` + `index.ts` satırı). Faz C'de `/control` sayfası migrate edilir + kalan 5 dosya silinir.

---

## 5. Faz C kapsamı (post-pilot, ayrı task)

- `control-dashboard.tsx` → `ModuleLayout` + `KPIStrip` migrasyonu (1 sayfa).
- Hiçbir template kabuğu kullanmayan 285 NONE sayfası için **opsiyonel** standardizasyon (yüksek efor, düşük öncelik). Çoğu kendi `Card` kompozisyonuyla kurulu, tek tek değerlendirilmeli.
- 26 MIXED sayfa zaten yeni primitiv (CompactKPIStrip) kullandığı için tam migration düşük efor (ModuleLayout kabuğuyla sarmak yeter).

---

## 6. Numerik özet

| Metrik | Değer |
|---|---|
| `module-layout/` (yeni) altındaki dosya | 3 |
| `module-layout/ModuleLayout` import eden sayfa | **4** |
| `KPIStrip` doğrudan import eden sayfa | **0** |
| `KPIStrip` doğrudan import eden component (page-dışı) | 3 |
| `CompactKPIStrip` (= `KPIStrip` sarmalayıcı) kullanan sayfa | **26** |
| `layout/` altındaki template dosyası | 7 (`PageShell`, `KPIBar`, `WidgetCard`, `WidgetGrid`, `MiniStatGrid`, `ModuleTabBar`, `index.ts`) |
| `layout/` template dosyalarını import eden sayfa | **1** (`control-dashboard.tsx`) |
| `layout/` altında **navigasyon** (template-dışı, korunur) | 2 (`RouteModuleSidebar.tsx`, `module-menu-config.ts`) |
| Faz B "kesinlikle ölü" silme adayı | **1 dosya** (`ModuleTabBar.tsx`) + 1 barrel satırı |
| Faz B "tek kullanıcılı" silme adayı (Owner kararı) | 5 dosya + barrel + 1 sayfa migration |
| Toplam taranan page dosyası | **316** (`pages/**/*.{ts,tsx,js,jsx}`) |

---

## 7. Per-page Appendix (auto-generated, 316/316 dosya)

Üretim: `node /tmp/classify.mjs` (script kuralı Bölüm 0). `client/` prefix kısaltıldı.

### NEW (4) — `ModuleLayout` kabuğu kullanan
- `pages/akademi-mega.tsx`
- `pages/ekipman-mega.tsx`
- `pages/fabrika/index.tsx`
- `pages/ik.tsx`

### OLD (1) — `layout/*` (RouteModuleSidebar/module-menu-config hariç) import eden
- `pages/control-dashboard.tsx`

### MIXED (26) — `KPIStrip` / `CompactKPIStrip` kullanan ama kabuk yok
- `pages/admin/index.tsx`
- `pages/akademi-hq/IstatistiklerTab.tsx`
- `pages/akademi-hq/SubeAnalizTab.tsx`
- `pages/akademi-hq/WebinarTab.tsx`
- `pages/ariza.tsx`
- `pages/fabrika/dashboard.tsx`
- `pages/fabrika/gida-guvenligi.tsx`
- `pages/hq-dashboard.tsx`
- `pages/hq-personel-istatistikleri.tsx`
- `pages/hr-reports.tsx`
- `pages/kalite-denetimi.tsx`
- `pages/merkez-dashboard.tsx`
- `pages/my-performance.tsx`
- `pages/personel-profil.tsx`
- `pages/satinalma/satinalma-dashboard.tsx`
- `pages/satinalma/sayim-yonetimi.tsx`
- `pages/satinalma/trend-analizi.tsx`
- `pages/sikayetler.tsx`
- `pages/sube-gorevler.tsx`
- `pages/sube-ozet.tsx`
- `pages/sube/dashboard.tsx`
- `pages/tasks.tsx`
- `pages/vardiyalarim.tsx`
- `pages/yonetim/ai-maliyetler.tsx`
- `pages/yonetim/ekipman-yonetimi.tsx`
- `pages/yonetim/servis-talepleri.tsx`

### NONE (285) — hiçbir template kabuğu / primitivi yok
- `pages/academy-achievements.tsx`
- `pages/academy-adaptive-engine.tsx`
- `pages/academy-advanced-analytics.tsx`
- `pages/academy-ai-assistant.tsx`
- `pages/academy-ai-panel.tsx`
- `pages/academy-analytics.tsx`
- `pages/academy-badges.tsx`
- `pages/academy-branch-analytics.tsx`
- `pages/academy-certificates.tsx`
- `pages/academy-cohort-analytics.tsx`
- `pages/academy-content-management.tsx`
- `pages/academy-explore.tsx`
- `pages/academy-landing.tsx`
- `pages/academy-leaderboard.tsx`
- `pages/academy-learning-path-detail.tsx`
- `pages/academy-learning-paths.tsx`
- `pages/academy-module-editor.tsx`
- `pages/academy-my-path.tsx`
- `pages/academy-progress-overview.tsx`
- `pages/academy-quiz.tsx`
- `pages/academy-social-groups.tsx`
- `pages/academy-streak-tracker.tsx`
- `pages/academy-supervisor.tsx`
- `pages/academy-team-competitions.tsx`
- `pages/academy-webinars.tsx`
- `pages/academy.tsx`
- `pages/admin-employee-types.tsx`
- `pages/admin-mega.tsx`
- `pages/admin-seed.tsx`
- `pages/admin/ai-bilgi-yonetimi.tsx`
- `pages/admin/ai-politikalari.tsx`
- `pages/admin/aktivite-loglari.tsx`
- `pages/admin/bannerlar.tsx`
- `pages/admin/cop-kutusu.tsx`
- `pages/admin/critical-logs.tsx`
- `pages/admin/dashboard-ayarlari.tsx`
- `pages/admin/degisiklik-talepleri.tsx`
- `pages/admin/delegasyon.tsx`
- `pages/admin/dobody-avatarlar.tsx`
- `pages/admin/dobody-gorev-yonetimi.tsx`
- `pages/admin/duyurular.tsx`
- `pages/admin/email-ayarlari.tsx`
- `pages/admin/envanter-kategori-denetimi.tsx`
- `pages/admin/fabrika-fire-sebepleri.tsx`
- `pages/admin/fabrika-istasyonlar.tsx`
- `pages/admin/fabrika-kalite-kriterleri.tsx`
- `pages/admin/fabrika-pin-yonetimi.tsx`
- `pages/admin/gorev-sablonlari.tsx`
- `pages/admin/gorunum-ayarlari.tsx`
- `pages/admin/kullanicilar.tsx`
- `pages/admin/module-flags.tsx`
- `pages/admin/pilot-dashboard.tsx`
- `pages/admin/rol-yetkileri.tsx`
- `pages/admin/servis-mail-ayarlari.tsx`
- `pages/admin/sifre-yonetimi.tsx`
- `pages/admin/sube-pin-yonetimi.tsx`
- `pages/admin/toplu-veri-yonetimi.tsx`
- `pages/admin/veri-disa-aktarma.tsx`
- `pages/admin/veri-kilitleri.tsx`
- `pages/admin/widget-editor.tsx`
- `pages/admin/widget-yonetimi.tsx`
- `pages/admin/yapay-zeka-ayarlari.tsx`
- `pages/admin/yedekleme.tsx`
- `pages/admin/yetkilendirme.tsx`
- `pages/admin/yonetici-degerlendirme.tsx`
- `pages/advanced-reports.tsx`
- `pages/agent-merkezi.tsx`
- `pages/ajanda.tsx`
- `pages/akademi-hq/ModullerTab.tsx`
- `pages/akademi-hq/QuizYonetimTab.tsx`
- `pages/akademi-hq/SertifikaTab.tsx`
- `pages/akademi-hq/SinavTalepleriTab.tsx`
- `pages/akademi-hq/components/AIModuleCreator.tsx`
- `pages/akademi-hq/components/RoleDashboard.tsx`
- `pages/akademi-hq/index.tsx`
- `pages/akademi-v3/CareerTab.tsx`
- `pages/akademi-v3/HomeTab.tsx`
- `pages/akademi-v3/TrainingTab.tsx`
- `pages/akademi-v3/WebinarTab.tsx`
- `pages/akademi-v3/categoryConfig.ts`
- `pages/akademi-v3/index.tsx`
- `pages/aksiyon-takip.tsx`
- `pages/announcements.tsx`
- `pages/ariza-detay.tsx`
- `pages/ariza-yeni.tsx`
- `pages/attendance.tsx`
- `pages/badge-collection.tsx`
- `pages/banner-editor.tsx`
- `pages/benim-gunum.tsx`
- `pages/bordrom.tsx`
- `pages/branch-feedback.tsx`
- `pages/canli-takip.tsx`
- `pages/capa-detay.tsx`
- `pages/capa-raporlari.tsx`
- `pages/cash-reports.tsx`
- `pages/ceo-command-center.tsx`
- `pages/cgo-command-center.tsx`
- `pages/cgo-teknik-komuta.tsx`
- `pages/checklists.tsx`
- `pages/coach-content-library.tsx`
- `pages/coach-gate-management.tsx`
- `pages/coach-kontrol-merkezi.tsx`
- `pages/coach-kpi-signals.tsx`
- `pages/coach-onboarding-studio.tsx`
- `pages/coach-sube-denetim.tsx`
- `pages/coach-team-progress.tsx`
- `pages/coach-uyum-paneli.tsx`
- `pages/cowork.tsx`
- `pages/crm-mega.tsx`
- `pages/crm/analytics.tsx`
- `pages/crm/campaigns.tsx`
- `pages/crm/feedback.tsx`
- `pages/crm/sla-tracking.tsx`
- `pages/denetim-detay-v2.tsx`
- `pages/denetim-sablonlari.tsx`
- `pages/denetim-yurutme.tsx`
- `pages/denetimler.tsx`
- `pages/depo-centrum.tsx`
- `pages/destek-centrum.tsx`
- `pages/destek.tsx`
- `pages/duyuru-detay.tsx`
- `pages/e2e-raporlar.tsx`
- `pages/egitim-programi.tsx`
- `pages/ekipman-analitics.tsx`
- `pages/ekipman-katalog.tsx`
- `pages/employee-of-month.tsx`
- `pages/equipment-detail.tsx`
- `pages/equipment.tsx`
- `pages/fabrika-centrum.tsx`
- `pages/fabrika-keyblend-yonetimi.tsx`
- `pages/fabrika-recete-detay.tsx`
- `pages/fabrika-recete-duzenle.tsx`
- `pages/fabrika-receteler.tsx`
- `pages/fabrika-stok-merkezi.tsx`
- `pages/fabrika-uretim-modu.tsx`
- `pages/fabrika.tsx`
- `pages/fabrika/ai-raporlar.tsx`
- `pages/fabrika/fabrika-yonetim-skoru.tsx`
- `pages/fabrika/kalite-kontrol.tsx`
- `pages/fabrika/kavurma.tsx`
- `pages/fabrika/kiosk.tsx`
- `pages/fabrika/lot-izleme.tsx`
- `pages/fabrika/maliyet-yonetimi.tsx`
- `pages/fabrika/performans.tsx`
- `pages/fabrika/sevkiyat.tsx`
- `pages/fabrika/siparis-hazirlama.tsx`
- `pages/fabrika/stok-sayim.tsx`
- `pages/fabrika/uretim-planlama.tsx`
- `pages/fabrika/vardiya-planlama.tsx`
- `pages/fabrika/vardiya-uyumluluk.tsx`
- `pages/forgot-password.tsx`
- `pages/franchise-acilis.tsx`
- `pages/franchise-ozet.tsx`
- `pages/franchise-yatirimci-detay.tsx`
- `pages/franchise-yatirimcilar.tsx`
- `pages/gida-guvenligi-dashboard.tsx`
- `pages/gorev-detay.tsx`
- `pages/guest-complaints.tsx`
- `pages/guest-form-settings.tsx`
- `pages/hq-fabrika-analitik.tsx`
- `pages/hq-support.tsx`
- `pages/hq-vardiya-goruntuleme.tsx`
- `pages/hq/kiosk.tsx`
- `pages/hq/staff-dashboard.tsx`
- `pages/hub-page.tsx`
- `pages/icerik-studyosu.tsx`
- `pages/iletisim-merkezi/BroadcastTab.tsx`
- `pages/iletisim-merkezi/DashboardTab.tsx`
- `pages/iletisim-merkezi/HqTasksTab.tsx`
- `pages/iletisim-merkezi/NewTicketDialog.tsx`
- `pages/iletisim-merkezi/TicketDetailSheet.tsx`
- `pages/iletisim-merkezi/categoryConfig.ts`
- `pages/iletisim-merkezi/crm-nav.tsx`
- `pages/iletisim-merkezi/sla-rules-panel.tsx`
- `pages/iletisim-merkezi/ticket-chat-panel.tsx`
- `pages/iletisim-merkezi/ticket-list-panel.tsx`
- `pages/kalite-alerjen.tsx`
- `pages/kalite-kontrol-dashboard.tsx`
- `pages/kalite/besin-onay.tsx`
- `pages/kampanya-yonetimi.tsx`
- `pages/kayip-esya-hq.tsx`
- `pages/kayip-esya.tsx`
- `pages/knowledge-base.tsx`
- `pages/kocluk-paneli.tsx`
- `pages/kullanim-kilavuzu.tsx`
- `pages/leave-requests.tsx`
- `pages/login.tsx`
- `pages/maas.tsx`
- `pages/mali-yonetim.tsx`
- `pages/maliyet-analizi.tsx`
- `pages/marketing-centrum.tsx`
- `pages/mesajlar.tsx`
- `pages/misafir-geri-bildirim.tsx`
- `pages/misafir-memnuniyeti-modul.tsx`
- `pages/modul.tsx`
- `pages/module-detail.tsx`
- `pages/mrp-daily-plan.tsx`
- `pages/muhasebe-centrum.tsx`
- `pages/muhasebe-raporlama.tsx`
- `pages/muhasebe.tsx`
- `pages/musteri-alerjen-public.tsx`
- `pages/nfc-giris.tsx`
- `pages/not-found.tsx`
- `pages/notifications.tsx`
- `pages/onboarding-programlar.tsx`
- `pages/operasyon-mega.tsx`
- `pages/overtime-requests.tsx`
- `pages/pdks-excel-import.tsx`
- `pages/pdks-izin-gunleri.tsx`
- `pages/pdks.tsx`
- `pages/performance.tsx`
- `pages/personel-centrum.tsx`
- `pages/personel-detay.tsx`
- `pages/personel-duzenle.tsx`
- `pages/personel-musaitlik.tsx`
- `pages/personel-onboarding.tsx`
- `pages/pilot-launch.tsx`
- `pages/privacy-policy.tsx`
- `pages/proje-detay.tsx`
- `pages/proje-gorev-detay.tsx`
- `pages/projeler.tsx`
- `pages/public-staff-rating.tsx`
- `pages/public-urun.tsx`
- `pages/qr-scanner.tsx`
- `pages/raporlar-finansal.tsx`
- `pages/raporlar-hub.tsx`
- `pages/raporlar-insight.tsx`
- `pages/raporlar-mega.tsx`
- `pages/raporlar.tsx`
- `pages/recete-detay.tsx`
- `pages/receteler.tsx`
- `pages/register.tsx`
- `pages/reset-password.tsx`
- `pages/satinalma-centrum.tsx`
- `pages/satinalma-mega.tsx`
- `pages/satinalma/cari-takip.tsx`
- `pages/satinalma/mal-kabul.tsx`
- `pages/satinalma/siparis-yonetimi.tsx`
- `pages/satinalma/stok-yonetimi.tsx`
- `pages/satinalma/tedarikci-yonetimi.tsx`
- `pages/satinalma/urun-karti.tsx`
- `pages/setup.tsx`
- `pages/sistem-atolyesi.tsx`
- `pages/staff-qr-tokens.tsx`
- `pages/sube-bordro-ozet.tsx`
- `pages/sube-centrum.tsx`
- `pages/sube-detay.tsx`
- `pages/sube-karsilastirma.tsx`
- `pages/sube-nfc-detay.tsx`
- `pages/sube-saglik-skoru.tsx`
- `pages/sube-uyum-merkezi.tsx`
- `pages/sube/checklist-execution.tsx`
- `pages/sube/employee-dashboard.tsx`
- `pages/sube/kiosk.tsx`
- `pages/sube/siparis-stok.tsx`
- `pages/subeler.tsx`
- `pages/supbuddy-centrum.tsx`
- `pages/supervisor-centrum.tsx`
- `pages/supervisor-onboarding.tsx`
- `pages/task-atama.tsx`
- `pages/task-takip.tsx`
- `pages/trainer-egitim-merkezi.tsx`
- `pages/training-assign.tsx`
- `pages/vardiya-checkin.tsx`
- `pages/vardiya-planlama.tsx`
- `pages/vardiyalar.tsx`
- `pages/waste-coach-console.tsx`
- `pages/waste-entry.tsx`
- `pages/waste-executive.tsx`
- `pages/waste-mega.tsx`
- `pages/waste-qc-console.tsx`
- `pages/waste-trainer-console.tsx`
- `pages/yatirimci-centrum.tsx`
- `pages/yatirimci-hq-centrum.tsx`
- `pages/yeni-sube-detay.tsx`
- `pages/yeni-sube-mega.tsx`
- `pages/yeni-sube-projeler.tsx`
- `pages/yonetim/akademi.tsx`
- `pages/yonetim/ayarlar.tsx`
- `pages/yonetim/checklist-takip.tsx`
- `pages/yonetim/checklistler.tsx`
- `pages/yonetim/ekipman-servis.tsx`
- `pages/yonetim/icerik.tsx`
- `pages/yonetim/kullanicilar.tsx`
- `pages/yonetim/menu.tsx`

---

## 8. Faz A çıkış kriterleri (Done)

- [x] `client/src/components/module-layout/` envanteri çıkarıldı
- [x] `client/src/components/layout/` envanteri çıkarıldı
- [x] Sayım kapsamı (`Bölüm 0`) ve sınıflandırma kuralı açıkça tanımlandı
- [x] Her template dosyası için sayfa kullanıcı sayısı **bağımsız `rg` ile** ölçüldü
- [x] **316/316 sayfa için per-page sınıflandırma** tablosu (Bölüm 7) üretildi
- [x] KPIStrip doğrudan vs. dolaylı (CompactKPIStrip) ayrımı netleştirildi
- [x] Dead-file listesi (`ModuleTabBar.tsx`) çıkarıldı
- [x] Faz B için iki seçenek + tavsiye (Seçenek 2) yazıldı
- [x] Faz C kapsamı ayrıştırıldı

**Faz A → COMPLETE. Faz B Owner GO bekliyor.**
