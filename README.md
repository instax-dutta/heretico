# Heretic Directory

A browsable, human-facing index of [Heretic](https://github.com/p-e-w/heretic)
abliterations published on Hugging Face.

Heretic removes refusal directions from a model. Thousands of people have
published the result — as safetensors, as GGUF/MLX re-quants, as finetunes of
someone else's ablation — and each card reports its own quality numbers, or
copies them from the model it descends from, or does not report them at all.
This site reads those cards, works out what each repository actually *is*,
groups the artifacts that belong to the same ablation, and ranks the results.

Ships as a static export for Netlify (free tier); `NEXT_PUBLIC_SITE_URL`
defaults to `https://hdir.sdad.pro`.

At the time of the committed snapshot: **8,214 repositories indexed, 6,191
verified, 1,046 canonical upstream models, 1,007 measured ablation recipes,
1,265 direct Heretic conversions**, across 62.7M downloads. The index refreshes
itself daily; see [Freshness](#freshness).

Those counts are not the interesting ones. 8,214 repositories collapse to 1,046
base models because one ablation is frequently published as a safetensors build
plus a dozen GGUF quants, and all of those share one row. Of the 1,007 measured
ablations, **883 are verified** and 124 are not; 54 base models have no verified
conversion at all and therefore show no best version.

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
   (free text) — are deduplicated, with the tagged pass winning collisions. One
   pass is not enough: many Heretic models carry no tag, which is the gap counted
   in [p-e-w/heretic#450](https://github.com/p-e-w/heretic/issues/450).
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
   recipe's with `confidence: "inherited"` — an artifact that published its own
   pair keeps its own confidence, because the recipe's numbers may not be its
   own. A verified artifact whose ablation parent is not on the Hub stands in as
   its own ablation, so a published number is never dropped for lack of a
   reachable parent.
6. **Score.** See [Scoring](#scoring). Nothing beyond a single self-published card
   reaches rank 1: see [Verification](#verification).
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
| `npm run sync` | writes `public/data/index.json` and `public/llms.txt` from `data/snapshot.json` |
| `npm run og` | rebuilds the social card from the snapshot into `public/og.png` |
| `npm run crawl` | discovery + README enrichment → `data/raw.json` (+ `data/cache/cards/`) |
| `npm run snapshot` | `data/raw.json` → `data/snapshot.json` + `llms.txt` (offline, seconds) |
| `npm run refresh` | `crawl` then `snapshot` |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run typecheck` / `npm run lint` | `next typegen` + `tsc --noEmit` / ESLint |

Environment:

| Variable | Used by | Default |
| :-- | :-- | :-- |
| `HF_TOKEN` | `npm run crawl`, the refresh workflow | **required in CI** — anonymous crawls get rate-limited |
| `NEXT_PUBLIC_SITE_URL` | `lib/site.ts`, and everything that reads it | `https://hdir.sdad.pro` |

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
| `/repo/<owner>/<name>/` | One Hugging Face artifact that published metrics: evidence, provenance, source link |
| `/methodology/` | How scoring, confidence and provenance work, and what the data cannot say |
| `/sitemap.xml`, `/robots.txt` | Generated from the snapshot at build time |
| `/llms.txt` | Generated from the snapshot: a plain-text guide for language models |
| `/og.png`, `/icon.svg` | Social card and mark, also generated; see [Brand](#brand) |

Every path is **lowercase**. Netlify lowercases whatever it serves, so a
mixed-case directory is only reachable through a 301 and its canonical tag
points at a redirecting URL. `pathSegments` in `lib/dataset.ts` generates the
lowercase form and every lookup folds case to match.

Filtering, sorting, search and pagination run client-side against
`/data/index.json`, with the query reflected in the URL (`?q=`, `?family=`,
`?size=`, `?format=`, `?kind=`, `?version=`, `?sort=`, `?page=`, …) so a filtered
view can be linked or bookmarked. An artifact that published no metrics gets no
`/repo/` page; it still appears in its model's artifact table, linking to the Hub.

---

## Trust

Every number is self-reported; this site never re-runs an evaluation. What it
can check is what stands behind a number:

| | meaning |
| :-- | :-- |
| **verified** | the repository that published the numbers also ships real model weights, and its KL is one an abliteration can physically produce |
| **unverified** | nothing corroborates the card. Still ranked, never rank 1 |
| **inherited** | a quant or derivative with no numbers of its own, showing its parent's |

The rule exists because the score is trivially gameable otherwise. A card
claiming `KL 0.0001` and `refusals 0/100` scores a perfect 100, and nothing in
the card distinguishes it from a measured one. Uploading weights costs
gigabytes, which a fabricated card does not, so `verified` means real weights
plus a plausible KL. An unverified row keeps its score but can never hold rank
1, and a model whose conversions are all unverified gets no best version at
all.

Downloads are deliberately **not** part of verification: they are Hub counters
that mirrors, pipelines and bots inflate. They break ties and nothing more.

## Scoring

```
rate      = refusals / total            (0..1)
retention = 1 / (1 + KL)                (0..1, 1 = untouched model)
score     = 100 * (0.5 * (1 - rate) + 0.5 * retention)      rounded to 2 dp
```

Both terms are bounded and the score is absolute rather than percentile-based,
so it stays comparable across model sizes, cohorts and refresh days. Verified
conversions outrank unverified ones whatever the score, so the top of the
leaderboard is always a row something stands behind. A recipe is
ranked only when the card publishes KL *and* a refusal count with a denominator
(`confidence` of `high`, `medium` or `inherited`); anything else is listed as
unranked rather than scored. Within one origin, a recipe is on the **Pareto**
frontier when nothing else is at least as good on both axes, and the **best
pick** is the highest score; ties break on lower KL, then lower refusal rate,
more downloads, recency, and finally recipe id.

The weights live in `src/lib/scoring.ts` and the methodology page imports them,
so the published prose cannot drift from the code.

---

## Verification

Every claim about the data has a runnable check. `GATES.md` holds the current
results; the oracles are:

| Gate | Command | Checks |
| :-- | :-- | :-- |
| G1 | `node scripts/verify/static.mjs` | typegen + typecheck + lint clean |
| G2–G5 | `node scripts/verify/suite.mjs <tests/dir>` | per-module Vitest suites |
| G6 | `node scripts/verify/snapshot.mjs` | snapshot schema, invariant and depth checks |
| G7 | `node scripts/verify/app-smoke.mjs` | builds and serves `out/`, asserts real content on every route |
| G8 | `node scripts/verify/seo.mjs` | sitemap URLs resolve, titles unique, robots declares the sitemap |
| G9 | `node scripts/verify/automation.mjs` | incremental cache behaviour, refresh workflow, Netlify config |
| G10 | `node scripts/verify/dox.mjs` | the AGENTS.md documentation tree is complete and consistent |

`scripts/verify/snapshot.mjs` is the strict one: it re-derives scores, refusal
rates, Pareto flags and best picks from the published rows and rejects the
snapshot if any of them disagree, if a repo is unverified, if an `inherited`
pair does not match the repo it cites as its source, if a verified artifact that
published its own metrics is on no leaderboard row, if anything unverified holds
a best pick, or if coverage drops below the depth floor.

---

## Brand

The mark is the quantity the site ranks: three bars falling 100 → 0, refusals
going to zero, with the green floor as the only colour in it. It is geometry, not
a picture, so it stays crisp at 16 px.

| Asset | Source |
| :-- | :-- |
| `public/icon.svg` | hand-authored, the master |
| `src/app/favicon.ico` | 16/32/48 ICO generated from the master |
| `public/apple-touch-icon.png`, `public/icon-512.png` | 192 and 512 PNG rasters |
| `public/og.png` | 1200×630 social card, generated on every build |

```bash
npm run og        # regenerate public/og.png from the current snapshot
npm run build     # already runs `npm run og` as its last step
```

The card is rendered by `app/og/route.tsx` with `ImageResponse`, reading the
snapshot, so it cannot advertise counts the site has moved past — the daily
refresh regenerates it along with everything else.

It is a **route handler, not the `opengraph-image` file convention**. That
convention emits its URL with a cache-busting query string
(`/opengraph-image?5d66f8a9…`), which resolves to no file on a static host, so
every share would have 404'd its image. `scripts/build-og.ts` moves the generated
file to `out/og.png`, which is the path the metadata advertises. `verify/seo.mjs`
asserts both facts.

## Interface

Dark only. The site reads metrics off a screen, so the palette is fixed rather
than flipped: one ink ramp, one surface ramp, three accents that mean the same
thing everywhere (verified = emerald, unverified = amber, best/Pareto = indigo).

The light value of an element is never written, so there is no `dark:` variant
to forget to update. `globals.css` holds the ramps as tokens and states the
contrast floor: `400` is the muted floor for body copy at 7.8:1, because `500`
is 4.1:1 on the surface and fails.

Browser surfaces are themed rather than left at OS defaults: selection, caret,
focus rings, placeholder, scrollbars, checkbox and radio accents, and the native
`<select>` popup. `prefers-reduced-motion` is honoured.

## Deploy

`netlify.toml` is complete — build `npm run build`, publish `out/`, Node 22, with
long-lived cache headers for `/_next/static/*` and an hour for `/data/*`. On
Netlify, set `NEXT_PUBLIC_SITE_URL` if the site is not served from the default
domain, then deploy. No functions, no build plugins, no database.

## Freshness

`.github/workflows/refresh.yml` runs daily at 03:17 UTC (and on demand):

1. restore `data/cache/` via `actions/cache`,
2. run the suites and static checks,
3. crawl with the `HF_TOKEN` secret,
4. rebuild and validate the snapshot,
5. build the site, then serve the export and check it,
6. commit `data/snapshot.json` and `public/llms.txt` if the data changed —
   Netlify then redeploys.

A push that touches `src/`, `scripts/`, `tests/` or the pipeline runs the same
gates, so a build that prerenders but does not serve is caught before it reaches
Netlify. The bot's own commit is also what keeps the schedule alive: GitHub
disables scheduled workflows in a public repository after 60 days without
activity.

Because the cache is keyed by commit sha, a daily run only fetches cards whose
repository actually changed.

**Set the `HF_TOKEN` repository secret.** Without it the crawl is anonymous and
the Hub rate-limits it; every repo whose README fetch returns 429 is dropped from
the index, and the site quietly publishes less than yesterday. `npm run crawl`
warns loudly when the token is absent, and `scripts/verify/snapshot.mjs` refuses
a refresh that loses more than 4% of the index, repos, recipes or metrics against
the committed snapshot.

**Nothing needs a human.** A failed crawl stops the run and leaves the last good
snapshot serving, rather than publishing a half-built one. A rejected `git push`
is reported and retried by the next run instead of failing the job. `updatedAt`
alone does not count as a change, so a day with no new or edited repository skips
the commit and the redeploy entirely. Two further jobs report a failed refresh and
warn when the committed snapshot goes stale, so silence is never the failure
signal.

Every generated artefact is derived from the snapshot, including `llms.txt` and
the JSON-LD `dateModified` on each model page, so nothing describing the data is
written by hand and left to rot.

---

## Layout

| Path | Contents |
| :-- | :-- |
| `src/app/` | route tree, all prerendered; `opengraph-image` was removed in favour of a committed `og.png` |
| `src/components/` | tables, badges and the two client explorers |
| `src/lib/parse/` | model-card → structured metrics |
| `src/lib/ingest/` | classification, origin resolution, recipe grouping |
| `src/lib/scoring.ts`, `query.ts`, `dataset.ts` | scoring, filtering, build-time snapshot access |
| `scripts/` | offline pipeline (`crawl.ts`, `build-snapshot.ts`, `sync-public.ts`, `build-llms-txt.ts`) and the gate oracles |
| `public/` | generated browser artefacts: `data/index.json`, `llms.txt`, `og.png`, icons |
| `tests/` | Vitest suites plus verbatim real model cards in `tests/fixtures/cards/` |
| `data/` | committed `snapshot.json`; local `raw.json` and card caches |
| `AGENTS.md` files | per-directory contracts (DOX tree), enforced by gate G10 |
| `PLAN.md`, `GATES.md` | design record and gate results |

## Caveats

Read these before quoting a number from this site.

- **Every metric is self-reported by the publisher.** Nothing here is
  re-measured; the directory reports what cards claim and links to the source
  snippet it parsed.
- **`unverified` is not a claim that a row is false.** It means nothing
  corroborates the card. A publisher who uploads real weights and writes a
  dishonest number is verified and still wrong. Verification narrows the cheap
  attack; it does not close the problem.
- **Downloads are artifact counters, not people.** The headline sums every
  repository under a base model, so one ablation published 113 times counts 113
  times, and the three largest recipes are roughly 18% of the total. Read it as
  activity, not adoption.
- **A KL below `1e-4` is not a measurement.** Abliteration moves weights, so
  the reported divergence cannot round to nothing. 27 recipes claim one; they are
  flagged `implausible`, cannot be verified, and can never hold rank 1.
- **Refusal rates only compare within one card's own evaluation setup.** A card
  that omits a denominator stays unranked. Heretic's counter is a keyword
  heuristic and over-counts compliance wrapped in a disclaimer.
- **KL is hardware- and library-dependent.** Order-of-magnitude differences
  matter; 0.01 does not.
- A range such as `0-1/100` is recorded as its worst case (`1/100`).
- **Coverage is uneven on purpose.** 6,191 of 8,214 discovered repositories are
  verified and only those appear on a page; the rest are counted, not linked. 54
  base models have no verified conversion and therefore show no best version.
- **An "Inherited" badge means the cited source publishes exactly those
  numbers.** It never appears on a repo that published a pair of its own.
- **An artifact with no published metrics gets no `/repo/` page.** It still
  appears in its model's artifact table, linking to the Hub.
- Model names change fast. If a family is missing, the fallback groups it under
  the first meaningful token; it will still be searchable by its exact name.
- The crawler keeps the previous parse when a fetch fails, so a rate-limited
  repo reappears the next day rather than vanishing. A run that still loses more
  than 4% of coverage is refused.
- Model weights and cards belong to their authors; this site only reads public
  Hub metadata.

## Contributing

Bug reports about a misread card or a wrong provenance link are the most useful
thing you can send — include the repository id and the exact line from the card.

Before opening a pull request, run the gates that cover what you touched
(`node scripts/verify/static.mjs` for any code change, `snapshot.mjs` if you
changed the pipeline, `suite.mjs tests/parse` for parser work). Parser changes
need a verbatim card fixture in `tests/fixtures/cards/`; do not tidy an existing
fixture, its mess is the regression surface. The per-directory `AGENTS.md` files
record the contracts each area has to keep, and gate G10 checks them.

## License

[MIT](LICENSE) for the code. The indexed model weights and model cards remain
the property of their authors and are only linked, never redistributed; the
derived metadata in `data/snapshot.json` is published under the same MIT terms.
