/**
 * Structured Error Classes for PBLab Application
 * 
 * This module provides a hierarchy of error classes that replace generic error strings
 * with structured error objects containing better debugging information and user-friendly messages.
 * 
 * Key Benefits:
 * - Better debugging with context and technical details
 * - User-friendly messages for frontend display
 * - Consistent error handling across the application
 * - Type-safe error categorization
 */

/**
 * Base error class for all PBLab application errors
 * 
 * Provides structured error information with both user-friendly messages
 * and technical details for debugging.
 */
export abstract class PBLabError extends Error {
  /** Error code for programmatic error handling */
  public readonly code: string;
  /** User-friendly message safe for frontend display */
  public readonly userMessage: string;
  /** Technical details for debugging (not shown to users) */
  public readonly details?: Record<string, unknown>;
  /** Context information about where/how the error occurred */
  public readonly context?: Record<string, unknown>;

  constructor(
    code: string,
    userMessage: string,
    technicalMessage?: string,
    details?: Record<string, unknown>,
    context?: Record<string, unknown>
  ) {
    super(technicalMessage || userMessage);
    this.name = this.constructor.name;
    this.code = code;
    this.userMessage = userMessage;
    this.details = details;
    this.context = context;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get a JSON representation of the error for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      details: this.details,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Validation Error - thrown when input validation fails
 * 
 * Used for parameter validation, format checking, and data constraints.
 */
export class ValidationError extends PBLabError {
  constructor(
    field: string,
    reason: string,
    value?: unknown,
    context?: Record<string, unknown>
  ) {
    const userMessage = `${field} ${reason}`;
    const technicalMessage = `Validation failed for field '${field}': ${reason}`;
    const details = { field, reason, value: value !== undefined ? String(value) : undefined };

    super('VALIDATION_ERROR', userMessage, technicalMessage, details, context);
  }
}

/**
 * Authentication Error - thrown when user authentication fails
 * 
 * Used when user is not authenticated or authentication verification fails.
 */
export class AuthenticationError extends PBLabError {
  constructor(
    reason: string = 'Authentication required',
    context?: Record<string, unknown>
  ) {
    const userMessage = 'You must be logged in to perform this action';
    const technicalMessage = `Authentication failed: ${reason}`;

    super('AUTHENTICATION_ERROR', userMessage, technicalMessage, { reason }, context);
  }
}

/**
 * Authorization Error - thrown when user lacks permission for an action
 * 
 * Used for role-based access control and permission checking.
 */
export class AuthorizationError extends PBLabError {
  constructor(
    action: string,
    reason: string,
    userRole?: string,
    context?: Record<string, unknown>
  ) {
    const userMessage = 'You do not have permission to perform this action';
    const technicalMessage = `Authorization failed for action '${action}': ${reason}`;
    const details = { action, reason, userRole };

    super('AUTHORIZATION_ERROR', userMessage, technicalMessage, details, context);
  }
}

/**
 * Not Found Error - thrown when a requested resource doesn't exist
 * 
 * Used when database queries return no results or resources are inaccessible.
 */
export class NotFoundError extends PBLabError {
  constructor(
    resourceType: string,
    resourceId?: string,
    context?: Record<string, unknown>
  ) {
    const userMessage = `${resourceType} not found or you do not have permission to access it`;
    const technicalMessage = resourceId 
      ? `${resourceType} with ID '${resourceId}' not found`
      : `${resourceType} not found`;
    const details = { resourceType, resourceId };

    super('NOT_FOUND_ERROR', userMessage, technicalMessage, details, context);
  }
}

/**
 * Business Logic Error - thrown when business rules are violated
 * 
 * Used for domain-specific constraints and workflow validation.
 */
export class BusinessLogicError extends PBLabError {
  constructor(
    rule: string,
    explanation: string,
    context?: Record<string, unknown>
  ) {
    const userMessage = explanation;
    const technicalMessage = `Business rule violation: ${rule}`;
    const details = { rule, explanation };

    super('BUSINESS_LOGIC_ERROR', userMessage, technicalMessage, details, context);
  }
}

/**
 * Database Error - thrown when database operations fail
 * 
 * Used for database connection issues, query failures, and constraint violations.
 */
export class DatabaseError extends PBLabError {
  constructor(
    operation: string,
    reason: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    const userMessage = 'A database error occurred. Please try again.';
    const technicalMessage = `Database operation '${operation}' failed: ${reason}`;
    const details = { 
      operation, 
      reason, 
      originalError: originalError?.message,
      originalStack: originalError?.stack 
    };

    super('DATABASE_ERROR', userMessage, technicalMessage, details, context);
  }
}

/**
 * External Service Error - thrown when external API calls fail
 * 
 * Used for AI API failures, file storage issues, and third-party service errors.
 */
export class ExternalServiceError extends PBLabError {
  constructor(
    service: string,
    operation: string,
    reason: string,
    statusCode?: number,
    context?: Record<string, unknown>
  ) {
    const userMessage = `External service temporarily unavailable. Please try again.`;
    const technicalMessage = `${service} ${operation} failed: ${reason}`;
    const details = { service, operation, reason, statusCode };

    super('EXTERNAL_SERVICE_ERROR', userMessage, technicalMessage, details, context);
  }
}

/**
 * Configuration Error - thrown when application configuration is invalid
 * 
 * Used for missing environment variables and invalid configuration values.
 */
export class ConfigurationError extends PBLabError {
  constructor(
    configKey: string,
    issue: string,
    context?: Record<string, unknown>
  ) {
    const userMessage = 'Application configuration error. Please contact support.';
    const technicalMessage = `Configuration error for '${configKey}': ${issue}`;
    const details = { configKey, issue };

    super('CONFIGURATION_ERROR', userMessage, technicalMessage, details, context);
  }
}

/**
 * Rate Limit Error - thrown when rate limits are exceeded
 * 
 * Used for API rate limiting and usage quota enforcement.
 */
export class RateLimitError extends PBLabError {
  constructor(
    resource: string,
    limit: number,
    resetTime?: Date,
    context?: Record<string, unknown>
  ) {
    const userMessage = 'Rate limit exceeded. Please try again later.';
    const technicalMessage = `Rate limit exceeded for ${resource}: ${limit} requests`;
    const details = { resource, limit, resetTime: resetTime?.toISOString() };

    super('RATE_LIMIT_ERROR', userMessage, technicalMessage, details, context);
  }
}

/**
 * Type guard to check if an error is a PBLabError
 */
export function isPBLabError(error: unknown): error is PBLabError {
  return error instanceof PBLabError;
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is an AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Type guard to check if an error is an AuthorizationError
 */
export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

/**
 * Type guard to check if an error is a NotFoundError
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/**
 * Type guard to check if an error is a BusinessLogicError
 */
export function isBusinessLogicError(error: unknown): error is BusinessLogicError {
  return error instanceof BusinessLogicError;
}

/**
 * Type guard to check if an error is a DatabaseError
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

/**
 * Type guard to check if an error is an ExternalServiceError
 */
export function isExternalServiceError(error: unknown): error is ExternalServiceError {
  return error instanceof ExternalServiceError;
}

/**
 * Utility function to extract user-friendly message from any error
 * 
 * @param error - The error to extract message from
 * @returns User-friendly error message
 */
export function getUserMessage(error: unknown): string {
  if (isPBLabError(error)) {
    return error.userMessage;
  }
  
  if (error instanceof Error) {
    return 'An unexpected error occurred. Please try again.';
  }
  
  return 'An unknown error occurred. Please try again.';
}

/**
 * Utility function to extract technical details for logging
 * 
 * @param error - The error to extract details from
 * @returns Technical error information for logging
 */
export function getTechnicalDetails(error: unknown): Record<string, unknown> {
  if (isPBLabError(error)) {
    return error.toJSON();
  }
  
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  
  return {
    error: String(error),
    type: typeof error,
  };
}