#!/bin/sh
set -e

echo "🚀 Syncing database schema..."
# migrate deploy applies pending migrations in order (and creates tables on
# first run) using the committed migration files, so backfills like the
# reimbursementNeeded default run instead of failing on required columns.
node node_modules/prisma/build/index.js migrate deploy 2>&1

echo "🌱 Seeding categories (upserts – safe to run repeatedly)..."
node prisma/seed-docker.js

echo "✅ Starting Festival Finance..."
exec node server.js
