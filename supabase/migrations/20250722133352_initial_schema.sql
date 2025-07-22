-- =====================================================
-- PBLab Initial Database Schema Migration
-- =====================================================
-- Purpose: Create all required tables, types, and indexes for PBLab
-- Tables: users, courses, teams, teams_users, problems, projects, rubrics, 
--         rubric_criteria, artifacts, comments, ai_usage, assessments, assessment_scores
-- Affected: Creates 11 tables, 3 ENUMs, 2 indexes
-- Special considerations: Enables RLS on all tables, maintains foreign key order
-- =====================================================

-- Create custom types (ENUMs)
-- User roles for RBAC system
CREATE TYPE user_role AS ENUM ('student', 'educator', 'admin');

-- Project workflow phases for PBL methodology
CREATE TYPE project_phase AS ENUM ('pre', 'research', 'post', 'closed');

-- Assessment workflow status for AI-assisted grading
CREATE TYPE assessment_status AS ENUM ('pending_review', 'final');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table - extends Supabase auth.users with application-specific data
-- Links to auth.users for authentication, stores role and profile info
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role user_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courses - organizational container for problems and teams
-- Managed by educator with admin_id as course creator/owner
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Course creator/admin
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teams - groups of students working together on problems
-- Each team belongs to a course and works on project instances
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teams-Users junction table - many-to-many relationship
-- Students can be in multiple teams, teams have multiple students
CREATE TABLE teams_users (
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, user_id)
);

-- Problems - PBL problem definitions created by educators
-- Contains problem description (markdown) and associates with rubrics
CREATE TABLE problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT, -- Markdown content for problem statement
    creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- The educator who created it
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects - instances of problems assigned to teams
-- Tracks PBL workflow phases and stores final deliverables
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    phase project_phase NOT NULL DEFAULT 'pre',
    problem_statement_url TEXT, -- Link to Google Doc or similar
    final_report_url TEXT,
    final_report_content TEXT, -- Cached plain text content from Google Drive
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rubrics - assessment criteria associated with problems
-- Each problem has one rubric with multiple criteria
CREATE TABLE rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE UNIQUE,
    name TEXT NOT NULL
);

-- Rubric Criteria - individual assessment dimensions within rubrics
-- Defines scoring criteria with max_score and ordering
CREATE TABLE rubric_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
    criterion_text TEXT NOT NULL,
    max_score INT NOT NULL DEFAULT 5,
    sort_order INT NOT NULL DEFAULT 0
);

-- Artifacts - resources collected by students during research phase
-- Can be files (Supabase storage) or external links
CREATE TABLE artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT, -- URL to Supabase storage object or external link
    type TEXT NOT NULL, -- 'doc', 'image', 'video', 'link'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments - discussions on artifacts between team members
-- Supports @mentions and threaded conversations
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Usage - log of all AI interactions for analytics and billing
-- Tracks prompts and responses for tutor and assessment features
CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL, -- e.g., 'tutor', 'assessment'
    prompt JSONB,
    response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assessments - AI-assisted grading of project final reports
-- Tracks assessment workflow status and overall feedback
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assessor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status assessment_status NOT NULL DEFAULT 'pending_review',
    overall_feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assessment Scores - individual scores for each rubric criterion
-- Links assessments to specific rubric criteria with scores and justifications
CREATE TABLE assessment_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL REFERENCES rubric_criteria(id) ON DELETE CASCADE,
    score NUMERIC(3, 1) NOT NULL,
    justification TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT TRUE
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Index for frequent team-based project queries
CREATE INDEX idx_projects_team_id ON projects(team_id);

-- Index for artifact queries within projects
CREATE INDEX idx_artifacts_project_id ON artifacts(project_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================
-- Enable RLS on all tables to ensure proper authorization
-- Actual policies will be defined in the next migration (0002_rls_policies.sql)

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_scores ENABLE ROW LEVEL SECURITY; 