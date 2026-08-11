import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Traces only the production deps the app itself imports into
  // .next/standalone. The Prisma CLI (needed only to run migrations, not by
  // the app at runtime) lives in a separate `migrate` build target instead
  // of bloating this one — see Dockerfile.
  output: "standalone",
};

export default nextConfig;
