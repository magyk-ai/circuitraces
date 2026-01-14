# Circuit Races - Testing Guide

## Quick Local Test

```bash
# Install dependencies
npm install

# Run unit tests (should see 9/9 passing)
npm test

# Start dev server
npm run dev
# Visit http://localhost:5173
```

## Test on Mobile Device

```bash
# Start dev server with network access
cd apps/web && npm run dev:network

# Output shows:
# ➜  Local:   http://localhost:5173/
# ➜  Network: http://192.168.x.x:5173/

# Visit the Network URL on your phone
```

## Manual Test Checklist

### Desktop Browser

- [ ] Grid renders with 5x5 letters
- [ ] Can drag to select STAR (top row)
- [ ] Selected cells show blue preview
- [ ] Found word highlights in green
- [ ] Can select PATH, ECHO, GOAL
- [ ] Completion screen appears after all 4 words
- [ ] Reset button works
- [ ] Can replay puzzle

### Mobile Browser (iOS Safari)

- [ ] Grid renders correctly
- [ ] Touch drag selects words
- [ ] **ISSUE:** Page may scroll during drag (needs fix)
- [ ] **ISSUE:** Selection may drop if finger moves fast (needs pointercapture)
- [ ] Completion screen shows

### Mobile Browser (Chrome Android)

- [ ] Same as iOS Safari
- [ ] Test in both portrait and landscape

## Known Issues (Pre-Hardening)

### Mobile UX Issues
1. **Page scrolls during drag** - Need `touch-action: none` on grid
2. **Selection drops** - Need `setPointerCapture()` in handlers
3. **No haptic feedback** - Should vibrate on word found
4. **Direction jitter** - RAY_8DIR snaps unstably when dx≈dy

### Accessibility Issues
1. No high-contrast mode
2. Missing ARIA labels on emoji tiles
3. No keyboard navigation

### Performance Issues
1. Entire grid re-renders on every pointer move
2. Should memoize cell components

## Current Architecture Review

### ✅ Good
- Engine tests all passing
- Clean separation (engine has no DOM deps)
- TypeScript strict mode
- Build works

### ⚠️ Needs Attention
- Mobile touch handling incomplete
- No pointer capture
- Selection adapter could be more stable
- No accessibility features yet

## Next Testing Priorities

1. **Mobile QA on real devices** - Test on actual iPhone + Android
2. **Playwright smoke tests** - Automated E2E tests
3. **Property tests** - Random puzzle generation
4. **Performance profiling** - React DevTools profiler

## Verification Script

Run `./verify.sh` for quick health check:
```bash
./verify.sh
```

## Build Verification

```bash
# Build everything
npm run build

# Check output
ls -la apps/web/dist/

# Preview production build
cd apps/web && npm run preview
# Visit http://localhost:4173
```

## GitHub Pages Deployment Test

```bash
# Build
npm run build

# Serve dist locally to simulate GitHub Pages
cd apps/web/dist
python3 -m http.server 8000
# Visit http://localhost:8000
```

## Common Issues

### "Cannot find module @circuitraces/engine"
**Fix:** Build engine first
```bash
cd packages/engine && npm run build
```

### Vite dev server won't start
**Fix:** Check node version (need 20+)
```bash
node --version  # Should be v20.x or higher
```

### Tests fail
**Fix:** Reinstall dependencies
```bash
rm -rf node_modules packages/*/node_modules apps/*/node_modules
npm install
```

## Performance Baseline

Current metrics (for tracking improvements):
- First load: ~150KB JS bundle
- Grid render: 25 React components (5x5)
- Selection lag: ~5ms (should be <1ms)
- Build time: ~2 seconds

## Mobile Testing URLs

After running `npm run dev:network`, test on:
- iPhone Safari: http://YOUR_LOCAL_IP:5173
- Android Chrome: http://YOUR_LOCAL_IP:5173
- iPad Safari: http://YOUR_LOCAL_IP:5173

**Find your IP:**
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# or
hostname -I
```
