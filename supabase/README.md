# Database baseline

The active retained tables after migration `0023` are:

- `seasons`
- `events`
- `blind_structures`
- `blind_structure_rows`
- `site_config`
- `admin_emails`

Supabase owns the Auth and Storage schemas. The `media` bucket and admin storage
policies are retained. `0024_membership_foundation.sql` adds membership catalogs,
profiles, applications, leadership assignments, audit records, RLS, and atomic
approval functions. It does not modify the tables listed above. A local migration
file is not evidence that the remote database has been migrated.

For a fresh database, apply migrations in their recorded order. The existing
production history uses timestamp versions with numeric filenames in the names;
do not blindly run `supabase db push` and reapply historical numeric migrations.
Apply only the new migration through a history-aware, backed-up rollout.
Keep already-applied migration files unchanged. For an existing project, deploy
the cleaned application and back up the database before applying `0023`; it drops
retired CMS/timer tables and their data but keeps schedule/series content.

The seed is non-destructive and contains no demo accounts. To authorize an actual
operator, create their identity in Supabase Auth and add their email to
`public.admin_emails` using a privileged database connection. An optional
`ADMIN_EMAILS` environment value can restrict the list further; it cannot grant
access on its own.

The original handoff SQL under `docs/handoff` is reference material, not a
migration. Membership reuses Auth with explicit RLS, scoped leadership, audit
records, and transactions. See `docs/BASELINE.md` and `docs/MEMBERSHIP.md`.
