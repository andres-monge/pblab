"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db.types";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/actions/shared/authorization";
import {
  validateRequiredString,
  validateId,
  validateTeamId
} from "@/lib/shared/validation";
import {
  QueryResult,
  CreateResult,
  UpdateResult,
  createSuccessResponse,
  createIdResponse,
  createMessageResponse,
  createErrorResponse
} from "@/lib/shared/action-types";

type TeamInsert = Database["public"]["Tables"]["teams"]["Insert"];

/**
 * Enhanced team object for admin display
 */
export interface TeamWithDetails {
  id: string;
  name: string;
  course_id: string | null;
  created_at: string;
  course: {
    id: string;
    name: string;
  } | null;
  member_count: number;
  members: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
}

/**
 * Parameters for creating a new team
 */
export interface CreateTeamParams {
  /** Team name */
  name: string;
  /** ID of the course this team belongs to */
  courseId: string;
}

/**
 * Parameters for updating team members
 */
export interface UpdateTeamMembersParams {
  /** ID of the team to update */
  teamId: string;
  /** Array of user IDs to be team members */
  userIds: string[];
}

/**
 * Parameters for deleting a team
 */
export interface DeleteTeamParams {
  /** ID of the team to delete */
  teamId: string;
}

/**
 * Verify admin permissions
 * 
 * Helper function to ensure only admin users can perform admin operations
 */
async function requireAdminPermissions(): Promise<void> {
  const user = await getAuthenticatedUser();
  if (user.role !== 'admin') {
    throw new Error('Admin permissions required for this operation');
  }
}

/**
 * Get all teams in the system with details
 * 
 * Fetches all teams with course information and member counts for admin management.
 * Only accessible by admin users.
 * 
 * @returns Promise resolving to QueryResult with teams array or error
 */
export async function getAllTeams(): Promise<QueryResult<TeamWithDetails[]>> {
  try {
    // Verify admin permissions
    await requireAdminPermissions();
    
    const supabase = await createClient();

    // Fetch all teams with course and member information
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        course_id,
        created_at,
        course:courses(
          id,
          name
        ),
        members:teams_users(
          user:users(
            id,
            name,
            email
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (teamsError) {
      console.error('Failed to fetch teams:', teamsError);
      throw new Error(`Failed to fetch teams: ${teamsError.message}`);
    }

    // Transform data to match our interface
    const transformedTeams: TeamWithDetails[] = (teams || []).map((team) => ({
      id: team.id,
      name: team.name,
      course_id: team.course_id,
      created_at: team.created_at,
      course: team.course ? {
        id: team.course.id,
        name: team.course.name,
      } : null,
      member_count: team.members.length,
      members: team.members.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
      })),
    }));

    return createSuccessResponse(transformedTeams);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error fetching teams: ${errorMessage}`);
  }
}

/**
 * Create a new team
 * 
 * Creates a new team assigned to a specific course.
 * Only accessible by admin users.
 * 
 * @param params - Team creation parameters
 * @returns Promise resolving to CreateResult with team ID or error
 */
export async function createTeam(params: CreateTeamParams): Promise<CreateResult> {
  const { name, courseId } = params;

  // Validate required parameters
  const validatedName = validateRequiredString(name, 'Team name');
  const validatedCourseId = validateId(courseId, 'Course ID');

  try {
    // Verify admin permissions
    await requireAdminPermissions();
    
    const supabase = await createClient();

    // Verify the course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, name')
      .eq('id', validatedCourseId)
      .single();

    if (courseError || !course) {
      return createErrorResponse('Course not found');
    }

    // Check if team name already exists in this course
    const { data: existingTeam, error: checkError } = await supabase
      .from('teams')
      .select('id')
      .eq('name', validatedName)
      .eq('course_id', validatedCourseId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected if team doesn't exist
      console.error('Failed to check existing team:', checkError);
      throw new Error(`Failed to check existing team: ${checkError.message}`);
    }

    if (existingTeam) {
      return createErrorResponse('A team with this name already exists in this course');
    }

    // Create the team
    const teamData: TeamInsert = {
      name: validatedName,
      course_id: validatedCourseId,
    };

    const { data: createdTeam, error: createError } = await supabase
      .from('teams')
      .insert(teamData)
      .select('id')
      .single();

    if (createError || !createdTeam) {
      console.error('Failed to create team:', createError);
      throw new Error(`Failed to create team: ${createError?.message || 'Unknown error'}`);
    }

    // Revalidate admin dashboard to show new team
    revalidatePath('/admin/dashboard');

    return createIdResponse(createdTeam.id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error creating team: ${errorMessage}`);
  }
}

/**
 * Update team members
 * 
 * Replaces all current team members with the specified list of users.
 * Removes existing members and adds new ones as specified.
 * 
 * @param params - Team member update parameters
 * @returns Promise resolving to UpdateResult with success message or error
 */
export async function updateTeamMembers(params: UpdateTeamMembersParams): Promise<UpdateResult> {
  const { teamId, userIds } = params;

  // Validate required parameters
  const validatedTeamId = validateTeamId(teamId);
  
  // Validate user IDs array
  if (!Array.isArray(userIds)) {
    return createErrorResponse('User IDs must be an array');
  }

  // Validate each user ID
  const validatedUserIds = userIds.map((userId, index) => {
    if (!userId || typeof userId !== 'string') {
      throw new Error(`Invalid user ID at position ${index}`);
    }
    return userId;
  });

  try {
    // Verify admin permissions
    await requireAdminPermissions();
    
    const supabase = await createClient();

    // Check if team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', validatedTeamId)
      .single();

    if (teamError || !team) {
      return createErrorResponse('Team not found');
    }

    // Verify all user IDs exist
    if (validatedUserIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .in('id', validatedUserIds);

      if (usersError) {
        console.error('Failed to verify users:', usersError);
        throw new Error(`Failed to verify users: ${usersError.message}`);
      }

      if (!users || users.length !== validatedUserIds.length) {
        return createErrorResponse('One or more user IDs are invalid');
      }
    }

    // Remove all existing team members
    const { error: deleteError } = await supabase
      .from('teams_users')
      .delete()
      .eq('team_id', validatedTeamId);

    if (deleteError) {
      console.error('Failed to remove existing team members:', deleteError);
      throw new Error(`Failed to remove existing team members: ${deleteError.message}`);
    }

    // Add new team members (if any)
    if (validatedUserIds.length > 0) {
      const teamMemberData = validatedUserIds.map(userId => ({
        team_id: validatedTeamId,
        user_id: userId,
      }));

      const { error: insertError } = await supabase
        .from('teams_users')
        .insert(teamMemberData);

      if (insertError) {
        console.error('Failed to add new team members:', insertError);
        throw new Error(`Failed to add new team members: ${insertError.message}`);
      }
    }

    // Revalidate admin dashboard and user dashboards
    revalidatePath('/admin/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');

    const memberCount = validatedUserIds.length;
    return createMessageResponse(`Team membership updated: ${memberCount} member${memberCount !== 1 ? 's' : ''}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error updating team members: ${errorMessage}`);
  }
}

/**
 * Delete a team from the system
 * 
 * Removes a team completely. Database constraints will handle
 * cascading deletes for associated data (team memberships, projects).
 * 
 * @param params - Team deletion parameters
 * @returns Promise resolving to UpdateResult with success message or error
 */
export async function deleteTeam(params: DeleteTeamParams): Promise<UpdateResult> {
  const { teamId } = params;

  // Validate required parameters
  const validatedTeamId = validateTeamId(teamId);

  try {
    // Verify admin permissions
    await requireAdminPermissions();
    
    const supabase = await createClient();

    // Check if team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', validatedTeamId)
      .single();

    if (teamError || !team) {
      return createErrorResponse('Team not found');
    }

    // Check if team has active projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('team_id', validatedTeamId)
      .limit(1);

    if (projectsError) {
      console.error('Failed to check team projects:', projectsError);
      throw new Error(`Failed to check team projects: ${projectsError.message}`);
    }

    if (projects && projects.length > 0) {
      return createErrorResponse('Cannot delete team with active projects. Please close all projects first.');
    }

    // Delete the team (this will cascade to teams_users)
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', validatedTeamId);

    if (deleteError) {
      console.error('Failed to delete team:', deleteError);
      throw new Error(`Failed to delete team: ${deleteError.message}`);
    }

    // Revalidate admin dashboard and user dashboards
    revalidatePath('/admin/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');

    return createMessageResponse(`Team "${team.name}" deleted successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error deleting team: ${errorMessage}`);
  }
}