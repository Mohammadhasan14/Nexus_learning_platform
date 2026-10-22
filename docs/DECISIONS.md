# Decisions

This dated log preserves earlier implementation and staging decisions. The latest
entry and [current progress](PROGRESS.md) describe the active repository layout;
older references to parent-workspace files are historical.

## 2026-10-22 — Owner-only learner data export (NX-039, first slice)

User authorised the proposed authenticated learner data export. Add one explicit
download to Settings and keep account deletion, retention controls and public
notices as separate remaining work. Preserve preference edits and offer retry
without navigating away. The JSON file contains saved private learner records;
explain its contents and sensitivity in the interface.

Production browser verification exposed a Settings hydration race: an early
goal edit acquired the previous saved text. Match the note editor's existing
readiness guard for preference inputs and the download button, with noscript
guidance. Add a regression that holds client chunks to verify editing starts
only when ready and export leaves the exact unsaved goal intact.

Use an additive, stable, no-argument database RPC for a single statement snapshot,
including selected private tutor records unavailable through public table reads.
Derive ownership only from auth.uid(), filter every collection even for staff,
use explicit columns/empty search path, and revoke PUBLIC/anon execution. No
privileged application key, arbitrary owner selector, schema reset or wider RLS
grant. Export original records rather than silently truncating to UI/Data API
history limits. Fail the entire synchronous export over 8 MiB; no background
storage/job or delivery infrastructure is introduced.

Require verified Auth and same-origin POST at the application boundary, return
private/no-store JSON attachments, and exclude auth secrets, grading keys,
staff notes, global usage and other learners. Reuse migration/browser fixtures
and prepare real Supabase integration coverage. Generate only the new RPC type
from its isolated migration catalog; live provider drift verification remains
separate. Keep Docker/Vector stopped and credentials/dependencies unchanged.
See [export scope and verification](PRIVACY_EXPORT_SETUP.md).

## 2026-10-21 — Request correlation, redacted application logs and health (NX-034)

User authorised the proposed NX-034 slice. Generate request UUIDs in the proxy,
replace external IDs and preserve the same ID across internal request headers,
response headers and cookie refresh. Match application routes while excluding
Next assets/favicon; keep Auth refresh on its existing paths so public/health
requests do not gain session/provider work. Authorization remains at existing
page/action boundaries.

Use the installed Next.js request-error hook and the shared backend fetch
boundary to emit a fixed structured stderr record. Allow only event/method/phase,
request UUID, timestamp, bounded duration/status and numeric framework digest.
Do not serialize raw errors, stacks, URLs, query strings, headers, bodies or
learner content. Logging failure cannot replace the primary error or break
recovery. The learner boundary displays a validated digest and uses Next 16.3's
retry callback to re-fetch after transient failures. Disable automatic dev
request/action/browser log forwarding. Native framework/SDK/host logs remain
separate; no global console patch or blanket-redaction claim.

Separate unconditional routing liveness from guarded, read-only Auth readiness.
Health responses contain only status and a generated ID; require no session and
use no-store/HEAD behavior. The fixed Auth health probe has a two-second deadline,
rejects redirects and discards its payload without parsing. Readiness does not
claim database/migration/storage/AI health. Provision no collector, alert,
credential, hosted environment, migration or dependency. Keep Docker/Vector off.
NX-035 environment separation and NX-040 operational alerting remain open.
See [observability setup and limits](OBSERVABILITY_SETUP.md).

## 2026-10-20 — Isolated JavaScript practice (NX-016)

User authorised the proposed NX-016 slice. Keep option-based database grading as
the authority for saved progress. Add a temporary lesson-example editor without
changing exercise types, grading keys, schema, projects, AI or learning evidence.

Serve the small static runner outside the application on a dedicated origin;
the development/CI host binds only to loopback. Require a different hostname,
HTTPS outside local development, and a sandboxed frame with no parent access.
Only its disposable worker compiles learner code. Apply a distinct worker CSP
that denies connections, imported scripts and nested workers. The frame CSP
allows only trusted bootstrap scripts and its worker; do not enable string
compilation in the app or frame. Hosted activation requires an unrelated domain
and verification of the actual response headers; no hosting is provisioned.

Use a one-run MessageChannel with source/origin, protocol, request-ID and bounded
payload validation. Results remain untrusted and have no save/grade API. Terminate
externally after 1.5 seconds, cap output and discard the worker/frame after each
run or navigation. Code remains available after failures. Browser workers do not
provide hard memory limits; no authoritative arbitrary-code grading is claimed.

Reuse existing Chromium, fixture-backed account flows and isolated migration
tests. The fixture's optional synthetic lesson is test-only, with no application
auth bypass. Keep Docker and its collector stopped; no credentials, dependency,
lockfile, framework, hosted resource or paid provider changes. See
[runner setup and boundaries](PRACTICE_RUNNER_SETUP.md) for configuration and
browser/hosted verification limits.

## 2026-09-19 — Existing app and canonical register

- Keep `nexus_learning_platform/`, its root `app/` router and installed Next 16.3.5 / React 19.2.8 / Tailwind 4. No framework upgrade or second app. Shared UI lives in `components/`; future business modules can use `modules/` alongside it.
- Root `docs/features.csv` is canonical. All 53 spreadsheet rows were parsed and compared field-for-field with the ZIP CSV: identical. Original phase/status and all planning fields are retained. Neither Excel nor Google Sheets syncs with this file; no integration was established. Future spreadsheet changes require a reviewed manual import, or a CSV-generated read-only snapshot.
- Status mapping: Planned and Ready → Pending; Backlog → Deferred (post-beta scope retained); Done → Completed only with verified evidence; In progress, In review, Blocked, Deferred unchanged. Original input contains only Planned and Backlog.
- Parent IDs retain original acceptance criteria. `.1` children isolate Phase 1 checks without completing cross-platform parent tasks.

## 2026-09-19 — Public preview boundary

- Homepage uses server components with one small client navigation component. Native disclosure controls expose course previews. No fake sign-up, fake user statistics, executed code, live tutor, persistence or payment flow.
- Navigation points to actual homepage sections; account availability explicitly identifies Phase 2, lessons Phase 3, AI Phase 4 and projects Phase 5.
- Preserve midnight navy/violet/cyan. CSS decorations replace heavy 3D media; all three supplied images were reviewed. No reference screenshot is shipped as UI. Finite entrance motion needs no ongoing offscreen animation loop; reduced motion removes it.
- Semantic CSS tokens include an alternate light surface theme for reuse; public homepage deliberately remains midnight. System fonts remove the baseline Google font fetch failure and external font dependency.
- CI belongs at repository root with the app as working directory. No remote exists and no branch protection or remotely passing CI is claimed. No deployment workflow is added.

## 2026-09-20 — Build fallback and verification findings

- `next build --webpack` is the supported production build path for this workspace: Turbopack's PostCSS worker failed binding its internal port even on the permission-enabled retry. No framework or runtime dependency upgrade was needed. Development retains the default bundler; use `npm run dev -- --webpack` if the same local restriction occurs.
- Initial browser checks caught horizontal overflow from transformed hero rings. Contain only the decorative layer, preserving readable content and focus outlines. Explicit heading weights restore the supplied concept's typographic hierarchy after Tailwind's reset.
- During resumed work, the baseline files appeared staged by an external workspace/user operation. This agent has not staged, committed, reset or pushed anything; preserve that index state.

## 2026-09-20 — Phase 2 identity and preferences

- Phase 2 explicitly authorised. Preserve the existing staged Phase 1 work; no commit, push or hosting changes.
- Add Supabase SSR and validation dependencies without upgrading Next/React. Clients are request-scoped and server-only; no browser SDK is needed yet. HttpOnly, SameSite=Lax cookies are environment-named; Secure applies to hosted HTTPS. Proxy refreshes sessions; every protected page/action calls verified `getUser()` again. No shared caching of learner data.
- Implement only `profiles` and `staff_roles`. Auth insert trigger provisions profiles using trusted user IDs, ignoring editable user metadata. RLS and column grants protect private ownership, timestamps and staff assignment. Staff have no blanket access to learner profiles. Primary keys cover current owner lookups; future indexes arrive with query requirements.
- Onboarding stores display name, goal, daily minutes, English locale variant and IANA timezone. SQL derives completion/update timestamps. Preferences use last-write-wins. No learning progress, enrolment or mastered-skill claims are derived from preferences.
- Dashboard follows the supplied navy/violet/cyan concept using real components and saved preferences. Lessons, reviews, projects and AI remain explicit empty/future states. Parent NX-004 remains partial until actual learning actions are available.
- Use exact allowlisted post-login paths. Confirmation accepts only signup tokens and redirects with a fixed relative Location, preserving the request origin and cookie host. Provider Site URL owns email links; arbitrary Host/next inputs cannot select external destinations.
- Require explicit environment labels and project identity checks. Local/test are loopback-only; hosted previews must use a separate staging project. Application code rejects privileged API keys. Actual hosted resource separation is not yet provisioned, so NX-035 is not complete.

## 2026-09-20 — Verification boundary without Docker

- Real Supabase startup failed because neither Docker nor Podman exists here. Do not replace the planned backend or introduce an application auth bypass.
- PGlite is a development-only PostgreSQL engine used to execute migrations, constraints, GRANT/RLS tests and schema-type introspection. Its auth schema/function are clearly identified shims; this does not verify Supabase Auth/PostgREST compatibility.
- Separate browser suites cover no-backend safety and SSR account flows against a loopback HTTP double under tests/support. That fixture is never imported or activated by application code. Test users and credentials are synthetic.
- Prepare actual local pgTAP and real-provider browser checks plus an isolated CI job. They require Docker and fail when unavailable; no local or remote execution of that stack is claimed. Provider verification must precede completion of the affected parent tasks.
- Consulted installed Next authentication/proxy/cookies guides and official Supabase SSR, RLS and migration documentation; see PHASE_2_SETUP.md for links and exact commands.

## 2026-09-21 — Local Docker installation choice

User selected local Docker rather than hosted Supabase. The host uses SysVinit; use Debian 13 docker.io/docker-cli from existing Debian repositories, whose package includes /etc/init.d/docker. No conflicting Docker packages were found. Administrator access needs an interactive local password, so prepared a reviewable installer for the user to execute. Docker-group membership provides root-equivalent daemon access and is stated in the script. Sources: https://packages.debian.org/trixie/docker.io and https://packages.debian.org/trixie/amd64/docker.io/filelist.

## 2026-09-22 — Real local provider accepted

- Keep the user-selected Docker/Supabase development setup; no hosted project was provisioned. Docker group access via `sg docker` handled the current session without root-running npm.
- Retain the deterministic migration-catalog type generator: strict type equality against actual Supabase-generated public types passed. Schema expansion must continue both drift checks and real-provider comparison.
- Real integration tests use temporary synthetic users and local Mailpit. The configured email origin remains development port 3000; tests assert it and open its token/path on isolated app port 3103. No service-role credential is written to the app environment.
- Phase 2 acceptance covers current profiles/auth/preferences. Dashboard learning actions and hosted environment provisioning remain explicitly incomplete; no Phase 3 implementation was begun.

## 2026-09-22 — Phase 3 local learning slice

- User authorised Phase 3 and requested stopping when five-hour usage reaches 85%. Fresh local token-count rate-limit events are available; poll their 300-minute window between work batches, preserving a checkpoint before the threshold. Do not confuse this percentage with elapsed wall-clock time.
- Additive migrations preserve existing local users. Course and exercise identifiers encode immutable versions; operator changes require new versions. Preview content is clearly labelled until human editorial approval; no fabricated review evidence.
- Database RPCs derive learner identity from auth.uid(), enforce enrolment/prerequisites, validate option IDs and grade against keys in an unexposed schema. Attempts cannot be client-written. A transaction-scoped learner advisory lock and unique request key serialize idempotent retries; conflicting payload reuse fails.
- Reading acknowledgements and passing practice evidence are different records. A security-invoker aggregate view preserves evidence across recent-history pagination and uses caller RLS. Diagnostic answers are stored separately by exercise kind and never unlock practice prerequisites.
- With Docker now available, generate database types directly from local Supabase, including real relationships, views and RPC signatures. Move provider type drift verification to the Docker CI job; `npm run check` retains all Docker-independent checks. No silent skip or hosted generation.
- Native radio exercises use bounded options; no arbitrary submitted code is executed. AI remains Phase 4, with a clear explanatory area rather than a fake tutor.

## 2026-09-23 — Phase 3 resumed verification

- Playwright configurations now use separate public/flows/integration output directories. The previous revoked-identity failure was an ENOENT trace-artifact collision between concurrent runners, not a demonstrated auth failure; its isolated rerun passed.
- Starting-check evidence informs the explanation for the earliest unpassed practice lesson. Diagnostic success never bypasses practice prerequisites. Dashboard recommendations use the same pure rules as the catalogue. Reading and passing counters remain separate.
- Exercise forms prevent the native reset after a completed server action, preserving the selected answer on a rejected save. A client action wrapper catches transport failures; retry uses the original idempotency key. A deliberate new attempt gets a new key, and stale success feedback is hidden.
- Content received documented technical review and executable checks, with human editorial sign-off still pending. Keep preview labels and NX-008 In review. The review packet records the narrow curriculum and option-position bias rather than overstating assessment quality.

## 2026-09-24 — Delegated editorial review and stable v2 release

- The user explicitly asked to finish Phase 3 course-review work. The original tracker requires editorial review, not specifically human approval. The earlier human-sign-off gate was an assistant-added interpretation; replace it with the actually delegated, documented AI-assisted review, identifying the reviewer and limitations. Do not fabricate a human approval or learner-validation study.
- Publish reviewed v2 to the local catalogue using new course/lesson/exercise IDs. V1 remains unchanged and resumable for its enrolled users. New discovery shows current versions; enrolling in v2 starts separate evidence and never carries prerequisite credit from v1.
- `supersedes_id` records a version successor without relying on matching display titles. A unique successor index and non-self-reference constraint catch simple metadata mistakes. Content edits remain operator-managed migrations, not learner writes.
- Dashboard resume follows the latest enrolment timestamp (with a stable tie-breaker). The explicit version label, evidence and older-course resume remain available in the catalogue.

## 2026-09-25 — Phase 4 scripted foundation and accounting boundary

- User authorised Phase 4 work. Preserve the existing app and committed Phase 3 versions. No new dependency, public deployment, commit or push.
- Start with the backlog's labelled scripted tutor. Four bounded intents support reviewed v2 lessons; the adapter never receives exercises, options, grading keys, account profiles or chat history. Source links come from validated course/lesson identity. No free-form reasoning assessment is implied.
- Keep live AI disabled while provider and spending decisions are unresolved. Application configuration only recognises explicit `TUTOR_MODE=scripted`; there is no accidental live path.
- Store demo usage in a private schema. A single short PostgreSQL transaction advisory lock protects global and per-user daily checks together. It is never held over provider I/O. Idempotency is scoped to the authenticated learner and binds lesson/intent/reserved units.
- Scripted work has a fixed one-unit cost. Private reservation/reconciliation primitives test conservative unknown usage, release of measured unused units and original-day accounting. They are not yet live monetary controls; NX-021 retains that remaining scope.
- Root planning documents remain outside the app Git repository. CI already invokes the expanded unit/database suites and integration directory, but remote CI has not been run. Live-model, operational retention, streaming and provider-budget acceptance require later verification.

## 2026-09-25 — Live AI explicitly disabled

User answered the Phase 4 scope question: “Keep live AI disabled for now”. The verified scripted tutor is the current delivery boundary. Do not activate a provider or request credentials/budgets until live integration is requested. NX-020 remains Pending; live portions of NX-021/NX-022 remain recorded as incomplete, not discarded or completed.

## 2026-09-26 — Tutor quota identity cleanup

Continuing authorised local Phase 4 work with live AI disabled. A generated owner column derives from each private bucket key and references auth.users with ON DELETE CASCADE; the global aggregate has no owner. The additive migration removes previously orphaned private buckets but leaves global usage untouched, including uncertain reservations. Account deletion cannot reclaim global allowance. No account-deletion UI, hosted lifecycle service or broader Phase 5 work is introduced.

## 2026-09-26 — Phase 5 projects and review scheduling

- User explicitly authorised the next slice after committing Phase 4 (`986f106`, `9e5a3d2`). Deliver NX-018/NX-023 and connect real dashboard actions; preserve other Phase 5 backlog and the disabled-live-AI decision.
- Derive reminders from the latest practice attempt per exercise using a security-invoker view under existing RLS. `calendar-review-v1` schedules one local calendar day after an incorrect attempt and three after a correct attempt. Profile timezone edits recalculate dates; no daily job or new mastery claims.
- Projects store private immutable revisions against a versioned rubric. A learner-scoped transaction lock protects sequential revisions. Request identity binds project, base revision and work; stale bases fail instead of silently replacing a newer revision.
- Start with a study-planner rubric spanning the three reviewed JavaScript topics. Learners may save partial milestones. Feedback is explicitly an automated completeness prompt based on trimmed text length, not correctness grading or AI review. Submitted code is escaped text and never executed. NX-016 remains a separate isolated-runner task.
- The application uses verified sessions and RPCs derive ownership from auth.uid(). The catalogue is authenticated-readable; submissions are owner-only and cascade on account deletion. Learners cannot write rubric or feedback records directly. No schema reset, service-role application client, new dependency or framework upgrade.

## 2026-09-27 — Staff publishing, audit and versioned reports

- User authorised NX-025/NX-053 after committing projects/reviews (`3c86a22`, `75aebb1`). Keep live AI disabled and preserve all existing content/evidence. Real staff accounts remain operator-provisioned; tests alone create temporary editor identities.
- Separate staff-only lesson-text drafts from learner-readable published tables. Every RPC checks trusted staff_roles, fixed search paths and current revision. Draft edits invalidate review; publishing atomically clones lessons, copied exercises/private keys and associated projects, marks a single successor and appends audit events. Existing content and evidence are unchanged. Question/key editing is intentionally outside this lesson-text editor and remains migration-managed.
- Protect drafts/audit with RLS and read-only application grants. Private grading material is available only through an explicitly staff-gated review RPC. Course labels distinguish the prior AI-assisted review from later staff review; no fabricated reviewer identity.
- Preserve report context at submission, with owner-or-staff visibility and append-only triage audit. Staff notes are visible to the reporter. Daily caps and owner-scoped idempotency limit duplicates. Report account references become null on deletion; broader free-text retention/erasure policy remains pre-beta work.
- Supersede the earlier no-response-storage scripted implementation: immutable script-release rows and private request receipts now preserve the exact rendered reply for reports. The app renders the database receipt rather than reconstructing a quote from client input. Existing unit adapter cases are compared against all stored scripts; no live provider or free-form chat was added.

## 2026-09-28 — Private notes and authorised search

- NX-024 notes are plain text, one current note per owner and immutable lesson version, limited to 10,000 characters. Saving empty text clears content but preserves the revision for conflict detection. No note history, autosave, cross-version copying or tutor ingestion is implied.
- Owner-only SELECT RLS; normal app clients cannot directly write notes. The save RPC derives auth.uid(), checks lesson prerequisites, serialises writes, rejects stale revisions and recognises the latest identical retry. Account deletion cascades notes. No staff read exception.
- NX-032 search uses a bounded case-insensitive literal substring query over lesson title, objective, body and course title. SQL filters enrolment/prerequisites before returning lesson destinations. Notes, private keys and drafts are excluded. Enrolled older versions remain discoverable; results identify the course version.
- Up to 20 lesson matches are shown, with an extra-row signal prompting a narrower query. This is a small-catalogue beta implementation, not full-text/semantic indexing. Actions come from a server-owned allowlist; Editorial requires a current trusted staff role.
- A GET search page provides a dedicated destination with the query in its URL. Browser verification found the existing streamed learner layout needs JavaScript after navigation, so no JavaScript-free workspace is promised. Quick search uses a native modal dialog and Ctrl/Cmd+K, explicit submit, Tab/Enter navigation, Escape dismissal and focus return. No third-party command-menu library or analytics query storage was added. Search failures and note-save failures retain user input; stale responses do not replace a newer query.

- Verification refinements: disable note editing until hydration completes to protect early input, and explicitly wrap Tab/Shift+Tab between modal controls while preserving Escape and browser shortcuts. Native dialog still provides backdrop and outside-content inertness.

## 2026-09-30 — Outcome event policy v1

- NX-033 captures forward-only metadata after a trusted attempt insert, in the same transaction. Existing submit idempotency and attempt identity prevent duplicate events. No analytics vendor or client-supplied success/timing event is introduced.
- Events contain owner, attempt/exercise/lesson/course IDs, kind, correctness, occurrence time, prior task/lesson attempt counts, earlier tutor-request presence, previous correctness, elapsed seconds and policy version. No raw answer, feedback, code, note, prompt or chat payload is copied. Owner-only RLS applies even to staff; account deletion cascades records.
- Initial-check proxy: practice with zero prior lesson attempts and no recorded tutor request. Diagnostic feedback excludes a later practice from this proxy. Outside help/prior exposure remain unknown; no verified independent or unseen-task success claim.
- Delayed-check measure: practice at least 86,400 elapsed seconds after the preceding correct attempt on the same exercise, excluding recorded tutor requests. Previous incorrect attempts and early retries are excluded. This is repeated-task performance, not validated retention/transfer. It is distinct from timezone/calendar review scheduling.
- Tutor presence is conservative: any existing request for that lesson at capture time counts, including reserved/uncertain requests. In-flight or external assistance is not observable. This is metadata, not chat collection.
- Do not backfill fabricated events. Existing attempts may supply prior-exposure counts/baselines for a new event. Summaries aggregate all owner events by course version; the evidence list shows the latest 20. No project completeness score or streak becomes a mastery metric. New comparable/unseen assessment content and broader cohort analytics require separate scope.

## 2026-09-30 — Local Gemini free-tier pilot

The user supplied `LLM_PROVIDER`, `LLM_MODEL` and `LLM_API_KEY` and explicitly confirmed a Free Tier project with paid billing disabled. This supersedes the disabled-live-AI decision only for local testing. Preserve generic names, a server-only configuration boundary and provider-specific adapters. Only Gemini is implemented; unknown providers and hosted environments fail closed. `LLM_FREE_TIER_ONLY` is an operator assertion, not a verified billing API guard.

Deliver a bounded-intent, non-streaming pilot under NX-020.1. Preserve NX-020's original streaming acceptance and the incomplete monetary/evaluation scope of NX-021/NX-022. Reuse atomic shared request-unit quotas with a single-use live claim; never hold a transaction open across provider I/O or retry uncertain requests. No service-role key is introduced into application configuration. Request metadata is recorded before dispatch; uncertain attempts count conservatively, including outcome exposure.

Live output is transient and rendered as escaped text with a locally constructed lesson source. Do not fabricate a trusted scripted report receipt for a live response. Exact live-response reports, streaming/disconnect behavior, token/cost reconciliation and broader actual-model evaluations remain future work. Existing scripted receipts/reports remain unchanged. Fixed Google endpoint, no redirects/tools, bounded payloads and abortable I/O reduce the pilot's scope. See LIVE_TUTOR_SETUP.md.

## 2026-09-30 — Loopback development origin

Allow `127.0.0.1` explicitly in Next.js `allowedDevOrigins` because local Supabase email links use that hostname while `next dev` defaults to localhost. The dev log showed blocked resources and the tutor/browser interaction failed until this configuration was applied. Restrict the exception to that loopback hostname; no wildcard, production CORS or Server Action origin relaxation. The same browser test passed against the running dev server after restart.

## 2026-10-04 — Bounded real-model evaluations

User authorised the proposed NX-022 slice. Add NX-022.2 without replacing original NX-022 criteria or discarding build-guide scope. Use reviewed migration-seeded public lesson content in isolated PGlite, plus synthetic incomplete/adversarial variants; no learner records or private keys are selected into outbound context. The operator runner defaults to dry mode and explicitly opts into at most sixteen sequential live calls. It has its own evaluation cap, distinct from learner database reservations, and stops on provider failure without automatic retries. Normal CI stays offline.

Archive each actual reply and AI-assisted Codex editorial rationale. Automated lexical screening is not semantic approval, and fallback/unavailable/Not run is not a live quality pass. Preserve failing candidates. This session used three prompt runs (48 requests); baseline 12/16, v2 14/16 and v3 16/16 met the review rubric. These are finite samples, not statistical rates or independent human validation. Versioned prompt/model/hash metadata permit comparison. Model alias/weight updates and output variability require future reevaluation.

The actual-model review found misleading assignment/const explanations and missing-context requests incompatible with the no-chat UI. Tighten examples to their actual execution and explicitly acknowledge absent context. Validate supported lesson IDs, nonempty bounded context and intents at the provider adapter as defense beyond database access checks. Preserve escaped-text paragraph/code line breaks in the UI. No grading, automatic mastery or arbitrary student-code execution is introduced.

NX-022 stays partial against the broader guide, including submitted wrong-student-reasoning scope absent from the current contract and future streaming/disconnect behavior. Independent pilot/learner/human and wider adversarial evidence are not fabricated. NX-020 streaming/receipts and NX-021 token/currency controls remain future authorised slices. Local free-tier-only scope persists.

## 2026-10-08 — Streaming tutor and trusted local receipts (NX-020.2)

- User authorised the next NX-020 slice. Keep the existing local Gemini Free Tier opt-in; no hosted/paid provider, service-role app credential, dependency or framework upgrade.
- Same-origin authenticated POST streams bounded NDJSON to the browser, with a single-use database claim before provider I/O. Compare Origin against protocol and actual Host because Next normalises the internal URL hostname; do not trust forwarded-host headers. Lesson context and source identity come from the reviewed database lesson, never the submitted body.
- Gemini uses its fixed streamGenerateContent SSE endpoint, existing prompt v3, a 20-second streaming provider deadline, 64 KB wire and 6,000-character visible-text limits. Ignore thought parts. Require a natural STOP and complete framing before finalisation. Partial text is explicitly incomplete and replaced by prepared guidance on provider failure; cancellation discards it. No automatic provider retry.
- Preserve request-unit accounting. Cancelled, disconnected, timed-out and uncertain work stays charged; abort does not prove the provider stopped processing. Token/currency accounting remains NX-021. A completed receipt may be committed when cancellation races the final database write.
- Completed live/fallback output is signed by the app server with a distinct 256-bit local receipt capability. PostgreSQL verifies HMAC, authenticated owner, request identity, live claim and source, then writes once. This grants no profile, grading, role or arbitrary table access. Private key storage has no learner/staff grants. Operator-only setup generates/preserves the key in ignored .env.local and the private local DB using stdin, never command arguments or output. Missing app key disables dispatch. This is local provisioning, not hosted secret management or automatic rotation.
- Owned completed receipts can be recovered without new quota reservation/provider dispatch. Pending requests are never redispatched. Existing exact-response report RPC reads the trusted receipt; browser text cannot become a report quote. Requests/receipts cascade with account deletion; submitted report snapshots retain the existing staff-review policy and disclose that copy in the UI. Broader retention/erasure policy remains Phase 6.
- Offline browser fixtures are labelled synthetic and intercept the route; they verify interface behaviour, not provider streaming. Unit tests exercise actual parser fragmentation/abort and ensure cancelled generation never signs partial output. Live browser verification is separately opt-in and recorded honestly.

- Streaming's deadline is 20 seconds (non-streaming evaluation remains 12): a credential-free connectivity check passed, while bounded provider diagnostics observed 10.7 seconds to stream headers and a 12-second non-streaming timeout. Allow slower first-token delivery while retaining cancellation, a hard limit and the 35-second browser deadline. This is not an automatic retry.

## 2026-10-11 — Local token accounting (NX-021.3, partial)

- Reserve 65,536 tokens per dispatch against atomic UTC-day allowances of 250,000 per learner and 5,000,000 globally, alongside existing request limits. These are local application controls, not provider or monetary billing guarantees; the payload bound is an estimate. No paid billing or hosted provisioning is introduced.
- Reconcile strict final provider metadata under the existing server HMAC receipt capability, once on the request's original UTC day. Missing, invalid, interrupted or cancelled usage retains the reservation. Charge measured overruns fully and pause further live dispatch. Global consumed usage survives account deletion.
- Display only owned usage; browser clients cannot submit trusted usage or forge refunds. Keep provider dispatch bounded and without automatic retries.
- User requested a stop and 20% staging before handoff documentation and final review were complete. NX-021.3 remains In progress; resume outstanding documentation and verification only on instruction.

## 2026-10-13 — Token accounting verification and handoff

NX-021.3 is verified within its local token-only acceptance criteria. Preserve the earlier 2026-10-11 stop as history; the user subsequently authorised completing setup and verification. Defaults remain 65,536 per admitted live request, 250,000 per learner/day and 5,000,000 globally/day, plus existing request-unit controls. Global admission/finalization use one short transaction advisory lock and no lock across provider I/O. A nested admission transaction rolls back the request-unit claim on token denial.

Final provider cumulative counts are measured only after natural completion. Input includes system instruction and cache; cache is not double-counted, and thinking is included in total. No tools are enabled. Use strict bounded metadata under the existing owner/request/reply HMAC proof; reconcile at most once on the original UTC day. Unknown work keeps its full reserve. The byte-based payload estimate is not a guaranteed tokenizer or currency bound. Overruns are charged fully and pause future live admission; already-admitted work can still finish. Operator inspection uses private local policy/aggregate tables; no automatic debt reset or budget UI.

Keep the operator/setup guide inside app Git at `docs/tutor-token-accounting.md`, linked from README and the workspace live setup guide. Canonical tracker/progress/decisions and verification remain in workspace `docs/` outside app Git; they do not synchronise with spreadsheets. Final checks used no new provider calls and retain the earlier live result with its original date. Parent NX-021 remains partial for build-guide monetary/paid/hosted requirements. Broader NX-022 evaluations, independent human/pilot evidence and Phase 6 remain open.

## 2026-10-13 — Offline streaming resilience scope (NX-022.3)

User authorised staging NX-021.3 README/operator documentation and proceeding to the next evaluation slice. Preserve those two staged files; new regressions remain unstaged. Add a fixed 18-outcome/four-intent synthetic protocol matrix, real loopback Node HTTP abort/deadline tests, adapter/HMAC/migration-finalizer composition in PGlite and inert adversarial UI rendering. No application provider endpoint or context contract changes, external model calls, dependencies, learner promotion or paid services.

Serialization and authority checks do not prove actual model resistance to reference instructions; inert rendering does not assess semantic accuracy. Real loopback transport verifies abort propagation, not a hosted Next/proxy disconnect or provider billing cancellation. Keep 16-case real-model editorial evidence separate and preserve parent NX-022 for broader ambiguity/language/adversarial, wrong-student-reasoning and independent human/pilot requirements. New offline tests are included in existing unit/DB/tutor scripts and `eval:tutor:streams`; normal CI makes no external AI calls. Remote CI was not run.

## 2026-10-15 — Repository documentation and CI

The user authorised the repository/CI batch proposed after the implementation
review. Keep the existing application Git root. Import the canonical feature
register, setup guides, original build guide, decisions and dated verification
archive under repository `docs/`. This copy becomes canonical; the parent-workspace
copies and spreadsheet are legacy snapshots. Preserve all original task IDs,
acceptance criteria and statuses. The old progress file becomes an explicitly
historical archive; current progress records that the last staging groups were
committed through `a291ca3`.

Version the workflow at `.github/workflows/ci.yml` and resolve commands, Node and
lockfile paths at the repository root. Pin the official checkout/setup-node v6
tag commits resolved on this date. Preserve separate offline and real local
Supabase jobs, read-only permissions, timeouts, cancellation and unconditional
local cleanup. Provision a temporary receipt signing key only inside ephemeral
CI so the accounting RPC test does not skip for missing setup. Scripted mode and
the disabled real-provider smoke flag keep normal CI independent of provider
credentials. No hosted credentials, deployment or paid service is introduced.

New browser output defaults to ignored `test-results/verification/` within the
repository. Preserve imported evidence as dated records and keep the live smoke's
explicit directory override. Copying historical artifacts does not establish a
new pass or visual review. Local validation cannot establish remote CI execution
or branch protection; NX-036 stays In progress. No staging, commit or push is
included in this authorisation.

## 2026-10-16 — Keep historical evidence outside Git

The user requested excluding the 83 historical evidence files from the pending
commit and preserving them locally. This supersedes the earlier decision to
version the full verification archive. Preserve all original bytes in
`.local-archive/verification-2026-10-15.zip`, storing already compressed PNGs
directly and compressing the text records. Verify every ZIP member against its
source before removing the imported loose copy, and keep a SHA-256 checksum for
the archive. Parent-workspace originals remain untouched.

Ignore `.local-archive/` and `docs/verification/`, including files restored from
the ZIP. Keep the current planning/setup guides, decisions, feature register,
archived progress summary, CI workflow and reviewed model evaluation fixtures in
Git. Committed documentation links must work in a fresh clone without the ZIP;
point historical evidence references to [archive instructions](README.md#historical-evidence)
and preserve original member paths in feature notes. New browser output remains
in ignored `test-results/verification/`. This changes no task acceptance criteria,
dependencies or status, and includes no staging, commit or push.

## 2026-10-17 — Extended tutor evaluation and CI verification limits

Keep the original 16-case non-streaming suite and reviewed reports unchanged.
Add a separate, explicitly selected 16-case extended suite using the same
streaming adapter as the lesson tutor: four ambiguous-reference cases, four
beginner-English clarity cases and eight adversarial-reference cases across
lesson fields. This adds no learner input contract, multilingual UI, provider
adapter or model/prompt upgrade. Reports identify suite/version, configured model
alias, prompt/adapter/case hashes and validated final usage where available.

The collector persists uncertain attempts before network dispatch, permits at
most one dispatch per case and sixteen per run, paces sequentially, and stops on
first unavailable reply. Dry mode makes no provider calls. Fallback and Not run
remain pending, while actual live replies require explicit editorial review;
automated screening is never semantic approval. Preserve failed/unavailable
reports. The first extended run received HTTP 503 and supplies no quality pass.

Inspect existing GitHub jobs without pushing or changing protection blindly.
The first code/database/browser job passed, but the local-Supabase job failed at
integration. Public annotations do not identify the test; authenticated log/admin
access remains necessary. Add Playwright GitHub annotations to future reviewed
runs for diagnosable failures rather than changing timeouts/retries on conjecture.
Do not claim remote green CI or enforced required checks from local passes.

Restore missing dependencies using the existing npm lockfile. Run heavy checks
sequentially at low priority on two CPU cores for this machine. Docker automatic
startup and Vector collector restart stay disabled; no schema reset, log deletion
or paid/hosted resource is introduced. Preserve all original backlog criteria.

## 2026-10-17 — Canonical uncertainty continuation

The actual extended matrix captured 16 streaming replies; editorial review found
15 passes and one missing next-step instruction despite no screening warnings.
Retain that failed reply and its rubric rationale. Complete only the exact
canonical sentence “The reviewed lesson does not provide enough information.”
with the already requested direction to continue using lesson text and practice
feedback. Do not rewrite other model content or infer which arbitrary response
means uncertainty. Apply after natural provider completion in both adapters and
before signing/storing the final reply; usage accounting remains unchanged.

This is an application response guard, not a model/prompt improvement. Keep the
system prompt/version unchanged, and record a separate output-policy version/hash
in new operator reports. A targeted one-case live recheck passes; do not present
it as a second full 16-case matrix or claim independent human/model safety validation.
Fresh offline checks use the restored locked dependencies and cached Chromium
override. Docker stays off; no stopped collector is restarted for verification.
Remote CI remains partial until authenticated failure details and a new verified
run are available; no branch-protection mutation or push is performed.
