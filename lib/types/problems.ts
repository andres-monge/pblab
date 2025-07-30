import type { RubricData } from "@/lib/shared/rubric-templates";

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

// Re-export types for convenience
export type { RubricCriterionData, RubricData } from "@/lib/shared/rubric-templates";