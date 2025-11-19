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
- **AI Integration**: OpenAI API (GPT-5) for task photo analysis, equipment fault diagnosis, knowledge base RAG, AI-powered Q&A, and personalized dashboard insights. Cost optimization includes manual AI triggers, aggressive caching, and rate limiting.
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

### Database
- **Database**: PostgreSQL (Neon serverless).
- **ORM**: Drizzle ORM, schema defined in `shared/schema.ts`.
- **Schema Design**: Tables for Users, Branches, Tasks, Checklists, Equipment, KnowledgeBaseArticles, Reminders, PerformanceMetrics, HQSupportTickets, TrainingModules, EquipmentServiceRequests, ShiftTemplates, ShiftAttendances, EmployeeAvailability, Menu system. Includes `passwordResetTokens`, `auditLogs`, `roles`, `permissions`, `rolePermissions` for RBAC.
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