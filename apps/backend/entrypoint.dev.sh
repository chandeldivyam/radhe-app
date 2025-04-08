#!/bin/sh
set -e
echo "Applying database migrations..."
pnpm drizzle-kit push --config=./drizzle.config.ts
echo "Starting backend server..."
exec pnpm tsx watch src/index.ts
