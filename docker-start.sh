#!/bin/sh
set -e

echo "🚀 Syncing database schema..."
# db push creates tables on first run and updates schema safely on subsequent runs
node node_modules/.bin/prisma db push --accept-data-loss 2>&1

echo "🌱 Seeding categories (upserts – safe to run repeatedly)..."
node prisma/seed-docker.js

echo "✅ Starting Festival Finance..."
exec node server.js
