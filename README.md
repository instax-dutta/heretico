# Heretic Directory

A browsable, human-facing index of [Heretic](https://github.com/p-e-w/heretic)
abliterations published on Hugging Face.

Heretic removes refusal directions from a model. Thousands of people have
published the result — as safetensors, as GGUF/MLX re-quants, as finetunes of
someone else's ablation — and each card reports its own quality numbers, or
copies them from the model it descends from, or does not report them at all.
This site reads those cards, works out what each repository actually *is*,
groups the artifacts that belong to the same ablation, and ranks the results.

Deployed as a static export on Netlify (free tier); `NEXT_PUBLIC_SITE_URL`
defaults to `https://heretico.sdad.pro`.

At the time of the committed snapshot: **8,209 repositories indexed, 6,188
verified, 1,046 canonical upstream models, 867 measured ablation recipes, 1,265
direct Heretic conversions**, across 62.7M downloads. The index refreshes daily;
see [Freshness](#freshness).

---

## How it works

```
Hugging Face          crawl.ts            build-snapshot.ts        Next.js export
─────────────         ────────            ─────────────────        ──────────────
model listings  ──►   discovery +   ──►   classify → resolve  ──►  prerender every
+ README cards        README fetch        origin → group           route from
                      (sha+parser         recipes → score →        data/snapshot.json,
                      keyed cache)        snapshot.json            filter in browser
                      data/raw.json                                public/data/index.json
```

1. **Discover.** Two Hub passes — `filter=heretic` (the tag) and `search=heretic`
   (free text) — are deduplicated, with the tagged pass winning collisions
   (the gap reported in [p-e-w/heretic#450](https://github.com/p-e-w/heretic/issues/450)).
2. **Enrich.** Each repository's README is fetched once and cached under
   `data/cache/cards/` keyed by commit sha *and* parser version, so a parser fix
   re-parses local text instead of re-downloading thousands of cards.
3. **Parse.** Cards are read table-first (`| KL divergence |`, `| Refusals |`),
   then bullet lists, then inline prose, with code fences excluded — trial logs
   contain plenty of plausible-looking pairs. Every extracted number carries the
   exact matched text as `evidence` and a confidence level.
4. **Classify.** Each repository is walked up its declared base-model chain:
   `heretic` (a direct ablation), `quant`, `finetune`, `merge`, `lora`, or
   `unknown`. The terminal repo of the chain is the canonical **origin**.
5. **Group.** Artifacts of the same ablation become one **recipe** (a conversion
   plus its quants and re-uploads share a row, so quant spam cannot climb the
   list). Re-uploads with identical numbers merge. Metrics are never averaged:
   one published pair wins, and artifacts without their own numbers inherit the
   recipe's with `confidence: "inherited"`.
6. **Score.** See [Scoring](#scoring).
7. **Publish.** `data/snapshot.json` is the single source of truth; every page is
   prerendered from it, and `public/data/index.json` is a trimmed copy the
   browser uses to filter without a server.

Nothing is fetched at request time, and there is no API — the site is HTML plus
one JSON file the browser itself needs.

---

## Quickstart

```bash
npm ci
npm run dev          # syncs the browser index, then next dev
```

The committed `data/snapshot.json` is enough to run and build the site. To
rebuild the data from scratch you need network access:

```bash
npm run refresh      # crawl Hugging Face, then rebuild the snapshot
npm test             # unit + integration suites
npm run build        # syncs the index, exports the static site to out/
```

Commands:

| Command | What it does |
| :-- | :-- |
| `npm run dev` | `sync` then `next dev` |
| `npm run build` | `sync` then `next build` → static export in `out/` |
| `npm run sync` | writes `public/data/index.json` from `data/snapshot.json` |
| `npm run crawl` | discovery + README enrichment → `data/raw.json` (+ `data/cache/cards/`) |
| `npm run snapshot` | `data/raw.json` → `data/snapshot.json` (offline, seconds) |
| `npm run refresh` | `crawl` then `snapshot` |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / ESLint |

Environment:

| Variable | Used by | Default |
| :-- | :-- | :-- |
| `HF_TOKEN` | `npm run crawl` | unset — anonymous, lower rate limits |
| `NEXT_PUBLIC_SITE_URL` | `sitemap.ts`, `robots.ts` | `https://heretico.sdad.pro` |

`npm run snapshot` deliberately does not touch the network, so parser, scoring
and classification changes can be re-applied to an existing crawl.

---

## Routes

All routes are prerendered; `trailingSlash` is on, so every URL ends in `/`.

| Route | Contents |
| :-- | :-- |
| `/` | Top picks, totals, family entry points |
| `/leaderboard/` | Every ranked recipe, filterable and sortable in the browser |
| `/models/` | Canonical upstream models with their best conversion |
| `/models/<owner>/<name>/` | Every Heretic version of one model, ranked, with the Pareto set |
| `/families/`, `/families/<slug>/` | Model-family leaderboards |
| `/repo/<owner>/<name>/` | One Hugging Face artifact: metrics, evidence, provenance, source link |
| `/methodology/` | How scoring, confidence and provenance work, and what the data cannot say |
| `/sitemap.xml`, `/robots.txt` | Generated from the snapshot at build time |

Filtering, sorting, search and pagination run client-side against
`/data/index.json`, with the query reflected in the URL (`?q=`, `?family=`,
`?size=`, `?format=`, `?kind=`, `?version=`, `?sort=`, `?page=`, …) so a filtered
view can be linked or bookmarked.

---

## Scoring

```
rate      = refusals / total            (0..1)
retention = 1 / (1 + KL)                (0..1, 1 = untouched model)
score     = 100 * (0.5 * (1 - rate) + 0.5 * retention)      rounded to 2 dp
```

Both terms are bounded and the score is absolute rather than percentile-based,
so it stays comparable across model sizes, cohorts and refresh days. A recipe is
ranked only when the card publishes KL *and* a refusal count with a denominator
(`confidence` of `high`, `medium` or `inherited`); anything else is listed as
unranked rather than scored. Within one origin, a recipe is on the **Pareto**
frontier when nothing else is at least as good on both axes, and the **best
pick** is the highest score with downloads, recency and id as tie-breakers.

The weights live in `src/lib/scoring.ts` and the methodology page imports them,
so the published prose cannot drift from the code.

---

## Verification

Every claim about the data has a runnable check. `GATES.md` holds the current
results; the oracles are:

| Gate | Command | Checks |
| :-- | :-- | :-- |
| G1 | `node scripts/verify/static.mjs` | typecheck + lint clean |
| G2–G5 | `node scripts/verify/suite.mjs <tests/dir>` | per-module Vitest suites |
| G6 | `node scripts/verify/snapshot.mjs` | snapshot schema, invariant and depth checks |
| G7 | `node scripts/verify/app-smoke.mjs` | builds and serves `out/`, asserts real content on every route |
| G8 | `node scripts/verify/seo.mjs` | sitemap URLs resolve, titles unique, robots declares the sitemap |
| G9 | `node scripts/verify/automation.mjs` | incremental cache behaviour, refresh workflow, Netlify config |
| G10 | `node scripts/verify/dox.mjs` | the AGENTS.md documentation tree is complete and consistent |

`scripts/verify/snapshot.mjs` is the strict one: it re-derives scores, refusal
rates, Pareto flags and best picks from the published rows and rejects the
snapshot if any of them disagree, if a repo is unverified, or if coverage drops
below the depth floor.

---

## Deploy

`netlify.toml` is complete — build `npm run build`, publish `out/`, Node 22, with
long-lived cache headers for `/_next/static/*` and an hour for `/data/*`. On
Netlify, set `NEXT_PUBLIC_SITE_URL` if the site is not served from the default
domain, then deploy. No functions, no build plugins, no database.

## Freshness

`.github/workflows/refresh.yml` runs daily at 03:17 UTC (and on demand):

1. restore `data/cache/cards/` via `actions/cache`,
2. run the suites,
3. crawl with `HF_TOKEN` (set it as a repository secret for higher rate limits),
4. rebuild and validate the snapshot,
5. build the site,
6. commit `data/snapshot.json` if anything changed — Netlify then redeploys.

Because the cache is keyed by commit sha, a daily run only fetches cards whose
repository actually changed.

---

## Layout

| Path | Contents |
| :-- | :-- |
| `src/app/` | route tree, all prerendered |
| `src/components/` | tables, badges and the two client explorers |
| `src/lib/parse/` | model-card → structured metrics |
| `src/lib/ingest/` | classification, origin resolution, recipe grouping |
| `src/lib/scoring.ts`, `query.ts`, `dataset.ts` | scoring, filtering, build-time snapshot access |
| `scripts/` | offline pipeline (`crawl.ts`, `build-snapshot.ts`, `sync-public.ts`) and the gate oracles |
| `tests/` | Vitest suites plus verbatim real model cards in `tests/fixtures/cards/` |
| `data/` | committed `snapshot.json`; local `raw.json` and card caches |
| `AGENTS.md` files | per-directory contracts (DOX tree), enforced by gate G10 |
| `PLAN.md`, `GATES.md` | design record and gate results |

## Caveats

- **Every number is self-reported by the model author.** Nothing here is
  re-measured; the directory reports what cards claim and links to the source.
- Refusal rates are only comparable within a card's own evaluation setup, and a
  card that omits a denominator stays unranked.
- A range such as `0–1/100` is recorded as its worst case (`1/100`).
- A card claiming zero KL *and* zero refusals cannot be measured (KL 0 means the
  weights are unchanged) and is flagged `implausible` in the table.
- Coverage is uneven on purpose: 6,188 of 8,209 discovered repositories are
  verified, and only those appear on a page; the rest are counted, not linked.
- Model weights and cards belong to their authors; this site only reads public
  metadata from the Hugging Face Hub.
