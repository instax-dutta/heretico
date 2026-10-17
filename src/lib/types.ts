/**
 * Domain types for the Heretic directory.
 *
 * Three levels, deliberately separated:
 *   Repo   – one Hugging Face repository (an artifact: bf16, GGUF, FP8, …)
 *   Recipe – one ablation attempt, possibly published as several repos
 *   Origin – the canonical upstream model a newcomer actually searches for
 *
 * A leaderboard ranks recipes, never repos, so quant spam cannot win.
 */

export type RepoKind =
  | "heretic"
  | "quant"
  | "finetune"
  | "merge"
  | "lora"
  | "unknown";

/** How much we trust a KL/refusal pair. Only high + medium are ranked. */
export type MetricConfidence = "high" | "medium" | "inherited" | "none";

export type SizeClass =
  | "sub-1b"
  | "1-4b"
  | "4-9b"
  | "9-15b"
  | "15-32b"
  | "32-70b"
  | "70b-plus"
  | "unknown";

export interface Benchmark {
  /** Canonical metric label, e.g. "MMLU-Pro". */
  metric: string;
  /** Value for the Heretic model. */
  value: number;
  /** Value for the original/base model, when published side by side. */
  baseValue?: number;
}

export interface Metrics {
  kl: number | null;
  refusals: number | null;
  refusalTotal: number | null;
  originalKl: number | null;
  originalRefusals: number | null;
  originalRefusalTotal: number | null;
  confidence: MetricConfidence;
  /** Exact snippet the numbers came from, for auditability. */
  evidence: string | null;
  /** For inherited metrics: the repo whose card published them. */
  sourceRepoId: string | null;
}

export interface ParsedCard {
  /** Base model ids declared in the card, most specific first. */
  baseModelIds: string[];
  baseModelEvidence: "title" | "mention" | "frontmatter" | "tag" | "name" | null;
  hereticVersion: string | null;
  isHereticConversion: boolean;
  /** Tri-state: true if the card points at the Heretic project. */
  referencesHereticProject: boolean;
  metrics: Metrics;
  benchmarks: Benchmark[];
  license: string | null;
  languages: string[];
  quantizedBy: string | null;
  /** Format hints found in the card body (gguf, mlx, fp8, …). */
  formatHints: string[];
  /** Explicit kind hints, e.g. "merge of" or "LoRA adapter". */
  kindHint: RepoKind | null;
}

/** Repository metadata as returned by the Hub, reduced to what we use. */
export interface RawRepo {
  id: string;
  author: string;
  sha: string;
  createdAt: string;
  lastModified: string;
  downloads30d: number;
  downloadsAllTime: number;
  likes: number;
  tags: string[];
  gated: boolean;
  pipelineTag: string | null;
  libraryName: string | null;
  /** `baseModels` expansion, primary first. */
  declaredBaseModels: string[];
  /** `cardData.base_model`, may be a string or a list. */
  cardBaseModel: string | null;
  /** `cardData.quantized_by` */
  cardQuantizedBy: string | null;
  safetensorsTotal: number | null;
  files: string[];
  license: string | null;
}

export interface RepoRecord {
  id: string;
  author: string;
  createdAt: string;
  lastModified: string;
  downloads30d: number;
  downloadsAllTime: number;
  likes: number;
  gated: boolean;
  pipelineTag: string | null;
  libraryName: string | null;
  license: string | null;
  declaredBaseModels: string[];
  kind: RepoKind;
  /** Canonical upstream model this artifact ultimately descends from. */
  originId: string | null;
  /** Ablation attempt this artifact belongs to. */
  recipeId: string | null;
  paramsB: number | null;
  paramsActiveB: number | null;
  moe: boolean;
  sizeClass: SizeClass;
  family: string;
  familySlug: string;
  formats: string[];
  /** Preferred GGUF/EXL2 quantization label, e.g. "Q4_K_M". */
  quant: string | null;
  metrics: Metrics;
  benchmarks: Benchmark[];
  hereticVersion: string | null;
  /** IDs of repos directly above this one in the base chain. */
  parentIds: string[];
  /** True when the repo is a Heretic conversion or artifact of one. */
  verified: boolean;
  /** Human-readable reason for the classification. */
  classificationEvidence: string;
  firstSeenAt: string;
}

export interface Recipe {
  id: string;
  originId: string;
  author: string;
  /** Best (most representative) repo for this recipe. */
  repoIds: string[];
  bestRepoId: string;
  kind: RepoKind;
  kl: number;
  refusals: number;
  refusalTotal: number;
  refusalRate: number;
  /** 0..100 conversion-quality score (see lib/scoring.ts). */
  score: number;
  pareto: boolean;
  bestPick: boolean;
  /** Card claims both zero KL and zero refusals, which cannot both be measured. */
  implausible: boolean;
  confidence: MetricConfidence;
  hereticVersion: string | null;
  formats: string[];
  paramsB: number | null;
  downloadsAllTime: number;
  downloads30d: number;
  likes: number;
  lastModified: string;
  benchmarks: Benchmark[];
  /** Source repo that published the numbers (self for direct conversions). */
  evidenceRepoId: string;
}

export interface Origin {
  id: string;
  owner: string;
  name: string;
  displayName: string;
  family: string;
  familySlug: string;
  paramsB: number | null;
  paramsActiveB: number | null;
  sizeClass: SizeClass;
  moe: boolean;
  recipeCount: number;
  rankedCount: number;
  bestRecipeId: string | null;
  bestScore: number | null;
  bestKl: number | null;
  bestRefusalRate: number | null;
  verifiedRepoCount: number;
  downloadsAllTime: number;
  downloads30d: number;
  lastModified: string;
}

export interface Family {
  slug: string;
  label: string;
  originCount: number;
  rankedRecipeCount: number;
  bestRecipeId: string | null;
  downloadsAllTime: number;
}

export interface SnapshotTotals {
  repos: number;
  verifiedRepos: number;
  unverifiedRepos: number;
  origins: number;
  recipes: number;
  rankedRecipes: number;
  directConversions: number;
  downloadsAllTime: number;
  downloads30d: number;
}

export interface Snapshot {
  schemaVersion: 1;
  updatedAt: string;
  generator: string;
  source: string;
  totals: SnapshotTotals;
  origins: Origin[];
  recipes: Recipe[];
  repos: RepoRecord[];
  families: Family[];
}
