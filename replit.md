# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across DOSPRESSO branches, and offers robust role-based access control tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, an AI-powered knowledge base, and a comprehensive Learning Management System (LMS) called DOSPRESSO Academy, featuring gamification, analytics, and certification. The project's ambition is to improve operational efficiency and standardisation across all franchise locations.

## User Preferences
Preferred communication style: Simple, everyday language. Turkish language communication preferred. Fast implementation in Build mode, continues with "devam" frequently.

## System Architecture
### UI/UX Decisions
The frontend utilizes React 18+ with TypeScript and Vite, employing Shadcn/ui (New York variant, Radix UI-based) and Material Design 3 principles. Styling is managed with Tailwind CSS, including dark mode and Turkish localization. Typography is set to Inter for UI elements and Roboto for numeric data. The design prioritizes a mobile-first, responsive approach with compact, touch-friendly interactions optimized for vertical screens. All cards utilize semantic tokens for consistent theming. The application consistently uses a responsive grid pattern: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3` for item cards and `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3` for stat cards.

### Technical Implementations
- **Frontend**: React 18, Vite, Wouter (routing), TanStack Query (state management), React Hook Form, Shadcn/ui.
- **Backend**: Node.js, Express.js, TypeScript, with Replit Auth (OpenID) and Passport.js for authentication.
- **Database**: PostgreSQL (Neon serverless) via Drizzle ORM (type-safe) and pgvector for embeddings.
- **Charts**: Recharts for data visualization.
- **File Upload**: Uppy integrated with AWS S3.
- **QR Code**: html5-qrcode for scanning + global modal from all pages.
- **Background Jobs**: Node.js interval-based scheduling for tasks like SLA checks, notifications, maintenance reminders, and backup.
- **Notifications**: In-app + email async notifications with manager alerts on critical events.

### Feature Specifications
- **Authentication & RBAC**: A 14-role system with dual-layer granular permissions (module-level view/edit toggles + action-level scope control) and branch-level data filtering. The module authorization system at `/admin/yetkilendirme` supports 54 permission modules and 53 granular actions with scope-based access (self/branch/global) for sensitive data like payroll and salary information.
- **Equipment Management**: Comprehensive lifecycle management, health monitoring, maintenance scheduling, and service contact management.
- **Unified Fault System**: Creation, assignment, workflow, escalation, photo documentation, cost tracking, and QR-integrated reporting with intelligent routing and professional PDF export.
- **SLA Monitoring**: Real-time tracking with automated breach alerts.
- **Troubleshooting System**: Editable guides integrated into fault reporting.
- **QR-Based Attendance**: Secure check-in/out with geofence validation and location confidence scoring.
- **Lost & Found System**: Found item tracking, photo capture, handover documentation, and owner details with cross-branch visibility.
- **AI Integration**: AI photo verification for tasks, RAG-enabled knowledge base search, AI Academy Chat Assistant, Adaptive Learning Engine, and AI-powered smart recommendations.
- **HR & Shift Management**: Personnel management, leave requests, overtime, attendance, AI-powered fair shift planning with coverage guarantees, and comprehensive leave/public holiday management.
- **Enhanced Analytics Dashboard**: Tabbed interface showing daily/weekly/monthly metrics with AI-generated summaries.
- **DOSPRESSO Academy (LMS)**: A comprehensive training system including career progression, quiz system, gamification, certification, AI learning paths, and advanced analytics.
- **Checklist Management System**: Time-windowed tasks with HQ/Supervisor editable time slots, photo validation, manager notifications, performance weighting, and daily reminders.
- **Recipe Management System**: Supports 14 categories and 55+ recipes with two cup sizes, separate measurements/steps, and automatic version tracking.
- **Quiz System**: MCQ and True/False questions, dynamic options, points, explanations, cooldowns, and attempt tracking.
- **New Shop Opening Management System**: A 7-phase workflow tracking for franchise openings with hierarchical tasks, RACI assignments, and procurement/bidding.
- **Admin Features**: Email settings (SMTP), banner management with photo upload, AI settings, project task detail pages, and milestone management.
- **Global Search & Calendar View**: Functionality for finding information across the platform and visualizing tasks/milestones.
- **Unified Dashboard Alert System**: Real-time alerts for both branch and factory dashboards via `dashboard_alerts` table. Supports 12 trigger types (late clock-in, quality issues, production delays, missing staff, etc.) with severity levels (critical/warning/info) and visual feedback (color-coded cards, pulsing banners for critical). API endpoints at `/api/alerts/:context/:contextId` for CRUD operations with acknowledge/resolve/dismiss workflows.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation varying by fault priority.
- **Notifications**: Automatic in-app alerts and email notifications; manager notifications on critical events.
- **State Management**: TanStack Query for server state and localStorage for theme persistence.
- **Photo Upload**: Persistent storage on AWS S3 via an ObjectUploader component.
- **Backup System**: Daily automatic backups to object storage.
- **Live Tracking**: Real-time employee location tracking with in-memory cache for supervisors. Dashboard at `/canli-takip` with 30-second auto-refresh, role-based branch access (HQ sees all, branch roles see own branch only), and coordinate masking for privacy.
- **RAG Knowledge Base**: Vector-based semantic search using OpenAI embeddings.
- **Gamification**: Integrated badges, career progression, leaderboards, team competitions, adaptive difficulty, certificates, and daily learning streak tracker.
- **Layout System**: Responsive flex-based layouts with standardized gaps.
- **Dashboard Hub**: `CardGridHub` displays 8 mega-module cards organized into: Operations, Equipment & Maintenance, Personnel & HR, Training & Academy, Kitchen & Recipes, Reports & Analytics, New Shop Opening, and Management & Settings. Each mega-module groups related menu sections and navigates to `/modul/:moduleId` for sub-module access. Empty mega-modules display with muted styling.
- **Shift Scheduling**: Fair algorithm ensuring full-time employees work minimum 6 days/week at 45 hours, part-time 3 days/25 hours.
- **Analytics Architecture**: Three-period tabbed interface with real-time metric aggregation, AI-powered summaries (OpenAI gpt-4o-mini), and conditional alerts.
- **Checklist Scoring**: 40% weight in compositeScore, max score 4/5 if not on-time, scored by supervisor, daily reminders active.
- **Reminder System**: 5-minute interval checks for task reminders, overdue notifications, maintenance alerts, and checklist completion reminders.
- **Branch Dashboard**: Comprehensive dashboard at `/sube/dashboard` with real-time stats (active staff, breaks, total work time), alert management, kiosk mode access, tabs for shifts/tasks/checklists/daily summary, and quick access buttons. Supports both regular user authentication and branch-specific login sessions via sessionStorage.

## External Dependencies
### Third-Party Services
- **OpenAI API**: Used for AI-powered vision analysis, chat completions, embeddings, and summary generation.
- **Replit Auth**: Utilized for user authentication via OpenID Connect.
- **AWS S3**: Provides cloud storage for photo uploads, backups, and persistent storage.
- **Neon Database**: A serverless PostgreSQL instance used as the primary database.
- **IONOS SMTP**: Employed for sending email notifications.