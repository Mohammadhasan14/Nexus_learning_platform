# Nexus Learning

Phase 1 public homepage in the existing Next.js app. No credentials or cloud accounts required. The displayed workspace and courses are labelled previews; accounts, real lessons, AI, payments and saved progress are not implemented.

## Local setup

Use Node 24 (tested with 24.19.0) and its npm. With nvm installed: `nvm install && nvm use` in this directory.

```sh
cd nexus_learning_platform # from the repository root
npm ci
npm run dev
```

Open http://localhost:3000. For production preview, run `npm run build` then `npm start`. Production builds use the supported webpack option because Turbopack’s PostCSS worker cannot bind its internal port in this workspace. If development has the same restriction, use `npm run dev -- --webpack`.

In the provided Linux workspace Node is installed at `/home/hasan/.config/nvm/versions/node/v24.19.0/bin`; if missing from PATH, prepend that directory. A sandbox may require permission to bind a local server.

## Checks

```sh
npm run format:check
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm test
```

Browser tests start the production app on port 3100, so build first. They cover 320/390/768/1440px layouts, keyboard navigation, real anchor targets, path disclosures, automated accessibility, runtime errors and reduced motion. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can point to an existing compatible Chromium binary. `npm run check` runs the complete sequence once the browser is installed. Automated accessibility is not a substitute for assistive-technology user testing.

## Structure and tracking

- `app/`: public page, metadata and shared styles/tokens.
- `components/ui/`: link buttons, badges, cards and brand.
- `components/marketing/`: responsive header and illustrative workspace.
- `tests/`: browser behaviour and accessibility checks.
- `../docs/features.csv`: canonical task register; spreadsheet remains an initial snapshot, not synchronised.
- `../docs/PROGRESS.md`: current state, verification and next action.
- `../docs/DECISIONS.md`: architecture and scope decisions.
- `../nexus_learning_UI_samples/`: homepage, dashboard and lesson references; not runtime assets.

Root `.github/workflows/ci.yml` checks this app. It has not run remotely. Deployment, remote branch gates and cloud configuration require later work and owner instruction.
