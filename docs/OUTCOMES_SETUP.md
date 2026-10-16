# Learning outcome analytics — NX-033

From the repository root, run:

```sh
npm run db:start
npx supabase migration up --local
npm run dev -- --webpack
```

The migration is already applied on this machine. Sign in and open **Outcomes** (`/outcomes`), also available through workspace search. Complete a lesson practice check and reload Outcomes. Without qualifying evidence, rates say **Not enough evidence yet** rather than implying zero ability.

## Measures and denominators

First checks without recorded support count practice attempts made with no prior attempt anywhere in that lesson and no recorded tutor request for it. The rate is correct qualifying attempts / all qualifying attempts. Diagnostic feedback excludes later practice from this group. This is an independence proxy; outside help and prior exposure cannot be verified.

Delayed checks count practice at least 24 elapsed hours after the immediately previous correct attempt on the same exercise, with no earlier recorded tutor request for the lesson. The rate is correct qualifying delayed attempts / all qualifying delayed attempts. A previous incorrect answer or an immediate retry does not qualify. These are familiar questions, not unseen transfer tasks, so the rate is not a validated retention or mastery score. Calendar-day scheduling in Reviews is a separate policy.

Any already recorded tutor request counts conservatively, including an uncertain request; actual text/use is not inspected. Concurrent in-flight or external assistance cannot be detected. Timestamps and outcomes come from the trusted grading transaction. Identical submission retries create one event. Content versions remain separate.

Events begin at migration installation; earlier attempts are not backfilled. Earlier attempts can still provide prior exposure counts and the previous-result/time baseline for a new event. Summaries include all your events; the page lists only the latest 20 for inspection. Diagnostics appear in the list but not in the practice rates. Reading, streaks and project-text completeness are not graded outcomes.

## Privacy and access

Normal application users can read only their own event metadata and summaries, including when another account is staff. Clients cannot insert, update or delete events directly. The schema holds no raw answer, code, notes, chat text or tutor response. It is not an anonymous dataset: owner/content IDs are still personal metadata. Nothing is sent to an analytics vendor. Account deletion cascades records; an export/deletion UI and a broader retention policy remain later work.

Live AI remains disabled. Existing scripted tutor/report receipts are a separate feature; this event stream does not copy their contents. No new independent-task bank, project correctness grader, staff cohort dashboard or practice runner was introduced.

## Verification

`npm run check` includes the outcome SQL tests; `npm run test:integration -- outcomes.spec.ts` covers the local browser workflow with temporary accounts. Local pgTAP/type checks remain `npm run db:test:local` and `npm run db:types:check`. See `verification/phase5-outcomes/README.md` for actual results and limitations.
