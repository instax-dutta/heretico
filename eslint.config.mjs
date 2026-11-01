import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This site navigates with plain anchors on purpose. Soft navigation is
      // what makes the App Router emit four RSC payloads per route - 21,442
      // files and 255 MB - and `scripts/prune-rsc-payloads.ts` deletes them
      // because nothing fetches them. Putting `<Link>` back would silently
      // reintroduce a dependency on files that no longer exist.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
