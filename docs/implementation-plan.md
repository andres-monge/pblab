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

**Critical Notifications RLS INSERT Issue Fix**: Authenticated users were unable to create notifications due to missing RLS INSERT policies, despite having correct privileges and session context, resulting in persistent error 42501. The issue was resolved by forcing RLS enforcement, adding a BEFORE INSERT trigger to auto-populate actor_id, and creating a robust WITH CHECK policy ensuring both actor_id and recipient_id match auth.uid().

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

Summary: Built complete frontend interface with authentication, role-based dashboards, notifications system, and core project workspace features including AI tutor
  integration and learning goal management.

  Step-by-Step Implementation:

  Step 19: Main App Layout ✅
  - Created app/(main)/layout.tsx with two-column responsive design
  - Built Header component with user avatar, dropdown menu, and mobile navigation
  - Built Sidebar component with role-based navigation and disabled future features
  - Implemented authentication protection and user context fetching

  Step 20: Password Authentication Setup ✅
  - Updated scripts/seed.ts to create password-enabled test accounts
  - Added 7 users (1 admin, 2 educators, 4 students) all with password123
  - Implemented --force flag for testing database resets
  - Verified magic link compatibility maintained

  Step 21: Password Login Form ✅
  - Updated auth-form.tsx for dual authentication (login/signup)
  - Implemented signInWithPassword() for existing accounts
  - Implemented signUp() with password for new users
  - BONUS: Complete invite flow with /join?token=xyz URLs and team auto-joining

  Step 22: Role-Based Dashboards ✅
  - Created redirect logic at /dashboard based on user role
  - Built student dashboard at /student/dashboard with team/project overview
  - Built educator dashboard at /educator/dashboard with course management
  - Built admin dashboard at /admin/dashboard with system overview

  Step 22.1: Admin Dashboard Page ✅
  - Simple admin dashboard following student/educator patterns
  - Three placeholder cards: System Overview, User Management, Activity Monitor
  - Static content preparation for Step 22.2 functionality

  Step 22.2: Dynamic Dashboard Data ✅
  - Converted static dashboards to dynamic with real database fetching
  - Student dashboard: user teams, active projects, notifications
  - Educator dashboard: course projects and team overview
  - Admin dashboard: full CRUD interface for users, teams, courses

  Step 23: Notifications UI ✅
  - Created NotificationsIndicator component with unread count badge
  - Dropdown panel with last 5 notifications showing actor, type, timestamp
  - Integrated into Header with mark-as-read and navigation functionality
  - Real-time unread count updates and responsive design

  Step 24: Project Workspace & Learning Goals ✅
  - Created main project workspace at /p/[projectId]
  - Built LearningGoalEditor component for 'pre' phase projects
  - Connected "Save" button to updateProjectLearningGoals action
  - Connected "AI Suggestions" button to /api/ai/suggest-goals endpoint

  Step 25: AI Tutor Chat UI ✅
  - Created AiTutorChat component with shared conversation history
  - Added getAiTutorHistory() server action with pagination (10 messages per chunk)
  - Collapsible right sidebar with user attribution for each message
  - Progressive loading with "Load older messages" and real-time updates

  Step 26: Artifacts & Comments ✅
  - Built ArtifactUploader component supporting file uploads and external links
  - Built ArtifactCard component displaying metadata (title, type, uploader, timestamp)
  - Built CommentThread component with user-selection @mention functionality
  - Integrated mention selector using getProjectMentionableUsers() action

  Key Achievements:
  - Complete user authentication and authorization system
  - Role-based dashboard experience for all user types
  - Real-time notifications with mark-as-read functionality
  - AI-powered learning goal suggestions and shared team tutoring
  - Full project collaboration workflow with artifacts and @mention system
  - Responsive design working across desktop and mobile devices

  Critical Files: Main layout structure, authentication components, dashboard pages, project workspace, AI integration components, notifications system.

-----

## Phase 6: MVP Feature Implementation

This phase focuses on building the remaining frontend UI and wiring up the existing backend actions to complete the core user flows required by @prd.md and @comp-criteria.

[x] Step 27: **IMPORTANT: Fix Project Workspace Layout** **Task**: Relocate the project workspace page `p/[projectId]` to be a root-level route group, outside of `(main)`. Create a new, dedicated layout for this route that includes the `<Header />` but **not** the `<Sidebar />`. This is a foundational step that unblocks all subsequent work on the project page. **Suggested Files for Context**: `app/(main)/p/[projectId]/page.tsx`, `app/(main)/layout.tsx`, `app/(main)/student/dashboard/page.tsx`, `docs/tech-spec.md` (Section 8.1, Component Architecture) **Implementation Notes**:

1. Move the `app/(main)/p` directory to `app/p`.
    
2. Create a new file `app/p/[projectId]/layout.tsx`.
    
3. In the new layout, add authentication checks and render the `<Header />` and the `{children}`. **Do not** include the `<Sidebar />`.
    
4. Update the `<Link>` components in the student and educator dashboards to point to the new project URL path (`/p/${project.id}`).
    

---

[x] Step 28: **IMPORTANT: Implement "Create Problem" Page UI** ✅ **Task**: Build the frontend page and form component for educators to create new PBL problems. The form must allow defining a title, description, and a dynamic list of rubric criteria. **Suggested Files for Context**: `lib/actions/problems.ts`, `docs/prd.md` (Section 3.2, User Story 1), `docs/comp-criteria.md` (Core Requirements) **Implementation Notes**:

**✅ COMPLETED - All functionality implemented and tested with authenticated users**

1. ✅ Created page at `app/(main)/educator/problems/new/page.tsx` with course data fetching
2. ✅ Created client component `components/pblab/educator/create-problem-form.tsx` with full functionality  
3. ✅ Implemented form inputs for `title` (text) and `description` (textarea)
4. ✅ Implemented dynamic rubric section with add/remove criteria functionality
5. ✅ Integrated with existing `createProblem` server action with proper error handling
6. ✅ Added success/error states with user feedback and navigation
7. ✅ Added "Create Problem" button to educator dashboard for easy access
8. ✅ **TESTED with authenticated educator user** - all functionality verified working

**Key Features Delivered:**
- Pre-loaded with 5-criterion PBL rubric template
- Dynamic add/remove criteria with validation (minimum 1 criterion)
- Responsive design with proper form validation
- Success redirect to educator dashboard
- Complete integration with existing backend infrastructure
- Authenticated user testing confirms RLS policies work correctly
    

---

[x] Step 28.1: **CRITICAL: Complete Problem-to-Project Workflow** ✅ **Task**: Extend the "Create Problem" page to include team creation and student assignment, completing the missing link between educator problem creation and student project work. This addresses the fundamental gap where educators can create problems but students cannot access them without manual admin intervention. **Suggested Files for Context**: `components/pblab/educator/create-problem-form.tsx`, `lib/actions/problems.ts`, `lib/actions/teams.ts`, `lib/actions/projects.ts`, `docs/prd.md` (Section 3.1, User Story 1 & 2), `docs/tech-spec.md` (Section 3.1 & 3.2) **Implementation Notes**:

**✅ COMPLETED - All functionality implemented and tested with authenticated users**

1. ✅ Enhanced `CreateProblemForm` with optional teams section that appears after course selection
2. ✅ Extended `createProblem` action with teams parameter and transaction flow: Problem → Rubric → Teams → Projects → Invites
3. ✅ Added `getStudentsInCourse` function for student selection interface
4. ✅ Implemented dynamic team creation with student assignment via checkboxes
5. ✅ Created comprehensive rollback strategy if any step fails
6. ✅ **TESTED with authenticated educator and student users** - all functionality verified working:
   - Educator can create problems with teams
   - Teams and projects auto-created in single transaction
   - Students can see projects immediately via RLS policies
   - End-to-end workflow completes the missing problem-to-project link

**Key Features Delivered:**
- Progressive UI disclosure: teams section only shows after course selection
- Dynamic add/remove teams with auto-generated names ("Team 1", "Team 2")
- Student selection via checkboxes with visual feedback (badge showing count)
- Atomic database operations with comprehensive error handling
- Complete integration with existing RLS policies and authorization
- Authenticated user testing confirms all policies work correctly

---

[X] Step 29: **Implement Student Final Report Submission** **Task**: On the project workspace page, add a UI section that is only visible to students when the project is in the `research` phase. This UI will allow them to submit the URL for their final report. **Suggested Files for Context**: `app/p/[projectId]/page.tsx`, `lib/actions/projects.ts`, `docs/prd.md` (Section 3.1, User Story 6) **Implementation Notes**:

1. Created FinalReportSubmission Component:
    - Form with URL input and submit button
    - Shows current report URL when already submitted
    - Includes helpful tip about Google Docs sharing settings
    - Proper loading states and error handling
  2. Updated Project Workspace Page:
    - Research Phase: Students see artifacts interface AND final report submission form
    - Post Phase: Both students and educators see read-only submitted report display
    - Proper conditional rendering based on user role and project phase
  3. Corrected Workflow Logic:
    - Final report submission happens in research phase (not post)
    - Submitting report automatically triggers research → post phase transition
    - This aligns with the state machine where submitting the report IS the trigger for phase advancement
    

---

[ ] Step 30: **COMPLEX: Create Backend for Educator Assessment** **Task**: Create a new server action, `saveAssessment`, that allows an educator to save their rubric-based feedback for a project. This action needs to be transactional, creating records in both the `assessments` and `assessment_scores` tables. **Suggested Files for Context**: `lib/db.types.ts`, `supabase/migrations/20250722133352_initial_schema.sql` (for table structure), `docs/prd.md` (Section 3.2, User Story 3) **Implementation Notes**:

1. Create a new file `lib/actions/assessments.ts`.
    
2. Define the `saveAssessment` function, which should accept `projectId` and an array of scores, where each score object contains `criterion_id`, `score`, and `justification`.
    
3. The action must perform the following steps:
    
    - Authenticate the user and verify they are an educator with access to the project.
        
    - Create a new record in the `assessments` table linked to the project and assessor.
        
    - For each item in the scores array, create a corresponding record in the `assessment_scores` table, linked to the new assessment ID.
        
    - Wrap the database inserts in a transaction if possible to ensure atomicity.
        

---

[ ] Step 31: **COMPLEX: Implement Educator Feedback & Locking UI** **Task**: On the project page, build the UI for educators to provide rubric-based feedback on a submitted report. This component will use the `saveAssessment` action from the previous step and then lock the project. **Suggested Files for Context**: `app/p/[projectId]/page.tsx`, `lib/actions/assessments.ts` (the new action), `lib/actions/projects.ts` (for `updateProjectPhase`), `docs/comp-criteria.md` (Feedback System requirement) **Implementation Notes**:

1. Create a new component `components/pblab/educator/rubric-assessment.tsx`.
    
2. This component should be conditionally rendered on the project page for educators when `project.phase === 'post'`.
    
3. Fetch the rubric criteria for the project's problem.
    
4. For each criterion, display the `criterion_text` and provide inputs for a `score` (e.g., a 1-5 select/radio group) and a `justification` (textarea).
    
5. Include a final "Save Feedback & Lock Project" button.
    
6. On click, this button should first call `saveAssessment` with the form data, and upon success, call `updateProjectPhase` with `newPhase: 'closed'`.
    

---

[ ] Step 32: **Finalize Lifecycle UI & Read-Only States** **Task**: Add the first lifecycle transition button for students (`Pre` → `Research`) and ensure all interactive elements on the project page become disabled when the project is `closed`. **Suggested Files for Context**: `app/p/[projectId]/page.tsx`, `components/pblab/project/learning-goal-editor.tsx`, `components/pblab/project/project-artifacts.tsx` **Implementation Notes**:

1. In the `LearningGoalEditor` component (or on the project page when `phase === 'pre'`), add a "Confirm Learning Goals & Start Research" button visible only to students. This button will call `updateProjectPhase`.
    
2. Pass an `isLocked` prop (derived from `project.phase === 'closed'`) from the project page down to child components.
    
3. Use this prop to apply the `disabled` attribute to all buttons (`<Button>`), inputs (`<Input>`), and text areas (`<Textarea>`) related to project work (e.g., artifact uploader, comment forms, learning goal editor).
    

---

[ ] Step 33: **Implement Google Doc Preview** **Task**: Enhance the final report display to show an embedded preview of the Google Doc using an `<iframe>`. **Suggested Files for Context**: `app/p/[projectId]/page.tsx`, `docs/prd.md` (Section 4, Google Docs link handling) **Implementation Notes**:

1. In the component that displays the final report for educators, check if the `final_report_url` exists.
    
2. If it does, transform the URL by replacing `/edit` with `/preview`.
    
3. Render an `<iframe>` with the transformed URL as its `src`. Style it to have a reasonable height and width.
    

---

## Phase 7: Finalization and Testing

[ ] Step 34: **IMPORTANT: Setup and Write E2E & Unit Tests** **Task**: Install and configure Jest and Playwright. Write the four key tests defined in the PRD's acceptance criteria to ensure the application is robust and meets the competition's technical requirements. **Suggested Files for Context**: `package.json`, `docs/prd.md` (Section 8, Tests-to-Pass) **Implementation Notes**:

- **T-01 (E2E):** Test the full student invite flow.
    
- **T-02 (Unit):** Test the AI helper API. Mock the Gemini/OpenAI call and assert that a row is inserted into the `ai_usage` table.
    
- **T-03 (API/Unit):** Test the `createArtifact` action. Attempt to create an artifact with a disallowed file type (e.g., `.exe`) and assert that it returns an error.
    
- **T-04 (E2E):** Test that an educator submitting feedback successfully changes the project phase to `closed` and that student inputs are then disabled.
    

---

[ ] Step 35: **Create Final README.md Documentation** **Task**: Create the final `README.md` file for your project submission. This is a critical deliverable for the judges. **Suggested Files for Context**: `docs/comp-criteria.md` (Deliverables section), `scripts/seed.ts` (for test account credentials) **Implementation Notes**:

1. Clear out the starter template's content from `README.md`.
    
2. Add all required elements: Live URL, GitHub Repo URL, and a placeholder for your demo video link.
    
3. Create a "Test Accounts" section with the email/password for the admin, educator, and student users from your seed script.
    
4. Write a clear, step-by-step guide for judges on how to test the student invite feature, as this is a specific user flow they will need to verify.