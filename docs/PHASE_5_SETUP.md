# Phase 5 first slice: projects and reviews

This delivery covers NX-018 review scheduling, NX-023 project revisions, and the remaining review/project actions on NX-004's dashboard. Other Phase 5 work remains in the canonical register; live AI remains disabled by user choice.

## Local preview

From the repository root, use Node 24 and the existing local Docker/Supabase setup:

```sh
npm run db:start
npx supabase migration up --local
npm run dev -- --webpack
```

Sign in and open `/courses`. Enrol in JavaScript foundations v2. A saved practice attempt creates a reminder under `/reviews`; passing all three practice checks unlocks `/projects`. The dashboard links to both and displays your own due count and saved project revision. Existing accounts and course evidence are preserved; do not reset your database.

## Review policy

`calendar-review-v1` uses the latest practice attempt for each exercise: incorrect → one calendar day later; correct → three calendar days later. Dates use the learner's current saved timezone. Starting checks and reading acknowledgements do not create reviews. Repeating practice updates the schedule; a wrong later answer changes its reminder without erasing historical passing evidence or locking previously unlocked lessons.

The security-invoker database view reads caller-owned attempts/profile/enrolments, computes dates on request and needs no daily job. Changing timezone recalculates dates; DST follows calendar dates rather than elapsed 24-hour intervals. This is a transparent introductory reminder policy, not a validated adaptive retention algorithm.

## Projects and feedback

The first project, **Build a study planner**, uses `study-planner-v1` with a versioned three-milestone rubric: values, conditions, functions. Each milestone accepts up to 4,000 characters of code and explanation. At least one milestone is required to save, so an incomplete project can be revised over time.

Every save creates an immutable, owner-scoped revision tied to its rubric version. Repeated delivery with the same request ID returns the original revision; conflicting reuse is rejected. A stale base revision is rejected with instructions to retain unsaved text and reload. Text is kept after failed saves. There is no claim of automatic draft persistence before a successful save.

`completeness-v1` feedback asks for more detail below 80 trimmed characters per milestone and otherwise asks the learner to compare the work against the criterion. It **does not evaluate correctness**. Code remains escaped text: it is not executed, sent to AI, or used to award trusted lesson grades. Human review and an isolated practice runner are separate backlog scope.

Learners cannot modify rubric versions or edit feedback/history directly. New published rubric content must get a new project version. Account deletion cascades project submissions. The current local interface loads revision history without pagination; production scaling/pagination and broader retention policy remain readiness work.

## Checks

```sh
npm run check
npm run test:integration
npm run db:test:local
npm run db:types:check
```

`tests/database/projects-reviews.test.ts` tests privacy, rubric/revision validation, conflict handling and timezone/DST scheduling. The real-provider browser scenario tests lost connections, concurrent saves, immutable revisions, ownership, review completion, dashboard evidence and accessibility at mobile/tablet/desktop sizes. The historical run results are in `verification/phase5/README.md` within the [local evidence archive](README.md#historical-evidence). Existing CI commands include the new tests; no remote CI result is implied.
