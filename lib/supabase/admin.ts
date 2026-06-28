import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase admin client that uses the service role key.
 * Bypasses Row Level Security – only use in trusted server-side code.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
