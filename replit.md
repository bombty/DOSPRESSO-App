# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across DOSPRESSO branches, and offers robust role-based access control tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, an AI-powered knowledge base, and a comprehensive Learning Management System (LMS) called DOSPRESSO Academy, featuring gamification, analytics, and certification. The project's ambition is to improve operational efficiency and standardisation across all franchise locations.

## User Preferences
Preferred communication style: Simple, everyday language. Turkish language communication preferred. Fast implementation in Build mode, continues with "devam" frequently.

## Recent Session Summary (Dec 16, 2025 - Critical Shift Planning System Fixes)
✅ **CRITICAL Bug Fixes & AI Coverage Guarantee**:
  - BUG FIX 1: Vardiya sıfırlama NaN hatası - Express route order problem
    - DELETE /api/shifts/reset-weekly MUST be before DELETE /api/shifts/:id 
    - Added isNaN validation in both endpoints
    - routes.ts: Lines 11584-11617 (:id endpoint repositioned AFTER reset-weekly)
  
  - BUG FIX 2: AI sadece 1-2 personel planlaması → **TÜMMM TÜM PERSONELLER PLANLANDI**
    - Coverage validation + filler logic eklendi (routes.ts: lines 11779-11826)
    - AI response sonrası: Hangi personeller planlı, hangileri yok → Eksik personellere otomatik vardiya ata
    - Filler shifts: Her eksik personele en az 1 vardiya garantili
    - Logging: Coverage gap detection + filler shift assignments
  
  - FEATURE: Personel renkleri - Her personele unique renk (10 renk paleti)
    - getEmployeeColor(employeeId) hash function: consistent color per employee
    - 10 color palette with dark mode support
    - client/src/pages/vardiya-planlama.tsx: Lines 17-55
  
  - AI Prompt Update: "HER personeli en az 1-2 kez haftada planlama"
    - server/ai.ts: Lines 1029-1037
  
  - Files Modified: server/routes.ts (route reorder + coverage logic), server/ai.ts (prompt), client/src/pages/vardiya-planlama.tsx (colors)

## Previous Session Summary (Dec 12, 2025)
✅ **İzin Yönetimi ve Resmi Tatiller Sistemi** - Comprehensive leave and holiday management:
  - Database Tables: employee_leaves, public_holidays, leave_records
  - API Endpoints: GET/POST /api/employee-leaves, GET/POST /api/public-holidays (RBAC: HQ/admin only)
  - New HR Tab: "İzinler" tab in /ik page for HQ/admin users (visible to both)
  - LeaveManagementSection component with two-card layout
  - Leave balances: Progress bars showing used/remaining days, carried-over days display
  - Public holidays: 14 Turkish holidays for 2025 with countdown badges
  - Year selector dropdown for filtering by year (2024-2026)
  - Test data seeding: 41 employee leave balances, 14 holidays
  - System Health Check API: GET /api/system-health-check
  - Mesai Verileri: 1354 shifts + 1000 attendance records (Nov-Dec 2024)

## Previous Session (Dec 11, 2025)
✅ **New Shop Opening Management System** - Comprehensive 7-phase workflow tracking for franchise openings:
  - Phase Sub-Tasks: Hierarchical task tree with categories (Mobilya → Masa, Sandalye, etc.)
  - RACI Team Assignments: Responsible, Accountable, Consulted, Informed role matrix
  - Procurement/Bidding System: Vendor proposals, price comparison, winner selection
  - Enhanced Phase Modal: 4-tab interface (Genel, Görevler, Ekip, Tedarik)
  - Database Tables: phase_assignments, phase_sub_tasks, procurement_items, procurement_proposals
  - 19 New API Endpoints: Full CRUD for subtasks, assignments, and procurement

✅ **Phase Cards Enhancement** (Dec 11, 2025 - Session 2):
  - Phase cards in grid view with progress bars and status badges
  - "Faz Ekle" button for creating new phases with title, type, color, target date
  - Phase editing: title, status, progress, color, date in "Genel" tab
  - RACI R/A users shown on phase cards (Responsible=blue, Accountable=green badges)
  - Authorization: HQ roles, admin, and project owners have full access
  - Conditional button visibility based on canManageProject check
  - Backend helper functions: checkProjectAccess(), checkProjectAccessByPhaseId()

**Routes Added:**
- /projeler - Tabbed projects page with "Tüm Projeler" and "Yeni Şube Açılış" tabs
- /yeni-sube-detay/:id - Project detail with enhanced phase management

## Previous Session (Dec 10, 2025 - Evening)
✅ **Equipment Model Number** - Added model number field to equipment create and edit forms
✅ **Equipment Service Contact Management** - HQ-only service company contact info fields (name, phone, email, address, handled-by) in equipment edit form
✅ **Professional Fault Report Export** - PDF generation with DOSPRESSO branding + copy to clipboard functionality
✅ **AI Settings Admin Page** - Provider selection with secure API key storage
✅ **Banner System with Photo Upload** - ObjectUploader integration + responsive display
✅ **All Systems Healthy** - Backend HEALTHY, workflows running

## Earlier Session (Dec 10, 2025 - Morning)
✅ **Admin Email Settings** - WordPress-style SMTP configuration page with test email capability
✅ **Admin Banner Management** - Create/edit/delete banners with date ranges, role targeting, and active/inactive status
✅ **Project Task Detail Page** - Full task detail view with subtasks, dependencies, comments, and status management
✅ **Milestones System** - Complete milestone management with add/complete functionality
✅ **Calendar View** - Monthly calendar showing tasks and milestones

## Previous Session (Dec 9, 2025)
✅ Global Search, PWA Implementation, Type Safety Fixes, E2E Raporlar optimization

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
- **Checklist Management System**: Time-windowed checklist tasks with HQ/Supervisor editable time slots, photo validation, manager notifications on completion, 40% performance weight in composite scoring, and daily reminders with status tracking.
- **Recipe Management System**: Supports 14 categories and 55+ recipes with two cup sizes (MASSIVO 350ml, LONG DIVA 550ml), each with separate measurements and preparation steps, and automatic version tracking.
- **Quiz System**: Features MCQ and True/False question types, dynamic option management, points, explanations, 24-hour cooldown on failure, attempt tracking, and a maximum of 3 attempts.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation varying by fault priority.
- **Notifications**: Automatic in-app alerts and email notifications; manager notifications on checklist completion and task status changes.
- **State Management**: TanStack Query for server state and localStorage for theme persistence.
- **Photo Upload**: Persistent storage on AWS S3 via an ObjectUploader component.
- **Backup System**: Daily automatic backups to object storage.
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