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
const ORIGIN_CACHE_PATH = join(ROOT, "data", "cache", "origin-links.json");
// Reuse a recent Hub liveness result to reduce token strain. Dead repos are
// never cached (they're dropped), so a stale "ok" is rechecked after the TTL.
const LINK_TTL_MS = 21 * 24 * 60 * 60 * 1000;

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

type OriginCache = Record<string, { status: LinkStatus; checkedAt: string }>;
function readOriginCache(): OriginCache {
  if (!existsSync(ORIGIN_CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(ORIGIN_CACHE_PATH, "utf8")) as OriginCache;
  } catch {
    return {};
  }
}
function writeOriginCache(value: OriginCache): void {
  mkdirSync(dirname(ORIGIN_CACHE_PATH), { recursive: true });
  writeFileSync(ORIGIN_CACHE_PATH, JSON.stringify(value));
}
function freshCachedStatus(entry: { status?: LinkStatus; checkedAt?: string; linkStatus?: LinkStatus; linkCheckedAt?: string } | null, now: number): LinkStatus | null {
  if (!entry) return null;
  const status = entry.status ?? entry.linkStatus;
  const checkedAt = entry.checkedAt ?? entry.linkCheckedAt;
  if (status !== "ok" && status !== "gated") return null;
  if (!checkedAt) return null;
  const t = Date.parse(checkedAt);
  if (!Number.isFinite(t) || now - t > LINK_TTL_MS) return null;
  return status;
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
  let done = 0;
  const cards: Record<string, ParsedCard | null> = {};
  const repos: RawFile["repos"] = [];

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
    // repo is alive (saves an API call). Reused cache entries reuse a recent
    // ok/gated check when available; dead repos are never cached.
    const now = Date.now();
    let linkStatus: LinkStatus | null = null;
    if (result?.fetched && result.entry.markdown != null) {
      linkStatus = "ok";
    } else if (!refresh) {
      linkStatus = freshCachedStatus(cached, now);
    }
    if (!linkStatus) {
      linkStatus = await checkLink(model.id, { token });
    }
    if (linkStatus === "dead") {
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
    // Persist a fresh liveness result so the next run can skip the Hub call.
    const checkedAt = new Date().toISOString();
    const entryToCache: CardCacheEntry = { ...(result?.entry ?? { sha: raw.sha, parserVersion: 2, markdown: cached?.markdown ?? null, card }), linkStatus, linkCheckedAt: checkedAt };
    if (result?.fetched || entryToCache.linkCheckedAt !== cached?.linkCheckedAt) {
      writeCache(raw.id, entryToCache);
    }
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
    const originCache = refresh ? {} : readOriginCache();
    const now = Date.now();
    const toCheck = [...originIds].filter((id) => !freshCachedStatus(originCache[id], now));
    for (const id of originIds) {
      const cachedStatus = freshCachedStatus(originCache[id], now);
      if (cachedStatus) originLinkStatus[id] = cachedStatus;
    }
    if (toCheck.length > 0) {
      console.log(`Checking ${toCheck.length} declared origin links (${originIds.size - toCheck.length} cached)…`);
      await mapLimit(toCheck, 20, async (originId) => {
        const status = await checkLink(originId, { token });
        originLinkStatus[originId] = status;
        originCache[originId] = { status, checkedAt: new Date().toISOString() };
      });
      writeOriginCache(originCache);
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
  console.log(
    `Wrote ${RAW_PATH} (${output.repos.length} repos, ${errors} fetch errors, ${linkDead} dead dropped)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
