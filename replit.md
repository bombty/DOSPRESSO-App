# DOSPRESSO Franchise Management Platform

## Overview
DOSPRESSO is a comprehensive franchise management platform designed for a coffee/food franchise network. Its primary purpose is to streamline and centralize operations across various departments including HR, factory management, training, finance, CRM, quality control, and equipment management for 22 locations (20 branches, 1 HQ, 1 Factory). The platform aims to support a large user base (270 users) with diverse roles (28 distinct roles) and manage extensive data, enabling efficient management and operational oversight for a multi-location franchise business.

## User Preferences
- Preferred communication: Simple, everyday language, Turkish preferred
- Fast implementation in Build mode, continues with "devam"
- DB schema changes via raw psql (drizzle-kit push times out)

## System Architecture

### UI/UX Decisions
The platform utilizes React 18, TypeScript, and Vite for the frontend, with Shadcn/ui, Tailwind CSS, CVA, and Lucide icons for a consistent and modern UI. It implements a module layout (`ModuleLayout`, `ModuleSidebar`, `KPIStrip`) for structured module pages (e.g., Equipment, HR, Academy, Factory) and 6 role-based Mission Control dashboards using `DashboardKpiStrip`. The design prioritizes mobile compactness with touch-friendly UIs and role-based quick actions. A server-driven collapsible sidebar dynamically builds menus based on user roles and module flags.

### Technical Implementations
- **Authentication:** Session-based authentication using Passport.js supports both web (username/password with bcrypt) and kiosk (PIN-based with bcrypt) logins. Security features include password stripping, account lockout, and account status management.
- **Role System:** A robust role-based access control system defines 28 distinct roles across HQ, branches, and factory. Permissions are managed via a static map (`PERMISSIONS`) and can be dynamically extended. Module feature flags (`module_flags` table) allow granular control over module visibility at global, branch, and role levels.
- **Database Schema:** The data model is extensive, organized across 18 schema files, covering core entities like users, roles, branches, HR, academy, factory operations, CRM, notifications, and financial data.
- **Key Architectural Patterns:**
    - **Soft Deletion:** Implemented across all business tables using a `deleted_at` column.
    - **Data Locking:** Time and status-based data locking with a change request workflow.
    - **Query Pattern:** Standardized TanStack Query usage with `queryKey: ['/api/endpoint']` for efficient data fetching.
    - **Mutations:** `apiRequest` from `@lib/queryClient` for mutations, always followed by cache invalidation.

### Feature Specifications
- **Task System:** Comprehensive task management including assignment (single and multi-user with acceptance/rejection flow), comments, evidence, status tracking, recurring tasks, bulk creation, verification, and rating. Integrates with CRM and includes a new task creation dialog.
- **Production Planning:** Manages weekly production plans, items, daily records, and responsibilities with an approval hierarchy (draft, suggested, approved).
- **CRM:** A unified CRM platform merging communication, traditional CRM, and guest feedback, including QR feedback support and task integration.
- **Academy:** A multi-version learning management system supporting modules, quizzes, AI assistance, learning paths, certificates, badges, and analytics.
- **Factory:** Dedicated kiosk operations, shift management, quality control, lot tracking, station benchmarks, production batches, and worker scoring.
- **HR:** Full employee lifecycle management including documents, disciplinary actions, onboarding, attendance, leaves, payroll calculation, and salary management.
- **Mr. Dobody (AI Agent):** A proactive AI agent for gap detection, task assignment, and workflow completion across various operational categories.
- **Notification System:** Four-level notification system (operational, tactical, strategic, personal) with role-based filtering, category-based frequency control, archiving, and push notifications.
- **Mission Control Dashboards:** Six role-based dashboards provide critical KPIs and insights using monthly snapshots of branch and factory performance.

### Pilot Launch & Branch Onboarding
- **Pilot Launch Page** (`/pilot-baslat`): Admin-only page for resetting system data before pilot go-live. Supports selective cleanup of notifications, audit logs, performance scores/metrics, and checklist histories. Includes password reset with mustChangePassword enforcement and double confirmation.
- **Branch Onboarding Wizard**: Automatically shown to branch managers/supervisors when a branch has `setupComplete=false`. Three-step wizard: personnel upload, gap analysis, setup completion.
- **Module Activation Checklist**: Reusable component showing required setup items for newly activated modules (satınalma, hr, checklist, akademi, kalite, fabrika).
- **Pre-Pilot Migration**: Server startup clears all `mustChangePassword=true` flags, disabling the forced password change dialog during pre-pilot phase.
- **Schema**: `branches.setup_complete` boolean column added to track branch onboarding status.
- **API Endpoints**: `POST /api/admin/pilot-launch`, `GET /api/admin/branch-setup-status/:branchId`, `POST /api/admin/branch-setup-complete/:branchId`, `GET /api/admin/module-activation-checklist/:moduleKey`, `GET /api/admin/onboarding-status`

## External Dependencies
- **OpenAI API**: Utilized for AI vision, chat, embeddings, and summarization capabilities.
- **AWS S3 / Replit Object Storage**: Used for cloud-based file storage.
- **Neon Database**: Provides serverless PostgreSQL database services.
- **IONOS SMTP**: Handles email notifications.