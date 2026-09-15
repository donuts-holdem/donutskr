# DO:NUTS Reference Completion Implementation Plan

> **For agentic workers:** Use the independent-domain dispatch workflow, then review and verify the integrated implementation before rollout. Checkboxes record completed deliverables.

**Goal:** Complete the audited missing user and operator flows using the current design, with concise copy.

**Architecture:** Preserve Next.js Server Components/Actions, Supabase Auth/Storage/PostgreSQL, RLS and atomic domain RPCs. Append migrations 0032–0035. Independent domains have explicit file ownership; the coordinator owns shared navigation, home and integration.

**Tech Stack:** Next.js 16.2.9, React 19, Tailwind v4, shadcn, Supabase, Vitest, isolated PostgreSQL, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-15-reference-completion-design.md`; `docs/audits/2026-09-15-reference-comparison.md`.

## Global constraints

- Current design tokens only; `@/` imports; admin shadcn; dialogs via portals.
- No feature flags; no retired schedule/series; no edits to applied migrations.
- Keep all confirmed affiliation, attendance, waitlist, learning and history policies.
- No feature-explaining filler. Retain concise conditions and confirmations that affect user decisions.
- Do not commit credentials or publish invented live content.

## Task 1 — Partners

Files: `lib/partners/**`, `components/partners/**`, `app/(member)/partners/**`, `app/admin/(protected)/partners/**`, `app/admin/actions/partners.ts`, `supabase/migrations/0032_partners.sql`, `test/partners*.test.*`.

Interface: export `getPartners()` returning ordered `{id,name,description,logo_url,url,sort_order,revision}` records and `PartnerList({partners})`. Coordinator consumes these on home/navigation. Reuse existing authenticated storage uploads.

- [x] Test invalid URLs, stale edits and stable ordering with meaningful behavior assertions.
- [x] Implement RLS-backed partner CRUD, reorder, logo input and member list.
- [x] Check public/member URL navigation, keyboard forms and concise empty/error states.
- [x] Review domain diff and covering tests.

## Task 2 — Class/session and club identity

Files: `lib/classes/**`, `lib/clubs/**`, `components/classes/**`, `components/clubs/**`, `components/membership/EntityForms.tsx`, `components/membership/EntityPeoplePanel.tsx`, `app/(member)/class/**`, `app/(member)/club/[id]/**`, `supabase/migrations/0033_session_content.sql`, covering tests.

Interface: append `title` and `description` to `ClassSession`; preserve all existing fields. Member session URL `/class/[id]/sessions/[sessionId]`. Add scoped content-save RPC with revision checks. Class overview remains the home consumer's source. Club details may link to `/meetings?club=<id>`; coordinator implements this filter.

- [x] Test scoped session content, read access and progress for completed/cancelled sessions.
- [x] Add migration, server action and member/leader content views without changing date/attendance semantics.
- [x] Add suggested class names, searchable leaders, actual club logo upload/preview/member count.
- [x] Remove filler in owned screens, verify existing session tests and review changes.

## Task 3 — Learning and XP

Files: `lib/learning/**`, `lib/xp/**`, `components/learning/**`, `components/classes/MyClassActivity.tsx`, `app/(member)/learn/**`, `app/admin/(protected)/learning/**`, `app/learning/actions.ts`, `supabase/migrations/0034_learning_experience.sql`, covering tests.

Interface: `getMyClassActivity()` gains `weekly_xp`; ledger rows retain old class fields and gain `source_kind`, `learning_day` so the coordinator can consume totals. Published versions remain immutable. Structured poker spot data travels through author → published version → served question → original-version review.

- [x] Test that answers survive previous/next, final submit includes all five, and unavailable/unanswered flows cannot complete.
- [x] Extend versioned spot schema and server validation; replace form-only experience with concise stepper and completion/review views.
- [x] Fix unified XP ledger and weekly XP; verify totals and first-submit invariants in SQL.
- [x] Fix MY definition-list accessibility; remove explanatory filler, run covering tests and review diff.

## Task 4 — Member administration and meetings

Files: new `lib/membership/admin*.ts`, `app/admin/actions/member-profile.ts`, `app/admin/(protected)/members/directory/**`, meeting domain files, `supabase/migrations/0035_member_meeting_completion.sql`, local PostgreSQL validation script.

- [x] Add failing integration cases for profile validation, scoped affiliation edits, forbidden withdrawal, anonymization/retry and retained history.
- [x] Implement profile detail/filter, recovery support and resumable Auth anonymization with server-admin checks.
- [x] Add DONUTS host support under existing atomic capacity/eligibility rules, correct HOT ordering and member summaries, and portal confirmations.
- [x] Run concurrent/authorization SQL checks and review all modified contracts.

## Task 5 — Shared member experience and copy

Files: `app/(member)/home/page.tsx`, `app/(member)/club/page.tsx`, `components/membership/MemberNav.tsx`, shared site/admin navigation, role selection/dashboard routes, membership/session services and existing signup pages.

- [x] Build home from real profile, active courses, learning/XP, eligible meetings and partner services.
- [x] Connect club meetings, five-item member menu, role chooser and concise operating dashboard.
- [x] Audit visible copy across changed domains; remove implementation and function explanations while preserving material conditions.
- [ ] Publish the operator-approved signup privacy notice and consent version. The verified replacement application form is connected; retention/contact wording and custom Auth SMTP remain unavailable, so existing on-site enrollment remains closed.

## Task 6 — Integrated verification and rollout

- [x] Review each independent domain for requirement coverage, permissions and regressions.
- [x] Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and isolated PostgreSQL validation including new migrations.
- [x] Verify mobile 390px, tablet 768px, desktop 1440px, keyboard/portals, empty/error states and automated accessibility with existing test accounts.
- [x] Complete GitHub/Vercel deployment and live smoke verification. Production deployment `6458298558` succeeded; the canonical site passed 17 member/leader/anonymous page checks.
- [x] Record deployed SHA after production verification: `7da75e59ba3f67df03adbad9aac57b0675b36d74`. Migration versions, tests and outstanding enrollment prerequisites are documented in `docs/REFERENCE_COMPLETION.md`.

## Progress

- Baseline: 94 tests pass on `01f47ab`; isolated worktree `.claude/worktrees/reference-completion`.
- Design decision: use audited scope/current visual design directly; user explicitly requested continuing without approval questions.
- Domain isolation: parallel agents own Tasks 1–3 and separate migrations; coordinator owns Tasks 4–6 and shared chrome. Agents do not change live data or push.
