# M1 provider acceptance on GitHub-hosted CI

Prepared on 31 October 2026 from clean `34b95e8`. This guide is not a tracker;
statuses remain in `../features.csv` and the handoff in `../PROGRESS.md`.
**Prepared, not executed: NX-046.2 and NX-046.4 remain In review.**

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
It omits error/assertion values, titles, stdout/stderr, source, DOM, attachments
and Auth storage. Traces, videos and automatic screenshots are off. This
deliberately omits raw failure messages: use stage/file/line and reviewed schema
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

Preparation remains uncommitted on local `main` at `34b95e8`. After a separate
publication instruction, create a review branch such as
`ci/studio-m1-provider-acceptance` from that HEAD plus these edits and open a PR
to `main`. **Pushing that branch alone does not trigger this workflow**; opening
or updating its PR does. A push to `main` also triggers both jobs. No branch,
commit, push, PR or remote workflow is created during this preparation.

Include together: `.github/workflows/ci.yml`, `package.json`,
`playwright.integration.config.ts`, `scripts/ci-provider-{acceptance,policy}.ts`,
`tests/support/provider-reporter.ts`, `tests/unit/ci-provider.test.ts`, masked
captures in `tests/integration/system-design.spec.ts`, and the canonical tracker,
handoff and relevant CI/decision/implementation/provider documentation. Exclude
ignored artifacts, environment files and generated credentials.

## Remaining gate

No remote migration, full provider types/drift, pgTAP, browser result or new
screenshot is claimed. Local lightweight checks are recorded in the handoff.
Real cookie-session loss and expired-cookie refresh do not establish forced
provider-side JWT expiry/revocation. Physical-device/screen-reader acceptance
also remains separate.

NX-046.2/.4 stay In review and M1 deployment stays blocked until actual provider
criteria pass and evidence is reviewed. Independent foundations work may be
separately authorised while this gate remains open. NX-046.22 is still Deferred;
no foundations/editor/simulation/AI implementation begins in this preparation.
