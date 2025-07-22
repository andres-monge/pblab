import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../db.types";
import { env } from "../utils";

export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
