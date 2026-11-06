/**
 * Hub link-liveness cache shared by the crawl and the link gate.
 *
 * The Hub throttles sustained bursts: a sweep of every repo plus every origin
 * on every run spends the whole budget on re-answering the same question and
 * then reads the resulting 429s as "this repo is gone". One answer is therefore
 * reused for `LINK_TTL_MS`, so each run verifies a rotating slice of the index.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { LinkStatus } from "../../src/lib/types";

/** Long enough to shrink a full sweep sevenfold, short enough that a deleted repo stops being listed within a week. */
export const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const LINK_CACHE_PATH = join(process.cwd(), "data", "cache", "links.json");

export type LinkCache = Record<string, { status: LinkStatus; checkedAt: string }>;

export function readLinkCache(path = LINK_CACHE_PATH): LinkCache {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as LinkCache;
  } catch {
    return {};
  }
}

export function writeLinkCache(cache: LinkCache, path = LINK_CACHE_PATH): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(cache));
  renameSync(tmp, path);
}

/** The cached status when it is still within the TTL, otherwise null. */
export function freshStatus(cache: LinkCache, id: string, now: number): LinkStatus | null {
  const entry = cache[id];
  if (!entry) return null;
  const checked = Date.parse(entry.checkedAt);
  if (!Number.isFinite(checked) || now - checked > LINK_TTL_MS) return null;
  if (entry.status !== "ok" && entry.status !== "gated" && entry.status !== "dead") return null;
  return entry.status;
}
