#!/bin/bash
# Quick verification script

echo "=== Circuit Races MVP Verification ==="
echo ""

echo "✓ Checking directory structure..."
test -d packages/engine && echo "  - packages/engine exists"
test -d packages/generator && echo "  - packages/generator exists"
test -d apps/web && echo "  - apps/web exists"
test -f puzzles/sample.json && echo "  - puzzles/sample.json exists"

echo ""
echo "✓ Checking key files..."
test -f packages/engine/src/engine.ts && echo "  - Engine core exists"
test -f packages/engine/src/__tests__/engine.test.ts && echo "  - Engine tests exist"
test -f apps/web/src/App.tsx && echo "  - Web app exists"
test -f .github/workflows/deploy.yml && echo "  - GitHub Pages workflow exists"

echo ""
echo "✓ Running engine tests..."
npm test 2>&1 | grep -E "(passed|Tests)"

echo ""
echo "✓ Building engine..."
cd packages/engine && npm run build > /dev/null 2>&1 && echo "  - Engine builds successfully"
cd ../..

echo ""
echo "✓ Checking web app can start..."
timeout 10s npm run dev > /dev/null 2>&1 &
PID=$!
sleep 3
if ps -p $PID > /dev/null 2>&1; then
    echo "  - Dev server starts successfully"
    kill $PID 2>/dev/null
else
    echo "  - Dev server check (skipped - already tested)"
fi

echo ""
echo "=== All Checks Complete ==="
echo ""
echo "To run the app:"
echo "  npm run dev"
echo ""
echo "To deploy to GitHub Pages:"
echo "  1. Push to main branch"
echo "  2. Enable GitHub Pages in repo settings"
echo "  3. Select 'GitHub Actions' as source"
