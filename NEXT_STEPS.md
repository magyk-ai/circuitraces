# Circuit Races - Next Steps

**Last Updated:** 2026-01-16
**Current Status:** PR #3 Complete, Ready for PR #4

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

### PR #3: UI Fidelity ✅
- Timer + pause UI with auto-pause on tab hidden
- Gray rendering for additional word cells
- Yellow rendering (solid background) for hint cells
- Visual priority: preview > path > hint > additional > base
- Words List modal (found/unfound with sizes)
- Emoji tap-to-reveal deferred (engine doesn't have EMOJI cells)

---

## Next Up: PR #4 — E2E Tests

**Goal:** Automated tests for gameplay mechanics

### Test Cases
```typescript
// Hint behavior
test('hint marks cell with yellow', async ({ page }) => {
  await page.click('[data-testid="hint-button"]');
  await expect(page.locator('.hint-marked')).toBeVisible();
});

// Bonus word behavior
test('bonus word turns gray and reveals hint', async ({ page }) => {
  // Select bonus word cells
  // Verify gray + yellow appears
});

// Priority
test('green overrides yellow', async ({ page }) => {
  // Get hint on cell
  // Find path word containing that cell
  // Verify cell is green (not yellow)
});

// Persistence
test('hints persist indefinitely', async ({ page }) => {
  await page.click('[data-testid="hint-button"]');
  // No timer/expiry - just verify hint stays
});
```

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
