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

// The site is published by GitHub Pages from the artifact this workflow builds.
// Each half of that is required: configure-pages for the base, the artifact for
// the content, deploy-pages for the publish. `path: out` is the Next export.
assert(
  /actions\/configure-pages@/.test(workflow),
  "workflow does not configure GitHub Pages",
);
assert(
  /actions\/upload-pages-artifact@/.test(workflow) && /path:\s*out/.test(workflow),
  "workflow does not upload the export as the Pages artifact",
);
assert(/actions\/deploy-pages@/.test(workflow), "workflow does not deploy to GitHub Pages");
assert(
  /pages:\s*write/.test(workflow) && /id-token:\s*write/.test(workflow),
  "workflow lacks the pages/id-token permissions the Pages deploy needs",
);
// A green refresh on a frozen site is the failure this check exists for.
assert(
  /Is the live site serving the committed snapshot/.test(workflow),
  "workflow does not check that the live site is fresh, only the committed snapshot",
);
assert(!/netlify/i.test(workflow), "workflow still mentions Netlify");

// GitHub Pages runs Jekyll unless told not to, and Jekyll silently drops every
// directory whose name starts with an underscore. Next emits `_next/`, so a
// missing .nojekyll serves a blank page with no error anywhere.
assert(existsSync("public/.nojekyll"), "missing public/.nojekyll: Pages would drop _next/ and serve a blank site");

// The custom domain has to survive each deployment, so it lives in the repo.
assert(existsSync("public/CNAME"), "missing public/CNAME: the custom domain would reset on every deploy");
const cname = readFileSync("public/CNAME", "utf8").trim();
const siteUrl = readFileSync("src/lib/site.ts", "utf8");
const host = /NEXT_PUBLIC_SITE_URL\s*\?\?\s*"https:\/\/([^"/]+)"/.exec(siteUrl)?.[1];
assert(Boolean(host), "could not read SITE_URL from src/lib/site.ts");
assert(cname === host, `public/CNAME is "${cname}" but SITE_URL is "${host}"`);

assert(!existsSync("netlify.toml"), "netlify.toml still present: the deploy has moved to GitHub Pages");

const nextConfig = readFileSync("next.config.ts", "utf8");
assert(/output:\s*"export"/.test(nextConfig), "next.config.ts is not a static export");
assert(
  /trailingSlash:\s*true/.test(nextConfig),
  "trailingSlash must stay on: Pages serves /x/ as /x/index.html",
);

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
