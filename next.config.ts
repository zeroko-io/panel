import type { NextConfig } from "next"

import pkg from "./package.json" with { type: "json" }

const nextConfig: NextConfig = {
  // A server that runs on its own, for the image.
  output: "standalone",
  outputFileTracingIncludes: {
    "/skill.md": ["./skill.md"],
  },
  env: {
    // The panel's version, shown in System and checked against releases:
    // the image's (git describe), else package.json's.
    ZEROKO_PANEL_VERSION: process.env.VERSION || pkg.version,
  },
}

export default nextConfig
