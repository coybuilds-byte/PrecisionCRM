# Recruiting CRM System

## Overview

This is a full-stack recruiting CRM (Customer Relationship Management) system built with modern web technologies. The application helps recruiters manage candidates, clients, positions, and track the complete recruitment process from lead generation to successful placements. It provides a comprehensive dashboard for recruitment workflow management with features for contact tracking, interview scheduling, and candidate-client matching.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**React + TypeScript SPA**: The frontend is built as a single-page application using React with TypeScript for type safety. The application uses Vite as the build tool and development server, providing fast hot-reload capabilities.

**UI Component Library**: Implements a custom design system based on shadcn/ui components with Radix UI primitives. The design follows Material Design 3 principles optimized for data-dense enterprise applications, featuring both light and dark mode support.

**State Management**: Uses TanStack Query (React Query) for server state management, caching, and synchronization. Local component state is managed with React hooks, avoiding the complexity of global state management libraries for this use case.

**Routing**: Implements client-side routing with Wouter, a lightweight routing library that provides the necessary navigation features without the overhead of React Router.

**Styling**: Uses Tailwind CSS with a custom design system that includes professional color palettes, consistent spacing, and responsive design patterns. The theme system supports automatic dark/light mode switching.

### Backend Architecture

**Express.js API Server**: RESTful API built with Express.js providing endpoints for all CRUD operations. The server handles file uploads (resumes), data validation, and business logic.

**Database Layer**: Uses Drizzle ORM with PostgreSQL for type-safe database operations. The schema includes tables for recruiters, candidates, clients, positions, contacts, interviews, and applications with proper relationships.

**File Handling**: Implements multer middleware for handling file uploads (PDFs and text files) with size limits and type validation for resume uploads.

**Development Setup**: Configured for both development and production environments with proper build processes using esbuild for server bundling and Vite for client bundling.

### Data Storage Solutions

**PostgreSQL Database**: Primary data store using PostgreSQL with a well-structured relational schema. Tables include proper foreign key relationships and enums for status tracking.

**Database Management**: Uses Drizzle Kit for schema migrations and database synchronization. Connection pooling is handled through Neon's serverless PostgreSQL driver.

**File Storage**: Resume uploads are handled through Replit Object Storage (backed by Google Cloud Storage) with presigned URLs for secure direct uploads. PDFs are parsed using pdf-parse library, and OpenAI GPT-5 is used to extract skills and relevant information from uploaded resumes.

### Authentication and Authorization

**Complete Authentication System**: Full-featured authentication UI with login/logout functionality. The system uses Argon2id password hashing with server-side pepper for security, SHA-256 session token hashing, and secure HttpOnly cookies for session management.

**Two-Factor Authentication (2FA)**: Email-based 2FA for enhanced security. After entering valid credentials, users receive a 6-digit verification code via email that must be entered to complete login. Codes expire after 10 minutes. In test mode, codes are logged to the console.

**Password Reset Feature**: Complete forgot password functionality with email notifications. Users can request a password reset link that's sent to their email. Reset tokens expire after 1 hour and automatically clear any login lockouts.

**Session Management**: Sessions are stored in PostgreSQL using connect-pg-simple with a 7-day TTL. Includes automatic login lockout after 5 failed attempts (15-minute duration) and comprehensive session logging for audit trails.

**Protected Routes**: All application routes are protected with authentication middleware. Unauthenticated users are automatically redirected to the login page. The authentication state is managed via React Context and TanStack Query for efficient caching.

**Login Credentials (Development)**: 
- Email: admin@psm.com
- Password: admin123
- Email: jesse@precisionsourcemanagement.com
- Password: JessePassword123!
- Both accounts have 2FA enabled by default

**User Interface**: Clean login page with PSM branding, form validation using Zod schemas, and responsive error handling. The authenticated layout includes a sidebar with user information display and logout functionality. 2FA verification dialog with code input and resend functionality.

**Role-Based Access**: The schema supports role-based access control with recruiter-specific data isolation, ensuring recruiters only see their own candidates and clients.

**Note on External Integrations**: Twilio SMS integration was considered but not implemented. Using Resend email service for all authentication emails (2FA codes, password resets).

### Interview Management and Calendar Integration

**Complete Interview Workflow**: Full interview scheduling and management system with Outlook calendar integration. Recruiters can schedule interviews directly from candidate applications, track interview status, and collect feedback.

**Outlook Calendar Sync**: Integrated with Microsoft Outlook via Microsoft Graph API for automatic calendar event creation. Interviews are synced to the recruiter's Outlook calendar with all relevant details including candidate information, interviewer details, location, and meeting links.

**Interview Features**:
- Schedule interviews with date, time, duration, and location
- Assign interviewers with name and email
- Automatic calendar event creation with attendees (candidate + interviewer)
- Interview status tracking (scheduled, completed, cancelled, rescheduled)
- Post-interview feedback and rating system (1-5 stars)
- Interview notes and detailed feedback capture
- Visual indicators for synced calendar events
- Manual calendar sync for existing interviews

**Database Schema**: The interviews table includes fields for scheduled dates, end dates, interviewer information, location, notes, feedback, rating, status, and Outlook event ID for calendar synchronization tracking.

**UI Components**:
- ScheduleInterviewDialog: Modal for scheduling new interviews with calendar sync option
- Interview Management Page: Lists upcoming and past interviews with sync status
- Candidate Detail Modal: Schedule interviews directly from application tabs
- Calendar sync buttons with visual feedback for synced events

## External Dependencies

**Database**: Neon Serverless PostgreSQL for production database hosting with WebSocket support for real-time capabilities.

**Microsoft Graph API**: Outlook calendar integration for interview scheduling and calendar event management with automatic attendee invitations.

**UI Framework**: Radix UI primitives provide accessible, unstyled components that form the foundation of the custom design system.

**Form Handling**: React Hook Form with Zod schema validation provides type-safe form management with comprehensive validation rules.

**Date Management**: date-fns library for consistent date formatting and manipulation throughout the application.

**Development Tools**: ESBuild for fast server compilation, TypeScript for type safety, and various development utilities for code quality and developer experience.

**Styling Dependencies**: Tailwind CSS with additional plugins for animations and utilities, class-variance-authority for component variant management, and custom CSS variables for theme management.