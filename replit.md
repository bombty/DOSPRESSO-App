# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across DOSPRESSO branches, and offers robust role-based access control tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, an AI-powered knowledge base, and a comprehensive Learning Management System (LMS) called DOSPRESSO Academy, featuring gamification, analytics, and certification. The project's ambition is to improve operational efficiency and standardisation across all franchise locations.

## User Preferences
Preferred communication style: Simple, everyday language. Turkish language communication preferred. Fast implementation in Build mode, continues with "devam" frequently.

## System Architecture
### UI/UX Decisions
The frontend utilizes React 18+ with TypeScript and Vite, employing Shadcn/ui (New York variant, Radix UI-based) and Material Design 3 principles. Styling is managed with Tailwind CSS, including dark mode and Turkish localization. The design prioritizes a mobile-first, responsive approach with compact, touch-friendly interactions optimized for vertical screens. All cards utilize semantic tokens for consistent theming. The application consistently uses responsive grid patterns for item and stat cards.

### Technical Implementations
- **Frontend**: React 18, Vite, Wouter (routing), TanStack Query (state management), React Hook Form, Shadcn/ui, i18next + react-i18next (i18n).
- **Backend**: Node.js, Express.js, TypeScript, with Replit Auth (OpenID) and Passport.js for authentication.
- **i18n**: i18next with lazy-loaded translation files (i18next-http-backend), browser language detection (i18next-browser-languagedetector). Supports TR (default), EN, AR (RTL), DE. Translation files at `/client/public/locales/{tr,en,ar,de}/{common,auth,dashboard}.json`. Namespaces: common, auth, dashboard. User preference persisted in DB (users.language field) via `GET/PATCH /api/me/settings`. RTL auto-applied for Arabic. Missing key warnings in dev mode.
- **Database**: PostgreSQL (Neon serverless) via Drizzle ORM (type-safe) and pgvector for embeddings.
- **Charts**: Recharts for data visualization.
- **File Upload**: Uppy integrated with AWS S3.
- **QR Code**: html5-qrcode for scanning.
- **Background Jobs**: Node.js interval-based scheduling for tasks like SLA checks, notifications, and maintenance reminders.
- **Notifications**: In-app and email async notifications.

### Feature Specifications
- **Authentication & RBAC**: A 14-role system with dual-layer granular permissions and branch-level data filtering.
- **Equipment Management**: Comprehensive lifecycle management, health monitoring, maintenance scheduling.
- **Unified Fault System**: Creation, assignment, workflow, escalation, photo documentation, cost tracking, QR-integrated reporting, and professional PDF export.
- **SLA Monitoring**: Real-time tracking with automated breach alerts.
- **Troubleshooting System**: Editable guides integrated into fault reporting.
- **QR-Based Attendance**: Secure check-in/out with geofence validation.
- **Lost & Found System**: Tracking, photo capture, handover documentation, and cross-branch visibility.
- **AI Integration**: AI photo verification for tasks, RAG-enabled knowledge base search, AI Academy Chat Assistant, Adaptive Learning Engine, and AI-powered smart recommendations.
- **HR & Shift Management**: Personnel management, leave requests, overtime, attendance, AI-powered fair shift planning.
- **Enhanced Analytics Dashboard**: Tabbed interface showing daily/weekly/monthly metrics with AI-generated summaries.
- **DOSPRESSO Academy (LMS)**: Comprehensive training system including career progression, quiz system, gamification, certification, AI learning paths, and advanced analytics. Academy V2 spec docs at `docs/` define self-guiding learning with 14-day onboarding, 5-level gate-based career progression (Gate-0 through Gate-4), Next Best Action engine, and KPI-driven training recommendations.
- **Daily Task Guidance (Bugünün Görevleri)**: Role-based task templates with personalized task lists, completion tracking, AI-powered recommendations, and progress visualization.
- **Advanced Task Workflow**: Enhanced task lifecycle with assignee-assigner approval flow, question-answer system, deadline extension requests, scheduled delivery, HQ bulk assignment, leave-day task hiding, cowork-style subtask management (claim/unclaim steps), and expanded checker/verifier system with group chat integration.
- **Checklist Management System**: Time-windowed tasks with HQ/Supervisor editable time slots, photo validation, manager notifications, performance weighting, and daily reminders.
- **AI Checklist Verification**: AI-powered photo verification system for checklist tasks with reference photo upload, tolerance slider, multiple AI verification types, similarity scoring.
- **Recipe Management System**: 10 DOSPRESSO categories with 145+ product recipes, including HOT/ICED variants and size variations. Features automatic version tracking with trainer update notification, and AI Recipe Creation.
- **Quiz System**: MCQ and True/False questions, dynamic options, points, explanations, cooldowns, and attempt tracking.
- **New Shop Opening Management System**: A 7-phase workflow tracking for franchise openings with hierarchical tasks, RACI assignments, and procurement/bidding.
- **Admin Features**: Email settings (SMTP), banner management, AI settings, project task detail pages, and milestone management.
- **AI Usage Guide (Kullanım Kılavuzu)**: Role-based interactive system guide with AI Q&A.
- **Content Studio (İçerik Stüdyosu)**: Unified content management consolidating banner creation and announcement publishing.
- **Global Search & Calendar View**: Functionality for finding information across the platform and visualizing tasks/milestones.
- **Unified Dashboard Alert System**: Real-time alerts for both branch and factory dashboards supporting 12 trigger types with severity levels.
- **Procurement Management System (Satınalma)**: Complete procurement module with Dashboard, Inventory, Supplier Management, Purchase Orders, and Goods Receipt.
- **Cost Management System (Maliyet Yönetimi)**: Comprehensive product cost calculation module integrated with procurement. Features raw material management, factory fixed cost tracking, profit margin templates, and automatic cost calculations.
- **Factory Shift & Production Planning**: Complete shift planning system with batch tracking, performance monitoring, worker assignments, and supervisor verification workflows.
- **Employee of Month System**: Multi-criteria scoring, manager evaluation, branch-specific visibility.
- **Branch Inspection System (Coach)**: 8-category branch audit system with weighted scoring, checkbox-based item evaluation, notes, and photo documentation.
- **Product Complaint System**: Branch-to-factory product complaint workflow with severity levels, status tracking, and resolution documentation.
- **Branch Health Score Dashboard**: Aggregated branch health visualization combining inspection scores, product complaint stats, and category averages, with AI-powered summary generation.
- **Role Separation**: Distinct roles for Coach, Trainer, and Kalite Kontrol with specific responsibilities.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation varying by fault priority.
- **Notifications**: Automatic in-app alerts and email notifications; manager notifications on critical events.
- **State Management**: TanStack Query for server state and localStorage for theme persistence.
- **Photo Upload**: Persistent storage on AWS S3 via an ObjectUploader component.
- **Backup System**: Daily automatic backups to object storage with a restore pipeline and time machine for point-in-time recovery.
- **API Security**: Rate limiting via express-rate-limit. Factory RBAC for data access and verification operations.
- **Transaction Safety**: Atomic operations for factory batch completion, verification, and machine self-selection using Drizzle transactions.
- **Live Tracking**: Real-time employee location tracking with in-memory cache for supervisors.
- **RAG Knowledge Base**: Vector-based semantic search using OpenAI embeddings.
- **Gamification**: Integrated badges, career progression, leaderboards, team competitions, adaptive difficulty, certificates, and daily learning streak tracker.
- **Layout System**: Responsive flex-based layouts with standardized gaps.
- **Dashboard Hub**: `CardGridHub` displays 9 mega-module cards with role-based visibility.
- **Mega-Module Architecture**: Each major section uses a tabbed mega-module wrapper that lazy-loads page components, with URL synchronization.
- **Shift Scheduling**: Fair algorithm ensuring full-time employees work minimum 6 days/week at 45 hours, part-time 3 days/25 hours.
- **Analytics Architecture**: Three-period tabbed interface with real-time metric aggregation, AI-powered summaries, and conditional alerts.
- **Checklist Scoring**: 40% weight in compositeScore, scored by supervisor, daily reminders active.
- **Performance Score Data Flows**: Task ratings and checklist completions automatically update employee performance scores.
- **Evaluation Anti-Abuse System**: 24-hour cooldown between evaluations of same employee, monthly max 2 evaluations per evaluator-employee pair.
- **Reminder System**: 5-minute interval checks for task reminders, overdue notifications, maintenance alerts, checklist completion reminders, and evaluation reminders.
- **Branch Dashboard**: Comprehensive dashboard with real-time stats, alert management, kiosk mode access, and quick access buttons.
- **PDF Generation**: Uses jsPDF with Helvetica font and Turkish character sanitization.
- **Academy V2 Spec Framework**: 7-file specification at `docs/` — `00-definitions.md` (gate model, career levels, evaluation layers), `01-user-flows.md` (onboarding flows, NBA engine rules, screen states), `02-data-permissions.md` (data model, permission matrix, KPI signal mapping), `prd-academy-v2.md` (MVP backlog, acceptance criteria, phase plan), `coach-console-spec.md` (Coach Console separation rules, menu structure), `onboarding-studio-spec.md` (template editor, assignment, preview screens), `agent-visibility-spec.md` (Agent Center, Action Log, inline suggestions).
- **Academy V2 Phase 1 Implementation**: Backend API at `server/routes/academy-v2.ts` with Gate system (CRUD, attempts, eligibility, approval), Content Pack management (CRUD, assignment, progress), My Path NBA engine (`/api/academy/my-path`). Frontend My Path page (`client/src/pages/academy-my-path.tsx`) with career progression banner, onboarding status, gate exam tracking, and NBA action list. New "Kariyer Yolu" tab group in akademi-mega.tsx with "Benim Yolum" as default tab. DB tables: career_gates, gate_attempts, kpi_signal_rules, content_packs, content_pack_items, user_pack_progress.
- **Academy V2 Role-Based UI Separation**: `akademi-mega.tsx` uses `roleVisibility` ('coach'|'employee'|'supervisor'|'all') on TabConfig and TabGroup. Coach roles (admin, coach, trainer, kalite_kontrol) see: Yönetim (Gate Yönetimi, KPI Sinyalleri), İçerik & Atama (İçerik Kütüphanesi, Onboarding Studio), Takip & Analitik (Takım İlerlemesi, Analitik, İlerleme Özeti, Kohort/Şube Analitik). Supervisor roles (supervisor, mudur) see: Employee tabs + Ekip Takibi group. Employee roles see: Kariyer Yolu (Benim Yolum), Eğitimlerim (Modüllerim, Bilgi Bankası), Başarılarım (Rozetlerim, Sertifikalarım, Sıralama, Başarılarım, Seri Takibi). Admin sees all tabs. Coach pages: `coach-content-library.tsx`, `coach-gate-management.tsx`, `coach-kpi-signals.tsx`, `coach-team-progress.tsx`. Default landing: Coach → Gate Yönetimi, Employee/Supervisor → Benim Yolum.
- **Centralized Academy RBAC**: `shared/permissions.ts` defines ACADEMY_COACH_ROLES, ACADEMY_SUPERVISOR_ROLES, ACADEMY_EMPLOYEE_ROLES sets, AcademyViewMode type (coach/supervisor/employee), helper functions (getAcademyViewMode, isAcademyCoach, isAcademySupervisor, canAccessAcademyRoute). Backend middleware (requireAcademyCoach, requireAcademyCoachOrSupervisor) in academy-v2.ts enforces same role checks. Coach-only API endpoints: POST/PATCH /gates, POST /gates/:id/approve, GET /kpi-signals, GET /content-packs. Coach+Supervisor API: GET /team-progress.

## External Dependencies
- **OpenAI API**: Used for AI-powered vision analysis, chat completions, embeddings, and summary generation.
- **Replit Auth**: Utilized for user authentication via OpenID Connect.
- **AWS S3**: Provides cloud storage for photo uploads, backups, and persistent storage.
- **Neon Database**: A serverless PostgreSQL instance used as the primary database.
- **IONOS SMTP**: Employed for sending email notifications.