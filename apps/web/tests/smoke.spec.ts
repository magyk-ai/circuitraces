import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

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
// Select medium-01 puzzle (has bonus words)
async function selectMediumPuzzle(page: Page) {
  // Already loaded via URL in beforeEach, just verify header
  await expect(page.locator('header h1')).toContainText('Hidden Words');
}

function loadDailyPuzzle(date: string, topic: string) {
  const filePath = path.resolve(process.cwd(), 'public/daily', `${date}-${topic}.json`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

test.describe('Circuit Races - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Load medium-01 directly to test grid interactions on a known puzzle
    await page.goto('/?puzzle=medium-01');
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

  test('start marker is pass-through so START tile drag works', async ({ page }) => {
    await selectMediumPuzzle(page);

    const startMarker = page.locator('[data-testid="start-marker"]');
    await expect(startMarker).toBeVisible();
    const pointerEvents = await startMarker.evaluate(
      (el) => getComputedStyle(el).pointerEvents
    );
    expect(pointerEvents).toBe('none');

    await dragSelect(
      page,
      '[data-testid="grid"]',
      6,
      6,
      [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
        { row: 0, col: 4 }
      ]
    );

    await page.waitForTimeout(300);
    const pathCells = page.locator('.cell.path');
    await expect(pathCells).toHaveCount(5);
  });

  test('reverse drag from END tile still finds a path word', async ({ page }) => {
    await selectMediumPuzzle(page);

    await dragSelect(
      page,
      '[data-testid="grid"]',
      6,
      6,
      [
        { row: 5, col: 3 },
        { row: 5, col: 2 },
        { row: 5, col: 1 },
        { row: 5, col: 0 }
      ]
    );

    await page.waitForTimeout(300);
    const pathCells = page.locator('.cell.path');
    await expect(pathCells).toHaveCount(4);
  });

  test('daily puzzle: can select a 4+ letter PATH word in RAY_4DIR', async ({ page }) => {
    const puzzle = loadDailyPuzzle('2026-01-17', 'personal-finance');
    const gridWidth = puzzle.grid.width;
    const gridHeight = puzzle.grid.height;
    const word = puzzle.words.path.find((entry: { size: number }) => entry.size >= 4);
    if (!word) {
      throw new Error('No 4+ letter PATH word found in daily puzzle');
    }

    const placement: string[] = word.placements[0];
    const cellById = new Map(
      puzzle.grid.cells.map((cell: { id: string; x: number; y: number }) => [cell.id, cell])
    );
    const cells = placement.map(cellId => {
      const cell = cellById.get(cellId);
      if (!cell) throw new Error(`Missing cell ${cellId} in daily puzzle grid`);
      return { row: cell.y, col: cell.x };
    });

    await page.goto('/?mode=daily&daily=2026-01-17&topic=personal-finance');
    await expect(page.locator('[data-testid="grid"]')).toBeVisible();

    await dragSelect(page, '[data-testid="grid"]', gridWidth, gridHeight, cells);
    await page.waitForTimeout(300);

    const pathCells = page.locator('.cell.path');
    await expect(pathCells).toHaveCount(word.size);
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
  /**
   * Test 5: Parallel Daily Navigation (Home -> Topic -> Puzzle)
   */
  test('navigates to daily puzzle from home screen', async ({ page }) => {
    // Navigate to home (fresh state)
    await page.goto('/');
    
    // Should see "Today's Puzzles" section
    await expect(page.locator('text=Today\'s Puzzles')).toBeVisible();

    // Find the first daily card (e.g. Product Management)
    const firstCard = page.locator('.daily-card').first();
    
    // Get expected title (e.g. "Product Signals" or "Product Management")
    // Note: The card displays topic title (e.g. "Product Management") usually
    const cardTitle = await firstCard.locator('h3').textContent();
    expect(cardTitle).toBeTruthy();

    console.log(`Clicking daily card: ${cardTitle}`);
    await firstCard.click();

    // URL should update
    await expect(page).toHaveURL(/mode=daily/);
    await expect(page).toHaveURL(/topic=/);
    
    // Wait for puzzle to load
    await expect(page.locator('[data-testid="grid"]')).toBeVisible();
    
    // Check header matches theme (might differ slightly if topic title != puzzle title, but usually related)
    // For now just check we are in puzzle view (grid visible) and URL is correct.
    // Ensure back button exists
    await expect(page.locator('button.back-button')).toBeVisible();
  });
});
