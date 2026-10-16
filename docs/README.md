# Project documentation

These repository files are the source of truth for development. The former
parent-workspace copies are legacy snapshots and should no longer be updated.
The original spreadsheet does not synchronise with the feature register.

## Planning and handoff

- [Current progress and next action](PROGRESS.md)
- [Canonical feature register](features.csv)
- [Architecture decisions](DECISIONS.md), with dated entries retained as history
- [Original build guide](BUILD_GUIDE.md), a historical requirements proposal
- [Archived handoff through 2026-10-14](PROGRESS_ARCHIVE_2026-10-14.md)

## Setup and verification

Run commands from the repository root, which contains `package.json`.
Start with the [application README](../README.md).

- [Local accounts and environment guards](PHASE_2_SETUP.md)
- [Versioned courses, practice and progress](PHASE_3_SETUP.md)
- [Course editorial review](PHASE_3_CONTENT_REVIEW.md)
- [Scripted tutor](PHASE_4_SETUP.md)
- [Local live tutor](LIVE_TUTOR_SETUP.md)
- [Token accounting and operator inspection](tutor-token-accounting.md)
- [Projects and review scheduling](PHASE_5_SETUP.md)
- [Editorial workspace and reports](EDITORIAL_REPORTING_SETUP.md)
- [Private notes and search](NOTES_SEARCH_SETUP.md)
- [Learning outcome definitions](OUTCOMES_SETUP.md)
- [CI jobs, local equivalents and remaining release gates](CI.md)

## Historical evidence

The 83 historical evidence files are kept locally in
`.local-archive/verification-2026-10-15.zip`: 54 screenshots, six JSON records and
23 Markdown records. The ZIP preserves every file byte for byte and uses the
original `verification/` paths. PNGs are stored directly because they are already
compressed; text records are compressed. Its companion `.zip.sha256` file checks
the archive's integrity.

The archive and restored `docs/verification/` directory are Git-ignored. They are
optional local reference material and are absent from a fresh clone. Current
plans, setup guides and verification summaries stay in Git. The
[reviewed real-model reports](../tests/evaluations/reports/) remain versioned with
the evaluation cases.

To verify and list the local archive, run from the repository root:

```sh
sha256sum -c .local-archive/verification-2026-10-15.zip.sha256
python3 -m zipfile -l .local-archive/verification-2026-10-15.zip
```

If you want to browse the original files and their links, restore them locally:

```sh
python3 -m zipfile -e .local-archive/verification-2026-10-15.zip docs
```

This restores the ignored `docs/verification/` tree. Archive paths in feature
evidence notes identify members of the ZIP, such as
`verification/phase3/README.md` or
`verification/tutor-resilience/checks.json`. Dates and limitations remain as
recorded; preserving evidence does not establish a new test pass or visual review.
Parent-workspace originals are also retained. Use [current progress](PROGRESS.md)
for active instructions.

New browser runs write to ignored `test-results/verification/` inside this
repository. Live smoke tests retain the optional `TUTOR_VERIFICATION_DIR`
override. Ordinary runs do not overwrite the historical ZIP.
