# Circuit Races - Current Status

**Last Updated:** 2026-01-16
**Status:** PR #5 (Daily Puzzle Infrastructure) Complete ✅, Ready for PR #6 (Content Production)

## Recent Changes (PR #5 - 2026-01-16)

### Daily Puzzle Infrastructure
**Status:** ✅ Complete and validated

#### New Features
- **Home screen** with daily puzzle card + 7 topic tiles (vibrant gradient design)
- **Query param routing** without React Router (`/?mode=daily`, `/?topic=...`, `/?dev=1`)
- **UTC-based daily scheduling** with automatic fallback to latest puzzle
- **Topic browser** with puzzle catalogs and difficulty badges
- **Canonical share URLs** for puzzles (stable format for future "Copy link" feature)
- **Dev mode** (`?dev=1`) reveals legacy puzzle selector for QA

#### Static Content Files
- `apps/web/public/daily/index.json` - Daily schedule with contentVersion tracking
- `apps/web/public/daily/2026-01-17.json` - "Product Signals" puzzle (5×5, Product Management)
- `apps/web/public/topics/index.json` - 7 topics: PM, DevOps, Personal Finance, Design, Cybersecurity, Finance & Accounting, Physiotherapy
- `apps/web/public/topics/product-management/index.json` - PM catalog (points to daily puzzle)

#### React Infrastructure
- `apps/web/src/types/content.ts` - TypeScript types for catalogs
- `apps/web/src/hooks/useDailyPuzzle.ts` - Daily puzzle loading with UTC resolution
- `apps/web/src/hooks/useTopicIndex.ts` - Topic master + catalog loading
- `apps/web/src/components/HomeScreen.tsx` + `.css` - Home view component
- `apps/web/src/components/TopicBrowser.tsx` + `.css` - Topic browser component

#### Modified
- `apps/web/src/App.tsx` - Integrated view routing + navigation handlers
- `AGENTS.md` - Created pointer to CLAUDE.md development playbook

#### Conventions Enforced
- ✅ Daily puzzles: `puzzleId = "daily-YYYY-MM-DD"`
- ✅ Topic puzzles: `puzzleId` matches catalog entry `id`
- ✅ `contentVersion` at index level for cache invalidation
- ✅ `revision` per puzzle entry for individual changes

#### Validation Results
- ✅ Lint: Clean
- ✅ Typecheck: Passed
- ✅ Tests: All 42 passing (26 engine + 16 auditor)
- ✅ Build: Successful (163KB gzipped)

---

## Previous Changes (PR #4 - 2026-01-16)

### PR #4: Testing + Auditor Hardening ✅
- **42 unit tests** (26 engine + 16 auditor)
- **Auditor error codes** (14 stable codes for testable assertions)
- **Fixture-driven tests** (12 bad puzzle fixtures)
- **Spec-lock invariant tests** (6 tests for hint persistence, accumulation, determinism, connectivity)

### PR #5: Daily Puzzle Infrastructure ✅
- **Home screen** with daily card + 7 topic tiles
- **Query param routing** (no React Router)
- **Static content files** (daily + topic indexes)
- **React hooks** (useDailyPuzzle, useTopicIndex)
- **Sample daily puzzle** - "Product Signals" (Product Management themed)
- **Stable conventions** (puzzleId, contentVersion, revision)
- **Dev mode** for QA (`?dev=1`)

### Playwright E2E Smoke Tests
- **4 minimal smoke tests** (UI wiring verification)
- Test 1: Drag-select PATH word → green tiles
- Test 2: Drag-select BONUS word → gray + yellow hint
- Test 3: Hint persists after pause/resume
- Test 4: Words modal open/close
- **data-testid attributes** added for stable selectors

### CI Integration
- GitHub Actions workflow updated with E2E job
- Chromium-only for speed in CI
- Playwright browser installation step

### Auditor Improvements
- **O(1) neighbor lookup** via posMap (was O(N) scan)
- **ERR_PLACEMENT_CELL_NOT_FOUND** check added
- **14 error codes** for all validation rules

### Spec Updates
- Emoji tiles marked as **deferred to v1.2**
- Current engine only supports LETTER and VOID cells

## Previous Changes (PR #3 - 2026-01-16)

### Timer + Pause UI
- **Elapsed timer** displays in header (MM:SS format)
- **Pause button** toggles pause state
- **Auto-pause** when tab hidden (Page Visibility API)
- **Timer resets** on puzzle switch
- **Timer stops** on puzzle completion

### Gray + Yellow Rendering
- **Additional word cells** render gray when bonus word is found
- **Hint cells** render solid yellow (not just border)
- **Priority order** enforced: preview > path (green) > hint (yellow) > additional (gray) > base

### Words List UI
- **Words button** opens modal overlay
- **Theme Words section** shows path words (found: full text, unfound: placeholders)
- **Bonus Words section** shows additional words (same pattern)
- **Progress stats** in footer

### Deferred to v1.2
- **Emoji tap-to-reveal** - Engine doesn't have EMOJI cell type yet (only LETTER | VOID)

## What Works Now

### Daily Puzzle Infrastructure (v1.0)
```typescript
// Routes
/ → Home screen (daily card + topics)
/?mode=daily → Today's puzzle
/?mode=daily&daily=YYYY-MM-DD → Specific daily (canonical)
/?topic=TOPIC_ID → Topic browser
/?topic=TOPIC_ID&puzzle=PUZZLE_ID → Specific puzzle (canonical)
/?dev=1 → Show puzzle selector (QA mode)

// Content Loading
useDailyPuzzle(date?) → { todaysPuzzle, schedule, loading, error }
useTopicIndex() → { index, loading, error }
useTopicCatalog(topicId) → { catalog, loading, error }
```

### Engine (v1.1)
```typescript
// Actions
type EngineAction =
  | { type: 'SELECT'; cellIds: string[] }
  | { type: 'PRESS_HINT' }
  | { type: 'RESET' };

// Events
type EngineEvent =
  | { type: 'WORD_FOUND'; wordId: string; category: 'PATH' | 'ADDITIONAL' }
  | { type: 'ALREADY_FOUND'; wordId: string }
  | { type: 'INVALID_SELECTION' }
  | { type: 'HINT_APPLIED'; cellId: string; source: HintSource }
  | { type: 'COMPLETED'; completedAt: number };

// Selectors
getPathCells(puzzle, state)           // → green cells
getAdditionalWordCells(puzzle, state) // → gray cells
getHintCells(state)                   // → yellow cells
isConnected(puzzle, state)            // → win check
```

### UI Features (v1.1)
- Timer with MM:SS display
- Pause/resume with overlay
- Auto-pause on tab hidden
- Gray rendering for found bonus words
- Yellow rendering for hints (solid background)
- Words List modal with found/unfound tracking
- Puzzle selector dropdown
- Hint button with usage counter
- Reset button

### Tests
- **42 unit tests passing** (26 engine + 16 auditor)
- **4 E2E smoke tests passing**
- Engine tests verify v1.1 state shape and events
- Auditor tests cover all error codes (fixture-driven)
- Spec-lock invariant tests for hint persistence, accumulation, connectivity

### Puzzles
- 5 puzzles, all pass auditor checks
- `easy-01.json` — Short Path (3x3)
- `easy-02.json` — Simple Square (4x4)
- `medium-01.json` — Hidden Words (6x6, 2 additional words)
- `medium-02.json` — Crossroads (5x5, 3 additional words)
- `puzzles/sample.json` — Test puzzle (5x5)

## Quick Commands

```bash
# Development
npm run dev              # Start dev server
npm test                 # Run unit tests (42 tests)
npm run test:e2e         # Run E2E tests (4 tests)
npm run precommit        # Full check (lint + typecheck + test + build)

# Auditor
npm run audit apps/web/public/puzzles/medium-01.json

# Mobile testing
cd apps/web && npm run dev:network
```

## Auditor Error Codes

| Code | Description |
|------|-------------|
| ERR_SCHEMA_INVALID | JSON doesn't match WaywordsPuzzle schema |
| ERR_MULTI_PLACEMENT | Word has multiple placements (must be exactly 1) |
| ERR_UNSOLVABLE | START→END not reachable via path words |
| ERR_START_VOID | Start cell is VOID |
| ERR_START_NOT_IN_PATH | Start cell not in any path word |
| ERR_END_VOID | End cell is VOID |
| ERR_END_NOT_IN_PATH | End cell not in any path word |
| ERR_HINT_NOT_FOUND | hintCellId doesn't exist in grid |
| ERR_HINT_VOID | hintCellId is a VOID cell |
| ERR_HINT_NOT_IN_BONUS | hintCellId not in bonus word's placement |
| ERR_HINT_NOT_IN_PATH | hintCellId not in any path word |
| ERR_DUP_PLACEMENT | Duplicate placement key |
| ERR_CELL_OUT_OF_BOUNDS | Placement cell outside grid bounds |
| ERR_PLACEMENT_CELL_NOT_FOUND | Placement references non-existent cell |

## What's Next

### PR #5: Infrastructure + UI + Sample Puzzle (Next)
**Goal:** Daily/topic routing with 1 sample daily puzzle

**Key deliverables:**
- Daily schedule index (`daily/index.json`) with `contentVersion` and `revision` fields
- Topic master index + PM topic catalog
- Home screen (daily card + 7 topic tiles)
- Query param routing with canonical URLs
- Dev flag (`?dev=1`) for puzzle selector
- Stable `puzzleId` conventions enforced

**Acceptance:**
- `?mode=daily` loads today's puzzle (UTC, with fallback)
- `?mode=daily&daily=2026-01-17` loads specific date (canonical share link)
- `?topic=product-management` shows topic browser
- All existing tests pass

### PR #6: Content Production
**Goal:** 7 daily puzzles + topic library baseline

**Key deliverables:**
- 6 more daily puzzles (2026-01-18 through 2026-01-23)
- Topic indexes for remaining 6 topics
- Content QA metrics script (reports stats, warns if grindy)
- LLM wordlist generation (enhanced prompt with ranked candidates)

**Validation:**
- All puzzles pass `npm run audit` (14 error codes)
- All `puzzleId` values follow conventions
- Content QA metrics run without warnings
- Mobile playtest complete

### Future
- Skin system (CIRCUIT + CLASSIC themes)
- A/B testing harness
- Persistence (localStorage progress tracking)
- "Copy link" in completion modal
- Accessibility improvements

## Known State

### Green (Working)
- Engine v1.1 complete and tested
- UI v1.1 complete (timer, pause, gray/yellow, Words List)
- Auditor validates all puzzles
- Spec synced with implementation
- Mobile UX hardened
- 5 puzzles available
- 42 unit tests + 4 E2E tests

### Yellow (Future Work)
- Emoji cell support (v1.2)
- Skin system (Sprint B)
- Persistence
- Accessibility

## Tile Rendering Priority (Reference)

From spec Section 2.2.1:
1. **Preview** (purple) — during active drag
2. **Path-found** (green) — highest permanent, overrides all
3. **Hint-marked** (yellow) — persistent
4. **Additional-found** (gray) — found bonus word tiles
5. **Base** (neutral)

**Rule:** Green always wins (path > hint > additional).

## Architecture (Post-PR #4)

```
packages/
├── engine/          # Pure TS game logic (v1.1)
│   ├── types.ts     # RuntimeState with hintUsedFromButton, hintRevealedFromBonus
│   ├── actions.ts   # SELECT, PRESS_HINT, RESET (no TICK)
│   ├── engine.ts    # reduce(), init(), selectors
│   └── __tests__/   # 26 tests
│
└── generator/       # CLI tools
    ├── validator.ts # Schema validation
    ├── auditor.ts   # Solvability + invariants (14 error codes)
    ├── cli.ts       # --audit flag
    └── __tests__/   # 16 tests + 12 fixtures

apps/
└── web/             # React + Vite
    ├── src/
    │   ├── App.tsx           # Timer, pause, puzzle loading
    │   ├── App.css           # Timer, pause overlay styles
    │   └── components/
    │       ├── Grid.tsx      # Cell rendering with priority + data-testid
    │       ├── Grid.css      # Gray/yellow/green styles
    │       ├── WordsList.tsx # Words modal + data-testid
    │       └── WordsList.css # Modal styles
    ├── tests/
    │   └── smoke.spec.ts     # 4 Playwright E2E tests
    └── public/puzzles/       # 5 puzzles (v1.1 schema)
```

---

**Bottom Line:** PR #4 (Testing + Auditor Hardening) is complete. 42 unit tests + 4 E2E smoke tests provide comprehensive coverage. Auditor has stable error codes for all validation rules. Ready for daily puzzle infrastructure.
