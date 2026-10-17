/**
 * Move the generated social card to the stable path it is advertised at.
 *
 * `app/og/route.tsx` writes `out/og` with no extension, so a static host would
 * serve it as `application/octet-stream` and social platforms would reject it.
 * This copies it to `out/og.png` and back into `public/` so the committed asset
 * and the deployed one stay identical.
 *
 * Runs after `next build`; regenerating on every build is what keeps the card
 * from advertising counts the site has moved past.
 */
import { copyFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const generated = join(ROOT, "out", "og");
const deployed = join(ROOT, "out", "og.png");
const committed = join(ROOT, "public", "og.png");

if (!existsSync(generated)) {
  console.error("out/og is missing. Run `next build` first (app/og/route.tsx).");
  process.exit(1);
}

copyFileSync(generated, deployed);
copyFileSync(generated, committed);
rmSync(generated, { force: true });

console.log(`Social card written: out/og.png and public/og.png (${deployed})`);

