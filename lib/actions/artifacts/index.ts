/**
 * Artifacts Action Module
 * 
 * Main entry point for artifact-related server actions.
 * Re-exports all functionality from focused sub-modules.
 */

import type { Database } from "@/lib/db.types";

// Type exports
export type Artifact = Database["public"]["Tables"]["artifacts"]["Insert"];
export type Comment = Database["public"]["Tables"]["comments"]["Insert"];

/**
 * Parameters for creating a new artifact
 */
export interface CreateArtifactParams {
  /** ID of the project this artifact belongs to */
  projectId: string;
  /** Title/name of the artifact */
  title: string;
  /** URL to the artifact (Supabase storage or external link) */
  url: string;
  /** Type of artifact */
  type: 'doc' | 'image' | 'video' | 'link';
  /** MIME type for file validation (optional for links) */
  mimeType?: string;
  /** File name for extension validation (optional for links) */
  fileName?: string;
}

/**
 * Parameters for deleting an artifact
 */
export interface DeleteArtifactParams {
  /** ID of the artifact to delete */
  artifactId: string;
}

/**
 * Parameters for creating a comment
 */
export interface CreateCommentParams {
  /** ID of the artifact to comment on */
  artifactId: string;
  /** Comment text body */
  body: string;
  /** Optional array of user IDs to mention in the comment */
  mentionedUserIds?: string[];
}

// Re-export CRUD operations
export { createArtifact, deleteArtifact } from './crud';

// Re-export comment functionality  
export { createComment, getProjectMentionableUsers } from './comments';

// Re-export query functionality
export { getProjectArtifacts, type ArtifactWithComments } from './queries';

// Re-export security utilities
export { getAllowedFileTypes } from "@/lib/security/file-validation";
