# Class, club, session and attendance operations

## Status and scope

Implemented in source, not yet validated or deployed. This task did not run
tests, a build, browser checks, production SQL, git commands or deployment.
Existing schedule and series code/data are preserved. Applied migrations are
unchanged; `0026_class_club_operations.sql` follows the pending 0025 membership
slice. The handoff SQL remains reference material, not a deployable migration.

The owner-approved policy is `MEMBER_CLASS_CLUB_DECISIONS.md`. No new demo
accounts, passwords, schools, attendance or XP are seeded.

## Operating routes

| Route | Purpose |
| --- | --- |
| `/admin/classes` | All classes, including closed/archived; atomic creation |
| `/admin/classes/[id]` | Metadata, leaders, affiliations, sessions and archival |
| `/admin/classes/[id]/sessions/[sessionId]` | Session lifecycle, schedule, roster, attendance and audit |
| `/admin/clubs` | All clubs and atomic creation |
| `/admin/clubs/[id]` | School, introduction, logo URL, default ATC, leaders and affiliations |
| `/leader/class` | Assigned classes; administrators can inspect all |
| `/leader/class/[id]` | Scoped session and affiliation operating view |
| `/leader/class/[id]/sessions/[sessionId]` | Scoped attendance and session operations |
| `/leader/club` | Assigned clubs; administrators can inspect all |
| `/leader/club/[id]` | Scoped club leaders, members and operating history |
| `/class/[id]` | Member class details, permitted sessions and own attendance |
| `/club/[id]` | Member club introduction and links to application/operations |
| `/my` | Recent own attendance, activity level, XP credits and corrections |

`/admin/members/settings` retains signup/consent settings and school creation.
It no longer offers leaderless class/club bootstrap forms. The old bootstrap
server action rejects class/club creation rather than bypassing domain rules.

## Creation and leadership

- Administrator-only creation and metadata editing use `save_operating_entity`.
  At least one eligible leader is required in the same transaction. A new class
  also requires one or more actual session timestamps, with no business count cap.
- Initial session dates are entered individually. The UI can suggest one week
  after the preceding date; the operator can change every proposed timestamp.
- Leadership points to real `auth.users` identities. Administrators need no
  membership profile. Regular leader candidates must be active and email verified.
- The creating administrator is selected by default, and can choose other
  eligible leaders. Leadership never inserts a membership or attendance record.
- Removing the last eligible leader requires a replacement. The existing
  suspension mechanism still revokes leadership immediately, including the last
  assignment; it does not restore assignments when the suspension is lifted.
- Administrator-only affiliation removal deactivates that entity's membership.
  It preserves other affiliations, historical rosters and XP. Separate leadership
  remains separate; returning to membership requires application and approval.
- Existing bootstrap catalogs are preserved without invented dates or leaders.
  Administrators must supply missing setup. Starting a session requires an
  eligible assigned leader; enabling class applications through the editor also
  requires a dated session and eligible leader.

## Session state and schedule

- Sessions have an actual `timestamptz`, a stable positive sequence number,
  `SCHEDULED` / `IN_PROGRESS` / `COMPLETED` status, a separate cancellation flag,
  a roster-run number, attendance-lock state and an optimistic revision.
- UI dates use `Asia/Seoul`. Server actions validate local date/time input before
  converting it to an explicit timestamp. Database timestamp fields reject infinity.
- Default class weekday/time edits do not rewrite existing session timestamps.
- Assigned class leaders may reschedule uncancelled scheduled sessions. Only
  administrators may edit the timestamp of an in-progress or completed session.
- Rescheduling changes one session by default. The optional bulk action applies
  the same time offset to this and higher-numbered scheduled sessions, excluding
  cancelled, in-progress and completed sessions. It displays before/after dates.
- Date and checkbox controls remain editable before submission. Bulk submission
  requires explicit confirmation. The transaction compares the entire preview's
  session ID/revision map against the current target set before writing.
- Before any session has ever started, an administrator may delete unused
  scheduled sessions while retaining at least one. Once any start has occurred,
  existing sessions must be cancelled rather than deleted. New sessions can still
  be added until the class has a closure history; no maximum count is imposed.

## Roster and attendance

- Starting a session snapshots active approved class affiliations, not leaders.
  Each entry starts `UNCONFIRMED`, distinct from `ABSENT`.
- Reverting a start is allowed only before attendance is saved or locked. The old
  start and roster remain recorded. Restarting increments the roster run and takes
  a new snapshot instead of overwriting the previous one.
- Later affiliation changes never silently rewrite an existing roster. An operator
  may explicitly add an approved affiliate to an unlocked running/completed session.
- Attendance saves require a complete, current roster key set and valid marks.
  A separately confirmed bulk action changes only unconfirmed entries to absent.
- Locking requires every roster entry to be present or absent. A running session
  can be completed only after attendance is locked.
- Assigned leaders can unlock, correct and relock completed attendance with a
  required reason. The session stays completed. Actions record before/after state,
  the real Auth actor, timestamp and correction reason.
- The operating UI shows the current roster run and recent audit events. Prior
  roster runs and all audit events remain in the database, even if outside the
  UI's recent-history window.

## XP and activity levels

- `xp_ledger` initially supports the implemented class-attendance source only.
  Its initial source constraint must be extended in a new migration when daily
  learning is actually built, rather than accepting unimplemented award types now.
- Completing a locked session awards 100 XP per present member. Merely starting,
  saving or locking an unfinished session awards no XP.
- Unlocking a completed session leaves existing XP unchanged. Relocking computes
  the desired 0/100 XP for each member/session and appends only the net difference.
- Cancellation reverses effective credits for that session only. Restoration
  restores credits only when completion, lock and present-attendance conditions hold.
- Original entries are never replaced. A unique operation/member/session key,
  serialized operations and net reconciliation prevent duplicate credits/reversals.
- Activity level L starts at cumulative `50 * L * (L - 1)` XP. There is no
  product level cap. Recalculation after correction may lower the level.
- Levels do not grant permissions, membership, queue priority or poker-skill labels.
  MY shows the actual total, next-level progress and up to 50 recent attendance
  and ledger entries. Complete records remain in the database.

## Closure, recovery and removal

- A transaction closes a class when every session is completed or cancelled,
  not when calendar dates pass. It stops new applications and records a closure
  event plus the approved affiliation snapshot for future successor processing.
- An administrator may give a reason and restore an existing cancelled unfinished
  session in a closed, non-archived class. This reopens operational state but
  keeps applications stopped until the administrator explicitly enables them.
- `first_closed_at` survives recovery and prevents extending the class with new
  sessions. Historical closures and their membership snapshots are not undone.
- Restoring a cancelled already-completed session does not reopen the class.
  Its XP still follows completion/lock/attendance conditions.
- Archival requires pending affiliation requests to be resolved first. Class
  sessions must be completed/cancelled, with completed attendance corrections
  finalized. Archived records are read-only for ordinary domain operations.
- Application lifecycle guards also protect calls through older signup and
  approval RPCs. Global membership suspension remains possible independently of
  entity archival so account restrictions cannot be bypassed through history.
- Permanent deletion is restricted to unused entities without applications,
  affiliations or participation history. Used entities must be archived. No Auth
  users or membership profiles are deleted by these controls; deletion itself
  remains in the operation log. Foreign-key dependencies fail closed.

## Authorization and implementation boundaries

- Reads and writes use the caller's Supabase JWT. No service-role write shortcut
  or view-mode authorization is introduced.
- All new private tables have RLS. Regular members can read permitted class
  sessions and their own attendance/XP, not another member's attendance or ledger.
  Assigned active leaders can read/operate their scope; administrators have global
  access, subject to the existing application administrator gate.
- New domain mutations share the membership advisory transaction lock with
  approvals, suspension and leader changes. Session authority is rechecked after
  the lock, and revisions reject stale forms or stale schedule previews.
- Direct authenticated class/club catalog writes are revoked. New writes go
  through guarded RPCs; internal helpers have no public execution grant.
- New code lives in `lib/classes`, `lib/clubs`, `lib/xp` and shared membership
  operating utilities. Existing site/schedule/series modules are not repurposed.
- Club logo editing currently accepts an HTTPS image URL, not a new upload flow.
  Default ATC is stored; it does not imply the meeting domain exists.

## Explicitly not implemented here

- Linked successor creation, administrator previews, automatic successor
  enrollment, in-service invitations and email delivery. Closure snapshots alone
  neither enroll members nor send notifications.
- Club meetings, capacity checks, held waitlist offers, confirmation expiry and
  the past-meetings checkbox. The future meeting migration must extend club
  archival/deletion guards before enabling meeting operations.
- Member profile editing and withdrawal/anonymization across Auth, roster
  snapshots, approvals and audits. This must be designed before deleting users.
- Daily learning, question review/versioning, single/multiple-answer grading,
  learning XP, streaks and learning analytics.

## Rollout and validation gate

1. Obtain explicit validation approval, then run tests, type checking/build and
   responsive/accessibility checks. Existing membership test results predate 0026.
2. Exercise both RLS and authenticated RPCs in an isolated database, including
   stale/concurrent actions, leader revocation, required leaders, class creation,
   no automatic leader enrollment, start/revert/restart and frozen rosters.
3. Exercise unconfirmed attendance, bulk absence, late additions, completion,
   correction/relock, cancellation/restoration and duplicate requests. Assert
   per-member/session net XP is 0 or 100 and other sessions are unaffected.
4. Exercise closure by completed/cancelled state, error recovery without extension,
   closure snapshot retention, archived old-client requests, unused-only deletion,
   admin-without-profile leadership and the member-directory FK transition.
5. Validate schedule preview confirmation and stale targets, Korean time handling,
   member-only history visibility, loading/error states and retained site pages.
6. Back up production and coordinate missing 0025 then 0026 with the application
   rollout. Respect the target's timestamped migration history; do not blindly
   replay all numbered migrations. Neither migration is applied by writing files.
7. Do not deploy this code against a 0024-only schema or assume an untested build
   is production ready. Keep actual email/SMTP setup and credential rotation as
   separate existing operational prerequisites.

## 2026-09-09 validated rollout update

This supersedes earlier unvalidated/unapplied checkpoints: 155 tests, lint and
production build passed; 56 isolated PostgreSQL checks passed. Migrations 0025
and 0026 were backed up and applied to production with retained-data hashes
unchanged. See [the release record](RELEASE_2026-09-09.md) for remote versions,
coverage limits and downstream scope.
