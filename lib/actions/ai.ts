"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db.types";
import { getAuthenticatedUser } from "@/lib/actions/shared/authorization";
import { CreateResult, createIdResponse, createErrorResponse } from "@/lib/shared/action-types";
import { 
  isPBLabError, 
  getUserMessage, 
  getTechnicalDetails,
  ValidationError,
  AuthorizationError,
  DatabaseError 
} from "@/lib/shared/errors";

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
 * @returns Promise resolving to CreateResult with ai_usage record ID or error
 */
export async function logAiUsage(params: LogAiUsageParams): Promise<CreateResult> {
  const { userId, projectId = null, feature, prompt = null, response = null } = params;

  // Validate required parameters
  if (!userId || typeof userId !== 'string') {
    throw new ValidationError('User ID', 'is required and must be a valid string', userId);
  }

  if (!feature || typeof feature !== 'string') {
    throw new ValidationError('Feature', 'is required and must be a valid string (e.g., "tutor", "assessment")', feature);
  }

  try {
    // Verify user authentication
    const user = await getAuthenticatedUser();
    
    const supabase = await createClient();

    // Additional security check: ensure the userId matches the authenticated user
    if (user.id !== userId) {
      throw new AuthorizationError(
        'log_ai_usage',
        'User ID must match authenticated user',
        user.role,
        { providedUserId: userId, authenticatedUserId: user.id }
      );
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
      throw new DatabaseError(
        'log_ai_usage',
        error.message,
        new Error(error.message),
        { userId, projectId, feature }
      );
    }

    if (!data?.id) {
      throw new DatabaseError(
        'log_ai_usage',
        'No ID returned from AI usage record creation',
        undefined,
        { userId, projectId, feature, data }
      );
    }

    return createIdResponse(data.id);
  } catch (error) {
    // Handle structured errors and convert to user-friendly responses
    if (isPBLabError(error)) {
      console.error('AI usage logging error:', getTechnicalDetails(error));
      return createErrorResponse(getUserMessage(error));
    }
    
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected AI usage logging error:', error);
    return createErrorResponse(`Unexpected error logging AI usage: ${errorMessage}`);
  }
} 