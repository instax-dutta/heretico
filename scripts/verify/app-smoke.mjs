import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assert, readJson, run } from "./util.mjs";

run("npm", ["run", "build"]);

const OUT = path.resolve("out");
const snapshot = readJson("data/snapshot.json");
assert(existsSync(OUT), "next build did not produce out/");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    let file = path.join(OUT, pathname);
    if (pathname.endsWith("/")) file = path.join(file, "index.html");
    if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
    if (!existsSync(file)) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("not found");
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    response.end(body);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain" });
    response.end(String(error));
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

async function get(pathname) {
  const response = await fetch(`${base}${pathname}`);
  const body = await response.text();
  return { status: response.status, body };
}

try {
  const checks = [
    ["/", ["Find the best Heretic version", "Cleanest conversions"]],
    ["/leaderboard/", ["Leaderboard", "ranked conversions", "KL"]],
    ["/models/", ["Models", "Best score"]],
    ["/families/", ["Families", "ranked conversions"]],
    ["/methodology/", ["Methodology", "The score", "Pareto"]],
  ];

  for (const [url, needles] of checks) {
    const { status, body } = await get(url);
    assert(status === 200, `${url} returned ${status}`);
    for (const needle of needles) {
      assert(body.includes(needle), `${url} is missing "${needle}"`);
    }
  }

  const dataResponse = await fetch(`${base}/data/index.json`);
  assert(dataResponse.ok, "browser index is not served");
  const browserIndex = await dataResponse.json();
  assert(browserIndex.recipes.length === snapshot.recipes.length, "browser index is truncated");
  assert(browserIndex.origins.length === snapshot.origins.length, "browser index lacks origins");

  const rankedOrigin = snapshot.origins.find((origin) => origin.bestRecipeId);
  assert(rankedOrigin, "no ranked origin to smoke test");
  const originPage = await get(`/models/${rankedOrigin.id}/`);
  assert(originPage.status === 200, `model page returned ${originPage.status}`);
  assert(originPage.body.includes("Best version"), "model page is missing the best version block");
  assert(
    originPage.body.includes(rankedOrigin.displayName),
    "model page does not render the model name",
  );

  const repo = snapshot.repos[0];
  const repoPage = await get(`/repo/${repo.id}/`);
  assert(repoPage.status === 200, `repo page returned ${repoPage.status}`);
  assert(repoPage.body.includes("Published metrics"), "repo page is missing the metrics block");
  assert(repoPage.body.includes(repo.id.split("/").pop()), "repo page does not render the repo name");

  const family = snapshot.families[0];
  const familyPage = await get(`/families/${family.slug}/`);
  assert(familyPage.status === 200, `family page returned ${familyPage.status}`);
  assert(familyPage.body.includes(family.label), "family page does not render the family label");

  const missing = await get("/models/does/not/exist/");
  assert(missing.status === 404, "unknown model route must 404");

  console.log(`App smoke checked ${checks.length + 5} routes against ${snapshot.totals.origins} origins.`);
  console.log("APP SMOKE PASSED");
} finally {
  server.close();
}
