"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db.types";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/actions/shared/authorization";

type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

/**
 * Enhanced notification object with user details for rich UI display
 */
export interface NotificationWithActor {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: Database["public"]["Enums"]["notification_type"];
  reference_id: string;
  reference_url: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    id: string;
    name: string | null;
    email: string;
  };
}

/**
 * Parameters for marking a notification as read
 */
export interface MarkNotificationAsReadParams {
  /** ID of the notification to mark as read */
  notificationId: string;
}

/**
 * Parameters for getting notifications
 */
export interface GetNotificationsParams {
  /** Whether to fetch only unread notifications (default: false - fetch all) */
  unreadOnly?: boolean;
  /** Maximum number of notifications to fetch (default: 50) */
  limit?: number;
}

/**
 * Get notifications for the current user
 * 
 * Fetches notifications where the current user is the recipient,
 * ordered by creation date (newest first). Can optionally filter
 * for only unread notifications.
 * 
 * @param params - Notification fetch parameters
 * @returns Promise resolving to array of notifications with actor details
 * @throws Error if user is not authenticated
 */
export async function getNotifications(params: GetNotificationsParams = {}): Promise<NotificationWithActor[]> {
  const { unreadOnly = false, limit = 50 } = params;

  // Validate limit parameter
  if (typeof limit !== 'number' || limit < 1 || limit > 100) {
    throw new Error('Limit must be a number between 1 and 100');
  }

  try {
    // Verify user authentication
    const user = await getAuthenticatedUser();
    
    const supabase = await createClient();

    // Build the query
    let query = supabase
      .from('notifications')
      .select(`
        id,
        recipient_id,
        actor_id,
        type,
        reference_id,
        reference_url,
        is_read,
        created_at,
        actor:users!notifications_actor_id_fkey(
          id,
          name,
          email
        )
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply unread filter if requested
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error: notificationsError } = await query;

    if (notificationsError) {
      console.error('Failed to fetch notifications:', notificationsError);
      throw new Error(`Failed to fetch notifications: ${notificationsError.message}`);
    }

    // Transform the data to match our interface
    const transformedNotifications: NotificationWithActor[] = (notifications || []).map((notification) => ({
      id: notification.id,
      recipient_id: notification.recipient_id,
      actor_id: notification.actor_id,
      type: notification.type,
      reference_id: notification.reference_id,
      reference_url: notification.reference_url,
      is_read: notification.is_read,
      created_at: notification.created_at,
      actor: {
        id: notification.actor.id,
        name: notification.actor.name,
        email: notification.actor.email,
      },
    }));

    return transformedNotifications;
  } catch (error) {
    // Re-throw with context if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected error types
    throw new Error(`Unexpected error fetching notifications: ${String(error)}`);
  }
}

/**
 * Mark a notification as read
 * 
 * Updates the is_read field to true for the specified notification.
 * Users can only mark their own notifications as read (enforced by RLS).
 * 
 * @param params - Notification mark as read parameters
 * @returns Promise resolving to success message
 * @throws Error if user is not authenticated, notification not found, or lacks permission
 */
export async function markNotificationAsRead(params: MarkNotificationAsReadParams): Promise<string> {
  const { notificationId } = params;

  // Validate required parameters
  if (!notificationId || typeof notificationId !== 'string') {
    throw new Error('Notification ID is required and must be a valid string');
  }

  try {
    // Verify user authentication
    const user = await getAuthenticatedUser();
    
    const supabase = await createClient();

    // Get the notification to verify it exists and belongs to the user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('id, recipient_id, is_read')
      .eq('id', notificationId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('Notification not found or you do not have permission to access it');
      }
      console.error('Failed to fetch notification:', fetchError);
      throw new Error(`Failed to fetch notification: ${fetchError.message}`);
    }

    if (!notification) {
      throw new Error('Notification not found or you do not have permission to access it');
    }

    // Additional security check (though RLS should handle this)
    if (notification.recipient_id !== user.id) {
      throw new Error('You can only mark your own notifications as read');
    }

    // Check if already read (no need to update)
    if (notification.is_read) {
      return 'Notification was already marked as read';
    }

    // Update the notification to mark as read
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (updateError) {
      console.error('Failed to mark notification as read:', updateError);
      throw new Error(`Failed to mark notification as read: ${updateError.message}`);
    }

    // Revalidate paths that might show notification counts
    revalidatePath('/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/educator/dashboard');

    return 'Notification marked as read successfully';
  } catch (error) {
    // Re-throw with context if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected error types
    throw new Error(`Unexpected error marking notification as read: ${String(error)}`);
  }
}

/**
 * Create a new notification
 * 
 * Helper function for creating notifications (used by @mention functionality).
 * The actor_id will be set to the current authenticated user.
 * 
 * @param params - Notification creation parameters  
 * @returns Promise resolving to the created notification ID
 * @throws Error if user is not authenticated or creation fails
 */
export async function createNotification(params: {
  recipientId: string;
  type: Database["public"]["Enums"]["notification_type"];
  referenceId: string;
  referenceUrl?: string | null;
}): Promise<string> {
  const { recipientId, type, referenceId, referenceUrl = null } = params;

  // Validate required parameters
  if (!recipientId || typeof recipientId !== 'string') {
    throw new Error('Recipient ID is required and must be a valid string');
  }

  if (!type || typeof type !== 'string') {
    throw new Error('Notification type is required and must be a valid string');
  }

  if (!referenceId || typeof referenceId !== 'string') {
    throw new Error('Reference ID is required and must be a valid string');
  }

  try {
    // Verify user authentication
    const user = await getAuthenticatedUser();
    
    const supabase = await createClient();

    // Don't create a notification if the actor and recipient are the same user
    if (user.id === recipientId) {
      return 'Self-notification skipped';
    }

    // Create the notification
    const notificationData: NotificationInsert = {
      recipient_id: recipientId,
      actor_id: user.id,
      type,
      reference_id: referenceId,
      reference_url: referenceUrl,
    };

    const { data: createdNotification, error: createError } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select('id')
      .single();

    if (createError || !createdNotification) {
      console.error('Failed to create notification:', createError);
      throw new Error(`Failed to create notification: ${createError?.message || 'Unknown error'}`);
    }

    // Revalidate paths that might show notification counts for the recipient
    revalidatePath('/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/educator/dashboard');

    return createdNotification.id;
  } catch (error) {
    // Re-throw with context if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected error types
    throw new Error(`Unexpected error creating notification: ${String(error)}`);
  }
} 