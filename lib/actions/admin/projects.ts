"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db.types";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/actions/shared/authorization";
import { validateId } from "@/lib/shared/validation";
import {
  QueryResult,
  UpdateResult,
  createSuccessResponse,
  createMessageResponse,
  createErrorResponse
} from "@/lib/shared/action-types";

type ProjectPhase = Database["public"]["Enums"]["project_phase"];

/**
 * Enhanced project object for admin display
 */
export interface ProjectWithDetails {
  id: string;
  phase: ProjectPhase;
  learning_goals: string | null;
  final_report_url: string | null;
  created_at: string;
  updated_at: string;
  team: {
    id: string;
    name: string;
    course: {
      id: string;
      name: string;
    };
  };
  problem: {
    id: string;
    title: string;
  };
}

/**
 * Parameters for deleting a project
 */
export interface DeleteProjectParams {
  /** ID of the project to delete */
  projectId: string;
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
 * Get all projects in the system with details
 * 
 * Fetches all projects with team, course, and problem information for admin management.
 * Only accessible by admin users.
 * 
 * @returns Promise resolving to QueryResult with projects array or error
 */
export async function getAllProjects(): Promise<QueryResult<ProjectWithDetails[]>> {
  try {
    // Verify admin permissions
    await requireAdminPermissions();
    
    const supabase = await createClient();

    // Fetch all projects with team, course, and problem information
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        phase,
        learning_goals,
        final_report_url,
        created_at,
        updated_at,
        team:teams(
          id,
          name,
          course:courses(
            id,
            name
          )
        ),
        problem:problems(
          id,
          title
        )
      `)
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Failed to fetch projects:', projectsError);
      throw new Error(`Failed to fetch projects: ${projectsError.message}`);
    }

    // Transform data to match our interface
    const transformedProjects: ProjectWithDetails[] = (projects || []).map((project) => ({
      id: project.id,
      phase: project.phase,
      learning_goals: project.learning_goals,
      final_report_url: project.final_report_url,
      created_at: project.created_at,
      updated_at: project.updated_at,
      team: {
        id: project.team.id,
        name: project.team.name,
        course: {
          id: project.team.course?.id || '',
          name: project.team.course?.name || 'Unknown Course',
        },
      },
      problem: {
        id: project.problem.id,
        title: project.problem.title,
      },
    }));

    return createSuccessResponse(transformedProjects);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error fetching projects: ${errorMessage}`);
  }
}

/**
 * Delete a project from the system
 * 
 * Removes a project completely. Database constraints will handle
 * cascading deletes for associated data (artifacts, comments, assessments).
 * 
 * @param params - Project deletion parameters
 * @returns Promise resolving to UpdateResult with success message or error
 */
export async function deleteProject(params: DeleteProjectParams): Promise<UpdateResult> {
  const { projectId } = params;

  // Validate required parameters
  const validatedProjectId = validateId(projectId, 'Project ID');

  try {
    // Verify admin permissions
    await requireAdminPermissions();
    
    const supabase = await createClient();

    // Check if project exists and get details for success message
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        team:teams(name),
        problem:problems(title)
      `)
      .eq('id', validatedProjectId)
      .single();

    if (projectError || !project) {
      return createErrorResponse('Project not found');
    }

    // Delete the project (cascading deletes will handle associated data)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', validatedProjectId);

    if (deleteError) {
      console.error('Failed to delete project:', deleteError);
      throw new Error(`Failed to delete project: ${deleteError.message}`);
    }

    // Revalidate admin dashboard and related pages
    revalidatePath('/admin/dashboard');
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');

    return createMessageResponse(`Project for team "${project.team.name}" deleted successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error deleting project: ${errorMessage}`);
  }
}