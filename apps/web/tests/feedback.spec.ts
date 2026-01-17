import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

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

test.describe('Circuit Races - Feedback Tests', () => {
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
   * Test: WORD_FOUND should NOT show text feedback "Found: ..."
   */
  test('WORD_FOUND should NOT show text feedback "Found: ..."', async ({ page }) => {
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

    // Verify word was found by checking green cells
    const pathCells = page.locator('.cell.path');
    await expect(pathCells).toHaveCount(pathWord.size);

    // Verify NO feedback text containing "Found:"
    const feedback = page.locator('.feedback');
    // If feedback is present, it shouldn't have "Found:"
    // If feedback is NOT present, that's also correct (since we only have WORD_FOUND event)
    const count = await feedback.count();
    if (count > 0) {
        await expect(feedback).not.toContainText('Found:');
    } else {
        await expect(feedback).not.toBeVisible();
    }
  });

  /**
   * Test: ALREADY_FOUND SHOULD still show text feedback
   */
  test('ALREADY_FOUND SHOULD still show text feedback', async ({ page }) => {
    const pathWord = puzzle.words.path[0];
    const cells = cellIdsToCoords(puzzle, pathWord.placements[0]);

    // Select first time
    await dragSelect(page, '[data-testid="grid"]', puzzle.grid.width, puzzle.grid.height, cells);
    await page.waitForTimeout(300);

    // Select second time
    await dragSelect(page, '[data-testid="grid"]', puzzle.grid.width, puzzle.grid.height, cells);
    await page.waitForTimeout(300);

    // Verify feedback text "Already found:" is visible
    const feedback = page.locator('.feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('Already found:');
  });
});
