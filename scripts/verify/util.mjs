import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: options.cwd ?? process.cwd(),
    env: { ...process.env, ...(options.env ?? {}) },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`\nFAILED: ${command} ${args.join(" ")} (exit ${result.status})`);
    process.exit(result.status ?? 1);
  }
}

export function runQuiet(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    cwd: options.cwd ?? process.cwd(),
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1", ...(options.env ?? {}) },
    shell: process.platform === "win32",
  });
}

export function fail(message) {
  console.error(`VERIFY FAILED: ${message}`);
  process.exit(1);
}

export function assert(condition, message) {
  if (!condition) fail(message);
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function readText(path) {
  return readFileSync(path, "utf8");
}
