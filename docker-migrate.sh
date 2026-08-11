#!/bin/sh
set -e

# Invoke installed binaries directly (see docker-migrate stage comment in
# Dockerfile for why this doesn't go through `pnpm exec`).

echo "Applying database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Checking for an initial admin user..."
./node_modules/.bin/tsx prisma/seed.ts

echo "Done."
