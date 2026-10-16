# Private lesson notes and workspace search

This Phase 5 slice covers NX-024 and NX-032. Keep live AI disabled. It needs the existing local Supabase database, not a new provider or service.

## Local preview

From the repository root (the directory containing `package.json`):

```sh
npm run db:start
npx supabase migration up --local
npm run dev -- --webpack
```

Sign in, complete onboarding, enrol in a course and open an unlocked lesson. Enter a private note and save; reload to confirm persistence. Open the same lesson in two tabs to try a stale-save conflict: save one tab, then try the older tab. The older tab keeps your input and asks you to copy it before reloading the newer saved version.

Use `/search` or the header's Quick search button. Ctrl/Cmd+K opens or closes the command menu; Escape dismisses it and returns focus to the trigger. Search by title, objective, body or course title. For example, `values` finds the first enrolled JavaScript lesson. Later lessons appear only after their prerequisites are passed. Tab/Enter operate normal result links; no nonstandard listbox keyboard model is implied.

## Notes contract

- One current plain-text note per learner and immutable lesson version; 10,000-character limit. Save is explicit, without autosave or local browser storage. Copy unsaved text before navigating away or reloading.
- Only the owner can read notes through the application, including when another account is staff. Server actions and the RPC derive ownership from the verified session, never client owner IDs. Direct client writes are denied.
- Expected revisions prevent silent overwrites. Concurrent identical latest requests return the same save result; competing revisions yield one success and one conflict. If the response is lost, retry unchanged input. A delayed retry after a later edit is rejected rather than restoring old text.
- Clearing the field and saving removes its text while retaining the current revision record. There is no note history in this slice. Auth account deletion cascades notes; this does not introduce an account-deletion UI.
- Notes remain on their original lesson when editors publish a successor. No copying to another course version, sharing, search indexing or tutor ingestion.

## Search contract

Actions are a server-owned allowlist. Staff publishing/triage appears only with a current trusted staff role. Search never performs an action; it navigates to its existing protected page.

Lesson queries use case-insensitive literal substring matching (not wildcard or semantic search), at least two and at most 100 characters. SQL applies enrolment/prerequisite checks before returning results. Return fields are limited to lesson/course identity, title, objective and version; drafts, notes and answer keys are not searched. Enrolled older versions remain searchable alongside newer ones, labelled by version.

The page shows up to 20 lesson results plus matching actions and signals additional matches. Narrow the query to find a more specific lesson. This bounded scan suits the small beta catalogue; ranking, indexed full-text search and pagination require a future scoped change if the corpus grows. No third-party query logging or search analytics was added. GET queries appear in the browser URL/history; do not enter secrets.

The dedicated search page uses a native GET form with its query in the URL. The existing streamed learner layout needs JavaScript to reveal content after navigation; this is not a JavaScript-free workspace. The modal uses explicit submit, native dialog focus containment, Escape and a visible close button. New input invalidates pending results; failures keep the query and offer retry.

## Checks

`npm run check` covers static checks, unit/database tests, production build and public/fixture browsers. `npm run test:integration -- notes-search.spec.ts` runs the real local Supabase note/search workflow using disposable accounts. `npm run db:test:local` and `npm run db:types:check` verify existing policies and schema types. See `verification/phase5-notes-search/README.md` for actual results; do not infer remote CI execution from local checks.
