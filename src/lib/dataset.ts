/**
 * Snapshot access for server components.
 *
 * Everything is prerendered at build time, so reading the committed snapshot
 * from disk is enough. Client components fetch `/data/index.json` (written by
 * `scripts/sync-public.ts`) instead. Keep this module out of client bundles.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildLeaderboardRows, recipesForOrigin, type LeaderboardRow } from "./query";
import { compareForLeaderboard } from "./scoring";
import type { Family, Origin, Recipe, RepoRecord, Snapshot } from "./types";

let cachedSnapshot: Snapshot | null = null;
let cachedRows: LeaderboardRow[] | null = null;
let cachedOrigins: Map<string, Origin> | null = null;
let cachedRecipes: Map<string, Recipe> | null = null;
let cachedRepos: Map<string, RepoRecord> | null = null;

export function getSnapshot(): Snapshot {
  if (!cachedSnapshot) {
    const path = join(process.cwd(), "data", "snapshot.json");
    cachedSnapshot = JSON.parse(readFileSync(path, "utf8")) as Snapshot;
  }
  return cachedSnapshot;
}

export function getLeaderboardRows(): LeaderboardRow[] {
  if (!cachedRows) cachedRows = buildLeaderboardRows(getSnapshot());
  return cachedRows;
}

export function getOrigins(): Origin[] {
  return getSnapshot().origins;
}

/**
 * Netlify lowercases every path it serves, so `/models/Qwen/…` 301s to
 * `/models/qwen/…`. Prerendering the lowercase form means the built directory,
 * the sitemap and the canonical tag all match what is served, and the route
 * resolves without a redirect.
 */
export function pathSegments(id: string): string[] {
  return id.split("/").map((part) => part.toLowerCase());
}

export function getOrigin(id: string): Origin | undefined {
  if (!cachedOrigins) {
    cachedOrigins = new Map(getSnapshot().origins.map((o) => [o.id, o]));
    // Route params arrive lowercased from the host; ids in the snapshot keep
    // their Hub casing. Fold a second time so the lookup survives both.
    for (const origin of getSnapshot().origins) {
      const key = origin.id.toLowerCase();
      if (!cachedOrigins.has(key)) cachedOrigins.set(key, origin);
    }
  }
  return cachedOrigins.get(id) ?? cachedOrigins.get(id.toLowerCase());
}

/**
 * Artifacts with no published metrics of their own. They appear in a model
 * page's artifact table and in the counts, but get no `/repo/` page: there is
 * nothing to show but a provenance blurb, and they are 37% of the export.
 */
export function getMeasuredRepos(): RepoRecord[] {
  return getSnapshot().repos.filter((repo) => repo.metrics.confidence !== "none");
}

export function getRecipe(id: string): Recipe | undefined {
  if (!cachedRecipes) cachedRecipes = new Map(getSnapshot().recipes.map((r) => [r.id, r]));
  return cachedRecipes.get(id);
}

export function getRepo(id: string): RepoRecord | undefined {
  if (!cachedRepos) {
    const repos = getSnapshot().repos;
    cachedRepos = new Map(repos.map((r) => [r.id, r]));
    // Route params arrive lowercased from the host; ids keep their Hub casing.
    for (const repo of repos) {
      const key = repo.id.toLowerCase();
      if (!cachedRepos.has(key)) cachedRepos.set(key, repo);
    }
  }
  return cachedRepos.get(id) ?? cachedRepos.get(id.toLowerCase());
}

/**
 * Route params arrive lowercased from the host while ids keep their Hub
 * casing, so both filters compare case-insensitively. Comparing exactly would
 * silently return nothing for every page on the site.
 */
function fold(value: string): string {
  return value.toLowerCase();
}

export function getRecipesForOrigin(originId: string): Recipe[] {
  return recipesForOrigin(getSnapshot(), resolveOriginId(originId));
}

/** The snapshot's own spelling of an origin, given any casing of it. */
function resolveOriginId(originId: string): string {
  const key = fold(originId);
  const match = getSnapshot().origins.find((origin) => fold(origin.id) === key);
  return match?.id ?? originId;
}

export function getReposForOrigin(originId: string): RepoRecord[] {
  const canonical = resolveOriginId(originId);
  return getSnapshot()
    .repos.filter((repo) => repo.originId === canonical)
    .sort((a, b) => b.downloadsAllTime - a.downloadsAllTime || a.id.localeCompare(b.id));
}

export function getFamily(slug: string): Family | undefined {
  return getSnapshot().families.find((family) => family.slug === slug);
}

export function getFamilyOrigins(slug: string): Origin[] {
  return getSnapshot()
    .origins.filter((origin) => origin.familySlug === slug)
    .sort((a, b) => (b.bestScore ?? 0) - (a.bestScore ?? 0) || a.displayName.localeCompare(b.displayName));
}

export function getTopRows(limit = 10): LeaderboardRow[] {
  return getLeaderboardRows()
    .filter((row) => row.recipe.score > 0)
    .sort((a, b) => compareForLeaderboard(a.recipe, b.recipe))
    .slice(0, limit);
}
