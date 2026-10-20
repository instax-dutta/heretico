/**
 * Rewrite the README's snapshot-count block from `data/snapshot.json`.
 *
 * The README used to state the index size in five places, all by hand. They
 * were wrong within a day of every refresh, and the project's own rule is that
 * nothing describing the data is written by hand and left to rot. The counts
 * now live in exactly one marked block, and this script is the only thing that
 * writes it.
 *
 *   npm run counts          # rewrite the block
 *   npm run counts -- --check   # exit 1 if it is stale (used by the gates)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Snapshot } from "../src/lib/types";

const ROOT = process.cwd();
const README = join(ROOT, "README.md");
const SNAPSHOT = join(ROOT, "data", "snapshot.json");

const START = "<!-- counts:begin -->";
const END = "<!-- counts:end -->";

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

export function countsSentence(snapshot: Snapshot): string {
  const { totals } = snapshot;
  const recipes = snapshot.recipes;
  const verifiedRecipes = recipes.filter((r) => r.verification === "verified").length;
  const unverifiedRecipes = recipes.length - verifiedRecipes;
  // A base model with no verified conversion cannot be ranked, so it shows no
  // best version at all.
  const noBestPick = snapshot.origins.filter((origin) => !origin.bestRecipeId).length;
  const downloads = (totals.downloadsAllTime / 1e6).toFixed(1);

  return (
    `At the time of the committed snapshot: **${formatCount(totals.repos)} repositories indexed, ` +
    `${formatCount(totals.verifiedRepos)} verified, ` +
    `${formatCount(totals.origins)} canonical upstream models, ` +
    `${formatCount(totals.recipes)} measured ablation recipes ` +
    `(${formatCount(verifiedRecipes)} verified, ${formatCount(unverifiedRecipes)} unverified), ` +
    `${formatCount(totals.directConversions)} direct Heretic conversions**, ` +
    `across ${downloads}M downloads. ` +
    `${formatCount(noBestPick)} of the ${formatCount(totals.origins)} base models have no verified ` +
    `conversion and therefore show no best version.`
  );
}

function main(): void {
  const check = process.argv.includes("--check");
  const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as Snapshot;
  const sentence = countsSentence(snapshot);

  const readme = readFileSync(README, "utf8");
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    console.error(`README.md is missing the ${START} / ${END} block.`);
    process.exit(1);
  }

  const current = readme.slice(start + START.length, end).trim();
  if (current === sentence) {
    console.log("README counts are current.");
    return;
  }
  if (check) {
    console.error("README.md counts are stale. Run `npm run counts`.");
    process.exit(1);
  }

  const next = `${readme.slice(0, start + START.length)}\n${sentence}\n${readme.slice(end)}`;
  writeFileSync(README, next);
  console.log("README counts updated.");
}

main();
