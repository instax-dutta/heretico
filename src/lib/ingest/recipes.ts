import type { Classification, RepoInput } from "./classify";
import { bestPickId, paretoIds, scoreOf, type ScoreInput } from "../scoring";
import type { Metrics, Recipe } from "../types";

export interface RecipeInput extends RepoInput {
  classification: Classification;
}

export interface RecipeBuild {
  recipes: Recipe[];
  /** Per-repo metrics after inheritance. */
  metricsByRepo: Map<string, Metrics>;
  /** Repo id -> recipe id, for repos that belong to a measured recipe. */
  recipeByRepo: Map<string, string>;
}

function noMetrics(): Metrics {
  return {
    kl: null,
    refusals: null,
    refusalTotal: null,
    originalKl: null,
    originalRefusals: null,
    originalRefusalTotal: null,
    confidence: "none",
    evidence: null,
    sourceRepoId: null,
  };
}

function hasNumbers(metrics: Metrics): boolean {
  return metrics.kl !== null && metrics.refusals !== null && metrics.refusalTotal !== null;
}

/** Small deterministic id, stable across refreshes for the same recipe. */
function signatureOf(recipe: Recipe): string {
  return [
    recipe.originId,
    recipe.kl,
    recipe.refusals,
    recipe.refusalTotal,
    recipe.hereticVersion ?? "",
  ].join("|");
}

function mergeBenchmarks(a: Recipe["benchmarks"], b: Recipe["benchmarks"]): Recipe["benchmarks"] {
  const byMetric = new Map(a.map((benchmark) => [benchmark.metric, benchmark]));
  for (const benchmark of b) {
    if (!byMetric.has(benchmark.metric)) byMetric.set(benchmark.metric, benchmark);
  }
  return [...byMetric.values()];
}

export function recipeIdFor(key: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `rcp_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function buildRecipes(inputs: RecipeInput[]): RecipeBuild {
  const byId = new Map(inputs.map((input) => [input.repo.id, input]));
  const metricsByRepo = new Map<string, Metrics>();
  const recipeByRepo = new Map<string, string>();

  for (const input of inputs) {
    metricsByRepo.set(input.repo.id, input.card?.metrics ?? noMetrics());
  }

  /** Nearest Heretic conversion above (or at) this repo. */
  function ablationOf(id: string): string | null {
    let current = byId.get(id);
    const seen = new Set<string>();
    while (current) {
      if (seen.has(current.repo.id)) return null;
      seen.add(current.repo.id);
      if (current.classification.kind === "heretic") return current.repo.id;
      const parent = current.classification.parents[0];
      current = parent ? byId.get(parent) : undefined;
    }
    return null;
  }

  const groups = new Map<string, RecipeInput[]>();
  for (const input of inputs) {
    if (!input.classification.verified) continue;
    if (!input.classification.originId) continue;
    const ablation = ablationOf(input.repo.id);
    if (!ablation) continue;
    const list = groups.get(ablation) ?? [];
    list.push(input);
    groups.set(ablation, list);
  }

  const recipes: Recipe[] = [];

  for (const [ablationId, group] of groups) {
    const ablation = byId.get(ablationId);
    if (!ablation) continue;

    const evidenceCandidates = group.filter((member) => {
      const metrics = metricsByRepo.get(member.repo.id);
      return metrics ? hasNumbers(metrics) : false;
    });
    if (evidenceCandidates.length === 0) continue;

    // Prefer the ablation's own card, then the closest artifact.
    evidenceCandidates.sort((a, b) => {
      if (a.repo.id === ablationId) return -1;
      if (b.repo.id === ablationId) return 1;
      return a.repo.id.localeCompare(b.repo.id);
    });
    const evidence = evidenceCandidates[0];
    const evidenceMetrics = metricsByRepo.get(evidence.repo.id)!;

    const key = [
      ablation.classification.originId,
      ablation.repo.author,
      evidenceMetrics.kl,
      evidenceMetrics.refusals,
      evidenceMetrics.refusalTotal,
      ablation.card?.hereticVersion ?? "",
    ].join("|");
    const recipeId = recipeIdFor(key);

    // Artifacts without their own card numbers inherit the recipe evidence.
    for (const member of group) {
      const own = metricsByRepo.get(member.repo.id)!;
      if (!hasNumbers(own)) {
        metricsByRepo.set(member.repo.id, {
          ...evidenceMetrics,
          confidence: "inherited",
          sourceRepoId: evidence.repo.id,
        });
      } else if (member.repo.id !== evidence.repo.id) {
        metricsByRepo.set(member.repo.id, {
          ...own,
          confidence: "inherited",
          sourceRepoId: evidence.repo.id,
        });
      }
      recipeByRepo.set(member.repo.id, recipeId);
    }

    const repoIds = group.map((member) => member.repo.id).sort((a, b) => {
      if (a === evidence.repo.id) return -1;
      if (b === evidence.repo.id) return 1;
      return a.localeCompare(b);
    });

    const formats = [...new Set(group.flatMap((member) => member.card?.formatHints ?? []))];
    const allFormats = new Set<string>();
    for (const member of group) {
      for (const tag of member.repo.tags) {
        const lower = tag.toLowerCase();
        if (["gguf", "mlx", "safetensors", "awq", "gptq"].includes(lower)) allFormats.add(lower);
      }
      for (const file of member.repo.files) {
        if (file.toLowerCase().endsWith(".gguf")) allFormats.add("gguf");
        if (file.toLowerCase().endsWith(".safetensors")) allFormats.add("safetensors");
      }
    }
    for (const format of formats) allFormats.add(format);

    const downloadsAllTime = group.reduce((sum, member) => sum + member.repo.downloadsAllTime, 0);
    const downloads30d = group.reduce((sum, member) => sum + member.repo.downloads30d, 0);
    const likes = Math.max(...group.map((member) => member.repo.likes));
    const lastModified = group
      .map((member) => member.repo.lastModified)
      .sort((a, b) => b.localeCompare(a))[0];

    const score = scoreOf({
      id: recipeId,
      kl: evidenceMetrics.kl,
      refusals: evidenceMetrics.refusals,
      refusalTotal: evidenceMetrics.refusalTotal,
      confidence: evidenceMetrics.confidence,
      downloadsAllTime,
      lastModified,
    });

    recipes.push({
      id: recipeId,
      originId: ablation.classification.originId!,
      author: ablation.repo.author,
      repoIds,
      bestRepoId: evidence.repo.id,
      kind: ablation.classification.kind,
      kl: evidenceMetrics.kl!,
      refusals: evidenceMetrics.refusals!,
      refusalTotal: evidenceMetrics.refusalTotal!,
      refusalRate: score?.rate ?? 0,
      score: score?.quality ?? 0,
      pareto: false,
      bestPick: false,
      implausible: evidenceMetrics.kl === 0 && evidenceMetrics.refusals === 0,
      confidence: evidenceMetrics.confidence,
      hereticVersion: ablation.card?.hereticVersion ?? null,
      formats: [...allFormats].sort(),
      paramsB: ablation.repo.safetensorsTotal ? ablation.repo.safetensorsTotal / 1e9 : null,
      downloadsAllTime,
      downloads30d,
      likes,
      lastModified,
      benchmarks: evidence.card?.benchmarks ?? [],
      evidenceRepoId: evidence.repo.id,
    });
  }

  // Re-uploads of the same ablation (often by different accounts) carry
  // identical metrics. Merge them so the leaderboard shows one row per
  // distinguishable result rather than four copies of the same weights.
  const bySignature = new Map<string, Recipe>();
  for (const recipe of recipes) {
    const signature = signatureOf(recipe);
    const existing = bySignature.get(signature);
    if (!existing) {
      bySignature.set(signature, recipe);
      continue;
    }
    const keep = existing.downloadsAllTime >= recipe.downloadsAllTime ? existing : recipe;
    const other = keep === existing ? recipe : existing;
    keep.repoIds = [...new Set([...keep.repoIds, ...other.repoIds])].sort();
    keep.downloadsAllTime += other.downloadsAllTime;
    keep.downloads30d += other.downloads30d;
    keep.likes = Math.max(keep.likes, other.likes);
    keep.lastModified =
      keep.lastModified >= other.lastModified ? keep.lastModified : other.lastModified;
    keep.formats = [...new Set([...keep.formats, ...other.formats])].sort();
    keep.benchmarks = mergeBenchmarks(keep.benchmarks, other.benchmarks);
    keep.implausible = keep.implausible || other.implausible;
    bySignature.set(signature, keep);
  }

  const mergedRecipes = [...bySignature.entries()].map(([signature, recipe]) => {
    const id = recipeIdFor(signature);
    return { ...recipe, id };
  });
  for (const recipe of mergedRecipes) {
    for (const repoId of recipe.repoIds) recipeByRepo.set(repoId, recipe.id);
  }

  // Pareto and best pick are cohort-relative: only meaningful when comparing
  // versions of the same underlying model.
  const cohorts = new Map<string, Recipe[]>();
  for (const recipe of mergedRecipes) {
    const list = cohorts.get(recipe.originId) ?? [];
    list.push(recipe);
    cohorts.set(recipe.originId, list);
  }

  for (const cohort of cohorts.values()) {
    const scoreInputs: ScoreInput[] = cohort.map((recipe) => ({
      id: recipe.id,
      kl: recipe.kl,
      refusals: recipe.refusals,
      refusalTotal: recipe.refusalTotal,
      confidence: recipe.confidence,
      downloadsAllTime: recipe.downloadsAllTime,
      lastModified: recipe.lastModified,
    }));
    const frontier = paretoIds(scoreInputs);
    const best = bestPickId(scoreInputs);
    for (const recipe of cohort) {
      recipe.pareto = frontier.has(recipe.id);
      recipe.bestPick = recipe.id === best;
    }
  }

  mergedRecipes.sort((a, b) => {
    if (a.originId !== b.originId) return a.originId.localeCompare(b.originId);
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });

  return { recipes: mergedRecipes, metricsByRepo, recipeByRepo };
}
