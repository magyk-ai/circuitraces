import type { WaywordsPuzzle, Cell, WordDef } from '@circuitraces/engine';
import { validatePuzzle } from './validator.js';

/**
 * Stable error codes for testability.
 * Tests should assert on these codes, not message text.
 */
export type AuditErrorCode =
  | 'ERR_SCHEMA_INVALID'
  | 'ERR_MULTI_PLACEMENT'
  | 'ERR_UNSOLVABLE'
  | 'ERR_START_VOID'
  | 'ERR_START_NOT_IN_PATH'
  | 'ERR_END_VOID'
  | 'ERR_END_NOT_IN_PATH'
  | 'ERR_HINT_NOT_FOUND'
  | 'ERR_HINT_VOID'
  | 'ERR_HINT_NOT_IN_BONUS'
  | 'ERR_HINT_NOT_IN_PATH'
  | 'ERR_DUP_PLACEMENT'
  | 'ERR_CELL_OUT_OF_BOUNDS'
  | 'ERR_PLACEMENT_CELL_NOT_FOUND'
  | 'ERR_PLACEMENT_NOT_RAY'
  | 'ERR_PLACEMENT_NOT_CONTIGUOUS'
  | 'ERR_PLACEMENT_REVERSED'
  | 'ERR_PLACEMENT_DIAGONAL';

export interface AuditError {
  code: AuditErrorCode;
  path: string;
  message: string;
  severity: 'error';
}

export interface AuditWarning {
  path: string;
  message: string;
  severity: 'warning';
}

export interface ConnectivityReport {
  solvable: boolean;
  pathLength: number; // BFS distance from start to end (-1 if not reachable)
  unreachablePathWords: string[]; // Path words that can't connect to main path
}

export interface AuditResult {
  valid: boolean;
  errors: AuditError[];
  warnings: AuditWarning[];
  connectivity: ConnectivityReport;
}

/**
 * Comprehensive puzzle auditor that checks gameplay logic beyond schema validation.
 *
 * Checks (in order):
 * 1. Schema validation (delegates to validator.ts) → ERR_SCHEMA_INVALID
 * 2. Single placement enforcement → ERR_MULTI_PLACEMENT
 * 3. Placement cell existence → ERR_PLACEMENT_CELL_NOT_FOUND
 * 4. Grid bounds check → ERR_CELL_OUT_OF_BOUNDS
 * 5. Start/end cell validation → ERR_START_*, ERR_END_*
 * 6. Connectivity analysis (BFS) → ERR_UNSOLVABLE
 * 7. hintCellId validation → ERR_HINT_*
 * 8. Placement uniqueness → ERR_DUP_PLACEMENT
 */
export function auditPuzzle(puzzle: WaywordsPuzzle): AuditResult {
  const errors: AuditError[] = [];
  const warnings: AuditWarning[] = [];

  // 1. Schema validation (delegate to existing validator)
  const schemaResult = validatePuzzle(puzzle);
  for (const err of schemaResult.errors) {
    errors.push({ code: 'ERR_SCHEMA_INVALID', path: err.path, message: err.message, severity: 'error' });
  }

  // Build lookup maps
  const cellMap = new Map<string, Cell>(puzzle.grid.cells.map(c => [c.id, c]));
  const posMap = new Map<string, Cell>(puzzle.grid.cells.map(c => [`${c.x},${c.y}`, c]));

  // Collect all path word cells (for intersection checks)
  const allPathWordCells = new Set<string>();
  for (const word of puzzle.words.path) {
    if (word.placements.length > 0) {
      for (const cellId of word.placements[0]) {
        allPathWordCells.add(cellId);
      }
    }
  }

  // 2. Single placement enforcement
  checkSinglePlacements(puzzle, errors);

  // 3. Placement cell existence (every cellId in placements must exist in grid)
  checkPlacementCellsExist(puzzle, cellMap, errors);

  // 4. Grid bounds check
  checkGridBounds(puzzle, errors);

  // 5. Start/end cell validation
  checkStartEndCells(puzzle, cellMap, allPathWordCells, errors);

  // 6. Connectivity analysis
  const connectivity = checkConnectivity(puzzle, cellMap, posMap, allPathWordCells);
  if (!connectivity.solvable) {
    errors.push({
      code: 'ERR_UNSOLVABLE',
      path: 'connectivity',
      message: `Puzzle is UNSOLVABLE: end cell not reachable from start via path words. Unreachable words: ${connectivity.unreachablePathWords.join(', ') || 'none identified'}`,
      severity: 'error'
    });
  }

  // 7. hintCellId validation (THE BIG ONE)
  checkHintCellIds(puzzle, cellMap, allPathWordCells, errors);

  // 8. Placement uniqueness
  checkPlacementUniqueness(puzzle, errors);

  // 9. Geometry validation (Guardrail for RAY_8DIR)
  checkPlacementGeometry(puzzle, errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    connectivity
  };
}

/**
 * Check that placements match the Selection Model geometry.
 * For RAY modes (RAY_8DIR, RAY_4DIR), all words must be straight lines.
 * Additionally validates:
 * - Contiguous: Manhattan distance = 1 for each step
 * - Constant direction: All steps same dx,dy
 * - No diagonal: Either dx=0 or dy=0 (for RAY_4DIR or FORWARD_2DIR content)
 * - Forward-only: dx=+1 for horizontal, dy=+1 for vertical (for easy puzzles)
 */
function checkPlacementGeometry(puzzle: WaywordsPuzzle, errors: AuditError[]): void {
  const modelRaw = puzzle.config?.selectionModel || 'RAY_8DIR'; // Default
  // Use string type to avoid TypeScript narrowing issues
  const model: string = modelRaw;

  if (model === 'ADJACENT') return; // ADJACENT allows any connected shape

  const gridCells = new Map(puzzle.grid.cells.map(c => [c.id, c]));

  const checkWord = (word: WordDef, category: 'path' | 'additional') => {
    if (word.placements.length === 0) return;
    const cells = word.placements[0];
    if (cells.length < 2) return; // Single cell is always valid

    // Compute ALL step directions
    const steps: Array<{dx: number, dy: number}> = [];
    for (let i = 0; i < cells.length - 1; i++) {
      const ca = gridCells.get(cells[i]);
      const cb = gridCells.get(cells[i + 1]);
      if (!ca || !cb) continue; // Covered by ERR_PLACEMENT_CELL_NOT_FOUND
      steps.push({ dx: cb.x - ca.x, dy: cb.y - ca.y });
    }

    if (steps.length === 0) return;

    // Check 1: Contiguous (Manhattan distance = 1 for each step)
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const manhattan = Math.abs(step.dx) + Math.abs(step.dy);
      if (manhattan !== 1) {
        errors.push({
          code: 'ERR_PLACEMENT_NOT_CONTIGUOUS',
          path: `words.${category}.${word.wordId}`,
          message: `Placement has non-adjacent cells at step ${i} (Manhattan distance ${manhattan})`,
          severity: 'error'
        });
        return; // Report once per word
      }
    }

    // Check 2: Constant direction (all steps same dx,dy) - must be a ray
    const firstStep = steps[0];
    const isConstant = steps.every(s => s.dx === firstStep.dx && s.dy === firstStep.dy);
    if (!isConstant) {
      errors.push({
        code: 'ERR_PLACEMENT_NOT_RAY',
        path: `words.${category}.${word.wordId}`,
        message: `Placement bends (not a straight ray)`,
        severity: 'error'
      });
      return;
    }

    // For RAY_4DIR (and implicitly FORWARD_2DIR content), check no diagonals
    if (model === 'RAY_4DIR') {
      // Check 3: No diagonal
      if (firstStep.dx !== 0 && firstStep.dy !== 0) {
        errors.push({
          code: 'ERR_PLACEMENT_DIAGONAL',
          path: `words.${category}.${word.wordId}`,
          message: `Placement is diagonal (not allowed in ${model})`,
          severity: 'error'
        });
        return;
      }

      // Check 4: Forward-only (dx=+1 for horizontal, dy=+1 for vertical)
      const isHorizontal = firstStep.dy === 0;
      const isForward = isHorizontal ? firstStep.dx === 1 : firstStep.dy === 1;
      if (!isForward) {
        const direction = isHorizontal ? 'right-to-left' : 'bottom-to-top';
        errors.push({
          code: 'ERR_PLACEMENT_REVERSED',
          path: `words.${category}.${word.wordId}`,
          message: `Word reads ${direction} (reversed)`,
          severity: 'error'
        });
      }
    }
  };

  puzzle.words.path.forEach(w => checkWord(w, 'path'));
  (puzzle.words.additional || []).forEach(w => checkWord(w, 'additional'));
}

/**
 * Check that every word has exactly 1 placement
 */
function checkSinglePlacements(puzzle: WaywordsPuzzle, errors: AuditError[]): void {
  // Check path words
  for (const word of puzzle.words.path) {
    if (word.placements.length !== 1) {
      errors.push({
        code: 'ERR_MULTI_PLACEMENT',
        path: `words.path.${word.wordId}.placements`,
        message: `Word must have exactly 1 placement, found ${word.placements.length}`,
        severity: 'error'
      });
    }
  }

  // Check additional words
  for (const word of puzzle.words.additional || []) {
    if (word.placements.length !== 1) {
      errors.push({
        code: 'ERR_MULTI_PLACEMENT',
        path: `words.additional.${word.wordId}.placements`,
        message: `Word must have exactly 1 placement, found ${word.placements.length}`,
        severity: 'error'
      });
    }
  }
}

/**
 * Check that every cellId referenced in placements exists in the grid
 */
function checkPlacementCellsExist(
  puzzle: WaywordsPuzzle,
  cellMap: Map<string, Cell>,
  errors: AuditError[]
): void {
  const checkWordPlacements = (word: WordDef, category: 'path' | 'additional') => {
    for (const placement of word.placements) {
      for (const cellId of placement) {
        if (!cellMap.has(cellId)) {
          errors.push({
            code: 'ERR_PLACEMENT_CELL_NOT_FOUND',
            path: `words.${category}.${word.wordId}.placements`,
            message: `Placement references non-existent cell "${cellId}"`,
            severity: 'error'
          });
        }
      }
    }
  };

  for (const word of puzzle.words.path) {
    checkWordPlacements(word, 'path');
  }
  for (const word of puzzle.words.additional || []) {
    checkWordPlacements(word, 'additional');
  }
}

/**
 * BFS connectivity check from start to end through path word cells.
 * Uses posMap for O(1) neighbor lookup.
 */
function checkConnectivity(
  puzzle: WaywordsPuzzle,
  cellMap: Map<string, Cell>,
  posMap: Map<string, Cell>,
  allPathWordCells: Set<string>
): ConnectivityReport {
  const startId = puzzle.grid.start.adjacentCellId;
  const endId = puzzle.grid.end.adjacentCellId;

  // BFS through path word cells
  const queue: Array<{ cellId: string; dist: number }> = [];
  const visited = new Set<string>();

  // Start BFS from start cell (if it's in path words)
  if (allPathWordCells.has(startId)) {
    queue.push({ cellId: startId, dist: 0 });
    visited.add(startId);
  }

  let pathLength = -1;

  while (queue.length > 0) {
    const { cellId, dist } = queue.shift()!;

    if (cellId === endId) {
      pathLength = dist;
      break;
    }

    const cell = cellMap.get(cellId);
    if (!cell) continue;

    // Get ORTHO_4 neighbors using posMap (O(1) lookup)
    const neighbors = getOrtho4Neighbors(cell, posMap);

    for (const neighbor of neighbors) {
      if (neighbor.type === 'VOID') continue;
      if (!allPathWordCells.has(neighbor.id)) continue;
      if (visited.has(neighbor.id)) continue;

      visited.add(neighbor.id);
      queue.push({ cellId: neighbor.id, dist: dist + 1 });
    }
  }

  // Find unreachable path words (words with no cells in visited set)
  const unreachablePathWords: string[] = [];
  for (const word of puzzle.words.path) {
    if (word.placements.length === 0) continue;
    const wordCells = word.placements[0];
    const hasReachableCell = wordCells.some(cellId => visited.has(cellId));
    if (!hasReachableCell) {
      unreachablePathWords.push(word.wordId);
    }
  }

  return {
    solvable: pathLength >= 0,
    pathLength,
    unreachablePathWords
  };
}

/**
 * Get ORTHO_4 (orthogonal) neighbors of a cell using posMap for O(1) lookup
 */
function getOrtho4Neighbors(cell: Cell, posMap: Map<string, Cell>): Cell[] {
  const neighbors: Cell[] = [];
  const directions = [
    { dx: 0, dy: -1 }, // up
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
    { dx: 1, dy: 0 }   // right
  ];

  for (const { dx, dy } of directions) {
    const key = `${cell.x + dx},${cell.y + dy}`;
    const neighbor = posMap.get(key);
    if (neighbor) {
      neighbors.push(neighbor);
    }
  }

  return neighbors;
}

/**
 * Check that start/end cells are in path word placements and not VOID
 */
function checkStartEndCells(
  puzzle: WaywordsPuzzle,
  cellMap: Map<string, Cell>,
  allPathWordCells: Set<string>,
  errors: AuditError[]
): void {
  const startId = puzzle.grid.start.adjacentCellId;
  const endId = puzzle.grid.end.adjacentCellId;

  // Check start cell
  const startCell = cellMap.get(startId);
  if (startCell?.type === 'VOID') {
    errors.push({
      code: 'ERR_START_VOID',
      path: 'grid.start.adjacentCellId',
      message: `Start cell ${startId} is VOID`,
      severity: 'error'
    });
  }
  if (!allPathWordCells.has(startId)) {
    errors.push({
      code: 'ERR_START_NOT_IN_PATH',
      path: 'grid.start.adjacentCellId',
      message: `Start cell ${startId} is not part of any path word placement`,
      severity: 'error'
    });
  }

  // Check end cell
  const endCell = cellMap.get(endId);
  if (endCell?.type === 'VOID') {
    errors.push({
      code: 'ERR_END_VOID',
      path: 'grid.end.adjacentCellId',
      message: `End cell ${endId} is VOID`,
      severity: 'error'
    });
  }
  if (!allPathWordCells.has(endId)) {
    errors.push({
      code: 'ERR_END_NOT_IN_PATH',
      path: 'grid.end.adjacentCellId',
      message: `End cell ${endId} is not part of any path word placement`,
      severity: 'error'
    });
  }
}

/**
 * Check that hintCellId for additional words is an intersection:
 * - Must be in the bonus word's placement
 * - Must be in at least one path word's placement
 * - Must not be VOID
 */
function checkHintCellIds(
  puzzle: WaywordsPuzzle,
  cellMap: Map<string, Cell>,
  allPathWordCells: Set<string>,
  errors: AuditError[]
): void {
  for (const word of puzzle.words.additional || []) {
    // Support both clueCellId (old) and hintCellId (new) during transition
    const hintCellId = (word as WordDef & { hintCellId?: string }).hintCellId ?? word.clueCellId;

    if (!hintCellId) {
      // hintCellId is optional, but if missing, no hint will be revealed
      continue;
    }

    const wordPath = `words.additional.${word.wordId}`;

    // Check 1: hintCellId exists in grid
    const hintCell = cellMap.get(hintCellId);
    if (!hintCell) {
      errors.push({
        code: 'ERR_HINT_NOT_FOUND',
        path: `${wordPath}.hintCellId`,
        message: `Hint cell ${hintCellId} not found in grid`,
        severity: 'error'
      });
      continue;
    }

    // Check 2: hintCellId is not VOID
    if (hintCell.type === 'VOID') {
      errors.push({
        code: 'ERR_HINT_VOID',
        path: `${wordPath}.hintCellId`,
        message: `Hint cell ${hintCellId} cannot be VOID`,
        severity: 'error'
      });
      continue;
    }

    // Check 3: hintCellId is in the bonus word's placement
    const bonusWordCells = word.placements[0] || [];
    if (!bonusWordCells.includes(hintCellId)) {
      errors.push({
        code: 'ERR_HINT_NOT_IN_BONUS',
        path: `${wordPath}.hintCellId`,
        message: `Hint cell ${hintCellId} must be IN the bonus word's placement [${bonusWordCells.join(', ')}]`,
        severity: 'error'
      });
    }

    // Check 4: hintCellId is in at least one path word's placement
    if (!allPathWordCells.has(hintCellId)) {
      errors.push({
        code: 'ERR_HINT_NOT_IN_PATH',
        path: `${wordPath}.hintCellId`,
        message: `Hint cell ${hintCellId} must also be in a PATH word placement (intersection required)`,
        severity: 'error'
      });
    }
  }
}

/**
 * Check that no two words have the exact same placement key
 */
function checkPlacementUniqueness(puzzle: WaywordsPuzzle, errors: AuditError[]): void {
  const placementKeys = new Map<string, { wordId: string; category: string }>();

  const checkWord = (word: WordDef, category: 'PATH' | 'ADDITIONAL') => {
    if (word.placements.length === 0) return;

    const placement = word.placements[0];
    const key = placement.join('|');
    const existing = placementKeys.get(key);

    if (existing) {
      errors.push({
        code: 'ERR_DUP_PLACEMENT',
        path: `words.${category.toLowerCase()}.${word.wordId}`,
        message: `Duplicate placement key "${key}" - conflicts with ${existing.category} word "${existing.wordId}"`,
        severity: 'error'
      });
    } else {
      placementKeys.set(key, { wordId: word.wordId, category });
    }
  };

  // Check path words
  for (const word of puzzle.words.path) {
    checkWord(word, 'PATH');
  }

  // Check additional words
  for (const word of puzzle.words.additional || []) {
    checkWord(word, 'ADDITIONAL');
  }
}

/**
 * Check that all cell coordinates are within grid bounds
 */
function checkGridBounds(puzzle: WaywordsPuzzle, errors: AuditError[]): void {
  for (const cell of puzzle.grid.cells) {
    if (cell.x < 0 || cell.x >= puzzle.grid.width) {
      errors.push({
        code: 'ERR_CELL_OUT_OF_BOUNDS',
        path: `grid.cells.${cell.id}`,
        message: `Cell x=${cell.x} is outside grid width=${puzzle.grid.width}`,
        severity: 'error'
      });
    }
    if (cell.y < 0 || cell.y >= puzzle.grid.height) {
      errors.push({
        code: 'ERR_CELL_OUT_OF_BOUNDS',
        path: `grid.cells.${cell.id}`,
        message: `Cell y=${cell.y} is outside grid height=${puzzle.grid.height}`,
        severity: 'error'
      });
    }
  }
}
