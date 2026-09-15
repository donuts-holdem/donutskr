# DO:NUTS CLASS

Development baseline for the DO:NUTS university poker union's membership,
classes, clubs, meetings, partners, and daily learning application.

The former public schedule and series, their operator tools, and their database
tables are removed by migration `0031_remove_schedule_series.sql`.
The app uses email login with verification, independent affiliation approvals,
class sessions and attendance, club/DO:NUTS meetings, partners, daily learning,
an auditable XP ledger and member administration. See the reference-completion
report for the applied schema and remaining enrollment-content prerequisites.

## Start here

- [Baseline architecture and decisions](docs/BASELINE.md)
- [Original developer handoff](docs/handoff/donuts-class-developer-handoff-v1/START_HERE.md)
- [Product requirements](docs/handoff/donuts-class-developer-handoff-v1/docs/01_PRODUCT_REQUIREMENTS.md)
- [XP and daily learning](docs/handoff/donuts-class-developer-handoff-v1/docs/05_XP_DAILY_LEARNING.md)
- [Database migration notes](supabase/README.md)
- [Membership implementation and rollout](docs/MEMBERSHIP.md)
- [Reference completion and verification](docs/REFERENCE_COMPLETION.md)
- [Engineering and design rules](AGENTS.md)

## Development

Use Node.js 22 or later and npm. Install the lockfile dependencies with `npm ci`.
Configure `.env.local` using the variables documented in `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only auth throttling and withdrawal cleanup)
- `SITE_URL` (canonical origin for authentication emails)
- `ADMIN_EMAILS` (optional extra administrator restriction)

Connect a Supabase project with the repository migrations applied, then run:

```sh
npm run dev
```

`/` shows the original DO:NUTS hero without the former lower content sections.
The landing links to member services. `/admin` opens member management, and
`/admin/settings` manages public page settings. Admin identities must be authorized by
`public.admin_emails`; being signed in is not sufficient.

## Code structure

```text
app/(site)/         Public landing
app/(auth)/         Member signup, login, recovery, and application status
app/(member)/       Authenticated member home, profile, and scoped approvals
app/admin/          Membership, class, club, learning and public settings screens
components/site/    Public navigation and footer
components/ui/      Shared shadcn primitives
lib/site/           Public settings queries and shared navigation types
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

Migration `0031_remove_schedule_series.sql` drops `events`, `seasons`,
`blind_structures`, `blind_structure_rows`, `activate_season(uuid)` and `row_type`.
It preserves member/class/club/meeting/learning data, Auth, Storage and site settings.
Back up the target and deploy this application before applying the migration.
Unknown dependencies stop the transaction; the migration does not use CASCADE.

Applied migrations remain in place and replay in their original order.
The remote migration history uses timestamps; do not blindly push the numbered
filenames over an existing project. `supabase/seed.sql` only ensures that the
public settings singleton exists. CLASS history keeps its own archival rules.

Migration `0024_membership_foundation.sql` adds membership without changing any
schedule/series table. Signup is closed by default. Before opening enrollment,
follow `docs/MEMBERSHIP.md` for migrations, email delivery, callback URLs, actual
catalog setup, and the published privacy notice. No demo identities are created.
