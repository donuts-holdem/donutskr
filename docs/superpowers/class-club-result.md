# Class/session and club completion handoff

Implemented in the shared `reference-completion` worktree on 2026-09-15. No production data, applied migrations, commits, pushes or deployments were changed by this domain worker.

## Result

- Classes now have member session titles, descriptions and `/class/[id]/sessions/[sessionId]` details, with current and earlier attendance runs retained.
- Admins and assigned class leaders edit content through the same session board. Completed and cancelled session content can be corrected; archived classes remain read-only. Content edits do not change session dates, lifecycle status, rosters, attendance or XP.
- The member class index starts with current affiliations and course progress, separates past classes, then offers further affiliation applications. Cancelled sessions remain in the timeline and count separately from completed teaching. Running sessions take precedence in the next-session summary; scheduled sessions use their actual dates.
- Former affiliates retain only the historical session access granted by existing RLS. They do not receive a misleading total-course progress summary from that partial session list.
- New class forms suggest `DO:NUTS CLASS·요일 A/B/...` from unused names, continue beyond Z, and preserve manually entered or existing names when weekdays change.
- Leader search supports creation multi-selection and single leader assignment. Selected IDs survive filtering and remain in submitted form data.
- Club editing uses the shared, real admin image upload field, with preview and removal. Existing admin-only edit permissions remain. Member and operator details display the logo and active affiliation count, with links to club-filtered meetings.
- Removed stale “meetings not yet implemented” copy and repeated operational explanations. Decision-relevant schedule exclusions, destructive consequences, required conditions and errors remain.
- The coordinator subsequently assigned `/leader` and the leader approval screen. The new dashboard shows current scoped classes/clubs, real pending approval totals and club meeting management, with a member-home exit. `/leader?view=club` places clubs first; this preference never grants access. Class-only leaders have no meeting-management entry.
- The approval queue explicitly filters assigned class/club IDs and excludes the leader's own applications, which the existing approval RPC does not permit them to process. This fixes the old use of RLS alone: the general member read policy also allowed leaders to read their own requests outside their operating scope.

## Interfaces

- `ClassSession` gains required `title: string` and `description: string`; existing rows migrate to empty content without invented lessons.
- `courseProgress(sessions)` returns `{ total, completed, cancelled, remaining, current }`. Completed excludes cancelled; current is a running session or the earliest scheduled date, otherwise null.
- `getClassOverview(id)` additionally returns `hasAffiliation: boolean`.
- `getSessionOverview(classId, sessionId)` resolves only a session present in the course's RLS result and returns the member's own attendance runs.
- `ClassProgress({ sessions, classId, basePath? })` defaults to member session links; management can override the base path.
- `getClubOverview(id)` additionally returns `memberCount: number`, from a narrow authenticated aggregate RPC. This count follows active affiliations, including suspended members whose affiliation remains active, matching the existing operator count.
- `ClubLogo({ name, logoUrl })` renders an uploaded logo or restrained name initials.
- `AffiliationCatalog({ kind, embedded? })` supports embedding under page sections with h2/h3 headings. Embedded catalogs omit already joined entities because the owning page lists those above.
- Shared `getReviewQueue(supabase, page?, status?, scope?)` now accepts `ReviewScope = { classIds: string[]; clubIds: string[]; excludeUserId?: string }`. An explicit empty scope returns an empty queue without fetching personal requests. Omitted scope preserves administrator queries. Only this function and its scope type were changed in the coordinator-owned `lib/membership/server.ts`, with explicit approval.
- Shared partner-owned `ImageUploadField({ name, id?, label?, initialUrl? })` is consumed as `name="logo_url"`. It posts `/api/admin/images`, previews/removes the URL and blocks a parent form save during upload.

## Database

`0033_session_content.sql` adds the two content columns and:

- `save_class_session_content(p_class_id, p_session_id, p_expected_revision, p_title, p_description)`: uses the existing membership advisory lock, checks current class permission, verifies the actual class/session pair, locks rows, rejects archived/stale edits, validates content, increments the shared session revision and records `SESSION_CONTENT_UPDATED` before/after content in `entity_operation_log`.
- `get_club_member_count(p_club_id)`: only authenticated admins/active members can read the aggregate; it does not expose memberships or profiles.

Existing session RLS, attendance operations and applied migrations remain unchanged.

## Changed files

- `supabase/migrations/0033_session_content.sql`
- `lib/classes/types.ts`, `lib/classes/format.ts`, `lib/classes/server.ts`, `lib/clubs/server.ts`
- `app/classes/actions.ts`, `app/admin/actions/entities.ts`
- `app/(member)/class/page.tsx`, `app/(member)/class/[id]/page.tsx`, new member session detail route, `app/(member)/club/[id]/page.tsx`
- `app/(member)/leader/page.tsx`, `app/(member)/leader/approvals/page.tsx`, the scoped review function in `lib/membership/server.ts`
- `components/classes/ClassNameFields.tsx`, `ClassProgress.tsx`, `SessionContentForm.tsx`, `ClassCreationDates.tsx`, `ClassManagement.tsx`, `SessionBoard.tsx`, `SessionList.tsx`, `SessionScheduleForm.tsx`
- `components/clubs/ClubLogo.tsx`, `ClubManagement.tsx`
- `components/membership/EntityForms.tsx`, `EntityPeoplePanel.tsx`, new `LeaderPicker.tsx`, `AffiliationCatalog.tsx` (additional shared ownership explicitly assigned by coordinator)
- `test/class-actions.test.ts`, `class-experience.test.tsx`, `class-member-read.test.ts`, `entity-selection.test.tsx`, `session-schedule-form.test.tsx`, `class-session-db.mjs`
- `test/leader-dashboard.test.tsx`, `test/review-queue-scope.test.ts`

`MyClassActivity.tsx` was changed by the learning worker and is not part of this worker's edits.

## Verification

- Failing tests were observed before content/progress/name implementation and before the new selection controls. Database tests first failed on absent content columns/RPCs. A whitespace-only SQL title case then caught a validation gap and passed after the fix.
- `npm test -- test/class-actions.test.ts test/class-experience.test.tsx test/class-member-read.test.ts test/class-operations.test.ts test/entity-selection.test.tsx test/session-schedule-form.test.tsx`: **35 passed, 0 failed** (latest run 20:18 KST).
- Final expanded command additionally includes `test/leader-dashboard.test.tsx test/review-queue-scope.test.ts`: **46 passed, 0 failed** (20:29 KST). The added tests exercise the actual reviewer gate with simulated Auth/PostgREST responses: ordinary active users and suspended assigned leaders are rejected; verified active assigned leaders are accepted. They also verify scoped query counts, omission of unprocessable self-applications, administrator behavior, class-only navigation and club-view ordering.
- Scoped ESLint covering all owned domain, page, action and test files: **exit 0**.
- `git diff --check`: **exit 0**.
- `DONUTS_DB_TEST_DEPS=/tmp/donuts-reference-db-deps node scripts/validate-domain-db.mjs --reference-completion`: **92 passed, 0 failed**, with all four new migrations present. The five class/club checks cover scope and revoked leadership, malformed/stale/direct writes, member and former attendee RLS, completed/cancelled history and XP preservation, archive protection, aggregate count privacy and anonymous/suspended denial.
- The database hook `runClassSessionChecks({ owner, as, check, rejected, actors, ids })` is already integrated by the coordinator. It creates isolated fresh actors/entities and does not depend on mutable baseline fixture membership state.
- Global `npm run typecheck`: **exit 0** after the coordinator's new member directory page was added.

## Integration remaining for coordinator

- The coordinator added `SESSION_CONTENT_UPDATED: "수업 내용 변경"` to the shared `OperationHistory` label map.
- Shared `refreshOperations()` already includes the member session detail path after coordinator changes.
- Confirm the `/meetings?club=<id>` filter and shared class/club home consumers during integration.
- Run the final global tests/typecheck/lint/build after concurrent work settles.
- Read-only browser checks are complete; see [the member browser result](../audits/reference-completion/member-browser.md). The coordinator owns all real saves, stale-save/admin flow checks, and production-bundle verification.
- The coordinator reported additive migrations applied without existing history-count changes. Deployment remains in the coordinator's authorized rollout; existing rows intentionally have no invented session content.

## Follow-up: direct image upload (2026-09-15)

The coordinator delegated `app/api/admin/images/route.ts`, `lib/upload.ts`, new
`lib/upload-client.ts`, `components/admin/ImageUploadField.tsx`,
`components/admin/FooterSponsorsEditor.tsx`, and their upload tests after review
identified the 10MB image allowance crossing Vercel's 4.5MB request body limit.
The limit was confirmed in the [Vercel Functions documentation](https://vercel.com/docs/functions/limitations).

- `uploadAdminImage(file: File): Promise<string>` is exported from
  `@/lib/upload-client`. It validates the actual file, requests a signed upload,
  calls the existing browser Supabase client's
  `storage.from('media').uploadToSignedUrl(...)`, and returns the public URL only
  after Storage succeeds.
- `POST /api/admin/images` accepts JSON `{ name, type, size }`, gates with the
  existing `requireAdmin`, validates the metadata, and returns
  `{ bucket: 'media', path, token, url }` with `Cache-Control: no-store`.
- The storage key remains randomized under `site_media/` and the signed upload
  disallows overwrite. No media bucket, storage policy, credentials, or
  infrastructure changed. The 10MB limit is enforced in client and metadata
  validation. The application route never receives the image bytes.
- Both logo editors use the helper. The footer editor also blocks saving during
  upload, preserves name/link edits made while the upload is pending, and leaves
  an existing logo intact if the upload fails.

The signed upload behavior follows the [Supabase uploadToSignedUrl API](https://supabase.com/docs/reference/javascript/file-buckets-uploadtosignedurl)
and the installed Storage client implementation. The coordinator reported a
successful real 5MB Storage upload and partner update after this change; this
worker's browser checks contain no uploads or other domain writes.

Verification: `npx vitest run test/partners-upload.test.ts test/upload-client.test.ts
test/partners-forms.test.tsx test/upload-validation.test.ts` passed **21 tests**;
upload-scope ESLint, full `npm run typecheck`, and `git diff --check` passed.
