# Circuit Races - Next Steps (Post-MVP)

Based on architectural review and mobile-first priorities.

## Priority Order

### Sprint A: Mobile UX Hardening + Testing (Week 1)
**Goal:** Ship-quality mobile experience + automated QA

#### 1.1 Mobile Touch Correctness (P0)
- [ ] Add `touch-action: none` to grid container
- [ ] Implement `setPointerCapture()` on pointerdown
- [ ] Handle `pointercancel` reliably (incoming call, OS gestures)
- [ ] Test on iOS Safari + Chrome Android

**Files to modify:**
- `apps/web/src/components/Grid.tsx`
- `apps/web/src/components/Grid.css`

#### 1.2 Selection Snapping Polish (P0)
- [ ] Add dead-zone for direction snap stability
- [ ] Implement hysteresis to prevent jitter when dx≈dy
- [ ] Clamp selection at VOID cells and grid edges
- [ ] Add visual feedback for invalid drags

**Files to modify:**
- `apps/web/src/selection-adapter.ts`

#### 1.3 Haptics & Feedback (P1)
- [ ] Light haptic on word found (navigator.vibrate)
- [ ] Subtle invalid selection feedback (shake CSS animation)
- [ ] Success animation on completion

**Files to modify:**
- `apps/web/src/App.tsx`
- `apps/web/src/App.css`

#### 1.4 Playwright E2E Tests (P0)
- [ ] Install Playwright
- [ ] Smoke test: load app, select words, complete puzzle
- [ ] Test: invalid selection handling
- [ ] Test: reset functionality
- [ ] CI integration

**New files:**
- `apps/web/playwright.config.ts`
- `apps/web/tests/smoke.spec.ts`
- `apps/web/tests/selection.spec.ts`

**Deliverable:** Mobile QA checklist + Playwright suite running in CI

---

### Sprint B: Skin System + AB Harness (Week 2)
**Goal:** Enable experimentation without engine changes

#### 2.1 Skin Manifest System (P0)
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

#### 2.2 Skin Loader + Variant Selection (P0)
- [ ] Query param: `?skin=CIRCUIT`
- [ ] localStorage override: `circuit_skin_preference`
- [ ] A/B bucket assignment: `circuit_skin_bucket` (stable)
- [ ] Skin switcher in UI (dev mode)

**Files to modify:**
- `apps/web/src/App.tsx`
- **New:** `apps/web/src/hooks/useSkin.ts`

#### 2.3 Analytics Harness (P1)
- [ ] Create `trackEvent()` interface
- [ ] Log to console for now
- [ ] Track: word_found, puzzle_completed, skin_loaded
- [ ] Prepare for future GA4/Plausible integration

**New files:**
- `apps/web/src/analytics.ts`

**Deliverable:** 2 skins live (CIRCUIT + CLASSIC), force via `?skin=`

---

### Sprint C: Content Pipeline Readiness (Week 3)
**Goal:** Make content safe to add without generator strategy

#### 3.1 Enhanced Validation (P0)
- [ ] Detect duplicate placement keys
- [ ] Ensure `size === tokens.length`
- [ ] Validate `clueCellId` (future-proof)
- [ ] Check start/end cells are non-VOID
- [ ] Schema versioning: `puzzleSchemaVersion: 1`

**Files to modify:**
- `packages/generator/src/validator.ts`

#### 3.2 Compile Command (P1)
- [ ] Define YAML input format (human-friendly)
- [ ] Implement `circuitraces-compile` CLI
- [ ] Auto-generate cellIds from grid layout
- [ ] Validate after compilation

**New files:**
- `packages/generator/src/compiler.ts`
- `packages/generator/src/formats/yaml-schema.ts`

#### 3.3 Emoji Dictionary (P1)
- [ ] Create `emoji-dictionary.json`
- [ ] Schema: `emojiId → { emoji, meaning, synonyms }`
- [ ] Version tracking
- [ ] Validation uses dictionary

**New files:**
- `packages/generator/emoji-dictionary.json`

#### 3.4 Puzzle Index System (P0)
- [ ] Create `puzzles/index.json` listing available puzzles
- [ ] Add puzzle metadata (difficulty, date, theme)
- [ ] Query param: `?puzzle=puzzles/daily-001.json`
- [ ] Puzzle selector UI (simple dropdown)

**New files:**
- `puzzles/index.json`
- **Modified:** `apps/web/src/App.tsx`

**Deliverable:** Drop-in puzzle workflow (add JSON → validate → appears in app)

---

### Sprint D: Automated QA Expansion (Week 4)
**Goal:** Confidence at integration layer

#### 4.1 Property-Based Tests (P1)
- [ ] Install `fast-check` library
- [ ] Property: placement lookup correctness
- [ ] Property: BFS connectivity determinism
- [ ] Property: reverse selection consistency

**New files:**
- `packages/engine/src/__tests__/properties.test.ts`

#### 4.2 CI Pipeline Hardening (P0)
- [ ] Add lint step (ESLint)
- [ ] Add typecheck step
- [ ] Ensure build step runs before deploy
- [ ] PR preview deployments (GitHub Pages)

**Modified:**
- `.github/workflows/deploy.yml`
- **New:** `.github/workflows/pr-preview.yml`

**Deliverable:** Green pipeline that blocks regressions

---

## Backlog (Nice-to-Have)

### Performance Optimization
- [ ] Memoize Grid cell components
- [ ] Render selection preview as overlay (not re-render cells)
- [ ] Lazy load puzzles
- [ ] Bundle size analysis

### "Feels Like a Product" Polish
- [ ] Results summary with share string
- [ ] Progress persistence per puzzleId
- [ ] Timer pause when tab hidden
- [ ] Route overlay trace animation on completion

### PWA Features
- [ ] Offline caching (service worker)
- [ ] Install prompt
- [ ] App manifest

### Content Features
- [ ] Multiple board sizes (3x3, 7x7, 9x9)
- [ ] Difficulty tiers (easy/medium/hard)
- [ ] Daily puzzle rotation
- [ ] Achievement badges

### Accessibility
- [ ] High-contrast mode
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] ARIA labels for all interactive elements

---

## Mobile QA Checklist (for Sprint A)

### Touch Handling
- [ ] No page scroll during selection
- [ ] Selection doesn't drop on fast swipe
- [ ] `pointercancel` handled (incoming call)
- [ ] Works in both portrait and landscape

### Visual Feedback
- [ ] Selection preview is smooth
- [ ] No jank during drag
- [ ] Found words highlight immediately
- [ ] Invalid selection shows feedback

### Performance
- [ ] 60fps during selection
- [ ] No dropped frames
- [ ] Battery usage reasonable
- [ ] Works on lower-end devices

### Browsers
- [ ] iOS Safari (latest)
- [ ] iOS Safari (iOS 15+)
- [ ] Chrome Android (latest)
- [ ] Samsung Internet
- [ ] Firefox Android

---

## Current Gotchas to Fix

### Identified Issues
1. **Vite publicDir** - Currently serves `../../puzzles`, may not work in prod build
2. **Grid re-render** - Entire grid re-renders on pointer move
3. **No pointer capture** - Selection can drop
4. **Direction snap jitter** - RAY_8DIR unstable when diagonal
5. **npm workspace scripts** - Need better error handling

### Quick Wins
- Add `touch-action: none` (5 min fix)
- Add `setPointerCapture()` (10 min fix)
- Add Playwright smoke test (30 min)
- Create second skin (CLASSIC) (1 hour)

---

## Release Checklist (for Sprint A completion)

### Before Shipping to Users
- [ ] Mobile tested on real iPhone
- [ ] Mobile tested on real Android
- [ ] All Playwright tests passing
- [ ] Lighthouse score >90 (mobile)
- [ ] Works in offline mode (PWA)
- [ ] Privacy policy (if tracking)
- [ ] Terms of service (if needed)

### GitHub Pages Specific
- [ ] Base path configured correctly
- [ ] Assets load from correct paths
- [ ] Service worker scope correct
- [ ] robots.txt configured

---

## Next Immediate Actions

**Today:**
1. Install Playwright
2. Fix pointer capture in Grid.tsx
3. Add `touch-action: none`
4. Write first smoke test

**This Week:**
1. Complete mobile touch hardening
2. Test on real devices
3. Add hysteresis to selection adapter
4. Get Playwright suite running in CI

**Next Week:**
1. Implement skin system
2. Create CIRCUIT + CLASSIC skins
3. Add analytics harness

---

## Questions to Resolve

1. **Skin System:** JSON files vs TypeScript modules?
2. **Analytics:** Console-only or add GA4 stub now?
3. **PWA:** Ship in Sprint A or defer?
4. **Multiple Puzzles:** Index file structure?
5. **Difficulty:** User-selected or auto-detected?

---

## Success Metrics

### Sprint A Success
- [ ] Can play 5 puzzles on phone without friction
- [ ] No page scrolls during drag
- [ ] Selection feels snappy (<1ms lag)
- [ ] Playwright tests cover happy path

### Sprint B Success
- [ ] 2 skins deployed
- [ ] Can force skin via URL
- [ ] A/B bucketing works
- [ ] Analytics events logged

### Sprint C Success
- [ ] Can add new puzzle in <5 minutes
- [ ] Validation catches common errors
- [ ] Puzzle selector UI works
- [ ] 5+ puzzles in library

### Sprint D Success
- [ ] CI blocks broken builds
- [ ] Property tests catch edge cases
- [ ] PR previews work
- [ ] No manual QA needed for simple changes
