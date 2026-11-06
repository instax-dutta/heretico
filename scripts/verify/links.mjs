/**
 * Link gate: checks every Hugging Face link target referenced by the committed
 * snapshot. Runs only in `refresh.yml` (has HF_TOKEN and network access).
 *
 * Exits non-zero when any artifact repo linked from the snapshot returns 404
 * (deleted or renamed). Warns on dead origins, gated repos, and unverified ids
 * but does not fail on them.
 *
 * Liveness answers are shared with the crawl through `data/cache/links.json`
 * (see scripts/lib/link-cache.ts). A full sweep of the index on every run is
 * what exhausted the Hub's rate limit and turned 429s into false 404s; ids whose
 * answer is still within the TTL are not requested again.
 *
 * Kept out of `npm test` — the suite must stay offline.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { readJson } from "./util.mjs";

const HF = "https://huggingface.co";
const CONCURRENCY = 20;
const RETRIES = 3;
/** Must match LINK_TTL_MS in scripts/lib/link-cache.ts. */
const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_PATH = "data/cache/links.json";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * "unknown" is not "dead": the Hub throttled or errored. Only a 404 is death.
 */
async function checkLink(id, token) {
  const headers = { "User-Agent": "heretic-directory-link-gate" };
  if (token) headers.Authorization = `Bearer ${token}`;

  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${HF}/api/models/${id}`, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 404) return "dead";
      if (response.status === 401 || response.status === 403) return "gated";
      if (response.ok) {
        try {
          const body = await response.json();
          return body?.gated ? "gated" : "ok";
        } catch {
          return "ok";
        }
      }
      if (response.status === 429 || response.status >= 500) {
        if (attempt === RETRIES - 1) break;
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await sleep(Math.min(retryAfter > 0 ? retryAfter * 1000 : 1000 * 3 ** attempt, 30_000));
        continue;
      }
      return "unknown";
    } catch {
      if (attempt === RETRIES - 1) break;
      await sleep(1000 * 2 ** attempt);
    }
  }
  return "unknown";
}

function readCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeCache(cache) {
  mkdirSync("data/cache", { recursive: true });
  const tmp = `${CACHE_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(cache));
  renameSync(tmp, CACHE_PATH);
}

function freshStatus(cache, id, now) {
  const entry = cache[id];
  if (!entry) return null;
  const checked = Date.parse(entry.checkedAt);
  if (!Number.isFinite(checked) || now - checked > LINK_TTL_MS) return null;
  return entry.status === "ok" || entry.status === "gated" || entry.status === "dead"
    ? entry.status
    : null;
}

async function mapLimit(items, limit, iteratee) {
  const results = new Array(items.length);
  let index = 0;
  const workers = [];
  for (let i = 0; i < Math.min(limit, items.length); i += 1) {
    workers.push(
      (async () => {
        while (index < items.length) {
          const i = index;
          index += 1;
          results[i] = await iteratee(items[i], i);
        }
      })(),
    );
  }
  await Promise.all(workers);
  return results;
}

async function main() {
  const token = process.env.HF_TOKEN;
  if (!token) {
    console.error(
      "VERIFY FAILED: HF_TOKEN is not set. Anonymous link checks are rate-limited.",
    );
    process.exit(1);
  }

  const snapshot = readJson("data/snapshot.json");

  // Collect every linked id: origins + repos (recipe bestRepoIds are repo ids).
  const originIds = snapshot.origins.map((o) => o.id);
  const repoIds = snapshot.repos.map((r) => r.id);
  const allIds = [...new Set([...originIds, ...repoIds])];

  const cache = readCache();
  const now = Date.now();
  const statuses = new Map();
  const toCheck = [];
  for (const id of allIds) {
    const cached = freshStatus(cache, id, now);
    if (cached) statuses.set(id, cached);
    else toCheck.push(id);
  }

  console.log(
    `Checking ${toCheck.length} of ${allIds.length} linked ids ` +
      `(${originIds.length} origins, ${repoIds.length} repos, ${allIds.length - toCheck.length} cached)…`,
  );

  const results = await mapLimit(toCheck, CONCURRENCY, async (id) => {
    const status = await checkLink(id, token);
    return { id, status };
  });

  const unknown = [];
  for (const { id, status } of results) {
    statuses.set(id, status);
    if (status === "unknown") {
      unknown.push(id);
      continue;
    }
    cache[id] = { status, checkedAt: new Date().toISOString() };
  }

  const deadArtifactRepos = [];
  const deadOrigins = [];
  const gatedRepos = [];
  const gatedOrigins = [];
  let okCount = 0;

  for (const [id, status] of statuses) {
    if (status === "ok") {
      okCount += 1;
      continue;
    }
    const isOrigin = originIds.includes(id);
    const isRepo = repoIds.includes(id);
    if (status === "dead") {
      if (isRepo) deadArtifactRepos.push(id);
      if (isOrigin) deadOrigins.push(id);
    } else if (status === "gated") {
      if (isRepo) gatedRepos.push(id);
      if (isOrigin) gatedOrigins.push(id);
    }
  }

  // Report.
  console.log(`  ok:        ${okCount}`);
  if (gatedRepos.length > 0) {
    console.log(`  gated:     ${gatedRepos.length} repo(s)`);
    for (const id of gatedRepos.slice(0, 20)) {
      console.log(`    ${id}`);
    }
    if (gatedRepos.length > 20) console.log(`    … and ${gatedRepos.length - 20} more`);
  }
  if (gatedOrigins.length > 0) {
    console.log(`  gated:     ${gatedOrigins.length} origin(s)`);
    for (const id of gatedOrigins.slice(0, 20)) {
      console.log(`    ${id}`);
    }
    if (gatedOrigins.length > 20) console.log(`    … and ${gatedOrigins.length - 20} more`);
  }

  // A throttled check proves nothing. Say so, and leave the cache untouched so
  // the next run asks again instead of recording a verdict it never got.
  if (unknown.length > 0) {
    console.warn(
      `WARNING: ${unknown.length} link(s) could not be verified (Hub throttled or errored). ` +
        "They are not counted as dead and are retried next run.",
    );
    for (const id of unknown.slice(0, 20)) {
      console.warn(`  - ${id}`);
    }
    if (unknown.length > 20) console.warn(`  … and ${unknown.length - 20} more`);
  }

  const errors = [];

  // Dead artifact repos fail the gate: links to them should not exist. Forget
  // the answer so the next crawl checks them again and drops them from the index.
  if (deadArtifactRepos.length > 0) {
    for (const id of deadArtifactRepos) delete cache[id];
    errors.push(
      `${deadArtifactRepos.length} linked artifact repo(s) returned 404 (deleted or renamed):`,
    );
    for (const id of deadArtifactRepos.slice(0, 40)) {
      errors.push(`  - ${id}`);
    }
    if (deadArtifactRepos.length > 40) {
      errors.push(`  … and ${deadArtifactRepos.length - 40} more`);
    }
    errors.push(
      "Drop these repos at crawl time or suppress their links before refreshing.",
    );
  }

  writeCache(cache);

  // Dead origins are a warning, not a failure: origins are declared base
  // models, never crawled, so they can be wrong or gated.
  if (deadOrigins.length > 0) {
    console.warn(
      `WARNING: ${deadOrigins.length} declared origin(s) returned 404. ` +
        "Their HF links will render as plain text.",
    );
    for (const id of deadOrigins.slice(0, 20)) {
      console.warn(`  - ${id}`);
    }
    if (deadOrigins.length > 20) console.warn(`  … and ${deadOrigins.length - 20} more`);
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }

  console.log("LINKS VERIFIED");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
