# scripts

## Purpose

Offline data pipeline and the runnable oracles behind `GATES.md`.

## Ownership

- `crawl.ts` — discovery + README enrichment into `data/raw.json`
- `build-snapshot.ts` — `data/raw.json` → `data/snapshot.json`
- `sync-public.ts` — copies the snapshot to `public/data/` before dev/build
- `lib/hf.ts` — Hub REST client (pagination, retries, timeouts, expansions)
- `lib/incremental.ts` — sha-keyed cache decision (unit-tested)
- `lib/pool.ts` — bounded concurrency
- `verify/*.mjs` — gate oracles

## Local Contracts

- Discovery is two passes (`filter=heretic`, then `search=heretic`) with the
  tagged pass winning collisions (p-e-w/heretic#450). Do not add a third pass
  without a proven recall gain.
- Every network request has a timeout and bounded retries; one failing repo must
  never abort a crawl.
- The crawler writes atomically (`.tmp` + rename) and is resumable via
  `data/cache/cards/*.json`.
- `data/raw.json` is an intermediate and is gitignored; only
  `data/snapshot.json` is published.
- Verification scripts print a success-only marker and exit non-zero on failure.

## Work Guidance

- Test cache/classification behaviour in `tests/` rather than shell scripts.
- Keep the crawl polite: default concurrency 10–14, no authenticated scraping.
- Never commit `data/cache/` or crawl logs.

## Verification

- `node scripts/verify/snapshot.mjs`
- `node scripts/verify/automation.mjs`
- `node scripts/verify/app-smoke.mjs`
