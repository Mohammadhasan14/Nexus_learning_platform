# Tutor evaluations — NX-022.2

These cases test the current **bounded-intent** Gemini tutor. No free-form student reasoning, uploaded document ingestion or streaming exists. The suite is an opt-in operator tool, not a learner endpoint or independent safety certification.

## Run

From the app directory, with Node 24:

```sh
npm run eval:tutor
# Explicitly send synthetic cases to the configured local free-tier provider:
npm run eval:tutor -- --live
# A smaller regression run:
npm run eval:tutor -- --live --only=js-v2-conditions-example,missing-context-explain
```

The default command is a dry run and makes no provider calls. Live mode uses the existing `.env.local` settings and requires `APP_ENV=local`, `TUTOR_MODE=live`, `LLM_FREE_TIER_ONLY=true`, Gemini and a private key/model. The free-tier flag records the operator's assertion; it cannot verify provider billing. Keep paid billing disabled. Normal CI and `npm run check` never run the live evaluation command.

The runner reconstructs the reviewed public v2 lesson fixture from migrations in isolated PGlite. It does not connect to the real learner database or select profiles, notes, attempts, exercise choices or private grading keys. Two adversarial contexts and two incomplete contexts are synthetic modifications used only in evaluation; none are published to the app.

Every run contains at most 16 single-attempt cases, processed sequentially with ten seconds between cases. It stops on the first unavailable/fallback reply, marks remaining cases Not run, and never retries automatically. An uncertain dispatch is recorded before I/O. This operator benchmark uses its own hard request cap instead of app reservations; running it consumes provider quota independently of learners. Project limits can still reject requests. Do not repeatedly rerun a rate-limited run.

Reports go to `test-results/tutor-evaluations/<timestamp>.json`, ignored by Git. The report records the configured model, prompt version/hash, adapter hash, case/context hash, HTTP status, elapsed time, source, reply, screening warnings and a pending review. Provider error bodies and credential values are excluded; the current key is also redacted before report writing. No resolved provider weight revision or monetary/token reconciliation is inferred from the model name.

## Review and acceptance

The matrix has twelve accuracy cases (three lessons × four intents), two insufficient-context cases and two adversarial-reference cases. Each has an explicit rubric. All actual replies must be reviewed for accuracy, lesson grounding, beginner clarity, useful intent behavior, uncertainty, fabricated source/assessment claims and direct exercise answer selection. Different examples must not reuse the lesson's example. All hints must avoid resolving the current practice task. Explanations necessarily teach concepts that also appear in diagnostic questions; this does not prove prevention of implicit answer inference.

Automated screening finds some suspicious phrases/URLs/length issues. Zero warnings **does not** mean semantic approval. A fallback, transport error, timeout or Not run is **never** a live quality pass. The command's successful exit means collection succeeded; it is not a semantic release gate. Archive reviewed synthetic reports only, identifying reviewer and actual limitations. Require every fixed case to receive a Pass review before claiming this slice verified.

[Archived runs](reports/): baseline 12 Pass/4 Needs changes; prompt v2 14 Pass/2 Needs changes; prompt v3 16 Pass/0 Needs changes. Reviewer: Codex, AI-assisted editorial review, not an independent human review. One reply per case per prompt, 48 evaluation requests total. Failed candidates remain visible. These finite samples do not establish a statistical accuracy rate, comprehensive injection resistance or a public-release guarantee.

The review found misleading assignment/const explanations and requests for content through an interface without chat input. The versioned prompt now keeps example explanations focused on actual code, distinguishes const reassignment errors, and explicitly acknowledges missing context. The adapter also rejects unknown lesson IDs, blank/unbounded context and invalid intents before provider dispatch. Replies remain escaped text; paragraph/code line breaks are preserved.

## Remaining scope

NX-022 remains partial against the broader build guide: submitted wrong student reasoning is unavailable under the present input contract; evaluate it when such an interface is implemented. Streaming/disconnect fallback tests depend on NX-020. Learner/human validation and broader adversarial/ambiguity/language samples remain future release evidence. Token/currency reconciliation belongs to NX-021. Actual live-response reporting still needs trusted receipts.

References: [build guide](../../../Nexus_Learning_Build_Guide.md), [Google safety guidance](https://ai.google.dev/gemini-api/docs/safety-guidance), [rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits). Model output can vary across runs; preserve the failed and passing evidence rather than overwriting it.
