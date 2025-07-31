"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db.types";
import { revalidatePath } from "next/cache";
import {
  getAuthenticatedUser
} from "@/lib/actions/shared/authorization";
import {
  hasEducatorPermissions,
  hasAdminPermissions
} from "@/lib/shared/authorization-utils";
import {
  validateProjectId,
  validateRequiredString,
  validateOptionalString
} from "@/lib/shared/validation";
import {
  CreateResult,
  QueryResult,
  createIdResponse,
  createErrorResponse,
  createSuccessResponse
} from "@/lib/shared/action-types";
import {
  isPBLabError,
  getUserMessage,
  DatabaseError,
  BusinessLogicError,
  AuthorizationError,
  ValidationError
} from "@/lib/shared/errors";

type Assessment = Database["public"]["Tables"]["assessments"]["Insert"];
type AssessmentScore = Database["public"]["Tables"]["assessment_scores"]["Insert"];
type AssessmentStatus = Database["public"]["Enums"]["assessment_status"];

/**
 * Parameters for saving an assessment
 */
export interface SaveAssessmentParams {
  /** ID of the project being assessed */
  projectId: string;
  /** Array of scores for each rubric criterion */
  scores: Array<{
    /** ID of the rubric criterion */
    criterion_id: string;
    /** Score value (must be between 1 and criterion's max_score) */
    score: number;
    /** Justification for the score */
    justification: string;
  }>;
  /** Optional overall feedback for the assessment */
  overall_feedback?: string;
}

/**
 * Save an educator's assessment for a project
 * 
 * This action creates an assessment record and associated scores for each
 * rubric criterion. It's transactional - if any part fails, the entire
 * operation is rolled back.
 * 
 * Authorization:
 * - User must be authenticated
 * - User must have educator role and own the course, OR have admin role
 * - Educator must have access to the project's course
 * 
 * @param params - Assessment parameters including project ID and scores
 * @returns Promise resolving to CreateResult with assessment ID or error
 */
export async function saveAssessment(params: SaveAssessmentParams): Promise<CreateResult> {
  const { projectId, scores, overall_feedback } = params;

  try {
    // Validate parameters
    validateProjectId(projectId);

    if (!Array.isArray(scores) || scores.length === 0) {
      throw new ValidationError(
        'scores_required',
        'At least one score must be provided',
        { scoresLength: scores?.length || 0 }
      );
    }

    // Validate each score entry
    for (let i = 0; i < scores.length; i++) {
      const score = scores[i];
      
      if (!score.criterion_id || typeof score.criterion_id !== 'string') {
        throw new ValidationError(
          'invalid_criterion_id',
          `Score ${i + 1}: Criterion ID is required`,
          { index: i, criterion_id: score.criterion_id }
        );
      }

      if (typeof score.score !== 'number') {
        throw new ValidationError(
          'invalid_score_value',
          `Score ${i + 1}: Score must be a number`,
          { index: i, score: score.score }
        );
      }

      validateRequiredString(score.justification, `Score ${i + 1} justification`);
    }

    if (overall_feedback !== undefined) {
      validateOptionalString(overall_feedback, 'Overall feedback');
    }

    // Get authenticated user
    const user = await getAuthenticatedUser();

    // Verify user has educator or admin permissions
    if (!hasEducatorPermissions(user.role) && !hasAdminPermissions(user.role)) {
      throw new AuthorizationError(
        'educator_permission_required',
        'Only educators and admins can create assessments',
        user.role
      );
    }

    const supabase = await createClient();

    // Get project details with course information
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        phase,
        problem_id,
        team_id,
        problems!inner(
          id,
          course_id,
          rubrics(
            id,
            rubric_criteria(
              id,
              criterion_text,
              max_score
            )
          )
        )
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new DatabaseError(
        'fetch_project',
        'Failed to fetch project details',
        projectError ? new Error(projectError.message) : undefined,
        { projectId }
      );
    }

    // Extract course ID and rubric criteria
    const courseId = project.problems.course_id;
    const rubric = project.problems.rubrics;
    const rubricCriteria = rubric?.rubric_criteria || [];

    // Verify course ID exists
    if (!courseId) {
      throw new BusinessLogicError(
        'no_course_id',
        'Project problem has no associated course',
        { projectId, problemId: project.problems.id }
      );
    }

    // For educators (not admins), verify they own the course
    if (user.role === 'educator') {
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, admin_id')
        .eq('id', courseId)
        .single();

      if (courseError || !course) {
        throw new DatabaseError(
          'fetch_course',
          'Failed to fetch course details',
          courseError ? new Error(courseError.message) : undefined,
          { courseId }
        );
      }

      if (course.admin_id !== user.id) {
        throw new AuthorizationError(
          'course_ownership_required',
          'Educator can only assess projects in their own courses',
          user.role,
          { userId: user.id, courseAdminId: course.admin_id }
        );
      }
    }

    // Validate scores against rubric criteria
    const criteriaMap = new Map(rubricCriteria.map(c => [c.id, c]));
    
    for (let i = 0; i < scores.length; i++) {
      const score = scores[i];
      const criterion = criteriaMap.get(score.criterion_id);
      
      if (!criterion) {
        throw new ValidationError(
          'invalid_criterion',
          `Score ${i + 1}: Criterion not found in project rubric`,
          { criterion_id: score.criterion_id, projectId }
        );
      }

      if (score.score < 1 || score.score > criterion.max_score) {
        throw new ValidationError(
          'score_out_of_range',
          `Score ${i + 1}: Score must be between 1 and ${criterion.max_score}`,
          { 
            score: score.score, 
            max_score: criterion.max_score,
            criterion_text: criterion.criterion_text 
          }
        );
      }
    }

    // Check if assessment already exists for this project by this educator
    const { data: existingAssessment, error: existingError } = await supabase
      .from('assessments')
      .select('id')
      .eq('project_id', projectId)
      .eq('assessor_id', user.id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      throw new DatabaseError(
        'check_existing_assessment',
        'Failed to check for existing assessment',
        new Error(existingError.message),
        { projectId, assessorId: user.id }
      );
    }

    if (existingAssessment) {
      throw new BusinessLogicError(
        'assessment_already_exists',
        'You have already created an assessment for this project. Consider updating it instead.',
        { assessmentId: existingAssessment.id, projectId }
      );
    }

    // Create assessment record
    const assessmentData: Assessment = {
      project_id: projectId,
      assessor_id: user.id,
      status: 'pending_review',
      overall_feedback: overall_feedback?.trim() || null
    };

    const { data: createdAssessment, error: assessmentError } = await supabase
      .from('assessments')
      .insert(assessmentData)
      .select('id')
      .single();

    if (assessmentError || !createdAssessment) {
      throw new DatabaseError(
        'create_assessment',
        'Failed to create assessment',
        assessmentError ? new Error(assessmentError.message) : undefined,
        { projectId, assessorId: user.id }
      );
    }

    // Verify project is in 'post' phase
    if (project.phase !== 'post') {
      throw new BusinessLogicError(
        'invalid_project_phase',
        'Assessments can only be created for projects in the post phase. The project must have a submitted final report.',
        { currentPhase: project.phase, expectedPhase: 'post', projectId }
      );
    }

    const assessmentId = createdAssessment.id;

    try {
      // Create assessment scores
      const scoreData: AssessmentScore[] = scores.map(score => ({
        assessment_id: assessmentId,
        criterion_id: score.criterion_id,
        score: score.score,
        justification: score.justification.trim(),
        ai_generated: false // Since this is educator-created, not AI
      }));

      const { error: scoresError } = await supabase
        .from('assessment_scores')
        .insert(scoreData);

      if (scoresError) {
        throw new DatabaseError(
          'create_assessment_scores',
          'Failed to create assessment scores',
          new Error(scoresError.message),
          { assessmentId, scoreCount: scoreData.length }
        );
      }

      // Success! Revalidate relevant pages
      revalidatePath(`/p/${projectId}`);
      revalidatePath('/educator/dashboard');
      revalidatePath('/dashboard');

      return createIdResponse(assessmentId);

    } catch (scoreError) {
      // Rollback: Delete the assessment if score creation failed
      console.error('Score creation failed, rolling back assessment:', scoreError);
      
      const { error: rollbackError } = await supabase
        .from('assessments')
        .delete()
        .eq('id', assessmentId);

      if (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }

      // Re-throw the original error
      throw scoreError;
    }

  } catch (error) {
    if (isPBLabError(error)) {
      return createErrorResponse(getUserMessage(error));
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Unexpected error saving assessment: ${errorMessage}`);
  }
}

/**
 * Assessment data needed for the UI
 */
export interface ProjectAssessmentData {
  /** Project details */
  project: {
    id: string;
    phase: Database["public"]["Enums"]["project_phase"];
    final_report_url: string | null;
    problem_title: string;
  };
  /** Rubric criteria for the project */
  rubricCriteria: Array<{
    id: string;
    criterion_text: string;
    max_score: number;
    sort_order: number;
  }>;
  /** Existing assessment by the current user, if any */
  existingAssessment?: {
    id: string;
    overall_feedback: string | null;
    status: AssessmentStatus;
    scores: Array<{
      criterion_id: string;
      score: number;
      justification: string | null;
    }>;
  };
  /** Whether the current user can create/edit assessments */
  canAssess: boolean;
  /** Reason why assessment is not allowed, if applicable */
  cannotAssessReason?: string;
}

/**
 * Fetch all data needed for the assessment UI
 * 
 * This function retrieves project details, rubric criteria, and any existing
 * assessment by the current educator. It also determines if the educator
 * can create or edit assessments.
 * 
 * @param projectId - ID of the project to get assessment data for
 * @returns Promise resolving to assessment data or error
 */
export async function getProjectAssessmentData(
  projectId: string
): Promise<QueryResult<ProjectAssessmentData>> {
  try {
    // Validate parameters
    validateProjectId(projectId);

    // Get authenticated user
    const user = await getAuthenticatedUser();

    // Verify user has educator or admin permissions
    if (!hasEducatorPermissions(user.role) && !hasAdminPermissions(user.role)) {
      throw new AuthorizationError(
        'educator_permission_required',
        'Only educators and admins can view assessment data',
        user.role
      );
    }

    const supabase = await createClient();

    // Get project details with rubric
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        phase,
        final_report_url,
        problems!inner(
          id,
          title,
          course_id,
          rubrics(
            id,
            rubric_criteria(
              id,
              criterion_text,
              max_score,
              sort_order
            )
          )
        )
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new DatabaseError(
        'fetch_project',
        'Failed to fetch project details',
        projectError ? new Error(projectError.message) : undefined,
        { projectId }
      );
    }

    const courseId = project.problems.course_id;
    const rubric = project.problems.rubrics;
    const rubricCriteria = rubric?.rubric_criteria || [];

    // For educators (not admins), verify they own the course
    let canAssess = true;
    let cannotAssessReason: string | undefined;

    if (user.role === 'educator') {
      if (!courseId) {
        canAssess = false;
        cannotAssessReason = 'Project problem has no associated course';
      } else {
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('id, admin_id')
          .eq('id', courseId)
          .single();

        if (courseError || !course || course.admin_id !== user.id) {
          canAssess = false;
          cannotAssessReason = 'You can only assess projects in your own courses';
        }
      }
    }

    // Check project phase
    if (project.phase !== 'post' && canAssess) {
      canAssess = false;
      cannotAssessReason = 'Project must be in post phase with a submitted final report';
    }

    // Get existing assessment by this educator
    const { data: existingAssessment, error: assessmentError } = await supabase
      .from('assessments')
      .select(`
        id,
        overall_feedback,
        status,
        assessment_scores(
          criterion_id,
          score,
          justification
        )
      `)
      .eq('project_id', projectId)
      .eq('assessor_id', user.id)
      .single();

    // PGRST116 means no rows found, which is fine
    if (assessmentError && assessmentError.code !== 'PGRST116') {
      throw new DatabaseError(
        'fetch_existing_assessment',
        'Failed to fetch existing assessment',
        new Error(assessmentError.message),
        { projectId, assessorId: user.id }
      );
    }

    // If assessment already exists, can't create another
    if (existingAssessment && canAssess) {
      canAssess = false;
      cannotAssessReason = 'You have already assessed this project';
    }

    // Sort rubric criteria by sort_order
    const sortedCriteria = [...rubricCriteria].sort((a, b) => a.sort_order - b.sort_order);

    const assessmentData: ProjectAssessmentData = {
      project: {
        id: project.id,
        phase: project.phase,
        final_report_url: project.final_report_url,
        problem_title: project.problems.title
      },
      rubricCriteria: sortedCriteria,
      canAssess,
      ...(cannotAssessReason && { cannotAssessReason }),
      ...(existingAssessment && {
        existingAssessment: {
          id: existingAssessment.id,
          overall_feedback: existingAssessment.overall_feedback,
          status: existingAssessment.status,
          scores: existingAssessment.assessment_scores
        }
      })
    };

    return createSuccessResponse(assessmentData);

  } catch (error) {
    if (isPBLabError(error)) {
      return createErrorResponse(getUserMessage(error));
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Unexpected error fetching assessment data: ${errorMessage}`);
  }
}

/**
 * Check if an educator can assess a specific project
 * 
 * This is a lightweight function that just checks permissions without
 * fetching all the rubric data. Useful for showing/hiding UI elements.
 * 
 * @param projectId - ID of the project to check
 * @returns Promise resolving to boolean result
 */
export async function canEducatorAssessProject(
  projectId: string
): Promise<QueryResult<{ canAssess: boolean; reason?: string }>> {
  try {
    // Validate parameters
    validateProjectId(projectId);

    // Get authenticated user
    const user = await getAuthenticatedUser();

    // Must be educator or admin
    if (!hasEducatorPermissions(user.role) && !hasAdminPermissions(user.role)) {
      return createSuccessResponse({ canAssess: false, reason: 'Educator or admin role required' });
    }

    const supabase = await createClient();

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        phase,
        problems!inner(
          course_id
        )
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return createSuccessResponse({ canAssess: false, reason: 'Project not found' });
    }

    // Check phase
    if (project.phase !== 'post') {
      return createSuccessResponse({ canAssess: false, reason: 'Project must be in post phase' });
    }

    // For educators, check course ownership
    if (user.role === 'educator') {
      const courseId = project.problems.course_id;
      if (!courseId) {
        return createSuccessResponse({ canAssess: false, reason: 'Project has no course' });
      }
      
      const { data: course } = await supabase
        .from('courses')
        .select('admin_id')
        .eq('id', courseId)
        .single();

      if (!course || course.admin_id !== user.id) {
        return createSuccessResponse({ canAssess: false, reason: 'Not your course' });
      }
    }

    // Check for existing assessment
    const { data: existingAssessment } = await supabase
      .from('assessments')
      .select('id')
      .eq('project_id', projectId)
      .eq('assessor_id', user.id)
      .single();

    if (existingAssessment) {
      return createSuccessResponse({ canAssess: false, reason: 'Already assessed' });
    }

    return createSuccessResponse({ canAssess: true });

  } catch (error) {
    if (isPBLabError(error)) {
      return createErrorResponse(getUserMessage(error));
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Unexpected error checking assessment permission: ${errorMessage}`);
  }
}

/**
 * Assessment results for closed projects (viewable by all authorized users)
 */
export interface ProjectAssessmentResults {
  /** Project details */
  project: {
    id: string;
    phase: Database["public"]["Enums"]["project_phase"];
    final_report_url: string | null;
    problem_title: string;
  };
  /** Rubric criteria with scores */
  rubricResults: Array<{
    criterion: {
      id: string;
      criterion_text: string;
      max_score: number;
      sort_order: number;
    };
    score: number;
    justification: string | null;
  }>;
  /** Assessment metadata */
  assessment: {
    id: string;
    assessor_name: string;
    overall_feedback: string | null;
    status: AssessmentStatus;
    created_at: string;
  };
}

/**
 * Get assessment results for a closed project
 * 
 * This function fetches the final assessment results for a project that has been
 * completed and assessed. Unlike getProjectAssessmentData, this is designed for
 * viewing completed assessments and is accessible to both students and educators
 * who have access to the project.
 * 
 * @param projectId - ID of the project to get results for
 * @returns Promise resolving to assessment results or error
 */
export async function getProjectAssessmentResults(
  projectId: string
): Promise<QueryResult<ProjectAssessmentResults>> {
  try {
    // Validate parameters
    validateProjectId(projectId);

    // Get authenticated user
    const user = await getAuthenticatedUser();

    const supabase = await createClient();

    // Get project details with rubric and assessment
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        phase,
        final_report_url,
        team_id,
        problems!inner(
          id,
          title,
          course_id,
          rubrics(
            id,
            rubric_criteria(
              id,
              criterion_text,
              max_score,
              sort_order
            )
          )
        ),
        assessments(
          id,
          overall_feedback,
          status,
          created_at,
          assessor:users!assessments_assessor_id_fkey(
            id,
            name
          ),
          assessment_scores(
            criterion_id,
            score,
            justification
          )
        )
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new DatabaseError(
        'fetch_project',
        'Failed to fetch project details',
        projectError ? new Error(projectError.message) : undefined,
        { projectId }
      );
    }

    // Verify user has access to this project (basic authorization)
    const courseId = project.problems.course_id;
    
    if (user.role === 'student') {
      // Students must be team members
      const { data: teamMember } = await supabase
        .from('teams_users')
        .select('team_id')
        .eq('team_id', project.team_id)
        .eq('user_id', user.id)
        .single();

      if (!teamMember) {
        throw new AuthorizationError(
          'team_member_required',
          'You must be a team member to view this project',
          user.role,
          { projectId, teamId: project.team_id }
        );
      }
    } else if (user.role === 'educator') {
      // Educators must own the course
      if (!courseId) {
        throw new BusinessLogicError(
          'no_course_id',
          'Project has no associated course',
          { projectId }
        );
      }

      const { data: course } = await supabase
        .from('courses')
        .select('admin_id')
        .eq('id', courseId)
        .single();

      if (!course || course.admin_id !== user.id) {
        throw new AuthorizationError(
          'course_ownership_required',
          'You can only view assessments for projects in your courses',
          user.role,
          { courseId, userId: user.id }
        );
      }
    }
    // Admins can view any project

    // Check that project is closed
    if (project.phase !== 'closed') {
      throw new BusinessLogicError(
        'project_not_closed',
        'Assessment results are only available for closed projects',
        { currentPhase: project.phase, projectId }
      );
    }

    // Check that assessment exists
    if (!project.assessments || project.assessments.length === 0) {
      throw new BusinessLogicError(
        'no_assessment_found',
        'No assessment found for this project',
        { projectId }
      );
    }

    const assessment = project.assessments[0]; // Should only be one assessment per project
    const rubricCriteria = project.problems.rubrics?.rubric_criteria || [];
    
    if (!assessment.assessor || !assessment.assessor.name) {
      throw new DatabaseError(
        'missing_assessor_data',
        'Assessment assessor information is missing',
        undefined,
        { assessmentId: assessment.id }
      );
    }

    // Create rubric results by joining criteria with scores
    const rubricResults = rubricCriteria
      .map(criterion => {
        const score = assessment.assessment_scores.find(
          s => s.criterion_id === criterion.id
        );
        
        if (!score) {
          throw new BusinessLogicError(
            'missing_score',
            `Score missing for criterion: ${criterion.criterion_text}`,
            { criterionId: criterion.id, assessmentId: assessment.id }
          );
        }

        return {
          criterion: {
            id: criterion.id,
            criterion_text: criterion.criterion_text,
            max_score: criterion.max_score,
            sort_order: criterion.sort_order
          },
          score: score.score,
          justification: score.justification
        };
      })
      .sort((a, b) => a.criterion.sort_order - b.criterion.sort_order);

    const results: ProjectAssessmentResults = {
      project: {
        id: project.id,
        phase: project.phase,
        final_report_url: project.final_report_url,
        problem_title: project.problems.title
      },
      rubricResults,
      assessment: {
        id: assessment.id,
        assessor_name: assessment.assessor.name,
        overall_feedback: assessment.overall_feedback,
        status: assessment.status,
        created_at: assessment.created_at
      }
    };

    return createSuccessResponse(results);

  } catch (error) {
    if (isPBLabError(error)) {
      return createErrorResponse(getUserMessage(error));
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Unexpected error fetching assessment results: ${errorMessage}`);
  }
}