# data

## Purpose

Committed snapshot and local crawl caches.

## Ownership

- `snapshot.json` — **committed**, the single source of truth for every page
- `raw.json` — gitignored intermediate produced by `npm run crawl`
- `cache/` — gitignored per-repo card parses keyed by repository SHA

## Local Contracts

- `snapshot.json` follows `Snapshot` in `src/lib/types.ts` with
  `schemaVersion: 1`. Breaking changes bump the version and update the validator.
- It contains only verified repos. Unverified discoveries are counted in
  `totals.repos` but omitted, so no page links to an unproven model.
- Every recipe stores the exact origin, evidence repo, artifacts and metrics;
  derived fields (score, Pareto, best pick) must be recomputable by
  `scripts/verify/snapshot.mjs`.
- Regeneration order is always `npm run crawl` → `npm run snapshot` → tests →
  `node scripts/verify/snapshot.mjs`.

## Work Guidance

- Never hand-edit `snapshot.json`; fix the parser/classifier and rebuild.
- Keep daily diffs small: deterministic ordering is required.

## Verification

- `node scripts/verify/snapshot.mjs`
- `node scripts/verify/automation.mjs`
