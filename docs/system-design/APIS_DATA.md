# APIs and data — NX-046.24

Implementation checkpoint: **2026-11-05**; remote acceptance passed **2026-11-08**.
NX-046.24 is functionally Completed on the source/run recorded below. Automated
acceptance does not establish educational effectiveness.
The canonical status is in [features.csv](../features.csv), with current evidence
in [PROGRESS.md](../PROGRESS.md). NX-046.22 remains In progress. No later lesson
is implemented by this change.

## Branch, route and dependencies

`feat/studio-foundations-apis-data` starts at verified first-lesson commit
`d3e80b43ed2d944552da0f7369d7ebf095c06fbc`. Authenticated read-only inspection
on 2026-11-05 found PR #2 open/unmerged, stacked on unmerged M1 PR #1. This new
branch depends on PR #2; neither earlier branch was modified. PR #3 now targets
`feat/studio-foundations-web-request` while that dependency is unmerged. Safely
reconcile against main, retarget and reverify once it contains both earlier slices.
The implementation session prohibited publication; remote publication/acceptance
was separately authorised on 2026-11-08. No merge or deployment was performed.

Open `/courses/system-design-studio-v1/foundations/apis-data-v1` after onboarding
and the existing Studio enrolment on a migrated backend. Courses still offers
Start foundations at lesson one and Open workshop. Both implemented lessons are
listed in the shared workspace; later lessons remain labelled Planned. First-lesson
and workshop routes, existing enrolments and saved progress stay usable without
prerequisite locks or extra catalogue data queries.

Pinned references:

| Reference                                              | Value                                    |
| ------------------------------------------------------ | ---------------------------------------- |
| Lesson                                                 | `apis-data-v1`                           |
| Content                                                | `apis-data-content-v1`                   |
| Position schema                                        | `api-position-v1`                        |
| Local example contract, mapped by this content version | `campus-api-example-v1`                  |
| Additive migration                                     | `202611050001_foundations_apis_data.sql` |

Published `web-request-v1` content, grading keys, prior evidence and M1 formulas
are not rewritten. Future content changes require a new published identity.

## Student journey and example contract

Learn defines API, HTTP, resource/representation, method, path, request body,
status, response body and JSON before guided practice. JSON is a structured text
format, not a database. Public fields may differ from storage; the application
validates input and controls access. Authentication and authorization are
introduced as identity and permission checks. A method never grants permission.

The labelled explorer uses two fixed fictional records: `evt_101` Robotics meetup
and `evt_102` Campus gardening club. `evt_999` is the bounded unknown-ID choice.
There is no arbitrary URL, transport code, real API endpoint or mutable event store.

| Scenario              | Example request                                 | Result after Show example response                         |
| --------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| List events           | GET `/api/events`, no body                      | 200; `{ "events": [...] }`, two selected representations   |
| View one event        | GET `/api/events/evt_101` or `evt_102`, no body | 200; `{ "event": { "id": ..., "title": ... } }`            |
| Missing event         | GET `/api/events/evt_999`                       | 404; `event_not_found` error with explanation              |
| Create example        | POST `/api/events`, `{ "title": "..." }`        | Illustrative 201; fixed `evt_example` ID and trimmed title |
| Missing/invalid title | POST with omitted title or invalid value        | 400; `invalid_title` error with explanation                |

An empty title field produces an empty request object. Valid titles have 3–80
UTF-16 code units after trimming and no ASCII control characters. The editable
and saved draft is bounded to 80 UTF-16 code units; invalid drafts, including an
empty title, may be saved so the learner can resume an error example. The pure
model additionally handles non-string/missing titles as invalid input. This is an
explicitly chosen lesson contract, not a universal HTTP validation convention.
JSON is shown alongside plain-language data descriptions. Error status and body
are distinct; status alone does not explain every error or access condition.

GET retrieves a representation without intentionally changing application state.
POST creates in this example but has other uses. The illustrative create never
adds an event to List/View or writes an event to the database. Every run is pure
and deterministic; no clock, random ID, fetch or server action is used. Reset
returns fresh defaults and clears the response. Editing any field clears the
response, even if the learner later restores the same input. Initial render and
resume show no response until the learner explicitly runs the example.

Practice has four protected checks: read-one request; create request data;
missing-resource versus invalid-input feedback; selected API fields versus private
storage. Each has three options, one correct answer, two progressive hints and
option-specific explanations. Keys and help are seeded only in the existing
private SQL schema. Server-side eligibility and option checks bind evidence to
this lesson/version. Retries, feedback issued, hints and full explanations remain
append-only; a later correct retry is not independent first-attempt evidence.
The explorer awards no practice result. Neither saving nor these checks awards
mastery, JavaScript credit or completion of System Design Studio.

Recap summarizes the contract, provides a glossary, and links to lesson one,
practice and the existing capacity workshop. Learn/Practice/Recap and native
lesson-list/term disclosures keep keyboard semantics and existing focus styles.
Request/response panels stack on narrow screens; JSON wraps. There is no autoplay
or required animation, and existing reduced-motion styles apply. Screenshots in
the prompt guide layout, not content, stored state or fabricated progress.

## Private persistence and assessment

The shared workspace registry selects content and strict position/assessment
contracts by pinned lesson identity. API positions store section, self-reported
viewed state, fixed step 0, scenario, bounded event ID and title draft. They do
not store a response, create an actual event, submit a selected answer or award
a grade. API position shape cannot be used for lesson one or vice versa.

Existing owner-only append-only position/event tables, RPC signatures, per-owner
serialization, expected revisions, request-key binding, assistance limits,
export wrapper and signed account-deletion cascades are reused. The additive
migration inserts only new metadata/keys, extends allowed question IDs, and
replaces eligibility/save functions to validate both versioned contracts. No new
public table, column, function signature or private-data collection is required.
Public database declaration shapes are unchanged by inspection; full provider
generation/drift remains a remote gate, not a local claim.

Save is explicit. Failed/ambiguous saves retain values and a stable retry key.
Session loss/account switches preserve drafts in the open tab and require the
original account in another tab. Conflict comparison shows scenario/ID/title;
keeping the draft rebases only the next explicit save, while adopting a saved
position asks for confirmation and clears any local response. Both revisions
remain available in export. Resizing/section changes preserve config, response
and unsubmitted selections. Nothing private is silently stored in localStorage.

## Technical source review and provenance

AI-assisted source/content review on **2026-11-05** checked the learning outcomes,
request/response direction, chosen contract, safety/access caveats, all four keys,
option feedback, hints and glossary against these authoritative references:

- [MDN API glossary](https://developer.mozilla.org/en-US/docs/Glossary/API): an interface for programs, not a database.
- [RFC 9110 §3.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-3.2): resource representations.
- [RFC 9110 §9.2.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.1), [§9.3.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.3.1), [§9.3.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.3.3): safe-method intent, GET and the broader semantics of POST.
- [RFC 9110 §15.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3), [§15.5.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.1), [§15.5.5](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.5): 200/201, 400 and 404 semantics. The example's validation choice is not presented as the only permitted convention.
- [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259.html), [MDN JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON): structured data and JSON objects/arrays.
- [MDN Authentication](https://developer.mozilla.org/en-US/docs/Glossary/Authentication), [MDN HTTP authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication): identifying callers and restricting access; valid identity alone does not guarantee permission.

Paths, records, wrapper shapes, title bounds and the fixed example ID are teaching
design choices. They are not claims that the RFCs prescribe this application API.
No independent educator review, beginner pilot, learner validation or measured
educational effectiveness has occurred.

## Changed-file map

- Public content/registry/model: `modules/system-design/foundations/{api-content,api-example,lessons}.ts`.
- Shared validation/actions: `modules/system-design/foundations/{schema,actions}.ts`;
  allowlisted lesson links: `modules/system-design/links.ts`.
- Explorer/workspace/styles: `components/system-design/foundations/{api-explorer,lesson}.tsx`
  and `lesson.module.css`; existing foundations route and Courses discovery page.
- Migration: `supabase/migrations/202611050001_foundations_apis_data.sql`.
- Focused unit/isolated/provider-browser checks: `tests/{unit,database,integration}/apis-data.*`;
  pgTAP: `supabase/tests/apis_data.sql`; suite entries in `package.json`.
- Prepared remote gates: `scripts/ci-provider-{acceptance,policy}.ts`, policy unit
  checks and `.github/workflows/ci.yml` screenshot paths.
- Canonical tracker/handoff and relevant existing foundations/roadmap notes.
  No dependency/lockfile, public type declaration or environment file changed.

## Verification and remote handoff

Initial lightweight checks and counts are retained in the handoff history;
actual provider acceptance is recorded below. Focused unit
checks exercise deterministic responses, invalid/missing values, bounded/reset/
stale state, no fetch, strict identities and exclusion of client grades/keys.
Isolated PGlite tests upgrade from M1 plus lesson one, preserve first-lesson keys/
position/attempt and JS records, and exercise API ownership/enrolment, private
keys, revision/key conflicts, immutable records, help/retry evidence, both-lesson
export and signed synthetic-owner deletion. Auth is shimmed; this is not real
Supabase acceptance. Existing foundations, workshop and JavaScript SQL regressions
are checked separately.

Initially prepared without execution in the implementation session (subsequent
remote results are recorded below):

- `supabase/tests/apis_data.sql`: 32 provider pgTAP assertions, additional to all
  existing assertions.
- `tests/integration/apis-data.spec.ts`: two real-provider journeys for local-only
  explorer behavior, all response codes, validation/stale/reset, grading/help/
  retry, pinned save/reload, first-lesson/workshop continuity, owner/staff isolation,
  idempotency, conflict/adoption, failed saves, session/account recovery and deletion.
  It prepares Axe, keyboard/disclosure/focus checks, reduced motion, touch targets
  and overflow at 320/390/768/1440, plus six masked Learn/Practice/Recap captures
  at 390/1440 pixels.
- The existing hosted-only provider wrapper now upgrades from `202611010001`
  through `202611050001`, additionally preserves a synthetic first-lesson position
  and attempt alongside JS/M1 fixtures, and requires both API browser cases. Six
  exact screenshot paths extend the existing seven-day sanitized allowlist.
  No runner/service/trigger/credential setting is changed and no job was triggered.
- Full Supabase migration/upgrade, type generation/drift, pgTAP/Auth/PostgREST,
  browser/Axe/screenshots, production build, complete regressions and route
  performance budgets remain pending on GitHub-hosted runners. No prior lesson
  acceptance run proves these changes. Physical devices, human screen readers,
  forced JWT expiry/revocation and independent educational review remain unclaimed.

No screenshots were captured locally. No local services, container downloads,
provider mutations, package installation, billing changes, publication or later
lesson work occurred. After this lesson passes remote acceptance, the next small
slice is NX-046.25: latency, throughput and concurrency.

## Remote acceptance — 2026-11-08, application gate pending

Publication was separately authorised. [Stacked PR #3](https://github.com/Mohammadhasan14/Nexus_learning_platform/pull/3)
targets unmerged PR #2, which depends on unmerged M1 PR #1. Retarget/reverify
after their eventual merge; neither was merged or deployed.

[Run 42503597466](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/42503597466)
verified source `58f270d319ec36a7156e0261c60454b9a6ff69f5` as merge
`a59d8c2c725dcbf6b75fc9438bdc4fe1a2c8cf2a`. Provider acceptance passed all 19 migrations
through `202611050001`, upgrade preservation, 136 pgTAP assertions/six files,
full generated types/drift, provider build, 19 browser cases and scoped cleanup.
Two live-only cases were intentionally skipped, not substituted for required cases.
The public schema remained byte-identical: SHA-256
`04f4f7ce399338daa408f649de309cbeaaabc150d9fd028f6c3d8a08d70d703b`.

Both API journeys passed, including local-only responses/reset/stale state,
private grading/help/retries, pinned saves, conflicts, session/account recovery,
privacy lifecycle and earlier course continuity. Axe/keyboard/reduced-motion/
touch/overflow checks passed at all four widths. Six sanitized API captures were
visually reviewed against the supplied reference: existing shell/tokens, desktop
request/response panels, mobile stacks and visible state/evidence distinctions.
Inputs and JSON are masked by artifact policy. No interface redesign was needed.

[Seven-day artifact](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/42503597466/artifacts/13626028557)
contains reports, generated schema and six API plus eight earlier-lesson/workshop
PNGs. Ignored local copies are in
`test-results/verification/apis-data-provider-remote/studio-m1-provider-42503597466-1/`.
No credentials, browser state, raw error payloads or private logs were uploaded.

The independent application job passed its first seven gates, then failed fixture
flows before performance. Its discarded raw output cannot identify the historical
case/cause. The CI follow-up preserves sanitized case coordinates, outcomes,
public rule IDs and durations for fixture/performance failures, without weakening
assertions or uploading raw data. NX-046.24 stays In review pending these remaining
application gates. This provider pass alone does not claim the entire workflow
passed. Independent educator/learner validation and the previously stated manual
or managed-provider limits remain unclaimed. No local Docker, Supabase, browser
suite, build, production data, merge, deployment or later lesson was used.

## Completed remote acceptance — 2026-11-08

[Accepted run 42504661018](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/42504661018)
tested source `5827ad6bcf7c1944b6b49ac9afbd0d7976c4a351` as PR merge
`48205949e872d74fc379eb208a7c23999a21ef40`. **Both required jobs passed.**
The documentation-only follow-up receives the usual required checks; its exact
latest result is visible on [PR #3](https://github.com/Mohammadhasan14/Nexus_learning_platform/pull/3).
It remains stacked on unmerged PR #2/M1 #1 and must be retargeted/reverified after
those dependencies merge. No merge or deployment occurred.

All 19 migrations through `202611050001`, JS/M1/first-lesson upgrade preservation,
136 pgTAP assertions in six files (32 API assertions), committed type drift,
full provider generation/recheck, provider build and cleanup passed. Public
schema declarations remain byte-identical with SHA-256
`04f4f7ce399338daa408f649de309cbeaaabc150d9fd028f6c3d8a08d70d703b`.
Nineteen provider/browser cases passed; the two explicit live-only skips do not
replace any required case. API, first-lesson, workshop, JS and privacy journeys
all passed on actual Supabase Auth/PostgREST/PostgreSQL with synthetic accounts.
The two API cases exercise every response, local-only transport boundaries,
error/reset/stale handling, server grading/keys, assistance/retry history,
versioned private resume, conflicts, failure/session recovery, export and signed
deletion. They do not claim mastery or whole-course completion.

The independent application job passed all nine normal gates, including **86
fixture-flow checks and 11 performance checks** with no runner errors. No gate,
assertion, accessibility rule or performance threshold was disabled or relaxed.
The prior fixture failure did not recur; its discarded assertion output means
its original cause cannot be established. The change adds sanitized diagnostics,
not a claimed product root-cause fix. No lesson/UI, schema/type or grading-key
correction was needed during acceptance.

All six API Learn/Practice-feedback/Recap captures at 390/1440 were visually
reviewed; accepted-run files are byte-identical to the reviewed first-run files.
Axe, keyboard/tab/disclosure/focus, reduced motion, touch and overflow checks
passed at 320/390/768/1440. The UI adapts the supplied reference to the existing
shell and tokens. JSON/inputs are masked by policy; no redesign was performed.

- [Sanitized provider artifact](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/42504661018/artifacts/13627490966): reports, full public schema, six API plus eight earlier-lesson/workshop PNGs.
- [Sanitized fixture/performance artifact](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/42504661018/artifacts/13627710291): 86/11 passing cases, source coordinates, fixed outcomes and durations only.

Ignored copies are under
`test-results/verification/apis-data-provider-remote/studio-m1-provider-42504661018-1/`
and `application-browser-42504661018-1/`. Seven-day retention and scoped cleanup
passed; no private logs, environment files, browser state, tokens, credentials,
DOM dumps or raw errors were uploaded. No local service/build/browser suite ran,
shared/production database was accessed or billing setting changed.

NX-046.24 is functionally Completed; NX-046.22 remains In progress and NX-046.25–27
remain Deferred. Independent educator review, learner validation/educational
effectiveness, physical devices, human screen readers, Firefox/WebKit, forced
provider JWT expiry/revocation, managed Supabase and deployment remain unverified.
The original non-reproduced fixture failure also remains without a known cause.
Next is NX-046.25, latency/throughput/concurrency, separately authorised.
