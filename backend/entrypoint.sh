#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting server..."
# If arguments are provided, execute them instead of the default command
if [ $# -gt 0 ]; then
    exec "$@"
else
    exec node dist/index.js
fi
