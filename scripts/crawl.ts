/**
 * Crawl the Hugging Face Hub and write `data/raw.json` (metadata + parsed card).
 *
 * Incremental: a repo whose `sha` is unchanged reuses its cached parse, so a
 * daily refresh only fetches new or edited READMEs.
 *
 *   npm run crawl -- --limit 300          # dev sample
 *   npm run crawl -- --concurrency 12     # be gentle
 *   npm run crawl -- --refresh            # ignore the cache
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { discoverHereticModels, fetchReadme, toRawRepo, type HFRawModel } from "./lib/hf";
import { mapLimit } from "./lib/pool";
import { loadCard, type CardCacheEntry } from "./lib/incremental";
import { parseCard } from "../src/lib/parse/card";
import type { ParsedCard, RawRepo } from "../src/lib/types";


interface RawFile {
  crawledAt: string;
  discovery: { tagged: number; named: number };
  repos: (RawRepo & { discoveredBy: "tag" | "name"; hasReadme: boolean })[];
  cards: Record<string, ParsedCard | null>;
}

const ROOT = process.cwd();
const RAW_PATH = join(ROOT, "data", "raw.json");
const CACHE_DIR = join(ROOT, "data", "cache", "cards");

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function cachePath(id: string): string {
  return join(CACHE_DIR, `${id.replace(/[^A-Za-z0-9_.-]+/g, "__")}.json`);
}

function readCache(id: string): CardCacheEntry | null {
  const path = cachePath(id);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CardCacheEntry;
  } catch {
    return null;
  }
}

function writeCache(id: string, value: CardCacheEntry): void {
  mkdirSync(dirname(cachePath(id)), { recursive: true });
  writeFileSync(cachePath(id), JSON.stringify(value));
}

async function main(): Promise<void> {
  const limit = Number(arg("limit", "0"));
  const concurrency = Number(arg("concurrency", "10"));
  const refresh = flag("refresh");
  const token = process.env.HF_TOKEN;

  console.log("Discovering Heretic models (tag pass, then name pass)…");
  const discovery = await discoverHereticModels({
    token,
    onPage: (count) => process.stdout.write(`  ${count} models\r`),
  });
  process.stdout.write("\n");

  let models: HFRawModel[] = discovery.merged;
  if (limit > 0) models = models.slice(0, limit);
  console.log(
    `Discovered ${discovery.tagged.length} tagged + ${discovery.named.length} named = ${discovery.merged.length} unique; enriching ${models.length}`,
  );

  let reused = 0;
  let fetched = 0;
  let errors = 0;
  const cards: Record<string, ParsedCard | null> = {};
  const repos: RawFile["repos"] = [];

  await mapLimit(models, Number.isFinite(concurrency) ? concurrency : 10, async (model, index) => {
    const raw = toRawRepo(model);
    const cached = refresh ? null : readCache(raw.id);
    let card: ParsedCard | null = null;

    try {
      const result = await loadCard(
        raw,
        cached,
        (id) => fetchReadme(id, { token }),
        (markdown, options) =>
          parseCard(markdown, {
            selfId: options.selfId,
            declaredBaseModels: raw.declaredBaseModels,
          }),
      );
      card = result.card;
      if (result.fetched) {
        writeCache(raw.id, result.entry);
        fetched += 1;
      } else {
        reused += 1;
      }
    } catch (error) {
      // Leave the previous cache entry in place so a transient failure does not
      // turn a parsed repo into a missing one on the next run.
      errors += 1;
      console.warn(`\n  ! ${raw.id}: ${(error as Error).message}`);
      card = cached?.card ?? null;
      fetched += 1;
    }
    cards[raw.id] = card;
    repos[index] = {
      ...raw,
      discoveredBy: model.discoveredBy,
      hasReadme: card !== null,
    };

    const done = index + 1;
    if (done % 100 === 0 || done === models.length) {
      process.stdout.write(
        `  ${done}/${models.length} repos (${fetched} fetched, ${reused} cached)\r`,
      );
    }
  });
  process.stdout.write("\n");

  const output: RawFile = {
    crawledAt: new Date().toISOString(),
    discovery: { tagged: discovery.tagged.length, named: discovery.named.length },
    repos: repos.filter(Boolean),
    cards,
  };

  mkdirSync(dirname(RAW_PATH), { recursive: true });
  const tmp = `${RAW_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(output));
  renameSync(tmp, RAW_PATH);
  console.log(`Wrote ${RAW_PATH} (${output.repos.length} repos, ${errors} fetch errors)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
