# JavaScript foundations v2 — completed editorial review

Reviewer: **Codex (AI-assisted editorial review)**. Date: **2026-09-24**. User delegated completion of Phase 3 course-review work. Course: `javascript-foundations-v2`, replacing v1 for new-course discovery. Migration: `202609240001_reviewed_foundations.sql`.

Outcome: **Reviewed for the local introductory learning slice.** This records the actual AI review; it is not a human sign-off, independent learner study, certification, or public-launch approval. V1 remains an earlier preview for already-enrolled learners, with its content and evidence unchanged. [Historical v1 review (local archive)](README.md#historical-evidence).

## Findings and corrections

- V1 put every key in position b. V2 uses each of a/b/c twice across six questions. This removes the uniform-position shortcut; it does not make a six-question check psychometrically validated.
- V1 assessed typeof without explaining it in the lesson. V2 explicitly contrasts quoted text, numbers and typeof results.
- The binding practice now traces numeric reassignment rather than relying on a weak quoted-string declaration distractor.
- The return-value diagnostic distinguishes console output, null and undefined. Its stem explicitly restricts itself to ordinary functions without a return statement.
- Objectives, examples, prompts, keys, hints and correct-answer explanations were reviewed together. Wording avoids claiming broad mastery from a constrained correct answer.

## Alignment and answer audit

| Lesson             | Learning objective                                                 | Practice check                         | Starting check                                    | Key positions (practice / starting) |
| ------------------ | ------------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------- | ----------------------------------- |
| `js-v2-values`     | Trace reassignment and distinguish value/type                      | Numeric result after two assignments   | Type of quoted numeric-looking text               | a / b                               |
| `js-v2-conditions` | Trace an if/else and distinguish strict comparison from assignment | False comparison selects only else     | Different types compare strictly unequal          | c / a                               |
| `js-v2-functions`  | Follow arguments and distinguish return from logging               | Function result for a changed argument | Ordinary function without return yields undefined | b / c                               |

Each question has exactly one correct option. Distractors correspond to skipping assignment, confusing numeric/string types, running both branches, implicit conversion, treating logging as returning, or assuming null. Incorrect feedback directs a reasoning step; correct feedback explains the result. Retrying remains possible, with attempts recorded separately.

## Correctness evidence

`tests/database/content.test.ts` executes only trusted repository-authored examples and checks all twelve v1/v2 keyed options, unique option IDs, balanced v2 keys, and reviewer/version metadata. The missing-return case is evaluated independently. The upgrade test inserts real v1-shaped enrolment/read/attempt rows before applying v2 and compares them afterward, also checking unchanged v1 questions and answer keys.

Real-provider browser tests cover v2 enrolment, starting-check gaps, failed-save/network retry, every practice and final progress. A separate version test checks old-version resume, starting v2 with zero inherited progress, most-recent-enrolment dashboard selection and denial of cross-version prerequisite credit. See [verification (local archive)](README.md#historical-evidence) for final execution results.

## Primary references

- [ECMAScript lexical declarations and statement evaluation](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-let-and-const-declarations)
- [ECMAScript return statements](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-return-statement)
- [ECMAScript strict equality](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-isstrictlyequal)

## Honest scope

Three introductory lessons, six constrained checks and an estimated thirty minutes. Not a complete JavaScript curriculum. Loops, collections, DOM, async programming and projects remain beyond this version. Time estimates have not been learner-tested. Starting questions are optional and may reveal gaps; they do not skip prerequisites, grant mastery, or constitute an independent placement assessment. The UI discloses AI-assisted review.

No student code is executed. Keys remain in the private database schema; grading remains server-authoritative. Future wording/key changes use another version so prior evidence retains its original meaning.
