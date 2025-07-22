# Implementation Plan

## Phase 1: Project Setup & Configuration

This section focuses on initializing the project, structuring directories, and setting up the basic configuration.

[ ] Step 1: Initialize Project Structure
**Task**: Based on the provided `starter_template` and the `tech_spec`, create the initial directory structure for the PBLab application. This includes creating new folders like `app/(main)`, `app/p/[projectId]`, `components/pblab`, `lib/actions`, `supabase/migrations` and the necessary subdirectories as outlined in the technical specification. No files need to be created in this step, only the directory structure.
**Suggested Files for Context**: None
**Step Dependencies**: None
**User Instructions**: None

[ ] Step 2: Install Additional Dependencies
**Task**: Update the `package.json` file to include the necessary libraries for the project that are not in the starter template. Based on the tech spec, this includes `react-markdown` for rendering markdown descriptions, `jsonwebtoken` for team invite links, and the corresponding type definitions `@types/jsonwebtoken`. Also add `supabase` and `ts-node` as development dependencies to support the new database workflows.
**Suggested Files for Context**: `package.json`
**Step Dependencies**: Step 1
**User Instructions**: Run `npm install` after the `package.json` file is updated.

[ ] Step 3: Update `.env.example` with All Required Keys
**Task**: Update the `.env.example` file to include placeholders for all required secrets. This provides a clear setup guide for developers.
**Suggested Files for Context**: `.env.example`
**Step Dependencies**: Step 1
**User Instructions**: Copy `.env.example` to `.env.local` and fill in the values as you acquire the keys throughout the setup process.

```env
# Supabase details from your project's API settings
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Gemini API Key for AI features
GEMINI_API_KEY=your-gemini-api-key

# Google Cloud OAuth credentials for Drive Picker integration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# A strong, random secret for signing JWTs for invite links
JWT_SECRET=your-secure-random-string
```

[ ] Step 4: Update Tailwind Configuration & Globals CSS
**Task**: Modify the `tailwind.config.ts` and `app/globals.css` to align with the PBLab design system. Update the primary color in `app/globals.css` to the specified blue (`--primary: 210 40% 50%`) and secondary to the light blue (`--secondary: 210 40% 90%`).
**Suggested Files for Context**: `tailwind.config.ts`, `app/globals.css`
**Step Dependencies**: Step 1
**User Instructions**: None

[ ] Step 5: Create PBLab Logo Component and Update Main Page
**Task**: Create the `<PBLabLogo />` component in `components/pblab/pblab-logo.tsx`. Then, update the root `app/layout.tsx` with the correct metadata and `app/page.tsx` to use the new logo and create a simple, welcoming landing page for PBLab.
**Suggested Files for Context**: `app/page.tsx`, `app/layout.tsx`, `components/supabase-logo.tsx`
**Step Dependencies**: Step 1
**User Instructions**: None

-----

## Phase 2: Database & Authentication

This section covers setting up the database schema and authentication-related logic using a migration-based approach.

[ ] Step 6: Create Initial Schema Migration
**Task**: Create a new SQL migration file at `supabase/migrations/0001_initial_schema.sql`. This file will contain all the `CREATE TYPE` and `CREATE TABLE` statements as defined in the "Database Schema" section of the technical specification.
**Suggested Files for Context**: None
**Step Dependencies**: Step 1
**User Instructions**: If using the Supabase CLI, run `supabase db push` to apply the migration. Otherwise, run the script's contents in your Supabase project's SQL Editor.

[ ] Step 7: Create RLS Policies Migration
**Task**: Create a second SQL migration file at `supabase/migrations/0002_rls_policies.sql`. This file will contain the `get_my_role()` helper function and all the Row Level Security policies specified in the "Authentication & Authorization" section of the tech spec.
**Suggested Files for Context**: `supabase/migrations/0001_initial_schema.sql`
**Step Dependencies**: Step 6
**User Instructions**: If using the Supabase CLI, run `supabase db push`. Otherwise, run the script's contents in your Supabase project's SQL Editor after the initial schema has been created.

[ ] Step 8: Generate TypeScript Types from Database
**Task**: Update `package.json` to add a new script: `"types:gen": "supabase gen types typescript --project-id YOUR_PROJECT_REF > lib/db.types.ts"`. This will automate the creation of TypeScript types from your database schema.
**Suggested Files for Context**: `package.json`
**Step Dependencies**: Step 7
**User Instructions**: Find your `YOUR_PROJECT_REF` in your Supabase project's General Settings. Run `npm run types:gen` to generate the `lib/db.types.ts` file. You will need to have the Supabase CLI installed and be logged in (`supabase login`).

[ ] Step 9: Create Database Seeding Script
**Task**: Create a script at `scripts/seed.ts` to populate the database with the two example problems ("Outbreak Simulator" and "EcoBalance") and sample users. Add a new script to `package.json`: `"db:seed": "ts-node scripts/seed.ts"`.
**Suggested Files for Context**: `supabase/migrations/0001_initial_schema.sql`, `lib/db.types.ts`
**Step Dependencies**: Step 8
**User Instructions**: Run `npm run db:seed` to seed the database.

[ ] Step 10: Enhance Sign-Up and Create User Profile Trigger
**Task**: Modify the `components/sign-up-form.tsx` to include a "Full Name" input. The `handleSignUp` function should pass the name in the `options.data` object.
**Suggested Files for Context**: `components/sign-up-form.tsx`
**Step Dependencies**: Step 7
**User Instructions**: Manually create a database function and trigger in the Supabase SQL Editor to copy new auth users to your `public.users` table.

```sql
-- 1. Create the function
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'name', 'student');
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

-----

## Phase 3: Backend: Server Actions & API Routes

This section deals with creating the backend logic for data manipulation and external service integrations.

[ ] Step 11: Create Abstracted AI Logging Helper
**Task**: Create a new file `lib/actions/ai.ts`. Inside, implement a reusable function `logAiUsage({ userId, projectId, feature, prompt, response })` that inserts a record into the `ai_usage` table. This keeps the logging logic centralized.
**Suggested Files for Context**: `lib/db.types.ts`, `lib/supabase/server.ts`
**Step Dependencies**: Step 8
**User Instructions**: None

[ ] Step 12: Implement Server Actions for Teams, Problems, Projects, and Artifacts
**Task**: Create the server action files (`teams.ts`, `problems.ts`, `projects.ts`, `artifacts.ts`) in `lib/actions/`. Implement all the specified actions: `joinTeam`, `createProblem`, `updateProjectPhase`, `createArtifact`, `createComment`, etc. Ensure they are using the new generated types for safety.
**Suggested Files for Context**: `lib/db.types.ts`, `lib/supabase/server.ts`
**Step Dependencies**: Step 8
**User Instructions**: None

[ ] Step 13: Create API Route for AI Tutor
**Task**: Create the API route `app/api/ai/tutor/route.ts`. This route will handle POST requests, construct a prompt with history, call the Gemini API, and use the `logAiUsage` helper to log the interaction before returning the response.
**Suggested Files for Context**: `lib/actions/ai.ts`, `lib/db.types.ts`, `lib/supabase/server.ts`
**Step Dependencies**: Step 11, Step 12
**User Instructions**: Ensure your `GEMINI_API_KEY` is set in `.env.local`.

[ ] Step 14: Create API Route for AI Assessment
**Task**: Create the API route `app/api/ai/assess/route.ts`. This route will handle generating and regenerating rubric assessments via Gemini Function calling, save the results, and use the `logAiUsage` helper.
**Suggested Files for Context**: `lib/actions/ai.ts`, `lib/db.types.ts`, `lib/supabase/server.ts`
**Step Dependencies**: Step 11, Step 12
**User Instructions**: None

[ ] Step 15: Create API Routes for Google Drive
**Task**: Create `app/api/drive/export/route.ts` and `app/api/drive/picker/route.ts` to handle the hybrid Google Drive integration strategy.
**Suggested Files for Context**: `lib/db.types.ts`
**Step Dependencies**: Step 8
**User Instructions**: Set up a Google Cloud Project, enable the Google Drive API, and add OAuth 2.0 credentials to your `.env.local` file.

-----

## Phase 4: Frontend: Layouts & Feature Implementation

This section focuses on building the UI, from shared layouts to specific feature components.

[ ] Step 16: Create Main App Layout and Role-Based Redirect
**Task**: Create the main authenticated layout at `app/(main)/layout.tsx` with `<Sidebar />` and `<Header />` components. Then, implement the dashboard redirect page at `app/(main)/dashboard/page.tsx` to route users based on their role.
**Suggested Files for Context**: `app/protected/layout.tsx`, `components/auth-button.tsx`, `lib/supabase/server.ts`
**Step Dependencies**: Step 10
**User Instructions**: None

[ ] Step 17: Create Student and Educator Dashboards
**Task**: Create the student dashboard at `app/(main)/student/dashboard/page.tsx` to list their projects. Create the educator dashboard at `app/(main)/educator/dashboard/page.tsx` containing the `<ProjectKanban />` component to view teams' progress.
**Suggested Files for Context**: `lib/db.types.ts`, `app/(main)/layout.tsx`
**Step Dependencies**: Step 16
**User Instructions**: None

[ ] Step 18: Educator - Create Problem Page and Rubric Editor
**Task**: Create the "New Problem" page at `app/(main)/educator/problems/new/page.tsx`. Implement the reusable `<RubricEditor />` component (`components/pblab/educator/rubric-editor.tsx`) which will be used here in "template" mode and later in "grading" mode.
**Suggested Files for Context**: `lib/actions/problems.ts`, `lib/db.types.ts`
**Step Dependencies**: Step 12, Step 17
**User Instructions**: None

[ ] Step 19: Student - Project Workspace and Components
**Task**: Create the project workspace page at `app/p/[projectId]/page.tsx`. Implement the child components: `<ArtifactUploader />`, `<ArtifactCard />`, `<CommentThread />`, and the `<AiTutorChat />` interface. Wire them up to their respective server actions and API routes.
**Suggested Files for Context**: `lib/actions/artifacts.ts`, `app/api/ai/tutor/route.ts`
**Step Dependencies**: Step 12, Step 13, Step 17
**User Instructions**: Configure a "artifacts" bucket in Supabase Storage with the appropriate RLS policies.

[ ] Step 20: Educator - AI Assessment Grading View
**Task**: Extend the `<RubricEditor />` to handle grading mode. This view will appear on the project page for educators when a report is submitted. It should allow for generating, editing, regenerating, and finalizing AI-assisted grades.
**Suggested Files for Context**: `components/pblab/educator/rubric-editor.tsx`, `app/api/ai/assess/route.ts`
**Step Dependencies**: Step 14, Step 18, Step 19
**User Instructions**: None

-----

## Phase 5: Testing

This section includes steps for creating tests to ensure application quality and correctness.

[ ] Step 21: Setup and Write Unit Tests
**Task**: Configure Jest for unit testing. Create tests for key server actions, such as testing the file-type validation in `createArtifact` (T-03) and ensuring the `logAiUsage` helper is called correctly from the AI tutor route (T-02).
**Suggested Files for Context**: `lib/actions/artifacts.ts`, `lib/actions/ai.ts`, `app/api/ai/tutor/route.ts`
**Step Dependencies**: Step 11, Step 12
**User Instructions**: Run `npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom` and `npm test`.

[ ] Step 22: Setup and Write E2E Tests
**Task**: Configure Playwright for end-to-end testing. Implement the critical user flow tests T-01 (Student can join team via invite) and T-04 (Educator feedback locks project editing).
**Suggested Files for Context**: All relevant page and component files for these flows.
**Step Dependencies**: All feature steps.
**User Instructions**: Run `npm init playwright@latest` and `npx playwright test`.