"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db.types";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/notifications";

type Artifact = Database["public"]["Tables"]["artifacts"]["Insert"];
type Comment = Database["public"]["Tables"]["comments"]["Insert"];

/**
 * Allowed file types for artifact uploads
 * Implements security whitelist as required by test T-03
 */
const ALLOWED_FILE_TYPES = [
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
];

/**
 * Allowed file extensions (fallback for when MIME type is not available)
 */
const ALLOWED_FILE_EXTENSIONS = [
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
];

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

/**
 * Validate file type based on MIME type and/or file extension
 * Implements security whitelist as required by test T-03
 */
function validateFileType(mimeType?: string, fileName?: string): boolean {
  // For external links, skip file type validation
  if (!mimeType && !fileName) {
    return true;
  }

  // Check MIME type if available
  if (mimeType && ALLOWED_FILE_TYPES.includes(mimeType.toLowerCase())) {
    return true;
  }

  // Check file extension if available
  if (fileName) {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (ALLOWED_FILE_EXTENSIONS.includes(extension)) {
      return true;
    }
  }

  return false;
}



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
    try {
      new URL(url);
    } catch {
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

/**
 * Get users who can be mentioned in comments for a specific project
 * 
 * Returns team members (students) and course educators who have access
 * to the project and can be mentioned in artifact comments.
 * 
 * @param projectId - ID of the project to get mentionable users for
 * @returns Promise resolving to array of users with id, name, email
 * @throws Error if project not found or user lacks permission
 */
export async function getProjectMentionableUsers(projectId: string): Promise<Array<{id: string; name: string | null; email: string}>> {
  // Validate required parameters
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Project ID is required and must be a valid string');
  }

  try {
    // Create authenticated Supabase client
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to get mentionable users');
    }

    // Get project with team and course info to verify user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        team_id,
        teams!inner(
          id,
          course_id
        )
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or you do not have permission to access it');
    }

    // First get team member IDs
    const { data: teamUserIds, error: teamUserIdsError } = await supabase
      .from('teams_users')
      .select('user_id')
      .eq('team_id', project.team_id);

    if (teamUserIdsError) {
      console.error('Failed to fetch team user IDs:', teamUserIdsError);
      throw new Error(`Failed to fetch team user IDs: ${teamUserIdsError.message}`);
    }

    // Get team members (students who belong to this project's team)
    let teamMembers: Array<{id: string; name: string | null; email: string}> = [];
    if (teamUserIds && teamUserIds.length > 0) {
      const userIds = teamUserIds.map(tu => tu.user_id);
      const { data: members, error: membersError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'student')
        .in('id', userIds);

      if (membersError) {
        console.error('Failed to fetch team members:', membersError);
        throw new Error(`Failed to fetch team members: ${membersError.message}`);
      }
      teamMembers = members || [];
    }

    // Get course educators (educators who administer the course containing this project's team)
    let courseEducators: Array<{id: string; name: string | null; email: string}> = [];
    if (project.teams.course_id) {
      // First get the course admin ID
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('admin_id')
        .eq('id', project.teams.course_id)
        .single();

      if (courseError) {
        console.error('Failed to fetch course:', courseError);
        throw new Error(`Failed to fetch course: ${courseError.message}`);
      }

      // Then get the educator user details
      if (course?.admin_id) {
        const { data: educators, error: educatorsError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('role', 'educator')
          .eq('id', course.admin_id);

        if (educatorsError) {
          console.error('Failed to fetch course educators:', educatorsError);
          throw new Error(`Failed to fetch course educators: ${educatorsError.message}`);
        }
        courseEducators = educators || [];
      }
    }

    // Combine and deduplicate users
    const allUsers = [...(teamMembers || []), ...(courseEducators || [])];
    const uniqueUsers = allUsers.filter((user, index, array) => 
      array.findIndex(u => u.id === user.id) === index
    );

    return uniqueUsers;
  } catch (error) {
    // Re-throw with context if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected error types
    throw new Error(`Unexpected error fetching mentionable users: ${String(error)}`);
  }
}

/**
 * Create a comment on an artifact
 * 
 * Allows team members and educators to comment on artifacts
 * for collaborative discussion.
 * 
 * @param params - Comment creation parameters
 * @returns Promise resolving to the created comment ID
 * @throws Error if user not authenticated, artifact not found, or lacks permission
 */
export async function createComment(params: CreateCommentParams): Promise<string> {
  const { artifactId, body, mentionedUserIds = [] } = params;

  // Validate required parameters
  if (!artifactId || typeof artifactId !== 'string') {
    throw new Error('Artifact ID is required and must be a valid string');
  }

  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    throw new Error('Comment body is required and cannot be empty');
  }

  if (body.trim().length > 2000) {
    throw new Error('Comment body cannot exceed 2000 characters');
  }

  // Validate mentionedUserIds parameter
  if (mentionedUserIds && !Array.isArray(mentionedUserIds)) {
    throw new Error('Mentioned user IDs must be an array');
  }

  // Validate each user ID in the array
  if (mentionedUserIds) {
    for (const userId of mentionedUserIds) {
      if (!userId || typeof userId !== 'string') {
        throw new Error('All mentioned user IDs must be valid strings');
      }
    }
  }

  try {
    // Create authenticated Supabase client
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to create comments');
    }

    // Get artifact details with project and team info
    const { data: artifact, error: artifactError } = await supabase
      .from('artifacts')
      .select(`
        id,
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

    // Check if project is closed (prevent comments in closed projects)
    if (artifact.projects.phase === 'closed') {
      throw new Error('Cannot add comments to artifacts in a closed project');
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
    let canComment = false;

    if (userData.role === 'admin') {
      // Admins can comment on any artifact
      canComment = true;
    } else if (userData.role === 'educator') {
      // Educators can comment on artifacts from projects in their courses (RLS handles this)
      canComment = true;
    } else if (userData.role === 'student') {
      // Students can comment on artifacts from their team projects
      const { data: membership, error: membershipError } = await supabase
        .from('teams_users')
        .select('team_id')
        .eq('team_id', artifact.projects.team_id)
        .eq('user_id', user.id)
        .single();

      if (!membershipError && membership) {
        canComment = true;
      }
    }

    if (!canComment) {
      throw new Error('You can only comment on artifacts from projects of teams you belong to, or courses you teach');
    }

    // Create the comment
    const commentData: Comment = {
      artifact_id: artifactId,
      author_id: user.id,
      body: body.trim(),
    };

    const { data: createdComment, error: commentError } = await supabase
      .from('comments')
      .insert(commentData)
      .select('id')
      .single();

    if (commentError || !createdComment) {
      console.error('Failed to create comment:', commentError);
      throw new Error(`Failed to create comment: ${commentError?.message || 'Unknown error'}`);
    }

    // Process mentions if any were provided
    if (mentionedUserIds && mentionedUserIds.length > 0) {
      try {
        // Get mentionable users for this project to validate mentions
        const mentionableUsers = await getProjectMentionableUsers(artifact.project_id);
        const mentionableUserIds = mentionableUsers.map(u => u.id);

        // Deduplicate mentioned user IDs and filter to only valid/mentionable users
        const uniqueMentionedUserIds = [...new Set(mentionedUserIds)]
          .filter(userId => userId !== user.id) // Skip self-mentions
          .filter(userId => mentionableUserIds.includes(userId)); // Only allow mentionable users

        // Create notifications for each valid mentioned user
        for (const mentionedUserId of uniqueMentionedUserIds) {
          try {
            await createNotification({
              recipientId: mentionedUserId,
              type: 'mention_in_comment',
              referenceId: createdComment.id,
              referenceUrl: `/p/${artifact.project_id}`,
            });
          } catch (notificationError) {
            // Log the error but don't fail the comment creation
            console.error(`Failed to create mention notification for user ${mentionedUserId}:`, notificationError);
          }
        }
      } catch (mentionError) {
        // Log the error but don't fail the comment creation
        console.error('Failed to process mentions:', mentionError);
      }
    }

    // Revalidate project page to show new comment
    revalidatePath(`/p/${artifact.project_id}`);

    return createdComment.id;
  } catch (error) {
    // Re-throw with context if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected error types
    throw new Error(`Unexpected error creating comment: ${String(error)}`);
  }
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
  };
} 