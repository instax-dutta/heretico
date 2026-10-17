import type { MetricConfidence, Verification } from "./types";

/**
 * Conversion quality.
 *
 * Heretic optimises two things: fewer refusals and lower KL divergence from the
 * original model. We weight them equally and keep both terms bounded:
 *
 *   rate      = refusals / total              (0..1)
 *   retention = 1 / (1 + kl)                  (0..1, 1 = untouched model)
 *   quality   = 100 * (0.5 * (1 - rate) + 0.5 * retention)
 *
 * Hyperbolic retention penalises drift smoothly without letting a single huge
 * KL explode the scale, and unlike percentile normalisation the score is
 * absolute — comparable across model sizes, cohorts and refresh days.
 */
export const WEIGHTS = { refusals: 0.5, kl: 0.5 } as const;

const RANKABLE: ReadonlySet<MetricConfidence> = new Set(["high", "medium", "inherited"]);

export interface ScoreInput {
  id: string;
  kl: number | null;
  refusals: number | null;
  refusalTotal: number | null;
  confidence: MetricConfidence;
  downloadsAllTime?: number;
  lastModified?: string;
  /** Absent for callers that do not model it; treated as unverified. */
  verification?: Verification;
}

/**
 * A recipe is corroborated when something beyond its own model card backs it:
 * the evidence repo ships real weights and its KL is physically possible. An
 * uncorroborated recipe still ranks, but never holds rank 1, so a fabricated
 * card cannot top the board by writing two numbers.
 */
export function isVerified(input: ScoreInput): boolean {
  return input.verification === "verified" || input.verification === "publisher";
}

export interface Score {
  rate: number;
  retention: number;
  quality: number;
}

export function refusalRate(refusals: number | null, total: number | null): number | null {
  if (refusals === null || total === null || total <= 0) return null;
  if (refusals < 0) return null;
  return Math.min(1, refusals / total);
}

export function capabilityRetention(kl: number | null): number | null {
  if (kl === null || !Number.isFinite(kl) || kl < 0) return null;
  return 1 / (1 + kl);
}

export function isRankable(input: ScoreInput): boolean {
  return (
    RANKABLE.has(input.confidence) &&
    input.kl !== null &&
    input.refusals !== null &&
    input.refusalTotal !== null
  );
}

export function scoreOf(input: ScoreInput): Score | null {
  if (!isRankable(input)) return null;
  const rate = refusalRate(input.refusals, input.refusalTotal);
  const retention = capabilityRetention(input.kl);
  if (rate === null || retention === null) return null;
  const quality =
    100 * (WEIGHTS.refusals * (1 - rate) + WEIGHTS.kl * retention);
  return { rate, retention, quality: Math.round(quality * 100) / 100 };
}

/**
 * Pareto frontier within a cohort: a point is on the frontier when no other
 * point is at least as good on both axes and strictly better on one.
 */
export function paretoIds(inputs: ScoreInput[]): Set<string> {
  const points = inputs
    .map((input) => {
      const score = scoreOf(input);
      return score ? { input, score } : null;
    })
    .filter((p): p is { input: ScoreInput; score: Score } => p !== null);

  const frontier = new Set<string>();
  for (const candidate of points) {
    const dominated = points.some((other) => {
      if (other.input.id === candidate.input.id) return false;
      const atLeastAsGood =
        other.input.kl! <= candidate.input.kl! && other.score.rate <= candidate.score.rate;
      const strictlyBetter =
        other.input.kl! < candidate.input.kl! || other.score.rate < candidate.score.rate;
      return atLeastAsGood && strictlyBetter;
    });
    if (!dominated) frontier.add(candidate.input.id);
  }
  return frontier;
}

/** Deterministic leaderboard order: verified rows first, then by score. */
export function compareForLeaderboard(a: ScoreInput, b: ScoreInput): number {
  // Corroboration outranks score. Without this a fabricated card that claims
  // zero refusals and near-zero KL takes rank 1 over every measured model.
  const va = isVerified(a);
  const vb = isVerified(b);
  if (va !== vb) return va ? -1 : 1;
  const sa = scoreOf(a);
  const sb = scoreOf(b);
  if (sa && sb && sb.quality !== sa.quality) return sb.quality - sa.quality;
  const ka = a.kl ?? Number.POSITIVE_INFINITY;
  const kb = b.kl ?? Number.POSITIVE_INFINITY;
  if (ka !== kb) return ka - kb;
  const ra = refusalRate(a.refusals, a.refusalTotal) ?? Number.POSITIVE_INFINITY;
  const rb = refusalRate(b.refusals, b.refusalTotal) ?? Number.POSITIVE_INFINITY;
  if (ra !== rb) return ra - rb;
  const da = a.downloadsAllTime ?? 0;
  const db = b.downloadsAllTime ?? 0;
  if (da !== db) return db - da;
  const ma = a.lastModified ?? "";
  const mb = b.lastModified ?? "";
  if (ma !== mb) return mb.localeCompare(ma);
  return a.id.localeCompare(b.id);
}

/**
 * Best recipe in a cohort: verified first, then quality, downloads, recency, id.
 *
 * Returns null when nothing in the cohort is corroborated. An origin whose
 * conversions all rest on a single self-published card has no best version —
 * saying otherwise would hand the top slot to the least verifiable row.
 */
export function bestPickId<T extends ScoreInput>(items: T[]): string | null {
  const ranked = items.filter(isRankable).sort(compareForLeaderboard);
  if (!ranked.some(isVerified)) return null;
  return ranked.find(isVerified)?.id ?? null;
}
