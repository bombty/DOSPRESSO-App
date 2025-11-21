# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed for managing coffee shop operations across multiple franchise branches. It centralizes control for Headquarter (HQ) staff to monitor branches, assign tasks with AI-powered verification, track equipment, manage training, and provide support. The platform is localized for the Turkish market and includes role-based access. Key capabilities include AI-powered task verification, equipment fault reporting, a knowledge base, performance dashboards, automated reminders, checklist management, a training academy, an HQ support ticket system, and advanced shift management (QR check-in/out, templates, employee availability, notifications). The business vision is to streamline franchise operations, improve efficiency, and ensure brand consistency across all DOSPRESSO branches.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18+ with TypeScript, Vite.
- **UI Components**: Shadcn/ui (New York variant) based on Radix UI, adhering to Material Design 3 principles.
- **Styling**: Tailwind CSS with custom DOSPRESSO branding and CSS variables for theme customization.
- **State Management**: TanStack Query for server state management.
- **Routing**: Wouter for lightweight client-side routing.
- **Form Handling**: React Hook Form with Zod for schema validation.
- **File Uploads**: Uppy integrated with AWS S3.
- **QR Code Scanning**: html5-qrcode for shift check-in/out.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful endpoints (`/api/*`), protected by authentication middleware.
- **Authentication**: Replit Auth (OpenID Connect) with Passport.js and PostgreSQL-backed session management.
- **AI Integration**: OpenAI API (GPT-4o, GPT-4o-mini) for comprehensive AI-powered features across the entire platform. **Budget: $200/month** for maximum effectiveness and coverage. Features include task photo analysis, equipment fault diagnosis, knowledge base RAG (unlimited), AI-powered Q&A with hybrid RAG+LLM fallback, shift planning, dashboard summaries, performance insights, branch evaluations, and training content generation. Advanced caching (12h-72h TTL) and intelligent rate limiting optimize costs.
- **Equipment QR System**: Automatic QR code generation for tracking.
- **RAG System**: PostgreSQL with `pgvector` for embedding generation, semantic search (OpenAI `text-embedding-3-small`), and context-aware Q&A.
- **Background Jobs**: Scheduled tasks for reminders (incomplete tasks, shift notifications, SLA checks for guest complaints, equipment maintenance reminders).
- **Data Access**: Drizzle ORM for type-safe database queries.
- **Core Modules Implemented**: Authentication & RBAC, Task Management (7-state lifecycle, AI photo verification), Checklist Management (atomic transactions, order validation), Equipment Management, Knowledge Base RAG, Training Academy, HQ Support Tickets, Performance Dashboards, Shift Management, Messaging System, Customer Feedback.
- **Key Features**:
    - **Authentication & RBAC**: 13-role system with granular permissions, SHA-256 hashed password reset tokens, admin endpoint authorization, password complexity, audit logging, IONOS SMTP integration for emails.
    - **Advanced Admin User Management UI**: Filtering, client-side sorting, pagination, CSV export/import, user role/branch editing.
    - **Task Management**: 7-state lifecycle, server-side status validation, HQ-only verification, frontend task detail drawer with AI analysis display, advanced filtering and sorting.
    - **Checklist Management**: Atomic transaction for creation, order uniqueness validation, full CRUD API, HQ management UI, branch view.
    - **Attendance Penalty System**: Timestamp-based penalty calculation for lateness, early leave, break overage, wrapped in atomic transactions for data consistency.
    - **Guest Complaint SLA Automation**: 80% escalation warnings and 100% breach alerts with notifications, scheduled checks, and spam prevention for notifications. Frontend route `/sikayetler` provides complaint management UI with SLA tracking, stats dashboard, and resolution workflow. Supervisor role has `complaints: ['view', 'create', 'edit']` permissions with branch-level scoping.
    - **Critical SLA Bugfix (2025-11-19)**: Fixed incorrect SLA deadline calculation in `createGuestComplaint()` function. **Before:** critical=30min, high=2h, medium=4h, low=24h. **After:** critical=24h, high=48h, medium=72h, low=96h. **Impact:** SLA automation was fundamentally broken, causing premature breach alerts. **Resolution:** Code fix applied in `server/storage.ts`, data backfill executed via SQL to recalculate existing active complaint deadlines, unit tests added in `server/storage.test.ts` to prevent regression. All existing active complaints (1 record) backfilled successfully. Test coverage: 10/10 unit tests passed + E2E workflow validation.
    - **Overtime Request System (2025-11-19)**: Full CRUD workflow for employee overtime requests with supervisor approval. Backend: POST/PATCH endpoints with status validation, frontend: `/mesai-talepleri` route with create dialog, status filtering, approve/reject actions. Branch employees can create requests, supervisors/HQ can approve/reject. Integrated into sidebar navigation (both branch and HQ scopes). Comprehensive data-testid coverage for automated testing.
    - **Employee Performance Scoring (2025-11-19)**: Automated daily/weekly performance calculation based on attendance metrics. Backend methods: `calculateDailyPerformanceScore()`, `getPerformanceScores()`, `getWeeklyPerformanceSummary()`. API endpoints: POST `/api/performance/calculate`, GET `/api/performance/:userId`, GET `/api/performance/weekly/:userId`. Tracks attendance rate, lateness penalty, break compliance, shift compliance. Schema: `employeePerformanceScores` table with daily/weekly aggregation.
    - **Equipment Troubleshooting Workflow (2025-11-19)**: Guided step-by-step troubleshooting system for equipment issues. Frontend: `/ekipman-troubleshooting` route with equipment selection, step completion tracking, HQ-only step creation dialog with explicit role gating. Backend: Explicit HQ role enforcement (`isHQRole()` check before permission validation) in POST `/api/equipment-troubleshooting-steps`. Form validation uses `z.coerce.number()` for stepNumber with whitespace trimming, equipmentId syncs via useEffect. Comprehensive data-testid coverage.
    - **Enhanced AI Technical Assistant (2025-11-20)**: Integrated into equipment fault dialog with hybrid RAG+LLM approach. First attempts knowledge base search (RAG), falls back to general GPT-4o if no relevant articles found. Enriches queries with equipment context (type, serial number, branch, recent faults). Rate limit: 200 calls/day. Features: intelligent context awareness, scroll-optimized dialog UI (max-h-90vh), system message toasts indicating knowledge source, comprehensive data-testid coverage. Handles both technical queries and general conversation.
    - **AI Budget Upgrade (2025-11-20)**: Increased from $100/month to **$200/month** for comprehensive AI coverage. New rate limits: Photo Analysis (100/day), Tech Assistant (200/day), RAG Q&A (unlimited), Shift Planning (10/day), Dashboard Summaries (20/day), Insights (20/day), Branch Evaluations (50/day). Cache TTLs optimized: 72h for photo/shift analysis, 48h for RAG, 24h for fallback LLM, 12h for insights/evaluations, 8h for summaries.
    - **HR Management Module (2025-11-21)**: Comprehensive personnel management with özlük dosyası (personnel documents), disciplinary tracking, and employee onboarding. Backend: 30+ storage methods, 20+ API endpoints for documents, disciplinary reports, and onboarding. Frontend: Personel Yönetimi list page with search/filters, Personel Detay page with 3 tabs. **Özlük Dosyası**: Document upload, HQ verification, delete. **Disiplin İşlemleri**: Create reports (reportType, severity, subject, description, incident details), add employee responses, resolve with action taken. **Onboarding**: Status tracking (completion %, dates), task management (create, complete, HQ verify). Component architecture: Extracted dialogs to `client/src/components/hr/` (DisciplinaryDialogs.tsx, OnboardingTaskDialog.tsx) for maintainability. Permissions: Supervisor (view, create, edit, delete), Coach/Admin (full access + approve). Comprehensive data-testid coverage for automated testing.

### Database
- **Database**: PostgreSQL (Neon serverless).
- **ORM**: Drizzle ORM, schema defined in `shared/schema.ts`.
- **Schema Design**: Tables for Users, Branches, Tasks, Checklists, Equipment, KnowledgeBaseArticles, Reminders, PerformanceMetrics, HQSupportTickets, TrainingModules, EquipmentServiceRequests, ShiftTemplates, ShiftAttendances, EmployeeAvailability, Menu system, EmployeePerformanceScores, OvertimeRequests, EquipmentTroubleshootingSteps, GuestComplaints. Includes `passwordResetTokens`, `auditLogs`, `roles`, `permissions`, `rolePermissions` for RBAC.
- **Recent Schema Updates (2025-11-19)**:
    - Added `shiftCornerPhotoUrl`, `shiftCornerLatitude`, `shiftCornerLongitude` to branches table for AI-powered shift verification reference points.
    - Added break photo tracking to shiftAttendance: `breakStartPhotoUrl`, `breakStartLatitude`, `breakStartLongitude`, `breakEndPhotoUrl`, `breakEndLatitude`, `breakEndLongitude`.
    - Added AI background verification fields to shiftAttendance: `aiBackgroundCheckInStatus`, `aiBackgroundCheckInScore`, `aiBackgroundCheckInDetails`, `aiBackgroundCheckOutStatus`, `aiBackgroundCheckOutScore`, `aiBackgroundCheckOutDetails`, `aiBackgroundBreakStartStatus`, `aiBackgroundBreakStartScore`, `aiBackgroundBreakEndStatus`, `aiBackgroundBreakEndScore`.
    - Created `employeePerformanceScores` table for tracking daily/weekly performance metrics (attendance, lateness, break compliance, shift compliance).
    - `overtimeRequests` table for employee overtime request workflow with supervisor approval.
    - `equipmentTroubleshootingSteps` table for guided self-service before fault reporting.
- **Vector Search**: `pgvector` extension for semantic similarity search.
- **Migrations**: Managed via Drizzle Kit.

### Design System
- **Typography**: Inter (UI), Roboto (numeric data), with Turkish character support.
- **Spacing**: Tailwind CSS primitives.
- **Responsive Strategy**: Mobile-first with tablet (md) and desktop (lg) breakpoints, CSS Grid.
- **Component Patterns**: Radix UI for accessibility, `class-variance-authority` for custom variants.

## External Dependencies

### Third-Party Services
- **OpenAI API**: AI-powered vision analysis, chat completions, and embeddings for RAG and semantic search (GPT-5, `text-embedding-3-small`).
- **Replit Auth**: User authentication and session management via OpenID Connect.
- **AWS S3**: Storage for photo and file uploads, integrated via Uppy with presigned URLs.
- **Neon Database**: Serverless PostgreSQL hosting.
- **IONOS SMTP**: For email services (password reset, welcome, account approval).

### Key NPM Packages
- **UI Framework**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `lucide-react`.
- **Data & State**: `@tanstack/react-query`, `drizzle-orm`, `drizzle-kit`, `zod`.
- **Forms & Uploads**: `react-hook-form`, `@hookform/resolvers`, `@uppy/*`.
- **Authentication**: `passport`, `openid-client`, `express-session`, `connect-pg-simple`.
- **Build Tools**: `vite`, `esbuild`, `tsx`.
- **Content Management**: `react-markdown`, `rehype-sanitize`.
- **QR Code**: `html5-qrcode`, `qrcode.react`.