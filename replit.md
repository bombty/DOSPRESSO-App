# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform for Headquarter (HQ) staff to centralize and streamline coffee shop franchise operations. Its primary purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across DOSPRESSO branches, and offers robust role-based access control tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, an AI-powered knowledge base, and a comprehensive Academy module for career progression, quizzes, and badge achievements, functioning as a complete Learning Management System (LMS) with full gamification, analytics, and certification capabilities.

## User Preferences
Preferred communication style: Simple, everyday language. User requests Turkish language communication.

## System Architecture

### UI/UX Decisions
The frontend uses React 18+ with TypeScript and Vite, employing Shadcn/ui (New York variant, Radix UI-based) and Material Design 3 principles. Styling is handled with Tailwind CSS, including dark mode and Turkish localization. Typography uses Inter for UI and Roboto for numeric data. A mobile-first, responsive design is prioritized, with a unified page architecture where each major entity has a single, comprehensive detail page.

### Technical Implementations
- **Frontend**: React 18, Vite, Wouter (routing), TanStack Query (state management), React Hook Form, Shadcn/ui.
- **Backend**: Node.js, Express.js, TypeScript, with Replit Auth (OpenID) and Passport.js for authentication.
- **Database**: PostgreSQL (Neon serverless) via Drizzle ORM (type-safe) and pgvector for embeddings.
- **Charts**: Recharts for data visualization.
- **File Upload**: Uppy integrated with AWS S3.
- **QR Code**: html5-qrcode for scanning.
- **Background Jobs**: Node.js interval-based scheduling for tasks like SLA checks and notifications.

### Feature Specifications
- **Authentication & RBAC**: 14-role system with granular permissions and branch-level data filtering.
- **Equipment Management**: Full lifecycle management, health monitoring, and maintenance scheduling.
- **Unified Fault System**: Creation, assignment, workflow, escalation, photo documentation, cost tracking, and QR-integrated reporting with intelligent routing.
- **SLA Monitoring**: Real-time tracking with automated breach alerts.
- **Troubleshooting System**: Editable guides integrated into fault reporting.
- **QR-Based Attendance**: Secure check-in/out with geofence validation, location confidence scoring, and optional WiFi SSID verification.
- **AI Integration**: AI photo verification for tasks, RAG-enabled knowledge base search, AI Academy Chat Assistant, Adaptive Learning Engine, and AI-powered smart recommendations.
- **HR & Shift Management**: Personnel management, leave requests, overtime, attendance, and shift planning.
- **DOSPRESSO Academy (LMS)**: Comprehensive training system including career progression (5 levels), quiz system with leaderboard, badge/achievement system, difficulty progression, AI-generated quiz recommendations, supervisor exam approval workflow, performance analytics, branch-level analytics, team competitions, certification system, cohort analytics, AI learning paths, student progress overview dashboard, daily learning streak tracker, social collaboration (study groups, peer learning, mentorship), and advanced analytics dashboard.

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

---

## 🎯 **FINAL STATUS: ACADEMY MODULE CRUD + BULK IMPORT SYSTEM - 30 NOV 2025**

### ✅ **PHASE 1: TRAINING MODULE SCHEMA EXTENDED**

**Database Schema Changes (PENDING MIGRATION):**
- ✅ `code` varchar(50) - Module code for JSON mapping (e.g., "S1", "BB2")
- ✅ `slug` varchar(100) - URL-friendly identifier
- ✅ `heroImageUrl` text - Module banner image
- ✅ `learningObjectives` jsonb - Array of learning goals
- ✅ `steps` jsonb - Structured learning steps with content and media suggestions
- ✅ `scenarioTasks` jsonb - Real-world scenario tasks for practice
- ✅ `supervisorChecklist` jsonb - Supervisor review checklist items
- ✅ `tags` varchar(100)[] - Module tags for filtering
- ✅ `generatedByAi` boolean - AI generation metadata
- ✅ `module_media` table created - Asset management (images, videos, PDFs)

**⚠️ MIGRATION STATUS:** Schema defined in code, needs `npm run db:push --force` to apply to database

### ✅ **PHASE 2: BACKEND API - JSON BULK IMPORT + CRUD**

**New Endpoints:**
- ✅ `POST /api/training/import` - Bulk import modules from DOSPRESSO Academy JSON
  - Accepts `{ roles: [{ name: string, modules: [...] }] }` structure
  - Maps role-based curriculum to modules with all new fields
  - Returns count of imported modules
  
- ✅ `PUT /api/training/modules/:id` - Update module with new fields
  - Supports partial updates for all schema fields
  - Handles JSONB updates for objectives, steps, scenarios, checklists
  
- ✅ `DELETE /api/training/modules/:id` - Delete module (cascade deletes media)

### ✅ **PHASE 3: FRONTEND - ACADEMY HQ MODULE MANAGEMENT (7 TABS)**

**Existing Tabs (from 28 NOV):**
1. Beklemede - Pending exam requests
2. Onaylı - Approved exams
3. Quizler - Quiz creation
4. Sorular - Question management
5. Atamalar - Quiz assignments
6. Kullanıcılar - User listing

**New Tab - TRAINING MODULES (30 NOV):**
- ✅ **JSON Import Dialog:**
  - "JSON İçe Aktar" button for bulk import
  - Textarea for pasting DOSPRESSO Academy JSON
  - Validates JSON structure and imports all modules at once
  - Success toast with imported count
  
- ✅ **Create Module Dialog:**
  - "Yeni Modül" button to create single modules
  - Form fields: title, description, category, level, duration
  
- ✅ **Module Grid Display:**
  - Card layout showing all modules (3 cols desktop, 2 tablet, 1 mobile)
  - Click to edit functionality (opens Edit Dialog)
  - Delete button (trash icon) with confirmation
  - Status badges (Yayında / Draft)
  
- ✅ **Edit Dialog:**
  - Opens when clicking module card
  - Editable fields: title, description, level, estimated duration
  - Mutations handle PUT requests to backend
  - Cache invalidation on save

### ✅ **COMPLETED FEATURES:**

**Code Changes:**
- ✅ `shared/schema.ts` - 10 new fields + insertModuleMediaSchema
- ✅ `server/routes.ts` - POST /api/training/import endpoint (63 lines)
- ✅ `server/storage.ts` - CRUD methods ready (already existed)
- ✅ `client/src/pages/academy-hq.tsx` - Module management UI (280+ lines of new JSX)
  - Import dialog with JSON parsing
  - Edit dialog with form validation
  - Module card grid with click-to-edit
  - Delete mutations with error handling
  - Form state management (editTrainingForm, importJson state)
  - useQuery for trainingModules list
  - useMutation for create/update/delete/import operations

**Test IDs Added:**
- ✅ `button-import-json` - JSON import button
- ✅ `button-add-training` - Create module button
- ✅ Module cards clickable and editable

### ⚠️ **PENDING ITEMS (NEXT PHASE):**

1. **Database Migration (CRITICAL):**
   - Run: `npm run db:push --force`
   - Creates training_modules new columns + module_media table
   - Current status: Drizzle push command hanging on schema pull (network timeout)
   - **Manual fix:** User can run migration independently

2. **AI Content Generation (Not Started):**
   - OpenAI endpoints for lesson generation
   - Quiz question generation from module content
   - Embedding-based scenario suggestions

3. **Media Upload Component (Not Started):**
   - ObjectUploader integration for images/videos/PDFs
   - AWS S3 upload with progress tracking
   - Module media CRUD endpoints

4. **Module Detail Page (Not Started):**
   - `/egitim-modul/:id` route
   - Display lessons, quizzes, scenarios, checklists
   - Rich editor for module content
   - Media gallery

5. **Bulk JSON Import Testing (Not Started):**
   - Test with actual 2000+ line DOSPRESSO Academy JSON (5 roles × 20+ modules)
   - Verify data mapping and relationships

### 📊 **ARCHITECTURE DECISIONS:**

**JSON Structure Expected (for /api/training/import):**
```json
{
  "roles": [
    {
      "name": "Stajyer",
      "modules": [
        {
          "code": "S1",
          "title": "Başlangıç Eğitimi",
          "description": "...",
          "estimated_duration_min": 30,
          "learning_objectives": ["Obj 1", "Obj 2"],
          "steps": [
            {
              "step_number": 1,
              "title": "Step 1",
              "content": "...",
              "media_suggestions": ["image"]
            }
          ],
          "scenario_tasks": [...],
          "supervisor_checklist": [...],
          "tags": ["kültür", "stajyer"]
        }
      ]
    }
  ]
}
```

**Data Flow:**
1. User pastes JSON in import dialog
2. Frontend parses and sends to `/api/training/import`
3. Backend loops through roles/modules
4. Creates training_modules records with all fields
5. Returns imported count + module list
6. Frontend invalidates cache, shows success

---

## 🚀 **NEXT STEPS FOR USER:**

1. **Apply Database Migration:**
   ```bash
   npm run db:push --force
   ```
   This syncs the new schema columns to PostgreSQL

2. **Test Module Import:**
   - Navigate to Academy HQ > Eğitim Modülleri tab
   - Click "JSON İçe Aktar" button
   - Paste DOSPRESSO Academy JSON
   - Click "İçe Aktar" to import

3. **Test Module CRUD:**
   - Click modules to edit
   - Create new modules with "Yeni Modül"
   - Delete modules with trash icon

4. **For Advanced Features (AI Generation, Media Upload, Module Detail Page):**
   - Consider switching to Autonomous build mode
   - Or continue iteratively with more turns

---

## ✅ **SESSION COMPLETE: 30 NOV 2025 - TURN 7 (FAST MODE)**

**Accomplishments:**
- Schema extended with 10 new fields for rich module content
- module_media table for asset management
- JSON bulk import endpoint backend ready
- Full module CRUD UI in Academy HQ
- Import/Create/Edit/Delete dialogs implemented
- Form validation and error handling complete
- TanStack Query integration done

**Files Modified:**
1. `shared/schema.ts` - Schema extension
2. `server/routes.ts` - JSON import endpoint
3. `client/src/pages/academy-hq.tsx` - Module management UI

**Next Priority:** Database migration + JSON test data import
