import type { Database } from "@/lib/db.types";

type UserRole = Database["public"]["Enums"]["user_role"];
type ProjectPhase = Database["public"]["Enums"]["project_phase"];

/**
 * Pure utility functions for authorization checks
 * 
 * These are helper functions that don't require server actions
 * and can be used in both client and server contexts.
 */

/**
 * Check if user has educator-level permissions (educator or admin)
 * 
 * @param userRole - Role of the user to check
 * @returns True if user has educator-level permissions
 */
export function hasEducatorPermissions(userRole: UserRole): boolean {
  return userRole === 'educator' || userRole === 'admin';
}

/**
 * Check if user has admin permissions
 * 
 * @param userRole - Role of the user to check
 * @returns True if user is an admin
 */
export function hasAdminPermissions(userRole: UserRole): boolean {
  return userRole === 'admin';
}

/**
 * Validate that a project is not in closed phase for operations
 * 
 * @param projectPhase - Current phase of the project
 * @param operationName - Name of the operation being attempted (for error message)
 * @throws Error if project is closed
 */
export function validateProjectNotClosed(projectPhase: ProjectPhase, operationName: string): void {
  if (projectPhase === 'closed') {
    throw new Error(`Cannot ${operationName} for a closed project`);
  }
}

/**
 * Check if user can create projects (educator or admin only)
 * 
 * @param userRole - Role of the user to check
 * @throws Error if user cannot create projects
 */
export function requireProjectCreationPermissions(userRole: UserRole): void {
  if (!hasEducatorPermissions(userRole)) {
    throw new Error('Only educators and administrators can create projects');
  }
}

/**
 * Check if user can close projects (educator or admin only)
 * 
 * @param userRole - Role of the user to check
 * @throws Error if user cannot close projects
 */
export function requireProjectClosePermissions(userRole: UserRole): void {
  if (!hasEducatorPermissions(userRole)) {
    throw new Error('Only educators and administrators can close projects');
  }
}