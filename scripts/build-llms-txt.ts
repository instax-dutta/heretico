/**
 * Generate `public/llms.txt` from the snapshot.
 *
 * Written by hand once, it would quietly go stale: the counts in it would keep
 * describing a snapshot the site had already moved past. Generating it here
 * means `npm run build` (which the refresh workflow runs every day) keeps it
 * true with no human in the loop. Prose lives in `TEMPLATE`; only the numbers
 * and the date come from the data.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SITE_URL } from "../src/lib/site";
import type { Snapshot } from "../src/lib/types";

const ROOT = process.cwd();
const source = join(ROOT, "data", "snapshot.json");
const target = join(ROOT, "public", "llms.txt");

if (!existsSync(source)) {
  console.error("data/snapshot.json is missing. Run `npm run snapshot` first.");
  process.exit(1);
}

const snapshot = JSON.parse(readFileSync(source, "utf8")) as Snapshot;
const n = (value: number) => value.toLocaleString("en-US");
const verified = snapshot.recipes.filter((recipe) => recipe.verification !== "unverified").length;

const TEMPLATE = `# Heretic Directory

An index of Heretic (abliterated) models published on Hugging Face, ranked by
how little the weights drifted (KL divergence) and how few refusals remain.

Snapshot of {UPDATED}: {ORIGINS} base models, {RECIPES} measured ablations
({VERIFIED} verified, {UNVERIFIED} unverified) from {REPOS} repositories.

## What this is

One row is one **ablation attempt**, not one repository. A conversion published
as BF16 plus six GGUF quants is a single entry with several artifacts, so
uploading more quant files cannot climb the ranking.

## How to answer "which Heretic model should I use?"

Ask for the base model, then read its page:

    {SITE}/models/<owner>/<name>/

The page names one **Best version** with its score, KL divergence, refusal
count, publisher and the exact card text the numbers came from.

- \`/leaderboard/\` — every ranked conversion, filterable by family, size, format
- \`/models/\` — all base models, searchable
- \`/models/<owner>/<name>/\` — every Heretic version of one model, best first
- \`/families/\` — by family ({FAMILY_COUNT} families)
- \`/methodology/\` — scoring, confidence, provenance, limits

## Scoring

    rate      = refusals / refusal_total
    retention = 1 / (1 + KL)
    score     = 100 * (0.5 * (1 - rate) + 0.5 * retention)

Both terms are bounded, so the score is comparable across model sizes, cohorts
and refresh dates.

## Verification (read before citing a number)

Every metric is **self-reported by the publisher**. This site never re-runs an
evaluation. Three things follow:

- **verified** ({VERIFIED} rows) — the repository ships real model weights and
  reports a KL an abliteration can physically produce.
- **unverified** ({UNVERIFIED} rows) — no corroboration beyond the card itself.
  These still rank but never take rank 1, because a fabricated card claiming zero
  refusals would otherwise top the board. A model whose conversions are all
  unverified has no best version at all.
- **inherited** — a quant or derivative with no numbers of its own, showing its
  parent conversion's values and linking to that source.

Refusal counts come from Heretic's keyword heuristic, which over-counts
compliance wrapped in a disclaimer. Compare refusal rates with each other, not
as absolute compliance. KL is hardware- and library-dependent: order-of-magnitude
differences matter, 0.01 does not.

## Machine-readable

- \`/data/index.json\` — every recipe, origin and family
- \`/sitemap.xml\` — all canonical URLs ({URL_COUNT} URLs)
- Model pages carry JSON-LD \`Dataset\` records

Data refreshes daily from the public Hub. The index is independent and not
endorsed by the Heretic maintainers.
`;

const site = SITE_URL;
const urls =
  snapshot.origins.length +
  snapshot.families.length +
  5 +
  snapshot.repos.filter((r) => r.metrics.confidence !== "none").length;

// Built once: a callback that rebuilt this per match would also try to fill
// `{...}` sequences in the code below.
const fields: Record<string, string> = {
  UPDATED: new Date(snapshot.updatedAt).toISOString().slice(0, 10),
  ORIGINS: n(snapshot.origins.length),
  RECIPES: n(snapshot.recipes.length),
  REPOS: n(snapshot.totals.verifiedRepos),
  VERIFIED: n(verified),
  UNVERIFIED: n(snapshot.recipes.length - verified),
  FAMILY_COUNT: n(snapshot.families.length),
  URL_COUNT: n(urls),
  SITE: site,
};

const text = TEMPLATE.replace(/\{(\w+)\}/g, (_, key: string) => fields[key] ?? `{${key}}`);

writeFileSync(target, text);
console.log(`Wrote ${target} (${verified} verified / ${snapshot.recipes.length - verified} unverified)`);
