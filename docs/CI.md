# Continuous integration

[The workflow](../.github/workflows/ci.yml) lives in this repository and runs on
pull requests and pushes to `main`. Commands, `.nvmrc` and the npm lockfile are
resolved from the repository root. Checkout and Node setup are pinned to the
official v6 tag commits resolved on 2026-10-15. Workflow permissions are read-only,
Git credentials are not persisted, and superseded runs are cancelled.

## Jobs

**Code, database and browser checks** installs the locked dependencies and
Playwright Chromium, then runs `npm run check`: formatting, ESLint, route/type
generation, unit tests, isolated migration/policy tests, production build, public
browser tests, fixture-backed account flows and production performance budgets.
The performance suite checks initial payloads, duplicate render reads and safe
on-demand loading. Timings are recorded, while deterministic bytes and behavior
gate CI. See [scope and limits](PERFORMANCE_REVIEW.md). No remote run of this new
step is claimed. PGlite auth shims and the account
HTTP fixture do not replace the real-provider integration job.

Both jobs now select standard GitHub-hosted `ubuntu-24.04` and refuse a
self-hosted environment. The ordinary check job withholds raw fixture output.

**Local Supabase integration** means Supabase local to the disposable GitHub
runner, never this computer. It reuses the existing workflow with a guarded
run-specific project, Vector disabled, full migration replay/ledger verification,
temporary receipt/deletion signing capabilities, pgTAP, full type generation and
committed-type drift checks, production build and the entire provider/browser
suite. Drift fails acceptance even after generation. Cleanup is scoped to that
run's project and retried with `always()`. No hosted project or repository
secret is required. The prepared job has now run on PR #1; current outcomes
and exact tested SHAs are recorded in the canonical handoff and provider guide.

Raw provider/SQL/assertion output is withheld. The custom reporter publishes
only case locations, outcomes and durations; it never uploads credentials,
cookies, DOM, error payloads, traces or storage state. Seven-day artifacts contain
allowlisted summaries, generated public schema declarations and masked 390/1440px
Studio screenshots only after successful acceptance. See the
[M1 provider guide](system-design/PROVIDER_ACCEPTANCE.md) for exact commands,
artifact paths, confidentiality, cleanup and remaining gates.

The integration job explicitly uses `TUTOR_MODE=scripted` and
`LIVE_TUTOR_SMOKE=false`. The real-model smoke and live-only intercepted stream UI
case are intentionally skipped there. Offline stream parser/HTTP/receipt tests
still run in the first job. The two synthetic live UI/accounting browser cases
can be run separately on a prepared local setup:

```sh
TUTOR_MODE=live LIVE_TUTOR_SMOKE=false npm run test:integration -- token-usage.spec.ts tutor-stream.spec.ts
```

That command requires the existing local live configuration and receipt setup
described in [the live tutor guide](LIVE_TUTOR_SETUP.md). It does not call a
provider. Normal CI does not need a provider key and does not run real-model
evaluations.

## Local equivalents

The current user boundary prohibits starting local services or downloading
container images. Prepare and inspect CI locally; execute provider acceptance
only in the GitHub-hosted job. The historical local commands below describe
existing tooling, not permission to start it on this computer.

Use Node from `.nvmrc`, install dependencies with `npm ci`, then run:

```sh
npx playwright install chromium
npm run check
# With the existing local Supabase running:
npm run db:test:local
npm run db:types:check
TUTOR_MODE=scripted LIVE_TUTOR_SMOKE=false npm run test:integration
```

Use `npm run db:env` only when `.env.local` is absent; it refuses to overwrite an
existing file. Apply migrations with `npx supabase migration up --local` and use
`npm run tutor:receipts:setup` after initial setup. Preserve learner records;
ordinary local verification does not require `db:reset`.

If the default Chromium executable is missing, install the version expected by
Playwright or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing compatible
Chromium executable. Some coding sandboxes need additional permission for
loopback servers, Docker, Chromium and Next's build subprocesses. Local results
must state any such execution limitations.

## Release limits

Historical verification on **2026-10-19**: [Actions run 39126051992](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/39126051992)
passed on commit `e88b7e54ca475c7d07e5d8244fd22fa9ecdb7c57`.
Both **Code, database and browser checks** and **Local Supabase integration**
completed successfully. Every integration-job step passed, including fresh-runner
database setup, receipt provisioning, pgTAP, type drift, production build,
integration tests and cleanup. The exact commit's check-runs API independently
reports both jobs successful. This supersedes the failed run on `402e6a5` as the
most recent recorded historical CI result; it does not verify M1. The earlier
failure's root cause remains unknown. No
application/workflow fix or additional test run was needed for this verification.

Required-check enforcement remains unverified. The unauthenticated
branch-protection API returns 401; public branch-rule and ruleset endpoints return
empty lists, which do not establish the classic branch-protection settings.
Automatic approval review rejected a noninteractive Git credential lookup because
credential-source access was not specifically authorised. No credentials were
retrieved by that command and no remote settings changed. Configuring the two
required checks below needs approval to use existing GitHub authentication with
admin access, or an owner change in GitHub settings. Preserve existing rules.
NX-036 remains In progress until failed checks are verified to block release.
The workflow has no deployment or hosted migration step.

## M1 preparation and publication boundary — 2026-10-31

Preparation was committed through `0ab4ce2`. On 1 November the user authorised
publication; `ci/studio-m1-provider-acceptance` is now open as PR #1 to `main`.
A branch push without a PR does not trigger the current workflow. No merge,
deployment, production migration, billing change or local service startup is
included. Follow actual outcomes in the canonical handoff; prepared workflows
and successful partial stages are not combined acceptance.

The source configuration supports this job; account-side action policies,
runner availability and artifact upload have been exercised by the first PR run.
Authenticated Actions policy permits the pinned actions. Billing allowance was
not accessed or changed; this public repository uses standard hosted runners.
Check owner/organisation Settings → Billing → Usage and Budgets and alerts
before authorising execution. Public standard hosted compute is free; private
usage draws from the owner's allowance and may incur overage; artifacts consume
storage. The 15/35-minute job caps bound one attempt to about 50 total runner
minutes. No cost guarantee is made. See
[GitHub billing](https://docs.github.com/en/actions/concepts/billing-and-usage)
and [budget controls](https://docs.github.com/en/billing/how-tos/set-up-budgets).
No additional repository secrets are required; permissions remain contents: read.

## M1 acceptance result — 2026-11-01

Both required jobs passed in
[run 41295135451](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/41295135451)
on PR #1 for code head `764cff52e1bedc18b43269533935f55ec5aefa4b` (tested PR
merge `56b441cc222043a76b9639d90a5cbf705087d5a3`). Actual provider evidence:
17 migrations through `202610290001`, preserved legacy-JS fixture, 68 pgTAP
assertions/four files, full public-schema type equality/no drift, build and
15 provider browser cases passed, with two deliberate live-only skips. All
normal application/performance gates passed. Scoped cleanup/inventory checks
passed and masked desktop/mobile images were reviewed. See
[the seven-day artifact](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/41295135451/artifacts/13078779714)
and the canonical handoff. Evidence/status documentation is published in a
separate follow-up and receives normal PR checks; no checks are bypassed.

NX-046.2/.4 are Completed. No local heavy services, real database access,
production migration, billing change, merge or deployment occurred. This result
does not change required-check enforcement or other launch gates, which remain
separate. No source type weakening, Axe exclusion or budget relaxation was used.

## Required checks to configure with authenticated admin access

For `main`, preserve any existing rule and other required checks. Enable
**Require status checks to pass before merging** and add the exact job names
from the current workflow:

- `Code, database and browser checks`
- `Local Supabase integration`

Select GitHub Actions as the expected source where available. This does not
bypass a failed job; resolve integration before claiming the release gate passes.
GitHub requires a successful recent check before it can be selected in some
settings. See [protected branch behavior](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
and [required-check troubleshooting](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).
No setting was changed in this session. Configure only these requested checks;
broader environment separation, release/rollback, backups and launch gates stay
separate work.

## Foundations preparation — 2026-11-01

The separate, uncommitted foundations branch extends the existing disposable
provider gate to migration `202611010001`, two mandatory foundations browser
cases, 24 prepared pgTAP assertions and masked 390px/1440px foundations artifacts.
The M1 gates, hosted-only boundary, synthetic-data policy and cleanup remain
required. No workflow was triggered for these edits and no acceptance is claimed.
See [foundations evidence and limits](system-design/FOUNDATIONS.md).

## Foundations acceptance — 2026-11-05

Both jobs passed in [run 41889906663](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/41889906663) on stacked
[PR #2](https://github.com/Mohammadhasan14/Nexus_learning_platform/pull/2). Provider evidence includes 18 migrations, full
types/no drift, 104 pgTAP assertions and 17 browser passes/two intentional skips.
The quality job keeps package.json's same nine check gates in the same order,
now printing a fixed pass/fail label and job-summary row for each gate while
deleting raw fixture output. Run 41888096350's old aggregate failure has no
recoverable gate detail; no cause is inferred. Runners, timeouts, read-only
permissions and performance budgets are unchanged. Retarget/reverify after M1
merges. See [full evidence and limits](system-design/FOUNDATIONS.md).

## Sanitized application browser diagnostics — 2026-11-08

Fixture flows and performance retain all existing assertions and gates. CI selects
`tests/support/application-reporter.ts` and turns off traces for those commands.
It uploads only `test-results/application-report/{flows,performance}.json` for
seven days under `application-browser-<run>-<attempt>`. Each case contains a source
basename/line, status, expected status and duration; failures add only a fixed kind,
allowlisted public Axe rule IDs and matching test-source coordinates. Raw errors,
stdout, private titles, selectors, DOM, attachments, traces, cookies and Auth
state are excluded. The provider artifact policy is unchanged. This diagnoses
failures previously hidden by the aggregate wrapper; it does not replace actual
provider acceptance or weaken checks.
