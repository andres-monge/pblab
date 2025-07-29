-- Step 26: Artifacts & Comments System Setup
-- Part 1: Storage bucket is configured in supabase/config.toml and created automatically
-- Part 2: Fix notification policy to allow @mentions in comments
-- This migration sets up RLS policies for both storage.objects and notifications tables

-- Fix notification INSERT policy to allow @mentions
-- The current policy only allows self-notifications, but for @mentions to work,
-- authenticated users need to create notifications for other users (recipients)
-- Note: We need to drop both the old policies that might conflict
DROP POLICY IF EXISTS notifications_insert_v1 ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;

CREATE POLICY notifications_insert_v2
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND recipient_id IS NOT NULL
    AND recipient_id != actor_id  -- Prevent self-mentions for cleaner UX
  );

-- Allow authenticated users to see the artifacts bucket
-- This fixes the "bucket not found" issue when using listBuckets() with authenticated users
CREATE POLICY "artifacts bucket visible"
  ON storage.buckets
  FOR SELECT
  TO authenticated
  USING (id = 'artifacts');

-- RLS Policy: Allow authenticated users to view artifacts they have access to
CREATE POLICY "Users can view artifacts they have access to" ON storage.objects
FOR SELECT USING (
  bucket_id = 'artifacts' AND
  auth.role() = 'authenticated' AND (
    -- Students can view artifacts from projects their team is working on
    (get_my_role() = 'student' AND EXISTS (
      SELECT 1 FROM artifacts a
      JOIN projects p ON a.project_id = p.id
      JOIN teams_users tu ON p.team_id = tu.team_id
      WHERE a.url = storage.objects.name
      AND tu.user_id = auth.uid()
    )) OR
    -- Educators can view artifacts from projects in their courses
    (get_my_role() = 'educator' AND EXISTS (
      SELECT 1 FROM artifacts a
      JOIN projects p ON a.project_id = p.id
      JOIN teams t ON p.team_id = t.id
      JOIN courses c ON t.course_id = c.id
      WHERE a.url = storage.objects.name
      AND c.admin_id = auth.uid()
    )) OR
    -- Admins can view all artifacts
    get_my_role() = 'admin'
  )
);

-- RLS Policy: Simplified upload policy based on path structure (projectId/filename)
-- No artifact table joins needed - avoids chicken-and-egg problem
CREATE POLICY "team-member can upload" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'artifacts' AND
  (split_part(name, '/', 1))::uuid IN (
    -- User can upload to projects where they are team members
    SELECT p.id 
    FROM projects p
    JOIN teams_users tu ON p.team_id = tu.team_id
    WHERE tu.user_id = auth.uid()
    
    UNION
    
    -- Educators can upload to projects in their courses
    SELECT p.id
    FROM projects p  
    JOIN teams t ON p.team_id = t.id
    JOIN courses c ON t.course_id = c.id
    WHERE c.admin_id = auth.uid() AND get_my_role() = 'educator'
    
    UNION
    
    -- Admins can upload to any project
    SELECT p.id 
    FROM projects p
    WHERE get_my_role() = 'admin'
  )
);

-- RLS Policy: Allow artifact owners and educators to delete artifacts
CREATE POLICY "Users can delete artifacts they own or manage" ON storage.objects
FOR DELETE USING (
  bucket_id = 'artifacts' AND
  auth.role() = 'authenticated' AND (
    -- Artifact uploader can delete their own artifacts
    EXISTS (
      SELECT 1 FROM artifacts a
      WHERE a.url = storage.objects.name
      AND a.uploader_id = auth.uid()
    ) OR
    -- Educators can delete artifacts from projects in their courses
    (get_my_role() = 'educator' AND EXISTS (
      SELECT 1 FROM artifacts a
      JOIN projects p ON a.project_id = p.id
      JOIN teams t ON p.team_id = t.id
      JOIN courses c ON t.course_id = c.id
      WHERE a.url = storage.objects.name
      AND c.admin_id = auth.uid()
    )) OR
    -- Admins can delete any artifact
    get_my_role() = 'admin'
  )
);