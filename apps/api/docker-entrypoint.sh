#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Applying database migrations..."
  pnpm --filter @tailored-cv/api exec prisma migrate deploy
fi

exec node apps/api/dist/main.js
