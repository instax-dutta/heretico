# scripts

## Purpose

Offline data pipeline and the runnable oracles behind `GATES.md`.

## Ownership

- `crawl.ts` — discovery + README enrichment into `data/raw.json`
- `build-snapshot.ts` — `data/raw.json` → `data/snapshot.json`
- `sync-public.ts` — writes `public/data/index.json` from the snapshot before
  dev/build; the browser copy keeps only `schemaVersion`, `updatedAt`, `totals`,
  `origins`, `recipes` and `families`
- `lib/hf.ts` — Hub REST client (pagination, retries, timeouts, expansions)
- `lib/incremental.ts` — sha + `PARSER_VERSION` keyed cache decision (unit-tested)
- `lib/pool.ts` — bounded concurrency
- `verify/*.mjs` — gate oracles: `static`, `suite`, `snapshot`, `app-smoke`,
  `seo`, `automation`, `dox`, sharing helpers in `verify/util.mjs`

## Local Contracts

- Discovery is two passes (`filter=heretic`, then `search=heretic`) with the
  tagged pass winning collisions (p-e-w/heretic#450). Do not add a third pass
  without a proven recall gain.
- Every network request has a timeout and bounded retries; one failing repo must
  never abort a crawl. A retry loop that runs out of attempts must throw the real
  cause (`HF 429 for …`), not a generic "failed to fetch", and must not sleep
  again on the last attempt.
- The crawler writes atomically (`.tmp` + rename) and is resumable via
  `data/cache/cards/*.json`.
- `data/raw.json` is an intermediate and is gitignored; only
  `data/snapshot.json` is published. A fresh clone therefore needs
  `npm run refresh` before `npm run snapshot` can succeed.
- `HF_TOKEN` is optional but raises Hub rate limits; the refresh workflow passes
  it from repository secrets.
- Verification scripts print a success-only marker and exit non-zero on failure.

## Work Guidance

- Test cache/classification behaviour in `tests/` rather than shell scripts.
- Keep the crawl polite: default concurrency 10–14, no authenticated scraping.
- Progress counters report completed work, not input positions, because workers
  finish out of order. Never commit `data/cache/` or crawl logs.

## Verification

- `node scripts/verify/snapshot.mjs`
- `node scripts/verify/automation.mjs`
- `node scripts/verify/app-smoke.mjs`
