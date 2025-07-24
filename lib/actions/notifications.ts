"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db.types";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/actions/shared/authorization";
import {
  validateNotificationId,
  validateUserId,
  validateRequiredString,
  validateRange
} from "@/lib/shared/validation";
import {
  QueryResult,
  UpdateResult,
  CreateResult,
  createSuccessResponse,
  createMessageResponse,
  createIdResponse,
  createErrorResponse
} from "@/lib/shared/action-types";

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
 * @returns Promise resolving to QueryResult with notifications array or error
 */
export async function getNotifications(params: GetNotificationsParams = {}): Promise<QueryResult<NotificationWithActor[]>> {
  const { unreadOnly = false, limit = 50 } = params;

  // Validate limit parameter
  const validatedLimit = validateRange(limit, 'Limit', 1, 100);

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
      .limit(validatedLimit);

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

    return createSuccessResponse(transformedNotifications);
  } catch (error) {
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Unexpected error fetching notifications: ${errorMessage}`);
  }
}

/**
 * Mark a notification as read
 * 
 * Updates the is_read field to true for the specified notification.
 * Users can only mark their own notifications as read (enforced by RLS).
 * 
 * @param params - Notification mark as read parameters
 * @returns Promise resolving to UpdateResult with success message or error
 */
export async function markNotificationAsRead(params: MarkNotificationAsReadParams): Promise<UpdateResult> {
  const { notificationId } = params;

  // Validate required parameters
  const validatedNotificationId = validateNotificationId(notificationId);
  if (!validatedNotificationId) {
    return createErrorResponse('Invalid notification ID provided');
  }

  try {
    // Verify user authentication
    const user = await getAuthenticatedUser();
    
    const supabase = await createClient();

    // Get the notification to verify it exists and belongs to the user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('id, recipient_id, is_read')
      .eq('id', validatedNotificationId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createErrorResponse('Notification not found or you do not have permission to access it');
      }
      console.error('Failed to fetch notification:', fetchError);
      return createErrorResponse(`Failed to fetch notification: ${fetchError.message}`);
    }

    if (!notification) {
      return createErrorResponse('Notification not found or you do not have permission to access it');
    }

    // Additional security check (though RLS should handle this)
    if (notification.recipient_id !== user.id) {
      return createErrorResponse('You can only mark your own notifications as read');
    }

    // Check if already read (no need to update)
    if (notification.is_read) {
      return createMessageResponse('Notification was already marked as read');
    }

    // Update the notification to mark as read
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', validatedNotificationId);

    if (updateError) {
      console.error('Failed to mark notification as read:', updateError);
      return createErrorResponse(`Failed to mark notification as read: ${updateError.message}`);
    }

    // Revalidate paths that might show notification counts
    revalidatePath('/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/educator/dashboard');

    return createMessageResponse('Notification marked as read successfully');
  } catch (error) {
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Unexpected error marking notification as read: ${errorMessage}`);
  }
}

/**
 * Create a new notification
 * 
 * Helper function for creating notifications (used by @mention functionality).
 * The actor_id will be set to the current authenticated user.
 * 
 * @param params - Notification creation parameters  
 * @returns Promise resolving to CreateResult with notification ID or error
 */
export async function createNotification(params: {
  recipientId: string;
  type: Database["public"]["Enums"]["notification_type"];
  referenceId: string;
  referenceUrl?: string | null;
}): Promise<CreateResult> {
  const { recipientId, type, referenceId, referenceUrl = null } = params;

  // Validate required parameters
  const validatedRecipientId = validateUserId(recipientId);
  const validatedType = validateRequiredString(type, 'Notification type');
  const validatedReferenceId = validateRequiredString(referenceId, 'Reference ID');

  try {
    // Verify user authentication
    const user = await getAuthenticatedUser();
    
    const supabase = await createClient();

    // Don't create a notification if the actor and recipient are the same user
    if (user.id === validatedRecipientId) {
      return createErrorResponse('Cannot create notification for yourself');
    }

    // Create the notification
    const notificationData: NotificationInsert = {
      recipient_id: validatedRecipientId,
      actor_id: user.id,
      type: validatedType as Database["public"]["Enums"]["notification_type"],
      reference_id: validatedReferenceId,
      reference_url: referenceUrl,
    };

    const { data: createdNotification, error: createError } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select('id')
      .single();

    if (createError || !createdNotification) {
      console.error('Failed to create notification:', createError);
      return createErrorResponse(`Failed to create notification: ${createError?.message || 'Unknown error'}`);
    }

    // Revalidate paths that might show notification counts for the recipient
    revalidatePath('/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/educator/dashboard');

    return createIdResponse(createdNotification.id);
  } catch (error) {
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Unexpected error creating notification: ${errorMessage}`);
  }
} 