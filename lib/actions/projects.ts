"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db.types";
import { revalidatePath } from "next/cache";

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
  if (!problemId || typeof problemId !== 'string') {
    throw new Error('Problem ID is required and must be a valid string');
  }

  if (!teamId || typeof teamId !== 'string') {
    throw new Error('Team ID is required and must be a valid string');
  }

  try {
    // Create authenticated Supabase client
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to create projects');
    }

    // Get user role and verify they can create projects
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('Failed to verify user permissions');
    }

    // Only educators and admins can create projects
    if (userData.role !== 'educator' && userData.role !== 'admin') {
      throw new Error('Only educators and administrators can create projects');
    }

    // Verify the problem exists and user has access (RLS will handle permissions)
    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .select('id, title, course_id')
      .eq('id', problemId)
      .single();

    if (problemError || !problem) {
      throw new Error('Problem not found or you do not have permission to use it');
    }

    // Verify the team exists and is in the same course as the problem
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, course_id')
      .eq('id', teamId)
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
      .eq('problem_id', problemId)
      .eq('team_id', teamId)
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
      problem_id: problemId,
      team_id: teamId,
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
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Project ID is required and must be a valid string');
  }

  if (!newPhase || typeof newPhase !== 'string') {
    throw new Error('New phase is required and must be a valid string');
  }

  // Validate phase value
  const validPhases: ProjectPhase[] = ['pre', 'research', 'post', 'closed'];
  if (!validPhases.includes(newPhase)) {
    throw new Error(`Invalid phase. Must be one of: ${validPhases.join(', ')}`);
  }

  try {
    // Create authenticated Supabase client
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to update project phases');
    }

    // Get user role for authorization checks
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('Failed to verify user permissions');
    }

    // Get current project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        phase,
        team_id,
        problem_id,
        teams!inner(id, course_id),
        problems!inner(id, course_id)
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or you do not have permission to access it');
    }

    // Authorization logic based on user role and phase transition
    if (newPhase === 'closed') {
      // Only educators and admins can close projects
      if (userData.role !== 'educator' && userData.role !== 'admin') {
        throw new Error('Only educators and administrators can close projects');
      }
    } else {
      // For other phase transitions, check if user is team member (for students) or educator (for any project in their courses)
      if (userData.role === 'student') {
        // Verify student is a member of this project's team
        const { data: membership, error: membershipError } = await supabase
          .from('teams_users')
          .select('team_id')
          .eq('team_id', project.team_id)
          .eq('user_id', user.id)
          .single();

        if (membershipError || !membership) {
          throw new Error('You can only update phases for projects of teams you belong to');
        }
      } else if (userData.role === 'educator') {
        // RLS policies should handle educator access to their course projects
        // If we got the project data, the educator has access
      } else if (userData.role !== 'admin') {
        throw new Error('Insufficient permissions to update this project phase');
      }
    }

    // Validate phase transition logic
    const currentPhase = project.phase as ProjectPhase;
    const phaseOrder: ProjectPhase[] = ['pre', 'research', 'post', 'closed'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    const newIndex = phaseOrder.indexOf(newPhase);

    // Allow backward transitions for educators/admins, but students can only advance
    if (userData.role === 'student' && newIndex <= currentIndex) {
      throw new Error('Students can only advance to the next phase in the workflow');
    }

    // Prevent invalid transitions (e.g., skipping phases)
    if (userData.role === 'student' && newIndex > currentIndex + 1) {
      throw new Error('Cannot skip phases. Please advance one phase at a time.');
    }

    // Update the project phase
    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        phase: newPhase,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Failed to update project phase:', updateError);
      throw new Error(`Failed to update project phase: ${updateError.message}`);
    }

    // Revalidate relevant paths to reflect phase change
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');
    revalidatePath(`/p/${projectId}`);

    return `Project phase updated to: ${newPhase}`;
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
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Project ID is required and must be a valid string');
  }

  if (!reportUrl || typeof reportUrl !== 'string' || reportUrl.trim().length === 0) {
    throw new Error('Report URL is required and cannot be empty');
  }

  // Basic URL validation
  try {
    new URL(reportUrl);
  } catch {
    throw new Error('Report URL must be a valid URL');
  }

  try {
    // Create authenticated Supabase client
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to update project reports');
    }

    // Get project and verify access (RLS will handle permissions)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, phase, team_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or you do not have permission to access it');
    }

    // Update the project with report URL and potentially advance phase
    const updateData: Partial<Project> = {
      final_report_url: reportUrl.trim(),
      updated_at: new Date().toISOString(),
    };

    // If project is still in research phase, advance to post phase
    if (project.phase === 'research') {
      updateData.phase = 'post';
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId);

    if (updateError) {
      console.error('Failed to update project report URL:', updateError);
      throw new Error(`Failed to update project report URL: ${updateError.message}`);
    }

    // Revalidate relevant paths
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');
    revalidatePath(`/p/${projectId}`);

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
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Project ID is required and must be a valid string');
  }

  if (!reportUrl || typeof reportUrl !== 'string' || reportUrl.trim().length === 0) {
    throw new Error('Report URL is required and cannot be empty');
  }

  if (!reportContent || typeof reportContent !== 'string' || reportContent.trim().length === 0) {
    throw new Error('Report content is required and cannot be empty');
  }

  // Basic URL validation
  try {
    new URL(reportUrl);
  } catch {
    throw new Error('Report URL must be a valid URL');
  }

  try {
    // Create authenticated Supabase client
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to update project reports');
    }

    // Get project and verify access (RLS will handle permissions)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, phase, team_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or you do not have permission to access it');
    }

    // Update the project with both URL and content
    const updateData: Partial<Project> = {
      final_report_url: reportUrl.trim(),
      final_report_content: reportContent.trim(),
      updated_at: new Date().toISOString(),
    };

    // If project is still in research phase, advance to post phase
    if (project.phase === 'research') {
      updateData.phase = 'post';
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId);

    if (updateError) {
      console.error('Failed to update project report content:', updateError);
      throw new Error(`Failed to update project report content: ${updateError.message}`);
    }

    // Revalidate relevant paths
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');
    revalidatePath(`/p/${projectId}`);

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
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Project ID is required and must be a valid string');
  }

  if (typeof goals !== 'string') {
    throw new Error('Learning goals must be a string');
  }

  // Allow empty goals (students can clear their goals)
  const trimmedGoals = goals.trim();

  try {
    // Create authenticated Supabase client
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to update learning goals');
    }

    // Get user role for authorization checks
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('Failed to verify user permissions');
    }

    // Get project and verify access (RLS will handle permissions)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, phase, team_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or you do not have permission to access it');
    }

    // Check if project is closed (prevent editing goals in closed projects)
    if (project.phase === 'closed') {
      throw new Error('Cannot update learning goals for a closed project');
    }

    // Authorization logic based on user role
    if (userData.role === 'student') {
      // Students can only update goals for their team projects
      const { data: membership, error: membershipError } = await supabase
        .from('teams_users')
        .select('team_id')
        .eq('team_id', project.team_id)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership) {
        throw new Error('You can only update learning goals for projects of teams you belong to');
      }
    } else if (userData.role === 'educator') {
      // Educators can update goals for projects in their courses (RLS handles this)
      // If we got the project data, the educator has access
    } else if (userData.role !== 'admin') {
      throw new Error('Insufficient permissions to update learning goals for this project');
    }

    // Update the project learning goals
    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        learning_goals: trimmedGoals || null, // Store null for empty goals
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Failed to update project learning goals:', updateError);
      throw new Error(`Failed to update project learning goals: ${updateError.message}`);
    }

    // Revalidate relevant paths to reflect learning goals change
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');
    revalidatePath(`/p/${projectId}`);

    return trimmedGoals ? 'Learning goals updated successfully' : 'Learning goals cleared successfully';
  } catch (error) {
    // Re-throw with context if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected error types
    throw new Error(`Unexpected error updating project learning goals: ${String(error)}`);
  }
} 