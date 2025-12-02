#!/bin/sh
set -e

# Ensure data directory exists
mkdir -p /app/data/logs

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting server..."
# If arguments are provided, execute them instead of the default command
if [ $# -gt 0 ]; then
    exec "$@"
else
    exec node dist/index.js
fi
