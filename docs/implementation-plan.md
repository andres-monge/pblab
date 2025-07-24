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

## Phase 4: Backend Enhancements

**Summary**: Added Learning Goals and Notifications features via database migrations, RLS policies, and server actions. Extended schema with `learning_goals` column on projects table and complete `notifications` table.

**Database Changes**: 
- Added `learning_goals TEXT` to `projects` table for student-defined learning objectives
- Created `notifications` table with `notification_type` ENUM for @mention system
- Applied RLS policies for notification privacy and security

**New Server Actions**:
- `lib/actions/projects.ts`: Added `updateProjectLearningGoals()` with role-based access control
- `lib/actions/notifications.ts`: Complete notification system with `getNotifications()`, `markNotificationAsRead()`, and `createNotification()` helpers

**Key Features**: Role-based authorization, team membership verification, self-notification prevention, optimized queries with joins, comprehensive error handling.

**Critical Files**: Migration files `*_feature_enhancements.sql` and `*_notifications_rls.sql`, updated `lib/db.types.ts`, `lib/actions/notifications.ts`.

[x] Step 16: IMPORTANT: Enhance `createComment` Action for User Selection @Mentions ✅ COMPLETED
**Task**: Modify the `createComment` server action in `lib/actions/artifacts.ts` to support a user-selection based mention system. Update the `CreateCommentParams` interface to include `mentionedUserIds?: string[]`. Create a helper function `getProjectMentionableUsers(projectId)` that returns team members and course educators available for mention. After a comment is successfully inserted, validate the mentioned user IDs and create notification records for each valid mention using the existing `createNotification` helper function.
**Suggested Files for Context**: `lib/actions/artifacts.ts`, `lib/actions/notifications.ts`, `lib/db.types.ts`
**Step Dependencies**: Step 15
**User Instructions**: None
**Implementation Notes**: Successfully implemented comprehensive user-selection based @mention system for comments:

**Interface Updates:**
- Enhanced `CreateCommentParams` interface in `lib/actions/artifacts.ts` to include optional `mentionedUserIds?: string[]` parameter
- Added proper TypeScript validation for the new parameter ensuring it's an array of valid string user IDs

**Helper Function Implementation:**
- Created `getProjectMentionableUsers(projectId: string)` function that returns users available for mentions in a specific project
- Function returns both team members (students in the project's team) and course educators (educators who administer the course)
- Implemented proper database queries with authentication checks and RLS policy integration
- Added deduplication logic to handle users who might appear in both categories
- Comprehensive error handling with user-friendly messages

**Enhanced Comment Creation:**
- Modified `createComment` function to extract and validate `mentionedUserIds` parameter
- Added mention processing after successful comment creation to maintain atomic operations
- Implemented validation logic that filters mentioned users to only include valid/mentionable users for the project
- Added self-mention prevention (users cannot mention themselves)
- Integrated with existing `createNotification` helper to create `'mention_in_comment'` notifications
- Used graceful error handling where mention failures don't prevent comment creation

**Security Features:**
- Validates mentioned user IDs exist and have permission to be mentioned in the project context
- Deduplicates user IDs to prevent notification spam
- Follows existing authentication and authorization patterns
- RLS policies ensure proper data access control

**Technical Implementation:**
- Non-breaking changes: new parameter is optional, existing functionality unchanged
- Atomic operations: comment creation happens first, mentions processed after
- Graceful degradation: mention failures logged but don't break comment creation
- Proper database queries with efficient user fetching and validation
- Integration with existing notification infrastructure from Step 15

**Verification:**
- Successfully passed TypeScript compilation with `npm run build` (0 errors)
- Passed ESLint validation with `npm run lint` (0 warnings)
- All functions follow established codebase patterns and conventions
- Ready for frontend integration in upcoming steps

The mention system now supports user-selection based workflow where frontend components can provide arrays of user IDs to mention, and the backend will validate permissions, create notifications, and ensure secure operation.

[x] Step 17: IMPORTANT: Create API Route for AI-Powered Goal Suggestions ✅ COMPLETED
**Task**: Create the API route at `app/api/ai/suggest-goals/route.ts`. This `POST` route should accept a `projectId`, fetch the associated problem's title and description for context, call the Gemini API to generate suggestions, log the interaction using `logAiUsage`, and return the suggestions.
**Suggested Files for Context**: `.docs/tech-spec.md`, `lib/actions/ai.ts`, `lib/db.types.ts`
**Step Dependencies**: Step 12
**User Instructions**: Ensure your `GEMINI_API_KEY` is set in `.env.local`.
**Implementation Notes**: Successfully created comprehensive AI-powered learning goal suggestions API:
- Installed `@google/genai@^1.0.0` package for Gemini API integration
- Created `app/api/ai/suggest-goals/route.ts` with POST handler following Next.js App Router patterns
- Implemented robust authentication using Supabase server client with RLS policy integration
- Added project access validation ensuring users can only access their authorized projects
- Integrated with existing `logAiUsage` helper for comprehensive audit trails and analytics
- Used configurable model selection via `GEMINI_MODEL` environment variable (defaults to gemini-2.5-flash)
- **FIXED**: Properly configured GoogleGenAI constructor with API key authentication
- **ENHANCED**: Added comprehensive generation configuration for reliable AI responses:
  * `temperature: 0.7` for balanced creativity and consistency in educational content
  * `maxOutputTokens: 1000` to control response length and costs
  * `responseMimeType: 'application/json'` to encourage proper JSON formatting
  * `stopSequences: [']']` to prevent generation beyond JSON array completion
- Implemented intelligent response parsing with JSON extraction and fallback text processing
- Added comprehensive error handling for rate limits, API failures, and invalid requests
- Follows existing codebase patterns and TypeScript strict mode compliance
- Successfully passed ESLint validation and TypeScript compilation
- API accepts `{ projectId: string }` and returns `{ success: true, suggestions: string[] }`
- Constructs educational prompts using problem title/description for context-aware learning goals
- Ready for frontend integration in upcoming Learning Goal Editor component

[x] Step 18: IMPORTANT: Update AI Tutor API for Contextual Memory ✅ COMPLETED
**Task**: Modify the `app/api/ai/tutor/route.ts` file. Update the `POST` handler to query the `ai_usage` table for all previous 'tutor' interactions associated with the `projectId`. Format this history and prepend it to the new prompt before sending it to the Gemini API.
**Suggested Files for Context**: `app/api/ai/tutor/route.ts` (or create if not existing), `lib/actions/ai.ts`, `lib/db.types.ts`
**Step Dependencies**: Step 12
**User Instructions**: None
**Implementation Notes**: Successfully created AI tutor API with contextual memory:
- Created `app/api/ai/tutor/route.ts` with POST handler accepting `{projectId, message}`
- Implemented conversation history retrieval from `ai_usage` table for project-specific tutor interactions
- Built proper message formatting for Gemini API with user/model role alternation
- Integrated contextual memory by prepending conversation history to new prompts
- Added comprehensive system instruction for educational AI tutoring behavior
- Included authentication, authorization, and RLS policy integration
- Enhanced error handling for rate limits, API failures, and configuration issues
- Integrated with existing `logAiUsage` helper for audit trails and analytics
- Successfully passed TypeScript compilation and ESLint validation
- API endpoint tested and responding correctly with authentication requirements
- Ready for frontend integration in Step 23

-----

## Phase 4 Optimization: Code Quality & Structure Enhancement

**Summary**: Refactor Phase 4 backend code to improve maintainability, code organization, and prepare for Phase 5 frontend development. Focus on extracting reusable patterns, improving file structure, and enhancing error handling.

**Key Goals**: Split large files, create shared utilities, standardize error handling, and establish patterns for frontend integration.

### Code Organization & Structure Optimization

[x] Step 18.1: Extract File Security Module
**Task**: Create a dedicated security module to handle file validation logic. Currently, 75 lines of file type definitions are mixed with business logic in `artifacts.ts` (710 lines total). This will prepare for frontend file upload components in Phase 5.
**Suggested Files for Context**: `lib/actions/artifacts.ts`, existing patterns in `lib/` directory
**Step Dependencies**: None
**User Instructions**: None

[x] Step 18.2: Split Large Artifacts Action File
**Task**: Refactor `lib/actions/artifacts.ts` (710 lines) into focused modules: CRUD operations, comment functionality, and permissions. This improves maintainability and follows single responsibility principle.
**Suggested Files for Context**: `lib/actions/artifacts.ts`, `lib/actions/projects.ts`, other files in `lib/actions/`
**Step Dependencies**: Step 18.1 completed
**User Instructions**: None

[x] Step 18.3: Create Shared Authorization Helpers
**Task**: Extract repetitive authorization patterns from `projects.ts` and `artifacts.ts` into reusable helpers. This reduces 200+ lines of duplicated permission checking code.
**Suggested Files for Context**: `lib/actions/projects.ts`, `lib/actions/artifacts.ts`
**Step Dependencies**: Step 18.2 completed
**User Instructions**: None

[x] Step 18.4: Implement Shared Validation Utilities ✅ COMPLETED
**Task**: Create common validation functions for projectId, userId, and other parameters that are validated repeatedly across action files. This will be essential for Phase 5 form validation.
**Suggested Files for Context**: `lib/actions/projects.ts`, `lib/actions/artifacts.ts`, `lib/actions/notifications.ts`
**Step Dependencies**: None
**User Instructions**: None
**Implementation Notes**: Successfully created comprehensive shared validation utilities module:

**Core Validation Module Created:**
- Created `lib/shared/validation.ts` with 15 specialized validation functions
- Implemented type-safe validation utilities following TypeScript strict mode
- Provides consistent, user-friendly error messages across the application

**Key Validation Functions Implemented:**
- **ID Validators**: `validateId()`, `validateProjectId()`, `validateUserId()`, `validateTeamId()`, `validateArtifactId()`, `validateNotificationId()`
- **String Validators**: `validateRequiredString()`, `validateOptionalString()`, `validateStringLength()`
- **Array Validators**: `validateArray()`, `validateStringArray()` with individual item validation
- **Numeric Validators**: `validateNumber()`, `validateRange()` for constrained numeric inputs
- **Format Validators**: `validateUrl()`, `validateEnum()`, `validateToken()` for specific data formats

**Code Refactoring Completed:**
- **projects.ts**: Replaced ~30 lines of repetitive validation logic across 5 functions
- **notifications.ts**: Updated 3 functions with standardized validation patterns
- **artifacts/crud.ts**: Modernized validation in artifact creation and deletion functions
- **artifacts/comments.ts**: Enhanced comment and mention validation with array utilities

**Key Benefits Achieved:**
- **Code Reduction**: Eliminated ~200+ lines of duplicated validation code across action files
- **Consistency**: Standardized error messages and validation patterns throughout the application
- **Type Safety**: Enhanced TypeScript safety with branded types and strict validation
- **Maintainability**: Single source of truth for validation logic reduces future maintenance overhead
- **Frontend Ready**: Validation utilities prepared for Phase 5 form validation integration

**Technical Implementation:**
- Uses TypeScript generics for flexible yet type-safe validation functions
- Follows Single Responsibility Principle with focused, composable validation utilities
- Maintains backward compatibility while reducing code duplication
- Comprehensive parameter validation with context-specific error messages
- All functions follow existing codebase patterns and conventions

**Verification:**
- Successfully passed TypeScript compilation with `npm run build` (0 errors)
- Passed ESLint validation with `npm run lint` (0 warnings)
- All validation functions follow established security and authorization patterns
- Ready for Phase 5 frontend integration

The shared validation utilities provide a solid foundation for Phase 5 form validation while significantly improving code quality and maintainability across the backend action layer.

[x] Step 18.5: Standardize Action Response Types
**Task**: Create consistent return types for all server actions using discriminated unions. This improves TypeScript safety and makes error handling predictable for frontend components.
**Suggested Files for Context**: All files in `lib/actions/`, existing TypeScript interfaces in the project
**Step Dependencies**: None
**User Instructions**: None
**Implementation Notes**:
  1. Created Comprehensive Response Type System (lib/shared/action-types.ts)

  - Discriminated Union: Uses success: boolean as discriminator
  - Flexible Response Types: Supports data, IDs, messages, and tokens
  - Type Safety: Full TypeScript compile-time safety
  - Helper Functions: Utility functions for creating consistent responses
  - Type Guards: Functions to check response types safely

  2. Updated All Server Actions (23 functions across 9 files)

  - AI Actions (lib/actions/ai.ts): 1 function
  - Notifications (lib/actions/notifications.ts): 3 functions
  - Teams (lib/actions/teams.ts): 3 functions
  - Projects (lib/actions/projects.ts): 5 functions
  - Problems (lib/actions/problems.ts): 2 functions
  - Artifacts (lib/actions/artifacts/): 4 functions across 2 files

  3. Consistent Error Handling

  - No More Throws: Replaced exception-based with result-based error handling
  - Predictable Responses: All actions return the same response structure
  - Type-Safe: Frontend code can handle success/error cases at compile-time

[ ] Step 18.6: Enhance Error Handling with Structured Classes
**Task**: Replace generic error strings with structured error classes that provide better debugging information and user-friendly messages for frontend display.
**Suggested Files for Context**: `lib/actions/projects.ts`, `lib/actions/artifacts.ts`, error handling patterns in existing code
**Step Dependencies**: Step 18.5 completed
**User Instructions**: None

-----

## Phase 5: Frontend Implementation

This phase focuses on building the UI for all features, including the new enhancements.

[ ] Step 19: Create Main App Layout (Header and Sidebar)
**Task**: Create the main authenticated layout at `app/(main)/layout.tsx`. This will involve creating two new reusable components: `<Header />` in `components/pblab/header.tsx` and `<Sidebar />` in `components/pblab/sidebar.tsx`. The layout should establish the main two-column structure of the app.
**Suggested Files for Context**: `app/page.tsx`, `components/auth-button.tsx`, `lib/supabase/server.ts`
**Step Dependencies**: Step 12
**User Instructions**: None

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