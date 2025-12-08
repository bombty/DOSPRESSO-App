# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across DOSPRESSO branches, and offers robust role-based access control tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, an AI-powered knowledge base, and a comprehensive Learning Management System (LMS) called DOSPRESSO Academy, featuring gamification, analytics, and certification. The project's ambition is to improve operational efficiency and standardisation across all franchise locations.

## User Preferences
Preferred communication style: Simple, everyday language. Turkish language communication preferred. Fast implementation in Build mode, continues with "devam" frequently.

## Recent Changes (December 8, 2025)
- ✅ **TURN 28-29 - Notification System Full Recovery (COMPLETED)**:
  * **Emergency Recovery**: Fixed 1057 LSP errors caused by sed command corruption
  * **Notification Schema**: Standardized to use `link` field (removed broken `data` & `actionUrl`)
  * **Supervisor Notifications**: Fixed task assignment notifications to supervisors/supervisor_buddies
  * **Manager Alerts**: HQ admin notifications on task completion ready for review
  * **Task Status Notifications**: Verified/rejected task notifications with email async support
  * **Reminders System**: Fixed overdue task & maintenance reminder notifications (server/reminders.ts)
  * **Time Window Validation**: Active (TIME_WINDOW_VIOLATION check in place)
  * **Photo Requirements**: Schema support ready (requiresPhoto field + validation logic)
  * **Checklist Reminders**: Daily checklist completion reminders implemented & active
  * **System Health**: All backup, SLA, maintenance, and reminder systems operational
  * **Status**: ✅ **FULLY OPERATIONAL** - App stable, all features live, ready for deployment

## System Architecture
### UI/UX Decisions
The frontend utilizes React 18+ with TypeScript and Vite, employing Shadcn/ui (New York variant, Radix UI-based) and Material Design 3 principles. Styling is managed with Tailwind CSS, including dark mode and Turkish localization. Typography is set to Inter for UI elements and Roboto for numeric data. The design prioritizes a mobile-first, responsive approach with compact, touch-friendly interactions optimized for vertical screens. All cards utilize semantic tokens for consistent theming.

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
- **Authentication & RBAC**: A 14-role system with granular permissions and branch-level data filtering.
- **Equipment Management**: Comprehensive lifecycle management, health monitoring, and maintenance scheduling.
- **Unified Fault System**: Creation, assignment, workflow, escalation, photo documentation, cost tracking, and QR-integrated reporting with intelligent routing.
- **SLA Monitoring**: Real-time tracking with automated breach alerts.
- **Troubleshooting System**: Editable guides integrated into fault reporting.
- **QR-Based Attendance**: Secure check-in/out with geofence validation, location confidence scoring, global QR modal from AppHeader.
- **Lost & Found System**: Found item tracking, photo capture, handover documentation, owner name/phone, cross-branch visibility for HQ staff.
- **AI Integration**: AI photo verification for tasks, RAG-enabled knowledge base search, AI Academy Chat Assistant, Adaptive Learning Engine, and AI-powered smart recommendations.
- **HR & Shift Management**: Personnel management, leave requests, overtime, attendance, and AI-powered fair shift planning.
- **Enhanced Analytics Dashboard**: Tabbed interface showing daily/weekly/monthly metrics with AI-generated summaries.
- **DOSPRESSO Academy (LMS)**: A comprehensive training system including career progression, quiz system, gamification (leaderboard, badges), certification, AI learning paths, and advanced analytics.
- **Checklist Management System**: Time-windowed checklist tasks with HQ/Supervisor editable time slots (taskTimeStart/taskTimeEnd), photo validation (requiresPhoto field), manager notifications on completion, 40% performance weight in composite scoring, and daily reminders with status tracking.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation varying by fault priority.
- **Notifications**: Automatic in-app alerts and email notifications; manager notifications on checklist completion and task status changes.
- **State Management**: TanStack Query for server state and localStorage for theme persistence.
- **Photo Upload**: Persistent storage on AWS S3 via an ObjectUploader component.
- **Backup System**: Daily automatic backups to object storage (verified: 441 records backed up, 11/11 tables).
- **Live Tracking**: Real-time employee location tracking with in-memory cache for supervisors.
- **RAG Knowledge Base**: Vector-based semantic search using OpenAI embeddings.
- **Gamification**: Integrated badges, career progression, leaderboards, team competitions, adaptive difficulty, certificates, and daily learning streak tracker.
- **Layout System**: Responsive flex-based layouts with standardized gaps.
- **Dashboard Hub**: `CardGridHub` displays role-based module cards with alerts and quick actions.
- **Shift Scheduling**: Fair algorithm ensuring fulltime employees work minimum 6 days/week at 45 hours, parttime 3 days/25 hours.
- **Analytics Architecture**: Three-period tabbed interface with real-time metric aggregation, AI-powered summaries (OpenAI gpt-4o-mini), and conditional alerts.
- **Checklist Scoring**: 40% weight in compositeScore, max score 4/5 if not on-time, scored by supervisor, daily reminders active.
- **Reminder System**: 5-minute interval checks for task reminders, overdue notifications, maintenance alerts, and checklist completion reminders.

## External Dependencies
### Third-Party Services
- **OpenAI API**: Used for AI-powered vision analysis, chat completions, embeddings, and summary generation.
- **Replit Auth**: Utilized for user authentication via OpenID Connect.
- **AWS S3**: Provides cloud storage for photo uploads, backups, and persistent storage.
- **Neon Database**: A serverless PostgreSQL instance used as the primary database.
- **IONOS SMTP**: Employed for sending email notifications.

## Deployment Status
✅ **Ready for Production** - All systems operational and tested:
- Express server running on port 5000
- Vite frontend development server active
- Database: Connected and healthy
- Backup system: Automated and verified
- Notification system: All channels working
- Reminder jobs: Running every 5 minutes
- SLA monitoring: Active (15-minute checks)
- Admin verified and system health HEALTHY
