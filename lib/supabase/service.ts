import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db.types";
import { env } from "../utils";

/**
 * Service role Supabase client for admin operations
 * 
 * This client uses the service role key which bypasses Row Level Security (RLS)
 * and has administrative privileges including auth.admin operations.
 * 
 * IMPORTANT: Only use this client for legitimate admin operations that require
 * elevated privileges such as:
 * - Creating/deleting users via auth.admin
 * - Administrative data operations that need to bypass RLS
 * 
 * For regular database operations, prefer the standard server client
 * which respects RLS policies.
 */
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for service role operations. ' +
      'Please ensure this environment variable is set in your .env.local file.'
    );
  }

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}