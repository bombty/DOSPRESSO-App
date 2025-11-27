# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across all DOSPRESSO branches, and provides robust role-based access control specifically tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, and an AI-powered knowledge base.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18+ with TypeScript and Vite. It employs Shadcn/ui (New York variant, Radix UI-based) adhering to Material Design 3 principles. Styling is managed with Tailwind CSS, including dark mode support and Turkish localization. Typography features Inter for UI and Roboto for numeric data. The design prioritizes a mobile-first approach, ensuring responsiveness across tablet and desktop viewports.

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
- **Troubleshooting System**: Editable guides (42 steps across 7 equipment types) integrated into fault reporting.
- **QR-Based Attendance**: Secure check-in/out with geofence validation, location confidence scoring, and optional WiFi SSID verification.
- **AI Integration**: AI photo verification for tasks and RAG-enabled knowledge base search.
- **HR & Shift Management**: Personnel management, leave requests, overtime, attendance, and shift planning.

### Unified Page Architecture
- **Single Detail Page per Entity**: Each major entity type has one comprehensive detail page serving as the single source of truth, accessible from all modules with consistent navigation patterns.
  - `/personel-detay/:id` - Employee details with 9 tabs (Özlük Dosyası, Disiplin, Onboarding, Görev Ata, Mesaj, Vardiya Geçmişi, Performans, Eğitim Durumu, İzin/Fazla Mesai)
  - `/subeler/:id` - Branch details with tabs for Personel, Görevler, Ekipman, Arızalar, QR & Lokasyon, plus live tracking
  - `/ekipman/:id` - Equipment details with maintenance history and fault logs
  - `/ariza-detay/:id` - Fault details with workflow, timeline, and cost tracking
  - `/gorev-detay/:id` - Task details with checklist, notes, and history tabs
  - `/egitim/:id` - Training module details with lessons, quizzes, flashcards, and progress
- **Cross-Entity Linking**: All entity references (employee names, equipment, branches) link to their respective unified detail pages for seamless navigation.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation varying by fault priority.
- **Notifications**: Automatic in-app alerts for critical events.
- **State Management**: TanStack Query for server state synchronization and localStorage for theme persistence.
- **Photo Upload**: Persistent storage of images on AWS S3 via an ObjectUploader component.
- **Fault History Display**: Displays the last 5 faults with details.
- **Backup System**: Daily automatic backups at midnight (Turkey time, UTC+3) to object storage with file verification. 11 critical tables exported (users, branches, equipment, faults, attendance, audits, feedback, tasks, etc.). Failed backups trigger admin notifications. Backup history persisted in database for easy recovery on server migration.
- **Email Notifications**: Transactional email system via SMTP for notifications, welcome emails, password resets, and alerts. Extensible for Resend integration.
- **Live Tracking**: Real-time employee location tracking with in-memory cache and automatic cleanup. Supervisors can view active branch employees. Tracks latitude, longitude, and accuracy. 5-minute activity timeout.
- **RAG Knowledge Base**: Vector-based semantic search using OpenAI embeddings. `/api/knowledge-base/search` endpoint enables intelligent knowledge article discovery with similarity scoring and chunk-based results.

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