import { existsSync, readFileSync } from "node:fs";
import { assert, runQuiet } from "./util.mjs";

const REQUIRED = [
  "AGENTS.md",
  "src/AGENTS.md",
  "src/app/AGENTS.md",
  "src/components/AGENTS.md",
  "src/lib/AGENTS.md",
  "src/lib/parse/AGENTS.md",
  "src/lib/ingest/AGENTS.md",
  "scripts/AGENTS.md",
  "tests/AGENTS.md",
  "data/AGENTS.md",
];

for (const file of REQUIRED) {
  assert(existsSync(file), `missing DOX file ${file}`);
  const text = readFileSync(file, "utf8");
  if (file === "AGENTS.md") {
    assert(text.includes("# DOX framework"), "root AGENTS.md is not a DOX rail");
    assert(text.includes("## Child DOX Index"), "root AGENTS.md has no child index");
  } else {
    for (const heading of ["## Purpose", "## Ownership", "## Local Contracts", "## Verification"]) {
      assert(text.includes(heading), `${file} is missing "${heading}"`);
    }
  }
  assert(!/This project is not yet indexed/.test(text), `${file} still contains the DOX placeholder`);
}

const root = readFileSync("AGENTS.md", "utf8");
for (const file of REQUIRED.filter((entry) => entry !== "AGENTS.md")) {
  assert(root.includes(file.replace("AGENTS.md", "")), `root index does not mention ${file}`);
}

const lib = readFileSync("src/lib/AGENTS.md", "utf8");
assert(lib.includes("parse/AGENTS.md"), "lib index missing parse child");
assert(lib.includes("ingest/AGENTS.md"), "lib index missing ingest child");

const app = readFileSync("src/app/AGENTS.md", "utf8");
assert(/output: "export"/.test(app), "app doc does not record the static-export contract");

// The README is the front door for humans; keep it pointing at real commands.
const readme = readFileSync("README.md", "utf8");
for (const needle of [
  "npm run refresh",
  "node scripts/verify/snapshot.mjs",
  "netlify.toml",
  "## Caveats",
  "## License",
]) {
  assert(readme.includes(needle), `README.md is missing "${needle}"`);
}

// A public repository needs its license present, not just mentioned.
assert(existsSync("LICENSE"), "missing LICENSE");
const license = readFileSync("LICENSE", "utf8");
assert(/^MIT License/m.test(license), "LICENSE is not MIT");
assert(readme.includes("(LICENSE)"), "README does not link the LICENSE file");

// The README states the size of the index. Those numbers are generated from the
// snapshot, so a hand-edit that lies is caught here instead of going stale.
assert(readme.includes("<!-- counts:begin -->"), "README.md is missing the counts block");
const counts = runQuiet("npx", ["tsx", "scripts/build-readme-counts.ts", "--check"]);
assert(
  counts.status === 0,
  `README.md counts are stale. Run \`npm run counts\`. ${counts.stderr ?? ""}`,
);

console.log(`DOX tree: ${REQUIRED.length + 2} documents checked.`);
console.log("DOX VERIFIED");
