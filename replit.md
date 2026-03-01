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
- **AI Integration**: AI photo verification for tasks, RAG-enabled knowledge base search (79 articles, 124 embedding chunks), AI Academy Chat Assistant, Adaptive Learning Engine, and AI-powered smart recommendations.
- **DOSPRESSO Academy (LMS)**: Comprehensive training system including career progression, quiz system, gamification, certification, AI learning paths, advanced analytics, and KPI-driven training recommendations.
- **Daily Task Guidance**: Role-based task templates with personalized task lists, completion tracking, and AI-powered recommendations.
- **Advanced Task Workflow**: Enhanced task lifecycle with assignee-assigner approval, Q&A, deadline extension, scheduled delivery, bulk assignment, subtask management, and expanded checker/verifier system with group chat.
- **Checklist Management System**: Time-windowed tasks with HQ/Supervisor editable time slots, photo validation, manager notifications, performance weighting, and daily reminders.
- **Recipe Management System**: 10 DOSPRESSO categories with 145+ product recipes, including automatic version tracking with trainer update notification, and AI Recipe Creation.
- **New Shop Opening Management System**: A 7-phase workflow tracking for franchise openings with hierarchical tasks, RACI assignments, and procurement/bidding.
- **AI Policy Console V2**: Admin-configurable AI data access policies with 12 data domains and 6 RoleGroup abstractions, featuring scope clamping, redaction modes, and server-side enforcement.
- **Procurement Management System**: Complete procurement module with Dashboard, Inventory, Supplier Management, Purchase Orders, and Goods Receipt.
- **Cost Management System**: Comprehensive product cost calculation module integrated with procurement.
- **Factory Shift & Production Planning**: Complete shift planning system with batch tracking, performance monitoring, and worker assignments. Kiosk PIN auth (bcrypt, 3-attempt lockout), 9 stations, production/waste recording with photo upload, shift compliance scoring, collaborative production scoring, and fault reporting.
- **Factory Kiosk Security**: All kiosk endpoints protected with isKioskAuthenticated middleware. Quality review restricted to authorized roles (admin, fabrika_mudur, fabrika_sorumlu, inspector) with mandatory rejection reason. Task completion (gorev_bitis) separated from shift closure (vardiya_kapat).
- **Branch Health Score Dashboard**: 5-component deterministic scoring system with role-based scoping, time-range filters, trend indicators, and risk flags.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation varying by fault priority.
- **Notifications**: Automatic in-app alerts and email notifications; manager notifications on critical events.
- **State Management**: TanStack Query for server state and localStorage for theme persistence.
- **Photo Upload**: Persistent storage on AWS S3 via an ObjectUploader component.
- **Backup System**: Daily automatic backups to object storage with a restore pipeline.
- **API Security**: Rate limiting via express-rate-limit. Factory RBAC for data access.
- **Transaction Safety**: Atomic operations for factory batch completion, verification, and machine self-selection using Drizzle transactions.
- **RAG Knowledge Base**: Vector-based semantic search using OpenAI embeddings.
- **Gamification**: Integrated badges, career progression, leaderboards, team competitions, adaptive difficulty, certificates, and daily learning streak tracker.
- **Mega-Module Architecture**: Each major section uses a tabbed mega-module wrapper that lazy-loads page components, with URL synchronization.
- **Shift Scheduling**: Fair algorithm ensuring full-time employees work minimum 6 days/week at 45 hours, part-time 3 days/25 hours.
- **Evaluation Anti-Abuse System**: 24-hour cooldown between evaluations of same employee, monthly max 2 evaluations per evaluator-employee pair.
- **Reminder System**: 5-minute interval checks for various task and evaluation reminders with DB-based deduplication.
- **Academy V2 Implementation**: Includes Gate system, Content Pack management, My Path NBA engine, and Onboarding Studio for creating and assigning day-by-day learning paths with approval workflows. Role-based UI separation and RBAC.
- **Bulk Equipment Knowledge**: Endpoint for generating type-level AI knowledge entries for all equipment categories.
- **Vector Auto-Refresh**: AI settings auto-triggers vector re-embed when provider changes (with toggle switch).
- **Knowledge Base Content Pipeline**: Seed endpoints for importing academy modules, recipes, procedures, and quality specs into AI knowledge base with incremental vector generation. Full CRUD with automatic embedding sync on create/update/delete.

## Completed UX Audit Sprints
- **Sprint 1**: Breadcrumb Turkish locale, audit UUID→name, SMTP validation, test data cleanup, header role labels, kampanya tab hide, gate defaults, 0/0 paradox
- **Sprint 2**: Navigation consolidation (Ekipman Servis + Servis Talepleri merged, İçerik → İçerik Stüdyosu hub, header simplified, N+1 query fix, notification dedup per-user)
- **Sprint 3**: Tab overflow gradient indicators, empty state CTAs, PIN lockout notifications, date-utils.ts Turkish locale, CGO dashboard Turkish chars, breadcrumb PATH_LABELS
- **Sprint 4**: Bulk equipment knowledge generation endpoint + UI, vector auto-refresh on provider change, manual backup restore point, final validation

## External Dependencies
- **OpenAI API**: Used for AI-powered vision analysis, chat completions, embeddings, and summary generation.
- **Replit Auth**: Utilized for user authentication via OpenID Connect.
- **AWS S3**: Provides cloud storage for photo uploads, backups, and persistent storage.
- **Neon Database**: A serverless PostgreSQL instance used as the primary database.
- **IONOS SMTP**: Employed for sending email notifications.