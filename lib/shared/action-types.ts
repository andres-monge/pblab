/**
 * Shared TypeScript types for server action responses using discriminated unions.
 * 
 * This module provides consistent response types across all server actions,
 * improving TypeScript safety and making error handling predictable for frontend components.
 */

/**
 * Base discriminated union for all server action responses.
 * Uses a 'success' discriminator to distinguish between success and error cases.
 * 
 * @template T - The type of data returned on success (for queries)
 */
export type ActionResult<T = unknown> = 
  | SuccessResult<T>
  | ErrorResult;

/**
 * Success result types for different operation categories
 */
type SuccessResult<T> = 
  | { success: true; data: T }           // For queries that return data
  | { success: true; id: string }        // For creation operations that return IDs
  | { success: true; message: string }   // For update/delete operations
  | { success: true; token: string };    // For token generation operations

/**
 * Error result type for all failure cases
 */
type ErrorResult = {
  success: false;
  error: string;
};

/**
 * Specific result types for common server action patterns
 */

/**
 * Result type for creation operations (returns generated ID)
 * Examples: createProject, createArtifact, createComment
 */
export type CreateResult = {
  success: true;
  id: string;
} | ErrorResult;

/**
 * Result type for update/delete operations (returns success message)
 * Examples: updateProjectPhase, deleteArtifact, markNotificationAsRead
 */
export type UpdateResult = {
  success: true;
  message: string;
} | ErrorResult;

/**
 * Result type for query operations (returns typed data)
 * Examples: getNotifications, getProjectMentionableUsers
 * 
 * @template T - The type of data being queried
 */
export type QueryResult<T> = {
  success: true;
  data: T;
} | ErrorResult;

/**
 * Result type for token generation operations
 * Examples: generateInviteToken
 */
export type TokenResult = {
  success: true;
  token: string;
} | ErrorResult;

/**
 * Utility functions for creating consistent responses
 */

/**
 * Creates a successful response with data payload
 * @param data - The data to return
 * @returns QueryResult with success: true and data
 */
export function createSuccessResponse<T>(data: T): QueryResult<T> {
  return { success: true, data };
}

/**
 * Creates a successful response with ID (for creation operations)
 * @param id - The generated ID
 * @returns CreateResult with success: true and id
 */
export function createIdResponse(id: string): CreateResult {
  return { success: true, id };
}

/**
 * Creates a successful response with message (for update/delete operations)
 * @param message - The success message
 * @returns UpdateResult with success: true and message
 */
export function createMessageResponse(message: string): UpdateResult {
  return { success: true, message };
}

/**
 * Creates a successful response with token
 * @param token - The generated token
 * @returns TokenResult with success: true and token
 */
export function createTokenResponse(token: string): TokenResult {
  return { success: true, token };
}

/**
 * Creates an error response
 * @param error - The error message
 * @returns ErrorResult with success: false and error
 */
export function createErrorResponse(error: string): ErrorResult {
  return { success: false, error };
}

/**
 * Type guards for discriminated union handling
 */

/**
 * Type guard to check if result is successful
 * @param result - The action result to check
 * @returns true if result represents success
 */
export function isSuccessResult<T>(result: ActionResult<T>): result is SuccessResult<T> {
  return result.success === true;
}

/**
 * Type guard to check if result is an error
 * @param result - The action result to check
 * @returns true if result represents an error
 */
export function isErrorResult<T>(result: ActionResult<T>): result is ErrorResult {
  return result.success === false;
}

/**
 * Type guard to check if success result contains data
 * @param result - The success result to check
 * @returns true if result contains a data property
 */
export function hasData<T>(result: SuccessResult<T>): result is { success: true; data: T } {
  return 'data' in result;
}

/**
 * Type guard to check if success result contains an ID
 * @param result - The success result to check
 * @returns true if result contains an id property
 */
export function hasId<T>(result: SuccessResult<T>): result is { success: true; id: string } {
  return 'id' in result;
}

/**
 * Type guard to check if success result contains a message
 * @param result - The success result to check
 * @returns true if result contains a message property
 */
export function hasMessage<T>(result: SuccessResult<T>): result is { success: true; message: string } {
  return 'message' in result;
}

/**
 * Type guard to check if success result contains a token
 * @param result - The success result to check
 * @returns true if result contains a token property
 */
export function hasToken<T>(result: SuccessResult<T>): result is { success: true; token: string } {
  return 'token' in result;
}