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
- **Charts**: Recharts for data visualization.
- **File Upload**: Uppy integrated with AWS S3.
- **QR Code**: html5-qrcode for scanning.
- **Background Jobs**: Node.js interval-based scheduling for tasks like SLA checks, notifications, and maintenance reminders.
- **Notifications**: In-app and email async notifications.
- **PDF Generation**: Uses jsPDF.
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
- **Branch QR Shift Check-in System**: HMAC-SHA256 signed dynamic QR codes for branch shift operations.
- **Branch Health Score Dashboard**: 6-component deterministic scoring system with role-based scoping, time-range filters, and trend indicators.
- **Coach Dashboard & Drill-Down**: Enhanced team progress with gate status badges, checklist completion rates, and mentor onboarding tracking.
- **Guest Feedback System**: Public QR feedback form with branch-specific settings, notification integration, SLA monitoring, and anti-abuse measures.
- **Mr. Dobody Agent Engine**: Autonomous AI agent system with "Read-Only AI, Write-Through Human" architecture, analyzing data and proposing actions requiring user approval. Includes rule-based suggestion engine with 12 rules across 5 role functions and a Quick Action API for one-click approval with audit trail. Features a modular skill engine with 8 skills, AI enrichment via OpenAI (gpt-4o-mini), proactive notification system with throttling and quiet hours, scheduler integration, and an expanded Agent Center.
- **Role-Based Single-Screen Dashboards**: Simplified landing pages per role after login, showing role-relevant KPIs, Mr. Dobody suggestions, and links to detailed dashboards.
- **CRM — Müşteri 360°**: A comprehensive customer relationship management module including dashboards, feedback, complaints, campaigns, SLA tracking, and analytics.
- **Akademi Bildirim Zenginlestirme + Iletisim Merkezi**: Enriched academy notifications and a unified communication page with tabs for Notifications, Messages, and Announcements.
- **Fabrika Uretim-Stok-Sevkiyat Zinciri + Gida Muhendisi Entegrasyonu**: Shipment system with status workflow, pre-dispatch stock validation, automatic inventory deduction, 2-stage quality control, HACCP check records, LOT/Parti tracking, coffee roasting log, semi-finished product anti-abuse, SKT background job with notifications, and simplified 3-button kiosk flow.
- **Branch Order & Stock Management**: Full branch order lifecycle (create→approve→ship→deliver→branch stock update) with auto-generated order numbers and factory approval. Branch inventory system with stock movements, waste recording, count corrections, expiring product alerts, Bombtea vs Franchise ownership distinction, SKT validation on shipments with FIFO LOT auto-assignment, and notifications at every lifecycle stage.

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
- **Vector Auto-Refresh**: AI settings auto-triggers vector re-embed when provider changes.
- **Knowledge Base Content Pipeline**: Seed endpoints for importing academy modules, recipes, procedures, and quality specs into AI knowledge base with incremental vector generation and automatic embedding synchronization.
- **Role-Based Profile Metrics**: HQ management roles see relevant metrics, while branch/factory roles see all metrics.
- **Academy HQ Role Alignment**: HQ roles see role-appropriate Academy content and professional development paths.
- **Dashboard Role Routing**: Explicit dashboard mapping for HQ roles, with branch roles getting a CardGridHub with role-filtered widgets.
- **Sidebar Role Filtering**: Backend service filters sidebar menu items based on user roles and permissions.
- **Hub-Spoke Sidebar Navigation**: Sections with 4+ items collapse into hub links, showing card grids.
- **Favorites System**: localStorage-based page favorites with star toggle.
- **Command Palette (Ctrl+K)**: Global search modal with Turkish fuzzy search, page/menu results, DB object search, and keyboard navigation.
- **İK URL Tab Routing**: İK page supports deep-linking to specific tabs via URL parameters.
- **Feedback Form Settings**: Seeded settings for branches with categories, photo upload, location verification, multi-language support, and anonymous defaults.
- **Feedback SLA System**: Hourly background job checks for overdue feedback responses and sends critical notifications with per-user DB-level deduplication.
- **Feedback Pattern Analysis**: Weekly job analyzes 30-day category averages per branch for alerts and improvement detection.

## External Dependencies
- **OpenAI API**: Used for AI-powered vision analysis, chat completions, embeddings, and summary generation.
- **Replit Auth**: Utilized for user authentication via OpenID Connect.
- **AWS S3**: Provides cloud storage for photo uploads, backups, and persistent storage.
- **Neon Database**: A serverless PostgreSQL instance used as the primary database.
- **IONOS SMTP**: Employed for sending email notifications.