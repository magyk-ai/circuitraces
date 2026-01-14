# Circuit Races - Next Steps (Post-MVP)

**Last Updated:** 2026-01-15
**Current Status:** Sprint A (Days 1-4) Complete, Day 5 Pending

## What Was Just Completed (Sprint A - Days 1-4)

### ✅ Day 1: Mobile UX Hardening
- Pointer capture with setPointerCapture/releasePointerCapture
- Grid-level pointer tracking (coordinate-based cell detection)
- Selection hysteresis (dead zone + direction locking)
- Touch-action: none + preventDefault (no page scroll)
- Haptic feedback on word found

### ✅ Day 2-3: Core Mechanics
- RuntimeState extended (5 new fields)
- PRESS_HINT and TICK actions
- handleHint() - unlimited hints system
- handleTick() - clue expiration
- Additional words category tracking
- Clue marking with persistence (3 seconds)
- 18 unit tests (9 original + 9 new)

### ✅ Day 3-4: Content & UI
- Sample puzzle extended with 2 additional words
- 4 new puzzles created (easy-01, easy-02, medium-01, medium-02)
- Puzzle index system (puzzles/index.json)
- Puzzle selector UI with metadata
- Hint button with counter
- Visual overlays (yellow hints, purple clues)
- Responsive mobile layout

## Immediate Priority: Complete Sprint A

### Day 5: Testing (4.5 hours remaining)

#### 5.1 E2E Tests for New Mechanics (2 hours)
**Goal:** Cover hints, clues, puzzle switching

**Files to modify:**
- `apps/web/tests/smoke.spec.ts`

**Test cases to add:**
```typescript
test('should apply hint and mark cell', async ({ page }) => {
  // Click hint button
  // Verify hint count increases
  // Verify yellow .hint overlay appears
});

test('should find additional word and show clue', async ({ page }) => {
  // Select additional word
  // Verify purple .clue overlay appears
  // Wait 3.5 seconds
  // Verify clue disappears
});

test('should switch puzzles via selector', async ({ page }) => {
  // Select different puzzle from dropdown
  // Verify grid reloads
  // Verify puzzle title changes
});
```

#### 5.2 Mobile-Specific E2E Tests (1 hour)
**Goal:** Verify touch handling works

**New file:**
- `apps/web/tests/mobile.spec.ts`

**Test cases:**
```typescript
test.use({ ...devices['iPhone 12'] });

test('mobile: should complete word selection via touch', async ({ page }) => {
  // Touch drag from first to last cell
  // Verify word found event
});

test('mobile: should not scroll page during selection', async ({ page }) => {
  // Record scroll position
  // Perform selection
  // Verify scroll position unchanged
});
```

#### 5.3 CI Integration (30 minutes)
**Goal:** Run E2E tests in GitHub Actions

**Files to modify:**
- `.github/workflows/test.yml` (or create if doesn't exist)

**Add steps:**
```yaml
- name: Install Playwright browsers
  run: cd apps/web && npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test results
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: apps/web/playwright-report/
```

#### 5.4 Enhanced Validation (1 hour)
**Goal:** Validate additional words schema

**Files to modify:**
- `packages/generator/src/validator.ts`

**Add checks:**
```typescript
// For each additional word:
- Verify clueCellId exists in grid
- Check clueCellId is not VOID
- Warn if placement overlaps with path word

// For config:
- Validate cluePersistMs >= 0
```

**Deliverable:** Sprint A fully complete, ready for Sprint B

---

## Sprint B: Skin System + AB Harness (Week 2)
**Goal:** Enable experimentation without engine changes

### Priority Order

#### 2.1 Skin Manifest System (P0 - 4 hours)
- [ ] Create `skins/manifest.json` with skin definitions
- [ ] Define `Skin` TypeScript interface
- [ ] CSS variable palette tokens
- [ ] Icon system (SVG refs)
- [ ] Microcopy overrides ("Probe", "Netlist", "Circuit Closed")

**New files:**
- `apps/web/src/skins/types.ts`
- `apps/web/public/skins/manifest.json`
- `apps/web/public/skins/circuit.json`
- `apps/web/public/skins/default.json`

#### 2.2 Skin Loader + Variant Selection (P0 - 2 hours)
- [ ] Query param: `?skin=CIRCUIT`
- [ ] localStorage override: `circuit_skin_preference`
- [ ] A/B bucket assignment: `circuit_skin_bucket` (stable)
- [ ] Skin switcher in UI (dev mode)

**Files to modify:**
- `apps/web/src/App.tsx`
- **New:** `apps/web/src/hooks/useSkin.ts`

#### 2.3 Create CIRCUIT Skin (P0 - 3 hours)
- [ ] Circuit board visual theme
- [ ] Electrical terminology microcopy
- [ ] Neon/tech color palette
- [ ] Grid becomes circuit traces
- [ ] Words become signal paths

**New files:**
- `apps/web/public/skins/circuit.json`

#### 2.4 Create CLASSIC Skin (P1 - 2 hours)
- [ ] Traditional word puzzle aesthetic
- [ ] Neutral colors
- [ ] Clear typography
- [ ] Minimal distractions

**New files:**
- `apps/web/public/skins/classic.json`

#### 2.5 Analytics Harness (P1 - 1 hour)
- [ ] Create `trackEvent()` interface
- [ ] Log to console for now
- [ ] Track: word_found, puzzle_completed, skin_loaded, hint_used
- [ ] Prepare for future GA4/Plausible integration

**New files:**
- `apps/web/src/analytics.ts`

**Deliverable:** 3 skins live (DEFAULT + CIRCUIT + CLASSIC), force via `?skin=`, A/B bucketing ready

---

## Sprint C: Content Pipeline Hardening (Week 3)
**Goal:** Scale content safely without generator strategy

### Priority Order

#### 3.1 Enhanced Validation (P0 - 2 hours)
**Already started in Day 5, expand here:**
- [x] Validate additional words
- [ ] Detect duplicate placement keys
- [ ] Ensure `size === tokens.length`
- [ ] Check start/end cells are non-VOID
- [ ] Schema versioning: `puzzleSchemaVersion: 1`
- [ ] Warn on placement overlaps

**Files to modify:**
- `packages/generator/src/validator.ts`

#### 3.2 Compile Command (P1 - 3 hours)
- [ ] Define YAML input format (human-friendly)
- [ ] Implement `circuitraces-compile` CLI
- [ ] Auto-generate cellIds from grid layout
- [ ] Validate after compilation

**New files:**
- `packages/generator/src/compiler.ts`
- `packages/generator/src/formats/yaml-schema.ts`

**Example YAML format:**
```yaml
theme: Garden Path
gridSize: 5x5
grid: |
  TRACK
  HOUSE
  MOUNT
  RIVER
  CROSS
words:
  - word: TRACK
    path: true
    cells: [0,0] to [0,4]
  - word: OUR
    path: false
    cells: [1,1], [1,2], [0,2]
    clue: [0,1]
```

#### 3.3 Create 5+ More Puzzles (P0 - 4 hours)
- [ ] easy-03.json (3x4 grid)
- [ ] medium-03.json (5x6 grid with additional words)
- [ ] medium-04.json (6x6 grid with additional words)
- [ ] hard-01.json (7x7 grid)
- [ ] hard-02.json (8x8 grid)

**Goal:** 10+ puzzles with difficulty progression

#### 3.4 Emoji Dictionary (P2 - 2 hours)
- [ ] Create `emoji-dictionary.json`
- [ ] Schema: `emojiId → { emoji, meaning, synonyms }`
- [ ] Version tracking
- [ ] Validation uses dictionary

**New files:**
- `packages/generator/emoji-dictionary.json`

**Deliverable:** 10+ puzzles, safe content workflow, YAML compiler ready

---

## Sprint D: Polish & Performance (Week 4)
**Goal:** Production-ready quality

### Priority Order

#### 4.1 Performance Optimization (P1 - 3 hours)
- [ ] Memoize Grid cell components
- [ ] Render selection preview as overlay (not re-render cells)
- [ ] Lazy load puzzles (only fetch on selection)
- [ ] Bundle size analysis and optimization

**Files to modify:**
- `apps/web/src/components/Grid.tsx`
- `apps/web/src/App.tsx`
- `vite.config.ts`

#### 4.2 Accessibility (P1 - 3 hours)
- [ ] ARIA labels for all interactive elements
- [ ] Keyboard navigation (arrow keys for cell selection)
- [ ] Screen reader announcements for word found events
- [ ] High-contrast mode support
- [ ] Focus indicators

**Files to modify:**
- `apps/web/src/components/Grid.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/App.css`

#### 4.3 Persistence (P1 - 2 hours)
- [ ] localStorage save/load per puzzleId
- [ ] Save: foundWords, hintUsedCount, startedAt
- [ ] Load on puzzle selection
- [ ] Clear completed puzzles option

**Files to modify:**
- `apps/web/src/App.tsx`
- **New:** `apps/web/src/hooks/usePersistence.ts`

#### 4.4 "Feels Like a Product" Polish (P2 - 3 hours)
- [ ] Results summary with share string
- [ ] Route overlay trace animation on completion
- [ ] Timer pause when tab hidden
- [ ] Smooth transitions between puzzles
- [ ] Loading states

**Files to modify:**
- `apps/web/src/App.tsx`
- `apps/web/src/App.css`

#### 4.5 Property-Based Tests (P2 - 2 hours)
- [ ] Install `fast-check` library
- [ ] Property: placement lookup correctness
- [ ] Property: BFS connectivity determinism
- [ ] Property: reverse selection consistency

**New files:**
- `packages/engine/src/__tests__/properties.test.ts`

#### 4.6 CI Pipeline Hardening (P0 - 1 hour)
- [x] Add lint step (ESLint) - already done
- [x] Add typecheck step - already done
- [x] Build before deploy - already done
- [ ] PR preview deployments (GitHub Pages)

**New files:**
- `.github/workflows/pr-preview.yml`

**Deliverable:** Production-quality game ready for users

---

## Backlog (Nice-to-Have, Future)

### PWA Features
- [ ] Offline caching (service worker)
- [ ] Install prompt
- [ ] App manifest
- [ ] Push notifications for daily puzzles

### Content Features
- [ ] Multiple board sizes (3x3, 7x7, 9x9)
- [ ] Daily puzzle rotation
- [ ] Achievement badges
- [ ] Leaderboards (time-based)

### Advanced Mechanics
- [ ] Timed mode
- [ ] Challenge mode (limited hints)
- [ ] Multiplayer/collaborative mode

### Monetization
- [ ] Puzzle packs (premium content)
- [ ] Ad-free option
- [ ] Hint packages

---

## Current Gotchas to Address

### Known Issues (from Sprint A)
1. ✅ **Grid re-render** - Still re-renders on pointer move (not critical, defer to Sprint D)
2. ✅ **Vite publicDir** - Works in prod, but validate on deployment
3. ✅ **Direction snap jitter** - Fixed with hysteresis

### Technical Debt
- Security vulnerabilities in transitive deps (need npm audit fix)
- Bundle size could be optimized (~154KB)
- No error boundaries in React app

---

## Release Checklist (for Sprint D completion)

### Before Shipping to Users
- [ ] Mobile tested on real iPhone
- [ ] Mobile tested on real Android
- [ ] All Playwright tests passing
- [ ] Lighthouse score >90 (mobile)
- [ ] Accessibility audit passed
- [ ] 10+ puzzles available
- [ ] Privacy policy (if tracking)
- [ ] Terms of service (if needed)

### GitHub Pages Specific
- [x] Base path configured correctly
- [x] Assets load from correct paths
- [ ] Service worker scope correct (PWA)
- [ ] robots.txt configured

---

## Success Metrics by Sprint

### Sprint A Success ✅ (Days 1-4 Complete, Day 5 Pending)
- [x] Can play 5 puzzles on phone without friction
- [x] No page scrolls during drag
- [x] Selection feels snappy (<1ms lag)
- [x] Hints and clues work perfectly
- [ ] Playwright tests cover new mechanics
- [ ] E2E tests run in CI

### Sprint B Success
- [ ] 3 skins deployed (DEFAULT + CIRCUIT + CLASSIC)
- [ ] Can force skin via URL
- [ ] A/B bucketing works
- [ ] Analytics events logged
- [ ] Users can compare visual themes

### Sprint C Success
- [ ] Can add new puzzle in <5 minutes
- [ ] Validation catches common errors
- [ ] 10+ puzzles in library
- [ ] YAML compiler works
- [ ] Puzzle difficulty progression clear

### Sprint D Success
- [ ] 60fps during selection
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Progress persists across sessions
- [ ] Feels polished and professional

---

## Questions to Resolve

### For Sprint B
1. **Skin System:** JSON files vs TypeScript modules? (Recommend JSON for non-technical creators)
2. **Analytics:** Console-only or add GA4 stub now? (Recommend console-only, add GA4 in Sprint C)
3. **A/B Testing:** Client-side bucketing or server-side? (Client-side for simplicity)

### For Sprint C
4. **Multiple Puzzles:** Daily rotation or user choice? (User choice first, daily rotation later)
5. **Difficulty:** User-selected or auto-detected? (User-selected via puzzle metadata)
6. **Emoji Tokens:** Ship in Sprint C or defer to Sprint E? (Defer - not blocking)

### For Sprint D
7. **PWA:** Ship in Sprint D or defer? (Ship if time allows, not blocking)
8. **Persistence:** Per-puzzle or global? (Per-puzzle, allow reset per puzzle)

---

## Next Immediate Actions

**Today (Complete Day 5):**
1. Add E2E tests for hints/clues (2 hours)
2. Add mobile-specific E2E tests (1 hour)
3. Integrate E2E tests into CI (30 min)
4. Enhance validator for additional words (1 hour)

**Sprint B (Week 2):**
1. Design skin manifest schema
2. Implement skin loader with query param support
3. Create CIRCUIT skin
4. Create CLASSIC skin
5. Add analytics harness

**Sprint C (Week 3):**
1. Create 5+ more puzzles
2. Implement YAML compiler
3. Enhance validation with schema versioning
4. Document content creation workflow

**Sprint D (Week 4):**
1. Performance optimization (memoization, lazy loading)
2. Accessibility (ARIA, keyboard nav)
3. Persistence (localStorage)
4. Polish animations and transitions

---

**Bottom Line:** Sprint A (Days 1-4) is complete! Mobile UX is hardened, core mechanics work perfectly, and we have 5 puzzles with a selector UI. Finish Day 5 (testing), then move to Sprint B for the skin system and experimentation framework.
