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

# PDF export isn't implemented yet (deferred milestone). When it lands,
# re-evaluate this stage rather than defaulting back to the full
# mcr.microsoft.com/playwright image (~1.5-2GB, bundles Chromium + Firefox +
# WebKit) — installing just Chromium via `playwright install --with-deps
# chromium` on this same slim base is the leaner option, and browser-side
# print-to-PDF may make server-side rendering unnecessary entirely.
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# next.config.ts sets output: "standalone", so this is a pre-traced,
# production-only server bundle (no dev tooling / unused deps).
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
