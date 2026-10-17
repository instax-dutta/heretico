# Heretic Directory — system design & build plan

> Living, filterable directory of Heretic (abliterated) models on Hugging Face,
> ranked by the two numbers Heretic itself optimises: **KL divergence** from the
> original model and **refusals** on a harmful-prompt set.
>
> Functional scope only in this phase. Visual design comes after the data,
> ranking, API and pages are verified end-to-end.

---

## 1. Problem

Heretic conversions are published under thousands of repo names, mixed with
GGUF quants, finetunes, merges and unrelated repos that merely mention
"heretic". Nothing joins them back to the model a user actually wants
("I want Qwen3-4B-Instruct without refusals — what's the best version?").

The directory answers three questions:

1. **For base model X, which Heretic version is best?** (ranked per canonical model)
2. **Across everything, which conversions are cleanest?** (global leaderboard, filterable by family / size / format)
3. **Where is the artifact I can download?** (repos, formats, quant files, links)

---

## 2. Data sources

| Source | Use | Notes |
| :-- | :-- | :-- |
| `GET /api/models?filter=heretic` | Discovery pass 1 (tagged) | Sorted by downloads, cursor paginated via `Link` |
| `GET /api/models?search=heretic` | Discovery pass 2 (named) | Tagged set takes precedence on collision |
| `expand[]=downloadsAllTime`, `downloads`, `likes`, `tags`, `cardData`, `baseModels`, `safetensors`, `gated`, `pipeline_tag`, `lastModified`, `createdAt` | Repo metadata in the same response | No extra request per repo |
| `GET /{repo}/raw/main/README.md` | KL / refusals / Heretic version / benchmark tables | Cached by repo `sha` |
| Manual overrides | Corrections to parsed numbers | `data/overrides/curation.json`, highest priority |

Discovery method follows p-e-w/heretic#450 (two passes, dedupe by repo id,
tagged pass wins), which is also the method already deployed on
heretic.sdad.pro. The difference is that this project does not stop at
counting: it enriches every repo and resolves it to a canonical base model.

### 2.1 Freshness

- `npm run crawl` does discovery + incremental enrichment. READMEs are only
  re-fetched when the repo `sha` changed or the repo is new.
- GitHub Action runs it daily, rebuilds `data/snapshot.json`, runs the test
  suite / snapshot validator and commits the snapshot.
- `updatedAt` is recorded in the snapshot and surfaced on every page.

---

## 3. Domain model

```
Repo (HF repository)                        e.g. mradermacher/Qwen3.8-9B-heretic-uncensored-GGUF
  kind: heretic | quant | finetune | merge | lora | unknown
  declaredBaseIds[]        ← README title link > README "based on" > baseModels > cardData > tags > name
  originId                 ← walk declared bases to the first non-Heretic upstream model
  recipeId                 ← the specific ablation this repo is an artifact of
  metrics { kl, refusals, total, originalRefusals, originalKl, confidence, evidence }
  benchmarks[]             ← published values only, with provenance
  files[] / formats[]      ← GGUF, MLX, safetensors, FP8, NVFP4, AWQ, GPTQ, LoRA …
  paramsB, paramsActiveB   ← safetensors total, else gguf/name heuristics
```

- **Origin** = canonical upstream model (`Qwen/Qwen3-4B-Instruct-2507`). This is
  the unit a newcomer searches for. It is resolved by walking the declared base
  chain until a repo that is *not* Heretic-derived is reached.
- **Recipe** = one ablation attempt: (`originId`, author, kl, refusals, tool
  version). One recipe may be published as several repos (bf16 + GGUF + FP8).
  The leaderboard ranks **recipes**, not repos, so quant spam cannot win.
- **Artifact** = a repo. Displayed under its recipe with format chips.

### 3.1 Classification rules

| kind | Rule |
| :-- | :-- |
| `heretic` | Card states a Heretic conversion (`made using [Heretic]`) and the repo is not a quant |
| `quant` | `quantized_by` in card data, or GGUF/MLX/FP8/AWQ/GPTQ/EXL2/NVFP4 in name, and its base is Heretic-derived |
| `finetune` / `merge` / `lora` | Card/name says so, and the base chain reaches a Heretic repo |
| `unknown` | Matched by tag/name only, no Heretic provenance found. Indexed, never ranked |

`unknown` repos stay in the snapshot (so search never dead-ends) but are marked
"unverified" and excluded from every ranking. A directory that silently mixes
an unrelated repo named "heretic" into the leaderboard would be worse than none.

---

## 4. Parsing (the hard part)

Model cards are free-form. The parser is layered and reports confidence:

1. **Markdown tables** — parse every table into header/rows; map columns whose
   headers match `/refusal/i` and `/kl[\s_-]*div/i`. Handles the canonical
   Heretic table, variants such as `Refusals (/100 harmful prompts)`, and
   transposed tables (`| Refusals | KL |` then `| 1/100 | 0.107 |`).
2. **Inline patterns** — `KL divergence: 0.09`, `Refusals: 29/100`,
   `3/100 refusals`, `refusal rate of 4%`.
3. **Rejection rules** — numbers attributed to quantization (`IQ3_S 0.051`),
   imatrix, or "ablation's own 0.082 come on top" are not the model's headline
   metrics. Ambiguous matches reduce confidence instead of fabricating a pair.

Output: `metrics` with `confidence: high | medium | low | none`, plus the exact
matched snippet (`evidence`) so a human can audit it on the repo page.

`refusals` are stored as `{count, total}`. Missing denominators default to 100
only when the card explicitly uses Heretic's percentage convention; otherwise
the record is unranked. `originalRefusals` / `originalKl` are captured when the
card publishes the baseline column, enabling "% refusals removed".

**Benchmarks**: only rows in a table whose first cell is a known metric
(MMLU, MMLU-Pro, GSM8K, GPQA, HumanEval, MBPP, MATH, IFEval, ARC, HellaSwag,
TruthfulQA, AIME, LiveCodeBench…). Values from a second column are captured as
the baseline when its header names the original/base model. Benchmarks never
affect the score; they are evidence displayed next to it.

---

## 5. Ranking logic

Variables per recipe:

```
R = refusals / total            refusal rate, 0..1
K = 1 / (1 + kl)                capability retention, 0..1  (kl=0 → 1)
Q = 100 × (0.5 × (1 − R) + 0.5 × K)
```

Why this shape:

- Only the two metrics Heretic minimises are used, equally weighted. Both terms
  are bounded, so one huge KL cannot be hidden by perfect refusals, and vice
  versa.
- `1/(1+kl)` is hyperbolic: it penalises drift smoothly and cannot explode,
  unlike an exponential or a raw normalisation that depends on the cohort.
- It is absolute, so scores are comparable across model sizes while still being
  labelled as *conversion quality*, not model capability.

Derived fields:

- **Pareto** — a recipe is on the frontier of its origin cohort when no other
  recipe has both a lower KL and a lower refusal rate. This makes "cheapest
  ablation that is still fully compliant" visible even when it is not rank #1.
- **Best pick** — highest Q in an origin cohort; tie-break: more downloads,
  then newer. Rendered as the headline answer on the model page.
- **Rank** — global and within family / size class, computed on recipes with
  `confidence ∈ {high, medium}` and `kind ∈ {heretic, quant, finetune…}` but
  never `unknown`. Ties break deterministically (Q desc, KL asc, refusals asc,
  downloads desc, id asc).
- **Inherited metrics** — a quant of a published recipe inherits its numbers
  with `confidence: inherited` and a link to the source repo. These are shown
  but not echoed as independent evidence.

Grouping filters exposed to users: **family** (Qwen3, Gemma 4, Llama 3.1…),
**base model**, **parameter class** (<1B, 1–4B, 4–9B, 9–15B, 15–32B, 32–70B,
70B+), **format** (GGUF, MLX, FP8, NVFP4, safetensors, LoRA), **Heretic tool
version**, **has benchmarks**, **min downloads**.

---

## 6. Snapshot

`data/snapshot.json` (committed, minified):

```jsonc
{
  "schemaVersion": 1,
  "updatedAt": "2026-…",
  "source": "huggingface-hub",
  "totals": { "repos", "origins", "recipes", "ranked", "downloadsAllTime", "downloads30d" },
  "origins": [...],   // canonical base models + best pick id
  "recipes": [...],   // ranked ablation attempts
  "repos": [...],     // every indexed repo (incl. unknown), compact
  "families": [...]   // slug, label, counts
}
```

The app reads the snapshot through `src/lib/dataset.ts` (single loader, typed
accessors, memoised). No database, no runtime third-party calls: the site is
reproducible from the committed snapshot and works offline.

Deployment is a static export to Netlify (`out/`). The full snapshot powers
prerendering; a compact `public/data/index.json` (~1–2 MB gzipped) powers
browser-side filtering. Nothing runs on a server, so there is no free-tier
function limit to design around.

---

## 7. Routes

Static export (`output: "export"`), no server functions. Filtering and search
run in the browser over one compact index, so Netlify's free tier only ever
serves files.

| Route | Purpose |
| :-- | :-- |
| `/` | Top picks, totals, family entry points, search |
| `/leaderboard` | Filterable + sortable ranked table (client-side, URL state) |
| `/models` | Canonical model index with best pick per model |
| `/models/[owner]/[name]` | All Heretic versions of one base model, ranked, with comparison |
| `/families` / `/families/[slug]` | Family leaderboards |
| `/models/[owner]/[name]/[repo]` | Direct conversion detail: evidence, metrics, source link |
| `/methodology` | Scoring, confidence, data provenance, caveats |
| `/sitemap.xml`, `/robots.txt` | Search-engine surfaces |

No public JSON API: the site is for humans. `public/data/index.json` exists only
because the browser needs it to filter; it is not documented or linked.

---

## 8. Depth tree

```
1  Foundation
   1.1 scaffold, config, scripts, CI, git hygiene
   1.2 test harness + real card fixtures
2  Ingestion
   2.1 HF discovery (two-pass dedupe, cursor pagination, retries)
   2.2 README fetch + sha-keyed cache
   2.3 naming: params, MoE, size class, family, formats
   2.4 card parser: base, version, KL/refusals (+confidence), benchmarks
   2.5 classification + canonical origin resolution
   2.6 recipe grouping + inherited evidence
   2.7 scoring, Pareto, best pick, ranks
   2.8 snapshot build + schema validation + overrides
3  Serving (static export, Netlify)
   3.1 dataset loader + query layer (filter/sort/search/paginate)
   3.2 client index build + browser search
   3.3 pages (home, leaderboard, models, model detail, family, repo, methodology)
   3.4 SEO: metadata, sitemap, robots
   3.5 freshness automation (action + incremental crawl)
4  Verification
   4.1 unit/integration suites, snapshot invariants
   4.2 real crawl → snapshot, coverage report
   4.3 docs: README, methodology, DOX tree
```

---

## 9. Acceptance gates

See `GATES.md`. Functional completion requires every runnable gate met against
the **real** crawled snapshot, not a fixture. UI design starts only after that.
