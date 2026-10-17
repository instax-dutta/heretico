# src/app

## Purpose

App Router route tree. Every page is prerendered; the site ships as static HTML
plus one JSON index for browser-side filtering.

## Ownership

- `page.tsx` — home, leaderboard, models index, methodology
- `models/[...id]/page.tsx` — one canonical model
- `repo/[...id]/page.tsx` — one Hugging Face artifact
- `families/` — family index and per-family leaderboard
- `sitemap.ts`, `robots.ts` — generated static metadata routes

## Local Contracts

- `output: "export"` is mandatory: no route handlers, server actions, middleware
  or runtime data fetching.
- Every dynamic route sets `dynamicParams = false` and exports
  `generateStaticParams` from the snapshot.
- `/repo/` generates a page only for artifacts that published metrics
  (`getMeasuredRepos`). `sitemap.ts` and the model artifact table must agree, or
  links 404. Model pages also emit JSON-LD for assistants.
- Server pages must not read `searchParams`; filtering is a client concern.
- Route params are promises in this Next version: `const { id } = await params`.
- Metadata comes from `generateMetadata`/`metadata`, with a canonical path.
- Page copy must not claim what the data cannot support (see methodology).

## Work Guidance

- Build rows for tables with `lib/query` helpers instead of duplicating sorting.
- Link only to routes that exist in this tree.
- Keep markup semantic and unstyled-by-default; visual design is a later phase.

## Verification

- `npm run build` must generate every route and write `out/`
- `node scripts/verify/app-smoke.mjs`
- `node scripts/verify/seo.mjs`
