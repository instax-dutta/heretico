import { run } from "./util.mjs";

run("npx", ["tsc", "--noEmit"]);
run("npx", ["eslint", "src", "scripts", "tests", "--max-warnings=0"]);
console.log("STATIC CHECKS PASSED");
