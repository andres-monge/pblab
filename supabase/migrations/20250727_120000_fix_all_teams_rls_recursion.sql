-- Comprehensive fix for all circular RLS dependencies involving teams and teams_users
-- Problem: Multiple policies create circular dependencies by cross-referencing teams and teams_users tables
-- Solution: Use SECURITY DEFINER functions for ALL policies that cross-reference these tables

-- Create private schema if it doesn't exist (should already exist from previous migration)
CREATE SCHEMA IF NOT EXISTS private;

-- Drop ALL problematic policies that create circular dependencies
DROP POLICY IF EXISTS "Students can view their teams" ON teams;
DROP POLICY IF EXISTS "Team members can view team membership" ON teams_users;
DROP POLICY IF EXISTS "Students can view their projects" ON projects;
DROP POLICY IF EXISTS "Students can update their projects" ON projects;

-- Create comprehensive SECURITY DEFINER functions to handle team membership logic
-- These functions bypass RLS and break all circular dependencies

-- Function to check if a user is a member of a specific team
CREATE OR REPLACE FUNCTION private.is_team_member(user_uuid uuid, team_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM teams_users 
    WHERE user_id = user_uuid AND team_id = team_uuid
  );
END;
$$;

-- Function to get all team IDs for the current user
CREATE OR REPLACE FUNCTION private.get_user_team_ids()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
DECLARE
  team_ids uuid[];
BEGIN
  SELECT ARRAY(
    SELECT team_id 
    FROM teams_users 
    WHERE user_id = auth.uid()
  ) INTO team_ids;
  
  RETURN team_ids;
END;
$$;

-- Function to check if user has any team memberships (performance optimized)
CREATE OR REPLACE FUNCTION private.user_has_teams()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM teams_users 
    WHERE user_id = auth.uid()
  );
END;
$$;

-- Now create the NEW non-recursive RLS policies using our SECURITY DEFINER functions

-- 1. TEAMS table policies (replacing the problematic "Students can view their teams")
CREATE POLICY "Users can view their teams"
ON teams FOR SELECT
TO authenticated
USING (
  id = ANY(private.get_user_team_ids())
);

-- 2. TEAMS_USERS table policies (replacing problematic policies)
-- Drop existing policies from previous migration first
DROP POLICY IF EXISTS "Users can view their own team memberships" ON teams_users;
DROP POLICY IF EXISTS "Team members can view team membership for their teams" ON teams_users;

CREATE POLICY "Users can view their own team memberships"
ON teams_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Team members can view team membership for their teams"
ON teams_users FOR SELECT
TO authenticated
USING (
  team_id = ANY(private.get_user_team_ids())
);

-- 3. PROJECTS table policies (replacing problematic policies that query teams_users)
CREATE POLICY "Users can view their team projects"
ON projects FOR SELECT
TO authenticated
USING (
  team_id = ANY(private.get_user_team_ids())
);

CREATE POLICY "Users can update their team projects"
ON projects FOR UPDATE
TO authenticated
USING (
  team_id = ANY(private.get_user_team_ids())
)
WITH CHECK (
  team_id = ANY(private.get_user_team_ids())
);

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION private.is_team_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_team_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_has_teams() TO authenticated;

-- Add comprehensive documentation
COMMENT ON FUNCTION private.is_team_member(uuid, uuid) IS 
'Security definer function to check team membership without RLS recursion. Used to break circular dependencies.';

COMMENT ON FUNCTION private.get_user_team_ids() IS 
'Security definer function to get all team IDs for current user without RLS recursion. Core function for team-based authorization.';

COMMENT ON FUNCTION private.user_has_teams() IS 
'Security definer function to check if user has any team memberships. Performance optimized for boolean checks.';

COMMENT ON POLICY "Users can view their teams" ON teams IS 
'Allows users to see teams they belong to, using security definer function to avoid recursion';

COMMENT ON POLICY "Users can view their own team memberships" ON teams_users IS 
'Allows users to see their own team memberships directly without recursion';

COMMENT ON POLICY "Team members can view team membership for their teams" ON teams_users IS 
'Allows team members to see other members of teams they belong to, using security definer function to avoid recursion';

COMMENT ON POLICY "Users can view their team projects" ON projects IS 
'Allows users to see projects for teams they belong to, using security definer function to avoid recursion';

COMMENT ON POLICY "Users can update their team projects" ON projects IS 
'Allows users to update projects for teams they belong to, using security definer function to avoid recursion';