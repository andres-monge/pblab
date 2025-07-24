"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/notifications";
import { 
  getAuthenticatedUser, 
  verifyArtifactPermissions
} from "@/lib/actions/shared/authorization";
import { validateProjectNotClosed } from "@/lib/shared/authorization-utils";
import type { CreateCommentParams, Comment } from './index';

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
    // Verify user authentication 
    await getAuthenticatedUser();
    
    const supabase = await createClient();

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
    // Verify user authentication
    const user = await getAuthenticatedUser();
    
    const supabase = await createClient();

    // Get artifact details with project and team info
    const { data: artifact, error: artifactError } = await supabase
      .from('artifacts')
      .select(`
        id,
        project_id,
        uploader_id,
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
    validateProjectNotClosed(artifact.projects.phase, 'add comments to artifacts in');

    // Verify user has permission to comment on this artifact
    await verifyArtifactPermissions(
      user.id,
      user.role,
      artifact.uploader_id,
      artifact.projects.team_id,
      false // requireOwnership = false for comment operations
    );

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
