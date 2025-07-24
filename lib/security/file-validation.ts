/**
 * File Security Module
 * 
 * Centralized file validation logic for secure artifact uploads.
 * Implements security whitelist as required by test T-03.
 */

/**
 * Allowed file types for artifact uploads
 * Implements security whitelist to prevent malicious file uploads
 */
export const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
  
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-tar',
  'application/gzip',
  
  // Video (common formats)
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
] as const;

/**
 * Allowed file extensions (fallback for when MIME type is not available)
 */
export const ALLOWED_FILE_EXTENSIONS = [
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  
  // Documents  
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.md', '.csv',
  
  // Archives
  '.zip', '.rar', '.tar', '.gz',
  
  // Video
  '.mp4', '.mov', '.avi', '.wmv', '.webm', '.mpeg', '.mpg',
  
  // Audio
  '.mp3', '.wav', '.ogg', '.m4a',
] as const;

/**
 * Validate file type based on MIME type and/or file extension
 * 
 * @param mimeType - MIME type of the file (optional)
 * @param fileName - Name of the file for extension validation (optional)
 * @returns true if file type is allowed, false otherwise
 */
export function validateFileType(mimeType?: string, fileName?: string): boolean {
  // For external links, skip file type validation
  if (!mimeType && !fileName) {
    return true;
  }

  // Check MIME type if available
  if (mimeType && ALLOWED_FILE_TYPES.includes(mimeType.toLowerCase() as typeof ALLOWED_FILE_TYPES[number])) {
    return true;
  }

  // Check file extension if available
  if (fileName) {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (ALLOWED_FILE_EXTENSIONS.includes(extension as typeof ALLOWED_FILE_EXTENSIONS[number])) {
      return true;
    }
  }

  return false;
}

/**
 * Get allowed file types for client-side validation
 * 
 * Returns the list of allowed MIME types and file extensions
 * for use in file upload components.
 * 
 * @returns Object containing allowed MIME types and extensions
 */
export function getAllowedFileTypes() {
  return {
    mimeTypes: ALLOWED_FILE_TYPES,
    extensions: ALLOWED_FILE_EXTENSIONS,
  } as const;
}

/**
 * Validate URL format for external links
 * 
 * @param url - URL string to validate
 * @returns true if URL is valid, false otherwise
 */
export function validateUrlFormat(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}