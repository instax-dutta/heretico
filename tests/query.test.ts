import { describe, expect, it } from "vitest";
import {
  buildLeaderboardRows,
  DEFAULT_QUERY,
  defaultDir,
  parseQuery,
  queryToSearchParams,
  recipesForOrigin,
  runQuery,
  type LeaderboardQuery,
} from "@/lib/query";
import type { Origin, Recipe, RepoRecord, Snapshot } from "@/lib/types";

function origin(id: string, overrides: Partial<Origin> = {}): Origin {
  return {
    id,
    owner: id.split("/")[0],
    name: id.split("/")[1],
    displayName: id.split("/")[1],
    family: "Qwen 3",
    familySlug: "qwen-3",
    paramsB: 4,
    paramsActiveB: null,
    sizeClass: "4-9b",
    moe: false,
    recipeCount: 1,
    rankedCount: 1,
    bestRecipeId: null,
    bestScore: null,
    bestKl: null,
    bestRefusalRate: null,
    verifiedRepoCount: 1,
    downloadsAllTime: 100,
    downloads30d: 10,
    lastModified: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function recipe(id: string, overrides: Partial<Recipe> = {}): Recipe {
  return {
    id,
    originId: "Qwen/Qwen3-4B",
    author: "p-e-w",
    repoIds: [],
    bestRepoId: "p-e-w/x",
    kind: "heretic",
    kl: 0.1,
    refusals: 10,
    refusalTotal: 100,
    refusalRate: 0.1,
    score: 90,
    pareto: false,
    bestPick: false,
    implausible: false,
    confidence: "high",
    verification: "verified",
    hereticVersion: "1.2.0",
    formats: ["safetensors"],
    paramsB: 4,
    downloadsAllTime: 100,
    downloads30d: 10,
    likes: 1,
    lastModified: "2026-01-01T00:00:00.000Z",
    benchmarks: [],
    evidenceRepoId: "p-e-w/x",
    ...overrides,
  };
}

function repoRecord(id: string): RepoRecord {
  return {
    id,
    author: id.split("/")[0],
    createdAt: "2026-01-01T00:00:00.000Z",
    lastModified: "2026-01-01T00:00:00.000Z",
    downloads30d: 0,
    downloadsAllTime: 0,
    likes: 0,
    gated: false,
    pipelineTag: null,
    libraryName: null,
    license: null,
    declaredBaseModels: [],
    kind: "heretic",
    originId: "Qwen/Qwen3-4B",
    recipeId: null,
    paramsB: 4,
    paramsActiveB: null,
    moe: false,
    sizeClass: "4-9b",
    family: "Qwen 3",
    familySlug: "qwen-3",
    formats: [],
    quant: null,
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
    hereticVersion: null,
    parentIds: [],
    verified: true,
    classificationEvidence: "",
    firstSeenAt: "2026-01-01T00:00:00.000Z",
  };
}

const snapshot: Snapshot = {
  schemaVersion: 1,
  updatedAt: "2026-01-01T00:00:00.000Z",
  generator: "test",
  source: "test",
  totals: {
    repos: 5,
    verifiedRepos: 5,
    unverifiedRepos: 0,
    origins: 2,
    recipes: 5,
    rankedRecipes: 4,
    directConversions: 5,
    downloadsAllTime: 0,
    downloads30d: 0,
  },
  origins: [
    origin("Qwen/Qwen3-4B"),
    origin("google/gemma-3-12b-it", {
      family: "Gemma 3",
      familySlug: "gemma-3",
      paramsB: 12,
      sizeClass: "9-15b",
      name: "gemma-3-12b-it",
      displayName: "gemma-3-12b-it",
    }),
  ],
  recipes: [
    recipe("r1", { kl: 0.05, refusals: 5, score: 95, formats: ["gguf"], downloadsAllTime: 500 }),
    recipe("r2", { kl: 0.2, refusals: 0, score: 90 }),
    recipe("r3", { originId: "google/gemma-3-12b-it", kl: 0.1, refusals: 10, score: 92, author: "other" }),
    recipe("r4", { kl: 0.4, refusals: 40, score: 0, confidence: "none", downloadsAllTime: 1000 }),
  ],
  repos: [repoRecord("p-e-w/x")],
  families: [
    { slug: "qwen-3", label: "Qwen 3", originCount: 1, rankedRecipeCount: 2, bestRecipeId: "r1", downloadsAllTime: 0 },
    { slug: "gemma-3", label: "Gemma 3", originCount: 1, rankedRecipeCount: 1, bestRecipeId: "r3", downloadsAllTime: 0 },
  ],
};

function q(overrides: Partial<LeaderboardQuery>): LeaderboardQuery {
  const merged = { ...DEFAULT_QUERY, ...overrides };
  if (overrides.dir === undefined) merged.dir = defaultDir(merged.sort);
  return merged;
}

describe("parseQuery", () => {
  it("uses defaults for absent and invalid values", () => {
    expect(parseQuery({})).toEqual(DEFAULT_QUERY);
    expect(parseQuery({ sort: "nope", perPage: "7", page: "-3" })).toMatchObject({
      sort: "score",
      dir: "desc",
      perPage: 50,
      page: 1,
    });
  });

  it("flips the default direction for cost-like sorts", () => {
    expect(parseQuery({ sort: "kl" }).dir).toBe("asc");
    expect(parseQuery({ sort: "refusals" }).dir).toBe("asc");
    expect(parseQuery({ sort: "downloads" }).dir).toBe("desc");
  });

  it("round-trips a non-default query", () => {
    const query = q({ q: "qwen", family: "qwen-3", size: "4-9b", sort: "kl", page: 2, hasBenchmarks: true });
    const params = queryToSearchParams(query);
    expect(parseQuery(params)).toEqual(query);
  });
});

describe("buildLeaderboardRows", () => {
  const rows = buildLeaderboardRows(snapshot);

  it("assigns global and per-family ranks to ranked recipes only", () => {
    const byId = new Map(rows.map((row) => [row.recipe.id, row]));
    expect(byId.get("r1")!.rank).toBe(1);
    expect(byId.get("r3")!.rank).toBe(2);
    expect(byId.get("r2")!.rank).toBe(3);
    expect(byId.get("r4")!.rank).toBeNull();
    expect(byId.get("r3")!.familyRank).toBe(1);
    expect(byId.get("r1")!.familyRank).toBe(1);
  });
});

describe("runQuery", () => {
  const rows = buildLeaderboardRows(snapshot);

  it("filters by family, format, kind and benchmarks", () => {
    expect(runQuery(rows, q({ family: "gemma-3" })).rows.map((r) => r.recipe.id)).toEqual(["r3"]);
    expect(runQuery(rows, q({ format: "gguf" })).rows.map((r) => r.recipe.id)).toEqual(["r1"]);
    expect(runQuery(rows, q({ kind: "finetune" })).total).toBe(0);
    expect(runQuery(rows, q({ hasBenchmarks: true })).total).toBe(0);
  });

  it("searches origin names and authors", () => {
    expect(runQuery(rows, q({ q: "qwen" })).total).toBe(2);
    expect(runQuery(rows, q({ q: "other" })).rows[0].recipe.id).toBe("r3");
  });

  it("defaults to ranked rows and can include unranked ones", () => {
    expect(runQuery(rows, q({})).total).toBe(3);
    expect(runQuery(rows, q({ rankedOnly: false })).total).toBe(4);
    expect(runQuery(rows, q({})).rows.at(-1)!.recipe.id).toBe("r2");
  });

  it("sorts by KL ascending and by downloads descending", () => {
    expect(runQuery(rows, q({ sort: "kl" })).rows.map((r) => r.recipe.kl)).toEqual([0.05, 0.1, 0.2]);
    expect(runQuery(rows, q({ sort: "downloads" })).rows[0].recipe.id).toBe("r1");
  });

  it("never puts an unverified row at rank 1, whatever the sort", () => {
    const attacked = buildLeaderboardRows({
      origins: snapshot.origins,
      recipes: [
        // A fabricated perfect card: best possible score, nothing behind it.
        recipe("fake", { kl: 0, refusals: 0, refusalTotal: 100, score: 100, verification: "unverified" }),
        recipe("real", { kl: 0.2, refusals: 1, score: 95, verification: "verified" }),
      ],
    });
    const byId = new Map(attacked.map((r) => [r.recipe.id, r]));
    expect(byId.get("fake")!.rank).toBe(2);
    expect(byId.get("real")!.rank).toBe(1);

    // And in the client-side query, for every sort direction.
    for (const sort of ["score", "kl", "downloads"] as const) {
      for (const dir of ["asc", "desc"] as const) {
        const first = runQuery(attacked, q({ sort, dir })).rows[0].recipe.id;
        expect(first).toBe("real");
      }
    }
  });

  it("paginates and clamps out-of-range pages", () => {
    const result = runQuery(rows, q({ perPage: 25, page: 9 }));
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageCount).toBe(1);
    expect(result.rows).toHaveLength(3);
  });

  it("filters by minimum downloads", () => {
    expect(runQuery(rows, q({ minDownloads: 400 })).rows.map((r) => r.recipe.id)).toEqual(["r1"]);
  });
});

describe("recipesForOrigin", () => {
  it("returns the cohort's recipes best first", () => {
    expect(recipesForOrigin(snapshot, "Qwen/Qwen3-4B").map((r) => r.id)).toEqual(["r1", "r2", "r4"]);
  });
});
