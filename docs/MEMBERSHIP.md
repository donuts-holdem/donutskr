# Membership implementation

## Confirmed product rules

The complete owner-approved policy register is
[MEMBER_CLASS_CLUB_DECISIONS.md](MEMBER_CLASS_CLUB_DECISIONS.md).

Keep username/password login with an additional Supabase Auth email for
verification/recovery. Email verification grants regular membership; class and
club approvals grant only their own affiliations. Initial class selection is
mandatory, club selection optional. Multiple simultaneous affiliations and
cross-school club applications are allowed.

The public landing stays at `/`. Schedule and series are maintained domains under
`lib/site/**`, not legacy code or replacement targets.

## Implemented in this source slice

- `/signup`, `/signup/complete`: catalog-backed registration and versioned consent,
  with clear separation of email activation from entity approval.
- `/login`, recovery routes and `/auth/callback`: existing Supabase Auth flows.
- `/membership/status`: verification and suspended/withdrawn account notices.
- `/home`, `/my`: regular members may enter without approved affiliations.
- `/class`, `/club`: catalog, own affiliations, pending/rejected applications and
  applications to additional entities without removing existing memberships.
- `/admin/members`, `/leader/approvals`: independent class/club approval queues;
  entity-scoped authorization is enforced in the database, not just the view.
- `/admin/members/directory`: paginated name/username/phone search, status filter,
  suspension/restoration and scoped leader removal.
- `/admin/members/settings`: signup/consent settings and school registration.
  Class/club creation and leader management now live in the domain operating pages.
- `/admin/classes`, `/admin/clubs`: creation, editing, Auth-backed leadership,
  approved affiliation management, archival and unused-only deletion.
- `/leader/class`, `/leader/club`: entity-scoped operating views. Class session
  detail includes schedule changes, attendance and lifecycle operations.
- `/class/[id]`, `/club/[id]`: member detail pages; `/my` also displays actual
  class attendance, activity XP and its adjustment history.
- Administrators can enter member views without creating a member profile.

This change does not implement the complete handoff MVP or all agreed policies.
No meeting or learning screens, demo identities or invented XP records are created.
See `CLASS_OPERATIONS.md` for the exact new operations scope and rollout status.

## Database and authorization

Applied migration `0024_membership_foundation.sql` is immutable. Migrations
`0025_independent_affiliations.sql` and `0026_class_club_operations.sql` must be
applied in order before this app version is deployed. Creating these files does
not change any deployed database. Neither was applied during this operations task.

0025 preserves `signup_requests` as original registration/consent snapshots and
copies their decisions into independently scoped `affiliation_requests`. It does
not retroactively grant pending affiliations or remove existing memberships.
The old combined approval RPC is disabled, including calls from stale clients.
It must not be used as an alternative approval path.

The Auth signup trigger validates required fields, catalog and consent in the
account transaction. It creates independent class and optional club requests.
Email confirmation activates only PENDING profiles, never suspended/withdrawn
profiles. Already-confirmed PENDING profiles are activated during migration,
without granting their pending affiliations. Auth metadata cannot grant roles.

All application/approval/leader/status mutations use the caller's JWT and
authorization-checking database functions. A short shared transaction lock
serializes membership mutations so approval, suspension and leader revocation
cannot race through separate permission checks. Request rows are locked and
pending uniqueness is also enforced by partial indexes. Replaying the same
decision is idempotent; an opposite decision cannot overwrite history.

RLS limits request reads to the applicant, their entity's assigned leaders and
administrators. Class approval cannot grant club affiliation, and vice versa.
Browser/member clients cannot directly write memberships, profiles, approvals,
leadership or audit records. The private service-role client remains limited to
existing username/email resolution and auth throttling, not membership writes.

0026 also removes direct authenticated writes to class/club catalogs. Their
creation RPC requires actual leaders and, for classes, at least one dated session.
Leader user IDs reference Auth rather than member profiles, so administrator
accounts can lead without fabricated member enrollment. Leader selection alone
never adds a class/club membership or attendance entry.

Session operations share the membership transaction lock, recheck caller scope
after acquiring it, and reject stale revisions. Archived entities cannot accept
new affiliations or ordinary operations, including requests through old signup
and approval RPCs. Attendance rosters, closure snapshots and XP adjustments are
retained separately from the current affiliation state.

Suspension preserves affiliations but removes leader assignments atomically.
Restoration does not resurrect leadership. Normal removal of the last active,
verified leader is blocked until a replacement exists; suspension is not blocked.
State/reason and affected assignment IDs are retained in the audit log.

## Remaining agreed implementation

1. Full member profile editing and withdrawal/anonymization across Auth,
   snapshots and audit records. Existing suspension/restoration is retained.
2. Linked successor classes, previewed automatic enrollment or invitations,
   in-service notification and email delivery. Closure and its affiliation
   snapshot are implemented, but do not themselves enroll or notify anyone.
3. Club meetings, capacity-limited applications, held waitlist offers and history.
4. Reviewed/versioned daily learning, its XP sources, streaks and analytics.

The tracked policy interview is complete. Session counts have no business maximum;
the old 1-12 draft limit does not apply. Attendance XP uses the approved 100 XP
and auditable net-adjustment policy, with activity levels separate from poker skill.

## Rollout prerequisites

1. Back up the target, apply missing 0025 followed by 0026 and record each using
   the target's existing migration-history convention. Do not blindly replay old
   numbered files against timestamped production history. Coordinate the schema
   and application rollout; this source is not compatible with a 0024-only DB.
2. Validate the new policies explicitly before deployment: email activation,
   mixed class/club leadership, cross-school and simultaneous applications,
   repeated/concurrent decisions, direct RLS requests, suspension/recovery,
   final-leader protection and retained schedule/series regressions. Include the
   new attendance, concurrency, closure, recovery and XP cases in
   `CLASS_OPERATIONS.md` before deploying the operations slice.
3. `SITE_URL=https://donutskr.vercel.app` remains the production auth origin.
   Supabase callback allowlists must match `/auth/callback` with the approved
   `/membership/status` and `/reset-password` next paths. `do-nuts.kr` is separate.
4. Keep email confirmation enabled and configure real SMTP, templates and abuse
   controls. This source change neither configures SMTP nor sends invitations.
5. Register actual catalogs and a published privacy notice/version before opening
   signup. No demo identities, passwords or schools are seeded.
6. Rotate credentials previously exposed outside secure configuration. Do not
   put secret keys or access tokens in tracked files or client bundles.

No tests, build, browser checks, production migration or deployment were run for
the class/club operations slice. Earlier membership validation does not validate
these new source changes. Testing and production actions need separate approval.

## 2026-09-09 validated rollout update

This supersedes earlier unvalidated/unapplied checkpoints: 155 tests, lint and
production build passed; 56 isolated PostgreSQL checks passed. Migrations 0025
and 0026 were backed up and applied to production with retained-data hashes
unchanged. See [the release record](RELEASE_2026-09-09.md) for remote versions,
coverage limits and downstream scope.
