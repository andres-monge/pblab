-- Fix the courses table policy that creates circular dependency with teams_users
-- The "Students can view courses for their teams" policy uses JOIN teams_users causing recursion

-- Drop the problematic courses policy
DROP POLICY IF EXISTS "Students can view courses for their teams" ON courses;

-- Create a security definer function to get course IDs for current user
CREATE OR REPLACE FUNCTION private.get_user_course_ids()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
DECLARE
  course_ids uuid[];
BEGIN
  -- Get course IDs for teams the user belongs to
  SELECT ARRAY(
    SELECT DISTINCT t.course_id 
    FROM teams t
    JOIN teams_users tu ON t.id = tu.team_id
    WHERE tu.user_id = auth.uid()
  ) INTO course_ids;
  
  RETURN course_ids;
END;
$$;

-- Create the new non-recursive courses policy
CREATE POLICY "Students can view courses for their teams"
ON courses FOR SELECT
TO authenticated
USING (
  (SELECT get_my_role()) = 'student' AND
  id = ANY(private.get_user_course_ids())
);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION private.get_user_course_ids() TO authenticated;

-- Add documentation
COMMENT ON FUNCTION private.get_user_course_ids() IS 
'Security definer function to get course IDs for teams the current user belongs to, avoiding RLS recursion';

COMMENT ON POLICY "Students can view courses for their teams" ON courses IS 
'Fixed: Allows students to see courses for teams they belong to using security definer function to prevent recursion';