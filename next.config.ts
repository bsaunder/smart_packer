import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Traces only the production deps actually used at runtime into
  // .next/standalone, so the Docker image doesn't need the full
  // node_modules tree (dev tooling included).
  output: "standalone",
};

export default nextConfig;
