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

Adding this workflow does not execute GitHub Actions until these files are
committed and pushed. Remote job execution, required status checks and branch
protection remain unverified. The workflow has no deployment or hosted migration
step. NX-036 remains In progress; environment separation, controlled release,
rollback, backups and the other launch gates remain separate work.
