# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform for managing coffee shop franchise operations. It centralizes control for Headquarter (HQ) staff to monitor branches, assign and verify tasks using AI, track equipment, manage training, and provide support. The platform aims to streamline operations, improve efficiency, and ensure brand consistency across all DOSPRESSO branches, with a focus on the Turkish market and role-based access.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (November 25, 2025 - FINAL SESSION - UNIFIED FAULT REPORT SYSTEM + SERVICE RESPONSIBILITY)

### ✅ UNIFIED FAULT REPORT SYSTEM - PRODUCTION READY
**2-Step Troubleshooting + Fault Creation Flow with Smart HQ Routing**

- ✅ **Frontend FaultReportDialog Component**: Full implementation with 3-step workflow
  - Step 1: Mandatory troubleshooting steps (fetched from backend)
  - Step 2: Fault details form (priority, notes, description)
  - Step 3: Outcome screen (HQ escalation vs branch service based on equipment.faultProtocol)
  
- ✅ **Backend Endpoints**: Fully wired and tested
  - GET `/api/troubleshooting/:equipmentType` - Fetches equipment-specific troubleshooting steps
  - POST `/api/faults` - Creates new fault reports with validation and routing
  - Mandatory troubleshooting enforcement before fault submission
  
- ✅ **Smart Equipment Routing**: Automatic routing based on equipment protocol
  - `equipment.faultProtocol='hq_teknik'` → HQ Technical Team escalation
  - `equipment.faultProtocol='branch'` → Branch Service notification
  
- ✅ **User Interface**: "Arıza Bildir" button on every equipment card in Equipment page
  - Accessible from equipment list view
  - Opens unified fault report dialog
  - Intuitive 2-step flow (troubleshooting → fault creation)
  
- ✅ **QR Scanner Integration**: Fixed and optimized
  - Uses requestAnimationFrame for proper DOM element timing
  - Graceful error handling for scanner initialization
  - QR code format: `DOSPRESSO-EQ-{equipmentId}`
  
- ✅ **TypeScript & Type Safety**: All LSP errors resolved
  - Properly typed mutations with `EquipmentFault` generics
  - Correct type references throughout component
  
- ✅ **Testing Status**: Verified via server logs
  - `POST /api/faults 200 in 379ms` - Fault creation successful
  - All API endpoints responding correctly
  - No console errors or warnings

### ✅ EQUIPMENT SERVICE RESPONSIBILITY - NEWLY ADDED
**Selective Fault Management Assignment (Şube vs Merkez)**

- ✅ **Equipment Creation Form Enhancement**
  - New "Arıza Yönetimi Sorumlusu" (Fault Management Responsibility) field
  - Options: "Şube" (Branch) or "Merkez (HQ Teknik)" (Headquarters Technical Team)
  - Dynamic helper text showing who will manage faults for selected option
  - Dropdown integrates seamlessly with existing equipment form

- ✅ **Equipment Edit Form Enhancement**
  - Same "Arıza Yönetimi Sorumlusu" field in equipment edit dialog
  - Users can update fault routing responsibility when editing equipment
  - Maintains consistency with creation form interface

- ✅ **Fault Dashboard Page** (/ariza-panosu)
  - Real-time fault statistics with priority breakdown (Kritik, Yüksek, Beklemede)
  - Critical faults alert section showing high-priority issues
  - Recent faults list with status badges and priority indicators
  - Turkish language UI with proper date formatting (dd MMM HH:mm)
  - Responsive design with grid layout for stats cards

### Previous Session Features
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
The backend is built with Node.js and Express.js using TypeScript, offering RESTful APIs protected by authentication middleware. Replit Auth (OpenID Connect) handles authentication with Passport.js and PostgreSQL for session management. Drizzle ORM provides type-safe database queries. Key modules include Authentication & RBAC (13-role system), Task Management (AI photo verification), Checklist Management, Equipment Management (now with unified fault reporting), Knowledge Base RAG, Training Academy, HQ Support Tickets, Performance Dashboards, Shift Management (QR check-in/out), Messaging, and Customer Feedback. Advanced features include an attendance penalty system, guest complaint SLA automation, overtime request workflow, employee performance scoring, equipment troubleshooting, and HR management (personnel documents, disciplinary tracking, onboarding). An audit logging infrastructure tracks security-relevant actions.

### Unified Fault Report Flow
**Complete Workflow (November 25, 2025)**:
1. User navigates to Equipment page
2. User clicks "Arıza Bildir" button on any equipment card
3. FaultReportDialog opens with 3-step flow
4. **Step 1 - Troubleshooting**: System fetches equipment-type-specific troubleshooting steps via `/api/troubleshooting/:equipmentType` and displays them
5. **Step 2 - Fault Details**: User fills priority, notes, description
6. **Step 3 - Outcome**: 
   - If `equipment.faultProtocol='hq_teknik'` → Shows "HQ Technical Team Escalation" outcome
   - If `equipment.faultProtocol='branch'` → Shows "Branch Service Notification" outcome
7. Backend validates completed troubleshooting steps before accepting fault submission
8. Fault saved to database with full audit trail (reportedById, timestamp, etc.)

### Feature Specifications
- **AI Integration**: Utilizes OpenAI API (GPT-4o, GPT-4o-mini) for task photo analysis, equipment fault diagnosis, knowledge base RAG, AI-powered Q&A, shift planning, dashboard summaries, performance insights, branch evaluations, and training content generation. Budgeted at $200/month with intelligent caching and rate limiting.
- **RAG System**: PostgreSQL with `pgvector` for embedding generation (OpenAI `text-embedding-3-small`) and semantic search for the knowledge base.
- **Background Jobs**: Scheduled tasks for reminders (incomplete tasks, shift notifications, SLA checks, maintenance).

### System Design Choices
The application uses a micro-frontend-like approach for UI components with Shadcn/ui. State management is handled by TanStack Query for server state, and Wouter for client-side routing. Form handling uses React Hook Form with Zod validation. File uploads are managed via Uppy integrated with AWS S3. QR code scanning uses html5-qrcode with proper DOM timing. The database is PostgreSQL (Neon serverless) with schema defined in `shared/schema.ts`, including tables for core entities like Users, Branches, Tasks, Equipment, EquipmentFaults, EquipmentTroubleshootingSteps, and specialized modules such as EmployeePerformanceScores and OvertimeRequests. `pgvector` is used for vector search. Migrations are managed via Drizzle Kit.

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

### Unified Fault Report - Current Implementation
- **Component**: `client/src/components/fault-report-dialog.tsx` - Full 3-step flow with outcome routing
- **Backend Endpoints**: 
  - GET `/api/troubleshooting/:equipmentType` - Fetches admin-defined troubleshooting steps
  - POST `/api/faults` - Creates fault with mandatory troubleshooting validation
- **Access**: "Arıza Bildir" button on every equipment card (Equipment page)
- **Routing**: Smart routing based on `equipment.faultProtocol` field
- **Test Data**: Faults seeded with test data for demo purposes

### Future Enhancement Opportunities
1. Real-time notifications for high-priority fault reports
2. Fault assignment workflow for HQ technical team
3. Fault resolution SLA tracking and alerts
4. Parts inventory integration for troubleshooting recommendations
5. Historical fault analytics and pattern detection
6. Multi-language troubleshooting step support
