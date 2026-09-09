# Email-only authentication

## Product decision

- Email and password are the only login credentials, for members and admins.
- Signup no longer asks for a username. Verification and password recovery use
  the same Supabase Auth email address; names remain separate display values.
- Do not create replacement accounts, generate hidden usernames, copy email
  into public member profiles, or reset existing passwords for this transition.
- Existing Auth UUIDs continue to link affiliations, leadership, attendance,
  notifications, learning history and the XP ledger.
- This decision supersedes the earlier username-login instructions in the
  original handoff and membership implementation notes.

## Source changes

- Login submits `email`, validates and normalizes it on the server, and uses
  Supabase password authentication directly. There is no username fallback.
- Email-keyed login throttling, verification requirements, admin allowlists,
  member-status checks and post-login destinations are retained.
- Signup, confirmation, recovery, membership status and MY use email wording.
- Operator lists use names and a short display prefix of the existing UUID,
  never a new login username. All writes still use the full UUID.
- Historical username fields and snapshots remain for compatibility. Their
  application types are nullable; new members need neither value.
- No real emails, production data changes, account recreation or password
  changes are performed by editing these source files.

## Database prerequisite and rollout

`supabase/migrations/0030_email_only_membership.sql` must be applied before
deploying the signup change. Without it, the old NOT NULL constraints reject
both username-free signup and attendance snapshots for new members.

1. Obtain explicit authorization for production application and validation.
2. Back up the target database and apply only the new migration, recording it
   consistently with the production timestamp-based migration history. Do not
   blindly replay the local numbered historical migrations.
3. The migration permits NULL only in the historical profile username and
   attendance username snapshot. Existing values, names, UUID keys, records,
   policies and write-authorization checks remain intact.
4. Deploy the email-only application. Refresh previously open login pages;
   their old `username` field is intentionally no longer accepted.
5. Once explicitly authorized, update the old username-specific test cases and
   run tests/build plus member/admin login, recovery, username-free enrollment,
   affiliation approval, session start/add-attendee, attendance/XP and leadership
   scenarios. Confirm existing users retain their previous records.

The private username-to-email RPC is left service-role-only for the previous
application during rollout. No email-only application code calls it. Its later
removal must not break an older deployment or expose an email lookup to clients.
Do not restore NOT NULL on historical username fields after new members exist.
Rolling back to an ID-only UI would also prevent those new members from signing
in; keep an email-capable recovery deployment instead.

Creating these files does not mean production application, tests, build or
deployment has been performed. Track those as separate rollout steps.

## Test accounts

Use the email column in the private test-account document, for example
`demo_member@donuts-demo.invalid`, with its existing password. These addresses
have no real inbox; confirmation and recovery delivery require a real mailbox
and must not be inferred from these synthetic fixtures.
