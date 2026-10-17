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

export function getOrigin(id: string): Origin | undefined {
  if (!cachedOrigins) cachedOrigins = new Map(getSnapshot().origins.map((o) => [o.id, o]));
  return cachedOrigins.get(id);
}

export function getRecipe(id: string): Recipe | undefined {
  if (!cachedRecipes) cachedRecipes = new Map(getSnapshot().recipes.map((r) => [r.id, r]));
  return cachedRecipes.get(id);
}

export function getRepo(id: string): RepoRecord | undefined {
  if (!cachedRepos) cachedRepos = new Map(getSnapshot().repos.map((r) => [r.id, r]));
  return cachedRepos.get(id);
}

export function getRecipesForOrigin(originId: string): Recipe[] {
  return recipesForOrigin(getSnapshot(), originId);
}

export function getReposForOrigin(originId: string): RepoRecord[] {
  return getSnapshot()
    .repos.filter((repo) => repo.originId === originId)
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
    .sort((a, b) => b.recipe.score - a.recipe.score || a.recipe.id.localeCompare(b.recipe.id))
    .slice(0, limit);
}
