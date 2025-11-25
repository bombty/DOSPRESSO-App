# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform for managing coffee shop franchise operations. It centralizes control for Headquarter (HQ) staff to monitor branches, assign and verify tasks using AI, track equipment, manage training, and provide support. The platform aims to streamline operations, improve efficiency, and ensure brand consistency across all DOSPRESSO branches, with a focus on the Turkish market and role-based access.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (November 25, 2025)
- **Servis Talepleri Modülü**: Tamamlandı - Service request tracking, timeline history, user audit trail (oluşturan/güncelleyen), durum yönetimi
  - Detaylı update dialog (son görüşme tarihi, servis durumu notları, tahmini bitiş, gerçek maliyet)
  - Timeline görüntüleme (tüm değişikliklerin kronolojisi)
  - 6 test veri seedi (farklı statüler, şubeler, kullanıcılar)

## System Architecture

### UI/UX Decisions
The frontend uses React 18+ with TypeScript and Vite. UI components are built with Shadcn/ui (New York variant) based on Radix UI, adhering to Material Design 3 principles. Styling is managed with Tailwind CSS, including custom DOSPRESSO branding and CSS variables for theme customization. Typography uses Inter for UI and Roboto for numeric data, with Turkish character support. The responsive design is mobile-first, utilizing tablet (md) and desktop (lg) breakpoints with CSS Grid.

### Technical Implementations
The backend is built with Node.js and Express.js using TypeScript, offering RESTful APIs protected by authentication middleware. Replit Auth (OpenID Connect) handles authentication with Passport.js and PostgreSQL for session management. Drizzle ORM provides type-safe database queries. Key modules include Authentication & RBAC (13-role system), Task Management (AI photo verification), Checklist Management, Equipment Management, Knowledge Base RAG, Training Academy, HQ Support Tickets, Performance Dashboards, Shift Management (QR check-in/out), Messaging, and Customer Feedback. Advanced features include an attendance penalty system, guest complaint SLA automation, overtime request workflow, employee performance scoring, equipment troubleshooting, and HR management (personnel documents, disciplinary tracking, onboarding). An audit logging infrastructure tracks security-relevant actions.

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