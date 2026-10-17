import { describe, expect, it } from "vitest";
import { buildSnapshot, type RawDataset } from "@/lib/snapshot";
import type { Metrics, ParsedCard, RawRepo } from "@/lib/types";

function repo(id: string, overrides: Partial<RawRepo> = {}): RawRepo {
  return {
    id,
    author: id.split("/")[0],
    sha: "abc",
    createdAt: "2026-01-01T00:00:00.000Z",
    lastModified: "2026-01-02T00:00:00.000Z",
    downloads30d: 10,
    downloadsAllTime: 100,
    likes: 1,
    tags: [],
    gated: false,
    pipelineTag: "text-generation",
    libraryName: null,
    declaredBaseModels: [],
    cardBaseModel: null,
    cardQuantizedBy: null,
    safetensorsTotal: null,
    files: [],
    license: "apache-2.0",
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
    hereticVersion: "1.2.0",
    isHereticConversion: false,
    referencesHereticProject: false,
    metrics: metrics(),
    benchmarks: [],
    license: "apache-2.0",
    languages: ["en"],
    quantizedBy: null,
    formatHints: [],
    kindHint: null,
    ...overrides,
  };
}

describe("buildSnapshot", () => {
  const dataset: RawDataset = {
    crawledAt: "2026-02-01T00:00:00.000Z",
    repos: [
      repo("p-e-w/Qwen3-4B-heretic", {
        declaredBaseModels: ["Qwen/Qwen3-4B"],
        safetensorsTotal: 4_000_000_000,
        files: ["model.safetensors"],
      }),
      repo("someone/Qwen3-4B-heretic-GGUF", {
        declaredBaseModels: ["p-e-w/Qwen3-4B-heretic"],
        files: ["Qwen3-4B-Q4_K_M.gguf"],
        downloadsAllTime: 900,
      }),
      repo("other/Qwen3-4B-heretic", {
        declaredBaseModels: ["Qwen/Qwen3-4B"],
        safetensorsTotal: 4_000_000_000,
        files: ["model.safetensors"],
      }),
      repo("random/unrelated-heretic-name", { declaredBaseModels: ["acme/Base-7B"] }),
    ],
    cards: {
      "p-e-w/Qwen3-4B-heretic": card({
        baseModelIds: ["Qwen/Qwen3-4B"],
        isHereticConversion: true,
        metrics: metrics({ kl: 0.1, refusals: 10 }),
        benchmarks: [{ metric: "MMLU", value: 70.1 }],
      }),
      "someone/Qwen3-4B-heretic-GGUF": card({
        baseModelIds: ["p-e-w/Qwen3-4B-heretic"],
        quantizedBy: "someone",
        kindHint: "quant",
        metrics: metrics({ kl: null, refusals: null, refusalTotal: null, confidence: "none" }),
      }),
      "other/Qwen3-4B-heretic": card({
        baseModelIds: ["Qwen/Qwen3-4B"],
        isHereticConversion: true,
        metrics: metrics({ kl: 0.05, refusals: 20 }),
      }),
      "random/unrelated-heretic-name": card({ baseModelIds: ["acme/Base-7B"] }),
    },
  };

  const snapshot = buildSnapshot(dataset, { updatedAt: "2026-02-01T12:00:00.000Z" });

  it("records totals including unverified repos", () => {
    expect(snapshot.totals.repos).toBe(4);
    expect(snapshot.totals.verifiedRepos).toBe(3);
    expect(snapshot.totals.unverifiedRepos).toBe(1);
    expect(snapshot.totals.directConversions).toBe(2);
    expect(snapshot.totals.origins).toBe(1);
    expect(snapshot.totals.recipes).toBe(2);
    expect(snapshot.totals.rankedRecipes).toBe(2);
  });

  it("marks the best pick and Pareto front per origin", () => {
    const origin = snapshot.origins[0];
    expect(origin.id).toBe("Qwen/Qwen3-4B");
    expect(origin.bestRecipeId).not.toBeNull();
    const best = snapshot.recipes.find((r) => r.id === origin.bestRecipeId)!;
    expect(best.bestPick).toBe(true);
    expect(snapshot.recipes.every((r) => r.pareto)).toBe(true);
  });

  it("aggregates downloads per recipe and origin", () => {
    const pEw = snapshot.recipes.find((r) => r.author === "p-e-w")!;
    expect(pEw.downloadsAllTime).toBe(1000); // 100 + 900 from its quant
    expect(snapshot.origins[0].downloadsAllTime).toBe(1100);
  });

  it("inherits quant metrics from the conversion", () => {
    const quant = snapshot.repos.find((r) => r.id === "someone/Qwen3-4B-heretic-GGUF")!;
    expect(quant.metrics.kl).toBe(0.1);
    expect(quant.metrics.confidence).toBe("inherited");
    expect(quant.metrics.sourceRepoId).toBe("p-e-w/Qwen3-4B-heretic");
    expect(quant.quant).toBe("Q4_K_M");
    expect(quant.formats).toContain("gguf");
  });

  it("carries benchmarks and family metadata", () => {
    const recipe = snapshot.recipes.find((r) => r.author === "p-e-w")!;
    expect(recipe.benchmarks).toEqual([{ metric: "MMLU", value: 70.1 }]);
    expect(snapshot.origins[0].family).toBe("Qwen 3");
    expect(snapshot.families[0].slug).toBe("qwen-3");
  });

  it("is deterministic", () => {
    const again = buildSnapshot(dataset, { updatedAt: "2026-02-01T12:00:00.000Z" });
    expect(JSON.stringify(again)).toBe(JSON.stringify(snapshot));
  });
});
