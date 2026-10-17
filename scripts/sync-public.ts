/**
 * Copy the committed snapshot into `public/` so the browser can fetch it.
 *
 * Data lives in `data/snapshot.json` (one copy in git); the public copy is a
 * build artifact, refreshed here before `dev` and `build`.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const source = join(ROOT, "data", "snapshot.json");
const target = join(ROOT, "public", "data", "snapshot.json");

if (!existsSync(source)) {
  console.error(
    "data/snapshot.json is missing. Run `npm run crawl && npm run snapshot` to build it.",
  );
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`Synced snapshot -> ${target}`);
