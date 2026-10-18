# Current progress

Updated: **2026-10-18**. Read this file, [features.csv](features.csv) and
[DECISIONS.md](DECISIONS.md) before continuing. This repository's `docs/` is now
canonical; parent-workspace documents and the spreadsheet are legacy snapshots.

## Current handoff — verification finished; remote CI access still needed

**NX-022.4 Completed (2026-10-17):** restored local dependencies using npm ci and the existing unchanged lockfile. Extended16-case streaming collection returned 16 live replies; individual AI-assisted editorial review found 15 Pass / 1 Needs changes. Preserved all actual replies and notes. Fixed only the exact canonical uncertainty reply's missing next-step message in both adapters; model/system prompt/prompt version unchanged. One intentional targeted live recheck passed with versioned output-policy metadata. This is 15 original passes+one corrected/rechecked case, not a second full matrix or independent human review. See [evaluation guide and reports](../tests/evaluations/README.md).

**Verification passed:** final formatting/lint/typecheck, 36 unit tests, 30 isolated DB tests, production build, 11 public browser cases and 12 fixture-backed account flows. Browser suites ran before the narrow text-only fix; affected adapters were then rechecked with unit tests and final build. Full npm check initially stopped at missing default Chromium 1243; existing Chromium 1234 via the documented executable override passed the browser suites. No dependency/framework/browser download or lockfile change. Logs are ignored under `test-results/resumed-verification/`.

**NX-036 remains In progress:** public GitHub run `38935858138` on `402e6a5` passed code/database/browser checks but failed local-Supabase integration. Detailed job-log API requires admin access; branch protection requires authentication. Existing noninteractive Git/VS Code authentication could not retrieve access. Asked the user for the failing test/error section; none received yet. Earlier local reproduction passed 11 tests with 2 intentional skips, but this does not diagnose the remote failure. GitHub test annotations and exact required-check names are prepared in [CI documentation](CI.md); no speculative timeout/retry change, remote setting change or push.

**Docker preference preserved:** Docker is currently off, engine service/socket startup disabled and no SysV start links. Vector remains stopped with restart policy no; do not restart it, re-enable boot startup, or recreate it through a routine Supabase start. Local Docker integration/type-drift checks were not repeated in this resume. Existing data/volumes and credentials are untouched. The malformed underlying logs are not repaired. Heavy checks ran sequentially at low priority on two CPU cores; no new persistent app/test server is intended to remain running.

**Current register:**77 rows (53 originals + 24 children): 49 Completed, 9 In progress, 8 Pending, 11 Deferred. Counts include parent/child tasks and are not an effort percentage. Original IDs, acceptance criteria, dependencies, phase and priority fields verified against Git HEAD. The evaluation foundation is committed in `068747e`, and the uncertainty guidance/regression group is committed in `241fc25`. Latest staging request (2026-10-18): one of the 10 remaining changed/new files (10% by file count) is staged: `.github/workflows/ci.yml`, which adds GitHub annotations alongside the integration test log reporter. The other nine files remain unstaged, including this progress record. Cached whitespace validation passed; no tests were rerun for this staging-only split, and no new remote CI result is claimed. Prior verification is recorded above. No commit or push was performed for this request. Current HEAD is `241fc25`.

**Next action:** obtain the remote integration failure log, fix its demonstrated cause and verify the user-reviewed next push; configure required checks only with authenticated admin access while preserving existing rules. Parent AI tasks retain their broader human/pilot, submitted-reasoning, hosted, monetary and additional-provider requirements. NX-016 and the remaining Phase 6 readiness work are still open. Stop after this slice for review; no unrelated feature work.

## Prior implementation checkpoint

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

## CPU investigation — 2026-10-17

User steered interrupted verification to investigating high CPU. Host sampling found Docker daemon PID 2608 at about 229% (100% = one core), while project containers were near 0%; no leftover project build/test process was visible. Docker repeatedly reports null-byte JSON log parsing errors for database, realtime and analytics containers. Vector's docker-log source also reports repeated timestamp parsing failures (about 64–66 suppressed errors per ten seconds). The daemon log is about 150 MB. This indicates a likely malformed-log/collector retry problem; causal CPU reduction has not been tested. All running containers report healthy where health checks exist. No service restart, container stop, log deletion, DB reset or heavy check was performed during the investigation. Next diagnostic option is briefly pausing only the log collector and remeasuring CPU, with user instruction; preserve the database and its volumes. Extended-evaluation/CI handoff remains unfinished after interruptions; do not claim an interrupted build passed.

## CPU mitigation and startup request — 2026-10-17

User authorised stopping the log collector and disabling unnecessary Docker boot startup. Stopped only `supabase_vector_nexus_learning_platform` using Docker stop; its existing unless-stopped policy leaves it stopped until explicitly restarted. Docker CPU dropped from about 229% to 0.3% in a three-second host sample, confirming the log-collection path caused the high load. Database/other containers and volumes were preserved; local log ingestion is unavailable while Vector is stopped. Do not silently restart Vector on future verification. Malformed underlying container log files have not been deleted or repaired.

Host uses SysV init (`/sbin/init` resolves to sysvinit), with systemd enablement links also present. Attempted `sudo -n update-rc.d docker disable` and `sudo -n systemctl disable docker.service docker.socket`; both refused because administrator password authentication is required. Startup disablement was NOT applied. User must run these commands in their own terminal or provide an authenticated administrator execution path; never request their password in chat. Docker remains running for the local database. Manual engine control is `sudo service docker start` / `sudo service docker stop`. Extended evaluation/CI work remains interrupted; do not start heavy checks during CPU investigation.

## Docker startup disabled by user — 2026-10-17

User ran the requested administrator commands in their own terminal. Read-only verification now reports both `docker.service` and `docker.socket` disabled. SysV Docker automatic start links are absent; remaining K links are stop entries. The insserv messages describe intentional deviation from package startup defaults, not a failure. This resolves the earlier administrator-authentication blocker for startup disablement. Existing daemon may continue until stopped manually; manual start remains `sudo service docker start`. Keep Vector stopped pending log repair and do not re-enable engine boot startup without instruction.

## Conservative Docker cleanup — 2026-10-17

User authorised cleaning unnecessary Docker data. Audited images, containers, volumes, networks and build cache. Removed only unused `hello-world:latest` (image e2ac70e7319a), approximately 10 KB of image content. No dangling images or build cache existed. Retained the currently unreferenced `supabase/pg_prove:3.36` image because local database tests need it. Preserved all 12 project containers, 3 volumes, Supabase images and the project network; no container/volume/system prune or log truncation. Docker now has 13 images; database remains running/healthy and both startup units remain disabled. Vector stays stopped. Large malformed container/daemon logs were not deleted or repaired; cleanup did not purport to fix their contents. Most roughly 5.84 GB image storage is the existing Supabase stack, not disposable application cache.

## Log collector automatic restart disabled — 2026-10-17

User explicitly requested preventing the CPU-heavy log collector from starting at reboot. Updated only `supabase_vector_nexus_learning_platform` restart policy from `unless-stopped` to `no`. Verified `Running=false`, `Restart=no`; Docker service and socket are still disabled. Existing collector cannot be restarted by Docker's restart policy on reboot/daemon restart. Explicit starts or Supabase container recreation can override this, so future agents must preserve the user's preference, avoid starting Vector and recheck its policy after any authorised recreation. No database, volume, app configuration or credential changes.

## Verification resumed — 2026-10-17

User authorised resuming the interrupted verification/CI work. Restored missing node_modules with npm ci from the existing lockfile (SHA256 e8a397aade21a74eecde1c53626c45ab8a50d09591d7759ed95ff039e9a14cf7 unchanged). No package/framework upgrade or environment/credential changes. Heavy commands run sequentially at nice priority 10 on CPU cores 0,1. Docker is currently stopped; its service/socket remain disabled. Collector has not been restarted.

Fresh format/lint/type, 35 unit tests, 30 isolated DB tests and production build pass. The full check chain stopped at public browsers because default Chromium revision1243 is absent; using existing Chromium 1234 via PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH passed all 11 public browser cases. Account flows and new bounded provider collection are still pending at this checkpoint. Logs are under ignored test-results/resumed-verification/. Do not turn pending runs into completion claims.

Public GitHub status still shows the same failed run `38935858138` on `402e6a5`. No newer run is available. Existing noninteractive Git/VS Code authentication also could not retrieve credentials; no secrets were displayed or saved. Await the user-provided failing log section or authenticated admin access. No branch protection changed, no push or commit.

## Final handoff checkpoint — 2026-10-17

NX-022.4 acceptance verified with the archived initial 16-case review and corrected
one-case live recheck. Final source/browser screening checked 235 files against
actual provider/signing keys and Base64 forms with no findings; 15 current local
documentation links resolve. Lockfile SHA remains unchanged. Final affected
checks pass 36 unit tests plus lint/types/build; 30 DB tests and 11 public / 12 account-flow
cases also passed in this resume, with the documented cached browser override.
The source tree has 18 changed/new files, all unstaged; no commit, push or deployed
resource. Detailed local evidence: ignored
`test-results/resumed-verification/verification.json`. Next required input is the
remote integration failure log; no root cause or protection setting was guessed.

Five-hour usage checkpoint: 41.0% used at 2026-10-17T14:57:46.287Z. Stop at 90% used (10% remaining); refresh this value on resume.
