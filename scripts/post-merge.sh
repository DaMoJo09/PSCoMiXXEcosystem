#!/bin/bash
set -e

npm install --no-audit --no-fund

if [ -f drizzle.config.ts ] || [ -f drizzle.config.js ]; then
  npm run db:push -- --force 2>/dev/null || npm run db:push 2>/dev/null || true
fi
