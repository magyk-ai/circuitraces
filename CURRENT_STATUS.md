# Circuit Races - Current Status

**Last Updated:** 2026-01-15
**Status:** Post-MVP Sprint Complete (Days 1-4)

## What You Can Do Right Now

### 1. Play Multiple Puzzles

```bash
cd /home/harshal/magyk/circuitraces

# Start dev server
npm run dev
# Visit http://localhost:5173

# Select puzzles from dropdown:
# - First Steps (5x5, easy)
# - Short Path (3x3, easy)
# - Simple Square (4x4, easy)
# - Hidden Words (6x6, medium) - has additional words!
# - Crossroads (5x5, medium) - has additional words!

# Test on mobile (get your local IP from output)
cd apps/web && npm run dev:network
# Visit http://YOUR_LOCAL_IP:5173 on your phone
```

### 2. Try New Mechanics

**Hints:**
- Click 💡 Hint button to reveal one cell from an unfound path word
- Yellow pulsing border shows hint cells
- Unlimited hints available

**Additional Words & Clues:**
- Find words that aren't part of the main path
- Purple pulsing border shows clue cells (points to path word)
- Clues expire after 3 seconds

### 3. Run Tests

```bash
# Run engine unit tests (18 tests)
npm test
# Output: 18/18 tests passing ✓

# Run Playwright E2E tests (if installed)
cd apps/web && npm run test:e2e
```

### 4. Build for Production

```bash
# Build everything
npm run build

# Preview production build
cd apps/web && npm run preview
# Visit http://localhost:4173
```

## What's Implemented

### ✅ Mobile UX Hardening (Day 1 - Complete)

**Pointer Capture** (`Grid.tsx`)
- `setPointerCapture()` on pointerdown
- `releasePointerCapture()` on pointerup
- Selection doesn't drop on fast swipes

**Grid-Level Tracking** (`Grid.tsx`)
- Replaced unreliable `onPointerEnter` with grid-level `onPointerMove`
- Coordinate-based cell detection using `document.elementFromPoint()`
- Works reliably on touch and mouse

**Selection Hysteresis** (`selection-adapter.ts`)
- Dead zone: 0.3 grid units (prevents accidental snaps)
- Direction locking: 45° threshold (prevents jitter)
- Smooth, intentional-feeling selection

**Touch-Action & Prevent Default**
- `touch-action: none` on grid (no page scroll)
- `preventDefault()` on pointerdown/pointermove
- No text selection, no long-press menu

**Haptic Feedback** (`App.tsx`)
- 10ms vibration pulse on word found
- Works on mobile devices with vibration support

### ✅ Core Mechanics (Day 2-3 - Complete)

**Engine Extensions** (`packages/engine`)
- **RuntimeState**: Added 5 fields (foundAdditionalWords, hintUsedCount, hintMarkedCells, clueMarkedCells, lastClueExpiresAt)
- **PuzzleConfig**: Added cluePersistMs (default 3000ms)
- **WordDef**: Added optional clueCellId
- **WaywordsPuzzle**: Added words.additional array
- **Actions**: PRESS_HINT, TICK
- **Events**: HINT_APPLIED, CLUE_APPLIED, category field on WORD_FOUND

**Placement Index** (`placement-index.ts`)
- Extended to index both PATH and ADDITIONAL words
- O(1) lookup with category distinction

**Engine Logic** (`engine.ts`)
- `handleHint()`: Unlimited hints, marks cells of unfound path words
- `handleTick()`: Clue expiration after cluePersistMs
- `handleSelect()`: Category-aware word tracking
- Selectors: `getHintCells()`, `getClueCells()`

**Tests** (`__tests__/engine.test.ts`)
- 18 tests passing (9 original + 9 new)
- Hint mechanics tests (5 tests)
- Additional words & clues tests (4 tests)

### ✅ UI Integration (Day 3-4 - Complete)

**Sample Puzzle Extended** (`sample.json`)
- Added cluePersistMs: 3000
- Added 2 additional words: ART, DRY
- Each additional word has clueCellId

**App Component** (`App.tsx`)
- Hint button with usage counter
- TICK timer (100ms interval) for clue expiration
- Event display for HINT_APPLIED, CLUE_APPLIED
- Haptic feedback on word found

**Grid Component** (`Grid.tsx`)
- Accepts hintCells and clueCells props
- Renders hint/clue CSS classes on cells
- Visual overlays for both hint and clue states

**Styling** (`Grid.css`, `App.css`)
- Yellow pulsing border for hints (hint-pulse animation)
- Purple pulsing border for clues (clue-pulse animation)
- Button states and controls layout
- Event color coding

### ✅ Content Scaling (Day 3-4 - Complete)

**Puzzle Index System** (`puzzles/index.json`)
- Metadata for all puzzles (id, path, title, difficulty, gridSize, estimatedMinutes, description)
- Version tracking
- 5 puzzles total

**New Puzzles Created:**
1. **easy-01.json** (Short Path) - 3x3 grid, 3 words (CAT, TOP, BOX)
2. **easy-02.json** (Simple Square) - 4x4 grid, 4 words (FIRE, LINK, OWED, WIND)
3. **medium-01.json** (Hidden Words) - 6x6 grid, 6 path words + 2 additional (STONE→r0c1, FLOW→r2c1)
4. **medium-02.json** (Crossroads) - 5x5 grid, 5 path words + 3 additional (OUR, HUM, RIM)

**Puzzle Selector UI** (`App.tsx`, `App.css`)
- Dropdown in header to switch puzzles
- Puzzle metadata display (difficulty badge, grid size, time estimate)
- Color-coded difficulty badges (green=easy, yellow=medium, red=hard)
- Responsive layout for mobile
- State resets when switching puzzles

### ✅ Core MVP (Still Complete)

**Engine Package** (`packages/engine`)
- Pure TypeScript game logic
- 18 unit tests (all passing)
- O(1) word validation
- BFS connectivity check
- Zero DOM dependencies

**Web App** (`apps/web`)
- React 18 + Vite 6
- RAY_8DIR drag selection
- Path highlighting
- Completion screen
- Reset functionality

**Documentation**
- README.md - Quick start
- CLAUDE.md - Developer guide
- OPERATIONS.md - Workflow details
- TESTING_GUIDE.md - How to test
- NEXT_STEPS.md - Prioritized roadmap (needs update)
- IMPLEMENTATION_SUMMARY.md - What was built
- spec-v1.0.md - Complete game specification

**Deployment**
- GitHub Actions workflow
- Vite configured for GitHub Pages
- Automatic deployment on push to main

## Known Issues & Gaps

### 🟢 Resolved (This Sprint)

1. ✅ **Pointer capture** - Fixed with setPointerCapture()
2. ✅ **Page scrolls during drag** - Fixed with touch-action: none + preventDefault
3. ✅ **Selection direction jitter** - Fixed with hysteresis
4. ✅ **No haptic feedback** - Added navigator.vibrate()
5. ✅ **No hints system** - Implemented unlimited hints
6. ✅ **No additional words** - Implemented with clue system
7. ✅ **Single puzzle only** - Now have 5 puzzles with selector

### 🟡 Important (Sprint Gaps - Day 5)

1. **No E2E tests for new mechanics** - Need tests for hints, clues, puzzle switching
2. **No mobile-specific E2E tests** - Need touch interaction tests
3. **E2E tests not in CI** - Need GitHub Actions integration
4. **Validator doesn't check additional words** - Need enhanced validation

### 🟢 Nice-to-Have (Future)

5. **Grid re-renders on every pointer move** - Performance issue (not critical)
6. **No accessibility** - Missing ARIA labels, keyboard nav
7. **No persistence** - Progress doesn't save
8. **No skin system** - Only default visuals
9. **Bundle size not optimized** - ~150KB could be smaller

## Day 5 Remaining Tasks (Testing)

### E2E Tests for New Mechanics (2 hours)

**Add test cases to `apps/web/tests/smoke.spec.ts`:**
- [ ] Hint button marks cell with yellow overlay
- [ ] Hint counter increments
- [ ] Additional word found shows purple clue overlay
- [ ] Clue expires after 3 seconds
- [ ] Puzzle selector switches puzzles
- [ ] State resets when switching puzzles

### Mobile-Specific E2E Tests (1 hour)

**New file: `apps/web/tests/mobile.spec.ts`**
- [ ] Touch drag selection works
- [ ] Pointer capture prevents drops
- [ ] No page scroll during selection
- [ ] Haptic feedback triggers (can't test directly, but verify event)

### CI Integration (30 min)

**Update `.github/workflows/test.yml`:**
- [ ] Install Playwright browsers
- [ ] Run E2E tests
- [ ] Upload test results on failure

### Enhanced Validation (1 hour)

**Update `packages/generator/src/validator.ts`:**
- [ ] Validate additional words exist
- [ ] Check clueCellId exists in grid
- [ ] Verify clueCellId is not VOID
- [ ] Validate cluePersistMs >= 0
- [ ] Check for placement overlaps (warning)

## Performance Baseline

Current metrics (updated):
- Bundle size: ~154KB (gzipped: 49.87 kB)
- First load: ~200ms
- Grid render: Dynamic (9-36 cells depending on puzzle)
- Selection lag: <1ms (with hysteresis)
- Test suite: 18 unit tests + 0 E2E tests (need to add)
- Puzzles: 5 total (2 easy, 2 medium, 1 sample)

## Repository Health

### Green
- ✅ Tests passing (18/18 unit)
- ✅ Builds without errors
- ✅ TypeScript strict mode
- ✅ GitHub Actions configured
- ✅ Documentation complete
- ✅ Mobile UX hardened
- ✅ Core mechanics implemented
- ✅ Multiple puzzles available

### Needs Attention
- ⚠️ E2E tests need to cover new mechanics
- ⚠️ Validator needs additional word checks
- ⚠️ 5 moderate security vulnerabilities (transitive deps)
- ⚠️ Bundle size not optimized

## Quick Commands Reference

```bash
# Development
npm install           # Install all dependencies
npm run dev           # Start dev server
npm test              # Run unit tests (18 tests)
npm run build         # Build for production
npm run precommit     # Run all checks (lint + typecheck + test + build)

# Testing
cd apps/web && npm run dev:network  # Test on mobile

# Validation
npm run validate puzzles/sample.json  # Validate puzzle

# Verification
./verify.sh           # Health check script (if exists)
```

## Architecture Review Results

### ✅ Strengths

1. **Engine-first design** - Pure logic, testable, deterministic
2. **Clean separation** - No DOM in engine
3. **TypeScript strict** - Type safety throughout
4. **Monorepo structure** - Clear package boundaries
5. **Mobile-ready** - Pointer capture, hysteresis, haptics
6. **Extensible mechanics** - Hints and clues integrated cleanly

### ⚠️ Areas for Improvement

1. **E2E Coverage** - New mechanics not tested (Day 5)
2. **Performance** - Grid re-renders excessively (not critical yet)
3. **Accessibility** - Missing ARIA, keyboard nav
4. **Scalability** - Need puzzle validation enhancements
5. **Experimentation** - No A/B testing yet (Sprint B)

## Questions & Answers

**Q: Can I test on my phone right now?**
A: Yes! Run `cd apps/web && npm run dev:network` and visit the Network URL on your phone. Touch handling is now production-ready.

**Q: How do hints work?**
A: Click 💡 Hint button to reveal one cell from an unfound path word. Yellow pulsing border shows the hint. Hints are unlimited.

**Q: What are additional words?**
A: Words that aren't part of the main path. Finding them reveals a clue (purple pulsing cell) that points to a path word cell for 3 seconds.

**Q: How do I add a new puzzle?**
A: Create JSON in `puzzles/`, add entry to `puzzles/index.json`, run `npm run validate puzzles/your-puzzle.json`. It will appear in the dropdown automatically.

**Q: Is it production-ready?**
A: Core mechanics and mobile UX are production-ready! E2E tests need to be added for full confidence (Day 5 work).

**Q: Can I deploy this now?**
A: Yes! Push to main and GitHub Actions will deploy automatically. Mobile UX is hardened and ready for users.

## Next Conversation Starting Points

When you return to this project, start with:

1. **"Let's add E2E tests for the new mechanics"** - Cover hints, clues, puzzle switching
2. **"Let's enhance the validator"** - Check additional words, clue cells
3. **"Let's implement the skin system"** - CIRCUIT + CLASSIC skins (Sprint B)
4. **"Let's optimize performance"** - Memoize cells, reduce re-renders
5. **"Let's add accessibility"** - ARIA labels, keyboard navigation

## Success Criteria (Current Sprint)

### Day 1: Mobile UX ✅ Complete
- [x] Pointer capture fixed
- [x] Touch-action verified
- [x] Selection hysteresis added
- [x] Haptic feedback implemented

### Day 2-3: Core Mechanics ✅ Complete
- [x] Hints system (unlimited)
- [x] Additional words category
- [x] Clue marking system
- [x] TICK timer for expiration
- [x] 18 unit tests passing

### Day 3-4: Content & UI ✅ Complete
- [x] Sample puzzle extended
- [x] 4 new puzzles created
- [x] Puzzle index system
- [x] Puzzle selector UI
- [x] Hint/clue visual overlays

### Day 5: Testing ⏳ Pending
- [ ] E2E tests for hints/clues
- [ ] Mobile-specific E2E tests
- [ ] CI integration
- [ ] Enhanced validation

---

**Bottom Line:** Days 1-4 of the post-MVP sprint are complete! Mobile UX is hardened, core mechanics (hints + additional words + clues) are implemented and tested, and we now have 5 puzzles with a selector UI. Day 5 testing tasks remain to add E2E coverage for the new mechanics.
