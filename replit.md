# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across DOSPRESSO branches, and offers robust role-based access control tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, an AI-powered knowledge base, and a comprehensive Learning Management System (LMS) called DOSPRESSO Academy, featuring gamification, analytics, and certification. The project's ambition is to improve operational efficiency and standardisation across all franchise locations.

## User Preferences
Preferred communication style: Simple, everyday language. Turkish language communication preferred. Fast implementation in Build mode, continues with "devam" frequently.

## System Architecture
### UI/UX Decisions
The frontend utilizes React 18+ with TypeScript and Vite, employing Shadcn/ui (New York variant, Radix UI-based) and Material Design 3 principles. Styling is managed with Tailwind CSS, including dark mode and Turkish localization. The design prioritizes a mobile-first, responsive approach with compact, touch-friendly interactions optimized for vertical screens. All cards utilize semantic tokens for consistent theming. The application consistently uses responsive grid patterns for item and stat cards.

### Technical Implementations
- **Frontend**: React 18, Vite, Wouter (routing), TanStack Query (state management), React Hook Form, Shadcn/ui.
- **Backend**: Node.js, Express.js, TypeScript, with Replit Auth (OpenID) and Passport.js for authentication.
- **Database**: PostgreSQL (Neon serverless) via Drizzle ORM (type-safe) and pgvector for embeddings.
- **Charts**: Recharts for data visualization.
- **File Upload**: Uppy integrated with AWS S3.
- **QR Code**: html5-qrcode for scanning.
- **Background Jobs**: Node.js interval-based scheduling for tasks like SLA checks, notifications, and maintenance reminders.
- **Notifications**: In-app and email async notifications.

### Feature Specifications
- **Authentication & RBAC**: A 14-role system with dual-layer granular permissions (module-level view/edit toggles + action-level scope control) and branch-level data filtering.
- **Equipment Management**: Comprehensive lifecycle management, health monitoring, maintenance scheduling.
- **Unified Fault System**: Creation, assignment, workflow, escalation, photo documentation, cost tracking, QR-integrated reporting, and professional PDF export.
- **SLA Monitoring**: Real-time tracking with automated breach alerts.
- **Troubleshooting System**: Editable guides integrated into fault reporting.
- **QR-Based Attendance**: Secure check-in/out with geofence validation.
- **Lost & Found System**: Tracking, photo capture, handover documentation, and cross-branch visibility.
- **AI Integration**: AI photo verification for tasks, RAG-enabled knowledge base search, AI Academy Chat Assistant, Adaptive Learning Engine, and AI-powered smart recommendations.
- **HR & Shift Management**: Personnel management, leave requests, overtime, attendance, AI-powered fair shift planning.
- **Enhanced Analytics Dashboard**: Tabbed interface showing daily/weekly/monthly metrics with AI-generated summaries.
- **DOSPRESSO Academy (LMS)**: Comprehensive training system including career progression, quiz system, gamification, certification, AI learning paths, and advanced analytics.
- **Daily Task Guidance (Bugünün Görevleri)**: Role-based task templates (daily/weekly/monthly) with personalized task lists, completion tracking, AI-powered recommendations, and progress visualization. Includes event-driven dynamic task system.
- **Checklist Management System**: Time-windowed tasks with HQ/Supervisor editable time slots, photo validation, manager notifications, performance weighting, and daily reminders. Supports scope-based assignment.
- **AI Checklist Verification**: AI-powered photo verification system for checklist tasks with reference photo upload, tolerance slider, multiple AI verification types, similarity scoring.
- **Recipe Management System**: 10 DOSPRESSO categories (Classic Coffee, Special Latte, Freshess, Frappe Shake, Frozen Yogurt, Gourmet Shakes, Herbal Tea, Donutlar, Tatlılar, Tuzlular) with 145+ actual product recipes. Classic Coffee and Special Latte have both HOT and ICED variants with different preparation steps. Each beverage recipe includes Massivo (300-400ml) and Long Diva (550-650ml) size variants with step-by-step Turkish instructions. Automatic version tracking with trainer update notification system that sends notifications to all branch staff when recipes are modified. Includes AI Recipe Creation via photo or text parsing.
- **Quiz System**: MCQ and True/False questions, dynamic options, points, explanations, cooldowns, and attempt tracking.
- **New Shop Opening Management System**: A 7-phase workflow tracking for franchise openings with hierarchical tasks, RACI assignments, and procurement/bidding.
- **Admin Features**: Email settings (SMTP), banner management, AI settings, project task detail pages, and milestone management.
- **Content Studio (İçerik Stüdyosu)**: Unified content management consolidating banner creation and announcement publishing, featuring drafts, published items, and carousel management.
- **Global Search & Calendar View**: Functionality for finding information across the platform and visualizing tasks/milestones.
- **Unified Dashboard Alert System**: Real-time alerts for both branch and factory dashboards supporting 12 trigger types with severity levels.
- **Procurement Management System (Satınalma)**: Complete procurement module with Dashboard, Stok Yönetimi (inventory), Tedarikçi Yönetimi (supplier management), Sipariş Yönetimi (purchase orders), and Mal Kabul (goods receipt).
- **Cost Management System (Maliyet Yönetimi)**: Comprehensive product cost calculation module integrated with procurement. Features raw material management, factory fixed cost tracking, profit margin templates, and automatic cost calculations. Includes product recipes, keyblend security for formulations, raw material price history, and production-inventory integration with AI forecasting.
- **Factory Shift & Production Planning**: Complete shift planning system with batch tracking, performance monitoring, worker assignments, and supervisor verification workflows.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation varying by fault priority.
- **Notifications**: Automatic in-app alerts and email notifications; manager notifications on critical events.
- **State Management**: TanStack Query for server state and localStorage for theme persistence.
- **Photo Upload**: Persistent storage on AWS S3 via an ObjectUploader component.
- **Backup System**: Daily automatic backups to object storage.
- **Live Tracking**: Real-time employee location tracking with in-memory cache for supervisors.
- **RAG Knowledge Base**: Vector-based semantic search using OpenAI embeddings.
- **Gamification**: Integrated badges, career progression, leaderboards, team competitions, adaptive difficulty, certificates, and daily learning streak tracker.
- **Layout System**: Responsive flex-based layouts with standardized gaps.
- **Dashboard Hub**: `CardGridHub` displays 9 mega-module cards with role-based visibility.
- **Mega-Module Architecture**: Each major section uses a tabbed mega-module wrapper that lazy-loads page components, with URL synchronization for deep linking.
- **Shift Scheduling**: Fair algorithm ensuring full-time employees work minimum 6 days/week at 45 hours, part-time 3 days/25 hours.
- **Analytics Architecture**: Three-period tabbed interface with real-time metric aggregation, AI-powered summaries, and conditional alerts.
- **Checklist Scoring**: 40% weight in compositeScore, max score 4/5 if not on-time, scored by supervisor, daily reminders active.
- **Performance Score Data Flows**: Task ratings and checklist completions automatically update employee performance scores.
- **Reminder System**: 5-minute interval checks for task reminders, overdue notifications, maintenance alerts, and checklist completion reminders.
- **Branch Dashboard**: Comprehensive dashboard with real-time stats, alert management, kiosk mode access, and quick access buttons.
- **PDF Generation**: Uses jsPDF with Helvetica font and Turkish character sanitization.
- **Employee of Month System**: Complete implementation with multi-criteria scoring, manager evaluation, branch-specific visibility, and dedicated dashboards/reports.
- **Branch Inspection System (Coach)**: 8-category branch audit system (dış mekan, bina görünüş, bar düzeni, depo, ürün sunumu, personel davranış, dress code, temizlik) with weighted scoring, checkbox-based item evaluation, per-category notes, and photo documentation. Coach-only creation permission.
- **Product Complaint System**: Branch-to-factory product complaint workflow. Branch staff report quality issues (taste, appearance, packaging, freshness, etc.), complaints auto-route to kalite_kontrol role. Includes severity levels, status tracking, and resolution documentation.
- **Branch Health Score Dashboard**: Aggregated branch health visualization combining inspection scores, product complaint stats, and category averages. Includes AI-powered summary generation per branch using OpenAI.
- **Role Separation**: Coach handles branch inspections + guest QR ratings, Trainer handles recipes + training, Kalite Kontrol handles factory product QC + product complaints from branches.

## External Dependencies
### Third-Party Services
- **OpenAI API**: Used for AI-powered vision analysis, chat completions, embeddings, and summary generation.
- **Replit Auth**: Utilized for user authentication via OpenID Connect.
- **AWS S3**: Provides cloud storage for photo uploads, backups, and persistent storage.
- **Neon Database**: A serverless PostgreSQL instance used as the primary database.
- **IONOS SMTP**: Employed for sending email notifications.