import { existsSync, readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { assert, runQuiet } from "./util.mjs";

/**
 * Security posture, as a runnable check.
 *
 * Everything here is a property that is easy to lose silently: an action
 * re-pinned to a floating tag, a CSP meta tag dropped during a refactor, a
 * `.env` that gets added, a dependency advisory that appears overnight. None of
 * them would fail any other gate.
 */

// 1. Every action pinned to an immutable commit. A floating `@v4` is a mutable
//    pointer: if the upstream tag moves, this repo runs changed code with
//    contents:write and pages:write.
const workflows = readdirSync(".github/workflows").filter((file) => file.endsWith(".yml"));
let pinned = 0;
for (const file of workflows) {
  const text = readFileSync(`.github/workflows/${file}`, "utf8");
  // Parse the trigger block rather than scanning the text: a comment that
  // explains why `pull_request_target` is avoided must not count as using it.
  const triggers = Object.keys(parse(text).on ?? {});
  assert(
    !triggers.includes("pull_request_target"),
    `${file} triggers on pull_request_target, which hands repository secrets to fork PRs`,
  );
  for (const line of text.split("\n")) {
    const match = /^\s*(?:-\s*)?uses:\s*(\S+)/.exec(line);
    if (!match) continue;
    const ref = match[1];
    pinned += 1;
    assert(
      /@[0-9a-f]{40}$/.test(ref),
      `${file}: action is not pinned to a commit SHA: ${ref}`,
    );
  }
}
assert(pinned > 0, "no action references found; the scan is looking in the wrong place");

// 2. Something has to move those pins, or they rot.
assert(existsSync(".github/dependabot.yml"), "missing .github/dependabot.yml");
const dependabot = readFileSync(".github/dependabot.yml", "utf8");
assert(/package-ecosystem:\s*npm/.test(dependabot), "dependabot does not watch npm");
assert(
  /package-ecosystem:\s*github-actions/.test(dependabot),
  "dependabot does not watch the pinned actions",
);

// 3. A CSP, since GitHub Pages cannot send headers. Meta CSP is the only
//    hardening available, and `unsafe-eval` would give most of it back.
const layout = readFileSync("src/app/layout.tsx", "utf8");
// Extract the directive string itself. Scanning the whole file would count the
// comment that explains why `unsafe-eval` is absent as proof that it is present.
const cspBlock = /httpEquiv="Content-Security-Policy"[\s\S]*?content=\{([\s\S]*?)\n\s*\}/.exec(layout);
assert(Boolean(cspBlock), "layout.tsx has no Content-Security-Policy meta tag");
const csp = (cspBlock?.[1] ?? "").replace(/\s+/g, " ");
assert(/default-src 'self'/.test(csp), "CSP has no default-src 'self'");
assert(!/unsafe-eval/.test(csp), "CSP allows eval");
assert(/object-src 'none'/.test(csp), "CSP does not block plugin content");
assert(/base-uri 'self'/.test(csp), "CSP does not constrain base-uri");
assert(/form-action 'self'/.test(csp), "CSP does not constrain form-action");

// 4. Internal links must not use next/link: the export prunes the RSC payloads
//    it depends on. This one is also asserted by app-smoke, from the output
//    side; here it is asserted from the source side.
// Only source files: the AGENTS.md contracts mention next/link precisely to
// forbid it, and a doc that says "do not use X" must not count as using X.
const linkUsers = runQuiet("grep", ["-rl", "--include=*.ts", "--include=*.tsx", "next/link", "src"]);
const offenders = (linkUsers.stdout ?? "").trim();
assert(
  linkUsers.status !== 0 || offenders === "",
  `next/link is back in: ${offenders} - the pruned RSC payloads would 404`,
);

// 5. No secret-shaped files under version control.
const tracked = runQuiet("git", ["ls-files"]);
if (tracked.status === 0) {
  const files = (tracked.stdout ?? "").split("\n").filter(Boolean);
  const exposed = files.filter((file) =>
    /(^|\/)\.env|\.pem$|\.key$|(^|\/)id_[a-z]+$|secret|credential/i.test(file),
  );
  assert(exposed.length === 0, `tracked secret-shaped files: ${exposed.join(", ")}`);
}

// 6. The dependency actually shipped must be free of high/critical advisories.
//    Dev-only tooling is reported by `npm audit` too, so scope to production.
const audit = runQuiet("npm", ["audit", "--omit=dev", "--audit-level=high"]);
assert(
  audit.status === 0,
  `a shipped dependency has a high or critical advisory:\n${audit.stdout ?? ""}${audit.stderr ?? ""}`,
);

console.log(`Security posture: ${workflows.length} workflows, ${pinned} pinned actions.`);
console.log("SECURITY VERIFIED");
