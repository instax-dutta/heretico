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
- `og/route.tsx` — generates the social card from the snapshot with
  `ImageResponse`, marked `force-static`. It is a route handler, **not** the
  `opengraph-image` file convention: that emits a cache-busted query string with
  no file behind it, so every share 404s. `scripts/build-og.ts` moves the output
  to `out/og.png`, which is the path `layout.tsx` advertises.

## Local Contracts

- `output: "export"` is mandatory: no route handlers, server actions, middleware
  or runtime data fetching.
- Every dynamic route sets `dynamicParams = false` and exports
  `generateStaticParams` from the snapshot.
- **The reader is a newcomer.** These pages are read by people who do not yet
  know what an ablation is, what KL divergence means, or that they should
  search for the original model rather than the uncensored one. A page must
  either explain a term where it is used or reach `components/Glossary.tsx`,
  and must never make the reader infer a rule (such as "search the base
  model") from context alone.
- A "family" of one model is not a family. The home page's browse grid shows
  only families with two or more models and says how many single-model groups
  exist; `/families/` lists them all and explains what they are.
- `/repo/` generates a page only for artifacts that published metrics
  (`getMeasuredRepos`). `sitemap.ts` and the model artifact table must agree, or
  links 404. Model pages also emit JSON-LD for assistants.
- **Dark only.** `color-scheme: dark` in `globals.css` and no `dark:` variant
  anywhere. The light value of an element is never written, so there is nothing
  to forget to pair. The ink ramp has a stated contrast floor: `400` is the
  muted floor for body copy, `500` fails on the surface and is for borders and
  large text only.
- Browser surfaces are themed, never left at OS defaults: selection, caret,
  focus rings, placeholder, scrollbars, checkbox/radio accents, and the native
  `<select>` popup. Adding a native control means adding its theming.
- Regenerate icons and the social card with `npm run og` after editing
  `public/icon.svg`.
- Every generated path is **lowercase** (`pathSegments`). Netlify lowercases
  what it serves, so a mixed-case directory is reachable only via a 301 and its
  canonical points at a redirect. Lookups in `lib/dataset.ts` must fold case to
  match, for `getOrigin`, `getRepo` and both `*ForOrigin` filters.
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
