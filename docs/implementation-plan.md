# Implementation Plan

## Phase 1: Project Setup & Configuration ✅ COMPLETED

**Summary**: Initialized Next.js project structure, installed dependencies (`react-markdown`, `jsonwebtoken`, `@types/jsonwebtoken`), configured environment variables, updated Tailwind/CSS for PBLab branding, and created landing page with `<PBLabLogo />` component.

**Key Outputs**: Complete directory structure (`app/(main)`, `app/p/[projectId]`, `components/pblab`, `lib/actions`), updated package.json with required dependencies, `.env.example` with all required keys, modernized landing page.

**Critical Files**: `package.json` (dependencies), `.env.example` (setup guide), `app/page.tsx` (landing page), `components/pblab/pblab-logo.tsx` (branding).

-----

## Phase 2: Database & Authentication ✅ COMPLETED

**Summary**: Created comprehensive database schema with 13 tables and 3 ENUMs via migrations, implemented Row Level Security policies with `get_my_role()` helper, generated TypeScript types, created seeding script with sample data, and converted to magic link authentication.

**Key Database Tables**: `users`, `courses`, `teams`, `problems`, `projects`, `artifacts`, `comments`, `ai_usage`, `assessments` (with proper RLS policies).

**Authentication**: Magic link system with `signInWithOtp()`, database trigger `handle_new_user()` auto-copies auth users to `public.users`, cleaned up password-related code.

**Optimizations**: Unified auth forms, removed starter template remnants, standardized environment variables, optimized seeding script with parallel operations and early-exit (~60-70% faster).

**Critical Files**: `supabase/migrations/*` (schema), `lib/db.types.ts` (types), `scripts/seed.ts` (sample data), `components/pblab/auth/auth-form.tsx` (unified auth).

-----

## Phase 3: Backend Server Actions ✅ COMPLETED

**Summary**: Built comprehensive server action layer with security, validation, and error handling. Created AI logging helper and 4 main action files covering core PBL workflows.

**Key Actions**: 
- `lib/actions/ai.ts`: `logAiUsage()` for centralized AI interaction tracking
- `lib/actions/teams.ts`: JWT-based invite system with `generateInviteToken()`/`verifyInviteToken()`
- `lib/actions/problems.ts`: `createProblem()` with transactional rubric creation
- `lib/actions/projects.ts`: Phase management with `updateProjectPhase()`, report handling
- `lib/actions/artifacts.ts`: File uploads with security whitelist, commenting system

**Security Features**: Authentication verification, role-based authorization, RLS integration, file type whitelisting (prevents .exe uploads), input validation, database transaction handling.

**Error Handling**: Comprehensive parameter validation, user-friendly messages, rollback on failures, JWT validation, permission checks. 

-----

## Phase 4: AI Features & Mention System ✅ COMPLETED

**Summary**: Implemented AI-powered learning goal suggestions, contextual AI tutor with conversation memory, and comprehensive user-selection @mention system for collaborative commenting.

**Key AI Features**:
- **Step 16**: Enhanced `createComment` action with user-selection @mentions, notification creation, and `getProjectMentionableUsers()` helper
- **Step 17**: Created `/api/ai/suggest-goals` route with Gemini API integration, authentication, and usage logging
- **Step 18**: Built `/api/ai/tutor` route with conversation history retrieval and contextual memory

**Mention System**: User-selection based workflow with `mentionedUserIds[]` parameter, team member + educator validation, self-mention prevention, atomic operations, and graceful error handling.

**AI Integration**: Configured GoogleGenAI with temperature controls, JSON response formatting, comprehensive error handling for rate limits, and audit logging via `logAiUsage()`.

**Critical Files**: `lib/actions/artifacts.ts` (mentions), `app/api/ai/suggest-goals/route.ts`, `app/api/ai/tutor/route.ts`, `@google/genai` package integration.

-----

## Phase 4 Optimization: Code Quality & Structure Enhancement ✅ COMPLETED

**Summary**: Comprehensive backend refactoring to improve maintainability, code organization, and prepare for Phase 5 frontend development. Focused on extracting reusable patterns, standardizing error handling, and establishing robust validation utilities.

**Key Achievements**:
- **Step 18.1**: Extracted file security module (`lib/security/file-validation.ts`) from 710-line artifacts file
- **Step 18.2**: Split large artifacts file into focused modules (CRUD operations, comments, permissions)  
- **Step 18.3**: Created shared authorization helpers, reducing 200+ lines of duplicated permission checking code
- **Step 18.4**: Built comprehensive validation utilities with 15 specialized functions, eliminated 200+ lines of duplicated validation code
- **Step 18.5**: Standardized all 23 server actions with discriminated union response types for type-safe error handling
- **Step 18.6**: Implemented structured error class hierarchy with dual messaging (technical + user-friendly)

**Code Quality Improvements**: Single responsibility principle compliance, TypeScript strict mode throughout, consistent error patterns, frontend-ready validation utilities, maintainable file structure.

**Critical Files**: `lib/shared/validation.ts`, `lib/shared/action-types.ts`, `lib/shared/errors.ts`, refactored `lib/actions/artifacts/` modules, `lib/security/file-validation.ts`.

-----

## Phase 5: Frontend Implementation

This phase focuses on building the UI for all features, including the new enhancements. Design should be: Clean, Intuitive, Responsive.

[x] Step 19: Create Main App Layout (Header and Sidebar)
**Task**: Create the main authenticated layout at `app/(main)/layout.tsx`. This will involve creating two new reusable components: `<Header />` in `components/pblab/header.tsx` and `<Sidebar />` in `components/pblab/sidebar.tsx`. The layout should establish the main two-column structure of the app.
**Suggested Files for Context**: `app/page.tsx`, `components/auth-button.tsx`, `lib/supabase/server.ts`
**Step Dependencies**: Step 12
**User Instructions**: None
**Implementation Notes**:
 ✅ What We Built:

  1. Main Layout (app/(main)/layout.tsx) - Two-column responsive layout with
  authentication checks
  2. Header Component (components/pblab/header.tsx) - User avatar, dropdown menu,
   and mobile navigation
  3. Sidebar Component (components/pblab/sidebar.tsx) - Role-based navigation
  with disabled future features
  4. Dashboard Pages - Basic placeholder pages for testing the layout

  ✅ Key Features Implemented:

  - Authentication Protection - Redirects unauthenticated users to login
  - Role-Based Navigation - Different sidebar content for student/educator/admin
  roles
  - Responsive Design - Mobile-first with shadcn Sheet component for mobile
  sidebar
  - User Context - Fetches user role and name from database
  - Future-Ready Structure - Marked upcoming features as "Soon" with disabled
  state

[ ] Step 20: Implement Role-Based Dashboard and Redirects
**Task**: Create the student dashboard at `app/(main)/student/dashboard/page.tsx` and the educator dashboard at `app/(main)/educator/dashboard/page.tsx`. Implement the role-based redirect at `app/(main)/dashboard/page.tsx` that navigates users to the correct dashboard based on their role from Supabase Auth.
**Suggested Files for Context**: `lib/db.types.ts`, `app/(main)/layout.tsx`, `lib/supabase/server.ts`
**Step Dependencies**: Step 19
**User Instructions**: None

[ ] Step 21: Implement Notifications UI
**Task**: 1. Create the `<NotificationsIndicator />` component in `components/pblab/notifications/`. It should use the `getNotifications` server action to fetch data and display a badge with the unread count. 2. Clicking the indicator should open a dropdown panel listing notifications with links. 3. Integrate `<NotificationsIndicator />` into the `<Header />` component. 4. Clicking a notification should navigate to its `reference_url` and call the `markNotificationAsRead` action.
**Suggested Files for Context**: `components/pblab/header.tsx`, `lib/actions/notifications.ts`, `lib/db.types.ts`
**Step Dependencies**: Step 16, Step 19
**User Instructions**: None

[ ] Step 22: IMPORTANT: Implement Project Workspace with Learning Goal Editor
**Task**: Create the main project workspace page at `app/p/[projectId]/page.tsx`. Implement the `<LearningGoalEditor />` component (`components/pblab/project/learning-goal-editor.tsx`) and display it when the project is in the 'pre' phase. Wire its "Save" button to the `updateProjectLearningGoals` action and its "AI Suggestions" button to the `/api/ai/suggest-goals` API route.
**Suggested Files for Context**: `lib/actions/projects.ts`, `app/api/ai/suggest-goals/route.ts`, `lib/db.types.ts`
**Step Dependencies**: Step 15, Step 17
**User Instructions**: None

[ ] Step 23: IMPORTANT: Update AI Tutor Chat UI for Shared History
**Task**: Update the `<AiTutorChat />` component (`components/pblab/ai/ai-tutor-chat.tsx`). It should now fetch the full, shared conversation history for the project on load and render it. Ensure the UI makes it clear that the chat is a shared resource for the team. The form submission will continue to use the updated `/api/ai/tutor` endpoint.
**Suggested Files for Context**: `components/pblab/ai/ai-tutor-chat.tsx`, `app/api/ai/tutor/route.ts`
**Step Dependencies**: Step 18
**User Instructions**: None

[ ] Step 24: Implement Remaining Project Workspace Components
**Task**: On the project page (`app/p/[projectId]/page.tsx`), implement the remaining components for the core workflow: `<ArtifactUploader />`, `<ArtifactCard />`, and `<CommentThread />`. Wire up the comment form to the `createComment` server action, which now handles user-selection based @mentions. Include a mention selector component that allows users to select from available team members and educators for the project.
**Suggested Files for Context**: `lib/actions/artifacts/crud.ts`, `lib/actions/artifacts/comments.ts`, `app/p/[projectId]/page.tsx`, `lib/db.types.ts`, `lib/security/file-validation.ts`
**Step Dependencies**: Step 16, Step 22, Phase 4 Optimization completed
**User Instructions**: Configure a "artifacts" bucket in Supabase Storage with appropriate RLS policies.

-----

## Phase 6: Finalization and Testing

This section includes steps for creating tests to ensure application quality and correctness.

[ ] Step 25: Setup and Write Unit Tests
**Task**: Configure Jest for unit testing. Create tests for key new server actions. For example, test the user-selection mention logic in `createComment`, validate `getProjectMentionableUsers` returns correct users, and ensure `getNotifications` correctly respects RLS (by mocking the user).
**Suggested Files for Context**: `lib/actions/artifacts/comments.ts`, `lib/actions/shared/validation.ts`, `lib/actions/notifications.ts`, `lib/security/file-validation.ts`, `docs/tech-spec.md`
**Step Dependencies**: All backend feature steps, Phase 4 Optimization completed.
**User Instructions**: Run `npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom` and then run `npm test`.

[ ] Step 26: IMPORTANT: Setup and Write E2E Tests
**Task**: Configure Playwright for end-to-end testing. Implement tests for the new feature flows: 1. A user posts a comment with user-selection @mentions, and the mentioned user receives a notification. 2. A user interacts with the Learning Goal Editor and successfully gets AI suggestions. 3. The AI Tutor chat loads and displays a shared history.
**Suggested Files for Context**: All relevant page and component files for these flows.
**Step Dependencies**: All feature steps.
**User Instructions**: Run `npm init playwright@latest`. Consider using the Supabase Admin API to generate direct login tokens for test users to bypass email magic links.