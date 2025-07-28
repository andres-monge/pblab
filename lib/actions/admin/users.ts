"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/db.types";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/actions/shared/authorization";
import jwt from "jsonwebtoken";
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
  TokenResult,
  createSuccessResponse,
  createIdResponse,
  createMessageResponse,
  createErrorResponse,
  createTokenResponse
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
 * Parameters for generating a user invite token
 */
export interface GenerateUserInviteParams {
  /** User's email address */
  email: string;
  /** User's full name */
  name: string;
  /** Role to assign to the user */
  role: UserRole;
}

/**
 * Decoded JWT token payload for user invites
 */
export interface UserInviteTokenPayload {
  /** User's email address */
  email: string;
  /** User's full name */
  name: string;
  /** Role to assign to the user */
  role: UserRole;
  /** Token expiration timestamp */
  exp: number;
  /** Token issued at timestamp */
  iat: number;
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

    // Create user in Supabase Auth using service role client
    const serviceSupabase = createServiceClient();
    const { data: authUser, error: authError } = await serviceSupabase.auth.admin.createUser({
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

    // Create user in public.users table using service role client to bypass RLS
    const userData: UserInsert = {
      id: authUser.user.id,
      email: validatedEmail,
      name: validatedName,
      role: validatedRole,
    };

    const { data: createdUser, error: createError } = await serviceSupabase
      .from('users')
      .insert(userData)
      .select('id')
      .single();

    if (createError || !createdUser) {
      console.error('Failed to create user record:', createError);
      // Clean up auth user if public user creation fails
      await serviceSupabase.auth.admin.deleteUser(authUser.user.id);
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
 * Generate an invite token for a new user
 * 
 * Creates a JWT token that can be used to invite a user with a specific role.
 * The token contains user details and expires in 7 days.
 * Only accessible by admin users.
 * 
 * @param params - User invite parameters
 * @returns Promise resolving to TokenResult with invite token or error
 */
export async function generateUserInviteToken(params: GenerateUserInviteParams): Promise<TokenResult> {
  const { email, name, role } = params;

  // Validate required parameters
  const validatedEmail = validateEmail(email);
  const validatedName = validateRequiredString(name, 'Name');
  const validatedRole = validateEnum(role, 'Role', ['student', 'educator', 'admin'] as const);

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

    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }

    // Create token payload
    const payload: UserInviteTokenPayload = {
      email: validatedEmail,
      name: validatedName,
      role: validatedRole,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now
      iat: Math.floor(Date.now() / 1000),
    };

    // Generate JWT token
    const token = jwt.sign(payload, jwtSecret);

    return createTokenResponse(token);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error generating invite token: ${errorMessage}`);
  }
}

/**
 * Verify a user invite token
 * 
 * Validates and decodes a user invite token to extract user details.
 * 
 * @param token - The JWT token to verify
 * @returns Promise resolving to QueryResult with user invite data or error
 */
export async function verifyUserInviteToken(token: string): Promise<QueryResult<UserInviteTokenPayload>> {
  if (!token || typeof token !== 'string') {
    return createErrorResponse('Token is required and must be a valid string');
  }

  try {
    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }

    // Verify and decode token
    const decoded = jwt.verify(token, jwtSecret) as UserInviteTokenPayload;

    // Additional validation
    const validatedEmail = validateEmail(decoded.email);
    const validatedName = validateRequiredString(decoded.name, 'Name');
    const validatedRole = validateEnum(decoded.role, 'Role', ['student', 'educator', 'admin'] as const);

    return createSuccessResponse({
      email: validatedEmail,
      name: validatedName,
      role: validatedRole,
      exp: decoded.exp,
      iat: decoded.iat,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return createErrorResponse('Invalid invite token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      return createErrorResponse('Invite token has expired');
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error verifying invite token: ${errorMessage}`);
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
    const serviceSupabase = createServiceClient();
    const { error: authDeleteError } = await serviceSupabase.auth.admin.deleteUser(validatedUserId);

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