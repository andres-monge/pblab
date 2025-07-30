/**
 * Shared Validation Utilities
 * 
 * Common validation functions for server actions to reduce code duplication
 * and provide consistent error messages across the application.
 * 
 * These utilities follow TypeScript strict mode and use structured error classes
 * for better debugging and user-friendly error messages.
 */

import { ValidationError } from './errors';

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
    throw new ValidationError(fieldName, 'is required and must be a valid string', value);
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
    throw new ValidationError(fieldName, 'is required and cannot be empty', value);
  }

  const trimmed = value.trim();
  
  if (maxLength && trimmed.length > maxLength) {
    throw new ValidationError(fieldName, `cannot exceed ${maxLength} characters`, value, { maxLength, actualLength: trimmed.length });
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
    throw new ValidationError(fieldName, 'must be a string', value);
  }

  const trimmed = value.trim();
  
  if (maxLength && trimmed.length > maxLength) {
    throw new ValidationError(fieldName, `cannot exceed ${maxLength} characters`, value, { maxLength, actualLength: trimmed.length });
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
    throw new ValidationError(fieldName, `must be at least ${minLength} characters long`, value, { minLength, maxLength, actualLength: validated.length });
  }
  
  if (validated.length > maxLength) {
    throw new ValidationError(fieldName, `cannot exceed ${maxLength} characters`, value, { minLength, maxLength, actualLength: validated.length });
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
    throw new ValidationError(fieldName, 'must be an array', value);
  }

  if (maxLength && value.length > maxLength) {
    throw new ValidationError(fieldName, `cannot contain more than ${maxLength} items`, value, { maxLength, actualLength: value.length });
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
      throw new ValidationError(fieldName, 'must contain only valid strings', value, { invalidItemIndex: i, invalidItem: item });
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
    throw new ValidationError(fieldName, 'must be a valid number', value);
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
    throw new ValidationError(fieldName, 'is required for range validation', value);
  }
  
  if (num < min || num > max) {
    throw new ValidationError(fieldName, `must be between ${min} and ${max}`, value, { min, max, actualValue: num });
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
    // Sanitize Google Docs URLs to prevent security software interference
    return sanitizeGoogleDocsUrl(urlString);
  } catch (urlError) {
    throw new ValidationError(fieldName, 'must be a valid URL', value, { urlError: urlError instanceof Error ? urlError.message : String(urlError) });
  }
}

/**
 * Sanitizes Google Docs URLs by converting edit URLs to view-only URLs
 * This prevents security software from flagging edit URLs as potentially malicious
 * 
 * @param url - The URL to sanitize
 * @returns The sanitized URL
 */
function sanitizeGoogleDocsUrl(url: string): string {
  // Convert Google Docs edit URLs to view-only URLs
  if (url.includes('docs.google.com/document/') && url.includes('/edit')) {
    return url.replace('/edit', '/view');
  }
  
  // Convert Google Sheets edit URLs to view-only URLs
  if (url.includes('docs.google.com/spreadsheets/') && url.includes('/edit')) {
    return url.replace('/edit', '/view');
  }
  
  // Convert Google Slides edit URLs to view-only URLs
  if (url.includes('docs.google.com/presentation/') && url.includes('/edit')) {
    return url.replace('/edit', '/view');
  }
  
  return url;
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
    throw new ValidationError(fieldName, `must be one of: ${allowedValues.join(', ')}`, value, { allowedValues, providedValue: stringValue });
  }

  return stringValue as T;
}

/**
 * Validates an email address format
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages (default: 'Email')
 * @returns The validated email string
 * @throws Error if validation fails
 */
export function validateEmail(value: unknown, fieldName: string = 'Email'): string {
  const emailString = validateRequiredString(value, fieldName);
  
  // Basic email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(emailString)) {
    throw new ValidationError(fieldName, 'must be a valid email address', value);
  }

  return emailString.toLowerCase(); // Normalize to lowercase
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
    throw new ValidationError(fieldName, 'appears to be invalid', value, { minLength: 10, actualLength: token.length });
  }

  return token;
}