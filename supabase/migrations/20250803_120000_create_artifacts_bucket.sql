-- Step 26: Artifacts & Comments System Setup
-- Part 1: Storage bucket is configured in supabase/config.toml and created automatically
-- Part 2: Fix notification policy to allow @mentions in comments
-- This migration sets up RLS policies for both storage.objects and notifications tables

-- Fix notification INSERT policy to allow @mentions
-- Replace conflicting RLS policies with a clean RPC function approach
-- This solves the 42501 error by bypassing RLS for notification creation
-- while maintaining security through function logic

-- First, drop ALL conflicting INSERT policies that prevent @mentions
DROP POLICY IF EXISTS notifications_insert_v1 ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_v2 ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;

-- Note: The set_notification_actor trigger from July 31st migration remains active
-- It will automatically set actor_id = auth.uid() for direct inserts

-- Create SECURITY DEFINER RPC function for creating mention notifications
-- This bypasses RLS entirely while maintaining security through explicit checks
CREATE OR REPLACE FUNCTION public.create_mention_notification(
  _recipient_id uuid,
  _comment_id uuid,
  _reference_url text DEFAULT NULL
) 
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _notification_id uuid;
  _comment_exists boolean;
BEGIN
  -- Validate input parameters
  IF _recipient_id IS NULL OR _comment_id IS NULL THEN
    RAISE EXCEPTION 'recipient_id and comment_id are required';
  END IF;
  
  -- Security check: Don't allow self-mentions
  IF _recipient_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot mention yourself';
  END IF;
  
  -- Verify the comment exists and user has access to it
  SELECT EXISTS (
    SELECT 1 
    FROM comments c
    JOIN artifacts a ON c.artifact_id = a.id
    JOIN projects p ON a.project_id = p.id
    JOIN teams_users tu ON p.team_id = tu.team_id
    WHERE c.id = _comment_id
    AND tu.user_id = auth.uid()
  ) INTO _comment_exists;
  
  IF NOT _comment_exists THEN
    RAISE EXCEPTION 'Comment not found or access denied';
  END IF;
  
  -- Create the notification (actor_id will be set by existing trigger)
  INSERT INTO notifications (
    recipient_id, 
    type,
    reference_id,
    reference_url,
    is_read,
    created_at
  ) VALUES (
    _recipient_id,
    'mention_in_comment',
    _comment_id,
    _reference_url,
    false,
    now()
  )
  RETURNING id INTO _notification_id;
  
  RETURN _notification_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_mention_notification TO authenticated;

-- Add helpful comment for future developers
COMMENT ON FUNCTION public.create_mention_notification IS 
'Creates a notification for @mentions in comments. Uses SECURITY DEFINER to bypass RLS 
policies while maintaining security through explicit validation. Works with the existing
set_notification_actor trigger to automatically set actor_id = auth.uid().';

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