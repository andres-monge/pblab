"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateFileType, validateUrlFormat } from "@/lib/security/file-validation";
import type { CreateArtifactParams, DeleteArtifactParams, Artifact } from './index';

/**
 * Create a new artifact for a project
 * 
 * Validates file types against security whitelist and ensures
 * user has permission to add artifacts to the project.
 * 
 * @param params - Artifact creation parameters
 * @returns Promise resolving to the created artifact ID
 * @throws Error if file type not allowed, user not authenticated, or lacks permission
 */
export async function createArtifact(params: CreateArtifactParams): Promise<string> {
  const { projectId, title, url, type, mimeType, fileName } = params;

  // Validate required parameters
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Project ID is required and must be a valid string');
  }

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('Artifact title is required and cannot be empty');
  }

  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    throw new Error('Artifact URL is required and cannot be empty');
  }

  if (!type || !['doc', 'image', 'video', 'link'].includes(type)) {
    throw new Error('Artifact type must be one of: doc, image, video, link');
  }

  // Validate file type for uploaded files (not external links)
  if (type !== 'link') {
    if (!validateFileType(mimeType, fileName || url)) {
      throw new Error('File type not allowed. Please upload a supported file format.');
    }
  }

  // Basic URL validation for external links
  if (type === 'link') {
    if (!validateUrlFormat(url)) {
      throw new Error('Invalid URL format for external link');
    }
  }

  try {
    // Create authenticated Supabase client
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to create artifacts');
    }

    // Verify project exists and user has access (RLS will handle permissions)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, team_id, phase')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or you do not have permission to access it');
    }

    // Check if project is closed (prevent artifact creation in closed projects)
    if (project.phase === 'closed') {
      throw new Error('Cannot add artifacts to a closed project');
    }

    // For students, verify they are team members (educators can add to any project in their courses)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('Failed to verify user permissions');
    }

    if (userData.role === 'student') {
      // Verify student is a member of this project's team
      const { data: membership, error: membershipError } = await supabase
        .from('teams_users')
        .select('team_id')
        .eq('team_id', project.team_id)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership) {
        throw new Error('You can only add artifacts to projects of teams you belong to');
      }
    }

    // Create the artifact
    const artifactData: Artifact = {
      project_id: projectId,
      uploader_id: user.id,
      title: title.trim(),
      url: url.trim(),
      type: type,
    };

    const { data: createdArtifact, error: artifactError } = await supabase
      .from('artifacts')
      .insert(artifactData)
      .select('id')
      .single();

    if (artifactError || !createdArtifact) {
      console.error('Failed to create artifact:', artifactError);
      throw new Error(`Failed to create artifact: ${artifactError?.message || 'Unknown error'}`);
    }

    // Revalidate project page to show new artifact
    revalidatePath(`/p/${projectId}`);
    revalidatePath('/student/dashboard');
    revalidatePath('/educator/dashboard');
    revalidatePath('/dashboard');

    return createdArtifact.id;
  } catch (error) {
    // Re-throw with context if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected error types
    throw new Error(`Unexpected error creating artifact: ${String(error)}`);
  }
}

/**
 * Delete an artifact
 * 
 * Checks if user is the owner of the artifact or an educator
 * with permission to manage the project.
 * 
 * @param params - Artifact deletion parameters
 * @returns Promise resolving to success message
 * @throws Error if user not authenticated, artifact not found, or lacks permission
 */
export async function deleteArtifact(params: DeleteArtifactParams): Promise<string> {
  const { artifactId } = params;

  // Validate required parameters
  if (!artifactId || typeof artifactId !== 'string') {
    throw new Error('Artifact ID is required and must be a valid string');
  }

  try {
    // Create authenticated Supabase client
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to delete artifacts');
    }

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
      .eq('id', artifactId)
      .single();

    if (artifactError || !artifact) {
      throw new Error('Artifact not found or you do not have permission to access it');
    }

    // Check if project is closed (prevent deletion in closed projects)
    if (artifact.projects.phase === 'closed') {
      throw new Error('Cannot delete artifacts from a closed project');
    }

    // Get user role for authorization checks
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('Failed to verify user permissions');
    }

    // Authorization logic
    let canDelete = false;

    if (userData.role === 'admin') {
      // Admins can delete any artifact
      canDelete = true;
    } else if (userData.role === 'educator') {
      // Educators can delete artifacts from projects in their courses (RLS handles this)
      canDelete = true;
    } else if (userData.role === 'student') {
      // Students can only delete their own artifacts from their team projects
      if (artifact.uploader_id === user.id) {
        // Verify student is a member of the project's team
        const { data: membership, error: membershipError } = await supabase
          .from('teams_users')
          .select('team_id')
          .eq('team_id', artifact.projects.team_id)
          .eq('user_id', user.id)
          .single();

        if (!membershipError && membership) {
          canDelete = true;
        }
      }
    }

    if (!canDelete) {
      throw new Error('You can only delete artifacts you uploaded, or you must be an educator for this course');
    }

    // Delete the artifact
    const { error: deleteError } = await supabase
      .from('artifacts')
      .delete()
      .eq('id', artifactId);

    if (deleteError) {
      console.error('Failed to delete artifact:', deleteError);
      throw new Error(`Failed to delete artifact: ${deleteError.message}`);
    }

    // Revalidate project page to remove deleted artifact
    revalidatePath(`/p/${artifact.project_id}`);
    revalidatePath('/student/dashboard');
    revalidatePath('/educator/dashboard');
    revalidatePath('/dashboard');

    return `Artifact "${artifact.title}" deleted successfully`;
  } catch (error) {
    // Re-throw with context if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected error types
    throw new Error(`Unexpected error deleting artifact: ${String(error)}`);
  }
}
