import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates that all required Supabase environment variables are present
 * Throws descriptive errors with setup instructions if any are missing
 */
function validateSupabaseEnvVars(): {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
} {
  const requiredVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  } as const;

  const missingVars = Object.entries(requiredVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    const varList = missingVars.map(v => `  - ${v}`).join('\n');
    throw new Error(
      `Missing required Supabase environment variables:\n${varList}\n\n` +
      `Please add these to your .env.local file.\n` +
      `You can find these values in your Supabase project's API settings:\n` +
      `https://supabase.com/dashboard/project/_/settings/api`
    );
  }

  // TypeScript now knows these are definitely strings (not undefined)
  return {
    NEXT_PUBLIC_SUPABASE_URL: requiredVars.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };
}

/**
 * Validated environment variables - throws on module load if any are missing
 * Use this instead of process.env directly for type safety and validation
 */
export const env = validateSupabaseEnvVars();

/**
 * Legacy check for backward compatibility - now uses correct variable names
 * @deprecated Use `env` object instead for better error handling
 */
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
