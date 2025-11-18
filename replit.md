# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a comprehensive web-based platform designed for managing coffee shop operations across multiple franchise branches. It centralizes control for Headquarter (HQ) staff to monitor branches, assign tasks with AI-powered verification, track equipment, manage training, and provide support. The platform is localized for the Turkish market, with a Turkish user interface and role-based access for HQ and branch personnel. Key capabilities include AI-powered task verification, equipment fault reporting and tracking, a knowledge base, performance dashboards, automated reminders, checklist management, a training academy, an HQ support ticket system, and advanced shift management (QR check-in/out, shift templates, employee availability calendar, automated notifications). The business vision is to streamline franchise operations, improve efficiency, and ensure brand consistency across all DOSPRESSO branches.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (November 18, 2025)

### Authentication & Security System (Tasks 1-4, 8-10)
- **Role-Based Access Control (RBAC)**: 13-role authentication system with granular permissions (Users, Branches, Roles, Permissions, RolePermissions tables).
- **Security Features**: 
  - SHA-256 hashed password reset tokens with O(1) lookup and deterministic validation
  - Admin endpoint authorization with `ensurePermission` middleware
  - branchId validation (ensures branch exists in database)
  - HQ roles enforcement (branchId=null for HQ_ADMIN, HQ_STAFF, ACCOUNTANT, HR_SPECIALIST)
  - Password complexity requirements (8+ chars, uppercase, lowercase, number)
  - Audit logging for all admin actions
- **Email System**: IONOS SMTP integration (zero cost) with Turkish HTML templates for password reset, welcome emails, and account approval notifications.
- **Frontend Pages**:
  - `/register`: New user registration with HQ/Branch selection, dynamic branch dropdown, email validation
  - `/forgot-password`: Password reset request with email verification
  - `/reset-password/:token`: Secure password reset with SHA-256 token validation
  - `/login`: Updated with "Yeni Kayıt" and "Şifremi Unuttum" links

### Advanced Admin User Management UI (Task 11)
- **Path**: `/yonetim/kullanicilar` (Admin only)
- **Filtering System** (4 filters):
  - Rol: HQ Admin, HQ Staff, Muhasebe, İK Uzmanı, Süpervizör, Barista
  - Şube: Dynamic dropdown from API (branches table)
  - Hesap Durumu: Onaylandı, Beklemede, Reddedildi
  - Ara: Real-time search by name/email
- **Sorting**: Client-side sorting on Ad Soyad, Email, Rol (click column header to toggle asc/desc)
- **Pagination**: 
  - Items per page: 10, 25, 50, 100 (configurable)
  - Smart page navigation (max 5 page buttons)
  - Shows "X-Y / Total kayıt" summary
  - Auto-reset to page 1 on filter/itemsPerPage changes (prevents empty grid bug)
- **CSV Export**: Downloads all filtered users with Turkish date formatting (kullanicilar_YYYY-MM-DD.csv)
- **CSV Import**: Bulk user import via dialog with validation
- **Edit User**: Change user role and branch via dialog
- **Technical**: TanStack Query with server-side filtering, client-side sorting/pagination, responsive grid layout

### Database Schema Updates
- `passwordResetTokens`: SHA-256 hashed tokens with expiry and used flag
- `auditLogs`: Admin action tracking (user, action, targetType, targetId, details, ipAddress)
- `roles`, `permissions`, `rolePermissions`: RBAC system tables
- `users.accountStatus`: Enum (approved, pending, rejected) for registration approval workflow

### Task Management System (Tasks 12-15, November 18, 2025)
- **7-State Task Lifecycle** (Tasks 12-13):
  - Status enum: beklemede, devam_ediyor, foto_bekleniyor, incelemede, onaylandi, reddedildi, gecikmiş
  - Server-side status transition validation with role-based guards
  - Safe update schema blocking protected fields (aiAnalysis, aiScore, photoUrl)
  - HQ-only verification endpoints (verify/reject)
- **Frontend Task Detail Drawer** (Task 14):
  - Card status badges for all 7 states
  - Photo preview, AI analysis display (score, summary)
  - Role-based action buttons (Start, Verify, Reject) with loading states
  - Real-time cache updates after mutations with fresh data strategy
  - Fixed all 'tamamlandi' references → 'onaylandi' across frontend/backend/AI
- **Advanced Task Filtering & Sorting** (Task 15 - IN PROGRESS):
  - Collapsible FilterPanel with 7 filter controls (search, branch, assignee, status, priority, date range)
  - Active filter count badge and "Filtreleri Temizle" button
  - Client-side filtering with useMemo (instant UX, <1k tasks)
  - Type-safe ID comparisons (branchId as number, assignedToId as varchar/string)
  - Sorting logic (createdAt desc default, priority weighting)
  - Responsive 3-column grid layout
  - HQ-only features (branch filter, all users dropdown)

### Test Users
- **testadmin** (admin, no branch) - password: "test123"
- **testsupervisor** (supervisor, branchId=4) - password: "test123"
- **testbarista** (barista, branchId=4) - password: "test123"

## System Architecture

### Frontend
- **Framework**: React 18+ with TypeScript, Vite.
- **UI Components**: Shadcn/ui (New York variant) based on Radix UI, adhering to Material Design 3 principles.
- **Styling**: Tailwind CSS with custom DOSPRESSO branding (navy, beige) and CSS variables for theme customization (light/dark modes).
- **State Management**: TanStack Query for server state management (caching, refetching, optimistic updates).
- **Routing**: Wouter for lightweight client-side routing.
- **Form Handling**: React Hook Form with Zod for schema validation.
- **File Uploads**: Uppy integrated with AWS S3 for photo uploads.
- **QR Code Scanning**: html5-qrcode for shift check-in/out with camera access.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful endpoints (`/api/*`), protected by authentication middleware.
- **Authentication**: Replit Auth (OpenID Connect) with Passport.js and PostgreSQL-backed session management via `express-session`.
- **AI Integration**: OpenAI API (GPT-5) for:
    - Task photo analysis and scoring (Vision API).
    - Equipment fault diagnosis and recommendations (Vision API).
    - Knowledge base semantic search and RAG (Retrieval-Augmented Generation).
    - AI-powered Q&A with source attribution.
    - Personalized dashboard insights with role-specific analysis (24h cache, 3/day rate limit).
- **Equipment QR System**: Automatic QR code generation for equipment tracking (generated on creation, bulk regeneration for existing equipment).
- **RAG System**: PostgreSQL with `pgvector` for embedding generation, semantic search (OpenAI `text-embedding-3-small`), and context-aware Q&A.
- **Background Jobs**: 
    - Custom reminder system for incomplete tasks every 5 minutes.
    - Shift notification system every 10 minutes (reminders, changes, assignments, cancellations).
- **Data Access**: Drizzle ORM for type-safe database queries.

### Database
- **Database**: PostgreSQL (Neon serverless).
- **ORM**: Drizzle ORM, schema defined in `shared/schema.ts`.
- **Schema Design**: Includes tables for Users (role-based access), Branches, Tasks (with AI scoring), Checklists, Equipment (with maintenance/fault tracking), KnowledgeBaseArticles (with embeddings), Reminders, PerformanceMetrics, HQSupportTickets, TrainingModules, EquipmentServiceRequests (state machine), ShiftTemplates (reusable shift patterns with multi-day support), ShiftAttendances (QR-based check-in/out tracking), EmployeeAvailability (unavailability periods with reasons), and a dynamic Menu system (sections, items, visibility rules).
- **Vector Search**: `pgvector` extension for semantic similarity search.
- **Migrations**: Managed via Drizzle Kit.

### Design System
- **Typography**: Inter (UI), Roboto (numeric data), with Turkish character support.
- **Spacing**: Tailwind CSS primitives.
- **Responsive Strategy**: Mobile-first with tablet (md) and desktop (lg) breakpoints, CSS Grid for layouts.
- **Component Patterns**: Radix UI for accessibility, `class-variance-authority` for custom variants.

## External Dependencies

### Third-Party Services
- **OpenAI API**: AI-powered vision analysis, chat completions, and embeddings for RAG and semantic search. Uses GPT-5 and `text-embedding-3-small`.
- **Replit Auth**: User authentication and session management via OpenID Connect.
- **AWS S3**: Storage for photo and file uploads, integrated via Uppy with presigned URLs.
- **Neon Database**: Serverless PostgreSQL hosting, utilizing Neon's connection pooling.

### Key NPM Packages
- **UI Framework**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `lucide-react`.
- **Data & State**: `@tanstack/react-query`, `drizzle-orm`, `drizzle-kit`, `zod`.
- **Forms & Uploads**: `react-hook-form`, `@hookform/resolvers`, `@uppy/*`.
- **Authentication**: `passport`, `openid-client`, `express-session`, `connect-pg-simple`.
- **Build Tools**: `vite`, `esbuild`, `tsx`.
- **Content Management**: `react-markdown`, `rehype-sanitize`.
- **QR Code**: `html5-qrcode` for camera-based QR scanning, `qrcode.react` for QR generation.