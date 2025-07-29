-- Migration: Fix AI usage team access
-- Purpose: Allow team members to view AI tutor conversations for their shared projects
-- Issue: Student 2 cannot see Student 1's messages in the shared AI tutor chat
-- Solution: Add RLS policy that allows team members to view AI usage for their projects

-- Add policy for team members to view AI usage for their projects
CREATE POLICY "Team members can view project AI usage"
ON ai_usage FOR SELECT
TO authenticated
USING (
  -- Allow access if the user is a member of the team that owns the project
  project_id IN (
    SELECT p.id 
    FROM projects p
    INNER JOIN teams_users tu ON tu.team_id = p.team_id
    WHERE tu.user_id = auth.uid()
  )
);

-- Add informative comment
COMMENT ON POLICY "Team members can view project AI usage" ON ai_usage IS 
'Allows team members to view all AI tutor conversations for projects they are working on together. This enables the shared chat functionality where all team members can see each others questions and AI responses.';