import { createServerSupabase } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAdminAllowlist, isAllowedAdminEmail } from "@/lib/admin-allowlist";

/**
 * Shared gate for admin pages and mutations.
 * The DB is_admin() function is authoritative; an optional environment allowlist
 * can narrow access further. Missing configuration never grants admin access.
 */
export async function requireAdmin(): Promise<SupabaseClient> {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");

  const allowlistEnv = process.env.ADMIN_EMAILS;
  if (
    parseAdminAllowlist(allowlistEnv).length > 0 &&
    !isAllowedAdminEmail(user.email, allowlistEnv)
  ) {
    throw new Error("Forbidden");
  }

  const { data: isAdmin, error: permissionError } = await supabase.rpc("is_admin");
  if (permissionError || isAdmin !== true) throw new Error("Forbidden");
  return supabase;
}
