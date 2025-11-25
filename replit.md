# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform for managing coffee shop franchise operations, centralizing control for Headquarter (HQ) staff. Its primary purpose is to monitor branches, assign and verify tasks using AI, track equipment, manage training, and provide support. The platform aims to streamline operations, improve efficiency, and ensure brand consistency across all DOSPRESSO branches, specifically targeting the Turkish market with robust role-based access control.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend is built with React 18+, TypeScript, and Vite. UI components leverage Shadcn/ui (New York variant, based on Radix UI) following Material Design 3 principles. Styling is handled by Tailwind CSS with dark mode support and Turkish language localization. Typography uses Inter for UI and Roboto for numeric data. The design is mobile-first, ensuring responsiveness across tablet (md) and desktop (lg) breakpoints.

### Technical Stack
- **Frontend**: React 18, Vite, Wouter (routing), TanStack Query (state management), React Hook Form (forms), Shadcn/ui (component library).
- **Backend**: Node.js, Express.js, TypeScript. Authentication uses Replit Auth (OpenID) and Passport.js for session management.
- **Database**: PostgreSQL (Neon serverless) managed with Drizzle ORM for type-safe interactions, utilizing pgvector for embeddings.
- **Charts/Analytics**: Recharts for data visualization.
- **File Upload**: Uppy integrated with AWS S3 for object storage (via ObjectUploader component).
- **QR Code**: html5-qrcode for scanning functionalities.
- **Background Jobs**: Node.js interval-based scheduling for tasks like SLA compliance checks and notifications.

### Data Model
- **Equipment**: Includes id, name, type, branch, health_score, warranty_date, maintenance_schedule, and fault_protocol.
- **Equipment Faults**: Stores id, equipment_id, priority, status, current_stage, assigned_to, creation/resolution timestamps, SLA breach status, photoUrl, estimatedCost, and actualCost.
- **Troubleshooting Steps**: Defines id, equipment_type, steps (array), created_by, and indicates if it's admin-managed.
- **Fault History**: Records id, fault_id, old_stage, new_stage, changed_by, changed_at, and reason for stage changes.

### Key Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance metrics.
- **SLA Calculation**: Time-based, dynamic calculation varying by fault priority.
- **Fault Routing**: Intelligent routing of faults to HQ or branches based on the equipment's `faultProtocol`.
- **Notifications**: Automatic in-app alerts to relevant teams for critical events.
- **State Management**: TanStack Query for server state synchronization and localStorage for theme persistence.
- **Authorization**: Role-Based Access Control (RBAC) with 14 distinct roles and branch-level data filtering.
- **Photo Upload**: Utilizes an ObjectUploader component for persistent storage of images on AWS S3.
- **Fault History Display**: Shows the last 5 faults with date/time and priority badges.

### Implemented Modules
- **Authentication & RBAC**: Comprehensive 14-role system with granular permissions.
- **Equipment Management**: Full lifecycle management including health monitoring.
- **Unified Fault System**: Features creation, assignment, workflow, escalation, photo documentation, cost estimation/tracking, and a 2-tab form interface.
- **SLA Monitoring**: Real-time tracking with automated breach alerts.
- **Technician Dashboard**: Manages workload and status updates for technicians.
- **Equipment Analytics**: Provides performance metrics and trends.
- **Extended Modules**: Includes Task Management (AI photo verification), Checklist Management, Knowledge Base (RAG-enabled), Training Academy, HR Management, Performance Dashboards, Shift Management, and Service Requests.

## External Dependencies

### Third-Party Services
- **OpenAI API**: Used for AI-powered vision analysis, chat completions, and embeddings (GPT-4o, GPT-4o-mini).
- **Replit Auth**: Provides user authentication via OpenID Connect.
- **AWS S3**: Cloud storage for various uploads, including photos and documents.
- **Neon Database**: Serverless PostgreSQL instance.
- **IONOS SMTP**: Configured for sending email notifications.

### Key NPM Packages
- **UI**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `lucide-react`.
- **Data**: `@tanstack/react-query`, `drizzle-orm`, `zod`.
- **Forms**: `react-hook-form`, `@hookform/resolvers`.
- **Charts**: `recharts`.
- **Auth**: `passport`, `openid-client`, `express-session`.
- **QR**: `html5-qrcode`, `qrcode.react`.
- **Upload**: `@uppy/core`, `@uppy/react`, `@uppy/aws-s3`.
- **Build**: `vite`, `esbuild`, `tsx`.