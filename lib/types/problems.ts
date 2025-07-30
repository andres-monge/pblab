import type { RubricData } from "@/lib/shared/rubric-templates";

/**
 * Team creation data for problem-to-project workflow
 */
export interface TeamCreationData {
  /** Team name (auto-generated like "Team 1", "Team 2") */
  name: string;
  /** Array of student user IDs to assign to this team */
  studentIds: string[];
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
  /** Optional teams to create with this problem */
  teams?: TeamCreationData[];
}

// Re-export types for convenience
export type { RubricCriterionData, RubricData } from "@/lib/shared/rubric-templates";