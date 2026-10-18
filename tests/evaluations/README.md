# Tutor evaluations — NX-022.2

These cases test the current **bounded-intent** Gemini tutor. The real-model collection tool uses the non-streaming adapter; the application supports streaming separately. No free-form student reasoning or uploaded document ingestion exists. The suite is an opt-in operator tool, not a learner endpoint or independent safety certification.

The separate [offline streaming regressions](streaming-regressions.md) cover
transport failures, cancellation, receipt races and adversarial rendering. Run
`npm run eval:tutor:streams` without a provider key or Docker; it uses synthetic
responses, an isolated database and two loopback HTTP tests. These tests do not
count as real-model semantic approval.

## Run

From the app directory, with Node 24:

```sh
npm run eval:tutor
# Explicitly send synthetic cases to the configured local free-tier provider:
npm run eval:tutor -- --live
# A smaller regression run:
npm run eval:tutor -- --live --only=js-v2-conditions-example,missing-context-explain
# Separate extended streaming suite (dry unless --live is explicit):
npm run eval:tutor -- --suite=extended
npm run eval:tutor -- --live --suite=extended
```

The default command is a dry run and makes no provider calls. Live mode uses the existing `.env.local` settings and requires `APP_ENV=local`, `TUTOR_MODE=live`, `LLM_FREE_TIER_ONLY=true`, Gemini and a private key/model. The free-tier flag records the operator's assertion; it cannot verify provider billing. Keep paid billing disabled. Normal CI and `npm run check` never run the live evaluation command.

The runner reconstructs the reviewed public v2 lesson fixture from migrations in isolated PGlite. It does not connect to the real learner database or select profiles, notes, attempts, exercise choices or private grading keys. Two adversarial contexts and two incomplete contexts are synthetic modifications used only in evaluation; none are published to the app.

Each suite contains 16 cases; the runner never combines them into an unlimited run. Every run contains at most 16 single-attempt cases, processed sequentially with ten seconds between cases. It stops on the first unavailable/fallback reply, marks remaining cases Not run, and never retries automatically. An uncertain dispatch is recorded before I/O. This operator benchmark uses its own hard request cap instead of app reservations; running it consumes provider quota independently of learners. Project limits can still reject requests. Do not repeatedly rerun an unavailable or rate-limited run. The baseline uses the original 12-second non-streaming adapter; extended uses the application's 20-second streaming adapter and records validated final token usage when available. Neither sends partial output to the operator console.

Reports go to `test-results/tutor-evaluations/<timestamp>.json`, ignored by Git. The report records the configured model, prompt version/hash, adapter hash, case/context hash, HTTP status, elapsed time, source, reply, screening warnings and a pending review. Provider error bodies and credential values are excluded; the current key is also redacted before report writing. No resolved provider weight revision or monetary/token reconciliation is inferred from the model name.

## Review and acceptance

The baseline matrix has twelve accuracy cases (three lessons × four intents), two insufficient-context cases and two adversarial-reference cases. The separate extended suite adds four ambiguity cases (quoted numeric text, return versus logging, a conflicting reference, reflection without unseen reasoning), four beginner-English clarity cases and eight attacks across title, objective, body and example. The attacks cover role/authority spoofing, secret/tool demands, fake sources, an encoded order, false assessment claims and HTML exfiltration. These are synthetic modifications, never published lesson revisions. Language scope is beginner English clarity, not multilingual support.

Each case has an explicit rubric. All actual replies must be reviewed for accuracy, lesson grounding, beginner clarity, useful intent behavior, uncertainty, fabricated source/assessment claims and direct exercise answer selection. Different examples must not reuse the lesson's example. All hints must avoid resolving the current practice task. Explanations necessarily teach concepts that also appear in diagnostic questions; this does not prove prevention of implicit answer inference. Retain original cases and old reports unchanged. Extended collection records suite version, context/case hash, prompt version/hash, adapter hash/mode, configured model alias, HTTP outcome and final usage (or unknown); the alias is not proof of a resolved weight revision.

Automated screening finds some suspicious phrases/URLs/length issues. Zero warnings **does not** mean semantic approval. A fallback, transport error, timeout or Not run is **never** a live quality pass. The command's successful exit means collection succeeded; it is not a semantic release gate. Archive reviewed synthetic reports only, identifying reviewer and actual limitations. Require every fixed case to receive a Pass review before claiming this slice verified.

[Archived runs](reports/): baseline 12 Pass/4 Needs changes; prompt v2 14 Pass/2 Needs changes; prompt v3 16 Pass/0 Needs changes. Reviewer: Codex, AI-assisted editorial review, not an independent human review. One reply per case per prompt, 48 evaluation requests total. Failed candidates remain visible. These finite samples do not establish a statistical accuracy rate, comprehensive injection resistance or a public-release guarantee.

The review found misleading assignment/const explanations and requests for content through an interface without chat input. The versioned prompt now keeps example explanations focused on actual code, distinguishes const reassignment errors, and explicitly acknowledges missing context. The adapter also rejects unknown lesson IDs, blank/unbounded context and invalid intents before provider dispatch. Replies remain escaped text; paragraph/code line breaks are preserved.

## Extended collection — 2026-10-16

The first extended streaming run received HTTP 503 on its first synthetic case
and stopped: **one attempted dispatch, zero completed live replies, 15 Not run**.
The [unavailable report](reports/extended-unavailable-2026-10-16.json) preserves
the actual outcome and pending reviews. It is not an editorial quality pass.
That dated run remains unavailable evidence; it was not automatically retried.

On the user's explicit 2026-10-17 resume, a new full extended run captured all
16 live replies. Individual AI-assisted editorial review found **15 Pass and
1 Needs changes**, preserved in
[the initial extended report](reports/extended-initial-2026-10-17.json). The
conflicting-reference reply correctly acknowledged missing information, but
omitted the required direction to continue using the lesson and practice
feedback. Automated screening reported no warnings, demonstrating why screening
alone cannot establish rubric compliance.

The app now completes only that exact canonical short uncertainty sentence with
the existing next-step message. Other provider text remains unchanged; both
streaming and non-streaming adapters have an observed-response regression test.
The model alias, system prompt and prompt version remain unchanged. This is an
application response fix, not a claim that the model learned or that every
possible insufficient-context response is covered. New reports include the
output-policy version/hash alongside model/prompt/adapter/case metadata.

A separate intentional [one-case live recheck](reports/extended-uncertainty-recheck-2026-10-17.json)
passed with the full canonical response and `canonical-uncertainty-1` policy.
This is **15 original passes plus one corrected/rechecked case**, not a newly
collected second full matrix or independent human approval. Across the slice:
one unavailable dispatch on October 16, then 16 full-run dispatches and one
targeted dispatch on October 17. Each run was bounded and no unavailable request
was retried automatically. Old and failed reports are retained unchanged.

## Remaining scope

NX-022 remains partial against the broader build guide: submitted wrong student reasoning is unavailable under the present input contract; evaluate it when such an interface is implemented. NX-020.2 supplies streaming and trusted response receipts; NX-021.3 supplies local token accounting. NX-022.3 adds fixed transport, receipt-race and adversarial-boundary regressions. Hosted proxy disconnects, learner/human validation and broader real-model adversarial/ambiguity/language samples remain future release evidence. Currency controls remain in NX-021. This operator quality runner still bypasses learner token reservations.

References: [build guide](../../docs/BUILD_GUIDE.md), [Google safety guidance](https://ai.google.dev/gemini-api/docs/safety-guidance), [rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits). Model output can vary across runs; preserve the failed and passing evidence rather than overwriting it.
