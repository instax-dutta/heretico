/**
 * Crawl the Hugging Face Hub and write `data/raw.json` (metadata + parsed card).
 *
 * Incremental: a repo whose `sha` is unchanged reuses its cached parse, so a
 * daily refresh only fetches new or edited READMEs.
 *
 *   npm run crawl -- --limit 300          # dev sample
 *   npm run crawl -- --concurrency 15     # be gentle
 *   npm run crawl -- --refresh            # ignore the cache
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { discoverHereticModels, checkLink, fetchReadme, toRawRepo, type HFRawModel } from "./lib/hf";
import { mapLimit } from "./lib/pool";
import { loadCard, type CardCacheEntry } from "./lib/incremental";
import { freshStatus, readLinkCache, writeLinkCache, type LinkCache } from "./lib/link-cache";
import { parseCard } from "../src/lib/parse/card";
import type { LinkStatus, ParsedCard, RawRepo } from "../src/lib/types";


interface RawFile {
  crawledAt: string;
  discovery: { tagged: number; named: number };
  repos: (RawRepo & { discoveredBy: "tag" | "name"; hasReadme: boolean })[];
  cards: Record<string, ParsedCard | null>;
  /** Whether each declared origin id resolves to a live HF page. */
  originLinkStatus: Record<string, LinkStatus>;
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
  const concurrency = Number(arg("concurrency", "15"));
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
  // Anonymous Hub access is rate limited hard, and a 429 during the crawl drops
  // every repo whose README failed, which silently shrinks the published index.
  if (!token) {
    console.warn(
      "  ! HF_TOKEN is not set. The Hub will rate-limit this crawl and repos whose\n" +
        "    README fails are dropped from the index. Set the HF_TOKEN secret.",
    );
  }

  let reused = 0;
  let fetched = 0;
  let errors = 0;
  let linkDead = 0;
  let unverified = 0;
  let done = 0;
  const cards: Record<string, ParsedCard | null> = {};
  const repos: RawFile["repos"] = [];
  // One liveness answer per id, shared by repos and declared origins.
  const linkCache: LinkCache = refresh ? {} : readLinkCache();
  const startedAt = Date.now();
  const cachedLink = (id: string): LinkStatus | null =>
    refresh ? null : freshStatus(linkCache, id, startedAt);
  const remember = (id: string, status: LinkStatus): void => {
    linkCache[id] = { status, checkedAt: new Date().toISOString() };
  };

  await mapLimit(models, Number.isFinite(concurrency) ? concurrency : 10, async (model, index) => {
    const raw = toRawRepo(model);
    const cached = refresh ? null : readCache(raw.id);
    let card: ParsedCard | null = null;
    let result: import("./lib/incremental").CardLoaderResult | null = null;

    try {
      result = await loadCard(
        raw,
        cached,
        (id) => fetchReadme(id, { token }, raw.files),
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
    }

    // Determine repo liveness. A README fetched successfully this run proves the
    // repo is alive, so it costs no second request. Otherwise reuse a recent
    // answer and only sweep the repos whose answer has expired. Only a status
    // obtained now refreshes the cache timestamp, or the TTL would never lapse.
    let linkStatus: LinkStatus | null = null;
    let checkedNow = false;
    if (result?.fetched && result.entry.markdown != null) {
      linkStatus = "ok";
      checkedNow = true;
    } else {
      linkStatus = cachedLink(raw.id);
    }
    if (!linkStatus) {
      const checked = await checkLink(model.id, { token });
      checkedNow = true;
      if (checked === "unknown") {
        // Throttled, not gone. Dropping the repo here is what shrank the index.
        // Keep it with its last answer; the link gate re-checks it later.
        unverified += 1;
        linkStatus = linkCache[raw.id]?.status ?? (raw.gated ? "gated" : "ok");
        checkedNow = false;
      } else {
        linkStatus = checked;
      }
    }
    if (linkStatus === "dead") {
      if (checkedNow) remember(raw.id, linkStatus);
      linkDead += 1;
      done += 1;
      if (done % 100 === 0 || done === models.length) {
        process.stdout.write(
          `  ${done}/${models.length} repos (${fetched} fetched, ${reused} cached, ${errors} failed, ${linkDead} dead, dropped)
`,
        );
      }
      return;
    }
    raw.linkStatus = linkStatus;
    if (checkedNow) remember(raw.id, linkStatus);
    cards[raw.id] = card;
    repos[index] = {
      ...raw,
      discoveredBy: model.discoveredBy,
      hasReadme: card !== null,
    };

    // Workers finish out of order, so count completions rather than positions.
    done += 1;
    if (done % 100 === 0 || done === models.length) {
      process.stdout.write(
        `  ${done}/${models.length} repos (${fetched} fetched, ${reused} cached, ${errors} failed, ${linkDead} dead)
`,
      );
    }
  });
  process.stdout.write("\n");

  // Verify declared origin ids (base models). These are never crawled as repos,
  // so they need their own link check. Reuse recent results to reduce API strain.
  const originIds = new Set<string>();
  for (const repo of repos) {
    if (!repo) continue;
    for (const baseId of repo.declaredBaseModels) {
      originIds.add(baseId);
    }
  }

  const originLinkStatus: Record<string, LinkStatus> = {};
  if (originIds.size > 0) {
    const toCheck: string[] = [];
    for (const id of originIds) {
      const cached = cachedLink(id);
      if (cached) originLinkStatus[id] = cached;
      else toCheck.push(id);
    }
    if (toCheck.length > 0) {
      console.log(`Checking ${toCheck.length} declared origin links (${originIds.size - toCheck.length} cached)…`);
      await mapLimit(toCheck, 20, async (originId) => {
        const status = await checkLink(originId, { token });
        if (status === "unknown") {
          // Unverified, not dead: keep the last answer rather than claiming the
          // origin is gone, and leave it out of the cache so it retries.
          originLinkStatus[originId] = linkCache[originId]?.status ?? "ok";
          return;
        }
        originLinkStatus[originId] = status;
        remember(originId, status);
      });
    } else {
      console.log(`Reused cached status for ${originIds.size} declared origin links.`);
    }
  }

  const output: RawFile = {
    crawledAt: new Date().toISOString(),
    discovery: { tagged: discovery.tagged.length, named: discovery.named.length },
    repos: repos.filter(Boolean),
    cards,
    originLinkStatus,
  };

  mkdirSync(dirname(RAW_PATH), { recursive: true });
  const tmp = `${RAW_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(output));
  renameSync(tmp, RAW_PATH);
  writeLinkCache(linkCache);
  console.log(
    `Wrote ${RAW_PATH} (${output.repos.length} repos, ${errors} fetch errors, ` +
      `${linkDead} dead dropped, ${unverified} unverified)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
