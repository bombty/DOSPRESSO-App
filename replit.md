# DOSPRESSO Franchise Management WebApp

## Overview
The DOSPRESSO WebApp is a comprehensive platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its primary goal is to enhance efficiency, ensure brand consistency across all DOSPRESSO branches, and provide robust management tools. Key capabilities include monitoring branches, assigning and AI-verifying tasks, tracking equipment health, managing training, and providing support through features like unified fault management, SLA monitoring, and an AI-powered knowledge base. The platform also includes a full Learning Management System (LMS) with gamification and analytics, comprehensive procurement and cost management, and advanced factory shift and production planning. The project aims to improve operational efficiency and standardization across all franchise locations.

## User Preferences
Preferred communication style: Simple, everyday language. Turkish language communication preferred. Fast implementation in Build mode, continues with "devam" frequently.

## System Architecture
### UI/UX Decisions
The frontend uses React 18+ with TypeScript and Vite, employing Shadcn/ui (New York variant, Radix UI-based) and Material Design 3 principles. Styling is managed with Tailwind CSS, supporting dark mode and Turkish localization. The design emphasizes a mobile-first, responsive approach with compact, touch-friendly interactions optimized for vertical screens, utilizing bottom-sheet dialogs on mobile and centered modals on larger screens. Sidebar navigation is optimized for role-based display, collapsing into hub links for sections with many items.

### Technical Implementations
- **Frontend**: React 18, Vite, Wouter (routing), TanStack Query (state management), React Hook Form, Shadcn/ui, i18next + react-i18next (i18n).
- **Backend**: Node.js, Express.js, TypeScript, with Replit Auth (OpenID) and Passport.js for authentication.
- **Database**: PostgreSQL (Neon serverless) via Drizzle ORM and pgvector for embeddings.
- **i18n**: i18next with lazy-loaded translation files supporting TR, EN, AR (RTL), DE.
- **File Upload**: Uppy integration for AWS S3.
- **QR Code**: html5-qrcode for scanning.
- **Background Jobs**: Node.js interval-based scheduling for SLA checks, notifications, and maintenance reminders.
- **Offline Resilience**: Service Worker, localStorage-based mutation queue, and API retry mechanisms.

### Feature Specifications
- **Authentication & RBAC**: 14-role system with granular permissions and branch-level data filtering.
- **Equipment Management**: Lifecycle management, health monitoring, and maintenance scheduling.
- **Unified Fault System**: Creation, assignment, workflow, escalation, photo documentation, cost tracking, QR-integrated reporting.
- **SLA Monitoring**: Real-time tracking with automated alerts.
- **AI Integration**: AI photo verification, RAG-enabled knowledge base, AI Academy Chat Assistant, Adaptive Learning Engine, and smart recommendations. AI Policy Console V2 for configurable data access.
- **DOSPRESSO Academy (LMS)**: Comprehensive training with career progression, quizzes, gamification, certification, and AI learning paths.
- **Daily Task Guidance**: Role-based task templates with personalized lists and AI recommendations.
- **Advanced Task Workflow**: Approvals, Q&A, deadline extension, scheduled delivery, bulk assignment, and subtask management.
- **Checklist Management System**: Time-windowed tasks with photo validation and performance weighting.
- **Recipe Management System**: Product recipes with version tracking and AI Recipe Creation.
- **New Shop Opening Management System**: 7-phase workflow tracking for franchise openings with hierarchical tasks.
- **Procurement Management System**: Full procurement module with Inventory, Supplier Management, Purchase Orders, and Goods Receipt, including approval roles.
- **Cost Management System**: Comprehensive product cost calculation integrated with procurement.
- **Factory Shift & Production Planning**: Shift planning, batch tracking, performance monitoring, kiosk PIN authentication, production/waste recording, and fault reporting.
- **Mr. Dobody Agent Engine**: Autonomous AI agent system ("Read-Only AI, Write-Through Human") for analyzing data and proposing user-approved actions. Includes rule-based suggestion engine, modular skill engine, and proactive notifications.
  - **Flow Mode**: Active work-flow guide for role-specific prioritized tasks. CGO/CEO flow includes pending agent action count.
  - **Task Manager**: Admin/HQ-created manual flow tasks for users' Flow Mode.
  - **Avatar Management**: DB-backed avatar system with time-windowed and role-based display.
  - **Agent Center UX**: Enriched suggestion titles with person/branch names and metrics. Approve/reject confirmation dialogs with full context. Detail dialog for suggestions without valid deep links. Write-path deduplication (24h window) to prevent duplicate pending actions.
- **CRM — Müşteri 360°**: Comprehensive customer relationship management including feedback, complaints, campaigns, and analytics.
- **Fabrika Uretim-Stok-Sevkiyat Zinciri**: Shipment system with status workflow, pre-dispatch stock validation, automatic inventory deduction, 2-stage quality control, HACCP records, LOT/Parti tracking, and SKT background jobs.
- **Branch Order & Stock Management**: Full branch order lifecycle, inventory system with stock movements, waste recording, and expiring product alerts.
- **PDKS (Personel Devam Kontrol Sistemi)**: Kiosk-integrated attendance tracking with day classification and monthly summaries.
- **Maaş Hesaplama (Payroll Calculation)**: Position-based salary system with 8 business rules.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation by fault priority.
- **Notifications**: Automatic in-app alerts and email notifications with deduplication and throttling.
- **State Management**: TanStack Query for server state and localStorage for theme persistence.
- **Security Hardening**: CSP headers, Permissions-Policy, Referrer-Policy, CORS whitelist, rate limiting, session fixation protection, and expanded audit logging.
- **API Security**: Rate limiting and Factory RBAC for data access.
- **Transaction Safety**: Atomic operations using Drizzle transactions.
- **RAG Knowledge Base**: Vector-based semantic search using OpenAI embeddings.
- **Gamification**: Integrated badges, career progression, leaderboards, team competitions, and daily learning streaks.
- **Mega-Module Architecture**: Tabbed modules with lazy-loaded page components, URL synchronization, and code splitting.
- **Performance Optimization**: DB connection pooling, server-side caching, database indexes, and TanStack Query garbage collection.
- **Shift Scheduling**: Fair algorithm for employee work hours.
- **Evaluation Anti-Abuse System**: Cooldown and monthly limits on employee evaluations.
- **Reminder System**: Interval-based checks for tasks and evaluations.
- **Academy V2 Implementation**: Gate system, Content Pack management, My Path NBA engine, and Onboarding Studio.
- **Knowledge Base Content Pipeline**: Seed endpoints for importing modules, recipes, procedures, and quality specs into AI knowledge base with automatic embedding synchronization.
- **Dashboard Role Routing**: Explicit dashboard mapping for HQ roles; branch roles get a CardGridHub with role-filtered widgets.
- **Command Palette (Ctrl+K)**: Global search modal with fuzzy search and keyboard navigation.
- **Feedback Form Settings**: Seeded settings for branches with categories, photo upload, location verification, and multi-language support.
- **Feedback SLA System**: Hourly background job for overdue feedback responses and critical notifications.
- **Feedback Pattern Analysis**: Weekly job for trend analysis and alerts.
- **WordPress-Style Data Export/Import**: Full system data export to ZIP, background job processing, and import modes.
- **Setup Wizard**: 6-step wizard for initial system configuration, including default data seeding.
- **Sprint 23 — Pilot Readiness** (completed):
  - Security: `isAuthenticated` middleware on push.ts, setup.ts, ai-ops-copilot.ts endpoints.
  - Backup: Paginated export for large tables (5K row batches), prevents OOM.
  - Seed Infrastructure: `server/routes/seed.ts` with 8 seed endpoints (POST /api/admin/seed-*), admin-guarded.
  - Seed Data: 13 checklists (87 tasks), 205 quiz questions (55 quizzes), 19 salary definitions, 384 PDKS records, factory chain data (33 batches, 4 lots, 2 shipments, 3 HACCP), 23 customer feedback, 27 quiz attempts + training progress, 94 branch inventory, 15 training assignments, 5 announcements, 8 flow completions.
  - Error/Loading States: 174 pages enhanced with `ErrorState`/`LoadingState` components.
  - Service Worker: Cache version bumped to `dospresso-v10`.
  - Pilot Readiness Score: 63 → **81/100** (target: 80+).
- **Sprint 24 — Agent Approval Chain + Critical Fixes** (completed):
  - Agent Approval Chain: CGO approves suggestion → supervisor gets notification + task (3-day deadline) + Flow Mode task. Full downstream chain in `server/routes/agent.ts`.
  - Agent Deep Link Fix: `/personel/` → `/personel-detay/` route correction in `agent-action-center.tsx`. Fallback detail dialog for invalid links.
  - Agent Deduplication: Read-time dedup by title+status in GET `/api/agent/actions`. Write-time dedup already existed in skill-notifications.ts.
  - Score Display: 0/100 scores now show "Henüz veri yok" instead of red 0/100 in `sube-detay.tsx` and `branch-scorecard.tsx`.
  - Turkish ASCII Fix: All remaining ASCII chars fixed in error-boundary, sube-detay, fabrika/dashboard, qr-checkin-generator, coach-sube-denetim, vardiya-planlama.
  - Test User Rename: 190+ test users renamed from "TBarista1 Test" to realistic Turkish names across all branches.

## External Dependencies
- **OpenAI API**: AI-powered vision analysis, chat completions, embeddings, and summary generation.
- **Replit Auth**: User authentication via OpenID Connect.
- **AWS S3**: Cloud storage for photo uploads, backups, and persistent storage.
- **Neon Database**: Serverless PostgreSQL instance.
- **IONOS SMTP**: Email notification delivery.