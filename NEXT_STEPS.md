# Circuit Races - Next Steps

**Last Updated:** 2026-01-16
**Current Status:** PR #5 (Daily Puzzle Infrastructure) Complete ✅, Ready for PR #6 (Content Production)

## Completed PRs

### PR #1: Puzzle Auditor ✅
- Created `packages/generator/src/auditor.ts`
- Added `npm run audit` command
- 7 validation checks (solvability, intersection, single placement, etc.)

### PR #2: Engine + Puzzle Migration ✅
- Removed TICK action (timer is UI-only)
- Removed clue expiry (hints persist indefinitely)
- Added `hintUsedFromButton` and `hintRevealedFromBonus`
- Added `HINT_APPLIED { source }` event
- Added `getAdditionalWordCells()` selector
- Migrated all puzzles to v1.1 schema
- Updated tests (20 tests passing)

### PR #2.5: Spec Sync ✅
- Updated spec-v1.0.md with PR #2 reality
- Added MUST statements for mechanics invariants
- Added auditor validation rules
- Added Migrations section (Section 16)
- Added Changelog (Section 17)

### PR #4: E2E Tests + Auditor Hardening ✅
- 4 Playwright E2E smoke tests
- 42 unit tests total (26 engine + 16 auditor)
- Auditor with 14 stable error codes
- Spec-lock invariant tests
- CI integration for E2E tests

### PR #5: Daily Puzzle Infrastructure ✅
- Home screen with daily card + 7 topic tiles
- Query param routing (no React Router)
- Static daily schedule + topic catalogs
- React hooks: useDailyPuzzle, useTopicIndex
- Sample daily puzzle: "Product Signals" (PM themed)
- Stable conventions: puzzleId, contentVersion, revision
- Dev mode (?dev=1) for QA
- All 42 tests passing, build successful

### PR #3: UI Fidelity ✅
- Timer + pause UI with auto-pause on tab hidden
- Gray rendering for additional word cells
- Yellow rendering (solid background) for hint cells
- Visual priority: preview > path > hint > additional > base
- Words List modal (found/unfound with sizes)
- Emoji tap-to-reveal deferred (engine doesn't have EMOJI cells)

---

## Next Up: PR #5 — Daily Puzzle Infrastructure

**Goal:** Static daily/topic indexes + routing + home screen

### Scope

**Static files to create:**
- `apps/web/public/daily/index.json` — Schedule with `contentVersion`, `revision` fields
- `apps/web/public/daily/2026-01-17.json` — Sample daily puzzle (`puzzleId: "daily-2026-01-17"`)
- `apps/web/public/topics/index.json` — Master topic list (7 topics)
- `apps/web/public/topics/product-management/index.json` — PM catalog (1 entry pointing to daily)

**New components:**
- `apps/web/src/components/HomeScreen.tsx` — Daily card + topic grid
- `apps/web/src/components/TopicBrowser.tsx` — Puzzle list for topic
- `apps/web/src/hooks/useDailyPuzzle.ts` — Load daily index, resolve today (UTC)
- `apps/web/src/hooks/useTopicIndex.ts` — Load topic catalog
- `apps/web/src/types/content.ts` — TypeScript types (`DailySchedule`, `TopicCatalog`)

**Routing (query params):**
- `/` → Home screen
- `?mode=daily` → Today's puzzle
- `?mode=daily&daily=2026-01-17` → **Canonical daily share link**
- `?topic=product-management` → Topic browser
- `?topic=product-management&puzzle=pm-001` → **Canonical topic share link**
- `?dev=1` → Show puzzle selector dropdown (hidden by default)

**Key conventions enforced:**
- All daily puzzles: `puzzleId = "daily-YYYY-MM-DD"`
- All topic puzzles: `puzzleId` matches catalog entry `id`
- `contentVersion` at index level for batch updates
- `revision` per puzzle entry for individual changes

### Acceptance Criteria
- [ ] Home screen shows daily card + 7 topic tiles
- [ ] `?mode=daily` loads today's puzzle (or latest fallback)
- [ ] Canonical share URLs work correctly
- [ ] `?dev=1` shows puzzle selector
- [ ] All `puzzleId` values follow conventions
- [ ] All existing tests pass (42 unit + 4 E2E)

---

## Future: PR #6 — Content Production

**Goal:** 7 daily puzzles + topic library baseline + QA metrics

### Scope

**Content:**
- 6 more daily puzzles (2026-01-18 through 2026-01-23)
- Topic indexes for remaining 6 topics
- At least 1 puzzle per topic (can reference daily files)

**Content QA script:**
- `packages/generator/src/content-qa.ts` — Report stats (not a generator)
  - Grid size, PATH/BONUS counts, word lengths
  - Non-hint intersection count
  - BFS `pathLength` from auditor
  - **Warning** if pathLength > 70% of PATH tiles
- Add `npm run content-qa` command

**LLM wordlist generation:**
- Use enhanced prompt (ranked candidates: top 10 + 10 backups)
- **MUST NOT** include morphological variants or substrings
- Explicit avoid list reinforcement

### Validation
- [ ] All puzzles pass `npm run audit`
- [ ] All `puzzleId` values follow naming conventions
- [ ] Content QA metrics run without warnings
- [ ] Mobile playtest complete (solvability + feel)

---

## Sprint B: Skin System (Future)

### Scope
1. Skin manifest system (`skins/manifest.json`)
2. CSS variable palette tokens
3. Query param override (`?skin=CIRCUIT`)
4. A/B bucket assignment
5. CIRCUIT skin (PCB traces)
6. CLASSIC skin (traditional)
7. Analytics harness

### Skin Contract
```typescript
interface Skin {
  id: string;
  palette: {
    pathFound: string;    // green
    hintMarked: string;   // yellow
    additionalFound: string; // gray
    tileBase: string;
  };
  microcopy: {
    hintButton: string;   // "Hint" or "Probe"
    wordsButton: string;  // "Words" or "Netlist"
  };
}
```

---

## Quick Reference

### Commands
```bash
npm run dev          # Dev server
npm test             # Unit tests (20 tests)
npm run precommit    # Full check
npm run audit <path> # Validate puzzle
```

### Key Files for PR #3
- `apps/web/src/App.tsx` — timer, pause
- `apps/web/src/components/Grid.tsx` — gray/yellow rendering
- `apps/web/src/components/Grid.css` — new styles
- `apps/web/src/components/WordsList.tsx` — NEW

### Visual Priority (from spec 2.2.1)
1. Preview (purple) — during drag
2. Path-found (green) — overrides all
3. Hint-marked (yellow)
4. Additional-found (gray)
5. Base (neutral)

---

**Bottom Line:** PR #3 (UI Fidelity) is complete. PR #4 (E2E Tests) is next — implement Playwright tests for hint persistence, gray/yellow rendering, timer/pause, and Words List modal.
