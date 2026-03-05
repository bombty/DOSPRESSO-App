# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across DOSPRESSO branches, and offers robust role-based access control tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, an AI-powered knowledge base, and a comprehensive Learning Management System (LMS) called DOSPRESSO Academy, featuring gamification, analytics, and certification. The project's ambition is to improve operational efficiency and standardisation across all franchise locations.

## User Preferences
Preferred communication style: Simple, everyday language. Turkish language communication preferred. Fast implementation in Build mode, continues with "devam" frequently.

## System Architecture
### UI/UX Decisions
The frontend utilizes React 18+ with TypeScript and Vite, employing Shadcn/ui (New York variant, Radix UI-based) and Material Design 3 principles. Styling is managed with Tailwind CSS, including dark mode and Turkish localization. The design prioritizes a mobile-first, responsive approach with compact, touch-friendly interactions optimized for vertical screens. All cards utilize semantic tokens for consistent theming, and responsive grid patterns are used for item and stat cards.

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
- **PDF Generation**: Uses jsPDF with Helvetica font and Turkish character sanitization.

### Feature Specifications
- **Authentication & RBAC**: A 14-role system with dual-layer granular permissions and branch-level data filtering.
- **Equipment Management**: Comprehensive lifecycle management, health monitoring, maintenance scheduling.
- **Unified Fault System**: Creation, assignment, workflow, escalation, photo documentation, cost tracking, QR-integrated reporting, and professional PDF export.
- **SLA Monitoring**: Real-time tracking with automated breach alerts.
- **AI Integration**: AI photo verification for tasks, RAG-enabled knowledge base search, AI Academy Chat Assistant, Adaptive Learning Engine, and AI-powered smart recommendations.
- **DOSPRESSO Academy (LMS)**: Comprehensive training system including career progression, quiz system, gamification, certification, AI learning paths, advanced analytics, and KPI-driven training recommendations.
- **Daily Task Guidance**: Role-based task templates with personalized task lists, completion tracking, and AI-powered recommendations.
- **Advanced Task Workflow**: Enhanced task lifecycle with assignee-assigner approval, Q&A, deadline extension, scheduled delivery, bulk assignment, subtask management, and expanded checker/verifier system with group chat.
- **Checklist Management System**: Time-windowed tasks with HQ/Supervisor editable time slots, photo validation, manager notifications, performance weighting, and daily reminders.
- **Recipe Management System**: Product recipes with automatic version tracking and AI Recipe Creation.
- **New Shop Opening Management System**: A 7-phase workflow tracking for franchise openings with hierarchical tasks, RACI assignments, and procurement/bidding.
- **AI Policy Console V2**: Admin-configurable AI data access policies with data domains and RoleGroup abstractions, featuring scope clamping, redaction modes, and server-side enforcement.
- **Procurement Management System**: Complete procurement module with Dashboard, Inventory, Supplier Management, Purchase Orders, and Goods Receipt, including approval roles and branch-based filtering.
- **Cost Management System**: Comprehensive product cost calculation module integrated with procurement.
- **Factory Shift & Production Planning**: Complete shift planning system with batch tracking, performance monitoring, worker assignments, kiosk PIN authentication, production/waste recording, and fault reporting.
- **Kiosk Access & Navigation**: Kiosk URLs are public, with admin-controlled "Kiosk Aç" buttons for full-screen access and an "Kiosk'tan Çık" exit button.
- **Branch QR Shift Check-in System**: HMAC-SHA256 signed dynamic QR codes for branch shift operations, with nonce-based replay protection and timestamp expiry.
- **Branch Health Score Dashboard**: 6-component deterministic scoring system with role-based scoping, time-range filters, trend indicators, and risk flags.
- **Coach Dashboard & Drill-Down**: Enhanced team progress with gate status badges, checklist completion rates, mentor onboarding tracking, and score trend indicators.
- **Guest Feedback System**: Public QR feedback form with branch-specific settings, notification integration for low ratings, SLA monitoring, and anti-abuse measures.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation varying by fault priority.
- **Notifications**: Automatic in-app alerts and email notifications; manager notifications on critical events with deduplication and throttling.
- **State Management**: TanStack Query for server state and localStorage for theme persistence.
- **Photo Upload**: Persistent storage on AWS S3 via an ObjectUploader component.
- **Backup System**: Daily automatic backups to object storage with a restore pipeline.
- **API Security**: Rate limiting via express-rate-limit. Factory RBAC for data access.
- **Transaction Safety**: Atomic operations for factory batch completion, verification, and machine self-selection using Drizzle transactions.
- **RAG Knowledge Base**: Vector-based semantic search using OpenAI embeddings.
- **Gamification**: Integrated badges, career progression, leaderboards, team competitions, adaptive difficulty, certificates, and daily learning streak tracker.
- **Mega-Module Architecture**: Each major section uses a tabbed mega-module wrapper that lazy-loads page components, with URL synchronization and code splitting.
- **Performance Optimization**: DB connection pooling, server-side in-memory caching for dashboard endpoints, database indexes on high-traffic columns, and TanStack Query garbage collection.
- **Shift Scheduling**: Fair algorithm ensuring full-time and part-time employee work hour requirements.
- **Evaluation Anti-Abuse System**: Cooldown and monthly limits on employee evaluations.
- **Reminder System**: Interval-based checks for various task and evaluation reminders with DB-based deduplication.
- **Academy V2 Implementation**: Includes Gate system, Content Pack management, My Path NBA engine, and Onboarding Studio for creating and assigning day-by-day learning paths with approval workflows.
- **Vector Auto-Refresh**: AI settings auto-triggers vector re-embed when provider changes.
- **Knowledge Base Content Pipeline**: Seed endpoints for importing academy modules, recipes, procedures, and quality specs into AI knowledge base with incremental vector generation and automatic embedding synchronization.
- **Role-Based Profile Metrics**: HQ management roles see relevant metrics, while branch/factory roles see all metrics.
- **Academy HQ Role Alignment**: HQ roles see role-appropriate Academy content and professional development paths.
- **Chart Polish**: Consistent display for count-based and pie charts, Turkish month names for date axes, and empty states.
- **Dashboard Role Routing**: Explicit dashboard mapping for HQ roles, with branch roles getting a CardGridHub with role-filtered widgets.
- **Sidebar Role Filtering**: Backend service filters sidebar menu items based on user roles and permissions.
- **Feedback Form Settings**: Seeded settings for branches with categories, photo upload, location verification, multi-language support, and anonymous defaults.
- **Feedback SLA System**: Hourly background job checks for overdue feedback responses and sends critical notifications with per-user DB-level deduplication (24h cooldown per recipient per feedback).
- **Feedback Pattern Analysis**: Weekly job analyzes 30-day category averages per branch for alerts and improvement detection.

## External Dependencies
- **OpenAI API**: Used for AI-powered vision analysis, chat completions, embeddings, and summary generation.
- **Replit Auth**: Utilized for user authentication via OpenID Connect.
- **AWS S3**: Provides cloud storage for photo uploads, backups, and persistent storage.
- **Neon Database**: A serverless PostgreSQL instance used as the primary database.
- **IONOS SMTP**: Employed for sending email notifications.