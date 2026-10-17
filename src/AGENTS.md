# src

## Purpose

All application and domain code: prerendered routes, presentational components,
and pure logic for parsing, classification, scoring and querying.

## Ownership

- `app/` owns the route tree and page composition.
- `components/` owns shared UI, including the two client explorers.
- `lib/` owns domain logic and the build-time dataset loader.

## Local Contracts

- Pure, testable logic belongs in `lib/`; React code belongs in `app/` or `components/`.
- No module under `lib/` may import React.
- `lib/dataset.ts` reads `data/snapshot.json` with `node:fs` and must stay server-only.
- Types are defined once in `lib/types.ts`; pages and client components import them.
- Formatting helpers live in `lib/format.ts`, never inline in multiple pages.

## Work Guidance

- Prefer editing an existing module over adding a new one.
- Keep the dependency list small: `yaml` is the only non-framework runtime dependency.
- Any behaviour change to scoring, filters or parsing starts as a failing test in `tests/`.

## Verification

- `npm run typecheck` (`next typegen`, then `tsc --noEmit`)
- `npx vitest run`
- `node scripts/verify/static.mjs`

## Child DOX Index

- `app/AGENTS.md` — routes, rendering constraints, metadata
- `components/AGENTS.md` — component split and client boundaries
- `lib/AGENTS.md` — domain logic modules and contracts
- `lib/parse/AGENTS.md` — card parser rules
- `lib/ingest/AGENTS.md` — classification and recipe grouping
