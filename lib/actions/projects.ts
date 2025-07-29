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
import {
  CreateResult,
  UpdateResult,
  createIdResponse,
  createMessageResponse,
  createErrorResponse
} from "@/lib/shared/action-types";
import { 
  isPBLabError, 
  getUserMessage, 
  getTechnicalDetails,
  DatabaseError,
  BusinessLogicError
} from "@/lib/shared/errors";

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
 * @returns Promise resolving to CreateResult with project ID or error
 */
export async function createProject(params: CreateProjectParams): Promise<CreateResult> {
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
      throw new DatabaseError(
        'verify_problem_access',
        problemError?.message || 'Problem not found',
        problemError ? new Error(problemError.message) : undefined,
        { problemId: validatedProblemId, userId: user.id }
      );
    }

    // Verify the team exists and is in the same course as the problem
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, course_id')
      .eq('id', validatedTeamId)
      .single();

    if (teamError || !team) {
      throw new DatabaseError(
        'verify_team_access',
        teamError?.message || 'Team not found',
        teamError ? new Error(teamError.message) : undefined,
        { teamId: validatedTeamId, userId: user.id }
      );
    }

    // Ensure team and problem are in the same course
    if (team.course_id !== problem.course_id) {
      throw new BusinessLogicError(
        'course_mismatch',
        'Team and problem must be in the same course',
        { teamCourseId: team.course_id, problemCourseId: problem.course_id, teamId: validatedTeamId, problemId: validatedProblemId }
      );
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
      throw new DatabaseError(
        'check_existing_project',
        existingError.message,
        new Error(existingError.message),
        { problemId: validatedProblemId, teamId: validatedTeamId }
      );
    }

    if (existingProject) {
      throw new BusinessLogicError(
        'project_already_exists',
        'A project already exists for this team and problem combination',
        { existingProjectId: existingProject.id, problemId: validatedProblemId, teamId: validatedTeamId }
      );
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
      throw new DatabaseError(
        'create_project',
        projectCreateError?.message || 'Failed to create project',
        projectCreateError ? new Error(projectCreateError.message) : undefined,
        { projectData }
      );
    }

    // Revalidate relevant paths to show new project
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');

    return createIdResponse(createdProject.id);
  } catch (error) {
    // Handle structured errors and convert to user-friendly responses
    if (isPBLabError(error)) {
      console.error('Project creation error:', getTechnicalDetails(error));
      return createErrorResponse(getUserMessage(error));
    }
    
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected project creation error:', error);
    return createErrorResponse(`Unexpected error creating project: ${errorMessage}`);
  }
}

/**
 * Update a project's phase in the PBL workflow
 * 
 * Handles phase transitions with proper authorization checks.
 * Students can advance phases, but only educators can close projects.
 * 
 * @param params - Project phase update parameters
 * @returns Promise resolving to UpdateResult with success message or error
 */
export async function updateProjectPhase(params: UpdateProjectPhaseParams): Promise<UpdateResult> {
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
      throw new BusinessLogicError(
        'invalid_phase_transition',
        'Students can only advance to the next phase in the workflow',
        { currentPhase, requestedPhase: validatedPhase, userRole: user.role, currentIndex, newIndex }
      );
    }

    // Prevent invalid transitions (e.g., skipping phases)
    if (!hasEducatorPermissions(user.role) && newIndex > currentIndex + 1) {
      throw new BusinessLogicError(
        'phase_skipping_not_allowed',
        'Cannot skip phases. Please advance one phase at a time.',
        { currentPhase, requestedPhase: validatedPhase, userRole: user.role, currentIndex, newIndex }
      );
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
      throw new DatabaseError(
        'update_project_phase',
        updateError.message,
        new Error(updateError.message),
        { projectId: validatedProjectId, newPhase: validatedPhase, currentPhase }
      );
    }

    // Revalidate relevant paths to reflect phase change
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');
    revalidatePath(`/p/${validatedProjectId}`);

    return createMessageResponse(`Project phase updated to: ${validatedPhase}`);
  } catch (error) {
    // Handle structured errors and convert to user-friendly responses
    if (isPBLabError(error)) {
      console.error('Project phase update error:', getTechnicalDetails(error));
      return createErrorResponse(getUserMessage(error));
    }
    
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected project phase update error:', error);
    return createErrorResponse(`Unexpected error updating project phase: ${errorMessage}`);
  }
}

/**
 * Update a project's final report URL
 * 
 * Sets the final report URL when students submit their deliverable.
 * Automatically transitions project to 'post' phase if still in 'research'.
 * 
 * @param params - Project report URL parameters
 * @returns Promise resolving to UpdateResult with success message or error
 */
export async function updateProjectReportUrl(params: UpdateProjectReportParams): Promise<UpdateResult> {
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
      throw new DatabaseError(
        'update_project_report_url',
        updateError.message,
        new Error(updateError.message),
        { projectId: validatedProjectId, reportUrl: validatedReportUrl, updateData }
      );
    }

    // Revalidate relevant paths
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');
    revalidatePath(`/p/${validatedProjectId}`);

    const phaseMessage = project.phase === 'research' ? ' and advanced to post-discussion phase' : '';
    return createMessageResponse(`Final report URL updated successfully${phaseMessage}`);
  } catch (error) {
    // Handle structured errors and convert to user-friendly responses
    if (isPBLabError(error)) {
      console.error('Project report URL update error:', getTechnicalDetails(error));
      return createErrorResponse(getUserMessage(error));
    }
    
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected project report URL update error:', error);
    return createErrorResponse(`Unexpected error updating project report URL: ${errorMessage}`);
  }
}

/**
 * Update both project report URL and cached content
 * 
 * Sets the final report URL and caches the plain text content
 * for AI assessment purposes. Used by Google Drive integration.
 * 
 * @param params - Project report content parameters
 * @returns Promise resolving to UpdateResult with success message or error
 */
export async function updateProjectReportContent(params: UpdateProjectReportContentParams): Promise<UpdateResult> {
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
      throw new DatabaseError(
        'update_project_report_content',
        updateError.message,
        new Error(updateError.message),
        { projectId: validatedProjectId, reportUrl: validatedReportUrl, contentLength: validatedReportContent.length }
      );
    }

    // Revalidate relevant paths
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');
    revalidatePath(`/p/${validatedProjectId}`);

    const phaseMessage = project.phase === 'research' ? ' and advanced to post-discussion phase' : '';
    return createMessageResponse(`Final report submitted successfully${phaseMessage}. Content cached for assessment.`);
  } catch (error) {
    // Handle structured errors and convert to user-friendly responses
    if (isPBLabError(error)) {
      console.error('Project report content update error:', getTechnicalDetails(error));
      return createErrorResponse(getUserMessage(error));
    }
    
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected project report content update error:', error);
    return createErrorResponse(`Unexpected error updating project report content: ${errorMessage}`);
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
 * @returns Promise resolving to UpdateResult with success message or error
 */
export async function updateProjectLearningGoals(params: UpdateProjectLearningGoalsParams): Promise<UpdateResult> {
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
      throw new DatabaseError(
        'update_project_learning_goals',
        updateError.message,
        new Error(updateError.message),
        { projectId: validatedProjectId, goalsLength: validatedGoals?.length || 0 }
      );
    }

    // Revalidate relevant paths to reflect learning goals change
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');
    revalidatePath(`/p/${validatedProjectId}`);

    return createMessageResponse(validatedGoals ? 'Learning goals updated successfully' : 'Learning goals cleared successfully');
  } catch (error) {
    // Handle structured errors and convert to user-friendly responses
    if (isPBLabError(error)) {
      console.error('Project learning goals update error:', getTechnicalDetails(error));
      return createErrorResponse(getUserMessage(error));
    }
    
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected project learning goals update error:', error);
    return createErrorResponse(`Unexpected error updating project learning goals: ${errorMessage}`);
  }
}

/**
 * Parameters for finalizing an assessment
 */
export interface FinalizeAssessmentParams {
  /** ID of the project being assessed */
  projectId: string;
  /** Array of scores for each rubric criterion */
  scores: Array<{
    criterionId: string;
    score: number;
    justification: string;
  }>;
  /** Overall feedback for the project */
  overallFeedback: string;
}

/**
 * Finalize a project assessment
 * 
 * Saves the assessment scores, marks it as final, and closes the project.
 * This action is only available to educators and permanently locks the project.
 * 
 * @param params - Assessment finalization parameters
 * @returns Promise resolving to UpdateResult with success message or error
 */
export async function finalizeAssessment(params: FinalizeAssessmentParams): Promise<UpdateResult> {
  const { projectId, scores, overallFeedback } = params;

  // Validate required parameters
  const validatedProjectId = validateProjectId(projectId);
  const validatedFeedback = validateRequiredString(overallFeedback, 'Overall feedback');
  
  // Validate scores array
  if (!Array.isArray(scores) || scores.length === 0) {
    return createErrorResponse('At least one score must be provided');
  }

  // Validate each score
  for (const score of scores) {
    if (!score.criterionId || typeof score.criterionId !== 'string') {
      return createErrorResponse('Each score must have a valid criterion ID');
    }
    if (typeof score.score !== 'number' || score.score < 0) {
      return createErrorResponse('Each score must be a non-negative number');
    }
    if (!score.justification || typeof score.justification !== 'string') {
      return createErrorResponse('Each score must have a justification');
    }
  }

  try {
    // Verify user authentication and permissions
    const user = await getAuthenticatedUser();
    if (user.role !== 'educator' && user.role !== 'admin') {
      throw new BusinessLogicError(
        'insufficient_permissions',
        'Only educators can finalize assessments',
        { userRole: user.role }
      );
    }

    const supabase = await createClient();

    // Verify project exists and is in post phase
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        phase,
        problem:problems!inner (
          id,
          rubrics (
            id,
            rubric_criteria (
              id,
              max_score
            )
          )
        )
      `)
      .eq('id', validatedProjectId)
      .single();

    if (projectError || !project) {
      throw new DatabaseError(
        'verify_project',
        projectError?.message || 'Project not found',
        projectError ? new Error(projectError.message) : undefined,
        { projectId: validatedProjectId }
      );
    }

    if (project.phase !== 'post') {
      throw new BusinessLogicError(
        'invalid_project_phase',
        'Project must be in post-discussion phase to finalize assessment',
        { currentPhase: project.phase, projectId: validatedProjectId }
      );
    }

    // Get rubric criteria for validation
    const rubrics = project.problem.rubrics;
    if (!rubrics || !Array.isArray(rubrics) || rubrics.length === 0) {
      throw new BusinessLogicError(
        'no_rubric',
        'No rubric found for this project',
        { projectId: validatedProjectId }
      );
    }

    const rubric = rubrics[0];
    if (!rubric.rubric_criteria || !Array.isArray(rubric.rubric_criteria)) {
      throw new BusinessLogicError(
        'no_rubric_criteria',
        'No rubric criteria found for this project',
        { projectId: validatedProjectId }
      );
    }

    // Create a map of valid criteria IDs to max scores
    const criteriaMap = new Map<string, number>(
      rubric.rubric_criteria.map((c: { id: string; max_score: number }) => [c.id, c.max_score])
    );

    // Validate all scores are for valid criteria and within range
    for (const score of scores) {
      const maxScore = criteriaMap.get(score.criterionId);
      if (maxScore === undefined) {
        throw new BusinessLogicError(
          'invalid_criterion',
          `Invalid criterion ID: ${score.criterionId}`,
          { criterionId: score.criterionId, validCriteriaIds: Array.from(criteriaMap.keys()) }
        );
      }
      if (score.score > maxScore) {
        throw new BusinessLogicError(
          'score_exceeds_max',
          `Score ${score.score} exceeds maximum ${maxScore} for criterion`,
          { criterionId: score.criterionId, score: score.score, maxScore }
        );
      }
    }

    // Start a database transaction
    // First, check if there's an existing pending assessment
    const { data: existingAssessment, error: existingError } = await supabase
      .from('assessments')
      .select('id')
      .eq('project_id', validatedProjectId)
      .eq('status', 'pending_review')
      .single();

    let assessmentId: string;

    if (existingAssessment && !existingError) {
      // Update existing assessment
      assessmentId = existingAssessment.id;
      
      // Update assessment to final
      const { error: updateError } = await supabase
        .from('assessments')
        .update({
          status: 'final' as Database["public"]["Enums"]["assessment_status"],
          overall_feedback: validatedFeedback,
          assessor_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', assessmentId);

      if (updateError) {
        throw new DatabaseError(
          'update_assessment',
          updateError.message,
          new Error(updateError.message),
          { assessmentId }
        );
      }

      // Delete existing scores to replace with new ones
      const { error: deleteError } = await supabase
        .from('assessment_scores')
        .delete()
        .eq('assessment_id', assessmentId);

      if (deleteError) {
        throw new DatabaseError(
          'delete_existing_scores',
          deleteError.message,
          new Error(deleteError.message),
          { assessmentId }
        );
      }
    } else {
      // Create new assessment
      const { data: newAssessment, error: createError } = await supabase
        .from('assessments')
        .insert({
          project_id: validatedProjectId,
          assessor_id: user.id,
          status: 'final' as Database["public"]["Enums"]["assessment_status"],
          overall_feedback: validatedFeedback
        })
        .select('id')
        .single();

      if (createError || !newAssessment) {
        throw new DatabaseError(
          'create_assessment',
          createError?.message || 'Failed to create assessment',
          createError ? new Error(createError.message) : undefined,
          { projectId: validatedProjectId }
        );
      }

      assessmentId = newAssessment.id;
    }

    // Insert assessment scores
    const scoresToInsert = scores.map(score => ({
      assessment_id: assessmentId,
      criterion_id: score.criterionId,
      score: score.score,
      justification: score.justification,
      ai_generated: false // Educator has reviewed/edited
    }));

    const { error: scoresError } = await supabase
      .from('assessment_scores')
      .insert(scoresToInsert);

    if (scoresError) {
      throw new DatabaseError(
        'insert_scores',
        scoresError.message,
        new Error(scoresError.message),
        { assessmentId, scoresCount: scoresToInsert.length }
      );
    }

    // Update project phase to closed
    const { error: projectUpdateError } = await supabase
      .from('projects')
      .update({
        phase: 'closed' as ProjectPhase,
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedProjectId);

    if (projectUpdateError) {
      throw new DatabaseError(
        'close_project',
        projectUpdateError.message,
        new Error(projectUpdateError.message),
        { projectId: validatedProjectId }
      );
    }

    // Revalidate relevant paths
    revalidatePath('/educator/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard');
    revalidatePath(`/p/${validatedProjectId}`);

    return createMessageResponse('Assessment finalized successfully. Project is now closed.');
  } catch (error) {
    // Handle structured errors and convert to user-friendly responses
    if (isPBLabError(error)) {
      console.error('Assessment finalization error:', getTechnicalDetails(error));
      return createErrorResponse(getUserMessage(error));
    }
    
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected assessment finalization error:', error);
    return createErrorResponse(`Unexpected error finalizing assessment: ${errorMessage}`);
  }
} 