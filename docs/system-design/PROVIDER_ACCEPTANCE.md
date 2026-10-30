# M1 disposable-provider acceptance

Preparation inspected on 31 October 2026, starting from clean commit `b69e40b`.
This is an execution guide and evidence record; task status remains only in
`../features.csv` and the current handoff in `../PROGRESS.md`.

## Environment decision

No authorised disposable provider is currently available. Read-only inspection
found Docker 26.1.5, `/usr/sbin/dockerd` and installed Supabase CLI 2.117.0.
No Docker socket, running Docker/Vector process or listener on the documented
provider ports was found. The existing `/var/lib/docker` contains retained
project state; neither that state nor the configured application backend has
been identified as disposable. The ignored `.env.local` exists; its contents
were not read or printed. No Docker/Supabase/application service, migration or
provider test was started.

The existing provider workflow is documented in [CI](../CI.md),
[account setup](../PHASE_2_SETUP.md) and
[privacy controls](../PRIVACY_CONTROLS_SETUP.md). Its loopback URL check prevents
remote use but does not prove a local database is disposable. The CI reset
command is appropriate only to that job's fresh runner. Do not run it against
the retained local project.

**Proposed environment, pending explicit startup authorisation:** a separate
temporary Docker daemon with a fresh data root, execution root, PID file,
containerd state and Unix socket under a new `/tmp/nexus-studio-m1-*` directory.
Use an empty daemon configuration and an isolated socket via `DOCKER_HOST` for
every Docker/Supabase/setup/test command. Never start the system Docker service,
open `/var/lib/docker`, change restart policies or change boot configuration.
If permissions or networking cannot support that daemon, stop and report the
specific failure; do not fall back to the retained runtime.

Create a temporary source copy from tracked files plus current tracked edits,
excluding `.env*`, `.git`, local Supabase state and ignored artifacts. Reuse the
installed dependencies without installing packages. In that copy alone, set
`project_id = "nexus_studio_m1_acceptance"` and disable analytics. Keep the
documented loopback ports 54321–54324 and application port 3103 after checking
they remain free; the existing email integration tests use port 54324. Run
`supabase start -x vector,logflare,studio,edge-runtime,realtime,storage-api,imgproxy,supavisor`
to retain PostgreSQL 17, Auth, gateway, PostgREST, Mailpit and metadata tooling.
Vector stays off. Missing container images may need downloading into fresh
temporary storage. This uses local CPU/memory/disk and temporary Docker network
rules. It provisions no hosted service and never connects an existing database.

## Execution after authorisation

1. Record the temporary directory, daemon PID/socket and project identity.
   Verify all runtime calls target that socket and its empty inventory; record
   that the original daemon remains stopped. Do not print raw CLI status,
   tokens, signing keys, passwords, cookie values or environment contents.
2. Start the fresh Supabase project. Apply the complete migration chain with
   `supabase migration up --local`, through
   `202610290001_studio_workshop.sql`. A fresh CLI startup may already replay
   migrations; record its migration ledger and the subsequent no-op result.
   Never use `db:reset` against the existing project.
3. Use `npm run db:env`, `npm run tutor:receipts:setup` and
   `npm run privacy:deletion:setup` **only inside the fresh copy**. These generate
   temporary local configuration/signing capabilities without printing them.
   Preserve the original application's configuration byte for byte.
4. Run `npm run db:test:local`. Studio now prepares 33 pgTAP assertions, covering
   the published scenario association, grants/RLS, composite ownership FK,
   retries/conflicts, supplied-result rejection, staff/learner export isolation
   and synthetic Auth-deletion cascades. All pgTAP changes roll back.
5. Run `npm run db:types` in the copy, compare the **entire** generated public
   schema with `lib/supabase/database.types.ts`, and resolve genuine drift in
   the source repository without broad casts. Repeat full generation and
   `npm run db:types:check`. The isolated catalog generator is not a substitute.
6. Build the copy with `npm run build`. Run the complete existing integration
   suite with `TUTOR_MODE=scripted LIVE_TUTOR_SMOKE=false`, the existing Chromium
   override if needed, and the isolated `DOCKER_HOST`. No model call is needed.
   Tests create UUID-named synthetic Auth users and clean them in `finally`.
   `tests/support/local-sql.ts` derives its container from the current copy's
   validated project ID, rather than selecting the retained project by name.
7. Record the actual provider/browser results separately from HTTP fixtures.
   Studio coverage includes concurrent identical saves; conflicting keys;
   unenrolled, anonymous, cross-learner and unrelated-staff restrictions;
   forbidden direct writes; version/course associations; exact inputs and
   pinned versions; Courses enrolment; sign-out/sign-in resume; a changed
   workload and new revision; two real browser tabs and explicit rebase; real
   browser-cookie session loss and same-account recovery. Cookie removal tests
   a missing session, **not forced provider-side JWT expiry**. The existing
   Auth test separately covers refresh after an expired cookie timestamp.
   If provider-side expiry/revocation needs separate acceptance, record it as
   outstanding rather than calling cookie removal equivalent.
8. The privacy integration test saves worksheets for two synthetic owners and
   uses the actual password-confirmed application deletion flow. Verify both
   deleted heads/revisions disappear, the other owner's records remain, export
   includes revisions, and existing tutor retention behavior still passes.
   Existing JavaScript version, practice and tutor tests remain required; the
   new Studio journey also preserves a pre-existing v1 enrolment/read record.
9. Capture actual-provider workshop screenshots at 390 and 1440 px under
   `test-results/verification/studio-provider/`. Existing synthetic responsive,
   keyboard, reduced-motion and payload evidence remains separately labelled.
   Fix only demonstrated M1 defects, then repeat affected checks and required
   repository gates. Transfer relevant source/type fixes and sanitised evidence
   back to the repository; never transfer temporary credentials or Auth state.

## Cleanup

Always stop the temporary application and only this fresh Supabase project with
`supabase stop --project-id nexus_studio_m1_acceptance --no-backup`, using the
isolated socket. Confirm its containers, network and volumes are gone; never
use `--all`, global prune or an unqualified Docker context. Stop the recorded
temporary daemon, confirm its processes/mounts/network rules are released, then
remove only its recorded fresh storage/source directory and generated secrets.
Keep sanitised verification artifacts. If cleanup cannot finish, report exact
remaining resources. Leave the original Docker/Vector services and data alone.

## Current acceptance result

Independent preparation checks passed: repository lint; route/type generation
and TypeScript; all 49 unit checks; eight focused isolated Studio database
checks. The first sandboxed unit attempt could not bind its synthetic loopback
servers (`EPERM`); the permitted rerun passed. Discovery-only Playwright loaded
17 provider tests in 15 files with no backend or browser execution. The pgTAP
plan/statement count matches 33; this does not verify SQL execution. Tracker
integrity preserved all 103 rows/IDs/statuses and untouched rows byte for byte.
Repository `format:check` and CRLF-aware `git diff --check` both pass.
No application production build, provider tests or browser gates were repeated
on this preparation-only change. Earlier broad local evidence stays historical.

**Not run: blocked on authorising the disposable runtime.** No actual migration,
full provider type generation/drift, pgTAP, provider integration, browser journey
or provider screenshot is claimed. NX-046.2 and NX-046.4 remain In review;
NX-046.1 and NX-046.3 remain Completed on their recorded local evidence.
The existing M1 implementation is committed through `b69e40b`; this session's
test/documentation preparation is uncommitted. Foundations NX-046.22 and all
later milestones remain deferred.
