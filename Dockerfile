# syntax=docker/dockerfile:1

FROM node:22-slim AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
ENV CI=true
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# Production-only install, used solely by the `migrate` target below. Kept
# out of `app` (the persistent runtime image) because the `prisma` CLI
# package pulls in Prisma Studio, its local dev-db (pglite), and an MCP SDK
# — several hundred MB of tooling the app itself never touches; `migrate`
# only needs `prisma migrate deploy` and the seed script, and only runs
# once per deploy, not continuously.
FROM base AS prod-deps
WORKDIR /app
ENV CI=true
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# --- `app` target: the persistent, always-running service. ---
# next.config.ts sets output: "standalone", so this is a pre-traced,
# production-only server bundle (no Prisma CLI, no dev tooling).
#
# PDF export isn't implemented yet (deferred milestone). When it lands,
# re-evaluate this stage rather than defaulting back to the full
# mcr.microsoft.com/playwright image (~1.5-2GB, bundles Chromium + Firefox +
# WebKit) — installing just Chromium via `playwright install --with-deps
# chromium` on this same slim base is the leaner option, and browser-side
# print-to-PDF may make server-side rendering unnecessary entirely.
FROM base AS app
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# @node-rs/argon2's platform .node binary is loaded via a dynamic require()
# that standalone output's file-tracing can't follow statically. Worse,
# pnpm nests optional platform packages inside the depending package's own
# node_modules (node_modules/.pnpm/@node-rs+argon2@x/node_modules/@node-rs/
# argon2-linux-x64-gnu) rather than hoisting them to the top level, so even
# a manual COPY of a plausible-looking path comes up empty. Simplest fix:
# install this one small package fresh, here, with npm (flat, no pnpm
# nesting) in an isolated scratch directory -- running npm directly inside
# the existing pnpm-structured node_modules crashes trying to parse it --
# then copy the flat, self-contained result into place.
RUN mkdir -p /tmp/argon2-install && cd /tmp/argon2-install \
    && npm install --no-save --omit=dev @node-rs/argon2@2.0.2 \
    && rm -rf /app/node_modules/@node-rs \
    && cp -r /tmp/argon2-install/node_modules/@node-rs /app/node_modules/@node-rs \
    && rm -rf /tmp/argon2-install

EXPOSE 3000
CMD ["node", "server.js"]

# --- `migrate` target: one-shot init step, run before `app` starts. ---
FROM base AS migrate
WORKDIR /app
ENV NODE_ENV=production

# Prisma's engines need the system libssl to detect the OpenSSL version;
# without it they fall back to a guess (works, but warns on every run).
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=prod-deps /app/node_modules ./node_modules
# prisma/seed.ts imports app code (@/lib/prisma, @/services/userService) via
# the "@/*" tsconfig path alias that tsx resolves at runtime -- both the
# source tree and tsconfig.json (not just src/generated) have to be here,
# or tsx can't find the alias target at all.
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY package.json tsconfig.json prisma.config.ts docker-migrate.sh ./
RUN chmod +x docker-migrate.sh

CMD ["./docker-migrate.sh"]
