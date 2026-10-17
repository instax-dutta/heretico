import { fail, runQuiet } from "./util.mjs";

const pattern = process.argv[2];
if (!pattern) fail("usage: node scripts/verify/suite.mjs <test path>");

const result = runQuiet("npx", ["vitest", "run", pattern]);
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");

if (result.status !== 0) fail(`suite ${pattern} failed`);

if (!/Tests\s+\d+ passed/.test(`${result.stdout}${result.stderr}`)) {
  fail(`suite ${pattern} did not report passing tests`);
}

console.log(`SUITE PASSED ${pattern}`);
