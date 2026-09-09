# Successors, meetings and reviewed learning

This extends the validated membership/class operations baseline without changing
the retained public schedule or series. Implementation follows the confirmed
decisions in MEMBER_CLASS_CLUB_DECISIONS.md. No demo questions or production test
identities are inserted.

## Routes

| Area | Routes |
| --- | --- |
| Successor administration | /admin/successors |
| Member meetings | /meetings, /meetings/[id] |
| Meeting administration | /admin/meetings, /leader/meetings |
| Member notifications | /notifications |
| Notification operations | /admin/notifications |
| Daily learning and original-version review | /learn, /learn/review |
| Question authoring, review and daily composition | /admin/learning |
| MY | Existing membership/attendance/XP plus meeting history and learning statistics |
| Protected background worker | /api/jobs/domains |

Member header links connect learning, meetings and notifications. Existing main
navigation, schedule, series and class/club participation pages remain in use.
Administrator navigation includes each new operating area.

## Successors: migration 0027

Create the successor as a normal class with leaders and dated sessions, then link
it to a completed predecessor. Each successor has one predecessor; one predecessor
can have multiple successors. Cycles are rejected.

INVITE is the default: notification only, followed by the ordinary application and
approval flow. AUTO_ENROLL records administrator approval and adds affiliations.
The administrator must inspect and confirm the preview before execution.

Eligibility comes from the selected closure's affiliation snapshot, not attendance.
Execution rechecks current active predecessor affiliation, verified active member
status, successor lifecycle and existing target affiliation. A changed recipient
list or successor revision invalidates the preview. Repeated execution cannot
duplicate affiliations, approval records or notifications. Recovering a predecessor
does not undo previously executed successor effects.

In-app notification and email-outbox creation are transactional with enrollment.
Members can read only their own notifications. Email operational records are
administrator-only.

## Meetings: migration 0028

Club meetings are independent of class sessions and public events. Administrators
manage all meetings; an eligible club leader manages meetings they created.

Defaults: guest participation off, signup on, 12-hour confirmation window, no HOT.
An empty or zero capacity is unlimited. Nonzero capacity includes both confirmed
participants and reserved offers. Only administrators may change HOT.

Approved hosting-club membership is required unless guests are enabled. Guests
must still be verified active regular members. Leadership is not participation.

Applications confirm immediately when eligible capacity is available. Otherwise
they enter a FIFO waitlist. Vacancies create a reserved offer plus an in-app
notification; the member must confirm personally. New applicants cannot bypass
waiters or reserved places. Decline/expiry ends that attempt and offers the next
eligible waiter a place. A fresh application goes to the end, never back to the
original queue position.

Disabling new signup preserves existing applications and reservations. Eligibility
is rechecked when processing the queue; membership/status changes and guest-policy
changes can invalidate participation. Every transition retains an operation log.
A reserved offer can still be confirmed while new signup is closed.

Completion/cancellation stops participation changes. Outstanding waits/offers end;
confirmed participation and previous applications remain recorded. No club meeting
XP is issued. The general list hides closed meetings after 24 hours, even if the
maintenance worker is delayed. Participants retain read-only history in the same
MY list using the unchecked-by-default "지난 모임 보기" checkbox.

### Automatic maintenance

After 0028, run the explicit operational script:
supabase/operations/schedule_domain_maintenance.sql

It installs/enables pg_cron and schedules the named meeting lifecycle job once per
minute. It does not send email or require a Resend key. Expiry timestamps are
authoritative; periodic processing may offer the next seat on the next tick.
The member detail RPC and transactional mutations also reconcile stale queues.

Keep the named cron job single-instance. The global membership transaction lock
serializes capacity, eligibility and revocation decisions. Monitor cron job
results; a stopped scheduler must not be mistaken for an empty queue.

## Learning: migration 0029

Only administrator-authored DONUTS_ORIGINAL questions can be registered. Original
authorship attestation and a note are required. AI assistance is recorded, not
treated as a publisher, reviewer or correctness authority.

SINGLE has one correct choice; MULTIPLE has at least two. Choices have stable
identifiers and answers use exact set equality, independent of selection order.
The learner sees the mode. Results separately explain omitted correct choices and
incorrect extra choices.

GTO questions require solver identity, complete assumptions, evidence/reproduction
information and action frequencies. A reviewer must verify this evidence and mixed
strategy validity; the application does not invent solver frequencies.

The same administrator may write and separately review a version. Review checks,
notes, reviewer, version and timestamp are mandatory for publishing. Content is
append-only: edits create an unreviewed new version, and served history retains
the original. Non-admin direct table access cannot reveal answer keys. Daily
question RPCs omit answers/explanations until that member submits all five.

There is one immutable five-question daily set for all regular members, selected
from reviewed published versions of five different questions. Dates use Asia/Seoul.
No automatic fallback, external question bank or AI-generated filler is published.

Server grading and completion commit once per member/day. Completing all five
awards 30 XP regardless of accuracy; a perfect first submission adds 10. Retries
return the original result without changing XP or accuracy. The append-only ledger
extends the existing activity level; level thresholds remain 50 * L * (L - 1).

MY shows completed days, current streak, total first-submission accuracy and
difficulty-specific accuracy with counts. Own wrong answers retain original
versions and explanations. An administrator may protect a confirmed outage or
content-missing day with an audited reason. This changes streak continuity only,
never completion or XP. No member freeze, AI diagnosis or ranking is added.

## Resend is deliberately deferred

The owner explicitly deferred real email configuration. In-app notifications and
outbox records remain active; pending emails must not be labeled sent.

Later activation requires all of:

- RESEND_API_KEY
- NOTIFICATIONS_FROM_EMAIL, on a Resend-verified domain
- NEXT_PUBLIC_APP_URL, the canonical deployed HTTPS application origin
- NOTIFICATION_EMAIL_ENABLED=true
- CRON_SECRET, if invoking the HTTP worker from a scheduler

Never commit credentials. The HTTP worker fails closed without its bearer secret.
An administrator can run the same maintenance from notification operations.

Delivery leases jobs, freezes the complete provider payload, and reuses one Resend
idempotency key. Automatic retries stop after 10 attempts or 23 hours from the first
attempt, within Resend's documented 24-hour dedupe window. Expired offers and
ineligible recipients are not emailed. Provider acceptance is not proof of inbox
delivery. Failures remain visible for operational investigation.

No Vercel recurring cron or email HTTP scheduler is implicitly enabled; this avoids
plan-dependent cron limits and accidental delivery during deferred configuration.

## Validation and reproducibility

Application commands:

~~~sh
npm test
npm run lint
npm run build
~~~

The PostgreSQL regression harness creates a fresh local database, binds only to its
private Unix socket, scaffolds Supabase Auth claims, and applies 0024 through 0029.
It never reads production credentials or connects to a hosted database.

On the current Apple Silicon development machine, optional dependencies can live
outside the repository:

~~~sh
DEPS="$(mktemp -d)"
npm install --prefix "$DEPS" pg @embedded-postgres/darwin-arm64
DONUTS_DB_TEST_DEPS="$DEPS" node scripts/validate-domain-db.mjs
~~~

Use the matching embedded-postgres package on a supported alternate platform.
The harness preserves a private report directory and stops PostgreSQL in finally.
These simulated JWT tests do not replace real Supabase Auth/provider tests.

Coverage includes legacy preservation, independent approvals, revoked-leader races,
attendance/XP correction, closure recovery, successor stale previews and dedupe,
email lease/retry behavior, meeting ownership/capacity/FIFO/expiry, answer secrecy,
review gates, exact-set grading, concurrent once-only XP, immutable served versions
and streak protection. Browser component fixtures additionally check responsive
layout, not actual signed-in production sessions.

Out of this slice: account withdrawal/anonymization and broad profile editing.
They were not silently implemented or replaced with destructive account deletion.
