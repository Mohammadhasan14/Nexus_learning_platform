# System Design Studio incremental implementation plan

Date: **2026-10-28**. Planning only; implementation is not authorised in this
session. See [audited state and evidence](AUDIT.md) and the bounded
[next implementation prompt](NEXT_IMPLEMENTATION.md).

## Curriculum clarification — 2026-10-29

The intended beginner-to-advanced student journey starts with a short foundations
module before the capacity workshop. NX-046.22 records clients, servers, APIs,
databases, requests versus responses, latency versus throughput and read/write
workloads, taught through simple examples and guided practice. This module is
Deferred and excluded from M1 implementation. Keep the current workshop scope,
explain unfamiliar terms inline and do not present it as the whole course or
block access on the unimplemented prerequisite. The user supplied M1 UI references
and authorised its implementation, then paused it; use the current handoff and
canonical tracker for present status rather than the original audit snapshot.

## One tracker and delivery order

[docs/features.csv](../features.csv) remains the **only task tracker**. Existing
IDs and acceptance criteria are preserved. New Studio tasks use NX-046.1–21;
portfolio/review/team tasks extend NX-048, NX-047 and NX-050. This document
describes their approach, not a second set of independently maintained statuses.
[docs/PROGRESS.md](../PROGRESS.md) remains the only current handoff. Do not create
parallel `TASKS.md` or per-course `PROGRESS.md` files.

Milestone 1 tasks are Pending: defined, unstarted and awaiting a later
implementation instruction. Milestones 2–6 are Deferred roadmap work. The
original expansion parents stay Deferred; authorising an audit does not activate
their delivery or complete their acceptance. Tasks may move through the existing
Pending / In progress / In review / Blocked / Completed / Deferred conventions.
Completion requires the recorded acceptance checks, not just a route or file.

The learning loop is **Understand → estimate → design → simulate → investigate
→ explain**. Milestone 1 delivers the first two and a short explanation; later
milestones extend the same saved scenario rather than starting another app.

| Milestone                      | Independently reviewable tasks in the canonical register                                                                                                                                                        | Exit behavior                                                                                                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Requirements and capacity   | NX-046.1 content/model contract → NX-046.2 private save/load and course entry → NX-046.3 worksheet/calculator UI → NX-046.4 focused acceptance                                                                  | One versioned scenario: read a brief, record requirements/assumptions, inspect transparent estimates, explain trade-offs, save and resume privately. No architecture or simulated metrics.                                     |
| 2. Guided architecture editor  | NX-046.5 graph/component/mode contracts → NX-046.6 design revisions → NX-046.7 canvas/picker/inspector → NX-046.8 keyboard/touch/limits                                                                         | Guided and Sandbox editing with configured components and connections, undo/redo, collapsible panels and a fully usable graph-list alternative. Challenge scaffolding is typed but only exposed with actual challenge content. |
| 3. Traffic, caching and traces | NX-046.9 reviewed event/traffic model → NX-046.10 bounded worker execution → NX-046.11 cache/path rules → NX-046.12 results drawer                                                                              | Reproducible run under explicit assumptions, event-derived throughput/errors/latency, cache behavior, individual traces and usable nonanimated results.                                                                        |
| 4. Failure investigation       | NX-046.13 controlled failures → NX-046.14 causal investigation → NX-046.15 comparable snapshots                                                                                                                 | Inject a documented outage/slowdown, inspect queues/timeouts/events, explain the cause, compare an eligible baseline and changed design.                                                                                       |
| 5. Assessment and coaching     | NX-046.16 trusted evidence rubric → NX-046.17 scoped AI coaching → NX-046.18 competency/review evidence                                                                                                         | Feedback cites saved inputs/design/run evidence; optional AI explains but cannot award grades. Mastery views distinguish support, uncertainty and transfer evidence.                                                           |
| 6. Advanced work and sharing   | NX-046.19 deployment/data evolution; NX-046.20 AI architecture; NX-046.21 isolation/reliability capstones; NX-048.1 portfolio; NX-047.1 peer review; NX-050.1 team permissions → NX-050.2 collaborative editing | Separate reviewed challenge packs and explicit, revocable sharing. Collaboration follows a tested membership/ownership model. Each pack/sharing feature is its own review; none is prerequisite for milestone 1.               |

Every row in the register records scope, dependencies, acceptance and required
verification. Review one task at a time; do not treat a milestone as one large
implementation PR. NX-046.4 verifies the completed first vertical slice; each
earlier task must still include its own meaningful tests.

## Curriculum and teaching evidence

Use one small, fictional **campus event directory** scenario first: event
listing/details reads and event creation/updates. Later problems reuse its
workload and expose new trade-offs. No real user or production telemetry is
needed. This scenario choice is a recorded assumption, replaceable before
NX-046.1 is implemented.

| Curriculum area                                        | Earliest teaching milestone and later extension                    | Observable learner work                                                                                                                                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requirements, units, workload and estimation           | M1 / NX-046.1–4                                                    | Functional scope, latency/availability targets, average versus peak reads/writes, retention and assumptions; explain a sensitivity change. Targets are requirements, not measured system behavior.                                 |
| Networking and API foundations                         | M2 / NX-046.5, then M3 / NX-046.9–12                               | Trace client → API → data; specify request/response sizes, endpoints, connection/link latency, pagination and API contract trade-offs. DNS/TLS/transport overhead must be taught and explicitly included or excluded by the model. |
| Data modeling, indexes and transactions                | M2 / NX-046.5–7; deeper M6 / NX-046.19                             | Define entities, read/write access patterns, candidate indexes and a transaction boundary. Explain consistency and storage amplification instead of claiming the simulator runs a real database.                                   |
| Replication and partitioning                           | M3 model extensions / NX-046.9, M4 / NX-046.13–15, M6 / NX-046.19  | Identify replication/partition keys, stale-read risks, skew, failover and resharding trade-offs. Unsupported configurations remain visibly unsupported until a reviewed model exists.                                              |
| Caching, queues, retries, idempotency and backpressure | M3 / NX-046.9–12, M4 / NX-046.13–14                                | Trace hit/miss/expiry and invalidation; inspect bounded queues, retry budgets, duplicates and admission behavior. Explain a mitigation using events rather than decorative counters.                                               |
| Reliability, security, tenant isolation and incidents  | M2 configuration/threat prompts; M4 / NX-046.13–15; M6 / NX-046.21 | Record trust boundaries and least privilege, investigate an incident, choose RTO/RPO trade-offs, reason about noisy neighbors and validate isolation examples. Simulations do not certify security or actual availability.         |
| Deployment and schema evolution                        | M6 / NX-046.19                                                     | Expand/contract migration, mixed-version compatibility, staged rollout/rollback and reconciliation during backfill.                                                                                                                |
| AI application architecture                            | M6 / NX-046.20                                                     | Compare retrieval, provider/embedding dependencies, caches, queues, evaluation, prompt injection/privacy, latency and bounded token/cost assumptions. Synthetic model inputs are not vendor price or capacity guarantees.          |
| Evidence and explanation                               | All milestones, assessed under M5 / NX-046.16–18                   | State assumptions, predict an effect, inspect evidence, revise an explanation. Unseen transfer and delayed checks must be designed before asserting mastery.                                                                       |

Each content package needs objectives, prerequisites, reviewed examples and
counterexamples, accessible teaching alternatives, model limitations, rubric
version and review provenance. M1 includes a compact lesson in the scenario;
do not seed placeholder advanced lessons to make the catalogue appear complete.
Initial simulation delivery need not model every component in this curriculum.

## Fit into the existing application

Reuse Next App Router, TypeScript, Zod, shared CSS/UI, Supabase Auth/PostgreSQL,
the current learner shell, validation/action patterns and verification harnesses.
Keep existing JavaScript content IDs, enrolments, attempts and tutor restrictions.
No second backend, application, ORM, queue service or authentication system.

Proposed M1 URL:
`/courses/[course]/studio/[scenario]`, initially under a version such as
`system-design-foundations-v1`. It remains inside the protected learner group
and existing `/courses` proxy refresh prefix. Exact new IDs are reserved at
implementation, never substituted into existing published records.

`course_versions.id` is already a **version-specific** ID; there is no implemented
generic `courses`/skills/graph table matching every historical proposal. Reuse
`course_versions` and `enrolments`, and add an explicit course experience
discriminator (default existing lesson experience) plus scenario associations.
Route cards/continuations by experience. Studio cards must show scenario/draft
state instead of “0/0 practice checks passed” or linking to the JS starting check.
Teach M1 through structured scenario content, not fabricated JavaScript lessons
or empty `example` fields. Audit dashboard/project/search recommendation consumers
when adding the discriminator. Existing lesson routes keep their behavior.

M1 saving is **work saved**, not assessment success or mastery. It must not insert
fake multiple-choice attempts, satisfy JavaScript prerequisites, or declare a
course complete. M5 adds separate, typed activity evidence and explicitly adapts
recommendations, review scheduling and outcomes; the current outcome trigger is
attached to option-based attempts and cannot be reused without semantic changes.

The staff editor currently clones reviewed lessons and keys; it cannot create an
arbitrary first course or model. Initial scenario content can be introduced in a
reviewed additive migration with a content review record, as existing JS seeds
were. Full scenario/model authoring is later editorial work, not an M1 prerequisite.

## Persistence and ownership

The following are proposed future data changes, **not migrations in this audit**:

- Immutable `studio_scenario_versions` associated with a course version, holding
  scenario identity, objective/brief, content/schema version, allowed units and
  ranges, defaults, estimator/model references and review provenance. Never
  mutate a published scenario behind saved evidence.
- Owner-scoped `studio_worksheets` plus append-only worksheet revisions. Store
  structured requirements, workload inputs, explicit assumptions and explanation;
  bind each revision to its scenario/model versions. An expected revision and
  idempotency key protect explicit saves; retain earlier revisions for evidence.
  Bound document size/history reads, and set limits in NX-046.1–2. Do not silently
  truncate an export or overwrite stale work.
- From M2, separate design heads/revisions store typed nodes/edges/configuration,
  referencing an exact worksheet revision. Viewport/selection/panel preferences
  are UI state; they must not change a design's semantic hash or assessment.
- From M3, bounded run records reference exact worksheet/design revisions, model
  registry versions, workload/failure schedule, limits, seed where applicable,
  canonical input hash and event-derived outputs. Trace samples record their
  sampling policy; summary metrics must use all eligible events, not the sample.
  No object storage or durable job service is needed for M1.

M1 derived estimates are recomputed from saved inputs and the pinned pure model
on the trusted server; do not accept or store a client-submitted result as truth.
Keep old model implementations available for replay, or explicitly label a model
as unavailable; never silently recompute old work using new formulas.

Use verified render/action sessions and caller-scoped Supabase clients. Database
RLS filters all private heads/revisions by `auth.uid()`. RPCs derive owner,
scenario eligibility, course enrolment and expected revision on the server;
no supplied owner, role, computed score or timestamp is trusted. Enforce matching
owner/scenario foreign-key relationships so a child cannot attach to another
learner's parent. Staff status alone grants no access to private learner work.
Revoke direct client writes that bypass validated save rules. Security-definer
RPCs need explicit privileges, empty search path and checks at every boundary.

Save intent is explicit in M1: no autosave every keystroke, no background sync,
and no silent localStorage copy of private worksheets. Keep unsaved input in
memory through validation/network failures and resizing; confirm before discard.
Show saving/saved/unsaved/conflict/session-expired states. Later autosave is a
separate behavior decision, with cancellation and conflict policy first.

Include new private records in the explicit account export and cascade/guarded
deletion paths in the same persistence task. Preserve the existing 8 MiB export
limit and explain oversize failures; do not add unlimited traces to that payload.
Extend the format compatibly or version it deliberately, with tests. Privacy
notices must describe actual stored worksheet/design content. Unrelated tutor
retention and quota accounting stay intact. Portfolio sharing is a different,
later opt-in workflow and excludes tutor/private-account data by default.

## Module separation and trustworthy simulation

| Proposed boundary                                                   | Responsibility                                                                                                                                                                                            |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/system-design/schema.ts` and `content/`                    | Strict versioned scenario, worksheet, graph/component and mode contracts; constraints and reviewed teaching material. No UI or provider access.                                                           |
| `modules/system-design/estimation.ts`, `simulation/`, `assessment/` | Pure deterministic functions, model registry, event definitions and versioned feedback rules. No React, network, clock or hidden randomness.                                                              |
| `modules/system-design/data.ts`, `actions.ts`, server adapters      | Verified access, bounded queries, authoritative recomputation, save/RPC mapping and eligible evidence writes. Never import server credentials into client or worker modules.                              |
| `components/system-design/`                                         | Forms, canvas, accessible graph list, picker, inspector and results views; render domain state and dispatch typed commands. No authoritative scoring.                                                     |
| Studio worker entry and protocol                                    | Trusted model code in a Web Worker, typed messages, progress/cancellation and run IDs; no evaluation of student JavaScript. A compute worker is not the isolated untrusted-code runner/security boundary. |
| `modules/tutor/` adapter extension, only in M5                      | Source-grounded coaching from an explicitly selected, owner-authorised evidence snapshot; no control over deterministic metrics or grades.                                                                |

M1 uses transparent arithmetic: average requests/s = DAU × requests/user/day ÷
86,400; peak = average × stated peak factor; split by read/write share; logical
storage uses **average writes/day**, bytes/write and retention; read-response
egress uses peak reads/s × bytes/response × 8. Label decimal GB/Mbps and binary
GiB separately. Indexes, replication, protocols, backups, growth and compression
are excluded unless separately parameterised. Requirements such as 99.9%
availability or 200 ms p95 are targets, not predictions from these formulas.

M3 starts with a reviewed finite-horizon discrete-event model: explicit arrival
schedule, link delay, per-component service time/concurrency, bounded queue and
drop policy. Stable event ordering/tie-breaking yields replayable results.
Represent requests through actual paths; cache hit/miss/expiry derives from
key/access policy, not a magic success slider. Add retries, idempotency,
backpressure and failure timing as independently tested rules. Count completed,
failed, dropped and outstanding requests; derive percentiles from an explicitly
defined eligible latency population and label insufficient observations. Do not
use a steady-state queue formula outside its assumptions or represent unbounded
overload as a plausible finite latency.

If a later stochastic arrival model is useful, record a reproducible PRNG/seed
and sample policy. Never generate random display metrics, hard-code success,
or produce an unsupported “production readiness” score. A simulator is a
documented teaching model, not a production load test, real database, security
scanner, reliability guarantee or cloud quote. Unsupported graph configurations
must be rejected or explicitly excluded, not silently guessed.

Compare designs only against compatible workload, scenario, horizon, model,
failure schedule and seed. Record deliberately changed inputs; refuse or clearly
label incompatible comparisons. Display assumptions, denominators, versions and
limitations alongside each result. Explanations should cite request IDs/events
or parameter/formula names a learner can inspect.

## Assessment and optional AI coaching

Deterministic rule feedback runs without a provider. M1 can flag inconsistent
units or missing assumptions but must not grade open-ended reasoning as correct.
M5 rubrics assess specific observable claims: capacity calculation, path choice,
predicted failure, evidence interpretation and explanation coverage. Save rubric
version, evidence references and support level. Distinguish completeness from
correctness, a repeated task from unseen transfer, and insufficient evidence from
failure. Do not convert activity, chat usage or a decorative progress ring into
mastery. Validate assessment design before broad learning-outcome claims.

Browser simulation outputs are exploratory. Before awarding evidence, revalidate
the graph/inputs and replay a bounded model on a trusted server. A database RPC
must not accept caller-forged grades: select a reviewed SQL rule or a scoped
server-signed evidence capability, following existing receipt boundaries, before
shipping M5 persistence. That design/security review is part of NX-046.16.

Only then extend tutor context, SQL claim allowlists and reviewed source mapping.
AI receives minimal explicitly selected worksheet/design/run evidence and cannot
mutate work, metrics, grades or progression. Label coaching separately; ground
claims in model/lesson sources, record provider/prompt/context versions and apply
existing quota, cancellation, fallback, reporting and retention boundaries.
Add scenario-specific adversarial/evaluation cases before enabling a provider.
No live provider, retrieval service or generic chat box is needed for M1–4.

## Accessible interaction and performance

The eventual desktop Studio reserves the central area for a spacious canvas.
Keep the Guided/Sandbox/Challenge mode selector explicit and explain what each
mode constrains; changing mode must not silently discard work. Only offer modes
whose content/rules exist. Use a searchable picker with empty/no-match states,
contextual inspector with labelled validated fields, collapsible side panels,
and an expandable results drawer for metrics/traces/events/comparisons. Use
native controls and focus-return patterns from existing components where useful.

Every add/connect/configure/delete/reorder operation needs a keyboard and
non-drag alternative through a node/connection list and forms. Deletion offers
undo or a clear confirmation where evidence would be lost. Panel toggles expose
state and move focus safely; drawers/dialogs support Escape and focus return.
On narrow screens use one panel at a time with a usable list view, readable
labels and touch targets; do not force a desktop canvas to fit by shrinking text.
Provide status/error/empty/locked/unsupported/cancelled states and preserve input.

Use animation only to explain request paths, selection and result changes.
Provide pause/step/speed controls and a textual trace equivalent. Respect both
`prefers-reduced-motion` and an explicit Studio playback preference; disabling
motion must not disable simulation or hide evidence. Future JS-driven animation
must observe the preference, not rely only on global CSS.

Start with React local state/reducer and existing CSS. Keep immutable domain
snapshots separate from transient dragging/selection; avoid re-rendering the
whole shell on pointer events. Debounce search, batch UI updates, cap graph/event
sizes, page result lists and use workers for simulation rather than blocking
input. Lazy-load editor/simulation code on Studio routes/use, never across every
course or the public homepage. Cancel stale runs, terminate runaway workers,
and reject old run IDs; playback consumes stored events without rerunning a model.

Before M2–3 acceptance, calibrate explicit graph/event limits on a representative
modest computer, plus reproducible Chromium CPU-throttled checks. Initial test
fixtures can use 50 nodes/100 edges and 10,000 events as **provisional test sizes**,
not proven capacity. Record editing latency/long tasks, memory, cancellation,
bundle/worker sizes and text-input responsiveness. Establish a Studio-specific
budget from measurements; keep the five existing route budgets intact and check
that new content does not create unbounded `learningData()` catalogue reads.
Do not equate desktop emulation or noisy timing thresholds with physical-device
or field performance acceptance.

## Dependency decisions and real gates

No package or service is required for the M1 form/arithmetic workshop. Reuse Zod,
Supabase, React, CSS, Playwright/axe and PGlite. Reassess a graph library only
before NX-046.7 if its accessible keyboard model, touch support, serialization,
controlled state, license/maintenance and measured bundle cost beat a small
DOM/SVG implementation. Evaluate layout/virtualisation/charting packages only
after an observed need; native Worker, SVG and HTML tables are initial options.
No animation library, CRDT, realtime service or new database is selected now.

Content review and versioned formula definitions precede data/UI work. Data
ownership/export/deletion tests precede saved learner use. Reviewed simulation
rules precede metric displays; trusted assessment precedes mastery/AI claims;
revocable grants and tenant tests precede collaboration. M1 does not depend on
hosted rollout, paid providers, a graph package or advanced course content.
UI references affect the final design, not this audit's ability to define tasks.

Verification should reuse unit golden/boundary cases, migration/RLS tests and
fixture browser journeys, then separately real local-provider pgTAP/type drift/
integration on a disposable authorised stack. Add keyboard, axe, touch, reduced
motion, save conflict/session expiry and performance cases as each relevant
interaction lands. CI execution and real-device/assistive-tool evidence must
retain their own provenance. No future check in this plan is a present pass.
