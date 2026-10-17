import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlify free tier: everything is prerendered into `out/`, filtering runs in
  // the browser against one static index. No server runtime, no API surface.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
