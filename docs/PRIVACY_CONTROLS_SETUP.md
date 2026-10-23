# Privacy controls (NX-039 development)

Settings now includes owner-only tutor reply retention and permanent account
deletion. Public `/privacy` and `/terms` pages work without accounts or JavaScript
and are linked from registration, the homepage and the learner navigation.
They describe actual application behavior rather than claiming a legal approval,
provider policy, retention period or data location that has not been verified.

## Retention

The user selected **until I remove them** as the default, with **30 days**,
**90 days**, and an explicit **clear now** action. The default does not delete
existing replies. Settings persist privately through owner-derived RPCs; callers
cannot supply an owner. Selecting a shorter duration immediately expires older
saved text. Expiration is inclusive at the saved-at cutoff; timestamps use UTC.
Legacy scripted receipts have only a request day, so their saved timestamp is
conservatively backfilled to its UTC start. Extending a duration cannot restore
removed text.

The migration adds saved/removed timestamps to private tutor requests. A removed
request remains a tombstone: cleared replies cannot be restored by an old
scripted retry or by a live receipt racing the clear. Finishing such a live
request still reconciles trusted usage once, while returning `saved: false`.
Clearing does not refund allowance, erase attempts/outcomes or change grading.
Open tabs and downloaded files cannot be remotely erased. New explicit tutor
requests can save new replies normally.

Tutor reads, scripted use, report submission, export and privacy-settings reads
enforce expiration. The existing export's original records are still assembled
in its stable inner snapshot; its public wrapper now performs expiry first and
adds private retention preferences. It is therefore volatile. Failed database
transactions roll back their cleanup as well as their main operation.

For physical cleanup without learner traffic, a trusted operator can schedule:

```sql
select privacy_private.prune_expired_replies();
```

This function is not executable by learners or exposed through the Data API.
No scheduler, running worker, Docker restart or hosted job is provisioned here.
Until maintenance is scheduled, expired text can remain physically stored until
a successful operation enforces its removal; it is not returned by the guarded
learner paths. The notice explains this distinction. Request IDs, reservations,
token counters and learning evidence are retained separately until account
deletion. Reports preserve their already-submitted reply copy for review;
ordinary tutor clearing does not remove a filed report.

## Permanent deletion and reauthentication

The UI requires the current password and the exact word `DELETE`. Same-origin,
bounded JSON POST plus verified `getUser()` protect the route. It rechecks the
password for the verified account email using an isolated publishable-key Auth
client, checks the returned user ID, and disposes of that temporary verification
session on success or failure. It never swaps the browser's session on a failed
password check, echoes a password, or reads Auth password hashes.

Only successful password verification issues a separate HMAC capability, bound
to owner, action, nonce and at most 60 seconds. The database independently checks
the exact signed bytes, action, owner and lifetime before deleting anything.
The private database copy of the scoped key has no learner grants. The normal
application uses no service-role/secret Supabase key. This capability authorizes
only deletion of its signed, currently authenticated owner.

The transaction removes the learner's report audits and filed reports before
deleting the Auth user. Existing FKs cascade private profile, progress, notes,
projects, tutor/accounting and privacy preferences. Other users remain intact;
global quota totals remain charged. Editorial identity links become null while
published lessons and staff audit text remain. A provider/FK failure rolls back
all data changes. Future storage uploads need a reviewed object-deletion design;
there is currently no application upload feature.

On confirmed success, the application clears its environment-specific Auth
cookies and replaces the page with sign-in. A lost response can leave deletion
unconfirmed, so failure text instructs the learner to check the account before
retrying. Supabase access tokens can outlive deletion until expiry; sensitive
application paths verify the actual account and reject deleted users. See
[Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data)
and [sessions](https://supabase.com/docs/guides/auth/sessions).

## Environment work kept separate

Apply `202610220001_learner_export.sql` and
`202610230001_privacy_controls.sql` through the reviewed migration workflow.
Do not reset an existing database. No real migration was applied during this
development slice and Docker/Vector remain stopped.

The local operator command below requires an already-running, explicitly
selected local project. It generates/reuses a separate deletion key, writes its
private database copy through stdin (not argv/logs), and records the server-only
key in `.env.local`. It does not start Docker and has not been run on this
workspace. Never reuse a tutor/provider/API key or use `NEXT_PUBLIC_`.

```sh
npm run privacy:deletion:setup
```

Restart the app after intentional setup. Without a valid configured key,
deletion is unavailable and fails closed; export and retention remain usable.
The disposable Supabase CI job now invokes this setup after its migrations and
before integration checks. That workflow edit is not a claim of a remote run.

Supply `PRIVACY_OPERATOR_NAME` for the public notice. The user explicitly supplied
`hello.farzain@gmail.com` as the public contact; it is the code/example default.
`PRIVACY_CONTACT_EMAIL` can override it for a different environment.
React escapes the operator text, and only a validated email becomes a mailto
link. An absent operator name or invalid email is identified in the notice;
it never copies the Git identity automatically. Actual hosted provider, logging,
backup, jurisdiction and support arrangements still need owner verification
before public beta. Deletion does not promise erasure from backups or providers.

## Verification

Isolated migration tests cover ownership/anonymous/staff boundaries, default and
changed retention, irreversible expiry, report-copy separation, operator cleanup,
in-flight receipt tombstones with unchanged accounting semantics, proof forgery,
wrong owner/action/expiry, rollback on an extra FK and account cascades/global
usage preservation. Auth is explicitly shimmed in PGlite.

Production browser fixtures cover real SSR sessions, password failure without
losing the session, cookie cleanup and rejected later sign-in, selected-value
retention on errors, explicit clear confirmation, API validation/revocation,
three-width axe/overflow/keyboard/reduced motion, and no password canary in the
captured application log. Public tests exercise the notices without JavaScript.
The real Supabase test is prepared under `tests/integration/privacy-controls.spec.ts`
but remains a separate provider verification gate. New RPC type entries were
derived from the isolated migration catalog; full provider type drift checking
still belongs to the real stack/CI. See [current progress](PROGRESS.md).
