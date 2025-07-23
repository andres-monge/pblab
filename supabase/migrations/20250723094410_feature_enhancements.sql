-- =====================================================
-- PBLab Feature Enhancements Migration
-- =====================================================
-- Purpose: Add support for Learning Goals, AI Tutor Memory, and Notification features
-- Changes: 1. Add learning_goals column to projects table
--          2. Create notification_type ENUM  
--          3. Create notifications table with indexes and RLS
-- Affected: projects table (1 column), 1 new ENUM, 1 new table, 1 new index
-- Special considerations: Enables RLS on notifications table for security
-- =====================================================

-- =====================================================
-- LEARNING GOALS ENHANCEMENT
-- =====================================================

-- Add learning goals column to projects table
-- This enables students to define and save learning goals during the 'pre' phase
ALTER TABLE public.projects ADD COLUMN learning_goals TEXT;

-- =====================================================
-- NOTIFICATIONS SYSTEM
-- =====================================================

-- Create notification types ENUM for different notification categories
-- Currently supports @mentions in comments, can be extended for other types
CREATE TYPE notification_type AS ENUM ('mention_in_comment');

-- Notifications table - tracks user notifications for mentions and other events
-- Links recipients and actors, stores reference to triggering content
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- User receiving notification
    actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,     -- User who triggered notification
    type notification_type NOT NULL,                                           -- Type of notification
    reference_id UUID NOT NULL,                                               -- ID of referenced content (e.g., comment_id)
    reference_url TEXT,                                                        -- Deep link to the referenced content
    is_read BOOLEAN NOT NULL DEFAULT FALSE,                                   -- Read status for UI badges
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()                            -- Creation timestamp
);

-- =====================================================
-- PERFORMANCE OPTIMIZATION
-- =====================================================

-- Index for efficient notification queries by recipient
-- Users will frequently query "my unread notifications"
CREATE INDEX idx_notifications_recipient_id ON public.notifications(recipient_id);

-- =====================================================
-- SECURITY (RLS)
-- =====================================================

-- Enable Row Level Security on notifications table
-- RLS policies will be defined in the next migration (Step 14)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
