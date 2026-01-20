import { test, expect } from '@playwright/test';
import { Puzzle, loadDailyPuzzle, cellIdsToCoords, dragSelect } from './test-utils';

// Test configuration - use a known daily puzzle
const TEST_DATE = '2026-01-17';
const TEST_TOPIC = 'devops';

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
