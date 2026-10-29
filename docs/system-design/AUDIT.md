# System Design Studio repository audit

Date: **2026-10-28**. Inspected commit:
`1456834b860e505410afaefae17c32da1b6ed7c4`. The working tree and index were clean
at the start. The product's current display name is **Farzain Learning**; Nexus
Learning remains the repository/history name. This audit does not rename either.

This session authorises inspection and planning documentation only. No Studio
implementation, schema edit, package installation, service provisioning, commit
or deployment is included. Environment files and their values were not read.

## Evidence and classification

“Implemented and verified” below means the specified existing automated check
ran during this audit. It does not imply live Supabase, browser, hosted or
human accessibility verification. “Implemented but not verified” means source
exists, with no fresh runtime check here; older evidence is identified separately.
“Partially implemented” describes reusable platform pieces with a concrete gap.
“Missing” means no implementation was found in tracked source or migrations.
“Blocked” identifies an acceptance activity that cannot currently be claimed.
These inventory labels are separate from the feature register's delivery statuses.

### Implemented and verified

| Finding                                         | Behavior and source evidence                                                                                                                                                                                                                                                                                                                                                                                                | Fresh verification and limits                                                                                                                                                                                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuration and input boundaries              | [Configuration parser](../../lib/config.ts), [Auth validation](../../lib/auth/validation.ts), [profile validation](../../modules/profile/validation.ts) fail closed on invalid/cross-environment configuration, bound credentials/preferences and restrict redirects.                                                                                                                                                       | All four existing [security unit cases](../../tests/unit/security.test.ts) passed. Synthetic inputs only; no environment values inspected.                                                                                                                            |
| Versioned JavaScript content                    | [Preview seed](../../supabase/migrations/202609220002_foundations_preview.sql) and [reviewed seed](../../supabase/migrations/202609240001_reviewed_foundations.sql) contain one subject, JavaScript foundations, in v1/v2: six lesson records and twelve constrained exercises in total. V2 records an AI-assisted review; v1 remains a preview.                                                                            | Existing [content tests](../../tests/database/content.test.ts) passed in isolated PGlite, checking examples, keys, aligned content and evidence-preserving v1→v2 migration. This establishes checked-in seed behavior, not an inventory of a user's running database. |
| Owner isolation and protected learning evidence | [Identity migration](../../supabase/migrations/202609200001_phase2_identity.sql), [learning migration](../../supabase/migrations/202609220001_learning.sql), [aggregate view](../../supabase/migrations/202609220003_progress_evidence.sql) use owner RLS, private keys, guarded RPCs, prerequisite checks and idempotent attempts. Reading is separate from passing practice. Browser runner output cannot create a grade. | Existing [policy](../../tests/database/policies.test.ts) and [learning](../../tests/database/learning.test.ts) files passed using real migration SQL in an isolated engine with Auth shims. This is not actual Supabase Auth verification.                            |

### Implemented but not verified during this audit

| Finding                                                | Behavior found and relevant files                                                                                                                                                                                                                                                                                                                                                                     | Remaining checks                                                                                                                                                                                                                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Course catalogue and lesson routes                     | [Catalogue](<../../app/(learner)/courses/page.tsx>), [lesson](<../../app/(learner)/courses/[course]/[lesson]/page.tsx>), [starting check](<../../app/(learner)/courses/[course]/assessment/page.tsx>), [loaders/rules](../../modules/learning/data.ts) and [actions](../../modules/learning/actions.ts) load database content, enrol, resume, save reads/attempts and retain enrolled older versions. | No page served here. Prior browser/local-provider evidence is recorded in [Phase 3](../PHASE_3_SETUP.md) and [current progress](../PROGRESS.md). Do not infer additional courses from homepage marketing.                                                                       |
| Authentication and learner shell                       | [Session helper](../../lib/auth/session.ts) verifies `getUser()` on actions; [render helper](../../lib/auth/render-session.ts) memoizes only per render; [proxy](../../proxy.ts) refreshes supported route prefixes. [Shell](../../components/learner/learner-shell.tsx) supplies navigation and skip link.                                                                                           | Session refresh/revocation and simultaneous accounts need browser/provider regressions when new routes land. A Studio route under `/courses` inherits the existing proxy prefix, but still needs its own access checks.                                                         |
| Private notes and project revisions                    | [Notes](../../modules/notes/actions.ts) and [project actions](../../modules/projects/actions.ts) retain input on failure and detect stale revisions. [Project SQL](../../supabase/migrations/202609260002_projects_reviews.sql) stores private immutable submissions, rubric versions and completeness feedback.                                                                                      | No fresh note/project runtime run. Existing project UI/schema is specifically `values`, `conditions`, `functions`; it is not a graph/worksheet store or correctness grader.                                                                                                     |
| Editorial publishing                                   | [Admin schema](../../modules/admin/schema.ts) and [publishing SQL](../../supabase/migrations/202609270001_editorial_reports.sql) revise existing lesson text, invalidate review after edits, and publish a new version while copying questions/keys/projects. Roles are database-controlled.                                                                                                          | Not a general new-course/scenario/model authoring interface. New curriculum, questions and Studio models require reviewed content/schema work. See [editorial scope](../EDITORIAL_REPORTING_SETUP.md).                                                                          |
| Scripted and local live tutor                          | [Adapter](../../modules/tutor/adapter.ts), [prompt](../../modules/tutor/prompt.ts), [configuration](../../modules/tutor/config.ts), [stream endpoint](../../app/api/tutor/route.ts) implement bounded intents, prepared fallback, opt-in local Gemini, cancellation, saved receipts and atomic request/token accounting.                                                                              | Source and [prior evaluations](../../tests/evaluations/README.md) inspected; no AI request or key inspection. Reviewed JS v2 restrictions exist in both lesson UI and SQL claims. System-design coaching cannot be enabled just by changing a label.                            |
| Outcomes and reviews                                   | [Outcome SQL](../../supabase/migrations/202609290001_outcome_events.sql), [loader](../../modules/outcomes/data.ts), [review loader](../../modules/review/data.ts) derive private attempt metadata and review timing.                                                                                                                                                                                  | [Definitions](../OUTCOMES_SETUP.md) explicitly limit first-check independence and delayed familiar-question rates. These are not system-design competency rubrics or validated mastery. No fresh outcomes run.                                                                  |
| Data export, deletion and retention                    | [Export handler](../../app/api/account/export/route.ts), [snapshot SQL](../../supabase/migrations/202610220001_learner_export.sql), [privacy migration](../../supabase/migrations/202610230001_privacy_controls.sql) cover current private data, retention and guarded deletion.                                                                                                                      | Existing SQL lists collections explicitly: future Studio tables will not enter exports automatically. Real environment migration/key acceptance remains open in [privacy setup](../PRIVACY_CONTROLS_SETUP.md).                                                                  |
| Existing UI, accessibility and performance foundations | [UI primitives](../../components/ui/index.tsx), [CSS](../../app/globals.css), [search dialog](../../components/search/command-menu.tsx) provide shared colors/spacing, focus styles, native-dialog focus return and reduced-motion CSS. Existing tests cover keyboard, touch, overflow and payload/read budgets.                                                                                      | [Accessibility](../ACCESSIBILITY_REVIEW.md), [mobile](../MOBILE_REVIEW.md) and [performance](../PERFORMANCE_REVIEW.md) reports describe earlier bounded runs. No graph interaction, new route budget, actual screen reader or physical modest-computer test was performed here. |
| CI definition                                          | [Workflow](../../.github/workflows/ci.yml) has code/isolated SQL/browser and disposable local-Supabase jobs, pinned actions and no AI calls or deployment step.                                                                                                                                                                                                                                       | Source inspection only. [CI record](../CI.md) names an older successful remote commit; it does not prove current HEAD ran remotely or required checks are enforced.                                                                                                             |

### Partially implemented for the Studio target

| Target                             | Reusable behavior and precise gap                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Course and progress integration    | `course_versions`, `enrolments` and immutable version IDs are usable. Current catalogue/recommendation counters expect lessons with option-based practice; assessment copy explicitly mentions values/comparisons/returns, lesson rendering always includes a JavaScript example/runner, and tutor UI only enables JS v2. A Studio experience type and route selection are missing. |
| Requirements worksheet persistence | Notes and project revisions offer ownership/conflict/idempotency patterns. No typed requirement, workload, assumption or estimate records exist; using free-text JavaScript project fields would lose the needed semantics.                                                                                                                                                         |
| Search and collapsible panels      | Quick Search searches unlocked lessons/actions, not architecture component types. Native disclosures exist in marketing/privacy/project views. No Studio component picker, contextual inspector, panel layout or results drawer exists.                                                                                                                                             |
| Motion and interaction preferences | Global `prefers-reduced-motion` disables CSS animation/transitions and smooth scrolling. Future request animation/worker-driven playback needs its own reduced-motion behavior, pause and nonanimated equivalent; CSS alone cannot handle that.                                                                                                                                     |
| Evidence-based feedback            | Protected multiple-choice grading and versioned project completeness feedback exist. There is no capacity rubric, server-validated graph/run evidence, causal investigation assessment or Studio skill-evidence model.                                                                                                                                                              |

### Missing

| Finding                                        | Evidence of absence and required behavior                                                                                                                                                                                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requirements workshop and capacity calculator  | No corresponding route, component, module, content seed, RPC, formula model or test found. Need explicit functional/nonfunctional requirements, assumptions, units and reproducible derived estimates.                                                                     |
| Architecture editor and modes                  | Tracked route/component inventory has no graph editor, graph schema or editor dependency. Guided/Sandbox/Challenge modes, spacious canvas, searchable picker, collapsible side panels and inspector are roadmap items. The isolated JavaScript runner is a different tool. |
| Traffic/cache simulator and trace viewer       | No event model, queues, cache state, simulation worker or request trace implementation found. Homepage example output is a static fixture, explicitly labelled as such.                                                                                                    |
| Failures, observability and comparisons        | Existing application health/logging is operational infrastructure, not learner-simulated metrics/events or design comparison. No failure experiments or architecture comparison exists.                                                                                    |
| System-design course and AI/assessment content | No system-design seed or scenario definitions. No networking/data/reliability/AI-architecture teaching sequence, scenario-specific coaching or competency rubric. The marketing AI essentials/web development cards are proposed paths, not implemented courses.           |
| Portfolio and collaboration                    | Private account JSON export is not a curated portfolio. No diagram/worksheet evidence export, reviewer grants, team membership, shared graph, concurrent editor or realtime collaboration found. Existing NX-047/NX-048/NX-050 are Deferred.                               |

Absence checks enumerated all 255 tracked files, all 24 `page.tsx`/`route.ts`
entries and all 16 migrations, and searched tracked app/components/modules/lib/
Supabase/tests for system-design, capacity-estimator, architecture-canvas,
simulation-engine and requirements-workshop terms. No matching implementation
was found. This cannot establish content in an uninspected running/hosted database.

### Blocked acceptance, without blocking local planning

| Acceptance activity                               | Actual constraint and next step                                                                                                                                                                                                                           |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh real-provider persistence/type verification | Docker/Supabase remain stopped by the existing preference. No live catalogue/migration state was queried. Use isolated tests now; arrange a disposable provider stack and generated-type check during implementation verification when authorised.        |
| Hosted release readiness                          | No hosted environment inspection/provisioning/deployment was requested. Environment separation, enforced CI gates, release/rollback and operational acceptance retain their existing task statuses. They do not block a local worksheet implementation.   |
| Visual match to later UI references               | No reference images have been supplied for this course. Layout assumptions are documented in [the next prompt](NEXT_IMPLEMENTATION.md); final visual matching needs those references. This is not a reason to invent a completed design or stop planning. |

No feature task was newly marked Blocked just for being future work or having
unmet implementation dependencies. No user answer is needed to finish this audit.

## Toolchain, architecture and checks

- Node `.nvmrc` **24.19.0**, npm and `package-lock.json`. Installed Next **16.3.5**
  App Router, React **19.2.8**, TypeScript **5.9.3**, Tailwind **4.3.3**, Zod
  **4.6.5**, Supabase SSR **0.12.7** / client **2.116.0**. No graph editor,
  animation, charting or global client-state package is declared.
- Next route components/actions plus domain modules and PostgreSQL RLS/RPC form
  the existing application. [BUILD_GUIDE](../BUILD_GUIDE.md) is a historical
  proposal; its `src/` layout, storage and other services are not proof of code.
  Actual source is rooted at `app/`, `components/`, `modules/`, `lib/`.
- Existing scripts include `format:check`, `lint`, `typecheck`, unit and isolated
  database checks, webpack build, public/flow/performance browser suites, plus
  separate local-provider pgTAP/type/integration checks. `check` composes the
  Docker-independent groups. Deployment is not included in the CI workflow.

Fresh lightweight checks on 2026-10-28:

```sh
node --import tsx tests/unit/security.test.ts
node --import tsx --test --test-concurrency=1 tests/database/content.test.ts tests/database/learning.test.ts tests/database/policies.test.ts
```

Both commands exited 0: **4 security cases** and **3 migration test files**
passed. Node's second command reported file-level results, so this audit does
not present three as the number of contained assertions. The existing harness
creates an in-memory PGlite database and applies existing SQL there, with Auth
shims; it does not connect to or migrate an application database. Commands used
the installed Node path and restricted CPU priority/affinity.

Final documentation gates passed: repository `npm run format:check`, 102 unique
task IDs with known acyclic dependencies and required fields, all original
IDs/statuses/criteria preserved, 58 local file links in the three new documents,
and a seven-file documentation-only change-scope check with an empty index.
`git -c core.whitespace=cr-at-eol diff --check` passed; its one-command setting
recognises the tracker's preserved CRLF terminators without changing Git config
or normalising unrelated rows. No build, app browser run, full test suite, live provider
test, external search or remote CI verification was performed in this audit.
Historical test counts above are not fresh passes. No secrets, packages, schemas,
application code or services were changed. The only source changes are planning
and task-tracking documentation; they remain uncommitted.
