# Member, class and club policy register

Confirmed with the product owner on 2026-09-09. These decisions supplement the
original handoff; where explicitly changed, they take precedence over its draft.
The original handoff files remain unmodified. This is a requirements register,
not a claim that every item below has been implemented or deployed.

## Authority and membership

- Administrators have global authority across the repository's pages and data,
  including the retained schedule and series. Admin access does not require a
  fabricated member profile. Entity scope applies to class and club leaders.
- Retain username/password login; Supabase Auth email supports verification and
  recovery. Do not add another credential or password-hash store.
- Valid signup information, consent and email verification grant ACTIVE regular
  membership. Affiliation approval is independent. Pending/rejected affiliation
  requests do not remove regular-member access. Reverification cannot restore a
  suspended or withdrawn member. This changes the original manual activation.
- Initial class selection remains mandatory, as in the original requirements.
  Club selection is optional. Do not add phone or school-email verification gates.
- Multiple simultaneous class affiliations and multiple club affiliations are
  allowed. Members apply from the lists; each entity approves independently.
- A class leader approves only their classes; a club leader only their clubs.
  Administrators may approve any entity. One approval never grants both kinds.
- Club applications may cross school boundaries. Preserve the member's actual
  school; the assigned club leader or administrator decides admission.

## Class scheduling and lifecycle

- Classes are finite courses, not permanent containers reset each term.
- Retain default weekday/time and store each session's actual date/time.
- Require at least one session, with no fixed maximum. This replaces the original
  handoff's 1-12 limit. Date edits default to the selected session. Offer an
  explicit preview and optional same-offset shift of later scheduled sessions;
  exclude in-progress and completed sessions.
- Administrators and assigned class leaders may change scheduled session dates
  and times, including the optional shift of later scheduled sessions. Only
  administrators may change in-progress or completed session dates and times.
- Before any session has ever started, administrators may add or remove unused
  scheduled sessions. Once any session has started, additions remain unrestricted
  by count, but existing sessions must be cancelled rather than deleted. Preserve
  session numbering and history. After class closure, use a successor instead of
  adding sessions.
- Preserve SCHEDULED -> IN_PROGRESS -> COMPLETED and start cancellation back to
  SCHEDULED. Cancellation is separate from the core status.
- Allow start cancellation only before attendance has been saved or locked.
  Preserve start/revert history and the previous roster snapshot; take a new
  snapshot on restart. After attendance has been saved or locked, use audited
  attendance correction or session cancellation instead of start cancellation.
- End a class when every session is COMPLETED or cancelled, not merely when the
  scheduled end date passes. Preserve its membership/session/attendance history.
- For a closed but not archived class, administrators may record a reason and
  undo cancellation of an existing unfinished session, reopening the class for
  error correction. Preserve prior closure/cancellation history. Reopening does
  not permit adding sessions to extend the course; use a successor for extensions.
  Do not automatically reverse successor enrollments or invitations that have
  already been executed or sent.
- A successor is a new, explicitly linked class. The administrator chooses
  invitation-to-apply (default) or automatic enrollment for each successor.
- Invitation still requires application and scoped approval. Automatic mode is
  an explicit administrative action, not a member self-approval shortcut.
- Freeze successor eligibility from approved affiliates at predecessor closure,
  irrespective of attendance count. Exclude members removed before closure.
  Exclude suspended/withdrawn accounts again at actual enrollment/notification.
- Preview the target list before successor execution. Deliver invitations through
  both in-service notifications and email. This adds to the original handoff.

## Attendance

- Snapshot approved class affiliates when a session starts. Later affiliation
  changes must not rewrite historical rosters. Operators may add newly approved
  affiliates before attendance is locked. This snapshot policy is an addition.
- Initialize attendance as unconfirmed, distinct from absence. Operators must
  explicitly mark each person present or absent before attendance can be
  completed and locked. Provide a confirmation step before marking all remaining
  unconfirmed people absent; this bulk action must not overwrite existing marks.
- Attendance completion locks the checklist; attendance editing unlocks it;
  completing the edit locks it again. This feature IS in original PRD 01,
  section 6.4, and QA 08. It is not an assistant-invented feature.
- Assigned class leaders may correct attendance even after session completion.
  Keep COMPLETED state and audit before/after values, actor and correction reason.
- Award 100 XP per attended class session as the shared rate across classes.
  Absent or unconfirmed attendance does not earn new attendance XP.
- Initially award attendance XP when the session is completed with locked
  attendance. For completed-session corrections, reconcile XP when the edit is
  finalized and attendance is relocked, not merely when editing is opened.
- Newly recognized attendance adds 100 XP; correction to absence reverses only
  the attendance XP previously credited for that member/session. If no XP was
  credited, do not deduct any. Apply only the net difference so repeated requests
  cannot duplicate an award or reversal.
- Session cancellation reverses its effective attendance awards. Undoing
  cancellation restores them only when the session again meets completion and
  confirmed-attendance conditions.
- Preserve original award entries and append auditable adjustment entries.
  Recalculate activity levels from corrected cumulative XP; levels may decrease.
- The current source slice does not implement XP awards. These are confirmed
  requirements, not an implementation or production-change claim.

## Leaders, suspension and withdrawal

- Require at least one designated leader when creating a class or club. Real
  administrator Auth accounts are eligible without separate member signup or
  fabricated member profiles. Default the initial selection to the creating
  administrator while allowing another eligible leader. Eligible regular members
  may subsequently be added as leaders or assigned as replacements.
- Normal removal of the final leader requires a replacement first.
- Leader assignment grants operating authority without automatically creating
  member affiliation or attendance eligibility. Leaders who wish to join as
  members must separately apply and receive scoped approval. Attendance rosters
  follow approved class affiliations, not leader assignments.
- Suspension/withdrawal must proceed immediately even for the last leader.
  Administrators continue operations and assign a replacement. Do not delete or
  automatically cancel the class/club because a leader is unavailable.
- Suspension blocks member and leader operations immediately while retaining
  affiliations and history. Restore ordinary membership access when suspension
  is lifted; leadership requires an explicit new administrator assignment.
- Withdrawal/deletion blocks login, ends affiliations and revokes leadership.
  Delete/anonymize personal identifiers while preserving attendance and operating
  history under a withdrawn-member label. Removing a name from the UI alone is
  not sufficient: Auth, metadata, consent snapshots and audit details need handling.
- Rejoining creates a new member account and requires fresh affiliation approvals.

## Class and club removal

- Permanently delete only unused entities with no application/participation
  history. Do not cascade-delete operational history.
- Archive entities with operational history and block new applications/operations.
  Finish/cancel outstanding sessions/meetings before archival. Preserve historical
  affiliations, attendance and operating records for read-only access.
- Archival is not the same as automatic course completion, and neither rewrites
  a predecessor as its successor.

## Interview completion and implementation boundary

All eight final member/class/club topics are answered: notification channels,
course closure, roster snapshots, completed attendance correction, last leader,
suspension, withdrawal and entity removal. Do not reopen these as undecided.

The additional class/session decisions confirm leader schedule-editing authority,
start-cancellation restrictions and history-safe session additions/removals with
no maximum session count.

This source slice implements email activation, independent/multiple affiliation
requests, cross-school club applications, scoped approvals, member list/search,
suspension/restoration, leader removal and admin access to member pages.

The next source slices implement full class/club CRUD and minimum-leader creation,
dated sessions and attendance, successor enrollment/notifications, administrator
profile/affiliation editing, withdrawal/anonymization and history-safe archival.
The existing catalog bootstrap is not full class/club management.

The product owner subsequently requested continuing the remaining policy
questions. These later-domain decisions do not block implementation of the agreed
class/club/session scope. The tracked meeting-history, application and waitlist
decisions are confirmed below. All five tracked XP policy questions are also
answered. Daily set size, three-level question difficulty, internal-only authorship
and mandatory recorded review are also confirmed; the same administrator may
author and review. Common daily-set delivery, streak protection and initial
learning analytics are also confirmed. The owner confirmed author-selectable
single-answer and multiple-answer questions, with exact-set grading and no
partial credit. All tracked policy interview questions are now answered. Policy
confirmation does not imply that the corresponding features are implemented or
deployed.

## Club meeting history

- Use a single MY meeting list with a history filter rather than a separate
  past-meetings page. Show only the current member's own meeting applications.
- Provide a "Show past meetings" checkbox, unchecked by default. The default view
  lists current/upcoming meetings; checking it also includes completed and
  archived meetings from the member's own application history.
- Past meeting details and the member's application status are read-only. This
  filter neither reopens applications nor exposes other members' history.
- Preserve the original rule hiding completed meetings from the general listing
  24 hours after completion. MY history remains accessible through its own filter.

## Club meeting applications

- Retain the original per-meeting guest setting. With guests disabled, applicants
  must have approved affiliation with the hosting club. With guests enabled,
  other ACTIVE, email-verified regular members may apply, including members of
  other clubs and members without club affiliation. Guest access is not anonymous
  or nonmember access.
- Confirm eligible applications immediately when capacity is available, without
  separate per-meeting admission approval. Club affiliation approval remains a
  separate process.
- When capacity is full, register eligible applicants on a waitlist instead of
  rejecting the application. Waiting does not mean confirmed participation and
  does not consume a confirmed place.
- Retain the rest of the proposed initial scope: no separate meeting admission
  approval and no automatic promotion to confirmed participation.
- When capacity becomes available, offer places to eligible waitlisted members
  in registration order. Notify each offered member and require their explicit
  participation confirmation; an offer is not a confirmed booking.
- Hold each offered place while awaiting that member's response. New applicants
  cannot claim places reserved for outstanding offers or bypass eligible waiters.
- Give offered members a default 12-hour response window from the confirmation
  request notification. The authorized meeting operator may configure this
  duration per meeting.
- On explicit decline or response deadline expiry, end that waiting application
  and offer the released place to the next eligible waiter in registration order.
  Preserve the prior application and offer history. An offer alone never confirms
  participation.
- Do not automatically requeue expired or declined applications. Members may
  submit a fresh waitlist application at the end of the queue.

## Daily learning set

- Use five questions per daily learning set in the initial version. Complete the
  set only after all five answers have been submitted and server grading finishes.
- Target roughly 3-5 minutes of learning. This is a content-length target, not a
  promise that every member or question set takes the same amount of time.
- Administrators classify each question as beginner, intermediate or advanced.
  Question difficulty is separate from activity-based XP levels. Do not infer
  poker skill or question-access permissions from a member's XP level.
- Serve one common five-question set to all regular members for each learning
  day. Use Asia/Seoul calendar dates with midnight as the day boundary.
- Administrators compose the set from reviewed, published question versions and
  select its difficulty mix. Keep the day's assigned question set and versions
  stable across return visits.
- Do not introduce difficulty-specific daily sets or automatic per-member
  personalization in the initial version.

## Learning answer modes

- Let authors choose single-answer or multiple-answer mode when registering a
  question. Single-answer questions have one correct option; multiple-answer
  questions have more than one correct option.
- Clearly identify the response mode to learners. Use single selection for
  single-answer questions and multiple selection for multiple-answer questions.
- Multiple-answer GTO questions may ask learners to identify all actions included
  in a documented, reviewed mixed strategy. Do not mark an included action wrong
  merely because its frequency is lower than another included action.
- Identifying the actions in a mixture is distinct from reproducing their
  frequencies. The prompt and explanation must make the grading target clear.
- Grade multiple-answer submissions as correct only when the selected option set
  exactly matches the correct option set of the served, reviewed question version.
  Missing any correct option or selecting any incorrect option makes the answer
  incorrect. Do not award partial credit.
- After grading, identify omitted correct options and incorrectly selected options
  alongside the answer and explanation.
- Keep the confirmed daily-completion XP and first-attempt all-correct bonus
  rules unchanged. Multiple-answer questions count as correct for accuracy and
  the all-correct bonus only when the complete option set matches.

## Learning streaks

- Do not introduce member-owned streak-freeze items in the initial version.
- Count learning days from completed daily sets under the confirmed Asia/Seoul
  calendar. Missing a day when learning was normally available breaks the streak;
  the next completed day starts a new streak of one.
- Missing a learning day does not forfeit earned XP or decrease activity levels.
- Preserve the streak for administrator-confirmed service failures or missing
  daily content, recording the operational exception. Protection alone grants
  neither a completed learning day nor XP; actual completed learning remains
  recorded normally.

## Learning analytics

- Provide personal MY statistics for completed learning days, current learning
  streak and overall accuracy.
- Show accuracy for beginner, intermediate and advanced questions, with correct
  answer counts and attempt counts alongside percentages.
- Aggregate each daily set's first graded responses only. Practice and repeat
  attempts must not change the original accuracy statistics.
- Let members revisit their incorrect answers with the original question-version
  answer and explanation.
- Exclude AI weakness diagnoses, automatic personalized recommendations and
  member-to-member rankings from the initial analytics scope.

## Learning question authorship

- Register only internally authored DO:NUTS questions in the initial version.
  Do not import externally authored finished questions or third-party question
  banks, even as an alternative source for the initial bank.
- AI may be used as an authoring tool, including drafting assistance. It must
  not independently register or publish questions or establish correctness. A
  human author remains responsible for the question, answer and explanation.
- Original GTO questions still require documented solver results under explicit
  spot assumptions as supporting evidence, not AI-invented strategy frequencies.
  Supporting analysis is distinct from importing external finished questions.
- Permit the same administrator to author and review a question. A separate
  review-completion step and record remain mandatory before publication.
- Review must confirm internal authorship, answer/explanation correctness and
  documented GTO support where applicable. Record the reviewer, reviewed version
  and review time.
- Editing a published question creates a new version requiring review. Preserve
  historical attempts and grading against their originally served version.

## Daily learning XP

- Award 30 XP for completing one day's learning, regardless of correctness.
  Completion requires submitting every question in the daily set and finishing
  server grading.
- Award the daily completion reward only once per learning day. Reattempting or
  reviewing the same set must not create duplicate completion awards.
- Add a 10 XP all-correct bonus when every question in the daily set is correct
  on its first attempt, for 40 XP total learning reward on that day.
- Award the bonus at most once per learning day. Reattempts after seeing answers
  or explanations cannot earn the bonus. Incorrect answers do not remove the
  30 XP base completion reward.

## Activity levels

- Start at level 1 with 0 XP. For level L >= 1, require 100 * L additional XP
  to reach level L + 1. The cumulative threshold for level L is
  50 * L * (L - 1).
- This replaces the unapproved fixed 500-XP interval proposal. The triangular
  cumulative progression is a researched game-design pattern; the coefficient
  100 is an approved DO:NUTS calibration, not an industry-standard constant.
- Keep level progression uncapped and display cumulative XP and progress toward
  the next level. Level is an activity indicator, not a poker-skill rating, and
  grants no membership status, operating authority or application priority.
- Progression-pattern reference:
  [Game Balance Concepts: Numeric Relationships](https://gamebalanceconcepts.wordpress.com/2010/07/14/level-2-numeric-relationships/).
  XP correction and reversal follow the confirmed attendance policy above.

## Class and club operations source update

- Implemented class/club creation and editing, Auth-backed required leaders,
  scoped operating pages, affiliation removal, archival and unused-only deletion.
- Implemented dated sessions without a business maximum, previewed schedule
  shifts, retained roster runs, attendance locking/correction and lifecycle events.
- Implemented transaction-driven class closure and closure-time affiliation
  snapshots. Administrator error recovery keeps the original closure history
  and does not allow adding sessions to extend a previously closed class.
- Implemented the approved 100 attendance XP as an auditable adjustment ledger,
  activity-level calculation and member-facing attendance/XP history.
- The schedule form leaves date and confirmation controls usable before submit.
  Server actions validate confirmation, dates and scope; database operations
  recheck authority and the preview's revisions before applying the change.
- Successor creation/enrollment/notifications, club meetings, withdrawal and
  daily learning remain separate implementation work. No invitations were sent.
- This update describes source only. Migration 0026, tests, build, production
  changes and deployment were not executed in this task. See
  `CLASS_OPERATIONS.md` for the implementation and rollout boundary.

## Previous rollout checkpoint

Migration 0025 is an unapplied source artifact in this change. Applied migrations
0023/0024 remain immutable. No production DB change, deployment, build, tests or
browser verification is implied by this register. SMTP and real initial catalog
configuration remain prerequisites for enrollment and future successor emails.

## 2026-09-09 validated rollout update

This supersedes earlier unvalidated/unapplied checkpoints: 155 tests, lint and
production build passed; 56 isolated PostgreSQL checks passed. Migrations 0025
and 0026 were backed up and applied to production with retained-data hashes
unchanged. See [the release record](RELEASE_2026-09-09.md) for remote versions,
coverage limits and downstream scope.
