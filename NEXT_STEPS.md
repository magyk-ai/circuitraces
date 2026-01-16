# Circuit Races - Next Steps

**Last Updated:** 2026-01-17
**Status:** PR #7 (Start/End clarity + spec lock) Complete ✅, Release candidate ready 🚀

## Completed PRs

### PR #7: Start/End clarity & spec lock ✅
- Added explicit “Connect START tile → END tile” microcopy + non-blocking START/END markers that ring the actual `start.adjacentCellId` / `end.adjacentCellId`.
- Playwright regression tests now drag from the START tile and from the END tile to catch overlay/pointer regressions.
- Spec + docs now describe the START/END semantics, FORWARD_2DIR placement policy, and the four new auditor error codes.
- The generator package exposes `npm run content:qa` so QA metrics can be rerun after each batch generation.

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

### PR #6: Parallel Dailies & Content ✅
- 7 unique puzzles per day (Topic map in `daily/index.json`)
- Algorithmic Generator (`construct-puzzle` + `GridBuilder`)
- Content Factory (49 Generated Puzzles for Week 1)
- UI Support for Parallel Dailies (Query params)
- Automated Content QA Metrics
- 100% Test Coverage (Unit + E2E)

---

## Next Up: Release Candidate 1 (Beta)

**Goal:** Ship the Start/End clarity + generator hygiene round and verify content + docs.

### Scope
1. **Content regen:** rerun the batch generator for Week 1 (all topics) with the forward-only rules, then rerun `npm run audit` across `apps/web/public/daily/*.json` and any topic catalog puzzles (skip index files).
2. **QA metrics:** run `npm run content:qa -- --failOnError` after regeneration so Easy Daily rules (start top row, end bottom row, 4–6 path words, coverage ≥ threshold, route ≥ height - 1) are treated as gates.
3. **Manual playtest:** follow the fidelity script (start/end visibility, disconnected words still IN_PROGRESS, hint/pause flow) before promoting to production.
4. **Deployment checks:** smoke-test the production URL and daily/topic navigation when the new content is live.

### Validation
- [ ] Daily & topic puzzles audit clean (`npm run audit` loops)
- [ ] `npm run content:qa -- --failOnError` completes with zero errors
- [ ] Manual start-to-end playtest passes (START visible, connectivity required)

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
