# DOSPRESSO Sistem Haritası ve Yol Planı

**Tarih:** 27 Nisan 2026
**Mod:** Sadece okuma. Hiçbir kod, schema, migration, env veya bağımlılık değiştirilmedi.
**Amaç:** Modül, rol, route, DB tablo ailesi, frontend sayfa, backend endpoint ve iş akışı bazında kalıcı sistem haritası. ChatGPT/Replit ortak çalışmasında referans olacak.

**Kaynak referanslar:**
- `replit.md` — proje preferences ve mimari özet
- `docs/audit/db-drift-report-2026-04-26.md` — Task #255 DB drift kapanışı
- `docs/audit/DOSPRESSO_FULL_AUDIT_2026-04-26.md` — Task #252 kapsamlı denetim
- `docs/audit/gida-muh-system-analysis-2026-04-27.md` — bu raporun gıda mühendisi alt analizi (önceki commit `7064dc027`)
- `client/src/lib/nav-registry.ts`, `client/src/components/layout/module-menu-config.ts`, `client/src/lib/role-routes.ts`
- `shared/schema/schema-01.ts ... schema-23-mrp-light.ts` (16 modüler şema)
- `server/routes/*.ts` (~600+ endpoint), `server/services/manifest-auth.ts`, `server/localAuth.ts`

---

## 1) Genel sistem mimarisi

DOSPRESSO 22 lokasyonlu (20 şube + 1 HQ + 1 Fabrika) kahve/donut franchise'ı için 270 kullanıcı + 29 rol planlı tek-projedir. Tek monorepo: React 18 + Vite frontend, Express + Passport.js + Drizzle ORM backend, Neon PostgreSQL.

### Modül grupları

| # | Modül grubu | Sorumlu rol(ler) | Ana ekran(lar) | Backend route prefix |
|---|---|---|---|---|
| 1 | **Şube operasyonu** | mudur, supervisor, supervisor_buddy, barista, bar_buddy, stajyer | `/sube-centrum`, `/gorevler`, `/checklistler`, `/pdks`, `/canli-takip` | `/api/branches/*`, `/api/tasks/*`, `/api/pdks/*`, `/api/checklists/*` |
| 2 | **HQ / merkez kontrol** | admin, ceo, cgo, coach, yatirimci_hq | `/ceo-command-center`, `/merkez-dashboard`, `/subeler`, `/canli-takip`, `/gelismis-raporlar` | `/api/dashboard/*`, `/api/branches`, `/api/me/dashboard-data`, `/api/admin/*` |
| 3 | **Fabrika / üretim** | fabrika_mudur, fabrika_operator, fabrika_sorumlu, fabrika_personel, fabrika_depo, uretim_sefi | `/fabrika`, `/fabrika/dashboard`, `/fabrika/lot-izleme`, `/fabrika/uretim-planlama`, `/fabrika-stok-merkezi`, `/fabrika/kiosk` | `/api/factory/*`, `/api/factory-recipes/*`, `/api/inventory/*`, `/api/material-pick/*` |
| 4 | **Gıda mühendisi / kalite / etiket** | gida_muhendisi, kalite_kontrol, recete_gm, sef, trainer | `/kalite-alerjen`, `/kalite/besin-onay`, `/fabrika/gida-guvenligi`, `/fabrika/kalite-kontrol`, `/receteler`, `/fabrika-recete-detay`, `/fabrika-recete-duzenle` | `/api/factory-recipes/*`, `/api/factory-recipe-nutrition/*`, `/api/factory-allergens/*`, `/api/quality/*` |
| 5 | **İK / bordro / özlük** | muhasebe_ik, admin, ceo (read), mudur (kendi şubesi) | `/ik`, `/personel/:id`, `/bordrom`, `/maas`, `/izin-talepleri`, `/personel-onboarding`, `/pdks-izin-gunleri` | `/api/hr/*`, `/api/salary/*`, `/api/leave/*`, `/api/employee-documents/*` |
| 6 | **CRM / şikayet / destek** | cgo, marketing, destek, mudur (kendi şubesi okur) | `/crm`, `/destek`, `/banner-editor`, `/duyuru-studio` | `/api/crm/*`, `/api/feedback/*`, `/api/tickets/*`, `/api/support/*` |
| 7 | **Raporlama / analitik** | ceo, cgo, coach, yatirimci_hq, muhasebe_ik | `/gelismis-raporlar`, `/e2e-raporlar`, `/kasa-raporlari`, `/hq-fabrika-analitik`, `/hq-personel-istatistikleri`, `/sistem-atolyesi` | `/api/reports/*`, `/api/analytics/*`, `/api/me/dashboard-data` |
| 8 | **Yönetim / ayarlar** | admin (yalnız), ceo (kısmi) | `/admin`, `/yonetim/ayarlar`, `/yonetim/kullanicilar`, `/pilot-baslat`, `/banner-editor`, `/sistem-atolyesi` | `/api/admin/*`, `/api/users/*`, `/api/module-flags/*`, `/api/audit-logs/*` |

### Özel iş akışları

- **Kiosk:** `/sube/kiosk` (PIN, `sube_kiosk` rol, 18 kiosk hesabı), `/fabrika/kiosk` (PIN, `fabrika_kiosk` rol). Auth: PIN+bcrypt; session: `kiosk_sessions`.
- **Mr. Dobody (AI agent):** `/api/agent/*`, gap detection + skill çalıştırma + proposal akışı (`dobody_proposals`).
- **Komuta Merkezi 2.0:** `dashboard_widgets` + `dashboard_role_widgets` registry; tek endpoint `GET /api/me/dashboard-data` rol bazlı widget seti döner. 24 widget, 7 kategori.
- **Mockup sandbox:** `client/src/pages/mockup/` ayrı vite preview, canvas iframe için.

---

## 2) Rol ve scope matrisi

29 rol. `shared/schema/schema-01.ts` (UserRole enum) + `shared/schema/schema-02.ts` (PERMISSIONS sabit) + `shared/schema/schema-05.ts` (`role_module_permissions`, `role_permission_grants` DB tabloları) + `shared/schema/schema-12.ts` (`module_flags`, `module_delegations`) hibrit yapı.

| Rol | Ana modüller | Şube scope | HQ erişim | Maaş/bordro | Silme yetkisi | Kiosk? | Notlar |
|---|---|---|---|---|---|---|---|
| **admin** | Tümü | Tüm şubeler | Evet | Read+write | Hard delete | Hayır | Tek hard-delete sahibi (`delegation-routes.ts`) |
| **ceo** | Tümü | Tüm şubeler | Evet | Read | Soft delete | Hayır | Komuta merkezi tam erişim |
| **cgo** | dashboard, crm, hr, finance, **quality** | Tüm şubeler | Evet | Read | Soft delete | Hayır | 24 Nisan'da quality permissions eklendi (commit `61c875451`) |
| **coach** | academy, quality, hr, dashboard | Tüm şubeler | Evet | — | Soft delete | Hayır | Şube performans odaklı |
| **muhasebe_ik** | accounting, hr, pdks, payroll | Tüm şubeler | Evet | Read+write | Soft delete | Hayır | Maaş/bordro tek tam yetki |
| **mudur** | pdks, tasks, hr (kendi şubesi), shift, dashboard | **Kendi şubesi** | Hayır | — | Soft delete (kendi şubesi) | Hayır | Pilot: Erdem, Andre |
| **supervisor** | pdks, tasks, shift | **Kendi şubesi** | Hayır | — | Yok | Hayır | Pilot: Basri |
| **supervisor_buddy** | pdks, tasks, academy | Kendi şubesi | Hayır | — | Yok | Hayır | Delegasyon ile geçici supervisor olabilir (`module_delegations`) |
| **barista** | academy, tasks, order | Kendi şubesi | Hayır | Self read | Yok | Hayır | Standart şube personeli |
| **bar_buddy** | academy, tasks | Kendi şubesi | Hayır | Self read | Yok | Hayır | Kıdemli barista |
| **stajyer** | academy (read), tasks | Kendi şubesi | Hayır | — | Yok | Hayır | Çok kısıtlı |
| **sube_kiosk** | orders, inventory (kendi şubesi) | Kendi şubesi | Hayır | — | Yok | **Evet** (PIN) | 18 hesap; insan personel listelerinde GİZLİ (`f6bb4110b`) |
| **fabrika_kiosk** | factory floor | Fabrika | Hayır | — | Yok | **Evet** (PIN) | İnsan listelerinde gizli |
| **yatirimci_branch** | dashboard, reports (kendi şubesi) | Kendi şubesi | Hayır | — | Yok | Hayır | Read-only |
| **yatirimci_hq** | dashboard, reports (tüm şubeler) | Tüm şubeler | Evet | — | Yok | Hayır | Read-only |
| **satinalma** | inventory, suppliers, orders | Tüm şubeler | Evet | — | Soft delete | Hayır | Stok + tedarikçi yönetimi |
| **marketing** | announcements, crm, banner | HQ | Evet | — | Yok | Hayır | İçerik üretimi |
| **trainer** | academy, recipes (read) | Tüm şubeler | Evet | — | Yok | Hayır | Eğitim sorumlusu |
| **kalite_kontrol** | quality, factory | Fabrika | Evet | — | Yok | Hayır | Denetim |
| **gida_muhendisi** | quality, food_safety, recipes (besin onay) | Fabrika | Evet | — | Yok | Hayır | Besin/etiket onay sahibi |
| **fabrika_mudur** | factory, production, quality | Fabrika | Evet | — | Soft delete (fabrika) | Hayır | Pilot: Eren |
| **uretim_sefi** | factory, production | Fabrika | Hayır | — | Yok | Hayır | Hat sorumlusu |
| **fabrika_operator** | factory floor, tasks | Fabrika | Hayır | — | Yok | Hayır | Makine operatörü |
| **fabrika_sorumlu** | factory, tasks | Fabrika | Hayır | — | Yok | Hayır | Vardiya bazlı |
| **fabrika_personel** | factory, tasks | Fabrika | Hayır | — | Yok | Hayır | Genel personel |
| **fabrika_depo** | inventory, factory | Fabrika | Hayır | — | Yok | Hayır | Depo |
| **sef** | recipes, factory | Fabrika | Evet | — | Yok | Hayır | Mutfak şefi |
| **recete_gm** | recipes, factory | Fabrika | Evet | — | Yok | Hayır | Genel mutfak reçete onay |
| **teknik** | equipment, faults | Tüm şubeler | Evet | — | Yok | Hayır | Arıza/teknik servis |
| **destek** | support, tickets | Tüm şubeler | Evet | — | Yok | Hayır | Müşteri/sistem desteği |

**Tutarsızlık uyarıları (P0 olarak ele alınmalı):**
- `teknik` ve `destek` rolleri `schema-01.ts`'de "Eski HQ Rolleri" diye işaretli, fakat `schema-02.ts` ve `seed-permission-actions.ts` aktif kullanıyor. Karar: kalsın mı, sunset mi?
- Frontend `client/src/lib/can-see-nav-item.ts` statik `PERMISSIONS`'a bakıyor; backend `server/permission-service.ts` DB'den okuyor. Admin panelinden değişen yetki anında frontend'e yansımayabilir → cache invalidation eksiği.
- `supervisor_buddy` delegasyon mantığı `delegation-routes.ts` + `schema-12.ts` `module_delegations`'da net; ama statik `roleVisibility: supervisor` kontrolleri delegasyonu **bypass edebilir** → `useDynamicPermissions.ts` her yerde tutarlı kullanılmıyor.

---

## 3) Frontend route haritası

`client/src/App.tsx` ~150+ route. Sidebar yapısı:
- **Global Nav (sol rail):** `client/src/lib/nav-registry.ts` — rol scope'una göre filtrelenir.
- **Modül Sidebar (iç menü):** `client/src/components/layout/module-menu-config.ts` — modül seçildiğinde dinamik.
- **Rol→path eşleşmesi:** `client/src/lib/role-routes.ts` + `client/src/lib/navigation-config.ts`.
- **Wrappers:** `ProtectedRoute(allowedRoles | allowedGroups)`, `ModuleGuard(moduleKey)`, `AdminOnly`, `ExecutiveOnly`, `FabrikaOnly`, `CEOOnly`, `isPublicPath`.

### Ana route envanteri (kritik kesit, ~150'den)

| Path | Component | Guard | Sidebar? | Notlar |
|---|---|---|---|---|
| `/` | `HomeScreen` | Auth | Evet | `getRoute(role)` ile rol bazlı landing redirect |
| `/control` | `ControlDashboard` | Auth | Hayır (no-sidebar) | Klasik fallback |
| `/merkez-dashboard` | `MerkezDashboard` | `ExecutiveOnly` | Evet (Raporlar) | |
| `/ceo-command-center` | `CEOCommandCenter` | `CEOOnly` | Hayır | `getRoute` ile Home yerine gelir |
| `/sube-centrum` | `SubeCentrum` | mudur+ | Hayır | Centrum v5 |
| `/muhasebe-centrum` | `MuhasebeCentrum` | muhasebe_ik+ | Hayır | Centrum v5 |
| `/personel-centrum` | `PersonelCentrum` | mudur+ | Hayır | |
| `/depo-centrum` | `DepoCentrum` | satinalma/fabrika_depo+ | Hayır | |
| `/fabrika-centrum` | `FabrikaCentrum` | fabrika_mudur+ | Hayır | |
| `/subeler` | `Subeler` | `ExecutiveOnly` | Evet | |
| `/subeler/:id` | `SubeDetay` | `ExecutiveOnly` | — | Alt sayfa |
| `/canli-takip` | `CanliTakip` | `ExecutiveOnly` | Evet | Hotfix `4ec4a5901` (JSX text leak) |
| `/ik` | `IK` | `ExecutiveOnly`+ | Evet | |
| `/personel/:id` | `PersonelProfil` | Auth | — | |
| `/personel-detay` | `PersonelDetay` | mudur+ | — | |
| `/personel-duzenle` | `PersonelDuzenle` | mudur+ | — | |
| `/personel-onboarding` | `PersonelOnboarding` | muhasebe_ik+ | Evet | Hotfix `6756f0024` (SPA + role gate + empty state) |
| `/personel-musaitlik` | `PersonelMusaitlik` | mudur+ | Evet | |
| `/maas` | `Maas` | muhasebe_ik | Evet | Maaş yönetimi |
| `/bordrom` | `Bordrom` | Auth | Evet | Self bordro görüntüleme |
| `/izin-talepleri` | `LeaveRequests` | Auth | Evet | |
| `/pdks` | `Attendance` | `ModuleGuard(pdks)` | Evet | |
| `/pdks-izin-gunleri` | `PdksIzinGunleri` | mudur+ | — | |
| `/vardiya-planlama` | `VardiyaPlanlama` | `ModuleGuard(shift)` | Evet | Hotfix `4ec4a5901` (shifts.filter array safety) |
| `/gorevler` | `Tasks` | `ModuleGuard(tasks)` | Evet | |
| `/checklistler` | `Checklists` | `ModuleGuard(checklist)` | Evet | |
| `/ariza` | `FaultHub` | `ModuleGuard(equipment)` | Evet | |
| `/akademi` | `AkademiV3` | `ModuleGuard(academy)` | Evet | |
| `/bilgi-bankasi` | `KnowledgeBase` | Auth | Evet | |
| `/receteler` | `Receteler` | `FabrikaOnly` | Evet | |
| `/recete-detay` | `ReceteDetay` | `FabrikaOnly` | — | |
| `/fabrika` | `FabrikaMegaModule` | `FabrikaOnly` | Evet | Mega Module — `/fabrika/:subpage` |
| `/fabrika-receteler` | `FabrikaReceteler` | `FabrikaOnly` | Evet | |
| `/fabrika-recete-detay` | `FabrikaReceteDetay` | `FabrikaOnly` | — | |
| `/fabrika-recete-duzenle` | `FabrikaReceteDuzenle` | `FabrikaOnly` | — | Hotfix `caab89d15` + `2216bfb48` |
| `/fabrika-stok-merkezi` | `FabrikaStokMerkezi` | fabrika_depo/satinalma | Evet | |
| `/fabrika-uretim-modu` | `FabrikaUretimModu` | fabrika_operator+ | Evet | |
| `/fabrika-keyblend-yonetimi` | `FabrikaKeyblendYonetimi` | recete_gm | Evet | |
| `/fabrika/lot-izleme` | `LotIzleme` | `FabrikaOnly` | Sub | Lot statü tablosu |
| `/fabrika/gida-guvenligi` | `GidaGuvenligi` | gida_muhendisi+ | Sub | |
| `/fabrika/kalite-kontrol` | `KaliteKontrol` | kalite_kontrol+ | Sub | |
| `/kalite-alerjen` | `KaliteAlerjen` | gida_muhendisi+ | Evet | Alerjen master |
| `/kalite-denetimi` | `KaliteDenetimi` | kalite_kontrol+ | Evet | |
| `/kalite-kontrol-dashboard` | `KaliteKontrolDashboard` | kalite_kontrol+ | Evet | |
| `/kalite/besin-onay` | `BesinOnay` | gida_muhendisi+ | Evet | Besin onay akışı (mevcut) |
| `/waste-qc-console` | `WasteQCConsole` | kalite_kontrol+ | — | |
| `/crm` | `CRMMegaModule` | Protected | Evet | Mega Module |
| `/destek` | `Destek` | Auth | Evet | |
| `/admin` | `AdminMegaModule` | `AdminOnly` | Evet | Mega Module |
| `/yonetim/ayarlar` | `Settings` | `AdminOnly` | Evet | |
| `/yonetim/kullanicilar` | `UserCRM` | `AdminOnly` | Evet | |
| `/banner-editor` | `BannerEditor` | Protected | Evet | |
| `/duyuru-studio` | `DuyuruStudioV2` | Protected | **HAYIR** | Route var, sidebar'da yok |
| `/sistem-atolyesi` | `SistemAtolyesi` | Admin/CEO | **HAYIR** | Route var, sidebar'da yok |
| `/pilot-baslat` | `PilotLaunch` | `AdminOnly` | Evet | |
| `/gelismis-raporlar` | `AdvancedReportsPage` | `ExecutiveOnly` | Evet | |
| `/e2e-raporlar` | `E2EReports` | `ExecutiveOnly` | Evet | |
| `/kasa-raporlari` | `CashReports` | `ExecutiveOnly` | Evet | |
| `/hq-fabrika-analitik` | `HQFabrikaAnalitik` | ceo/cgo | Evet | |
| `/hq-personel-istatistikleri` | `HQPersonelIstatistikleri` | ceo/cgo | Evet | |
| `/muhasebe` | `Muhasebe` | `ModuleGuard(finance)` | Evet | |
| `/mali-yonetim` | `MaliYonetim` | `ModuleGuard(finance)` | Evet | |
| `/denetimler` | `Denetimler` | `ModuleGuard(audit)` | Evet | |
| `/kayip-esya` | `KayipEsya` | Auth | Evet | |
| `/login`, `/setup`, `/sube/kiosk`, `/fabrika/kiosk` | — | Public | — | `isPublicPath` ile auth muaf |

### Risk listesi (frontend)

| Risk | Kanıt | Etki |
|---|---|---|
| **Broken sidebar link** | `EXACT_ROUTE_MAP` içinde `/stok-transferleri`, `/canli-izleme` var, `App.tsx`'de `<Route>` yok | 404 / dead click |
| **Gizli route** | `/sistem-atolyesi`, `/duyuru-studio` yalnız URL ile erişilir | Keşfedilmez özellik |
| **Centrum v5 leak** | `/ceo-command-center`, `/sube-centrum`, `/muhasebe-centrum` sidebar'da yok ama `getRoute(role)` Home yerine gönderir | Dokümante edilmeli |
| **Static permission cache** | `can-see-nav-item.ts` statik `PERMISSIONS` referans alıyor | Admin panelinden yetki değişimi anında yansımaz |
| **ModuleGuard vs allowedRoles çakışması** | İki farklı yetki katmanı, bazı sayfada her ikisi de var, bazısında yalnız biri | Sessiz erişim açıkları |

---

## 4) Backend endpoint haritası

`server/routes/` ~100+ dosya, ~600+ endpoint. `server/index.ts` route mount sırası kritik (ilk gelen kazanır, kiosk ve auth public path'leri başta).

### Güvenlik katmanları

| Katman | Tanım | Dosya |
|---|---|---|
| **Auth** | `isAuthenticated` — session bazlı, Passport.js | `server/localAuth.ts` |
| **Manifest RBAC** (yeni) | `requireManifestAccess(module, action)` — DB+manifest tabanlı | `server/services/manifest-auth.ts` |
| **Branch scope** | `resolveBranchScope(req)` — own_branch / managed_branches / all_branches | `server/services/scope.ts` (veya benzeri) |
| **Kiosk auth** | `isKioskAuthenticated` — PIN+device, `kiosk_sessions` | `server/routes/kiosk-*.ts` |

### Modül bazlı endpoint envanteri

| Modül | ~Endpoint sayısı | Auth | Role/Manifest | Risk |
|---|---:|---|---|---|
| **HR / İK** | ~150 | YES | Kısmi manifest | **INLINE_ROLE** çoğunlukta |
| **Fabrika** | ~80 | YES | Manifest OK (`fabrika:*`) | Kiosk PIN-korumalı |
| **Branches** | ~40 | YES | Manifest OK | `/api/branches/:id` public data riski araştırılmalı |
| **PDKS** | ~30 | YES | **INLINE_ROLE** | Manifest hiç yok, manuel kontrol |
| **Academy v1-v3** | ~60 | YES | Kısmi manifest | V3'te geçiş başlamış |
| **Inventory / MRP** | ~50 | YES | Manifest OK | Yeni nesil yapı |
| **Recipes / Allergens / Nutrition** | ~80 | YES | Kısmi manifest | `factory-recipes.ts` 2311 satır, audit ediliyor |
| **CRM / Feedback / Support** | ~40 | YES | Kısmi | `/api/feedback/qr/*` public mi? Kontrol gerek |
| **AI / Copilot / Agent** | ~20 | YES | Auth-only | `sensitiveApiLimiter` var, rol guard zayıf |
| **Dashboard / Widgets** | ~15 | YES | Manifest OK | `/api/me/dashboard-data` rol bazlı widget |
| **Audit** | ~20 | YES | `requireManifestAccess('audit', 'view')` | OK |
| **Admin** | ~30 | YES | `AdminOnly` middleware | Tek yetkili |
| **Public (auth muaf)** | ~10 | NO | — | Login, register, kiosk login, /api/health |

### Kritik P0 risk listesi (backend)

#### A. INLINE_ROLE (manifest yerine manuel role check)
- `server/routes/pdks.ts:109` — `GET /api/pdks/records` — `if (['mudur', ...].includes(user.role) ...)`
- `server/routes/pdks.ts:186` — `GET /api/pdks/daily-summary` — manuel şube kontrolü
- `server/routes/hr.ts:4909` — `POST /api/salary/payroll/calculate` — sadece `isAuthenticated`, role guard yok
- `server/routes/hr.ts` — ~100+ endpoint manuel role check veya yalnız auth (dosya 7000+ satır, modülerleştirme şart)

#### B. NO_BRANCH_SCOPE (branchId param alıyor, kullanıcının yetkisini kontrol etmiyor)
- `server/routes/inventory-import-routes.ts` — branchId alıyor, manifest/scope zayıf
- `server/routes/dashboard-data-routes.ts` — bazı istatistik endpointleri branchId query'sini doğrudan filtre olarak kullanıyor

#### C. PUBLIC endpoint riskleri
- `POST /api/auth/register` — onay var ama spam riski
- `POST /api/factory/kiosk/login` — session gerektirmez, PIN+device
- `GET /api/health` — sistem metriklerini sızdırabilir, sınırlı bilgi vermesi denetlenmeli

#### D. Kiosk insan listesinde sızıntı
- ✅ **KAPATILDI** — commit `f6bb4110b`. `getAllEmployees()` + 4 ek endpoint `notInArray(role, ['sube_kiosk', 'fabrika_kiosk'])` filtresi.
- Yine de: `getAllUsersWithFilters()` admin teknik cihaz yönetimi için kiosk filtresi UYGULAMAZ — bu **bilerek**.

#### E. Permission cache invalidation
- Admin panelinden rol/permission değişince `permission-service.ts` cache invalidate ediyor mu? Frontend `can-see-nav-item.ts` statik referans alıyor → mismatch riski.

---

## 5) DB tablo aileleri

`shared/schema/schema-01.ts ... schema-23-mrp-light.ts` — 16 modüler dosya, **455 tablo** toplam (Task #255 sonrası DB ile uyumlu).

| Grup | Tema | Tablo sayısı | Ana tablolar | Şema dosyası | Soft delete | Audit | Branch scope |
|---|---|---:|---|---|:---:|:---:|:---:|
| **A** | users / roles / permissions / module_flags | ~15 | `users`, `roles`, `permissions`, `module_flags`, `sessions`, `role_module_permissions`, `role_permission_grants` | 01, 02, 04, 05, 12, 13 | ✓ | Kısmi | ✓ |
| **B** | branches / kiosk | ~10 | `branches`, `branch_kiosk_settings`, `kiosk_sessions` | 02, 09, 13 | ✓ | ✗ | ✓ |
| **C** | PDKS / attendance / shifts | ~35 | `pdks_records`, `pdks_excel_records`, `shifts`, `shift_templates`, `pdks_daily_summary` | 03, 04, 12 | ✓ | ✓ | ✓ |
| **D** | HR / payroll / employee | ~45 | `personnel_files`, `monthly_payroll`, `employee_documents`, `disciplinary_actions`, `leave_requests` | 04, 05, 07, 12 | ✓ | ✓ | ✓ |
| **E** | tasks / checklists / announcements | ~40 | `tasks`, `checklists`, `announcements`, `reminders`, `task_evidence`, `recurring_tasks` | 02, 03, 11, 13 | ✓ | ✓ | ✓ |
| **F** | equipment / faults / maintenance | ~25 | `equipment`, `equipment_faults`, `maintenance_logs`, `equipment_qr_labels` | 02, 03, 04, 05, 11 | ✓ | ✗ | ✓ |
| **G** | factory_recipes / nutrition / allergens | ~30 | `factory_recipes`, `factory_recipe_versions`, `factory_recipe_ingredients`, `factory_ingredient_nutrition`, `factory_ingredient_nutrition_history`, `factory_keyblends`, `factory_recipe_label_print_logs` | 06, 10, 22 | ✓ | Kısmi | ✗ |
| **H** | inventory / stock / suppliers / lots | ~45 | `inventory`, `inventory_movements`, `inventory_price_history`, `suppliers`, `product_suppliers`, `purchase_orders`, `material_pick_logs`, `inventory_counts` | 09, 10, 11, 23 | ✓ | Kısmi | ✓ |
| **I** | production / quality / shipments | ~40 | `production_lots`, `production_records`, `factory_production_batches`, `quality_audits`, `sevkiyat`, `kavurma` | 04, 08, 10, 18, 23 | ✗ | Kısmi | ✓ |
| **J** | CRM / feedback / tickets | ~35 | `customer_feedback`, `guest_complaints`, `hq_support_tickets`, `qr_feedback`, `branch_feedbacks` | 03, 04, 05, 06, 12 | ✗ | ✓ | ✓ |
| **K** | audit logs / change requests | ~20 | `audit_logs`, `audits_v2`, `data_change_requests`, `data_locks` | 05, 12, 20 | ✗ | ✓ | ✓ |
| **L** | dashboard / widgets / kpi | ~15 | `dashboard_widgets`, `dashboard_role_widgets`, `kpi_snapshots`, `monthly_branch_snapshots`, `monthly_factory_snapshots` | 10, 11, 17 | ✗ | ✗ | Kısmi |
| **M** | academy / quizzes / certificates | ~50 | `training_modules`, `quizzes`, `badges`, `learning_paths`, `certificates`, `quiz_attempts` | 03, 05, 06, 10, 11 | ✓ | ✓ | ✗ |
| **N** | AI agent / dobody | ~15 | `dobody_proposals`, `dobody_events`, `dobody_action_templates`, `dobody_skill_runs` | 12, 15, 21 | ✗ | ✓ | Kısmi |
| **O** | notifications / email logs | ~10 | `notifications`, `notification_preferences`, `notification_digest_queue`, `email_logs` | 03, 07, 15 | ✗ | ✗ | Kısmi |
| **P** | financial / billing | ~10 | `branch_financial_summary`, `financial_records`, `invoices` | 11, 16 | ✗ | ✓ | ✓ |

### Drift / boşluklar

- **Task #255 (commit `c0adef4d8`):** 13 eksik tablo + 4 UNIQUE + 83 index + 47 FK eklendi. Drizzle baseline çıkarıldı.
- **Halen drift:** 42 kolon tipi/nullability mismatch (örn: `tasks.target_branch_ids` schema'da `text`, DB'de `text[]`). Veri güvenliği gerekçesiyle Task #255'te kapsam dışı bırakıldı.
- **Orphan veriler:** `customer_feedback.staff_id` gibi alanlarda `users` tablosunda karşılığı olmayan eski veriler var. FK'lar `NOT VALID` olarak eklendi.
- **Soft delete eksiği:** Grup I, J, K, L, N, O — `deleted_at` kolonu yok. Bu gruplar için soft-delete kararı verilmeli (loglar zaten silinmemeli, dashboard widget'ları silinebilir).
- **Audit eksiği:** Grup B, F, L, O — `created_by`/`updated_by` zayıf veya yok. Equipment ve notifications için audit lazım olabilir.

---

## 6) Mevcut açık hatalar ve kapatılan hotfixler

### Kapatılan (commit hash ile)

| Commit | Tarih | Konu | Etki |
|---|---|---|---|
| `4ec4a5901` | 26 Nis | **canli-takip JSX text leak + vardiya-planlama shifts.filter array safety** | İki sayfa düzeldi |
| `caab89d15` | 26 Nis | **fabrika-recete-duzenle:** malzeme düzenle modaline hammadde değiştirme eklendi | Reçete malzeme swap çalışıyor |
| `2216bfb48` | 25 Nis | fabrika-recete-duzenle: duplicate `historyLoading` identifier (Task #253) | Build hatası giderildi |
| `6756f0024` | 26 Nis | **onboarding fix:** SPA routing, role gating, liste view error/loading state | App.tsx Redirect, programlar guard |
| `f6bb4110b` | 26 Nis | **kiosk hesapları insan personel listelerinden hariç** | 5 dosya, `notInArray` filtresi; 158 kullanıcı → 140 insan + 18 kiosk |
| `da297aaf0` | 25 Nis | **Task #254:** `/api/export/*` uçları `isAuthenticated` + rol middleware ile korundu | Yetkisiz export kapandı |
| `c0adef4d8` | 25 Nis | **Task #255:** DB drift kapanışı + drizzle-kit baseline | 13 tablo + 4 UNIQUE + 83 index + 47 FK |
| `89c8136ae` | 25 Nis | **Task #259:** Rol raporundaki sayılar DB'den canlı, aylık otomatik tazelenir | Rapor güncel |
| `61c875451` | 24 Nis | CGO rolüne quality permissions eklendi | CGO denetim erişimi |
| `cbaf25f93` | 24 Nis | **Task #252:** Kapsamlı Türkçe teknik denetim raporu | `DOSPRESSO_FULL_AUDIT_2026-04-26.md` |

### Açık kalanlar (henüz çözülmedi)

| # | Konu | Belirti | Önerilen task |
|---|---|---|---|
| O1 | **PDKS endpoint'lerinde INLINE_ROLE** | `pdks.ts:109, 186` — manifest yok, manuel `if (user.role === ...)` | Task: PDKS manifest migration |
| O2 | **HR endpoint'lerinde role guard eksiği** | `hr.ts:4909` `POST /api/salary/payroll/calculate` — yalnız `isAuthenticated` | Task: HR salary route'larını manifest'e taşı |
| O3 | **Static permission cache mismatch** | `can-see-nav-item.ts` statik `PERMISSIONS`'a bakıyor; admin panelinden değişince yansımıyor | Task: dynamic permission hook her yere |
| O4 | **Müdür/yatırımcı şube scope doğrulaması** | `mudur` ve `yatirimci_branch` kendi şubesini görmesi gerek; `dashboard-data-routes.ts`'de branchId query parametresi user'ın yetkisini kontrol etmeden filtreleniyor | Task: branch scope guard zorunlu |
| O5 | **Supervisor delete yetkisi** | Tabloda "Yok" deniyor; `delegation-routes.ts` üzerinden `module_delegations` ile geçici delete devredilmiş olabilir mi? Audit gerek | Task: delegation audit |
| O6 | **Supervisor_buddy delegasyon kapsamı** | `roleVisibility: supervisor` statik kontrolleri delegasyonu bypass edebilir | Task: delegation-aware static checks |
| O7 | **İK raporları hata ekranı** | `personel-istatistikleri` yüklenirken bazı şubelerde 500 dönebiliyor (kullanıcı bildirimi) | Task: İK rapor null-safety |
| O8 | **Alerjen 403** | Kullanıcı `gida_muhendisi` ile bazı alerjen endpoint'lerinde 403 alıyor (kullanıcı bildirimi) | Task: factory-allergens.ts manifest reconcile |
| O9 | **Fabrika gıda mühendisliği eksik altyapı** | Tartım kontrol (TF-02), proses kontrol (UR-FH-FR-01), ÜSF-01, etiket onay statü makinesi, internal_code/lot ayrımı | Task'lar: T-A...T-F (`gida-muh-system-analysis-2026-04-27.md`'de detayı) |
| O10 | **Broken sidebar link** | `EXACT_ROUTE_MAP` içinde `/stok-transferleri`, `/canli-izleme` var, route yok | Task: sidebar→route reconciliation |
| O11 | **42 kolon tipi/nullability drift** | Task #255 kapsam dışı bıraktı | Task: drift-cleanup-phase-2 |
| O12 | **Recipes/Academy grupları branch scope eksik** | `factory_recipes` ve academy tabloları branch_id taşımıyor — globalde paylaşılan içerik mi yoksa per-şube override mı? | Karar: ürün/içerik scope mimarisi |

---

## 7) Gıda mühendisi ve etiketleme yol planı

> **Detaylı analiz:** `docs/audit/gida-muh-system-analysis-2026-04-27.md` (önceki commit `7064dc027`).

### İş kuralı özeti
- Besin değeri kaynak önceliği: **tedarikçi spec → gıda mühendisi manuel → TürKomp → muaf (EK-14)**.
- Bazı hammaddeler (aroma vericiler, katkı maddeleri, işlem yardımcıları, gıda enzimleri, maya, sakızlar, jelatin) EK-14 kapsamında besin bildirimi gerektirmez → `nutrition_required=false`.
- Alerjen + besin değeri + içerik + fonksiyonel sınıf → **otomatik etiket taslağı**.
- Reçete versiyonu değişirse → tüm ilgili etiketler otomatik `revize_gerekli`.
- Katkı maddesi fonksiyonel sınıfı **hammadde bazında değil, reçete-hammadde-kullanım bazında**. Örnek: E300 donutta un işlem maddesi, şurupta antioksidan.

### Eksik tablo/kolon (uygulama yapma, sadece plan)

**P0:**
1. `inventory` ALTER → `internal_code` (UNIQUE), `nutrition_required`, `nutrition_source` enum (`supplier_spec / food_engineer_manual / turkomp / exempt`), `food_engineer_approved_*`.
2. `raw_material_supplier_codes` (yeni) → tek hammadde, çoklu tedarikçi kodu.
3. `raw_material_lots` (yeni) → `lot_code`, `expiry_date`, `current_qty`, `received_at`, `location`.
4. `factory_recipe_ingredient_usage` (yeni) → `usage_purpose`, `functional_class` (TGK GKM EK-I), `e_number`, `legal_reference`, `approved_by`.
5. `label_drafts` + `label_draft_revisions` → `status` enum (`taslak / gida_muh_onayinda / onayli / revize_gerekli`), `pdf_url`, `legal_warnings_json`.

### Eksik UI

- **YENİ:** `/kalite/etiket-onay` — reçete versiyonu → otomatik etiket taslağı → GM onay statü makinesi.
- **Genişlet:** `/kalite/besin-onay` — kaynak rozeti (Tedarikçi/GM/TürKomp/Muaf), EK-14 muafiyet butonu.
- **Genişlet:** `/fabrika-recete-duzenle` — recipe-ingredient-usage seviyesinde fonksiyonel sınıf dropdown (TGK GKM EK-I).
- **Genişlet:** `/kalite-alerjen` — hammadde→reçete alerjen yayılma + reçete versiyonu uyarısı.

---

## 8) Hammadde kodlama / lot / FEFO / ara depo planı

### Önerilen kod modeli (uygulama yapma, sadece plan)

| Alan | Kaynak | Mahiyet | Tablo |
|---|---|---|---|
| `internal_code` | DOSPRESSO sistem | **Immutable**, UNIQUE, master | `inventory.internal_code` (yeni kolon) |
| `supplier_product_code` | Tedarikçi | Çoklu (aynı hammadde, farklı tedarikçide farklı kod) | `raw_material_supplier_codes` (yeni tablo) |
| `supplier_invoice_no` | Mal kabul | Tek bir alış işlemi | `goods_receipt` ya da `raw_material_lots.supplier_invoice_no` |
| `lot_code` | Tedarikçi | Tek lot, parti bazlı | `raw_material_lots.lot_code` (yeni tablo) |
| `expiry_date` | Tedarikçi | SKT | `raw_material_lots.expiry_date` |
| `received_at` | Mal kabul | Geliş tarihi | `raw_material_lots.received_at` |
| `production_pick_code` | Sistem | Üretime çekme belgesi (ÜSF-01) | `production_issue_documents.code` (yeni) |

### FEFO / FIFO uygulama mantığı

1. Bir hammadde için stok çekme istendiğinde: `raw_material_lots` üzerinden **`expiry_date ASC, received_at ASC`** sıralı liste.
2. SKT olmayan hammaddelerde: yalnız `received_at ASC` (FIFO).
3. Manuel override yalnız `gida_muhendisi` veya `kalite_kontrol` rolü ile + nedeni yazılı (`override_reason`).
4. Override audit'e düşmek zorunda → `audit_logs` veya `material_pick_logs.override_metadata` JSONB.
5. Üretime çekilen hammadde her **lot ID** ile `production_issue_items` üzerinden tüketilir → **lot izlenebilirliği** zincirleme.

### Ara depo etiketi / QR

- Ara depodaki ürüne fiziksel etiket: ürün adı, açılış tarihi, miktar, lot referansı, QR.
- QR → `intermediate_storage_labels.id` → tek tıkla mobil arayüzden uygunsuzluk işaretleme veya imha bildirimi.
- Açılış tarihi + ürün shelf life'ından **ara depo ömrü** hesaplanır → SKT'den ÖNCE iç süresi geçen ürün için uyarı.

---

## 9) Üretim formları entegrasyonu

> Detaylı yapı: `docs/audit/gida-muh-system-analysis-2026-04-27.md` bölüm 2 + 3.

| Form | Sistem'de yeri | Önerilen tablo | Önerilen UI route | Önerilen route prefix |
|---|---|---|---|---|
| **Üretime Sevk + Ara Depo (ÜSF-01)** | Lot izleme zincirine eklenir | `production_issue_documents` + `_items` + `intermediate_storage_labels` | `/fabrika/uretime-sevk` | `/api/factory/issue-documents/*` |
| **Hafif Fırıncılık Proses Kontrol (UR-FH-FR-01)** | Üretim batch'a bağlı kontrol kartı | `process_control_cards` + `_items` + `_periodic_checks` | `/fabrika/proses-kontrol` | `/api/factory/process-control/*` |
| **Tartım Kontrol (TF-02)** | Üretim batch içinde tartım kayıt | `weighing_control_records` | `/fabrika/tartim-kontrol` | `/api/factory/weighing/*` |
| **Uygunsuzluk / İmha** | Ara depo + lot izleme'ye bağlı | `nonconformity_disposals` | Modal: `/fabrika/lot-izleme` içinden | `/api/factory/disposals/*` |

### Bağlantı zinciri (drill-down)

```
ÜSF-01 (üretime sevk)
   ↓ (lot_id, qty_out)
production_lots ←→ production_issue_items
   ↓
TF-02 (tartım kontrol) ←→ raw_weight, fried_weight, filled_weight, ...
   ↓
UR-FH-FR-01 (proses kontrol) ←→ ekipman, sıcaklık, alerjen kontrolü
   ↓
factory_production_batches (üretim çıktı)
   ↓ (eğer uygunsuz)
nonconformity_disposals
```

### UI gereksinimi

- Her formun ayrı sayfası + lot izleme ekranından **drill-down**: lot kartı tıklandığında o lot'a bağlı ÜSF + tartım + proses kontrol kartı + uygunsuzluk kayıtları görünür.
- GM onay (TF-02), kalite onay (UR-FH-FR-01) → `audit_logs`'a yazılır.

---

## 10) P0 / P1 / P2 yol planı

### P0 (1-3 hafta — güvenlik / scope / pilot kıran)

| Sıra | Başlık | İlgili açık | Tahmin |
|---|---|---|---|
| 1 | **PDKS endpoint'lerinde INLINE_ROLE → manifest** | O1 | 3-4 gün |
| 2 | **HR salary route'larını manifest'e taşı** | O2 | 4-5 gün |
| 3 | **Branch scope guard zorunlu (mudur/yatirimci_branch için)** | O4 | 3-4 gün |
| 4 | **İK raporları null-safety** | O7 | 1-2 gün |
| 5 | **Alerjen 403 reconcile (factory-allergens manifest)** | O8 | 1-2 gün |
| 6 | **Hammadde Master Reform (internal_code + supplier_codes + lots)** — T-A | O9 | 5-7 gün |
| 7 | **Personel Özlük Multi-Sheet Import (ÇİZERGE/OFİS/İMALATHANE/IŞIKLAR)** — T-G | bağımsız | 4-5 gün |
| 8 | **Besin Değeri Kaynak Önceliği + EK-14 Muafiyet** — T-H | O9 | 3-4 gün |

### P1 (3-6 hafta — üretim/gıda mühendisliği temel)

| Sıra | Başlık | İlgili açık | Tahmin |
|---|---|---|---|
| 9 | **Recipe-Ingredient Usage + TGK GKM EK-I** — T-B | O9 | 3-4 gün |
| 10 | **Etiket Onay Statü Makinesi** — T-C | O9 | 4-5 gün |
| 11 | **Üretime Sevk + Ara Depo (ÜSF-01)** — T-D | O9 | 5-6 gün |
| 12 | **Tartım Kontrol (TF-02)** — T-E | O9 | 2-3 gün |
| 13 | **Hafif Fırıncılık Proses Kontrol (UR-FH-FR-01)** — T-F | O9 | 5-6 gün |
| 14 | **Static permission cache → dinamik hook** | O3 | 3-4 gün |
| 15 | **Sidebar→route reconciliation (broken link)** | O10 | 1-2 gün |
| 16 | **HR.ts modülerleştir (7000 satır → split)** | mimari | 5-7 gün |

### P2 (6+ hafta — otomasyon / gelişmiş)

| Sıra | Başlık | İlgili açık | Tahmin |
|---|---|---|---|
| 17 | **TürKomp Entegrasyonu** — T-I | O9 | 5-7 gün |
| 18 | **Uygunsuzluk / İmha Kayıt** — T-J | O9 | 3-4 gün |
| 19 | **Drift cleanup phase 2 (42 kolon mismatch)** | O11 | 4-5 gün |
| 20 | **Recipes/Academy branch scope karar + uygulama** | O12 | 5-7 gün |
| 21 | **Delegation-aware static permission checks** | O5, O6 | 3-4 gün |
| 22 | **AI/Copilot endpoint'lerine rol guard eklenmesi** | mimari | 2-3 gün |
| 23 | **Recipes/Academy soft-delete + audit ekleme** | mimari | 4-5 gün |
| 24 | **Komuta Merkezi 2.0 widget genişletmesi** (sub-pilot, sef, recete_gm dashboard'ları) | iyileştirme | 5-7 gün |

---

## 11) Son doğrulama

### Değişen dosya listesi
```
docs/audit/dospresso-system-map-and-roadmap-2026-04-27.md   (YENİ — bu rapor)
```

### git diff --stat
```
Modified files:    0
Untracked files:   1
  └─ docs/audit/dospresso-system-map-and-roadmap-2026-04-27.md
```

### Kod dosyası değişti mi?
**HAYIR.** Hiçbir `.ts`, `.tsx`, `.js`, `.json` dosyasına dokunulmadı.

### DB / migration / env / package değişti mi?
**HAYIR.** DB write yapılmadı. `migrations/` dizinine dokunulmadı. `.replit`, `.env`, `package.json`, `package-lock.json` değişmedi. Migration veya seed çalıştırılmadı. `npm install` yapılmadı.

### Sonraki önerilen ilk 3 task

1. **Task: PDKS Manifest Migration** (P0 #1 — `O1`)
   - `server/routes/pdks.ts` içindeki tüm `if (user.role === ...)` manuel kontrolleri `requireManifestAccess('pdks', action)` middleware'ine taşı.
   - Etkilenen endpoint: `/api/pdks/records`, `/api/pdks/daily-summary`, `/api/pdks/branch-attendance` ve diğer ~28 endpoint.
   - Acceptance: Tüm PDKS endpoint'leri manifest guard'ından geçer; pdks audit log'unda yetki ihlali kaydı net.

2. **Task: Hammadde Master Reform — T-A** (P0 #6 — `O9`)
   - `inventory` ALTER (internal_code, nutrition_required, nutrition_source, food_engineer_approved_*) + yeni `raw_material_supplier_codes` + `raw_material_lots`.
   - Frontend: `fabrika-stok-merkezi`, `depo-centrum` UI güncelle (3 ayrı kolon: internal/supplier/lot).
   - Backend: FEFO/FIFO çekme servisi.
   - Migration: M-01 + M-02 + M-03.
   - Acceptance: Yeni hammadde kabulünde 3 kod ayrı işaretlenir; çekme servisi FEFO sıralı önerir; manuel override audit'e düşer.

3. **Task: Personel Özlük Multi-Sheet Import — T-G** (P0 #7)
   - Mevcut `hr-import-export.ts` (1514 satır, 10 endpoint) üzerine **çok-sheet wrapper**: ÇİZERGE (dikey, 28 sütun), OFİS/İMALATHANE/IŞIKLAR (yatay, kişi-başına 3 sütun) sayfa-bazlı parser.
   - Sheet→branch eşleme UI'ı (`/ik/ozluk-import`).
   - Kiosk hesapları HARİÇ (zaten `f6bb4110b`'de filtre var).
   - Acceptance: Excel yükle → preview → fark → admin/muhasebe_ik onay → DB write → audit log; tüm 4 sayfa parse olur.

---

*Üreten: Replit Agent — read-only kapsamlı sistem analizi, 27 Nisan 2026*
*Hash referansları:*
- *Önceki commit (gida-muh sub-rapor): `7064dc027`*
- *Önceki commit (kiosk filter hotfix): `f6bb4110b`*
- *Önceki commit (onboarding hotfix): `6756f0024`*
- *Önceki commit (canli-takip + vardiya hotfix): `4ec4a5901`*
- *Önceki commit (recete malzeme swap): `caab89d15`*
