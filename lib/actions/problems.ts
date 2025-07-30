"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db.types";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/actions/shared/authorization";
import { requireProjectCreationPermissions } from "@/lib/shared/authorization-utils";
import {
  CreateResult,
  QueryResult,
  createIdResponse,
  createErrorResponse,
  createSuccessResponse
} from "@/lib/shared/action-types";

type Problem = Database["public"]["Tables"]["problems"]["Insert"];
type Rubric = Database["public"]["Tables"]["rubrics"]["Insert"];
type RubricCriterion = Database["public"]["Tables"]["rubric_criteria"]["Insert"];

import type { CreateProblemParams } from "@/lib/types/problems";
import { generateInviteToken } from "@/lib/actions/teams";
import { createProject } from "@/lib/actions/projects";

/**
 * Create a new PBL problem with associated rubric and criteria
 * 
 * This is a transactional operation that creates:
 * 1. A problem record
 * 2. An associated rubric record  
 * 3. Multiple rubric criteria records
 * 
 * If any step fails, the entire transaction is rolled back.
 * 
 * @param params - Problem creation parameters
 * @returns Promise resolving to CreateResult with problem ID or error
 */
export async function createProblem(params: CreateProblemParams): Promise<CreateResult> {
  const { title, description, courseId, rubric, teams } = params;

  // Validate required parameters
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return createErrorResponse('Problem title is required and cannot be empty');
  }

  if (!courseId || typeof courseId !== 'string') {
    return createErrorResponse('Course ID is required and must be a valid string');
  }

  if (!rubric || typeof rubric !== 'object') {
    return createErrorResponse('Rubric data is required');
  }

  if (!rubric.name || typeof rubric.name !== 'string' || rubric.name.trim().length === 0) {
    return createErrorResponse('Rubric name is required and cannot be empty');
  }

  if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
    return createErrorResponse('Rubric must have at least one criterion');
  }

  // Validate each criterion
  for (let i = 0; i < rubric.criteria.length; i++) {
    const criterion = rubric.criteria[i];
    
    if (!criterion.criterion_text || typeof criterion.criterion_text !== 'string' || criterion.criterion_text.trim().length === 0) {
      return createErrorResponse(`Criterion ${i + 1}: Text is required and cannot be empty`);
    }
    
    if (criterion.max_score !== undefined && (typeof criterion.max_score !== 'number' || criterion.max_score < 1 || criterion.max_score > 10)) {
      return createErrorResponse(`Criterion ${i + 1}: Max score must be a number between 1 and 10`);
    }
    
    if (typeof criterion.sort_order !== 'number' || criterion.sort_order < 0) {
      return createErrorResponse(`Criterion ${i + 1}: Sort order must be a non-negative number`);
    }
  }

  // Validate teams if provided
  if (teams && Array.isArray(teams)) {
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      
      if (!team.name || typeof team.name !== 'string' || team.name.trim().length === 0) {
        return createErrorResponse(`Team ${i + 1}: Name is required and cannot be empty`);
      }
      
      if (!Array.isArray(team.studentIds)) {
        return createErrorResponse(`Team ${i + 1}: Student IDs must be an array`);
      }
      
      if (team.studentIds.length === 0) {
        return createErrorResponse(`Team ${i + 1}: At least one student must be assigned`);
      }
      
      // Validate each student ID is a valid UUID string
      for (const studentId of team.studentIds) {
        if (!studentId || typeof studentId !== 'string') {
          return createErrorResponse(`Team ${i + 1}: Invalid student ID format`);
        }
      }
    }
  }

  try {
    // Verify user authentication and permissions
    const user = await getAuthenticatedUser();
    requireProjectCreationPermissions(user.role);
    
    const supabase = await createClient();

    // Verify the course exists and user has access (RLS will handle permissions)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, name')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return createErrorResponse('Course not found or you do not have permission to create problems in this course');
    }

    // Start transaction by creating the problem
    const problemData: Problem = {
      title: title.trim(),
      description: description?.trim() || null,
      creator_id: user.id,
      course_id: courseId,
    };

    const { data: createdProblem, error: problemError } = await supabase
      .from('problems')
      .insert(problemData)
      .select('id')
      .single();

    if (problemError || !createdProblem) {
      console.error('Failed to create problem:', problemError);
      return createErrorResponse(`Failed to create problem: ${problemError?.message || 'Unknown error'}`);
    }

    const problemId = createdProblem.id;

    try {
      // Create the rubric
      const rubricData: Rubric = {
        problem_id: problemId,
        name: rubric.name.trim(),
      };

      const { data: createdRubric, error: rubricError } = await supabase
        .from('rubrics')
        .insert(rubricData)
        .select('id')
        .single();

      if (rubricError || !createdRubric) {
        console.error('Failed to create rubric:', rubricError);
        throw new Error(`Failed to create rubric: ${rubricError?.message || 'Unknown error'}`);
      }

      const rubricId = createdRubric.id;

      try {
        // Create all rubric criteria
        const criteriaData: RubricCriterion[] = rubric.criteria.map((criterion) => ({
          rubric_id: rubricId,
          criterion_text: criterion.criterion_text.trim(),
          max_score: criterion.max_score || 5,
          sort_order: criterion.sort_order,
        }));

        const { error: criteriaError } = await supabase
          .from('rubric_criteria')
          .insert(criteriaData);

        if (criteriaError) {
          console.error('Failed to create rubric criteria:', criteriaError);
          throw new Error(`Failed to create rubric criteria: ${criteriaError.message}`);
        }

        // Create teams and projects if provided

        if (teams && teams.length > 0) {
          try {
            for (const teamData of teams) {
              // Create team
              const { data: createdTeam, error: teamError } = await supabase
                .from('teams')
                .insert({
                  name: teamData.name.trim(),
                  course_id: courseId,
                })
                .select('id')
                .single();

              if (teamError || !createdTeam) {
                throw new Error(`Failed to create team "${teamData.name}": ${teamError?.message || 'Unknown error'}`);
              }

              const teamId = createdTeam.id;
              // teamsCreated++;

              // Add team members
              const teamMemberships = teamData.studentIds.map(studentId => ({
                team_id: teamId,
                user_id: studentId,
              }));

              const { error: membershipError } = await supabase
                .from('teams_users')
                .insert(teamMemberships);

              if (membershipError) {
                throw new Error(`Failed to add members to team "${teamData.name}": ${membershipError.message}`);
              }

              // Create project for this team
              const projectResult = await createProject({
                problemId: problemId,
                teamId: teamId,
              });

              if (!projectResult.success) {
                throw new Error(`Failed to create project for team "${teamData.name}": ${projectResult.error}`);
              }

              // projectsCreated++;

              // Generate invite token for this team
              const inviteResult = await generateInviteToken({
                teamId: teamId,
              });

              if (inviteResult.success) {
                // invitesGenerated++;
              } else {
                console.warn(`Failed to generate invite for team "${teamData.name}": ${inviteResult.error}`);
                // Don't fail the entire process for invite generation issues
              }
            }
          } catch (teamErr) {
            // Rollback: Delete the entire problem if team/project creation failed
            await supabase.from('problems').delete().eq('id', problemId);
            const errorMessage = teamErr instanceof Error ? teamErr.message : String(teamErr);
            return createErrorResponse(`Problem created but team setup failed: ${errorMessage}`);
          }
        }

        // Success! Revalidate educator dashboard to show new problem
        revalidatePath('/educator/dashboard');
        revalidatePath('/educator/problems');
        revalidatePath('/dashboard');
        revalidatePath('/student/dashboard'); // Students might see new projects

        return createIdResponse(problemId);

      } catch (criteriaErr) {
        // Rollback: Delete the rubric if criteria creation failed
        await supabase.from('rubrics').delete().eq('id', rubricId);
        const errorMessage = criteriaErr instanceof Error ? criteriaErr.message : String(criteriaErr);
        return createErrorResponse(errorMessage);
      }

    } catch (rubricErr) {
      // Rollback: Delete the problem if rubric creation failed
      await supabase.from('problems').delete().eq('id', problemId);
      const errorMessage = rubricErr instanceof Error ? rubricErr.message : String(rubricErr);
      return createErrorResponse(errorMessage);
    }

  } catch (error) {
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Unexpected error creating problem: ${errorMessage}`);
  }
}

/**
 * Get all students available for team assignment in a course
 * 
 * Fetches all students who can be assigned to teams when creating a problem.
 * Only accessible by educators.
 * 
 * @param courseId - Course ID to get students for
 * @returns Promise resolving to QueryResult with student data
 */
export async function getStudentsInCourse(courseId: string): Promise<QueryResult<Array<{ id: string; name: string | null; email: string }>>> {
  // Validate required parameters
  if (!courseId || typeof courseId !== 'string') {
    return createErrorResponse('Course ID is required and must be a valid string');
  }

  try {
    // Verify user authentication and permissions
    const user = await getAuthenticatedUser();
    requireProjectCreationPermissions(user.role);
    
    const supabase = await createClient();

    // Verify the course exists and user has access (RLS will handle permissions)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, name')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return createErrorResponse('Course not found or you do not have permission to view it');
    }

    // Get all students (role-based filtering)
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'student')
      .order('name', { ascending: true });

    if (studentsError) {
      console.error('Failed to fetch students:', studentsError);
      return createErrorResponse(`Failed to fetch students: ${studentsError.message}`);
    }

    return createSuccessResponse(students || []);
  } catch (error) {
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Unexpected error fetching students: ${errorMessage}`);
  }
}

 