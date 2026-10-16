# Phase 2 local setup and verification

## What is implemented

Supabase cookie-based email/password sign-in, registration/confirmation, sign-out, server identity checks, protected onboarding/preferences and a learner dashboard. The app uses no service-role key. Profiles are private through both server identity checks and database RLS. Staff roles are operator-managed and cannot be derived from user-editable auth metadata. All account routes are dynamic and set private/no-store caching headers.

This guide covers the account foundation. The dashboard also integrates the later
learning, review and project slices; see [current progress](PROGRESS.md) and the
[documentation index](README.md) for the full implemented scope. The dated
verification below records the original Phase 2 checks.

## Requirements

Node 24 and a running Docker-compatible runtime supported by the Supabase CLI. Docker 26.1.5 is now installed locally. Startup, clean migration replay, 12 pgTAP checks and two real-provider browser scenarios passed on 2026-09-22. No hosted project was created or linked.

From the repository root (the directory containing `package.json`):

```sh
npm ci
npm run db:start
npm run db:reset
npm run db:env
npm run dev -- --webpack
```

`db:reset` resets only the local Supabase database; it deletes local development records. Use it for a fresh dev/test database, not a local database whose data you want to keep. `db:env` creates `.env.local` from local CLI status and refuses to overwrite an existing file. It writes only the local URL and public/anon key, never the service-role key. If `.env.local` exists, compare it with `.env.example` and make the intended edits yourself.

Open http://127.0.0.1:3000/register. Register a synthetic address and open the confirmation message in local email testing at http://127.0.0.1:54324. The checked-in email template uses `/auth/confirm?token_hash=…&type=signup`. Complete onboarding, reload the dashboard, edit preferences, sign out and confirm protected routes require authentication.

Use the configured Site URL for local email links. The default is `http://127.0.0.1:3000`. If changing it, update the exact local redirect allowlist too; do not use broad wildcards. `localhost` and `127.0.0.1` have separate cookies, so use one consistently. Password recovery, OAuth, production SMTP, public privacy notices and account export/deletion are not supplied in this local slice and remain pre-beta work; do not mistake these flows for public launch readiness.

When done: `npm run db:stop`. Services are local; no deployment occurs.

## No backend configured

The public homepage continues to work. `/login` and `/register` explain that accounts are unavailable and do not accept credentials. Protected routes redirect there. Misconfigured/cross-environment settings also fail closed. There is no development bypass, fake signed-in user or mock backend in the application.

## Checks and what they prove

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:db
npm run db:types:check
npm run build
npx playwright install chromium
npm test
npm run test:flows
```

`npm run check` runs the Docker-independent checks. `db:types:check` now runs separately with the local provider (and in its CI job). The public browser suite deliberately clears backend configuration. Flow tests launch a **test-only HTTP double** on loopback and a separate production app on port 3102; they exercise real forms/server actions/cookies/rendering, but do not establish real Supabase compatibility. Test fixture code lives under `tests/support/`, is not imported by the app, and is never enabled as an application mode.

`test:db` executes the actual migration SQL in PGlite's PostgreSQL engine. It supplies a minimal test-only `auth.users` table, `auth.uid()` function and anon/authenticated roles; ownership/GRANT/constraint checks execute in SQL. It does **not** test GoTrue, PostgREST or a real Supabase stack. Four pure unit checks cover configuration guards, redirect restrictions, credentials and profile validation.

Phase 3 supersedes the earlier PGlite type generator: `db:types` now generates public types directly from running local Supabase, including views and RPCs. `db:types:check` detects checked-in type drift. Trigger functions are not exposed as client RPCs. After local Supabase starts, also inspect `npx supabase gen types typescript --local --schema public` before declaring provider-schema verification complete.

With real local Supabase running and a fresh local migration applied:

```sh
npm run db:test:local
npm run test:integration
```

The integration suite uses CLI-discovered **loopback-only** admin credentials only in the test process, creates unique synthetic users, tests sign-in/onboarding, edited preferences, refresh/expiry denial, sign-out, PostgREST isolation and delivered signup-email confirmation, and cleans the users up. Its traces are disabled. Email delivery uses Mailpit; the delivered token/path is opened on test port 3103 after asserting the configured email origin is port 3000. Do not run against a local database containing sensitive records. The test deletes only its synthetic users and their test message. These checks fail rather than silently skip when the runtime is missing. The separate CI job is prepared to run them on an ephemeral Docker-capable runner; no remote run or required branch gate is claimed.

## Environment separation

All Supabase settings are server-only. Required configuration:

- `APP_ENV`: local, test, staging or production.
- `SUPABASE_PROJECT_ENV`: must match APP_ENV.
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`: project public/anon API credentials. Secret/service-role keys are explicitly rejected.
- Hosted only: `SUPABASE_EXPECTED_PROJECT_REF` and `SUPABASE_PRODUCTION_PROJECT_REF`. Staging must differ from production; HTTPS and exact project host are required. Vercel previews require staging; Vercel production requires production configuration.

These guards prevent common configuration mistakes; an operator must still verify actual project identities/credentials and separate staging/production resources before hosting. No resource separation has been provisioned or verified yet. HTTP local auth cookies are HttpOnly + SameSite=Lax; hosted cookies also use Secure. Session cookie names are environment-scoped. Server actions use Next's same-origin protection; no auth mutation is exposed as a GET. Confirmation links use a fixed internal destination and only accept signup verification, never arbitrary redirects or recovery tokens.

Preferences use last-write-wins for simultaneous saves; no multi-device merge behavior is promised. Their timestamps are derived by SQL and cannot be changed by clients. Other learners and staff cannot read private profiles; future administration must add explicit, audited permissions rather than broaden these policies casually.

## References consulted

- Installed Next 16.3.5 authentication, proxy and cookies documentation.
- [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase local migrations](https://supabase.com/docs/guides/local-development/database-migrations)

## Existing local setup (2026-09-22)

`.env.local` has been created and is Git-ignored. For normal use, start Docker/Supabase and run the app; do not reset or recreate the environment file. A newly added Docker group may require logging out and back in. During the setup session, `sg docker -c 'npm run db:start'` successfully used the updated membership. Never prefix app/package scripts with sudo.

Provider-generated public database types were compared with app types using a strict TypeScript equality assertion and matched. Real catalog inspection confirmed all Phase 2 constraints and primary-key ownership indexes. The test timezone uses `Asia/Calcutta`, the equivalent India timezone identifier returned by this Node runtime's `Intl.supportedValuesOf`.
