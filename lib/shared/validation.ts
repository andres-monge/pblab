/**
 * Shared Validation Utilities
 * 
 * Common validation functions for server actions to reduce code duplication
 * and provide consistent error messages across the application.
 * 
 * These utilities follow TypeScript strict mode and provide user-friendly
 * error messages for frontend form validation.
 */

/**
 * Validates that a value is a non-empty string
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns The validated string
 * @throws Error if validation fails
 */
export function validateId(value: unknown, fieldName: string): string {
  if (!value || typeof value !== 'string') {
    throw new Error(`${fieldName} is required and must be a valid string`);
  }
  return value;
}

/**
 * Validates a project ID with context-specific error message
 * 
 * @param projectId - The project ID to validate
 * @returns The validated project ID
 * @throws Error if validation fails
 */
export function validateProjectId(projectId: unknown): string {
  return validateId(projectId, 'Project ID');
}

/**
 * Validates a user ID with context-specific error message
 * 
 * @param userId - The user ID to validate
 * @returns The validated user ID
 * @throws Error if validation fails
 */
export function validateUserId(userId: unknown): string {
  return validateId(userId, 'User ID');
}

/**
 * Validates a team ID with context-specific error message
 * 
 * @param teamId - The team ID to validate
 * @returns The validated team ID
 * @throws Error if validation fails
 */
export function validateTeamId(teamId: unknown): string {
  return validateId(teamId, 'Team ID');
}

/**
 * Validates an artifact ID with context-specific error message
 * 
 * @param artifactId - The artifact ID to validate
 * @returns The validated artifact ID
 * @throws Error if validation fails
 */
export function validateArtifactId(artifactId: unknown): string {
  return validateId(artifactId, 'Artifact ID');
}

/**
 * Validates a notification ID with context-specific error message
 * 
 * @param notificationId - The notification ID to validate
 * @returns The validated notification ID
 * @throws Error if validation fails
 */
export function validateNotificationId(notificationId: unknown): string {
  return validateId(notificationId, 'Notification ID');
}

/**
 * Validates a required string that cannot be empty after trimming
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param maxLength - Optional maximum length constraint
 * @returns The trimmed validated string
 * @throws Error if validation fails
 */
export function validateRequiredString(
  value: unknown, 
  fieldName: string, 
  maxLength?: number
): string {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required and cannot be empty`);
  }

  const trimmed = value.trim();
  
  if (maxLength && trimmed.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} characters`);
  }

  return trimmed;
}

/**
 * Validates an optional string that can be null/undefined but if provided must be valid
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param maxLength - Optional maximum length constraint
 * @returns The trimmed string or null if not provided
 * @throws Error if validation fails
 */
export function validateOptionalString(
  value: unknown, 
  fieldName: string, 
  maxLength?: number
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  
  if (maxLength && trimmed.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} characters`);
  }

  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Validates a string with specific length constraints
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param minLength - Minimum length (default: 1)
 * @param maxLength - Maximum length
 * @returns The validated string
 * @throws Error if validation fails
 */
export function validateStringLength(
  value: unknown,
  fieldName: string,
  minLength: number = 1,
  maxLength: number
): string {
  const validated = validateRequiredString(value, fieldName);
  
  if (validated.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters long`);
  }
  
  if (validated.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} characters`);
  }
  
  return validated;
}

/**
 * Validates an array and ensures it meets basic requirements
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param required - Whether the array is required (default: false)
 * @param maxLength - Optional maximum array length
 * @returns The validated array
 * @throws Error if validation fails
 */
export function validateArray<T>(
  value: unknown, 
  fieldName: string, 
  required: boolean = false,
  maxLength?: number
): T[] {
  if (!required && (value === null || value === undefined)) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }

  if (maxLength && value.length > maxLength) {
    throw new Error(`${fieldName} cannot contain more than ${maxLength} items`);
  }

  return value as T[];
}

/**
 * Validates an array of strings with individual string validation
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param required - Whether the array is required (default: false)
 * @param maxLength - Optional maximum array length
 * @returns The validated array of strings
 * @throws Error if validation fails
 */
export function validateStringArray(
  value: unknown, 
  fieldName: string, 
  required: boolean = false,
  maxLength?: number
): string[] {
  const array = validateArray<string>(value, fieldName, required, maxLength);
  
  // Validate each string in the array
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    if (!item || typeof item !== 'string') {
      throw new Error(`All items in ${fieldName} must be valid strings`);
    }
  }

  return array;
}

/**
 * Validates a number and ensures it's within valid range
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param required - Whether the number is required (default: true)
 * @returns The validated number
 * @throws Error if validation fails
 */
export function validateNumber(
  value: unknown, 
  fieldName: string, 
  required: boolean = true
): number | null {
  if (!required && (value === null || value === undefined)) {
    return null;
  }

  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  return value;
}

/**
 * Validates a number within a specific range
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns The validated number
 * @throws Error if validation fails
 */
export function validateRange(
  value: unknown, 
  fieldName: string, 
  min: number, 
  max: number
): number {
  const num = validateNumber(value, fieldName, true); // Always required for range validation
  
  if (num === null) {
    throw new Error(`${fieldName} is required for range validation`);
  }
  
  if (num < min || num > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }

  return num;
}

/**
 * Validates a URL format with enhanced error messages
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param required - Whether the URL is required (default: true)
 * @returns The validated URL string
 * @throws Error if validation fails
 */
export function validateUrl(
  value: unknown, 
  fieldName: string, 
  required: boolean = true
): string | null {
  if (!required && (!value || value === '')) {
    return null;
  }

  const urlString = validateRequiredString(value, fieldName);

  try {
    new URL(urlString);
    return urlString;
  } catch {
    throw new Error(`${fieldName} must be a valid URL`);
  }
}

/**
 * Validates an enum value against allowed options
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param allowedValues - Array of allowed enum values
 * @returns The validated enum value
 * @throws Error if validation fails
 */
export function validateEnum<T extends string>(
  value: unknown, 
  fieldName: string, 
  allowedValues: readonly T[]
): T {
  const stringValue = validateRequiredString(value, fieldName);
  
  if (!allowedValues.includes(stringValue as T)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }

  return stringValue as T;
}

/**
 * Validates a token (JWT or similar) format
 * 
 * NOTE: This is intentionally basic validation for MVP.
 * In production, consider implementing more robust JWT format validation,
 * character set validation, or signature verification as needed.
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns The validated token string
 * @throws Error if validation fails
 */
export function validateToken(value: unknown, fieldName: string): string {
  const token = validateRequiredString(value, fieldName);
  
  // Basic token format validation - intentionally simple for MVP
  if (token.length < 10) {
    throw new Error(`${fieldName} appears to be invalid`);
  }

  return token;
}