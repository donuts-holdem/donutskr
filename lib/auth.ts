import { createServerSupabase } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Gate for mutating server actions. Server actions are POST endpoints addressable
 * by action id regardless of the proxy.ts matcher, so each mutation must verify
 * the caller itself rather than relying on middleware + RLS alone. Returns an
 * authenticated Supabase client (cookie-scoped) on success; throws otherwise.
 */
export async function requireAdmin(): Promise<SupabaseClient> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Unauthorized");
  }
  return supabase;
}
