# Member and leader browser verification — 2026-09-15

The member/class-leader/club-leader test roles completed **204 page-state
checks** at `http://localhost:3100`, after the coordinator confirmed migrations
ready. Each role was checked at 390 × 900, 768 × 1024, and 1440 × 1000. All
recorded pages returned HTTP 200, with no horizontal overflow, no axe WCAG
2 A/AA or WCAG 2.1 AA violations, and no browser console warning/error,
page-error, failed-request, or HTTP error events.

| Coverage | Result |
| --- | --- |
| Home, class index, club index, partners, MY | All three roles and widths |
| Assigned class, member session detail, assigned club | Available and opened for every role and width |
| Mode and leader dashboard | Member redirected to home; assigned leader roles opened the authorized view |
| Mobile/tablet menu | Opened, Escape closed, trigger focus restored in all six role/width combinations |
| MY history and answer-review details | Read-only sections expanded without form actions |
| Daily learning | Existing member result and leader introduction rendered; both leader roles opened the first question without selecting any answer |
| Images | Follow-up captures eagerly loaded and decoded every image; zero incomplete images |

The first run captured 126 states from 20:40–20:42 KST. Four initial focus
assertions ran immediately after dialog removal, before Radix's deferred
autofocus callback. The script was corrected to wait for the actual focus
condition. A 33-state image/menu follow-up at 20:45 KST verified all six focus
restorations and every image. A 45-state MY/learning follow-up at 20:47 KST
verified the first question contents and privacy-masked MY screenshots. These
were test-harness timing and screenshot-loading corrections; no application
code was changed in response.

Visual review covered the mobile home, session detail, leader dashboard,
learning question and expanded answer evidence, the tablet MY view, and the
desktop partner list and mode selection. One visual item was reported to the
coordinator: the 3100 development server rendered native progress bars green.
The coordinator had identified stale development CSS and is checking the
production bundle separately at 3200. The 3100 result does not claim that
production-bundle color check.

The script permits only login POSTs and GET/HEAD/OPTIONS; other browser writes
are blocked. No blocked write was attempted. Learning start only changed
React-local display state, as confirmed in the hook source. The script selected
no answers, submitted no learning attempts, made no applications, and performed
no admin saves. The coordinator separately reported the real 5MB direct
Storage upload and partner-save verification.

Private evidence remains outside the repository:

- `/private/tmp/donuts-reference-audit/member-completion.cjs`
- `/private/tmp/donuts-reference-audit/evidence/member-completion/`
- `/private/tmp/donuts-reference-audit/evidence/member-completion-images/`
- `/private/tmp/donuts-reference-audit/evidence/member-completion-learning/`

The structured reports contain role labels, normalized routes, status counts,
geometry, accessibility rule identifiers, and event fingerprints. They contain
no account values, page-body text, response bodies, or authentication data.
Screenshots remain private; follow-up captures mask profile fields. Automated
axe checks are the accessibility scope of this report, not a manual WCAG
certification. No commits, pushes, deployments, or infrastructure changes were
performed by this worker.

## Production-bundle progress follow-up

At 20:51 KST the production bundle at `http://localhost:3200` was checked in
Chrome 152.0.7977.83 at 390 × 900. The existing member's MY bar and an
uncompleted leader's first learning question both remained visibly green.
The question was opened without answer selection or submission. Axe violations,
horizontal overflow, HTTP errors, page errors, and blocked writes were all zero.

For both native `progress` elements, computed values were:

| Property | Observed value |
| --- | --- |
| `accent-color` | `rgb(255, 229, 138)` |
| `--color-gold` | `#ffe58a` |
| `background-color` | transparent |
| `appearance` | `auto` |
| `color-scheme` | `normal` |

The production CSS contains `.accent-gold{accent-color:var(--color-gold)}`.
The computed gold token and the green bar screenshots show that the remaining
issue is native progress rendering, separately from the earlier development
CSS cache. The coordinator received the proposal to retain semantic progress
elements and explicitly style their tracks with `--color-border`, their fills
with `--color-gold`, and their radii with `--radius-pill`, using
`appearance: none`, `::-webkit-progress-bar`, `::-webkit-progress-value`, and
`::-moz-progress-bar`. No repository implementation file was changed by this
follow-up worker.

Private computed-value report and screenshots:
`/private/tmp/donuts-reference-audit/evidence/production-progress/`, including
`member-my-bar.png` and `classleader-learn-bar.png`.

## Final progress styling verification

The coordinator replaced native progress rendering with an explicit shared
`progress-gold` style using the existing gold/border tokens. After rebuilding,
3200 screenshots show gold bars in MY and the first learning question.
`appearance: none`, axe zero and no overflow were verified on the production bundle.
