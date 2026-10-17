import { describe, expect, it, vi } from "vitest";
import { loadCard, PARSER_VERSION } from "../../scripts/lib/incremental";
import type { ParsedCard } from "@/lib/types";

function card(kl: number | null): ParsedCard {
  return {
    baseModelIds: ["Qwen/Qwen3-4B"],
    baseModelEvidence: "title",
    hereticVersion: "1.2.0",
    isHereticConversion: true,
    referencesHereticProject: true,
    metrics: {
      kl,
      refusals: 5,
      refusalTotal: 100,
      originalKl: null,
      originalRefusals: null,
      originalRefusalTotal: null,
      confidence: kl === null ? "none" : "high",
      evidence: null,
      sourceRepoId: null,
    },
    benchmarks: [],
    license: null,
    languages: [],
    quantizedBy: null,
    formatHints: [],
    kindHint: null,
  };
}

const parse = (markdown: string) => card(Number(markdown) || null);

describe("loadCard", () => {
  it("reuses the cached parse when sha and parser version match", async () => {
    const fetcher = vi.fn(async () => "0.1");
    const cached = { sha: "abc", parserVersion: PARSER_VERSION, markdown: "0.1", card: card(0.1) };
    const result = await loadCard({ id: "a/b", sha: "abc" }, cached, fetcher, parse);
    expect(result.fetched).toBe(false);
    expect(result.card).toBe(cached.card);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("re-parses cached markdown after a parser upgrade without a request", async () => {
    const fetcher = vi.fn(async () => "0.9");
    const cached = { sha: "abc", parserVersion: PARSER_VERSION - 1, markdown: "0.2", card: card(0.1) };
    const result = await loadCard({ id: "a/b", sha: "abc" }, cached, fetcher, parse);
    expect(result.fetched).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.card!.metrics.kl).toBeCloseTo(0.2);
    expect(result.entry.parserVersion).toBe(PARSER_VERSION);
  });

  it("refetches when the sha changes", async () => {
    const fetcher = vi.fn(async () => "0.2");
    const result = await loadCard(
      { id: "a/b", sha: "new" },
      { sha: "old", parserVersion: PARSER_VERSION, markdown: "0.1", card: card(0.1) },
      fetcher,
      parse,
    );
    expect(result.fetched).toBe(true);
    expect(fetcher).toHaveBeenCalledWith("a/b");
    expect(result.card!.metrics.kl).toBeCloseTo(0.2);
    expect(result.entry.sha).toBe("new");
    expect(result.entry.markdown).toBe("0.2");
  });

  it("caches a null card so missing READMEs are not retried", async () => {
    const fetcher = vi.fn(async () => null);
    const first = await loadCard({ id: "a/b", sha: "abc" }, null, fetcher, parse);
    expect(first.card).toBeNull();
    expect(first.entry.card).toBeNull();
    const second = await loadCard({ id: "a/b", sha: "abc" }, first.entry, fetcher, parse);
    expect(second.fetched).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
