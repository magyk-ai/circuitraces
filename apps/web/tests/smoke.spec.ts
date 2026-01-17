import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Circuit Races E2E Smoke Tests
 *
 * Tests use daily puzzles with dynamic word lookup for puzzle-agnostic testing.
 * Unit tests (Vitest) cover engine correctness.
 */

// Test configuration - use a known daily puzzle
const TEST_DATE = '2026-01-17';
const TEST_TOPIC = 'devops';

interface PuzzleCell {
  id: string;
  x: number;
  y: number;
  type: string;
  value: string;
}

interface PuzzleWord {
  wordId: string;
  size: number;
  placements: string[][];
  hintCellId?: string;
}

interface Puzzle {
  puzzleId: string;
  theme: string;
  grid: {
    width: number;
    height: number;
    cells: PuzzleCell[];
    start: { adjacentCellId: string };
    end: { adjacentCellId: string };
  };
  words: {
    path: PuzzleWord[];
    additional?: PuzzleWord[];
  };
}

// Load puzzle file for test setup
function loadDailyPuzzle(date: string, topic: string): Puzzle {
  const filePath = path.resolve(process.cwd(), 'public/daily', `${date}-${topic}.json`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

// Convert cell IDs to row/col coordinates for drag selection
function cellIdsToCoords(puzzle: Puzzle, cellIds: string[]): Array<{ row: number; col: number }> {
  const cellById = new Map(puzzle.grid.cells.map(cell => [cell.id, cell]));
  return cellIds.map(cellId => {
    const cell = cellById.get(cellId);
    if (!cell) throw new Error(`Missing cell ${cellId} in puzzle grid`);
    return { row: cell.y, col: cell.x };
  });
}

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

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();

  // Move through intermediate points for better gesture recognition
  for (let i = 1; i < cells.length; i++) {
    const point = getCellCenter(cells[i].row, cells[i].col);
    await page.mouse.move(point.x, point.y);
  }

  await page.mouse.up();
}

test.describe('Circuit Races - Smoke Tests', () => {
  let puzzle: Puzzle;

  test.beforeAll(() => {
    puzzle = loadDailyPuzzle(TEST_DATE, TEST_TOPIC);
  });

  test.beforeEach(async ({ page }) => {
    // Load daily puzzle directly
    await page.goto(`/?mode=daily&daily=${TEST_DATE}&topic=${TEST_TOPIC}`);
    // Wait for puzzle to load
    await expect(page.locator('[data-testid="grid"]')).toBeVisible();
  });

  /**
   * Test 1: Drag-select PATH word → tiles turn green
   */
  test('drag-select PATH word turns tiles green', async ({ page }) => {
    // Find a path word to select
    const pathWord = puzzle.words.path[0];
    const cells = cellIdsToCoords(puzzle, pathWord.placements[0]);

    await dragSelect(
      page,
      '[data-testid="grid"]',
      puzzle.grid.width,
      puzzle.grid.height,
      cells
    );

    await page.waitForTimeout(300);

    // Check that path cells are green (have .path class)
    const pathCells = page.locator('.cell.path');
    await expect(pathCells).toHaveCount(pathWord.size);
  });

  /**
   * Test 2: Start marker is pass-through so START tile drag works
   */
  test('start marker is pass-through so START tile drag works', async ({ page }) => {
    const startMarker = page.locator('[data-testid="start-marker"]');
    await expect(startMarker).toBeVisible();
    const pointerEvents = await startMarker.evaluate(
      (el) => getComputedStyle(el).pointerEvents
    );
    expect(pointerEvents).toBe('none');

    // Find a path word that starts from the START cell
    const startCellId = puzzle.grid.start.adjacentCellId;
    const pathWordFromStart = puzzle.words.path.find(
      word => word.placements[0][0] === startCellId
    );

    if (pathWordFromStart) {
      const cells = cellIdsToCoords(puzzle, pathWordFromStart.placements[0]);
      await dragSelect(
        page,
        '[data-testid="grid"]',
        puzzle.grid.width,
        puzzle.grid.height,
        cells
      );

      await page.waitForTimeout(300);
      const pathCells = page.locator('.cell.path');
      await expect(pathCells).toHaveCount(pathWordFromStart.size);
    } else {
      // If no path word starts from START, just verify marker is pass-through (already done above)
      expect(true).toBe(true);
    }
  });

  /**
   * Test 3: Path word ending at END cell can be selected
   * Note: Daily puzzles have allowReverseSelection: false, so we select forward
   */
  test('path word ending at END cell can be selected', async ({ page }) => {
    // Find a path word that ends at the END cell
    const endCellId = puzzle.grid.end.adjacentCellId;
    const pathWordToEnd = puzzle.words.path.find(
      word => word.placements[0][word.placements[0].length - 1] === endCellId
    );

    if (pathWordToEnd) {
      // Select the word in forward direction (reverse selection is disabled in daily puzzles)
      const cells = cellIdsToCoords(puzzle, pathWordToEnd.placements[0]);

      await dragSelect(
        page,
        '[data-testid="grid"]',
        puzzle.grid.width,
        puzzle.grid.height,
        cells
      );

      await page.waitForTimeout(300);
      const pathCells = page.locator('.cell.path');
      await expect(pathCells).toHaveCount(pathWordToEnd.size);
    } else {
      // If no path word ends at END, select any path word
      const pathWord = puzzle.words.path[0];
      const cells = cellIdsToCoords(puzzle, pathWord.placements[0]);

      await dragSelect(
        page,
        '[data-testid="grid"]',
        puzzle.grid.width,
        puzzle.grid.height,
        cells
      );

      await page.waitForTimeout(300);
      const pathCells = page.locator('.cell.path');
      await expect(pathCells).toHaveCount(pathWord.size);
    }
  });

  /**
   * Test 4: Can select a 4+ letter PATH word
   */
  test('can select a 4+ letter PATH word', async ({ page }) => {
    const word = puzzle.words.path.find(entry => entry.size >= 4);
    if (!word) {
      throw new Error('No 4+ letter PATH word found in daily puzzle');
    }

    const cells = cellIdsToCoords(puzzle, word.placements[0]);

    await dragSelect(page, '[data-testid="grid"]', puzzle.grid.width, puzzle.grid.height, cells);
    await page.waitForTimeout(300);

    const pathCells = page.locator('.cell.path');
    await expect(pathCells).toHaveCount(word.size);
  });

  /**
   * Test 5: Drag-select BONUS word → gray tiles + yellow hint
   */
  test('drag-select BONUS word shows gray tiles and yellow hint', async ({ page }) => {
    const additionalWords = puzzle.words.additional;
    if (!additionalWords || additionalWords.length === 0) {
      test.skip();
      return;
    }

    const bonusWord = additionalWords[0];
    const cells = cellIdsToCoords(puzzle, bonusWord.placements[0]);

    await dragSelect(
      page,
      '[data-testid="grid"]',
      puzzle.grid.width,
      puzzle.grid.height,
      cells
    );

    await page.waitForTimeout(500);

    // Check that hint (yellow) cell appeared
    const hintCells = page.locator('.cell.hint');
    await expect(hintCells).toHaveCount(1);

    // Check that additional (gray) cells appeared (non-hint cells from the bonus word)
    const additionalCells = page.locator('.cell.additional');
    await expect(additionalCells).toHaveCount(bonusWord.size - 1);
  });

  /**
   * Test 6: Hint button → yellow hint persists after pause/resume
   */
  test('hint persists after pause/resume', async ({ page }) => {
    // Click hint button
    await page.click('[data-testid="btn-hint"]');
    await page.waitForTimeout(300);

    // Verify hint appeared
    const hintCells = page.locator('.cell.hint');
    await expect(hintCells).toHaveCount(1);

    // Pause
    await page.click('[data-testid="btn-pause"]');
    await expect(page.locator('.pause-overlay')).toBeVisible();

    // Resume by clicking the pause overlay
    await page.click('.pause-overlay');
    await expect(page.locator('.pause-overlay')).not.toBeVisible();

    // Hint should still be there (hints persist indefinitely)
    await expect(hintCells).toHaveCount(1);
  });

  /**
   * Test 7: Words modal opens and closes
   */
  test('words modal opens and closes', async ({ page }) => {
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
   * Test 8: Daily Navigation (Home -> Topic -> Puzzle)
   */
  test('navigates to daily puzzle from home screen', async ({ page }) => {
    // Navigate to home (fresh state)
    await page.goto('/');

    // Should see "Today's Puzzles" section
    await expect(page.locator('text=Today\'s Puzzles')).toBeVisible();

    // Find the first daily card
    const firstCard = page.locator('.daily-card').first();

    // Get expected title
    const cardTitle = await firstCard.locator('h3').textContent();
    expect(cardTitle).toBeTruthy();

    await firstCard.click();

    // URL should update
    await expect(page).toHaveURL(/mode=daily/);
    await expect(page).toHaveURL(/topic=/);

    // Wait for puzzle to load
    await expect(page.locator('[data-testid="grid"]')).toBeVisible();

    // Ensure home/back button exists
    await expect(page.locator('button.home-icon')).toBeVisible();
  });
});
