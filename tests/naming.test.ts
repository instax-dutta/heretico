import { describe, expect, it } from "vitest";
import { formatParams } from "@/lib/format";
import {
  detectFormats,
  familyFor,
  parseParams,
  quantLabel,
  sizeClassFor,
} from "@/lib/naming";

describe("parseParams", () => {
  it.each([
    ["Qwen/Qwen3-4B-Instruct-2507", 4, null, false],
    ["Qwen/Qwen3.8-27B", 27, null, false],
    ["google/gemma-3-12b-it", 12, null, false],
    ["Qwen/Qwen3-30B-A3B", 30, 3, true],
    ["mistralai/Mixtral-8x7B-Instruct-v0.1", 56, 7, true],
    ["meta-llama/Llama-3.1-405B-Instruct", 405, null, false],
    ["openai/gpt-oss-20b", 20, null, false],
    ["google/gemma-4-E2B-it", 2, 2, false],
    ["jegreene/Swift-1.5-Qwen3.8-27B-heretic-GSQ-RCO-GGUF", 27, null, false],
    ["PocketDoc/Hemmingway-1", null, null, false],
    ["Qwen/Qwen2.5-7B-Instruct-1M", 7, null, false],
    ["zai-org/GLM-4.6", null, null, false],
  ])("%s -> %sB total / %sB active (moe=%s)", (name, total, active, moe) => {
    const result = parseParams(name);
    expect(result.totalB).toBe(total);
    expect(result.activeB).toBe(active);
    expect(result.moe).toBe(moe);
  });

  it("marks Gemma effective notation", () => {
    expect(parseParams("gemma-4-E4B-it").effective).toBe(true);
  });
});

describe("sizeClassFor", () => {
  it.each([
    [null, "unknown"],
    [0.5, "sub-1b"],
    [1, "1-4b"],
    [3.9, "1-4b"],
    [4, "4-9b"],
    [8.9, "4-9b"],
    [9, "9-15b"],
    [14.9, "9-15b"],
    [15, "15-32b"],
    [31, "15-32b"],
    [32, "32-70b"],
    [69, "32-70b"],
    [70, "70b-plus"],
    [405, "70b-plus"],
  ])("%s -> %s", (params, expected) => {
    expect(sizeClassFor(params as number | null)).toBe(expected);
  });
});

describe("familyFor", () => {
  it.each([
    ["Qwen/Qwen3.8-27B", "Qwen 3.8", "qwen-3-8"],
    ["Qwen/Qwen3-4B-Instruct-2507", "Qwen 3", "qwen-3"],
    ["google/gemma-4-12b-it", "Gemma 4", "gemma-4"],
    ["google/gemma-3-12b-it", "Gemma 3", "gemma-3"],
    ["meta-llama/Llama-3.2-3B-Instruct", "Llama 3.2", "llama-3-2"],
    ["mistralai/Mistral-Nemo-Instruct-2407", "Mistral Nemo", "mistral-nemo"],
    ["openai/gpt-oss-20b", "GPT-OSS", "gpt-oss"],
    ["PocketDoc/Hemmingway-1", "Hemmingway", "hemmingway"],
    ["Cydonia-24B-v4.3", "Cydonia", "cydonia"],
  ])("%s -> %s (%s)", (name, label, slug) => {
    expect(familyFor(name)).toEqual({ label, slug });
  });

  it("falls back to a stable token for unknown vendors", () => {
    expect(familyFor("acme/Widget-9B")).toEqual({ label: "Widget", slug: "widget" });
  });
});

describe("detectFormats", () => {
  it("derives formats from files, not just names", () => {
    expect(
      detectFormats({
        name: "mradermacher/Foo-GGUF",
        tags: ["gguf"],
        files: ["Foo-Q4_K_M.gguf", "Foo-Q8_0.gguf"],
      }),
    ).toEqual(["gguf"]);
  });

  it("detects mlx, fp8, lora and safetensors", () => {
    expect(
      detectFormats({ name: "x/Bar-mlx-8bit", tags: ["mlx"], files: ["model.safetensors"] }),
    ).toEqual(["mlx", "safetensors"]);
    expect(detectFormats({ name: "x/Baz-NVFP4", tags: [], files: ["model.safetensors"] })).toEqual([
      "nvfp4",
      "safetensors",
    ]);
    expect(
      detectFormats({ name: "x/Quux-LoRA", tags: [], files: ["adapter_config.json"] }),
    ).toEqual(["lora"]);
  });

  it("never returns an empty list", () => {
    expect(detectFormats({ name: "x/Plain", tags: [], files: ["config.json"] })).toEqual(["other"]);
  });
});

describe("quantLabel", () => {
  it("extracts common GGUF quant labels", () => {
    expect(quantLabel("Foo-IQ3_XS.gguf")).toBe("IQ3_XS");
    expect(quantLabel("Foo-Q4_K_M.gguf")).toBe("Q4_K_M");
    expect(quantLabel("Foo-Q8_0.gguf")).toBe("Q8_0");
    expect(quantLabel("Foo-BF16")).toBe("BF16");
    expect(quantLabel("no quant here")).toBeNull();
  });
});

describe("formatParams (lib/format)", () => {
  it("renders MoE and dense sizes", () => {
    expect(formatParams(30, 3, true)).toBe("30B · 3B active");
    expect(formatParams(4, null, false)).toBe("4B");
    expect(formatParams(null, null, false)).toBe("—");
  });
});
