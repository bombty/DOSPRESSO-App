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
- **Authentication & RBAC**: 21-role system with granular permissions, branch-level data filtering, concurrent session limit (max 2), and auto-deactivation of 60+ day inactive users.
- **Equipment Management**: Lifecycle management, health monitoring, and maintenance scheduling.
- **Unified Fault System**: Creation, assignment, workflow, escalation, photo documentation, cost tracking, QR-integrated reporting.
- **SLA Monitoring**: Real-time tracking with automated alerts.
- **AI Integration**: AI photo verification, RAG-enabled knowledge base, AI Academy Chat Assistant, Adaptive Learning Engine, and smart recommendations. AI Policy Console V2 for configurable data access.
- **DOSPRESSO Academy (LMS)**: Comprehensive training with career progression, quizzes, gamification, certification, and AI learning paths. Features a Learnify/Duolingo-style landing page at `/akademi` with hero section, daily recommendation, weekly stats, mandatory/optional module separation, 8 standardized categories grid, quick links, and role-based management tools. Tab-based mega module accessible via sub-paths (e.g., `/akademi/benim-yolum`, `/akademi/kesfet`). Training module categories standardized from 21 to 8: barista_temelleri, hijyen_guvenlik, receteler, musteri_iliskileri, ekipman, yonetim, onboarding, genel_gelisim.
- **Daily Task Guidance**: Role-based task templates with personalized lists and AI recommendations.
- **Advanced Task Workflow**: Approvals, Q&A, deadline extension, scheduled delivery, bulk assignment, and subtask management.
- **Checklist Management System**: Time-windowed tasks with photo validation and performance weighting.
- **Recipe Management System**: Product recipes with version tracking and AI Recipe Creation.
- **New Shop Opening Management System**: 7-phase workflow tracking for franchise openings with hierarchical tasks.
- **Procurement Management System**: Full procurement module with Inventory, Supplier Management, Purchase Orders, and Goods Receipt, including approval roles.
- **Cost Management System**: Comprehensive product cost calculation integrated with procurement.
- **Factory Shift & Production Planning**: Shift planning, batch tracking, performance monitoring, kiosk PIN authentication, production/waste recording, and fault reporting.
- **Mr. Dobody Agent Engine**: Autonomous AI agent system ("Read-Only AI, Write-Through Human") for analyzing data and proposing user-approved actions. Includes rule-based suggestion engine, modular skill engine, and proactive notifications with an approval chain, smart routing, escalation, and outcome tracking.
- **CRM — İş İlişkileri**: Business relations module with campaign management, ticket/support system (branch-to-HQ requests), and business analytics. Guest feedback separated into dedicated module. Ticket system polished with category filters and Turkish status labels.
- **İletişim Merkezi (Communication Center)**: 4-tab mega module at `/iletisim-merkezi` — Dashboard (KPI cards, Mr. Dobody AI banner, dept load bars, recent activity), Şube Talepleri (department-filtered ticket management with SLA tracking), HQ Görevler (internal task assignment with progress tracking), Duyurular (broadcast announcements with confirmation). Role-based: branch roles hidden; supervisor/mudur see Dashboard + Tickets; HQ roles see all 4 tabs. Files in `client/src/pages/iletisim-merkezi/`.
- **Misafir Memnuniyeti (Guest Satisfaction)**: Standalone mega module for guest feedback management — QR ratings, guest complaints (auto-created from low ratings), SLA tracking, form settings, and satisfaction analytics. Accessible by kalite_kontrol, coach, supervisor, mudur, cgo, admin roles.
- **Franchise Investor Management**: Investor profile cards with contract tracking, branch performance aggregation, meeting notes, and contract expiry agent skill. Tables: franchise_investors, franchise_investor_branches, franchise_investor_notes. Accessible by admin, ceo, cgo.
- **Fabrika Uretim-Stok-Sevkiyat Zinciri**: Shipment system with status workflow, pre-dispatch stock validation, automatic inventory deduction, 2-stage quality control, HACCP records, LOT/Parti tracking, and SKT background jobs.
- **Branch Order & Stock Management**: Full branch order lifecycle, inventory system with stock movements, waste recording, and expiring product alerts.
- **PDKS (Personel Devam Kontrol Sistemi)**: Kiosk-integrated attendance tracking with day classification and monthly summaries.
- **Maaş Hesaplama (Payroll Calculation)**: Position-based salary system with 8 business rules.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation by fault priority.
- **Notifications**: Automatic in-app alerts and email notifications with deduplication and throttling.
- **State Management**: TanStack Query for server state and localStorage for theme persistence.
- **Security Hardening**: CSP headers, Permissions-Policy, Referrer-Policy, CORS whitelist, rate limiting, session fixation protection, and expanded audit logging. Secure cookies are enforced.
- **API Security**: Rate limiting and Factory RBAC for data access. Error responses are sanitized.
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
- **Data Protection (Sprint 27)**: Soft delete everywhere with audit logging, role-based write restrictions (admin-only user delete, payroll restrictions), data change log with field-level tracking, confirmation dialogs for destructive actions.
- **Data Lock System**: 13 lock rules for time/status-based record locking (HTTP 423), change request workflow for locked records, record revision history tracking, admin UI for lock rule management.
- **Proactive Agent Skills (6 new)**: Security Monitor (suspicious activity), Stock Predictor (depletion forecast), Waste Analyzer (station waste tracking), Supplier Tracker (reliability scoring), Burnout Predictor (employee risk), Cost Analyzer (trend analysis).

## Custom Agent Skills (`.agents/skills/`)
- **dospresso-quality-gate**: 11-point quality control checklist run after every sprint (auth, Turkish UI, null safety, Drizzle patterns, data lock, soft delete, dark mode, error states, Radix safety, SW bump, agent health).
- **dospresso-architecture**: Full architecture reference — tech stack, project structure, 21 roles, API conventions, business logic chains, module connections, DB naming.
- **dospresso-debug-guide**: Step-by-step debug procedures for common issues — null crashes, auth chain, TanStack cache, Radix crashes, data lock 423s, role-specific tips.
- **dospresso-sprint-planner**: Sprint planning rules — task sizing (S/M/L/XL), priority ordering, prompt template, post-sprint checklist, common pitfalls, module reference table.
- **dospresso-radix-safety**: Radix UI package safety — pinned versions, nested package detection, override rules, recovery procedure. Prevents the dispatcher.useState crash (occurred 3 times).

## External Dependencies
- **OpenAI API**: AI-powered vision analysis, chat completions, embeddings, and summary generation.
- **Replit Auth**: User authentication via OpenID Connect.
- **AWS S3**: Cloud storage for photo uploads, backups, and persistent storage.
- **Neon Database**: Serverless PostgreSQL instance.
- **IONOS SMTP**: Email notification delivery.