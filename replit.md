# DOSPRESSO Franchise Management Platform

## Overview
DOSPRESSO is a comprehensive franchise management platform for a coffee/food franchise network. It centralizes and streamlines operations across HR, factory management, training, finance, CRM, quality control, and equipment management for 22 locations (20 branches, 1 HQ, 1 Factory). The platform supports 270 users with 29 distinct roles, managing extensive data for efficient oversight of a multi-location franchise business.

## User Preferences
- Preferred communication: Simple, everyday language, Turkish preferred
- Fast implementation in Build mode, continues with "devam"
- DB schema changes via raw psql (drizzle-kit push times out)

## System Architecture

### UI/UX Decisions
The platform uses React 18, TypeScript, and Vite for the frontend, with Shadcn/ui, Tailwind CSS, CVA, and Lucide icons for a modern UI. It features a modular layout (`ModuleLayout`, `ModuleSidebar`, `KPIStrip`) for structured pages and 6 role-based Mission Control dashboards using `DashboardKpiStrip`. The design prioritizes mobile compactness, touch-friendly UIs, and role-based quick actions. A server-driven collapsible sidebar dynamically builds menus based on user roles and module flags.

### Technical Implementations
- **Authentication:** Session-based authentication via Passport.js supports web (username/password with bcrypt) and kiosk (PIN-based with bcrypt) logins. Security features include password stripping, account lockout, and account status management.
- **Role System:** A robust role-based access control (RBAC) system defines 29 roles across HQ, branches, and factory. Permissions are managed via a static map (`PERMISSIONS`) and module feature flags (`module_flags`) provide granular control over module visibility.
- **Database Schema:** An extensive data model is organized across 16 modular schema files, covering users, roles, branches, HR, academy, factory operations, CRM, notifications, PDKS Excel import, and financial data.
- **PDKS Excel Import:** A 5-table system handles the import of attendance data from external Excel files.
- **Key Architectural Patterns:**
    - **Soft Deletion:** Implemented with a `deleted_at` column across all business tables.
    - **Data Locking:** Utilizes time and status-based data locking with a change request workflow.
    - **Query Pattern:** Standardized TanStack Query usage with `queryKey: ['/api/endpoint']`.
    - **Mutations:** `apiRequest` from `@lib/queryClient` is used for mutations, always followed by cache invalidation.

### Feature Specifications
- **Task System:** Comprehensive task management including assignment (single and multi-user), comments, evidence, status tracking, recurring tasks, bulk creation, verification, and rating. Integrates with CRM.
- **Production Planning:** Manages weekly production plans, items, daily records, and responsibilities with an approval hierarchy.
- **CRM:** A unified platform merging communication, traditional CRM, and guest feedback, including QR feedback support and task integration.
- **Academy:** A multi-version learning management system supporting modules, quizzes, AI assistance, learning paths, certificates, badges, and analytics.
- **Factory:** Features kiosk operations, shift management, quality control, lot tracking, station benchmarks, production batches, and worker scoring.
- **HR:** Manages the full employee lifecycle, including documents, disciplinary actions, onboarding, attendance, leaves, payroll calculation, and salary management.
- **Mr. Dobody (AI Agent):** A proactive AI agent for gap detection, task assignment, and workflow completion across various operational categories.
- **Notification System:** A four-level notification system (operational, tactical, strategic, personal) with role-based filtering, category-based frequency control, archiving, and push notifications.
- **Mission Control Dashboards:** Six role-based dashboards provide critical KPIs and insights through monthly snapshots of branch and factory performance.
- **Komuta Merkezi 2.0 (Dynamic Dashboard System):** A widget-based dashboard infrastructure with 19 registered widgets across 7 categories. It uses `dashboard_widgets` for registry and `dashboard_role_widgets` for per-role assignments (13 roles configured). A unified endpoint `GET /api/me/dashboard-data` delivers role-tailored widgets with real data, KPIs, and quick actions. Admin CRUD operations are available via specific API endpoints.

### Pilot Launch & Branch Onboarding
- **Pilot Launch Page** (`/pilot-baslat`): An admin-only page for resetting system data before pilot go-live. It supports selective cleanup of notifications, audit logs, performance scores/metrics, and checklist histories. Includes password reset with mustChangePassword enforcement and double confirmation.
- **Branch Onboarding Wizard**: Automatically shown to branch managers/supervisors for new branches with `setupComplete=false`. It's a three-step wizard: personnel upload, gap analysis, and setup completion.
- **Module Activation Checklist**: A reusable component detailing required setup items for newly activated modules (e.g., procurement, HR, quality, factory).
- **Pre-Pilot Migration**: Server startup clears all `mustChangePassword=true` flags during the pre-pilot phase to disable forced password changes.
- **Schema**: `branches.setup_complete` boolean column tracks branch onboarding status.
- **API Endpoints**: Specific API endpoints are provided for pilot launch, branch setup status, branch setup completion, module activation checklists, and onboarding status.

## External Dependencies
- **OpenAI API**: Used for AI vision, chat, embeddings, and summarization.
- **AWS S3 / Replit Object Storage**: Cloud-based file storage.
- **Neon Database**: Serverless PostgreSQL database services.
- **IONOS SMTP**: Email notifications.

## Pilot Scope Karar — Hibrit C (25 Apr 2026)

**Karar:** Pilot 5 May'da yalnız 4 şube canlı (Işıklar #5, Antalya Lara #8, HQ #23, Fabrika #24). 16 pilot-dışı aktif şube `setup_complete=false` durumuna alındı (Mallof, Markantalya, Beachpark, İbrahimli, İbnisina, Üniversite, Meram, Bosna, Marina, Atakum, Batman, Düzce, Siirt, Kilis, Şanlıurfa, Nizip).

**Gerekçe:** Son 30 gün aktivite — Pilot 2 şube: 363 PDKS + 36 feedback + 30 görev + 289 vardiya. Pilot-dışı 16 şube: 0 PDKS + 0 feedback + 4 görev + 0 vardiya (atıl/seed). 16 şube açıkken Yavuz dashboard'unda sahte rakam oluşuyordu.

**Davranış:** `setup_complete=false` şubelerin müdür/supervisor login'inde Onboarding Wizard tetiklenir (3 adım: personel Excel + gap analiz + setup tamamla). Tamamlanınca şube canlıya geçer. Veriler korunmuş, kademeli açılış kapısı açık. Geri dönüş tek SQL: `UPDATE branches SET setup_complete=true WHERE id IN (...)`.

**Personel düzeltmeleri (aynı seans):**
- Ece (`ece`) trainer→coach (Yavuz ile aynı rol)
- Eren (`eren`) branch_id=null→24 (Fabrika)
- Ümran (`umran`) is_active=false + deleted_at (kalite kontrol görev Utku'ya devir)
- CGO (`utku`) rolüne kalite yetkileri eklendi: complaints CRUD, quality_audit CRUD+approve

**Pilot ekip:** Aslan (CEO), Ali (CEO/ortak), Utku (CGO+Kalite), Yavuz/Ece (Coach), Mahmut (muhasebe_ik), Samet (satinalma), Sema (gida_muhendisi+recete_gm 2 hesap), Diana (marketing+grafik), Ayşe (destek), Murat (teknik), Mehmet (yatirimci_hq). Fabrika: Eren (fabrika_mudur), Sema/RGM, Ümit (sef + uretim_sefi 2 hesap, doğrulama bekliyor).

**Skill referans:** `.agents/skills/dospresso-roles-and-people/SKILL.md` (147 satır — HQ ekibi, Fabrika ekibi, pilot şubeler, yetki matrisi, bilinen sorunlar, güncelleme talimatı).

## Sprint R-5 Status — TAMAM (25 Apr 2026)
- **Final commit:** `62b68e0f5` — "docs(pilot): Devir teslim 24 Nisan sabah - Sprint R-5 100% TAM"
- **8/8 alt sprint COMPLETE:** R-5A backend + R-5A frontend + R-5B backend + R-5B frontend + R-5C backend + R-5C frontend + R-5D backend + R-5D frontend
- **R-5A bug fix (this session, c96f3f4d1):** PATCH `/api/factory/recipes/:id/ingredients/:ingId` `editLocked` check eksikti (line 953), 5 CRUD endpoint'inden 1 tanesi lock bypass yapıyordu. Fix sonrası: sef→403, recete_gm→403, admin→200 (bypass) ✅
- **R-5B Frontend doğrulama:** Maliyet kartı 5'li grid (Hammadde/İşçilik/Enerji/Batch/Birim), recalc butonu, coverage <100 turuncu uyarı + missing accordion. Backend shape match. Recipe 16 coverage %22 (2/9), unit_cost 8.05 TL.
- **R-5C Frontend doğrulama:** Alerjen kartı + ingredient inline rozetleri. Recipe 16 (Cheesecake Frambuaz): isVerified=true (9/9 matched), 3 alerjen (gluten/sut/yumurta).

## Schema-DB Drift'ler — TÜMü FIX EDİLDİ (25 Apr 2026 forensic audit)
Forensic audit (tüm tablo+kolon karşılaştırma + canlı endpoint testi) → 5 P0 endpoint canlı 500 dönüyordu, hepsi düzeltildi.

**Drift #1 — FIX (önceki seans):** `factory_ingredient_nutrition.updated_at` kolonu eklendi.

**Drift #2 — FIX (bu seans):** `factory_ingredient_nutrition` tablosuna `trans_fat_g NUMERIC(8,2)` ve `sodium_mg NUMERIC(8,2)` kolonları eklendi. Etkilediği endpoint: `GET /api/factory/ingredient-nutrition/approved`, `pending`, `GET /api/factory/nutrition/ingredients` (sessiz hata yutuyordu).

**Drift #3 — FIX (bu seans):** 5 eksik tablo CREATE edildi (Drizzle schema'dan birebir türetildi):
- `factory_ingredient_nutrition_history` (history endpoint) — schema line 475
- `factory_recipe_approvals` (recipe approval audit) — schema line 568
- `factory_recipe_label_print_logs` (etiket basım logu) — schema line 618
- `factory_recipe_step_snapshots` (adım geri al) — schema line 299
- `factory_recipe_ingredient_snapshots` (malzeme geri al, BONUS bulgu) — schema line 234

Tüm SQL idempotent (`IF NOT EXISTS`), additive (ADD COLUMN/CREATE TABLE only), tek `BEGIN..COMMIT` transaction. Mevcut data etkilenmedi.

**P2 Follow-up — FIX (bu seans):** R-5A bug fix'i sadece PATCH ingredient'ı kapatmıştı. Forensic audit 5 ek endpoint'te aynı `editLocked` check eksikliğini buldu. Hepsine R-5A pattern (lines 956-960) birebir kopyalandı:
- `POST /api/factory/recipes/:id/ingredients` (line 1058)
- `POST /api/factory/recipes/:id/ingredients/bulk` (line 1199)
- `POST /api/factory/recipes/:id/ingredients/snapshots/:snapshotId/restore` (line 1492)
- `POST /api/factory/recipes/:id/steps/bulk` (line 1576)
- `POST /api/factory/recipes/:id/steps/snapshots/:snapshotId/restore` (line 1664)

Canlı doğrulama: kilitli Recipe 16 + sef rolü → 5/5 endpoint 403 ("Reçete kilitli - sadece admin düzenleyebilir"). Admin → 200 (bypass çalışıyor).

## Schema Drift Sweep #234 — P0 TAMAM (25 Apr 2026)
Forensic audit ikinci dalga: `scripts/db-drift-check.ts` ile tüm DB sağlık taraması yapıldı (kolon + tip + nullability + UNIQUE + FK + index).

**Pilot kritik P0 (uygulandı):**
- **11 eksik kolon eklendi** — additive, idempotent, mevcut data etkilenmedi:
  - `audit_personnel_feedback.responded_at` (timestamp)
  - `employee_onboarding_progress.mentor_id/started_at/updated_at` (3 kolon, updated_at trigger ile)
  - `employee_terminations.notes` (text)
  - `quiz_questions.deleted_at` (soft delete pattern)
  - `onboarding_template_steps.end_day/mentor_role_type/training_module_id/required_completion/updated_at` (5 kolon, 0 satır olduğu için NOT NULL direkt)
- **2 UNIQUE constraint eklendi:** `factory_recipe_versions(recipe_id, version_number)`, `payroll_parameters(year, effective_from)` — duplicate yok.
- **2 trigger:** `set_updated_at_timestamp()` fonksiyonu + 2 tablo trigger'ı.

**P1/P2 ertelendi (R-6 sprint):**
- 40 tip/nullability drift — kozmetik (timestamptz vs timestamp, varchar vs text) veya endpoint çalışıyor.
- 40+ eksik FK — orphan koruma, pilot'ta kimse silinmeyecek.
- Eksik perf index'ler — düşük yük dolayısıyla pilot sonrası.
- `module_flags` UNIQUE constraint — `COALESCE(branch_id,0), COALESCE(target_role,'')` lı UNIQUE INDEX zaten var ve şema constraint'inden daha iyi NULL handling yapıyor (false positive).
- Ölü tablo UNIQUE'leri (`dobody_action_templates`, `hq_support_category_assignments`, `mega_module_mappings`) — schema cleanup ile birlikte.

Sonuç: drift-check raporu "Eksik kolon: 0" — hedef karşılandı.

## Sessiz Drift'ler (pilot sonrası temizlik — 12 ölü tablo)
Drizzle schema'da tanımlı ama hiçbir backend route kullanmıyor (pilot'u etkilemez):
`ai_report_summaries`, `branch_comparisons`, `branch_feedbacks`, `dobody_action_templates`, `hq_support_category_assignments`, `mega_module_mappings`, `notification_digest_queue`, `notification_policies`, `product_suppliers`, `recipe_ingredients` (eski tablo, yenisi `factory_recipe_ingredients`), `ticket_activity_logs`, `trend_metrics`. Pilot sonrası schema cleanup sprint planlanmalı.

## Test Hesapları (pilot mod, 0000 şifre)
- **admin** — `ADMIN_BOOTSTRAP_PASSWORD` (UUID `0ccb206f-2c38-431f-8520-291fe9788f50`)
- **Umit/sef** — RECIPE_EDIT_ROLES yetki testi
- **RGM/recete_gm** — RECIPE_EDIT_ROLES yetki testi
- **barista.k2** — yetki olmayan rol testi
- Cookies: `/tmp/{admin,sef,rgm,barista}.txt`

## R-5 Test Reçeteleri
- **Recipe 16 — Cheesecake Frambuaz:** 9 ingredient, ŞEKER id=30, 3 alerjen (gluten/sut/yumurta), unit_cost 8.05 TL, coverage 22% (2/9 fiyat resolved)
- **Endpoint farkı:** `POST /api/factory/recipes/bulk-recalc` (NOT `bulk-recalc-cost` — eski talimatta typo vardı)
- **Lock pattern:** `recipe.editLocked && req.user.role !== "admin"` → 403 "Reçete kilitli - sadece admin düzenleyebilir"