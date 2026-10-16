# Current progress

Updated: **2026-10-16**. Read this file, [features.csv](features.csv) and
[DECISIONS.md](DECISIONS.md) before continuing. This repository's `docs/` is now
canonical; parent-workspace documents and the spreadsheet are legacy snapshots.

## Current implementation

The last application slice is **NX-022.3 Completed**: fixed streaming outcomes,
loopback cancellation/deadline checks, receipt/database races and inert adversarial
browser output. All previous application work is committed through `a291ca3`;
`9c07f96` committed the database/script group and `a291ca3` committed the remaining
browser/evaluation documentation group. The previous staging split is resolved.

The feature register preserves **53 original features and 23 child tasks**:
25 original features Completed, 9 In progress, 8 Pending and 11 Deferred; all
23 child tasks Completed. The combined 48 Completed count is not an effort or
release-readiness percentage. No original acceptance criteria were removed.

## Repository and CI batch — complete locally

The user authorised bringing the plan, setup documentation and CI into the app
repository, fixing links and updating the handoff. This batch imports the build
guide, feature register, decisions and setup guides. Historical evidence is kept
in an ignored local ZIP as described below.
The old progress record is retained as
[historical context](PROGRESS_ARCHIVE_2026-10-14.md).

The GitHub Actions workflow now lives at `.github/workflows/ci.yml`, uses root
paths and immutable action commits, and keeps the code checks and local-Supabase
jobs. Ephemeral receipt setup enables the token-accounting RPC test in fresh CI.
New browser evidence stays in ignored `test-results/verification/` instead of the
parent workspace or dated documentation archive. See [CI details](CI.md).

Application behaviour, dependencies, schema and existing local credentials are
unchanged. The user subsequently authorised the 50% staging split recorded below.
No commit, push, deployment, hosted resource or paid service is authorised.

## Repository/CI verification — 2026-10-15

Post-change verification passed:

- `npm run check` end to end: formatting, lint, TypeScript, 31 unit tests,
  30 isolated database tests, production build, 11 public browser tests and
  12 fixture-backed account flows.
- `npm run db:test:local`: 35 PostgreSQL assertions. `npm run db:types:check`:
  generated types match the running local schema.
- `TUTOR_MODE=scripted LIVE_TUTOR_SMOKE=false npm run test:integration`:
  11 passed, with the real-provider smoke and live-only stream UI case
  intentionally skipped.
- `TUTOR_MODE=live LIVE_TUTOR_SMOKE=false npm run test:integration -- token-usage.spec.ts tutor-stream.spec.ts`:
  2 passed with synthetic responses and local accounting RPCs.
- At that checkpoint, all 139 local Markdown links resolved within the repository. Workflow YAML,
  root paths, immutable action pins and shell syntax were checked. All 76
  feature IDs, acceptance criteria, dependencies and statuses are preserved;
  only NX-036 tracking metadata changed.
- All 54 imported screenshots are byte-identical to their source, and all six
  JSON records retain their data. The 83-file verification archive remained
  unchanged during browser runs; 34 new evidence files went to ignored
  `test-results/verification/`.

Verification used Node 24.19.0 and the existing Chromium executable override.
Loopback servers, Docker, Chromium and build subprocesses required execution
permission outside the coding sandbox. The existing local database and receipt
setup were used without reset or credential changes. No external AI calls were
made. GitHub-hosted execution and its fresh-runner bootstrap remain unverified;
no hosted disconnect, new real-model or independent human evaluation is claimed.

## Local evidence archive — 2026-10-16

The user requested excluding the 83 large historical evidence files from the Git
changes while preserving them locally. They are now stored in ignored
`.local-archive/verification-2026-10-15.zip`, with a companion SHA-256 checksum.
Every ZIP member was compared with its source before the loose imported copy was
removed. All 83 files are preserved byte for byte; parent-workspace originals
also remain. Already compressed PNGs are stored directly, and text is compressed.

Both `.local-archive/` and restored `docs/verification/` are ignored, so unpacking
the ZIP for local browsing will not add those files back to Git status.
[Archive access and restoration](README.md#historical-evidence) are documented.
Committed guides link to these instructions rather than optional local files;
feature evidence notes identify the original paths inside the ZIP. Acceptance
criteria, task IDs, dependencies and statuses are unchanged.

Git status now contains **32 files: 18 new and 14 modified**. This is the 31-file
documentation/CI batch plus the required `.gitignore` change. At the archive-cleanup checkpoint no files were staged, committed or pushed.
The later staging request is recorded below. Archive integrity, ignore behaviour, fresh-clone links and
formatting are being checked for this cleanup; application tests were not rerun
for a documentation/archive-only change.

## Remaining work and next action

Review this completed repository/CI batch. After the user commits and pushes the
reviewed changes, verify both GitHub jobs and configure required checks where
supported; NX-036 remains In progress. The next proposed implementation slice is
**NX-022**: broaden fixed real-model ambiguity, adversarial and language
evaluations with version metadata and explicit response review. This batch does
not authorise external model calls or expand paid/hosted operation.

Keep the remaining requirements visible: submitted-student-reasoning input,
independent human/learner evidence, hosted streaming verification, monetary
controls, other provider adapters, NX-016 isolated JavaScript execution, and
Phase 6 accessibility/performance, privacy/account recovery/export/deletion,
monitoring, environment separation, release/rollback, backups, incident response,
hosting budget and learner pilot. Deferred expansion remains deferred.

Historical stop instructions, telemetry and staging requests in archived handoffs
describe prior sessions. They are not current instructions to stop or preserve a
staging split that has already been committed.

## Requested staging split — 2026-10-16 (50%)

User requested half the current work staged and separate commit messages. Verified
an empty index at `a291ca3` with 32 changed/new files. Staged exactly **16 of 32
files (50% by file count)**: the new repository planning, tracking and setup
documents directly under `docs/`. The other 16 files remain unstaged: workflow,
local Docker setup script, ignore/agent/README and existing-guide updates, and
browser evidence-path changes. Imported planning documents retain all task IDs,
acceptance criteria and statuses. Historical evidence archives remain ignored.

Selected documents were screened for actual local private credentials and their
Base64 forms plus common credential patterns; no findings. The default whitespace
check flagged the imported CSV's CRLF line endings. A CRLF-aware staged whitespace
check passed; CSV bytes and task contents were preserved. No implementation changes, tests rerun, commit or push for this staging
request. The two groups are portions of one documentation/CI batch.

Staged message: `docs: bring project plans and setup guides into the repository`.
Unstaged message: `ci: add repository checks and keep browser evidence local`.
