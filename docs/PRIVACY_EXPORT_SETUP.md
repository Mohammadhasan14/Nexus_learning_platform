# Learner data export (NX-039)

Settings offers **Download my data** to authenticated learners, including before
onboarding. It downloads `nexus-learning-data.json` without navigating away or
saving/resetting preference edits. Pending and error messages support retry.
The file contains private learner content; the interface explains this before
the download. No export file is stored by the application or uploaded elsewhere.
Settings inputs and the download button wait for hydration, matching the note
editor's existing readiness pattern. This prevents an observed early-edit race
that appended the saved goal to new text. JavaScript is required for these controls.

## Contents and boundaries

`nexus-learner-export-v1` includes a database snapshot timestamp and:

- Saved preferences and their timestamps, plus the learner's own staff role if any.
- All enrolments, reading acknowledgements and graded attempts, including saved
  answers and feedback. History is not limited by the ordinary page/Data API row cap.
- Current lesson notes, all saved project revisions and recorded outcome events.
- The learner's content reports and their submitted lesson/tutor snapshots/status.
- Saved scripted/live tutor requests, completed replies, reservations and token
  accounting, plus the learner's daily request/token usage buckets.
- An account summary containing the verified Auth user ID, email and creation time.

The export contains source/version identifiers rather than a copy of the whole
course catalogue. Derived summaries/review schedules can be recomputed from the
underlying records and preferences. Cleared notes remain empty, and deleted or
unsaved content cannot be recovered. The practice editor's temporary code is not
saved and is absent. Tutor input is currently fixed guidance choices; no free-form
chat transcript exists in this application.

This learner export excludes passwords, session/refresh/confirmation tokens,
Auth metadata/internal tables, signing/API keys, grading keys, other learners,
global quota aggregates/policies and staff notes/editorial/audit records.
Operational logs, backups and provider-held data are outside this download.
The export now also includes private tutor retention preferences. Retention,
account deletion and public notices are implemented in the subsequent
[privacy controls slice](PRIVACY_CONTROLS_SETUP.md); its environment/provider
verification gates remain separate. NX-039 remains **In progress** until those
remaining acceptance checks are established.

## Ownership and delivery

`POST /api/account/export` requires the request's Origin to match the actual
application Host and a server-verified `getUser()` session. Caller-supplied owner
IDs in the query/body are ignored. `GET`/`HEAD` return 405. Success and explicit
failure responses are private/no-store; downloads have a fixed JSON attachment
filename and `nosniff`. Errors contain fixed messages, not provider payloads.
The browser requests only when the learner activates the button and does not
write export data to local/session storage.

The original `202610220001_learner_export.sql` migration adds only
`export_learner_data()`. It has no arguments, requires an existing learner profile,
and binds every collection to `auth.uid()`, even for staff. Its stable function
uses one database statement snapshot. The narrowly scoped security-definer
function has an empty search path, explicit columns, no dynamic SQL and execution
granted only to `authenticated` (PUBLIC/anon revoked). It reveals the caller's
selected private tutor records without granting direct access to private tables.
It performs no writes and leaves current RLS/grading/quota rules intact.
`202610230001_privacy_controls.sql` preserves that stable inner export but wraps
the public entry point to enforce reply expiry and append privacy settings.
The public wrapper can now remove expired reply text before exporting.

The synchronous download is capped at 8 MiB. Oversized exports fail completely;
no history is silently truncated. The cap bounds delivery, not the work required
to aggregate records inside PostgreSQL. Larger exports/background delivery need
a separate design if actual learner volumes require them. No rate-limiting or
persistent export job is added in this slice.

## Applying and verifying

Apply the additive migration through the project's normal reviewed migration
workflow. Existing development databases need this migration before downloading;
do not reset them. Docker/Vector startup, schema reset and hosted migration are
not part of this work.

The new no-argument JSON RPC type was generated from its isolated migration
catalog; all existing generated definitions are unchanged. A full local-provider
`npm run db:types:check` remains required when the real stack is deliberately
available. CI already runs fresh migrations, type drift checks and integration
tests on its disposable Supabase instance.

Offline coverage uses real migrations in PGlite with explicit Auth shims:
anonymous/missing/unknown identities, two learners including staff, new accounts,
explicit-column/secret exclusion, every exported collection, more than 1,000
attempts and whole-export oversize failure. The fixture-backed production browser
tests cover real cookies/routes/download bytes, ignored owner IDs, session
revocation, Origin checks, failures/retry, unsaved Settings entries, keyboard,
reduced motion, axe and 320/768/1440 layouts.

`tests/integration/privacy-export.spec.ts` additionally exercises actual Supabase
Auth/PostgREST ownership, forged RPC arguments and the Settings download. It is
prepared for the existing local-Supabase CI job; adding it does not claim that
the real provider was run locally. See [current verification](PROGRESS.md).
