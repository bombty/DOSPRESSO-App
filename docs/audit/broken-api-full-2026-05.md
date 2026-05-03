# Kırık API Çağrıları — Tam Liste (W0 reconstruction)

**Üretim:** 2026-05-03T01:09:40.559Z
**Script:** scripts/audit/extract-broken-apis.mjs (committed, READ-ONLY)
**Task:** #288 — Wave W0 of #283

Bu rapor APP_AUDIT_REPORT_2026-05.md §7.1 truncate edilmiş 51-118 satırlarını geri kazandırmak için bağımsız extraction ile üretildi. Methodology audit ile birebir uyumlu (FE: apiRequest/useQuery/fetch; server: app.METHOD + router.METHOD + mount prefix).

## Özet

| Metrik | Değer |
|---|---|
| Taranan FE dosyası | 624 |
| Taranan server dosyası | 297 |
| Toplam FE API çağrı kalemi (distinct method+path) | 1285 |
| Toplam server endpoint (method+path) | 2043 |
| Mount prefix tespit edilen router sayısı | 10 |
| **TOPLAM kırık** (tüm kategoriler) | **60** |
| → missing (server'da hiç yok) | 5 |
| → method-mismatch (path var, method farklı) | 10 |
| → related-exists (sub/parent path mevcut) | 45 |

## Tüm Kırık Çağrılar (use count desc)

| # | Method+Path | Use | Kind | Server methods | Örnek FE konum |
|---|---|---|---|---|---|
| 1 | `GET /api/mrp/daily-plan` | 12 | related-exists | — | client/src/components/kiosk/KioskMRPPanel.tsx:34<br>client/src/components/kiosk/KioskMRPPanel.tsx:63 |
| 2 | `GET /api/product-costs` | 12 | related-exists | — | client/src/pages/fabrika/maliyet-yonetimi.tsx:103<br>client/src/pages/fabrika/maliyet-yonetimi.tsx:112 |
| 3 | `GET /api/mrp/leftovers` | 10 | method-mismatch | POST | client/src/components/kiosk/KioskMRPPanel.tsx:45<br>client/src/components/kiosk/KioskMRPPanel.tsx:78 |
| 4 | `GET /api/personnel` | 10 | related-exists | — | client/src/pages/personel-detay.tsx:97<br>client/src/pages/personel-duzenle.tsx:92 |
| 5 | `GET /api/branch-summary` | 8 | related-exists | — | client/src/components/mission-control/MissionControlSupervisor.tsx:77<br>client/src/components/mission-control/MissionControlYatirimci.tsx:74 |
| 6 | `GET /api/branch-feedback-summary` | 7 | related-exists | — | client/src/components/mission-control/MissionControlSupervisor.tsx:117<br>client/src/components/mission-control/MissionControlYatirimci.tsx:113 |
| 7 | `GET /api/cost-dashboard` | 7 | related-exists | — | client/src/pages/fabrika/maliyet-yonetimi.tsx:113<br>client/src/pages/fabrika/maliyet-yonetimi.tsx:126 |
| 8 | `GET /api/onboarding-tasks` | 7 | method-mismatch | POST | client/src/components/hr/OnboardingTaskDialog.tsx:74<br>client/src/pages/personel-detay.tsx:141 |
| 9 | `GET /api/project-tasks` | 7 | related-exists | — | client/src/pages/proje-gorev-detay.tsx:120<br>client/src/pages/proje-gorev-detay.tsx:145 |
| 10 | `GET /api/fault-service-tracking` | 6 | method-mismatch | POST | client/src/pages/ariza-detay.tsx:287<br>client/src/pages/ariza-detay.tsx:299 |
| 11 | `GET /api/training-program` | 6 | related-exists | — | client/src/pages/egitim-programi.tsx:134<br>client/src/pages/egitim-programi.tsx:139 |
| 12 | `GET /api/module-content` | 5 | related-exists | — | client/src/components/module-content-editor.tsx:22<br>client/src/components/module-content-editor.tsx:32 |
| 13 | `GET /api/factory` | 4 | related-exists | — | client/src/components/card-grid-hub.tsx:245<br>client/src/pages/fabrika/vardiya-uyumluluk.tsx:53 |
| 14 | `POST /api/iletisim/tickets/${ticket` | 4 | method-mismatch | DELETE/GET/PATCH | client/src/pages/iletisim-merkezi/ticket-chat-panel.tsx:113<br>client/src/pages/iletisim-merkezi/ticket-chat-panel.tsx:147 |
| 15 | `GET /api/module-flags/branch` | 4 | related-exists | — | client/src/pages/admin/module-flags.tsx:143<br>client/src/pages/admin/module-flags.tsx:164 |
| 16 | `GET /api/factory-shifts/my-assignment` | 3 | related-exists | — | client/src/pages/fabrika/kiosk.tsx:2659<br>client/src/pages/fabrika/kiosk.tsx:2698 |
| 17 | `GET /api/salary/employee` | 3 | method-mismatch | POST | client/src/pages/personel-duzenle.tsx:1118<br>client/src/pages/personel-duzenle.tsx:1174 |
| 18 | `GET /api/trash` | 3 | related-exists | — | client/src/pages/admin/cop-kutusu.tsx:57<br>client/src/pages/admin/cop-kutusu.tsx:67 |
| 19 | `GET /api/v2/branch-on-shift` | 3 | related-exists | — | client/src/components/DobodyProposalWidget.tsx:77<br>client/src/pages/coach-sube-denetim.tsx:106 |
| 20 | `GET /api/branch-training-progress` | 2 | related-exists | — | client/src/components/mission-control/MissionControlSupervisor.tsx:103<br>client/src/components/mission-control/MissionControlYatirimci.tsx:99 |
| 21 | `GET /api/checklist-completions` | 2 | related-exists | — | client/src/pages/sube/checklist-execution.tsx:112<br>client/src/pages/sube/checklist-execution.tsx:145 |
| 22 | `GET /api/dashboard/branch` | 2 | related-exists | — | client/src/components/mission-control/MissionControlSupervisor.tsx:89<br>client/src/components/mission-control/MissionControlYatirimci.tsx:85 |
| 23 | `POST /api/new-shop-projects/${projectId}/phases/${editingPhase` | 2 | related-exists | — | client/src/pages/yeni-sube-detay.tsx:862<br>client/src/pages/yeni-sube-detay.tsx:911 |
| 24 | `DELETE /api/new-shop-projects/${projectId}/phases/${editingPhase` | 2 | related-exists | — | client/src/pages/yeni-sube-detay.tsx:897<br>client/src/pages/yeni-sube-detay.tsx:927 |
| 25 | `GET /api/staff-evaluations` | 2 | method-mismatch | POST | client/src/pages/personel-profil.tsx:244<br>client/src/pages/personel-profil.tsx:279 |
| 26 | `GET /api/troubleshooting` | 2 | related-exists | — | client/src/components/fault-report-dialog.tsx:88<br>client/src/pages/ariza-yeni.tsx:86 |
| 27 | `POST /api/academy/gates/${nextGate` | 1 | method-mismatch | GET/PATCH | client/src/pages/academy-my-path.tsx:570 |
| 28 | `GET /api/admin/branch-setup-status` | 1 | related-exists | — | client/src/components/branch-onboarding-wizard.tsx:37 |
| 29 | `GET /api/admin/module-activation-checklist` | 1 | related-exists | — | client/src/components/module-activation-checklist.tsx:26 |
| 30 | `PATCH /api/admin/settings/branch_dashboard_allowed_roles` | 1 | related-exists | — | client/src/pages/admin/yetkilendirme.tsx:801 |
| 31 | `GET /api/agent` | 1 | related-exists | — | client/src/components/agent-admin-panel.tsx:67 |
| 32 | `GET /api/analytics` | 1 | related-exists | — | client/src/components/quick-task-modal.tsx:263 |
| 33 | `GET /api/branch-dashboard-v2` | 1 | related-exists | — | client/src/pages/sube/dashboard.tsx:208 |
| 34 | `GET /api/branch-inventory` | 1 | related-exists | — | client/src/pages/sube/siparis-stok.tsx:524 |
| 35 | `GET /api/career/composite-score` | 1 | related-exists | — | client/src/pages/academy.tsx:89 |
| 36 | `GET /api/cost-analysis/recipe` | 1 | related-exists | — | client/src/pages/maliyet-analizi.tsx:334 |
| 37 | `PATCH /api/crm/complaints/misafir/${id}/assign` | 1 | missing | — | client/src/pages/guest-complaints.tsx:116 |
| 38 | `PATCH /api/crm/complaints/misafir/${id}/resolve` | 1 | missing | — | client/src/pages/guest-complaints.tsx:131 |
| 39 | `GET /api/dashboard/widget-data` | 1 | related-exists | — | client/src/components/dashboard-widgets.tsx:59 |
| 40 | `GET /api/employee-dashboard` | 1 | related-exists | — | client/src/pages/sube/employee-dashboard.tsx:95 |
| 41 | `GET /api/factory-products` | 1 | related-exists | — | client/src/pages/maliyet-analizi.tsx:100 |
| 42 | `GET /api/factory-team-analysis${queryParams}` | 1 | missing | — | client/src/pages/fabrika/vardiya-planlama.tsx:1788 |
| 43 | `GET /api/factory/analytics/worker-score` | 1 | related-exists | — | client/src/pages/fabrika/performans.tsx:258 |
| 44 | `GET /api/factory/collaborative-scores` | 1 | related-exists | — | client/src/pages/fabrika/kiosk.tsx:363 |
| 45 | `GET /api/factory/ingredient-nutrition` | 1 | related-exists | — | client/src/pages/kalite/besin-onay.tsx:528 |
| 46 | `GET /api/factory/ingredient-nutrition/approved${qs ` | 1 | missing | — | client/src/pages/kalite/besin-onay.tsx:749 |
| 47 | `GET /api/factory/kiosk/station-worker-count` | 1 | related-exists | — | client/src/pages/fabrika/kiosk.tsx:388 |
| 48 | `GET /api/factory/quality-specs/station` | 1 | related-exists | — | client/src/pages/fabrika/kalite-kontrol.tsx:160 |
| 49 | `GET /api/feedback-custom-questions` | 1 | method-mismatch | POST | client/src/pages/guest-form-settings.tsx:295 |
| 50 | `GET /api/feedback/branch` | 1 | related-exists | — | client/src/pages/misafir-geri-bildirim.tsx:486 |
| 51 | `GET /api/inventory/by-supplier` | 1 | related-exists | — | client/src/pages/satinalma/mal-kabul.tsx:217 |
| 52 | `PATCH /api/new-shop-projects/${projectId}/phases/${editingPhase` | 1 | related-exists | — | client/src/pages/yeni-sube-detay.tsx:880 |
| 53 | `POST /api/new-shop-projects/${projectId}/procurement/items/${selectedProcurementItem` | 1 | method-mismatch | GET/PATCH | client/src/pages/yeni-sube-detay.tsx:941 |
| 54 | `GET /api/pdks-payroll` | 1 | related-exists | — | client/src/pages/maas.tsx:100 |
| 55 | `GET /api/public/staff-rating/validate` | 1 | related-exists | — | client/src/pages/public-staff-rating.tsx:28 |
| 56 | `GET /api/public/urun` | 1 | related-exists | — | client/src/pages/public-urun.tsx:80 |
| 57 | `GET /api/qr/equipment` | 1 | related-exists | — | client/src/components/qr-equipment-detail.tsx:76 |
| 58 | `GET /api/qr/inventory` | 1 | related-exists | — | client/src/components/qr-inventory-detail.tsx:66 |
| 59 | `GET /api/satinalma/dashboard${dashboardQueryParam}` | 1 | missing | — | client/src/pages/satinalma/satinalma-dashboard.tsx:291 |
| 60 | `GET /api/training/assignments` | 1 | method-mismatch | POST | client/src/pages/training-assign.tsx:52 |

## 51-118 Aralığı (audit truncate satırları)

Audit ilk 50 satırı göstermişti. Aşağıdaki tablo bu listenin 51 ve sonrasını yalıtarak audit truncate satırlarını kapatır.

| # | Method+Path | Use | Kind | FE konumları |
|---|---|---|---|---|
| 51 | `GET /api/inventory/by-supplier` | 1 | related-exists | client/src/pages/satinalma/mal-kabul.tsx:217 |
| 52 | `PATCH /api/new-shop-projects/${projectId}/phases/${editingPhase` | 1 | related-exists | client/src/pages/yeni-sube-detay.tsx:880 |
| 53 | `POST /api/new-shop-projects/${projectId}/procurement/items/${selectedProcurementItem` | 1 | method-mismatch | client/src/pages/yeni-sube-detay.tsx:941 |
| 54 | `GET /api/pdks-payroll` | 1 | related-exists | client/src/pages/maas.tsx:100 |
| 55 | `GET /api/public/staff-rating/validate` | 1 | related-exists | client/src/pages/public-staff-rating.tsx:28 |
| 56 | `GET /api/public/urun` | 1 | related-exists | client/src/pages/public-urun.tsx:80 |
| 57 | `GET /api/qr/equipment` | 1 | related-exists | client/src/components/qr-equipment-detail.tsx:76 |
| 58 | `GET /api/qr/inventory` | 1 | related-exists | client/src/components/qr-inventory-detail.tsx:66 |
| 59 | `GET /api/satinalma/dashboard${dashboardQueryParam}` | 1 | missing | client/src/pages/satinalma/satinalma-dashboard.tsx:291 |
| 60 | `GET /api/training/assignments` | 1 | method-mismatch | client/src/pages/training-assign.tsx:52 |
