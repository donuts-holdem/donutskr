# Learning and XP completion

Implemented in the shared `reference-completion` worktree. No production data writes, deployment, commits or pushes were performed by this domain agent.

## Delivered behavior

- `/learn` starts a five-question flow, retains single/multiple selections across previous/next navigation and submission errors, disables unanswered progression and duplicate pending submissions, and sends the complete five-question answer set only at final submission.
- Completion displays the server result, awarded XP, current streak and original question review. Necessary GTO conditions remain visible before answering. Member copy no longer explains server grading, version bookkeeping or infrastructure policy.
- Admin authoring captures NLHE format, street/category, player count, effective stack, positions, hero cards, board, pot and prior action. Card notation normalizes to canonical rank/suit codes. New GTO versions require a complete valid situation; general concept questions may omit one.
- Both the server action and PostgreSQL validate situations. Invalid stages/board sizes, duplicate cards, unsupported values, missing actions and invalid numbers are rejected. Existing versions retain their original text and nullable situation.
- Situation fields survive authoring, review, serving, grading and original-version wrong-answer review. Published content is immutable; only the existing separate review transition can change version review metadata.
- MY includes learning completion and perfect-answer bonus rows alongside class attendance, displays weekly XP, labels each source, and uses a valid `dl` structure in learning totals.
- Fixed an existing authoring defect where cloning a reviewed question with custom choice IDs could silently select the first answer instead of preserving the original correct choice.

## Interfaces

- `ClassActivity`: adds required `weekly_xp`; ledger preserves existing fields and adds `source_kind: CLASS_ATTENDANCE | DAILY_LEARNING` and `learning_day: string | null`. `class_name` and `session_number` are nullable for learning rows. Existing attendance and level fields are unchanged.
- `LearningVersion.spot`: `PokerSpot | null`; `ServedQuestion` and `GradedAnswer` also carry nullable/optional `spot` for legacy compatibility.
- `LearningResult.current_streak`: number supplied by the database. `submitLearning` returns `LearningSubmissionState` with `result` on success instead of a generic success message.
- Migration `0034_learning_experience.sql` adds the situation column/check, immutable version trigger, a private streak helper, and replacements for authoring, daily/result/summary and XP reads. Existing submission/XP award SQL is unchanged: class 100, completion 30, perfect first submission 10; common KST daily sets remain fixed.

## Validation

- Test-first regressions were observed failing, then passed for situation validation, stepper persistence/submission/error handling, unified XP display, and correct-answer preservation when cloning versions.
- Covering Vitest command: `npm test -- test/daily-learning.test.tsx test/learning-actions.test.ts test/question-composer.test.tsx test/my-learning-xp.test.tsx test/domain-screens.test.tsx test/domain-validation.test.ts` — 38 tests passed.
- Owned-file ESLint — exit 0, no diagnostics.
- Integrated local PostgreSQL command: `DONUTS_DB_TEST_DEPS=/private/tmp/donuts-reference-db-deps node scripts/validate-domain-db.mjs --reference-completion` — 92 checks passed, 0 failed. All four current additive migrations applied. Log: `/private/tmp/donuts-learning-db-green.log`.
- `test/learning-experience-db.mjs` exports `runLearningExperienceChecks({owner,as,check,rejected,actors,ids})` and is consumed by the coordinator harness. Its temporary daily-set fixture is confined to an owner rollback transaction; member serving/submission executes with authenticated member claims and real RPC authorization.
- The DB checks caught and fixed a transaction boundary issue: comparing XP creation to transaction-start `now()` excluded newly written XP. Weekly sums now use the full Monday-to-Monday KST interval.
- No learning-scope TypeScript errors were reported. The latest whole-worktree typecheck was temporarily blocked by the coordinator's in-progress member-directory test importing its not-yet-created detail route.

## Integration still owned by coordinator

Run the final whole-worktree checks/build and browser checks at mobile/tablet/desktop sizes, including axe on `/my` and keyboard navigation through the learning flow. Apply migration 0034 before serving this bundle. Optional future per-question admin analytics were not part of this core implementation.

Changed domain files: `app/learning/actions.ts`, both member learning routes, admin learning page; `components/learning/*` (new flow, completion, spot display and spot fields); `components/classes/MyClassActivity.tsx`; `lib/learning/types.ts`, new `spot.ts` and `use-learning-progress.ts`; `lib/xp/server.ts`; migration 0034; learning tests plus the learning-only assertions in `test/domain-screens.test.tsx`.

## Additional assigned copy cleanup

Completed the coordinator's follow-up scope in:

- `app/(member)/my/page.tsx`: removed the unsupported operator-contact/profile-edit explanation and used the existing “클럽” naming.
- `app/(member)/notifications/page.tsx`: removed the function/email-delivery introduction; retained the real notification body and concise expiry deadline.
- `components/membership/ReviewQueue.tsx`: removed the active-member approval explanation and retained eligibility restrictions when approval is disabled.
- `app/(auth)/membership/status/page.tsx`: shortened status guidance while preserving email verification, separate affiliation approval and suspension/withdrawal effects.

The requested `components/notifications/` and `app/membership/status/` directories do not exist; the latter route lives under `(auth)` as listed above. No notification-generating SQL, notification actions, contacts, new behavior or dependencies were changed. Targeted ESLint and `git diff --check` both passed. These reversible copy edits did not add implementation-mirroring tests.
