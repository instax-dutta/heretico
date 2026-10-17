import { describe, expect, it } from "vitest";
import { classifyRepos, type RepoInput } from "@/lib/ingest/classify";
import { bestVerification, buildRecipes, type RecipeInput } from "@/lib/ingest/recipes";
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
    repo: repo(id, { declaredBaseModels: [base], safetensorsTotal: 4_000_000_000 }),
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

  it("keeps an artifact's own confidence when it published its own numbers", () => {
    const inputs = [
      direct("p-e-w/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 0.1, refusals: 5 })),
      {
        repo: repo("other/Qwen3-4B-heretic-HQ", {
          declaredBaseModels: ["p-e-w/Qwen3-4B-heretic"],
        }),
        card: card({
          baseModelIds: ["p-e-w/Qwen3-4B-heretic"],
          metrics: metrics({ kl: 0.02, refusals: 1, confidence: "high" }),
          kindHint: "finetune",
        }),
      },
    ];

    const { recipes, metricsByRepo } = buildRecipes(build(inputs));
    expect(recipes).toHaveLength(1);
    expect(recipes[0].kl).toBe(0.1);
    const own = metricsByRepo.get("other/Qwen3-4B-heretic-HQ")!;
    expect(own.kl).toBe(0.02);
    expect(own.confidence).toBe("high");
    expect(own.sourceRepoId).toBeNull();
  });

  it("ranks a measured artifact whose ablation ancestor is not indexed", () => {
    const inputs = [
      {
        repo: repo("0xzknw/LFM2.5-1.2B-Thinking-Heretic", {
          declaredBaseModels: ["LiquidAI/LFM2.5-1.2B-Thinking"],
          files: ["model.gguf"],
        }),
        card: card({
          baseModelIds: ["LiquidAI/LFM2.5-1.2B-Thinking"],
          referencesHereticProject: true,
          metrics: metrics({ kl: 0.0003, refusals: 3 }),
        }),
      },
    ];

    const { recipes } = buildRecipes(build(inputs));
    expect(recipes).toHaveLength(1);
    expect(recipes[0].originId).toBe("LiquidAI/LFM2.5-1.2B-Thinking");
    expect(recipes[0].kl).toBe(0.0003);
  });

  it("folds a measured re-upload whose numbers match a parent's recipe into it", () => {
    const inputs = [
      direct("p-e-w/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 0.05, refusals: 2 })),
      {
        // No ablation ancestor, but it copied the parent's numbers and version.
        repo: repo("copy/Qwen3-4B-heretic-GGUF", {
          declaredBaseModels: ["Qwen/Qwen3-4B"],
          files: ["m.gguf"],
        }),
        card: card({
          baseModelIds: ["Qwen/Qwen3-4B"],
          hereticVersion: "1.2.0",
          referencesHereticProject: true,
          metrics: metrics({ kl: 0.05, refusals: 2 }),
        }),
      },
    ];
    (inputs[0] as { card: ParsedCard }).card.hereticVersion = "1.2.0";

    const { recipes } = buildRecipes(build(inputs));
    expect(recipes).toHaveLength(1);
    expect(recipes[0].repoIds).toHaveLength(2);
  });

  it("matches a parent whose id differs only in case", () => {
    const inputs = [
      direct("p-e-w/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 0.1, refusals: 5 })),
      {
        repo: repo("llmfan46/AI21-Jamba2-Mini-Ultra-Uncensored-Heretic", {
          declaredBaseModels: ["p-e-w/Qwen3-4B-HERETIC"],
        }),
        card: card({
          baseModelIds: ["p-e-w/Qwen3-4B-HERETIC"],
          metrics: metrics({ kl: null, refusals: null, refusalTotal: null, confidence: "none" }),
        }),
      },
    ];

    const { recipes, metricsByRepo } = buildRecipes(build(inputs));
    expect(recipes).toHaveLength(1);
    expect(recipes[0].repoIds).toHaveLength(2);
    expect(metricsByRepo.get("llmfan46/AI21-Jamba2-Mini-Ultra-Uncensored-Heretic")!.sourceRepoId).toBe(
      "p-e-w/Qwen3-4B-heretic",
    );
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

describe("verification", () => {
  const weighted = (id = "p-e-w/Qwen3-4B-heretic", base = "Qwen/Qwen3-4B", m = metrics()) =>
    ({
      repo: repo(id, { declaredBaseModels: [base], safetensorsTotal: 4_000_000_000 }),
      card: card({ baseModelIds: [base], isHereticConversion: true, metrics: m }),
    }) satisfies RepoInput;

  it("verifies a recipe whose evidence repo ships real weights", () => {
    const { recipes } = buildRecipes(build([weighted()]));
    expect(recipes[0].verification).toBe("verified");
  });

  it("does not verify a recipe whose repo publishes no weights", () => {
    const { recipes } = buildRecipes(build([weighted("a/Qwen3-4B-heretic")]));
    expect(recipes[0].verification).toBe("verified");

    const weightless = buildRecipes(
      build([
        {
          repo: repo("b/Qwen3-4B-heretic", { declaredBaseModels: ["Qwen/Qwen3-4B"] }),
          card: card({
            baseModelIds: ["Qwen/Qwen3-4B"],
            isHereticConversion: true,
            metrics: metrics(),
          }),
        },
      ]),
    );
    expect(weightless.recipes[0].verification).toBe("unverified");
  });

  it("does not verify a recipe claiming a KL no abliteration can produce", () => {
    const { recipes } = buildRecipes(
      build([weighted("c/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 0, refusals: 0 }))]),
    );
    expect(recipes[0].verification).toBe("unverified");
    expect(recipes[0].implausible).toBe(true);
  });

  it("flags a KL below the ablation floor as implausible but still ranks it", () => {
    const { recipes } = buildRecipes(
      build([weighted("d/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 1e-5, refusals: 1 }))]),
    );
    expect(recipes[0].implausible).toBe(true);
    expect(recipes[0].verification).toBe("unverified");
    expect(recipes[0].score).toBeGreaterThan(0);
  });

  it("keeps verification when a re-upload merges into a verified recipe", () => {
    const inputs = [
      weighted("a/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 0.1, refusals: 5 })),
      {
        // Same numbers, no weights: must not downgrade, and must not upgrade alone.
        repo: repo("b/Qwen3-4B-heretic", { declaredBaseModels: ["Qwen/Qwen3-4B"] }),
        card: card({
          baseModelIds: ["Qwen/Qwen3-4B"],
          isHereticConversion: true,
          metrics: metrics({ kl: 0.1, refusals: 5 }),
        }),
      },
    ];
    const { recipes } = buildRecipes(build(inputs));
    expect(recipes).toHaveLength(1);
    expect(recipes[0].verification).toBe("verified");
  });

  it("prefers verified over unverified when best pick is chosen", () => {
    const inputs = [
      // A fabricated perfect card, no weights.
      {
        repo: repo("attacker/Qwen3-4B-heretic", { declaredBaseModels: ["Qwen/Qwen3-4B"] }),
        card: card({
          baseModelIds: ["Qwen/Qwen3-4B"],
          isHereticConversion: true,
          metrics: metrics({ kl: 0, refusals: 0 }),
        }),
      },
      // An honest conversion with a slightly worse score and real weights.
      weighted("p-e-w/Qwen3-4B-heretic", "Qwen/Qwen3-4B", metrics({ kl: 0.2, refusals: 1 })),
    ];
    const { recipes } = buildRecipes(build(inputs));
    const best = recipes.find((r) => r.bestPick)!;
    expect(best.author).toBe("p-e-w");
    expect(best.score).toBeLessThan(recipes.find((r) => !r.bestPick)!.score);
  });
});

describe("bestVerification", () => {
  it("keeps the strongest claim", () => {
    expect(bestVerification("verified", "unverified")).toBe("verified");
    expect(bestVerification("unverified", "verified")).toBe("verified");
    expect(bestVerification("unverified", "unverified")).toBe("unverified");
    expect(bestVerification("publisher", "verified")).toBe("publisher");
    expect(bestVerification("unverified", "publisher")).toBe("publisher");
  });
});
