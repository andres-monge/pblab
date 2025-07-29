"use server";

import { createClient } from "@/lib/supabase/server";
import { 
  getAuthenticatedUser, 
  verifyProjectAccess
} from "@/lib/actions/shared/authorization";
import {
  validateProjectId
} from "@/lib/shared/validation";
import {
  QueryResult,
  createSuccessResponse,
  createErrorResponse
} from "@/lib/shared/action-types";
import { 
  isPBLabError, 
  getUserMessage, 
  getTechnicalDetails,
  DatabaseError 
} from "@/lib/shared/errors";

/**
 * Extended artifact type with uploader and comments
 */
export interface ArtifactWithComments {
  id: string;
  title: string;
  url: string | null;
  type: 'doc' | 'image' | 'video' | 'link';
  created_at: string;
  uploader: {
    id: string;
    name: string | null;
    email: string;
  };
  comments: Array<{
    id: string;
    body: string;
    created_at: string;
    author: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
}

/**
 * Get all artifacts for a project with their comments
 * 
 * Returns artifacts ordered by creation date (most recent first)
 * with associated comments and user information.
 * 
 * @param projectId - ID of the project to get artifacts for
 * @returns Promise resolving to QueryResult with artifacts array or error
 */
export async function getProjectArtifacts(projectId: string): Promise<QueryResult<ArtifactWithComments[]>> {
  // Validate required parameters
  const validatedProjectId = validateProjectId(projectId);

  try {
    // Verify user authentication and project access
    const user = await getAuthenticatedUser();
    await verifyProjectAccess(validatedProjectId, user.id, user.role);
    
    const supabase = await createClient();

    // Fetch artifacts with uploader information
    const { data: artifacts, error: artifactsError } = await supabase
      .from('artifacts')
      .select(`
        id,
        title,
        url,
        type,
        created_at,
        uploader:users!artifacts_uploader_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('project_id', validatedProjectId)
      .order('created_at', { ascending: false });

    if (artifactsError) {
      throw new DatabaseError(
        'get_project_artifacts',
        artifactsError.message,
        new Error(artifactsError.message),
        { projectId: validatedProjectId, userId: user.id }
      );
    }

    // If no artifacts, return empty array
    if (!artifacts || artifacts.length === 0) {
      return createSuccessResponse([]);
    }

    // Fetch comments for all artifacts
    const artifactIds = artifacts.map(a => a.id);
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select(`
        id,
        body,
        created_at,
        artifact_id,
        author:users!comments_author_id_fkey (
          id,
          name,
          email
        )
      `)
      .in('artifact_id', artifactIds)
      .order('created_at', { ascending: true }); // Comments in chronological order

    if (commentsError) {
      throw new DatabaseError(
        'get_artifact_comments',
        commentsError.message,
        new Error(commentsError.message),
        { artifactIds, userId: user.id }
      );
    }

    // Group comments by artifact ID
    const commentsByArtifact: Record<string, typeof comments> = {};
    if (comments) {
      comments.forEach(comment => {
        if (!commentsByArtifact[comment.artifact_id]) {
          commentsByArtifact[comment.artifact_id] = [];
        }
        commentsByArtifact[comment.artifact_id].push(comment);
      });
    }

    // Combine artifacts with their comments
    const artifactsWithComments: ArtifactWithComments[] = artifacts.map(artifact => ({
      id: artifact.id,
      title: artifact.title,
      url: artifact.url,
      type: artifact.type as 'doc' | 'image' | 'video' | 'link',
      created_at: artifact.created_at,
      uploader: {
        id: artifact.uploader.id,
        name: artifact.uploader.name,
        email: artifact.uploader.email
      },
      comments: (commentsByArtifact[artifact.id] || []).map(comment => ({
        id: comment.id,
        body: comment.body,
        created_at: comment.created_at,
        author: {
          id: comment.author.id,
          name: comment.author.name,
          email: comment.author.email
        }
      }))
    }));

    return createSuccessResponse(artifactsWithComments);
  } catch (error) {
    // Handle structured errors and convert to user-friendly responses
    if (isPBLabError(error)) {
      console.error('Get project artifacts error:', getTechnicalDetails(error));
      return createErrorResponse(getUserMessage(error));
    }
    
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected get project artifacts error:', error);
    return createErrorResponse(`Unexpected error fetching artifacts: ${errorMessage}`);
  }
}