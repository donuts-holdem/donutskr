# Reference completion — 2026-09-15

Implements the missing behavior recorded in `audits/2026-09-15-reference-comparison.md`
using the existing DO:NUTS design tokens. Page-function explanations have been
removed; eligibility, deadlines, failures and irreversible consequences remain.

## Connected behavior

- Home: real profile/level, weekly and lifetime XP, learning streak/status,
  current course progress/next session, eligible meetings and partners.
- CLASS/CLUB: session title/content/detail/progress, suggested course names,
  searchable leaders, club logo/member count and own clubs with eligible meetings.
- Five-item member navigation and server-authorized mode selection/leader dashboard.
- Partners: administrator CRUD, full-snapshot revision-aware ordering and logos;
  member directory and home preview. Existing public sponsor names/assets/URLs
  populate the initial five records, with no invented benefits or descriptions.
- Member administration: search and status/school/affiliation filters, revisioned
  profile edits, affiliation changes, recovery support, suspension and withdrawal.
- Withdrawal: block access and end leadership/affiliations, redact profile and
  historical personal fields, soft-delete through Supabase Auth, then mark complete.
  A failed Auth cleanup remains visible and retryable. XP/attendance/meeting IDs,
  amounts, dates and non-target members' records are retained.
- Meetings: DO:NUTS hosting without a club, HOT-first ordering, counts/personal
  state and portal application/cancellation confirmations under existing atomic rules.
- Learning: five-question navigation, complete answer submission/server grading,
  completion/review, versioned structured poker situations, combined XP ledger.

## Database

| Source | Applied remote version |
| --- | --- |
| `0032_partners.sql` | `20260915113928` |
| `0033_session_content.sql` | `20260915113933` |
| `0034_learning_experience.sql` | `20260915113937` |
| `0035_member_meeting_completion.sql` | `20260915113940` |

Private pre-change backup:
`/Users/seungmok/donuts-db-backups/2026-09-15T11-29-07.129Z-before-reference-completion`.
The custom dump has 789 restore-list entries; SHA-256
`e4a475b05ababcbe4138a13604b77d80647794123597591868e9c7d8b4f037e5`.
Profile, Auth user, attendance, XP, meeting and learning-answer counts were identical
before and after the four schema migrations. Public schedule/series stay retired.

## Operational content

The old public application form is closed and explicitly links to its replacement,
`https://forms.gle/ntow8efYxRVyWTdP7`; the site's existing application URL is updated
and the enrollment waiting screen links to it.

On-site account enrollment still requires the operator's published privacy notice
and consent version. Existing approved/source material does not specify the notice's
retention period or responsible privacy contact. These facts were not invented,
and the previously closed `membership_settings.signup_open` was not silently opened.
The existing Supabase recovery action is connected; deferred Resend delivery remains
outside this request's approved mail-infrastructure scope. Custom Supabase Auth
SMTP is also not configured; real-member authentication email delivery is not
claimed as verified.

## Verification

Domain reports are in `superpowers/partners-result.md`, `class-club-result.md` and
`learning-result.md`. Integrated isolated PostgreSQL: **97 passed, 0 failed**.
Tests use real SQL/RLS/JWT claims and cover approval/attendance/queue/XP history,
new authoring/version rules, revision conflicts and resumable Auth anonymization.
Final full Vitest suite: **204 passed**. `npm run build` and `npm run typecheck`
passed. ESLint has zero errors and one pre-existing unused binding warning in the
demo seed script. The upload change received a second independent review after
the Vercel request-size issue was corrected with direct signed Storage uploads.

See `audits/reference-completion/member-browser.md` for 204 member/leader page-state
checks and `audits/reference-completion/production-flows.md` for 16 saved-operation
checks, six additional accessibility checks and fixture cleanup. No additional
paid infrastructure or dependencies were introduced. The final production bundle
also uses explicit gold progress styling, verified in MY and learning after the
browser-native accent differed from its computed color.

## Deployment

Implementation commit `7da75e59ba3f67df03adbad9aac57b0675b36d74` was merged into
`main` and pushed after the merged tree passed all 204 tests. GitHub production
deployment `6458298558` completed successfully at 2026-09-15 21:01 KST.

- Canonical site: <https://donutskr.vercel.app/home>.
- Deployment: <https://donutskr-2ozcrzusm-donutskr.vercel.app>.
- Vercel record: <https://vercel.com/donutskr/donutskr/DS417sDbRqThZwfM9gqVbqozFSMc>.

The canonical site passed 17 member, class-leader, club-leader and anonymous page
checks, including mobile/tablet/desktop home, assigned session detail, all five
partners and the replacement application link. All returned HTTP 200 with zero
axe violations, horizontal overflow or page errors. The anonymous test needed an
explicit Playwright browser context; this was a harness correction only.

Canonical-production saved-operation verification also passed **18 checks**,
including the large direct upload, member/partner/session edits, meeting creation
and application/cancellation, learning grading/XP and completed withdrawal.
Seven captured operation states had zero axe violations and no overflow.
The established administrator's temporary verification session was revoked;
fixture records/uploads were removed and baseline counts were independently
confirmed. See `audits/reference-completion/production-flows.md` for scope and
the test-harness corrections.
