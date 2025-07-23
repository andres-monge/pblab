-- =====================================================
-- PBLab Notifications RLS Policies Migration
-- =====================================================
-- Purpose: Create Row Level Security policies for the notifications table
-- Security model: Users can only access their own notifications (recipient-based access)
-- Policies: SELECT (view own), UPDATE (mark as read), INSERT (create notifications)
-- Dependencies: Requires notifications table from 20250723094410_feature_enhancements.sql
-- =====================================================

-- =====================================================
-- NOTIFICATIONS TABLE RLS POLICIES
-- =====================================================

-- Policy: Users can only see notifications where they are the recipient
-- This enables users to fetch their unread notification counts and notification lists
-- Security: Prevents users from seeing notifications intended for other users
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (recipient_id = (SELECT auth.uid()));

-- Policy: Users can only update notifications where they are the recipient
-- This enables users to mark their own notifications as read
-- Security: Prevents users from modifying other users' notification read status
-- WITH CHECK ensures recipient_id cannot be changed during updates
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (recipient_id = (SELECT auth.uid()))
WITH CHECK (recipient_id = (SELECT auth.uid()));

-- Policy: Users can create notifications (needed for @mention functionality)
-- This enables the createComment server action to create notifications for @mentions
-- Security: WITH CHECK ensures actor_id matches the authenticated user
-- Users can only create notifications where they are the actor (the person who triggered it)
CREATE POLICY "Users can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (actor_id = (SELECT auth.uid()));

-- =====================================================
-- PERFORMANCE OPTIMIZATION
-- =====================================================

-- Note: Performance index idx_notifications_recipient_id already exists
-- from the feature_enhancements migration for efficient recipient queries

-- =====================================================
-- END OF NOTIFICATIONS RLS POLICIES MIGRATION
-- =====================================================
