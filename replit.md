# DOSPRESSO Franchise Management WebApp

## Overview
DOSPRESSO is a web-based platform designed to centralize and streamline coffee shop franchise operations for Headquarter (HQ) staff. Its core purpose is to monitor branches, assign and AI-verify tasks, track equipment health, manage training, and provide comprehensive support. The platform aims to enhance efficiency, ensure brand consistency across DOSPRESSO branches, and offers robust role-based access control tailored for the Turkish market. Key capabilities include unified fault management with QR integration, SLA monitoring, an AI-powered knowledge base, and a comprehensive Learning Management System (LMS) called DOSPRESSO Academy, featuring gamification, analytics, and certification. The project's ambition is to improve operational efficiency and standardisation across all franchise locations.

## User Preferences
Preferred communication style: Simple, everyday language. Turkish language communication preferred. Fast implementation in Build mode, continues with "devam" frequently.

## Recent Changes (December 7, 2025)
- ✅ **TURN 25 - Hybrid NFC/QR Shift Check-in System (COMPLETED)**:
  * Schema: Added `checkInMethod` enum field to branches table (rfid/qr/both)
  * Frontend: Created `/nfc-giris` page with Web NFC API for Android, URL-based NFC tags for iOS
  * Routing: Updated App.tsx with /nfc-giris route, vardiya-checkin method selection UI
  * Backend: Added POST /api/shift-attendance/check-in/nfc endpoint (location-based, minimal schema)
  * UX: Method selection page (QR/NFC) in vardiya-checkin with conditional routing
  * NFC Technology: NTAG213 cards recommended - works on iOS/Android via URL-based approach
  * Status: App running, all LSP diagnostics clear, workflow stable

- ✅ **TURN 26 - Admin NFC/QR Management Panel (COMPLETED)**:
  * Feature: Created `/subeler/:id/nfc` page showing NFC URL + QR code for each branch
  * Token Generation: Auto-generate 64-char hex tokens for new branches, retroactively applied to 20 existing branches
  * Database: Added `check_in_method` column to branches table, synced schema to production DB
  * Admin UI: NFC button in `/subeler/:id` detail page (isAdmin guard), links to management panel
  * Security: NFC URL format: `https://app.dospresso.com/nfc?b={branchId}&t={token}` with token validation
  * Features: Copy URL, Download QR, Token display with security notes
  * Type Safety: Fixed imports (randomBytes crypto), resolved all TypeScript errors
  * Status: ✅ FULLY OPERATIONAL - All 20 branches have tokens, database synced, APIs working, frontend rendering

- ✅ **TURN 27 - UI/UX Design Overhaul (COMPLETED)**:
  * Header Redesign: Navy Blue background (#1e3a5f) with white text on ALL pages (app-header, page-header, login, register, password pages)
  * Logo Standardization: Replaced DOSPRESSO logo with new "DOSPRESSO Donut Coffee" logo across 9 files
  * Dashboard Layout: Converted from 2-column to 3-column compact grid with minimal spacing
  * Dashboard Icons: Reduced sizes (w-10 h-10 icons, text-xs labels), hidden descriptions for compact view
  * Card Spacing: Reduced padding (p-4→p-3), reduced gap (gap-3→gap-2), min-height compact (100px→80px)
  * Updated Files: app-header, page-header, app-sidebar, login, register, forgot-password, reset-password, App.tsx, academy-certificates, card-grid-hub
  * Status: ✅ FULLY IMPLEMENTED - All headers Navy Blue, logo consistent, dashboard compact 3-column layout, workflow running

## System Architecture
### UI/UX Decisions
The frontend utilizes React 18+ with TypeScript and Vite, employing Shadcn/ui (New York variant, Radix UI-based) and Material Design 3 principles. Styling is managed with Tailwind CSS, including dark mode and Turkish localization. Typography is set to Inter for UI elements and Roboto for numeric data. The design prioritizes a mobile-first, responsive approach with compact, touch-friendly interactions optimized for vertical screens. All cards utilize semantic tokens for consistent theming.

### Technical Implementations
- **Frontend**: React 18, Vite, Wouter (routing), TanStack Query (state management), React Hook Form, Shadcn/ui.
- **Backend**: Node.js, Express.js, TypeScript, with Replit Auth (OpenID) and Passport.js for authentication.
- **Database**: PostgreSQL (Neon serverless) via Drizzle ORM (type-safe) and pgvector for embeddings.
- **Charts**: Recharts for data visualization.
- **File Upload**: Uppy integrated with AWS S3.
- **QR Code**: html5-qrcode for scanning + global modal from all pages.
- **Background Jobs**: Node.js interval-based scheduling for tasks like SLA checks, notifications, maintenance reminders, and backup.

### Feature Specifications
- **Authentication & RBAC**: A 14-role system with granular permissions and branch-level data filtering.
- **Equipment Management**: Comprehensive lifecycle management, health monitoring, and maintenance scheduling.
- **Unified Fault System**: Creation, assignment, workflow, escalation, photo documentation, cost tracking, and QR-integrated reporting with intelligent routing.
- **SLA Monitoring**: Real-time tracking with automated breach alerts.
- **Troubleshooting System**: Editable guides integrated into fault reporting.
- **QR-Based Attendance**: Secure check-in/out with geofence validation, location confidence scoring, global QR modal from AppHeader.
- **Lost & Found System**: Found item tracking, photo capture, handover documentation, owner name/phone, cross-branch visibility for HQ staff.
- **AI Integration**: AI photo verification for tasks, RAG-enabled knowledge base search, AI Academy Chat Assistant, Adaptive Learning Engine, and AI-powered smart recommendations.
- **HR & Shift Management**: Personnel management, leave requests, overtime, attendance, and AI-powered fair shift planning.
- **Enhanced Analytics Dashboard**: Tabbed interface showing daily/weekly/monthly metrics with AI-generated summaries.
- **DOSPRESSO Academy (LMS)**: A comprehensive training system including career progression, quiz system, gamification (leaderboard, badges), certification, AI learning paths, and advanced analytics.

### System Design Choices
- **Health Score Calculation**: Real-time scores based on recent faults and compliance.
- **SLA Calculation**: Dynamic, time-based calculation varying by fault priority.
- **Notifications**: Automatic in-app alerts and email notifications.
- **State Management**: TanStack Query for server state and localStorage for theme persistence.
- **Photo Upload**: Persistent storage on AWS S3 via an ObjectUploader component.
- **Backup System**: Daily automatic backups to object storage.
- **Live Tracking**: Real-time employee location tracking with in-memory cache for supervisors.
- **RAG Knowledge Base**: Vector-based semantic search using OpenAI embeddings.
- **Gamification**: Integrated badges, career progression, leaderboards, team competitions, adaptive difficulty, certificates, and daily learning streak tracker.
- **Layout System**: Responsive flex-based layouts with standardized gaps.
- **Dashboard Hub**: `CardGridHub` displays role-based module cards with alerts and quick actions.
- **Shift Scheduling**: Fair algorithm ensuring fulltime employees work minimum 6 days/week at 45 hours, parttime 3 days/25 hours.
- **Analytics Architecture**: Three-period tabbed interface with real-time metric aggregation, AI-powered summaries (OpenAI gpt-4o-mini), and conditional alerts.

## External Dependencies
### Third-Party Services
- **OpenAI API**: Used for AI-powered vision analysis, chat completions, embeddings, and summary generation.
- **Replit Auth**: Utilized for user authentication via OpenID Connect.
- **AWS S3**: Provides cloud storage for photo uploads, backups, and persistent storage.
- **Neon Database**: A serverless PostgreSQL instance used as the primary database.
- **IONOS SMTP**: Employed for sending email notifications.