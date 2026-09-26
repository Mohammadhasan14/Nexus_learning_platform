# Nexus Learning

Next.js learning platform with a public homepage, accounts, onboarding, learner dashboard, versioned lessons, protected grading and saved progress. Phase 3 is complete with an explicitly AI-assisted editorial review of the introductory course. AI tutor and payments remain later work.

## Preview without a backend

Use Node 24 (tested with 24.19.0). From the workspace root:

```sh
cd nexus_learning_platform
npm ci
npm run dev -- --webpack
```

Open http://127.0.0.1:3000. Without Supabase configuration, public pages work and account pages show an explicit unavailable state. There is no fake account or auth bypass. Production preview: `npm run build` then `npm start`.

The supported webpack build avoids this workspace's Turbopack internal-port restriction. On this Linux machine Node is at `/home/hasan/.config/nvm/versions/node/v24.19.0/bin`; prepend it to PATH if needed. A sandbox may require local server permissions.

## Enable local accounts

See [Phase 2 setup](../docs/PHASE_2_SETUP.md) for Docker/Supabase setup, email confirmation, environment boundaries and verification limitations. No hosted services are required. Real local Supabase integration is verified; see [Phase 3 setup](../docs/PHASE_3_SETUP.md).

```sh
npm run db:start
npx supabase migration up --local # preserves existing local learner records
npm run db:env   # first setup only; refuses to overwrite .env.local
npm run dev -- --webpack
```

Register at `/register`, confirm through local email testing at http://127.0.0.1:54324, then complete onboarding. `/settings` edits private preferences. `npm run db:stop` stops local services.

## Verification

```sh
npx playwright install chromium
npm run check
```

`check` runs formatting, lint, TypeScript, unit tests, isolated PostgreSQL policy/content tests, production build, public browser tests and account-flow tests. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select a preinstalled Chromium binary.

The flow suite uses an explicitly test-only HTTP provider on port 54331 and app port 3102. It tests the real app's SSR forms/cookies/UI; it is not evidence of live Supabase compatibility. `test:db` uses PGlite with minimal Supabase auth shims to execute real migration SQL. No fixture is imported by application code.

With real local Supabase running, separately run `npm run db:test:local`, `npm run db:types:check` and `npm run test:integration`. These fail if local services are missing; they never target hosted projects. The integration test creates and deletes unique synthetic accounts.

## Structure and tracking

- `app/`: public/account pages, protected learner route group, server actions and confirmation handler.
- `components/`: shared UI, marketing, account and learner components.
- `lib/auth/`, `lib/supabase/`: verified sessions, guarded configuration and request-scoped clients.
- `modules/profile/`: validated preference updates and timezone options.
- `supabase/`: versioned migrations, local config, confirmation template and real pgTAP checks.
- `tests/`: public, fixture-backed account, isolated SQL and real local integration suites.
- `../docs/features.csv`: canonical feature register; spreadsheets do not synchronise automatically.
- `../docs/PROGRESS.md`, `../docs/DECISIONS.md`: handoff state and architecture decisions.

Root GitHub Actions configuration includes local checks and a separate local-Supabase job. Neither remote CI execution nor branch protection is claimed. No deployment workflow is included.

## Phase 3 learning

After signing in and completing onboarding, open `/courses`. Local Supabase provides versioned enrolment, a three-question starting check, three introductory JavaScript lessons, protected option-based grading, and saved evidence. Reading and practice are tracked separately; no learner code is executed. V2 has aligned objectives/questions and balanced answer positions, with its AI-assisted editorial review disclosed. Existing v1 enrolments retain their preview content and evidence; enrolling in v2 starts separate progress. No human or independent assessment validation is claimed.

Apply new local migrations with `npx supabase migration up --local` without resetting existing records. Run `npm run db:types` after schema changes; type generation now uses the running local provider. `npm run check` is Docker-independent; `npm run db:test:local`, `npm run db:types:check`, and `npm run test:integration` require Docker/Supabase. Browser suites have separate result directories.

The workspace's canonical task register and handoff live in `../docs/features.csv` and `../docs/PROGRESS.md`; the editorial review record is in `../docs/PHASE_3_CONTENT_REVIEW.md`. These workspace files are outside this app Git repository. Phase 4 requires separate instruction.

## Phase 4 scripted tutor

Run `TUTOR_MODE=scripted npm run dev -- --webpack` after applying local migrations to enable prepared guidance on reviewed v2 lessons. The tutor is clearly labelled, links to its lesson source, and makes no external AI calls. Unset the variable or use `TUTOR_MODE=disabled` for the lesson-only fallback.

Demo allowances are 20 requests per learner and 1,000 globally per UTC day, enforced atomically in PostgreSQL with idempotent retries. These are request units, not live spending limits. `npm run test:tutor` runs the fixed scripted evaluations and isolated quota/reconciliation tests; the real integration suite adds browser and concurrent quota checks. See [Phase 4 setup](../docs/PHASE_4_SETUP.md). Live provider, streaming, monetary controls and live-model evaluations remain pending.

## Phase 5 projects and reviews

Apply local migrations, then open `/reviews` and `/projects` after signing in. Reviews follow the latest saved practice result using your timezone: one calendar day after an incorrect answer, three after a correct answer. No daily job is required.

Passing all JavaScript v2 practice checks unlocks the study-planner project. Save private milestone revisions against rubric v1, retain earlier submissions and get clearly labelled completeness feedback. This is not correctness grading; submitted code is never executed. Stale saves report a conflict and keep your text. The dashboard shows your due count and saved project revision. See [Phase 5 setup](../docs/PHASE_5_SETUP.md).

Live AI stays disabled. The isolated runner, notes, publishing/admin, search, analytics and error reporting remain separate Phase 5 backlog items.
