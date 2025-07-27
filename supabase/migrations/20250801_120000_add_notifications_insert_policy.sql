-- Enable row-level security for everyone, including the table owner
ALTER TABLE public.notifications
  ENABLE ROW LEVEL SECURITY,
  FORCE ROW LEVEL SECURITY;

-- Clean slate: drop any prior INSERT policy so this script can be re-run safely
DROP POLICY IF EXISTS notifications_insert_v1 ON public.notifications;

-- Authenticated users may insert rows **only** for themselves.
-- The BEFORE INSERT trigger already sets actor_id to auth.uid(),
-- so the WITH CHECK condition can include it safely.
CREATE POLICY notifications_insert_v1
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    recipient_id = auth.uid()
    AND actor_id  = auth.uid()
  );

-- Verify policy exists (handy when viewing migration logs)
-- RAISE NOTICE 'policies: %', (SELECT json_agg(p) FROM pg_policies p WHERE p.tablename = 'notifications'); 