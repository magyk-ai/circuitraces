import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export interface PuzzleCell {
  id: string;
  x: number;
  y: number;
  type: string;
  value: string;
}

export interface PuzzleWord {
  wordId: string;
  size: number;
  placements: string[][];
  hintCellId?: string;
}

export interface Puzzle {
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

/**
 * Load a daily puzzle JSON file for test setup
 */
export function loadDailyPuzzle(date: string, topic: string): Puzzle {
  const filePath = path.resolve(process.cwd(), 'public/daily', `${date}-${topic}.json`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Convert cell IDs to row/col coordinates for drag selection
 */
export function cellIdsToCoords(puzzle: Puzzle, cellIds: string[]): Array<{ row: number; col: number }> {
  const cellById = new Map(puzzle.grid.cells.map(cell => [cell.id, cell]));
  return cellIds.map(cellId => {
    const cell = cellById.get(cellId);
    if (!cell) throw new Error(`Missing cell ${cellId} in puzzle grid`);
    return { row: cell.y, col: cell.x };
  });
}

/**
 * Helper to drag-select cells on the grid
 * Uses actual DOM bounding boxes for precise targeting when cellIds provided
 */
export async function dragSelect(
  page: Page,
  gridSelector: string,
  gridWidth: number,
  gridHeight: number,
  cells: Array<{ row: number; col: number }>,
  cellIds?: string[]
) {
  // If cellIds provided, use them directly for more accurate selection
  if (cellIds && cellIds.length > 0) {
    const firstCell = page.locator(`[data-cell-id="${cellIds[0]}"]`);
    const lastCell = page.locator(`[data-cell-id="${cellIds[cellIds.length - 1]}"]`);

    // Ensure cells are in view
    await firstCell.scrollIntoViewIfNeeded();

    const firstBox = await firstCell.boundingBox();
    const lastBox = await lastCell.boundingBox();
    if (!firstBox) throw new Error(`Cell ${cellIds[0]} not found`);
    if (!lastBox) throw new Error(`Cell ${cellIds[cellIds.length - 1]} not found`);

    // Use dragTo for more reliable drag gesture
    await firstCell.dragTo(lastCell);
    return;
  }

  // Fallback to grid-based calculation
  const grid = page.locator(gridSelector);
  const gridBox = await grid.boundingBox();
  if (!gridBox) throw new Error('Grid not found');

  // Grid has padding (20px) and gaps (4px) - account for these
  const padding = 20;
  const gap = 4;

  const cellWidth = (gridBox.width - 2 * padding - (gridWidth - 1) * gap) / gridWidth;
  const cellHeight = (gridBox.height - 2 * padding - (gridHeight - 1) * gap) / gridHeight;

  const getCellCenter = (row: number, col: number) => ({
    x: gridBox.x + padding + col * (cellWidth + gap) + cellWidth / 2,
    y: gridBox.y + padding + row * (cellHeight + gap) + cellHeight / 2,
  });

  const start = getCellCenter(cells[0].row, cells[0].col);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();

  for (let i = 1; i < cells.length; i++) {
    const point = getCellCenter(cells[i].row, cells[i].col);
    await page.mouse.move(point.x, point.y);
  }

  await page.mouse.up();
}
