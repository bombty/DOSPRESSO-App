# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across DOSPRESSO branches, and offers robust role-based access control. Key capabilities include unified fault management with QR integration, SLA monitoring, an AI-powered knowledge base, and a comprehensive Learning Management System (LMS) called DOSPRESSO Academy, featuring gamification, analytics, and certification. The project's ambition is to improve operational efficiency and standardisation across all franchise locations.

## User Preferences
Preferred communication style: Simple, everyday language. Turkish language communication preferred. Fast implementation in Build mode, continues with "devam" frequently.

## System Architecture
### UI/UX Decisions
The frontend utilizes React 18+ with TypeScript and Vite, employing Shadcn/ui (New York variant, Radix UI-based) and Material Design 3 principles. Styling is managed with Tailwind CSS, including dark mode and Turkish localization. The design prioritizes a mobile-first, responsive approach with compact, touch-friendly interactions optimized for vertical screens. Dialogs use a bottom-sheet pattern on mobile and a centered modal on larger screens.

### Technical Implementations
- **Frontend**: React 18, Vite, Wouter (routing), TanStack Query (state management), React Hook Form, Shadcn/ui, i18next + react-i18next (i18n).
- **Backend**: Node.js, Express.js, TypeScript, with Replit Auth (OpenID) and Passport.js for authentication.
- **Database**: PostgreSQL (Neon serverless) via Drizzle ORM and pgvector for embeddings.
- **i18n**: i18next with lazy-loaded translation files. Supports TR (default), EN, AR (RTL), DE.
- **File Upload**: Uppy integrated with AWS S3.
- **QR Code**: html5-qrcode for scanning.
- **Background Jobs**: Node.js interval-based scheduling for tasks like SLA checks, notifications, and maintenance reminders.
- **Offline Resilience**: Service Worker, localStorage-based mutation queue, and API retry mechanisms ensure data integrity during network outages.

### Feature Specifications
- **Authentication & RBAC**: A 14-role system with granular permissions and branch-level data filtering.
- **Equipment Management**: Comprehensive lifecycle management, health monitoring, and maintenance scheduling.
- **Unified Fault System**: Creation, assignment, workflow, escalation, photo documentation, cost tracking, QR-integrated reporting, and PDF export.
- **SLA Monitoring**: Real-time tracking with automated breach alerts.
- **AI Integration**: AI photo verification for tasks, RAG-enabled knowledge base search, AI Academy Chat Assistant, Adaptive Learning Engine, and AI-powered smart recommendations.
- **DOSPRESSO Academy (LMS)**: Comprehensive training system including career progression, quizzes, gamification, certification, AI learning paths, and analytics.
- **Daily Task Guidance**: Role-based task templates with personalized lists and AI recommendations.
- **Advanced Task Workflow**: Enhanced task lifecycle with approvals, Q&A, deadline extension, scheduled delivery, bulk assignment, and subtask management.
- **Checklist Management System**: Time-windowed tasks with HQ/Supervisor editable slots, photo validation, manager notifications, and performance weighting.
- **Recipe Management System**: Product recipes with automatic version tracking and AI Recipe Creation.
- **New Shop Opening Management System**: A 7-phase workflow tracking for franchise openings with hierarchical tasks and RACI assignments.
- **AI Policy Console V2**: Admin-configurable AI data access policies with data domains, RoleGroup abstractions, scope clamping, and server-side enforcement.
- **Procurement Management System**: Complete procurement module with Dashboard, Inventory, Supplier Management, Purchase Orders, and Goods Receipt, including approval roles and branch-based filtering.
- **Cost Management System**: Comprehensive product cost calculation module integrated with procurement.
- **Factory Shift & Production Planning**: Complete shift planning system with batch tracking, performance monitoring, worker assignments, kiosk PIN authentication, production/waste recording, and fault reporting.
- **Mr. Dobody Agent Engine**: Autonomous AI agent system with "Read-Only AI, Write-Through Human" architecture, analyzing data and proposing actions requiring user approval. Includes rule-based suggestion engine with 12 rules across 5 role functions and a Quick Action API for one-click approval with audit trail. Features a modular skill engine with 8 skills, AI enrichment via OpenAI (gpt-4o-mini), proactive notification system with throttling and quiet hours, scheduler integration, and an expanded Agent Center.
- **Mr. Dobody Flow Mode (Sprint 21A)**: Active work-flow guide replacing passive suggestion display. On login, a Flow Mode card shows role-specific prioritized tasks with time-based Turkish greetings and personalization. Users tap "İlk İşe Başla" to enter guided flow with a floating mini-bar showing current task progress. Mini-bar supports task completion, transition animations, minimize-to-dot, and auto-dismiss. Dismissal is user-scoped and date-scoped via localStorage. Flow API (`GET /api/dobody/flow-tasks`) generates real-time tasks per role from DB (checklists, training, approvals, stock alerts, feedback, etc.). Integrated into all 10 role-specific landing pages. Context managed via `DobodyFlowProvider` in App.tsx. Admin role included in CEO/CGO flow task generation.
- **Quick Action Notification Confirmation**: `send_notification` actions on HQ dashboard show an AlertDialog confirmation before sending, with suggestion preview. After sending, a detailed toast shows recipient name, role, branch, and timestamp. Backend resolves branch supervisors for branch-level notifications (no targetUserId). Cross-branch authorization enforced after target resolution for non-HQ roles.
- **Mr. Dobody Avatar Management**: DB-backed avatar system replacing hardcoded mascot images. 62 character variants split from sprite sheets stored in Object Storage (`public/mascot/`). `dobody_avatars` table with category (thinking/coffee/celebrating/general/search/morning/greeting), label, active/sort, `time_start`/`time_end` (HH:MM format for time-window display), and `roles` (text array for role-based filtering). Admin panel at `/admin/dobody-avatarlar` for upload, toggle, edit, delete, bulk edit with time/role settings. Time presets: Sabah 06-11:30, Öğle 11:30-17, Akşam 17-22, Gece 22-06, Tüm Gün, Özel. Server-side filtering by Turkey timezone and user role. `useDobodyAvatar(category?)` hook for random avatar selection. CRUD API at `/api/dobody/avatars` (public, filtered) and `/api/admin/dobody/avatars` (admin, unfiltered). Bulk update endpoint at `/api/admin/dobody/avatars/bulk-update`. In-memory cache with 5min TTL.
- **Role-Based Single-Screen Dashboards**: Simplified landing pages per role after login, showing role-relevant KPIs, Mr. Dobody suggestions, and links to detailed dashboards.
- **CRM — Müşteri 360°**: A comprehensive customer relationship management module including dashboards, feedback, complaints, campaigns, SLA tracking, and analytics.
- **Fabrika Uretim-Stok-Sevkiyat Zinciri + Gida Muhendisi Entegrasyonu**: Shipment system with status workflow, pre-dispatch stock validation, automatic inventory deduction, 2-stage quality control, HACCP check records, LOT/Parti tracking, coffee roasting log, semi-finished product anti-abuse, SKT background job with notifications, and simplified 3-button kiosk flow.
- **Branch Order & Stock Management**: Full branch order lifecycle (create→approve→ship→deliver→branch stock update) with auto-generated order numbers and factory approval. Branch inventory system with stock movements, waste recording, count corrections, expiring product alerts, Bombtea vs Franchise ownership distinction, SKT validation on shipments with FIFO LOT auto-assignment, and notifications at every lifecycle stage.
- **PDKS (Personel Devam Kontrol Sistemi)**: Kiosk-integrated attendance tracking with giriş/çıkış stamps, day classification engine, and branch-level monthly summaries.
- **Maaş Hesaplama (Payroll Calculation)**: Position-based salary system, monthly payroll calculation with 8 business rules and role-based access.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation varying by fault priority.
- **Notifications**: Automatic in-app alerts and email notifications; manager notifications on critical events with deduplication and throttling.
- **State Management**: TanStack Query for server state and localStorage for theme persistence.
- **Photo Upload**: Persistent storage on AWS S3 via an ObjectUploader component.
- **Backup System**: Daily automatic backups to object storage with a restore pipeline.
- **Security Hardening**: CSP headers, Permissions-Policy, Referrer-Policy, CORS whitelist, expanded rate limiting, session fixation protection, expanded audit logging, and Web Push notifications with VAPID keys and quiet hours.
- **API Security**: Rate limiting via express-rate-limit and Factory RBAC for data access.
- **Transaction Safety**: Atomic operations for factory batch completion, verification, and machine self-selection using Drizzle transactions.
- **RAG Knowledge Base**: Vector-based semantic search using OpenAI embeddings.
- **Gamification**: Integrated badges, career progression, leaderboards, team competitions, adaptive difficulty, certificates, and daily learning streak tracker.
- **Mega-Module Architecture**: Each major section uses a tabbed mega-module wrapper that lazy-loads page components, with URL synchronization and code splitting.
- **Performance Optimization**: DB connection pooling, server-side in-memory caching for dashboard endpoints, database indexes, and TanStack Query garbage collection.
- **Shift Scheduling**: Fair algorithm ensuring full-time and part-time employee work hour requirements.
- **Evaluation Anti-Abuse System**: Cooldown and monthly limits on employee evaluations.
- **Reminder System**: Interval-based checks for various task and evaluation reminders with DB-based deduplication.
- **Academy V2 Implementation**: Includes Gate system, Content Pack management, My Path NBA engine, and Onboarding Studio for creating and assigning day-by-day learning paths with approval workflows.
- **Knowledge Base Content Pipeline**: Seed endpoints for importing academy modules, recipes, procedures, and quality specs into AI knowledge base with incremental vector generation and automatic embedding synchronization.
- **Dashboard Role Routing**: Explicit dashboard mapping for HQ roles, with branch roles getting a CardGridHub with role-filtered widgets.
- **Sidebar Role Filtering**: Backend service filters sidebar menu items based on user roles and permissions.
- **Hub-Spoke Sidebar Navigation**: Sections with 4+ items collapse into hub links, showing card grids.
- **Favorites System**: localStorage-based page favorites with star toggle.
- **Command Palette (Ctrl+K)**: Global search modal with Turkish fuzzy search, page/menu results, DB object search, and keyboard navigation.
- **Feedback Form Settings**: Seeded settings for branches with categories, photo upload, location verification, multi-language support, and anonymous defaults.
- **Feedback SLA System**: Hourly background job checks for overdue feedback responses and sends critical notifications with per-user DB-level deduplication.
- **Feedback Pattern Analysis**: Weekly job analyzes 30-day category averages per branch for alerts and improvement detection.
- **WordPress-Style Data Export/Import**: Full system data export to ZIP, background job processing, 3 export scopes, 3 import modes, ZIP validation, and admin-only access with audit logging.
- **Setup Wizard**: 6-step setup wizard for initial system configuration (company info, admin account, SMTP, DB test) with default data seeding and demo user creation.
- **Sprint 20B UX Simplification**: Sidebar items reduced to ≤6 per role (except admin=15). Both `app-sidebar.tsx` and `hamburger-menu.tsx` use flat layout (no groups/accordion) when ≤6 items — items rendered as direct links. Hamburger menu switched from `/api/dashboard-modules` to filtered `/api/me/menu` endpoint. `SIDEBAR_ALLOWED_ITEMS` in `server/menu-service.ts` enforced before `alwaysVisible` check. Help (CircleHelp→/kullanim-kilavuzu) and Support (Headset→/hq-destek) added to header globally. IK page tabs grouped into 5 categories with role-based filtering. Role-based tab filtering added to 5 mega modules. 7 new Dobody suggestion functions wired to hq-summary. Hamburger hidden on mobile for ≤4-item roles. Turkish char fix: "Iletisim"→"İletişim".

## External Dependencies
- **OpenAI API**: Used for AI-powered vision analysis, chat completions, embeddings, and summary generation.
- **Replit Auth**: Utilized for user authentication via OpenID Connect.
- **AWS S3**: Provides cloud storage for photo uploads, backups, and persistent storage.
- **Neon Database**: A serverless PostgreSQL instance used as the primary database.
- **IONOS SMTP**: Employed for sending email notifications.