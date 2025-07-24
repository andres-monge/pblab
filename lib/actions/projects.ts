"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db.types";
import { revalidatePath } from "next/cache";
import {
  getAuthenticatedUser,
  verifyProjectAccess
} from "@/lib/actions/shared/authorization";
import {
  requireProjectCreationPermissions,
  requireProjectClosePermissions,
  validateProjectNotClosed,
  hasEducatorPermissions
} from "@/lib/shared/authorization-utils";
import {
  validateId,
  validateProjectId,
  validateTeamId,
  validateEnum,
  validateUrl,
  validateRequiredString,
  validateOptionalString
} from "@/lib/shared/validation";

type Project = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectPhase = Database["public"]["Enums"]["project_phase"];

/**
 * Parameters for creating a new project
 */
export interface CreateProjectParams {
  /** ID of the problem this project is based on */
  problemId: string;
  /** ID of the team working on this project */
  teamId: string;
}

/**
 * Parameters for updating project phase
 */
export interface UpdateProjectPhaseParams {
  /** ID of the project to update */
  projectId: string;
  /** New phase to transition to */
  newPhase: ProjectPhase;
}

/**
 * Parameters for updating project report URL
 */
export interface UpdateProjectReportParams {
  /** ID of the project to update */
  projectId: string;
  /** URL to the final report */
  reportUrl: string;
}

/**
 * Parameters for updating project report content
 */
export interface UpdateProjectReportContentParams {
  /** ID of the project to update */
  projectId: string;
  /** URL to the final report */
  reportUrl: string;
  /** Cached plain text content from the report */
  reportContent: string;
}

/**
 * Parameters for updating project learning goals
 */
export interface UpdateProjectLearningGoalsParams {
  /** ID of the project to update */
  projectId: string;
  /** Learning goals text content */
  goals: string;
}

/**
 * Create a new project instance for a team and problem
 * 
 * Associates a team with a specific problem, creating a project
 * that tracks their progress through the PBL workflow phases.
 * 
 * @param params - Project creation parameters
 * @returns Promise resolving to the created project ID
 * @throws Error if user is not authenticated, not an educator, or invalid parameters
 */
export async function createProject(params: CreateProjectParams): Promise<string> {
  const { problemId, teamId } = params;

  // Validate required parameters
  const validatedProblemId = validateId(problemId, 'Problem ID');
  const validatedTeamId = validateTeamId(teamId);

  try {
    // Verify user authentication and permissions
    const user = await getAuthenticatedUser();
    requireProjectCreationPermissions(user.role);

    const supabase = await createClient();

    // Verify the problem exists and user has access (RLS will handle permissions)
    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .select('id, title, course_id')
      .eq('id', validatedProblemId)
      .single();

    if (problemError || !problem) {
      throw new Error('Problem not found or you do not have permission to use it');
    }

    // Verify the team exists and is in the same course as the problem
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, course_id')
      .eq('id', validatedTeamId)
      .single();

    if (teamError || !team) {
      throw new Error('Team not found or you do not have permission to manage it');
    }

    // Ensure team and problem are in the same course
    if (team.course_id !== problem.course_id) {
      throw new Error('Team and problem must be in the same course');
    }

    // Check if a project already exists for this team and problem
    const { data: existingProject, error: existingError } = await supabase
      .from('projects')
      .select('id')
      .eq('problem_id', validatedProblemId)
      .eq('team_id', validatedTeamId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected if no project exists
      throw new Error(`Failed to check for existing project: ${existingError.message}`);
    }

    if (existingProject) {
      throw new Error('A project already exists for this team and problem combination');
    }

    // Create the project
    const projectData: Project = {
      problem_id: validatedProblemId,
      team_id: validatedTeamId,
      phase: 'pre', // Start in pre-discussion phase
    };

    const { data: createdProject, error: projectCreateError } = await supabase
      .from('projects')
      .insert(projectData)
      .select('id')
      .single();

    if (projectCreateError || !createdProject) {
      console.error('Failed to create project:', projectCreateError);
      throw new Error(`Failed to create project: ${projectCreateError?.message || 'Unknown error'}`);
    }

    // Revalidate relevant paths to show new project
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');

    return createdProject.id;
  } catch (error) {
    // Re-throw with context if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected error types
    throw new Error(`Unexpected error creating project: ${String(error)}`);
  }
}

/**
 * Update a project's phase in the PBL workflow
 * 
 * Handles phase transitions with proper authorization checks.
 * Students can advance phases, but only educators can close projects.
 * 
 * @param params - Project phase update parameters
 * @returns Promise resolving to success message
 * @throws Error if user is not authenticated, lacks permission, or invalid transition
 */
export async function updateProjectPhase(params: UpdateProjectPhaseParams): Promise<string> {
  const { projectId, newPhase } = params;

  // Validate required parameters
  const validatedProjectId = validateProjectId(projectId);
  const validatedPhase = validateEnum(newPhase, 'New phase', ['pre', 'research', 'post', 'closed'] as const);

  try {
    // Verify user authentication and get project details
    const user = await getAuthenticatedUser();
    const project = await verifyProjectAccess(validatedProjectId, user.id, user.role);

    const supabase = await createClient();

    // Authorization logic based on user role and phase transition
    if (validatedPhase === 'closed') {
      requireProjectClosePermissions(user.role);
    }
    // Note: Project access verification already handled by verifyProjectAccess helper

    // Validate phase transition logic
    const currentPhase = project.phase as ProjectPhase;
    const phaseOrder: ProjectPhase[] = ['pre', 'research', 'post', 'closed'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    const newIndex = phaseOrder.indexOf(validatedPhase);

    // Allow backward transitions for educators/admins, but students can only advance
    if (!hasEducatorPermissions(user.role) && newIndex <= currentIndex) {
      throw new Error('Students can only advance to the next phase in the workflow');
    }

    // Prevent invalid transitions (e.g., skipping phases)
    if (!hasEducatorPermissions(user.role) && newIndex > currentIndex + 1) {
      throw new Error('Cannot skip phases. Please advance one phase at a time.');
    }

    // Update the project phase
    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        phase: validatedPhase,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validatedProjectId);

    if (updateError) {
      console.error('Failed to update project phase:', updateError);
      throw new Error(`Failed to update project phase: ${updateError.message}`);
    }

    // Revalidate relevant paths to reflect phase change
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');
    revalidatePath(`/p/${validatedProjectId}`);

    return `Project phase updated to: ${validatedPhase}`;
  } catch (error) {
    // Re-throw with context if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected error types
    throw new Error(`Unexpected error updating project phase: ${String(error)}`);
  }
}

/**
 * Update a project's final report URL
 * 
 * Sets the final report URL when students submit their deliverable.
 * Automatically transitions project to 'post' phase if still in 'research'.
 * 
 * @param params - Project report URL parameters
 * @returns Promise resolving to success message
 * @throws Error if user is not authenticated or lacks permission
 */
export async function updateProjectReportUrl(params: UpdateProjectReportParams): Promise<string> {
  const { projectId, reportUrl } = params;

  // Validate required parameters
  const validatedProjectId = validateProjectId(projectId);
  const validatedReportUrl = validateUrl(reportUrl, 'Report URL');

  try {
    // Verify user authentication and project access
    const user = await getAuthenticatedUser();
    const project = await verifyProjectAccess(validatedProjectId, user.id, user.role);

    const supabase = await createClient();

    // Update the project with report URL and potentially advance phase
    const updateData: Partial<Project> = {
      final_report_url: validatedReportUrl,
      updated_at: new Date().toISOString(),
    };

    // If project is still in research phase, advance to post phase
    if (project.phase === 'research') {
      updateData.phase = 'post';
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', validatedProjectId);

    if (updateError) {
      console.error('Failed to update project report URL:', updateError);
      throw new Error(`Failed to update project report URL: ${updateError.message}`);
    }

    // Revalidate relevant paths
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');
    revalidatePath(`/p/${validatedProjectId}`);

    const phaseMessage = project.phase === 'research' ? ' and advanced to post-discussion phase' : '';
    return `Final report URL updated successfully${phaseMessage}`;
  } catch (error) {
    // Re-throw with context if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected error types
    throw new Error(`Unexpected error updating project report URL: ${String(error)}`);
  }
}

/**
 * Update both project report URL and cached content
 * 
 * Sets the final report URL and caches the plain text content
 * for AI assessment purposes. Used by Google Drive integration.
 * 
 * @param params - Project report content parameters
 * @returns Promise resolving to success message
 * @throws Error if user is not authenticated or lacks permission
 */
export async function updateProjectReportContent(params: UpdateProjectReportContentParams): Promise<string> {
  const { projectId, reportUrl, reportContent } = params;

  // Validate required parameters
  const validatedProjectId = validateProjectId(projectId);
  const validatedReportUrl = validateUrl(reportUrl, 'Report URL');
  const validatedReportContent = validateRequiredString(reportContent, 'Report content');

  try {
    // Verify user authentication and project access
    const user = await getAuthenticatedUser();
    const project = await verifyProjectAccess(validatedProjectId, user.id, user.role);

    const supabase = await createClient();

    // Update the project with both URL and content
    const updateData: Partial<Project> = {
      final_report_url: validatedReportUrl,
      final_report_content: validatedReportContent,
      updated_at: new Date().toISOString(),
    };

    // If project is still in research phase, advance to post phase
    if (project.phase === 'research') {
      updateData.phase = 'post';
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', validatedProjectId);

    if (updateError) {
      console.error('Failed to update project report content:', updateError);
      throw new Error(`Failed to update project report content: ${updateError.message}`);
    }

    // Revalidate relevant paths
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');
    revalidatePath(`/p/${validatedProjectId}`);

    const phaseMessage = project.phase === 'research' ? ' and advanced to post-discussion phase' : '';
    return `Final report submitted successfully${phaseMessage}. Content cached for assessment.`;
  } catch (error) {
    // Re-throw with context if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected error types
    throw new Error(`Unexpected error updating project report content: ${String(error)}`);
  }
}

/**
 * Update project learning goals
 * 
 * Allows students to define and save learning goals during the 'pre' phase
 * of the PBL workflow. Learning goals help students focus their research
 * and provide context for AI assistance.
 * 
 * @param params - Project learning goals parameters
 * @returns Promise resolving to success message
 * @throws Error if user is not authenticated or lacks permission
 */
export async function updateProjectLearningGoals(params: UpdateProjectLearningGoalsParams): Promise<string> {
  const { projectId, goals } = params;

  // Validate required parameters
  const validatedProjectId = validateProjectId(projectId);
  const validatedGoals = validateOptionalString(goals, 'Learning goals');

  try {
    // Verify user authentication and project access
    const user = await getAuthenticatedUser();
    const project = await verifyProjectAccess(validatedProjectId, user.id, user.role);
    
    // Check if project is closed (prevent editing goals in closed projects)
    validateProjectNotClosed(project.phase, 'update learning goals');

    const supabase = await createClient();

    // Update the project learning goals
    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        learning_goals: validatedGoals, // validateOptionalString returns null for empty
        updated_at: new Date().toISOString(),
      })
      .eq('id', validatedProjectId);

    if (updateError) {
      console.error('Failed to update project learning goals:', updateError);
      throw new Error(`Failed to update project learning goals: ${updateError.message}`);
    }

    // Revalidate relevant paths to reflect learning goals change
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');
    revalidatePath(`/p/${validatedProjectId}`);

    return validatedGoals ? 'Learning goals updated successfully' : 'Learning goals cleared successfully';
  } catch (error) {
    // Re-throw with context if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected error types
    throw new Error(`Unexpected error updating project learning goals: ${String(error)}`);
  }
} 