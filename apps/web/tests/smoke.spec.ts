import { test, expect } from '@playwright/test';

test.describe('Circuit Races - Smoke Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Check that the header is visible
    await expect(page.locator('header h1')).toContainText('Simple Path');

    // Check that the grid is rendered
    const grid = page.locator('.grid');
    await expect(grid).toBeVisible();

    // Check that cells are rendered (5x5 = 25 cells)
    const cells = page.locator('.cell:not(.void)');
    await expect(cells).toHaveCount(25);
  });

  test('should display reset button', async ({ page }) => {
    await page.goto('/');

    const resetButton = page.locator('button:has-text("Reset")');
    await expect(resetButton).toBeVisible();
  });

  test('should show cell values', async ({ page }) => {
    await page.goto('/');

    // Check that first cell shows "S"
    const firstCell = page.locator('.cell').first();
    await expect(firstCell).toContainText('S');
  });

  test('should complete puzzle when all words found', async ({ page }) => {
    await page.goto('/');

    // Get grid bounding box for calculations
    const grid = page.locator('.grid');
    const gridBox = await grid.boundingBox();

    if (!gridBox) {
      throw new Error('Grid not found');
    }

    // Calculate cell size (grid is 5x5)
    const cellWidth = gridBox.width / 5;
    const cellHeight = gridBox.height / 5;

    // Helper to get cell center coordinates
    const getCellCenter = (row: number, col: number) => ({
      x: gridBox.x + (col * cellWidth) + (cellWidth / 2),
      y: gridBox.y + (row * cellHeight) + (cellHeight / 2)
    });

    // Select STAR (row 0: S-T-A-R, cells 0-3)
    const star_start = getCellCenter(0, 0);
    const star_end = getCellCenter(0, 3);
    await page.mouse.move(star_start.x, star_start.y);
    await page.mouse.down();
    await page.mouse.move(star_end.x, star_end.y);
    await page.mouse.up();

    // Wait for feedback
    await page.waitForTimeout(500);

    // Check for "Found: STAR" feedback
    await expect(page.locator('.feedback')).toContainText('Found: STAR');

    // Select PATH (row 1: P-A-T-H, cells 0-3)
    const path_start = getCellCenter(1, 0);
    const path_end = getCellCenter(1, 3);
    await page.mouse.move(path_start.x, path_start.y);
    await page.mouse.down();
    await page.mouse.move(path_end.x, path_end.y);
    await page.mouse.up();

    await page.waitForTimeout(500);

    // Select ECHO (row 2: E-C-H-O, cells 0-3)
    const echo_start = getCellCenter(2, 0);
    const echo_end = getCellCenter(2, 3);
    await page.mouse.move(echo_start.x, echo_start.y);
    await page.mouse.down();
    await page.mouse.move(echo_end.x, echo_end.y);
    await page.mouse.up();

    await page.waitForTimeout(500);

    // Select GOAL (row 4: G-O-A-L, cells 0-3)
    const goal_start = getCellCenter(4, 0);
    const goal_end = getCellCenter(4, 3);
    await page.mouse.move(goal_start.x, goal_start.y);
    await page.mouse.down();
    await page.mouse.move(goal_end.x, goal_end.y);
    await page.mouse.up();

    // Wait for completion screen
    await page.waitForTimeout(1000);

    // Check for completion message
    const completion = page.locator('.completion');
    await expect(completion).toBeVisible();
    await expect(completion).toContainText('Puzzle Complete!');
  });

  test('should reset puzzle', async ({ page }) => {
    await page.goto('/');

    // Select one word
    const grid = page.locator('.grid');
    const gridBox = await grid.boundingBox();

    if (!gridBox) {
      throw new Error('Grid not found');
    }

    const cellWidth = gridBox.width / 5;
    const cellHeight = gridBox.height / 5;

    const getCellCenter = (row: number, col: number) => ({
      x: gridBox.x + (col * cellWidth) + (cellWidth / 2),
      y: gridBox.y + (row * cellHeight) + (cellHeight / 2)
    });

    // Select STAR
    const start = getCellCenter(0, 0);
    const end = getCellCenter(0, 3);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y);
    await page.mouse.up();

    await page.waitForTimeout(500);

    // Check that word was found
    const pathCells = page.locator('.cell.path');
    await expect(pathCells).not.toHaveCount(0);

    // Click reset
    await page.click('button:has-text("Reset")');

    // Check that path cells are cleared
    await expect(pathCells).toHaveCount(0);
  });

  test('should show invalid selection feedback', async ({ page }) => {
    await page.goto('/');

    const grid = page.locator('.grid');
    const gridBox = await grid.boundingBox();

    if (!gridBox) {
      throw new Error('Grid not found');
    }

    const cellWidth = gridBox.width / 5;
    const cellHeight = gridBox.height / 5;

    const getCellCenter = (row: number, col: number) => ({
      x: gridBox.x + (col * cellWidth) + (cellWidth / 2),
      y: gridBox.y + (row * cellHeight) + (cellHeight / 2)
    });

    // Try to select CAT (not in puzzle) - row 0: C-A-T (cells 2-4)
    // Actually S-T-A, so let's try T-A-R-K which is not a word
    const start = getCellCenter(0, 1);
    const end = getCellCenter(0, 4);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y);
    await page.mouse.up();

    await page.waitForTimeout(500);

    // Check for invalid selection feedback
    await expect(page.locator('.feedback')).toContainText('Invalid selection');
  });
});
