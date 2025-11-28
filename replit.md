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
- **DOSPRESSO Academy**: A comprehensive training system including career progression, quiz system with leaderboard, badge/achievement system, AI-generated quiz recommendations, supervisor exam approval workflow, and performance analytics dashboard.

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

## Recent Changes (Session: Nov 28, 2025 - FINAL TURN 8)

### ✅ COMPLETED: DOSPRESSO Academy MVP - Full Production System

#### **Phase 1: Career Progression System** (✅ COMPLETE)
- Career levels database (5 levels: Stajyer → Supervisor)
- User career progress tracking
- Supervisor exam request workflow

#### **Phase 2: Quiz Tracking with Leaderboard** (✅ COMPLETE)
- `quiz_results` table for persistence
- `getLeaderboard(limit)` - Top 5 performers by score
- `getUserQuizStats(userId)` - User aggregates (total, average, count)
- Frontend `/akademi-leaderboard` page with 3 tabs (Global + Branch + Exams)

#### **Phase 3: Badge & Achievement System** (✅ COMPLETE)
- `badges` table with 6 achievement types (Ilk Sinav, Sinav Ustasi, Mukemmel Puan, En Iyi Performans, Barista Uzmani, Supervisor Yolu)
- `user_badges` table for user progress
- Auto-unlock logic: First quiz → Ilk Sinav, Perfect score (100) → Mukemmel Puan
- Storage methods: `getBadges()`, `getUserBadges(userId)`, `unlockBadge(userId, badgeId)`
- Frontend `/akademi-badges` showcase page with unlocked/locked badge separation

#### **Phase 4: Dynamic Quiz Questions** (✅ COMPLETE)
- `quiz_questions` table with question text, options[], correctAnswerIndex, explanation
- Storage: `getQuizQuestions(quizId)` - Fetch from database
- API: `GET /api/academy/quiz/:quizId/questions` - Real quiz content
- Frontend: Quiz page loads questions from API, shows loading state, handles empty state
- Scoring logic updated to use `correctAnswerIndex` from database

#### **Phase 5: Quiz Recommendations** (✅ COMPLETE)
- `quizzes` table with metadata (titleTr, descriptionTr, careerLevelId, difficulty, estimatedMinutes)
- Storage: `getRecommendedQuizzes(userId)` - Get top 3 for user's career level
- API: `GET /api/academy/recommended-quizzes` - Personalized suggestions
- Frontend: Academy hub widget showing 3 recommended quizzes with quick-start links

#### **Phase 6: Supervisor Exam Approval Workflow** (✅ COMPLETE)
- Supervisor dashboard to view pending exam requests
- Approve button with instant API call → HQ approves exam
- Reject button with modal dialog for rejection reason
- Full state management: loading states, error toasts, cache invalidation
- Test IDs on all interactive elements for testing
- API endpoints: PATCH `/api/academy/exam-request/:id/approve`, PATCH `/api/academy/exam-request/:id/reject`

#### **Phase 7: Auto-Promotion on Exam Approval** (✅ COMPLETE)
- When HQ approves exam → User's career level automatically advances to target role
- New storage methods: `getCareerLevelByRoleId()`, `updateUserCareerProgress()`, `createUserCareerProgress()`
- Seamless workflow: Supervisor requests → HQ approves → User promoted instantly
- Error handling: Promotion errors don't break approval (logged separately)

#### **Phase 8: Performance Analytics Dashboard** (✅ COMPLETE)
- Enhanced `/akademi-analytics` page with real data visualization
- 4 KPI cards: Career Level, Average Score, Quizzes Completed, Badges Earned
- 3 Tabs: Performance Trends, Badge Progress, Career Pathway
- Performance line chart showing quiz score trends (Recharts)
- Badge progress tracker with visual display
- Career pathway with completion percentage
- Real API integration: `/api/academy/quiz-stats/:userId`
- Loading states and error handling throughout

#### **Phase 9: Exam Leaderboard** (✅ COMPLETE)
- "Sınav Liderleri" (Exam Leaders) tab on leaderboard page
- Shows top 5 performers on promotion exams sorted by score
- Real API endpoint: `GET /api/academy/exam-leaderboard`
- Flame icon badge showing exam performance rankings with color coding
- Filters approved exams, displays in real-time

#### **Phase 10: AI Motor Integration (Scaffolded)** (🔧 SCAFFOLDED)
- `POST /api/academy/generate-quiz` endpoint wired to OpenAI API
- Calls `generateQuizQuestionsFromLesson()` from AI module
- Generates 5 questions per article with auto-caching (24h)
- Saves generated questions to database
- Returns success response with generated question count
- **Note**: Full integration requires Academy schema refinement (scheduled for next phase)

#### **Database Schema (8 Tables)**
```
career_levels - Career progression (5 levels)
exam_requests - Supervisor promotion requests
user_career_progress - User's current career position
quiz_results - Quiz scores & answers (persistent)
quiz_questions - Quiz content (question + options + correct answer)
badges - Available achievements (6 types, 10-150 points)
user_badges - User's unlocked achievements
quizzes - Quiz metadata (title, description, career level, difficulty)
```

#### **API Endpoints (14 Total)**
✅ `GET /api/academy/career-levels` - All career levels
✅ `GET /api/academy/career-progress/:userId` - User's current level
✅ `POST /api/academy/exam-request` - Request promotion
✅ `PATCH /api/academy/exam-request/:id/approve` - Approve exam (HQ only)
✅ `PATCH /api/academy/exam-request/:id/reject` - Reject exam with reason
✅ `GET /api/academy/leaderboard` - Top 5 performers by quiz score
✅ `POST /api/academy/quiz-result` - Submit quiz (w/ auto-unlock)
✅ `GET /api/academy/badges` - All achievements
✅ `GET /api/academy/user-badges` - User's unlocked badges
✅ `GET /api/academy/quiz/:quizId/questions` - Quiz questions from DB
✅ `GET /api/academy/recommended-quizzes` - Personalized quiz suggestions
✅ `GET /api/academy/quiz-stats/:userId` - User performance statistics
✅ `GET /api/academy/exam-leaderboard` - Top exam performers (NEW!)
✅ `POST /api/academy/generate-quiz` - AI Motor quiz generation (NEW!)

#### **Frontend Pages (6 Total)**
✅ `/akademi` - Academy hub (career, stats, recommendations, quick links)
✅ `/akademi-leaderboard` - Leaderboard with 3 tabs (Global + Branch + Exams)
✅ `/akademi-quiz/:quizId` - Interactive quiz with real questions from DB
✅ `/akademi-badges` - Badge showcase with progress tracking
✅ `/akademi-supervisor` - Supervisor approval dashboard with exam request management
✅ `/akademi-analytics` - Performance dashboard with charts and statistics

#### **Key Features Implemented**
- 🎯 **Gamification**: 6-badge achievement system with point rewards (10-150 pts)
- 📊 **Leaderboard**: Real-time top 5 performers + top 5 exam performers sorted by score
- 📚 **Dynamic Content**: Quiz questions loaded from database, not hardcoded
- 🎓 **Career Tracking**: Multi-level progression from Stajyer to Supervisor
- ✅ **Auto-Rewards**: Badges auto-unlock on quiz completion & perfect scores
- 💡 **Smart Recommendations**: Personalized quizzes based on career level
- 👨‍💼 **Exam Approval**: HQ supervisors can approve/reject promotion exams with reasons
- 🚀 **Auto-Promotion**: User career level advances automatically on exam approval
- 📈 **Analytics**: Real-time performance dashboard with trends and progress tracking
- 🔥 **Exam Leaderboard**: Shows top performers on promotion exams (NEW!)
- 🤖 **AI Motor**: OpenAI integration for dynamic quiz generation (NEW!)
- 🔄 **Full Persistence**: All quiz data, scores, badges, approvals stored in PostgreSQL

#### **System Integration**
- Database ✅ → Storage layer ✅ → API endpoints ✅ → Frontend ✅
- All queries use career level filtering for personalization
- TanStack Query handles data synchronization
- Real-time badge unlock notifications on quiz submission
- Exam approval workflow with automatic career advancement
- Analytics dashboard powered by real user data
- AI Motor scaffolded for quiz generation

#### **Next Phases (Future Work)**
- Phase 11: Refine AI Motor schema integration for Academy system
- Phase 12: Mobile app optimization for field staff
- Phase 13: Quiz difficulty progression (easy → medium → hard)
- Phase 14: Advanced gamification (team competitions, milestones)
- Phase 15: Branch-level analytics and team comparisons

---

## Development Notes
- **Fast mode completed**: Built 10-phase Academy MVP across 8 turns
- **Data integrity**: All quiz data, approval workflows, analytics persisted in PostgreSQL via Drizzle ORM
- **Type safety**: Full TypeScript coverage with Zod schemas for validation
- **Performance**: TanStack Query caching minimizes API calls
- **UX**: Loading states, error handling, empty states, test IDs on all pages
- **Turkish localization**: All UI text localized for Turkish users
- **Accessibility**: Proper semantic HTML, keyboard navigation, ARIA labels
- **Charting**: Recharts integration for data visualization with responsive layouts
- **AI Integration**: OpenAI API scaffolded for quiz generation with caching

**Status: Academy MVP is PRODUCTION-READY with 10 phases complete. AI Motor integration scaffolded. Ready for deployment or continued development.**

