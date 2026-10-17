import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { assert, readJson, run } from "./util.mjs";

if (!existsSync("out/sitemap.xml")) {
  run("npm", ["run", "build"]);
}

const OUT = path.resolve("out");
const snapshot = readJson("data/snapshot.json");
const sitemap = readFileSync("out/sitemap.xml", "utf8");
const robots = readFileSync("out/robots.txt", "utf8");

assert(robots.includes("Sitemap: http"), "robots.txt does not declare a sitemap");
assert(robots.includes("User-Agent: *"), "robots.txt does not allow crawlers");

const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert(urls.length > 0, "sitemap has no URLs");
assert(new Set(urls).size === urls.length, "sitemap contains duplicate URLs");

  // /repo/ is generated only for artifacts that published numbers, so the
  // sitemap lists measured artifacts rather than every verified repo.
  const expectedMinimum =
    snapshot.origins.length + snapshot.families.length + 5 + 0.5 * snapshot.repos.length;
assert(
  urls.length >= expectedMinimum,
  `sitemap has ${urls.length} URLs, expected at least ${expectedMinimum}`,
);

function fileFor(url) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  const base = path.join(OUT, pathname);
  return pathname.endsWith("/") || pathname === "/" ? path.join(base, "index.html") : base;
}

const missing = urls.filter((url) => !existsSync(fileFor(url)));
assert(missing.length === 0, `sitemap URLs without a file: ${missing.slice(0, 5).join(", ")}`);

function checkPage(relative, label) {
  const file = path.join(OUT, relative);
  assert(existsSync(file), `${label} page missing at ${relative}`);
  const html = readFileSync(file, "utf8");
  const title = html.match(/<title>([^<]*)<\/title>/);
  assert(title && title[1].trim().length > 0, `${label} page has no title`);
  assert(/<meta name="description" content="[^"]+"/.test(html), `${label} page has no description`);
  assert(/rel="canonical"/.test(html), `${label} page has no canonical link`);
  return title[1];
}

const rankedOrigin = snapshot.origins.find((origin) => origin.bestRecipeId);
const titles = [
  checkPage("index.html", "home"),
  checkPage("leaderboard/index.html", "leaderboard"),
  checkPage(`models/${rankedOrigin.id.toLowerCase()}/index.html`, "model"),
  checkPage(`families/${snapshot.families[0].slug}/index.html`, "family"),
  checkPage("methodology/index.html", "methodology"),
];
assert(new Set(titles).size === titles.length, "page titles are not unique");

console.log(
  `SEO surfaces: ${urls.length} sitemap URLs, ${titles.length} sampled pages with unique titles.`,
);
console.log("SEO SURFACES VERIFIED");
