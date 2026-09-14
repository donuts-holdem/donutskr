# Schedule and series removal — 2026-09-14

The owner requested removal of the remaining public schedule and series,
including their code and database data.

## Scope

- Removed `/schedule`, `/schedule/[id]`, `/series`, and the event, season,
  blind-structure and trash operator routes/actions.
- Removed dedicated components, data access, calendar/status/visibility helpers,
  season backdrop/reveal, the series bracelet asset and their obsolete tests.
- Removed public/member/admin links and dynamic event sitemap generation.
  The landing CTA opens member services; `/admin` opens `/admin/members`.
- Kept public signup/sponsor settings, the shared media bucket, authentication,
  membership, classes, clubs, meetings, learning, attendance and XP.
- Removed the duplicate legacy SQL bootstrap. Applied migration files `0001`
  through `0030` remain unchanged and replay in their original order.

## Database change

`0031_remove_schedule_series.sql` drops these objects in one transaction:

| Object | Rows before removal |
| --- | ---: |
| `public.events` | 27 |
| `public.seasons` | 1 |
| `public.blind_structures` | 6 |
| `public.blind_structure_rows` | 190 |
| `public.activate_season(uuid)` | function |
| `public.row_type` | enum |

No other domain references these tables. There is no CASCADE; an unexpected view,
foreign key or enum consumer causes the entire transaction to roll back.
The migration also reloads the PostgREST schema cache.

Deploy the matching application before applying `0031` to an existing database.
Use a new timestamped migration-history entry, matching this project's remote
history. Do not reapply historical numbered migrations with a blind `db push`.
An old application requires restoring the retired schema and data before rollback.

## Validation

- 94 remaining application tests pass; the class schedule test fixture was
  corrected to match the current component and model during standalone typecheck.
- Production build and TypeScript pass. ESLint has no errors; the existing demo
  seed script still has its unused `password` destructuring warning.
- 72 existing isolated domain checks pass (permissions, RLS, concurrency,
  attendance/XP, meetings, successors, notifications and learning).
- Eight dedicated database checks replay migrations `0001`–`0030`, verify
  populated-table removal and atomic rollback on unexpected dependencies,
  compare all remaining row hashes and RLS policies, and verify repeatability.
- Browser verification covers 390, 768 and 1440 pixel widths, mobile menu and
  keyboard focus/Escape, retired public-route 404s, sitemap and remaining entry
  routes. Two existing footer text contrast issues were corrected.

Run the dedicated migration checks with optional dependencies outside the repo:

```sh
npm install --prefix /tmp/donuts-db-test-deps pg @embedded-postgres/darwin-arm64
DONUTS_DB_TEST_DEPS=/tmp/donuts-db-test-deps node scripts/validate-schedule-removal.mjs
```

Use the embedded-postgres package matching the host platform. The harness uses a
private local Unix socket and never reads production credentials.

## Backup

Custom-format PostgreSQL backup:
`/Users/seungmok/donuts-db-backups/2026-09-14T08-25-02.588Z-before-0031/database-before-0031.dump`.

SHA-256: `e8ddf62b7474dbdcaae821b2fb822f4294233f0a774e0f0211c0e4c91a4a71c3`.
The private manifest records row counts/hashes and migration history. The dump
includes Storage metadata; shared object binaries remain in the existing bucket.

## Production rollout

- Application commit `0e3b685be08f038505881fc66a41c6b2555a6f87` was pushed to
  `main` and successfully deployed through the existing GitHub/Vercel integration.
  Deployment: `https://donutskr-k24afufwi-donutskr.vercel.app`;
  production alias: `https://donutskr.vercel.app`.
- Migration `0031_remove_schedule_series` was applied and recorded as remote
  version `20260914083002` after verifying the production route removal.
  It is now an immutable applied migration.
- The apply transaction compared hashes and counts for 38 tables in total:
  every remaining public table, `auth.users`, `storage.objects` and
  `storage.buckets`. Every comparison matched before commit. The exact snapshots
  are in the backup's `applied.json`.
- Preserved records include 6 member profiles, 5 classes, 2 clubs, 8 meetings,
  7 learning questions, 10 XP entries, 7 Auth users and 63 Storage objects.
- PostgREST returns `404/PGRST205` for all four removed tables and
  `404/PGRST202` for the retired function. Public settings still return 200.
- Production browser checks pass at all three widths, with zero automated
  WCAG 2.1 AA findings on the landing and mobile menus. Removed public routes
  return 404 and the sitemap contains no schedule/series entries. These browser
  checks use anonymous sessions; they do not create or alter member accounts.
