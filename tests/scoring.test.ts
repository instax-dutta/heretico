import { describe, expect, it } from "vitest";
import {
  assignRanks,
  bestPickId,
  capabilityRetention,
  isRankable,
  orderByQuality,
  paretoIds,
  refusalRate,
  scoreOf,
  type ScoreInput,
} from "@/lib/scoring";

function point(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return {
    id: "p",
    kl: 0.1,
    refusals: 5,
    refusalTotal: 100,
    confidence: "high",
    downloadsAllTime: 0,
    lastModified: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("refusalRate", () => {
  it("normalises and rejects impossible values", () => {
    expect(refusalRate(3, 100)).toBeCloseTo(0.03);
    expect(refusalRate(0, 100)).toBe(0);
    expect(refusalRate(0, 0)).toBeNull();
    expect(refusalRate(5, null)).toBeNull();
  });
});

describe("capabilityRetention", () => {
  it("is 1 for an untouched model and decays hyperbolically", () => {
    expect(capabilityRetention(0)).toBe(1);
    expect(capabilityRetention(0.16)).toBeCloseTo(0.862069, 5);
    expect(capabilityRetention(1)).toBeCloseTo(0.5);
    expect(capabilityRetention(null)).toBeNull();
    expect(capabilityRetention(-1)).toBeNull();
  });
});

describe("scoreOf", () => {
  it("combines refusal suppression and retention equally", () => {
    expect(scoreOf(point({ kl: 0.16, refusals: 3 }))!.quality).toBeCloseTo(91.6, 1);
    expect(scoreOf(point({ kl: 0, refusals: 0 }))!.quality).toBe(100);
    expect(scoreOf(point({ kl: 1000, refusals: 100 }))!.quality).toBeCloseTo(0.05, 1);
  });

  it("refuses to score incomplete or untrusted evidence", () => {
    expect(scoreOf(point({ kl: null }))).toBeNull();
    expect(scoreOf(point({ refusals: null }))).toBeNull();
    expect(scoreOf(point({ confidence: "none" }))).toBeNull();
    expect(scoreOf(point({ refusalTotal: null }))).toBeNull();
  });

  it("accepts inherited evidence from a parent conversion", () => {
    expect(scoreOf(point({ confidence: "inherited" }))).not.toBeNull();
  });
});

describe("paretoIds", () => {
  it("keeps only non-dominated points", () => {
    const ids = paretoIds([
      point({ id: "balanced", kl: 0.05, refusals: 10 }),
      point({ id: "dominated", kl: 0.1, refusals: 10 }),
      point({ id: "costly-low-refusal", kl: 0.05, refusals: 20 }),
      point({ id: "zero-refusal", kl: 0.2, refusals: 0 }),
    ]);
    expect([...ids].sort()).toEqual(["balanced", "zero-refusal"]);
  });

  it("treats equal points as non-dominating", () => {
    const ids = paretoIds([
      point({ id: "a", kl: 0.1, refusals: 5 }),
      point({ id: "b", kl: 0.1, refusals: 5 }),
    ]);
    expect([...ids].sort()).toEqual(["a", "b"]);
  });

  it("ignores unranked points", () => {
    const ids = paretoIds([
      point({ id: "a", confidence: "none" }),
      point({ id: "b", kl: 0.2, refusals: 8 }),
    ]);
    expect([...ids]).toEqual(["b"]);
  });
});

describe("orderByQuality", () => {
  it("is deterministic and breaks ties by KL, refusals, downloads, recency, id", () => {
    const order = orderByQuality([
      point({ id: "b", kl: 0.1, refusals: 5, downloadsAllTime: 10 }),
      point({ id: "a", kl: 0.1, refusals: 5, downloadsAllTime: 10 }),
      point({ id: "c", kl: 0.05, refusals: 5 }),
    ]).map((p) => p.id);
    expect(order).toEqual(["c", "a", "b"]);
  });

  it("places unranked rows after ranked ones", () => {
    const order = orderByQuality([
      point({ id: "unranked", confidence: "none" }),
      point({ id: "ranked" }),
    ]).map((p) => p.id);
    expect(order).toEqual(["ranked", "unranked"]);
  });
});

describe("assignRanks", () => {
  it("ranks within groups and skips unranked rows", () => {
    const ranks = assignRanks(
      [
        point({ id: "q1", kl: 0.05 }),
        point({ id: "q2", kl: 0.3 }),
        point({ id: "q3", confidence: "none" }),
        point({ id: "g1", kl: 0.02 }),
      ],
      (p) => (p.id.startsWith("q") ? "qwen" : "gemma"),
    );
    expect(ranks.get("q1")).toBe(1);
    expect(ranks.get("q2")).toBe(2);
    expect(ranks.has("q3")).toBe(false);
    expect(ranks.get("g1")).toBe(1);
  });
});

describe("bestPickId", () => {
  it("picks the highest quality and breaks ties by downloads", () => {
    expect(
      bestPickId([
        point({ id: "a", kl: 0.1, refusals: 5, downloadsAllTime: 1 }),
        point({ id: "b", kl: 0.1, refusals: 5, downloadsAllTime: 9 }),
      ]),
    ).toBe("b");
    expect(bestPickId([point({ id: "x", confidence: "none" })])).toBeNull();
  });
});

describe("isRankable", () => {
  it("requires both metrics, a denominator and trusted evidence", () => {
    expect(isRankable(point({}))).toBe(true);
    expect(isRankable(point({ refusalTotal: null }))).toBe(false);
    expect(isRankable(point({ confidence: "none" }))).toBe(false);
  });
});
