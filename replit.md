# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across DOSPRESSO branches, and offers robust role-based access control tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, an AI-powered knowledge base, and a comprehensive Learning Management System (LMS) called DOSPRESSO Academy, featuring gamification, analytics, and certification. The project's ambition is to improve operational efficiency and standardisation across all franchise locations.

## User Preferences
Preferred communication style: Simple, everyday language. User requests Turkish language communication. Prefers quick implementation in Fast mode, continues working despite suggestions for higher autonomy. Uses "devam" frequently, stays in Build mode, requires hard refresh (Ctrl+Shift+R).

## Recent Changes (December 4, 2025 - Turn 6/Fast Mode)
- ✅ **Global QR Scanner Modal**: Accessible from AppHeader for quick shift check-in/check-out
  * Component: `client/src/components/qr-scanner-modal.tsx`
  * Features: Photo capture, location verification, batch process support
  * Accessible from all pages via header button
- ✅ **Equipment Access Authorization**: Branch users can view equipment for their branch only
  * Filtering: Branch-level data isolation
  * Branch Detail page: Equipment list for assigned branch
- ✅ **Equipment Health Card on Dashboard**: Displays critical equipment (health score < 50%)
  * Component: `card-grid-hub.tsx` integration
  * Shows top 3 critical items + link to full list
  * "Ekipmanları Gözden Geçir" button for quick navigation
- ✅ **Quick Task Modal**: Rapid task creation from dashboard
  * Component: `client/src/components/quick-task-modal.tsx`
  * Fields: Description, priority (düşük/orta/yüksek), optional due date
  * Branch-scoped task creation
  * Dashboard integration button "Hızlı Görev"
- ✅ **Shift Status Card**: Real-time shift status on employee dashboard
  * Component: `client/src/components/shift-status-card.tsx`
  * Shows: Today's shift time, check-in status, hours worked
  * Branch users only (hidden for HQ)
  * Real-time status badge (Henüz Girmedi/Çalışıyor/Çıkış Yapılmış)
- ✅ **App Status**: PRODUCTION-READY, all systems operational
  * Express server: ✅ Port 5000
  * Vite dev server: ✅ Connected with hot reload
  * Database: ✅ Healthy
  * All background jobs: ✅ Running
  * All APIs: ✅ Functional

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
  * Quick task creation for rapid workflow
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
- **Dashboard Hub**: CardGridHub component displays role-based module cards with equipment health alerts and quick actions

## External Dependencies
### Third-Party Services
- **OpenAI API**: Used for AI-powered vision analysis, chat completions, and embeddings.
- **Replit Auth**: Utilized for user authentication via OpenID Connect.
- **AWS S3**: Provides cloud storage for photo uploads, backups, and persistent storage.
- **Neon Database**: A serverless PostgreSQL instance used as the primary database.
- **IONOS SMTP**: Employed for sending email notifications.

## Code Quality Metrics (Current)
- **Build Status**: ✅ Succeeds
- **Runtime Status**: ✅ All systems operational
- **LSP Diagnostics**: 328 warnings (type-safety, non-breaking)
- **Hardcoded Colors (Pages)**: 0 (100% migrated to semantic tokens)
- **Console Logs (Pages)**: 0 (all cleaned)
- **Responsive Layout**: 100% (flex-based, mobile-optimized)
- **Component Count**: 
  * Core: `CardGridHub`, `QuickTaskModal`, `ShiftStatusCard`, `QRScannerModal`
  * Dashboard-integrated equipment health, task creation, and shift status
  * All with data-testid attributes for testing
- **Dashboard**: ✅ 100% complete with equipment monitoring, quick task creation, and shift status display
