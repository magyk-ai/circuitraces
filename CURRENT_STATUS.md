# Circuit Races - Current Status

**Last Updated:** 2026-01-16
**Status:** PR #4 (Testing + Auditor Hardening) Complete

## Recent Changes (PR #4 - 2026-01-16)

### Vitest Test Suite
- **42 unit tests** (26 engine + 16 auditor)
- **Auditor error codes** (14 stable codes for testable assertions)
- **Fixture-driven tests** (12 bad puzzle fixtures)
- **Spec-lock invariant tests** (6 tests for hint persistence, accumulation, determinism, connectivity)

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

### Daily Puzzle Infrastructure
- Daily puzzle index format
- Date-based puzzle loading
- Archive navigation

### Sprint B
- Skin system (CIRCUIT + CLASSIC themes)
- A/B testing harness
- More puzzles (scale to 15-20)
- Persistence (localStorage)
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
