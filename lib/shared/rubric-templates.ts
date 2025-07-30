/**
 * Shared rubric templates for PBL problems
 */

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