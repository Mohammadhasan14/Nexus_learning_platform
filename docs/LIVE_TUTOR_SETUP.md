# Local live tutor testing

Nexus supports an explicitly enabled local Gemini pilot. Existing scripted mode still works. The user confirmed this project's paid billing is disabled on 2026-09-30. No paid service was provisioned.

In `.env.local` at the repository root (ignored by Git):

```dotenv
APP_ENV=local
TUTOR_MODE=live
LLM_FREE_TIER_ONLY=true
LLM_PROVIDER=gemini
LLM_API_KEY=your_private_key
LLM_MODEL=gemini-3.1-flash-lite
```

The local flags have already been set and the user's key preserved. Never put the key in `NEXT_PUBLIC_` settings, source control, screenshots, browser code or chat. Unsupported providers, missing settings and hosted APP_ENV values disable the live tutor. These variable names are generic, but only Gemini has an adapter today. Adding a different provider requires an adapter and its tests; changing its name alone will not connect it. Endpoints are fixed in code rather than accepting an arbitrary URL that could receive the secret.

Run from the app directory:

```sh
npm run db:start
npx supabase migration up --local
npm run tutor:receipts:setup
npm run dev
```

The migration is already applied locally; no reset is needed. Restart an existing dev process to reload configuration. Sign in, enrol in **JavaScript foundations v2**, open an unlocked lesson, and use **Lesson tutor → Ask lesson tutor**. Four intents are available: hint, explanation, different example and reflection. Guidance streams as it arrives. Cancel guidance aborts receiving the response; Recover saved reply retrieves a completed receipt without a second AI call. There is no free-form chat. To disable external calls, set `TUTOR_MODE=scripted` (prepared guidance) or `TUTOR_MODE=disabled` and restart.

## Receipt signing setup

`npm run tutor:receipts:setup` is an explicit local operator command. It asserts
local app/backend configuration and a running local CLI project, generates a
separate 256-bit `TUTOR_RECEIPT_SIGNING_KEY` if absent, and provisions it in the
private database using Docker/psql stdin. It does not display credentials or
introduce a service-role app client. Run it after migrations and after a local
DB reset (reuse the existing key); restart dev to reload `.env.local`. Docker
group access is required, as for the other local Supabase commands. Never put
this value in `NEXT_PUBLIC_`, source control, API responses or screenshots.
If the app key is missing, the route fails before quota/provider dispatch;
if the DB key is missing or mismatched, saving/reporting fails visibly. Repair
with the setup command. Hosted secret management and rotation remain future work.

## Boundaries

- Each authorised streaming request obtains a single-use database claim, after onboarding, reviewed-course and prerequisite checks. The existing daily allowance is shared with scripted requests: 20 per user and 1,000 globally, midnight UTC. One claim permits at most one dispatch, including concurrent requests/retries. Completed owned replies can be recovered without redispatch or new quota. A pending/aborted request cannot be resent; choose another intent for a new request. Failures/uncertain provider usage remain counted.
- Only reviewed lesson title, objective, body, example and a bounded intent go to Gemini. No account identifiers, profile, personal notes, practice submissions, exercise prompts/options or private grading keys are included. Provider output is escaped plain text; source links come from trusted lesson identity. No tool calling or code execution.
- Streaming requests have a 20-second provider abort deadline (35 seconds in the browser), bounded context/output/body size, no redirects and no automatic retries. Errors, quota responses, blocked/malformed/truncated output and timeouts return explicitly labelled prepared guidance. The provider may still finish work after a network abort.
- Live requests also reserve 65,536 tokens against atomic per-user/global daily allowances of 250,000/5,000,000. Validated final usage is server-signed and reconciled once on the original UTC day; unknown or interrupted usage retains its reservation. Measured overruns are charged fully and pause new live admission. After guidance, the lesson panel shows reported usage and the learner's remaining allowance. These app limits are separate from provider quotas. See the [token accounting/operator guide](tutor-token-accounting.md).
- `LLM_FREE_TIER_ONLY=true` records the operator's billing assertion; it does not query Google billing or enforce a monetary budget. Keep paid billing disabled. Token accounting is local-only; currency estimates/caps and paid/hosted operation remain unsupported.
- Free-tier data may be used by Google for product improvement. Use synthetic test content. AI guidance can be inaccurate and never grades work or establishes mastery.
- Completed live or prepared fallback replies are stored as immutable private receipts after server signature verification. Report this tutor response quotes the saved receipt, never client-provided text. Partial/cancelled output is not a completed receipt; cancellation racing a completed database write can leave a recoverable reply. Learner retention/clearing can now remove reply text while preserving usage and request metadata. A late receipt after clearing still reconciles usage without restoring text. Reported copies remain separately stored until the application account-deletion control removes owned reports and private learner/tutor data. See [privacy controls](PRIVACY_CONTROLS_SETUP.md).

## Verification commands

```sh
npm run test:tutor
npm run lint
npm run typecheck
npm run build
# Explicit live request, temporary test learner, requires running local Supabase:
TUTOR_MODE=live LIVE_TUTOR_SMOKE=true npm run test:integration -- live-tutor.spec.ts
# Local token/RPC and live UI regression, no provider calls:
TUTOR_MODE=live npm run test:integration -- token-usage.spec.ts tutor-stream.spec.ts
# Existing regression, no provider calls:
TUTOR_MODE=scripted npm run test:integration -- tutor.spec.ts
TUTOR_MODE=disabled npm run test:integration -- tutor.spec.ts
```

Ordinary tests skip the opt-in live browser test. Its pass means the live UI and either a provider response or a labelled fallback work; see the verification record for observed provider results. No remote CI or comprehensive model-safety evaluation is implied.

Implementation references: [Gemini text generation](https://ai.google.dev/gemini-api/docs/text-generation), [REST API](https://ai.google.dev/api/generate-content), [pricing and data use](https://ai.google.dev/gemini-api/docs/pricing).

## Real-model evaluation follow-up

NX-022.2 adds `npm run eval:tutor` (dry by default) and an explicit `--live`
16-case runner. Prompt v3 and stricter context validation resolve the sampled
accuracy/usability issues; replies preserve plain-text code and paragraph line
breaks. See the [app evaluation guide](../tests/evaluations/README.md)
for archived failed/passing runs and review limitations. This does not complete
submitted-reasoning evaluation or monetary controls. NX-020.2 adds streaming,
cancellation and trusted receipts; NX-021.3 adds local token reservations and
provider usage reconciliation. The evaluation runner has a separate case-count
limit and bypasses learner database token reservations.
