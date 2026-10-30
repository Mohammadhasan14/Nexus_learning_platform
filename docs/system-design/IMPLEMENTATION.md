# Requirements and capacity workshop — M1

Implementation record, 29 October 2026. Current task status and verification
belong in the canonical feature register and current progress handoff.

## NX-046.1 contract and review

`campus-events-v1` belongs to `system-design-studio-v1`; its schema is
`worksheet-v1` and estimator `capacity-v1`. Immutable scenario identity binds the
reviewed brief/teaching in `modules/system-design/content.ts` and database seed.
The first workshop is one slice of a planned beginner-to-advanced course.
NX-046.22 tracks the future introductory module; M1 teaches unfamiliar terms
inline without implementing or requiring that module.

Defaults are an illustrative workload, not observed traffic: 100,000 DAU, 20
requests/user/day, peak factor 5, 90% reads, 20,000 bytes/read response, 2,000
bytes/write and 30 days retained. Requirements/exclusions and targets are editable;
200 ms and 99.9% are goals, not estimator outputs. Requirements, assumptions and
explanations may be empty while drafting. Saving is not assessment or completion.

| Input                                 | Inclusive range   | Whole number |
| ------------------------------------- | ----------------- | ------------ |
| Daily active users                    | 0–100,000,000     | yes          |
| Requests/user/day                     | 0–100,000         | no           |
| Peak factor                           | 1–100             | no           |
| Read percentage                       | 0–100             | no           |
| Read response and write payload bytes | 0–10,000,000 each | yes          |
| Retention days                        | 0–3,650           | yes          |
| Latency target ms                     | 1–600,000         | no           |
| Availability target percent           | 0–100             | no           |

Missing/blank/non-numeric values differ from zero. Reject non-finite numbers,
unknown fields and unsupported schema/formula identities. Reject combinations
whose retained bytes exceed Number.MAX_SAFE_INTEGER (9,007,199,254,740,991),
rather than pretending exact byte precision. No intermediate rounding.

Daily requests = DAU × requests/user/day. Average RPS divides by 86,400; peak RPS
multiplies the average by peak factor. Peak reads/writes split using read%/100.
Retained writes use daily requests × write share × payload bytes × days,
**not peak traffic**. Read egress = peak reads/s × response bytes × 8 / 1,000,000
Mbps. Decimal GB divides bytes by 1,000,000,000; binary GiB by 1,073,741,824.
Storage means accumulated retained write volume, not predicted database size
when updates replace existing values. Exclude indexes, replicas, backups,
protocols, compression and growth. No server sizing, latency, availability,
production-readiness, randomness, simulation or grade is derived.

AI-assisted editorial/arithmetic review checked the scenario against each
formula, golden values (12 GB ≈ 11.175871 GiB; 16.666667 Mbps), zero-load,
read/write endpoints, invalid values, version rejection and combined precision
bounds. Pure golden/boundary tests are part of `test:unit`. This is not a human,
independent assessment or pedagogical efficacy validation.

## Persistence contract

The additive `202610290001_studio_workshop.sql` migration defaults all existing
courses to `lessons` and adds the Studio course/scenario alongside them. Application
navigation ships with the workshop, not a separately published broken course.
No old content IDs, attempts, enrolments or tutor permissions are changed.

One owner/scenario head points to append-only revisions. Saves require verified
Auth, onboarding, the scenario's enrolment, an expected revision and UUID key.
SQL validates strict fields/ranges as well as application validation. An identical
retry returns its original saved revision; key reuse with different content/base
is rejected. Stale writes fail with 40001. Direct writes are revoked, RLS limits
reads including staff, and the composite FK prevents attaching revisions to
another owner's head. Documents are bounded to 64 KiB and 1,000 saved revisions
per owner/scenario; history is never silently pruned.

Only inputs and pinned identities persist; authoritative estimates are recomputed
on the server. No caller owner/result is accepted. Account export adds explicit
owner-only heads/revisions to the existing format, preserving the 8 MiB failure
limit and reply-expiry behavior. Auth deletion cascades through heads/revisions;
the existing signed password-confirmed deletion flow remains in place.

Real Supabase migration application, provider-generated types, pgTAP and real
provider/browser integration must be verified separately on an authorised test
stack. Isolated PostgreSQL/Auth shims and HTTP fixtures cannot establish those
results. Docker/Vector remain stopped in this implementation session.

## UI and recovery

Open `/courses/system-design-studio-v1/studio/campus-events-v1` after signing in,
completing onboarding and enrolling through Courses. Catalogue and dashboard
continuations use the Studio experience and display actual saved revision state;
no JS starting check, 0/0 grade counter or completion is fabricated. Search's
existing Courses action also mentions Studio. JavaScript routes and tutor
allowlists remain unchanged.

The existing learner shell and tokens surround a two-column desktop form and
adjacent estimates. Narrow screens stack the same components without remounting
inputs. All six estimates have keyboard-operated formula disclosures. Section
links open their corresponding disclosures and are navigation, not completion
steps. Teaching, defaults, ranges, assumptions, limitations and pinned versions
are inspectable. The save area uses normal document flow, so it cannot obscure
focused fields. No mock navigation links or later-phase tools were introduced.

React holds unsaved fields in memory; there is no localStorage or autosave.
Controls wait for hydration before editing. Validation and request failures keep
values. A request identity stays with the exact submitted payload/base through
an uncertain network response; an unchanged retry checks the same save. Edits
made while a save is in flight are kept and continue to show as unsaved after
that older snapshot succeeds. Saved status appears only after confirmed storage.

Expired sessions return a labelled error without redirecting the draft away;
learners can sign in with the original account in another tab and retry. An
account-switch guard compares the verified session with the rendered account;
it does not supply ownership to the database. Conflict recovery loads a newer
saved copy alongside the untouched draft. The learner explicitly chooses a
confirmed replacement, or keeps the draft against the newer base and saves a
new immutable revision. Ordinary links/full-document exits ask about unsaved
work. This is not offline persistence or cross-device draft synchronisation.

## Migration and type verification

The migration is prepared and executed only inside the existing isolated harness
in this session. Apply it additively on an authorised environment together with
the matching application; do not reset learner records. No real database has
been changed and no deletion key has been provisioned here.

`node --import tsx scripts/studio-database-types.ts` generates only the M1
course/table/RPC additions from the isolated migration catalog, preserving the
existing provider-generated declarations. The generator and normal provider
command use a neutral generation header; full generation remains
`npm run db:types`, followed by `npm run db:types:check`, on an authorised local
Supabase stack. The isolated generator does **not** establish real PostgREST
metadata compatibility or provider type drift. Do not count those as passed.

`supabase/tests/studio.sql` prepares twelve real-provider pgTAP assertions.
`tests/integration/system-design.spec.ts` prepares real Auth/PostgREST concurrency,
owner/staff isolation, browser resume and synthetic-account deletion/cascade.
They are unrun while Docker/Supabase remain stopped. The existing CI integration
job can exercise them on its disposable stack; no current remote run is claimed.

## Verification evidence

Fresh completed evidence and exact counts are recorded in `docs/PROGRESS.md` and
against NX-046.1–4 in `docs/features.csv`. The unit and isolated database suites
run through the normal package commands. Existing provider tests that chose an
unscoped Enrol button/version-1 row were narrowed to the intended JavaScript
course now that another subject exists; their grading/content assertions remain.

Browser checks use production Next, the existing test-only HTTP provider and
cached Chromium. New fixture code is never imported by the application. Coverage
includes all six golden results/formulas, zeros versus blanks, save/reload/sign-in,
lost acknowledgements/idempotent retry, two tabs/conflicts, session expiry and
reauthentication, separate owners, unsupported/unknown routes, edits during pending
saves, old JS practice/tutor restrictions, and keyboard/axe/reduced-motion/reflow
at 320/390/768/1440px. Earlier browser failures were test-helper/selector assumptions
(transient sign-in URL, synthetic enrolment ordering, Next's route announcer and
streamed not-found status); they were corrected without weakening product checks.
Visual review additionally corrected estimate-label alignment and byte display
precision, and collapsed introductory teaching behind its explicit disclosure.
A reproduced validation regression also now opens collapsed input sections before
focusing the invalid field, without discarding values.

Screenshots, logs and cold-load samples stay ignored under
`test-results/verification/studio/`. Workshop measurements use three cold 390×844
Chromium contexts, 4× CPU slowdown, cache disabled, 150 ms configured latency and
200,000/93,750 bytes/s download/upload. Input timings include browser automation
round trips and are diagnostics, not a latency SLA. Existing five-route payload
budgets and read/deferred-loading checks remain separate regression gates; prior
performance evidence is preserved rather than overwritten.

Final workshop samples on build `WWQYrv_K0f1xXG0NTbrSi` recorded 171,595 encoded
JavaScript bytes and 10,832 encoded CSS bytes in each cold load. Encoded HTML
was 8,103 / 8,374 / 8,538 bytes; input automation round trips were 169 / 149 /
147 ms. These are a bounded local baseline, not a real-user performance claim.

Physical modest-computer/touch, Firefox/WebKit, actual screen-reader, real
Supabase, hosted environment and remote-CI acceptance are not established by
synthetic browser/PGlite evidence. No production readiness or mastery claim.
M2 and the deferred foundations module remain outside this implementation.
