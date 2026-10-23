# Critical-flow accessibility review (NX-026)

Reviewed 23 October 2026 against the implemented learner interface. This is a
local production-build review with synthetic Auth/data fixtures, keyboard checks,
DOM/accessibility semantics and axe; it is not a screen-reader certification.
See [current verification and remaining gates](PROGRESS.md).

## Confirmed issues and fixes

The initial audit reproduced twelve failing cases, grouped below. Contrast,
labels and reduced-motion checks passed in the baseline at 320/768/1440; those
checks did not need speculative CSS changes.

| Area                 | Observed behavior                                                                                | Resulting behavior                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lesson navigation    | Lessons inherited the generic site document title.                                               | Titles include the actual lesson and available course version. Verified learner data is shared only within the request using React `cache`; authorization is unchanged.             |
| Quick Search         | A keyboard shortcut opened search from a field, but Escape returned focus to the header trigger. | Close/Escape/shortcut return to the element that opened the dialog, falling back to the trigger if it no longer exists. Native modal behavior and Tab/Shift+Tab containment remain. |
| Practice             | Completing a check removed the submit button and lost the keyboard position.                     | Focus moves to Try again; activating it returns to the first answer. Rejected saves retain the selection and focus a safe retry.                                                    |
| Projects             | Saving a revision disabled its controls and left no useful focused continuation.                 | Focus moves to Start next revision, then to the first milestone field when activated.                                                                                               |
| Notes and reports    | Successful saves disabled the original submit control.                                           | Note focus returns to its editor; a submitted report continues to My reports.                                                                                                       |
| Prepared/live tutor  | Completed guidance disabled the original button; cancellation removed Cancel.                    | Completion returns focus to the guidance selector. Cancel/error paths return to recovery. Completion status stays separate from streamed partial text.                              |
| Sign-in and Settings | Sign-in failure, download and retention actions lost focus while their controls were disabled.   | Retry/download controls or the saved setting receive focus. Clear returns to its disclosure; deletion failure returns to the cleared password field, including repeated failures.   |

The shared focus helper acts only for a submitted operation whose focus remains
inside its scope or has fallen back to the document body. A delayed response
does not pull focus away from another task. Explicit new-attempt/revision actions
focus their newly enabled input after rendering. It changes no grading, retries,
quotas, authentication or persistence rules. Practice errors no longer combine
an alert role with a conflicting polite live-region override.

Dialog return behavior follows the [WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
Status roles expose updates without moving focus away from another task; see
[W3C status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
The installed Next accessibility guide recommends descriptive document titles
for its route announcer; installed metadata guidance permits request-level React
`cache` for shared non-fetch data. No new global or persistent learner cache is
introduced.

## Coverage

The populated fixture matrix opens dashboard, course catalogue, lessons,
starting checks, projects, review queue, saved report snapshots, outcomes, search
and Settings. Each is checked at 320, 768 and 1440 pixels for:

- axe rules tagged WCAG 2 A/AA and 2.1 AA, including available label/contrast checks;
- keyboard skip link and a visible focus outline;
- horizontal overflow and readable saved code/report content;
- reduced-motion removal of CSS animations and transitions.

Behavior cases use real production components and server actions: lesson-title
changes, native dialog focus trapping/return, keyboard-only submissions and
continuations, failure messages/field associations, retained answers/text,
repeated deletion failures, and preserving focus outside a pending form.
Existing account, runner and privacy suites remain part of regression coverage.

The live-client cases run a second loopback app configured with synthetic keys.
Browser routes intercept every tutor request and supply synthetic NDJSON or a
held/cancelled request. The fixture does not implement live claims either, so an
unexpected request cannot reach a provider dispatch. No real AI call, signing-key
setup, real backend or application authentication bypass is used. The ordinary
flow app explicitly uses scripted mode. All test servers are temporary.

## Limits and handoff

Final verification passed: formatting, lint, typecheck, production build, all 53
account/learning browser cases and all 17 public cases. Eighteen cases are new.
A focused recheck of all three populated matrix cases additionally verifies the
skip link hides after focus leaves it, prompted by visual review. All runs use
the same final build. The lesson screenshots at all three widths and desktop
project focus outline were visually reviewed. Backend/schema code did not change,
so database tests were not rerun just for these UI fixes.

No actual NVDA/JAWS/VoiceOver session, Braille output, Firefox/WebKit, physical
touch device or hosted backend was exercised. Automated semantics/contrast and
keyboard evidence cannot establish every WCAG criterion or actual spoken output.
Staff editorial workflows and future features are outside this learner review.
NX-026 retains those broader acceptance checks rather than inventing a human
assistive-technology pass. NX-028 mobile/touch readiness and NX-029 performance
remain separate tasks.

No dependency, lockfile, schema, credential, Docker/Vector, hosted resource or
deployment change is needed. Screenshots are ignored under
`test-results/verification/accessibility/`; the feature register and current
handoff retain the durable evidence summary. Focus changes were committed as
`96a4116` and `6af89e9`; the final group includes navigation, coverage and this
review. All groups use only the project Git identity without a co-author trailer.
No push is included; staging/commit requests did not rerun implementation checks.
