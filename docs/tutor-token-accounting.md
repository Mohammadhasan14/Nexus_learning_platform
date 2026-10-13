# Local tutor token accounting

NX-021.3 adds token reservations and trusted reconciliation to the opt-in local
Gemini tutor. It preserves prepared guidance, protected practice grading and the
existing shared request caps. Paid or hosted AI remains unsupported. The model
alias and provider key are server configuration; this work adds no dependency.

## Run and preview

Use Node 24 and the existing Docker-backed local Supabase project. From the app
directory, with the existing ignored `.env.local` configured:

```sh
npm run db:start
npx supabase migration up --local
npm run tutor:receipts:setup
npm run db:types:check
npm run dev
```

On first setup, copy `.env.example` to `.env.local` and configure the local
backend using the existing setup instructions. `npm run db:env` can create a
local backend environment file if absent; it refuses to overwrite one. For the
live pilot, set `APP_ENV=local`, `SUPABASE_PROJECT_ENV=local`, `TUTOR_MODE=live`,
`LLM_PROVIDER=gemini`, `LLM_MODEL=gemini-3.1-flash-lite`,
`LLM_FREE_TIER_ONLY=true` and a private `LLM_API_KEY`. Keep paid billing disabled.
These flags record the operator's assertion; they do not query Google billing.
Do not expose either the API key or `TUTOR_RECEIPT_SIGNING_KEY` as `NEXT_PUBLIC_`
variables. Receipt setup provisions its separate key locally without displaying
it. Docker group access is required for local provider/setup commands.

Apply migration `202610110001_live_token_accounting.sql` without resetting
existing learner records. After a fresh DB reset, run receipt setup again using
the existing signing key. Restart a running dev process after configuration
changes. On this workspace the migration is already applied; its finalizer was
refreshed locally after stricter metadata validation during development.

Open http://127.0.0.1:3000, sign in, complete onboarding and enrol in
**JavaScript foundations v2**. Open an unlocked lesson, then use
**Lesson tutor → Ask lesson tutor**. After completion, the tutor shows reported
input/response/thinking totals when available and the remaining daily app
allowance. **Cancel guidance** stops receiving the stream. **Recover saved
reply** uses the same request identity and cannot make a second AI dispatch.
Choose a different guidance option to create a new request.

Use `TUTOR_MODE=scripted` for prepared guidance or `TUTOR_MODE=disabled` for
lesson-only operation, then restart. Neither mode calls a provider. A full token
allowance or a paused live policy still permits reading and protected grading.

## Limits and accounting

| Control                 | Starting value                 | Scope                      |
| ----------------------- | ------------------------------ | -------------------------- |
| Shared tutor requests   | 20 per learner; 1,000 globally | Scripted and live, UTC day |
| Live token reservation  | 65,536                         | Each admitted live request |
| Learner token allowance | 250,000                        | Live tokens, UTC day       |
| Global token allowance  | 5,000,000                      | Live tokens, UTC day       |

Admission and finalization use one short PostgreSQL transaction lock across
learners. No transaction stays open during provider I/O. A token denial rolls
back the request-unit claim and request identity, so a denied request consumes
neither allowance. An admitted identity is single-use even after a failure or
policy pause. Existing access, onboarding, course review and prerequisite checks
still apply. A completed owned receipt can be read while admission is paused.

The server validates final cumulative metadata after natural stream completion;
it never sums chunk counters. Total equals input + response + thinking for this
adapter, which does not use tools. Cached tokens are already within input and
are not added again. System instructions count as input. See Google's
[usage metadata definition](https://ai.google.dev/api/generate-content#UsageMetadata)
and [token guide](https://ai.google.dev/gemini-api/docs/tokens).

Valid final usage replaces the reservation once in both buckets, on the
request's original UTC day. A server HMAC binds owner, request, reply and usage.
The browser never receives the signing capability or supplies trusted counts.
Repeated identical finalization is harmless; altered, forged or late usage
cannot refund the allowance. Invalid, missing, decreasing, early-only or
interrupted metadata keeps the entire reservation, including prepared fallbacks
with unknown provider usage. Cancellation racing a completed database write may
leave a finalized, recoverable receipt.

For example, one unfinished request plus a completed 718-token reply charges
65,536 + 718 = 66,254, leaving 183,746 of 250,000. Three unresolved requests
charge 196,608; the next reservation cannot fit. Midnight UTC starts new daily
buckets. A late reply reconciles the earlier day, without refunding today's
bucket. Account deletion removes owned requests/receipts/token buckets; it does
not refund already consumed or uncertain global usage. No historical token
counts are fabricated for claims created before this migration.

The payload byte bound includes the system instruction and generation settings,
but is only an estimate, not a guaranteed tokenizer or monetary upper bound.
Actual usage above the reservation is charged fully and disables new live
admission globally. Other already-admitted requests can still finish. Provider
aborts do not guarantee the provider stops its work. Currency estimates,
automatic refunds for uncertain work and provider billing synchronization are
not implemented. An unavailable allowance refresh can leave the UI's previous
conservative snapshot until recovery; the database remains authoritative.

## Local operator inspection

Use the local Supabase Studio SQL editor at http://127.0.0.1:54323. These private
tables are inaccessible to learner/anonymous roles. Inspect only the policy and
aggregate counts; no receipt or provider key is needed:

```sql
select enabled, per_request, user_daily, global_daily
from tutor_private.token_policy where singleton;

select day, charged
from tutor_private.token_buckets
where scope = 'global' order by day desc;
```

If the UI says live AI is paused, inspect why the policy was disabled and resolve
the overrun cause before an operator deliberately re-enables it. Do not reduce
charges, delete buckets, rotate keys or reset the DB just to restore allowance.
Policy values are private operator settings, not learner-editable preferences.
There is no staff budget UI or automatic overrun recovery in this slice.

## Repeatable checks

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:db
npm run build
npm run db:types:check
# Local browser/RPC and synthetic stream tests; no provider dispatch:
TUTOR_MODE=live npm run test:integration -- token-usage.spec.ts tutor-stream.spec.ts
TUTOR_MODE=scripted npm run test:integration -- tutor.spec.ts
TUTOR_MODE=disabled npm run test:integration -- tutor.spec.ts
```

Integration tests use running local Supabase and disposable learners, then remove
them. The accounting test requires existing local receipt setup and skips if the
key is absent. It reserves tokens conservatively; deleting its test learners
does not refund the global bucket. Normal CI never implicitly calls Gemini.
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select an installed Chromium binary.

To explicitly make one real provider request with a temporary test learner:

```sh
TUTOR_MODE=live LIVE_TUTOR_SMOKE=true npm run test:integration -- live-tutor.spec.ts
```

The live smoke can pass with clearly labelled prepared fallback; inspect its
recorded adapter and usage before claiming actual provider success. The operator
evaluation runner (`npm run eval:tutor -- --live`) has its own bounded case count
and does not use learner database token reservations. Hosted proxy disconnects,
monetary controls, other providers and independent human/pilot safety validation
remain separate work. Workspace verification and canonical progress records live
in `../docs/`; they are outside this application Git repository.
