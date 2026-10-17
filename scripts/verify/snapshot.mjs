import { readJson } from "./util.mjs";

const snapshot = readJson("data/snapshot.json");
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function quality(kl, refusals, total) {
  const rate = Math.min(1, refusals / total);
  const retention = 1 / (1 + kl);
  return Math.round(100 * (0.5 * (1 - rate) + 0.5 * retention) * 100) / 100;
}

check(snapshot.schemaVersion === 1, "schemaVersion must be 1");
check(!Number.isNaN(Date.parse(snapshot.updatedAt)), "updatedAt must be an ISO timestamp");
check(snapshot.source === "huggingface-hub", "unexpected source");

const originById = new Map();
for (const origin of snapshot.origins) {
  check(!originById.has(origin.id), `duplicate origin ${origin.id}`);
  originById.set(origin.id, origin);
}

const repoById = new Map();
for (const repo of snapshot.repos) {
  check(!repoById.has(repo.id), `duplicate repo ${repo.id}`);
  repoById.set(repo.id, repo);
}
// Built before the checks below, because inherited metrics cite a source that may
// be declared later in the list.
for (const repo of snapshot.repos) {
  check(repo.verified === true, `unverified repo ${repo.id} leaked into the snapshot`);
  check(originById.has(repo.originId), `repo ${repo.id} points at unknown origin ${repo.originId}`);
  check(repo.declaredBaseModels.length > 0 || repo.kind === "unknown", `repo ${repo.id} has no declared base`);
  if (repo.metrics.confidence === "inherited") {
    const source = repoById.get(repo.metrics.sourceRepoId);
    check(Boolean(source), `inherited metrics on ${repo.id} lack a source`);
    // Inherited means "these are the source's numbers". A repo that published its
    // own pair must keep its own confidence, or the /repo/ page cites a repo that
    // reports something else.
    check(
      source !== undefined &&
        source.metrics.kl === repo.metrics.kl &&
        source.metrics.refusals === repo.metrics.refusals &&
        source.metrics.refusalTotal === repo.metrics.refusalTotal,
      `inherited metrics on ${repo.id} do not match source ${repo.metrics.sourceRepoId}`,
    );
  }
  if (repo.metrics.kl !== null) {
    check(repo.metrics.kl >= 0, `negative KL on ${repo.id}`);
  }
  if (repo.metrics.refusals !== null) {
    check(repo.metrics.refusalTotal > 0, `missing refusal denominator on ${repo.id}`);
    check(repo.metrics.refusals <= repo.metrics.refusalTotal, `refusals exceed total on ${repo.id}`);
  }
}

// Every artifact that published its own numbers must reach the leaderboard,
// either as its own recipe or inside one it was grouped into.
const artifactOf = new Set();
for (const recipe of snapshot.recipes) for (const id of recipe.repoIds) artifactOf.add(id);
for (const repo of snapshot.repos) {
  if (repo.metrics.confidence === "high" || repo.metrics.confidence === "medium") {
    check(artifactOf.has(repo.id), `measured repo ${repo.id} is on no leaderboard row`);
  }
}

const recipeIds = new Set();
const recipesByOrigin = new Map();
for (const recipe of snapshot.recipes) {
  check(!recipeIds.has(recipe.id), `duplicate recipe ${recipe.id}`);
  recipeIds.add(recipe.id);
  check(originById.has(recipe.originId), `recipe ${recipe.id} points at unknown origin`);
  check(recipe.refusalTotal > 0, `recipe ${recipe.id} has no refusal denominator`);
  check(recipe.refusals >= 0 && recipe.refusals <= recipe.refusalTotal, `recipe ${recipe.id} refusal range`);
  check(recipe.kl >= 0, `recipe ${recipe.id} negative KL`);
  check(recipe.repoIds.length > 0, `recipe ${recipe.id} has no artifacts`);
  check(recipe.repoIds.every((id) => repoById.has(id)), `recipe ${recipe.id} references unknown artifacts`);
  check(repoById.has(recipe.bestRepoId), `recipe ${recipe.id} bestRepoId unknown`);
  check(recipe.repoIds.includes(recipe.bestRepoId), `recipe ${recipe.id} bestRepoId not in artifacts`);
  check(
    ["verified", "unverified", "publisher"].includes(recipe.verification),
    `recipe ${recipe.id} has no verification value`,
  );
  // Nothing uncorroborated may hold rank 1: a fabricated card claiming zero
  // refusals scores a perfect 100 and would otherwise top the board.
  check(
    !recipe.bestPick || recipe.verification !== "unverified",
    `recipe ${recipe.id} is the best pick but is unverified`,
  );
  check(
    !(recipe.verification === "verified" && recipe.implausible),
    `recipe ${recipe.id} is verified but reports an impossible KL`,
  );

  const expected = quality(recipe.kl, recipe.refusals, recipe.refusalTotal);
  check(
    Math.abs(expected - recipe.score) <= 0.02,
    `recipe ${recipe.id} score ${recipe.score} != recomputed ${expected}`,
  );
  check(
    Math.abs(recipe.refusalRate - recipe.refusals / recipe.refusalTotal) < 1e-9,
    `recipe ${recipe.id} refusalRate inconsistent`,
  );

  const list = recipesByOrigin.get(recipe.originId) ?? [];
  list.push(recipe);
  recipesByOrigin.set(recipe.originId, list);
}

for (const [originId, cohort] of recipesByOrigin) {
  const best = cohort.filter((recipe) => recipe.bestPick);
  check(best.length <= 1, `origin ${originId} has ${best.length} best picks`);

  for (const recipe of cohort) {
    const dominated = cohort.some((other) => {
      if (other.id === recipe.id) return false;
      const atLeastAsGood = other.kl <= recipe.kl && other.refusalRate <= recipe.refusalRate;
      const strictlyBetter = other.kl < recipe.kl || other.refusalRate < recipe.refusalRate;
      return atLeastAsGood && strictlyBetter;
    });
    check(recipe.pareto === !dominated, `recipe ${recipe.id} Pareto flag wrong`);
  }
}

for (const origin of snapshot.origins) {
  const cohort = recipesByOrigin.get(origin.id) ?? [];
  check(origin.recipeCount === cohort.length, `origin ${origin.id} recipeCount mismatch`);
  if (cohort.length === 0) {
    check(origin.bestRecipeId === null, `origin ${origin.id} has a best recipe but no recipes`);
  } else {
    const best = cohort.find((recipe) => recipe.bestPick);
    check(
      (best?.id ?? null) === origin.bestRecipeId,
      `origin ${origin.id} bestRecipeId mismatch (${origin.bestRecipeId} vs ${best?.id ?? "none"})`,
    );
  }
}

check(snapshot.totals.origins === snapshot.origins.length, "totals.origins mismatch");
check(snapshot.totals.recipes === snapshot.recipes.length, "totals.recipes mismatch");
check(snapshot.totals.verifiedRepos === snapshot.repos.length, "totals.verifiedRepos mismatch");
check(
  snapshot.totals.unverifiedRepos === snapshot.totals.repos - snapshot.totals.verifiedRepos,
  "totals.unverifiedRepos mismatch",
);
check(
  snapshot.totals.rankedRecipes === snapshot.recipes.filter((recipe) => recipe.score > 0).length,
  "totals.rankedRecipes mismatch",
);

// Minimum depth, measured from this snapshot rather than copied from a brief.
const directConversions = snapshot.repos.filter((repo) => repo.kind === "heretic").length;
const measuredRepos = snapshot.repos.filter((repo) => repo.metrics.confidence !== "none").length;
check(snapshot.totals.repos >= 5000, `only ${snapshot.totals.repos} repos discovered`);
check(snapshot.repos.length >= 400, `only ${snapshot.repos.length} verified repos`);
check(snapshot.origins.length >= 150, `only ${snapshot.origins.length} canonical models`);
check(snapshot.recipes.length >= 150, `only ${snapshot.recipes.length} measured recipes`);
check(snapshot.totals.rankedRecipes >= 150, `only ${snapshot.totals.rankedRecipes} ranked recipes`);
check(directConversions >= 250, `only ${directConversions} direct conversions`);
check(measuredRepos >= 400, `only ${measuredRepos} repos carry metrics`);
check(
  snapshot.totals.rankedRecipes / snapshot.totals.recipes >= 0.8,
  "too many measured recipes are unrankable",
);

if (errors.length > 0) {
  console.error("Snapshot problems:");
  for (const error of errors.slice(0, 40)) console.error(`  - ${error}`);
  if (errors.length > 40) console.error(`  … and ${errors.length - 40} more`);
  process.exit(1);
}

console.log(
  [
    "Snapshot statistics:",
    `  repos         ${snapshot.totals.repos} indexed, ${snapshot.repos.length} verified`,
    `  origins       ${snapshot.origins.length}`,
    `  recipes       ${snapshot.recipes.length} (${snapshot.totals.rankedRecipes} ranked)`,
    `  direct        ${directConversions}`,
    `  measured      ${measuredRepos} repos`,
    `  downloads     ${snapshot.totals.downloadsAllTime}`,
    `  updated       ${snapshot.updatedAt}`,
  ].join("\n"),
);
console.log("SNAPSHOT VERIFIED");
