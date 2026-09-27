import pkg from "../../package.json";

export const REPO_URL = "https://github.com/bsaunder/smart_packer";

/**
 * What's running: the release version from package.json (bumped by hand per
 * release — see README "Versioning"), plus the exact commit and build time,
 * which the GitHub Actions image build bakes in as APP_GIT_SHA /
 * APP_BUILD_DATE (see Dockerfile). Both are null for local `pnpm dev` and
 * local `docker compose build`, which don't pass them.
 */
export function getBuildInfo() {
  const commit = process.env.APP_GIT_SHA || null;
  const builtAt = process.env.APP_BUILD_DATE ? new Date(process.env.APP_BUILD_DATE) : null;
  return {
    version: pkg.version,
    commit,
    shortCommit: commit?.slice(0, 7) ?? null,
    builtAt: builtAt && !Number.isNaN(builtAt.getTime()) ? builtAt : null,
  };
}
