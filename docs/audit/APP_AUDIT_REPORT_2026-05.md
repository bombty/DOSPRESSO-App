# DOSPRESSO Tam Uygulama Denetim Raporu (2026-05-02)

> **Sadece okuma denetimi.** Hiçbir kaynak dosya değiştirilmedi, hiçbir sayfa silinmedi, hiçbir route taşınmadı.
> Silme/birleştirme/redirect kararları kullanıcı ile ayrı takip görevlerinde tek tek ele alınacak.
> Üretici: bu rapor lokal bir yardımcı script (`.local/scripts/audit-app.mjs`, repo dışı) ile üretildi. Script repo'ya commit edilmedi; teslimat **sadece bu tek Markdown dosyasıdır**.

> **Yöntem & güven uyarısı:** Tüm sayımlar **regex tabanlı statik tarama** ile elde edilmiştir. Wouter wildcard/opsiyonel param desteği eklenmiş olsa da; dinamik string interpolasyonu (`fetch(\`/api/${x}\`)`), `apiRequest()` sarmalayıcı içindeki path birleştirmeleri, koşullu mount edilen router'lar ve runtime-üretilen route'lar **tespit edilemez**. Bu nedenle Bölüm 3, 6, 7'deki "kırık" sayıları **kesin production hatası değil, _aday_ listesidir** — her satır manuel doğrulamayla ele alınmalıdır.

## 0. Sayısal Özet

| Metrik | Değer |
|---|---|
| Toplam sayfa dosyası (`client/src/pages/**`) | **326** |
| App.tsx `<Route>` tanımı | **260** |
| App.tsx'ten import edilen sayfa | **230** |
| Gerçek öksüz sayfa | **10** |
| Mega-modül alt sayfası | **81** |
| Kodda kullanılan benzersiz path literal | **125** |
| **Kırık link** (route'a eşleşmiyor) | **10** |
| Menü/nav dosyalarında kırık path | **3** |
| `/api/me/menu` kaynağında kırık path | **0** |
| Sunucu endpoint sayısı (prefix uygulanmış) | **1985** |
| Frontend API çağrı çeşidi | **806** |
| **Kırık API çağrısı** (FE'de var, server'da yok) | **118** |
| Ölü endpoint adayı (server'da var, FE'de yok) | **1278** |
| Duplikat/legacy grup | **8** |
| Redirect bileşeni | **17** |
| TODO / FIXME / HACK | **5 / 0 / 0** |
| @ts-ignore / @ts-expect-error | **5 / 0** |
| LSP hata dosyası / hata sayısı | **0 / 0** |
| `console.error` toplam | **2466** |
| `throw new Error` toplam | **414** |

## 1. Route ↔ Sayfa Dosyası Eşleşme Matrisi

Aşağıdaki matris **App.tsx'teki her `<Route>`** ile karşılık gelen **sayfa dosyası**nı eşleştirir. Component isminden `lazyWithRetry(import("@/pages/..."))` zincirine bakılır.

| # | Route path | Component | Sayfa dosyası | App.tsx satır |
|---|---|---|---|---|
| 1 | `/` | `HomeScreen` | _(inline veya bulunamadı)_ | `client/src/App.tsx:436` |
| 2 | `/admin/*?` | `AdminMegaModule` | `client/src/pages/admin-mega.tsx` | `client/src/App.tsx:657` |
| 3 | `/admin/aktivite-loglari` | `AdminAktiviteLoglari` | `client/src/pages/admin/aktivite-loglari.tsx` | `client/src/App.tsx:554` |
| 4 | `/admin/bannerlar` | `AdminBannerlar` | `client/src/pages/admin/bannerlar.tsx` | `client/src/App.tsx:558` |
| 5 | `/admin/critical-logs` | `AdminCriticalLogs` | `client/src/pages/admin/critical-logs.tsx` | `client/src/App.tsx:557` |
| 6 | `/admin/duyurular` | `AdminDuyurular` | `client/src/pages/admin/duyurular.tsx` | `client/src/App.tsx:559` |
| 7 | `/admin/email-ayarlari` | `AdminEmailAyarlari` | `client/src/pages/admin/email-ayarlari.tsx` | `client/src/App.tsx:560` |
| 8 | `/admin/fabrika-fire-sebepleri` | `AdminFabrikaFireSebepleri` | `client/src/pages/admin/fabrika-fire-sebepleri.tsx` | `client/src/App.tsx:561` |
| 9 | `/admin/fabrika-istasyonlar` | `AdminFabrikaIstasyonlar` | `client/src/pages/admin/fabrika-istasyonlar.tsx` | `client/src/App.tsx:562` |
| 10 | `/admin/fabrika-kalite-kriterleri` | `AdminFabrikaKaliteKriterleri` | `client/src/pages/admin/fabrika-kalite-kriterleri.tsx` | `client/src/App.tsx:563` |
| 11 | `/admin/fabrika-pin-yonetimi` | `AdminFabrikaPinYonetimi` | `client/src/pages/admin/fabrika-pin-yonetimi.tsx` | `client/src/App.tsx:564` |
| 12 | `/admin/pilot-dashboard` | `AdminPilotDashboard` | `client/src/pages/admin/pilot-dashboard.tsx` | `client/src/App.tsx:555` |
| 13 | `/admin/rol-yetkileri` | `RolYetkileri` | `client/src/pages/admin/rol-yetkileri.tsx` | `client/src/App.tsx:552` |
| 14 | `/admin/servis-mail-ayarlari` | `AdminServisMailAyarlari` | `client/src/pages/admin/servis-mail-ayarlari.tsx` | `client/src/App.tsx:565` |
| 15 | `/admin/sifre-yonetimi` | `AdminSifreYonetimi` | `client/src/pages/admin/sifre-yonetimi.tsx` | `client/src/App.tsx:556` |
| 16 | `/admin/toplu-veri-yonetimi` | `AdminTopluVeriYonetimi` | `client/src/pages/admin/toplu-veri-yonetimi.tsx` | `client/src/App.tsx:566` |
| 17 | `/admin/yapay-zeka-ayarlari` | `AdminYapayZekaAyarlari` | `client/src/pages/admin/yapay-zeka-ayarlari.tsx` | `client/src/App.tsx:567` |
| 18 | `/admin/yedekleme` | `AdminYedekleme` | `client/src/pages/admin/yedekleme.tsx` | `client/src/App.tsx:568` |
| 19 | `/admin/yetkilendirme` | `AdminYetkilendirme` | `client/src/pages/admin/yetkilendirme.tsx` | `client/src/App.tsx:569` |
| 20 | `/agent-merkezi` | `AgentMerkezi` | `client/src/pages/agent-merkezi.tsx` | `client/src/App.tsx:670` |
| 21 | `/ajanda` | `AjandaPage` | `client/src/pages/ajanda.tsx` | `client/src/App.tsx:656` |
| 22 | `/akademi-achievements` | `AcademyAchievements` | `client/src/pages/academy-achievements.tsx` | `client/src/App.tsx:501` |
| 23 | `/akademi-adaptive-engine` | `AcademyAdaptiveEngine` | `client/src/pages/academy-adaptive-engine.tsx` | `client/src/App.tsx:504` |
| 24 | `/akademi-advanced-analytics` | `AcademyAdvancedAnalytics` | `client/src/pages/academy-advanced-analytics.tsx` | `client/src/App.tsx:506` |
| 25 | `/akademi-ai-assistant` | `AcademyAIAssistant` | `client/src/pages/academy-ai-assistant.tsx` | `client/src/App.tsx:499` |
| 26 | `/akademi-ai-panel` | `AcademyAiPanel` | `client/src/pages/academy-ai-panel.tsx` | `client/src/App.tsx:653` |
| 27 | `/akademi-ana` | `AcademyLanding` | `client/src/pages/academy-landing.tsx` | `client/src/App.tsx:647` |
| 28 | `/akademi-analytics` | `AcademyAnalytics` | `client/src/pages/academy-analytics.tsx` | `client/src/App.tsx:494` |
| 29 | `/akademi-badges` | `AcademyBadges` | `client/src/pages/academy-badges.tsx` | `client/src/App.tsx:495` |
| 30 | `/akademi-branch-analytics` | `AcademyBranchAnalytics` | `client/src/pages/academy-branch-analytics.tsx` | `client/src/App.tsx:507` |
| 31 | `/akademi-certificates` | `AcademyCertificates` | `client/src/pages/academy-certificates.tsx` | `client/src/App.tsx:497` |
| 32 | `/akademi-cohort-analytics` | `AcademyCohortAnalytics` | `client/src/pages/academy-cohort-analytics.tsx` | `client/src/App.tsx:508` |
| 33 | `/akademi-hq` | `AcademyHQ` | `client/src/pages/akademi-hq/index.tsx` | `client/src/App.tsx:492` |
| 34 | `/akademi-icerik-yonetimi` | `AcademyContentMgmt` | `client/src/pages/academy-content-management.tsx` | `client/src/App.tsx:641` |
| 35 | `/akademi-leaderboard` | `AcademyLeaderboard` | `client/src/pages/academy-leaderboard.tsx` | `client/src/App.tsx:496` |
| 36 | `/akademi-learning-path/:pathId` | `AcademyLearningPathDetail` | `client/src/pages/academy-learning-path-detail.tsx` | `client/src/App.tsx:490` |
| 37 | `/akademi-learning-paths` | `AcademyLearningPaths` | `client/src/pages/academy-learning-paths.tsx` | `client/src/App.tsx:498` |
| 38 | `/akademi-legacy/*?` | `AkademiMegaModule` | `client/src/pages/akademi-mega.tsx` | `client/src/App.tsx:484` |
| 39 | `/akademi-modul-editor` | `AcademyModuleEditor` | `client/src/pages/academy-module-editor.tsx` | `client/src/App.tsx:486` |
| 40 | `/akademi-modul-editor/:id` | `AcademyModuleEditor` | `client/src/pages/academy-module-editor.tsx` | `client/src/App.tsx:485` |
| 41 | `/akademi-modul/:id` | `ModuleDetail` | `client/src/pages/module-detail.tsx` | `client/src/App.tsx:487` |
| 42 | `/akademi-progress-overview` | `AcademyProgressOverview` | `client/src/pages/academy-progress-overview.tsx` | `client/src/App.tsx:502` |
| 43 | `/akademi-quiz/:quizId` | `AcademyQuiz` | `client/src/pages/academy-quiz.tsx` | `client/src/App.tsx:488` |
| 44 | `/akademi-rozet-koleksiyonum` | `BadgeCollection` | `client/src/pages/badge-collection.tsx` | `client/src/App.tsx:489` |
| 45 | `/akademi-social-groups` | `AcademySocialGroups` | `client/src/pages/academy-social-groups.tsx` | `client/src/App.tsx:505` |
| 46 | `/akademi-streak-tracker` | `AcademyStreakTracker` | `client/src/pages/academy-streak-tracker.tsx` | `client/src/App.tsx:503` |
| 47 | `/akademi-supervisor` | `AcademySupervisor` | `client/src/pages/academy-supervisor.tsx` | `client/src/App.tsx:493` |
| 48 | `/akademi-team-competitions` | `AcademyTeamCompetitions` | `client/src/pages/academy-team-competitions.tsx` | `client/src/App.tsx:500` |
| 49 | `/akademi-v3/*?` | `AkademiV3` | `client/src/pages/akademi-v3/index.tsx` | `client/src/App.tsx:483` |
| 50 | `/akademi-webinars` | `AcademyWebinars` | `client/src/pages/academy-webinars.tsx` | `client/src/App.tsx:640` |
| 51 | `/akademi/*?` | `AkademiV3` | `client/src/pages/akademi-v3/index.tsx` | `client/src/App.tsx:482` |
| 52 | `/akademi/onboarding-programlar` | `Redirect` | _(inline veya bulunamadı)_ | `client/src/App.tsx:460` |
| 53 | `/akademi/personel-onboarding` | `Redirect` | _(inline veya bulunamadı)_ | `client/src/App.tsx:459` |
| 54 | `/aksiyon-takip` | `AksiyonTakip` | `client/src/pages/aksiyon-takip.tsx` | `client/src/App.tsx:646` |
| 55 | `/ariza` | `FaultHub` | `client/src/pages/ariza.tsx` | `client/src/App.tsx:476` |
| 56 | `/ariza-detay/:id` | `FaultDetail` | `client/src/pages/ariza-detay.tsx` | `client/src/App.tsx:477` |
| 57 | `/ariza-yeni` | `NewFaultReport` | `client/src/pages/ariza-yeni.tsx` | `client/src/App.tsx:478` |
| 58 | `/ayin-elemani` | `EmployeeOfMonthPage` | `client/src/pages/employee-of-month.tsx` | `client/src/App.tsx:454` |
| 59 | `/banner-editor` | `BannerEditor` | `client/src/pages/banner-editor.tsx` | `client/src/App.tsx:630` |
| 60 | `/benim-gunum` | `—` | _(inline veya bulunamadı)_ | `client/src/App.tsx:671` |
| 61 | `/bildirimler` | `Notifications` | `client/src/pages/notifications.tsx` | `client/src/App.tsx:514` |
| 62 | `/bilgi-bankasi` | `KnowledgeBase` | `client/src/pages/knowledge-base.tsx` | `client/src/App.tsx:481` |
| 63 | `/bordrom` | `BordromPage` | `client/src/pages/bordrom.tsx` | `client/src/App.tsx:680` |
| 64 | `/canli-takip` | `CanliTakip` | `client/src/pages/canli-takip.tsx` | `client/src/App.tsx:548` |
| 65 | `/capa-raporlari` | `CapaRaporlari` | `client/src/pages/capa-raporlari.tsx` | `client/src/App.tsx:652` |
| 66 | `/capa/:id` | `CapaDetay` | `client/src/pages/capa-detay.tsx` | `client/src/App.tsx:602` |
| 67 | `/ceo-command-center` | `CEOCommandCenter` | `client/src/pages/ceo-command-center.tsx` | `client/src/App.tsx:658` |
| 68 | `/cgo-command-center` | `CGOCommandCenter` | `client/src/pages/cgo-command-center.tsx` | `client/src/App.tsx:659` |
| 69 | `/cgo-teknik-komuta` | `CgoTeknikKomuta` | `client/src/pages/cgo-teknik-komuta.tsx` | `client/src/App.tsx:573` |
| 70 | `/checklistler` | `Checklists` | `client/src/pages/checklists.tsx` | `client/src/App.tsx:473` |
| 71 | `/coach-kontrol-merkezi` | `CoachKontrolMerkezi` | `client/src/pages/coach-kontrol-merkezi.tsx` | `client/src/App.tsx:575` |
| 72 | `/coach-sube-denetim` | `CoachSubeDenetim` | `client/src/pages/coach-sube-denetim.tsx` | `client/src/App.tsx:597` |
| 73 | `/coach-uyum-paneli` | `CoachUyumPaneli` | `client/src/pages/coach-uyum-paneli.tsx` | `client/src/App.tsx:551` |
| 74 | `/control` | `ControlDashboard` | `client/src/pages/control-dashboard.tsx` | `client/src/App.tsx:437` |
| 75 | `/control-legacy` | `—` | _(inline veya bulunamadı)_ | `client/src/App.tsx:438` |
| 76 | `/cowork` | `Cowork` | `client/src/pages/cowork.tsx` | `client/src/App.tsx:574` |
| 77 | `/crm` | `CRMMegaModule` | `client/src/pages/crm-mega.tsx` | `client/src/App.tsx:449` |
| 78 | `/crm/:tab?` | `CRMMegaModule` | `client/src/pages/crm-mega.tsx` | `client/src/App.tsx:450` |
| 79 | `/crm/*?` | `CRMMegaModule` | `client/src/pages/crm-mega.tsx` | `client/src/App.tsx:655` |
| 80 | `/denetim-sablonlari` | `DenetimSablonlari` | `client/src/pages/denetim-sablonlari.tsx` | `client/src/App.tsx:598` |
| 81 | `/denetim-v2/:id` | `DenetimDetayV2` | `client/src/pages/denetim-detay-v2.tsx` | `client/src/App.tsx:601` |
| 82 | `/denetim/:id` | `DenetimYurutme` | `client/src/pages/denetim-yurutme.tsx` | `client/src/App.tsx:600` |
| 83 | `/denetimler` | `Denetimler` | `client/src/pages/denetimler.tsx` | `client/src/App.tsx:599` |
| 84 | `/depo-centrum` | `DepoCentrum` | `client/src/pages/depo-centrum.tsx` | `client/src/App.tsx:581` |
| 85 | `/destek` | `Destek` | `client/src/pages/destek.tsx` | `client/src/App.tsx:625` |
| 86 | `/destek-centrum` | `DestekCentrum` | `client/src/pages/destek-centrum.tsx` | `client/src/App.tsx:588` |
| 87 | `/devam-takibi` | `Attendance` | `client/src/pages/attendance.tsx` | `client/src/App.tsx:468` |
| 88 | `/duyuru-studio` | `DuyuruStudioV2` | _(inline veya bulunamadı)_ | `client/src/App.tsx:631` |
| 89 | `/duyuru-yonetimi` | `Announcements` | `client/src/pages/announcements.tsx` | `client/src/App.tsx:635` |
| 90 | `/duyuru/:id` | `DuyuruDetay` | `client/src/pages/duyuru-detay.tsx` | `client/src/App.tsx:636` |
| 91 | `/duyurular` | `IcerikStudyosu` | `client/src/pages/icerik-studyosu.tsx` | `client/src/App.tsx:515` |
| 92 | `/e2e-raporlar` | `E2EReports` | `client/src/pages/e2e-raporlar.tsx` | `client/src/App.tsx:528` |
| 93 | `/egitim` | `—` | _(inline veya bulunamadı)_ | `client/src/App.tsx:513` |
| 94 | `/egitim-ata` | `TrainingAssign` | `client/src/pages/training-assign.tsx` | `client/src/App.tsx:512` |
| 95 | `/egitim-programi/:topicId` | `EgitimProgrami` | `client/src/pages/egitim-programi.tsx` | `client/src/App.tsx:491` |
| 96 | `/egitim/:id` | `ModuleDetail` | `client/src/pages/module-detail.tsx` | `client/src/App.tsx:511` |
| 97 | `/ekipman-analitics` | `EquipmentAnalytics` | `client/src/pages/ekipman-analitics.tsx` | `client/src/App.tsx:479` |
| 98 | `/ekipman-detay/:id` | `EquipmentDetail` | `client/src/pages/equipment-detail.tsx` | `client/src/App.tsx:474` |
| 99 | `/ekipman-katalog` | `EkipmanKatalog` | `client/src/pages/ekipman-katalog.tsx` | `client/src/App.tsx:639` |
| 100 | `/ekipman/:tab?` | `EkipmanMegaModule` | `client/src/pages/ekipman-mega.tsx` | `client/src/App.tsx:475` |
| 101 | `/fabrika-centrum` | `FabrikaCentrum` | `client/src/pages/fabrika-centrum.tsx` | `client/src/App.tsx:580` |
| 102 | `/fabrika/:tab?` | `FabrikaMegaModule` | `client/src/pages/fabrika/index.tsx` | `client/src/App.tsx:547` |
| 103 | `/fabrika/dashboard` | `FabrikaDashboardRedirect` | _(inline veya bulunamadı)_ | `client/src/App.tsx:421` |
| 104 | `/fabrika/keyblend-yonetimi` | `FabrikaKeyblendYonetimi` | `client/src/pages/fabrika-keyblend-yonetimi.tsx` | `client/src/App.tsx:543` |
| 105 | `/fabrika/kiosk` | `FabrikaKiosk` | `client/src/pages/fabrika/kiosk.tsx` | `client/src/App.tsx:422` |
| 106 | `/fabrika/maliyet-analizi` | `MaliyetAnalizi` | `client/src/pages/maliyet-analizi.tsx` | `client/src/App.tsx:545` |
| 107 | `/fabrika/malzeme-cekme` | `MRPDailyPlan` | `client/src/pages/mrp-daily-plan.tsx` | `client/src/App.tsx:544` |
| 108 | `/fabrika/receteler` | `FabrikaReceteler` | `client/src/pages/fabrika-receteler.tsx` | `client/src/App.tsx:541` |
| 109 | `/fabrika/receteler/:id` | `FabrikaReceteDetay` | `client/src/pages/fabrika-recete-detay.tsx` | `client/src/App.tsx:540` |
| 110 | `/fabrika/receteler/:id/duzenle` | `FabrikaReceteDuzenle` | `client/src/pages/fabrika-recete-duzenle.tsx` | `client/src/App.tsx:539` |
| 111 | `/fabrika/receteler/:id/uretim` | `FabrikaUretimModu` | `client/src/pages/fabrika-uretim-modu.tsx` | `client/src/App.tsx:537` |
| 112 | `/fabrika/receteler/yeni` | `FabrikaReceteDuzenle` | `client/src/pages/fabrika-recete-duzenle.tsx` | `client/src/App.tsx:536` |
| 113 | `/fabrika/stok-merkezi` | `FabrikaStokMerkezi` | `client/src/pages/fabrika-stok-merkezi.tsx` | `client/src/App.tsx:546` |
| 114 | `/forgot-password` | `ForgotPassword` | `client/src/pages/forgot-password.tsx` | `client/src/App.tsx:414` |
| 115 | `/franchise-acilis` | `FranchiseAcilis` | `client/src/pages/franchise-acilis.tsx` | `client/src/App.tsx:608` |
| 116 | `/franchise-ozet` | `FranchiseOzet` | `client/src/pages/franchise-ozet.tsx` | `client/src/App.tsx:675` |
| 117 | `/franchise-yatirimcilar` | `FranchiseYatirimcilar` | `client/src/pages/franchise-yatirimcilar.tsx` | `client/src/App.tsx:609` |
| 118 | `/franchise-yatirimcilar/:id` | `FranchiseYatirimciDetay` | `client/src/pages/franchise-yatirimci-detay.tsx` | `client/src/App.tsx:610` |
| 119 | `/gb-form-ayarlari` | `GuestFormSettings` | `client/src/pages/guest-form-settings.tsx` | `client/src/App.tsx:643` |
| 120 | `/gecit-yonetimi` | `CoachGateManagement` | `client/src/pages/coach-gate-management.tsx` | `client/src/App.tsx:651` |
| 121 | `/gelismis-raporlar` | `AdvancedReportsPage` | `client/src/pages/advanced-reports.tsx` | `client/src/App.tsx:455` |
| 122 | `/gida-guvenligi-dashboard` | `GidaGuvenligiDashboard` | `client/src/pages/gida-guvenligi-dashboard.tsx` | `client/src/App.tsx:662` |
| 123 | `/gizlilik-politikasi` | `PrivacyPolicy` | `client/src/pages/privacy-policy.tsx` | `client/src/App.tsx:444` |
| 124 | `/gorev-detay/:id` | `GorevDetay` | `client/src/pages/gorev-detay.tsx` | `client/src/App.tsx:471` |
| 125 | `/gorevler` | `Tasks` | `client/src/pages/tasks.tsx` | `client/src/App.tsx:470` |
| 126 | `/hq-dashboard/:department?` | `—` | _(inline veya bulunamadı)_ | `client/src/App.tsx:660` |
| 127 | `/hq-destek` | `HQSupport` | `client/src/pages/hq-support.tsx` | `client/src/App.tsx:607` |
| 128 | `/hq-fabrika-analitik` | `HQFabrikaAnalitik` | `client/src/pages/hq-fabrika-analitik.tsx` | `client/src/App.tsx:534` |
| 129 | `/hq-ozet` | `—` | _(inline veya bulunamadı)_ | `client/src/App.tsx:673` |
| 130 | `/hq-personel-durum` | `HqStaffDashboard` | `client/src/pages/hq/staff-dashboard.tsx` | `client/src/App.tsx:590` |
| 131 | `/hq-personel-istatistikleri` | `HQPersonelIstatistikleri` | `client/src/pages/hq-personel-istatistikleri.tsx` | `client/src/App.tsx:592` |
| 132 | `/hq-vardiya-goruntuleme` | `HqVardiyaGoruntuleme` | `client/src/pages/hq-vardiya-goruntuleme.tsx` | `client/src/App.tsx:591` |
| 133 | `/hq/kiosk` | `HqKiosk` | `client/src/pages/hq/kiosk.tsx` | `client/src/App.tsx:423` |
| 134 | `/hub/:sectionId` | `HubPage` | `client/src/pages/hub-page.tsx` | `client/src/App.tsx:628` |
| 135 | `/icerik-studyosu` | `IcerikStudyosu` | `client/src/pages/icerik-studyosu.tsx` | `client/src/App.tsx:516` |
| 136 | `/ik-raporlari` | `HRReports` | `client/src/pages/hr-reports.tsx` | `client/src/App.tsx:526` |
| 137 | `/ik/:tab?` | `IK` | `client/src/pages/ik.tsx` | `client/src/App.tsx:523` |
| 138 | `/iletisim` | `IletisimRedirect` | _(inline veya bulunamadı)_ | `client/src/App.tsx:448` |
| 139 | `/iletisim-merkezi` | `IletisimMerkeziRedirect` | _(inline veya bulunamadı)_ | `client/src/App.tsx:681` |
| 140 | `/izin-talepleri` | `LeaveRequests` | `client/src/pages/leave-requests.tsx` | `client/src/App.tsx:524` |
| 141 | `/kalite-denetimi` | `KaliteDenetimi` | `client/src/pages/kalite-denetimi.tsx` | `client/src/App.tsx:594` |
| 142 | `/kalite-kontrol-dashboard` | `KaliteKontrolDashboard` | `client/src/pages/kalite-kontrol-dashboard.tsx` | `client/src/App.tsx:661` |
| 143 | `/kalite/alerjen` | `KaliteAlerjen` | `client/src/pages/kalite-alerjen.tsx` | `client/src/App.tsx:595` |
| 144 | `/kalite/besin-onay` | `KaliteBesinOnay` | `client/src/pages/kalite/besin-onay.tsx` | `client/src/App.tsx:596` |
| 145 | `/kampanya-yonetimi` | `KampanyaYonetimi` | `client/src/pages/kampanya-yonetimi.tsx` | `client/src/App.tsx:644` |
| 146 | `/kasa-raporlari` | `CashReports` | `client/src/pages/cash-reports.tsx` | `client/src/App.tsx:527` |
| 147 | `/kayip-esya` | `KayipEsya` | `client/src/pages/kayip-esya.tsx` | `client/src/App.tsx:623` |
| 148 | `/kayip-esya-hq` | `KayipEsyaHQ` | `client/src/pages/kayip-esya-hq.tsx` | `client/src/App.tsx:624` |
| 149 | `/kocluk-paneli` | `KoclukPaneli` | `client/src/pages/kocluk-paneli.tsx` | `client/src/App.tsx:674` |
| 150 | `/kpi-sinyalleri` | `CoachKpiSignals` | `client/src/pages/coach-kpi-signals.tsx` | `client/src/App.tsx:649` |
| 151 | `/kullanim-kilavuzu` | `KullanimKilavuzu` | `client/src/pages/kullanim-kilavuzu.tsx` | `client/src/App.tsx:668` |
| 152 | `/login` | `Login` | `client/src/pages/login.tsx` | `client/src/App.tsx:412` |
| 153 | `/m/alerjen` | `MusteriAlerjenPublic` | `client/src/pages/musteri-alerjen-public.tsx` | `client/src/App.tsx:420` |
| 154 | `/m/alerjen/:id` | `MusteriAlerjenPublic` | `client/src/pages/musteri-alerjen-public.tsx` | `client/src/App.tsx:419` |
| 155 | `/maas` | `MaasPage` | `client/src/pages/maas.tsx` | `client/src/App.tsx:679` |
| 156 | `/mali-yonetim` | `MaliYonetim` | `client/src/pages/mali-yonetim.tsx` | `client/src/App.tsx:533` |
| 157 | `/marketing-centrum` | `MarketingCentrum` | `client/src/pages/marketing-centrum.tsx` | `client/src/App.tsx:587` |
| 158 | `/merkez-dashboard` | `MerkezDashboard` | `client/src/pages/merkez-dashboard.tsx` | `client/src/App.tsx:439` |
| 159 | `/mesai-talepleri` | `OvertimeRequests` | `client/src/pages/overtime-requests.tsx` | `client/src/App.tsx:525` |
| 160 | `/mesajlar` | `—` | _(inline veya bulunamadı)_ | `client/src/App.tsx:517` |
| 161 | `/mesajlarim` | `Mesajlar` | `client/src/pages/mesajlar.tsx` | `client/src/App.tsx:637` |
| 162 | `/misafir-geri-bildirim` | `—` | _(inline veya bulunamadı)_ | `client/src/App.tsx:603` |
| 163 | `/misafir-geri-bildirim/:token` | `MisafirGeriBildirimPublic` | `client/src/pages/misafir-geri-bildirim.tsx` | `client/src/App.tsx:418` |
| 164 | `/misafir-memnuniyeti` | `—` | _(inline veya bulunamadı)_ | `client/src/App.tsx:605` |
| 165 | `/misafir-memnuniyeti/:tab?` | `—` | _(inline veya bulunamadı)_ | `client/src/App.tsx:604` |
| 166 | `/modul/:moduleId` | `MegaModulePage` | `client/src/pages/modul.tsx` | `client/src/App.tsx:440` |
| 167 | `/muhasebe` | `Muhasebe` | `client/src/pages/muhasebe.tsx` | `client/src/App.tsx:532` |
| 168 | `/muhasebe-centrum` | `MuhasebeCentrum` | `client/src/pages/muhasebe-centrum.tsx` | `client/src/App.tsx:578` |
| 169 | `/muhasebe-geribildirimi` | `BranchFeedback` | `client/src/pages/branch-feedback.tsx` | `client/src/App.tsx:622` |
| 170 | `/muhasebe-raporlama` | `MuhasebeRaporlama` | `client/src/pages/muhasebe-raporlama.tsx` | `client/src/App.tsx:593` |
| 171 | `/musteri-geribildirimi` | `MusteriGeribildirimiRedirect` | _(inline veya bulunamadı)_ | `client/src/App.tsx:683` |
| 172 | `/nfc-giris` | `NFCGiris` | `client/src/pages/nfc-giris.tsx` | `client/src/App.tsx:466` |
| 173 | `/ogrenme-yolum` | `AcademyMyPath` | `client/src/pages/academy-my-path.tsx` | `client/src/App.tsx:648` |
| 174 | `/onboarding-programlar` | `OnboardingProgramlar` | `client/src/pages/onboarding-programlar.tsx` | `client/src/App.tsx:461` |
| 175 | `/onboarding-studio` | `CoachOnboardingStudio` | `client/src/pages/coach-onboarding-studio.tsx` | `client/src/App.tsx:645` |
| 176 | `/operasyon/:tab?` | `OperasyonMegaModule` | `client/src/pages/operasyon-mega.tsx` | `client/src/App.tsx:626` |
| 177 | `/p/urun/:code` | `PublicUrun` | `client/src/pages/public-urun.tsx` | `client/src/App.tsx:417` |
| 178 | `/pdks` | `PdksPage` | `client/src/pages/pdks.tsx` | `client/src/App.tsx:676` |
| 179 | `/pdks-excel-import` | `PdksExcelImport` | `client/src/pages/pdks-excel-import.tsx` | `client/src/App.tsx:678` |
| 180 | `/pdks-izin-gunleri` | `PdksIzinGunleri` | `client/src/pages/pdks-izin-gunleri.tsx` | `client/src/App.tsx:677` |
| 181 | `/performans` | `Performance` | `client/src/pages/performance.tsx` | `client/src/App.tsx:531` |
| 182 | `/performansim` | `MyPerformancePage` | `client/src/pages/my-performance.tsx` | `client/src/App.tsx:456` |
| 183 | `/personel-centrum` | `PersonelCentrum` | `client/src/pages/personel-centrum.tsx` | `client/src/App.tsx:585` |
| 184 | `/personel-degerlendirme/:token` | `PublicStaffRating` | `client/src/pages/public-staff-rating.tsx` | `client/src/App.tsx:416` |
| 185 | `/personel-detay/:id` | `PersonelDetay` | `client/src/pages/personel-detay.tsx` | `client/src/App.tsx:452` |
| 186 | `/personel-duzenle/:id` | `PersonelDuzenle` | `client/src/pages/personel-duzenle.tsx` | `client/src/App.tsx:457` |
| 187 | `/personel-musaitlik` | `PersonelMusaitlik` | `client/src/pages/personel-musaitlik.tsx` | `client/src/App.tsx:467` |
| 188 | `/personel-onboarding` | `Redirect` | _(inline veya bulunamadı)_ | `client/src/App.tsx:458` |
| 189 | `/personel-onboarding-akisi` | `PersonelOnboarding` | `client/src/pages/personel-onboarding.tsx` | `client/src/App.tsx:638` |
| 190 | `/personel-qr-tokenlar` | `StaffQrTokensPage` | `client/src/pages/staff-qr-tokens.tsx` | `client/src/App.tsx:453` |
| 191 | `/personel-tipleri` | `AdminEmployeeTypes` | `client/src/pages/admin-employee-types.tsx` | `client/src/App.tsx:642` |
| 192 | `/personel/:id` | `PersonelProfil` | `client/src/pages/personel-profil.tsx` | `client/src/App.tsx:451` |
| 193 | `/pilot-baslat` | `PilotLaunch` | `client/src/pages/pilot-launch.tsx` | `client/src/App.tsx:632` |
| 194 | `/profil` | `ProfileRedirect` | _(inline veya bulunamadı)_ | `client/src/App.tsx:445` |
| 195 | `/proje-gorev/:id` | `ProjeGorevDetay` | `client/src/pages/proje-gorev-detay.tsx` | `client/src/App.tsx:518` |
| 196 | `/projeler` | `Projeler` | `client/src/pages/projeler.tsx` | `client/src/App.tsx:520` |
| 197 | `/projeler/:id` | `ProjeDetay` | `client/src/pages/proje-detay.tsx` | `client/src/App.tsx:519` |
| 198 | `/qr-tara` | `QRScanner` | `client/src/pages/qr-scanner.tsx` | `client/src/App.tsx:480` |
| 199 | `/raporlar-hub` | `RaporlarHub` | `client/src/pages/raporlar-hub.tsx` | `client/src/App.tsx:530` |
| 200 | `/raporlar/:tab?` | `RaporlarMegaModule` | `client/src/pages/raporlar-mega.tsx` | `client/src/App.tsx:529` |
| 201 | `/raporlar/sube-saglik` | `SubeSaglikSkoru` | `client/src/pages/sube-saglik-skoru.tsx` | `client/src/App.tsx:665` |
| 202 | `/recete/:id` | `ReceteDetay` | `client/src/pages/recete-detay.tsx` | `client/src/App.tsx:510` |
| 203 | `/receteler` | `Receteler` | `client/src/pages/receteler.tsx` | `client/src/App.tsx:509` |
| 204 | `/register` | `Register` | `client/src/pages/register.tsx` | `client/src/App.tsx:413` |
| 205 | `/reset-password/:token` | `ResetPassword` | `client/src/pages/reset-password.tsx` | `client/src/App.tsx:415` |
| 206 | `/satinalma-centrum` | `SatinalmaCentrum` | `client/src/pages/satinalma-centrum.tsx` | `client/src/App.tsx:579` |
| 207 | `/satinalma/:tab?` | `SatinalmaMega` | `client/src/pages/satinalma-mega.tsx` | `client/src/App.tsx:663` |
| 208 | `/setup` | `Setup` | `client/src/pages/setup.tsx` | `client/src/App.tsx:411` |
| 209 | `/sikayetler` | `—` | _(inline veya bulunamadı)_ | `client/src/App.tsx:606` |
| 210 | `/sistem-atolyesi` | `SistemAtolyesi` | `client/src/pages/sistem-atolyesi.tsx` | `client/src/App.tsx:633` |
| 211 | `/stok` | `StokRedirect` | _(inline veya bulunamadı)_ | `client/src/App.tsx:447` |
| 212 | `/sube-bordro-ozet` | `SubeBordroOzet` | `client/src/pages/sube-bordro-ozet.tsx` | `client/src/App.tsx:549` |
| 213 | `/sube-centrum` | `SubeCentrum` | `client/src/pages/sube-centrum.tsx` | `client/src/App.tsx:582` |
| 214 | `/sube-gorevler/:id` | `SubeGorevler` | `client/src/pages/sube-gorevler.tsx` | `client/src/App.tsx:472` |
| 215 | `/sube-karsilastirma` | `SubeKarsilastirma` | `client/src/pages/sube-karsilastirma.tsx` | `client/src/App.tsx:667` |
| 216 | `/sube-ozet` | `—` | _(inline veya bulunamadı)_ | `client/src/App.tsx:672` |
| 217 | `/sube-saglik-skoru` | `SubeSaglikSkoru` | `client/src/pages/sube-saglik-skoru.tsx` | `client/src/App.tsx:666` |
| 218 | `/sube-uyum-merkezi` | `SubeUyumMerkezi` | `client/src/pages/sube-uyum-merkezi.tsx` | `client/src/App.tsx:550` |
| 219 | `/sube-vardiya-takibi` | `SubeDashboard` | `client/src/pages/sube/dashboard.tsx` | `client/src/App.tsx:469` |
| 220 | `/sube/checklist-execution/:completionId` | `ChecklistExecutionPage` | `client/src/pages/sube/checklist-execution.tsx` | `client/src/App.tsx:424` |
| 221 | `/sube/dashboard` | `SubeDashboard` | `client/src/pages/sube/dashboard.tsx` | `client/src/App.tsx:428` |
| 222 | `/sube/employee-dashboard` | `EmployeeDashboard` | `client/src/pages/sube/employee-dashboard.tsx` | `client/src/App.tsx:427` |
| 223 | `/sube/kiosk` | `SubeKiosk` | `client/src/pages/sube/kiosk.tsx` | `client/src/App.tsx:426` |
| 224 | `/sube/kiosk/:branchId` | `SubeKiosk` | `client/src/pages/sube/kiosk.tsx` | `client/src/App.tsx:425` |
| 225 | `/sube/siparis-stok` | `SubeSiparisStok` | `client/src/pages/sube/siparis-stok.tsx` | `client/src/App.tsx:669` |
| 226 | `/subeler` | `Subeler` | `client/src/pages/subeler.tsx` | `client/src/App.tsx:443` |
| 227 | `/subeler/:id` | `SubeDetay` | `client/src/pages/sube-detay.tsx` | `client/src/App.tsx:442` |
| 228 | `/subeler/:id/nfc` | `SubeNFCDetay` | `client/src/pages/sube-nfc-detay.tsx` | `client/src/App.tsx:441` |
| 229 | `/supbuddy-centrum` | `SupBuddyCentrum` | `client/src/pages/supbuddy-centrum.tsx` | `client/src/App.tsx:584` |
| 230 | `/supervisor-centrum` | `SupervisorCentrum` | `client/src/pages/supervisor-centrum.tsx` | `client/src/App.tsx:583` |
| 231 | `/supervisor-egitim` | `SupervisorOnboarding` | `client/src/pages/supervisor-onboarding.tsx` | `client/src/App.tsx:650` |
| 232 | `/takim-ilerleme` | `CoachTeamProgress` | `client/src/pages/coach-team-progress.tsx` | `client/src/App.tsx:654` |
| 233 | `/task-atama` | `TaskAtama` | `client/src/pages/task-atama.tsx` | `client/src/App.tsx:571` |
| 234 | `/task-takip` | `TaskTakip` | `client/src/pages/task-takip.tsx` | `client/src/App.tsx:572` |
| 235 | `/trainer-egitim-merkezi` | `TrainerEgitimMerkezi` | `client/src/pages/trainer-egitim-merkezi.tsx` | `client/src/App.tsx:576` |
| 236 | `/training` | `TrainingRedirect` | _(inline veya bulunamadı)_ | `client/src/App.tsx:684` |
| 237 | `/urun-sikayet` | `—` | _(inline veya bulunamadı)_ | `client/src/App.tsx:664` |
| 238 | `/vardiya` | `VardiyaRedirect` | _(inline veya bulunamadı)_ | `client/src/App.tsx:446` |
| 239 | `/vardiya-checkin` | `VardiyaCheckin` | `client/src/pages/vardiya-checkin.tsx` | `client/src/App.tsx:465` |
| 240 | `/vardiya-planlama` | `VardiyaPlanlama` | `client/src/pages/vardiya-planlama.tsx` | `client/src/App.tsx:463` |
| 241 | `/vardiyalar` | `Vardiyalar` | `client/src/pages/vardiyalar.tsx` | `client/src/App.tsx:462` |
| 242 | `/vardiyalarim` | `Vardiyalarim` | `client/src/pages/vardiyalarim.tsx` | `client/src/App.tsx:464` |
| 243 | `/waste/:tab?` | `WasteMegaModule` | `client/src/pages/waste-mega.tsx` | `client/src/App.tsx:627` |
| 244 | `/yatirimci-centrum` | `YatirimciCentrum` | `client/src/pages/yatirimci-centrum.tsx` | `client/src/App.tsx:586` |
| 245 | `/yatirimci-hq-centrum` | `YatirimciHQCentrum` | `client/src/pages/yatirimci-hq-centrum.tsx` | `client/src/App.tsx:589` |
| 246 | `/yeni-sube-detay/:id` | `YeniSubeDetay` | `client/src/pages/yeni-sube-detay.tsx` | `client/src/App.tsx:522` |
| 247 | `/yeni-sube-projeler` | `YeniSubeProjeler` | `client/src/pages/yeni-sube-projeler.tsx` | `client/src/App.tsx:521` |
| 248 | `/yeni-sube/:tab?` | `YeniSubeMegaModule` | `client/src/pages/yeni-sube-mega.tsx` | `client/src/App.tsx:629` |
| 249 | `/yonetim/ai-maliyetler` | `AICostDashboard` | `client/src/pages/yonetim/ai-maliyetler.tsx` | `client/src/App.tsx:615` |
| 250 | `/yonetim/akademi` | `AdminAcademy` | `client/src/pages/yonetim/akademi.tsx` | `client/src/App.tsx:621` |
| 251 | `/yonetim/ayarlar` | `Settings` | `client/src/pages/yonetim/ayarlar.tsx` | `client/src/App.tsx:612` |
| 252 | `/yonetim/checklist-takip` | `ChecklistTrackingPage` | `client/src/pages/yonetim/checklist-takip.tsx` | `client/src/App.tsx:617` |
| 253 | `/yonetim/checklistler` | `AdminChecklistManagement` | `client/src/pages/yonetim/checklistler.tsx` | `client/src/App.tsx:616` |
| 254 | `/yonetim/degerlendirme` | `YoneticiDegerlendirme` | `client/src/pages/admin/yonetici-degerlendirme.tsx` | `client/src/App.tsx:614` |
| 255 | `/yonetim/ekipman-servis` | `EquipmentManagement` | `client/src/pages/yonetim/ekipman-yonetimi.tsx` | `client/src/App.tsx:618` |
| 256 | `/yonetim/ekipman-yonetimi` | `EquipmentManagement` | `client/src/pages/yonetim/ekipman-yonetimi.tsx` | `client/src/App.tsx:620` |
| 257 | `/yonetim/icerik` | `AdminContentManagement` | `client/src/pages/yonetim/icerik.tsx` | `client/src/App.tsx:611` |
| 258 | `/yonetim/kullanicilar` | `UserCRM` | `client/src/pages/yonetim/kullanicilar.tsx` | `client/src/App.tsx:613` |
| 259 | `/yonetim/menu` | `YonetimMenu` | `client/src/pages/yonetim/menu.tsx` | `client/src/App.tsx:570` |
| 260 | `/yonetim/servis-talepleri` | `EquipmentManagement` | `client/src/pages/yonetim/ekipman-yonetimi.tsx` | `client/src/App.tsx:619` |

### 1.1 Sayfa import edildi ama route'a bağlı değil (8)

Bu component'ler App.tsx'te `lazyWithRetry` ile yüklenmiş ama `<Route>` içinde kullanılmamış olabilir (kontrol edilmesi gereken adaylar):

| Component | Sayfa dosyası |
|---|---|
| `Equipment` | `client/src/pages/equipment.tsx` |
| `Academy` | `client/src/pages/academy.tsx` |
| `Raporlar` | `client/src/pages/raporlar.tsx` |
| `FabrikaDashboard` | `client/src/pages/fabrika/dashboard.tsx` |
| `NotFound` | `client/src/pages/not-found.tsx` |
| `HQDashboard` | `client/src/pages/hq-dashboard.tsx` |
| `BenimGunum` | `client/src/pages/benim-gunum.tsx` |
| `SubeOzet` | `client/src/pages/sube-ozet.tsx` |

## 2. Öksüz Sayfalar

**Tarama yöntemi:** Hem alias (`@/pages/...`) hem de göreceli (`./...`, `../...`) import'lar tarandı; `foo/index` → `foo` normalize edildi. Mega-modül alt sayfaları ayrılarak gerçek öksüzler izole edildi.

### 2.1 Gerçek Öksüzler (10) — hiçbir yerde import edilmiyor

Önerilen karar: **`[Sil]`** veya canlı bir mega-modüle **`[Birleştir]`**. Silmeden önce kullanıcının her birini tek tek onaylaması gerekir.

| Sayfa | Dosya | Boyut | Son değişiklik | Öneri |
|---|---|---|---|---|
| `ai-assistant` | `client/src/pages/ai-assistant.tsx:1` | 6.3 KB | 2026-03-30 | `[Sil]` veya `[Birleştir → ?]` |
| `crm/campaigns` | `client/src/pages/crm/campaigns.tsx:1` | 13.4 KB | 2026-03-09 | `[Sil]` veya `[Birleştir → ?]` |
| `crm/complaints` | `client/src/pages/crm/complaints.tsx:1` | 30.4 KB | 2026-03-20 | `[Sil]` veya `[Birleştir → ?]` |
| `crm/dashboard` | `client/src/pages/crm/dashboard.tsx:1` | 5.5 KB | 2026-03-25 | `[Sil]` veya `[Birleştir → ?]` |
| `crm/employee-dashboard` | `client/src/pages/crm/employee-dashboard.tsx:1` | 9.9 KB | 2026-03-10 | `[Sil]` veya `[Birleştir → ?]` |
| `crm/settings` | `client/src/pages/crm/settings.tsx:1` | 7.3 KB | 2026-03-09 | `[Sil]` veya `[Birleştir → ?]` |
| `dashboard` | `client/src/pages/dashboard.tsx:1` | 10.7 KB | 2026-03-31 | `[Sil]` veya `[Birleştir → ?]` |
| `hq-ozet` | `client/src/pages/hq-ozet.tsx:1` | 18.2 KB | 2026-03-30 | `[Sil]` veya `[Birleştir → ?]` |
| `iletisim-merkezi` | `client/src/pages/iletisim-merkezi/index.tsx:1` | 13.3 KB | 2026-03-30 | `[Sil]` veya `[Birleştir → ?]` |
| `urun-sikayet` | `client/src/pages/urun-sikayet.tsx:1` | 19.6 KB | 2026-03-09 | `[Sil]` veya `[Birleştir → ?]` |

### 2.2 Mega-Modül Alt Sayfaları (81) — App.tsx route'u yok ama mega içinde aktif

Önerilen karar: **`[Tut]`** (mega-modülün ayrılmaz parçası).

| Sayfa | Mega kaynak |
|---|---|
| `academy` | `client/src/pages/akademi-mega.tsx:38` (dynamic) |
| `academy-explore` | `client/src/pages/akademi-mega.tsx:64` (dynamic) |
| `admin` | `client/src/pages/admin-mega.tsx:44` (dynamic) |
| `admin-seed` | `client/src/pages/admin-mega.tsx:70` (dynamic) |
| `admin/ai-bilgi-yonetimi` | `client/src/pages/admin-mega.tsx:71` (dynamic) |
| `admin/ai-politikalari` | `client/src/pages/admin-mega.tsx:78` (dynamic) |
| `admin/cop-kutusu` | `client/src/pages/admin-mega.tsx:51` (dynamic) |
| `admin/dashboard-ayarlari` | `client/src/pages/admin-mega.tsx:85` (dynamic) |
| `admin/degisiklik-talepleri` | `client/src/pages/admin-mega.tsx:82` (dynamic) |
| `admin/delegasyon` | `client/src/pages/admin-mega.tsx:83` (dynamic) |
| `admin/dobody-avatarlar` | `client/src/pages/admin-mega.tsx:79` (dynamic) |
| `admin/dobody-gorev-yonetimi` | `client/src/pages/admin-mega.tsx:80` (dynamic) |
| `admin/envanter-kategori-denetimi` | `client/src/pages/admin-mega.tsx:87` (dynamic) |
| `admin/gorev-sablonlari` | `client/src/pages/admin-mega.tsx:74` (dynamic) |
| `admin/gorunum-ayarlari` | `client/src/pages/admin-mega.tsx:73` (dynamic) |
| `admin/kullanicilar` | `client/src/pages/admin-mega.tsx:45` (dynamic) |
| `admin/module-flags` | `client/src/pages/admin-mega.tsx:84` (dynamic) |
| `admin/sube-pin-yonetimi` | `client/src/pages/admin-mega.tsx:67` (dynamic) |
| `admin/veri-disa-aktarma` | `client/src/pages/admin-mega.tsx:72` (dynamic) |
| `admin/veri-kilitleri` | `client/src/pages/admin-mega.tsx:81` (dynamic) |
| `admin/widget-editor` | `client/src/pages/admin-mega.tsx:77` (dynamic) |
| `admin/widget-yonetimi` | `client/src/pages/admin-mega.tsx:76` (dynamic) |
| `akademi-hq/IstatistiklerTab` | `client/src/pages/akademi-hq/index.tsx:14` (static) |
| `akademi-hq/ModullerTab` | `client/src/pages/akademi-hq/index.tsx:11` (static) |
| `akademi-hq/QuizYonetimTab` | `client/src/pages/akademi-hq/index.tsx:12` (static) |
| `akademi-hq/SertifikaTab` | `client/src/pages/akademi-hq/index.tsx:16` (static) |
| `akademi-hq/SinavTalepleriTab` | `client/src/pages/akademi-hq/index.tsx:10` (static) |
| `akademi-hq/SubeAnalizTab` | `client/src/pages/akademi-hq/index.tsx:15` (static) |
| `akademi-hq/WebinarTab` | `client/src/pages/akademi-hq/index.tsx:13` (static) |
| `akademi-hq/components/RoleDashboard` | `client/src/pages/akademi-hq/index.tsx:9` (static) |
| `akademi-v3/CareerTab` | `client/src/pages/akademi-v3/index.tsx:25` (dynamic) |
| `akademi-v3/HomeTab` | `client/src/pages/akademi-v3/index.tsx:22` (dynamic) |
| `akademi-v3/TrainingTab` | `client/src/pages/akademi-v3/index.tsx:23` (dynamic) |
| `akademi-v3/WebinarTab` | `client/src/pages/akademi-v3/index.tsx:24` (dynamic) |
| `coach-content-library` | `client/src/pages/akademi-mega.tsx:59` (dynamic) |
| `equipment` | `client/src/pages/ekipman-mega.tsx:14` (dynamic) |
| `fabrika/ai-raporlar` | `client/src/pages/fabrika/index.tsx:37` (dynamic) |
| `fabrika/dashboard` | `client/src/pages/fabrika/index.tsx:31` (dynamic) |
| `fabrika/fabrika-yonetim-skoru` | `client/src/pages/fabrika/index.tsx:47` (dynamic)<br>`client/src/pages/satinalma-mega.tsx:34` (static) |
| `fabrika/gida-guvenligi` | `client/src/pages/fabrika/index.tsx:44` (dynamic) |
| `fabrika/kalite-kontrol` | `client/src/pages/fabrika/index.tsx:34` (dynamic) |
| `fabrika/kavurma` | `client/src/pages/fabrika/index.tsx:46` (dynamic) |
| `fabrika/lot-izleme` | `client/src/pages/fabrika/index.tsx:45` (dynamic) |
| `fabrika/maliyet-yonetimi` | `client/src/pages/fabrika/index.tsx:39` (dynamic)<br>`client/src/pages/satinalma-mega.tsx:32` (static) |
| `fabrika/performans` | `client/src/pages/fabrika/index.tsx:35` (dynamic) |
| `fabrika/sevkiyat` | `client/src/pages/fabrika/index.tsx:43` (dynamic) |
| `fabrika/siparis-hazirlama` | `client/src/pages/fabrika/index.tsx:42` (dynamic) |
| `fabrika/stok-sayim` | `client/src/pages/fabrika/index.tsx:41` (dynamic) |
| `fabrika/uretim-planlama` | `client/src/pages/fabrika/index.tsx:38` (dynamic) |
| `fabrika/vardiya-planlama` | `client/src/pages/fabrika/index.tsx:40` (dynamic) |
| `fabrika/vardiya-uyumluluk` | `client/src/pages/fabrika/index.tsx:36` (dynamic) |
| `iletisim-merkezi/BroadcastTab` | `client/src/pages/crm-mega.tsx:45` (dynamic)<br>`client/src/pages/iletisim-merkezi/index.tsx:43` (dynamic) |
| `iletisim-merkezi/DashboardTab` | `client/src/pages/crm-mega.tsx:43` (dynamic)<br>`client/src/pages/iletisim-merkezi/index.tsx:40` (dynamic) |
| `iletisim-merkezi/HqTasksTab` | `client/src/pages/crm-mega.tsx:44` (dynamic)<br>`client/src/pages/iletisim-merkezi/index.tsx:42` (dynamic) |
| `iletisim-merkezi/NewTicketDialog` | `client/src/pages/crm-mega.tsx:33` (static)<br>`client/src/pages/iletisim-merkezi/index.tsx:9` (static) |
| `iletisim-merkezi/TicketsTab` | `client/src/pages/iletisim-merkezi/index.tsx:41` (dynamic) |
| `iletisim-merkezi/categoryConfig` | `client/src/pages/crm-mega.tsx:41` (static)<br>`client/src/pages/iletisim-merkezi/index.tsx:10` (static) |
| `iletisim-merkezi/crm-nav` | `client/src/pages/crm-mega.tsx:29` (static)<br>`client/src/pages/iletisim-merkezi/index.tsx:11` (static) |
| `iletisim-merkezi/sla-rules-panel` | `client/src/pages/crm-mega.tsx:34` (static)<br>`client/src/pages/iletisim-merkezi/index.tsx:15` (static) |
| `iletisim-merkezi/ticket-chat-panel` | `client/src/pages/crm-mega.tsx:32` (static)<br>`client/src/pages/iletisim-merkezi/index.tsx:14` (static) |
| `iletisim-merkezi/ticket-list-panel` | `client/src/pages/crm-mega.tsx:30` (static)<br>`client/src/pages/crm-mega.tsx:31` (static)<br>`client/src/pages/iletisim-merkezi/index.tsx:12` (static)<br>`client/src/pages/iletisim-merkezi/index.tsx:13` (static) |
| `misafir-memnuniyeti-modul` | `client/src/pages/raporlar-mega.tsx:29` (dynamic) |
| `raporlar` | `client/src/pages/raporlar-mega.tsx:26` (dynamic) |
| `raporlar-finansal` | `client/src/pages/raporlar-mega.tsx:42` (dynamic) |
| `raporlar-insight` | `client/src/pages/raporlar-mega.tsx:41` (dynamic) |
| `satinalma/cari-takip` | `client/src/pages/satinalma-mega.tsx:31` (static) |
| `satinalma/mal-kabul` | `client/src/pages/satinalma-mega.tsx:29` (static) |
| `satinalma/satinalma-dashboard` | `client/src/pages/satinalma-mega.tsx:30` (static) |
| `satinalma/sayim-yonetimi` | `client/src/pages/satinalma-mega.tsx:33` (static) |
| `satinalma/siparis-yonetimi` | `client/src/pages/satinalma-mega.tsx:28` (static) |
| `satinalma/stok-yonetimi` | `client/src/pages/satinalma-mega.tsx:26` (static) |
| `satinalma/tedarikci-yonetimi` | `client/src/pages/satinalma-mega.tsx:27` (static) |
| `satinalma/trend-analizi` | `client/src/pages/satinalma-mega.tsx:36` (dynamic) |
| `sikayetler` | `client/src/pages/raporlar-mega.tsx:37` (dynamic) |
| `waste-coach-console` | `client/src/pages/waste-mega.tsx:14` (dynamic) |
| `waste-entry` | `client/src/pages/waste-mega.tsx:13` (dynamic) |
| `waste-executive` | `client/src/pages/waste-mega.tsx:17` (dynamic) |
| `waste-qc-console` | `client/src/pages/waste-mega.tsx:16` (dynamic) |
| `waste-trainer-console` | `client/src/pages/waste-mega.tsx:15` (dynamic) |
| `yonetim/ekipman-servis` | `client/src/pages/admin-mega.tsx:58` (dynamic) |
| `yonetim/servis-talepleri` | `client/src/pages/admin-mega.tsx:59` (dynamic)<br>`client/src/pages/ekipman-mega.tsx:17` (dynamic) |

## 3. Kırık Linkler (10)

**Tarama yöntemi:** `href=`, `<Link to=>`, `navigate("/...")`, `setLocation("/...")`, `window.location.href|replace = "/..."` çağrıları tarandı. Wouter route'larındaki **wildcard (`*`, `*?`)** ve **opsiyonel parametre (`:foo?`)** desteğiyle eşleştirme yapıldı; bu sayede `/akademi`, `/fabrika`, `/raporlar` gibi yanlış pozitifler elendi.

| # | Path | Kullanım | Konum (dosya:satır) | Öneri |
|---|---|---|---|---|
| 1 | `/bordro` | 2 | `client/src/components/mission-control/MissionControlMuhasebe.tsx:149`<br>`client/src/components/mission-control/MissionControlMuhasebe.tsx:190` | `[Düzelt → mevcut route]` veya `[Sil link]` veya `[Yeni route ekle]` |
| 2 | `/hq-support` | 2 | `client/src/pages/admin/index.tsx:217`<br>`client/src/pages/admin/index.tsx:229` | `[Düzelt → mevcut route]` veya `[Sil link]` veya `[Yeni route ekle]` |
| 3 | `/personel-profil` | 2 | `client/src/pages/egitim-programi.tsx:191`<br>`client/src/pages/egitim-programi.tsx:215` | `[Düzelt → mevcut route]` veya `[Sil link]` veya `[Yeni route ekle]` |
| 4 | `/finans` | 1 | `client/src/pages/ceo-command-center.tsx:120` | `[Düzelt → mevcut route]` veya `[Sil link]` veya `[Yeni route ekle]` |
| 5 | `/waste-executive` | 1 | `client/src/pages/fabrika-centrum.tsx:92` | `[Düzelt → mevcut route]` veya `[Sil link]` veya `[Yeni route ekle]` |
| 6 | `/musteri-memnuniyeti` | 1 | `client/src/pages/hq-dashboard.tsx:1697` | `[Düzelt → mevcut route]` veya `[Sil link]` veya `[Yeni route ekle]` |
| 7 | `/kalite-kontrol` | 1 | `client/src/pages/hq-dashboard.tsx:1810` | `[Düzelt → mevcut route]` veya `[Sil link]` veya `[Yeni route ekle]` |
| 8 | `/qr-scanner` | 1 | `client/src/pages/sube/dashboard.tsx:412` | `[Düzelt → mevcut route]` veya `[Sil link]` veya `[Yeni route ekle]` |
| 9 | `/leave-requests` | 1 | `client/src/pages/vardiya-planlama.tsx:870` | `[Düzelt → mevcut route]` veya `[Sil link]` veya `[Yeni route ekle]` |
| 10 | `/overtime-requests` | 1 | `client/src/pages/vardiya-planlama.tsx:876` | `[Düzelt → mevcut route]` veya `[Sil link]` veya `[Yeni route ekle]` |

## 4. Duplikat / Legacy Sayfa Adayları

### 4.1 Akademi ailesi

| Sayfa | Dosya | Boyut | Son değişiklik | App.tsx route | Mega içinde | Karar |
|---|---|---|---|---|---|---|
| `academy` | `client/src/pages/academy.tsx:1` | 16.9 KB | 2026-03-28 | ❌ | ✅ | `[Tut]` (mega alt sekmesi) |
| `academy-supervisor` | `client/src/pages/academy-supervisor.tsx:1` | 0.5 KB | 2026-03-30 | ✅ | ✅ | `[Tut]` |
| `academy-landing` | `client/src/pages/academy-landing.tsx:1` | 56.1 KB | 2026-03-13 | ✅ | ✅ | `[Tut]` |
| `academy-my-path` | `client/src/pages/academy-my-path.tsx:1` | 34.1 KB | 2026-03-28 | ✅ | ✅ | `[Tut]` |
| `academy-explore` | `client/src/pages/academy-explore.tsx:1` | 13.6 KB | 2026-03-30 | ❌ | ✅ | `[Tut]` (mega alt sekmesi) |
| `akademi-mega` | `client/src/pages/akademi-mega.tsx:1` | 16.0 KB | 2026-03-23 | ✅ | ❌ | `[Tut]` |
| `akademi-v3` | `client/src/pages/akademi-v3/index.tsx:1` | 8.0 KB | 2026-04-08 | ✅ | ❌ | `[Tut]` |
| `akademi-hq` | `client/src/pages/akademi-hq/index.tsx:1` | 6.3 KB | 2026-03-22 | ✅ | ✅ | `[Tut]` |

### 4.2 Raporlar ailesi

| Sayfa | Dosya | Boyut | Son değişiklik | App.tsx route | Mega içinde | Karar |
|---|---|---|---|---|---|---|
| `raporlar` | `client/src/pages/raporlar.tsx:1` | 44.7 KB | 2026-03-30 | ❌ | ✅ | `[Tut]` (mega alt sekmesi) |
| `raporlar-hub` | `client/src/pages/raporlar-hub.tsx:1` | 0.3 KB | 2026-01-08 | ✅ | ❌ | `[Tut]` |
| `raporlar-mega` | `client/src/pages/raporlar-mega.tsx:1` | 12.4 KB | 2026-03-24 | ✅ | ❌ | `[Tut]` |
| `advanced-reports` | `client/src/pages/advanced-reports.tsx:1` | 16.7 KB | 2026-03-30 | ✅ | ✅ | `[Tut]` |
| `e2e-raporlar` | `client/src/pages/e2e-raporlar.tsx:1` | 39.8 KB | 2026-03-30 | ✅ | ✅ | `[Tut]` |
| `muhasebe-raporlama` | `client/src/pages/muhasebe-raporlama.tsx:1` | 51.0 KB | 2026-03-30 | ✅ | ❌ | `[Tut]` |

### 4.3 Dashboard ailesi

| Sayfa | Dosya | Boyut | Son değişiklik | App.tsx route | Mega içinde | Karar |
|---|---|---|---|---|---|---|
| `control-dashboard` | `client/src/pages/control-dashboard.tsx:1` | 12.7 KB | 2026-03-31 | ✅ | ❌ | `[Tut]` |
| `merkez-dashboard` | `client/src/pages/merkez-dashboard.tsx:1` | 21.6 KB | 2026-03-30 | ✅ | ❌ | `[Tut]` |
| `hq-dashboard` | `client/src/pages/hq-dashboard.tsx:1` | 79.5 KB | 2026-03-30 | ❌ | ❌ | `[Düzelt]` |
| `ceo-command-center` | `client/src/pages/ceo-command-center.tsx:1` | 7.1 KB | 2026-04-04 | ✅ | ❌ | `[Tut]` |
| `cgo-command-center` | `client/src/pages/cgo-command-center.tsx:1` | 0.2 KB | 2026-03-31 | ✅ | ❌ | `[Tut]` |
| `sube/dashboard` | `client/src/pages/sube/dashboard.tsx:1` | 31.7 KB | 2026-03-31 | ✅ | ❌ | `[Tut]` |
| `fabrika/dashboard` | `client/src/pages/fabrika/dashboard.tsx:1` | 35.1 KB | 2026-03-30 | ❌ | ✅ | `[Tut]` (mega alt sekmesi) |
| `sube-ozet` | `client/src/pages/sube-ozet.tsx:1` | 15.2 KB | 2026-03-30 | ❌ | ❌ | `[Düzelt]` |
| `hq-ozet` | `client/src/pages/hq-ozet.tsx:1` | 18.2 KB | 2026-03-30 | ❌ | ❌ | `[Sil]` veya `[Birleştir → ?]` |
| `franchise-ozet` | `client/src/pages/franchise-ozet.tsx:1` | 6.3 KB | 2026-03-30 | ✅ | ❌ | `[Tut]` |
| `kocluk-paneli` | `client/src/pages/kocluk-paneli.tsx:1` | 8.1 KB | 2026-03-30 | ✅ | ❌ | `[Tut]` |

### 4.4 Fabrika ailesi

| Sayfa | Dosya | Boyut | Son değişiklik | App.tsx route | Mega içinde | Karar |
|---|---|---|---|---|---|---|
| `fabrika` | `client/src/pages/fabrika.tsx:1` | 42.9 KB | 2026-04-03 | ❌ | ❌ | `[Düzelt]` |
| `fabrika/index` | `client/src/pages/fabrika/index.tsx:1` | 8.9 KB | 2026-03-23 | ✅ | ❌ | `[Tut]` |
| `fabrika-centrum` | `client/src/pages/fabrika-centrum.tsx:1` | 12.5 KB | 2026-04-14 | ✅ | ❌ | `[Tut]` |
| `fabrika-stok-merkezi` | `client/src/pages/fabrika-stok-merkezi.tsx:1` | 36.9 KB | 2026-04-23 | ✅ | ❌ | `[Tut]` |
| `fabrika-receteler` | `client/src/pages/fabrika-receteler.tsx:1` | 11.7 KB | 2026-04-29 | ✅ | ❌ | `[Tut]` |
| `fabrika-recete-detay` | `client/src/pages/fabrika-recete-detay.tsx:1` | 52.6 KB | 2026-04-29 | ✅ | ❌ | `[Tut]` |
| `fabrika-recete-duzenle` | `client/src/pages/fabrika-recete-duzenle.tsx:1` | 133.7 KB | 2026-04-29 | ✅ | ❌ | `[Tut]` |
| `fabrika-uretim-modu` | `client/src/pages/fabrika-uretim-modu.tsx:1` | 20.1 KB | 2026-04-08 | ✅ | ❌ | `[Tut]` |
| `fabrika-keyblend-yonetimi` | `client/src/pages/fabrika-keyblend-yonetimi.tsx:1` | 11.7 KB | 2026-04-29 | ✅ | ❌ | `[Tut]` |
| `hq-fabrika-analitik` | `client/src/pages/hq-fabrika-analitik.tsx:1` | 14.9 KB | 2026-03-30 | ✅ | ❌ | `[Tut]` |

### 4.5 Şube ailesi

| Sayfa | Dosya | Boyut | Son değişiklik | App.tsx route | Mega içinde | Karar |
|---|---|---|---|---|---|---|
| `subeler` | `client/src/pages/subeler.tsx:1` | 13.3 KB | 2026-03-30 | ✅ | ❌ | `[Tut]` |
| `sube-detay` | `client/src/pages/sube-detay.tsx:1` | 54.4 KB | 2026-03-30 | ✅ | ❌ | `[Tut]` |
| `sube-nfc-detay` | `client/src/pages/sube-nfc-detay.tsx:1` | 4.6 KB | 2026-03-10 | ✅ | ❌ | `[Tut]` |
| `sube-ozet` | `client/src/pages/sube-ozet.tsx:1` | 15.2 KB | 2026-03-30 | ❌ | ❌ | `[Düzelt]` |
| `sube-centrum` | `client/src/pages/sube-centrum.tsx:1` | 6.8 KB | 2026-04-02 | ✅ | ❌ | `[Tut]` |
| `sube-saglik-skoru` | `client/src/pages/sube-saglik-skoru.tsx:1` | 26.9 KB | 2026-03-30 | ✅ | ✅ | `[Tut]` |
| `sube-karsilastirma` | `client/src/pages/sube-karsilastirma.tsx:1` | 8.5 KB | 2026-03-30 | ✅ | ✅ | `[Tut]` |
| `sube-bordro-ozet` | `client/src/pages/sube-bordro-ozet.tsx:1` | 10.4 KB | 2026-03-30 | ✅ | ❌ | `[Tut]` |
| `sube-uyum-merkezi` | `client/src/pages/sube-uyum-merkezi.tsx:1` | 16.7 KB | 2026-03-31 | ✅ | ❌ | `[Tut]` |
| `sube-gorevler` | `client/src/pages/sube-gorevler.tsx:1` | 11.7 KB | 2026-03-25 | ✅ | ❌ | `[Tut]` |

### 4.6 Centrum v5 ailesi

| Sayfa | Dosya | Boyut | Son değişiklik | App.tsx route | Mega içinde | Karar |
|---|---|---|---|---|---|---|
| `muhasebe-centrum` | `client/src/pages/muhasebe-centrum.tsx:1` | 5.2 KB | 2026-04-02 | ✅ | ❌ | `[Tut]` |
| `satinalma-centrum` | `client/src/pages/satinalma-centrum.tsx:1` | 4.4 KB | 2026-04-14 | ✅ | ❌ | `[Tut]` |
| `fabrika-centrum` | `client/src/pages/fabrika-centrum.tsx:1` | 12.5 KB | 2026-04-14 | ✅ | ❌ | `[Tut]` |
| `depo-centrum` | `client/src/pages/depo-centrum.tsx:1` | 6.9 KB | 2026-04-02 | ✅ | ❌ | `[Tut]` |
| `sube-centrum` | `client/src/pages/sube-centrum.tsx:1` | 6.8 KB | 2026-04-02 | ✅ | ❌ | `[Tut]` |
| `supervisor-centrum` | `client/src/pages/supervisor-centrum.tsx:1` | 5.1 KB | 2026-04-04 | ✅ | ❌ | `[Tut]` |
| `supbuddy-centrum` | `client/src/pages/supbuddy-centrum.tsx:1` | 5.4 KB | 2026-04-02 | ✅ | ❌ | `[Tut]` |
| `personel-centrum` | `client/src/pages/personel-centrum.tsx:1` | 6.4 KB | 2026-04-05 | ✅ | ❌ | `[Tut]` |
| `yatirimci-centrum` | `client/src/pages/yatirimci-centrum.tsx:1` | 3.1 KB | 2026-03-31 | ✅ | ❌ | `[Tut]` |
| `marketing-centrum` | `client/src/pages/marketing-centrum.tsx:1` | 4.6 KB | 2026-04-02 | ✅ | ❌ | `[Tut]` |
| `destek-centrum` | `client/src/pages/destek-centrum.tsx:1` | 4.4 KB | 2026-04-02 | ✅ | ❌ | `[Tut]` |
| `yatirimci-hq-centrum` | `client/src/pages/yatirimci-hq-centrum.tsx:1` | 3.2 KB | 2026-04-02 | ✅ | ❌ | `[Tut]` |

### 4.7 CRM / İletişim ailesi

| Sayfa | Dosya | Boyut | Son değişiklik | App.tsx route | Mega içinde | Karar |
|---|---|---|---|---|---|---|
| `crm-mega` | `client/src/pages/crm-mega.tsx:1` | 26.0 KB | 2026-04-07 | ✅ | ❌ | `[Tut]` |
| `iletisim-merkezi` | `client/src/pages/iletisim-merkezi/index.tsx:1` | 13.3 KB | 2026-03-30 | ❌ | ❌ | `[Sil]` veya `[Birleştir → ?]` |
| `destek` | `client/src/pages/destek.tsx:1` | 0.2 KB | 2026-03-31 | ✅ | ❌ | `[Tut]` |
| `destek-centrum` | `client/src/pages/destek-centrum.tsx:1` | 4.4 KB | 2026-04-02 | ✅ | ❌ | `[Tut]` |
| `hq-support` | `client/src/pages/hq-support.tsx:1` | 34.9 KB | 2026-03-30 | ✅ | ❌ | `[Tut]` |
| `branch-feedback` | `client/src/pages/branch-feedback.tsx:1` | 7.6 KB | 2026-03-30 | ✅ | ❌ | `[Tut]` |
| `misafir-geri-bildirim` | `client/src/pages/misafir-geri-bildirim.tsx:1` | 50.3 KB | 2026-03-30 | ✅ | ❌ | `[Tut]` |

### 4.8 Mega Modüller

| Sayfa | Dosya | Boyut | Son değişiklik | App.tsx route | Mega içinde | Karar |
|---|---|---|---|---|---|---|
| `modul` | `client/src/pages/modul.tsx:1` | 17.8 KB | 2026-03-21 | ✅ | ❌ | `[Tut]` |
| `crm-mega` | `client/src/pages/crm-mega.tsx:1` | 26.0 KB | 2026-04-07 | ✅ | ❌ | `[Tut]` |
| `admin-mega` | `client/src/pages/admin-mega.tsx:1` | 23.4 KB | 2026-04-23 | ✅ | ❌ | `[Tut]` |
| `akademi-mega` | `client/src/pages/akademi-mega.tsx:1` | 16.0 KB | 2026-03-23 | ✅ | ❌ | `[Tut]` |
| `raporlar-mega` | `client/src/pages/raporlar-mega.tsx:1` | 12.4 KB | 2026-03-24 | ✅ | ❌ | `[Tut]` |
| `operasyon-mega` | `client/src/pages/operasyon-mega.tsx:1` | 6.9 KB | 2026-04-01 | ✅ | ❌ | `[Tut]` |
| `ekipman-mega` | `client/src/pages/ekipman-mega.tsx:1` | 14.8 KB | 2026-04-04 | ✅ | ❌ | `[Tut]` |
| `yeni-sube-mega` | `client/src/pages/yeni-sube-mega.tsx:1` | 6.8 KB | 2026-03-01 | ✅ | ❌ | `[Tut]` |
| `satinalma-mega` | `client/src/pages/satinalma-mega.tsx:1` | 5.4 KB | 2026-03-22 | ✅ | ❌ | `[Tut]` |
| `waste-mega` | `client/src/pages/waste-mega.tsx:1` | 4.8 KB | 2026-03-05 | ✅ | ❌ | `[Tut]` |

## 5. Redirect Zincirleri ve Boş Route'lar

| Bileşen | Hedef | Hedef route var mı? | App.tsx satır | Öneri |
|---|---|---|---|---|
| `IletisimMerkeziRedirect` | `/crm` | ✅ | `App.tsx:228` | `[Tut]` |
| `MusteriGeribildirimiRedirect` | `/crm` | ✅ | `App.tsx:230` | `[Tut]` |
| `TrainingRedirect` | `/akademi` | ✅ | `App.tsx:231` | `[Tut]` |
| `FabrikaDashboardRedirect` | `/fabrika` | ✅ | `App.tsx:340` | `[Tut]` |
| `ProfileRedirect` | `/vardiya-planlama` | ✅ | `App.tsx:348` | `[Tut]` |
| `StokRedirect` | `/sube/siparis-stok` | ✅ | `App.tsx:365` | `[Tut]` |
| `IletisimRedirect` | `/crm` | ✅ | `App.tsx:370` | `[Tut]` |
| `<Route path="/control-legacy">` | `/control` | ✅ | `App.tsx:438` | `[Tut]` |
| `<Route path="/personel-onboarding">` | `/personel-onboarding-akisi` | ✅ | `App.tsx:458` | `[Tut]` |
| `<Route path="/akademi/personel-onboarding">` | `/personel-onboarding-akisi` | ✅ | `App.tsx:459` | `[Tut]` |
| `<Route path="/akademi/onboarding-programlar">` | `/onboarding-programlar` | ✅ | `App.tsx:460` | `[Tut]` |
| `<Route path="/egitim">` | `/akademi` | ✅ | `App.tsx:513` | `[Tut]` |
| `<Route path="/mesajlar">` | `/bildirimler?tab=mesajlar` | ✅ | `App.tsx:517` | `[Tut]` |
| `<Route path="/hq-dashboard/:department?">` | `/marketing-centrum` | ✅ | `App.tsx:660` | `[Tut]` |
| `<Route path="/benim-gunum">` | `/personel-centrum` | ✅ | `App.tsx:671` | `[Tut]` |
| `<Route path="/sube-ozet">` | `/sube-centrum` | ✅ | `App.tsx:672` | `[Tut]` |
| `<Route path="/hq-ozet">` | `/ceo-command-center` | ✅ | `App.tsx:673` | `[Tut]` |

## 6. Menü ↔ Route Tutarsızlığı

### 6.1 Client-side menü dosyalarında kırık path (3)

| Path | Konum (dosya:satır) | Öneri |
|---|---|---|
| `/stok-transferleri` | `client/src/components/layout/module-menu-config.ts:255` | `[Düzelt]` veya `[Yeni route]` |
| `/canli-izleme` | `client/src/components/layout/module-menu-config.ts:256` | `[Düzelt]` veya `[Yeni route]` |
| `/kiosk` | `client/src/components/layout/module-menu-config.ts:302` | `[Düzelt]` veya `[Yeni route]` |

### 6.2 Sunucu `/api/me/menu` kaynağı (`server/menu-service.ts`)

Server menüsünde **63** `path` alanı tespit edildi. App.tsx'te karşılığı olmayan: **0**.

_Tüm server menü path'leri App.tsx route'larına eşleşiyor._

## 7. Sunucu Endpoint Sağlığı

**Tarama yöntemi:** `server/routes.ts` içindeki `import xRouter from "./routes/x"` ve `app.use([prefix,] xRouter)` çağrıları taranarak her router'ın **mounted prefix**'i hesaplandı (`/api/v3/academy` gibi). Her router dosyasında `router.METHOD("/sub")` çağrıları prefix ile birleştirilerek tam path türetildi. Frontend tarafındaki `apiRequest`, `useQuery`, `fetch("/api/...")` çağrıları da regex eşleştirmesiyle kıyaslandı.

### 7.1 Kırık API Çağrıları (118) — FE çağırıyor, server'da yok

**Bunlar production'da hata atan adaylardır.** Her satırda FE çağıran dosya/satır + öneri yer alır.

| # | Method + Path | Kullanım | Konum (dosya:satır) | Öneri |
|---|---|---|---|---|
| 1 | `GET /api/iletisim/tickets` | 30 | `client/src/components/mobile/BaristaQuickActions.tsx:141`<br>`client/src/components/mobile/BaristaQuickActions.tsx:238` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 2 | `GET /api/shift-attendance` | 17 | `client/src/components/qr-scanner-modal.tsx:217`<br>`client/src/components/qr-scanner-modal.tsx:242` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 3 | `GET /api/objects/upload` | 16 | `client/src/components/quick-task-modal.tsx:754`<br>`client/src/pages/admin/bannerlar.tsx:394` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 4 | `GET /api/mrp/daily-plan` | 12 | `client/src/components/kiosk/KioskMRPPanel.tsx:34`<br>`client/src/components/kiosk/KioskMRPPanel.tsx:63` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 5 | `GET /api/mrp/leftovers` | 12 | `client/src/components/kiosk/KioskMRPPanel.tsx:45`<br>`client/src/components/kiosk/KioskMRPPanel.tsx:78` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 6 | `GET /api/product-costs` | 12 | `client/src/pages/fabrika/maliyet-yonetimi.tsx:103`<br>`client/src/pages/fabrika/maliyet-yonetimi.tsx:112` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 7 | `GET /api/personnel` | 10 | `client/src/pages/personel-detay.tsx:97`<br>`client/src/pages/personel-duzenle.tsx:92` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 8 | `GET /api/branch-summary` | 9 | `client/src/components/mission-control/MissionControlSupervisor.tsx:77`<br>`client/src/components/mission-control/MissionControlYatirimci.tsx:74` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 9 | `GET /api/onboarding-tasks` | 7 | `client/src/components/hr/OnboardingTaskDialog.tsx:74`<br>`client/src/pages/personel-detay.tsx:141` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 10 | `GET /api/branch-feedback-summary` | 7 | `client/src/components/mission-control/MissionControlSupervisor.tsx:117`<br>`client/src/components/mission-control/MissionControlYatirimci.tsx:113` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 11 | `GET /api/cost-dashboard` | 7 | `client/src/pages/fabrika/maliyet-yonetimi.tsx:113`<br>`client/src/pages/fabrika/maliyet-yonetimi.tsx:126` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 12 | `GET /api/project-tasks` | 7 | `client/src/pages/proje-gorev-detay.tsx:120`<br>`client/src/pages/proje-gorev-detay.tsx:145` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 13 | `GET /api/fault-service-tracking` | 6 | `client/src/pages/ariza-detay.tsx:287`<br>`client/src/pages/ariza-detay.tsx:299` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 14 | `GET /api/iletisim/dashboard` | 6 | `client/src/pages/crm-mega.tsx:349`<br>`client/src/pages/iletisim-merkezi/HqTasksTab.tsx:87` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 15 | `GET /api/training-program` | 6 | `client/src/pages/egitim-programi.tsx:134`<br>`client/src/pages/egitim-programi.tsx:139` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 16 | `GET /api/module-content` | 5 | `client/src/components/module-content-editor.tsx:22`<br>`client/src/components/module-content-editor.tsx:32` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 17 | `GET /api/delegations` | 5 | `client/src/pages/admin/delegasyon.tsx:74`<br>`client/src/pages/admin/delegasyon.tsx:93` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 18 | `GET /api/cash-reports` | 5 | `client/src/pages/cash-reports.tsx:114`<br>`client/src/pages/cash-reports.tsx:78` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 19 | `GET /api/factory` | 4 | `client/src/components/card-grid-hub.tsx:245`<br>`client/src/pages/fabrika/vardiya-uyumluluk.tsx:53` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 20 | `POST /api/iletisim/tickets` | 4 | `client/src/components/mobile/BaristaQuickActions.tsx:136`<br>`client/src/components/mobile/SupervisorQuickBar.tsx:129` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 21 | `GET /api/module-flags/branch` | 4 | `client/src/pages/admin/module-flags.tsx:143`<br>`client/src/pages/admin/module-flags.tsx:164` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 22 | `GET /api/v2/branch-on-shift` | 3 | `client/src/components/DobodyProposalWidget.tsx:77`<br>`client/src/pages/coach-sube-denetim.tsx:106` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 23 | `GET /api/auth/logout` | 3 | `client/src/components/app-header.tsx:38`<br>`client/src/components/hamburger-menu.tsx:345` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 24 | `GET /api/trash` | 3 | `client/src/pages/admin/cop-kutusu.tsx:57`<br>`client/src/pages/admin/cop-kutusu.tsx:67` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 25 | `GET /api/user` | 3 | `client/src/pages/branch-feedback.tsx:27`<br>`client/src/pages/my-performance.tsx:58` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 26 | `GET /api/cowork/tasks` | 3 | `client/src/pages/cowork.tsx:57`<br>`client/src/pages/cowork.tsx:102` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 27 | `GET /api/factory-shifts/my-assignment` | 3 | `client/src/pages/fabrika/kiosk.tsx:2659`<br>`client/src/pages/fabrika/kiosk.tsx:2698` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 28 | `GET /api/iletisim/hq-tasks` | 3 | `client/src/pages/iletisim-merkezi/HqTasksTab.tsx:55`<br>`client/src/pages/iletisim-merkezi/HqTasksTab.tsx:86` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 29 | `GET /api/iletisim/business-hours` | 3 | `client/src/pages/iletisim-merkezi/sla-rules-panel.tsx:84`<br>`client/src/pages/iletisim-merkezi/sla-rules-panel.tsx:93` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 30 | `GET /api/iletisim/sla-rules` | 3 | `client/src/pages/iletisim-merkezi/sla-rules-panel.tsx:273`<br>`client/src/pages/iletisim-merkezi/sla-rules-panel.tsx:284` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 31 | `GET /api/iletisim/assignable-users` | 3 | `client/src/pages/iletisim-merkezi/ticket-chat-panel.tsx:136`<br>`client/src/pages/iletisim-merkezi/ticket-chat-panel.tsx:228` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 32 | `GET /api/salary/employee` | 3 | `client/src/pages/personel-duzenle.tsx:1118`<br>`client/src/pages/personel-duzenle.tsx:1174` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 33 | `GET /api/upload-url` | 2 | `client/src/components/fault-report-dialog.tsx:480`<br>`client/src/pages/aksiyon-takip.tsx:490` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 34 | `GET /api/troubleshooting` | 2 | `client/src/components/fault-report-dialog.tsx:88`<br>`client/src/pages/ariza-yeni.tsx:86` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 35 | `GET /api/dashboard/branch` | 2 | `client/src/components/mission-control/MissionControlSupervisor.tsx:89`<br>`client/src/components/mission-control/MissionControlYatirimci.tsx:85` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 36 | `GET /api/branch-training-progress` | 2 | `client/src/components/mission-control/MissionControlSupervisor.tsx:103`<br>`client/src/components/mission-control/MissionControlYatirimci.tsx:99` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 37 | `GET /api/pdks/my-status` | 2 | `client/src/components/mobile/BaristaQuickActions.tsx:228`<br>`client/src/components/mobile/BaristaQuickActions.tsx:230` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 38 | `GET /api/upload/photo` | 2 | `client/src/components/qr-scanner-modal.tsx:148`<br>`client/src/pages/vardiya-checkin.tsx:123` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 39 | `GET /api/branches/kiosk/staff` | 2 | `client/src/pages/admin/sube-pin-yonetimi.tsx:65`<br>`client/src/pages/admin/sube-pin-yonetimi.tsx:93` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 40 | `POST /api/object-storage/presigned-url` | 2 | `client/src/pages/announcements.tsx:473`<br>`client/src/pages/announcements.tsx:1029` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 41 | `GET /api/cowork/messages` | 2 | `client/src/pages/cowork.tsx:44`<br>`client/src/pages/cowork.tsx:82` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 42 | `GET /api/objects/generate-upload-url` | 2 | `client/src/pages/guest-form-settings.tsx:468`<br>`client/src/pages/guest-form-settings.tsx:509` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 43 | `GET /api/staff-evaluations` | 2 | `client/src/pages/personel-profil.tsx:244`<br>`client/src/pages/personel-profil.tsx:279` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 44 | `GET /api/checklist-completions` | 2 | `client/src/pages/sube/checklist-execution.tsx:112`<br>`client/src/pages/sube/checklist-execution.tsx:145` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 45 | `GET /api/agent/insights` | 2 | `client/src/pages/trainer-egitim-merkezi.tsx:21`<br>`client/src/pages/trainer-egitim-merkezi.tsx:22` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 46 | `GET /api/objects/finalize` | 1 | `client/src/components/ObjectUploader.tsx:74` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 47 | `GET /api/agent` | 1 | `client/src/components/agent-admin-panel.tsx:67` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 48 | `GET /api/admin/branch-setup-status` | 1 | `client/src/components/branch-onboarding-wizard.tsx:37` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 49 | `GET /api/dashboard/widget-data` | 1 | `client/src/components/dashboard-widgets.tsx:59` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |
| 50 | `GET /api/system/crash-report` | 1 | `client/src/components/error-boundary.tsx:31` | `[Endpoint ekle]` veya `[FE çağrısını sil]` |

_…ilk 50 gösterildi, toplam 118._

### 7.2 Ölü Endpoint Adayları (1278) — server'da var, FE'de çağrı yok

> **Yanlış pozitif uyarısı:** Webhook, cron, 3. parti entegrasyon, e2e test, mobil uygulama, admin curl gibi durumlardan çağrılan endpoint'ler bu listeye düşebilir. Silmeden önce manuel doğrulama gerekir.

| Method + Path | Tanım dosyası:satır | Öneri |
|---|---|---|
| `GET /api/branch-summary/:branchId` | `server/routes/branch-summary.ts:32` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/franchise/investors/:id` | `server/routes/franchise-investors.ts:78` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/franchise/investors/:id/performance` | `server/routes/franchise-investors.ts:132` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `PATCH /api/franchise/investors/:id` | `server/routes/franchise-investors.ts:223` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `POST /api/franchise/investors/:id/notes` | `server/routes/franchise-investors.ts:260` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `DELETE /api/franchise/investors/:id` | `server/routes/franchise-investors.ts:296` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/dobody/avatars/random` | `server/routes/dobody-avatars.ts:99` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `POST /api/admin/dobody/avatars` | `server/routes/dobody-avatars.ts:142` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `DELETE /api/admin/dobody/avatars/:id` | `server/routes/dobody-avatars.ts:203` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `PATCH /api/admin/dobody-tasks/:id` | `server/routes/dobody-task-manager.ts:342` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `DELETE /api/admin/dobody-tasks/:id` | `server/routes/dobody-task-manager.ts:385` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/admin/dobody-tasks/:id/stats` | `server/routes/dobody-task-manager.ts:419` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `POST /api/admin/dobody-tasks/:id/remind` | `server/routes/dobody-task-manager.ts:556` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/reports/insights/branch/:id` | `server/routes/insight-reports.ts:58` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/reports/financial/branch/:id` | `server/routes/insight-reports.ts:100` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/reports/financial/compare` | `server/routes/insight-reports.ts:114` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `PATCH /api/reports/financial/branch/:id` | `server/routes/insight-reports.ts:146` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/dashboard/branch/:branchId` | `server/routes/dashboard-data-routes.ts:347` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/dashboard/factory` | `server/routes/dashboard-data-routes.ts:437` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/dashboard/barista` | `server/routes/dashboard-data-routes.ts:463` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `POST /api/dashboard/snapshots/calculate` | `server/routes/dashboard-data-routes.ts:489` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/branch-training-progress/:branchId` | `server/routes/dashboard-data-routes.ts:504` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/branch-feedback-summary/:branchId` | `server/routes/dashboard-data-routes.ts:540` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `POST /api/admin/mc-widgets` | `server/routes/unified-dashboard-routes.ts:467` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `PATCH /api/admin/mc-widgets/:id` | `server/routes/unified-dashboard-routes.ts:498` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `DELETE /api/admin/mc-widgets/:id` | `server/routes/unified-dashboard-routes.ts:524` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/admin/dashboard-role-widgets/:role` | `server/routes/unified-dashboard-routes.ts:542` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `POST /api/admin/dashboard-role-widgets` | `server/routes/unified-dashboard-routes.ts:579` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `PATCH /api/admin/dashboard-role-widgets/:id` | `server/routes/unified-dashboard-routes.ts:620` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `DELETE /api/admin/dashboard-role-widgets/:id` | `server/routes/unified-dashboard-routes.ts:643` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `PUT /api/admin/dashboard-role-widgets/:role` | `server/routes/unified-dashboard-routes.ts:661` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/production-planning/plans/:id` | `server/routes/production-planning-routes.ts:60` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `PUT /api/production-planning/plans/:id` | `server/routes/production-planning-routes.ts:120` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `POST /api/production-planning/plans/:id/approve` | `server/routes/production-planning-routes.ts:157` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `POST /api/production-planning/plans/:id/suggest` | `server/routes/production-planning-routes.ts:174` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `POST /api/production-planning/records` | `server/routes/production-planning-routes.ts:229` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/production-planning/records` | `server/routes/production-planning-routes.ts:249` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/production-planning/comparison` | `server/routes/production-planning-routes.ts:273` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/production-planning/reports` | `server/routes/production-planning-routes.ts:328` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/production-planning/responsibilities` | `server/routes/production-planning-routes.ts:372` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `POST /api/production-planning/responsibilities` | `server/routes/production-planning-routes.ts:387` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `DELETE /api/production-planning/responsibilities/:id` | `server/routes/production-planning-routes.ts:402` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/employee-summary/:userId` | `server/routes/employee-summary.ts:11` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/employee-summary/branch/:branchId` | `server/routes/employee-summary.ts:43` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/employee-summary/branch/:branchId/quick` | `server/routes/employee-summary.ts:71` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `GET /api/v2/audit-templates/:id` | `server/routes/audit-v2.ts:71` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `PATCH /api/v2/audit-templates/:id` | `server/routes/audit-v2.ts:125` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `DELETE /api/v2/audit-templates/:id` | `server/routes/audit-v2.ts:151` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `POST /api/v2/audit-templates/:id/categories` | `server/routes/audit-v2.ts:174` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |
| `PATCH /api/v2/audit-categories/:id` | `server/routes/audit-v2.ts:203` | `[Sil]` veya `[Tut]` (manuel doğrulama gerekli — webhook/cron olabilir) |

_…ilk 50 gösterildi, toplam 1278._

## 8. Genel Sistem Hatası Sinyalleri

### 8.1 LSP Diagnostics Özeti (TypeScript)

Replit LSP üzerinden anlık alındı (`getLatestLspDiagnostics()`):

- Hatalı dosya sayısı: **0**
- Toplam hata: **0**

_Şu an LSP tarafından hata bildirilmiyor._

### 8.2 Kod kalitesi sayaçları

| Metrik | Toplam |
|---|---|
| TODO | 5 |
| FIXME | 0 |
| HACK | 0 |
| @ts-ignore | 5 |
| @ts-expect-error | 0 |
| `console.error` çağrısı | 2466 |
| `throw new Error(...)` | 414 |

### 8.3 `console.error` yoğunlaşması (en üst 15 dosya)

| Dosya | Sayı |
|---|---|
| `server/routes/hr.ts` | 161 |
| `server/routes/factory.ts` | 146 |
| `server/routes/branches.ts` | 121 |
| `server/routes/operations.ts` | 119 |
| `server/routes/admin.ts` | 118 |
| `server/routes/tasks.ts` | 83 |
| `server/index.ts` | 81 |
| `server/routes/shifts.ts` | 61 |
| `server/routes/academy.ts` | 55 |
| `server/maliyet-routes.ts` | 51 |
| `server/satinalma-routes.ts` | 51 |
| `server/routes/factory-recipes.ts` | 37 |
| `server/routes/certificate-routes.ts` | 35 |
| `server/routes/equipment.ts` | 35 |
| `server/ai.ts` | 34 |

### 8.4 `throw new Error` yoğunlaşması (en üst 10 dosya)

| Dosya | Sayı |
|---|---|
| `server/ai.ts` | 52 |
| `server/storage.ts` | 19 |
| `client/src/pages/yonetim/akademi.tsx` | 14 |
| `client/src/pages/fabrika/kiosk.tsx` | 10 |
| `client/src/pages/personel-profil.tsx` | 9 |
| `client/src/components/hr/dialogs/ImportExportDialogs.tsx` | 7 |
| `client/src/pages/module-detail.tsx` | 7 |
| `client/src/pages/vardiya-checkin.tsx` | 7 |
| `client/src/components/ajanda/TodoList.tsx` | 6 |
| `client/src/components/mission-control/shared/PdksWidget.tsx` | 6 |

### 8.5 Quality Gate Hızlı Tarama (`dospresso-quality-gate` skill referansı)

| # | Kontrol | Bulgu | Yorum |
|---|---|---|---|
| 1 | Auth middleware kullanımı (`requireAuth`/`isAuthenticated`/`requireRole`) | 2032 çağrı | ✅ Yaygın |
| 2 | Türkçe UI (`date-fns/locale` + `tr`) | 74 dosya | ✅ |
| 3 | `req.user` referansı (server) | 1700 | ✅ Pattern aktif |
| 4 | Kiosk route sayısı (PIN auth gereken) | 4 | ✅ Beklenen 3+ kiosk var |
| 5 | Modül flag/guard kullanımı (`ModuleGuard` / `modules-registry`) | 3 dosya | ✅ |
| 6 | SLA timezone (`Europe/Istanbul`) | 60 kullanım | ✅ |
| 7 | Soft delete (`deletedAt`) | 150 | ✅ |
| 8 | HTTP 423 (data lock) | 16 | ✅ |
| 9 | Bcrypt kullanımı | 93 | ✅ |
| 10 | Radix UI paket sayısı (skill: dospresso-radix-safety) | 27 | ✅ İzlenmeli (nested version riski) |

> Diğer 7 quality-gate maddesi (Drizzle vs DB sütun tutarlılığı, CRM endpoint auth, kiosk role safety, mobile compactness, dark mode, null safety, modül flag tutarlılığı) **otomatik tarama dışında** kaldı; bu maddeler için ayrı manuel görev önerilir (bkz. takip görevleri).

## 9. Özet Karar Listesi

Aşağıdaki başlıklar kullanıcıyla ayrı görevlerde tek tek konuşulacak. Her satır için karar: **`[Tut]` / `[Sil]` / `[Birleştir → X]` / `[Düzelt]`**.

### A. Yüksek öncelik — kullanıcı tıklayınca anında 404 alıyor

1. **118 kırık API çağrısı** — production'da hata atan adaylar (Bölüm 7.1).
2. **10 kırık link** — kullanıcı tıklayınca 404'e gidecek (Bölüm 3).
3. **3 kırık menü öğesi** + 0 server menü kırık path (Bölüm 6).
4. **10 gerçek öksüz sayfa** — disk şişiren ölü kod (Bölüm 2.1).

### B. Orta öncelik — yapısal temizlik

5. 8 duplikat aile (Bölüm 4): hangi sayfa kalsın?
6. 17 redirect bileşeni → kullanıcı tek tek hedefini onaylasın (Bölüm 5).
7. 1278 ölü endpoint adayı (Bölüm 7.2) — webhook/cron filtresinden geçirilmeli.
8. 8 route'a bağlı olmayan sayfa import'u (Bölüm 1.1).

### C. Düşük öncelik — kod sağlığı

9. 5 TODO + 0 FIXME + 0 HACK işaretini takip kuyruğuna al.
10. 5 @ts-ignore + 0 @ts-expect-error → tek tek kaldırılabilir.
11. 2466 `console.error` + 414 `throw new Error` → en yoğun dosyalardan başla (Bölüm 8.3 / 8.4).

---

_Rapor üretici: `.local/scripts/audit-app.mjs` (repo dışı yardımcı). Sadece denetim amaçlıdır; hiçbir kaynak dosyayı değiştirmez._
