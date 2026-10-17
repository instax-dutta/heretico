import { existsSync, readFileSync } from "node:fs";
import { assert, runQuiet } from "./util.mjs";

assert(existsSync(".github/workflows/refresh.yml"), "missing refresh workflow");
const workflow = readFileSync(".github/workflows/refresh.yml", "utf8");

assert(/schedule:/.test(workflow) && /cron:/.test(workflow), "workflow has no schedule");
assert(/npm run crawl/.test(workflow), "workflow does not run the crawl");
assert(/npm run snapshot/.test(workflow), "workflow does not rebuild the snapshot");
assert(/node scripts\/verify\/snapshot\.mjs/.test(workflow), "workflow does not validate the snapshot");
assert(
  /node scripts\/verify\/static\.mjs/.test(workflow),
  "workflow does not run the static checks (typegen + tsc + lint)",
);
assert(/git add data\/snapshot\.json/.test(workflow), "workflow does not commit the snapshot");
assert(/actions\/cache/.test(workflow), "workflow does not cache README parses");
assert(
  /steps\.crawl\.outcome/.test(workflow) && /continue-on-error/.test(workflow),
  "workflow does not contain a failed crawl to the last good snapshot",
);
assert(/app-smoke/.test(workflow), "workflow does not serve the export before deploying");
assert(/::error/.test(workflow), "workflow has no failure reporting");

assert(existsSync("netlify.toml"), "missing netlify.toml");
const netlify = readFileSync("netlify.toml", "utf8");
assert(/publish\s*=\s*"out"/.test(netlify), "netlify publish directory is not out/");
assert(/command\s*=\s*"npm run build"/.test(netlify), "netlify build command is not npm run build");

const test = runQuiet("npx", ["vitest", "run", "tests/ingest/incremental.test.ts"]);
process.stdout.write(test.stdout ?? "");
if (test.status !== 0) {
  console.error(test.stderr ?? "");
  process.exit(1);
}
const summary = /Tests\s+(\d+) passed/.exec(test.stdout ?? "");
assert(Boolean(summary) && Number(summary[1]) >= 3, "incremental cache tests did not pass");
assert(!/\d+ failed/.test(test.stdout ?? ""), "incremental cache tests reported failures");

console.log("AUTOMATION VERIFIED");
