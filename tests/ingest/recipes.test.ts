import { describe, expect, it } from "vitest";
import { classifyRepos, type RepoInput } from "@/lib/ingest/classify";
import { buildRecipes, type RecipeInput } from "@/lib/ingest/recipes";
import type { Metrics, ParsedCard, RawRepo } from "@/lib/types";

function repo(id: string, overrides: Partial<RawRepo> = {}): RawRepo {
  return {
    id,
    author: id.split("/")[0],
    sha: "abc",
    createdAt: "2026-01-01T00:00:00.000Z",
    lastModified: "2026-01-01T00:00:00.000Z",
    downloads30d: 0,
    downloadsAllTime: 0,
    likes: 0,
    tags: [],
    gated: false,
    pipelineTag: null,
    libraryName: null,
    declaredBaseModels: [],
    cardBaseModel: null,
    cardQuantizedBy: null,
    safetensorsTotal: null,
    files: [],
    license: null,
    ...overrides,
  };
}

function metrics(overrides: Partial<Metrics> = {}): Metrics {
  return {
    kl: 0.1,
    refusals: 5,
    refusalTotal: 100,
    originalKl: 0,
    originalRefusals: 97,
    originalRefusalTotal: 100,
    confidence: "high",
    evidence: "table",
    sourceRepoId: null,
    ...overrides,
  };
}

function card(overrides: Partial<ParsedCard> = {}): ParsedCard {
  return {
    baseModelIds: [],
    baseModelEvidence: null,
    hereticVersion: null,
    isHereticConversion: false,
    referencesHereticProject: false,
    metrics: metrics(),
    benchmarks: [],
    license: null,
    languages: [],
    quantizedBy: null,
    formatHints: [],
    kindHint: null,
    ...overrides,
  };
}

function build(inputs: RepoInput[]): RecipeInput[] {
  const classifications = classifyRepos(inputs);
  return inputs.map((input) => ({
    ...input,
    classification: classifications.get(input.repo.id)!,
  }));
}

const direct = (id = "p-e-w/Qwen3-4B-heretic", base = "Qwen/Qwen3-4B", m = metrics()) =>
  ({
    repo: repo(id, { declaredBaseModels: [base] }),
    card: card({ baseModelIds: [base], isHereticConversion: true, metrics: m }),
  }) satisfies RepoInput;

describe("buildRecipes", () => {
  it("groups a conversion and its quant into one recipe with inherited evidence", () => {
    const inputs = [
      direct("p-e-w/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 0.1, refusals: 5 })),
      {
        repo: repo("mradermacher/Qwen3-4B-heretic-GGUF", {
          declaredBaseModels: ["p-e-w/Qwen3-4B-heretic"],
          files: ["m-Q4_K_M.gguf"],
          downloadsAllTime: 500,
        }),
        card: card({
          baseModelIds: ["p-e-w/Qwen3-4B-heretic"],
          metrics: metrics({ kl: null, refusals: null, refusalTotal: null, confidence: "none" }),
          quantizedBy: "mradermacher",
          kindHint: "quant",
        }),
      },
    ];

    const { recipes, metricsByRepo } = buildRecipes(build(inputs));
    expect(recipes).toHaveLength(1);
    const recipe = recipes[0];
    expect(recipe.repoIds).toHaveLength(2);
    expect(recipe.bestRepoId).toBe("p-e-w/Qwen3-4B-heretic");
    expect(recipe.author).toBe("p-e-w");
    expect(recipe.kl).toBe(0.1);
    expect(recipe.downloadsAllTime).toBe(500);
    expect(metricsByRepo.get("mradermacher/Qwen3-4B-heretic-GGUF")!.confidence).toBe("inherited");
    expect(metricsByRepo.get("mradermacher/Qwen3-4B-heretic-GGUF")!.sourceRepoId).toBe(
      "p-e-w/Qwen3-4B-heretic",
    );
  });

  it("uses a quant card's published numbers when the conversion card has none", () => {
    const inputs = [
      direct(
        "p-e-w/Qwen3-4B-heretic",
        "Qwen/Qwen3-4B",
        metrics({ kl: null, refusals: null, refusalTotal: null, confidence: "none" }),
      ),
      {
        repo: repo("someone/Qwen3-4B-heretic-GGUF", {
          declaredBaseModels: ["p-e-w/Qwen3-4B-heretic"],
          files: ["m.gguf"],
        }),
        card: card({
          baseModelIds: ["p-e-w/Qwen3-4B-heretic"],
          metrics: metrics({ kl: 0.2, refusals: 7 }),
          kindHint: "quant",
        }),
      },
    ];
    const { recipes } = buildRecipes(build(inputs));
    expect(recipes).toHaveLength(1);
    expect(recipes[0].kl).toBe(0.2);
    expect(recipes[0].evidenceRepoId).toBe("someone/Qwen3-4B-heretic-GGUF");
  });

  it("ranks separate ablations of the same model as separate recipes", () => {
    const inputs = [
      direct("p-e-w/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 0.05, refusals: 10 })),
      direct("other/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 0.2, refusals: 0 })),
      direct("third/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 0.3, refusals: 20 })),
    ];
    const { recipes } = buildRecipes(build(inputs));
    expect(recipes).toHaveLength(3);
    const byAuthor = new Map(recipes.map((r) => [r.author, r]));
    expect(byAuthor.get("p-e-w")!.pareto).toBe(true);
    expect(byAuthor.get("other")!.pareto).toBe(true);
    expect(byAuthor.get("third")!.pareto).toBe(false);
    // 10% refusals at KL 0.05 beats 0% refusals at KL 0.2 on the equal-weight score.
    expect(byAuthor.get("p-e-w")!.bestPick).toBe(true);
    expect(byAuthor.get("other")!.bestPick).toBe(false);
  });

  it("merges re-uploads of the same ablation across authors", () => {
    const inputs = [
      direct("a/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 0.1, refusals: 5 })),
      direct("b/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 0.1, refusals: 5 })),
    ];
    const { recipes } = buildRecipes(build(inputs));
    expect(recipes).toHaveLength(1);
    expect(recipes[0].repoIds).toHaveLength(2);
  });

  it("flags a claim of both zero KL and zero refusals", () => {
    const inputs = [
      direct("a/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 0, refusals: 0 })),
      direct("b/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 0.2, refusals: 5 })),
    ];
    const { recipes } = buildRecipes(build(inputs));
    expect(recipes.find((recipe) => recipe.author === "a")!.implausible).toBe(true);
    expect(recipes.find((recipe) => recipe.author === "b")!.implausible).toBe(false);
  });

  it("keeps different ablations by the same author with different numbers apart", () => {
    const inputs = [
      direct("a/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 0.05, refusals: 10 })),
      direct("a/Qwen3-4B-heretic-v2", "Qwen/Qwen3-4B", metrics({ kl: 0.3, refusals: 2 })),
    ];
    const { recipes } = buildRecipes(build(inputs));
    expect(recipes).toHaveLength(2);
  });

  it("does not create a recipe for a conversion without numbers", () => {
    const inputs = [
      direct(
        "p-e-w/Qwen3-4B-heretic",
        "Qwen/Qwen3-4B",
        metrics({ kl: null, refusals: null, refusalTotal: null, confidence: "none" }),
      ),
    ];
    const { recipes, recipeByRepo } = buildRecipes(build(inputs));
    expect(recipes).toHaveLength(0);
    expect(recipeByRepo.size).toBe(0);
  });

  it("ignores unverified repos", () => {
    const inputs = [
      direct("p-e-w/Qwen3-4B-heretic", "Qwen/Qwen3-4B"),
      { repo: repo("random/unrelated"), card: card() },
    ];
    const { recipes } = buildRecipes(build(inputs));
    expect(recipes).toHaveLength(1);
    expect(recipes[0].repoIds).toEqual(["p-e-w/Qwen3-4B-heretic"]);
  });
});
