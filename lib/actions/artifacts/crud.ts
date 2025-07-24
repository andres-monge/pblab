"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateFileType, validateUrlFormat } from "@/lib/security/file-validation";
import { 
  getAuthenticatedUser, 
  verifyProjectAccess, 
  verifyArtifactPermissions
} from "@/lib/actions/shared/authorization";
import { validateProjectNotClosed } from "@/lib/shared/authorization-utils";
import {
  validateProjectId,
  validateArtifactId,
  validateRequiredString,
  validateEnum
} from "@/lib/shared/validation";
import {
  CreateResult,
  UpdateResult,
  createIdResponse,
  createMessageResponse,
  createErrorResponse
} from "@/lib/shared/action-types";
import { 
  isPBLabError, 
  getUserMessage, 
  getTechnicalDetails,
  DatabaseError,
  ValidationError 
} from "@/lib/shared/errors";
import type { CreateArtifactParams, DeleteArtifactParams, Artifact } from './index';

/**
 * Create a new artifact for a project
 * 
 * Validates file types against security whitelist and ensures
 * user has permission to add artifacts to the project.
 * 
 * @param params - Artifact creation parameters
 * @returns Promise resolving to CreateResult with artifact ID or error
 */
export async function createArtifact(params: CreateArtifactParams): Promise<CreateResult> {
  const { projectId, title, url, type, mimeType, fileName } = params;

  // Validate required parameters
  const validatedProjectId = validateProjectId(projectId);
  const validatedTitle = validateRequiredString(title, 'Artifact title');
  const validatedUrl = validateRequiredString(url, 'Artifact URL');
  const validatedType = validateEnum(type, 'Artifact type', ['doc', 'image', 'video', 'link'] as const);

  // Validate file type for uploaded files (not external links)
  if (validatedType !== 'link') {
    if (!validateFileType(mimeType, fileName || validatedUrl)) {
      throw new ValidationError(
        'File type',
        'not allowed. Please upload a supported file format',
        { mimeType, fileName, url: validatedUrl }
      );
    }
  }

  // Basic URL validation for external links
  if (validatedType === 'link') {
    if (!validateUrlFormat(validatedUrl)) {
      throw new ValidationError(
        'URL format',
        'is invalid for external link',
        { url: validatedUrl }
      );
    }
  }

  try {
    // Verify user authentication and project access
    const user = await getAuthenticatedUser();
    const project = await verifyProjectAccess(validatedProjectId, user.id, user.role);
    
    // Check if project is closed (prevent artifact creation in closed projects)
    validateProjectNotClosed(project.phase, 'add artifacts to');

    const supabase = await createClient();

    // Create the artifact
    const artifactData: Artifact = {
      project_id: validatedProjectId,
      uploader_id: user.id,
      title: validatedTitle,
      url: validatedUrl,
      type: validatedType,
    };

    const { data: createdArtifact, error: artifactError } = await supabase
      .from('artifacts')
      .insert(artifactData)
      .select('id')
      .single();

    if (artifactError || !createdArtifact) {
      throw new DatabaseError(
        'create_artifact',
        artifactError?.message || 'Failed to create artifact',
        artifactError ? new Error(artifactError.message) : undefined,
        { artifactData }
      );
    }

    // Revalidate project page to show new artifact
    revalidatePath(`/p/${validatedProjectId}`);
    revalidatePath('/student/dashboard');
    revalidatePath('/educator/dashboard');
    revalidatePath('/dashboard');

    return createIdResponse(createdArtifact.id);
  } catch (error) {
    // Handle structured errors and convert to user-friendly responses
    if (isPBLabError(error)) {
      console.error('Artifact creation error:', getTechnicalDetails(error));
      return createErrorResponse(getUserMessage(error));
    }
    
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected artifact creation error:', error);
    return createErrorResponse(`Unexpected error creating artifact: ${errorMessage}`);
  }
}

/**
 * Delete an artifact
 * 
 * Checks if user is the owner of the artifact or an educator
 * with permission to manage the project.
 * 
 * @param params - Artifact deletion parameters
 * @returns Promise resolving to UpdateResult with success message or error
 */
export async function deleteArtifact(params: DeleteArtifactParams): Promise<UpdateResult> {
  const { artifactId } = params;

  // Validate required parameters
  const validatedArtifactId = validateArtifactId(artifactId);

  try {
    // Verify user authentication
    const user = await getAuthenticatedUser();
    
    const supabase = await createClient();

    // Get artifact details with project and team info
    const { data: artifact, error: artifactError } = await supabase
      .from('artifacts')
      .select(`
        id,
        title,
        uploader_id,
        project_id,
        projects!inner(
          id,
          team_id,
          phase,
          teams!inner(id, course_id)
        )
      `)
      .eq('id', validatedArtifactId)
      .single();

    if (artifactError || !artifact) {
      throw new DatabaseError(
        'get_artifact_details',
        artifactError?.message || 'Artifact not found',
        artifactError ? new Error(artifactError.message) : undefined,
        { artifactId: validatedArtifactId, userId: user.id }
      );
    }

    // Check if project is closed (prevent deletion in closed projects)
    validateProjectNotClosed(artifact.projects.phase, 'delete artifacts from');

    // Verify user has permission to delete this artifact
    await verifyArtifactPermissions(
      user.id,
      user.role,
      artifact.uploader_id,
      artifact.projects.team_id,
      true // requireOwnership = true for delete operations
    );

    // Delete the artifact
    const { error: deleteError } = await supabase
      .from('artifacts')
      .delete()
      .eq('id', validatedArtifactId);

    if (deleteError) {
      throw new DatabaseError(
        'delete_artifact',
        deleteError.message,
        new Error(deleteError.message),
        { artifactId: validatedArtifactId, artifactTitle: artifact.title }
      );
    }

    // Revalidate project page to remove deleted artifact
    revalidatePath(`/p/${artifact.project_id}`);
    revalidatePath('/student/dashboard');
    revalidatePath('/educator/dashboard');
    revalidatePath('/dashboard');

    return createMessageResponse(`Artifact "${artifact.title}" deleted successfully`);
  } catch (error) {
    // Handle structured errors and convert to user-friendly responses
    if (isPBLabError(error)) {
      console.error('Artifact deletion error:', getTechnicalDetails(error));
      return createErrorResponse(getUserMessage(error));
    }
    
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected artifact deletion error:', error);
    return createErrorResponse(`Unexpected error deleting artifact: ${errorMessage}`);
  }
}
