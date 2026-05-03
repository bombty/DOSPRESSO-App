# DOSPRESSO Franchise Management Platform

## Overview
DOSPRESSO is a comprehensive franchise management platform designed to centralize and streamline operations for a coffee/food franchise network. It integrates HR, factory management, training, finance, CRM, quality control, and equipment management across 22 locations (20 branches, 1 HQ, 1 Factory). The platform supports approximately 372 users with 31 distinct roles across 326 frontend pages and 1,768 backend endpoints, providing efficient oversight and data management for a multi-location franchise business.

## User Preferences
- Preferred communication: Simple, everyday language, Turkish preferred
- Fast implementation in Build mode, continues with "devam"
- DB schema changes via versioned migrations under `migrations/` (drizzle-kit push times out on this DB)
- ChatGPT + Claude geçici devre dışı, sadece Replit Agent ile ilerlenir.
- Plan/Build mode ayrımı titiz: DB write, schema, migration, env değişiklik için Plan moduna geçiş + isolated task agent + backup + dry-run + GO zorunlu.
- DOCS-ONLY işler Build modunda yapılabilir (plan dosyaları, audit, runbook, skill güncelleme).
- Force push yasak; commit/push owner Replit Shell'den manuel.
- `session-protocol` skill (`.agents/skills/session-protocol/SKILL.md`) her oturum sonu 5 adım zorunlu (devir teslim push, 4 skill update, docs/, replit.md memory, sonraki oturum talimatı).

## System Architecture

### UI/UX Decisions
The frontend is built with React 18, TypeScript, and Vite, utilizing Shadcn/ui, Tailwind CSS, CVA, and Lucide icons for a modern interface. It employs a modular layout featuring `ModuleLayout`, `ModuleSidebar`, and `KPIStrip` for structured content, alongside 6 role-based Mission Control dashboards using `DashboardKpiStrip`. The design emphasizes mobile responsiveness, touch-friendly interactions, and role-specific quick actions. A server-driven collapsible sidebar dynamically generates navigation menus based on user roles and module feature flags.

### Technical Implementations
- **Authentication:** Session-based authentication via Passport.js supports both web (username/password with bcrypt) and kiosk (PIN-based with bcrypt) logins, incorporating security measures like password stripping, account lockout, and status management.
- **Role System:** A robust Role-Based Access Control (RBAC) system manages 31 roles across HQ, branches, and the factory. Permissions are defined through a static map, and `module_flags` offer granular control over module visibility, with the actual access mechanism served via `role_module_permissions` DB table through `GET /api/me/permissions`.
- **Database Schema:** The data model is extensive, organized into 23 modular schema files defining 455 `pgTable` covering users, roles, HR, academy, factory operations, CRM, and finance.
- **PDKS Excel Import:** A dedicated 5-table system handles the import of attendance data from external Excel files.
- **Key Architectural Patterns:**
    - **Soft Deletion:** Implemented using a `deleted_at` column across all core business tables.
    - **Data Locking:** Employs time and status-based data locking, supported by a change request workflow.
    - **Query Pattern:** Standardized usage of TanStack Query with `queryKey: ['/api/endpoint']`.
    - **Mutations:** `apiRequest` from `@lib/queryClient` is used for mutations, consistently followed by cache invalidation.

### Feature Specifications
- **Task System:** Features comprehensive task assignment, comments, evidence, status tracking, recurring tasks, bulk creation, verification, and rating, with CRM integration.
- **Production Planning:** Manages weekly production plans, items, daily records, and responsibilities, incorporating an approval hierarchy.
- **CRM:** A unified platform for communication, traditional CRM functions, and guest feedback, including QR feedback and task integration.
- **Academy:** A multi-version Learning Management System providing modules, quizzes, AI assistance, learning paths, certificates, badges, and analytics.
- **Factory:** Supports kiosk operations, shift management, quality control, lot tracking, station benchmarks, production batches, and worker scoring.
- **HR:** Manages the complete employee lifecycle, including documents, disciplinary actions, onboarding, attendance, leaves, and payroll.
- **Mr. Dobody (AI Agent):** A proactive AI agent designed for gap detection, task assignment, and workflow automation across operational categories.
- **Notification System:** A four-level notification system (operational, tactical, strategic, personal) with role-based filtering, category-based frequency control, archiving, and push notifications.
- **Mission Control Dashboards:** Six role-based dashboards deliver critical KPIs and insights through monthly snapshots of branch and factory performance.
- **Komuta Merkezi 2.0 (Dynamic Dashboard System):** A widget-based dashboard infrastructure with 24 registered widgets across 7 categories. It uses `dashboard_widgets` for registry and `dashboard_role_widgets` for per-role assignments. A unified API endpoint `GET /api/me/dashboard-data` delivers role-tailored widgets with real data, KPIs, and quick actions.
- **Late Arrival Detection:** Uses `LATE_THRESHOLD_MINUTES=15` and `SEVERE_LATE_MINUTES=60` global hard-coded constants. Mr. Dobody skill `late_arrival_tracker` runs daily, targeting specific roles.

## Pilot & Sprint Durumu (May 2026)
- **Pilot 5 gün UZATILDI** (2 May 2026, owner kararı) — Day-1 acelesi yok, Sprint 2/3 sırayla işlenir.
- **APP_AUDIT_REPORT_2026-05.md** (Task #278, `docs/audit/`, 820 satır) — 326 sayfa × 1985 endpoint × 806 FE çağrısı tek tarama. Sayısal özet: 326 sayfa, 260 route, 10 gerçek öksüz sayfa, 81 mega-modül alt sayfası, 10 kırık link, 3 menü kırık path, 118 kırık API çağrısı, 1278 ölü endpoint adayı, 8 duplikat/legacy grup. Auto-türetilen 3 task: #282 ✅ IMPLEMENTED, #283 (eksik API), #284 ✅ IMPLEMENTED.
- **Task #282 — 12 kırık link/menü düzeltmesi (MERGED, 2 May 2026):** APP_AUDIT Bölüm 3 (10 link) + Bölüm 6.1 (3 menü) statik string replace ile çözüldü. Task agent semantik tercihler: `/bordro→/maas` (muhasebe maaş yönetimi, kişisel `/bordrom` yerine), `/waste-executive→/waste/yonetici` (executive tab, ana `/waste` yerine). Diğer 10 path orijinal öneriyle aynı: `/hq-support→/hq-destek`, `/personel-profil→/profil`, `/finans→/mali-yonetim`, `/musteri-memnuniyeti→/misafir-memnuniyeti` (×2), `/kalite-kontrol→/kalite-kontrol-dashboard`, `/qr-scanner→/qr-tara`, `/leave-requests→/izin-talepleri`, `/overtime-requests→/mesai-talepleri`, `/stok-transferleri` menü silindi, `/canli-izleme→/canli-takip`. Architect APPROVED, post-merge PASS.
- **Task #285 — 88 kırık method+path kategorize raporu (IN REVIEW, 2 May 2026):** READ-ONLY analiz. `docs/audit/api-283-categorized-waves.md` v3 üretildi. APP_AUDIT Bölüm 7.1 truncate olduğu için bağımsız extraction yapıldı: (a) `extract2.mjs` path-bazlı 70 broken; (b) `extract3-method.mjs` + `extract4-expand.mjs` method-aware: 1352 method+path FE call → 732 matched → 71 ham expansion (dedup 70) + 9 method-mismatch keşfi (MM1-MM9) + 9 audit-recovered (N1-N9: `/api/iletisim/*` ×7, `/api/module-content`, `/api/delegations`) = **88 hi-confidence canonical**. Audit'in 4 FP'si doğrulandı (Bölüm 3.0.3: `/api/auth/logout`, `/api/upload/photo`, `/api/objects/finalize`, `/api/system/crash-report` — server'da POST var, audit GET listelemiş); düzeltilmiş audit hedefi ≤114; truncate 51-118 (≤25 needs-investigation) W0 skeleton'da kapatılır. **8 modül-bazlı wave skeleton dosyası committed** (`docs/audit/waves/W{0..7}-*.md`): W0 audit-script-reconstruction, W1 FACTORY (13+1MM=14), W2 BRANCH+DASHBOARD (11), W3 HR (6+3MM=9), W4 OBJECT_STORAGE konsolidasyon (4), W5 CRM+AUTH+ACADEMY+AGENT+OPS (16+2MM+8N=26), W6 ADMIN (8+1N=9), W7 DİĞER (12+3MM=15) = **14+11+9+4+26+9+15 = 88** ✓. Toplam ~44 saat. Risk-bazlı sıra: W3+W6+W4+W5(N1-N7) öncelikli. Her wave dosyası Status, Mode, Süre, Risk, Acceptance, Paralel-güvenlik içerir; Task #283.1-#283.7 olarak owner GO sonrası project_tasks'a propose edilecek.
- **Task #288 — Wave W0 audit script reconstruction (PARTIAL, 3 May 2026):** READ-ONLY. `scripts/audit/extract-broken-apis.mjs` committed. v1 parsing bug (architect REJECTED) → v2 fix: `collapseTemplates()` helper (collapse-then-split, `${ticket?.id}` truncate giderildi) + `isQueryArtifactMatch()` (`${qs}` artifact false positive filter) + raw audit-style view emission. **Final: 51 distinct broken** (missing=2, mm=7, rel=42). **Audit'in 118 sayısı reproduce EDİLEMEDİ** — bizim methodology daha sıkı dedup'luyor; gap honest documented. v1'in NS2-NS5 wave eklemeleri v2'de false positive çıktı (kaldırıldı), sadece NS1 (`/api/inventory/by-supplier`) script-doğrulanmış kaldı. Önceki 88/93 wave canonical stale — W1-W7 v2 reconciliation pilot için low-priority follow-up. Rapor: `docs/audit/broken-api-full-2026-05.md`. Reconciliation: `docs/audit/api-283-categorized-waves.md` §3.0.5. W0 PARTIAL olarak işaretlendi (`docs/audit/waves/W0-audit-script-reconstruction.md`).
- **Sırada:** Task #286 (B12 kiosk vardiya E2E test) PENDING. Task #283 dalgaları (W1-W7) ayrı task'lar olarak owner kararı sonrası propose edilecek.
- **Bundle 1A Post-Merge Verify (3 May 2026):** drift `0 kolon / 0 nullability / 3 UNIQUE / 23 idx / 19 FK` (kalan = Bundle 1B/#314 13 missing tables); app health 200 ✓; targetBranchIds frontend (task-atama.tsx:86, new-task-dialog.tsx:195) + backend (branch-tasks.ts:936 `inArray`, branch-task-scheduler.ts:61) hepsi int[] uyumlu; crm-task-migration.ts startup helper INTEGER[]; drift script partial unique exception prefix-subset doğrulamasıyla daraltıldı; FK idempotency notu migration footer'da. **Task #316 obsolete** (drift script fix Bundle 1A'ya dahil edildi). **BONUS DERS:** Migration APPLY öncesi app uptime 25dk → workflow restart yapılmadan log'da `monthly_budget_usd does not exist` (×6), `SLATracker TypeError` (×6), `skill.generateActions is not a function` (×5) görünüyordu — hepsi stale connection pool collateral damage; restart sonrası 3 hata sınıfı da 0'a düştü. Bundle 1A drift kapatma + 3 ayrı runtime hata sınıfı toplu fix. `dospresso-debug-guide §17` "Post-Migration Workflow Restart ZORUNLU" maddesi eklendi.
- **Task #305 — Bundle 1A DB Drift Kapatma (APPLIED, 3 May 2026):** Owner Seçenek C onayı + DRY-RUN+APPLY disiplini. **Drift 195 → 58** (-137); 42 kolon drift = 0 (TAM kapatıldı), module_flags UNIQUE COALESCE-index drift script güncellemesiyle artık doğru tanınıyor. Migration `migrations/sprint-2ext-drift-close.sql` (217 satır) tek transaction halinde uygulandı. Validator review sonrası 3 düzeltme: (a) target_branch_ids defer iptal — schema int[] fix Kategori 5B olarak Bundle 1A'ya dahil edildi (2 kolon: tasks + task_groups, USING `::integer[]` explicit cast + pre-flight veri kanıtı), (b) `scripts/db-drift-check.ts` partial unique index name-match desteği eklendi (module_flags COALESCE false-positive giderildi), (c) doc/header counts tutarlandı. Kapsam: K1 text/varchar 3 kolon, K2 int→numeric 1, K3 date→ts 3 (boş tablo), K4 ts↔tstz 8 (1'i Europe/Istanbul AT TIME ZONE), K5 DROP NOT NULL 7 (messages.type post-discovery dahil), K6 backfill 1+10+1=12 satır (employee_terminations.processed_by_id, interview_questions.created_by_id orphan→admin, customer_feedback.staff_id orphan→NULL), K7 SET NOT NULL 22, K8 ai_settings 6 yeni kolon (monthly_budget_usd vs.), K9 module_flags UNIQUE skip (zaten COALESCE-based unique index var), K10 60 idx + 28 FK. Pre-flight 0 NULL audit + 28 FK orphan check. **Defer (Bundle 1B = #314):** 13 eksik tablo + bağlı 3 unique/23 idx/19 FK. (target_branch_ids artık Bundle 1A'ya dahil — defer iptal, #315 obsolete edildi.) Karar matrisi: `docs/audit/comprehensive-2026-05/drift-resolution.md`.
- **Comprehensive Role × Module Audit (3 May 2026, DOCS-ONLY):** 6 paralel kod-explorer + 5 mekanik script-tarama. **36 bulgu** (9 KRİTİK, 5 RBAC, 6 hesap-mantık, 3 stub, 1 kırık-API, 2 mevzuat, 3 hardcode, 3 UX, 2 veri-integrity, 3 infra). **Pilot Day-1 acil 4 iş:** P1=PDKS sync trio (F10 PILOT etiketi exclude + F11 TZ + F12 shift_id FK → 42 eksik kayıt kaynağı), P2=13 sayfaya guard sarımı (F33 Authenticated wrapper modül-yetki yok, Stajyer `/izin-talepleri`/`/mesai-talepleri`/`/personel/:id` direkt URL açabilir), P3=PIN seed coverage (F36, 372 kullanıcı), P4=DashboardRouter v4↔v5 çakışması (F01). **Yüksek öncelik 8 iş:** AGI bordro formülü (F26), satınalma stok race (F28), lineCost null silent (F20), cari currentBalance cache (F32), reçete versiyon→etiket revize otomasyonu yok (F24, gıda mevzuat), factory-f2 stok stub (F22), 42 kolon DB drift (F35), `/api/training/modules` 404 (F17). **17 task önerisi T-300..T-316 hazır (~63h tahmin, %30 indirim ~44h gerçek).** Çıktı: `docs/audit/comprehensive-2026-05/EXECUTIVE_SUMMARY.md` + `findings-raw.md`. Owner GO bekliyor (P1-P4 acil, sonra H1-H8, sonra B-bundle).

## Documentation Map

**Repo kökündeki canlı MD dosyaları (sadece bunlar kalır):**
- `replit.md` — Bu dosya (mimari özet + memory)
- `STATUS.md` — Kısa durum özeti + canlı sprint redirect (`docs/SPRINT-LIVE.md`)
- `AGENTS.md` — Agent yönergeleri
- `CHANGELOG.md` — Sürüm günlüğü
- `DEPLOYMENT.md` — Deploy notları
- `EXPORT_README.md` — Veri dışa aktarım rehberi
- `design_guidelines.md` — Tasarım kuralları
- `SYSTEM_AUDIT_PROMPT.md` — Audit prompt template

**Aktif dokümantasyon (`docs/`):**
- `docs/SPRINT-LIVE.md` — Canlı sprint durumu (single source of truth)
- `docs/DECISIONS.md` — Ürün/operasyon kararları
- `docs/COLLABORATION-PROTOCOL.md` — Çalışma protokolü
- `docs/TEST-MATRIX.md` — 13 rol test matrisi
- `docs/PILOT-DAY1-CHECKLIST.md`, `docs/PILOT-DAY1-INCIDENT-LOG.md`, `docs/PILOT-DAY1-ROLLBACK-PLAN.md` — Pilot hazırlık
- `docs/SPRINT-2-WAVE-PLAN.md` — Aktif sprint dalga planı
- `docs/audit/` — Canlı denetim raporları (`APP_AUDIT_REPORT_2026-05.md`, `system-multi-perspective-evaluation-*`, `comprehensive-2026-05/`, `waves/`, vb.)
- `docs/runbooks/` — Operasyonel runbook'lar
- `docs/plans/` — Implementasyon planları (HQ kiosk PIN, leave balance, factory MVP, vb.)
- `docs/role-flows/`, `docs/sistem-100/`, `docs/sistem-denetim/`, `docs/pilot/`, `docs/reports/` — Tematik klasörler

**Agent Skills (`.agents/skills/`):**
- `dospresso-architecture` — Tech stack, schema, API patterns, 31-role system, module connections
- `dospresso-debug-guide` — Sık karşılaşılan bug procedures (401/403, stale cache, FK, kiosk auth, SLA, vb.)
- `dospresso-quality-gate` — 17-noktalı PASS/FAIL kalite checklisti (her sprint sonu)
- `dospresso-radix-safety` — Radix UI paketleri için kritik güvenlik kuralları (dispatcher.useState crash önleme)
- `dospresso-sprint-planner` — Sprint task planlama, prompt yazımı, prioritize, acceptance criteria
- `dospresso-roles-and-people` — Pilot personel roster, kullanıcı↔rol mapping, pilot şube supervisor'leri (son DB sync 25 Apr 2026)
- `session-protocol` — Oturum sonu 5 adım zorunlu protokolü
- `find-skills`, `skill-creator`, `pdf` — Yardımcı skill'ler

**Arşiv (`docs/archive/`):**
- `docs/archive/2026-Q1/` — Mart 2026 ve öncesi raporlar (DEVIR-TESLIM-v5/v6/v7, DOSPRESSO-Devir-Teslim-v5/v6, SISTEM-RAPORU, TARAMA-RAPORU, _IT_Audit_*, KIOSK_AUDIT, MEGA_SPRINT_AUDIT, PRELAUNCH_AUDIT, LAUNCH_READINESS, QA_AUDIT, ARCHITECT_REVIEW_FIXES, REVIEW_KALITE_DENETIM_ŞABLONLARI, Akademi_Audit)
- `docs/archive/2026-Q2/` — Nisan-Mayıs 2026 dönem raporları (Sprint-Plan-v5, Pilot-Analiz-v1, ORPHAN_PAGES_DELETION_REPORT)

## External Dependencies
- **OpenAI API**: Utilized for AI vision, chat, embeddings, and summarization.
- **AWS S3 / Replit Object Storage**: Cloud-based storage for files.
- **Neon Database**: Provides serverless PostgreSQL database services.
- **IONOS SMTP**: Used for sending email notifications.