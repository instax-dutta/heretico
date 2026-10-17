import type { SizeClass } from "./types";

export interface ParamEstimate {
  totalB: number | null;
  activeB: number | null;
  moe: boolean;
  /** True when the name uses the Gemma "E2B" effective-parameter notation. */
  effective: boolean;
}

/**
 * Extract parameter counts from a model name.
 *
 * Handles dense (`27B`), MoE (`30B-A3B`), expert-multiplied (`8x7B`) and
 * Gemma effective notation (`E2B`). Returns the largest dense match, because
 * names such as `Swift-1.5-Qwen3.8-27B` contain unrelated decimals but only
 * one real size.
 */
export function parseParams(name: string): ParamEstimate {
  const text = name.replace(/[_]/g, "-");

  // 8x7B / 8x22B
  const multi = text.match(/(\d+)\s*[xX]\s*(\d+(?:\.\d+)?)\s*[bB]\b/);
  if (multi) {
    const experts = Number(multi[1]);
    const each = Number(multi[2]);
    return {
      totalB: round(expertTotal(experts, each)),
      activeB: each,
      moe: true,
      effective: false,
    };
  }

  // 30B-A3B (total-active)
  const moe = text.match(/(\d+(?:\.\d+)?)\s*[bB]\s*[-_ ]\s*A\s*(\d+(?:\.\d+)?)\s*[bB]\b/i);
  if (moe) {
    return {
      totalB: Number(moe[1]),
      activeB: Number(moe[2]),
      moe: true,
      effective: false,
    };
  }

  // Gemma E2B / E4B
  const effective = text.match(/(?:^|[^a-zA-Z0-9])E(\d+(?:\.\d+)?)\s*[bB]\b/);
  if (effective) {
    return {
      totalB: Number(effective[1]),
      activeB: Number(effective[1]),
      moe: false,
      effective: true,
    };
  }

  // Dense sizes. Ignore a number that is immediately preceded by a version
  // separator followed by a dot (e.g. "Qwen3.8-27B" only matches 27B anyway).
  const dense = [...text.matchAll(/(?:^|[^a-zA-Z0-9.])(\d+(?:\.\d+)?)\s*[bB](?![a-zA-Z0-9])/g)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 5000);

  if (dense.length === 0) {
    return { totalB: null, activeB: null, moe: false, effective: false };
  }
  const total = Math.max(...dense);
  return { totalB: total, activeB: null, moe: false, effective: false };
}

function expertTotal(experts: number, each: number): number {
  return experts * each;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export function sizeClassFor(paramsB: number | null): SizeClass {
  if (paramsB === null || !Number.isFinite(paramsB) || paramsB <= 0) return "unknown";
  if (paramsB < 1) return "sub-1b";
  if (paramsB < 4) return "1-4b";
  if (paramsB < 9) return "4-9b";
  if (paramsB < 15) return "9-15b";
  if (paramsB < 32) return "15-32b";
  if (paramsB < 70) return "32-70b";
  return "70b-plus";
}

export const SIZE_CLASSES: { key: SizeClass; label: string }[] = [
  { key: "sub-1b", label: "<1B" },
  { key: "1-4b", label: "1–4B" },
  { key: "4-9b", label: "4–9B" },
  { key: "9-15b", label: "9–15B" },
  { key: "15-32b", label: "15–32B" },
  { key: "32-70b", label: "32–70B" },
  { key: "70b-plus", label: "70B+" },
  { key: "unknown", label: "Unknown" },
];

interface FamilyRule {
  pattern: RegExp;
  label: string;
  slug: string;
}

/**
 * Ordered: most specific generation first. The slug is stable and URL-safe.
 * Adding a family here automatically creates its index page.
 */
const FAMILY_RULES: FamilyRule[] = [
  { pattern: /gpt[-_ ]?oss/i, label: "GPT-OSS", slug: "gpt-oss" },
  { pattern: /qwen\s*3[._-]?8/i, label: "Qwen 3.8", slug: "qwen-3-8" },
  { pattern: /qwen\s*3[._-]?6/i, label: "Qwen 3.6", slug: "qwen-3-6" },
  { pattern: /qwen\s*3[._-]?5/i, label: "Qwen 3.5", slug: "qwen-3-5" },
  { pattern: /qwen\s*3/i, label: "Qwen 3", slug: "qwen-3" },
  { pattern: /qwen\s*2[._-]?5/i, label: "Qwen 2.5", slug: "qwen-2-5" },
  { pattern: /qwen\s*2/i, label: "Qwen 2", slug: "qwen-2" },
  { pattern: /qwen/i, label: "Qwen", slug: "qwen" },
  { pattern: /gemma\s*[-_]?4/i, label: "Gemma 4", slug: "gemma-4" },
  { pattern: /gemma\s*[-_]?3/i, label: "Gemma 3", slug: "gemma-3" },
  { pattern: /gemma\s*[-_]?2/i, label: "Gemma 2", slug: "gemma-2" },
  { pattern: /gemma/i, label: "Gemma", slug: "gemma" },
  { pattern: /llama\s*[-_]?4/i, label: "Llama 4", slug: "llama-4" },
  { pattern: /llama\s*[-_]?3[._-]?2/i, label: "Llama 3.2", slug: "llama-3-2" },
  { pattern: /llama\s*[-_]?3[._-]?1/i, label: "Llama 3.1", slug: "llama-3-1" },
  { pattern: /llama\s*[-_]?3/i, label: "Llama 3", slug: "llama-3" },
  { pattern: /llama/i, label: "Llama", slug: "llama" },
  { pattern: /mixtral/i, label: "Mixtral", slug: "mixtral" },
  { pattern: /magistral/i, label: "Magistral", slug: "magistral" },
  { pattern: /devstral/i, label: "Devstral", slug: "devstral" },
  { pattern: /mistral\s*[-_]?nemo/i, label: "Mistral Nemo", slug: "mistral-nemo" },
  { pattern: /mistral/i, label: "Mistral", slug: "mistral" },
  { pattern: /phi\s*[-_]?4/i, label: "Phi 4", slug: "phi-4" },
  { pattern: /phi\s*[-_]?3/i, label: "Phi 3", slug: "phi-3" },
  { pattern: /phi/i, label: "Phi", slug: "phi" },
  { pattern: /deepseek\s*[-_]?r1/i, label: "DeepSeek R1", slug: "deepseek-r1" },
  { pattern: /deepseek\s*[-_]?v3/i, label: "DeepSeek V3", slug: "deepseek-v3" },
  { pattern: /deepseek/i, label: "DeepSeek", slug: "deepseek" },
  { pattern: /glm\s*[-_]?4[._-]?7/i, label: "GLM 4.7", slug: "glm-4-7" },
  { pattern: /glm\s*[-_]?4[._-]?6/i, label: "GLM 4.6", slug: "glm-4-6" },
  { pattern: /glm\s*[-_]?4[._-]?5/i, label: "GLM 4.5", slug: "glm-4-5" },
  { pattern: /glm/i, label: "GLM", slug: "glm" },
  { pattern: /minimax/i, label: "MiniMax", slug: "minimax" },
  { pattern: /kimi/i, label: "Kimi", slug: "kimi" },
  { pattern: /olmo/i, label: "OLMo", slug: "olmo" },
  { pattern: /granite/i, label: "Granite", slug: "granite" },
  { pattern: /lfm/i, label: "LFM", slug: "lfm" },
  { pattern: /nemotron/i, label: "Nemotron", slug: "nemotron" },
  { pattern: /exaone/i, label: "EXAONE", slug: "exaone" },
  { pattern: /internlm/i, label: "InternLM", slug: "internlm" },
  { pattern: /seed[-_ ]?oss/i, label: "Seed-OSS", slug: "seed-oss" },
  { pattern: /hunyuan/i, label: "Hunyuan", slug: "hunyuan" },
  { pattern: /ernie/i, label: "ERNIE", slug: "ernie" },
  { pattern: /smollm/i, label: "SmolLM", slug: "smollm" },
  { pattern: /bonsai/i, label: "Bonsai", slug: "bonsai" },
  { pattern: /mimo/i, label: "MiMo", slug: "mimo" },
  { pattern: /glimmer/i, label: "Glimmer", slug: "glimmer" },
  { pattern: /cydonia/i, label: "Cydonia", slug: "cydonia" },
  { pattern: /hemmingway/i, label: "Hemmingway", slug: "hemmingway" },
  { pattern: /jamba/i, label: "Jamba", slug: "jamba" },
  { pattern: /zamba/i, label: "Zamba", slug: "zamba" },
  { pattern: /falcon/i, label: "Falcon", slug: "falcon" },
  { pattern: /command[-_ ]?r/i, label: "Command R", slug: "command-r" },
  { pattern: /^.*\baya\b/i, label: "Aya", slug: "aya" },
  { pattern: /yi[-_]/i, label: "Yi", slug: "yi" },
];

/** Best-effort family for a repo or origin name. */
export function familyFor(nameOrId: string): { label: string; slug: string } {
  const name = nameOrId.includes("/") ? nameOrId.split("/").pop()! : nameOrId;
  for (const rule of FAMILY_RULES) {
    if (rule.pattern.test(name)) return { label: rule.label, slug: rule.slug };
  }
  // Fallback: first meaningful token, e.g. "Cydonia-24B-v4.3" -> Cydonia.
  const token = name.split(/[-_.\s]/).find((t) => /^[A-Za-z][A-Za-z0-9]*$/.test(t) && t.length > 1);
  if (!token) return { label: "Other", slug: "other" };
  return { label: token, slug: slugify(token) };
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const QUANT_PATTERN =
  /\b(IQ\d_[A-Z]{1,3}|Q\d_K_[A-Z]{1,2}|Q\d_[01]|Q\d_K|BF16|F16|F32|FP8|FP4|NVFP4|INT4|INT8|MXFP4)\b/i;

/** Quantization label from a filename or repo name, e.g. "Q4_K_M". */
export function quantLabel(value: string): string | null {
  const match = value.match(QUANT_PATTERN);
  return match ? match[1].toUpperCase() : null;
}

export interface FormatInput {
  name: string;
  tags: string[];
  files: string[];
}

/**
 * Formats are derived from actual file extensions first, then names/tags.
 * Order is deterministic so snapshot diffs stay small.
 */
export function detectFormats({ name, tags, files }: FormatInput): string[] {
  const formats = new Set<string>();
  const lowerTags = tags.map((t) => t.toLowerCase());
  const base = name.split("/").pop() ?? name;
  const haystack = `${base} ${lowerTags.join(" ")}`.toLowerCase();
  const lowerFiles = files.map((f) => f.toLowerCase());

  if (lowerFiles.some((f) => f.endsWith(".gguf")) || lowerTags.includes("gguf")) formats.add("gguf");
  if (lowerFiles.some((f) => f.endsWith(".safetensors")) || lowerTags.includes("safetensors")) {
    formats.add("safetensors");
  }
  if (lowerFiles.includes("adapter_config.json") || /\blora\b/.test(haystack)) formats.add("lora");
  if (lowerTags.includes("mlx") || /\bmlx\b/.test(haystack)) formats.add("mlx");
  if (/\bfp8\b/.test(haystack)) formats.add("fp8");
  if (/\bnvfp4\b/.test(haystack)) formats.add("nvfp4");
  if (/\bmxfp4\b/.test(haystack)) formats.add("mxfp4");
  if (/\bawq\b/.test(haystack)) formats.add("awq");
  if (/\bgptq\b/.test(haystack)) formats.add("gptq");
  if (/\bexl[23]\b/.test(haystack)) formats.add("exl");
  if (/\bonnx\b/.test(haystack)) formats.add("onnx");

  if (formats.size === 0) formats.add("other");
  return [...formats].sort();
}

/** Params for display: "30B (3B active)" or "4B". */
export function formatParams(totalB: number | null, activeB: number | null, moe: boolean): string {
  if (totalB === null) return "—";
  const total = `${trimNumber(totalB)}B`;
  if (moe && activeB !== null) return `${total} (${trimNumber(activeB)}B active)`;
  return total;
}

export function trimNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}
