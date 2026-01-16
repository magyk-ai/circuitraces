import { test, expect, Page } from '@playwright/test';

/**
 * Circuit Races E2E Smoke Tests (PR #4)
 *
 * Minimal suite (4 tests) to verify UI wiring works.
 * Unit tests (Vitest) cover engine correctness.
 */

// Helper to drag-select cells on the grid
async function dragSelect(
  page: Page,
  gridSelector: string,
  gridWidth: number,
  gridHeight: number,
  cells: Array<{ row: number; col: number }>
) {
  const grid = page.locator(gridSelector);
  const gridBox = await grid.boundingBox();
  if (!gridBox) throw new Error('Grid not found');

  const cellWidth = gridBox.width / gridWidth;
  const cellHeight = gridBox.height / gridHeight;

  const getCellCenter = (row: number, col: number) => ({
    x: gridBox.x + col * cellWidth + cellWidth / 2,
    y: gridBox.y + row * cellHeight + cellHeight / 2,
  });

  const start = getCellCenter(cells[0].row, cells[0].col);
  const end = getCellCenter(cells[cells.length - 1].row, cells[cells.length - 1].col);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();

  // Move through intermediate points for better gesture recognition
  for (let i = 1; i < cells.length; i++) {
    const point = getCellCenter(cells[i].row, cells[i].col);
    await page.mouse.move(point.x, point.y);
  }

  await page.mouse.up();
}

// Select medium-01 puzzle (has bonus words)
async function selectMediumPuzzle(page: Page) {
  await page.selectOption('.puzzle-selector', 'medium-01');
  // Wait for puzzle to load
  await expect(page.locator('header h1')).toContainText('Hidden Words');
}

test.describe('Circuit Races - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for initial puzzle to load
    await expect(page.locator('[data-testid="grid"]')).toBeVisible();
  });

  /**
   * Test 1: Drag-select PATH word → tiles turn green
   */
  test('drag-select PATH word turns tiles green', async ({ page }) => {
    await selectMediumPuzzle(page);

    // Grid is 6x6, select START (row 0: S-T-A-R-T, cols 0-4)
    await dragSelect(page, '[data-testid="grid"]', 6, 6, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
    ]);

    // Wait for state update
    await page.waitForTimeout(300);

    // Check that path cells are green (have .path class)
    const pathCells = page.locator('.cell.path');
    await expect(pathCells).toHaveCount(5);
  });

  /**
   * Test 2: Drag-select BONUS word → gray tiles + yellow hint
   */
  test('drag-select BONUS word shows gray tiles and yellow hint', async ({ page }) => {
    await selectMediumPuzzle(page);

    // Select HOW (bonus word): r2c2 → r2c3 → r2c4 (horizontal)
    // H at (2,2), O at (2,3), W at (2,4)
    // hintCellId is r2c2 (intersection with ECHO path word)
    await dragSelect(page, '[data-testid="grid"]', 6, 6, [
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
    ]);

    await page.waitForTimeout(500);

    // Check that hint (yellow) cell appeared - hintCellId is r2c2
    // Note: r2c2 gets hint class, r2c3 and r2c4 get additional class
    const hintCells = page.locator('.cell.hint');
    await expect(hintCells).toHaveCount(1);

    // Check that additional (gray) cells appeared (r2c3 O, r2c4 W)
    // These are the non-hint cells from HOW
    const additionalCells = page.locator('.cell.additional');
    await expect(additionalCells).toHaveCount(2);
  });

  /**
   * Test 3: Hint button → yellow hint persists after pause/resume
   */
  test('hint persists after pause/resume', async ({ page }) => {
    await selectMediumPuzzle(page);

    // Click hint button
    await page.click('[data-testid="btn-hint"]');
    await page.waitForTimeout(300);

    // Verify hint appeared
    const hintCells = page.locator('.cell.hint');
    await expect(hintCells).toHaveCount(1);

    // Pause
    await page.click('[data-testid="btn-pause"]');
    await expect(page.locator('.pause-overlay')).toBeVisible();

    // Resume by clicking the pause overlay (it has onClick to resume)
    await page.click('.pause-overlay');
    await expect(page.locator('.pause-overlay')).not.toBeVisible();

    // Hint should still be there (v1.1: hints persist indefinitely)
    await expect(hintCells).toHaveCount(1);
  });

  /**
   * Test 4: Words modal opens and closes
   */
  test('words modal opens and closes', async ({ page }) => {
    await selectMediumPuzzle(page);

    // Click Words button
    await page.click('[data-testid="btn-words"]');

    // Modal should be visible
    const modal = page.locator('[data-testid="words-modal"]');
    await expect(modal).toBeVisible();

    // Should show Theme Words and Bonus Words sections
    await expect(modal.locator('text=Theme Words')).toBeVisible();
    await expect(modal.locator('text=Bonus Words')).toBeVisible();

    // Close modal
    await page.click('[data-testid="words-close"]');
    await expect(modal).not.toBeVisible();
  });
});
