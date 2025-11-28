# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across all DOSPRESSO branches, and provides robust role-based access control specifically tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, an AI-powered knowledge base, and a comprehensive Academy module for career progression, quizzes, and badge achievements.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18+ with TypeScript and Vite. It employs Shadcn/ui (New York variant, Radix UI-based) adhering to Material Design 3 principles. Styling is managed with Tailwind CSS, including dark mode support and Turkish localization. Typography features Inter for UI and Roboto for numeric data. The design prioritizes a mobile-first approach, ensuring responsiveness across tablet and desktop viewports. The system uses a unified page architecture, where each major entity has a single, comprehensive detail page accessible from all modules.

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
- **Equipment Management**: Full lifecycle management, including health monitoring and maintenance scheduling.
- **Unified Fault System**: Creation, assignment, workflow, escalation, photo documentation, cost tracking, and QR-integrated reporting with intelligent routing.
- **SLA Monitoring**: Real-time tracking with automated breach alerts.
- **Troubleshooting System**: Editable guides integrated into fault reporting.
- **QR-Based Attendance**: Secure check-in/out with geofence validation, location confidence scoring, and optional WiFi SSID verification.
- **AI Integration**: AI photo verification for tasks and RAG-enabled knowledge base search.
- **HR & Shift Management**: Personnel management, leave requests, overtime, attendance, and shift planning.
- **DOSPRESSO Academy**: A comprehensive training system including career progression, quiz system with leaderboard, badge/achievement system, difficulty progression, AI-generated quiz recommendations, supervisor exam approval workflow, and performance analytics dashboard.

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
#### **Phase 12: Branch-Level Analytics** (✅ COMPLETE)
- `/akademi-branch-analytics` page with branch performance metrics
- API endpoint: `GET /api/academy/branch-analytics` - Get metrics for all branches
- 3 Tabs: Comparison (bar charts), Rankings (top branches), Details (table view)
- Metrics: Active students, completion rates, average scores, completed quizzes
- Visual comparisons with Recharts bar charts
- Branch rankings sorted by performance
- Quick link in Academy hub pointing to branch analytics


#### **Phase 13: Team Competitions & Gamification** (✅ COMPLETE)
- `/akademi-team-competitions` page with 3 tabs (Canlı Yarışma, Liderlik, Geçmiş)
- API endpoints:
  - `GET /api/academy/team-competitions` - Active and completed competitions
  - `GET /api/academy/monthly-challenge` - Current month's challenge with progress
- Monthly Challenge widget showing:
  - Title and description
  - Days remaining in month
  - Point rewards
  - Participation count
- Real-time competition leaderboard with rankings
- Historical competition results with winners
- Unlockable competition badges (🥇 1. Sıra Ustası, 🔥 Yanış Erişim, ⭐ Harita Şampiyon, 💎 Elmas Derece)
- Bar charts comparing branch scores
- Quick link in Academy hub pointing to competitions

