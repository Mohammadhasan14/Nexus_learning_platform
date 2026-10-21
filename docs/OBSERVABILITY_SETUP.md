# Error logging and health checks (NX-034)

The app emits structured server error records to standard error and provides two
public health endpoints. No monitoring service, collector, background polling,
alert, new credential or dependency is installed.

## Request correlation

The proxy generates a fresh UUID for each application request and replaces any
incoming `x-request-id`, even a valid one. It forwards the generated ID internally
and returns it in the response's `x-request-id` header. IDs are correlation
metadata and never grant access. Next assets and the favicon are excluded.

Auth refresh remains limited to the existing session-refresh paths. Public pages,
health endpoints and other newly matched paths do not acquire an extra Auth call.
Existing page/action authorization still verifies the user independently. Cookie
refresh preserves the same ID and the existing private/no-store headers.

The supported Next.js [request error hook](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation#onrequesterror-optional)
records unexpected render, route and Server Action errors. Proxy errors before
header replacement get a new log ID rather than trusting an external one. Errors
that occur before app handling cannot be guaranteed to have an app response ID.
The backend fetch wrapper also records transport failures and HTTP 5xx responses,
including failures that an action handles with a normal recovery message. It
preserves response bodies, errors and existing ten-second backend deadlines.
Validation/auth denials and ordinary tutor cancellation are not logged as outages.

## Log contract

Application-owned records use `service: "nexus-learning"`, `level: "error"` and
one of these fixed events:

| Event              | Meaning                                                          |
| ------------------ | ---------------------------------------------------------------- |
| `request.error`    | Unexpected server request failure captured by Next or proxy      |
| `backend.error`    | Backend transport failure or HTTP 5xx                            |
| `config.error`     | Invalid backend configuration on an existing refresh path        |
| `health.not_ready` | Failed configuration/Auth readiness probe                        |
| `tutor.error`      | Unexpected non-cancelled interruption inside the streaming route |

Records contain a timestamp, request UUID, allowlisted method/phase, and optional
HTTP status, bounded duration and numeric framework error digest. They are built
from an allowlist: no raw error messages/stacks, URLs/query strings, headers,
cookies, credentials, bodies, learner identity, notes, project code or tutor
content are serialized. Extra fields are discarded. A failed log sink does not
interrupt normal recovery and has no raw-error fallback.

The learner error boundary displays only a validated framework digest as its
error reference. Match that digest to a `request.error` record, then use the
record's request UUID to find related backend failures. The response ID is also
available in browser network tools. Retry uses the installed Next.js `retry`
callback to re-fetch the failed segment instead of only clearing its error state.

Automatic development request, Server Action and browser-to-terminal logging is
disabled to avoid forwarding private URLs and action arguments. This application
stream does not replace Next.js/SDK native diagnostics, browser consoles, CLI
output or hosting/access logs. Their retention and filtering remain operator
responsibilities; no global console patch or framework/dependency change is made.
Do not treat this stream as a blanket redactor for other log sources. Hosted
collection, alerts and incident response remain NX-035/NX-040 readiness work.

## Health endpoints

```sh
curl -i http://127.0.0.1:3000/api/health
curl -i http://127.0.0.1:3000/api/health/ready
```

Both support GET and HEAD, return `Cache-Control: no-store`, set `nosniff` and
include the generated request ID. HEAD has no body. JSON bodies contain only
`status` and `requestId`: no version, environment label, URL, project reference,
key, error detail, user data or provider response. Query/header values cannot
select the probe target. Neither endpoint signs in, refreshes a user or calls AI.

- **`/api/health`** returns HTTP 200 with `status: "ok"` when app routing works.
  It does not require a configured or running backend.
- **`/api/health/ready`** validates the existing backend environment guards, then
  makes one read-only request to its fixed `/auth/v1/health` endpoint with the
  configured publishable key and a two-second timeout. Redirects are rejected;
  provider payloads are cancelled without parsing. HTTP 200 means
  `status: "ready"`; missing/invalid configuration, outage or timeout returns
  a generic HTTP 503 with `status: "unavailable"` and a correlated safe log.

The [Supabase Auth health endpoint](https://supabase.com/docs/reference/self-hosting-auth/get-a-user)
is a reachability check. Readiness does not establish database/RLS correctness,
applied migrations, storage health, AI availability, billing or full release
readiness. With Docker off, liveness can pass while readiness correctly fails.
No local service is started by a probe. Monitor frequency is an operator choice;
the app does not schedule its own probes.

## Verification

```sh
node --import tsx tests/unit/observability.test.ts
npm run build
npx playwright test tests/health.spec.ts
npx playwright test --config playwright.flows.config.ts observability.spec.ts
```

Unit cases exercise malicious/private log context, safe digests, failed sinks,
backend error preservation, guarded probe dispatch, cancellation/timeout and
proxy matching/ID replacement. Production browser cases exercise backend-free
health, ready/outage/recovery, real render errors, action failures, matching
response/log IDs, private-data canaries and error-boundary retry. They use the
existing synthetic HTTP provider and never require Docker or a hosted project.

The flow app's server output is captured in ignored
`test-results/observability/server.log` so tests can verify actual emitted records.
If flow startup fails, inspect that file as well as Playwright's errors. Browser
artifacts remain in the existing public/flows output directories. These tests are
included in the existing `npm run check` chain. Hosted log routing/probes remain
unverified until the separate staging/production environments are configured.
