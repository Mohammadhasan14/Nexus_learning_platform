# Production performance review (NX-029)

Date: **2026-10-25**. Work began clean at `3c16c56`. The user authorised measuring
performance, fixing confirmed bottlenecks and adding repeatable regression gates.
This review uses the production webpack build and synthetic learner data.

## Confirmed changes

The dashboard originally made five Auth verification calls and three profile
reads for one document render. Layout, learning, review and project loaders now
share verified identity/profile promises within that render. The dashboard uses
two Auth calls (including the independent proxy verification) and one profile
read. Lessons reduce Auth calls from four to two; projects from three to one,
with their profile reads reduced from two to one.

`lib/auth/render-session.ts` uses React's request-scoped `cache`. It preserves
verified `getUser()`, owner-filtered profile queries, destination validation and
failure redirects. Mutation actions and API handlers keep the existing uncached
helpers. No persistent/global user cache, database policy or proxy-verification
change. [React's cache lifetime](https://react.dev/reference/react/cache) explains
the per-request boundary; concurrent learner and revoked-session checks exercise
it against the actual production renderer.

Lesson pages previously downloaded the live stream validator even in scripted
mode. The stream validator and isolated-runner controller now load on their
first relevant action. Settings loads its response validator after a successful
retention response. Its locale labels moved to a small data-only module because
importing them from the validation module pulled Zod into the initial bundle.
All original validation remains; it runs when its result is used.

The interface and server-rendered controls remain available immediately.
`lib/browser/abortable.ts` lets Stop/Cancel stop waiting while optional code is
loading. A cancelled tutor import cannot dispatch an AI request. A failed runner
download retains code and supports retry; a failed Settings validator download
preserves unsaved edits and asks for a reload before retrying. First use pays for
the deferred download. The runner's frame/worker CSP, grading boundaries and
live receipt/accounting rules are unchanged.

## Measured results

Three samples per route, cold browser cache. These are encoded JavaScript body
sizes in KiB (1 KiB = 1024 bytes), including observed automatic prefetches:

| Route     | Baseline | Optimized |     Change |
| --------- | -------: | --------: | ---------: |
| Homepage  |    132.3 |     132.4 | +105 bytes |
| Dashboard |    136.1 |     136.2 | +105 bytes |
| Lesson    |    169.2 |     142.1 | **−16.0%** |
| Projects  |    137.6 |     137.7 | +105 bytes |
| Settings  |    167.0 |     140.6 | **−15.8%** |

The shared runtime's new split-chunk mappings add 105 encoded bytes on the other
three routes. Lesson decoded JavaScript falls from 579,484 to 484,110 bytes;
Settings from 572,332 to 479,160 bytes. Optimized CSS is 9,079 encoded bytes.
Observed encoded document/resources total about 177–204 KiB across the routes,
including the existing favicon and speculative page prefetches.

Median local timings in milliseconds, baseline → optimized:

| Route     |        TTFB |       FCP |  Last LCP | Long-task sum |
| --------- | ----------: | --------: | --------: | ------------: |
| Homepage  |  9.8 → 10.6 | 772 → 732 | 772 → 732 |     295 → 229 |
| Dashboard | 56.8 → 50.1 | 560 → 548 | 900 → 848 |     255 → 334 |
| Lesson    | 37.1 → 44.7 | 536 → 544 | 536 → 544 |     403 → 308 |
| Projects  | 36.6 → 38.1 | 552 → 540 | 868 → 576 |     255 → 294 |
| Settings  | 36.7 → 28.9 | 532 → 528 | 532 → 528 |     338 → 299 |

Timing movement is mixed and host-sensitive; no uniform wall-clock speedup is
claimed from these small samples. The reliable improvements are fewer bytes and
fewer duplicate requests. Observed layout-shift sums were zero in all thirty
baseline/optimized load samples; this is not field CLS.

Server document requests, with no browser prefetch mixed into the counter:

| Route     | Auth calls | Profile reads | Total backend requests |
| --------- | ---------: | ------------: | ---------------------: |
| Dashboard |      5 → 2 |         3 → 1 |                19 → 14 |
| Lesson    |      4 → 2 |         1 → 1 |                14 → 12 |
| Projects  |      3 → 1 |         2 → 1 |                15 → 12 |

All eleven final performance checks passed on build `lkCmYcZggpzBZQYMyiJhl`.
The unchanged baseline build was `VFdglAbP-xjXFdmjv7leH` at `3c16c56`.
Formatting, lint/types, 46 unit tests and production build pass. All 71 existing
learner/account cases, 17 public cases and 11 performance cases passed against
that same final application build (145 tests including units). The full suites
passed after fixing the locale import and distinguishing normal cancelled
prefetches in the harness. No unresolved test failure remains. Database tests were
not repeated because no SQL, RPC, database policy or schema changed. Temporary
test servers are stopped. Results/logs are local; no remote CI run is claimed.

## Method and repeatability

`npm run test:performance` runs eleven checks through
`playwright.performance.config.ts`, using the existing temporary loopback Auth
fixture, runner and application servers. Build first with `npm run build`.
No real account, Docker stack, provider call or hosted service is needed.
`npm run check` includes this suite after the ordinary account flows; the existing
CI job therefore includes the new performance gates without a hosted workflow
or dependency change.

Each homepage/dashboard/lesson/project/Settings measurement uses three separate
browser contexts, a cold disabled browser cache and a 390×844 mobile viewport.
The Chromium DevTools configuration requests 4× CPU slowdown, 1.6 Mbit/s download,
750 Kbit/s upload and 150ms network latency. The application/server and synthetic
backend are warmed local processes; server-to-backend traffic is unthrottled.
These are configured browser conditions, not a calibrated physical phone or a
simulation of global database latency. See [Playwright's CDP interface](https://playwright.dev/docs/api/class-cdpsession).

Record HTML, JavaScript and CSS encoded body bytes, decoded JavaScript size,
observed total encoded navigation/resource bytes, resource paths/origins, TTFB,
FCP, last observed LCP, layout-shift sum excluding recent input and long-task
duration sum. Resource collection includes automatic prefetches observed before
network idle. Bytes exclude HTTP headers and connection overhead. Failed browser
requests/client errors and unexpected resource origins fail the normal gates;
Next's explicitly marked speculative prefetches cancelled with `ERR_ABORTED` are
recorded separately rather than treated as missing required assets.
Missing assets cannot silently make the payload look smaller.

Raw samples and logs live under ignored
`test-results/verification/performance/`. The JSON report retains completed
samples if Playwright restarts a worker after a test failure. Use
`PERFORMANCE_RECORD_ONLY=true npm run test:performance` only for an explicitly
labelled baseline collection: it records sizes/timings/reads without enforcing
the optimization gates and skips optional-download behavior checks. CI uses the
normal command with all gates enabled. A cached browser can be selected through
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` as in the other suites.

## Regression budgets

These are project payload limits for the fixed production fixtures, chosen to
retain modest JavaScript headroom over the measured optimized routes. They are
not universal performance standards or limits on a learner's export/history.

| Initial load measure                      |   Limit |
| ----------------------------------------- | ------: |
| Homepage encoded JavaScript               | 144 KiB |
| Other measured routes' encoded JavaScript | 152 KiB |
| Decoded JavaScript, each measured route   | 520 KiB |
| Encoded CSS                               |  12 KiB |
| Encoded document HTML                     |  32 KiB |
| Observed encoded document plus resources  | 224 KiB |

Backend-read gates assert one profile read per measured document and two Auth
calls for dashboard/lesson, one for projects. Behavior gates prove that optional
runner/live-validator chunks stay unloaded until needed, cancellation while a
chunk is held works without an iframe/provider dispatch, recovery works, and
validation-download failure preserves work. Settings must not download Zod merely
to show locale labels. No heavy editor/3D library or media was introduced; the
editor remains a native textarea and the worker/frame start only on Run.

## Limits and remaining acceptance

Timing samples are diagnostic; noisy timings do not gate CI. A three-sample lab
median is not a real-user p75. The build guide's release targets remain p75 LCP
≤2.5 seconds, INP ≤200ms and CLS ≤0.1 across the actual device/network mix.
[Web Vitals guidance](https://web.dev/articles/vitals) distinguishes these field
targets from lab measurements. This harness does not compute field INP or
session-window CLS; its layout-shift sum must not be relabelled as either.

Actual low-end devices, mobile Safari/other engines, production backend/CDN
latency, long histories/large catalogues and real-user metrics remain unmeasured.
Current full catalogue/history loaders still need scale measurements before any
claim of bounded large-account performance. There is no new real-user telemetry
endpoint, third-party analytics collection or field-performance claim. NX-029
remains **In progress** for that broader evidence. No dependency/lockfile,
credential, schema, Docker/Vector, paid-provider, push or deployment change.

The later 20–30% commit request committed the seven render-session/read-integration
files as `5de4343` (7 of 26, 26.9%), using only the project Git identity and no
co-author. The next request committed the four optional-loading/cancellation files
as `2201f46` (4 of the remaining 19, 21.1%), with the same identity and no co-author.
The following request committed the three locale-label files as `81a5de6`
(3 of the remaining 15, 20%), with the same identity and no co-author.
The user then requested all twelve remaining files in the final commit group:
the performance suite, fixture counters, command/config wiring and documentation.
The group uses the same identity, no co-author and a plain past-tense message.
The commit requests added no application changes or test reruns.
