#!/bin/sh
set -eu

echo "Validating environment..."
node dist/startup-env-cli.js

echo "Running database migrations..."
./node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma

echo "Seeding Super Admin (idempotent)..."
node dist/seed-cli.js

echo "Starting Nest API..."
exec node dist/main.js
