import { parse as parseYaml } from "yaml";
import type { Benchmark, Metrics, ParsedCard, RepoKind } from "../types";
import {
  parseNumber,
  parseRefusal,
  parseTables,
  proseLines,
  stripCell,
  type Table,
} from "./markdown";

const HERETIC_URL = /github\.com\/p-e-w\/heretic/i;
const HF_MODEL_URL =
  /\[([^\]]+)\]\(https?:\/\/(?:www\.)?huggingface\.co\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\)/g;

const CURRENT_LABEL = /(this model|abliterated|heretic|uncensored|current|value|decensored)/i;
const BASE_LABEL = /(original|base model|base refusals|stock|unmodified|parent)/i;
const CONVERSION_CONTEXT =
  /(decensor|abliterat|uncensor|de-censor|remov\w* .{0,20}refusal|made using|made with|generated (?:using|with)|created (?:using|with)|built (?:using|with)|produced (?:using|with)|quantiz|derived from|based on|build of|version of)/i;

export const KNOWN_METRICS = [
  "MMLU-Pro",
  "MMLU-Redux",
  "MMLU",
  "GSM8K",
  "GPQA Diamond",
  "GPQA",
  "HumanEval+",
  "HumanEval",
  "MBPP+",
  "MBPP",
  "MATH-500",
  "MATH",
  "AIME",
  "IFEval",
  "ARC",
  "HellaSwag",
  "TruthfulQA",
  "Winogrande",
  "LiveCodeBench",
  "MMMU",
  "BigBench",
];

function normalizeMetric(label: string): string | null {
  const text = stripCell(label).replace(/\s*\(.*?\)\s*$/, "").trim();
  const upper = text.toUpperCase();
  for (const metric of KNOWN_METRICS) {
    const m = metric.toUpperCase();
    if (upper === m || upper.startsWith(`${m} `) || upper.startsWith(`${m}-`) || upper === `${m} PRO`) {
      return metric;
    }
  }
  return null;
}

interface Candidate {
  kl: number | null;
  refusals: number | null;
  total: number | null;
  originalKl: number | null;
  originalRefusals: number | null;
  originalTotal: number | null;
  quality: number;
  /** Source position; earlier evidence wins ties so a pasted base-model card
   * further down the page cannot override the Heretic performance table. */
  order: number;
  evidence: string;
}

function emptyMetrics(): Metrics {
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

function splitFrontMatter(markdown: string): { data: Record<string, unknown>; body: string } {
  if (!markdown.startsWith("---")) return { data: {}, body: markdown };
  const end = markdown.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: markdown };
  const raw = markdown.slice(3, end);
  try {
    const data = parseYaml(raw);
    return {
      data: data && typeof data === "object" ? (data as Record<string, unknown>) : {},
      body: markdown.slice(end + 4),
    };
  } catch {
    return { data: {}, body: markdown };
  }
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

function frontMatterBaseModels(data: Record<string, unknown>): string[] {
  const raw = data.base_model;
  const values: string[] = [];
  if (typeof raw === "string") values.push(raw);
  else if (Array.isArray(raw)) values.push(...raw.filter((v): v is string => typeof v === "string"));
  if (typeof data.base_model_id === "string") values.push(data.base_model_id);
  return values.map(cleanModelId).filter((v): v is string => v !== null);
}

export function cleanModelId(raw: string): string | null {
  let value = raw.trim();
  value = value.replace(/^["']|["']$/g, "");
  value = value.replace(/^https?:\/\/(?:www\.)?huggingface\.co\//i, "");
  value = value.replace(/[?#].*$/, "");
  value = value.replace(/\/+$/, "");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) return null;
  return value;
}

function collectBaseModels(markdown: string, selfId?: string): {
  ids: string[];
  evidence: ParsedCard["baseModelEvidence"];
} {
  const lines = proseLines(markdown).slice(0, 80);
  const seen = new Set<string>();
  const ids: string[] = [];

  for (const { text } of lines) {
    if (!CONVERSION_CONTEXT.test(text)) continue;
    for (const match of text.matchAll(HF_MODEL_URL)) {
      const id = cleanModelId(match[2]);
      if (!id || id === selfId || seen.has(id)) continue;
      if (/\/datasets\/|\/spaces\/|\/docs\//.test(match[2])) continue;
      seen.add(id);
      ids.push(id);
    }
  }

  return { ids, evidence: ids.length > 0 ? "title" : null };
}

function bestCandidate(candidates: Candidate[]): Candidate | null {
  if (candidates.length === 0) return null;
  return candidates.reduce((best, candidate) => {
    if (candidate.quality !== best.quality) return candidate.quality > best.quality ? candidate : best;
    if (candidate.order !== best.order) return candidate.order < best.order ? candidate : best;
    if (candidate.kl !== null && best.kl !== null && candidate.kl !== best.kl) {
      return candidate.kl < best.kl ? candidate : best;
    }
    return best;
  });
}

function pickValueColumn(table: Table): { value: number; base: number | null } {
  const headers = table.headers.map((h) => stripCell(h));
  let value = -1;
  let base: number | null = null;
  headers.forEach((header, index) => {
    if (value === -1 && CURRENT_LABEL.test(header)) value = index;
  });
  headers.forEach((header, index) => {
    if (base === null && BASE_LABEL.test(header)) base = index;
  });
  if (value === -1) {
    // "Metric | Original | This model" already caught by CURRENT_LABEL.
    // Otherwise use the first data column after the label column.
    value = headers.length > 1 ? 1 : 0;
  }
  if (base === value) base = null;
  return { value, base };
}

function tableCandidates(table: Table): Candidate[] {
  const candidates: Candidate[] = [];
  const headers = table.headers.map((h) => stripCell(h));
  const { value: valueCol, base: baseCol } = pickValueColumn(table);

  const labelRows = table.rows.filter((row) => /kl|refusal/i.test(stripCell(row[0] ?? "")));

  if (labelRows.length > 0) {
    let kl: number | null = null;
    let refusals: number | null = null;
    let total: number | null = null;
    let originalKl: number | null = null;
    let originalRefusals: number | null = null;
    let originalTotal: number | null = null;
    const snippets: string[] = [];

    for (const row of table.rows) {
      const label = stripCell(row[0] ?? "");
      if (/refusal\s*(reduction|rate change)/i.test(label)) continue;

      const cell = row[valueCol] ?? row[1] ?? row[0];
      const baseCell = baseCol !== null ? row[baseCol] : undefined;

      if (/kl/i.test(label)) {
        const isBase = BASE_LABEL.test(label) && !/abliterat|heretic|current/i.test(label);
        if (isBase) {
          originalKl = parseNumber(cell);
        } else {
          kl = parseNumber(cell);
          if (kl === null) {
            kl = parseNumber(baseCell);
            originalKl = null;
          } else if (baseCell !== undefined) {
            originalKl = parseNumber(baseCell);
          }
          snippets.push(`| ${label} | ${stripCell(cell)} |`);
        }
      } else if (/refusal/i.test(label)) {
        const isBase = BASE_LABEL.test(label) && !/abliterat|heretic|current/i.test(label);
        const parsed = parseRefusal(cell);
        if (isBase) {
          if (parsed) {
            originalRefusals = parsed.count;
            originalTotal = parsed.total;
          }
        } else if (parsed) {
          refusals = parsed.count;
          total = parsed.total;
          const baseParsed = baseCell !== undefined ? parseRefusal(baseCell) : null;
          if (baseParsed) {
            originalRefusals = baseParsed.count;
            originalTotal = baseParsed.total;
          }
          snippets.push(`| ${label} | ${stripCell(cell)} |`);
        }
      }
    }

    if (kl !== null || refusals !== null) {
      candidates.push({
        kl,
        refusals,
        total,
        originalKl,
        originalRefusals,
        originalTotal,
        quality: kl !== null && refusals !== null ? 100 : 55,
        order: table.line,
        evidence: snippets.join(" ") || `table at line ${table.line}`,
      });
    }
    return candidates;
  }

  // Column-oriented table: header names the metrics, rows are values.
  const refusalIdx = headers.findIndex((h) => /refusal/i.test(h));
  const klIdx = headers.findIndex((h) => /\bkl\b/i.test(h));
  if (refusalIdx === -1 || klIdx === -1) return candidates;

  const rowIndex = chooseRow(table);
  if (rowIndex === -1) return candidates;
  const row = table.rows[rowIndex];
  const refusal = parseRefusal(row[refusalIdx]);
  const kl = parseNumber(row[klIdx]);
  if (kl === null && !refusal) return candidates;

  candidates.push({
    kl,
    refusals: refusal?.count ?? null,
    total: refusal?.total ?? null,
    originalKl: null,
    originalRefusals: null,
    originalTotal: null,
    quality: kl !== null && refusal ? 95 : 55,
    order: table.line,
    evidence: `| ${table.headers.join(" | ")} | → | ${row.join(" | ")} |`,
  });
  return candidates;
}

function chooseRow(table: Table): number {
  const thisRow = table.rows.findIndex((row) => /this repo|this model|selected/i.test(row.join(" ")));
  if (thisRow !== -1) return thisRow;
  const boldRows = table.rows
    .map((row, index) => ({ index, bold: row.filter((cell) => /\*\*/.test(cell)).length }))
    .filter((r) => r.bold > 0);
  if (boldRows.length === 1) return boldRows[0].index;
  return 0;
}

function inlineCandidates(markdown: string): Candidate[] {
  const lines = proseLines(markdown);
  const candidates: Candidate[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].text;
    if (!/kl[\s_-]*div|refusal/i.test(line)) continue;
    if (/trial\s*\d+/i.test(line) && !/selected/i.test(line)) continue;
    // Quantization loss is not abliteration damage; a GGUF card reporting both
    // must not have its IQ3_S figure read as the model's KL divergence.
    if (/(quantiz|imatrix|\bIQ\d|\bQ\d[_A-Z0-9]*\b|\bBF16\b|\bFP8\b|\bGGUF\b)/i.test(line)) continue;

    const klMatch = line.match(/(?:kl[\s_-]*divergence|kld)\s*[:\-=]?\s*[^\d\n]{0,12}?(-?\d+(?:\.\d+)?)/i);
    const refMatch = line.match(
      /(?:refusals?|refusal rate|refusal count)\s*(?:\([^)]*\))?\s*[:\-]?\s*[^\d\n]{0,20}?(\d+)\s*(?:\/|out\s+of)\s*(\d+)/i,
    );
    const isBaseLine = /^(?:original|base model|base refusals|stock)/i.test(stripCell(line)) || /original model/i.test(line);

    if (isBaseLine && (klMatch || refMatch)) {
      continue; // handled as a baseline when paired with the current row
    }

    if (klMatch && refMatch) {
      candidates.push({
        kl: Number(klMatch[1]),
        refusals: Number(refMatch[1]),
        total: Number(refMatch[2]),
        originalKl: null,
        originalRefusals: null,
        originalTotal: null,
        quality: /made using|abliteration method|ablation method/i.test(line) ? 85 : 90,
        order: lines[i].line,
        evidence: line.trim(),
      });
      continue;
    }

    const metric = klMatch
      ? { kl: Number(klMatch[1]), refusals: null as number | null, total: null as number | null }
      : refMatch
        ? { kl: null as number | null, refusals: Number(refMatch[1]), total: Number(refMatch[2]) }
        : null;
    if (!metric) continue;

    // Look a few lines ahead for the complementary metric (bullet lists).
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j += 1) {
      const other = lines[j].text;
      const otherKl = metric.kl === null
        ? other.match(/(?:kl[\s_-]*divergence|kld)\s*[:\-=]?\s*[^\d\n]{0,12}?(-?\d+(?:\.\d+)?)/i)
        : null;
      const otherRef = metric.refusals === null
        ? other.match(
            /(?:refusals?|refusal rate|refusal count)\s*(?:\([^)]*\))?\s*[:\-]?\s*[^\d\n]{0,20}?(\d+)\s*(?:\/|out\s+of)\s*(\d+)/i,
          )
        : null;
      if (otherKl || otherRef) {
        // Bold field labels on adjacent bullets are as deliberate as a table.
        const boldPair = /\*\*/.test(line) && /\*\*/.test(other);
        candidates.push({
          kl: metric.kl ?? Number(otherKl![1]),
          refusals: metric.refusals ?? Number(otherRef![1]),
          total: metric.total ?? Number(otherRef![2]),
          originalKl: null,
          originalRefusals: null,
          originalTotal: null,
          quality: boldPair ? 88 : 70,
          order: lines[i].line,
          evidence: `${line.trim()} … ${other.trim()}`,
        });
        break;
      }
    }

    if (metric.kl !== null || metric.refusals !== null) {
      candidates.push({
        kl: metric.kl,
        refusals: metric.refusals,
        total: metric.total,
        originalKl: null,
        originalRefusals: null,
        originalTotal: null,
        quality: metric.kl !== null && metric.refusals !== null ? 60 : 40,
        order: lines[i].line,
        evidence: line.trim(),
      });
    }
  }

  return candidates;
}

function baselineFrom(markdown: string, metrics: Metrics): void {
  const lines = proseLines(markdown);
  for (const { text } of lines) {
    if (metrics.originalRefusals === null) {
      const before = text.match(
        /(?:original(?:\s+model)?|base(?:\s+model)?|unmodified)\s*(?:refusal(?:\s+rate)?|refusals?)?\s*[:\-]?\s*(?:vs\.?\s*)?(\d+)\s*(?:\/|out\s+of)\s*(\d+)/i,
      );
      const after = text.match(/(\d+)\s*(?:\/|out\s+of)\s*(\d+)\s*(?:original|base(?:\s+model)?)/i);
      const match = before ?? after;
      if (match) {
        metrics.originalRefusals = Number(match[1]);
        metrics.originalRefusalTotal = Number(match[2]);
      }
    }
    if (metrics.originalKl === null) {
      const match = text.match(
        /(?:original(?:\s+model)?|base(?:\s+model)?)\s*(?:kl[\s_-]*divergence)?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      );
      if (match) metrics.originalKl = Number(match[1]);
    }
  }
}

function parseBenchmarks(tables: Table[]): Benchmark[] {
  const out = new Map<string, Benchmark>();

  for (const table of tables) {
    const headers = table.headers.map((h) => stripCell(h));
    let valueCol = headers.findIndex((h) => CURRENT_LABEL.test(h));
    let baseCol = headers.findIndex((h) => BASE_LABEL.test(h));
    if (valueCol === -1) {
      const numericCols = headers.slice(1).filter((h) => h.length > 0);
      if (numericCols.length !== 1) continue; // ambiguous multi-model table
      valueCol = 1;
      baseCol = -1;
    }
    if (baseCol === valueCol) baseCol = -1;

    for (const row of table.rows) {
      const metric = normalizeMetric(row[0] ?? "");
      if (!metric) continue;
      const value = parseNumber(row[valueCol]);
      if (value === null) continue;
      const baseValue = baseCol > 0 ? parseNumber(row[baseCol]) : null;
      const existing = out.get(metric);
      if (!existing) {
        out.set(metric, baseValue !== null ? { metric, value, baseValue } : { metric, value });
      }
    }
  }

  return [...out.values()];
}

function detectKindHint(markdown: string, quantizedBy: string | null): RepoKind | null {
  if (quantizedBy) return "quant";
  const head = markdown.slice(0, 1200);
  if (/\bGGUF quantizations?\b|quantized (?:version|weights)/i.test(head)) return "quant";
  if (/\bLoRA adapter\b|adapter model/i.test(head)) return "lora";
  if (/\bmerge (?:of|model)|\bmerged model\b/i.test(head)) return "merge";
  if (/\bfine[- ]?tune\b/i.test(head) && !/\bmade using \[?heretic/i.test(head)) return "finetune";
  return null;
}

export interface ParseOptions {
  /** Repo id, used to avoid resolving a card's link to itself. */
  selfId?: string;
  /** Extra base model declared by the Hub metadata (cardData / tags). */
  declaredBaseModels?: string[];
}

export function parseCard(markdown: string, options: ParseOptions = {}): ParsedCard {
  const { data, body } = splitFrontMatter(markdown);
  const selfId = options.selfId;
  const collected = collectBaseModels(body, selfId);
  const metaBases = [
    ...frontMatterBaseModels(data),
    ...(options.declaredBaseModels ?? []).map(cleanModelId).filter((v): v is string => v !== null),
  ];

  const baseModelIds = [...new Set([...collected.ids, ...metaBases])];
  const baseModelEvidence: ParsedCard["baseModelEvidence"] =
    collected.evidence ?? (metaBases.length > 0 ? "frontmatter" : null);

  const referencesHereticProject = HERETIC_URL.test(body);

  // Direct conversion, or an artifact of one? The card alone cannot tell
  // (a GGUF quant may be the only publication of an ablation), so this only
  // records that the repo's own weights were abliterated with Heretic. The
  // classifier resolves quant-vs-direct from the base chain.
  const isHereticConversion =
    referencesHereticProject &&
    (/(decensored version of|abliterated (?:version|build) of|abliteration method|(?:made|generated|created|built|produced|abliter\w*|decensor\w*|uncensor\w*)[^.\n]{0,40}(?:using|with|by)\s+\[?heretic)/i.test(
      body,
    ) ||
      // "an [abliterated](https://github.com/p-e-w/heretic) MiniCPM-V"
      /\[(?:abliterated|decensored|uncensored|de-censored)\]\(https?:\/\/github\.com\/p-e-w\/heretic\)/i.test(body));

  const versionMatch = body.match(/heretic[^0-9\n]{0,40}?v?(\d+\.\d+(?:\.\d+)?)/i);
  const metrics = emptyMetrics();

  const candidates: Candidate[] = [];
  const tables = parseTables(body);
  for (const table of tables) candidates.push(...tableCandidates(table));
  candidates.push(...inlineCandidates(body));

  const best = bestCandidate(candidates);
  if (best) {
    metrics.kl = best.kl;
    metrics.refusals = best.refusals;
    metrics.refusalTotal = best.total ?? (best.refusals !== null ? 100 : null);
    metrics.originalKl = best.originalKl;
    metrics.originalRefusals = best.originalRefusals;
    metrics.originalRefusalTotal = best.originalTotal;
    metrics.evidence = best.evidence;
    metrics.confidence =
      best.kl !== null && best.refusals !== null
        ? best.quality >= 85
          ? "high"
          : "medium"
        : "none";
  }
  if (metrics.confidence !== "none") baselineFrom(body, metrics);

  const license = asString(data.license) ?? asString(data.license_name);
  const languages = Array.isArray(data.language)
    ? data.language.filter((v): v is string => typeof v === "string")
    : typeof data.language === "string"
      ? [data.language]
      : [];

  const formatHints = new Set<string>();
  for (const match of body.slice(0, 4000).matchAll(/\b(gguf|mlx|fp8|nvfp4|mxfp4|awq|gptq|exl2|exl3|lora)\b/gi)) {
    formatHints.add(match[1].toLowerCase().replace("exl2", "exl").replace("exl3", "exl"));
  }

  return {
    baseModelIds,
    baseModelEvidence,
    hereticVersion: versionMatch ? versionMatch[1] : null,
    isHereticConversion,
    referencesHereticProject,
    metrics,
    benchmarks: parseBenchmarks(tables),
    license,
    languages,
    quantizedBy: asString(data.quantized_by),
    formatHints: [...formatHints].sort(),
    kindHint: detectKindHint(body, asString(data.quantized_by)),
  };
}
