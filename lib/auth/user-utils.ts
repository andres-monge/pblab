import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Database } from "@/lib/db.types";

export type UserRole = Database['public']['Enums']['user_role'];

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

/**
 * Fetches authenticated user with role from database
 * Redirects to login if not authenticated
 * Handles database errors gracefully
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  try {
    // Get user role and name from database
    const { data: userData, error: dbError } = await supabase
      .from("users")
      .select("role, name")
      .eq("id", user.id)
      .single();

    if (dbError) {
      console.error("Database error fetching user:", dbError);
      // For now, default to student role but log the error
      // In production, you might want to redirect to an error page
      return {
        id: user.id,
        email: user.email!,
        role: "student" as UserRole,
        name: user.email?.split("@")[0] || "User",
      };
    }

    if (!userData) {
      console.warn("User not found in database, creating default profile");
      // User exists in auth but not in users table - this shouldn't happen
      // with our trigger, but handle gracefully
      return {
        id: user.id,
        email: user.email!,
        role: "student" as UserRole,
        name: user.email?.split("@")[0] || "User",
      };
    }

    return {
      id: user.id,
      email: user.email!,
      role: userData.role as UserRole,
      name: userData.name || user.email?.split("@")[0] || "User",
    };
  } catch (error) {
    console.error("Unexpected error fetching user data:", error);
    // Graceful fallback
    return {
      id: user.id,
      email: user.email!,
      role: "student" as UserRole,
      name: user.email?.split("@")[0] || "User",
    };
  }
}