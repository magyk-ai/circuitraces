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
  | 'ERR_PLACEMENT_DIAGONAL'
  | 'ERR_PARALLEL_ADJACENCY'
  | 'ERR_SAME_DIRECTION_INTERSECTION'
  | 'ERR_NON_CRITICAL_PATH_WORD';

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

  // 10. Parallel adjacency check (words touching without intersecting)
  checkParallelAdjacency(puzzle, cellMap, errors);

  // 11. Intersection direction check (intersecting words must have different directions)
  checkIntersectionDirections(puzzle, cellMap, errors);

  // 12. Criticality check (all path words must be required for connectivity)
  checkCriticalPathWords(puzzle, cellMap, posMap, allPathWordCells, errors);

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
 * Check that every path word is required (critical) to connect START to END.
 * A word is critical if at least one of its cells lies on the shortest path from START to END.
 * Dead-end branches and bypassable words will fail this check.
 */
function checkCriticalPathWords(
  puzzle: WaywordsPuzzle,
  cellMap: Map<string, Cell>,
  posMap: Map<string, Cell>,
  allPathWordCells: Set<string>,
  errors: AuditError[]
): void {
  const startId = puzzle.grid.start.adjacentCellId;
  const endId = puzzle.grid.end.adjacentCellId;

  // Find ALL cells that lie on ANY shortest path from START to END
  const criticalCells = findCriticalPathCells(startId, endId, allPathWordCells, cellMap, posMap);

  for (const word of puzzle.words.path) {
    if (word.placements.length === 0) continue;
    const placement = word.placements[0];

    // A word is critical if ANY of its cells are on the critical path
    const isOnPath = placement.some(cellId => criticalCells.has(cellId));

    if (!isOnPath) {
      errors.push({
        code: 'ERR_NON_CRITICAL_PATH_WORD',
        path: `words.path.${word.wordId}`,
        message: `Path word "${word.wordId}" is non-critical (dead-end branch or bypassable)`,
        severity: 'error'
      });
    }
  }
}

/**
 * Find all cells that lie on ANY shortest path from start to end.
 * Uses BFS to find distance from start, then checks which cells can be part of a shortest path.
 */
function findCriticalPathCells(
  startId: string,
  endId: string,
  allowedCells: Set<string>,
  cellMap: Map<string, Cell>,
  posMap: Map<string, Cell>
): Set<string> {
  if (!allowedCells.has(startId) || !allowedCells.has(endId)) {
    return new Set();
  }

  // BFS from start to compute distances
  const distFromStart = new Map<string, number>();
  const queue: string[] = [startId];
  distFromStart.set(startId, 0);

  while (queue.length > 0) {
    const cellId = queue.shift()!;
    const cell = cellMap.get(cellId);
    if (!cell) continue;

    const neighbors = getOrtho4Neighbors(cell, posMap);
    for (const neighbor of neighbors) {
      if (neighbor.type === 'VOID') continue;
      if (!allowedCells.has(neighbor.id)) continue;
      if (distFromStart.has(neighbor.id)) continue;

      distFromStart.set(neighbor.id, distFromStart.get(cellId)! + 1);
      queue.push(neighbor.id);
    }
  }

  // If end is not reachable, no critical cells
  if (!distFromStart.has(endId)) {
    return new Set();
  }

  // BFS from end to compute distances
  const distFromEnd = new Map<string, number>();
  const queue2: string[] = [endId];
  distFromEnd.set(endId, 0);

  while (queue2.length > 0) {
    const cellId = queue2.shift()!;
    const cell = cellMap.get(cellId);
    if (!cell) continue;

    const neighbors = getOrtho4Neighbors(cell, posMap);
    for (const neighbor of neighbors) {
      if (neighbor.type === 'VOID') continue;
      if (!allowedCells.has(neighbor.id)) continue;
      if (distFromEnd.has(neighbor.id)) continue;

      distFromEnd.set(neighbor.id, distFromEnd.get(cellId)! + 1);
      queue2.push(neighbor.id);
    }
  }

  // A cell is on a shortest path if distFromStart[cell] + distFromEnd[cell] == shortestPathLength
  const shortestPathLength = distFromStart.get(endId)!;
  const criticalCells = new Set<string>();

  for (const cellId of allowedCells) {
    const dStart = distFromStart.get(cellId);
    const dEnd = distFromEnd.get(cellId);
    if (dStart !== undefined && dEnd !== undefined && dStart + dEnd === shortestPathLength) {
      criticalCells.add(cellId);
    }
  }

  return criticalCells;
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

/**
 * Check for "parallel adjacency" - path words that touch orthogonally without intersecting.
 * This creates visual confusion when two highlighted words run parallel/adjacent.
 *
 * Two words have parallel adjacency if:
 * 1. They do NOT share any cells (no intersection), AND
 * 2. A cell from one word is orthogonally adjacent to a cell from the other word
 */
function checkParallelAdjacency(
  puzzle: WaywordsPuzzle,
  cellMap: Map<string, Cell>,
  errors: AuditError[]
): void {
  const pathWords = puzzle.words.path;
  if (pathWords.length < 2) return;

  // Build map of cellId to the words that contain it
  const cellToWords = new Map<string, Set<string>>();
  for (const word of pathWords) {
    if (word.placements.length === 0) continue;
    for (const cellId of word.placements[0]) {
      if (!cellToWords.has(cellId)) {
        cellToWords.set(cellId, new Set());
      }
      cellToWords.get(cellId)!.add(word.wordId);
    }
  }

  // Build position map for O(1) neighbor lookup
  const posMap = new Map<string, Cell>();
  for (const cell of puzzle.grid.cells) {
    posMap.set(`${cell.x},${cell.y}`, cell);
  }

  // For each pair of words, check if they have parallel adjacency
  const adjacencyPairs = new Set<string>();
  for (let i = 0; i < pathWords.length; i++) {
    for (let j = i + 1; j < pathWords.length; j++) {
      const wordA = pathWords[i];
      const wordB = pathWords[j];
      if (wordA.placements.length === 0 || wordB.placements.length === 0) continue;

      const placementA = new Set(wordA.placements[0]);
      const placementB = new Set(wordB.placements[0]);

      // Check if words intersect (share any cell)
      let intersects = false;
      for (const cellId of placementA) {
        if (placementB.has(cellId)) {
          intersects = true;
          break;
        }
      }

      // If words intersect, adjacency is expected and allowed
      if (intersects) continue;

      // Words don't intersect - check if they're adjacent
      let hasAdjacency = false;
      for (const cellId of placementA) {
        const cell = cellMap.get(cellId);
        if (!cell) continue;

        const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        for (const [dx, dy] of directions) {
          const neighbor = posMap.get(`${cell.x + dx},${cell.y + dy}`);
          if (neighbor && placementB.has(neighbor.id)) {
            hasAdjacency = true;
            break;
          }
        }
        if (hasAdjacency) break;
      }

      if (hasAdjacency) {
        const pairKey = [wordA.wordId, wordB.wordId].sort().join('|');
        adjacencyPairs.add(pairKey);
      }
    }
  }

  // Report each unique pair once
  for (const pairKey of adjacencyPairs) {
    const [wordA, wordB] = pairKey.split('|');
    errors.push({
      code: 'ERR_PARALLEL_ADJACENCY',
      path: `words.path`,
      message: `Words "${wordA}" and "${wordB}" touch orthogonally without intersecting (parallel adjacency)`,
      severity: 'error'
    });
  }
}

/**
 * Check that intersecting path words have different directions (H vs V).
 * This prevents visual confusion where two parallel words appear to be one.
 */
function checkIntersectionDirections(
  puzzle: WaywordsPuzzle,
  cellMap: Map<string, Cell>,
  errors: AuditError[]
): void {
  const pathWords = puzzle.words.path;
  if (pathWords.length < 2) return;

  // Map to store word IDs that occupy each cell
  const cellToWords = new Map<string, string[]>();
  for (const word of pathWords) {
    if (word.placements.length === 0) continue;
    for (const cellId of word.placements[0]) {
      if (!cellToWords.has(cellId)) {
        cellToWords.set(cellId, []);
      }
      cellToWords.get(cellId)!.push(word.wordId);
    }
  }

  // Helper to determine direction of a word placement
  const getDirection = (placement: string[]): 'H' | 'V' | 'UNKNOWN' => {
    if (placement.length < 2) return 'UNKNOWN';
    const c1 = cellMap.get(placement[0]);
    const c2 = cellMap.get(placement[1]);
    if (!c1 || !c2) return 'UNKNOWN';
    return c1.y === c2.y ? 'H' : 'V';
  };

  // Check each cell that is an intersection
  for (const [cellId, wordIds] of cellToWords.entries()) {
    if (wordIds.length < 2) continue;

    const directions = new Map<string, 'H' | 'V' | 'UNKNOWN'>();
    for (const wordId of wordIds) {
      const word = pathWords.find(w => w.wordId === wordId);
      if (word && word.placements.length > 0) {
        directions.set(wordId, getDirection(word.placements[0]));
      }
    }

    // Compare directions of all pairs of words at this intersection
    for (let i = 0; i < wordIds.length; i++) {
      for (let j = i + 1; j < wordIds.length; j++) {
        const idA = wordIds[i];
        const idB = wordIds[j];
        const dirA = directions.get(idA);
        const dirB = directions.get(idB);

        if (dirA && dirB && dirA !== 'UNKNOWN' && dirB !== 'UNKNOWN' && dirA === dirB) {
          errors.push({
            code: 'ERR_SAME_DIRECTION_INTERSECTION',
            path: 'words.path',
            message: `Words "${idA}" and "${idB}" intersect at cell ${cellId} and have the same direction (${dirA})`,
            severity: 'error'
          });
        }
      }
    }
  }
}
