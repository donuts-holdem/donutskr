/**
 * Admin email allowlist parsing/matching. Pure functions (no server deps) so
 * they can be unit-tested in isolation and reused by requireAdmin().
 *
 * ADMIN_EMAILS is a comma-separated list of admin login emails. Matching is
 * case-insensitive and whitespace-tolerant.
 */

/** Parse ADMIN_EMAILS into a normalized (trimmed, lowercased, non-empty) list. */
export function parseAdminAllowlist(allowlistEnv: string | undefined | null): string[] {
  if (!allowlistEnv) return [];
  return allowlistEnv
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

/**
 * True when `email` is present in the parsed allowlist. Returns false when the
 * allowlist is empty/unset or the email is missing — callers decide how to
 * apply optional environment restrictions. DB authorization is always required.
 */
export function isAllowedAdminEmail(
  email: string | undefined | null,
  allowlistEnv: string | undefined | null,
): boolean {
  const allowlist = parseAdminAllowlist(allowlistEnv);
  if (allowlist.length === 0) return false;
  if (!email) return false;
  return allowlist.includes(email.trim().toLowerCase());
}
