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

// A social card and favicon are user-facing surfaces that fail silently: a
// broken og:image 404s only in someone else's preview, never on the site. The
// App Router's opengraph-image convention made exactly that mistake, emitting a
// query-string URL with no file behind it.
const home = readFileSync(path.join(OUT, "index.html"), "utf8");
const ogImage = /<meta property="og:image" content="([^"]+)"/.exec(home)?.[1];
assert(ogImage, "homepage declares no og:image");
assert(!ogImage.includes("?"), `og:image carries a query string and will 404: ${ogImage}`);
const ogFile = path.join(OUT, decodeURIComponent(new URL(ogImage).pathname));
assert(existsSync(ogFile), `og:image resolves to no file: ${ogImage}`);

const iconHrefs = [...home.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)]
  .map((m) => m[1].split("?")[0]);
assert(iconHrefs.length > 0, "homepage declares no icon");
for (const href of iconHrefs) {
  assert(existsSync(path.join(OUT, href)), `icon resolves to no file: ${href}`);
}

// The default Next.js scaffold ships these to every visitor. None are used.
for (const dead of ["next.svg", "vercel.svg", "globe.svg", "window.svg", "file.svg"]) {
  assert(!existsSync(path.join(OUT, dead)), "Next.js template asset still shipping: " + dead);
}

// One origin everywhere. A stale or half-changed domain is invisible on the
// site: every page renders, but the canonical tags, the sitemap, robots.txt and
// the OG image all point somewhere that may not resolve. That is how the site
// shipped serving hdir.sdad.pro with 5,192 sitemap URLs on heretico.sdad.pro,
// which 404s.
const declared = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hdir.sdad.pro";
const origin = new URL(declared).origin;

const canonicals = [
  ...readFileSync(path.join(OUT, "index.html"), "utf8").matchAll(
    /<link rel="canonical" href="([^"]+)"/g,
  ),
].map((m) => m[1]);
assert(canonicals.length > 0, "homepage declares no canonical");
for (const href of canonicals) {
  assert(href.startsWith(origin), "canonical points off-origin: " + href);
}

for (const href of [ogImage]) {
  assert(href.startsWith(origin), "og:image points off-origin: " + href);
}

assert(
  robots.includes("Sitemap: " + origin + "/sitemap.xml"),
  "robots.txt declares a sitemap off-origin",
);
assert(
  robots.includes("Host: " + origin.replace(/^https?:\/\//, "")),
  "robots.txt declares a Host off-origin",
);

const sitemapOrigins = new Set(
  urls.map((url) => new URL(url).origin),
);
assert(
  sitemapOrigins.size === 1 && sitemapOrigins.has(origin),
  `sitemap mixes origins: ${[...sitemapOrigins].join(", ")} (expected ${origin})`,
);

console.log(
  `SEO surfaces: ${urls.length} sitemap URLs, ${titles.length} sampled pages with unique titles.`,
);
console.log("SEO SURFACES VERIFIED");
