/**
 * Generate `public/data/index.json` — the browser-side dataset.
 *
 * The full snapshot carries per-repo provenance and evidence strings for
 * prerendering; the browser only needs origins and recipes to filter and sort.
 * Writing this here (rather than at request time) keeps the site static.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Snapshot } from "../src/lib/types";

const ROOT = process.cwd();
const source = join(ROOT, "data", "snapshot.json");
const target = join(ROOT, "public", "data", "index.json");
const legacy = join(ROOT, "public", "data", "snapshot.json");

if (!existsSync(source)) {
  console.error(
    "data/snapshot.json is missing. Run `npm run crawl && npm run snapshot` to build it.",
  );
  process.exit(1);
}

const snapshot = JSON.parse(readFileSync(source, "utf8")) as Snapshot;
const index = {
  schemaVersion: snapshot.schemaVersion,
  updatedAt: snapshot.updatedAt,
  totals: snapshot.totals,
  origins: snapshot.origins,
  recipes: snapshot.recipes,
  families: snapshot.families,
};

mkdirSync(dirname(target), { recursive: true });
const json = JSON.stringify(index);
const tmp = `${target}.tmp`;
writeFileSync(tmp, json);
renameSync(tmp, target);
if (existsSync(legacy)) unlinkSync(legacy);

const size = (json.length / 1024 / 1024).toFixed(2);
console.log(`Synced browser index (${size} MB) -> ${target}`);
