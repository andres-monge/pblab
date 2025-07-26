-- Fix the exact policy names that are causing recursion
-- The previous migration used wrong policy names, so the problematic policies are still active

-- Drop the actual problematic policies with correct names
DROP POLICY IF EXISTS "Team members can view their teams" ON teams;
DROP POLICY IF EXISTS "Students can view their projects" ON projects;
DROP POLICY IF EXISTS "Students can update their projects" ON projects;

-- Verify our security definer functions exist (they should from previous migration)
-- If not, recreate them
DO $$
BEGIN
    -- Check if function exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_team_ids' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'private')) THEN
        RAISE NOTICE 'Creating missing get_user_team_ids function';
        
        CREATE OR REPLACE FUNCTION private.get_user_team_ids()
        RETURNS uuid[]
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $inner$
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
        $inner$;
    END IF;
END
$$;

-- Now create the corrected policies with the exact same names but non-recursive logic

-- Replace the problematic teams policy
CREATE POLICY "Team members can view their teams"
ON teams FOR SELECT
TO authenticated
USING (
  id = ANY(private.get_user_team_ids())
);

-- Replace the problematic projects policies  
CREATE POLICY "Students can view their projects"
ON projects FOR SELECT
TO authenticated
USING (
  team_id = ANY(private.get_user_team_ids())
);

CREATE POLICY "Students can update their projects"
ON projects FOR UPDATE
TO authenticated
USING (
  team_id = ANY(private.get_user_team_ids())
)
WITH CHECK (
  team_id = ANY(private.get_user_team_ids())
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION private.get_user_team_ids() TO authenticated;

-- Add documentation
COMMENT ON POLICY "Team members can view their teams" ON teams IS 
'Fixed: Allows users to see teams they belong to using security definer function to prevent recursion';

COMMENT ON POLICY "Students can view their projects" ON projects IS 
'Fixed: Allows users to see projects for teams they belong to using security definer function to prevent recursion';

COMMENT ON POLICY "Students can update their projects" ON projects IS 
'Fixed: Allows users to update projects for teams they belong to using security definer function to prevent recursion';