# DO:NUTS CLASS development baseline

Established: 2026-09-08.

## Product reference

The source package is preserved in
`docs/handoff/donuts-class-developer-handoff-v1/`.
Start with its `START_HERE.md`, product requirements, permissions, UI flows,
and XP/daily-learning specification. The HTML is an interaction reference;
it is not application code. Demo identities/passwords are fixtures only.

The handoff describes the target product. This baseline implements the cleanup
and preserves the existing schedule/series; it does not implement member signup,
classes, clubs, meetings, partners, learning, or XP yet.

## Retained application

| Route | Purpose |
| --- | --- |
| `/` | Temporary redirect to `/schedule`; reserved for the future member home |
| `/schedule` | Existing list/calendar, upcoming and past schedules |
| `/schedule/[id]` | Event detail, entry link, poster, blind structure |
| `/series` | Existing season presentation, upcoming events, participation guide |
| `/admin/login` | Existing operator authentication |
| `/admin/events` | Retained schedule editing |
| `/admin/seasons` | Season editing and activation |
| `/admin/blind-structures` | Blind structures used by schedule details |
| `/admin/settings` | Public signup CTA and footer sponsor settings |
| `/admin/trash` | Manual restore/delete for these retained content entities |

Program CMS, dynamic navigation/special pages, leaderboard, online league,
the former home/intro, tournament timer, and the hardcoded Holdem Lab are retired.
There are no retired routes in the public navigation or sitemap.

## Code boundaries

- `app/(site)`, `components/schedule`, `components/series`: retained public pages.
- `components/site`: public chrome and the shared reveal effect.
- `lib/legacy`: retained schedule/series types, data access, and display rules.
- `app/admin`: retained operator tools; these are not the new CLASS console.
- `components/ui`, `lib/supabase`, `lib/auth`, `lib/upload`: shared foundations.
- `docs/handoff`: unmodified source reference, not deployed routes or live seeds.
- `supabase/migrations`: append-only database history, including cleanup `0023`.

New member features should own their models and services under
`lib/membership`, `lib/classes`, `lib/clubs`, `lib/meetings`, `lib/partners`,
`lib/learning`, and `lib/xp` as those features are implemented.
Create real modules when a vertical slice needs them; do not add empty services
or success-returning API stubs. Do not extend legacy `Event` into `Meeting`,
or recreate the retired `Program` as a class model.

Keep one root HTML/font layout. New member routes can use `app/(member)` with
their own shell; route groups do not add URL segments, so replace the current
root redirect when introducing the member home. Planned member URLs follow the
handoff: `/class`, `/club`, `/partners`, `/my`, plus learning routes. Leader views
live under `/leader/class` and `/leader/club`.

## Architecture decisions

1. Keep Next.js App Router, React, Tailwind v4, shadcn for management forms,
   Supabase PostgreSQL/Auth/Storage, and SQL migrations. No ORM or separate API
   server is required by the handoff.
2. New member profiles reference Supabase Auth identities. Do not copy the
   draft's plaintext demo credentials or introduce a second password store.
   Specify username login and account recovery before the membership slice.
3. ADMIN is a system permission. Class/club leadership is an entity assignment,
   may overlap, and must be checked on the server. View selection grants nothing.
4. The retained admin gate always checks `public.is_admin()`. `ADMIN_EMAILS` is
   only an optional additional restriction. New member accounts must not receive
   administrative privileges merely by being authenticated.
5. New private tables require explicit RLS and server authorization. Public
   schedule policies must never be copied onto profiles, phone numbers, answers,
   signup requests, attendance, or XP.
6. Business dates use `Asia/Seoul`. Approval, capacity-limited applications,
   attendance finalization/XP, and daily completion require atomic DB operations.
7. Meetings are separate from legacy events. At completion, disable applications
   and set the archive deadline to exactly 24 hours later. Reads enforce the
   deadline; jobs materialize archival without deleting participation history.
8. XP is an append-only ledger with idempotency keys and auditable corrections.
   Proposed default: award attendance XP on locked session completion. Reopening
   attendance must support reversal and subsequent correction without duplication.
9. Daily learning uses a reviewed question bank, structured poker spots,
   versioned published sets, server grading, one assignment per member/KST date,
   and one completion award. Review attempts must not overwrite the initial score.
10. Start with the handoff's single-answer quiz and shared daily set. Five
    questions and 100/30/10 XP remain proposed values, not hardcoded policy.
    Content provenance and editorial review are required before publishing.

## Decisions before their implementation slices

- Membership: username/recovery mechanism, rejection/reapplication, withdrawal,
  and whether active class/club membership is restricted to one of each.
- Classes: cohort lifecycle, actual dates, breaks/makeups, historical rosters,
  leader replacement, and deletion of completed sessions.
- Learning: content source, exact spot schema, immutable versions, midnight
  completion rules, question count, scoring/bonus policy, and review UX.
- Operations: keep five primary CLASS admin tabs; place school management and
  learning content operations in explicitly designed secondary workflows.
- History: distinguish withdrawal/anonymization, archival, and permanent removal.
  Do not cascade-delete attendance, applications, or XP without an explicit policy.

The source SQL/API remain drafts. Resolve their gaps in actual migrations and
contracts; do not run the handoff SQL verbatim against the application database.

## Database transition

Existing migrations `0001` through `0022` are retained so deployed histories
remain valid and new databases can replay the chain. `0023` removes only retired
tables/columns and the old purge function. It preserves seasons, events, blind
structures/rows, remaining site settings, admin identities, and uploaded media.

The repository cleanup does not apply migrations to a remote database.
Deploy the baseline application, review/back up the target database, and then
apply `0023` through the normal migration process. Unknown dependencies fail
rather than being removed with CASCADE. Do not execute a database reset against
the existing project. Restoring an old app after cleanup requires restoring the
retired schema/data from backup as well.

`supabase/seed.sql` only ensures the site-config singleton exists; it never
deletes schedule data or imports the old marketing/demo fixtures. Future test
fixtures must be explicit and isolated from production seeds.

The former Vercel purge job and HTTP endpoint are removed. Legacy trash is now
manually managed; new member history must not be added to its table allowlist.

## Implementation order and acceptance

1. Membership/Auth/RLS, scoped approval, profiles and assignment history.
2. Class/session lifecycle, locked attendance, completion XP, member home record.
3. Clubs, meetings/applications/archival, and partners.
4. Question publication, daily learning, XP, streak, and learning history.
5. Analytics and personalization after the core operating loops are complete.

Keep regression coverage for schedule/calendar/series, event forms, authorization,
visibility, and storage validation. Add transaction and RLS tests alongside each
new domain. Acceptance must include concurrent last-seat applications, repeated
completion requests, immediate leader revocation, attendance corrections, and
archived-history preservation. P1 learning/XP is still required product scope.
