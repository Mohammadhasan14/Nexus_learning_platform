# Next implementation prompt: requirements and capacity workshop

Prepared **2026-10-28**, based on [the repository audit](AUDIT.md).
**Do not execute this prompt during the audit session.** The next valuable
milestone is M1 / NX-046.1–4; there is no existing workshop to rebuild.
Task statuses live only in [the canonical register](../features.csv).

## Copyable scope for a later implementation session

Implement the first System Design Studio milestone within Farzain Learning:
**one private, resumable requirements-and-capacity workshop**. Read AGENTS.md,
the current handoff, register, decisions and installed relevant Next docs first.
Use the supplied UI references for this milestone. Preserve existing JavaScript
content/progress, Auth, tutor accounting and performance behavior. Review each
task separately; do not begin the canvas or simulation milestones.

### Student journey

1. Sign in and complete existing onboarding. Open Courses, find **System Design
   Studio**, enrol through existing enrolment infrastructure and open the first
   versioned workshop. No JavaScript practice prerequisite is required.
2. Read a concise campus event directory brief and an Understand section:
   browse/list event details, create/update events, choose requirements and
   recognise that estimates depend on assumptions.
3. Record functional requirements and out-of-scope behavior; latency and
   availability targets; workload/retention assumptions and a short rationale.
   Targets are not predictions or proven availability.
4. Enter DAU, requests/user/day, peak factor, read share, read response bytes,
   write payload bytes and retention days in clearly labelled units. Explain
   defaults before using them; distinguish zero from missing/invalid values.
5. Inspect average/peak requests/s, peak read/write requests/s, logical retained
   write storage and peak read-response egress. Expand each formula and inspect
   inputs, unit conversions and excluded overhead. Change one assumption and
   explain the effect. These are estimates, not simulated performance metrics.
6. Select **Save worksheet**, see the saved revision, reload/sign in again and
   resume the same inputs and explanation privately. Unsaved changes, failures,
   session expiry and revision conflicts retain text and offer clear recovery.
   Saved work does not award a grade, mastery or JavaScript course progress.

### Included

- One reviewed scenario/content contract and deterministic estimator, pinning
  content/schema/formula versions and recording review limitations honestly.
- A Studio course-experience discriminator/routing adapter so catalogue and
  dashboard continuations enter the workshop, without JavaScript starting-check
  copy, dummy code examples or misleading 0/0 completion counters.
- Owner-only worksheet heads and immutable revisions, explicit save, optimistic
  concurrency and idempotent retry; server-derived estimates from saved inputs.
- Explicit account export inclusion and tested account-deletion relationships
  for new records, with accurate privacy wording and existing limits preserved.
- Accessible responsive brief/formula/results views, guided instructions,
  validation/status/recovery states and targeted regression coverage.

### Excluded

Architecture canvas, graph persistence, component picker/inspector, Sandbox and
Challenge interactions, traffic/cache/failure simulation, traces/events,
architecture comparisons, correctness/mastery scoring, AI coaching, advanced
challenge packs, portfolio/public sharing, collaboration, offline sync and
autosave. Do not render fake controls or metrics to imply these work. No package
installation or hosted service is expected. Do not start Docker/Vector, change
credentials or mutate a real database without the applicable authorisation.

### Likely files and data changes

These paths are proposals for the future implementation, not files created by
this audit:

| Area                          | Likely change                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route and view                | New `app/(learner)/courses/[course]/studio/[scenario]/page.tsx`; new `components/system-design/workshop.tsx` and small form/formula components. Use shared shell, colors, focus and form conventions; scope any new CSS.                                                                                                                                                                                                                 |
| Domain                        | New `modules/system-design/schema.ts`, `estimation.ts`, `data.ts`, `actions.ts`, and versioned content/review records. Keep estimator pure and isomorphic; use server-only data/action boundaries.                                                                                                                                                                                                                                       |
| Catalogue and recommendations | Review `app/(learner)/courses/page.tsx`, `app/(learner)/dashboard/page.tsx`, `modules/learning/data.ts`, `modules/learning/rules.ts`, search actions/links and projects consumers. Route by experience; retain existing JS route and prerequisites. Add only the fields/queries necessary.                                                                                                                                               |
| Database/types                | A reviewed additive migration: defaulted course experience discriminator, scenario versions and owner-scoped worksheet heads/revisions/save RPCs. Derive identity from `auth.uid()`, enforce enrolment/scenario associations and concurrency. Update generated database types using a documented authorised method; flag provider type drift as unverified until it actually runs. No reset or in-place rewrite of published JS content. |
| Privacy                       | Extend the existing explicit learner snapshot export and cascade/guarded deletion tests for new records. Preserve compatible export parsing/limits or deliberately version the contract; do not silently omit Studio data.                                                                                                                                                                                                               |
| Tests/docs                    | New estimation units, worksheet SQL policies/revisions, fixture browser journey and later provider integration. Extend the synthetic backend only for tests. Update existing tracker IDs, current handoff and setup/review evidence.                                                                                                                                                                                                     |

NX-046.1 defines schema/ranges/formulas and a reviewed content fixture first.
NX-046.2 adds tested persistence/course integration, independently reviewable
without shipping an incomplete visible workshop. NX-046.3 adds the UI; publish
the catalogue entry with the usable workshop, not as a broken intermediate link.
NX-046.4 verifies the combined slice and records precise remaining acceptance.

### Required screens and states

- Catalogue card: available, unenrolled, enrolling/failure, enrolled/resume;
  existing unavailable-backend and sign-in flows remain honest.
- Workshop: loading, new/empty, saved/resumed and unsupported/unknown scenario
  version; enrolment required and unauthorised access cannot expose private work.
- Responsive workspace: brief/instructions, requirement and workload form,
  expandable formula/results section, and explanation/save area. Desktop may
  use two columns; narrow screens stack sections or use one panel at a time.
- Form: valid, missing/invalid/out-of-range, pending save, saved, unsaved changes,
  retryable error, stale revision and session expired. A failed save or viewport
  change preserves input; discard requires an explicit choice. No background
  save or full-page navigation on validation failure.
- Results: unavailable until valid, labelled derived estimates, zero workload,
  overflow/unsupported bounds and explicit assumptions. Saving a version must
  not switch it to newer content/model defaults on reload.

### Acceptance criteria

1. The entire journey works for a synthetic learner without altering JavaScript
   enrolment/progress, course recommendations or tutor restrictions. Catalogue
   and dashboard show work state accurately; no invented completion/mastery.
2. For a documented fixture of 100,000 DAU, 20 requests/user/day, peak factor 5,
   90% reads, 20,000 response bytes, 2,000 write bytes and 30 retention days:
   average requests/s ≈ 23.148148; peak ≈ 115.740741; peak reads/s ≈ 104.166667;
   peak writes/s ≈ 11.574074; retained logical write storage = 12,000,000,000
   bytes (12 GB, approximately 11.176 GiB); peak read-response egress ≈
   16.666667 Mbps. Display rounding does not affect intermediate calculations.
3. Every estimate exposes its formula, units and excluded overhead. Validate
   finite bounded numbers and meaningful zero cases, prevent NaN/overflow and
   reject unsupported versions. Storage uses average writes, not peak writes.
   No server count, latency/availability prediction, random metric or readiness
   score is invented.
4. Save/reload preserves exact submitted inputs, assumptions, explanation and
   pinned content/model identity. The same idempotency key/payload saves once;
   conflicting reuse is rejected. A stale revision cannot overwrite newer work.
   Earlier saved revisions remain available as evidence.
5. An unauthenticated user, second learner and unrelated staff account cannot
   read/write/attach another learner's heads/revisions. Clients cannot supply
   an owner or authoritative computed result. Direct writes cannot bypass RPC
   checks; withdrawn access/session expiry produces an honest recovery state.
6. Export includes all saved Studio revisions or reports the existing size
   limit explicitly; account deletion removes private Studio records. Other
   users' work, secrets and grading keys are never included. No real user is
   deleted during testing.
7. Keyboard-only entry/save/disclosures work; errors are associated with fields,
   status announcements are concise and focus does not jump away from ongoing
   work. At 320/390/768/1440px and reduced-motion settings, content reflows,
   controls remain usable and edits survive resizing. Axe and keyboard tests
   are recorded separately from human screen-reader/physical-device acceptance.
8. Existing route payload/request budgets remain intact, and the workshop does
   not import a graph/simulation/provider bundle. Record a small initial workshop
   payload/input-responsiveness baseline rather than claiming low-end hardware
   performance without measurement.

### Verification and stop

Use existing unit tools for golden, boundary and version replay cases; PGlite
for RLS, grants, owner/child associations, idempotency/conflicts, export and
deletion against synthetic records; fixture Playwright for the student journey,
retained input and accessibility states. Run formatting/lint/typecheck, relevant
units/SQL checks and a production build, then affected public/course flows and
existing performance budgets. Include old JS learners as regression fixtures.
Do not count an HTTP fixture as live Supabase verification.

Prepare real local-provider pgTAP/type-drift/integration coverage; run it only on
an authorised disposable stack. If that stack is unavailable, record the
unverified provider gate instead of starting services or marking it passed.
Stop after M1, update evidence against NX-046.1–4 and list remaining gates.
Do not proceed automatically into editor, simulation or AI work.

## UI reference needed

For M1, provide **one desktop reference for the requirements/capacity workspace**
showing the brief, editable assumptions, formulas/results and save/revision
placement, plus **one narrow-screen reference or stacking preference**. Include
a validation/expanded-formula state if its placement matters. A later canvas-only
image can guide future M2 but is insufficient to define this worksheet screen.
Reuse the current visual tokens unless the supplied reference explicitly changes
them; no brand redesign is assumed.

## Genuine blockers and recorded assumptions

No unresolved product question blocks implementing the local M1 contracts and
logic. The fictional campus event directory, English-first copy, existing Auth,
explicit saving, private ownership and no extra dependency are recorded defaults.
UI references are needed for exact visual matching in the later session. Content
review is an implementation prerequisite, not a presumed previous approval.
Actual provider acceptance needs an authorised test environment; hosted release
and broad device/assistive-tool checks remain separate from local development.
