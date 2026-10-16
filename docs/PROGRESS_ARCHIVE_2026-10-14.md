# Archived progress through 2026-10-14

This is the previous handoff, preserved as historical context. Its staging splits, stop instructions, usage telemetry and paths describe earlier sessions. Use [current progress](PROGRESS.md) before resuming work.

# Progress

Current state: **NX-022.3 streaming/receipt/adversarial regression Completed; ready for owner review** (2026-10-13). Read this file, `features.csv` and `DECISIONS.md` before resuming. Preserve user changes and the staging split. Do not commit, push, deploy or provision paid services without instruction.

## Delivered

- **NX-022.3 Completed:** 18 synthetic stream outcomes over all four intents (72 combinations), adversarial reference/structured-output boundaries, actual loopback HTTP abort/deadline propagation without retry, prepared receipt/unknown-charge composition and disconnect racing saved receipt recovery. Browser hostile markup is inert text with a trusted source; cancellation, fallback, accessibility and grading remain available.
- Added `npm run eval:tutor:streams` and included the new checks in existing unit/database/tutor scripts. See [repository regression guide](../tests/evaluations/streaming-regressions.md) and [verification (local archive)](README.md#historical-evidence). Corrected stale non-streaming evaluation documentation while preserving all earlier reviewed real-model reports.
- No application feature/endpoint contract, dependency, framework, credential or schema change. No external provider calls, hosted/paid activation or learner promotion. Tests use clearly labelled synthetic data; disposable local learners are removed.
- Canonical CSV retains **53 original tasks plus 23 children: 48 Completed, 9 In progress, 8 Pending, 11 Deferred**. Original task IDs/acceptance criteria/dependencies remain. NX-022 parent remains partial for broader actual-model/learner evidence and the missing submitted-reasoning input contract; this is not full AI or release-readiness completion.

## Verification

Passed: formatting, lint, typecheck, production build outside the sandbox, **31 unit tests and 30 isolated database tests**, two real-local/synthetic browser cases. The matrix includes success, cumulative usage-only tail, missing/forged/malformed counts, provider errors, safety, non-STOP/truncation/late output, candidate mismatch, flooding and output bounds. Real loopback tests confirm one HTTP request and no final measurement after cancel/deadline. Database composition tests confirm eight prepared receipts retain unknown charges and a save/disconnect race remains recoverable without duplicate refund.

Browser keyboard, reduced motion, axe zero violations and no overflow at **320/768/1440** pass. Mobile/desktop adversarial screenshots visually reviewed. Source/browser/evidence credential scan found no actual provider/signing key or Base64 form; `.env.local` is ignored and `.env.example` is the only Git-visible dotenv file. Exact scan scope is in [checks.json (local archive)](README.md#historical-evidence). No fresh GitHub history/remote artifact audit or remote CI. The initial new fixture's missing intent was caught by type checking and corrected before final verification.

Tests use synthetic transport and an isolated DB with auth shims; loopback HTTP is not the full hosted Next/proxy route or provider cancellation billing evidence. Browser output fixtures are not real-model injection/accuracy evaluation. Earlier real-model reports and scripted/disabled checks remain separately dated; no new semantic matrix or independent human review was run. Unrelated browser suites were not repeated.

## Run and review

From `nexus_learning_platform/`:

```sh
npm run eval:tutor:streams
# Requires existing local Supabase, receipt setup and production build:
TUTOR_MODE=live npm run test:integration -- token-usage.spec.ts tutor-stream.spec.ts
npm run dev
```

The offline command requires Node 24 and loopback server access, but no provider key or Docker. Browser tests require Docker-backed local services and use disposable learners. No DB reset or configuration change is needed. Normal app preview remains an unlocked JavaScript v2 lesson and its Lesson tutor; this slice adds regression coverage rather than a new learner screen.

## Git and staging

The user committed documentation as `e623ef9`, fixture matrix as `a3e17e8`, and unit/HTTP regressions as `779a3cd`. On 2026-10-14 the index was empty with five remaining files. User requested 40% staging. **Staged:** `tests/database/tutor-resilience.test.ts` and `package.json`, two of five remaining files (40% by file count). This cohesive group adds receipt/database race tests and wires the already committed unit suite plus these DB tests into verification scripts. Three files remain unstaged/untracked: evaluation README, streaming browser regression and regression guide. Index whitespace check passed; no credentials/environment files included. Commit message: `test: add tutor receipt race coverage and wire resilience checks`.

No assistant commit, push or new implementation/testing in this staging request. Root tracking, decisions and verification remain outside app Git; spreadsheets do not synchronise automatically.

## Remaining and next action

**Stop for owner review.** Proposed next slice: separately expand the real-model fixed evaluation matrix for ambiguity/adversarial/language cases, preserving clear model/version metadata and actual response review. Broader independent human/pilot validation, wrong-student-reasoning input, hosted disconnects, monetary/paid controls, other providers, NX-016 runner and Phase 6 remain open. Do not start another slice or activate paid/hosted AI without instruction.

Stop at **10% remaining (90% used)** of the five-hour allowance. Latest observed telemetry: **18% used at 2026-10-13T18:16:01.401Z**; obtain a fresh reading on resume.

## Previous delivered slice

- **NX-021.3 Completed:** atomic local owner/global live token reservations, request-denial rollback, HMAC-bound final usage reconciliation once on the original UTC day, conservative unknown/cancelled charges, full overrun debt with an admission pause, owned usage UI and account-deletion semantics. Defaults remain 65,536/request, 250,000/learner/day and 5,000,000/global/day.
- Finished the repository [operator/setup guide](tutor-token-accounting.md), updated app README and [live setup](LIVE_TUTOR_SETUP.md), and recorded the acceptance evidence and limits in [verification (local archive)](README.md#historical-evidence). No dependency upgrade, new app, provider key change or DB reset.
- The user committed all implementation groups through `3d57464`. This handoff adds only app README and the repository operator guide, both unstaged. Root planning/tracking and verification files are outside app Git; spreadsheets do not synchronise automatically.
- Canonical CSV retains **53 original tasks plus 22 children: 47 Completed, 9 In progress, 8 Pending, 11 Deferred**. Original task IDs/acceptance criteria/dependencies remain intact. NX-021 parent remains partial for build-guide currency/paid/hosted controls; the broader AI backlog is not complete.

## Verification

Passed on the committed implementation: formatting, lint, typecheck, production build, **27 unit tests and 28 isolated database tests**; local generated-type drift check; all five local accounting function bodies match the migration. Two live-mode local RPC/synthetic browser cases and one scripted plus one disabled browser regression pass. The latter commands each skip the opt-in real-provider smoke because its flag is unset.

Visually reviewed saved screenshots at **320/768/1440**. The earlier real run and current synthetic UI test record axe/overflow, keyboard and reduced-motion checks. Actual provider evidence is preserved from **2026-10-11T18:21:52.815Z**: 587 input + 131 response = **718 tokens**, charged 66,254 including an earlier unknown reservation. No new Gemini calls were made for this handoff. Tests use disposable local learners and remove them; conservative global charges remain by design.

Actual provider/signing keys and Base64 forms are absent from the checked source/browser/evidence files; `.env.local` is ignored, and `.env.example` is the only Git-visible dotenv file. See exact scan counts and results in [checks.json (local archive)](README.md#historical-evidence). No fresh GitHub history/remote artifact audit, remote CI, hosted-disconnect test, real-provider cancellation cost test or unrelated public/project/editorial browser suite was run. Broader independent human/pilot quality evidence remains open.

The first sandbox build failed because Next's detached TypeScript subprocess captured no configuration output; the same production build passed outside the sandbox without code/compiler changes. A temporary scanner's Git subprocess was also restricted; using a shell-provided manifest completed the read-only scan. Both limitations are recorded rather than counted as successful attempts.

## Run and review

From `nexus_learning_platform/`:

```sh
npm run db:start
npx supabase migration up --local
npm run tutor:receipts:setup
npm run dev
```

The local migration and signing key already exist; no reset is needed. Restart dev, sign in and open an unlocked **JavaScript foundations v2** lesson. Use **Lesson tutor → Ask lesson tutor**, then review reported usage and remaining daily tokens. Cancel/recover retains single-use behavior; choosing another guidance option creates a new request. Reading and protected grading work when AI allowance is exhausted, paused or disabled. See the setup guide for exact offline checks and operator inspection.

## Remaining and next action

**Stop for owner review of this completed local slice.** Proposed next work: expand **NX-022** fixed streaming/disconnect/adversarial evaluation, preserving broader uncertainty/submitted-reasoning and human/pilot requirements. No new submitted-reasoning input exists yet. Paid/hosted/currency controls, other provider adapters, NX-016 isolated runner and Phase 6 remain pending. Do not start another slice or provision paid/hosted AI without instruction.

## Git and usage

Started clean at `3d57464`; no staging, assistant commit, push or public deployment in this handoff. App documentation changes remain unstaged. Workspace documentation/verification is outside the app Git repository. All local credentials were preserved and never displayed.

Stop at **10% remaining (90% used)** of the five-hour allowance. Latest observed telemetry: **10% used at 2026-10-13T17:54:29.797Z**. Check a fresh reading next session; do not reuse this historical value.

## Previous completed slice

## Delivered

- **NX-020.2 Completed:** authenticated local Gemini streaming with bounded reviewed context, traceable sources and labelled incomplete text. Cancel aborts transport and discards partial output; timeout/provider failure returns prepared guidance. No automatic provider retries.
- Private immutable completion receipts use a separate server HMAC capability tied to authenticated owner/request/source. Learners cannot forge response quotes or read receipt keys. Completed replies can be recovered without another quota claim/provider call and reported with the exact saved response.
- Existing shared request-unit caps and conservative uncertain charges remain. No service-role app key, new dependency, framework upgrade or real learner-account change. Additive migration applied locally without reset; ignored local signing key configured with credentials never displayed.

Before NX-021.3, the canonical CSV retained **53 original tasks plus 21 children: 46 Completed, 9 In progress, 8 Pending, 11 Deferred**. Spreadsheet and CSV are not synchronised. NX-020 parent remains In progress for broader dependency/release readiness; NX-021/NX-022 are partial. Prior work is preserved.

## Verification

Passed: formatting, lint, typecheck, production build, generated local schema/type drift check, **21 unit tests and 24 database tests**. Chromium passed actual Gemini completion, saved receipt/report exactness, cached recovery and single-use claims. Synthetic UI checks passed cancellation, interrupted-output removal, fallback, unsaved notices, anonymous/foreign-origin/locked-lesson/input checks. Scripted and disabled tutor regressions passed. Keyboard, reduced motion, axe and overflow checked at **320/768/1440**; desktop/mobile screenshots reviewed.

Initial origin mismatch was fixed against the actual Host rather than Next's normalised URL. Provider delays caused 12-second fallbacks; streaming now has a 20-second provider/35-second browser deadline. Final full lesson run returned actual `gemini:gemini-3.1-flash-lite` output. Five bounded synthetic provider dispatches in this slice: three timeouts, two completed streams; no automatic retries. See [verification and limitations (local archive)](README.md#historical-evidence) and [final live metadata (local archive)](README.md#historical-evidence).

Actual provider/signing keys and Base64 forms were absent from 200 checked source/browser-static files. `.env.local` remains ignored. No fresh GitHub history audit was performed; nothing was pushed. Unrelated public/project/editorial browser suites and remote CI were not run. Browser cancellation uses synthetic responses; transport abort/no-partial-receipt is verified in unit tests. Hosted proxy/disconnect behavior remains unverified.

## Run and review

From `nexus_learning_platform/`, restart **`npm run dev`** to load the new local signing key/build. Sign in, open an unlocked **JavaScript foundations v2** lesson and use **Lesson tutor → Ask lesson tutor**. While receiving: **Cancel guidance**. After interruption: **Recover saved reply** (same request; never duplicate AI dispatch). Completed receipts expose **Report this tutor response**. See [local setup](LIVE_TUTOR_SETUP.md).

The migration/key are already configured locally. On a fresh local DB: `npx supabase migration up --local`, `npm run tutor:receipts:setup`, then restart dev. Setup requires the same Docker access as local Supabase. Keep provider paid billing disabled. A missing app signing key fails before dispatch; a missing/mismatched database key shows an unsaved warning and disables exact-response reporting until repaired.

## Remaining / next action

**Stop for owner review of this slice.** Proposed next scope: NX-021 actual token usage/accounting and trusted reconciliation while preserving conservative unknown charges and local-only operation; separately extend NX-022 streaming/disconnect/adversarial evaluation evidence. Paid/hosted controls, independent human/pilot validation, other providers, free-form reasoning/chat, broader retention/secret rotation, NX-016 runner and Phase 6 remain open. Do not claim the complete AI backlog is finished or activate paid/hosted AI without explicit scope/budget authorisation.

## Git and usage

NX-020.2 started clean at `21bef23`; the user has now committed all app changes through `9c43911`. App index/worktree verified clean on 2026-10-11. No assistant commit, push or deployment in this slice. Root planning docs and CI workflow remain outside the app Git repository. `.env.local` was updated only with the dedicated ignored signing key, preserving existing settings.

Stop at **10% remaining (90% used)** of the five-hour allowance. Latest observed usage: **6% used at 2026-10-08T15:04:14.825Z**; check fresh telemetry next session rather than reusing this historical reading.

## Prior progress, staging and audit history

Historical progress before NX-020.2 completion (preserved below). Read this file, `features.csv` and `DECISIONS.md` on resume. Preserve user changes. Do not stage, commit, push, deploy or provision paid services without instruction.

## Delivered this session

- **NX-022.2 Completed:** repeatable opt-in real Gemini evaluation runner and fixed rubric, twelve reviewed lesson/intent cases, two insufficient-context cases and two adversarial-reference cases. Default dry mode makes no provider calls; live runs are capped at sixteen, sequential, single-attempt and stop on provider failure. Unavailable/fallback/Not run cannot count as live quality passes.
- Forty-eight synthetic evaluation calls across three prompt versions: baseline **12 Pass/4 Needs changes**, v2 **14/2**, final v3 **16/0**, under AI-assisted Codex editorial review. Every reply and rationale is archived in app Git under `tests/evaluations/reports/`. No independent human or comprehensive safety claim.
- Versioned tutor prompt improves misleading assignment/const explanations, scope and insufficient-context behavior. Adapter rejects unsupported lesson IDs, invalid intents and blank/bounded context before provider I/O. Responses preserve paragraph/code line breaks as escaped text.

Canonical CSV preserves 53 originals and 20 children: **45 Completed, 9 In progress, 8 Pending, 11 Deferred**. Spreadsheet and CSV are not synchronised. Prior NX-020.1 pilot, NX-033 outcomes and other backlog remain intact.

## Verification

Passed locally: formatting, lint, typecheck, **15 unit tests**, production build and whitespace check. Existing default evaluation dry command ran with zero API calls. Three live matrices captured all sixteen actual replies each; final semantic review passed all sixteen. Screening alone did not catch the earlier explanation issues, which remain visible in archived failed runs.

Real local Supabase browser scenario passed with one further Gemini generation: concurrent single-use claims, source/quota, practice grading, keyboard and reduced motion. Axe/overflow passed at 320/768/1440; mobile/desktop screenshots visually reviewed. Temporary test learner removed. Key absent from browser assets/reports and never displayed. No migrations or real learner-account changes.

Full unrelated database/public/fixture browser suites and remote CI were not rerun. No actual token/currency accounting or model weight-revision verification. See [verification (local archive)](README.md#historical-evidence).

## Run and review

From `nexus_learning_platform/`:

```sh
npm run dev
npm run eval:tutor
# Explicit provider calls, up to 16 synthetic cases:
npm run eval:tutor -- --live
```

Refresh an unlocked JavaScript foundations v2 lesson and use Lesson tutor. The existing local Gemini/key/free-tier flags are unchanged. Evaluation reports and rubric: [app evaluation guide](../tests/evaluations/README.md). Keep paid billing disabled; `LLM_FREE_TIER_ONLY` records the operator assertion, not a billing API check. The evaluation runner consumes provider quota separately from app request reservations.

## Remaining and next action

Owner review of this slice. Proposed next implementation: **NX-020 streaming responses, cancellation and trusted saved live-response receipts**. Do not start it without instruction. **NX-021** token/currency reservations, usage reconciliation and paid/hosted controls remain partial.

**NX-022 remains In progress** against the broader build guide: no free-form reasoning input exists, so wrong-student-reasoning evaluation is not claimed; future streaming/disconnect regression requires NX-020. Wider ambiguity/adversarial/language and independent learner/human release evidence remain. The fixed sampled improvements do not guarantee future model output or prevent implicit inference of diagnostic answers from taught concepts.

NX-016 runner and Phase 6 remain unstarted. Only the bounded-intent local Gemini adapter is implemented; other provider adapters, free-form chat and hosted/paid activation remain outside this delivery. Earlier progress and staging history are [archived (local archive)](README.md#historical-evidence).

## Git and usage

Started with clean app Git through `bd22ae2`; prior staged work was committed by the user. This session's 14 changed/new app files are unstaged; no commit/push/deployment. Root `docs/` and `.github/workflows/ci.yml` remain outside app Git. `.env.local` was neither changed nor exposed this session.

Stop at **10% remaining (90% used)** of the five-hour allowance. Latest observed usage: **57% used at 2026-10-04T17:49:42.126Z**. Check fresh telemetry next session; this is a historical reading.

## Requested staging split — 2026-10-04

User requested roughly 20% staged. Rechecked an empty app Git index and 14 changed/new app files. Staged the Gemini context-validation changes, versioned tutor prompt and response text styles: 3 of 14 files (21.4% by file count). Eleven app files remain unstaged/untracked. Index whitespace check passed. No commit or push; existing implementation and evidence are preserved.

## Requested commit — 2026-10-04

User explicitly authorised committing the staged 20% group with only their authorship and no AI co-author. Created app commit `477a825` — `fix: improve tutor guidance and validate reviewed lesson context`. Verified author and committer are the user's configured `hasan` identity; the commit message contains no co-author trailer. Exactly the three staged files were committed: `app/globals.css`, `modules/tutor/gemini.ts`, `modules/tutor/prompt.ts`. Eleven remaining app files are unstaged/untracked; index is empty. No push.

## Requested staging split — 2026-10-04 (30%)

After `477a825`, rechecked an empty app Git index with 11 remaining changed/new app files. User requested approximately 30% staged. Staged the evaluation runner, fixed case/rubric definitions and evaluation unit tests: 3 of 11 files (27.3% by file count). Eight files remain unstaged/untracked. Index whitespace check passed. No new commit or push. Staged message: `test: add bounded live tutor evaluation runner and fixed cases`.

## Requested staging split — 2026-10-04 (50%)

Rechecked an empty app Git index with 8 remaining changed/new files; the earlier runner/case/unit-test group is no longer in the working diff. User requested 50% staged. Staged the evaluation guide and all three reviewed report artifacts: 4 of 8 files (50% by file count). README, tutor panel, package scripts and integration test remain unstaged. Index whitespace check passed. No new commit or push. Staged message: `test: preserve reviewed Gemini tutor evaluation results and rubric`.

## Requested staging split — 2026-10-04 (60%)

Rechecked an empty app Git index and 4 remaining modified app files; the earlier evaluation reports/guide group is no longer in the working diff. User requested approximately 60% staged. Selected the closest cohesive whole-file split: README and package scripts, 2 of 4 files (50% by file count, 11 of 16 changed lines). Tutor panel and integration test remain unstaged. Index whitespace check passed. No commit or push. Staged message: `chore: add tutor evaluation commands to checks and setup documentation`.

## Credential audit — 2026-10-04

User requested verification that environment files/secret credentials were not pushed. Refreshed GitHub origin branches/tags: `origin/main` and local HEAD match `21bef23`; app tree/index clean. Screened all 32 reachable commits / 247 blobs against the actual local Gemini key (hidden), its Base64 representation, common credential/private-key/JWT patterns and generic assignments. No actual credential matches or unexplained candidates found. Historical dotenv path audit shows only `.env.example`; `.env.local` is ignored and absent from reachable history. The template's API/publishable credential fields are empty. No source changes, staging, commit, push or rotation. [Audit scope and limitations (local archive)](README.md#historical-evidence). This does not complete the broader Phase 6 security backlog or audit inaccessible/deleted refs, forks, Actions artifacts or other repositories.

## Requested staging split — 2026-10-08

User requested approximately 20% staged. Rechecked an empty app index and 21 changed/new files. Staged the cohesive receipt foundation: private signed-receipt migration/recovery RPCs, generated public types, HMAC signing helper and pgcrypto-enabled database harness. Four of 21 files (19.0% by file count) are staged; seventeen remain unstaged/untracked. Index whitespace check passed. No secrets or .env.local staged; no commit or push. Commit message: `feat: add signed live tutor receipts and recovery RPCs`.

## Requested staging split — 2026-10-08 (next 20%)

The previous receipt foundation was committed by the user as `1da2525`. Rechecked an empty app index and seventeen remaining changed/new files. Staged the bounded Gemini streaming adapter, shared frame/event parser and reviewed-context schema export: three of seventeen files (17.6% by file count). Fourteen remain unstaged/untracked. Index whitespace check passed. No credentials staged; no commit or push. Commit message: `feat: add bounded Gemini streaming with cancellation and fallback`.

## Requested staging split — 2026-10-08 (30%)

The previous streaming adapter group was committed by the user as `32d6286`. Rechecked an empty app index and fourteen remaining changed/new files. Staged the authenticated streaming API, signed completion orchestration and their unit/database regression tests: four of fourteen files (28.6% by file count). Ten remain unstaged/untracked. The group's module/schema dependencies are already committed. Index whitespace check passed. No credentials staged; no commit or push. Commit message: `feat: add authenticated tutor streaming endpoint and receipt verification tests`.

## Requested staging split — 2026-10-08 (50%)

The previous endpoint/test group was committed by the user as `859ae52`. Rechecked an empty app index and ten remaining changed/new files. Staged the live tutor panel, panel routing, saved-response report wording, scripted-only action boundary and synthetic browser regression: five of ten files (50% by file count). README, environment template, package scripts, local receipt setup and live integration test remain unstaged/untracked. Index whitespace check passed. No credentials staged; no commit or push. Commit message: `feat: add streaming tutor UI with cancellation, recovery and response reporting`.

## Next-step review — 2026-10-11

User requested the next action. App Git is clean at `9c43911`, including all NX-020.2 groups committed by the user. Recommended next slice remains NX-021 provider-reported token accounting and atomic per-user/global token reservations with conservative reconciliation, retaining local Free Tier operation and existing request caps. Follow with broader NX-022 streaming/disconnect/adversarial checks. No new implementation, staging, commit, push or paid/hosted activation performed in this review.

## Requested staging split — 2026-10-13

Stopped at user request. Foundation is committed as `c99d541`; index was empty before this split. Staged two of twelve remaining files (16.7%, approximately 20%) as a cohesive adapter/event-schema group. These depend on the already committed usage validation foundation. Ten app files remain unstaged/untracked. Index whitespace check passed. No commit, push or continuation of implementation. Commit message: `feat: capture final Gemini token usage and validate tutor stream events`.

## Requested staging split — 2026-10-13 (40%)

Adapter/event-schema group committed by user as `df136f0`; index empty before this request, ten app files remaining. Staged four files (40%): `app/api/tutor/route.ts`, `modules/tutor/live-response.ts`, `modules/tutor/receipt.ts`, `tests/unit/tutor-usage.test.ts`. Their validation and database dependencies are already committed. Six app files remain unstaged/untracked. Reviewed staged changes and passed index whitespace check. Implementation remains stopped; no new tests, commit or push. Staged message: `feat: reconcile signed tutor token usage through the streaming API`. Unstaged message: `feat: display tutor token usage and add database and browser regressions`.

## Next-step review — 2026-10-13

App index and worktree are clean at `3d57464`; all requested groups are committed by the user. NX-021.3 remains In progress because setup/handoff documentation, screenshot review and outstanding verification are unfinished. Recommended next slice: finish those items and assess acceptance criteria, then propose broader NX-022 streaming/disconnect/adversarial evaluation. No implementation, staging, commit, push or paid/hosted activation in this review.

## Next-step review — 2026-10-14

Git remains at `3d57464`: two token-accounting documentation files staged and seven regression files unstaged/untracked. NX-022.3 is verified complete; no implementation, staging, commit, push or test/provider call in this review. Recommend preserving the two commit groups, then separately broadening the bounded real-model ambiguity/adversarial/language evaluation matrix with synthetic inputs and explicit response review. Paid/hosted activation and remaining input-contract/human/pilot requirements stay outside that slice.

## Requested staging split — 2026-10-14 (20%)

Previous documentation committed by user as `e623ef9`. Staged the independent synthetic stream fixture matrix, 136/654 changed lines (20.8%). One of seven files staged; six remain unstaged/untracked. Existing committed tutor modules satisfy its imports. Staged whitespace check passed. No commit, push or tests rerun. Message: `test: add fixed synthetic tutor streaming evaluation cases`.

## Requested staging split — 2026-10-14 (30%)

Previous fixture matrix committed by user as `a3e17e8`; index empty before request. Staged the unit streaming resilience/loopback HTTP suite, 163/518 remaining changed lines (31.5%). One of six files staged; five remain unstaged/untracked. Its helper is committed. Staged whitespace check passed; no commit, push or tests rerun. Message: `test: add tutor stream failure and HTTP cancellation regressions`.

## Requested staging split — 2026-10-14 (40%)

Previous unit/HTTP suite committed by user as `779a3cd`; index empty before request. Staged database receipt/completion-race coverage and package verification scripts, two of five files (40% by file count). Unit/helper dependencies are already committed. Evaluation README, streaming browser test and regression guide remain unstaged/untracked. Staged whitespace check passed; no commit, push or tests rerun. Message: `test: add tutor receipt race coverage and wire resilience checks`.
