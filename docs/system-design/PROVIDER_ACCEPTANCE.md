# M1 provider acceptance on GitHub-hosted CI

Prepared on 31 October 2026 from clean `34b95e8`. This guide is not a tracker;
statuses remain in `../features.csv` and the handoff in `../PROGRESS.md`.
Remote acceptance passed on 1 November. NX-046.2 and NX-046.4 are Completed
on actual reviewed evidence; deployment and merge remain unauthorised.

## Actual remote evidence — 1 November

[PR #1](https://github.com/Mohammadhasan14/Nexus_learning_platform/pull/1) is open.
Authenticated inspection confirmed Actions/write access and no configured
webhooks, environments, deployment history or external status contexts. The
source workflow has only hosted checks; no connected deployment trigger was
found. No merge, deployment or billing change is authorised or performed.

**Accepted run:**
[41295135451](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/41295135451),
both jobs successful. Code head `764cff52e1bedc18b43269533935f55ec5aefa4b`
was checked out as PR merge `56b441cc222043a76b9639d90a5cbf705087d5a3`.
The report records `accepted: true`, all 17 migrations through `202610290001`,
legacy-JS upgrade preservation, 68 pgTAP assertions/four files, full generated
public-schema equality/drift and build. Browser acceptance was **15 passed,
two intentional live-only skips**, with no required case skipped. The separate
application job passed all normal quality, fixture and performance gates.
All scoped cleanup and empty container/volume/network checks passed.

[Sanitised artifact](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/41295135451/artifacts/13078779714)
and ignored local copies under
`test-results/verification/studio-provider-remote/studio-m1-provider-41295135451-1/`
contain accepted JSON reports, generated schema and reviewed 390/1440px masked
screenshots. The captures follow the Studio populated-query Escape/focus-return
regression and retain the established layout. No type/schema source change was
needed. A documentation-only follow-up publishes these facts and receives the
normal PR checks; exact current-head status is visible on the PR.

### Earlier failures and focused fixes

Initial [run 41292861327](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/41292861327)
tested branch head `825abb6` via merge
`de8d327adf0cff09cea8fd7abc1d0d41f9ed62de`. The application job passed. Provider
replay/legacy-JS preservation, the complete 17-version ledger through
`202610290001`, 68 pgTAP assertions in four files, full provider public-schema
generation/drift, build and all scoped cleanup/inventory checks passed.
Generated declarations match committed types byte for byte (SHA-256
`07c9424d65695e0b2a43ccf509d2ec523270aa90cccc78f5ded6b07c9f06aaef`). Browser
results were 14 passed, one notes/search failure and two explicit live-only
skips. Both Studio journeys and signed password-confirmed deletion passed.
Overall acceptance remained false and screenshots were withheld.

Sanitised first-run artifacts are preserved under
`test-results/verification/studio-provider-remote/studio-m1-provider-41292861327-1/`.
The focused follow-up `d7542a9` waits for streamed page headings before keyboard/
Axe audits in notes/search and outcomes, without disabling any accessibility
rule. The reporter now adds only public rule IDs/test-source locations; its
private-payload canary test passes. Follow-up
[run 41293665342](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/41293665342)
then exposed a stale toolbar-focus assertion. It now checks the actual opener
and separate button invocation. Run `41294245258` exposed the same loading-shell
race in editorial and a real populated-search Escape defect. The small dialog
handler fix closes on Escape without clearing the query or losing opener focus,
while preserving composition. Equivalent project/review audit readiness was
corrected too. No Axe rule, keyboard assertion or performance budget was removed.
The accepted run above verifies these fixes together.

## Initial publication access blocker — resolved

The user now authorises publishing and running the prepared branch; the earlier
no-publication restriction below describes the preparation session. Local branch
`ci/studio-m1-provider-acceptance` was created from committed `0ab4ce2`. The
workspace began clean, all M1 dependencies were included, and the diff excludes
environment files and generated artifacts. Publication was initially blocked because the
workspace GitHub sign-in helper returned no usable credentials and the SSH agent
had no loaded identity. The user restored GitHub sign-in; publication and remote
execution are recorded above.

No deployment workflow/configuration was found. Public deployment/environment
and external-status lists are empty, but private repository hooks require
authentication (401). Authenticated inspection subsequently returned empty hook,
environment and deployment lists. Deployment remains unauthorised.

Historical run
[41106596305](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/41106596305)
tested remote `main` at `b69e40be1a4e2ff34bbd564af175b7b1294114ac`, not this
prepared workflow. Both jobs failed. Provider reset, pgTAP, type check, build
and stop steps reported success, while integration failed; no artifacts are
available. Sanitised public annotations identify `page-has-heading-one` at
notes-search line 229 and outcomes line 148. Detailed counts/DOM captures for
that historical run are unavailable; current acceptance is established above.

## Execution boundary

The user superseded temporary local-Docker authorisation with a remote-CI-only
instruction. Do not start Docker, a temporary daemon, Supabase or heavy local
services, and do not download images onto their computer. The interrupted
resource inspection started no services and changed no databases/configuration.
No hosted/shared Supabase project, real learner, production secret or deployment
is part of this approach. Do not commit, push or trigger CI during preparation.

Reuse `.github/workflows/ci.yml` and its existing `local-supabase` job. “Local”
means Supabase inside the disposable **GitHub-hosted** VM, not this computer.
Both jobs use standard `ubuntu-24.04` and reject non-GitHub-hosted execution.
The provider wrapper also validates Linux, workspace, run ID/attempt and SHA
before any service command. It refuses ordinary local invocation.

## Remote jobs

**Code, database and browser checks** retains `npm run check`: formatting, lint,
types, units, isolated database checks, build, public/fixture browser flows and
unchanged performance budgets. Raw fixture output is withheld. This independent
job has a 15-minute cap and is not proof of provider acceptance.

**Local Supabase integration** reuses the locked CLI/dependencies and Chromium,
with a 35-minute cap. `scripts/ci-provider-acceptance.ts` prepares:

1. Fresh-checkout guards: no environment files, linked Supabase state or previous
   acceptance output. Create a run-specific project/private temporary directory;
   change only the runner's disposable config and disable analytics.
2. Start PostgreSQL 17, Auth, PostgREST, gateway, Mailpit and metadata tooling.
   Exclude Vector/logflare, Studio, edge runtime, realtime, storage, imgproxy and
   the pooler. Use the runner's Docker runtime, with no custom daemon or hosted
   Supabase project.
3. Replay the pre-Studio chain with `db reset --local --version` **only on that
   fresh project**. Insert a synthetic SQL JavaScript learner/enrolment/read
   fixture, apply the Studio migration with `migration up --local`, and verify
   those legacy records survive. This is an SQL upgrade fixture, distinct from
   real Auth/browser tests. Compare the full ledger with tracked migrations
   through `202610290001`, then repeat `migration up --local`. Never reset an
   existing database. Later migration files require a scope review first.
4. Generate temporary local configuration and synthetic-test receipt/deletion
   signing capabilities using the existing setup scripts. Run all pgTAP files,
   including the 33 prepared Studio assertions.
5. Check the committed full database types **before** generation; generate full
   public-schema types using `db:types`, compare original/generated hashes, then
   repeat `db:types:check`. Drift keeps acceptance failed even after successful
   regeneration. The isolated catalog generator is not provider evidence.
6. Build using generated types and run the complete integration suite (currently
   17 cases in 15 files). The tutor remains scripted, with no AI key/model call.
   Only the explicit live-model and live-only stream UI cases may skip. Required
   Studio/privacy/Auth/token-accounting/JavaScript checks cannot pass by skipping.
7. Stop only the run-specific project with `--no-backup`, inspect its labelled
   containers/volumes/networks, remove generated secrets and raw browser failure
   contexts, and restore checkout configuration. An `always()` step retries
   cleanup. Never prune shared resources or delete pre-existing images. GitHub
   discards the entire ephemeral runner VM/image cache after the job.

The wrapper can gather further evidence after pgTAP/drift failures, but every
failed stage keeps acceptance failed. Cancellation, missing evidence or failed
cleanup cannot pass. No workflow step updates task statuses or commits files.

## Reports and confidentiality

Raw CLI/Auth/SQL/build/browser output is captured in memory and discarded,
never printed or uploaded. Only fixed stage labels/outcomes are logged. Child
processes receive an allowlisted environment, excluding inherited hosted URLs,
database credentials, Supabase access tokens, GitHub tokens and remote Docker
contexts. Backend keys originate only from the fresh loopback CLI project.
No Supabase login/link, `db push` or production/repository secret is used.

`tests/support/provider-reporter.ts` records only file/line, statuses and duration.
It omits error/assertion values, titles, stdout/stderr, source text, DOM, attachments
and Auth storage. Traces, videos and automatic screenshots are off. This
deliberately omits raw failure messages: use stage/file/line, allowlisted public
accessibility rule IDs and reviewed schema
declarations to investigate, without turning on secret-bearing verbose output.

One artifact, `studio-m1-provider-<run>-<attempt>`, has **seven-day retention**.
Five exact paths are uploaded, with no recursive test-results glob:

- `acceptance.json`: commit/run identity, actual migration ledger, stage results,
  type hashes/drift, available pgTAP counts and overall acceptance.
- `browser.json`: allowlisted case outcomes if the reporter was reached.
- `public-schema.types.ts`: actual generated schema declarations, without rows,
  dumps or secrets. Review genuine drift in a later authorised step; do not
  weaken types to make the gate green.
- `workshop-390.png` and `workshop-1440.png`: only after every provider, drift,
  browser and cleanup gate passes. Capture the known synthetic workshop after
  its JS regression, masking editable values/private preformatted content. The
  learner shell exposes no account email or token/cookie value.

Other screenshots, `.env*`, logs, storage state, dumps, traces, failure contexts,
`.next` and hidden files are excluded. Upload is pinned to reviewed
`actions/upload-artifact` v7.0.0 SHA
`bbbca2ddaa5d8feaa63e36b76fdaad77386f024f`. An artifact alone is not acceptance:
inspect `acceptance.json` and both job conclusions. Missing reports identify
gates not reached. Synthetic screenshots are not physical-device evidence.

## Repository support, permissions and cost

The repository has both jobs, Node 24/locked dependencies, Chromium, migrations,
types tooling and synthetic provider suites. Existing triggers stay **pull
requests** and **pushes to main**. No dispatch/self-hosted/deployment/billing
action is added. `contents: read` plus the automatic scoped artifact capability
suffice; no PAT, Supabase/AI credential or additional secret is requested.
Checkout still disables persisted credentials. Actions and hosted runners must
be enabled and policies must allow the pinned checkout/setup-node/upload-artifact
actions; fork PRs may require ordinary workflow approval. These account-side
settings and current runner/allowance availability remain unverified.

The 15/35-minute caps bound one attempt to about **50 total runner minutes**,
not a prediction of charges. Retries consume more time. Public standard hosted
compute is free; private usage draws from the owner's included allowance and
can incur overage. Artifacts also use storage. Before authorising execution,
the owner should inspect account/organisation **Settings → Billing → Usage**
and **Budgets and alerts**, including hard-stop settings, plus repository
**Settings → Actions → General**. No visibility, allowance, billing method or
budget was accessed or changed here. An alert alone need not block spending.

Primary references checked:
[Actions billing](https://docs.github.com/en/actions/concepts/billing-and-usage),
[included allowances](https://docs.github.com/en/billing/reference/product-usage-included),
[budget controls](https://docs.github.com/en/billing/how-tos/set-up-budgets),
[hosted runners](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job),
[artifact release](https://github.com/actions/upload-artifact/releases/tag/v7.0.0).

## Exact publication boundary

Preparation was committed through `0ab4ce2`. The authorised review branch
`ci/studio-m1-provider-acceptance` is now published as PR #1 to `main`.
**Pushing a branch alone does not trigger this workflow**; opening or updating
its PR does. A push to `main` also triggers both jobs. Focused M1/CI follow-ups
are authorised. Do not merge, deploy, change billing or begin foundations.
See the canonical handoff for the exact current head and tested merge SHAs.

Include together: `.github/workflows/ci.yml`, `package.json`,
`playwright.integration.config.ts`, `scripts/ci-provider-{acceptance,policy}.ts`,
`tests/support/provider-reporter.ts`, `tests/unit/ci-provider.test.ts`, masked
captures in `tests/integration/system-design.spec.ts`, and the canonical tracker,
handoff and relevant CI/decision/implementation/provider documentation. Exclude
ignored artifacts, environment files and generated credentials.

## Remaining limits and stopping point

Combined M1 provider acceptance passed. Local lightweight checks and remote
evidence are recorded in the handoff; no heavy local service/suite was started.
Real cookie-session loss and expired-cookie refresh do not establish forced
provider-side JWT expiry/revocation. Physical-device/screen-reader acceptance
also remains separate.

NX-046.1–4 are Completed; broader NX-046 remains In progress and NX-046.22 is
Deferred. This proves the disposable local-provider stack on GitHub, not managed
or production Supabase, release readiness or deployment. No merge/deployment or
foundations/editor/simulation/AI implementation is authorised by acceptance.

## Foundations branch preparation — 2026-11-01

The uncommitted first-lesson branch adds migration `202611010001` after verified
M1 `202610290001`, a 24-assertion pgTAP file and two required provider/browser
journeys in `tests/integration/foundations.spec.ts`. The hosted wrapper's explicit
migration scope and browser acceptance list include them while retaining all M1
requirements. Successful hosted acceptance will additionally preserve masked
`foundations-390.png` and `foundations-1440.png` via the existing fixed seven-day
artifact allowlist. No services/workflows were started. This is preparation, not
a passed provider run. Full new-schema generation/drift, upgrade, Auth/browser,
Axe, screenshots and cleanup remain pending. See [FOUNDATIONS.md](FOUNDATIONS.md).
