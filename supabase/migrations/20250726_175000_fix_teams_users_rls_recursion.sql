-- Fix infinite recursion in teams_users RLS policies
-- Problem: The existing policy creates circular dependency by querying teams_users within its own policy
-- Solution: Use SECURITY DEFINER function to break the recursion

-- Create private schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS private;

-- First, let's drop the problematic policy
DROP POLICY IF EXISTS "Team members can view team membership" ON teams_users;

-- Create a SECURITY DEFINER function to check if user is a team member
-- This function runs as the creator (bypassing RLS) and breaks the circular dependency
CREATE OR REPLACE FUNCTION private.is_team_member(user_uuid uuid, team_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- This is key - runs as the creator, bypassing RLS
SET search_path = public
AS $$
BEGIN
  -- Check if the user is a member of the specified team
  RETURN EXISTS (
    SELECT 1 
    FROM teams_users 
    WHERE user_id = user_uuid AND team_id = team_uuid
  );
END;
$$;

-- Create a helper function to get all team IDs for the current user
CREATE OR REPLACE FUNCTION private.get_user_team_ids()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS on teams_users
SET search_path = public
AS $$
DECLARE
  team_ids uuid[];
BEGIN
  -- Get all team IDs where the current user is a member
  SELECT ARRAY(
    SELECT team_id 
    FROM teams_users 
    WHERE user_id = auth.uid()
  ) INTO team_ids;
  
  RETURN team_ids;
END;
$$;

-- Now create the new RLS policies using our SECURITY DEFINER functions

-- Policy 1: Users can view their own team memberships
CREATE POLICY "Users can view their own team memberships"
ON teams_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Team members can view other team memberships for the same team
CREATE POLICY "Team members can view team membership for their teams"
ON teams_users FOR SELECT
TO authenticated
USING (
  team_id = ANY(private.get_user_team_ids())
);

-- Grant execute permissions on the helper functions to authenticated users
GRANT EXECUTE ON FUNCTION private.is_team_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_team_ids() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION private.is_team_member(uuid, uuid) IS 
'Security definer function to check team membership without RLS recursion';

COMMENT ON FUNCTION private.get_user_team_ids() IS 
'Security definer function to get all team IDs for current user without RLS recursion';

COMMENT ON POLICY "Users can view their own team memberships" ON teams_users IS 
'Allows users to see their own team memberships directly';

COMMENT ON POLICY "Team members can view team membership for their teams" ON teams_users IS 
'Allows team members to see other members of teams they belong to, using security definer function to avoid recursion';