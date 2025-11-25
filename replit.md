# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform for managing coffee shop franchise operations. It centralizes control for Headquarter (HQ) staff to monitor branches, assign and verify tasks using AI, track equipment, manage training, and provide support. The platform aims to streamline operations, improve efficiency, and ensure brand consistency across all DOSPRESSO branches, with a focus on the Turkish market and role-based access.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (November 25, 2025 - Final Session)
- **Servis Talepleri Modülü (Service Requests)**: FULLY COMPLETED & PRODUCTION-READY
  - ✅ Service request tracking with timeline history
  - ✅ User audit trail (oluşturan/güncelleyen)
  - ✅ Status management (talep_edildi, planlandı, devam_ediyor, tamamlandı, iptal_edildi)
  - ✅ Detailed update dialog (son görüşme tarihi, servis durumu notları, tahmini bitiş, gerçek maliyet)
  - ✅ Timeline view (kronolojik değişikliklerin tam kaydı)
  - ✅ Photo upload system during creation (2 photos with auto WebP compression to 1920x1080, 80% quality)
  - ✅ CSV export for filtered service request data
  - ✅ Branch-based equipment filtering - users select branch, then choose from that branch's equipment only
  - ✅ Equipment selection from branch's equipment list (not hardcoded templates)
  - ✅ Photo uploads work during service request creation
  - ✅ Backend POST endpoint: /api/service-requests/ for form submissions
  - ✅ Auto equipment linking from service request form
  - ✅ 6 test data seeds (farklı statüler, şubeler, kullanıcılar)

- **Ekipman Yönetimi (Equipment Management)**: FULLY COMPLETED & PRODUCTION-READY
  - ✅ Dashboard showing all equipment across branches with real-time health status
  - ✅ Equipment health indicators (Sağlıklı/Healthy, Uyarı/Warning, Kritik/Critical, Pasif/Inactive)
  - ✅ Maintenance schedule tracking with warranty date monitoring
  - ✅ Warranty expiration alerts
  - ✅ Grid and list view options for easy browsing
  - ✅ Stats cards showing equipment overview
  - ✅ Filters by branch and status
  - ✅ Branch filtering in create dialog - only shows equipment for selected branch
  - ✅ Equipment detail view panel

## System Architecture

### UI/UX Decisions
The frontend uses React 18+ with TypeScript and Vite. UI components are built with Shadcn/ui (New York variant) based on Radix UI, adhering to Material Design 3 principles. Styling is managed with Tailwind CSS, including custom DOSPRESSO branding and CSS variables for theme customization. Typography uses Inter for UI and Roboto for numeric data, with Turkish character support. The responsive design is mobile-first, utilizing tablet (md) and desktop (lg) breakpoints with CSS Grid.

### Technical Implementations
The backend is built with Node.js and Express.js using TypeScript, offering RESTful APIs protected by authentication middleware. Replit Auth (OpenID Connect) handles authentication with Passport.js and PostgreSQL for session management. Drizzle ORM provides type-safe database queries. Key modules include Authentication & RBAC (13-role system), Task Management (AI photo verification), Checklist Management, Equipment Management, Knowledge Base RAG, Training Academy, HQ Support Tickets, Performance Dashboards, Shift Management (QR check-in/out), Messaging, and Customer Feedback. Advanced features include an attendance penalty system, guest complaint SLA automation, overtime request workflow, employee performance scoring, equipment troubleshooting, and HR management (personnel documents, disciplinary tracking, onboarding). An audit logging infrastructure tracks security-relevant actions.

### Service Request Creation Flow
**NEW Workflow (November 25, 2025)**:
1. User clicks "Yeni Talep" (Create New Request)
2. Step 1: Select a branch from dropdown
3. Step 2: System loads and displays only that branch's equipment
4. User selects equipment from the filtered equipment list
5. User fills remaining form fields (priority, service provider, notes)
6. User optionally uploads 2 photos (auto-compressed to WebP)
7. Click "Talebi Oluştur" to create request with all photos

### Feature Specifications
- **AI Integration**: Utilizes OpenAI API (GPT-4o, GPT-4o-mini) for task photo analysis, equipment fault diagnosis, knowledge base RAG, AI-powered Q&A, shift planning, dashboard summaries, performance insights, branch evaluations, and training content generation. Budgeted at $200/month with intelligent caching and rate limiting.
- **RAG System**: PostgreSQL with `pgvector` for embedding generation (OpenAI `text-embedding-3-small`) and semantic search for the knowledge base.
- **Background Jobs**: Scheduled tasks for reminders (incomplete tasks, shift notifications, SLA checks, maintenance).

### System Design Choices
The application uses a micro-frontend-like approach for UI components with Shadcn/ui. State management is handled by TanStack Query for server state, and Wouter for client-side routing. Form handling uses React Hook Form with Zod validation. File uploads are managed via Uppy integrated with AWS S3. QR code scanning uses html5-qrcode. The database is PostgreSQL (Neon serverless) with schema defined in `shared/schema.ts`, including tables for core entities like Users, Branches, Tasks, Equipment, and specialized modules such as EmployeePerformanceScores and OvertimeRequests. `pgvector` is used for vector search. Migrations are managed via Drizzle Kit.

## External Dependencies

### Third-Party Services
-   **OpenAI API**: AI-powered vision analysis, chat completions, and embeddings for RAG and semantic search.
-   **Replit Auth**: User authentication and session management.
-   **AWS S3**: Cloud storage for photo and file uploads.
-   **Neon Database**: Serverless PostgreSQL hosting.
-   **IONOS SMTP**: Email services for notifications and password resets.

### Key NPM Packages
-   **UI Framework**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `lucide-react`.
-   **Data & State**: `@tanstack/react-query`, `drizzle-orm`, `drizzle-kit`, `zod`.
-   **Forms & Uploads**: `react-hook-form`, `@hookform/resolvers`, `@uppy/*`.
-   **Authentication**: `passport`, `openid-client`, `express-session`, `connect-pg-simple`.
-   **Build Tools**: `vite`, `esbuild`, `tsx`.
-   **Content Management**: `react-markdown`, `rehype-sanitize`.
-   **QR Code**: `html5-qrcode`, `qrcode.react`.

## Implementation Notes

### Service Requests Form - Current Implementation
- **Adım 1 (Step 1)**: Branch Selection dropdown (required)
- **Adım 2 (Step 2)**: Equipment list for selected branch (only shows equipment assigned to that branch, required)
- **Form Fields**: Priority, Service Provider, Notes (service provider is required)
- **Photo Upload**: Optional photo upload with preview (2 photos max, auto-compressed)
- **API Endpoint**: POST /api/service-requests/ receives branch, equipment, priority, service provider, notes, and photo data

### Future Enhancement Opportunities
1. QR code scanning for equipment selection (branch staff can scan equipment QR code to create request)
2. Equipment card navigation - click equipment to view full details and service history
3. Real-time notification system for high-priority service requests
4. Maintenance schedule automation based on equipment type and usage patterns
5. Integration with parts inventory for equipment troubleshooting
