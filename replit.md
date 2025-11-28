# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across all DOSPRESSO branches, and provides robust role-based access control specifically tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, and an AI-powered knowledge base.

## Recent Changes (Session: Nov 28, 2025)

### COMPLETED: DOSPRESSO Academy MVP V1 - Career Progression System (Nov 28, Turns 1-3)

#### 1. Database Schema (✅ COMPLETE)
- **Three-table architecture**: `careerLevels`, `examRequests`, `userCareerProgress`
- **Career levels**: Stajyer → Bar Buddy → Barista → Supervisor Buddy → Supervisor (5 levels)
- **Exam requests**: Track supervisor exam proposals to HQ with approval workflow
- **User progress**: Track per-employee progression, completion rates, quiz scores

#### 2. Storage Layer (✅ COMPLETE)
- **CRUD operations**: getCareerLevels(), getExamRequests(), getUserCareerProgress(), updateExamRequest()
- **Type safety**: Full Zod schema integration for validation
- **In-memory storage**: Efficient caching with persistence support

#### 3. Frontend - Employee Dashboard (✅ COMPLETE)
- **Route `/akademi`**: Employee career path view
  - Current level badge with progress bar to next level
  - Career path visualization (5-step progression)
  - Sınav Talep button for supervisors
  - Next module preview
  - Loading + empty states

#### 4. Frontend - Supervisor Dashboard (✅ COMPLETE)
- **Route `/akademi-supervisor`**: Team management + exam request tracking
  - Ekip üyeleri tab with progress % display
  - Beklemede sınav talepleri tab with HQ status
  - Edit/Cancel buttons for pending requests
  - Real-time request status sync

#### 5. Frontend - HQ Dashboard (✅ COMPLETE)
- **Route `/akademi-hq`**: Exam approval panel (HQ-only, role-gated)
  - Beklemede tab: All pending exams with supervisor notes
  - Onaylı tab: Approved exams tracking
  - Onayla/Reddet dialogs with confirmation flow
  - Rejection reason tracking
  - Real-time sync with queue

#### 6. Backend API Endpoints (✅ COMPLETE)
- **GET `/api/academy/career-levels`** - All 5 career levels
- **GET `/api/academy/career-progress/:userId`** - User progression data
- **GET `/api/academy/exam-requests`** - List by status (pending/approved/rejected)
- **GET `/api/academy/team-members`** - Supervisor's branch team
- **POST `/api/academy/exam-request`** - Supervisor exam proposal
- **PATCH `/api/academy/exam-request/:id/approve`** - HQ approval
- **PATCH `/api/academy/exam-request/:id/reject`** - HQ rejection with reason

#### 7. Permission Model (✅ COMPLETE)
- **Server-side role checks**: isHQRole() guards on HQ endpoints
- **Frontend UI gates**: Permission-based button visibility
- **Role hierarchy**: Supervisor > Employee; HQ > All

### MVP Status
**Foundation Complete**: 3 database tables, 7 API endpoints, 3 dashboard pages (Employee/Supervisor/HQ)
**Next Phase (V2)**: Module content structure (multi-step, quiz, scenario), AI Motor integration, Gamification system

### COMPLETED: AI-Powered Training System - Full Implementation (Nov 28)

#### 1. Database & Storage (✅ COMPLETE)
- **Three-table architecture**: training_materials, training_assignments, training_completions
- **Storage layer**: All CRUD operations implemented with type safety
- **Zod schemas**: Validation for inserts and updates

#### 2. Frontend (✅ COMPLETE)
- **Personel Kartı Integration**: New "Eğitim Durması" tab in `/personel-detay/:id`
  - Summary stats: Total/Completed/In Progress/Overdue counts
  - Average success rate progress bar
  - List of assigned trainings with status badges
  - Loading states and empty states
- **HQ Training Assignment Page**: `/egitim-ata` page for bulk role-based assignments
  - Material selection dropdown (published materials only)
  - Target role selector (Barista, Supervisor, Coach, Teknik, etc.)
  - Due date picker for assignment deadlines
  - Permission-based access (HQ-only)
- **App.tsx Registration**: New route `/egitim-ata` → `TrainingAssign` component

#### 3. Backend API Endpoints (✅ COMPLETE)
- **POST `/api/training/materials/generate`** - AI-powered material creation from KB articles
- **GET `/api/training/materials`** - List published materials with status filtering
- **POST `/api/training/assignments`** - Bulk assign trainings to role groups
- **GET `/api/training/assignments`** - Fetch user/role-specific assignments
- **POST `/api/training/assignments/:id/complete`** - Mark completion with score
- **GET `/api/training/progress/:userId`** - User progress summary + stats
- **GET `/api/training/stats`** - HQ dashboard statistics (by role, completion rates, avg scores)

#### 4. Score Integration (✅ COMPLETE)
- Training completion (score ≥70%) triggers performance score recording
- Score calculation: `score / 100 * 20` (20-point training module contribution)
- Automatic recording to `recordPerformanceScore()` on completion

#### 5. Auto Reminders System (✅ COMPLETE)
- **Background Job**: Runs every 6 hours via `startTrainingReminderJob()`
- **Overdue Detection**: Marks assignments past due date + sends notification
- **Reminder Tracking**: 
  - Sends reminder when due within 24 hours
  - Tracks reminder count (max 3 reminders per assignment)
  - Records `lastReminderAt` timestamp
- **Notifications**: Creates in-app notifications for training_overdue and training_reminder events

### Architecture Highlights
- **AI Integration Ready**: Hook in `/api/training/materials/generate` calls `generateFlashcardsFromLesson()` and `generateQuizQuestionsFromLesson()`
- **Permission-Based**: All endpoints check HQ role for sensitive operations
- **Scalable Design**: Supports multiple material types (flashcard_set, quiz, multi_step_guide, mindmap)
- **User-Centric**: Progress tracking visible on employee cards, completion affects branch performance

### Previous Session
- **Sidebar Menu Architecture Overhaul**: Server-authoritative RBAC with static menu blueprint
- **Badge Count Fix**: Fixed `storage.countUnreadNotifications is not a function` error
- **RBAC Menu Fix**: Fixed sidebar showing HQ menu items to supervisor/branch roles
- **UI Cleanup**: Removed redundant CardDescriptions
- **System Status**: All critical systems stable - database, backup, QR scanning, notifications working

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18+ with TypeScript and Vite. It employs Shadcn/ui (New York variant, Radix UI-based) adhering to Material Design 3 principles. Styling is managed with Tailwind CSS, including dark mode support and Turkish localization. Typography features Inter for UI and Roboto for numeric data. The design prioritizes a mobile-first approach, ensuring responsiveness across tablet and desktop viewports.

### Technical Implementations
- **Frontend**: React 18, Vite, Wouter (routing), TanStack Query (state management), React Hook Form, Shadcn/ui.
- **Backend**: Node.js, Express.js, TypeScript, with Replit Auth (OpenID) and Passport.js for authentication.
- **Database**: PostgreSQL (Neon serverless) managed via Drizzle ORM (type-safe) and pgvector for embeddings.
- **Charts**: Recharts for data visualization.
- **File Upload**: Uppy integrated with AWS S3 for object storage.
- **QR Code**: html5-qrcode for scanning functionalities.
- **Background Jobs**: Node.js interval-based scheduling for tasks like SLA checks and notifications.

### Feature Specifications
- **Authentication & RBAC**: Comprehensive 14-role system with granular permissions and branch-level data filtering.
- **Equipment Management**: Full lifecycle management, including health monitoring, maintenance scheduling, and proactive logging.
- **Unified Fault System**: Creation, assignment, workflow, escalation, photo documentation, cost tracking, and QR-integrated reporting. Features intelligent routing based on `faultProtocol`.
- **SLA Monitoring**: Real-time tracking with automated breach alerts.
- **Troubleshooting System**: Editable guides (42 steps across 7 equipment types) integrated into fault reporting.
- **QR-Based Attendance**: Secure check-in/out with geofence validation, location confidence scoring, and optional WiFi SSID verification.
- **AI Integration**: AI photo verification for tasks and RAG-enabled knowledge base search.
- **HR & Shift Management**: Personnel management, leave requests, overtime, attendance, and shift planning.

### Unified Page Architecture
- **Single Detail Page per Entity**: Each major entity type has one comprehensive detail page serving as the single source of truth, accessible from all modules with consistent navigation patterns.
  - `/personel-detay/:id` - Employee details with 9 tabs (Özlük Dosyası, Disiplin, Onboarding, Görev Ata, Mesaj, Vardiya Geçmişi, Performans, Eğitim Durumu, İzin/Fazla Mesai)
  - `/subeler/:id` - Branch details with tabs for Personel, Görevler, Ekipman, Arızalar, QR & Lokasyon, plus live tracking
  - `/ekipman/:id` - Equipment details with maintenance history and fault logs
  - `/ariza-detay/:id` - Fault details with workflow, timeline, and cost tracking
  - `/gorev-detay/:id` - Task details with checklist, notes, and history tabs
  - `/egitim/:id` - Training module details with lessons, quizzes, flashcards, and progress
- **Cross-Entity Linking**: All entity references (employee names, equipment, branches) link to their respective unified detail pages for seamless navigation.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation varying by fault priority.
- **Notifications**: Automatic in-app alerts for critical events.
- **State Management**: TanStack Query for server state synchronization and localStorage for theme persistence.
- **Photo Upload**: Persistent storage of images on AWS S3 via an ObjectUploader component.
- **Fault History Display**: Displays the last 5 faults with details.
- **Backup System**: Daily automatic backups at midnight (Turkey time, UTC+3) to object storage with file verification. 11 critical tables exported (users, branches, equipment, faults, attendance, audits, feedback, tasks, etc.). Failed backups trigger admin notifications. Backup history persisted in database for easy recovery on server migration.
- **Email Notifications**: Transactional email system via SMTP for notifications, welcome emails, password resets, and alerts. Extensible for Resend integration.
- **Live Tracking**: Real-time employee location tracking with in-memory cache and automatic cleanup. Supervisors can view active branch employees. Tracks latitude, longitude, and accuracy. 5-minute activity timeout.
- **RAG Knowledge Base**: Vector-based semantic search using OpenAI embeddings. `/api/knowledge-base/search` endpoint enables intelligent knowledge article discovery with similarity scoring and chunk-based results.

## External Dependencies

### Third-Party Services
- **OpenAI API**: AI-powered vision analysis, chat completions, and embeddings.
- **Replit Auth**: User authentication via OpenID Connect.
- **AWS S3**: Cloud storage for various uploads.
- **Neon Database**: Serverless PostgreSQL instance.
- **IONOS SMTP**: Email notification service.

### Key NPM Packages
- **UI**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `lucide-react`.
- **Data**: `@tanstack/react-query`, `drizzle-orm`, `zod`.
- **Forms**: `react-hook-form`, `@hookform/resolvers`.
- **Charts**: `recharts`.
- **Auth**: `passport`, `openid-client`, `express-session`.
- **QR**: `html5-qrcode`, `qrcode.react`.
- **Upload**: `@uppy/core`, `@uppy/react`, `@uppy/aws-s3`.
- **Build**: `vite`, `esbuild`, `tsx`.
