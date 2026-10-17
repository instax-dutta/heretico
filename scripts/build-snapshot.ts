/**
 * Turn `data/raw.json` into `data/snapshot.json` and the browser copy at
 * `public/data/snapshot.json`.
 *
 * Separate from the crawl so parser/scoring changes can be applied to existing
 * data without touching the network:
 *
 *   npm run crawl
 *   npm run snapshot
 */
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildSnapshot, type RawDataset } from "@/lib/snapshot";
import type { Snapshot } from "@/lib/types";

const ROOT = process.cwd();
const RAW_PATH = join(ROOT, "data", "raw.json");
const SNAPSHOT_PATH = join(ROOT, "data", "snapshot.json");

function writeAtomic(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

function main(): void {
  if (!existsSync(RAW_PATH)) {
    console.error("data/raw.json is missing. Run `npm run crawl` first.");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(RAW_PATH, "utf8")) as RawDataset;
  const snapshot = buildSnapshot(raw, { updatedAt: new Date().toISOString() });

  if (snapshot.origins.length === 0 || snapshot.recipes.length === 0) {
    console.error("Snapshot is empty; refusing to publish it.");
    process.exit(1);
  }

  const json = JSON.stringify(snapshot);
  writeAtomic(SNAPSHOT_PATH, json);

  const mb = (JSON.stringify(snapshot).length / 1024 / 1024).toFixed(2);
  console.log(
    [
      `Snapshot written (${mb} MB):`,
      `  repos        ${snapshot.totals.repos} indexed / ${snapshot.totals.verifiedRepos} verified`,
      `  origins      ${snapshot.totals.origins}`,
      `  recipes      ${snapshot.totals.recipes} (${snapshot.totals.rankedRecipes} ranked)`,
      `  direct       ${snapshot.totals.directConversions}`,
      `  families     ${snapshot.families.length}`,
      `  downloads    ${snapshot.totals.downloadsAllTime.toLocaleString("en-US")}`,
    ].join("\n"),
  );
  void (snapshot as Snapshot);
  void statSync(SNAPSHOT_PATH).size;
}

main();
