import type { WaywordsPuzzle, RuntimeState } from './types.js';

export function isConnected(
  puzzle: WaywordsPuzzle,
  state: RuntimeState
): boolean {
  const startCellId = puzzle.grid.start.adjacentCellId;
  const endCellId = puzzle.grid.end.adjacentCellId;

  // Get walkable cells (all cells from found path word placements)
  const walkable = getPathCells(puzzle, state);

  if (!walkable.has(startCellId) || !walkable.has(endCellId)) {
    return false;
  }

  // BFS from start to end
  const visited = new Set<string>();
  const queue: string[] = [startCellId];
  visited.add(startCellId);

  // Build neighbor map for ORTHO_4
  const neighborMap = buildNeighborMap(puzzle);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === endCellId) {
      return true;
    }

    for (const neighbor of neighborMap.get(current) || []) {
      if (walkable.has(neighbor) && !visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return false;
}

/**
 * Returns an ordered array of cellIds representing the connected path from START to END.
 * Uses BFS with parent tracking to find the shortest path.
 * Returns empty array if no path exists (not connected).
 */
export function getConnectedPathOrder(
  puzzle: WaywordsPuzzle,
  state: RuntimeState
): string[] {
  const startCellId = puzzle.grid.start.adjacentCellId;
  const endCellId = puzzle.grid.end.adjacentCellId;
  const walkable = getPathCells(puzzle, state);

  if (!walkable.has(startCellId) || !walkable.has(endCellId)) {
    return [];
  }

  // BFS with parent tracking
  const visited = new Set<string>();
  const parent = new Map<string, string | null>();
  const queue: string[] = [startCellId];
  visited.add(startCellId);
  parent.set(startCellId, null);

  const neighborMap = buildNeighborMap(puzzle);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === endCellId) {
      // Reconstruct path from END to START, then reverse
      const path: string[] = [];
      let node: string | null = endCellId;
      while (node !== null) {
        path.push(node);
        node = parent.get(node) ?? null;
      }
      return path.reverse();
    }

    for (const neighbor of neighborMap.get(current) || []) {
      if (walkable.has(neighbor) && !visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  return []; // Not connected
}

export function getPathCells(
  puzzle: WaywordsPuzzle,
  state: RuntimeState
): Set<string> {
  const cells = new Set<string>();

  for (const word of puzzle.words.path) {
    if (state.foundPathWords[word.wordId]) {
      for (const placement of word.placements) {
        for (const cellId of placement) {
          cells.add(cellId);
        }
      }
    }
  }

  return cells;
}

function buildNeighborMap(puzzle: WaywordsPuzzle): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const cellMap = new Map(puzzle.grid.cells.map(c => [c.id, c]));

  for (const cell of puzzle.grid.cells) {
    if (cell.type === 'VOID') continue;

    const neighbors: string[] = [];
    // ORTHO_4: up, right, down, left (stable order)
    const deltas = [[0, -1], [1, 0], [0, 1], [-1, 0]];

    for (const [dx, dy] of deltas) {
      const nx = cell.x + dx;
      const ny = cell.y + dy;
      const neighbor = Array.from(cellMap.values()).find(
        c => c.x === nx && c.y === ny && c.type !== 'VOID'
      );
      if (neighbor) {
        neighbors.push(neighbor.id);
      }
    }

    map.set(cell.id, neighbors);
  }

  return map;
}
