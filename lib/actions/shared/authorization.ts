"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db.types";
import { 
  hasEducatorPermissions, 
  hasAdminPermissions
} from "@/lib/shared/authorization-utils";

type UserRole = Database["public"]["Enums"]["user_role"];
type ProjectPhase = Database["public"]["Enums"]["project_phase"];

/**
 * Authentication and authorization helper utilities
 * 
 * This module provides reusable functions for common authorization patterns
 * across server actions to reduce code duplication and improve maintainability.
 */

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

export interface ProjectDetails {
  id: string;
  team_id: string;
  phase: ProjectPhase;
  course_id?: string | null;
}

/**
 * Verify user is authenticated and get their role
 * 
 * @returns Promise resolving to authenticated user with role
 * @throws Error if user is not authenticated or role cannot be determined
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  // Create authenticated Supabase client
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User must be authenticated to perform this action');
  }

  // Get user role
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    throw new Error('Failed to verify user permissions');
  }

  return {
    id: user.id,
    role: userData.role
  };
}

/**
 * Verify user has permission to access a specific project
 * 
 * @param projectId - ID of the project to check access for
 * @param userId - ID of the user requesting access
 * @param userRole - Role of the user requesting access
 * @returns Promise resolving to project details if access is granted
 * @throws Error if project not found or user lacks permission
 */
export async function verifyProjectAccess(
  projectId: string, 
  userId: string, 
  userRole: UserRole
): Promise<ProjectDetails> {
  const supabase = await createClient();

  // Get project with team and course info
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(`
      id,
      team_id,
      phase,
      teams!inner(
        id,
        course_id
      )
    `)
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    throw new Error('Project not found or you do not have permission to access it');
  }

  // For students, verify team membership
  if (userRole === 'student') {
    const { data: membership, error: membershipError } = await supabase
      .from('teams_users')
      .select('team_id')
      .eq('team_id', project.team_id)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      throw new Error('You can only access projects of teams you belong to');
    }
  }
  // For educators and admins, RLS policies handle access control

  return {
    id: project.id,
    team_id: project.team_id,
    phase: project.phase,
    course_id: project.teams.course_id
  };
}

/**
 * Verify user is a member of a specific team
 * 
 * @param teamId - ID of the team to check membership for
 * @param userId - ID of the user to check
 * @returns Promise resolving to true if user is team member
 * @throws Error if user is not a team member or verification fails
 */
export async function verifyTeamMembership(teamId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { data: membership, error: membershipError } = await supabase
    .from('teams_users')
    .select('team_id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (membershipError || !membership) {
    throw new Error('You can only perform this action on teams you belong to');
  }
}


/**
 * Combined authorization check for artifact operations
 * 
 * Verifies user can perform operations on artifacts based on role and ownership.
 * Students can only operate on their own artifacts in their team projects.
 * Educators can operate on any artifacts in their courses.
 * Admins can operate on any artifacts.
 * 
 * @param userId - ID of the user requesting access
 * @param userRole - Role of the user
 * @param artifactUploaderId - ID of the user who uploaded the artifact
 * @param projectTeamId - ID of the team that owns the project
 * @param requireOwnership - If true, students must be the artifact owner
 * @returns Promise resolving if access is granted
 * @throws Error if user lacks permission
 */
export async function verifyArtifactPermissions(
  userId: string,
  userRole: UserRole,
  artifactUploaderId: string,
  projectTeamId: string,
  requireOwnership: boolean = false
): Promise<void> {
  if (hasAdminPermissions(userRole)) {
    // Admins can access any artifact
    return;
  }

  if (hasEducatorPermissions(userRole)) {
    // Educators can access artifacts from projects in their courses (RLS handles this)
    return;
  }

  if (userRole === 'student') {
    // For operations requiring ownership (like delete), check if user owns the artifact
    if (requireOwnership && artifactUploaderId !== userId) {
      throw new Error('You can only perform this action on artifacts you uploaded');
    }

    // Verify student is a member of the project's team
    await verifyTeamMembership(projectTeamId, userId);
    return;
  }

  throw new Error('Insufficient permissions to perform this action');
}