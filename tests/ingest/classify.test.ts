import { describe, expect, it } from "vitest";
import { classifyRepos, type RepoInput } from "@/lib/ingest/classify";
import type { ParsedCard, RawRepo } from "@/lib/types";

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
    pipelineTag: "text-generation",
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

function card(overrides: Partial<ParsedCard> = {}): ParsedCard {
  return {
    baseModelIds: [],
    baseModelEvidence: null,
    hereticVersion: null,
    isHereticConversion: false,
    referencesHereticProject: false,
    metrics: {
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
    benchmarks: [],
    license: null,
    languages: [],
    quantizedBy: null,
    formatHints: [],
    kindHint: null,
    ...overrides,
  };
}

function input(id: string, opts: { repo?: Partial<RawRepo>; card?: ParsedCard | null }): RepoInput {
  return { repo: repo(id, opts.repo), card: opts.card === undefined ? null : opts.card };
}

describe("classifyRepos", () => {
  it("marks a direct conversion and keeps the upstream model as origin", () => {
    const result = classifyRepos([
      input("p-e-w/Qwen3-4B-heretic", {
        repo: { declaredBaseModels: ["Qwen/Qwen3-4B"] },
        card: card({
          baseModelIds: ["Qwen/Qwen3-4B"],
          isHereticConversion: true,
          referencesHereticProject: true,
        }),
      }),
    ]);
    const c = result.get("p-e-w/Qwen3-4B-heretic")!;
    expect(c.kind).toBe("heretic");
    expect(c.originId).toBe("Qwen/Qwen3-4B");
    expect(c.verified).toBe(true);
  });

  it("walks quant -> conversion -> upstream to resolve the origin", () => {
    const result = classifyRepos([
      input("p-e-w/Qwen3-4B-heretic", {
        repo: { declaredBaseModels: ["Qwen/Qwen3-4B"] },
        card: card({ baseModelIds: ["Qwen/Qwen3-4B"], isHereticConversion: true }),
      }),
      input("mradermacher/Qwen3-4B-heretic-GGUF", {
        repo: {
          declaredBaseModels: ["p-e-w/Qwen3-4B-heretic"],
          files: ["model-Q4_K_M.gguf"],
          tags: ["gguf"],
        },
        card: card({
          baseModelIds: ["p-e-w/Qwen3-4B-heretic"],
          quantizedBy: "mradermacher",
          kindHint: "quant",
        }),
      }),
    ]);
    const c = result.get("mradermacher/Qwen3-4B-heretic-GGUF")!;
    expect(c.kind).toBe("quant");
    expect(c.originId).toBe("Qwen/Qwen3-4B");
    expect(c.verified).toBe(true);
  });

  it("treats a finetune of a Heretic model as a derivative, not a new ablation", () => {
    const result = classifyRepos([
      input("p-e-w/Qwen3-4B-heretic", {
        repo: { declaredBaseModels: ["Qwen/Qwen3-4B"] },
        card: card({ baseModelIds: ["Qwen/Qwen3-4B"], isHereticConversion: true }),
      }),
      input("DavidAU/Qwen3-4B-Heretic-NEO", {
        repo: { declaredBaseModels: ["p-e-w/Qwen3-4B-heretic"] },
        card: card({ baseModelIds: ["p-e-w/Qwen3-4B-heretic"], kindHint: "finetune" }),
      }),
    ]);
    const c = result.get("DavidAU/Qwen3-4B-Heretic-NEO")!;
    expect(c.kind).toBe("finetune");
    expect(c.originId).toBe("Qwen/Qwen3-4B");
  });

  it("keeps a GGUF-only direct publication as a heretic conversion", () => {
    const result = classifyRepos([
      input("maternion/MiniCPM-V-4.7-1B-Heretic-Abliterated-GGUF", {
        repo: {
          declaredBaseModels: ["openbmb/MiniCPM-V-4.7-1B"],
          files: ["model-Q4_K_M.gguf"],
          tags: ["gguf"],
        },
        card: card({
          baseModelIds: ["openbmb/MiniCPM-V-4.7-1B"],
          isHereticConversion: true,
        }),
      }),
    ]);
    const c = result.get("maternion/MiniCPM-V-4.7-1B-Heretic-Abliterated-GGUF")!;
    expect(c.kind).toBe("heretic");
    expect(c.originId).toBe("openbmb/MiniCPM-V-4.7-1B");
  });

  it("falls back to an external Heretic base when the parent is not indexed", () => {
    const result = classifyRepos([
      input("someone/Cool-7B-heretic-GGUF", {
        repo: {
          declaredBaseModels: ["ghost/Cool-7B-Heretic"],
          files: ["Cool-Q4_K_M.gguf"],
        },
        card: null,
      }),
    ]);
    const c = result.get("someone/Cool-7B-heretic-GGUF")!;
    expect(c.kind).toBe("quant");
    expect(c.originId).toBe("ghost/Cool-7B-Heretic");
    expect(c.verified).toBe(true);
  });

  it("never verifies a repo with no Heretic provenance", () => {
    const result = classifyRepos([
      input("random/shecret-heretic-name", {
        repo: { tags: ["heretic"], declaredBaseModels: ["acme/Base-7B"] },
        card: card({ baseModelIds: ["acme/Base-7B"] }),
      }),
    ]);
    const c = result.get("random/shecret-heretic-name")!;
    expect(c.kind).toBe("unknown");
    expect(c.verified).toBe(false);
    expect(c.evidence).toMatch(/no Heretic provenance/);
  });

  it("survives base-model cycles", () => {
    const result = classifyRepos([
      input("a/One-heretic", { repo: { declaredBaseModels: ["b/Two-heretic"] }, card: card() }),
      input("b/Two-heretic", { repo: { declaredBaseModels: ["a/One-heretic"] }, card: card() }),
    ]);
    expect(result.size).toBe(2);
    expect(result.get("a/One-heretic")!.verified).toBe(false);
    expect(result.get("b/Two-heretic")!.verified).toBe(false);
  });

  it("folds case-variant origin spellings onto the indexed one", () => {
    const result = classifyRepos([
      input("google/gemma-4-12b-it", { repo: { declaredBaseModels: [] }, card: card() }),
      input("p-e-w/gemma-4-12b-it-heretic", {
        repo: { declaredBaseModels: ["google/gemma-4-12b-it"] },
        card: card({ baseModelIds: ["google/gemma-4-12b-it"], isHereticConversion: true }),
      }),
      input("someone/gemma-4-12B-it-heretic", {
        repo: { declaredBaseModels: ["google/gemma-4-12B-it"] },
        card: card({ baseModelIds: ["google/gemma-4-12B-it"], isHereticConversion: true }),
      }),
    ]);
    expect(result.get("p-e-w/gemma-4-12b-it-heretic")!.originId).toBe("google/gemma-4-12b-it");
    expect(result.get("someone/gemma-4-12B-it-heretic")!.originId).toBe("google/gemma-4-12b-it");
  });

  it("resolves a parent that differs only in case from the indexed repo id", () => {
    const result = classifyRepos([
      input("p-e-w/Gemma-3-12B-it-heretic", {
        repo: { declaredBaseModels: ["google/gemma-3-12b-it"] },
        card: card({ baseModelIds: ["google/gemma-3-12b-it"], isHereticConversion: true }),
      }),
      input("someone/Gemma-3-12B-it-heretic-GGUF", {
        repo: {
          declaredBaseModels: ["p-e-w/gemma-3-12b-it-heretic"],
          files: ["model-Q4_K_M.gguf"],
        },
        card: card({ baseModelIds: ["p-e-w/gemma-3-12b-it-heretic"] }),
      }),
    ]);
    const quant = result.get("someone/Gemma-3-12B-it-heretic-GGUF")!;
    expect(quant.kind).toBe("quant");
    expect(quant.originId).toBe("google/gemma-3-12b-it");
  });

  it("deduplicates parents and ignores self-references", () => {
    const result = classifyRepos([
      input("p-e-w/Qwen3-4B-heretic", {
        repo: { declaredBaseModels: ["Qwen/Qwen3-4B", "p-e-w/Qwen3-4B-heretic"] },
        card: card({ baseModelIds: ["Qwen/Qwen3-4B", "Qwen/Qwen3-4B"] }),
      }),
    ]);
    expect(result.get("p-e-w/Qwen3-4B-heretic")!.parents).toEqual(["Qwen/Qwen3-4B"]);
  });
});
