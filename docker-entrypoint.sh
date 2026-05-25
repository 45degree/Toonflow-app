#!/bin/sh
set -eu

mkdir -p /app/data

# Seed bundled defaults without overwriting user data mounted at /app/data.
if [ -d /app/default-data ]; then
  cp -Rn /app/default-data/. /app/data/ 2>/dev/null || true
fi

exec "$@"
