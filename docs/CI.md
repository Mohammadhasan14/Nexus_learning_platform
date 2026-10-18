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
browser tests and fixture-backed account flows. PGlite auth shims and the account
HTTP fixture do not replace the real-provider integration job.

**Local Supabase integration** starts an ephemeral Docker-backed stack, resets
only that runner's local database, creates ignored local configuration, provisions
a temporary receipt signing capability, runs pgTAP and generated-type checks,
builds the app and runs the integration suite. Receipt setup lets the token
accounting RPC regression execute on a fresh runner. Cleanup runs even when an
earlier step fails. No hosted project or repository secret is required.
The integration command now includes Playwright's `list,github` reporters so a
future failing run can expose the failing test location in check annotations,
as well as detailed runner logs. This diagnostic change has not been pushed or
verified remotely.

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

The first remote run is now verified on commit `402e6a5`:
[Actions run 38935858138](https://github.com/Mohammadhasan14/Nexus_learning_platform/actions/runs/38935858138).
**Code, database and browser checks passed. Local Supabase integration failed**
at `npm run test:integration`; setup, receipt provisioning, pgTAP, type drift and
production build passed, and cleanup completed. The public failure annotation
only says exit code 1. The detailed log API returns 403 (admin access required),
and branch-protection API returns 401 (authentication required). No authenticated
GitHub admin client is configured here, so neither the failing test nor existing
branch rules can be inferred from those responses. Do not claim CI is green or
that protection is absent.

After inspecting the failure log, fix the identified test/root cause, commit and
push the reviewed changes yourself, then verify a new run on its exact SHA.
Re-running the local suite against the existing development stack is useful
but is not a fresh-runner or GitHub reproduction. The workflow has no deployment
or hosted migration step. NX-036 remains In progress.

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
