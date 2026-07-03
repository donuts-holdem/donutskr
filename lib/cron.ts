/**
 * Constant-shaped check for the `Authorization: Bearer <CRON_SECRET>` header
 * Vercel Cron sends. Kept pure so the 401 gate is unit-testable without a
 * request. Fails closed when the secret is unset.
 */
export function isAuthorizedCron(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}
