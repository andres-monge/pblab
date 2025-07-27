-- =====================================================
-- PBLab Comprehensive Admin RLS Policies Migration
-- =====================================================
-- Purpose: Add missing admin role policies to enable complete admin functionality
-- Issue: Admin users cannot access course/team/project data due to missing RLS policies
-- Solution: Add comprehensive admin policies for all tables while maintaining existing security
-- Affected: All 12 core tables + notifications table (13 total)
-- Security model: Admin role gets system-wide access, student/educator policies unchanged
-- =====================================================

-- =====================================================
-- ADMIN ACCESS POLICIES - CORE TABLES
-- =====================================================
-- These policies grant admins read access to all data across the system
-- Unlike educators (course-scoped) and students (team-scoped), admins see everything

-- =====================================================
-- COURSES TABLE - ADMIN POLICIES
-- =====================================================

-- Admin can view all courses (system-wide access)
CREATE POLICY "Admins can view all courses"
ON courses FOR SELECT
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- Admin can create courses for any educator
CREATE POLICY "Admins can create courses"
ON courses FOR INSERT
TO authenticated
WITH CHECK ((SELECT get_my_role()) = 'admin');

-- Admin can update any course
CREATE POLICY "Admins can update courses"
ON courses FOR UPDATE
TO authenticated
USING ((SELECT get_my_role()) = 'admin')
WITH CHECK ((SELECT get_my_role()) = 'admin');

-- Admin can delete any course
CREATE POLICY "Admins can delete courses"
ON courses FOR DELETE
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- =====================================================
-- TEAMS TABLE - ADMIN POLICIES
-- =====================================================

-- Admin can view all teams (system-wide access)
CREATE POLICY "Admins can view all teams"
ON teams FOR SELECT
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- Admin can create teams in any course
CREATE POLICY "Admins can create teams"
ON teams FOR INSERT
TO authenticated
WITH CHECK ((SELECT get_my_role()) = 'admin');

-- Admin can update any team
CREATE POLICY "Admins can update teams"
ON teams FOR UPDATE
TO authenticated
USING ((SELECT get_my_role()) = 'admin')
WITH CHECK ((SELECT get_my_role()) = 'admin');

-- Admin can delete any team
CREATE POLICY "Admins can delete teams"
ON teams FOR DELETE
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- =====================================================
-- TEAMS_USERS TABLE - ADMIN POLICIES
-- =====================================================

-- Admin can view all team memberships
CREATE POLICY "Admins can view all team memberships"
ON teams_users FOR SELECT
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- Admin can manage all team memberships (add/remove users from teams)
CREATE POLICY "Admins can manage team memberships"
ON teams_users FOR ALL
TO authenticated
USING ((SELECT get_my_role()) = 'admin')
WITH CHECK ((SELECT get_my_role()) = 'admin');

-- =====================================================
-- PROBLEMS TABLE - ADMIN POLICIES
-- =====================================================

-- Admin can view all problems
CREATE POLICY "Admins can view all problems"
ON problems FOR SELECT
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- Admin can create problems in any course
CREATE POLICY "Admins can create problems"
ON problems FOR INSERT
TO authenticated
WITH CHECK ((SELECT get_my_role()) = 'admin');

-- Admin can update any problem
CREATE POLICY "Admins can update problems"
ON problems FOR UPDATE
TO authenticated
USING ((SELECT get_my_role()) = 'admin')
WITH CHECK ((SELECT get_my_role()) = 'admin');

-- Admin can delete any problem
CREATE POLICY "Admins can delete problems"
ON problems FOR DELETE
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- =====================================================
-- PROJECTS TABLE - ADMIN POLICIES
-- =====================================================

-- Admin can view all projects
CREATE POLICY "Admins can view all projects"
ON projects FOR SELECT
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- Admin can create projects for any team
CREATE POLICY "Admins can create projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK ((SELECT get_my_role()) = 'admin');

-- Admin can update any project
CREATE POLICY "Admins can update projects"
ON projects FOR UPDATE
TO authenticated
USING ((SELECT get_my_role()) = 'admin')
WITH CHECK ((SELECT get_my_role()) = 'admin');

-- Admin can delete any project
CREATE POLICY "Admins can delete projects"
ON projects FOR DELETE
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- =====================================================
-- RUBRICS TABLE - ADMIN POLICIES
-- =====================================================

-- Admin can view all rubrics
CREATE POLICY "Admins can view all rubrics"
ON rubrics FOR SELECT
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- Admin can create rubrics for any problem
CREATE POLICY "Admins can create rubrics"
ON rubrics FOR INSERT
TO authenticated
WITH CHECK ((SELECT get_my_role()) = 'admin');

-- Admin can update any rubric
CREATE POLICY "Admins can update rubrics"
ON rubrics FOR UPDATE
TO authenticated
USING ((SELECT get_my_role()) = 'admin')
WITH CHECK ((SELECT get_my_role()) = 'admin');

-- Admin can delete any rubric
CREATE POLICY "Admins can delete rubrics"
ON rubrics FOR DELETE
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- =====================================================
-- RUBRIC_CRITERIA TABLE - ADMIN POLICIES
-- =====================================================

-- Admin can view all rubric criteria
CREATE POLICY "Admins can view all rubric criteria"
ON rubric_criteria FOR SELECT
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- Admin can manage all rubric criteria
CREATE POLICY "Admins can manage rubric criteria"
ON rubric_criteria FOR ALL
TO authenticated
USING ((SELECT get_my_role()) = 'admin')
WITH CHECK ((SELECT get_my_role()) = 'admin');

-- =====================================================
-- ARTIFACTS TABLE - ADMIN POLICIES
-- =====================================================

-- Admin can view all artifacts
CREATE POLICY "Admins can view all artifacts"
ON artifacts FOR SELECT
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- Admin can delete any artifact (for content moderation)
CREATE POLICY "Admins can delete artifacts"
ON artifacts FOR DELETE
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- =====================================================
-- COMMENTS TABLE - ADMIN POLICIES
-- =====================================================

-- Admin can view all comments
CREATE POLICY "Admins can view all comments"
ON comments FOR SELECT
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- Admin can delete any comment (for content moderation)
CREATE POLICY "Admins can delete comments"
ON comments FOR DELETE
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- =====================================================
-- AI_USAGE TABLE - ADMIN POLICIES
-- =====================================================

-- Admin can view all AI usage (for system monitoring and analytics)
CREATE POLICY "Admins can view all AI usage"
ON ai_usage FOR SELECT
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- =====================================================
-- ASSESSMENTS TABLE - ADMIN POLICIES
-- =====================================================

-- Admin can view all assessments
CREATE POLICY "Admins can view all assessments"
ON assessments FOR SELECT
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- Admin can manage all assessments
CREATE POLICY "Admins can manage assessments"
ON assessments FOR ALL
TO authenticated
USING ((SELECT get_my_role()) = 'admin')
WITH CHECK ((SELECT get_my_role()) = 'admin');

-- =====================================================
-- ASSESSMENT_SCORES TABLE - ADMIN POLICIES
-- =====================================================

-- Admin can view all assessment scores
CREATE POLICY "Admins can view all assessment scores"
ON assessment_scores FOR SELECT
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- Admin can manage all assessment scores
CREATE POLICY "Admins can manage assessment scores"
ON assessment_scores FOR ALL
TO authenticated
USING ((SELECT get_my_role()) = 'admin')
WITH CHECK ((SELECT get_my_role()) = 'admin');

-- =====================================================
-- USER MANAGEMENT POLICIES
-- =====================================================

-- Admin can update any user profile (role changes, profile management)
CREATE POLICY "Admins can update any user"
ON public.users FOR UPDATE
TO authenticated
USING ((SELECT get_my_role()) = 'admin')
WITH CHECK ((SELECT get_my_role()) = 'admin');

-- =====================================================
-- NOTIFICATION SYSTEM - ADMIN POLICIES
-- =====================================================

-- Admin can view all notifications (for system monitoring)
CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- Admin can delete notifications (for cleanup/moderation)
CREATE POLICY "Admins can delete notifications"
ON public.notifications FOR DELETE
TO authenticated
USING ((SELECT get_my_role()) = 'admin');

-- =====================================================
-- SECURITY VALIDATION
-- =====================================================

-- All policies use the existing get_my_role() function which:
-- 1. Is already defined and tested
-- 2. Uses proper security definer pattern
-- 3. Has performance optimizations via indexes
-- 4. Prevents role escalation attacks

-- Policy naming follows existing convention: "[Role] can [action] [scope] [table]"
-- This ensures consistency with existing policies and clear audit trails

-- =====================================================
-- PERFORMANCE CONSIDERATIONS
-- =====================================================

-- These policies leverage existing indexes:
-- - idx_users_role (for get_my_role() lookups)
-- - All foreign key indexes (for relationship queries)
-- - Table-specific indexes from initial schema

-- No additional indexes needed as admin queries are:
-- 1. Infrequent (admin users are rare)
-- 2. Full-table scans acceptable for admin use cases
-- 3. Performance critical for user-facing features, not admin dashboards

-- =====================================================
-- MIGRATION VALIDATION NOTES
-- =====================================================

-- This migration:
-- 1. ADDS policies only - no drops or modifications
-- 2. Does NOT affect existing student/educator functionality
-- 3. Uses same security patterns as existing policies
-- 4. Maintains all foreign key relationships
-- 5. Preserves all existing performance optimizations

-- Expected test results after migration:
-- - Admin dashboard shows: 1+ courses, 2+ teams, 4+ projects
-- - Admin CRUD operations succeed
-- - @mention notifications work end-to-end
-- - Student/educator access unchanged
-- - All 28 authentication tests pass

-- =====================================================
-- END OF COMPREHENSIVE ADMIN RLS POLICIES MIGRATION
-- =====================================================