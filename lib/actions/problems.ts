"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db.types";
import { revalidatePath } from "next/cache";

type Problem = Database["public"]["Tables"]["problems"]["Insert"];
type Rubric = Database["public"]["Tables"]["rubrics"]["Insert"];
type RubricCriterion = Database["public"]["Tables"]["rubric_criteria"]["Insert"];

/**
 * Individual rubric criterion data
 */
export interface RubricCriterionData {
  /** Text description of the criterion */
  criterion_text: string;
  /** Maximum score for this criterion (default: 5) */
  max_score?: number;
  /** Sort order for display purposes */
  sort_order: number;
}

/**
 * Rubric data for problem creation
 */
export interface RubricData {
  /** Name/title of the rubric */
  name: string;
  /** Array of criteria for this rubric */
  criteria: RubricCriterionData[];
}

/**
 * Parameters for creating a new PBL problem
 */
export interface CreateProblemParams {
  /** Problem title (required) */
  title: string;
  /** Problem description in Markdown format */
  description?: string;
  /** Course ID this problem belongs to */
  courseId: string;
  /** Rubric data including criteria */
  rubric: RubricData;
}

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
 * @returns Promise resolving to the created problem ID
 * @throws Error if user is not authenticated, not an educator, or transaction fails
 */
export async function createProblem(params: CreateProblemParams): Promise<string> {
  const { title, description, courseId, rubric } = params;

  // Validate required parameters
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('Problem title is required and cannot be empty');
  }

  if (!courseId || typeof courseId !== 'string') {
    throw new Error('Course ID is required and must be a valid string');
  }

  if (!rubric || typeof rubric !== 'object') {
    throw new Error('Rubric data is required');
  }

  if (!rubric.name || typeof rubric.name !== 'string' || rubric.name.trim().length === 0) {
    throw new Error('Rubric name is required and cannot be empty');
  }

  if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
    throw new Error('Rubric must have at least one criterion');
  }

  // Validate each criterion
  for (let i = 0; i < rubric.criteria.length; i++) {
    const criterion = rubric.criteria[i];
    
    if (!criterion.criterion_text || typeof criterion.criterion_text !== 'string' || criterion.criterion_text.trim().length === 0) {
      throw new Error(`Criterion ${i + 1}: Text is required and cannot be empty`);
    }
    
    if (criterion.max_score !== undefined && (typeof criterion.max_score !== 'number' || criterion.max_score < 1 || criterion.max_score > 10)) {
      throw new Error(`Criterion ${i + 1}: Max score must be a number between 1 and 10`);
    }
    
    if (typeof criterion.sort_order !== 'number' || criterion.sort_order < 0) {
      throw new Error(`Criterion ${i + 1}: Sort order must be a non-negative number`);
    }
  }

  try {
    // Create authenticated Supabase client
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to create problems');
    }

    // Get user role and verify they can create problems
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('Failed to verify user permissions');
    }

    // Only educators and admins can create problems
    if (userData.role !== 'educator' && userData.role !== 'admin') {
      throw new Error('Only educators and administrators can create problems');
    }

    // Verify the course exists and user has access (RLS will handle permissions)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, name')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      throw new Error('Course not found or you do not have permission to create problems in this course');
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
      throw new Error(`Failed to create problem: ${problemError?.message || 'Unknown error'}`);
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

        // Success! Revalidate educator dashboard to show new problem
        revalidatePath('/educator/dashboard');
        revalidatePath('/educator/problems');
        revalidatePath('/dashboard');

        return problemId;

      } catch (criteriaErr) {
        // Rollback: Delete the rubric if criteria creation failed
        await supabase.from('rubrics').delete().eq('id', rubricId);
        throw criteriaErr;
      }

    } catch (rubricErr) {
      // Rollback: Delete the problem if rubric creation failed
      await supabase.from('problems').delete().eq('id', problemId);
      throw rubricErr;
    }

  } catch (error) {
    // Re-throw with context if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected error types
    throw new Error(`Unexpected error creating problem: ${String(error)}`);
  }
}

/**
 * Get default rubric template for PBL problems
 * 
 * Returns a standard rubric template with 5 criteria commonly used
 * in Problem-Based Learning assessments.
 * 
 * @returns Default rubric template data
 */
export function getDefaultRubricTemplate(): RubricData {
  return {
    name: "PBL Assessment Rubric",
    criteria: [
      {
        criterion_text: "Problem Analysis & Understanding: Demonstrates clear comprehension of the problem, identifies key issues, and shows deep understanding of underlying concepts.",
        max_score: 5,
        sort_order: 0,
      },
      {
        criterion_text: "Research & Information Gathering: Effectively researches relevant information from credible sources, synthesizes findings, and applies knowledge appropriately.",
        max_score: 5,
        sort_order: 1,
      },
      {
        criterion_text: "Critical Thinking & Solution Development: Uses logical reasoning, considers multiple perspectives, and develops well-justified solutions or recommendations.",
        max_score: 5,
        sort_order: 2,
      },
      {
        criterion_text: "Collaboration & Communication: Works effectively in a team, communicates ideas clearly, listens to others, and contributes meaningfully to group discussions.",
        max_score: 5,
        sort_order: 3,
      },
      {
        criterion_text: "Reflection & Learning: Demonstrates self-awareness of learning process, identifies knowledge gaps, and shows evidence of personal growth and understanding.",
        max_score: 5,
        sort_order: 4,
      },
    ],
  };
} 