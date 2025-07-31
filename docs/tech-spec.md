# PBLab Technical Specification

## 1. System Overview

- **Core purpose and value proposition:** PBLab is an AI-augmented Learning Management System (LMS) designed to facilitate Problem-Based Learning (PBL) for small student teams. It provides a structured workflow for students to tackle complex problems and equips educators with tools to monitor, guide, and assess progress efficiently. The core value is in streamlining the PBL process, fostering responsible AI use, and providing educators with deep insight into the learning journey.
    
- **Key workflows:**
    
    1. **Problem & Team Setup:** A Course Admin manages users and cohorts. An Educator creates a PBL Problem, defining its description and an assessment rubric (from a template or from scratch). The educator then creates teams and can generate invite links for students to join.
        
    2. **Student Collaboration (PBL Cycle):**
        
        - **Pre-discussion:** Students join their team, review the problem, and collaboratively define a problem statement and **learning goals**, with optional AI-powered suggestions.
            
        - **Self-directed Research:** Students work on the problem, creating and sharing artifacts (documents, links, code). They can use a **shared, persistent AI Tutor** for Socratic guidance and discuss findings via comments with **@mentions that trigger notifications**.
            
        - **Post-discussion:** The team synthesizes its findings and submits a final report link for assessment.
            
    3. **Educator Facilitation & Assessment:** The Educator monitors all teams' progress via a dashboard. Once a team submits their report, the Educator can trigger an AI-powered assessment against the pre-defined rubric. The Educator can then review, edit, or request regeneration of the AI's feedback before finalizing the grade and closing the project.
        
- **System architecture:**
    
    - **Framework:** Next.js (App Router)
        
    - **Database:** Supabase Postgres
        
    - **Authentication:** Supabase Auth (Email link) with Role-Based Access Control (RBAC) via Row Level Security (RLS).
        
    - **Storage:** Supabase Storage for file artifacts.
        
    - **AI:** Google Gemini API for the AI Tutor, Assessment, and Goal Suggestion features.
        
    - **Hosting:** Vercel for the Next.js application and Supabase Cloud for the database and backend services.
        
    - **UI:** Tailwind CSS with shadcn/ui components.
        

---

## 2. Project Structure

The project will be built upon the provided Next.js starter template. New directories and files will be added to logically separate concerns for the PBLab application.

/
├── app/
│   ├── (auth)/                 # Auth pages (login, signup)
│   ├── (main)/
│   │   ├── dashboard/          # Main authenticated app view
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── admin/              # Admin-specific views
│   │   │   └── dashboard/
│   │   │       └── page.tsx
│   │   ├── educator/           # Educator-specific views
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   └── problems/
│   │   │       ├── new/
│   │   │       │   └── page.tsx  # Form to create a new PBL problem
│   │   │       └── [id]/page.tsx # View/edit a problem definition
│   │   └── student/            # Student-specific views
│   │       └── dashboard/
│   │           └── page.tsx
│   ├── p/[projectId]/          # Individual project workspace (Corrected Location)
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── ai/
│   │   │   ├── tutor/route.ts
│   │   │   ├── assess/route.ts          # (REMOVED - AI-assisted grading is post-MVP)
│   │   │   └── suggest-goals/route.ts
│   │   └── drive/                       # (REMOVED - Complex Drive integration replaced with simple URL/iframe)
│   │       ├── export/route.ts
│   │       └── picker/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── pblab/                  # PBLab-specific, reusable components
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   ├── project/
│   │   │   ├── artifact-card.tsx
│   │   │   ├── artifact-uploader.tsx
│   │   │   ├── comment-thread.tsx
│   │   │   ├── learning-goal-editor.tsx
│   │   │   └── phase-card.tsx
│   │   ├── educator/
│   │   │   ├── create-problem-form.tsx  # (NEW - Step 28) Form component for creating PBL problems with rubric
│   │   │   ├── project-kanban.tsx
│   │   │   └── rubric-assessment.tsx  # (NEW/REPURPOSED - For manual feedback entry)
│   │   ├── ai/
│   │   │   └── ai-tutor-chat.tsx
│   │   └── ...
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── actions/                # Server Actions for DB mutations
│   │   ├── artifacts/
│   │   ├── projects.ts
│   │   ├── problems.ts         # (UPDATED - Step 28) Enhanced with createProblem action
│   │   ├── teams.ts
│   │   ├── notifications.ts
│   │   ├── assessments.ts      # (NEW - For saving manual rubric feedback)
│   │   └── ai.ts
│   ├── types/
│   │   └── problems.ts         # (NEW - Step 28) Type definitions for problem creation
│   ├── shared/
│   │   └── rubric-templates.ts # (NEW - Step 28) Default PBL rubric templates
│   ├── ...
└── ...                         # Other config files

---

## 3. Feature Specification

### 3.1 Educator: Create PBL Problem

- **User Story:** As an educator, I want to create a PBL problem by starting with a best-practice rubric template, which I can then approve or customize.
    
- **Implementation Steps:**
    
    1. Navigate to `/educator/problems/new`.
        
    2. The page renders a form with fields for `title` (text input) and `description` (Markdown editor).
        
    3. A "Rubric" section displays a pre-populated template based on a **Hybrid Model**: a matrix with criteria as rows and performance levels 1-5 as columns.
        
    4. The educator has three options:
        
        - **Approve Template:** Use the rubric as-is.
            
        - **Edit Template:** Modify, add, or remove criteria. All text fields for criteria descriptions are **immediately editable and auto-sizing**.
            
        - **Start from Scratch:** Clear the template and build a custom rubric.
            
    5. On submit, a server action `createProblem` is called with the final rubric data.
        
    6. The action inserts into the `problems`, `rubrics`, and `rubric_criteria` tables.
        
    7. Upon success, it revalidates the educator's dashboard path and redirects to `/educator/dashboard`.
        
- **Error Handling:**
    
    - Form validation on the client and server (e.g., title is required).
        
    - Handle database transaction failure.
        

### 3.2 Student: Join Team 

- **User Story:** As a student, I am added to a team by an Educator so that I can collaborate on a PBL problem.
    
- **Implementation Steps:**
    
    1. The Educator, on a team management page, can choose the students for a specific team.
        

### 3.3 Student: Manage Artifacts, Comments, and AI Tutor

- **User Story:** I can upload or link artifacts, discuss them with teammates via comments and @mentions, and use a shared AI Tutor for guidance.
    
- **Implementation Steps:**
    
    1. On the project page `/p/[projectId]`, an `<ArtifactUploader />` component allows adding artifacts via file upload or URL.
        
    2. **File Upload:** Uses a signed URL to upload directly to Supabase Storage. The `createArtifact` server action records the metadata.
        
    3. **URL Link:** When pasting a Google Drive URL, a tip about sharing permissions is displayed.
        
    4. **AI Tutor Interaction:** The `<AiTutorChat />` component provides a **single, shared, and persistent chat thread** for the entire team.
        
        - All team members can view the complete history of questions and answers, fostering a collaborative learning environment.
            
        - The AI has **contextual memory** of the entire conversation for that project, allowing for more relevant and continuous guidance.
            
    5. **Comments & Notifications:** Artifacts are displayed in `<ArtifactCard />` components, each with a `<CommentThread />`.
        - Users can select teammates and educators from a dropdown to mention them in comments.
        - Selected mentions will trigger **notifications** for the mentioned users, visible in the app's main header.
        
- **Error Handling:**
    
    - Upload fails: Show an error toast.
        
    - Invalid URL: Basic URL format validation.
        

### 3.4 Student: Submit Final Report

- **User Story:** As a student, I can submit our team's final report by providing a Google Drive link, with guidance to set appropriate sharing permissions for seamless access by educators and teammates.
    
- **Implementation Steps:**
    
    1. In the 'post' phase, a "Submit Final Report" section appears.
        
    2. Students paste a Google Drive URL into a text field and submit.
    
    3. The UI will display a tip for the student: "💡 **Tip**: Set your document to 'Anyone with the link can view' so your educators won't need to request access."
        
- **Error Handling:**
    
    - Invalid Google Drive URL: Show format validation error.
        

### 3.5 Educator: Provide Rubric-Based Feedback and Lock Project

- **User Story:** As an educator, I can manually enter scores and comments against a rubric for a team's final report, and then finalize the assessment to lock the project from further edits.
    
- **Implementation Steps:**
    
    1. When a project is submitted, the educator's view of `/p/[projectId]` shows the final report URL and a `<RubricEditor />` component.
        
    2. This component displays the rubric criteria, each with an input for a 1-5 score and a textarea for comments.
        
    3. The educator clicks a single **"Save & Finalize"** button. This calls a new server action (`saveAssessment`) to store the manual scores and then calls another action (`updateProjectPhase`) to set the project's status to `closed`.
        
- **Error Handling:**
    
    - AI call fails or returns malformed data: Return a user-friendly error.
        
            - Report content not available: Show an error and allow the educator to request a re-submission.
        

### 3.6 Student: Define Learning Goals with AI Assist

- **User Story:** As a student in the pre-discussion phase, I can collaboratively define our team's learning goals and get AI-powered suggestions to help us get started.
- **Implementation Steps:**
    1. During the project's `pre` phase, the project workspace will display a `<LearningGoalEditor />` component.
    2. This component features a large text area where students can type their learning goals.
    3. A "Save Goals" button calls the `updateProjectLearningGoals` server action to persist the content in the `projects.learning_goals` field.
    4. An "AI Suggestions" button calls the new `POST /api/ai/suggest-goals` API route.
    5. The API provides the AI with the problem's title and description to generate relevant, high-quality learning goal suggestions.
    6. The suggestions are displayed to the student, who can then copy, edit, and incorporate them into the main goals editor.
- **Error Handling:**
    - AI call fails: Show a user-friendly error message.
    - Saving fails: Inform the user and allow them to retry.

### 3.7 Admin: User, Team & Course Management

- **User Story:** As an admin, I can manage users, teams, and courses to set up the learning environment.
- **Implementation Steps:**
    1. Navigate to `/admin/dashboard`.
    2. **User Management:**
        - Display all users in a data table with columns for name, email, and role
        - "Invite User" button sends invite link to new user.
        - "Edit" action allows changing user roles only (not names/emails)
        - "Delete" action removes users with confirmation dialog
    3. **Team Management:**
        - Display all teams with columns for team name, course, and member count
        - "Create Team" button opens modal form (team name, assign to course)
        - Click team to manage members (add/remove users from team)
        - "Delete" action removes teams with confirmation dialog
    4. **Course Management:**
        - Display all courses in simple list/table format
        - "Create Course" button opens modal form (course name)
        - "Edit" action allows changing course names
        - "Delete" action removes courses with confirmation dialog
- **Error Handling:**
    - Form validation on client and server
    - Confirmation dialogs before destructive actions
    - Email validation for new users

---

## 4. Database Schema

The database will be managed via SQL scripts. RLS policies will be used for authorization.

### 4.1 Schema Modifications

**`projects` table:**
```sql
ALTER TABLE public.projects ADD COLUMN learning_goals TEXT;
```

### 4.2 Tables

SQL

```
-- User roles ENUM
CREATE TYPE user_role AS ENUM ('student', 'educator', 'admin');

-- Project phase ENUM
CREATE TYPE project_phase AS ENUM ('pre', 'research', 'post', 'closed');

-- Assessment status ENUM
CREATE TYPE assessment_status AS ENUM ('pending_review', 'final');

-- Notification type ENUM
CREATE TYPE notification_type AS ENUM ('mention_in_comment');

-- Users table, managed by Supabase Auth
-- The public.users table is a simplified view of auth.users
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role user_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courses to group teams and problems
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Course creator/admin
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teams of students
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Join table for users and teams (many-to-many)
CREATE TABLE teams_users (
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, user_id)
);

-- Problem definitions created by educators
CREATE TABLE problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT, -- Markdown content
    creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- The educator who created it
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects are instances of a Problem assigned to a Team
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    phase project_phase NOT NULL DEFAULT 'pre',
    learning_goals TEXT, -- Student-defined learning goals
    problem_statement_url TEXT, -- Link to Google Doc or similar
    final_report_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_projects_team_id ON projects(team_id);

-- Rubrics associated with a problem
CREATE TABLE rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE UNIQUE,
    name TEXT NOT NULL
);

-- Individual criteria within a rubric
CREATE TABLE rubric_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
    criterion_text TEXT NOT NULL,
    max_score INT NOT NULL DEFAULT 5,
    sort_order INT NOT NULL DEFAULT 0
);

-- Artifacts are resources collected by students for a project
CREATE TABLE artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT, -- URL to Supabase storage object or external link
    type TEXT NOT NULL, -- 'doc', 'image', 'video', 'link'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_project_id ON artifacts(project_id);

-- Comments on artifacts
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications for mentions and other events
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    reference_id UUID NOT NULL, -- The comment ID
    reference_url TEXT, -- A deep link to the comment
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_recipient_id ON public.notifications(recipient_id);


-- Log of AI interactions
CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL, -- e.g., 'tutor', 'assessment', 'suggest_goals'
    prompt JSONB,
    response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assessments of a project's final report
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assessor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status assessment_status NOT NULL DEFAULT 'pending_review',
    overall_feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual scores for each rubric criterion in an assessment
CREATE TABLE assessment_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL REFERENCES rubric_criteria(id) ON DELETE CASCADE,
    score NUMERIC(3, 1) NOT NULL,
    justification TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT TRUE
);
```

---

## 5. Server Actions

Server actions will be the primary mechanism for client components to mutate data. They will be co-located in `lib/actions/`. API Routes will be reserved for more complex operations, especially those involving external services like the Gemini API.

### 5.1 Database Actions (`lib/actions/*.ts`)

#### Core Project Actions
- **`createProject(problemId, teamId)`**: Creates a new project instance. Returns the new project's ID.
- **`updateProjectPhase(projectId, newPhase)`**: Updates a project's phase. Performs authorization checks.
- **`updateProjectReportUrl(projectId, url)`**: Sets the final report URL.
- **`updateProjectReportContent(projectId, url, content)`**: Sets both the final report URL and caches the plain text content.
- **`saveAssessment(data)`**: Creates records in the `assessments` and `assessment_scores` tables based on the educator's manual input.
- **`updateProjectLearningGoals(projectId, goals)`**: Saves the student-defined learning goals to the project.

#### Artifact & Comment Actions
- **`createArtifact(data)`**: Creates a new artifact record. Input: `{ projectId, uploaderId, title, url, type }`.
- **`deleteArtifact(artifactId)`**: Deletes an artifact. Checks if the user is the owner or an educator.
- **`createComment(data)`**: Creates a new comment. Input: `{ artifactId, authorId, body, mentionedUserIds? }`. After saving, validates mentioned user IDs and creates notification records.
- **`getProjectMentionableUsers(projectId)`**: Returns team members and course educators available for mention in the given project.

#### Problem & Notification Actions  
- **`createProblem(data)`**: A transactional server action to create a problem and its associated rubric/criteria.
- **`getNotifications(userId)`**: Fetches all notifications for the given user, typically filtered for unread.
- **`markNotificationAsRead(notificationId)`**: Marks a specific notification as read.

#### Admin Management Actions
- **`createUser(data)`**: Creates a new user account. Input: `{ name, email, role, password }`. Admin-only access.
- **`updateUserRole(userId, newRole)`**: Updates a user's role. Input validation and admin authorization required.
- **`deleteUser(userId)`**: Removes a user from the system. Cascading deletes handled by database constraints.
- **`createTeam(data)`**: Creates a new team. Input: `{ name, courseId }`. Admin-only access.
- **`updateTeamMembers(teamId, userIds)`**: Manages team membership by adding/removing users. Input: array of user IDs.
- **`deleteTeam(teamId)`**: Removes a team. Admin authorization and cascade handling required.
- **`createCourse(data)`**: Creates a new course. Input: `{ name }`. Admin-only access.
- **`updateCourse(courseId, data)`**: Updates course information. Input: `{ name }`. Admin-only access.
- **`deleteCourse(courseId)`**: Removes a course. Admin authorization and cascade handling required.
    

### 5.2 API Routes (`app/api/**/*`)

- **`POST /api/ai/tutor`**
    
    - **Purpose:** Handles a message to the AI PBL Tutor.
        
    - **Request Body:** `{ "projectId": "uuid", "message": "string" }`
        
    - **Process:**
        
        1. Authenticate user and verify they are part of the project.
            
        2. **Fetch the full conversation history for the `projectId` from `ai_usage` where the `feature` is 'tutor'.**
            
        3. Construct a prompt including the fetched history and a system message for Socratic guidance.
            
        4. Call Gemini API.
            
        5. Log the user's prompt and the AI's response in `ai_usage`.
            
        6. Return the AI's response message.
            
    - **Response Body:** `{ "reply": "string" }`
        
- **`POST /api/ai/suggest-goals`**
    
    - **Purpose:** Provides AI-powered suggestions for learning goals.
        
    - **Request Body:** `{ "projectId": "uuid" }`
        
    - **Process:**
        
        1. Authenticate user and verify they are part of the project.
            
        2. Fetch the associated problem's title and description from the database to use as context.
            
        3. Construct a prompt asking the AI to generate 3-5 high-quality learning goals based on the problem context.
            
        4. Call Gemini API.
            
        5. Log the interaction in `ai_usage`.
            
        6. Return the suggested goals as an array of strings.
            
    - **Response Body:** `{ "suggestions": ["string", "string", ...] }`
    

---

## 6. Google Drive Integration

PBLab will simplify Google Drive integration for the MVP. Instead of complex backend API interactions, the application will focus on direct URL submission and client-side preview.

### 6.1 MVP Integration Strategy

-   **URL Storage Only**: The application will only store the Google Drive URL provided by the student in the `projects.final_report_url` field.
    
-   **Client-side Preview**: To display a preview of the submitted document, the frontend will transform the stored Google Drive URL (e.g., replacing `/edit` with `/preview` or `/view` with `/embed`) and render it within an `<iframe>` HTML element. This leverages Google Drive's native embedding capabilities.
    
-   **No Backend API Integration**: For the MVP, there will be no backend API calls to Google Drive for content export, permission management, or picker integration. All file access and content viewing will rely on the end-user's browser directly accessing the Google Drive URL, subject to Google's own sharing permissions.

### 6.2 User Experience

-   **Sharing Recommendation**: A prominent tip will be displayed to students during submission, advising them to set their document to "Anyone with the link can view" to ensure educators and teammates can easily access it without permission issues.

---

## 7. Design System

### 7.1 Visual Style

- **Logo:** A new component, `<PBLabLogo />`, will be created. It will feature a simple, modern icon (e.g., a stylized lightbulb inside a chat bubble) next to the text "PBLab".
    
- **Color Palette:** The existing `shadcn/ui` theme variables in `globals.css` will be used. The primary color will be a professional and encouraging blue or green.
    
    - `--primary: 210 40% 50%` (A medium blue)
        
    - `--secondary: 210 40% 90%` (A light blue)
        
- **Typography:** The existing `Geist` font from the starter template will be used for all text, maintaining a clean and modern look.
    
- **Spacing:** A consistent 8px grid will be used for spacing and layout (`1` = 8px, `2` = 16px, etc.), managed via Tailwind's spacing scale.
    

### 7.2 Core Components

- **Layout:** The main authenticated app will use a two-column layout: a fixed `<Sidebar />` on the left for navigation and a main content area on the right, topped by a `<Header />`.
    
- **Navigation:**
    
    - The `<Sidebar />` will contain links to the user's Dashboard, Problems (for educators), and Settings.
        
    - The `<Header />` will show the current page title and a user dropdown menu (with links to profile, settings, and logout).
        
- **Shared Components (`components/pblab/`):**
    
    - `<PBLabLogo />`: Renders the application logo.
        
    - `<PageHeader />`: A standardized header for pages, e.g., `<h1>{title}</h1><p>{description}</p>`.
        
    - `<DataTable />`: A reusable table component built on shadcn/ui's Table, with support for sorting, filtering, and pagination.
        
- **Interactive States:** All interactive elements (buttons, inputs, links) will have clear `:hover`, `:focus`, `:active`, and `:disabled` states as defined by `shadcn/ui` and our theme.
    

---

## 8. Component Architecture

### 8.1 Server Components

- **`EducatorDashboard` (`app/educator/dashboard/page.tsx`):**
    
    - **Data Fetching:** Fetches all projects for the courses the educator manages directly using the server-side Supabase client.
        
    - **Suspense:** Wraps the main project list/kanban in `<Suspense>` with a loading skeleton.
        
    - **Props:** Takes no props, as it's a top-level page component.
        
- **`ProjectView` (`app/p/[projectId]/page.tsx`):**
    
    - **Data Fetching:** Fetches all data for a single project: details, artifacts, comments, team members, rubric.
        
    - **Error Handling:** If the project is not found or the user lacks access (checked via RLS), it will use `notFound()` from `next/navigation`.
        
    - **Props:** `interface Props { params: { projectId: string } }`
        

### 8.2 Client Components

- **`AiTutorChat` (`components/pblab/ai/ai-tutor-chat.tsx`):**
    
    - **State Management:** Uses `useState` to manage the input message and conversation history.
        
    - **Data Fetching:** On initial load, fetches the full, shared conversation history for the current project.
        
    - **Event Handlers:** `handleSendMessage()` calls the `/api/ai/tutor` endpoint and appends the new message and reply to the local state.
        
    - **Props:** `interface Props { projectId: string; initialHistory: Message[]; }`
        
- **`LearningGoalEditor` (`components/pblab/project/learning-goal-editor.tsx`):**
    
    - **State Management:** Uses `useState` to manage the learning goals text and AI-suggested goals.
        
    - **Event Handlers:**
        
        - `handleSave()`: Calls the `updateProjectLearningGoals` server action.
            
        - `handleGetSuggestions()`: Calls the `/api/ai/suggest-goals` endpoint and updates state with suggestions.
            
    - **Props:** `interface Props { projectId: string; initialGoals: string | null; }`
        
- **`NotificationsIndicator` (`components/pblab/notifications/notifications-indicator.tsx`):**
    
    - **State Management:** Manages the visibility of the notification panel and the list of notifications.
        
    - **Data Fetching:** Fetches the count of unread notifications on load and potentially polls for updates.
        
    - **Event Handlers:** `handleMarkAsRead()` calls the `markNotificationAsRead` server action when a notification is clicked.
        
    - **Props:** `interface Props { initialNotifications: Notification[]; }`
        
- **`RubricEditor` (`components/pblab/educator/rubric-editor.tsx`):**
    
    - **State Management:** Uses `useState` to manage the scores and justifications entered by the educator.
        
    - **Event Handlers:**
        
        - `handleSave()`: Calls a server action (`saveAssessment`) to save the manual feedback and then calls another action (`updateProjectPhase`) to lock the project.
            
    - **Props:** `interface Props { projectId: string; initialAssessment: Assessment | null; isTemplateMode: boolean; }`
        
- **`ArtifactUploader` (`components/pblab/project/artifact-uploader.tsx`):**
    
    - **State Management:** Manages modal visibility, file selection, and upload progress.
        
    - **Event Handlers:**
        
        - `handleUpload()`: Manages the two-step file upload process (get signed URL, then upload). Calls the `createArtifact` server action on completion.
            
        - `handleLink()`: Calls the `createArtifact` server action with URL data.
            
    - **Props:** `interface Props { projectId: string; }`
        

---

## 9. Authentication & Authorization

- **Implementation Strategy:** For this competition MVP, the primary authentication method for accessing the pre-populated demonstration environment is **Email & Password**. This choice directly facilitates testing for developers and evaluation for judges by bypassing the need for real email inboxes associated with the fictional, seeded users.

- **Seeded Test Accounts:** The database seeding script (`scripts/seed.ts`) creates a comprehensive set of test users (student, educator, admin), each with a pre-defined password. These credentials will be documented in the project's `README.md` file for easy access.

- **Invite Link & New User Signup:** The underlying Supabase Auth capability for new user signups (e.g., via magic link or with password creation) remains functional to support the "Student Join via Invite Link" user story. Judges will be guided through this specific flow via instructions in the `README.md`.

- **Protected Routes:** The `middleware.ts` file protects all authenticated routes. A redirect in the main dashboard (`/dashboard/page.tsx`) routes users to their role-specific view (`/student/dashboard` or `/educator/dashboard`).

- **Authorization (RLS Policies):** Row Level Security (RLS) policies remain the core mechanism for authorization, ensuring users can only access data relevant to their role and team membership.
 
    
    SQL
    
    ```
    -- Enable RLS for all relevant tables
  ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
  ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
  ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  
  -- Helper function to get user role
  CREATE OR REPLACE FUNCTION get_my_role()
  RETURNS TEXT AS $$
  BEGIN
    RETURN (SELECT role::text FROM public.users WHERE id = auth.uid());
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  
  -- Policy: Users can see projects they are a member of.
  CREATE POLICY "Allow team members to view their projects"
  ON projects FOR SELECT
  USING (team_id IN (SELECT team_id FROM teams_users WHERE user_id = auth.uid()));
  
  -- Policy: Educators can see all projects in their courses.
  CREATE POLICY "Allow educators to view course projects"
  ON projects FOR SELECT
  USING (
    get_my_role() = 'educator' AND
    problem_id IN (SELECT id FROM problems WHERE course_id IN (SELECT course_id FROM teams WHERE id = projects.team_id))
  );
  
  -- Policy: Users can only insert/update artifacts for their own projects.
  CREATE POLICY "Allow team members to manage artifacts"
  ON artifacts FOR ALL
  USING (project_id IN (SELECT id FROM projects)); -- The SELECT policy on projects will cascade down.
  
  -- Policy: Users can only see their own notifications.
  CREATE POLICY "Allow users to see their own notifications"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());
  
  -- Policy: Users can only mark their own notifications as read.
  CREATE POLICY "Allow users to update their own notifications"
  ON notifications FOR UPDATE
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
    ```
    

---

## 10. Data Flow

- **Server to Client:** Server Components will fetch the initial data required for a page render. This data will be passed down as props to any necessary Client Components. This minimizes client-side data fetching and reduces waterfalls.
    
- **Client to Server (Mutations):** All data mutations (creating, updating, deleting) will be handled by Server Actions. Client components will invoke these actions via simple function calls.
    
- **State Management & UI Updates:**
    
    - For local, transient UI state (e.g., form inputs, modal visibility), React's `useState` and `useReducer` will be used within Client Components.
        
    - After a Server Action successfully completes a mutation, it will call `revalidatePath()` or `revalidateTag()` to invalidate the Next.js cache. This triggers a re-fetch of data for the affected Server Components and seamlessly updates the UI without requiring a full page reload or complex client-side state management library.
        

---
## 11. Testing

### Manual Testing & Judge Walkthrough

A primary goal of the testing strategy is to provide a frictionless evaluation experience for competition judges. This is achieved through:

- **Password-Based Test Accounts:** A full suite of pre-seeded accounts (admin, educator, students for each team) is provided with a single, shared password.
- **`README.md` as a Guide:** The root `README.md` file serves as the central guide for judges. It contains the credentials for all test accounts and a specific, step-by-step walkthrough for testing the student invite-link feature. This ensures all MVP requirements can be manually verified on the live, deployed application.

- **Unit Tests (Jest):**
    
    - **Target:** Server Actions, utility functions, complex data transformations.
        
    - **Example (`/lib/actions/projects.ts`):**
        
        - Test `updateProjectPhase`: Mock the Supabase client and `auth.uid()`. Call the action with a valid `projectId` and `phase`. Assert that `supabase.from('projects').update()` was called with the correct parameters.
            
        - Test that it throws an error if a user with the 'student' role tries to set the phase to 'closed'.
            
- **End-to-End (E2E) Tests (Playwright or Cypress):**
    
    - **Target:** Critical user flows from the PRD.
        
    - **Flow T-01 (Team Join):**
        
        1. `test.beforeEach()`: Programmatically create an educator, a course, a team, and generate an invite link via the database.
            
        2. Test logs in as a new student user.
            
        3. Test navigates to the generated invite link.
            
        4. Test clicks the "Join Team" button.
            
        5. Assert that the user is redirected to `/student/dashboard`.
            
        6. Assert that the project associated with the team is visible on the dashboard.
            
    - **Flow T-04 (Educator Locks Project):**
        
        1. `test.beforeEach()`: Create an educator, student, team, and project set to `phase: 'post'`.
            
        2. Test logs in as the educator.
            
        3. Test navigates to the project page `/p/[projectId]`.
            
        4. Test interacts with the `<RubricEditor />` to enter scores and comments for each criterion.
            
        5. Test clicks "Save & Finalize".
            
        6. Assert that the project `phase` is now 'closed' in the database.
            
        7. Log in as the student and navigate to the project page. Assert that all input fields (for artifacts, comments, etc.) are disabled.