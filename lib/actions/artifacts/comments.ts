"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/notifications";
import { 
  getAuthenticatedUser, 
  verifyArtifactPermissions
} from "@/lib/actions/shared/authorization";
import { validateProjectNotClosed } from "@/lib/shared/authorization-utils";
import {
  validateProjectId,
  validateArtifactId,
  validateRequiredString,
  validateStringArray
} from "@/lib/shared/validation";
import {
  QueryResult,
  CreateResult,
  createSuccessResponse,
  createIdResponse,
  createErrorResponse
} from "@/lib/shared/action-types";
import { 
  isPBLabError, 
  getUserMessage, 
  getTechnicalDetails,
  DatabaseError 
} from "@/lib/shared/errors";
import type { CreateCommentParams, Comment } from './index';

/**
 * Get users who can be mentioned in comments for a specific project
 * 
 * Returns team members (students) and course educators who have access
 * to the project and can be mentioned in artifact comments.
 * 
 * @param projectId - ID of the project to get mentionable users for
 * @returns Promise resolving to QueryResult with array of users or error
 */
export async function getProjectMentionableUsers(projectId: string): Promise<QueryResult<Array<{id: string; name: string | null; email: string}>>> {
  // Validate required parameters
  const validatedProjectId = validateProjectId(projectId);

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
      .eq('id', validatedProjectId)
      .single();

    if (projectError || !project) {
      throw new DatabaseError(
        'get_project_for_mentions',
        projectError?.message || 'Project not found',
        projectError ? new Error(projectError.message) : undefined,
        { projectId: validatedProjectId }
      );
    }

    // First get team member IDs
    const { data: teamUserIds, error: teamUserIdsError } = await supabase
      .from('teams_users')
      .select('user_id')
      .eq('team_id', project.team_id);

    if (teamUserIdsError) {
      throw new DatabaseError(
        'get_team_user_ids',
        teamUserIdsError.message,
        new Error(teamUserIdsError.message),
        { teamId: project.team_id, projectId: validatedProjectId }
      );
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
        throw new DatabaseError(
          'get_team_members',
          membersError.message,
          new Error(membersError.message),
          { teamId: project.team_id, userIds: userIds }
        );
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
        throw new DatabaseError(
          'get_course_admin',
          courseError.message,
          new Error(courseError.message),
          { courseId: project.teams.course_id }
        );
      }

      // Then get the educator user details
      if (course?.admin_id) {
        const { data: educators, error: educatorsError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('role', 'educator')
          .eq('id', course.admin_id);

        if (educatorsError) {
          throw new DatabaseError(
            'get_course_educators',
            educatorsError.message,
            new Error(educatorsError.message),
            { courseAdminId: course.admin_id }
          );
        }
        courseEducators = educators || [];
      }
    }

    // Combine and deduplicate users
    const allUsers = [...(teamMembers || []), ...(courseEducators || [])];
    const uniqueUsers = allUsers.filter((user, index, array) => 
      array.findIndex(u => u.id === user.id) === index
    );

    return createSuccessResponse(uniqueUsers);
  } catch (error) {
    // Handle structured errors and convert to user-friendly responses
    if (isPBLabError(error)) {
      console.error('Get mentionable users error:', getTechnicalDetails(error));
      return createErrorResponse(getUserMessage(error));
    }
    
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected get mentionable users error:', error);
    return createErrorResponse(`Unexpected error fetching mentionable users: ${errorMessage}`);
  }
}

/**
 * Create a comment on an artifact
 * 
 * Allows team members and educators to comment on artifacts
 * for collaborative discussion.
 * 
 * @param params - Comment creation parameters
 * @returns Promise resolving to CreateResult with comment ID or error
 */
export async function createComment(params: CreateCommentParams): Promise<CreateResult> {
  const { artifactId, body, mentionedUserIds = [] } = params;

  // Validate required parameters
  const validatedArtifactId = validateArtifactId(artifactId);
  const validatedBody = validateRequiredString(body, 'Comment body', 2000);
  const validatedMentionedUserIds = validateStringArray(mentionedUserIds, 'Mentioned user IDs', false);

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
      .eq('id', validatedArtifactId)
      .single();

    if (artifactError || !artifact) {
      throw new DatabaseError(
        'get_artifact_for_comment',
        artifactError?.message || 'Artifact not found',
        artifactError ? new Error(artifactError.message) : undefined,
        { artifactId: validatedArtifactId, userId: user.id }
      );
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
      artifact_id: validatedArtifactId,
      author_id: user.id,
      body: validatedBody,
    };

    const { data: createdComment, error: commentError } = await supabase
      .from('comments')
      .insert(commentData)
      .select('id')
      .single();

    if (commentError || !createdComment) {
      throw new DatabaseError(
        'create_comment',
        commentError?.message || 'Failed to create comment',
        commentError ? new Error(commentError.message) : undefined,
        { commentData }
      );
    }

    // Process mentions if any were provided
    if (validatedMentionedUserIds && validatedMentionedUserIds.length > 0) {
      try {
        // Get mentionable users for this project to validate mentions
        const mentionableUsersResult = await getProjectMentionableUsers(artifact.project_id);
        if (!mentionableUsersResult.success) {
          console.error('Failed to get mentionable users for mentions:', mentionableUsersResult.error);
        } else {
          const mentionableUserIds = mentionableUsersResult.data.map(u => u.id);

          // Deduplicate mentioned user IDs and filter to only valid/mentionable users
          const uniqueMentionedUserIds = [...new Set(validatedMentionedUserIds)]
            .filter(userId => userId !== user.id) // Skip self-mentions
            .filter(userId => mentionableUserIds.includes(userId)); // Only allow mentionable users

          // Create notifications for each valid mentioned user
          for (const mentionedUserId of uniqueMentionedUserIds) {
            try {
              const notificationResult = await createNotification({
                recipientId: mentionedUserId,
                type: 'mention_in_comment',
                referenceId: createdComment.id,
                referenceUrl: `/p/${artifact.project_id}`,
              });
              if (!notificationResult.success) {
                console.error(`Failed to create mention notification for user ${mentionedUserId}:`, notificationResult.error);
              }
            } catch (notificationError) {
              // Log the error but don't fail the comment creation
              console.error(`Failed to create mention notification for user ${mentionedUserId}:`, notificationError);
            }
          }
        }
      } catch (mentionError) {
        // Log the error but don't fail the comment creation
        console.error('Failed to process mentions:', mentionError);
      }
    }

    // Revalidate project page to show new comment
    revalidatePath(`/p/${artifact.project_id}`);

    return createIdResponse(createdComment.id);
  } catch (error) {
    // Handle structured errors and convert to user-friendly responses
    if (isPBLabError(error)) {
      console.error('Comment creation error:', getTechnicalDetails(error));
      return createErrorResponse(getUserMessage(error));
    }
    
    // Handle unexpected error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected comment creation error:', error);
    return createErrorResponse(`Unexpected error creating comment: ${errorMessage}`);
  }
}
