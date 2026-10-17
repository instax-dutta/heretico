import { classifyRepos, type Classification, type RepoInput } from "./ingest/classify";
import { buildRecipes } from "./ingest/recipes";
import { detectFormats, familyFor, parseParams, quantLabel, sizeClassFor } from "./naming";
import type {
  Benchmark,
  Family,
  Origin,
  ParsedCard,
  RawRepo,
  Recipe,
  RepoRecord,
  Snapshot,
} from "./types";

export interface RawDataset {
  crawledAt: string;
  repos: RawRepo[];
  cards: Record<string, ParsedCard | null>;
}

export const SNAPSHOT_SCHEMA_VERSION = 1;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function paramsFor(repo: RawRepo): { totalB: number | null; activeB: number | null; moe: boolean } {
  if (repo.safetensorsTotal && repo.safetensorsTotal > 0) {
    return { totalB: round1(repo.safetensorsTotal / 1e9), activeB: null, moe: false };
  }
  const parsed = parseParams(repo.id);
  return { totalB: parsed.totalB, activeB: parsed.activeB, moe: parsed.moe };
}

function firstGguf(files: string[]): string | null {
  const match = files.find((file) => file.toLowerCase().endsWith(".gguf"));
  return match ?? null;
}

function displayNameFor(id: string): string {
  return id.split("/").pop() ?? id;
}

export function buildSnapshot(
  dataset: RawDataset,
  options: { updatedAt?: string } = {},
): Snapshot {
  const inputs: RepoInput[] = dataset.repos.map((repo) => ({
    repo,
    card: dataset.cards[repo.id] ?? null,
  }));
  const byId = new Map(inputs.map((input) => [input.repo.id, input]));
  const classifications = classifyRepos(inputs);
  const recipeInputs = inputs.map((input) => ({
    ...input,
    classification: classifications.get(input.repo.id)!,
  }));
  const { recipes, metricsByRepo, recipeByRepo } = buildRecipes(recipeInputs);

  const verified = inputs.filter((input) => classifications.get(input.repo.id)!.verified);

  const repos: RepoRecord[] = verified.map((input) => {
    const classification = classifications.get(input.repo.id) as Classification;
    const originId = classification.originId!;
    const family = familyFor(originId);
    const params = paramsFor(input.repo);
    const gguf = firstGguf(input.repo.files);
    const recipeId = recipeByRepo.get(input.repo.id) ?? null;

    return {
      id: input.repo.id,
      author: input.repo.author,
      createdAt: input.repo.createdAt,
      lastModified: input.repo.lastModified,
      downloads30d: input.repo.downloads30d,
      downloadsAllTime: input.repo.downloadsAllTime,
      likes: input.repo.likes,
      gated: input.repo.gated,
      pipelineTag: input.repo.pipelineTag,
      libraryName: input.repo.libraryName,
      license: input.repo.license,
      declaredBaseModels: classification.parents,
      kind: classification.kind,
      originId,
      recipeId,
      paramsB: params.totalB,
      paramsActiveB: params.activeB,
      moe: params.moe,
      sizeClass: sizeClassFor(params.totalB),
      family: family.label,
      familySlug: family.slug,
      formats: detectFormats({
        name: input.repo.id,
        tags: input.repo.tags,
        files: input.repo.files,
      }),
      quant: gguf ? quantLabel(gguf) : quantLabel(input.repo.id),
      metrics: metricsByRepo.get(input.repo.id) ?? input.card?.metrics ?? {
        kl: null,
        refusals: null,
        refusalTotal: null,
        originalKl: null,
        originalRefusals: null,
        originalRefusalTotal: null,
        confidence: "none",
        evidence: null,
        sourceRepoId: null,
      },
      benchmarks: (input.card?.benchmarks ?? []) as Benchmark[],
      hereticVersion: input.card?.hereticVersion ?? null,
      parentIds: classification.parents,
      verified: true,
      classificationEvidence: classification.evidence,
      firstSeenAt: input.repo.createdAt,
    };
  });
  const repoById = new Map(repos.map((repo) => [repo.id, repo]));

  // Fill parameters on recipes from their evidence repo / artifacts.
  for (const recipe of recipes) {
    if (recipe.paramsB !== null) continue;
    const evidence = repoById.get(recipe.evidenceRepoId);
    if (evidence?.paramsB) recipe.paramsB = evidence.paramsB;
  }

  const originGroups = new Map<string, RepoRecord[]>();
  for (const repo of repos) {
    const list = originGroups.get(repo.originId) ?? [];
    list.push(repo);
    originGroups.set(repo.originId, list);
  }

  const recipesByOrigin = new Map<string, Recipe[]>();
  for (const recipe of recipes) {
    const list = recipesByOrigin.get(recipe.originId) ?? [];
    list.push(recipe);
    recipesByOrigin.set(recipe.originId, list);
  }

  const origins: Origin[] = [];
  for (const [originId, members] of originGroups) {
    const originRepo = repoById.get(originId) ?? byId.get(originId)?.repo ?? null;
    const params = originRepo
      ? paramsFor(originRepo)
      : {
          totalB: members.reduce<number | null>(
            (max, repo) => (repo.paramsB !== null && (max === null || repo.paramsB > max) ? repo.paramsB : max),
            null,
          ),
          activeB: members.find((repo) => repo.paramsActiveB !== null)?.paramsActiveB ?? null,
          moe: members.some((repo) => repo.moe),
        };
    const family = familyFor(originId);
    const cohort = recipesByOrigin.get(originId) ?? [];
    const best = cohort.find((recipe) => recipe.bestPick) ?? null;

    origins.push({
      id: originId,
      owner: originId.split("/")[0] ?? "",
      name: displayNameFor(originId),
      displayName: displayNameFor(originId),
      family: family.label,
      familySlug: family.slug,
      paramsB: params.totalB,
      paramsActiveB: params.activeB,
      sizeClass: sizeClassFor(params.totalB),
      moe: params.moe,
      recipeCount: cohort.length,
      rankedCount: cohort.filter((recipe) => recipe.score > 0).length,
      bestRecipeId: best?.id ?? null,
      bestScore: best?.score ?? null,
      bestKl: best?.kl ?? null,
      bestRefusalRate: best?.refusalRate ?? null,
      verifiedRepoCount: members.length,
      downloadsAllTime: members.reduce((sum, repo) => sum + repo.downloadsAllTime, 0),
      downloads30d: members.reduce((sum, repo) => sum + repo.downloads30d, 0),
      lastModified: members
        .map((repo) => repo.lastModified)
        .sort((a, b) => b.localeCompare(a))[0],
    });
  }
  origins.sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id));

  const familyGroups = new Map<string, Origin[]>();
  for (const origin of origins) {
    const list = familyGroups.get(origin.familySlug) ?? [];
    list.push(origin);
    familyGroups.set(origin.familySlug, list);
  }

  const families: Family[] = [];
  for (const [slug, group] of familyGroups) {
    const cohort = group.flatMap((origin) => recipesByOrigin.get(origin.id) ?? []);
    const best = [...cohort].sort((a, b) => b.score - a.score)[0] ?? null;
    families.push({
      slug,
      label: group[0].family,
      originCount: group.length,
      rankedRecipeCount: cohort.filter((recipe) => recipe.score > 0).length,
      bestRecipeId: best?.id ?? null,
      downloadsAllTime: group.reduce((sum, origin) => sum + origin.downloadsAllTime, 0),
    });
  }
  families.sort((a, b) => b.originCount - a.originCount || a.label.localeCompare(b.label));

  // Stable ordering keeps daily snapshot diffs readable.
  recipes.sort((a, b) => a.originId.localeCompare(b.originId) || b.score - a.score || a.id.localeCompare(b.id));
  repos.sort((a, b) => a.id.localeCompare(b.id));

  const verifiedIds = new Set(repos.map((repo) => repo.id));
  const rankedRecipes = recipes.filter((recipe) => recipe.score > 0).length;

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    updatedAt: options.updatedAt ?? new Date().toISOString(),
    generator: "heretico",
    source: "huggingface-hub",
    totals: {
      repos: inputs.length,
      verifiedRepos: verifiedIds.size,
      unverifiedRepos: inputs.length - verifiedIds.size,
      origins: origins.length,
      recipes: recipes.length,
      rankedRecipes,
      directConversions: repos.filter((repo) => repo.kind === "heretic").length,
      downloadsAllTime: repos.reduce((sum, repo) => sum + repo.downloadsAllTime, 0),
      downloads30d: repos.reduce((sum, repo) => sum + repo.downloads30d, 0),
    },
    origins,
    recipes,
    repos,
    families,
  };
}
