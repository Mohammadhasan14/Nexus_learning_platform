# Offline streaming regressions — NX-022.3

This suite verifies transport and application trust boundaries with labelled
synthetic responses. It makes no external AI calls and does not establish model
accuracy, prompt-injection resistance or independent safety approval. The
[real-model matrix](README.md) and its archived editorial reviews stay separate.

```sh
npm run eval:tutor:streams
```

Use Node 24. No provider credential, Docker or real learner database is needed.
Two tests listen on an ephemeral loopback port and use real Node HTTP/fetch
transport. A restricted coding sandbox may need permission for that local
server. Normal CI runs these regressions through `test:unit` and `test:db`.

## Fixed matrix

`tutor-stream-cases.ts` defines 18 fixtures, each evaluated for hint, explanation,
different example and reflection: **72 combinations**. Every combination makes
exactly one synthetic dispatch, keeps the trusted lesson source, and verifies
whether final usage may be reported.

| Outcome           | Fixed cases                                                                                                                                        | Expected terminal behavior                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Valid usage       | Complete response; final usage-only tail                                                                                                           | Live adapter, one measured usage record                           |
| Unknown usage     | Missing usage; nonzero tool counter; negative, forged-total or fractional counter                                                                  | Useful text may finish; no trusted usage/refund                   |
| Prepared fallback | HTTP 429/503; no STOP; MAX_TOKENS; safety block; bad JSON; unexpected candidate; truncation after STOP; late output; frame flood; oversized output | Labelled prepared guidance, no measured usage, no automatic retry |

The adversarial-reference test places fake system-role markers and URL demands
in each public lesson field. It verifies those fields remain JSON data under the
unchanged system instruction, private profile/note/answer fields are omitted,
tools are absent and the endpoint is fixed with redirects disabled. Forged
provider source/owner fields cannot change the application source or identity;
hidden thought parts are omitted. The synthetic reply is intentionally benign:
this tests serialization and authority boundaries, not whether Gemini follows
the malicious reference instructions. The existing real-model injection cases
provide separately dated, finite semantic evidence.

## Disconnect and receipt composition

Real loopback HTTP tests stream a partial response and then stall. Caller
cancellation and a bounded deadline both close the transport with exactly one
request and no final token measurement. Cancellation rejects; deadline failure
returns prepared guidance. No Google request is made, and no claim is made about
remote provider work stopping or its billing.

`tests/database/tutor-resilience.test.ts` runs the real adapter/orchestration,
HMAC signer and migration-backed finalizer together in isolated PGlite:

- Eight failures (two stream failures × four intents) save exact prepared
  receipts and keep the full unknown reservation. Claim/read intent matches the
  selected guidance. No partial provider text becomes the completed quote.
- Disconnect before completion writes no receipt and keeps the reservation.
- Disconnect immediately after finalization emits no completed client event,
  but leaves a recoverable measured receipt. Repeated identical finalization and
  recovery neither redispatch nor double-refund.

PGlite supplies auth shims, not a real Supabase Auth service. The private policy
is adjusted only in the isolated fixture, never in the user's local database.

## Browser boundary

With local Supabase, receipt setup and a production build available:

```sh
TUTOR_MODE=live npm run test:integration -- token-usage.spec.ts tutor-stream.spec.ts
```

The stream UI test intercepts the provider route with labelled synthetic text
containing HTML, an event handler, script and hostile URLs. The response remains
inert text: no injected image/script element, executed marker, or generated
hostile anchor. The lesson source still points to the trusted local lesson.
The same browser scenario checks cancellation/recovery identity, partial-output
removal, prepared fallback, keyboard controls, axe, reduced motion and overflow
at 320/768/1440. The real accounting RPC case confirms denied AI requests still
allow protected grading. Earlier scripted/disabled regressions remain separate.

New browser records/screenshots are written to ignored
`test-results/verification/tutor-resilience/` inside the repository. The
[historical verification archive](../../docs/README.md#historical-evidence)
is kept in an ignored local ZIP. Tests use disposable local accounts and delete
them. No credential/configuration change or learner promotion is required.

## Limits and next evidence

These are deterministic protocol/receipt/rendering regressions. They do not
cover the entire authenticated Next route over a real hosted proxy, database
outages, provider billing after cancellation, broad semantic accuracy, language
variation, actual wrong-student-reasoning input or independent learner/human
review. Hosted/paid operation remains unsupported. Preserve the wider NX-022
requirements rather than marking the parent Completed from these tests alone.
