# Current progress

Updated: **2026-10-29**. Read this file, [features.csv](features.csv) and
[DECISIONS.md](DECISIONS.md) before continuing. This repository's `docs/` is now
canonical; parent-workspace documents and the spreadsheet are legacy snapshots.

## Current handoff — System Design Studio M1 started, then paused

The user authorised NX-046.1–4 on 2026-10-29 with desktop/narrow-screen UI
references, then explicitly postponed implementation and requested commits.
Do not resume feature work until instructed. The planning documents were
committed as `0d133d3`; this commit group records the remaining planning and
initial estimator work using only the current project Git identity.

**Implemented so far:** versioned campus event scenario, worksheet/input schemas,
inline terminology, defaults and a pure deterministic capacity estimator under
`modules/system-design/`. Three focused unit cases passed for the golden fixture,
meaningful zeros/boundaries, invalid inputs, unsupported versions and precision
limits. Formatting was corrected before committing. The new unit file is not yet
wired into the package test script. NX-046.1 remains In progress: this is an
initial contract, not completed milestone acceptance.

**Not implemented:** migrations, generated database types, persistence, course
entry/routing, worksheet UI, save/recovery and combined browser/performance
acceptance. NX-046.2–4 remain Pending. The workshop is not available to learners.
No Docker/Vector, real database, credentials, dependency, provider or deployment
change. Three estimator cases do not replace type/lint/build/browser/provider
verification, which remain outstanding for this initial code.

**Curriculum clarification:** the planned beginner-to-advanced journey begins
with a short foundations module before the workshop: clients/servers/APIs,
databases, requests/responses, latency/throughput and read/write workloads, using
simple examples and guided practice. Track this deferred work as NX-046.22;
implement none of it in M1 and do not gate today's workshop on missing content.
The initial scenario explains unfamiliar terms inline and does not claim to be
a complete course. The register now has 103 rows: 51 Completed, 11 In progress,
8 Pending and 33 Deferred. Later editor/simulator milestones remain Deferred.

**Next action when resumed:** review and finish NX-046.1 contracts and verification,
then proceed sequentially through NX-046.2–4 using the supplied references and
`system-design/NEXT_IMPLEMENTATION.md`. Stop after M1. Preserve the existing
planning work and JavaScript/Auth/privacy behavior.

## Previous handoff — System Design Studio audit and planning only

The user requested inspection and an incremental implementation plan, explicitly
excluding feature implementation in this session. Began clean at `1456834`.
Farzain Learning is the current site name; Nexus remains in repository/history
identifiers. The rename was fully committed before this audit, including
`ecfbbda`, `149f556`, `d5cec94` and final `1456834`; older handoffs below preserve
their original session scope.

**Findings:** checked-in seeds provide JavaScript foundations v1/v2, not multiple
implemented subject courses. Homepage AI/web paths and workspace output are
illustrative. No system-design worksheet/calculator, canvas, graph, simulator,
failure/comparison UI or scenario-specific coaching exists. Versioned enrolment,
protected attempts, Auth/RLS, private revisions, tutoring, outcomes, UI patterns
and tests can be reused. Current catalogue/lesson/starting-check/project/tutor
assumptions need explicit Studio adaptation; see the
[evidence-based inventory](system-design/AUDIT.md).

**Planning:** [six-milestone approach](system-design/PLAN.md) covers requirements/
capacity → editor → simulation/traces → failure investigation/comparison →
assessment/coaching/mastery → advanced challenges/portfolio/collaboration. It
defines ownership, versioned persistence/models, bounded deterministic compute,
accessible graph alternatives and performance safeguards. No competing tracker:
`features.csv` retains every original ID/status/criterion and adds 25 scoped
tasks under NX-046/NX-048/NX-047/NX-050. There are now **102 rows: 51 Completed,
10 In progress, 9 Pending, 32 Deferred**. The four Pending tasks are unstarted
M1 work; all later Studio delivery stays Deferred. No Studio feature is Completed.

**Fresh checks passed:** four existing security unit cases and three migration
test files (content/learning/policies) in isolated PGlite with Auth shims. Existing
SQL is applied only in memory; no application database was migrated or queried.
Final gates passed: repository formatting, CSV IDs/dependencies/statuses and
preserved original rows, 58 new-document file links,
`git -c core.whitespace=cr-at-eol diff --check` (preserving CSV CRLF) and a
seven-file documentation-only worktree audit with an empty index.
No build, browser, full suite, real provider
or remote CI rerun; older evidence below is historical.

**Next implementation:** M1 / NX-046.1–4, one private requirements-and-capacity
workshop with a fictional campus event directory, explicit assumptions/units,
transparent formulas, explanation and save/resume. See the bounded
[next prompt](system-design/NEXT_IMPLEMENTATION.md). Obtain desktop/narrow-screen
worksheet references for visual matching; do not begin the editor or simulator.
No product answer blocks local model/contracts. Real-provider acceptance needs
an authorised test environment; hosted/device gates retain their existing scope.

**Stop:** documentation only, uncommitted. No application code, schema, package,
lockfile, environment, credential, real account, running service, AI call, push or
deployment changed. Docker/Vector remain stopped. Do not execute the prepared
next prompt without a later implementation instruction.

## Previous handoff — Farzain Learning site name

The user requested renaming the site from Nexus Learning to **Farzain Learning**.
Work began clean at `748dd69` after the local performance changes were committed.

**Updated:** shared visible/accessible brand, homepage copy and preview monogram,
all public/account/learner/staff titles, root description, privacy/terms copy,
confirmation-email subject/template source and repository display heading.
Monograms now use F. A small static SVG browser icon replaces the starter favicon.
Downloads are named `farzain-learning-data.json` in both the server attachment and
browser control; the setup guide and existing assertion match.

**Compatibility:** keep session cookies, export format/schema marker, runner
protocol, project/package/database identifiers and log service IDs. Preserve
published lesson examples, historical reports/evaluations/planning evidence and
the user-approved privacy contact. No inferred operator identity, schema change,
account/session reset, dependency/lockfile update or design overhaul.

**Verification passed:** formatting, lint, types and production build; 17 focused
account/export cases, one dynamic lesson-title case, all 17 public cases and five
cold-load budget cases (40 distinct browser cases). Visual review caught the
longer name wrapping the Menu button at 320px; a 12px narrow-header column gap
keeps both on one row. After that scoped CSS fix, the final build passed all
public/budget cases again and direct header geometry/icon/overflow checks at
320/390/768/1440. Final 320px homepage/login and F icon screenshots were visually
reviewed. No extra test cases were added solely for the name change; existing
title/filename expectations were updated. Unit/database suites were not repeated
for display copy, icons, filenames and the scoped header spacing.

Rename measurements/screenshots/logs stay ignored under
`test-results/verification/branding/`. The prior NX-029 performance report was
restored byte for byte after recording the rename's fifteen fresh load samples
separately, so the historical measurements retain their original provenance.
Temporary test servers are stopped.

**Preserved preferences:** Docker/Vector remain stopped. The confirmation email
source is updated without changing an existing Auth provider or sending emails.
No real account/database, credentials, hosted settings, commit, push or deployment.
The feature register's 77 rows and statuses/criteria remain unchanged.

**Next action:** owner review of the completed Farzain Learning branding change.
The broader device, real-user and hosted acceptance limits recorded below remain.

## Previous handoff — NX-029 production performance

The user prioritised performance and authorised production measurements,
confirmed fixes and repeatable budgets. Work began clean at `3c16c56`. See
[method, results and limits](PERFORMANCE_REVIEW.md).

**Confirmed and fixed:** the dashboard made five Auth calls and three profile
reads per document. Render-only request memoization reduces those to two and one,
keeping independent proxy verification and uncached mutation/API checks.
Lessons/projects also avoid repeated identity/profile reads. Live validation,
runner control and Settings response validation load at use; locale labels no
longer import profile validation. Immediate SSR controls, validation, worker/CSP
boundaries, learning behavior and quota accounting are preserved.

**Coverage:** a separate production performance suite measures three cold-browser
samples for homepage/dashboard/lesson/projects/Settings, with a 390px mobile
viewport and explicit Chromium CPU/network configuration. Fixed byte budgets,
backend read counts, deferred-loading/cancellation/recovery and simultaneous
learner/revocation behavior form eleven checks. `npm run check` includes the new
suite; public test discovery excludes its separate fixture-dependent directory.

**Measured:** lesson encoded JavaScript fell 173,299 → 145,509 bytes (16.0%);
Settings fell 170,996 → 144,008 bytes (15.8%). The shared split-chunk mappings add
105 bytes on the other three measured routes. Dashboard backend requests fell
19 → 14, with Auth calls 5 → 2 and profile reads 3 → 1. Timing changes are mixed;
record all three samples and medians rather than claiming a uniform speedup.

**Verification passed:** formatting, lint/types, 46 unit tests and optimized
production build; all 71 account/learner, 17 public and 11 performance cases
(145 tests including units). Full browser suites use build `lkCmYcZggpzBZQYMyiJhl`.
The byte budget exposed the locale-label dependency; the final harness separately
records Next's normal cancelled speculative prefetches. All final suites pass.
No SQL/RPC/schema/policy change, so database tests were not repeated. Raw evidence
includes fifteen cold-load samples and three isolated document request counters.
Temporary test servers are stopped. No remote CI execution is claimed.

**Limits:** no real-user p75/INP/session-window CLS, physical low-end device,
mobile Safari, hosted database/CDN or large-history/catalogue performance claim.
Lab timings are reported without flaky CI thresholds. NX-029 remains In progress
for broader measured acceptance. No production telemetry collection is added.

**Preserved preferences:** no Docker/Vector start, real account/database,
credential, schema, dependency or lockfile change; no provider call, push or
deployment. The user requested a 20–30% commit: `5de4343` committed the seven
render-session/read-integration files (7 of 26, 26.9%), using only the project Git
identity and no co-author. The next request committed the four optional-loading
and cancellation files as `2201f46` (4 of the remaining 19, 21.1%), with the same
identity and no co-author. The following request committed the three locale-label
files as `81a5de6` (3 of the remaining 15, 20%), with the same identity and no
co-author. The user then requested committing all twelve remaining files: the
performance suite, fixture counters, command/config wiring and documentation.
The final group uses the same identity, no co-author and a plain past-tense
message. No application changes or test reruns for these commit requests.
Temporary data uses the test-only backend and intercepted live calls. Raw results
stay ignored under `test-results/verification/performance/`.

**Register:** 77 rows: 51 Completed, 10 In progress, 5 Pending, 11 Deferred.
Only NX-029 tracking metadata changes; original criteria/dependencies remain.

**Next action:** owner review of the completed local performance fixes/budgets.
Broader device, hosted/large-data and real-user performance evidence remains open;
no additional implementation or environment operation has been started.

## Previous handoff — NX-028 mobile and tablet review

User authorised reviewing mobile/tablet learner flows and fixing confirmed
issues. Work began clean at `bde76a9`. See [scope and limits](MOBILE_REVIEW.md).

**Confirmed and fixed:** long identifiers/titles/URLs overflowed at all five
reviewed widths (320/390/768/1024/1440); compact sign-out was 38px high on mobile.
Two scoped CSS declarations allow learner content to wrap and give sign-out a
44px minimum height. Code examples retain their own horizontal scrolling.
No redesign or learning/accounting/authentication behavior change.

**Coverage:** eighteen new cases check populated routes at five widths, optional
long synthetic content, touch practice/notes/runner/prepared tutor, project drafts
and revision history, short-viewport Quick Search and synthetic live tutor
cancellation/recovery at 320/768. Viewport changes preserve unsaved work. Width
assertions use layout clientWidth, since mobile innerWidth can expand with
overflow. All live tutor requests are intercepted; no provider calls.

**Verification passed:** formatting, lint, types and production build; all
71 account/learner cases and 17 public cases (88 distinct cases). The full learner
run passed 69 cases; two new sign-out assertions missed the existing confirmation
query string. Corrected only those assertions, then both passed in a targeted
rerun against the same build. Do not describe this as a second full 71-case run.
The complete public suite passed seventeen cases. All eighteen new cases have
passing evidence. Visually reviewed final long-content lessons at
320/768/1024/1440 and the 390px project; fifteen final screenshots cover all five
widths. No unit/database rerun solely for CSS and browser-fixture changes.
Temporary test servers are stopped.

**Limits:** Chromium emulation does not verify physical phones/tablets, mobile
Safari, other browser engines, OS keyboards or device text scaling. Native
select-picker interaction is not exercised. NX-028 remains In progress for
broader device/browser acceptance; NX-026 assistive-tool checks remain separate.

**Preserved preferences:** Docker/Vector stay stopped; no real account/database,
credential, schema, dependency or lockfile change. The user requested a 20–30%
commit: `7bec92f` committed the two long-content fixture files (2 of 9, 22.2%)
using only the project Git identity and no co-author. The next request committed
the layout fixes and browser cases as `b6e9a62` (2 of the remaining 7, 28.6%),
with the same identity and no co-author. The user then requested committing all
five remaining documentation files as the final group, with the same identity,
no co-author and a plain past-tense message. No push or deployment; no application
changes or test reruns for these commit requests.
Screenshots and logs remain ignored under `test-results/verification/mobile/`.

**Register:** 77 rows: 51 Completed, 10 In progress, 5 Pending, 11 Deferred.
Only NX-028 tracking metadata changes; original criteria/dependencies remain.

**Next action:** owner review of the completed local fixes/coverage. Physical
device/browser acceptance remains open. The next proposed development slice is
NX-029 measured performance/asset budgets; it has not been started here.

## Previous handoff — NX-026 local accessibility review

User authorised the critical learner-flow accessibility review. Work began clean
at `6b7f2be`. See [review scope, confirmed issues and limits](ACCESSIBILITY_REVIEW.md).

**Confirmed and fixed:** twelve baseline cases exposed generic lesson titles,
Quick Search returning focus to the wrong invoker, and lost keyboard position
after practice/project/note/report/tutor actions, sign-in failure, data downloads
and retention saves. Lesson metadata now uses a descriptive title and available
version with verified data shared only within its request. A small shared helper
restores logical continuations and safe retries without stealing focus from
another task. Clear and repeated deletion failures also retain useful recovery.
Practice errors retain their alert semantics without a conflicting polite override.

**Audit coverage:** populated dashboard, courses, lessons, starting checks,
projects, reviews, report snapshots, outcomes, search and Settings at 320/768/1440.
Check axe WCAG 2 A/AA and 2.1 AA tags, labels/available contrast checks, skip links,
visible focus, overflow and reduced motion. Keyboard cases exercise actual
production components/actions, dialog wrapping/return, continuations, error
associations and retained work. Synthetic live replies/cancellation cover the
actual live-client component with every request intercepted; no provider dispatch.

**Verification passed:** formatting, lint, typecheck, final production build,
all 53 account/learning browser cases and all 17 public browser cases (70 total).
Eighteen new cases cover the confirmed regressions, keyboard continuations,
cross-task focus preservation, error associations and populated three-width
screens. A visual-review follow-up added assertions that the skip link is hidden
again after focus moves; all three matrix cases passed in a focused recheck.
The full suites and focused recheck use the same final production build. Lesson
screenshots at all three widths and the desktop project focus outline were
visually reviewed under ignored `test-results/verification/accessibility/`.
No backend/schema changes; database tests are not repeated solely for UI focus
changes. Baseline failures were reproduced before fixes; no observed contrast or
motion issue prompted CSS changes. The ordinary fixture app explicitly uses
scripted tutor mode. All temporary test servers are stopped.

**Limits:** no actual NVDA/JAWS/VoiceOver, Braille, Firefox/WebKit, physical touch
device, hosted backend or staff-editorial review. NX-026 remains In progress for
the broader assistive-technology/device acceptance; this local review is complete
with the local evidence above. Do not claim universal WCAG compliance.

**Preserved preferences:** no Docker/Vector start, existing account/database or
credential change, dependency/lockfile update, model call or deployment. Temporary
test data stays in the test-only HTTP fixture. Learning-form and account/live
focus groups were committed as `96a4116` and `6af89e9`. The final twelve-file group
includes lesson titles, dialog navigation, fixtures, browser coverage and handoff.
All groups use only the current project Git identity, with no co-author trailer.
The final message uses plain past-tense wording without a conventional prefix,
as requested. No push or remote CI run. Commit requests added no implementation
changes or test reruns; the verification above remains the evidence.

**Register:** 77 rows: 51 Completed, 10 In progress, 5 Pending, 11 Deferred.
Only NX-026 tracking metadata changes; original criteria/dependencies remain.

**Next action:** owner review of the completed local audit/fixes. Broader actual
assistive-technology/device checks remain open; do not start the real backend or
claim those checks from the local fixture evidence.

## Previous handoff — NX-039 privacy controls development (2026-10-23)

The user authorised account deletion, retention controls and truthful public
notices. They selected default tutor reply retention until explicit removal,
with 30-day/90-day alternatives and clear now, and supplied
**hello.farzain@gmail.com** as the public privacy contact. No operator name was
inferred. See [privacy controls and environment setup](PRIVACY_CONTROLS_SETUP.md).

**Implemented:** Settings retention/clear controls preserve learning evidence
and quota charges, with owner-derived private RPCs. Expired replies are removed
at guarded boundaries; a private operator prune function is ready for scheduling.
Reply tombstones prevent pending receipts or scripted retries restoring cleared
text while normal trusted usage reconciliation remains intact. Reports retain
their separately disclosed submitted copy. Export includes privacy preferences.

**Deletion:** same-origin bounded requests require the current password and
explicit DELETE confirmation. Isolated Auth password verification issues a
separate 60-second owner/action-bound HMAC proof. The database checks it before
atomically removing owned reports/audits and the Auth user with existing private
data cascades. Global usage and published editorial history remain; direct staff
links are cleared. Confirmed success clears cookies and returns to sign-in.
Failures preserve honest uncertain-outcome language. No service-role app key or
Auth hash access. The scoped local setup command is prepared but not run here.

**Public notices:** `/privacy` and `/terms` describe current data use, Auth cookies,
live/scripted guidance, retention timing, report copies, export/deletion limits,
providers, operational logs, backups and remaining operator rollout details.
They work without JavaScript and are linked from registration, homepage and
learner navigation. Contact defaults to the user-approved public email, with an
environment override; operator name remains configurable.

**Verification passed:** formatting, lint/typecheck, 46 unit tests, all 44
isolated database tests, final production build, all 35 account/learning browser
cases and all 17 public browser cases (142 tests total). The final browser runs
use the final build including the approved contact. All `npm run check` stages
passed as individual commands. New database cases prove ownership, expiry,
tombstones, accounting invariants, proof forgery/owner/action/lifetime, rollback
on a provider FK and actual cascades. Browser cases prove password rejection
preserves the current session, confirmed deletion clears cookies/rejects later
sign-in, retention persists/retries safely, and explicit confirmation/origin/
revocation/input bounds hold. The synthetic password canary is absent from the
captured application log. No-JavaScript notice checks and JavaScript-based axe
scans are separate; the initial combined test helper timed out and the corrected
full public suite passes. Three-width keyboard/reduced-motion/axe/overflow checks
pass, with all Settings screenshots visually reviewed at 320/768/1440.

**Provider limits:** real Supabase integration coverage is prepared and the
disposable CI setup is wired, but neither is claimed run. Actual migration/key
setup, Auth/PostgREST verification, provider type drift and operator scheduling
remain separate from this isolated/fixture evidence. Screenshots/results stay
ignored under `test-results/verification/privacy-controls/` and the existing
public/flows directories. No persistent test servers are left running.

**Preserved preferences:** work began clean at `6b03775`. No Docker/Vector start,
real database migration/deletion, credential or dependency/lockfile change,
provider call or hosted job. Only synthetic isolated/fixture records are removed
by tests. New RPC signatures come from the isolated migration catalog; actual
provider type drift remains separate. Foundation/database coverage and runtime
controls/notices were committed as `8d2e014` and `681ed46`. The final 22-file
group includes navigation, key setup, CI wiring, remaining tests and documentation.
All groups use only the current project Git identity, with no co-author trailer.
No push or remote CI run. These commit requests added no application changes or
test reruns; verification above remains the evidence.

**Register:** 77 rows: 51 Completed, 10 In progress, 5 Pending, 11 Deferred.
NX-039 remains In progress for actual migration/key setup, provider verification,
scheduled maintenance and deployment-specific notice/owner details. These are
not a claim that the broader project is ready for deployment.

**Next action:** owner review of the completed privacy development slice. Apply
the reviewed migration/key setup and verify the actual provider only in a later
authorised environment step; preserve the stopped-stack preference. No unrelated
feature development has been started.

## Previous handoff — NX-039 learner export slice (2026-10-22)

**Scope:** authenticated learner JSON export, the first authorised NX-039 slice.
Settings offers a download with pending/error/retry feedback and preserves
unsaved preference edits. No account deletion, retention control or public
notice implementation is claimed; the parent remains **In progress**. See
[scope, deployment and verification](PRIVACY_EXPORT_SETUP.md).

**Implementation:** same-origin POST plus server-verified Auth; private/no-store
attachment and fixed errors. The additive no-argument export RPC binds every
collection to auth.uid(), including staff, using explicit columns and a stable
single-statement snapshot. It includes saved profile/preferences, enrolments,
reads, attempts, notes, project revisions, outcomes, learner reports and selected
private tutor replies/accounting. No credentials, grading keys, staff notes,
other learners or global usage. Original history is not page-limited; exports
over 8 MiB fail completely rather than silently truncating. Only the new RPC
signature was generated from the isolated migration catalog; the live-provider
type drift check remains pending with real-provider integration.

**Verification passed:** formatting, lint, typecheck, 44 unit tests, 36 isolated
database tests and the final production build. The six new database cases cover
anonymous/missing/unknown identities, staff isolation, every collection, more
than 1,000 attempts, future-column/secret exclusion and oversized failure. The
ordinary unit invocation encountered sandbox loopback EPERM; the permission-enabled
full unit rerun passed. Heavy checks ran sequentially at low priority on two cores.

**Browser evidence:** 14 public cases pass. All 30 distinct flow cases have
passing evidence on the final build: the last full run passed 29 and exposed a
release-helper error in the new delayed-script test. After correcting only that
test helper, all five export cases passed in a focused rerun. The existing 25
flow cases passed in the full run; no further production change followed. This
is not a claim that `npm run check` was rerun as one successful command. Export
cases verify session revocation, Origin checks, ignored owner IDs, actual JSON
download bytes, failure/retry and unsaved values. A deterministic paused-chunk
regression verifies that controls wait for hydration. Keyboard, reduced motion,
axe and overflow pass at 320/768/1440, with all three screenshots visually
reviewed under ignored `test-results/verification/privacy-export/`.

**Settings recovery:** initial browser verification caught an early-input race
that appended a saved goal to newly entered text. Preference inputs and the
export button now follow the note editor's existing hydration guard; noscript
guidance explains the JavaScript requirement. The previously failing handled
action/input-retention case passes on the final build.

**Provider limit:** the real Supabase integration test is prepared but has not
been run locally. Docker/Vector remain stopped. Applying the additive migration,
real Auth/PostgREST execution and full provider-generated type drift comparison
remain separate from this offline evidence.

**Preserved preferences:** Docker/Vector stay stopped. No dependency, lockfile,
credential, hosted resource or existing database change. The additive
migration is not applied to the user's stopped Supabase stack. Work began clean
at `76a6493`. The export RPC, download endpoint and Settings interface were
committed as `7f18a33`, `f8c888f` and `68d8061`. The final eleven-file group
includes the preference hydration guard, test coverage, setup and handoff.
All groups use only the current project Git identity, with no co-author trailer.
No push or remote CI run is included. These commit requests added no application
changes or test reruns; the verification above remains the evidence.

**Current register:** 77 rows: 51 Completed, 10 In progress, 5 Pending, 11 Deferred.
Only NX-039's status/tracking metadata change; criteria/dependencies are intact.

**Next action:** review this completed local export slice. Applying the
additive migration and real Supabase checks remain separate from offline evidence;
account deletion, retention controls and public notices are later NX-039 slices.

## Previous handoff — NX-034 complete locally (2026-10-21)

**NX-034 Completed:** application requests receive generated UUIDs in internal
and response headers; caller-provided IDs are replaced. Structured stderr records
correlate unexpected request errors, backend transport/5xx failures, configuration
failures, readiness failures and non-cancelled tutor interruptions. Records omit
raw messages/stacks, URLs, headers, cookies, bodies and learner content, using
fixed/bounded metadata instead. Logging failure preserves normal recovery. The
learner boundary shows a safe digest and re-fetches on retry. Automatic dev
request/action/browser forwarding is disabled. See [observability setup and
limits](OBSERVABILITY_SETUP.md).

**Health:** GET/HEAD `/api/health` checks app routing without touching a backend.
`/api/health/ready` validates existing environment guards and probes only the
configured Auth health endpoint with a two-second deadline, no redirects and no
provider-payload parsing. Responses contain only status/request ID and are
uncached. Readiness does not claim database, storage, migrations or AI health.
Existing Auth refresh paths and page/action authorization remain intact.

**Verification passed:** formatting, lint, typecheck, 44 unit tests (six new),
30 isolated database tests, final production build, 13 public browser cases
(two new) and 25 fixture-backed account/observability/runner cases (three new).
All `npm run check` stages passed as individual commands. The final browser
suites used the final production build. New cases verify private-data omission,
digest/getter safety, failed sinks, guarded dispatch, real timeout, ID replacement,
uncached GET/HEAD, backend outage/recovery, matching response/log IDs, handled
action failure and actual error-boundary retry. The real app's captured server
log excludes the synthetic private canary in both render and action failures.
Evidence is ignored under `test-results/observability/server.log` and the
existing public/flows result directories.

**Limits and preserved preferences:** Node 24.19.0, existing Chromium 1234 via
the executable override, permission-enabled build/browser runs and sequential
low-priority test/build checks on two CPU cores. No Docker/Vector start or
configuration change, real-Supabase/hosted probe, model call, dependency upgrade,
lockfile/schema change or credential edit. Native framework/SDK/host log sources
remain separate from the allowlisted application stream; no blanket-redaction
claim. Hosted environment/log routing, alerts and incident response remain
NX-035/NX-040 work. No monitoring service or background polling is installed.

**Current register:** 77 rows (53 originals + 24 children): 51 Completed,
9 In progress, 6 Pending, 11 Deferred. Only NX-034's status/tracking metadata
change; original acceptance criteria and dependencies are preserved. Work began
clean at `7aa5778` after all runner groups were committed. Observability foundation,
request correlation, readiness and health/recovery coverage were committed as
`7c02c39`, `40fd8be`, `7504de5` and `c78eea1`. The final eight-file group records
tutor interruption logging, development log privacy settings, setup and handoff.
All groups use only the current project Git identity, with no co-author trailer.
No push, remote CI run or branch-setting change. These commit requests added no
implementation changes or test reruns; verification above remains the evidence.

**Next action:** owner review of this completed local slice. Environment
separation, required CI enforcement, monetary controls, privacy/account controls,
release operations and learner evidence remain open; no unrelated work started.

## Previous handoff — NX-016 complete locally (2026-10-20)

**NX-016 Completed:** unlocked lessons now offer a JavaScript editor seeded from
their public example, with Run/Stop, escaped console output, bounded errors and
retained code after failures. A static runner on a separate hostname starts a
fresh disposable browser worker for each run. Its own CSP blocks connections,
imports and nested workers. External timeout, cancellation, output limits and
navigation terminate execution. The runner has no save/grade API; protected
database option grading remains the authority for saved progress. See
[setup and execution boundaries](PRACTICE_RUNNER_SETUP.md).

**Verification passed:** formatting, lint, typecheck, 38 unit tests, 30 isolated
database tests, final production build, 11 public browser cases and all 22
fixture-backed account/runner cases (12 existing + 10 new). These are the stages
of `npm run check`, run as individual commands. The final browser pass used the
final production build. The new configuration/protocol cases were rechecked
after the last origin-validation change. Browser tests verify blocked HTTP and
WebSocket canaries, imports/nested workers, parent DOM/storage/cookie isolation,
loops/pending promises, cancellation/navigation cleanup, malicious messages,
output floods/truncation, escaped rendering and retained code. A real-migration
PGlite regression rejects forged passing attempts and grade-shaped submissions.
Keyboard, reduced motion, axe and overflow checks pass at 320/768/1440; all three
runner screenshots were visually reviewed. Evidence is ignored under
`test-results/flows/` and `test-results/public/`.

**Verification limits:** Node 24.19.0 and existing Chromium 1234 via
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Next's sandboxed build encountered the
previously documented TypeScript subprocess restriction; the permission-enabled
final build passed. Test/build checks used low priority and two CPU cores. No
Docker startup, real-Supabase rerun, schema migration, external model call,
hosted activation, dependency/framework upgrade or lockfile change. Existing
credentials and `.env.local` are untouched. Browser workers have no hard heap
cap; Firefox/WebKit and hosted headers remain unverified. Test servers are
closed: ports 3100, 3102, 3104 and 54331 have no listening sockets.

**Run locally:** configure the public `PRACTICE_RUNNER_ORIGIN` setting as documented
and start `npm run runner:dev`; use the app at `http://127.0.0.1:3000` with the
existing backend. The runner host defaults to `http://localhost:3104` and is not
left running. Hosted execution stays unconfigured until an unrelated HTTPS
origin and its actual CSP headers are verified. No hosted resource is provisioned.

**Current register:** 77 rows (53 originals + 24 children): 50 Completed,
9 In progress, 7 Pending, 11 Deferred. Only NX-016's status and tracking metadata
change; its original acceptance criteria/dependencies remain intact. Work began
clean at `3de6167`. The implementation groups are committed through `417fed2`;
the final eight-file group records browser coverage, fixture configuration and
the completed handoff. All groups use only the project's current Git identity,
with no co-author trailer. No push, remote CI run or branch-setting change.
NX-036 still needs required-check enforcement; the last
verified remote run on `e88b7e5` remains separate from these local changes.

**Next action:** owner review of this runner slice. Remaining tutor input,
monetary controls, independent learner evidence and Phase 6 requirements remain
open. No unrelated feature work was started.

## Requested staging split — 2026-10-20 (approximately 10%)

User requested 10% staged and a past-tense commit message. Verified an empty
index and 24 changed/new files. Staged the independent origin-validation and
bounded-protocol foundation: `modules/practice/config.ts` and
`runner/protocol.mjs`. Two of 24 files (8.3% by file count) is the closest
whole-file split to 10%; 22 files remain unstaged/untracked. Both staged modules
are self-contained. Cached whitespace validation passed. No application changes,
test rerun, commit or push for this staging-only request.

Message: `feat: added runner origin validation and bounded message protocol`.

## Requested commits — 2026-10-20

User subsequently authorised committing successive groups with past-tense
messages and only the current project Git identity. Foundation, regression,
isolated runtime, local hosting, client UI and lesson/setup groups were committed
as `c206ea0`, `1845dca`, `df77efc`, `dd0c03e`, `eecf001` and `417fed2`.
The final request includes all eight remaining files: browser regressions,
test fixture/configuration, README/index, decisions, progress and feature status.
No implementation changes or test reruns for these commit requests; prior
verification is recorded above. No push or remote setting change.

## Previous handoff — remote CI passed; required-check enforcement open (2026-10-19)

**NX-022.4 Completed (2026-10-17):** restored local dependencies using npm ci and the existing unchanged lockfile. Extended16-case streaming collection returned 16 live replies; individual AI-assisted editorial review found 15 Pass / 1 Needs changes. Preserved all actual replies and notes. Fixed only the exact canonical uncertainty reply's missing next-step message in both adapters; model/system prompt/prompt version unchanged. One intentional targeted live recheck passed with versioned output-policy metadata. This is 15 original passes+one corrected/rechecked case, not a second full matrix or independent human review. See [evaluation guide and reports](../tests/evaluations/README.md).

**Verification passed:** final formatting/lint/typecheck, 36 unit tests, 30 isolated DB tests, production build, 11 public browser cases and 12 fixture-backed account flows. Browser suites ran before the narrow text-only fix; affected adapters were then rechecked with unit tests and final build. Full npm check initially stopped at missing default Chromium 1243; existing Chromium 1234 via the documented executable override passed the browser suites. No dependency/framework/browser download or lockfile change. Logs are ignored under `test-results/resumed-verification/`.

**NX-036 remains In progress:** verified [GitHub run `39126051992`](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/39126051992) on current HEAD `e88b7e54ca475c7d07e5d8244fd22fa9ecdb7c57`. Both jobs and every integration step passed, including setup, pgTAP, type drift, build, integration tests and cleanup. Exact-SHA check runs also report success. The earlier failure on `402e6a5` is historical; its cause is still unknown, but no current CI fix is needed. Required-check enforcement remains unverified: protection API requires authentication; empty public rules/ruleset lists do not establish classic protection settings. Automatic approval review rejected checking existing Git credentials because credential-source access was not specifically authorised. No credential lookup executed or remote setting changed. See [CI documentation](CI.md).

**Docker preference preserved:** Docker is currently off, engine service/socket startup disabled and no SysV start links. Vector remains stopped with restart policy no; do not restart it, re-enable boot startup, or recreate it through a routine Supabase start. Local Docker integration/type-drift checks were not repeated in this resume. Existing data/volumes and credentials are untouched. The malformed underlying logs are not repaired. Heavy checks ran sequentially at low priority on two CPU cores; no new persistent app/test server is intended to remain running.

**Current register:** 77 rows (53 originals + 24 children): 49 Completed, 9 In progress, 8 Pending, 11 Deferred. Counts include parent/child tasks and are not an effort percentage. The previous staging groups are committed through `e88b7e5`, including workflow annotations in `b4b2754`. The index and working tree were clean at this review's start. This review updates only CI documentation, this handoff and NX-036 tracking metadata; no application/workflow change, local test rerun, Docker start, commit or push.

**Next action:** obtain approval to use existing GitHub authentication with admin access, or have the owner configure the two documented required checks in GitHub; preserve all existing rules and verify enforcement. Remote CI already passes on the current SHA. Parent AI tasks retain their broader human/pilot, submitted-reasoning, hosted, monetary and additional-provider requirements. NX-016 and the remaining Phase 6 readiness work are still open. No unrelated feature work.

## Prior implementation checkpoint

The last application slice is **NX-022.3 Completed**: fixed streaming outcomes,
loopback cancellation/deadline checks, receipt/database races and inert adversarial
browser output. All previous application work is committed through `a291ca3`;
`9c07f96` committed the database/script group and `a291ca3` committed the remaining
browser/evaluation documentation group. The previous staging split is resolved.

The feature register preserves **53 original features and 23 child tasks**:
25 original features Completed, 9 In progress, 8 Pending and 11 Deferred; all
23 child tasks Completed. The combined 48 Completed count is not an effort or
release-readiness percentage. No original acceptance criteria were removed.

## Repository and CI batch — complete locally

The user authorised bringing the plan, setup documentation and CI into the app
repository, fixing links and updating the handoff. This batch imports the build
guide, feature register, decisions and setup guides. Historical evidence is kept
in an ignored local ZIP as described below.
The old progress record is retained as
[historical context](PROGRESS_ARCHIVE_2026-10-14.md).

The GitHub Actions workflow now lives at `.github/workflows/ci.yml`, uses root
paths and immutable action commits, and keeps the code checks and local-Supabase
jobs. Ephemeral receipt setup enables the token-accounting RPC test in fresh CI.
New browser evidence stays in ignored `test-results/verification/` instead of the
parent workspace or dated documentation archive. See [CI details](CI.md).

Application behaviour, dependencies, schema and existing local credentials are
unchanged. The user subsequently authorised the 50% staging split recorded below.
No commit, push, deployment, hosted resource or paid service is authorised.

## Repository/CI verification — 2026-10-15

Post-change verification passed:

- `npm run check` end to end: formatting, lint, TypeScript, 31 unit tests,
  30 isolated database tests, production build, 11 public browser tests and
  12 fixture-backed account flows.
- `npm run db:test:local`: 35 PostgreSQL assertions. `npm run db:types:check`:
  generated types match the running local schema.
- `TUTOR_MODE=scripted LIVE_TUTOR_SMOKE=false npm run test:integration`:
  11 passed, with the real-provider smoke and live-only stream UI case
  intentionally skipped.
- `TUTOR_MODE=live LIVE_TUTOR_SMOKE=false npm run test:integration -- token-usage.spec.ts tutor-stream.spec.ts`:
  2 passed with synthetic responses and local accounting RPCs.
- At that checkpoint, all 139 local Markdown links resolved within the repository. Workflow YAML,
  root paths, immutable action pins and shell syntax were checked. All 76
  feature IDs, acceptance criteria, dependencies and statuses are preserved;
  only NX-036 tracking metadata changed.
- All 54 imported screenshots are byte-identical to their source, and all six
  JSON records retain their data. The 83-file verification archive remained
  unchanged during browser runs; 34 new evidence files went to ignored
  `test-results/verification/`.

Verification used Node 24.19.0 and the existing Chromium executable override.
Loopback servers, Docker, Chromium and build subprocesses required execution
permission outside the coding sandbox. The existing local database and receipt
setup were used without reset or credential changes. No external AI calls were
made. GitHub-hosted execution and its fresh-runner bootstrap remain unverified;
no hosted disconnect, new real-model or independent human evaluation is claimed.

## Local evidence archive — 2026-10-16

The user requested excluding the 83 large historical evidence files from the Git
changes while preserving them locally. They are now stored in ignored
`.local-archive/verification-2026-10-15.zip`, with a companion SHA-256 checksum.
Every ZIP member was compared with its source before the loose imported copy was
removed. All 83 files are preserved byte for byte; parent-workspace originals
also remain. Already compressed PNGs are stored directly, and text is compressed.

Both `.local-archive/` and restored `docs/verification/` are ignored, so unpacking
the ZIP for local browsing will not add those files back to Git status.
[Archive access and restoration](README.md#historical-evidence) are documented.
Committed guides link to these instructions rather than optional local files;
feature evidence notes identify the original paths inside the ZIP. Acceptance
criteria, task IDs, dependencies and statuses are unchanged.

Git status now contains **32 files: 18 new and 14 modified**. This is the 31-file
documentation/CI batch plus the required `.gitignore` change. At the archive-cleanup checkpoint no files were staged, committed or pushed.
The later staging request is recorded below. Archive integrity, ignore behaviour, fresh-clone links and
formatting are being checked for this cleanup; application tests were not rerun
for a documentation/archive-only change.

## Remaining work and next action

Review this completed repository/CI batch. After the user commits and pushes the
reviewed changes, verify both GitHub jobs and configure required checks where
supported; NX-036 remains In progress. The next proposed implementation slice is
**NX-022**: broaden fixed real-model ambiguity, adversarial and language
evaluations with version metadata and explicit response review. This batch does
not authorise external model calls or expand paid/hosted operation.

Keep the remaining requirements visible: submitted-student-reasoning input,
independent human/learner evidence, hosted streaming verification, monetary
controls, other provider adapters, NX-016 isolated JavaScript execution, and
Phase 6 accessibility/performance, privacy/account recovery/export/deletion,
monitoring, environment separation, release/rollback, backups, incident response,
hosting budget and learner pilot. Deferred expansion remains deferred.

Historical stop instructions, telemetry and staging requests in archived handoffs
describe prior sessions. They are not current instructions to stop or preserve a
staging split that has already been committed.

## Requested staging split — 2026-10-16 (50%)

User requested half the current work staged and separate commit messages. Verified
an empty index at `a291ca3` with 32 changed/new files. Staged exactly **16 of 32
files (50% by file count)**: the new repository planning, tracking and setup
documents directly under `docs/`. The other 16 files remain unstaged: workflow,
local Docker setup script, ignore/agent/README and existing-guide updates, and
browser evidence-path changes. Imported planning documents retain all task IDs,
acceptance criteria and statuses. Historical evidence archives remain ignored.

Selected documents were screened for actual local private credentials and their
Base64 forms plus common credential patterns; no findings. The default whitespace
check flagged the imported CSV's CRLF line endings. A CRLF-aware staged whitespace
check passed; CSV bytes and task contents were preserved. No implementation changes, tests rerun, commit or push for this staging
request. The two groups are portions of one documentation/CI batch.

Staged message: `docs: bring project plans and setup guides into the repository`.
Unstaged message: `ci: add repository checks and keep browser evidence local`.

## CPU investigation — 2026-10-17

User steered interrupted verification to investigating high CPU. Host sampling found Docker daemon PID 2608 at about 229% (100% = one core), while project containers were near 0%; no leftover project build/test process was visible. Docker repeatedly reports null-byte JSON log parsing errors for database, realtime and analytics containers. Vector's docker-log source also reports repeated timestamp parsing failures (about 64–66 suppressed errors per ten seconds). The daemon log is about 150 MB. This indicates a likely malformed-log/collector retry problem; causal CPU reduction has not been tested. All running containers report healthy where health checks exist. No service restart, container stop, log deletion, DB reset or heavy check was performed during the investigation. Next diagnostic option is briefly pausing only the log collector and remeasuring CPU, with user instruction; preserve the database and its volumes. Extended-evaluation/CI handoff remains unfinished after interruptions; do not claim an interrupted build passed.

## CPU mitigation and startup request — 2026-10-17

User authorised stopping the log collector and disabling unnecessary Docker boot startup. Stopped only `supabase_vector_nexus_learning_platform` using Docker stop; its existing unless-stopped policy leaves it stopped until explicitly restarted. Docker CPU dropped from about 229% to 0.3% in a three-second host sample, confirming the log-collection path caused the high load. Database/other containers and volumes were preserved; local log ingestion is unavailable while Vector is stopped. Do not silently restart Vector on future verification. Malformed underlying container log files have not been deleted or repaired.

Host uses SysV init (`/sbin/init` resolves to sysvinit), with systemd enablement links also present. Attempted `sudo -n update-rc.d docker disable` and `sudo -n systemctl disable docker.service docker.socket`; both refused because administrator password authentication is required. Startup disablement was NOT applied. User must run these commands in their own terminal or provide an authenticated administrator execution path; never request their password in chat. Docker remains running for the local database. Manual engine control is `sudo service docker start` / `sudo service docker stop`. Extended evaluation/CI work remains interrupted; do not start heavy checks during CPU investigation.

## Docker startup disabled by user — 2026-10-17

User ran the requested administrator commands in their own terminal. Read-only verification now reports both `docker.service` and `docker.socket` disabled. SysV Docker automatic start links are absent; remaining K links are stop entries. The insserv messages describe intentional deviation from package startup defaults, not a failure. This resolves the earlier administrator-authentication blocker for startup disablement. Existing daemon may continue until stopped manually; manual start remains `sudo service docker start`. Keep Vector stopped pending log repair and do not re-enable engine boot startup without instruction.

## Conservative Docker cleanup — 2026-10-17

User authorised cleaning unnecessary Docker data. Audited images, containers, volumes, networks and build cache. Removed only unused `hello-world:latest` (image e2ac70e7319a), approximately 10 KB of image content. No dangling images or build cache existed. Retained the currently unreferenced `supabase/pg_prove:3.36` image because local database tests need it. Preserved all 12 project containers, 3 volumes, Supabase images and the project network; no container/volume/system prune or log truncation. Docker now has 13 images; database remains running/healthy and both startup units remain disabled. Vector stays stopped. Large malformed container/daemon logs were not deleted or repaired; cleanup did not purport to fix their contents. Most roughly 5.84 GB image storage is the existing Supabase stack, not disposable application cache.

## Log collector automatic restart disabled — 2026-10-17

User explicitly requested preventing the CPU-heavy log collector from starting at reboot. Updated only `supabase_vector_nexus_learning_platform` restart policy from `unless-stopped` to `no`. Verified `Running=false`, `Restart=no`; Docker service and socket are still disabled. Existing collector cannot be restarted by Docker's restart policy on reboot/daemon restart. Explicit starts or Supabase container recreation can override this, so future agents must preserve the user's preference, avoid starting Vector and recheck its policy after any authorised recreation. No database, volume, app configuration or credential changes.

## Verification resumed — 2026-10-17

User authorised resuming the interrupted verification/CI work. Restored missing node_modules with npm ci from the existing lockfile (SHA256 e8a397aade21a74eecde1c53626c45ab8a50d09591d7759ed95ff039e9a14cf7 unchanged). No package/framework upgrade or environment/credential changes. Heavy commands run sequentially at nice priority 10 on CPU cores 0,1. Docker is currently stopped; its service/socket remain disabled. Collector has not been restarted.

Fresh format/lint/type, 35 unit tests, 30 isolated DB tests and production build pass. The full check chain stopped at public browsers because default Chromium revision1243 is absent; using existing Chromium 1234 via PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH passed all 11 public browser cases. Account flows and new bounded provider collection are still pending at this checkpoint. Logs are under ignored test-results/resumed-verification/. Do not turn pending runs into completion claims.

Public GitHub status still shows the same failed run `38935858138` on `402e6a5`. No newer run is available. Existing noninteractive Git/VS Code authentication also could not retrieve credentials; no secrets were displayed or saved. Await the user-provided failing log section or authenticated admin access. No branch protection changed, no push or commit.

## Final handoff checkpoint — 2026-10-17

NX-022.4 acceptance verified with the archived initial 16-case review and corrected
one-case live recheck. Final source/browser screening checked 235 files against
actual provider/signing keys and Base64 forms with no findings; 15 current local
documentation links resolve. Lockfile SHA remains unchanged. Final affected
checks pass 36 unit tests plus lint/types/build; 30 DB tests and 11 public / 12 account-flow
cases also passed in this resume, with the documented cached browser override.
The source tree has 18 changed/new files, all unstaged; no commit, push or deployed
resource. Detailed local evidence: ignored
`test-results/resumed-verification/verification.json`. Next required input is the
remote integration failure log; no root cause or protection setting was guessed.

Five-hour usage checkpoint: 41.0% used at 2026-10-17T14:57:46.287Z. Stop at 90% used (10% remaining); refresh this value on resume.
