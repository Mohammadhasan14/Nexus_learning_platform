# JavaScript practice runner (NX-016)

Unlocked lessons include **Try JavaScript**, initially populated with the public
lesson example. Learners can edit it, run it, stop it and inspect escaped console
output. Code and output are temporary browser state. The existing **Check answer**
flow remains the only way to save a graded practice attempt.

## Local setup

Use the existing local account/backend configuration. Add this public setting to
`.env.local`, preserving its other entries:

```dotenv
PRACTICE_RUNNER_ORIGIN=http://localhost:3104
```

In a separate terminal, from the repository root:

```sh
npm run runner:dev
```

Start the application normally and open **http://127.0.0.1:3000**, sign in, and
open an unlocked lesson. The static runner accepts that parent origin by default.
The runner uses `localhost`; the application uses `127.0.0.1`. Different ports on
the same hostname are deliberately rejected because cookies do not isolate ports.
For another local app port, pass its exact origin:

```sh
npm run runner:dev -- --app-origin http://127.0.0.1:3001
```

Stop the runner with Ctrl+C. Missing/invalid configuration, an unavailable host
or unsupported execution leaves entered code available and reports a message;
ordinary lessons and protected practice still work. No Docker, database migration,
AI provider, new dependency or privileged key is needed by the runner itself.

## Execution boundary

- `runner/` contains only static public assets. They are outside Next's `public/`
  directory and are never mounted on the application origin. The loopback host
  serves a fixed asset allowlist and never evaluates submitted code.
- The application validates a distinct runner hostname and requires HTTPS outside
  local loopback. It rejects credentials, paths, queries, fragments, matching hosts
  and direct parent/subdomain relationships. Hosted operators must still choose
  an unrelated domain with no shared cookies, application data or other services.
- A sandboxed cross-origin frame runs only trusted bootstrap code. It needs
  `allow-scripts allow-same-origin` to create its same-origin worker; the app's
  separate origin remains inaccessible. Popups, forms and top navigation are not
  allowed. A response CSP restricts allowed embedding to the exact app origin.
- Learner code runs only in a fresh dedicated browser worker. The worker response
  has its own CSP: `connect-src 'none'`, `worker-src 'none'`, and no script sources.
  Only string compilation is enabled there. Fetch, WebSocket, imports and nested
  workers are blocked by browser policy. The app and frame never receive
  `unsafe-eval`. See [worker CSP inheritance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#content_security_policy)
  and [worker-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/worker-src).
- The frame checks parent source/origin and a bounded, versioned request. A
  transferred MessageChannel carries one result; both frame and application
  validate it and match its request ID. Window messages cannot award progress.
  Worker output is always untrusted, including syntactically valid results.
- Limits are 12,000 code characters, 50 lines, 1,000 characters per line and 8,000
  characters of line contents. Long lines/argument lists report truncation.
  Objects/functions are labelled without invoking their serialization hooks.
  Output is rendered as React text. No HTML or learner-supplied URL is rendered.
- An external frame timer terminates the worker after 1.5 seconds, including
  loops and unfinished promises. A six-second app deadline handles a missing
  frame. Completion, error, output overflow, cancellation and navigation clean
  up the execution. [Worker termination](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate)
  does not wait for learner code to cooperate.
- The controller has no API for saving attempts, changing evidence or unlocking
  lessons. Existing database grants and grading RPCs reject client-written
  passes. No grading key, auth token or learner profile is sent to the runner.

This is a browser practice tool, not authoritative code grading. Browser timers
are subject to scheduling; browser workers do not provide a hard heap/memory cap.
Origin separation does not enable or depend on `crossOriginIsolated`/SharedArrayBuffer.
Chromium verification does not establish Firefox/WebKit or hosted proxy behavior.

## Hosted setup

No hosted service is provisioned by this change. Leave execution unconfigured
until the isolated host is ready. Serve only the four assets from `runner/`:
`frame.html`, `frame.js`, `protocol.mjs` and `worker.js`, with correct HTML/JavaScript
MIME types. Do not deploy the app, credentials, authentication, analytics or
user-controlled files on this origin.

Apply the headers defined by `runner/policy.mjs`, replacing `frame-ancestors` with
the exact HTTPS application origin. **The worker response must override the
frame CSP with `WORKER_CSP`**; inheriting the frame policy would weaken the
network/import/nested-worker boundary. Preserve `nosniff`, `no-store`, referrer
and permissions restrictions. Set `PRACTICE_RUNNER_ORIGIN` to that isolated HTTPS
origin and verify actual response headers and browser behavior before enabling
it for learners. The development host intentionally binds only to loopback.

## Verification

```sh
node --import tsx tests/unit/practice-runner.test.ts
node --import tsx tests/database/learning.test.ts
npm run build
npx playwright test --config playwright.flows.config.ts practice-runner.spec.ts
```

The flow configuration starts/stops the static runner alongside the existing
test-only auth provider and production app. The fixture supplies one synthetic
lesson to exercise the actual lesson component; it does not prove Supabase
integration. The database test separately executes real migrations in PGlite and
checks that forged runner results cannot insert attempts or bypass option grading.
The new unit/browser cases are included in the existing `npm run check` chain.
Browser evidence goes to ignored `test-results/flows/`. Use the documented
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` override when needed.
