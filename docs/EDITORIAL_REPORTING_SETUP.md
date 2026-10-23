# Editorial publishing and content reports

This Phase 5 slice implements NX-025 and NX-053. Live AI remains disabled. Staff publishing is a local application operation; no public deployment was performed.

## Preview

From the repository root, start local Supabase, apply migrations with `npx supabase migration up --local`, then run `npm run dev -- --webpack`. Use `TUTOR_MODE=scripted npm run dev -- --webpack` to inspect scripted-response reporting.

An enrolled learner can open an unlocked lesson and use **Report a lesson issue**. After loading scripted guidance, **Report this tutor response** preserves the actual database-recorded response. `/reports` shows the learner's latest 100 reports and staff updates. Reports require 10–2,000 characters and are limited to ten per learner per UTC day; retries with the same payload/request ID count once.

## Staff access

Only an existing `editor` or `admin` entry in `public.staff_roles` enables `/admin` and its Editorial navigation link. Role checks run again in every database operation. User metadata and client fields cannot grant staff access. No real account was promoted by this implementation.

A trusted local database operator can assign an existing account after confirming its UUID in local Supabase Studio:

```sql
insert into public.staff_roles (user_id, role)
values ('REPLACE_WITH_VERIFIED_ACCOUNT_UUID', 'editor');
```

Run that only in the intended local project's SQL editor. Remove the row to revoke access. This is an operator action, not a learner-facing self-promotion feature; application clients do not use service-role credentials.

## Editorial workflow

1. Choose the current reviewed course and create a private draft.
2. Edit lesson title, objective, text and example. Saving checks the expected revision and clears previous review. Copy unsaved text before reloading a conflict.
3. Inspect every copied question, option, private answer key, hint and explanation. Record the actual editorial outcome and check the review attestation. The review note becomes part of the new version's authenticated-readable review record.
4. Confirm publishing. Only a reviewed, unchanged revision can publish. It creates new course, lesson, exercise and associated project records atomically. Existing enrolments, attempts, reports and project submissions remain on their original versions.

Questions and grading keys are copied without edits in this slice. Changes to assessments still require a reviewed migration; the UI clearly scopes its editor to lesson text. The existing project rubric is copied to the new course to preserve project availability. Scripted tutor guidance remains version-specific and is **not** implicitly enabled on a newly published course.

Publishing the same draft again returns its existing version. A competing draft cannot create another successor to the same source. Audit records capture creation, before/after lesson edits, reviewer/reviewed revision, and publishing outcome. Learners cannot read drafts, keys or audit records; staff cannot directly edit or delete audit rows through the application API.

## Report preservation and triage

Lesson reports capture title, objective, text, example and course version. Tutor reports additionally capture the exact server-recorded scripted reply, source and adapter version; the client cannot supply replacement response text. Script release data is versioned privately, and the application renders the receipt returned by the database. Tests verify all twelve stored script replies against the evaluated adapter cases.

Staff can set a report to Open, Reviewing, Resolved or Dismissed and provide an update visible to the reporter. Updates reject stale revisions and append an audit record. The original report snapshot never changes during triage or publishing. Private profile/account data is not included in the staff view.

The application account-deletion control now removes the learner's filed reports
and their report audits before the Auth cascade removes private learning/tutor
records. Ordinary tutor reply clearing/expiry preserves copies already submitted
in reports. Direct operator deletion of an Auth row still follows the legacy
report SET NULL FK; operators must follow the reviewed erasure workflow rather
than assume that raw Auth deletion removes submitted text. See
[privacy controls and remaining environment gates](PRIVACY_CONTROLS_SETUP.md).
Pagination beyond the latest 100 reports/50 audit events remains separate work.

## Verification

Use `npm run check`, `npm run test:integration`, `npm run db:test:local` and `npm run db:types:check`. The editorial integration test uses temporary learner/editor identities and a disposable course, publishes its successor, then removes only those synthetic fixtures. Its test-only Docker SQL helper is guarded by the local Supabase check and is never imported by application code. No actual staff promotion, real catalogue publication or remote CI run is claimed.
