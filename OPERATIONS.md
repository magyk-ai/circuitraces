# Circuit Races - Operations Playbook

## Pre-Commit Checklist

**Always run these locally BEFORE pushing:**

### Quick Check (60 seconds)
```bash
# Run all checks at once
npm run precommit

# This runs:
# 1. ESLint (code quality)
# 2. TypeScript type checking
# 3. Unit tests (56 tests: 35 engine + 21 generator)
# 4. Build (engine + web app)
# 5. E2E tests (10 Playwright tests)
```

### Detailed Check (if precommit fails)

```bash
# 1. Lint code
npm run lint
# Expected: No errors
# Fix automatically: npm run lint:fix

# 2. Type check
npm run typecheck
# Expected: No TypeScript errors in any package

# 3. Run unit tests
npm test
# Expected: 56/56 tests passing (35 engine + 21 generator)

# 4. Validate puzzle
npm run validate apps/web/public/daily/2026-01-17-devops.json
# Expected: "✓ Puzzle is valid"

# 5. Build everything
npm run build
# Expected: No errors, dist/ directories created

# 6. Run E2E tests
npm run test:e2e
# Expected: 10/10 tests passing

# 7. Preview production build locally (optional)
cd apps/web && npm run preview
# Visit http://localhost:4173 and test the game
# - Can drag to select words
# - Words highlight when found
# - Completion screen appears
# - No console errors
```

### Pre-Commit Rules

❌ **NEVER push if:**
- `npm run lint` has errors
- `npm run typecheck` has errors
- `npm test` fails
- `npm run build` fails

✅ **OK to push if:**
- All checks pass locally
- You've tested the game works in preview
- Commit message is descriptive

💡 **Pro tip:** Use the `precommit` script to check everything at once!

## Using GitHub CLI (gh)

### Check Workflow Status

```bash
# List recent workflow runs
gh run list --limit 5

# Watch a specific run (replace ID)
gh run watch <run-id> --exit-status

# Watch most recent run
gh run list --limit 1 | grep "in_progress"
# Copy the run ID and watch it

# View failed run logs
gh run view <run-id> --log-failed
```

### Manual Deployment

```bash
# Trigger deploy workflow manually (bypasses test gate)
gh workflow run deploy.yml

# Check if deploy succeeded
gh run list --workflow=deploy.yml --limit 1
```

### Repository Management

```bash
# Check GitHub Pages status
gh api repos/magyk-ai/circuitraces/pages

# Get live URL
gh api repos/magyk-ai/circuitraces/pages --jq '.html_url'

# Check repo settings
gh repo view magyk-ai/circuitraces
```

## Commit & Deploy Workflow

### Normal Flow (Recommended)

```bash
# 1. Run tests locally (see Pre-Commit Checklist above)
npm test

# 2. Stage and commit
git add -A
git commit -m "Your descriptive commit message"

# 3. Push to main
git push origin main

# 4. Watch test workflow
sleep 5 && gh run list --limit 1
# Copy run ID
gh run watch <test-run-id> --exit-status

# 5. If tests pass, deploy triggers automatically
# Watch deploy workflow
gh run list --workflow=deploy.yml --limit 1
# Copy run ID
gh run watch <deploy-run-id> --exit-status

# 6. Verify live site (wait ~30s for CDN)
open https://magyk-ai.github.io/circuitraces/
```

### Emergency Hotfix

```bash
# If you need to deploy immediately without waiting for tests:

# Option A: Manual workflow trigger (still builds everything)
gh workflow run deploy.yml

# Option B: Re-run a previous successful deploy
gh run list --workflow=deploy.yml --limit 5
gh run rerun <previous-successful-run-id>
```

## CI/CD Pipeline

### Workflow Sequence

1. **On push to main:**
   - `Test` workflow runs (unit tests, build, validation)
   - Takes ~20 seconds

2. **On Test success:**
   - `Deploy` workflow triggers automatically
   - Builds and deploys to GitHub Pages
   - Takes ~25 seconds
   - Total: ~45 seconds from push to live

3. **On Test failure:**
   - Deploy workflow does NOT run
   - Fix issues locally and push again

### Test Workflow Checks

- ✅ Install dependencies
- ✅ Build engine package
- ✅ Run unit tests (56 tests)
- ✅ Validate daily puzzle
- ✅ Build web app
- ✅ Run E2E tests (10 tests)

### Deploy Workflow Steps

- ✅ Build engine
- ✅ Build web app
- ✅ Upload to GitHub Pages
- ✅ Deploy to https://magyk-ai.github.io/circuitraces/

## Troubleshooting

### Tests Fail Locally

```bash
# Clean install
rm -rf node_modules packages/*/node_modules apps/*/node_modules
npm install

# Rebuild engine
cd packages/engine && npm run build && cd ../..

# Run tests again
npm test
```

### Deploy Fails

```bash
# Check workflow logs
gh run list --workflow=deploy.yml --limit 1
gh run view <run-id> --log-failed

# Common issues:
# 1. GitHub Pages not enabled → Check Settings → Pages
# 2. Permissions issue → Check Settings → Actions → Workflow permissions
# 3. Build error → Test locally with npm run build
```

### App Loads But Broken

```bash
# Check if puzzle JSON is accessible
curl -I https://magyk-ai.github.io/circuitraces/sample.json

# Should return: HTTP/2 200

# Check browser console for errors
# Visit: https://magyk-ai.github.io/circuitraces/
# Press F12 → Console tab
```

### CDN Cache Issues

```bash
# GitHub Pages uses CDN caching (600s = 10 minutes)
# After deploy, wait ~30 seconds, then hard refresh:
# - Chrome/Firefox: Ctrl+Shift+R (Cmd+Shift+R on Mac)
# - Safari: Cmd+Option+R

# Or add cache-busting query param:
open "https://magyk-ai.github.io/circuitraces/?v=$(date +%s)"
```

## Monitoring

### Check Live Site Status

```bash
# Quick health check
curl -I https://magyk-ai.github.io/circuitraces/
# Should return: HTTP/2 200

# Check puzzle loads
curl -I https://magyk-ai.github.io/circuitraces/sample.json
# Should return: HTTP/2 200 with content-type: application/json

# Full test
curl -s https://magyk-ai.github.io/circuitraces/ | grep "Circuit Races"
# Should return: <title>Circuit Races</title>
```

### View Workflow Status Badges

Visit: https://github.com/magyk-ai/circuitraces

Badges show:
- ![Test](https://github.com/magyk-ai/circuitraces/actions/workflows/test.yml/badge.svg) - Test status
- ![Deploy](https://github.com/magyk-ai/circuitraces/actions/workflows/deploy.yml/badge.svg) - Deploy status

## Development Workflow

### Local Development

```bash
# Start dev server
npm run dev
# Visit http://localhost:5173

# Test on mobile (get local IP first)
cd apps/web && npm run dev:network
# Visit http://YOUR_IP:5173 on phone

# Run tests in watch mode
cd packages/engine && npm run test:watch
```

### Adding a New Feature

1. Create feature branch (optional)
2. Make changes
3. **Run pre-commit checklist** (see above)
4. Commit and push
5. Watch test workflow
6. Deploy happens automatically if tests pass

### Adding a New Puzzle

```bash
# 1. Create puzzle JSON
cp puzzles/sample.json puzzles/new-puzzle.json
# Edit new-puzzle.json

# 2. Validate
npm run validate puzzles/new-puzzle.json

# 3. Copy to web app public
cp puzzles/new-puzzle.json apps/web/public/

# 4. Update App.tsx to load new puzzle
# Edit: apps/web/src/App.tsx
# Change: fetch('./sample.json') to fetch('./new-puzzle.json')

# 5. Test locally
npm run dev

# 6. Commit and deploy
git add -A
git commit -m "Add new puzzle"
git push origin main
```

## Common Tasks

### Update Dependencies

```bash
# Check for outdated packages
npm outdated

# Update all packages
npm update

# Update a specific package
npm install package-name@latest

# Don't forget to test!
npm test
npm run build
```

### Rollback a Deployment

```bash
# Option 1: Revert commit
git revert HEAD
git push origin main

# Option 2: Re-deploy previous commit
gh run list --workflow=deploy.yml --limit 10
# Find previous successful run
gh run rerun <previous-run-id>

# Option 3: Reset to previous commit (dangerous!)
git log --oneline -5
git reset --hard <previous-commit-hash>
git push --force origin main  # ⚠️ Use with caution!
```

### View Deploy History

```bash
# List all deployments
gh run list --workflow=deploy.yml --limit 20

# View specific deployment
gh run view <run-id>

# Download deployment artifacts (if any)
gh run download <run-id>
```

## Performance Monitoring

### Bundle Size

```bash
# Build and check size
cd apps/web && npm run build
ls -lh dist/assets/*.js
# Look for index-*.js file size

# Target: < 200KB (currently ~150KB)
```

### Lighthouse Audit

```bash
# Install Lighthouse CLI (if not installed)
npm install -g @lhci/cli

# Run audit
lhci autorun --url=https://magyk-ai.github.io/circuitraces/

# Target scores:
# Performance: > 90
# Accessibility: > 90
# Best Practices: > 90
# SEO: > 90
```

## Security

### Audit Dependencies

```bash
# Check for vulnerabilities
npm audit

# Fix automatically (may cause breaking changes)
npm audit fix

# Fix with force (use with caution)
npm audit fix --force
```

### Secrets Management

Currently no secrets needed. If adding:

```bash
# Add secret via gh CLI
gh secret set SECRET_NAME

# List secrets
gh secret list

# View secret (not the value)
gh secret view SECRET_NAME
```

## Backup & Recovery

### Backup Current State

```bash
# Create backup branch
git checkout -b backup-$(date +%Y%m%d)
git push origin backup-$(date +%Y%m%d)

# Or create a tag
git tag -a v0.1-backup -m "Backup before major changes"
git push --tags
```

### Export Puzzles

```bash
# Backup all puzzles
tar -czf puzzles-backup-$(date +%Y%m%d).tar.gz puzzles/

# Or copy to another location
cp -r puzzles/ ~/backups/circuitraces-puzzles/
```

## Useful Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Circuit Races shortcuts
alias cr='cd /home/harshal/magyk/circuitraces'
alias crtest='cd /home/harshal/magyk/circuitraces && npm test'
alias crbuild='cd /home/harshal/magyk/circuitraces && npm run build'
alias crdev='cd /home/harshal/magyk/circuitraces && npm run dev'
alias crwatch='gh run watch --exit-status'
alias crstatus='gh run list --limit 5'
```

## Emergency Contacts

- Repository: https://github.com/magyk-ai/circuitraces
- Live Site: https://magyk-ai.github.io/circuitraces/
- Actions: https://github.com/magyk-ai/circuitraces/actions
- Issues: https://github.com/magyk-ai/circuitraces/issues

---

**Remember: Always test locally before pushing!** 🚀
