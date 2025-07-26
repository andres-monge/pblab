"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db.types";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/actions/shared/authorization";
import {
  validateRequiredString,
  validateEmail,
  validateEnum,
  validateUserId
} from "@/lib/shared/validation";
import {
  QueryResult,
  CreateResult,
  UpdateResult,
  createSuccessResponse,
  createIdResponse,
  createMessageResponse,
  createErrorResponse
} from "@/lib/shared/action-types";

type UserRole = Database["public"]["Enums"]["user_role"];
type UserInsert = Database["public"]["Tables"]["users"]["Insert"];

/**
 * Enhanced user object for admin display
 */
export interface UserWithDetails {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/**
 * Parameters for creating a new user
 */
export interface CreateUserParams {
  /** User's full name */
  name: string;
  /** User's email address */
  email: string;
  /** User's role in the system */
  role: UserRole;
  /** Initial password for the user */
  password: string;
}

/**
 * Parameters for updating a user's role
 */
export interface UpdateUserRoleParams {
  /** ID of the user to update */
  userId: string;
  /** New role for the user */
  newRole: UserRole;
}

/**
 * Parameters for deleting a user
 */
export interface DeleteUserParams {
  /** ID of the user to delete */
  userId: string;
}

/**
 * Verify admin permissions
 * 
 * Helper function to ensure only admin users can perform admin operations
 */
async function requireAdminPermissions(): Promise<void> {
  const user = await getAuthenticatedUser();
  if (user.role !== 'admin') {
    throw new Error('Admin permissions required for this operation');
  }
}

/**
 * Get all users in the system
 * 
 * Fetches all users with their details for admin management.
 * Only accessible by admin users.
 * 
 * @returns Promise resolving to QueryResult with users array or error
 */
export async function getAllUsers(): Promise<QueryResult<UserWithDetails[]>> {
  try {
    // Verify admin permissions
    await requireAdminPermissions();
    
    const supabase = await createClient();

    // Fetch all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    return createSuccessResponse(users || []);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error fetching users: ${errorMessage}`);
  }
}

/**
 * Create a new user account
 * 
 * Creates a new user with the specified role and initial password.
 * Only accessible by admin users.
 * 
 * @param params - User creation parameters
 * @returns Promise resolving to CreateResult with user ID or error
 */
export async function createUser(params: CreateUserParams): Promise<CreateResult> {
  const { name, email, role, password } = params;

  // Validate required parameters
  const validatedName = validateRequiredString(name, 'Name');
  const validatedEmail = validateEmail(email);
  const validatedRole = validateEnum(role, 'Role', ['student', 'educator', 'admin'] as const);
  const validatedPassword = validateRequiredString(password, 'Password');

  try {
    // Verify admin permissions
    await requireAdminPermissions();
    
    const supabase = await createClient();

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', validatedEmail)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected if user doesn't exist
      console.error('Failed to check existing user:', checkError);
      throw new Error(`Failed to check existing user: ${checkError.message}`);
    }

    if (existingUser) {
      return createErrorResponse('A user with this email already exists');
    }

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: validatedEmail,
      password: validatedPassword,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        name: validatedName,
        role: validatedRole,
      },
    });

    if (authError || !authUser.user) {
      console.error('Failed to create auth user:', authError);
      throw new Error(`Failed to create user account: ${authError?.message || 'Unknown error'}`);
    }

    // Create user in public.users table
    const userData: UserInsert = {
      id: authUser.user.id,
      email: validatedEmail,
      name: validatedName,
      role: validatedRole,
    };

    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert(userData)
      .select('id')
      .single();

    if (createError || !createdUser) {
      console.error('Failed to create user record:', createError);
      // Clean up auth user if public user creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw new Error(`Failed to create user record: ${createError?.message || 'Unknown error'}`);
    }

    // Revalidate admin dashboard to show new user
    revalidatePath('/admin/dashboard');

    return createIdResponse(createdUser.id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error creating user: ${errorMessage}`);
  }
}

/**
 * Update a user's role
 * 
 * Changes the role of an existing user. Can promote/demote between
 * student, educator, and admin roles.
 * 
 * @param params - User role update parameters
 * @returns Promise resolving to UpdateResult with success message or error
 */
export async function updateUserRole(params: UpdateUserRoleParams): Promise<UpdateResult> {
  const { userId, newRole } = params;

  // Validate required parameters
  const validatedUserId = validateUserId(userId);
  const validatedRole = validateEnum(newRole, 'New role', ['student', 'educator', 'admin'] as const);

  try {
    // Verify admin permissions
    await requireAdminPermissions();
    
    const supabase = await createClient();

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role, email')
      .eq('id', validatedUserId)
      .single();

    if (userError || !user) {
      return createErrorResponse('User not found');
    }

    // Check if role is already the same
    if (user.role === validatedRole) {
      return createMessageResponse(`User already has the ${validatedRole} role`);
    }

    // Update user role
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        role: validatedRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validatedUserId);

    if (updateError) {
      console.error('Failed to update user role:', updateError);
      throw new Error(`Failed to update user role: ${updateError.message}`);
    }

    // Revalidate admin dashboard to show updated role
    revalidatePath('/admin/dashboard');
    revalidatePath('/dashboard');

    return createMessageResponse(`User role updated to ${validatedRole} successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error updating user role: ${errorMessage}`);
  }
}

/**
 * Delete a user from the system
 * 
 * Removes a user account completely. Database constraints will handle
 * cascading deletes for associated data.
 * 
 * @param params - User deletion parameters
 * @returns Promise resolving to UpdateResult with success message or error
 */
export async function deleteUser(params: DeleteUserParams): Promise<UpdateResult> {
  const { userId } = params;

  // Validate required parameters
  const validatedUserId = validateUserId(userId);

  try {
    // Verify admin permissions
    await requireAdminPermissions();
    
    const supabase = await createClient();

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', validatedUserId)
      .single();

    if (userError || !user) {
      return createErrorResponse('User not found');
    }

    // Prevent admin from deleting themselves
    const currentUser = await getAuthenticatedUser();
    if (user.id === currentUser.id) {
      return createErrorResponse('You cannot delete your own account');
    }

    // Delete user from auth (this will cascade to public.users via trigger)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(validatedUserId);

    if (authDeleteError) {
      console.error('Failed to delete auth user:', authDeleteError);
      throw new Error(`Failed to delete user: ${authDeleteError.message}`);
    }

    // Revalidate admin dashboard to remove deleted user
    revalidatePath('/admin/dashboard');

    return createMessageResponse(`User ${user.email} deleted successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error deleting user: ${errorMessage}`);
  }
}