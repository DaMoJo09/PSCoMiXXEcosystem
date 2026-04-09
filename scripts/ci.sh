#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "  PSCoMiXX CI Pipeline"
echo "=========================================="
echo ""

STEP=0
TOTAL=5

step() {
  STEP=$((STEP + 1))
  echo ""
  echo "--- [$STEP/$TOTAL] $1 ---"
  echo ""
}

step "Clean Install"
npm ci --ignore-scripts 2>&1 || { echo "FAIL: npm ci failed"; exit 1; }

step "TypeScript Check"
npx tsc --noEmit 2>&1 || { echo "FAIL: TypeScript check failed"; exit 1; }

step "Production Build"
npm run build 2>&1 || { echo "FAIL: Build failed"; exit 1; }

step "Unit Tests (Vitest)"
if [ -f "vitest.config.ts" ]; then
  npx vitest run --reporter=verbose 2>&1 || { echo "FAIL: Unit tests failed"; exit 1; }
else
  echo "  No vitest.config.ts found — skipping unit tests"
fi

step "E2E Tests (Playwright)"
if [ -d "e2e" ] && [ -f "playwright.config.ts" ]; then
  npx playwright install --with-deps chromium 2>&1
  npx playwright test --reporter=list 2>&1 || { echo "FAIL: E2E tests failed"; exit 1; }
else
  echo "  No e2e directory or playwright config — skipping E2E tests"
fi

echo ""
echo "=========================================="
echo "  CI Pipeline PASSED"
echo "=========================================="
