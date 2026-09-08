# Membership implementation: first slice

## Product decisions

- Schedule and series remain actively maintained in `lib/site/**`; the previous
  `legacy` name did not imply an agreed retirement and has been removed.
- Keep the original username/password login. Collect an additional email address
  for Supabase Auth verification and password recovery, as approved by the owner.
- Do not store passwords or grant permissions from editable Auth user metadata.
- Keep the public landing at `/`; approved members use `/home` and `/my`.
- Scoped leadership and transactional approvals are already handoff requirements,
  not independently invented product additions.

## Implemented in source

- `/signup`: actual membership fields, current catalog choices, versioned consent.
- `/signup/complete`: email confirmation instructions without account disclosure.
- `/login`: username/password login; email resolution stays on the server.
- `/forgot-password`, `/reset-password`, `/auth/callback`: Supabase Auth recovery.
- `/membership/status`: pending, rejected, suspended, and withdrawn states.
- `/home`, `/my`: approved-member gates and actual profile/affiliation data.
- `/admin/members`: paginated pending, approved, and rejected applications.
- `/admin/members/settings`: initial catalogs, signup switch, consent document,
  and administrator-controlled initial leader assignments.
- `/leader/approvals`: only applications for assigned classes/clubs.

Supabase Auth can authenticate a pending identity to display its own application.
This is not member access: the server DAL and DB membership checks require
`ACTIVE` status and a confirmed email before member-domain access.

## Database and authorization

`0024_membership_foundation.sql` introduces schools, class/club catalogs,
`member_profiles`, memberships, leader assignments, `signup_requests`,
`membership_audit_log`, settings, and a private authentication throttle.

All new tables use RLS. Browser/member JWTs cannot directly change profiles,
approval state, leader assignments, memberships, or audit rows. Their mutations
go through authorization-checking DB functions. The service-role key is used
only for private username/email lookup and authentication attempt throttling;
normal membership mutations use the actual caller's cookie session.

Signup data is inserted by an Auth after-insert trigger in the Auth account's
transaction. The trigger accepts only membership fields, always starts at
`PENDING`, and validates current catalog entries and consent version in the DB.
It does not affect identities created without `donuts_membership` metadata,
including existing operator identities. Confirmed identities without a profile,
and rejected applicants, can submit through an authenticated enrollment RPC.

Approval locks the request, applicant, and relevant leader assignment. It checks
the confirmed email and current catalog, updates status, adds class/club
memberships, and records the decision/audit together. Replaying the same decision
does not duplicate side effects; an opposite decision cannot overwrite it.
Rejections preserve their history and allow a new application while pending.

The login/recovery throttle permits ten requests per normalized identifier per
15-minute bucket and fails closed if unavailable. Keys are SHA-256 digests;
neither passwords nor raw email addresses are stored in the throttle table.
This is not a replacement for provider limits, perimeter abuse controls, or
CAPTCHA. Expired throttle buckets are removed; application/audit history is not.

## Initial operator setup

The first slice needs real class/school choices before the first member can
apply. Initial catalog registration is a bootstrap tool, not the final CLASS or
CLUB creation workflow. An existing administrator can register catalog entries,
approve actual first operators, and then assign their class/club leadership.
No sample members, demo passwords, fake schools, or fictitious classes are seeded.

Full class/club creation screens, minimum leader/session rules, session
operations, leader removal/reassignment, and catalog editing are the next domain
slice. The temporary bootstrap controls should move into those full workflows.
The full MEMBERS search/edit/suspension/withdrawal console is also not included
in the approval-only first slice; do not present this as the full handoff MVP.

## Required before production enrollment

1. Rotate credentials previously exposed outside secure configuration and set a
   fresh server-only `SUPABASE_SERVICE_ROLE_KEY` in the deployment environment.
2. Back up the target and apply only `0024`, recording it in the existing remote
   migration history. Do not replay immutable cleanup/historical migrations.
3. The tracked `.env.production` supplies the public `SITE_URL=https://donutskr.vercel.app`
   default. Deployment environment variables can override it; never add secrets
   to that file. Match Supabase's Site URL and allow the exact callback URLs for `/auth/callback` with
   `next=/membership/status` and `next=/reset-password`.
4. Keep email confirmations enabled and configure production SMTP, email
   templates, provider rate limits, and abuse controls. No provider configuration
   or credentials are changed merely by adding these application files.
5. With the default PKCE confirmation flow, open the email in the same browser
   that initiated signup/recovery. The callback also accepts an explicitly
   configured token-hash template with `type=signup`, `email`, or `recovery` for
   cross-browser links. Never put email tokens into application logs.
6. Register real initial catalogs in `/admin/members/settings`. Publish the actual
   privacy/collection notice and set its HTTPS URL and version. Signup defaults
   to closed and cannot open through the admin action without a class and notice.
7. Explicitly authorize and perform validation before rollout: username uniqueness,
   email confirmation/recovery, pending-member isolation, unaffiliated-leader
   denial, concurrent/repeated decisions, RLS direct requests, and all retained
   public/admin pages. Responsive/browser checks have not been performed here.

Official integration references: [Supabase password auth](https://supabase.com/docs/guides/auth/passwords),
[SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[Auth profile triggers](https://supabase.com/docs/guides/auth/managing-user-data).

## Next slices

1. Full class and leader workflows, dated sessions, attendance locking, completion,
   and an idempotent XP ledger.
2. Full university-club and meeting workflows, capacity-safe applications, and
   24-hour archival that preserves records.
3. Partner operations and benefits.
4. Reviewed/versioned daily learning, private answer keys, server grading,
   transactional completion/XP, and KST streak calculation.

Only working home/profile navigation is exposed now. Do not publish dead class,
club, partner, or learning tabs, invented XP balances, or success-returning stubs.
