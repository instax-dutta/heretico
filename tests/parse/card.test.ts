import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cleanModelId, parseCard } from "@/lib/parse/card";

const CARDS = join(__dirname, "..", "fixtures", "cards");

function load(name: string, selfId?: string) {
  const markdown = readFileSync(join(CARDS, `${name}.md`), "utf8");
  return parseCard(markdown, { selfId });
}

describe("parseCard — canonical Heretic table", () => {
  const card = load("p-e-w__gemma-3-12b-it-heretic", "p-e-w/gemma-3-12b-it-heretic");

  it("reads KL, refusals and the original baseline", () => {
    expect(card.metrics.kl).toBe(0.16);
    expect(card.metrics.refusals).toBe(3);
    expect(card.metrics.refusalTotal).toBe(100);
    expect(card.metrics.originalRefusals).toBe(97);
    expect(card.metrics.originalRefusalTotal).toBe(100);
    expect(card.metrics.confidence).toBe("medium");
  });

  it("prefers the decensored-from link over the YAML base_model", () => {
    expect(card.baseModelIds[0]).toBe("google/gemma-3-12b-it");
    expect(card.baseModelIds).toContain("google/gemma-3-12b-pt");
  });

  it("captures the Heretic tool version and direct-conversion evidence", () => {
    expect(card.hereticVersion).toBe("1.0.0");
    expect(card.isHereticConversion).toBe(true);
    expect(card.referencesHereticProject).toBe(true);
  });

  it("does not treat the pasted upstream benchmark tables as this model's", () => {
    expect(card.benchmarks).toEqual([]);
  });
});

describe("parseCard — v4 conversion", () => {
  const card = load("p-e-w__Qwen3-4B-Instruct-2507-heretic-v4");

  it("parses fractional KL and the original refusal column", () => {
    expect(card.metrics.kl).toBeCloseTo(0.3021);
    expect(card.metrics.refusals).toBe(9);
    expect(card.metrics.originalRefusals).toBe(100);
    expect(card.hereticVersion).toBe("1.2.0");
    expect(card.baseModelIds[0]).toBe("Qwen/Qwen3-4B-Instruct-2507");
  });
});

describe("parseCard — reversed column order", () => {
  const card = load("froggeric__Qwen3.6-35B-A3B-Uncensored-Heretic-MLX-4bit");

  it("honours the header when Original comes before This model", () => {
    expect(card.metrics.kl).toBeCloseTo(0.0015);
    expect(card.metrics.refusals).toBe(10);
    expect(card.metrics.originalRefusals).toBe(83);
    expect(card.metrics.originalKl).toBe(0);
  });

  it("captures published benchmarks with their baseline", () => {
    expect(card.benchmarks).toContainEqual({ metric: "MMLU", value: 83.3, baseValue: 83.72 });
  });

  it("resolves the MLX parent", () => {
    expect(card.baseModelIds[0]).toBe("llmfan46/Qwen3.6-35B-A3B-uncensored-heretic");
    expect(card.formatHints).toContain("mlx");
  });
});

describe("parseCard — bullet-list metrics with a trial log", () => {
  const card = load("DreamFast__gemma-3-12b-it-heretic-v2");

  it("takes the selected trial, not the best-looking one in the code fence", () => {
    expect(card.metrics.refusals).toBe(8);
    expect(card.metrics.kl).toBeCloseTo(0.0801);
    expect(card.metrics.originalRefusals).toBe(100);
    expect(card.metrics.confidence).toBe("medium");
  });

  it("finds the base model and version in prose", () => {
    expect(card.baseModelIds).toContain("google/gemma-3-12b-it");
    expect(card.hereticVersion).toBe("1.3.0");
  });
});

describe("parseCard — inline single-line pair", () => {
  const card = load("DavidAU__Llama-3.2-3B-Instruct-heretic-ablitered-uncensored");

  it("reads 'Refusals: 12/100, KL divergence: 0.09'", () => {
    expect(card.metrics.refusals).toBe(12);
    expect(card.metrics.kl).toBeCloseTo(0.09);
    expect(card.metrics.originalRefusals).toBe(96);
    expect(card.metrics.confidence).toBe("medium");
  });

  it("reads the version from 'Ablitered/uncensored by Heretic v1.0.1'", () => {
    expect(card.hereticVersion).toBe("1.0.1");
    expect(card.isHereticConversion).toBe(true);
  });
});

describe("parseCard — label/value tables", () => {
  it("parses the standard metric table with a baseline column", () => {
    const card = load("richardyoung__Olmo-3-7B-Think-heretic");
    expect(card.metrics.kl).toBeCloseTo(0.0263);
    expect(card.metrics.refusals).toBe(48);
    expect(card.metrics.originalRefusals).toBe(100);
    expect(card.baseModelIds[0]).toBe("allenai/Olmo-3-7B-Think");
  });

  it("parses a quant card that repeats its parent's numbers", () => {
    const card = load("richardyoung__granite-4.2-3b-heretic-GGUF");
    expect(card.metrics.kl).toBeCloseTo(0.085);
    expect(card.metrics.refusals).toBe(27);
    expect(card.metrics.originalRefusals).toBe(98);
    expect(card.quantizedBy).toBeNull();
    expect(card.baseModelIds[0]).toBe("richardyoung/granite-4.2-3b-heretic");
    expect(card.baseModelIds).toContain("ibm-granite/granite-4.2-3b");
  });

  it("parses a label/value table without a baseline", () => {
    const card = load("maternion__MiniCPM-V-4.7-1B-Heretic-Abliterated-GGUF");
    expect(card.metrics.refusals).toBe(21);
    expect(card.metrics.kl).toBeCloseTo(0.0122);
    expect(card.metrics.originalRefusals).toBeNull();
  });
});

describe("parseCard — transposed choice table", () => {
  const card = load("pottokao__Qwen-Image-2.1-PE-I2I-Heretic-GGUF");

  it("selects the row marked 'this repo'", () => {
    expect(card.metrics.refusals).toBe(5);
    expect(card.metrics.kl).toBeCloseTo(0.037);
    expect(card.metrics.confidence).toBe("medium");
  });
});

describe("parseCard — HTML spans and Decensored/Original headers", () => {
  it("strips spans and reads both columns", () => {
    const card = load("zaakirio__gemma-4-12b-it-uncensored-GGUF");
    expect(card.metrics.refusals).toBe(23);
    expect(card.metrics.refusalTotal).toBe(100);
    expect(card.metrics.kl).toBeCloseTo(0.043);
    expect(card.metrics.originalRefusals).toBe(99);
  });

  it("reads HTML-wrapped values in a label table", () => {
    const card = load("llmfan46__G4-MeroMero-26B-A4B-it-uncensored-heretic");
    expect(card.metrics.kl).toBeCloseTo(0.0152);
    expect(card.metrics.refusals).toBe(12);
    expect(card.metrics.originalRefusals).toBe(99);
    expect(card.hereticVersion).toBe("1.2.0");
  });
});

describe("parseCard — no metrics", () => {
  it("returns confidence none for a quant card without numbers", () => {
    const card = load("mradermacher__Qwen3.8-9B-heretic-uncensored-GGUF");
    expect(card.metrics.kl).toBeNull();
    expect(card.metrics.refusals).toBeNull();
    expect(card.metrics.confidence).toBe("none");
    expect(card.quantizedBy).toBe("mradermacher");
    expect(card.kindHint).toBe("quant");
    expect(card.baseModelIds[0]).toBe("rohit267/Qwen3.8-9B-heretic-uncensored");
  });

  it("ignores quantization KL noise and fenced trial logs", () => {
    const card = load("synthetic__noise");
    expect(card.metrics.kl).toBeNull();
    expect(card.metrics.refusals).toBeNull();
  });
});

describe("cleanModelId", () => {
  it("normalises URLs and rejects non-repo values", () => {
    expect(cleanModelId("https://huggingface.co/Qwen/Qwen3-4B")).toBe("Qwen/Qwen3-4B");
    expect(cleanModelId("Qwen/Qwen3-4B/")).toBe("Qwen/Qwen3-4B");
    expect(cleanModelId("not a model")).toBeNull();
    expect(cleanModelId("Qwen")).toBeNull();
  });
});
