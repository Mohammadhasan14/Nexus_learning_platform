# Foundations — first bounded lesson

Implementation checkpoint: 2026-11-01. This is NX-046.23, the first child of
NX-046.22 in the canonical [feature register](../features.csv), not completion
of the beginner-to-advanced course. Current verification is in
[PROGRESS.md](../PROGRESS.md).

## Branch and route

`feat/studio-foundations-web-request` starts from verified M1 head
`49172274b38613ef1efc130a93d7fb304e4dea1e`. Authenticated read-only inspection
found PR #1 still open/unmerged before branching. This branch depends on PR #1;
retarget/rebase after its eventual merge rather than merging it as part of this
slice. The original implementation session prohibited publication. On 2026-11-04,
the user authorised focused acceptance fixes, feature-branch publication, a stacked
PR and GitHub-hosted acceptance. Merge and deployment remain unauthorised.

Open `/courses/system-design-studio-v1/foundations/web-request-v1` after onboarding
and the existing System Design Studio enrolment. Courses offers Start foundations
then Open workshop. New Studio recommendations use foundations; an existing
worksheet revision keeps its workshop recommendation and unchanged route. No
prerequisite lock, extra enrolment, fabricated JavaScript lesson or progress reset.
No additional catalogue query is introduced into `learningData()`.

## Student journey and content review

Learn defines client, application server, database, request and response using
the campus event directory. Four manual steps trace browser → server → database
→ server → browser. Back/Next/Replay never submit assessment evidence. The diagram
uses HTML and small inline SVG icons, with the entire ordered textual journey
available in a disclosure. It is a simplified illustration, not a live request,
simulator or architecture editor. DNS, TLS, caching and other details are omitted;
not every request queries a database. Direct database access is explained as a
trust-boundary choice in this architecture, not a universal prohibition on
carefully authorised data APIs.

Practice has three objective checks: request initiator, database-querying
component, and request/response identification in a library opening-hours example.
Option explanations are unavailable until the learner has attempted that question.
Each submission returns feedback for the selected option; a separate explicit
action reveals feedback for every option. Two progressively more specific hints
are available after an attempt. Retry preserves earlier events and never promotes
a later correct answer into independent first-attempt evidence.

Recap repeats the journey and glossary, links back to practice and the existing
capacity workshop, and labels all four remaining lessons Planned, without links.
A self-reported viewed checkbox is saved with position. It is distinct from server
recorded attempts, correct responses and saved position; none completes the course
or establishes mastery. Unsubmitted selections remain only in this tab. Saving
position explicitly does not submit them.

**Provenance:** AI-assisted editorial review on 2026-11-01 checked the four arrows,
roles, simplified-architecture caveats, unambiguous questions, each option's
feedback, hint progression and recap against the stated learning objective.
Public teaching/options are in `modules/system-design/foundations/content.ts`;
trusted keys/feedback/hints are seeded only in `learning_private` by the additive
migration. No independent educator review, beginner pilot or learning-outcome
validation has occurred. Those are limits, not fabricated approval. No M1 formula,
worksheet identity or published JavaScript version was rewritten.

Pinned identities: `web-request-v1` / `web-request-content-v1` /
`foundation-position-v1`. Unsupported identities fail closed. Future changes
require new published identities; do not silently rewrite these seeds.

## Persistence and assessment boundary

Migration `202611010001_studio_foundations.sql` adds:

- `studio_foundation_lessons`: reviewed identity and existing course association.
- `studio_foundation_positions`: append-only owner-scoped explicit saves, pinned
  content/schema, base/current revision, request UUID, section/step/viewed position.
- `studio_foundation_events`: append-only attempts and help events, pinned content,
  server evaluation, selected answer, feedback issued and monotonic event order.
- `learning_private.foundation_answer_keys`: protected keys, option feedback and
  progressive hints. It is neither in the exposed schema nor the public payload.

All public records use RLS; private records are select-only to their owner, with
no unrelated staff bypass and no authenticated direct writes. Definer RPCs use
an empty search path, verified `auth.uid()`, onboarding, course experience,
enrolment and fixed lesson/version eligibility. No owner or grade is accepted.
Server Actions validate strict Zod contracts and guard against an account switch;
SQL independently checks RPC calls. Explicit ownership comes from SQL Auth, not
from the owner guard parameter.

Position saves serialize per owner, check the expected revision and bind an
idempotency key to the exact payload. A failed/ambiguous response keeps the same
key for unchanged retries. A conflict shows the saved position alongside the
current position; adopting it requires confirmation, while keeping the current
position only rebases the next explicit save. Earlier revisions stay intact.
Save failures/session loss retain React state. Recovery uses the same original
account in a second tab; no localStorage, browser Auth-state files or autosave.
Leaving with unsaved position/selections warns the learner.

Attempt evaluation and option validation happen in SQL using private keys.
Attempt number, independent-first-attempt eligibility, hint level and issued
explanation flags derive from stored events, never client flags. Identical retry
requests return the same result; conflicting key reuse is rejected. Selected-option
feedback counts as an answer explanation issued. "Shown" flags conservatively
record feedback issued/possibly seen even if a network response is lost, rather
than claiming proof of human attention. On resume, only the latest event of each
kind per question is returned (at most nine); full history remains in account
export. Non-attempt RPC calls use empty text as the generated text-argument's
no-choice sentinel; SQL normalises it to null only for hint/explain actions.

Position saves are capped at 1,000 revisions; attempts at 100 per question, plus
two hints and one full explanation. Out-of-range positions and unknown options,
versions or event kinds fail closed. Account export appends only the owner's two
private collections to the existing export wrapper and retains its size limit.
Auth deletion cascades both collections; the existing signed password-proof
account-deletion path is reused. No tutor scope, retention rule or JavaScript
attempt/progress table is changed.

## Changed-file map

- Route: `app/(learner)/courses/[course]/foundations/[lesson]/page.tsx`.
- Workspace/diagram/practice/save UI:
  `components/system-design/foundations/lesson.tsx` and `lesson.module.css`.
- Public content and strict contracts, authenticated data loading and actions:
  `modules/system-design/foundations/{content,schema,data,actions}.ts`.
- Discovery/continuation: `app/(learner)/courses/page.tsx`,
  `modules/learning/rules.ts`, `modules/system-design/links.ts`.
- Schema: `supabase/migrations/202611010001_studio_foundations.sql`;
  declarations: `lib/supabase/database.types.ts`; isolated generator mode:
  `scripts/studio-database-types.ts`.
- Checks: `tests/unit/foundations.test.ts`, `tests/database/foundations.test.ts`,
  `tests/integration/foundations.spec.ts`, `supabase/tests/foundations.sql`;
  existing `package.json` suite entries include the new focused files.
- Remote preparation: `scripts/ci-provider-{acceptance,policy}.ts`,
  `tests/unit/ci-provider.test.ts`, `.github/workflows/ci.yml` artifact paths.
- Canonical tracker/handoff and relevant guides: `docs/features.csv`,
  `docs/PROGRESS.md`, this document, `PLAN.md`, `IMPLEMENTATION.md`,
  `PROVIDER_ACCEPTANCE.md`, `docs/CI.md`, `docs/PRIVACY_EXPORT_SETUP.md`.

## UI and verification gates

The learner shell/branding is reused. Foundations navigation is a collapsible
native disclosure; planned lessons are plain text. Learn/Practice/Recap uses
keyboard-operable tabs with arrows/Home/End. Position, walkthrough and practice
state survive section changes and resizing. Desktop has a spacious horizontal
diagram; narrow layouts stack its nodes and arrows. Controls wrap with 44px
minimum targets. The normal-flow save area does not cover content. CSS uses
existing navy/violet/cyan tokens; reduced motion removes the subtle border/color
transition. There is no autoplay or extra theme control.

Focused unit and isolated SQL checks exercise transition bounds/replay, strict
contracts, route selection, key isolation, authoritative grading, help/retry
history, idempotency, conflicts, RLS, export and signed deletion. Existing M1 and
JavaScript SQL regressions run separately. PGlite uses Auth shims and is not
Supabase-provider evidence.

`tests/integration/foundations.spec.ts` prepares two real-provider browser cases:
full enrol/learn/practice/recap/save/reload journey; desktop/narrow Axe and keyboard;
320/390/768/1440 widths; reduced-motion preference; two-tab conflict/rebase; failed
save; missing-cookie and wrong-account recovery with selection retained; direct
write/owner/staff isolation; concurrent idempotent retries; pinned identities;
export and password-confirmed account deletion with synthetic Auth users; existing
JS route/read continuity. They are
prepared, not run. Forced provider-side JWT expiry, physical devices and actual
screen readers remain separate gates. `supabase/tests/foundations.sql` prepares
24 additional pgTAP assertions; do not count them as executed.

The existing hosted-only disposable provider wrapper now expects the additive
migration after M1, checks preservation of a synthetic saved M1 worksheet and JS
reading record across the upgrade, requires both foundations browser cases, preserves all M1
requirements and adds two masked screenshot paths to the seven-day artifact
allowlist. It still uses synthetic accounts, disabled Vector and scoped cleanup.
No workflow has been triggered. No package, lockfile, credentials, provider or
application environment was changed.

Public database types contain isolated-catalog-generated additions from
`node --import tsx scripts/studio-database-types.ts --foundations`. Full provider
generation/drift checks, provider pgTAP/Auth/browser evidence, production build,
normal heavy suites and route performance budgets await an authorised hosted run.
Earlier M1 acceptance proves its verified head, not these new changes. No new
screenshots were captured locally.

Next small slice after reviewing/accepting this lesson: NX-046.24, APIs and data.
NX-046.22 stays In progress until all its children meet their acceptance gates.

## Remote acceptance authorised — 2026-11-04

The reported uncommitted state was stale: five requested commits already recorded
the complete implementation through `6228939`, with a clean worktree. Fresh
authenticated inspection found PR #1 still open at verified head `4917227`, so the
foundations PR will target `ci/studio-m1-provider-acceptance`. The workflow's
unfiltered `pull_request` event supports that base; no trigger adjustment is
needed. Retarget and reverify foundations against main after M1 eventually merges.
No hooks, environments, deployments or external deployment checks were found.

Preparation extends pgTAP to 36 foundations assertions, checks the four visual
paths against the textual journey with keyboard controls, and requires masked
Learn, Practice-feedback and Recap captures at 390/1440 pixels. All sections get
Axe/overflow/touch-control checks at 320/390/768/1440 pixels. Raw errors, tokens,
Auth state, private logs and automatic failure screenshots remain excluded. The
existing seven-day allowlist gains four explicitly named Practice/Recap PNGs;
its historical artifact name is unchanged. These are prepared checks, not passed
provider evidence. NX-046.23 stays In review until actual acceptance.
