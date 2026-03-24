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
- **Kiosk System:** Dedicated PIN-based authentication for factory and branch kiosks.
- **Module Feature Flags:** A dynamic system allows for global, branch-level, and role-specific toggling of features and modules.
- **Mobile Compactness:** UI components are designed for an optimized mobile experience.
- **AI Integration:** AI capabilities (GPT-4o, GPT-4o-mini, Vision, Embeddings) are integrated into various modules, notably the Academy V3 for content creation and insights.
- **Branch Task Board:** Implements recurring task management with scheduling and a scoring system.
- **Academy HQ:** Modular 7-tab structure for managing training, quizzes, webinars, analytics, and certificates.
- **Employee & Factory Worker Scoring Services:** Aggregate performance metrics and calculate daily/weekly scores.
- **Notification System:** Supports user preferences, category-based frequency, and a "Dobody Aksiyon Al" quick-action system with templating. Includes archiving for older notifications.
- **Shift AI Planner:** Enhanced with automatic break calculation, validation, and weekly plan generation, including PDKS compliance.
- **Mr. Dobody Guidance System:** Proactive gap detection and user guidance across 15 categories, with role-based targeting.
- **QC + Lot Tracking:** Automatic lot creation and QC stats, including a Kiosk QC Mode.
- **Payroll Calculation Service:** Consolidates SGK/tax calculations with PDF export.
- **Auth Security:** Enhanced login security with password stripping and lockout mechanisms.
- **İK Module:** Includes Dashboard with KPIs, Document CRUD, and Disciplinary CRUD.
- **Mission Control Dashboards:** Four role-based dashboards (HQ, Supervisor, Stajyer, Factory) with role-specific KPIs and quick actions.
- **Collapsible Sidebar:** Desktop sidebar with server-driven menu, state persisted locally.
- **Unified CRM:** Merged İletişim Merkezi, CRM, and Misafir Memnuniyeti into a single interface with two channels (Franchise/Misafir) and support for QR feedback. Includes a new "Gorevler" (Tasks) channel showing user todos.
- **Automation (Kopuk Zincir Otomasyonları):** Introduced Mr. Dobody skills for payroll reminders, career progression tracking, equipment lifecycle monitoring (fault escalation), and supply chain monitoring.
- **Agenda Module:** Personal calendar, todo list, and notes with CRUD APIs and daily briefings from Mr. Dobody. Smart reminders and auto-todo creation from CRM tickets are also integrated.
- **Tab-less Dashboard Transformation & UX Vision:** Core modules (Equipment, Factory, Academy, HR) transitioned to a sidebar + KPI strip + dashboard layout for improved navigation. UI/UX enhancements include a hierarchical, collapsible sidebar, detailed Todo modals, and standardized KPI pill components.
- **Mobile Quick Action Mode:** Role-based shortcut buttons and kiosk improvements, including BaristaQuickActions, SupervisorQuickBar, and Kiosk Fault Reporting.
- **Cross-Module Intelligence & Branch P&L:** Introduced a Cross-Module Analyzer service for identifying correlations across various operational data, and a Branch Financial Service for calculating and reporting branch profitability. These are supported by new Mr. Dobody skills and dedicated reporting interfaces.

## External Dependencies
- **OpenAI API**: For AI vision, chat, embeddings, and summarization.
- **Replit Auth**: Used for user authentication.
- **AWS S3**: Employed for cloud storage.
- **Neon Database**: Provides a serverless PostgreSQL database.
- **IONOS SMTP**: Utilized for sending email notifications.