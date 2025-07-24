# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (uses Turbo for faster compilation)
- **Build for production**: `npm run build`
- **Run linter**: `npm run lint`
- **Generate database types**: `npm run types:gen` (generates TypeScript types from Supabase)
- **Seed database**: `npm run db:seed`

## Project Architecture

**PBLab** is an AI-augmented Problem-Based Learning platform built with Next.js 15, Supabase, and TypeScript. The application follows a clear separation between educational workflows and technical implementation.

### Core Structure

- **Next.js App Router**: Modern file-based routing with server and client components
- **Supabase Backend**: PostgreSQL database with real-time subscriptions and authentication
- **Component Library**: shadcn/ui components with Radix UI primitives and Tailwind CSS

### Key Directories

- `app/`: Next.js App Router structure
  - `(auth)/`: Authentication pages (login, signup, etc.)
  - `(main)/`: Protected application routes
  - `api/`: API routes for AI features and Google Drive integration
- `components/`: Reusable UI components organized by feature
  - `pblab/`: Domain-specific components (auth, educator, project)
  - `ui/`: Base shadcn/ui components
- `lib/`: Shared utilities and database interactions
  - `actions/`: Server actions for data mutations
  - `supabase/`: Database client configurations
- `supabase/`: Database migrations and configuration

### Database Schema

The application uses a comprehensive schema for Problem-Based Learning workflows:

**Core Entities:**
- `users`: Extends Supabase auth with roles (student, educator, admin)
- `courses`: Organizational containers managed by educators
- `teams`: Student groups working on problems
- `problems`: PBL scenarios created by educators with associated rubrics
- `projects`: Team instances of problems with phase tracking (pre, research, post, closed)

**Learning Artifacts:**
- `artifacts`: Student-collected resources (files, links) during research
- `comments`: Team discussions on artifacts with @mention support
- `assessments`: AI-assisted grading with rubric-based scoring

**AI Integration:**
- `ai_usage`: Comprehensive logging of AI interactions for analytics
- All AI features (tutor, assessment) are tracked and auditable

### Authentication & Authorization

- **Supabase Auth**: Email-based authentication with magic links
- **Row Level Security (RLS)**: Database-level authorization for all tables
- **Role-based Access**: Student, educator, and admin roles with appropriate permissions

### AI Features

- **AI Tutor**: Contextual guidance during problem-solving phases
- **AI Assessment**: Automated rubric-based grading with human review workflow
- **Usage Tracking**: All AI interactions logged for analytics and billing

### Google Drive Integration

- Problem statements and final reports can be stored as Google Docs
- API endpoints at `/api/drive/` handle Google Drive Picker and content export
- Final report content is cached in the database for AI assessment

### Development Notes

- Database types are auto-generated from Supabase schema using `npm run types:gen`
- All components follow the shadcn/ui pattern with proper TypeScript typing
- Server actions in `lib/actions/` handle all data mutations
- Real-time features use Supabase subscriptions for collaborative workflows

### Note about the person using Claude Code

I am a beginner with 6 months of experience of building with AI. My aim is to go from a non-technical to a technical person on my building journey. As you work, provide a brief overview of the applicable programming, problem-solving and systems thinking concepts, so that I have the capacity to correctly understand and orchestrate you as an AI coding agent.