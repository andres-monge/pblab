"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db.types";

/**
 * Parameters for logging AI usage interactions
 */
export interface LogAiUsageParams {
  /** ID of the user who triggered the AI interaction */
  userId: string;
  /** Optional project ID for context (null for general AI usage) */
  projectId?: string | null;
  /** Feature identifier (e.g., 'tutor', 'assessment') */
  feature: string;
  /** User's prompt/input sent to the AI (stored as JSONB) */
  prompt?: Json | null;
  /** AI's response/output (stored as JSONB) */
  response?: Json | null;
}

/**
 * Centralized AI usage logging helper
 * 
 * Records AI interactions in the ai_usage table for audit trails and analytics.
 * Used by AI Tutor chat and AI Assessment features.
 * 
 * @param params - AI usage parameters
 * @returns Promise resolving to the created ai_usage record ID
 * @throws Error if user is not authenticated or database operation fails
 */
export async function logAiUsage(params: LogAiUsageParams): Promise<string> {
  const { userId, projectId = null, feature, prompt = null, response = null } = params;

  // Validate required parameters
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId is required and must be a valid string');
  }

  if (!feature || typeof feature !== 'string') {
    throw new Error('feature is required and must be a valid string (e.g., "tutor", "assessment")');
  }

  try {
    // Create authenticated Supabase client
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to log AI usage');
    }

    // Additional security check: ensure the userId matches the authenticated user
    if (user.id !== userId) {
      throw new Error('userId must match the authenticated user');
    }

    // Insert AI usage record
    const { data, error } = await supabase
      .from('ai_usage')
      .insert({
        user_id: userId,
        project_id: projectId,
        feature,
        prompt,
        response,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log AI usage:', error);
      throw new Error(`Failed to log AI usage: ${error.message}`);
    }

    if (!data?.id) {
      throw new Error('Failed to create AI usage record - no ID returned');
    }

    return data.id;
  } catch (error) {
    // Re-throw with context if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected error types
    throw new Error(`Unexpected error logging AI usage: ${String(error)}`);
  }
} 