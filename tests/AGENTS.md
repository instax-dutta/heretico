# tests

## Purpose

Executable specification for parsing, classification, scoring, querying and
snapshot assembly, plus real-world model-card fixtures.

## Ownership

- `fixtures/cards/` — verbatim Hugging Face model cards; do not edit them
- `parse/`, `ingest/`, `query.test.ts`, `scoring.test.ts`, `snapshot.test.ts`

## Local Contracts

- TDD: write the failing assertion before the implementation for every behaviour
  change.
- Tests are deterministic and offline: no network, no clock dependence.
- Negative cases matter more than happy paths here: trial logs, quant KL noise,
  cycles, missing denominators, undeclared repos.
- Snapshot tests assert invariants and determinism, not specific counts.
- The suite must run in a few seconds; the real-data deep check is
  `scripts/verify/snapshot.mjs`.

## Work Guidance

- Add a card fixture whenever a new card shape is supported.
- Prefer table-driven `it.each` cases for parser and naming rules.
- Do not weaken assertions to make a change pass.

## Verification

- `npm test`
- `node scripts/verify/suite.mjs tests/parse` (and the other suites)
