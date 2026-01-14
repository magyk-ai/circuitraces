import type { WaywordsPuzzle } from '@circuitraces/engine';

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validatePuzzle(puzzle: WaywordsPuzzle): ValidationResult {
  const errors: ValidationError[] = [];

  // Schema checks
  if (!puzzle.puzzleId) {
    errors.push({ path: 'puzzleId', message: 'Missing puzzleId' });
  }

  // Grid checks
  const cellMap = new Map(puzzle.grid.cells.map(c => [c.id, c]));

  if (!cellMap.has(puzzle.grid.start.adjacentCellId)) {
    errors.push({
      path: 'grid.start.adjacentCellId',
      message: `Start cell ${puzzle.grid.start.adjacentCellId} not found in grid`
    });
  }

  if (!cellMap.has(puzzle.grid.end.adjacentCellId)) {
    errors.push({
      path: 'grid.end.adjacentCellId',
      message: `End cell ${puzzle.grid.end.adjacentCellId} not found in grid`
    });
  }

  // Word placement validation
  for (const word of puzzle.words.path) {
    if (word.tokens.length !== word.size) {
      errors.push({
        path: `words.path.${word.wordId}`,
        message: `Token count ${word.tokens.length} doesn't match size ${word.size}`
      });
    }

    for (let i = 0; i < word.placements.length; i++) {
      const placement = word.placements[i];

      if (placement.length !== word.size) {
        errors.push({
          path: `words.path.${word.wordId}.placements[${i}]`,
          message: `Placement has ${placement.length} cells but word size is ${word.size}`
        });
      }

      for (const cellId of placement) {
        if (!cellMap.has(cellId)) {
          errors.push({
            path: `words.path.${word.wordId}.placements[${i}]`,
            message: `Cell ${cellId} not found in grid`
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
