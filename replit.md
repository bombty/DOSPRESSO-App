# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across all DOSPRESSO branches, and provides robust role-based access control specifically tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, and an AI-powered knowledge base, alongside a comprehensive Academy module for career progression, quizzes, and badge achievements.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18+ with TypeScript and Vite. It employs Shadcn/ui (New York variant, Radix UI-based) adhering to Material Design 3 principles. Styling is managed with Tailwind CSS, including dark mode support and Turkish localization. Typography features Inter for UI and Roboto for numeric data. The design prioritizes a mobile-first approach, ensuring responsiveness across tablet and desktop viewports. The system uses a unified page architecture, where each major entity (e.g., Employee, Branch, Equipment) has a single, comprehensive detail page accessible from all modules.

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
- **Troubleshooting System**: Editable guides integrated into fault reporting.
- **QR-Based Attendance**: Secure check-in/out with geofence validation, location confidence scoring, and optional WiFi SSID verification.
- **AI Integration**: AI photo verification for tasks and RAG-enabled knowledge base search.
- **HR & Shift Management**: Personnel management, leave requests, overtime, attendance, and shift planning.
- **DOSPRESSO Academy**: A comprehensive training system including career progression, quiz system with leaderboard, and a badge/achievement system. Supports AI-powered material generation and automated reminders.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation varying by fault priority.
- **Notifications**: Automatic in-app alerts for critical events.
- **State Management**: TanStack Query for server state synchronization and localStorage for theme persistence.
- **Photo Upload**: Persistent storage of images on AWS S3 via an ObjectUploader component.
- **Backup System**: Daily automatic backups to object storage with file verification and admin notifications for failures.
- **Email Notifications**: Transactional email system via SMTP for various alerts and communications.
- **Live Tracking**: Real-time employee location tracking with in-memory cache for supervisors.
- **RAG Knowledge Base**: Vector-based semantic search using OpenAI embeddings for intelligent knowledge article discovery.

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

---

## Recent Changes (Session: Nov 28, 2025 - FINAL)

### ✅ COMPLETED: DOSPRESSO Academy MVP - Full Gamification System (Nov 28)

#### Phase 1: Quiz Tracking System (✅ COMPLETE)
- **Database**: Created `quiz_results` table with userId, quizId, score, answers, completedAt
- **Storage**: `addQuizResult()`, `getLeaderboard(limit)`, `getUserQuizStats(userId)`
- **API**: GET `/api/academy/leaderboard`, POST `/api/academy/quiz-result`

#### Phase 2: Badge & Achievement System (✅ COMPLETE)
- **Database**: Created `badges` table (6 achievements) + `user_badges` table for tracking
- **Achievements**: Ilk Sinav (10pts), Sinav Ustasi (50pts), Mukemmel Puan (30pts), En Iyi Performans (75pts), Barista Uzmani (100pts), Supervisor Yolu (150pts)
- **Auto-unlock**: First quiz → Ilk Sinav, Perfect score (100) → Mukemmel Puan
- **Storage**: `getBadges()`, `getUserBadges(userId)`, `unlockBadge(userId, badgeId)`
- **API**: GET `/api/academy/badges`, GET `/api/academy/user-badges`

#### Phase 3: Frontend Pages (✅ COMPLETE)
- `/akademi` - Main academy hub (career progression, exam requests, stats)
- `/akademi-leaderboard` - Top 5 quiz performers with branch leaders tab
- `/akademi-quiz/:quizId` - Interactive quiz with progress tracking & scoring
- `/akademi-badges` - Showcase all badges (unlocked vs locked) with point totals

#### Phase 4: Quiz Questions System (✅ COMPLETE)
- **Database**: `quiz_questions` table with quizId, questionText, options[], correctAnswerIndex, explanation, difficulty, category
- **Storage**: `getQuizQuestions(quizId)` - fetches questions from database
- **API**: GET `/api/academy/quiz/:quizId/questions` - dynamic quiz content

#### Database Schema
```
career_levels - Career progression (5 levels: Stajyer → Supervisor)
exam_requests - Supervisor exam requests to HQ
user_career_progress - User's current level & progress
quiz_results - Quiz submission scores & answers
badges - Available achievements (6 types)
user_badges - User's unlocked badges
quiz_questions - Quiz questions database
```

#### API Endpoints Summary
- `GET /api/academy/career-levels` - All career levels
- `GET /api/academy/career-progress/:userId` - User's career status
- `POST /api/academy/exam-request` - Submit promotion request
- `GET /api/academy/leaderboard` - Top 5 performers
- `POST /api/academy/quiz-result` - Submit quiz (w/auto-unlock)
- `GET /api/academy/badges` - All achievements
- `GET /api/academy/user-badges` - User's unlocked badges
- `GET /api/academy/quiz/:quizId/questions` - Quiz questions
- `GET /api/academy/stats` - Analytics

#### Next Phase (Future Work)
- Full AI Motor integration: Generate quizzes from knowledge base using OpenAI embeddings
- Real leaderboard aggregation by branch and role
- Supervisor exam workflow with HQ approval system
- Performance analytics dashboard
- Career pathway visualizations
- Mobile app optimization for field staff
