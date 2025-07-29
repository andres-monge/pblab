"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db.types";
import { getAuthenticatedUser } from "@/lib/actions/shared/authorization";
import { CreateResult, createIdResponse, createErrorResponse, QueryResult, createSuccessResponse } from "@/lib/shared/action-types";
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

/**
 * AI conversation message with user information
 */
export interface AiConversationMessage {
  id: string;
  message: string;
  response: string | null;
  created_at: string;
  user_id: string;
  user_name: string;
  is_ai: boolean;
}

/**
 * Parameters for fetching AI tutor conversation history
 */
export interface GetAiTutorHistoryParams {
  /** Project ID to fetch conversation for */
  projectId: string;
  /** Number of messages to skip (for pagination) */
  offset?: number;
  /** Maximum number of messages to return (default: 10) */
  limit?: number;
}

/**
 * Fetch AI tutor conversation history for a project with pagination
 * 
 * Returns conversation history with user information for display in the chat UI.
 * Includes both user messages and AI responses with proper attribution.
 * 
 * @param params - History fetch parameters
 * @returns Promise resolving to QueryResult with conversation messages or error
 */
export async function getAiTutorHistory(params: GetAiTutorHistoryParams): Promise<QueryResult<AiConversationMessage[]>> {
  const { projectId, offset = 0, limit = 10 } = params;

  // Validate required parameters
  if (!projectId || typeof projectId !== 'string') {
    throw new ValidationError('Project ID', 'is required and must be a valid string', projectId);
  }

  if (offset < 0) {
    throw new ValidationError('Offset', 'must be a non-negative number', offset);
  }

  if (limit < 1 || limit > 50) {
    throw new ValidationError('Limit', 'must be between 1 and 50', limit);
  }

  try {
    // Verify user authentication
    const user = await getAuthenticatedUser();
    
    const supabase = await createClient();

    // Verify user has access to the project (RLS will handle this)
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, team_id')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      throw new AuthorizationError(
        'get_ai_tutor_history',
        'Project not found or access denied',
        user.role,
        { projectId, userId: user.id }
      );
    }

    // Fetch conversation history with user information (newest first, then reverse for display)
    const { data: conversationData, error: conversationError } = await supabase
      .from('ai_usage')
      .select(`
        id,
        prompt,
        response,
        created_at,
        user_id,
        users!ai_usage_user_id_fkey (
          name
        )
      `)
      .eq('project_id', projectId)
      .eq('feature', 'tutor')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (conversationError) {
      throw new DatabaseError(
        'get_ai_tutor_history',
        conversationError.message,
        new Error(conversationError.message),
        { projectId, offset, limit }
      );
    }

    // Transform the data into chat messages format
    const messages: AiConversationMessage[] = [];
    
    if (conversationData) {
      for (const entry of conversationData) {
        // Extract user message
        const userMessage = typeof entry.prompt === 'string' 
          ? entry.prompt 
          : (entry.prompt as Record<string, unknown>)?.message as string;

        // Extract AI response
        const aiResponse = typeof entry.response === 'string'
          ? entry.response
          : (entry.response as Record<string, unknown>)?.text as string;

        // Get user name from the joined users table
        const userName = (entry.users as { name: string })?.name || 'Unknown User';

        if (userMessage) {
          // Add user message
          messages.push({
            id: `${entry.id}-user`,
            message: userMessage,
            response: null,
            created_at: entry.created_at,
            user_id: entry.user_id,
            user_name: userName,
            is_ai: false
          });

          // Add AI response if it exists (same timestamp, will be sorted after user message)
          if (aiResponse) {
            messages.push({
              id: `${entry.id}-ai`,
              message: aiResponse,
              response: null,
              created_at: entry.created_at,
              user_id: 'ai',
              user_name: 'AI PBL Tutor',
              is_ai: true
            });
          }
        }
      }
    }

    // Simple, bulletproof sorting: first by created_at, then by is_ai
    // This ensures user messages always come before AI responses for same timestamp
    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      
      // Earlier timestamps first
      const timeDiff = timeA - timeB;
      if (timeDiff !== 0) return timeDiff;
      
      // For same timestamp: user beats AI (false < true in JS)
      return a.is_ai ? 1 : -1;
    });

    return createSuccessResponse(sortedMessages);

  } catch (error) {
    // Handle structured errors and convert to user-friendly responses
    if (isPBLabError(error)) {
      console.error('AI tutor history fetch error:', getTechnicalDetails(error));
      return createErrorResponse(getUserMessage(error));
    }
    
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected AI tutor history fetch error:', error);
    return createErrorResponse(`Failed to load conversation history: ${errorMessage}`);
  }
}