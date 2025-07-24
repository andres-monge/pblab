/**
 * Artifacts Actions - Legacy Re-export Module
 * 
 * This file maintains backwards compatibility by re-exporting all functionality
 * from the new modular structure under lib/actions/artifacts/
 * 
 * @deprecated Import directly from '@/lib/actions/artifacts' instead
 */

// Re-export all types and functions from the new modular structure
export type {
  CreateArtifactParams,
  DeleteArtifactParams, 
  CreateCommentParams,
  Artifact,
  Comment
} from './artifacts/index';

export {
  createArtifact,
  deleteArtifact,
  createComment,
  getProjectMentionableUsers,
  getAllowedFileTypes
} from './artifacts/index'; 