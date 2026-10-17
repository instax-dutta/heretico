# src/components

## Purpose

Shared UI: tables, badges and the two interactive explorers (leaderboard and
model directory) that filter the snapshot in the browser.

## Ownership

- `ui.tsx` — primitives (Card, Stat, Badge, ScorePill, Breadcrumbs)
- `RecipeTable.tsx` — ranked table, safe in server and client trees
- `LeaderboardExplorer.tsx` — client filters, URL state, pagination
- `ModelExplorer.tsx` — client model search and pagination

## Local Contracts

- Client components start with `"use client"` and must not import
  `lib/dataset.ts` (Node fs).
- They receive prerendered data as props so the first paint has real content,
  then fetch `/data/index.json` (written by `scripts/sync-public.ts`) and replace
  it with the full result set. A failed fetch keeps the prerendered page.
- URL state is written with `history.replaceState`; do not use `useSearchParams`
  (it forces a Suspense boundary that static export does not need).
- Every full-dataset table is paged. The model index has ~1k origins and a row is
  ~8 elements; rendering them all costs thousands of DOM nodes on a phone.
- Components never compute scores themselves; use `lib/scoring` and `lib/query`.

## Work Guidance

- Keep controls accessible: labels, `type="search"`, disabled pagination buttons.
- Table columns must match the definitions on the methodology page.
- Do not add charting or design-system dependencies yet.

## Verification

- `npm run build`
- `node scripts/verify/app-smoke.mjs`
