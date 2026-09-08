# DO:NUTS CLASS

Development baseline for the DO:NUTS university poker union's membership,
classes, clubs, meetings, partners, and daily learning application.

The existing **schedule and series** are actively maintained product domains.
The first membership slice adds username login with email verification, signup
requests, scoped approvals, and member home/profile screens. Its new migration
and production Auth configuration must be deployed separately. Class sessions,
meetings, partners, daily learning, and XP remain subsequent implementation slices.

## Start here

- [Baseline architecture and decisions](docs/BASELINE.md)
- [Original developer handoff](docs/handoff/donuts-class-developer-handoff-v1/START_HERE.md)
- [Product requirements](docs/handoff/donuts-class-developer-handoff-v1/docs/01_PRODUCT_REQUIREMENTS.md)
- [XP and daily learning](docs/handoff/donuts-class-developer-handoff-v1/docs/05_XP_DAILY_LEARNING.md)
- [Database migration notes](supabase/README.md)
- [Membership implementation and rollout](docs/MEMBERSHIP.md)
- [Engineering and design rules](AGENTS.md)

## Development

Use Node.js 22 or later and npm. Install the lockfile dependencies with `npm ci`.
Configure `.env.local` using the variables documented in `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only username lookup and auth throttling)
- `SITE_URL` (canonical origin for authentication emails)
- `ADMIN_EMAILS` (optional extra administrator restriction)

Connect a Supabase project with the repository migrations applied, then run:

```sh
npm run dev
```

`/` shows the original DO:NUTS hero without the former lower content sections.
`/schedule` and `/series` retain the schedule and season pages.
Existing operators can use `/admin/login` to edit schedules, seasons, blind
structures, and public page settings. Admin identities must be authorized by
`public.admin_emails`; being signed in is not sufficient.

## Code structure

```text
app/(site)/         Active public landing, schedule, and series routes
app/(auth)/         Member signup, login, recovery, and application status
app/(member)/       Authenticated member home, profile, and scoped approvals
app/admin/          Active schedule, series, and membership operator screens
components/site/    Public navigation, footer, backdrop, reveal
components/ui/      Shared shadcn primitives
lib/site/           Active public-site models, queries, calendar and status rules
lib/membership/     Membership models, authorization, queries, and validation
lib/supabase/       Shared Auth/database clients
supabase/           Migration history and minimal non-destructive seed
docs/handoff/       Original product reference and prototype
```

Member features get their own domain modules and route shell as described in
`docs/BASELINE.md`. The handoff prototype and demo credentials are not runtime
application code or production seeds.

## Checks

```sh
npm test
npm run lint
npm run build
npm run typecheck
```

The production build generates route types; run it before the standalone type
check on a fresh checkout. Existing `next/font/google` fonts require network
access during the build.

## Database transition

Migration `0023_class_development_baseline.sql` retires program CMS, special
pages, dynamic navigation, league settings, and timer tables, while preserving
schedule/series data and Auth/Storage. Review the migration and back up an
existing target before applying it. Deploy this application before the cleanup
migration. No remote database migration is performed by local code cleanup.

Applied migrations remain in place. `supabase/seed.sql` no longer deletes or
repopulates content; a fresh database starts with empty schedule/series states.
The old automatic trash purge is removed. Trash for retained content is managed
manually, separately from future CLASS history archival.

Migration `0024_membership_foundation.sql` adds membership without changing any
schedule/series table. Signup is closed by default. Before opening enrollment,
follow `docs/MEMBERSHIP.md` for migrations, email delivery, callback URLs, actual
catalog setup, and the published privacy notice. No demo identities are created.
