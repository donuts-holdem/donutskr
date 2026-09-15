# Production-bundle operation verification — 2026-09-15

The compiled production bundle at `http://localhost:3200` connected to the approved
Supabase project. Two temporary, verified test identities were created exclusively
for this verification; one was granted temporary administrator access. No real
member received email, a password reset, suspension or withdrawal.

Sixteen operation checks passed:

- Fixture creation and directory email filtering.
- Member name/phone editing with the current revision.
- A file larger than 5 MB uploaded directly to Storage and returned HTTP 200.
- Partner creation, member visibility, editing and portal-confirmed deletion.
- Session title/content saving through the administrator form.
- DO:NUTS-hosted meeting creation without a club.
- Member application and cancellation with portal confirmation.
- Learning answer retention across next/previous navigation.
- Final submission, server result, once-only XP on reload.
- Withdrawal through the app and Supabase Auth, with XP history retained.
- Withdrawn-session denial and complete fixture/asset cleanup.

The member detail, partner-delete dialog, meeting-application dialog, learning
introduction/completion and withdrawal dialog all passed axe WCAG 2 A/AA and 2.1 AA
with no overflow. A destructive-button contrast defect was fixed with the existing
coral token and verified against the compiled production CSS. The development
server retained an older stylesheet during hot reload; it was not used as the final
evidence for that fix.

After cleanup, counts matched the original baseline: 6 profiles, 7 Auth users,
9 attendance records, 11 XP rows, 8 meetings and 20 learning answers. No temporary
administrator remains. The five intended partner records are present. The test
session's original title/content was restored; temporary uploads and fixture
records were removed. Only fixture-owned audit events were removed during cleanup.

Private logs and screenshots:
`/private/tmp/donuts-reference-audit/completion-flows/report.json`.
Credentials are stored separately outside the repository and are not in this report.

## Canonical production verification

The same implementation (`7da75e59ba3f67df03adbad9aac57b0675b36d74`) was verified
at `https://donutskr.vercel.app` after deployment. **18 operation checks passed**,
covering every operation above and propagation of the updated partner revision to
both editing and deletion forms. The successful verification finished at
2026-09-15 21:17 KST. Seven captured states across six screens/dialogs had zero
axe violations and no horizontal overflow.

The established administrator was used with a temporary authenticated session,
which was revoked afterward. The production administrator allowlist and existing
password were unchanged. Member writes and withdrawal targeted the isolated test
identity; no email was sent. The production allowlist correctly rejected a newly
created test administrator before the verifier used the established account.

The verifier was corrected to wait for rendered revisions before the next action,
accept normal HTTP 303 creation redirects, and avoid an unresolved Playwright
response-finished wait. Verification resumed with the tracked fixtures; these
harness corrections required no application changes.

At 21:18 KST, a separate database check confirmed the original counts again:
6 profiles, 7 Auth users, 9 attendance records, 11 XP rows, 8 meetings and
20 learning answers. Five intended partners and the established administrator
remain. There are zero temporary administrators. The original test-session content
was restored, and Storage contains none of the final fixture's uploaded objects.

Private evidence:

- `/private/tmp/donuts-reference-audit/live-operation-flows/report.json`
- `/private/tmp/donuts-reference-audit/live-operation-flows/cleanup-verification.json`
