"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db.types";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/actions/shared/authorization";
import {
  validateRequiredString,
  validateId
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

type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"];

/**
 * Enhanced course object for admin display
 */
export interface CourseWithDetails {
  id: string;
  name: string;
  admin_id: string | null;
  created_at: string;
  team_count: number;
  problem_count: number;
  admin: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

/**
 * Parameters for creating a new course
 */
export interface CreateCourseParams {
  /** Course name */
  name: string;
  /** ID of the educator to assign to this course */
  educatorId: string;
}

/**
 * Parameters for updating a course
 */
export interface UpdateCourseParams {
  /** ID of the course to update */
  courseId: string;
  /** New course name */
  name: string;
}

/**
 * Parameters for deleting a course
 */
export interface DeleteCourseParams {
  /** ID of the course to delete */
  courseId: string;
}

/**
 * Educator option for dropdown selection
 */
export interface EducatorOption {
  id: string;
  name: string;
  email: string;
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
 * Get all educators for course assignment
 * 
 * Fetches all users with educator role for admin to assign to courses.
 * Only accessible by admin users.
 * 
 * @returns Promise resolving to QueryResult with educators array or error
 */
export async function getAllEducators(): Promise<QueryResult<EducatorOption[]>> {
  try {
    // Verify admin permissions
    await requireAdminPermissions();
    
    const supabase = await createClient();

    // Fetch all educators
    const { data: educators, error: educatorsError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'educator')
      .order('name', { ascending: true });

    if (educatorsError) {
      console.error('Failed to fetch educators:', educatorsError);
      throw new Error(`Failed to fetch educators: ${educatorsError.message}`);
    }

    // Transform data to match our interface
    const transformedEducators: EducatorOption[] = (educators || []).map((educator) => ({
      id: educator.id,
      name: educator.name || educator.email, // Use email as fallback if name is null
      email: educator.email,
    }));

    return createSuccessResponse(transformedEducators);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error fetching educators: ${errorMessage}`);
  }
}

/**
 * Get all courses in the system with details
 * 
 * Fetches all courses with admin information and team/problem counts for admin management.
 * Only accessible by admin users.
 * 
 * @returns Promise resolving to QueryResult with courses array or error
 */
export async function getAllCourses(): Promise<QueryResult<CourseWithDetails[]>> {
  try {
    // Verify admin permissions
    await requireAdminPermissions();
    
    const supabase = await createClient();

    // Fetch all courses with admin and count information
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        admin_id,
        created_at,
        admin:users(
          id,
          name,
          email
        ),
        teams(count),
        problems(count)
      `)
      .order('created_at', { ascending: false });

    if (coursesError) {
      console.error('Failed to fetch courses:', coursesError);
      throw new Error(`Failed to fetch courses: ${coursesError.message}`);
    }

    // Transform data to match our interface
    const transformedCourses: CourseWithDetails[] = (courses || []).map((course) => ({
      id: course.id,
      name: course.name,
      admin_id: course.admin_id,
      created_at: course.created_at,
      team_count: course.teams?.[0]?.count || 0,
      problem_count: course.problems?.[0]?.count || 0,
      admin: course.admin ? {
        id: course.admin.id,
        name: course.admin.name,
        email: course.admin.email,
      } : null,
    }));

    return createSuccessResponse(transformedCourses);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error fetching courses: ${errorMessage}`);
  }
}

/**
 * Create a new course
 * 
 * Creates a new course with the specified educator assigned as the course admin.
 * Only accessible by admin users.
 * 
 * @param params - Course creation parameters
 * @returns Promise resolving to CreateResult with course ID or error
 */
export async function createCourse(params: CreateCourseParams): Promise<CreateResult> {
  const { name, educatorId } = params;

  // Validate required parameters
  const validatedName = validateRequiredString(name, 'Course name');
  const validatedEducatorId = validateId(educatorId, 'Educator ID');

  try {
    // Verify admin permissions and get current user
    const currentUser = await getAuthenticatedUser();
    if (currentUser.role !== 'admin') {
      throw new Error('Admin permissions required for this operation');
    }
    
    const supabase = await createClient();

    // Validate that the educator exists and has educator role
    const { data: educator, error: educatorError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', validatedEducatorId)
      .eq('role', 'educator')
      .single();

    if (educatorError || !educator) {
      return createErrorResponse('Selected user is not a valid educator');
    }

    // Check if course name already exists
    const { data: existingCourse, error: checkError } = await supabase
      .from('courses')
      .select('id')
      .eq('name', validatedName)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected if course doesn't exist
      console.error('Failed to check existing course:', checkError);
      throw new Error(`Failed to check existing course: ${checkError.message}`);
    }

    if (existingCourse) {
      return createErrorResponse('A course with this name already exists');
    }

    // Create the course with the selected educator as admin
    const courseData: CourseInsert = {
      name: validatedName,
      admin_id: validatedEducatorId,
    };

    const { data: createdCourse, error: createError } = await supabase
      .from('courses')
      .insert(courseData)
      .select('id')
      .single();

    if (createError || !createdCourse) {
      console.error('Failed to create course:', createError);
      throw new Error(`Failed to create course: ${createError?.message || 'Unknown error'}`);
    }

    // Revalidate admin dashboard to show new course
    revalidatePath('/admin/dashboard');

    return createIdResponse(createdCourse.id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error creating course: ${errorMessage}`);
  }
}

/**
 * Update a course's information
 * 
 * Updates the name of an existing course.
 * Only accessible by admin users.
 * 
 * @param params - Course update parameters
 * @returns Promise resolving to UpdateResult with success message or error
 */
export async function updateCourse(params: UpdateCourseParams): Promise<UpdateResult> {
  const { courseId, name } = params;

  // Validate required parameters
  const validatedCourseId = validateId(courseId, 'Course ID');
  const validatedName = validateRequiredString(name, 'Course name');

  try {
    // Verify admin permissions
    await requireAdminPermissions();
    
    const supabase = await createClient();

    // Check if course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, name')
      .eq('id', validatedCourseId)
      .single();

    if (courseError || !course) {
      return createErrorResponse('Course not found');
    }

    // Check if name is the same
    if (course.name === validatedName) {
      return createMessageResponse('Course name is already set to this value');
    }

    // Check if new name already exists for another course
    const { data: existingCourse, error: checkError } = await supabase
      .from('courses')
      .select('id')
      .eq('name', validatedName)
      .neq('id', validatedCourseId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected if no other course has this name
      console.error('Failed to check existing course name:', checkError);
      throw new Error(`Failed to check existing course name: ${checkError.message}`);
    }

    if (existingCourse) {
      return createErrorResponse('Another course with this name already exists');
    }

    // Update the course
    const { error: updateError } = await supabase
      .from('courses')
      .update({ name: validatedName })
      .eq('id', validatedCourseId);

    if (updateError) {
      console.error('Failed to update course:', updateError);
      throw new Error(`Failed to update course: ${updateError.message}`);
    }

    // Revalidate admin dashboard to show updated course
    revalidatePath('/admin/dashboard');

    return createMessageResponse(`Course name updated to "${validatedName}" successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error updating course: ${errorMessage}`);
  }
}

/**
 * Delete a course from the system
 * 
 * Removes a course completely. Database constraints will handle
 * cascading deletes for associated data (teams, problems, projects).
 * 
 * @param params - Course deletion parameters
 * @returns Promise resolving to UpdateResult with success message or error
 */
export async function deleteCourse(params: DeleteCourseParams): Promise<UpdateResult> {
  const { courseId } = params;

  // Validate required parameters
  const validatedCourseId = validateId(courseId, 'Course ID');

  try {
    // Verify admin permissions
    await requireAdminPermissions();
    
    const supabase = await createClient();

    // Check if course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, name')
      .eq('id', validatedCourseId)
      .single();

    if (courseError || !course) {
      return createErrorResponse('Course not found');
    }

    // Check if course has teams or problems
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id')
      .eq('course_id', validatedCourseId)
      .limit(1);

    if (teamsError) {
      console.error('Failed to check course teams:', teamsError);
      throw new Error(`Failed to check course teams: ${teamsError.message}`);
    }

    const { data: problems, error: problemsError } = await supabase
      .from('problems')
      .select('id')
      .eq('course_id', validatedCourseId)
      .limit(1);

    if (problemsError) {
      console.error('Failed to check course problems:', problemsError);
      throw new Error(`Failed to check course problems: ${problemsError.message}`);
    }

    if ((teams && teams.length > 0) || (problems && problems.length > 0)) {
      return createErrorResponse('Cannot delete course with existing teams or problems. Please remove all associated data first.');
    }

    // Delete the course
    const { error: deleteError } = await supabase
      .from('courses')
      .delete()
      .eq('id', validatedCourseId);

    if (deleteError) {
      console.error('Failed to delete course:', deleteError);
      throw new Error(`Failed to delete course: ${deleteError.message}`);
    }

    // Revalidate admin dashboard and related pages
    revalidatePath('/admin/dashboard');
    revalidatePath('/educator/dashboard');
    revalidatePath('/dashboard');

    return createMessageResponse(`Course "${course.name}" deleted successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error deleting course: ${errorMessage}`);
  }
}