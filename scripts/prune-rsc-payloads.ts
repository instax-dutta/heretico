/**
 * Delete the React Server Component payloads the App Router writes beside every
 * prerendered page.
 *
 * A static export of ~5,400 routes emits four `.txt` files per route:
 *
 *   index.txt                      the page's flight payload
 *   __next._full.txt               byte-identical to index.txt
 *   __next._tree.txt               the route tree
 *   __next.<route>.__PAGE__.txt    the page segment
 *
 * That is 21,442 files and 255 MB of a 412 MB site. They are fetched only by
 * the client router, for soft navigation and prefetch. This site navigates with
 * plain anchors, so the router never asks for them and they are dead weight.
 *
 * Deleting them drops the export to about 157 MB and ~5,400 files. That matters
 * because GitHub Pages refuses to publish a site larger than 1 GB, and because
 * it puts the site under Cloudflare Pages' 20,000-file cap if the hosting ever
 * moves.
 *
 * `llms.txt` and `robots.txt` are real deliverables that happen to share the
 * extension, so they are explicitly kept.
 *
 * Runs after `next build`. `verify/app-smoke.mjs` asserts the result.
 */
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "out");

const KEEP = new Set(["llms.txt", "robots.txt"]);

function isRoutePayload(dir: string, name: string): boolean {
  if (KEEP.has(name)) return false;
  // The page's own payload, only where a rendered page sits beside it. This is
  // what stops the rule from eating an unrelated `index.txt`.
  if (name === "index.txt") return existsSync(join(dir, "index.html"));
  return name.startsWith("__next.") && name.endsWith(".txt");
}

function prune(dir: string): { bytes: number; files: number } {
  let bytes = 0;
  let files = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Build output; never contains a route payload.
      if (entry.name === "_next") continue;
      const nested = prune(full);
      bytes += nested.bytes;
      files += nested.files;
      continue;
    }
    if (!entry.isFile()) continue;
    if (!isRoutePayload(dir, entry.name)) continue;
    bytes += statSync(full).size;
    rmSync(full);
    files += 1;
  }
  return { bytes, files };
}

if (!existsSync(OUT)) {
  console.error("out/ is missing. Run `next build` first.");
  process.exit(1);
}

const { bytes, files } = prune(OUT);

// The two files that must survive are the ones whose absence would be silent:
// a missing llms.txt is a 404 for every model that reads it, and a missing
// robots.txt re-opens the sitemap to everything.
for (const required of KEEP) {
  if (!existsSync(join(OUT, required))) {
    console.error(`out/${required} is missing after the prune; refusing to continue.`);
    process.exit(1);
  }
}

console.log(
  `Pruned ${files.toLocaleString("en-US")} RSC payloads (${(bytes / 1024 / 1024).toFixed(0)} MB).`,
);
