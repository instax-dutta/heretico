import { run } from "./util.mjs";

// Route types (PageProps/LayoutProps) are generated, and `.next/` is not
// committed, so a fresh clone must generate them before tsc can resolve them.
run("npm", ["run", "typecheck"]);
run("npx", ["eslint", "src", "scripts", "tests", "--max-warnings=0"]);
console.log("STATIC CHECKS PASSED");
