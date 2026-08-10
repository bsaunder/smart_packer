# syntax=docker/dockerfile:1

FROM node:22-slim AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# Runtime base includes Chromium + the OS libs Playwright needs for PDF
# generation (see DESIGN.md "Deployment note"). Keep this tag in sync with
# the `playwright` package version once it's added as a dependency.
FROM mcr.microsoft.com/playwright:v1.49.0-noble AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable pnpm

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated

EXPOSE 3000
CMD ["pnpm", "start"]
