-- =====================================================
-- PBLab Row Level Security (RLS) Policies Migration
-- =====================================================
-- Purpose: Create comprehensive RLS policies for all tables to enforce proper authorization
-- Affected: All 12 tables with RLS enabled, helper function, comprehensive policy set
-- Security model: Role-based access (student/educator/admin) with team/course boundaries
-- Performance: Optimized with SELECT subqueries and proper policy targeting
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Helper function to get the current user's role efficiently
-- Used throughout RLS policies to determine access level
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role::text FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PUBLIC.USERS TABLE POLICIES
-- =====================================================

-- Users can view all user profiles (needed for team collaboration)
CREATE POLICY "Users can view all profiles"
ON public.users FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

-- =====================================================
-- COURSES TABLE POLICIES
-- =====================================================

-- Educators can view courses they administer
CREATE POLICY "Educators can view their courses"
ON courses FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND 
  admin_id = (SELECT auth.uid())
);

-- Students can view courses for teams they belong to
CREATE POLICY "Students can view courses for their teams"
ON courses FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'student' AND
  id IN (
    SELECT course_id 
    FROM teams t
    JOIN teams_users tu ON t.id = tu.team_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

-- Educators can create courses
CREATE POLICY "Educators can create courses"
ON courses FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT get_my_role()) = 'educator' AND
  admin_id = (SELECT auth.uid())
);

-- Educators can update their own courses
CREATE POLICY "Educators can update their courses"
ON courses FOR UPDATE
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND 
  admin_id = (SELECT auth.uid())
)
WITH CHECK (
  (SELECT get_my_role()) = 'educator' AND 
  admin_id = (SELECT auth.uid())
);

-- =====================================================
-- TEAMS TABLE POLICIES
-- =====================================================

-- Team members can view their teams
CREATE POLICY "Team members can view their teams"
ON teams FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT team_id 
    FROM teams_users 
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Educators can view teams in their courses
CREATE POLICY "Educators can view teams in their courses"
ON teams FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  course_id IN (
    SELECT id 
    FROM courses 
    WHERE admin_id = (SELECT auth.uid())
  )
);

-- Educators can create teams in their courses
CREATE POLICY "Educators can create teams"
ON teams FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT get_my_role()) = 'educator' AND
  course_id IN (
    SELECT id 
    FROM courses 
    WHERE admin_id = (SELECT auth.uid())
  )
);

-- Educators can update teams in their courses
CREATE POLICY "Educators can update teams"
ON teams FOR UPDATE
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  course_id IN (
    SELECT id 
    FROM courses 
    WHERE admin_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (SELECT get_my_role()) = 'educator' AND
  course_id IN (
    SELECT id 
    FROM courses 
    WHERE admin_id = (SELECT auth.uid())
  )
);

-- =====================================================
-- TEAMS_USERS TABLE POLICIES
-- =====================================================

-- Team members can view team membership
CREATE POLICY "Team members can view team membership"
ON teams_users FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id 
    FROM teams_users 
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Educators can view team membership for their courses
CREATE POLICY "Educators can view team membership"
ON teams_users FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  team_id IN (
    SELECT t.id 
    FROM teams t
    JOIN courses c ON t.course_id = c.id
    WHERE c.admin_id = (SELECT auth.uid())
  )
);

-- Students can join teams (via invite links)
CREATE POLICY "Students can join teams"
ON teams_users FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT get_my_role()) = 'student' AND
  user_id = (SELECT auth.uid())
);

-- Educators can manage team membership
CREATE POLICY "Educators can manage team membership"
ON teams_users FOR ALL
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  team_id IN (
    SELECT t.id 
    FROM teams t
    JOIN courses c ON t.course_id = c.id
    WHERE c.admin_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (SELECT get_my_role()) = 'educator' AND
  team_id IN (
    SELECT t.id 
    FROM teams t
    JOIN courses c ON t.course_id = c.id
    WHERE c.admin_id = (SELECT auth.uid())
  )
);

-- =====================================================
-- PROBLEMS TABLE POLICIES
-- =====================================================

-- Educators can view problems in their courses
CREATE POLICY "Educators can view their problems"
ON problems FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  course_id IN (
    SELECT id 
    FROM courses 
    WHERE admin_id = (SELECT auth.uid())
  )
);

-- Students can view problems for their teams
CREATE POLICY "Students can view problems for their teams"
ON problems FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'student' AND
  course_id IN (
    SELECT t.course_id 
    FROM teams t
    JOIN teams_users tu ON t.id = tu.team_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

-- Educators can create problems in their courses
CREATE POLICY "Educators can create problems"
ON problems FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT get_my_role()) = 'educator' AND
  creator_id = (SELECT auth.uid()) AND
  course_id IN (
    SELECT id 
    FROM courses 
    WHERE admin_id = (SELECT auth.uid())
  )
);

-- Educators can update their problems
CREATE POLICY "Educators can update their problems"
ON problems FOR UPDATE
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  creator_id = (SELECT auth.uid())
)
WITH CHECK (
  (SELECT get_my_role()) = 'educator' AND
  creator_id = (SELECT auth.uid())
);

-- =====================================================
-- PROJECTS TABLE POLICIES
-- =====================================================

-- Team members can view their projects
CREATE POLICY "Team members can view their projects"
ON projects FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id 
    FROM teams_users 
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Educators can view all projects in their courses
CREATE POLICY "Educators can view course projects"
ON projects FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  problem_id IN (
    SELECT id 
    FROM problems 
    WHERE course_id IN (
      SELECT id 
      FROM courses 
      WHERE admin_id = (SELECT auth.uid())
    )
  )
);

-- Educators can create projects
CREATE POLICY "Educators can create projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT get_my_role()) = 'educator' AND
  problem_id IN (
    SELECT id 
    FROM problems 
    WHERE course_id IN (
      SELECT id 
      FROM courses 
      WHERE admin_id = (SELECT auth.uid())
    )
  )
);

-- Team members can update their projects (phase, URLs, etc.)
CREATE POLICY "Team members can update their projects"
ON projects FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT team_id 
    FROM teams_users 
    WHERE user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  team_id IN (
    SELECT team_id 
    FROM teams_users 
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Educators can update projects in their courses
CREATE POLICY "Educators can update course projects"
ON projects FOR UPDATE
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  problem_id IN (
    SELECT id 
    FROM problems 
    WHERE course_id IN (
      SELECT id 
      FROM courses 
      WHERE admin_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  (SELECT get_my_role()) = 'educator' AND
  problem_id IN (
    SELECT id 
    FROM problems 
    WHERE course_id IN (
      SELECT id 
      FROM courses 
      WHERE admin_id = (SELECT auth.uid())
    )
  )
);

-- =====================================================
-- RUBRICS TABLE POLICIES
-- =====================================================

-- Educators can view rubrics for their problems
CREATE POLICY "Educators can view their rubrics"
ON rubrics FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  problem_id IN (
    SELECT id 
    FROM problems 
    WHERE creator_id = (SELECT auth.uid())
  )
);

-- Students can view rubrics for their team's problems
CREATE POLICY "Students can view rubrics for their problems"
ON rubrics FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'student' AND
  problem_id IN (
    SELECT p.id 
    FROM problems p
    JOIN projects pr ON p.id = pr.problem_id
    JOIN teams_users tu ON pr.team_id = tu.team_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

-- Educators can create rubrics for their problems
CREATE POLICY "Educators can create rubrics"
ON rubrics FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT get_my_role()) = 'educator' AND
  problem_id IN (
    SELECT id 
    FROM problems 
    WHERE creator_id = (SELECT auth.uid())
  )
);

-- Educators can update their rubrics
CREATE POLICY "Educators can update their rubrics"
ON rubrics FOR UPDATE
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  problem_id IN (
    SELECT id 
    FROM problems 
    WHERE creator_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (SELECT get_my_role()) = 'educator' AND
  problem_id IN (
    SELECT id 
    FROM problems 
    WHERE creator_id = (SELECT auth.uid())
  )
);

-- =====================================================
-- RUBRIC_CRITERIA TABLE POLICIES
-- =====================================================

-- Follow same pattern as rubrics - access via rubric ownership
CREATE POLICY "Educators can view their rubric criteria"
ON rubric_criteria FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  rubric_id IN (
    SELECT r.id 
    FROM rubrics r
    JOIN problems p ON r.problem_id = p.id
    WHERE p.creator_id = (SELECT auth.uid())
  )
);

-- Students can view rubric criteria for their problems
CREATE POLICY "Students can view rubric criteria for their problems"
ON rubric_criteria FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'student' AND
  rubric_id IN (
    SELECT r.id 
    FROM rubrics r
    JOIN problems p ON r.problem_id = p.id
    JOIN projects pr ON p.id = pr.problem_id
    JOIN teams_users tu ON pr.team_id = tu.team_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

-- Educators can manage rubric criteria for their rubrics
CREATE POLICY "Educators can manage their rubric criteria"
ON rubric_criteria FOR ALL
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  rubric_id IN (
    SELECT r.id 
    FROM rubrics r
    JOIN problems p ON r.problem_id = p.id
    WHERE p.creator_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (SELECT get_my_role()) = 'educator' AND
  rubric_id IN (
    SELECT r.id 
    FROM rubrics r
    JOIN problems p ON r.problem_id = p.id
    WHERE p.creator_id = (SELECT auth.uid())
  )
);

-- =====================================================
-- ARTIFACTS TABLE POLICIES
-- =====================================================

-- Team members can view artifacts for their projects
CREATE POLICY "Team members can view project artifacts"
ON artifacts FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT pr.id 
    FROM projects pr
    JOIN teams_users tu ON pr.team_id = tu.team_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

-- Educators can view artifacts for their course projects
CREATE POLICY "Educators can view course artifacts"
ON artifacts FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  project_id IN (
    SELECT pr.id 
    FROM projects pr
    JOIN problems p ON pr.problem_id = p.id
    JOIN courses c ON p.course_id = c.id
    WHERE c.admin_id = (SELECT auth.uid())
  )
);

-- Team members can create artifacts for their projects
CREATE POLICY "Team members can create project artifacts"
ON artifacts FOR INSERT
TO authenticated
WITH CHECK (
  uploader_id = (SELECT auth.uid()) AND
  project_id IN (
    SELECT pr.id 
    FROM projects pr
    JOIN teams_users tu ON pr.team_id = tu.team_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

-- Users can update/delete their own artifacts
CREATE POLICY "Users can manage their own artifacts"
ON artifacts FOR UPDATE
TO authenticated
USING (uploader_id = (SELECT auth.uid()))
WITH CHECK (uploader_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own artifacts"
ON artifacts FOR DELETE
TO authenticated
USING (uploader_id = (SELECT auth.uid()));

-- =====================================================
-- COMMENTS TABLE POLICIES
-- =====================================================

-- Team members can view comments on their project artifacts
CREATE POLICY "Team members can view project comments"
ON comments FOR SELECT
TO authenticated
USING (
  artifact_id IN (
    SELECT a.id 
    FROM artifacts a
    JOIN projects pr ON a.project_id = pr.id
    JOIN teams_users tu ON pr.team_id = tu.team_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

-- Educators can view comments for their course projects
CREATE POLICY "Educators can view course comments"
ON comments FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  artifact_id IN (
    SELECT a.id 
    FROM artifacts a
    JOIN projects pr ON a.project_id = pr.id
    JOIN problems p ON pr.problem_id = p.id
    JOIN courses c ON p.course_id = c.id
    WHERE c.admin_id = (SELECT auth.uid())
  )
);

-- Team members can create comments on their project artifacts
CREATE POLICY "Team members can create project comments"
ON comments FOR INSERT
TO authenticated
WITH CHECK (
  author_id = (SELECT auth.uid()) AND
  artifact_id IN (
    SELECT a.id 
    FROM artifacts a
    JOIN projects pr ON a.project_id = pr.id
    JOIN teams_users tu ON pr.team_id = tu.team_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

-- Users can update/delete their own comments
CREATE POLICY "Users can manage their own comments"
ON comments FOR UPDATE
TO authenticated
USING (author_id = (SELECT auth.uid()))
WITH CHECK (author_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own comments"
ON comments FOR DELETE
TO authenticated
USING (author_id = (SELECT auth.uid()));

-- =====================================================
-- AI_USAGE TABLE POLICIES
-- =====================================================

-- Users can view their own AI usage
CREATE POLICY "Users can view their own AI usage"
ON ai_usage FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Educators can view AI usage for their course projects
CREATE POLICY "Educators can view course AI usage"
ON ai_usage FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  project_id IN (
    SELECT pr.id 
    FROM projects pr
    JOIN problems p ON pr.problem_id = p.id
    JOIN courses c ON p.course_id = c.id
    WHERE c.admin_id = (SELECT auth.uid())
  )
);

-- Users can create AI usage records for themselves
CREATE POLICY "Users can create their own AI usage records"
ON ai_usage FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- =====================================================
-- ASSESSMENTS TABLE POLICIES
-- =====================================================

-- Educators can view assessments for their courses
CREATE POLICY "Educators can view course assessments"
ON assessments FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  project_id IN (
    SELECT pr.id 
    FROM projects pr
    JOIN problems p ON pr.problem_id = p.id
    JOIN courses c ON p.course_id = c.id
    WHERE c.admin_id = (SELECT auth.uid())
  )
);

-- Team members can view final assessments for their projects
CREATE POLICY "Team members can view their final assessments"
ON assessments FOR SELECT
TO authenticated
USING (
  status = 'final' AND
  project_id IN (
    SELECT pr.id 
    FROM projects pr
    JOIN teams_users tu ON pr.team_id = tu.team_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

-- Educators can create assessments for their course projects
CREATE POLICY "Educators can create course assessments"
ON assessments FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT get_my_role()) = 'educator' AND
  assessor_id = (SELECT auth.uid()) AND
  project_id IN (
    SELECT pr.id 
    FROM projects pr
    JOIN problems p ON pr.problem_id = p.id
    JOIN courses c ON p.course_id = c.id
    WHERE c.admin_id = (SELECT auth.uid())
  )
);

-- Educators can update their assessments
CREATE POLICY "Educators can update their assessments"
ON assessments FOR UPDATE
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  assessor_id = (SELECT auth.uid())
)
WITH CHECK (
  (SELECT get_my_role()) = 'educator' AND
  assessor_id = (SELECT auth.uid())
);

-- =====================================================
-- ASSESSMENT_SCORES TABLE POLICIES
-- =====================================================

-- Educators can view assessment scores for their assessments
CREATE POLICY "Educators can view their assessment scores"
ON assessment_scores FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'educator' AND
  assessment_id IN (
    SELECT id 
    FROM assessments 
    WHERE assessor_id = (SELECT auth.uid())
  )
);

-- Team members can view final assessment scores for their projects
CREATE POLICY "Team members can view their final assessment scores"
ON assessment_scores FOR SELECT
TO authenticated
USING (
  assessment_id IN (
    SELECT a.id 
    FROM assessments a
    JOIN projects pr ON a.project_id = pr.id
    JOIN teams_users tu ON pr.team_id = tu.team_id
    WHERE tu.user_id = (SELECT auth.uid()) AND a.status = 'final'
  )
);

-- Educators can create assessment scores for their assessments
CREATE POLICY "Educators can create assessment scores"
ON assessment_scores FOR INSERT
TO authenticated
WITH CHECK (
  assessment_id IN (
    SELECT id 
    FROM assessments 
    WHERE assessor_id = (SELECT auth.uid())
  )
);

-- Educators can update assessment scores for their assessments
CREATE POLICY "Educators can update assessment scores"
ON assessment_scores FOR UPDATE
TO authenticated
USING (
  assessment_id IN (
    SELECT id 
    FROM assessments 
    WHERE assessor_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  assessment_id IN (
    SELECT id 
    FROM assessments 
    WHERE assessor_id = (SELECT auth.uid())
  )
);

-- Educators can delete assessment scores for their assessments
CREATE POLICY "Educators can delete assessment scores"
ON assessment_scores FOR DELETE
TO authenticated
USING (
  assessment_id IN (
    SELECT id 
    FROM assessments 
    WHERE assessor_id = (SELECT auth.uid())
  )
);

-- =====================================================
-- PERFORMANCE INDEXES FOR RLS POLICIES
-- =====================================================

-- Index for user role lookups (heavily used by get_my_role)
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Index for course admin lookups
CREATE INDEX IF NOT EXISTS idx_courses_admin_id ON courses(admin_id);

-- Index for problem creator lookups
CREATE INDEX IF NOT EXISTS idx_problems_creator_id ON problems(creator_id);

-- Index for artifact uploader lookups
CREATE INDEX IF NOT EXISTS idx_artifacts_uploader_id ON artifacts(uploader_id);

-- Index for comment author lookups
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);

-- Index for AI usage user lookups
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage(user_id);

-- Index for assessment assessor lookups
CREATE INDEX IF NOT EXISTS idx_assessments_assessor_id ON assessments(assessor_id);

-- Index for assessment status lookups (for final grade visibility)
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);

-- =====================================================
-- END OF RLS POLICIES MIGRATION
-- ===================================================== 