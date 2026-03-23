# DOSPRESSO Franchise Management Platform

## Overview
DOSPRESSO is a comprehensive franchise management platform designed to streamline operations across various business functions, including HR, factory management, training, finance, and CRM. It aims to provide a unified system for managing franchise-specific processes, ensuring operational efficiency, quality control, and data-driven decision-making. The platform supports a multi-role system, accommodating various hierarchical levels from HQ administration to branch-level staff and factory floor operators. Key capabilities include task management, attendance tracking, AI-powered training academy, quality audits, and integrated communication tools. The platform is designed for scalability and robust data handling, crucial for a growing franchise network.

## User Preferences
Preferred communication: Simple, everyday language, Turkish preferred
Fast implementation in Build mode, continues with "devam"

## System Architecture
The platform utilizes a modern web stack with React 18, TypeScript, and Vite for the frontend, leveraging Shadcn/ui, Tailwind CSS, and CVA for a consistent UI/UX. State management is handled by TanStack Query v5. The backend is built with Node.js and Express.js, also in TypeScript. PostgreSQL (Neon serverless) is used as the primary database with Drizzle ORM for data interaction, and `pgvector` for vector embeddings. Authentication is managed via Passport.js with local and kiosk PIN strategies, using session-based authentication.

**Key Architectural Decisions:**
- **Soft Deletion:** All business-critical data employs soft deletion.
- **Data Locking:** Records are subject to time/status-based locking, with a change request workflow.
- **Internationalization:** The UI supports multiple languages including Turkish, English, Arabic, and German, with emphasis on proper Turkish character usage.
- **Role-Based Access Control (RBAC):** A granular role system with 27 distinct roles dictates access and permissions.
- **Kiosk System:** Dedicated PIN-based authentication for factory and branch kiosks with PostgreSQL-backed sessions and an in-memory cache.
- **Module Feature Flags:** A dynamic system allows for global, branch-level, and role-specific toggling of features and modules.
- **Mobile Compactness:** UI components are designed for an optimized mobile experience.
- **AI Integration:** AI capabilities (GPT-4o, GPT-4o-mini, Vision, Embeddings) are integrated into various modules, notably the Academy V3.
- **Branch Task Board:** Implements recurring task management with scheduling, instance generation, and a scoring system.
- **Academy HQ:** Refactored into a modular 7-tab structure for managing training, quizzes, webinars, analytics, and certificates with AI-powered content creation.
- **Training Optimizer Skill:** Enhanced to provide 11 insight types for training performance and recommendations.
- **Employee Summary Service:** Aggregates per-employee performance metrics into weighted composite scores.
- **Factory Worker Scoring Service:** Calculates daily/weekly performance scores for factory workers based on weighted components like production, waste, quality, attendance, and breaks.
- **CareerTab Certificates:** Students can view and print issued certificates.
- **Stub Endpoints:** Placeholder API endpoints for future modules, returning sensible empty defaults.
- **Agent Dedup:** Global title-based deduplication for agent notifications.
- **Permission Service:** Provides scope-based data filtering for payroll and HR routes.
- **Self-Service Password Change:** Users can change their own password, and admins can bulk reset passwords.
- **Notification Preferences:** Users can manage notification preferences stored as JSONB.
- **Shift AI Planner:** Enhanced with automatic break calculation, validation, and weekly plan generation, including PDKS compliance checks.
- **Mr. Dobody Guidance System:** Proactive gap detection and user guidance system scanning 15 categories across branches, with role-based targeting and dismissal capabilities.
- **QC + Lot Tracking Enhancement:** Automatic lot creation and QC stats endpoint with a dedicated QC Tracker Dobody skill.
- **Kiosk QC Mode:** Factory kiosk supports a dedicated Quality Control mode for inspecting outputs.
- **Payroll Calculation Service:** Consolidates SGK/tax calculations with proper rate handling and PDF export functionality.
- **Auth Security:** Enhanced login security with password stripping and lockout mechanisms.
- **İK Module Enhancement:** Includes an İK Dashboard with KPIs, Document CRUD, and Disciplinary CRUD.
- **Type Augmentation:** Centralized `AuthUser` type and Express type augmentation for improved type safety.
- **Structural Cleanup:** Original `misc.ts` split into 42 domain-specific route files.
- **Mission Control Dashboard:** 4 role-based MC dashboards (HQ, Supervisor, Stajyer, Factory) with DashboardRouter. HQ: 5 KPI strip, Factory+QC, İK, branch health, quick actions. Supervisor: 6 KPIs (Burada/Geç/Mola/Gelmedi/Checklist/Performans), PresenceBar, StaffCard grid, ShiftTimeline, checklist section. Stajyer: 6 KPIs (İlerleme/Seri/Quiz/Tamamlanan/Kalan/Sertifika), CareerRoadmap, LearningStreak, ModuleCard, BadgeGrid, quiz results. Factory: 6 KPIs (Üretim/Fire/Personel/QC Bekleyen/QC Onay/Hedef), StationCard, QCSummary, StaffCard grid. 9 shared components in mission-control/shared/. Toggle via `useDashboardMode` hook. Admin default layout via `/api/admin/default-dashboard-layout`.
- **Collapsible Sidebar:** Desktop sidebar replaces NavRail — toggles between 50px (icons only) and 200px (icons + labels + categories). Server-driven menu from `/api/me/menu` API. State persisted in localStorage. Mobile unchanged (hamburger overlay + bottom nav).
- **Unified CRM (Mega Sprint 1):** İletişim Merkezi + CRM + Misafir Memnuniyeti merged into single `/crm` page with 2-channel toggle (Franchise/Misafir). `support_tickets` table extended with `channel`, `ticket_type`, `source`, `rating_*`, `customer_*` columns. Data from `hq_support_tickets` and `customer_feedback` migrated into `support_tickets`. API supports `?channel=franchise|misafir` filtering on `/api/iletisim/tickets` and `/api/iletisim/dashboard`. Old paths `/iletisim-merkezi` and `/misafir-memnuniyeti` redirect to `/crm?channel=franchise` and `/crm?channel=misafir` respectively.

## External Dependencies
- **OpenAI API**: For AI vision, chat, embeddings, and summarization.
- **Replit Auth**: Used for user authentication.
- **AWS S3**: Employed for cloud storage.
- **Neon Database**: Provides a serverless PostgreSQL database.
- **IONOS SMTP**: Utilized for sending email notifications.