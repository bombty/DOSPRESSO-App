# DOSPRESSO Franchise Management WebApp

## Overview

DOSPRESSO is a comprehensive franchise management platform designed for managing coffee shop operations across multiple branches. The system provides centralized control for HQ staff to monitor branches, assign tasks, track equipment, manage training, and leverage AI-powered verification and analytics. The entire user interface is in Turkish, serving the Turkish market with role-based access for both HQ personnel and branch staff.

The platform enables:
- Task assignment and AI-powered photo verification with supervisor assignment to branch employees
- Equipment fault reporting and tracking with detailed equipment history (maintenance logs, fault history, collaborative comments)
- Knowledge base management for SOPs, recipes, and procedures
- Performance metrics and KPI dashboards
- Automated reminder system for incomplete tasks
- Checklist management for routine operations
- Training academy with interactive module detail pages (videos, quizzes, flashcards)
- HQ support ticket system for branch-to-headquarters communication and issue tracking

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript, utilizing Vite as the build tool and development server.

**UI Component System**: Shadcn/ui (New York variant) built on Radix UI primitives, providing accessible, customizable components with consistent design patterns. The design system follows Material Design 3 principles adapted for enterprise use.

**Styling**: Tailwind CSS with custom configuration for DOSPRESSO branding (navy and beige corporate palette). CSS variables enable theme customization with support for light/dark modes.

**State Management**: TanStack Query (React Query) for server state management, providing automatic caching, background refetching, and optimistic updates. No additional global state management layer is used, keeping complexity minimal.

**Routing**: Wouter for lightweight client-side routing with path-based navigation.

**Form Handling**: React Hook Form with Zod schema validation, integrating with Shadcn/ui form components for type-safe form management.

**File Uploads**: Uppy with AWS S3 integration for photo uploads (task verification, fault reports).

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Language**: TypeScript with ES modules

**API Design**: RESTful endpoints under `/api/*` namespace, with authentication middleware protecting all routes except public landing page.

**Authentication**: Replit Auth using OpenID Connect (OIDC) with Passport.js strategy. Session management via express-session with PostgreSQL-backed session store for persistence.

**AI Integration**: OpenAI API (GPT-5) for:
- Task photo analysis and scoring (Vision API)
- Equipment fault diagnosis and recommendations (Vision API)
- Knowledge base semantic search and RAG (Retrieval-Augmented Generation)
- AI-powered Q&A system with source attribution

**RAG System**: PostgreSQL with pgvector extension for:
- Automatic embedding generation for published knowledge base articles
- Semantic search using OpenAI text-embedding-3-small model
- Vector similarity search with cosine distance
- Context-aware question answering with GPT-5

**Background Jobs**: Custom reminder system running on interval timers to check incomplete tasks and send notifications every 10 minutes.

**Data Access**: Drizzle ORM providing type-safe database queries with schema-first approach. All database operations abstracted through a storage layer interface for maintainability.

### Database Architecture

**Database**: PostgreSQL (Neon serverless)

**ORM**: Drizzle ORM with schema defined in `shared/schema.ts`

**Schema Design**:
- **Users**: Role-based access with HQ roles (muhasebe, satinalma, coach, teknik, destek, fabrika, yatirimci) and branch roles (supervisor, barista, stajyer)
- **Branches**: Store locations with contact information
- **Tasks**: Assignable work items with status tracking, AI scoring, photo verification, assignedToId and assignedById for supervisor task delegation
- **Checklists**: Reusable task templates with category and frequency settings
- **ChecklistTasks**: Many-to-many relationship linking checklists to specific tasks
- **Equipment**: Equipment registry with maintenance intervals, warranty tracking, QR codes for quick access
- **EquipmentFaults**: Fault reports with severity levels, AI analysis, and equipmentId linking to Equipment table
- **EquipmentMaintenanceLogs**: Maintenance history per equipment (routine, repair, calibration, cleaning) with cost tracking
- **EquipmentComments**: Collaborative comments on equipment for team communication
- **KnowledgeBaseArticles**: SOPs, recipes, calibration guides, troubleshooting docs with categorization and publishing workflow
- **KnowledgeBaseEmbeddings**: Vector embeddings (1536 dimensions) for semantic search with article chunks and similarity indexing
- **Reminders**: Automated notification tracking with reminder count and scheduling
- **PerformanceMetrics**: KPI snapshots with completion rates and AI scores
- **HQSupportTickets**: Support tickets from branches to HQ departments (muhasebe, satinalma, coach, teknik, destek, fabrika, genel) with status tracking
- **HQSupportMessages**: Threaded messages within support tickets for chat-style communication
- **TrainingModules**: Training content with videos, quizzes, and flashcards
- **EquipmentServiceRequests**: Service workflow tracking with state machine (created→service_called→in_progress→fixed/not_fixed/warranty_claimed/device_shipped→closed), timeline JSONB, cost tracking
- **MenuSections**: Dynamic menu configuration (slug, titleTr, scope, icon, sortOrder) for admin-controlled sidebar structure
- **MenuItems**: Individual menu items (titleTr, path, icon, moduleKey, scope, sortOrder, isActive) linked to sections
- **MenuVisibilityRules**: Layered visibility control (ruleType: user/role/branch, allow/deny) with branch scoping and priority resolution
- **Sessions**: PostgreSQL-backed session storage for authentication

**Vector Search**: pgvector extension enabled for semantic similarity search using cosine distance operator (<=>)

**Migrations**: Managed via Drizzle Kit with schema push capability

### Design System

**Typography**: Inter for UI elements, Roboto for numeric data, ensuring Turkish character support (ğ, ı, ş, ü, ö, ç)

**Spacing**: Tailwind spacing primitives (0.5rem, 1rem, 1.5rem, 2rem) for consistent layouts

**Responsive Strategy**: Mobile-first approach with breakpoints for tablet (md) and desktop (lg), using CSS Grid for dashboard layouts

**Component Patterns**: Compound components from Radix UI providing accessibility out-of-the-box, with custom variants via class-variance-authority

## External Dependencies

### Third-Party Services

**OpenAI API**: 
- Purpose: AI-powered photo analysis, fault diagnosis, semantic search, and RAG-based Q&A
- Integration: Direct HTTP calls via openai npm package
- Models: 
  - GPT-5 for vision analysis and chat completions
  - text-embedding-3-small for generating 1536-dimensional embeddings
- Features used: 
  - Vision API for task and fault photo analysis
  - Chat completions for Q&A with RAG context
  - Embeddings API for knowledge base semantic search

**Replit Auth**:
- Purpose: User authentication and session management
- Integration: OpenID Connect via openid-client and passport
- Session storage: PostgreSQL via connect-pg-simple

**AWS S3** (via Uppy):
- Purpose: Photo and file upload storage
- Integration: @uppy/aws-s3 with presigned URL workflow
- Use cases: Task verification photos, fault report images, knowledge base attachments

**Neon Database**:
- Purpose: Serverless PostgreSQL hosting
- Integration: @neondatabase/serverless with WebSocket support
- Connection pooling: Built-in via Neon's Pool implementation

### Key NPM Packages

**UI Framework**:
- @radix-ui/* (18+ packages): Accessible component primitives
- tailwindcss: Utility-first CSS framework
- class-variance-authority: Component variant management
- lucide-react: Icon system

**Data & State**:
- @tanstack/react-query: Server state management
- drizzle-orm: Type-safe database ORM
- drizzle-kit: Schema migrations
- zod: Schema validation

**Forms & Uploads**:
- react-hook-form: Form state management
- @hookform/resolvers: Form validation integration
- @uppy/core, @uppy/react, @uppy/dashboard, @uppy/aws-s3: File upload system

**Authentication**:
- passport: Authentication middleware
- openid-client: OIDC client implementation
- express-session: Session management
- connect-pg-simple: PostgreSQL session store

**Build Tools**:
- vite: Frontend build tool and dev server
- esbuild: Backend bundling for production
- tsx: TypeScript execution for development

## Recent Changes

### Task 10: Dynamic Menu System (November 11, 2025)

Implemented complete admin-controlled dynamic menu system with 4 subtasks:

**10.1 - Schema Design:**
- Added `menu_sections` table (id, slug, titleTr, scope, icon, sortOrder)
- Added `menu_items` table (id, sectionId, titleTr, path, icon, moduleKey, scope, sortOrder, isActive)
- Added `menu_visibility_rules` table (id, menuItemId, ruleType, role, userId, branchId, allow)
- All tables include Zod schemas, TypeScript types, and Drizzle relations

**10.2 - API Layer:**
- Storage interface: 11 methods (listMenu, CRUD for sections/items/rules, reordering)
- REST API: 11 endpoints under `/api/admin/menu/*` with HQ-only authorization
- Full CRUD support for sections, items, and visibility rules
- Batch reordering for sections and items (PATCH endpoints)

**10.3 - Admin UI:**
- Admin page: `/yonetim/menu` with @dnd-kit drag-drop for sections and nested items
- Section CRUD dialogs with icon picker (20+ Lucide icons)
- Item CRUD dialogs with path, icon, module, scope configuration
- Visibility rules dialog with role multi-select, user autocomplete, branch selector
- TanStack Query caching (staleTime: 5min)
- Turkish labels, data-testid attributes for testing

**10.4 - Dynamic Sidebar Integration:**
- app-sidebar.tsx: Fetch menu from GET `/api/admin/menu` with TanStack Query
- Data transformation: API payload → MenuGroup/MenuItem format
- Lucide icon mapping with Circle fallback for unknown icons
- Layered visibility filtering:
  1. User-specific rules (with branch scoping)
  2. Role-based rules (branch-scoped > global)
  3. Branch-level rules
  4. Default: allow
- Fallback to hardcoded menuGroups if dynamic menu empty/error
- Cache invalidation: All admin mutations trigger sidebar cache refresh
- Caching: staleTime 5min, gcTime 30min, retry on error/focus/reconnect

**Technical Highlights:**
- Branch scoping: Rules apply only when branchId matches user's branch or is null
- Priority resolution: User-specific > role+branch > branch-level > default allow
- Icon validation: Admin UI validates icon names against lucideIconMap
- Migration path: Dynamic menu coexists with hardcoded fallback during transition

**Files Modified:**
- shared/schema.ts: Added 3 tables (menu_sections, menu_items, menu_visibility_rules)
- server/storage.ts: Added 11 storage methods for menu management
- server/routes.ts: Added 11 API endpoints with HQ authorization
- client/src/pages/yonetim/menu.tsx: Admin menu management UI (new file)
- client/src/components/app-sidebar.tsx: Dynamic menu integration with visibility filtering

**Operating Cost:** Maintained at $7.80/month (below $10 target)