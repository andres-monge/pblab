-- =====================================================
-- PBLab Notifications RLS Complete Fix
-- =====================================================
-- Purpose: Fix 42501 error preventing authenticated users from creating notifications
-- Root cause: Missing INSERT policy + RLS/DEFAULT timing issue
-- Solution: BEFORE trigger + universal INSERT policy
-- =====================================================

-- 1️⃣ GRANT INSERT PRIVILEGES
-- Ensure authenticated role has table-level INSERT privilege
GRANT INSERT ON public.notifications TO authenticated;

-- 2️⃣ CREATE BEFORE INSERT TRIGGER  
-- Populate actor_id before RLS policy evaluation
-- (Solves the DEFAULT timing issue we discovered)
CREATE OR REPLACE FUNCTION set_notification_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- If actor_id is NULL (client omitted), fill from session
  IF NEW.actor_id IS NULL THEN
     NEW.actor_id := auth.uid();
  END IF;

  -- Security check: ensure actor_id matches session
  IF NEW.actor_id <> auth.uid() THEN
     RAISE EXCEPTION
       'actor_id (%) must equal auth.uid() (%)',
       NEW.actor_id, auth.uid();
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER set_notification_actor_trigger
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_notification_actor();

-- 3️⃣ CREATE SINGLE UNIVERSAL INSERT POLICY
-- This is the core missing piece - no INSERT policy existed
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
CREATE POLICY "Users can create notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- 4️⃣ KEEP EXISTING SELECT/UPDATE POLICIES
-- (These already work correctly, don't touch them)

-- 5️⃣ OPTIONAL: FORCE RLS FOR ADMINS
-- Uncomment if you want admins to also obey the policy:
-- ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

-- =====================================================
-- EXPLANATION
-- =====================================================
-- Before: No INSERT policy → default deny → students blocked, admins bypass via ownership
-- After: Universal INSERT policy → students allowed, admins still work
--
-- The BEFORE INSERT trigger ensures:
-- 1. actor_id is populated if NULL
-- 2. actor_id matches auth.uid() (security validation)
-- 3. Policy evaluation sees correct actor_id value
--
-- Result: Both students and admins can INSERT with auto-populated actor_id
-- =====================================================