# Phase 4 — local scripted tutor

The tutor is explicitly a **scripted demo**, not a live language model. It supports the three reviewed JavaScript v2 lessons with hints, explanations, different examples and reflection prompts. It does not accept free-form chat, diagnose a student's reasoning, grade exercises, or make external API calls. Each supported response links to its lesson version. Preview v1 remains usable without tutor guidance.

From the repository root, with the existing local Supabase stack:

```sh
npm run db:start
npx supabase migration up --local
TUTOR_MODE=scripted npm run dev -- --webpack
```

Sign in and open `/courses`, enrol in v2, then open an unlocked lesson. Choose a guidance option in **Lesson tutor**. Scripted mode is opt-in: unset `TUTOR_MODE`, or set it to `disabled`, to show the non-AI fallback. No credentials, new dependencies or paid services are needed. Do not reset existing learner data.

## Controls and limits

- The application verifies the session on every action; PostgreSQL derives ownership from `auth.uid()` and enforces onboarding, enrolment, prerequisites and reviewed context.
- Default demo limits: 20 requests per learner and 1,000 globally per UTC day. These are **request units, not monetary or token budgets**. The private operator policy is `tutor_private.policy`; learners cannot read or edit it.
- A transaction lock protects the combined user/global reservation. Same learner/request/intent/lesson retries count once; conflicting request reuse fails. The scripted adapter consumes one known unit, even if response delivery fails.
- Private reconciliation records measured usage once. Unknown usage retains the full reservation; invalid or contradictory measurements fail. Reconciliation uses the original UTC bucket, including across a day boundary. No public refund API exists.
- `enabled=false` in the private policy disables the RPC, including retries. `TUTOR_MODE=disabled` hides the application tutor and prevents application actions. The RPC alone returns only already-authorised lesson metadata, never a live generation or answer key.
- Tutor data contains request IDs, lesson/intent, day and unit accounting. No student chat is persisted. The later editorial/reporting slice stores exact prepared responses in private request receipts so reports can preserve them; see EDITORIAL_REPORTING_SETUP.md. Account deletion cascades request records and per-user bucket identifiers. The global aggregate retains consumed or uncertain units without an account identifier, so deletion cannot refund global allowance. Time-based retention for active accounts remains pre-beta work. Ordinary logs do not include tutor prompts or provider secrets.

## Verification commands

```sh
npm run test:tutor
npm run check
npm run test:integration
TUTOR_MODE=disabled npx playwright test --config playwright.integration.config.ts tests/integration/tutor.spec.ts
npm run db:test:local
npm run db:types:check
```

Use the documented `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` on this machine. The integration config opts into scripted mode unless `TUTOR_MODE` is explicitly supplied. Tests create disposable synthetic learners; they consume real local demo units. Do not point them at hosted environments.

## Local live tutor is a separate mode

The earlier disabled-live decision was subsequently superseded for an explicitly
opt-in local Gemini Free Tier pilot. Streaming, cancellation, signed receipts,
local token reservations and finite real-model evaluations are now implemented.
See [live setup and limits](LIVE_TUTOR_SETUP.md),
[token accounting](tutor-token-accounting.md) and
[current progress](PROGRESS.md). Scripted mode remains available without a key.

Hosted/paid operation and monetary controls remain unimplemented. NX-020–022
remain In progress for their broader dependencies and release evidence. The
current input boundary accepts guidance intents and does not assess submitted
student reasoning. Preserve the wider evaluation and independent human/pilot
requirements; these scripted checks do not establish real-model quality.
