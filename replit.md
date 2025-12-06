# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across DOSPRESSO branches, and offers robust role-based access control tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, an AI-powered knowledge base, and a comprehensive Learning Management System (LMS) called DOSPRESSO Academy, featuring gamification, analytics, and certification. The project's ambition is to improve operational efficiency and standardisation across all franchise locations.

## User Preferences
Preferred communication style: Simple, everyday language. Turkish language communication preferred. Fast implementation in Build mode, continues with "devam" frequently.

## Recent Changes (December 6, 2025 - TURN 19 Complete - Task Rating System)
- ✅ **TURN 19 - Dual Rating System for Tasks**:
  * New database tables: task_ratings, checklist_ratings, employee_overall_performance
  * Backend penalty logic: Late task completions automatically capped at 4 stars maximum
  * StarRating component with interactive 1-5 star selection and hover effects
  * Disabled stars for late tasks with tooltip explanation
  * Task detail page: Rating dialog for assigners to rate completed tasks
  * Personnel detail page: "Görev Memnuniyeti" card in Performance tab showing:
    - Overall composite score (0-100)
    - Task rating average with star display
    - Checklist score average
    - Total evaluation count
    - Recent ratings table with task links
  * New API endpoints: GET/POST /api/tasks/:id/rating, GET /api/users/:id/satisfaction-score
  * Authorization: Only task assigners can rate completed tasks
  * Unique constraint prevents duplicate ratings per task
- ✅ **Previous Changes (December 6, 2025 - TURN 18 Complete)**
- ✅ **TURN 18 - Task Workflow Refinement & Quick Actions**:
  * Removed task completion buttons from popup (only quick actions remain)
  * Added auto-acknowledge logic: Tasks marked "Gördüm" automatically when popup/detail opened
  * Added explicit "Not Ekle" button in popup for quick note submission
  * Removed "Gördüm" button from detail page (auto-acknowledge on open)
  * Photo upload fully independent - no longer triggers task completion
  * Implemented clean workflow: Quick actions in popup → Completion only on detail page
  * Auto-acknowledge checks: assignee verification, not already acknowledged, status validation
- ✅ **Previous Changes (December 6, 2025 - TURN 17 Complete - Task Page Dynamic Stats & Branch Filter)**
- ✅ **TURN 17 - Task Page Dynamic Statistics & Branch Filter** (/tasklar):
  * Stat cards (Gecikmiş, Bekleyen, Devam Eden, Tamamlanan, Tamamlanmayan) now update dynamically based on active filters
  * Stats respect: "Bana Atanan" filter, "Atadıklarım" filter, and "Şubeler" (branch) filter
  * Example: "Bana Atanan" + "Bekleyen" shows different count than "Atadıklarım" + "Bekleyen"
  * New Popover + Command pattern for branch selection with Building2 icon
  * Branch selector button shows "Şubeler" (default) or "Şube: {name}" when selected
  * "Tümü" option to reset branch filter
  * HQ-only visibility for branch selector
  * Consistent button styling with assignment filter buttons
- ✅ **HQ Branch Task Performance Dashboard** (/sube-gorevler/:id):
  * Performance score gauge (0-100) with color-coded status (Red/Amber/Green)
  * KPI grid showing: Total Tasks, On-Time Rate %, Failure Rate %, Overdue Tasks
  * Time metrics: Avg acknowledgment time (minutes), Avg completion time (hours)
  * Status summary: Pending, In Progress, Completed, Failed counts
  * 4-week trend chart showing weekly completions and failures
  * Transparent score calculation info (40% on-time, 20% overdue, 15% failure, 15% ack time, 10% completion speed)
- ✅ **New API Endpoint**: GET /api/branches/:id/task-stats
  * HQ role-based authorization
  * Calculates all performance metrics from branch tasks
- ✅ **Storage Method**: getBranchTaskStats(branchId)
  * Comprehensive metrics calculation with weighted scoring algorithm
- ✅ **Navigation Integration**:
  * New route /sube-gorevler/:id in App.tsx
  * "Görev Performansı" button in branch detail page (visible to HQ only)
- ✅ **Previous Achievement (TURN 15)**:
  * Complete Task Lifecycle Implementation:
  * Acknowledgment workflow: Assignees must mark tasks as "Gördüm" (Seen)
  * Status progression: beklemede → devam_ediyor → onaylandi/basarisiz
  * Failure notes: Required explanation when marking task as failed
  * Status history: Complete audit trail with timestamps and actors
- ✅ **New Database Schema**:
  * tasks table: acknowledgedAt, acknowledgedById, failureNote, statusUpdatedAt, statusUpdatedById
  * taskStatusHistory table: Complete audit trail for all status changes
- ✅ **New API Endpoints**:
  * PATCH /api/tasks/:id/acknowledge - Mark task as seen
  * POST /api/tasks/:id/status - Update status with optional failure note
  * GET /api/tasks/:id/history - Get complete status history
- ✅ **Task Detail Page Enhancements**:
  * Action buttons: Gördüm, Başladım, Tamamlandı, Tamamlanamadı
  * Failure dialog with required note input
  * Status timeline showing complete history
  * Acknowledgment and failure state display with icons
- ✅ **Task List Improvements**:
  * Eye/EyeOff icons showing acknowledgment status
  * "Başarısız" status with red destructive badge
  * Görülmedi indicator for unacknowledged tasks
- ✅ **Previous Achievement (TURN 14)**:
  * Tasks page UI optimization with compact grid layout
  * Clickable status filter cards
  * Simplified tab navigation

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
