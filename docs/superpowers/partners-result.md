# Partner and member administration implementation result

Worktree: `.claude/worktrees/reference-completion`. This report covers the partner subagent's assigned code, shared image upload, member directory/detail UI, and the additionally assigned withdrawal privacy corrections. No hosted writes, deployment, email delivery, commits, or pushes were performed by this agent.

## Partners

- Added `lib/partners/{types,validation,server}.ts`, `components/partners/{PartnerList,PartnerEditor,PartnerManager}.tsx`, member `/partners` page/loading, admin partner list/new/detail routes, `app/admin/actions/partners.ts`, and additive migration `0032_partners.sql`.
- The member list presents ordered partners using the existing dark/gold tokens, optional logos, descriptions, and safe external links. Empty state is concise.
- Admin creates, edits, deletes, uploads logos, and changes display order. All writes run admin-only atomic RPCs under a common lock. Edit/delete require the current revision. Reorder validates the complete ID/revision snapshot, rejecting concurrent additions/edits and incomplete or duplicate orders.
- RLS permits reads to active members and administrators. Direct authenticated table writes are denied. No partner content was invented or seeded in the migration.
- URL validation rejects credentials, controls, whitespace, backslashes and non-HTTP(S) schemes. Logos require HTTPS. Canonical encoded URL length is bounded.

Integration contracts:

```ts
getPartners(): Promise<{
  id: string; name: string; description: string;
  logo_url: string | null; url: string;
  sort_order: number; revision: number;
}[]>

PartnerList({ partners, headingLevel?: 2 | 3 }) // defaults to h2
```

Browser entry points and fields: `/admin/partners/new` contains `name`, `description`, `url`, file input `#partner-logo` and hidden `logo_url`; submit is `파트너 등록`. Edit includes hidden `id`/`revision` and `변경 저장`. List arrow labels are `{name} 위로 이동` and `{name} 아래로 이동`; deletion uses a portal confirmation dialog.

## Shared image upload

- Added authenticated generic `POST /api/admin/images` with admin authorization, origin validation, existing image/file validation, random validated object keys, and actual Supabase upload to the existing public `media` bucket. The bucket was verified from the historical upload implementation and migration `0017_admin_rls.sql`.
- Added `components/admin/ImageUploadField.tsx`. Props: `name`, optional `id`, `label` (default `로고`), `initialUrl`, and `onUploadingChange`. It renders preview/removal, hidden URL, upload error state, retryable file selection, and blocks enclosing form submission while upload is in flight. A failed upload retains the previous URL.
- Updated `FooterSponsorsEditor` to the new endpoint and added a network failure message. The retired program domain was not restored. The club agent consumes the same upload field.

## Member directory/detail

- Replaced `app/admin/(protected)/members/directory/page.tsx` and added `[id]/page.tsx`, `MemberProfileFields.tsx`, and `MemberWithdrawalForm.tsx`.
- Directory supports search/status/school/class/club filters, preserves filters in pagination, links details, and displays current affiliations. Historical catalog entries remain available as filters.
- Detail wires the existing admin actions for profile name/phone/school plus revision/reason, class/club affiliation addition/removal, leadership removal, password recovery, suspension/restoration, and withdrawal. Historical affiliations remain readable.
- Withdrawing members have general edit forms hidden. `AUTH_PENDING` exposes the cleanup retry even when the member is already `WITHDRAWN`. The irreversible withdrawal dialog explicitly requires reason and confirmation and remains open on failures.
- Extended `lib/membership/admin-directory.ts` catalog contracts with school/class active flags and class/club lifecycle timestamps. New selections omit unavailable options; an already assigned inactive school remains selectable for preserving current data.
- Form tests cover stale errors, typed other-school preservation, inactive catalog filtering, correct withdrawal retry fields, portal confirmation, and hidden editing for completed withdrawals. No password recovery message was actually sent.

## Withdrawal privacy cross-review and correction

The parent transferred ownership of the withdrawal functions in unapplied migration `0035_member_meeting_completion.sql` and its DB tests for the corrections below.

- Reproduced retained identifiers in `xp_ledger.reason`, `class_sessions.cancellation_reason`, historical audit `other_school_name`, nested Auth `traits.user_id` events, and Auth audit IP addresses.
- Withdrawal now collects historical identifiers before anonymization and redacts copied operation reasons across affected class sessions without changing XP amounts, source IDs, timestamps, or session state.
- Nested snapshot redaction retains structural state and UUIDs and preserves another member's profile fields even when the names match. Audit events and affiliations remain recorded.
- Auth completion handles actual JSON payloads, top-level actor/user fields, and GoTrue `traits.user_id`. It clears the target's personal fields and IPs while retaining the event, actor/subject IDs, useful traits such as provider, unrelated actor data, and unrelated audit rows.
- Completion still requires `auth.users.deleted_at`; it remains pending on Auth failure. Repeating completion is idempotent. Added actual-shape `auth.audit_log_entries` scaffold to the isolated runner.
- Supabase's admin deletion implementation performs identity scrubbing, credential/factor/session cleanup and `deleted_at` within its deletion transaction, and treats an already soft-deleted user as success. See [GoTrue admin deletion](https://github.com/supabase/auth/blob/master/internal/api/admin.go) and [audit payload implementation](https://github.com/supabase/auth/blob/master/internal/models/audit_log_entry.go). These checks cover application and database state; hosted provider delivery and external platform log retention are not simulated locally.

## Verification

- `npx vitest run test/partners.test.ts test/partners-actions.test.ts test/partners-upload.test.ts test/partners-forms.test.tsx test/member-directory.test.tsx test/upload-validation.test.ts`: **46 passed**.
- `npm run typecheck`: **passed**.
- Scoped ESLint for assigned UI/server/test files: **passed**. SQL runner/test lint also passed after removing an unused test binding.
- `git diff --check`: **passed**.
- `DONUTS_DB_TEST_DEPS=/private/tmp/donuts-reference-db-deps node scripts/validate-domain-db.mjs --reference-completion`: **97 passed, 0 failed** on isolated embedded PostgreSQL, including all partner/class/learning/member/meeting checks.
- Recorded meaningful failing checks before fixes: partner control-character/canonical URL length, preservation of typed other-school input, exclusion of inactive selections, withdrawal copied-reason/history/IP redaction (78 passed, 2 failed), and snapshot identity/state preservation. The corresponding checks passed after implementation.

Hosted migration application, existing approved footer partner content reuse, responsive browser checks, and real Storage persistence checks remain owned by the parent integration agent. Applied migrations were not changed by this agent.
