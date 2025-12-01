# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across DOSPRESSO branches, and offers robust role-based access control tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, an AI-powered knowledge base, and a comprehensive Learning Management System (LMS) called DOSPRESSO Academy, featuring gamification, analytics, and certification. The project's ambition is to improve operational efficiency and standardisation across all franchise locations.

## User Preferences
Preferred communication style: Simple, everyday language. User requests Turkish language communication.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18+ with TypeScript and Vite, employing Shadcn/ui (New York variant, Radix UI-based) and Material Design 3 principles. Styling is managed with Tailwind CSS, including dark mode and Turkish localization. Typography is set to Inter for UI elements and Roboto for numeric data. The design prioritizes a mobile-first, responsive approach, featuring a unified page architecture where each major entity is presented on a single, comprehensive detail page.

### Technical Implementations
- **Frontend**: React 18, Vite, Wouter (routing), TanStack Query (state management), React Hook Form, Shadcn/ui.
- **Backend**: Node.js, Express.js, TypeScript, with Replit Auth (OpenID) and Passport.js for authentication.
- **Database**: PostgreSQL (Neon serverless) via Drizzle ORM (type-safe) and pgvector for embeddings.
- **Charts**: Recharts for data visualization.
- **File Upload**: Uppy integrated with AWS S3.
- **QR Code**: html5-qrcode for scanning.
- **Background Jobs**: Node.js interval-based scheduling for tasks like SLA checks and notifications.

### Feature Specifications
- **Authentication & RBAC**: A 14-role system with granular permissions and branch-level data filtering.
- **Equipment Management**: Comprehensive lifecycle management, health monitoring, and maintenance scheduling.
- **Unified Fault System**: Creation, assignment, workflow, escalation, photo documentation, cost tracking, and QR-integrated reporting with intelligent routing.
- **SLA Monitoring**: Real-time tracking with automated breach alerts.
- **Troubleshooting System**: Editable guides integrated into fault reporting.
- **QR-Based Attendance**: Secure check-in/out with geofence validation, location confidence scoring, and optional WiFi SSID verification.
- **AI Integration**: AI photo verification for tasks, RAG-enabled knowledge base search, AI Academy Chat Assistant, Adaptive Learning Engine, and AI-powered smart recommendations.
- **HR & Shift Management**: Personnel management, leave requests, overtime, attendance, and shift planning.
- **DOSPRESSO Academy (LMS)**: A comprehensive training system including career progression (5 levels), quiz system with leaderboard, badge/achievement system, difficulty progression, AI-generated quiz recommendations, supervisor exam approval workflow, performance analytics, branch-level analytics, team competitions, certification system, cohort analytics, AI learning paths, student progress overview dashboard, daily learning streak tracker, social collaboration (study groups, peer learning, mentorship), and advanced analytics dashboard.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation varying by fault priority.
- **Notifications**: Automatic in-app alerts for critical events and email notifications via SMTP.
- **State Management**: TanStack Query for server state synchronization and localStorage for theme persistence.
- **Photo Upload**: Persistent storage of images on AWS S3 via an ObjectUploader component.
- **Backup System**: Daily automatic backups to object storage with file verification and admin notifications.
- **Live Tracking**: Real-time employee location tracking with in-memory cache for supervisors.
- **RAG Knowledge Base**: Vector-based semantic search using OpenAI embeddings.
- **Gamification**: Integrated badges (6 types), career progression (5 levels), leaderboards (global, branch, exam), team competitions, adaptive difficulty, certificates, and daily learning streak tracker.

## Recent Changes (Dec 1, 2025)

### Coffee-Themed Gamification Badge System - COMPLETED ✅
**Feature:** Career progression badges following "bean-to-cup" coffee journey metaphor
**Implementation:**

1. **Career Level Badges** (5 levels matching DOSPRESSO structure):
   - Coffee Cherry (Stajyer) - Beginner level
   - Green Bean (Bar Buddy) - Beginner level
   - Bean Expert (Barista) - Intermediate level
   - Roast Master (Supervisor Buddy) - Advanced level
   - Coffee Pro (Supervisor) - Advanced level

2. **Database Schema** (shared/schema.ts):
   - `badges` table with: id, name, description, badgeKey, icon, points, requiredLevel, createdAt
   - `userBadges` table with: id, userId, badgeId, progress, unlockedAt
   - Automatic seeding of all 5 career badges on server startup

3. **Backend API Endpoints** (server/routes.ts):
   - POST `/api/training/modules/:id/complete` - Award career badge on module completion
   - GET `/api/academy/badges` - Fetch all available badges (authenticated)
   - GET `/api/academy/user-badges` - Get user's earned badges
   - GET `/api/training/modules/:id/completion-status` - Get completion + earned badges

4. **Badge Award Logic**:
   - Module completion triggers badge check based on difficulty level
   - Beginner modules → Coffee Cherry/Green Bean badges
   - Intermediate modules → Bean Expert badge
   - Advanced modules → Roast Master/Coffee Pro badges
   - Prevents duplicate badges for same user
   - Tracks progress and unlock timestamp

5. **Frontend Integration** (module-detail.tsx):
   - Module completion screen displays earned badge with Award icon
   - "Tamamla ve Kapat" (Complete & Close) button records completion and awards badge
   - Badge display: yellow background with award icon and module title
   - Smooth 300ms delay before closing to confirm badge save

6. **Storage Layer** (server/storage.ts):
   - `getBadges()` - Fetch all badges ordered by points
   - `getUserBadges(userId)` - Fetch user's earned badges with badge details
   - `createOrUpdateUserTrainingProgress()` - Record module completion with score/timestamp

7. **Production Status**:
   - ✅ Zero TypeScript/LSP errors
   - ✅ Automatic badge seeding confirmed in logs
   - ✅ All endpoints functional and tested
   - ✅ Turkish language support throughout
   - ✅ Database migrations applied

### Module Photo Management System - IN PROGRESS ✅
**Feature:** Add, optimize, and AI-generate images for training modules with consistent gallery layout
**Implementation:**

1. **Backend Image Processing** (server/imageProcessor.ts):
   - `optimizeGalleryImage()`: Auto-resize to 600x400px with object-fit:cover (no distortion)
   - Sharp library: compress with quality optimization, convert to WebP format
   - `generateThumbnail()`: Quick preview generation

2. **Backend API Endpoints** (server/routes.ts):
   - POST `/api/training/modules/:id/upload-image` - Upload, optimize, store in S3
   - POST `/api/training/modules/:id/generate-image` - Create images with DALL-E
   - DELETE `/api/training/modules/:id/gallery/:imageIndex` - Remove images
   - Rate limiting: 5 AI images/day per user

3. **Schema Update** (shared/schema.ts):
   - Added `galleryImages` JSONB array to trainingModules table
   - Structure: `{ url, alt, uploadedAt }`

4. **Frontend Gallery Component** (client/src/components/ModuleGallery.tsx):
   - Image upload with drag-drop support
   - AI image generation with text prompt
   - Banner-style gallery grid (600x400 aspect ratio)
   - Consistent sizing with object-fit:cover
   - Delete functionality with hover reveal

5. **Module Editor Integration** (academy-hq.tsx):
   - ModuleGallery component in module editing dialog
   - Real-time gallery updates
   - Support for both upload and AI generation

## Recent Changes (Dec 1, 2025)

### AI-Powered Module Generator with File Upload - COMPLETED ✅
**Feature:** Convert text/articles, PDFs, and photos into structured training modules using AI
**Implementation:**

1. **Backend AI Integration** (server/ai.ts):
   - `generateTrainingModule()` function with DOSPRESSO brand voice
   - `extractTextFromPDF()` function using pdf-parse v4 (PDFParse class)
   - `extractTextFromImage()` function using GPT-4o Vision API for OCR
   - `processUploadedFile()` unified handler for PDF and image files
   - OpenAI GPT-4o integration with JSON structured output
   - Generates: learning objectives, content steps, quiz questions, scenarios, supervisor checklist
   - Rate limiting: 20 AI generations per user per day
   - Turkish language support throughout

2. **API Endpoints** (server/routes.ts):
   - POST `/api/training/generate` - AI generates module from text input
   - POST `/api/training/generate/upload` - Upload PDF/image, extract text via AI
   - POST `/api/training/generate/save` - Saves generated module to database
   - Multer configuration: 10MB limit, memory storage, MIME whitelist
   - Admin/coach role restriction with proper error handling

3. **Frontend 3-Step Wizard** (academy-hq.tsx):
   - Step 1: Toggle between "Metin Gir" (text input) and "Dosya Yükle" (file upload)
   - File upload with drag-drop interface, supports PDF, JPEG, PNG, HEIC
   - Extracted text displayed in editable textarea for user review
   - Step 2: AI preview showing generated content with all sections
   - Step 3: Save to database with instant feedback
   - Loading states for text extraction and AI generation

4. **Generated Module Structure**:
   - Title & description
   - 4-6 learning objectives
   - 3-5 training steps with media suggestions
   - 3-5 quiz questions (MCQ/True-False)
   - 1-2 scenario tasks
   - 3-5 supervisor checklist items

5. **Security & Performance**:
   - MIME type whitelist (application/pdf, image/jpeg, image/png, image/webp, image/heic)
   - File size limit: 10MB
   - Minimum text validation (50 chars) before AI generation
   - Memory buffer cleared after processing

### Academy LMS Module Management - COMPLETED ✅
**Problem:** Users (admin) could not see training modules and couldn't easily edit them.
**Solution Implemented:**
1. **Fixed TypeScript Errors** (academy-hq.tsx):
   - Line 825: Fixed nullable `level` value in Select component with fallback to "beginner"
   - Line 882: Proper form reset with explicit type-safe object mapping for all fields
   - Eliminated implicit null-to-undefined type mismatches

2. **Added Admin Navigation** (academy.tsx):
   - Conditional "Yönetim Paneli" button in Academy page header
   - Only visible to admin users (role === 'admin')
   - Routes to `/akademi-hq` management panel

3. **Module Management Panel** (academy-hq.tsx):
   - Training modules displayed in grid view with card layout
   - Edit button (✎ Düzenle) for inline module editing
   - Delete button for removing modules
   - Module details: title, level, duration, status (published/draft)
   - Role-based access control: HQ-only access with error message for unauthorized users

4. **Type Safety Improvements**:
   - Proper handling of nullable database fields
   - Form schema alignment with database model
   - Correct field mappings in form reset logic

## External Dependencies

### Third-Party Services
- **OpenAI API**: Used for AI-powered vision analysis, chat completions, and embeddings.
- **Replit Auth**: Utilized for user authentication via OpenID Connect.
- **AWS S3**: Provides cloud storage for various uploads within the application.
- **Neon Database**: A serverless PostgreSQL instance used as the primary database.
- **IONOS SMTP**: Employed for sending email notifications.
