import { createServerSupabase } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAdminAllowlist, isAllowedAdminEmail } from "@/lib/admin-allowlist";

let warnedMissingAllowlist = false;

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

  const allowlistEnv = process.env.ADMIN_EMAILS;
  const allowlist = parseAdminAllowlist(allowlistEnv);
  if (allowlist.length > 0) {
    // Allowlist configured → only listed emails may mutate.
    if (!isAllowedAdminEmail(user.email, allowlistEnv)) {
      throw new Error("Forbidden");
    }
  } else if (!warnedMissingAllowlist) {
    // Fallback policy: when ADMIN_EMAILS is unset we keep the legacy behaviour
    // (any authenticated user passes). This avoids locking admins out during
    // rollout — set ADMIN_EMAILS before deploying to enforce the allowlist.
    // Warn once per process so the gap is visible in logs.
    warnedMissingAllowlist = true;
    console.warn(
      "[auth] ADMIN_EMAILS is not set — every authenticated user can mutate. " +
        "Set ADMIN_EMAILS (comma-separated admin login emails) to enforce the allowlist.",
    );
  }

  return supabase;
}
