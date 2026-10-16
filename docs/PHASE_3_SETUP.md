# Phase 3 local review checkpoint

Run from the repository root (the directory containing `package.json`):

```sh
npm run db:start
npx supabase migration up --local
npm run dev -- --webpack
```

Do not reset a database with learner records. The Phase 3 migrations were applied additively to the existing local stack. Existing `.env.local` remains unchanged.

Sign in, complete onboarding, then open `/courses`. Enrol in JavaScript foundations v2. Read the first lesson, mark it read, try a wrong answer, retry, and pass its practice to unlock the next lesson. Refresh to see saved attempts and progress. V2 contains three ten-minute introductory lessons with a recorded AI-assisted editorial review. It is a narrow introductory course; no human approval or independent assessment validation is claimed. Previously enrolled v1 previews remain available with their original evidence; v2 starts with separate progress.

`npm run check` covers formatting, lint, TypeScript, units, isolated SQL, production build and existing public/fixture browser suites. With Docker running, use `npm run db:test:local`, `npm run db:types:check`, and `npm run test:integration`. Type generation now requires local Supabase and includes its RPC/view definitions. Never supply production admin credentials to tests.

The starting check shows saved topic evidence and explains its limited scope.
Catalogue and dashboard recommendations use that evidence while retaining
practice prerequisites. Read and practice counters are separate. Tutor
availability depends on the configured mode; see [scripted guidance](PHASE_4_SETUP.md)
or the [local live pilot](LIVE_TUTOR_SETUP.md).

All final local checks passed on 2026-09-24: `check`, five real-provider scenarios, 26 pgTAP assertions and provider type drift. See [verification (local archive)](README.md#historical-evidence). The prior trace-file collision and answer-reset bug are fixed. Screenshots at 320/768/1440 are saved; desktop/mobile reviewed.

Review completed by Codex on 2026-09-24. See [review record](PHASE_3_CONTENT_REVIEW.md) for corrections, reviewer identity and validation limits. V1 retains its preview status; v2 discloses AI-assisted review. No Phase 4 work, deployment or hosted provisioning occurred.
