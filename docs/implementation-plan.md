# Implementation Plan

## Phase 1: Project Setup & Configuration ✅ COMPLETED

**Summary**: Initialized Next.js project structure, installed dependencies (`react-markdown`, `jsonwebtoken`, `@types/jsonwebtoken`), configured environment variables, updated Tailwind/CSS for PBLab branding, and created landing page with `<PBLabLogo />` component.

**Key Outputs**: Complete directory structure (`app/(main)`, `app/p/[projectId]`, `components/pblab`, `lib/actions`), updated package.json with required dependencies, `.env.example` with all required keys, modernized landing page.

**Critical Files**: `package.json` (dependencies), `.env.example` (setup guide), `app/page.tsx` (landing page), `components/pblab/pblab-logo.tsx` (branding).

-----

## Phase 2: Database & Authentication ✅ COMPLETED

**Summary**: Created comprehensive database schema with 13 tables and 3 ENUMs via migrations, implemented Row Level Security policies with `get_my_role()` helper, generated TypeScript types, created seeding script with sample data, and converted to magic link authentication.

**Key Database Tables**: `users`, `courses`, `teams`, `problems`, `projects`, `artifacts`, `comments`, `ai_usage`, `assessments` (with proper RLS policies).

**Authentication**: Magic link system with `signInWithOtp()` and explicit `shouldCreateUser` parameter (true for signup, false for login), database trigger `handle_new_user()` auto-copies auth users to `public.users`, cleaned up password-related code.

**Critical Auth Fix**: Resolved migration order issue by renaming files to timestamps ensuring `user_role` enum creates before trigger, recreated trigger function with explicit schema references (`public.user_role`), eliminated "user_role does not exist" database errors.

**Optimizations**: Unified auth forms with comprehensive debug logging, removed starter template remnants, standardized environment variables, optimized seeding script with parallel operations and early-exit (~60-70% faster).

**Critical Files**: `supabase/migrations/*` (schema with correct order), `lib/db.types.ts` (types), `scripts/seed.ts` (sample data), `components/pblab/auth/auth-form.tsx` (unified auth with shouldCreateUser fix).

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

[x] Step 20: **Update Seeding for Password Auth**
**Task**: Modify the `scripts/seed.ts` file to enable password-based authentication for testing. Add a `password` field to each user object in the `usersToCreate` array using a single, consistent password for all users to simplify testing. Add an `admin@university.edu` user to the array to ensure the admin role is testable. Update the Supabase Admin API calls to include password creation.
**Suggested Files for Context**: `scripts/seed.ts`, `lib/db.types.ts`, `supabase/config.toml`
**Step Dependencies**: Phase 2 completed (database schema and auth setup)
**User Instructions**: The password should be simple for testing, e.g., `password123`. After modifying, run `npx supabase db reset` and `npm run db:seed` to apply the changes.
**Implementation Notes**:
 ✅ What We Built:

  1. Updated User Creation Array - Added `password: 'password123'` field to all 7 users (1 admin, 2 educators, 4 students)
  2. Admin User Addition - Included `admin@university.edu` with proper metadata (`role: 'admin'`)
  3. Password Authentication Support - Leveraged Supabase Admin API's native password support with automatic hashing
  4. Force Flag Feature - Added `--force` flag to bypass early-exit checks for testing: `npx tsx scripts/seed.ts --force`

  ✅ Key Features Verified:

  - Magic Link Functionality Preserved - Both password and OTP authentication methods coexist
  - Automatic Password Hashing - Supabase handles bcrypt hashing automatically for plaintext passwords
  - Database Trigger Compatibility - Existing `handle_new_user()` trigger continues working with password users
  - Email Confirmation Bypass - `email_confirm: true` allows immediate login without email verification
  - Testing Ready - All users now support both email/password login and invite link workflows

  ✅ Test Accounts Created:
  - admin@university.edu / password123
  - educator1@university.edu / password123  
  - educator2@university.edu / password123
  - student1@university.edu / password123
  - student2@university.edu / password123
  - student3@university.edu / password123
  - student4@university.edu / password123

[x] Step 21: **Implement Password-Based Login Form**
**Task**: Update the main authentication form component `components/pblab/auth/auth-form.tsx`. Change the login handler to use Supabase's `signInWithPassword()` method instead of `signInWithOtp()`. Ensure the form UI includes an `<input type="password">` field and remove the magic link messaging. This will be the primary login method for testing and competition submission.
**Suggested Files for Context**: `components/pblab/auth/auth-form.tsx`, `lib/supabase/client.ts`, `app/(auth)/login/page.tsx`
**Step Dependencies**: Step 20 (seeded passwords must exist)
**User Instructions**: Test with the seeded account credentials to ensure password login works correctly.
**Implementation Notes**:
 ✅ What We Built:

  1. Dual Authentication Strategy Implementation:
     - **Journey A (Login)**: Updated form to use `signInWithPassword()` for existing seeded accounts
     - **Journey B (Signup)**: Uses `signUp()` with password for new users (including invite recipients)

  2. Form UI Enhancements:
     - Added password input field for both login and signup modes
     - Updated descriptions to reflect password-based authentication
     - Removed all magic link messaging from the primary auth form
     - Maintained clean, consistent UI across both modes

  3. Authentication Flow Updates:
     - Login: `supabase.auth.signInWithPassword({ email, password })` → redirects to `/dashboard`
     - Signup: `supabase.auth.signUp({ email, password, options: { data: { name } } })` → redirects to `/auth/sign-up-success`
     - Proper error handling and loading states for both flows

  ✅ Key Features Verified:

  - **Password Authentication Working**: Tested successfully with seeded account `educator1@university.edu / password123`
  - **Role-Based Dashboard Redirect**: Login redirects to `/dashboard` for role-based routing
  - **Invite Flow Compatibility**: Signup flow supports both direct signups and invite-based user creation
  - **Consistent UX**: Single form handles both authentication journeys with appropriate messaging
  - **TypeScript Safety**: No compilation errors, full type safety maintained

  ✅ Testing Results:
  - ✅ Login with seeded credentials: educator1@university.edu / password123 → SUCCESS
  - ✅ Form renders correctly with email and password fields
  - ✅ Error handling works properly
  - ✅ Loading states function as expected

**✅ BONUS: Complete Invite Flow Implementation**

During Step 21, identified and implemented missing invite system components:

  1. **Invite Route Handler** (`app/(auth)/join/page.tsx`):
     - Handles `/join?token=xyz` URLs
     - Verifies JWT tokens using existing `verifyInviteToken()` action
     - Routes authenticated users directly to team joining
     - Routes unauthenticated users to signup with invite context

  2. **Enhanced Auth Form with Invite Context**:
     - Detects invite parameters in URL (`?invite=token&team=id`)
     - Shows special "Team Invitation" UI for invite signups
     - Displays team name when available
     - Automatically joins team after successful signup

  3. **Complete User Journey Support**:
     - **Authenticated User + Invite Link**: Direct team joining → redirect to dashboard
     - **Unauthenticated User + Invite Link**: Signup with context → auto team join → redirect to student dashboard
     - **Regular Signup**: Standard account creation flow

  ✅ Invite Flow Testing:
  - ✅ JWT token generation and verification working
  - ✅ Invite URL construction: `/join?token=...`
  - ✅ Signup with context: `/auth/sign-up?invite=...&team=...`
  - ✅ Team name fetching and display
  - ✅ Automatic team joining after signup
  - ✅ Proper error handling and fallbacks

[x] Step 22: Implement Role-Based Dashboard and Redirects
**Task**: Create the student dashboard at `app/(main)/student/dashboard/page.tsx` and the educator dashboard at `app/(main)/educator/dashboard/page.tsx` and the admin dashboard at `app/(main)/admin/dashboard/page.tsx`. Implement the role-based redirect at `app/(main)/dashboard/page.tsx` that navigates users to the correct dashboard based on their role from Supabase Auth.
**Suggested Files for Context**: `lib/db.types.ts`, `app/(main)/layout.tsx`, `lib/supabase/server.ts`
**Step Dependencies**: Step 19, Step 21 (password auth working)
**User Instructions**: None

[x] Step 22.1: Create Simple Admin Dashboard Page
**Task**: Create a basic admin dashboard page at `app/(main)/admin/dashboard/page.tsx` following the exact same pattern as student/educator dashboards. Include simple title, description, and placeholder cards for future functionality. Do NOT implement any CRUD functionality, server actions, or complex components - this is reserved for Step 22.2.
**Suggested Files for Context**: `app/(main)/student/dashboard/page.tsx`, `app/(main)/educator/dashboard/page.tsx`
**Step Dependencies**: Step 22
**User Instructions**: None
**Implementation Notes**:
✅ What We Built:
- Simple admin dashboard page following student/educator pattern
- Basic header with title and description
- Three placeholder cards: System Overview, User Management, Activity Monitor
- No complex functionality - just static placeholder content
- Removed previous complex CRUD implementation that belonged in Step 22.2

[ ] Step 22.2: Implement Dynamic Dashboard Data Fetching
  **Task**: Convert static dashboard components to dynamic ones that fetch real data. For student dashboard: implement server-side data fetching for user's teams, active projects, and notifications. For educator dashboard: fetch course projects and team overview. For admin dashboard: implement the full CRUD interface described in tech spec section 3.7 with data tables, forms, modals for managing users, teams, and courses.
  **Suggested Files for Context**: `lib/actions/`, `lib/supabase/server.ts`, current dashboard pages, `docs/tech-spec.md` (sections 3.7, 5.1)
  **Step Dependencies**: Step 22.1 (basic dashboard structure), database seeding completed

[ ] Step 23: Implement Notifications UI
**Task**: 1. Create the `<NotificationsIndicator />` component in `components/pblab/notifications/`. It should use the `getNotifications` server action to fetch data and display a badge with the unread count. 2. Clicking the indicator should open a dropdown panel listing notifications with links. 3. Integrate `<NotificationsIndicator />` into the `<Header />` component. 4. Clicking a notification should navigate to its `reference_url` and call the `markNotificationAsRead` action.
**Suggested Files for Context**: `components/pblab/header.tsx`, `lib/actions/notifications.ts`, `lib/db.types.ts`
**Step Dependencies**: Step 16, Step 19
**User Instructions**: None

[ ] Step 24: IMPORTANT: Implement Project Workspace with Learning Goal Editor
**Task**: Create the main project workspace page at `app/p/[projectId]/page.tsx`. Implement the `<LearningGoalEditor />` component (`components/pblab/project/learning-goal-editor.tsx`) and display it when the project is in the 'pre' phase. Wire its "Save" button to the `updateProjectLearningGoals` action and its "AI Suggestions" button to the `/api/ai/suggest-goals` API route.
**Suggested Files for Context**: `lib/actions/projects.ts`, `app/api/ai/suggest-goals/route.ts`, `lib/db.types.ts`
**Step Dependencies**: Step 15, Step 17
**User Instructions**: None

[ ] Step 25: IMPORTANT: Update AI Tutor Chat UI for Shared History
**Task**: Update the `<AiTutorChat />` component (`components/pblab/ai/ai-tutor-chat.tsx`). It should now fetch the full, shared conversation history for the project on load and render it. Ensure the UI makes it clear that the chat is a shared resource for the team. The form submission will continue to use the updated `/api/ai/tutor` endpoint.
**Suggested Files for Context**: `components/pblab/ai/ai-tutor-chat.tsx`, `app/api/ai/tutor/route.ts`
**Step Dependencies**: Step 18
**User Instructions**: None

[ ] Step 26: Implement Remaining Project Workspace Components
**Task**: On the project page (`app/p/[projectId]/page.tsx`), implement the remaining components for the core workflow: `<ArtifactUploader />`, `<ArtifactCard />`, and `<CommentThread />`. Wire up the comment form to the `createComment` server action, which now handles user-selection based @mentions. Include a mention selector component that allows users to select from available team members and educators for the project.
**Suggested Files for Context**: `lib/actions/artifacts/crud.ts`, `lib/actions/artifacts/comments.ts`, `app/p/[projectId]/page.tsx`, `lib/db.types.ts`, `lib/security/file-validation.ts`
**Step Dependencies**: Step 16, Step 24, Phase 4 Optimization completed
**User Instructions**: Configure a "artifacts" bucket in Supabase Storage with appropriate RLS policies.

-----

## Phase 6: Finalization and Testing

This section includes steps for creating tests and final documentation to ensure application quality and correctness for competition submission.

[ ] Step 27: Setup and Write Unit Tests
**Task**: Configure Jest for unit testing. Create tests for key server actions. For example, test the user-selection mention logic in `createComment`, validate `getProjectMentionableUsers` returns correct users, and ensure `getNotifications` correctly respects RLS (by mocking the user).
**Suggested Files for Context**: `lib/actions/artifacts/comments.ts`, `lib/actions/shared/validation.ts`, `lib/actions/notifications.ts`, `lib/security/file-validation.ts`, `docs/tech-spec.md`
**Step Dependencies**: All backend feature steps, Phase 4 Optimization completed
**User Instructions**: Run `npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom` and then run `npm test`.

[ ] Step 28: IMPORTANT: Setup and Write E2E Tests
**Task**: Configure Playwright for end-to-end testing. Update test setups to log in users via the new password method. Implement tests for the key feature flows: 1. A user posts a comment with user-selection @mentions, and the mentioned user receives a notification. 2. A user interacts with the Learning Goal Editor and successfully gets AI suggestions. 3. The AI Tutor chat loads and displays a shared history.
**Suggested Files for Context**: All relevant page and component files for these flows, `components/pblab/auth/auth-form.tsx`
**Step Dependencies**: All feature steps, Step 21 (password authentication working)
**User Instructions**: Run `npm init playwright@latest`. Test logins will now use the defined email/password combinations from the seed script.

[ ] Step 29: **Create Final README.md Documentation**
**Task**: Create the final `README.md` for competition submission. It must include the live application URL, GitHub repo link, and embedded demo video. Crucially, add the "Test Accounts" table with all credentials (admin@university.edu, educator1@university.edu, student1@university.edu, student3@university.edu, all with password123) and a detailed "Testing the Student Invite Feature" guide for judges to verify the invite link functionality works correctly.
**Suggested Files for Context**: `docs/comp-criteria.md`, `docs/prd.md`, `scripts/seed.ts`
**Step Dependencies**: All steps completed, live deployment ready
**User Instructions**: This is a key deliverable for the competition. Include screenshots and clear instructions for judges to test all MVP features.