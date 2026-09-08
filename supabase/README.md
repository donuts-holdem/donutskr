# Database baseline

The active retained tables after migration `0023` are:

- `seasons`
- `events`
- `blind_structures`
- `blind_structure_rows`
- `site_config`
- `admin_emails`

Supabase owns the Auth and Storage schemas. The `media` bucket and admin storage
policies are retained. New CLASS domains are not migrated yet.

Run migrations in numeric order through the project's normal Supabase workflow.
Keep already-applied migration files unchanged. For an existing project, deploy
the cleaned application and back up the database before applying `0023`; it drops
retired CMS/timer tables and their data but keeps schedule/series content.

The seed is non-destructive and contains no demo accounts. To authorize an actual
operator, create their identity in Supabase Auth and add their email to
`public.admin_emails` using a privileged database connection. An optional
`ADMIN_EMAILS` environment value can restrict the list further; it cannot grant
access on its own.

The original handoff SQL under `docs/handoff` is reference material, not a
migration. Future membership must reuse Auth and introduce explicit RLS, scoped
leadership, audit records, and transactions. See `docs/BASELINE.md`.
