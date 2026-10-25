# Mobile and tablet review (NX-028)

Date: **2026-10-25**. Scope: implemented learner flows from 320 CSS pixels
through desktop, with Chromium touch emulation. Work began clean at `bde76a9`.
This is local development evidence; physical-device acceptance remains open.

## Confirmed issues and changes

Long synthetic identifiers, lesson titles and reference URLs caused horizontal
overflow. The corrected baseline reproduced it at 320, 390, 768, 1024 and 1440px.
Learner content now inherits `overflow-wrap: anywhere`, allowing otherwise
unbroken prose and navigation text to wrap. Code examples retain their intact
lines and scroll inside their own container. No content is hidden to make the
width check pass.

The compact sign-out control was 38px high at phone/tablet widths. Its existing
mobile rule now provides a 44px minimum height, matching the review's practical
touch-target goal. This is not a claim that every inline link has a 44px target
or that the application has passed all WCAG target-size criteria.

The other exercised touch interactions worked before these fixes: practice
selection/submission, note saves, JavaScript execution, prepared guidance,
project drafts/history, and synthetic live guidance cancellation/recovery.
They received regression coverage without changing their behavior.

## Repeatable coverage

`tests/flows/mobile.spec.ts` adds eighteen cases to the existing account-flow
suite. It uses `isMobile`/`hasTouch` contexts and actual browser tap events for
activation. See [Playwright emulation](https://playwright.dev/docs/emulation)
and [touch input](https://playwright.dev/docs/api/class-touchscreen).

- At 320/390/768/1024/1440px: populated dashboard, courses, lesson, starting
  checks, projects, reviews, reports, outcomes, search and Settings. Report
  snapshots and Settings confirmation disclosures are expanded.
- At the same five widths: long course/lesson/project titles, a long reference
  URL, exercise prompt/option, and a scrollable code example. Text is synthetic
  and optional in the test-only backend; normal accessibility fixtures are
  unchanged.
- At 320/768px: tap practice labels and submit, save notes, run temporary code,
  request prepared guidance, save project revisions and open their history.
  Change viewport dimensions with unsaved notes/code/project text and a selected
  answer, then verify the exact work remains.
- At 320/768px with 360px available height: open Quick Search, enter a query,
  submit, open a result, reopen/close, and sign out. Check selected primary
  controls, answer labels and tutor selectors against the 44px review goal.
- At 320/768px: cancel and recover live-client guidance by touch, with a long
  completed reply. Every `/api/tutor` request is intercepted before the real
  application/provider; all keys and accounts are synthetic.

Width checks compare document scroll width to the **layout viewport's
clientWidth** and assert that it equals the configured CSS width. On a mobile
context, `innerWidth` can grow with overflowing content and conceal a failure.
Long code is separately checked for local horizontal scrolling; prose reflows
instead. [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
explains why a scrollable region does not justify making surrounding prose
scroll horizontally.

## Verification and limits

Lint, types, production build and formatting passed. All **71 account/learner
cases and 17 public cases** passed against that build (88 distinct cases).
The full learner run passed 69 cases; two new sign-out assertions incorrectly
expected a bare `/login` instead of the existing `/login?reason=signed-out`.
After correcting only those assertions and checking the signed-out status, both
affected cases passed in a targeted rerun. No application change or rebuild was
needed for that correction. The full public suite passed all seventeen cases.

All eighteen new cases therefore have passing evidence. Baseline failures were
captured before the CSS fixes. Final long-content lesson screenshots at
320/768/1024/1440px and the 390px project screenshot were visually reviewed;
fifteen final course/lesson/project screenshots cover all five widths.
Database/unit checks were not rerun for two CSS declarations and browser fixtures;
no schema, server logic or dependency changed.

Screenshots/logs stay ignored under `test-results/verification/mobile/`.
Run with the project's normal `npm run build`, `npm run test:flows` and `npm test`
commands. Where the default Chromium download is absent, the existing
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` override selects a locally cached browser.

Emulation does not establish behavior on physical phones/tablets, mobile Safari,
Firefox/WebKit, OS keyboards or device text scaling. Viewport resizing models
rotation and reduced available height; it does not operate an OS keyboard or
rotate a real device. Native select values are chosen through Playwright's
select API, so the device's native picker interaction is not claimed. Actual
assistive-technology coverage remains separate under NX-026. NX-028 stays
**In progress** for broader device/browser acceptance.

No backend/schema, credential, dependency, lockfile, paid-provider or hosting
change. Docker and Vector stay stopped. No real database or account is modified.
The later 20–30% commit request committed the two fixture files as `7bec92f`
(2 of 9 files, 22.2%), using only the project Git identity and no co-author.
The next request committed the layout fixes and browser cases as `b6e9a62`
(2 of the remaining 7 files, 28.6%) with the same identity and no co-author.
The user then requested all five remaining documentation files in the final
commit group, with the same identity, no co-author and a plain past-tense message.
No push or deployment; the commit requests added no application changes or test
reruns.
