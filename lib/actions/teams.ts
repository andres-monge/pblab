"use server";

import { createClient } from "@/lib/supabase/server";
import jwt from "jsonwebtoken";
import type { Database } from "@/lib/db.types";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/actions/shared/authorization";
import { requireProjectCreationPermissions } from "@/lib/shared/authorization-utils";
import {
  UpdateResult,
  TokenResult,
  QueryResult,
  createMessageResponse,
  createTokenResponse,
  createSuccessResponse,
  createErrorResponse
} from "@/lib/shared/action-types";

type TeamsUser = Database["public"]["Tables"]["teams_users"]["Insert"];

/**
 * Parameters for joining a team
 */
export interface JoinTeamParams {
  /** ID of the team to join */
  teamId: string;
}

/**
 * Parameters for generating an invite token
 */
export interface GenerateInviteTokenParams {
  /** ID of the team to create invite for */
  teamId: string;
}

/**
 * Decoded JWT token payload for team invites
 */
export interface InviteTokenPayload {
  /** Team ID to join */
  teamId: string;
  /** Token expiration timestamp */
  exp: number;
  /** Token issued at timestamp */
  iat: number;
}

/**
 * Join a team via team ID
 * 
 * Adds the authenticated user to the specified team if they have permission
 * and are not already a member.
 * 
 * @param params - Team joining parameters
 * @returns Promise resolving to UpdateResult with success message or error
 */
export async function joinTeam(params: JoinTeamParams): Promise<UpdateResult> {
  const { teamId } = params;

  // Validate required parameters
  if (!teamId || typeof teamId !== 'string') {
    return createErrorResponse('teamId is required and must be a valid string');
  }

  try {
    // Verify user authentication
    const user = await getAuthenticatedUser();
    
    const supabase = await createClient();

    // Check if team exists and get team info
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, course_id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return createErrorResponse('Team not found or you do not have permission to view it');
    }

    // Check if user is already a member of this team
    const { data: existingMembership, error: membershipCheckError } = await supabase
      .from('teams_users')
      .select('team_id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (membershipCheckError && membershipCheckError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected if user is not a member
      return createErrorResponse(`Failed to check team membership: ${membershipCheckError.message}`);
    }

    if (existingMembership) {
      return createErrorResponse('You are already a member of this team');
    }

    // Add user to team
    const teamUserData: TeamsUser = {
      team_id: teamId,
      user_id: user.id,
    };

    const { error: insertError } = await supabase
      .from('teams_users')
      .insert(teamUserData);

    if (insertError) {
      console.error('Failed to join team:', insertError);
      return createErrorResponse(`Failed to join team: ${insertError.message}`);
    }

    // Revalidate student dashboard to show new team/projects
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');

    return createMessageResponse(`Successfully joined team: ${team.name}`);
  } catch (error) {
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Unexpected error joining team: ${errorMessage}`);
  }
}

/**
 * Generate a secure JWT invite token for a team
 * 
 * Creates a short-lived (24 hour) JWT token containing the team ID
 * that can be used in invite links.
 * 
 * @param params - Token generation parameters
 * @returns Promise resolving to TokenResult with JWT token or error
 */
export async function generateInviteToken(params: GenerateInviteTokenParams): Promise<TokenResult> {
  const { teamId } = params;

  // Validate required parameters
  if (!teamId || typeof teamId !== 'string') {
    return createErrorResponse('teamId is required and must be a valid string');
  }

  try {
    // Verify user authentication and permissions
    const user = await getAuthenticatedUser();
    requireProjectCreationPermissions(user.role);
    
    const supabase = await createClient();

    // Verify the team exists and user has access (RLS will handle permissions)
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return createErrorResponse('Team not found or you do not have permission to manage it');
    }

    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not set');
      return createErrorResponse('Server configuration error: Unable to generate invite token');
    }

    // Create JWT payload
    const payload: Omit<InviteTokenPayload, 'exp' | 'iat'> = {
      teamId: teamId,
    };

    // Generate JWT token with 24-hour expiration
    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: '24h',
      issuer: 'pblab',
      audience: 'team-invite'
    });

    return createTokenResponse(token);
  } catch (error) {
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Unexpected error generating invite token: ${errorMessage}`);
  }
}

/**
 * Verify and decode a team invite JWT token
 * 
 * Validates the token signature, expiration, and returns the team ID
 * if the token is valid.
 * 
 * @param token - JWT token string to verify
 * @returns Promise resolving to QueryResult with decoded token payload or error
 */
export async function verifyInviteToken(token: string): Promise<QueryResult<InviteTokenPayload>> {
  // Validate required parameters
  if (!token || typeof token !== 'string') {
    return createErrorResponse('Token is required and must be a valid string');
  }

  try {
    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not set');
      return createErrorResponse('Server configuration error: Unable to verify invite token');
    }

    // Verify and decode JWT token
    const decoded = jwt.verify(token, jwtSecret, {
      issuer: 'pblab',
      audience: 'team-invite'
    }) as InviteTokenPayload;

    // Validate decoded payload structure
    if (!decoded.teamId || typeof decoded.teamId !== 'string') {
      return createErrorResponse('Invalid token payload: missing or invalid teamId');
    }

    if (!decoded.exp || typeof decoded.exp !== 'number') {
      return createErrorResponse('Invalid token payload: missing or invalid expiration');
    }

    // Additional verification: ensure team still exists
    const supabase = await createClient();
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', decoded.teamId)
      .single();

    if (teamError || !team) {
      return createErrorResponse('This invite link is no longer valid - the team may have been deleted');
    }

    return createSuccessResponse(decoded);
  } catch (error) {
    // Handle specific JWT errors with user-friendly messages
    if (error instanceof jwt.TokenExpiredError) {
      return createErrorResponse('This invite link has expired. Please request a new invitation.');
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return createErrorResponse('This invite link is invalid or has been tampered with.');
    }

    if (error instanceof jwt.NotBeforeError) {
      return createErrorResponse('This invite link is not yet valid.');
    }

    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Unexpected error verifying invite token: ${errorMessage}`);
  }
} 