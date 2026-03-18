# DOSPRESSO Franchise Management Platform

## Overview
DOSPRESSO is a comprehensive franchise management platform designed to streamline operations across various business functions, including HR, factory management, training, finance, and CRM. It aims to provide a unified system for managing franchise-specific processes, ensuring operational efficiency, quality control, and data-driven decision-making. The platform supports a multi-role system, accommodating various hierarchical levels from HQ administration to branch-level staff and factory floor operators. Key capabilities include task management, attendance tracking, AI-powered training academy, quality audits, and integrated communication tools. The platform is designed for scalability and robust data handling, crucial for a growing franchise network.

## User Preferences
Preferred communication: Simple, everyday language, Turkish preferred
Fast implementation in Build mode, continues with "devam"

## System Architecture
The platform utilizes a modern web stack with React 18, TypeScript, and Vite for the frontend, leveraging Shadcn/ui, Tailwind CSS, and CVA for a consistent UI/UX. State management is handled by TanStack Query v5. The backend is built with Node.js and Express.js, also in TypeScript. PostgreSQL (Neon serverless) is used as the primary database with Drizzle ORM for data interaction, and `pgvector` for vector embeddings. Authentication is managed via Passport.js with local and kiosk PIN strategies, using session-based authentication.

**Key Architectural Decisions:**
- **Soft Deletion:** All business-critical data employs soft deletion (`isActive: false` + `deletedAt` timestamp) instead of hard deletes.
- **Data Locking:** Records are subject to time/status-based locking (HTTP 423), with a change request workflow for locked data.
- **Internationalization:** The UI supports multiple languages including Turkish, English, Arabic, and German, with a strong emphasis on proper Turkish character usage for all user-facing strings and error messages.
- **Role-Based Access Control (RBAC):** A granular role system with 27 distinct roles (System, Executive, HQ, Legacy HQ, Branch, Factory Floor, Kiosk) dictates access and permissions across modules and features.
- **Kiosk System:** Dedicated PIN-based authentication for factory and branch kiosks, with in-memory sessions and specific middleware (`isKioskAuthenticated`).
- **Module Feature Flags:** A dynamic system (`module_flags`) allows for global, branch-level, and role-specific toggling of features and modules. This includes different behaviors like `fully_hidden`, `ui_hidden_data_continues`, and `always_on`, ensuring flexible deployment and configuration. Sub-modules inherit parent module states.
- **Mobile Compactness:** UI components like `CompactKPIStrip` and `MobileFilterCollapse` are designed for an optimized mobile experience, collapsing filters and using horizontal scrollable strips.
- **AI Integration:** AI capabilities (GPT-4o, GPT-4o-mini, Vision, Embeddings) are integrated into various modules, notably the Academy V3 for content generation and assistant features.
- **Branch Task Board:** Implements recurring task management with scheduling, instance generation, override capabilities, and a scoring system integrated into branch health metrics.
- **Academy HQ:** Refactored into a modular 7-tab structure for managing training modules, quizzes, webinars, analytics, exam requests, and certificate designs, with AI-powered content creation tools.
- **Training Optimizer Skill (Enhanced):** Mr. Dobody's `training_optimizer` skill expanded from 3 to 11 insight types — covering quiz performance trends, branch comparison, personal training recommendations, onboarding tracking, usage/engagement reports, certification pipeline, and quiz gap detection. Runs weekly, targets trainer/coach/ceo/cgo/admin roles. Test endpoint: `GET /api/agent/test-skill/training_optimizer` (admin only).

## External Dependencies
- **OpenAI API**: For AI vision, chat, embeddings, and summarization capabilities.
- **Replit Auth**: Used for user authentication via OpenID Connect.
- **AWS S3**: Employed for cloud storage of user uploads and system backups.
- **Neon Database**: Provides a serverless PostgreSQL database solution.
- **IONOS SMTP**: Utilized for sending email notifications.