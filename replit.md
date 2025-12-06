# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across DOSPRESSO branches, and offers robust role-based access control tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, an AI-powered knowledge base, and a comprehensive Learning Management System (LMS) called DOSPRESSO Academy, featuring gamification, analytics, and certification. The project's ambition is to improve operational efficiency and standardisation across all franchise locations.

## User Preferences
Preferred communication style: Simple, everyday language. Turkish language communication preferred. Fast implementation in Build mode, continues with "devam" frequently.

## Recent Changes (December 6, 2025 - TURN 14 Complete - Tasks Page UI Optimization)
- ✅ **Assigned Person Name Display**:
  * Task drawer now displays assignee's full name (firstName + lastName) instead of ID
  * Uses allUsers lookup for clean, user-friendly display
- ✅ **Clickable Status Filter Cards**:
  * Stat cards (Bekleyen/Devam Eden/Tamamlanmayan/Gecikmiş) are fully clickable
  * Clicking card toggles filterStatus and opens filter panel automatically
  * Ring highlighting shows active filter status
- ✅ **Compact Grid Layout**:
  * Changed from responsive (1 SM:2 MD:3) to fixed 3-column grid layout
  * Provides consistent, compact view across all screen sizes
  * Improved visual hierarchy with consistent spacing
- ✅ **Simplified Tab Navigation**:
  * Removed category-based tabs (Açılış/Kapanış/Günlük Kontrol)
  * Kept only "Tümü" (All) tab for cleaner interface
  * Removed category filtering logic from TasksPage
- ✅ **Previous Achievement (TURN 13)**:
  * Complete task notification system with deep linking
  * Supervisor task visibility (see all branch tasks)
  * Branch supervisor and HQ admin notifications
  * Overdue task reminders with direct task links

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
- **Lost & Found**: Complete lifecycle tracking with photo storage and cross-branch search.
- **Shift Scheduling**: AI-powered fairness algorithm respecting employment type constraints.
- **Analytics**: Tabbed three-period dashboard (daily/weekly/monthly) with AI-generated summaries.

### Feature Specifications
- **Authentication & RBAC**: A 14-role system with granular permissions and branch-level data filtering.
- **Equipment Management**: Comprehensive lifecycle management, health monitoring, and maintenance scheduling.
  * Branch users see only their branch equipment
  * Critical equipment highlighted on dashboard (health < 50%)
- **Unified Fault System**: Creation, assignment, workflow, escalation, photo documentation, cost tracking, and QR-integrated reporting with intelligent routing.
- **SLA Monitoring**: Real-time tracking with automated breach alerts.
- **Troubleshooting System**: Editable guides integrated into fault reporting.
- **QR-Based Attendance**: Secure check-in/out with geofence validation, location confidence scoring, global QR modal from AppHeader.
- **Lost & Found System**: Found item tracking, photo capture, handover documentation, owner name/phone, cross-branch visibility for HQ staff.
- **AI Integration**: AI photo verification for tasks, RAG-enabled knowledge base search, AI Academy Chat Assistant, Adaptive Learning Engine, and AI-powered smart recommendations.
- **HR & Shift Management**: Personnel management, leave requests, overtime, attendance, and shift planning.
  * Shift Status Card: Real-time display of today's shift, check-in/check-out times, hours worked
  * Shift Checklist Card: Daily checklist completion with progress tracking
  * Analytics Card: Three-period dashboard with AI summaries
  * Quick task creation for rapid workflow
- **Enhanced Analytics Dashboard**: Tabbed interface showing:
  * **Daily**: Pending tasks, active faults, overdue checklists, critical equipment, equipment health %
  * **Weekly**: Weekly hours, completed/pending tasks, active faults, shift count
  * **Monthly**: Total tasks/faults, completed/resolved counts, monthly maintenance costs
  * AI-generated summaries for each period highlighting key metrics
- **DOSPRESSO Academy (LMS)**: A comprehensive training system including career progression (5 levels), quiz system with leaderboard, badge/achievement system, difficulty progression, AI-generated quiz recommendations, supervisor exam approval workflow, performance analytics, branch-level analytics, team competitions, certification system, cohort analytics, AI learning paths, student progress overview dashboard, daily learning streak tracker, social collaboration (study groups, peer learning, mentorship), and advanced analytics dashboard.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation varying by fault priority.
- **Notifications**: Automatic in-app alerts for critical events and email notifications via SMTP.
- **State Management**: TanStack Query for server state synchronization and localStorage for theme persistence.
- **Photo Upload**: Persistent storage of images on AWS S3 via an ObjectUploader component.
- **Backup System**: Daily automatic backups to object storage with file verification and admin notifications.
- **Live Tracking**: Real-time employee location tracking with in-memory cache for supervisors.
- **RAG Knowledge Base**: Vector-based semantic search using OpenAI embeddings.
- **Gamification**: Integrated badges (6 types), career progression (5 levels), leaderboards (global, branch, exam), team competitions, adaptive difficulty, certificates, and daily learning streak tracker.
- **Layout System**: Responsive flex-based layouts with standardized gaps (3/4 scale on mobile/desktop)
- **Dashboard Hub**: CardGridHub component displays role-based module cards with equipment health alerts, quick actions, and real-time shift/checklist/analytics integration
- **Shift Scheduling**: Fair algorithm ensuring fulltime employees work minimum 6 days/week at 45 hours, parttime 3 days/25 hours
- **Analytics Architecture**: Three-period tabbed interface with:
  * Real-time metric aggregation
  * AI-powered summaries using OpenAI gpt-4o-mini
  * Conditional alerts for critical metrics (red for faults/checklists, yellow for pending)
  * Responsive grid layout with semantic tokens

## External Dependencies
### Third-Party Services
- **OpenAI API**: Used for AI-powered vision analysis, chat completions, embeddings, and summary generation.
- **Replit Auth**: Utilized for user authentication via OpenID Connect.
- **AWS S3**: Provides cloud storage for photo uploads, backups, and persistent storage.
- **Neon Database**: A serverless PostgreSQL instance used as the primary database.
- **IONOS SMTP**: Employed for sending email notifications.

## Code Quality Metrics (Current - TURN 11)
- **Build Status**: ✅ Succeeds
- **Runtime Status**: ✅ All systems operational
- **LSP Diagnostics**: 344 warnings (pre-existing, type-safety, non-breaking; 320 in routes, 24 in ai)
- **Hardcoded Colors (Pages)**: 0 (100% migrated to semantic tokens)
- **Console Logs (Pages)**: 0 (all cleaned)
- **Responsive Layout**: 100% (flex-based, mobile-optimized)
- **Component Count**: 
  * Core Dashboard: `CardGridHub`, `QuickTaskModal`, `ShiftStatusCard`, `ShiftChecklistCard`, `EnhancedAnalyticsCard`
  * QR System: `QRScannerModal` (global, accessible from all pages)
  * Analytics: Enhanced tabbed three-period system with AI summaries and employee performance
  * All with data-testid attributes for testing
- **Dashboard**: ✅ 100% complete with equipment monitoring, shift tracking, checklist management, quick task creation, real-time analytics (daily/weekly/monthly)
- **API Endpoints**: ✅ 3 analytics endpoints with employee performance tracking
- **Quick Task Modal**: ✅ Role-based task assignment hierarchy
- **Services**: ✅ AI Summary service complete with smart fallback
