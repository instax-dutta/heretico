# src/lib

## Purpose

Pure domain logic and the build-time dataset loader.

## Ownership

- `types.ts` — the single domain schema (Repo, Recipe, Origin, Snapshot)
- `naming.ts` — parameter/MoE parsing, size classes, families, formats
- `scoring.ts` — quality score, Pareto, ranking, best pick
- `query.ts` — filter/sort/search/pagination over leaderboard rows
- `snapshot.ts` — assembles the published snapshot from raw crawl data
- `dataset.ts` — server-only loader for `data/snapshot.json`
- `format.ts` — display formatting
- `parse/`, `ingest/` — see child docs

## Local Contracts

- No React imports; no I/O except `dataset.ts`.
- Deterministic: identical input must produce byte-identical output. Sort every
  collection with an explicit tie-breaker.
- Scores are 0–100 with two decimals; null/absent metrics are never coerced to 0
  for ranking purposes.
- `Recipe.verification` (`verified | unverified | publisher`) is the only signal
  that may put a row above a higher-scoring one. `publisher` is reserved and
  never assigned yet: there is no verification token in the crawl. Do not add a
  fourth value without a signal the snapshot actually carries.
- `scoring.WEIGHTS` is the only place the 50/50 split lives; the methodology page
  imports it so prose cannot drift from code.
- `query.DEFAULT_QUERY` and `parseQuery` are the only definition of filter
  defaults.

## Work Guidance

- Prefer adding a pure function and a test over changing page code.
- Keep `Snapshot` backward-compatible within `schemaVersion: 1`; bump the version
  for breaking field changes and update the validator.
- Do not re-derive metric values in UI code.

## Verification

- `npx vitest run tests/*.test.ts`
- `node scripts/verify/snapshot.mjs`

## Child DOX Index

- `parse/AGENTS.md` — Markdown/model-card parsing
- `ingest/AGENTS.md` — classification, origin walking, recipe grouping
