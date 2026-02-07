# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across DOSPRESSO branches, and offers robust role-based access control tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, an AI-powered knowledge base, and a comprehensive Learning Management System (LMS) called DOSPRESSO Academy, featuring gamification, analytics, and certification. The project's ambition is to improve operational efficiency and standardisation across all franchise locations.

## User Preferences
Preferred communication style: Simple, everyday language. Turkish language communication preferred. Fast implementation in Build mode, continues with "devam" frequently.

## System Architecture
### UI/UX Decisions
The frontend utilizes React 18+ with TypeScript and Vite, employing Shadcn/ui (New York variant, Radix UI-based) and Material Design 3 principles. Styling is managed with Tailwind CSS, including dark mode and Turkish localization. Typography is set to Inter for UI elements and Roboto for numeric data. The design prioritizes a mobile-first, responsive approach with compact, touch-friendly interactions optimized for vertical screens. All cards utilize semantic tokens for consistent theming. The application consistently uses a responsive grid pattern: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3` for item cards and `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3` for stat cards.

### Technical Implementations
- **Frontend**: React 18, Vite, Wouter (routing), TanStack Query (state management), React Hook Form, Shadcn/ui.
- **Backend**: Node.js, Express.js, TypeScript, with Replit Auth (OpenID) and Passport.js for authentication.
- **Database**: PostgreSQL (Neon serverless) via Drizzle ORM (type-safe) and pgvector for embeddings.
- **Charts**: Recharts for data visualization.
- **File Upload**: Uppy integrated with AWS S3.
- **QR Code**: html5-qrcode for scanning + global modal from all pages.
- **Background Jobs**: Node.js interval-based scheduling for tasks like SLA checks, notifications, maintenance reminders, and backup.
- **Notifications**: In-app + email async notifications with manager alerts on critical events.

### Feature Specifications
- **Authentication & RBAC**: A 14-role system with dual-layer granular permissions (module-level view/edit toggles + action-level scope control) and branch-level data filtering. The module authorization system at `/admin/yetkilendirme` supports 54 permission modules and 53 granular actions with scope-based access (self/branch/global). Includes "Modül Düzenleme" tab for drag-drop module reassignments between 8 mega-modules.
- **Equipment Management**: Comprehensive lifecycle management, health monitoring, maintenance scheduling.
- **Unified Fault System**: Creation, assignment, workflow, escalation, photo documentation, cost tracking, QR-integrated reporting, and professional PDF export.
- **SLA Monitoring**: Real-time tracking with automated breach alerts.
- **Troubleshooting System**: Editable guides integrated into fault reporting.
- **QR-Based Attendance**: Secure check-in/out with geofence validation.
- **Lost & Found System**: Tracking, photo capture, handover documentation, and cross-branch visibility.
- **AI Integration**: AI photo verification for tasks, RAG-enabled knowledge base search, AI Academy Chat Assistant, Adaptive Learning Engine, and AI-powered smart recommendations.
- **HR & Shift Management**: Personnel management, leave requests, overtime, attendance, AI-powered fair shift planning, and comprehensive leave/public holiday management.
- **Enhanced Analytics Dashboard**: Tabbed interface showing daily/weekly/monthly metrics with AI-generated summaries.
- **DOSPRESSO Academy (LMS)**: Comprehensive training system including career progression, quiz system, gamification, certification, AI learning paths, and advanced analytics. Features "Nereden Başlamalıyım?" smart onboarding guide, visual career timeline with requirements/rewards, and personalized next-step recommendations.
- **Checklist Management System**: Time-windowed tasks with HQ/Supervisor editable time slots, photo validation, manager notifications, performance weighting, and daily reminders. Supports scope-based assignment (user/branch/role).
- **AI Checklist Verification**: AI-powered photo verification system for checklist tasks with reference photo upload, tolerance slider, multiple AI verification types, similarity scoring, and temporary photo retention.
- **Recipe Management System**: Supports 14 categories and 55+ recipes with two cup sizes, separate measurements/steps, and automatic version tracking.
- **Quiz System**: MCQ and True/False questions, dynamic options, points, explanations, cooldowns, and attempt tracking.
- **New Shop Opening Management System**: A 7-phase workflow tracking for franchise openings with hierarchical tasks, RACI assignments, and procurement/bidding.
- **Admin Features**: Email settings (SMTP), banner management with photo upload, AI settings, project task detail pages, and milestone management.
- **Content Studio (İçerik Stüdyosu)**: Unified content management consolidating banner creation and announcement publishing, featuring drafts, published items, and carousel management. Supports draft-to-publish workflow with targeting options and scheduling. Includes an advanced banner editor for visual content creation.
- **Global Search & Calendar View**: Functionality for finding information across the platform and visualizing tasks/milestones.
- **Unified Dashboard Alert System**: Real-time alerts for both branch and factory dashboards supporting 12 trigger types with severity levels and visual feedback.
- **Procurement Management System (Satınalma)**: Complete procurement module with 5 sub-systems - Dashboard (real-time stats), Stok Yönetimi (inventory with stock movements), Tedarikçi Yönetimi (supplier management with performance tracking), Sipariş Yönetimi (purchase orders), and Mal Kabul (goods receipt with quality checks). Features automatic stock updates on goods receipt and full audit trail.
- **Cost Management System (Maliyet Yönetimi)**: Comprehensive product cost calculation module integrated with procurement. Features raw material management with price sync from purchase orders, factory fixed cost tracking (13 categories), profit margin templates by product category, and automatic cost calculations. Formula: Total Unit Cost = Raw Material Cost + Overhead Allocation; Suggested Price = Total Unit Cost × Category Profit Margin. Located in Fabrika mega-module at `/fabrika?tab=maliyet-yonetimi`. Now includes:
  - **Product Recipes**: 11 active recipes with ingredient breakdowns (24 products total)
  - **Keyblend Security**: Two-level formulation protection - (1) Keyblend materials always masked for non-admins (KB-***), (2) KEYBLEND recipe types hide ALL ingredients for non-admins
  - **Recipe Types**: OPEN (visible ingredients) vs KEYBLEND (secret formulations)
  - **114 Raw Materials**: 72 standard, 5 Keyblend formulations (KB-DONUT-DRY, KB-DONUT-LIQ, KB-COOKIE, KB-CHEESECAKE, KB-CINNABOOM), 37 recipe ingredients
  - **Ürün Maliyetleri Tab**: Product cost list with KEYBLEND badges, cost details dialog, price sync, and calculate all buttons
  - **Production-Inventory Integration**: Automatic stock deduction on production completion (uretim_cikis), finished product stock addition (uretim_giris), stock check simulation before production, production history tracking, material-inventory linking, low stock notifications, and AI-powered consumption forecasting with order recommendations
  - **Production API Endpoints**: POST /api/production/complete, POST /api/production/check-stock, GET /api/production/history, GET /api/production/:id, GET /api/production/stock-movements, GET /api/production/material-stock-links, POST /api/production/link-material, GET /api/production/ai-insights
  - **Üretim Planlama Tabs**: Takvim (calendar), Üretim Geçmişi (history), Stok Bağlantıları (material-inventory links), AI Analiz (consumption forecasts, recommendations, low stock alerts)
  - **AI Recipe Creation**: Photo-based (OpenAI Vision gpt-4o) and text-based recipe parsing with automatic ingredient matching to existing raw materials using fuzzy matching. Two-step flow: input (photo/text) → review (matched ingredients, manual override, product selection). Endpoints: POST /api/recipes/ai-parse, POST /api/recipes/ai-create

### System Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation varying by fault priority.
- **Notifications**: Automatic in-app alerts and email notifications; manager notifications on critical events.
- **State Management**: TanStack Query for server state and localStorage for theme persistence.
- **Photo Upload**: Persistent storage on AWS S3 via an ObjectUploader component.
- **Backup System**: Daily automatic backups to object storage.
- **Live Tracking**: Real-time employee location tracking with in-memory cache for supervisors. Dashboard at `/canli-takip` with auto-refresh and role-based branch access.
- **RAG Knowledge Base**: Vector-based semantic search using OpenAI embeddings.
- **Gamification**: Integrated badges, career progression, leaderboards, team competitions, adaptive difficulty, certificates, and daily learning streak tracker.
- **Layout System**: Responsive flex-based layouts with standardized gaps.
- **Dashboard Hub**: `CardGridHub` displays 9 mega-module cards with **role-based visibility** - HQ sees all modules, Supervisor sees branch operations (no Factory/NewShop/Admin), Fabrika sees factory-specific modules, Barista/Stajyer see basic operational modules.
- **Mega-Module Architecture**: Each major section uses a tabbed mega-module wrapper that lazy-loads page components, with URL synchronization for deep linking. Key mega-modules:
  - `/fabrika`: 8 tabs (Dashboard, Kiosk, Kalite Kontrol, Performans, Vardiya Uyumluluk, AI Raporlar, Üretim Planlama, Maliyet Yönetimi)
  - `/ekipman`: 3 tabs (Ekipman, Arıza Yönetimi, Ekipman Analitik)
  - `/raporlar`: 12 tabs (Raporlar, Performans, AI Asistan, Kalite Denetimi, etc.)
  - `/akademi`: 18 tabs in 4 groups (Eğitim, Oyunlaştırma, Analitik, Gelişmiş)
  - `/admin`: 28 tabs in 5 groups (Kullanıcılar, Sistem, İçerik, Operasyon, Fabrika)
  - `/operasyon`: 14 tabs (Şubeler, Dashboard, Görevler, Checklistler, etc.)
  - `/yeni-sube`: 4 tabs (Projeler, Proje Görevleri, Franchise Açılış, Kampanya)
  - `/satinalma`: 5 tabs (Dashboard, Stok Yönetimi, Tedarikçiler, Siparişler, Mal Kabul)
- **Mega-Module Tab Groups**: Admin and Akademi modules use two-level navigation with group buttons and tabs within each group.
- **Shift Scheduling**: Fair algorithm ensuring full-time employees work minimum 6 days/week at 45 hours, part-time 3 days/25 hours.
- **Analytics Architecture**: Three-period tabbed interface with real-time metric aggregation, AI-powered summaries, and conditional alerts.
- **Checklist Scoring**: 40% weight in compositeScore, max score 4/5 if not on-time, scored by supervisor, daily reminders active.
- **Performance Score Data Flows**: Task ratings and checklist completions automatically update employee performance scores. Quiz approvals update career progress.
- **Reminder System**: 5-minute interval checks for task reminders, overdue notifications, maintenance alerts, and checklist completion reminders.
- **Branch Dashboard**: Comprehensive dashboard at `/sube/dashboard` with real-time stats, alert management, kiosk mode access, and quick access buttons.
- **PDF Generation**: Uses jsPDF with Helvetica font and Turkish character sanitization for reliable PDF export.
- **Employee of Month System**: Complete implementation with multi-criteria scoring, manager evaluation, branch-specific visibility, and dedicated dashboards/reports.

## External Dependencies
### Third-Party Services
- **OpenAI API**: Used for AI-powered vision analysis, chat completions, embeddings, and summary generation.
- **Replit Auth**: Utilized for user authentication via OpenID Connect.
- **AWS S3**: Provides cloud storage for photo uploads, backups, and persistent storage.
- **Neon Database**: A serverless PostgreSQL instance used as the primary database.
- **IONOS SMTP**: Employed for sending email notifications.