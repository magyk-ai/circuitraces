import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCoverageThreshold, getMinIntersections, getMinRouteLength } from './validation-constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DAILY_DIR = path.resolve(__dirname, '../../../apps/web/public/daily');
const args = process.argv.slice(2);
const failOnError = args.includes('--failOnError');
const profile = getArgValue('--profile') ?? 'EASY_DAILY_V1';

interface DailyIndex {
  schedule: {
    date: string;
    puzzles: Record<string, DailyPuzzleMeta>;
  }[];
}

interface DailyPuzzleMeta {
  puzzlePath: string;
}

interface PuzzleWordEntry {
  wordId: string;
  placements: string[][];
}

interface PuzzleContent {
  grid: {
    width: number;
    height: number;
    cells: {
      id: string;
      x: number;
      y: number;
      type: string;
    }[];
    start: { adjacentCellId: string };
    end: { adjacentCellId: string };
  };
  words: {
    path: PuzzleWordEntry[];
    additional: PuzzleWordEntry[];
  };
}

interface QaError {
  code: string;
  message: string;
}

type ContentProfileName = 'EASY_DAILY_V1';

interface ContentProfile {
  name: ContentProfileName;
  minPathWords: number;
  maxPathWords: number;
  requireTopStart: boolean;
  requireBottomEnd: boolean;
  requireWordIntersectionConnectivity: boolean;
  minIntersections: (pathWordCount: number) => number;
  minCoverage: (width: number, height: number) => number;
  minRouteLength: (height: number) => number;
}

async function main() {
  console.log("🔍 Starting Content QA Scan...");

  const indexPath = path.join(DAILY_DIR, 'index.json');
  const indexContent = await fs.readFile(indexPath, 'utf-8');
  const index: DailyIndex = JSON.parse(indexContent);

  let totalPuzzles = 0;
  let totalPathWords = 0;
  let totalBonusWords = 0;
  let minPathLen = Number.POSITIVE_INFINITY;
  let maxPathLen = 0;
  let totalErrors = 0;

  console.log(`\nFound ${index.schedule.length} days in schedule.\n`);

  for (const entry of index.schedule) {
    console.log(`📅 Date: ${entry.date}`);
    const topics = Object.keys(entry.puzzles);
    for (const topic of topics) {
      const meta = entry.puzzles[topic];
      const relPath = meta.puzzlePath.startsWith('/') ? meta.puzzlePath.slice(1) : meta.puzzlePath;
      const puzzlePath = path.resolve(DAILY_DIR, '..', relPath);
      const filename = path.basename(meta.puzzlePath);

      try {
        const content = await fs.readFile(puzzlePath, 'utf-8');
        const puzzle: PuzzleContent = JSON.parse(content);

        const errors = evaluatePuzzle(puzzle, profile);
        totalErrors += errors.length;

        const pathWordCount = puzzle.words.path.length;
        const bonusWordCount = puzzle.words.additional.length;
        const pathTotalLen = puzzle.words.path.reduce((acc, w) => acc + w.wordId.length, 0);

        totalPuzzles++;
        totalPathWords += pathWordCount;
        totalBonusWords += bonusWordCount;
        minPathLen = Math.min(minPathLen, pathTotalLen);
        maxPathLen = Math.max(maxPathLen, pathTotalLen);

        const status = errors.length > 0 ? `❌ ${errors.map(e => e.code).join(', ')}` : "✅ OK";
        const intersectionCount = getIntersectionCount(puzzle);
        console.log(
          `  - [${topic.padEnd(20)}] Path: ${pathWordCount} words (${pathTotalLen} chars) | Bonus: ${bonusWordCount} | Intersections: ${intersectionCount} | ${status}`
        );
        for (const error of errors) {
          console.log(`      [${error.code}] ${error.message}`);
        }
      } catch (e) {
        console.error(`  ❌ Failed to load ${filename}: ${(e as Error).message}`);
        totalErrors++;
      }
    }
  }

  console.log("\n📊 Summary Stats");
  console.log("----------------");
  console.log(`Total Puzzles: ${totalPuzzles}`);
  console.log(`Avg Path Words: ${(totalPathWords / totalPuzzles).toFixed(1)}`);
  console.log(`Avg Bonus Words: ${(totalBonusWords / totalPuzzles).toFixed(1)}`);
  console.log(`Path Length Range: ${minPathLen} - ${maxPathLen} chars`);

  if (totalErrors > 0) {
    const guidance = failOnError ? '' : ' Re-run with --failOnError to fail the command.';
    console.error(`\n🚫 Content QA found ${totalErrors} error(s).${guidance}`);
    if (failOnError) {
      process.exit(1);
    }
  }
}

export function evaluatePuzzle(puzzle: PuzzleContent, profileName: string): QaError[] {
  const errors: QaError[] = [];
  const profileConfig = getProfile(profileName);
  const cellById = new Map(puzzle.grid.cells.map(cell => [cell.id, cell]));
  const pathCells = new Set<string>();
  const pathPlacements = puzzle.words.path.map(word => word.placements?.[0] ?? []);
  for (const placement of pathPlacements) {
    placement.forEach(cellId => pathCells.add(cellId));
  }

  const startCell = cellById.get(puzzle.grid.start.adjacentCellId);
  const endCell = cellById.get(puzzle.grid.end.adjacentCellId);
  if (!startCell) {
    errors.push({ code: 'ERR_QA_START_MISSING', message: `Start cell ${puzzle.grid.start.adjacentCellId} not found` });
  } else if (profileConfig.requireTopStart && startCell.y !== 0) {
    errors.push({ code: 'ERR_QA_START_NOT_TOP_ROW', message: `Start tile is at y=${startCell.y}, expected 0` });
  }

  if (!endCell) {
    errors.push({ code: 'ERR_QA_END_MISSING', message: `End cell ${puzzle.grid.end.adjacentCellId} not found` });
  } else if (profileConfig.requireBottomEnd && endCell.y !== puzzle.grid.height - 1) {
    errors.push({ code: 'ERR_QA_END_NOT_BOTTOM_ROW', message: `End tile is at y=${endCell.y}, expected ${puzzle.grid.height - 1}` });
  }

  const pathWordCount = puzzle.words.path.length;
  if (pathWordCount < profileConfig.minPathWords) {
    errors.push({ code: 'ERR_QA_TOO_FEW_PATH_WORDS', message: `Only ${pathWordCount} path words (min ${profileConfig.minPathWords})` });
  }
  if (pathWordCount > profileConfig.maxPathWords) {
    errors.push({ code: 'ERR_QA_TOO_MANY_PATH_WORDS', message: `Too many path words (${pathWordCount} > ${profileConfig.maxPathWords})` });
  }

  const coverageThreshold = profileConfig.minCoverage(puzzle.grid.width, puzzle.grid.height);
  if (pathCells.size < coverageThreshold) {
    errors.push({
      code: 'ERR_QA_PATH_COVERAGE_TOO_LOW',
      message: `${pathCells.size} unique path cells (< ${coverageThreshold} required)`
    });
  }

  if (startCell && endCell) {
    const routeLength = shortestPathLength(puzzle.grid.cells, startCell.id, endCell.id, pathCells);
    const minRouteLength = profileConfig.minRouteLength(puzzle.grid.height);
    if (routeLength === null || routeLength < minRouteLength) {
      errors.push({
        code: 'ERR_QA_ROUTE_TOO_SHORT',
        message: `Route length ${routeLength ?? 'null'} shorter than ${minRouteLength}`
      });
    }
  }

  const intersectionCount = getIntersectionCount(puzzle);
  const minIntersections = profileConfig.minIntersections(pathWordCount);
  if (intersectionCount < minIntersections) {
    errors.push({
      code: 'ERR_QA_PATH_INTERSECTIONS_TOO_LOW',
      message: `${intersectionCount} intersections (< ${minIntersections} required)`
    });
  }

  if (profileConfig.requireWordIntersectionConnectivity && startCell && endCell) {
    const wordConnectivity = buildWordIntersectionGraph(pathPlacements);
    const startIndex = pathPlacements.findIndex(p => p.includes(startCell.id));
    const endIndex = pathPlacements.findIndex(p => p.includes(endCell.id));
    if (startIndex >= 0 && endIndex >= 0) {
      if (!isWordGraphConnected(wordConnectivity, startIndex, endIndex)) {
        errors.push({
          code: 'ERR_QA_TOUCH_ONLY_CONNECTION',
          message: `Path word graph is not connected by intersections from START to END`
        });
      }
    }
  }

  // Check for parallel adjacency (words touching without intersecting)
  const adjacencyPairs = checkParallelAdjacency(puzzle, cellById);
  for (const pair of adjacencyPairs) {
    errors.push({
      code: 'ERR_QA_PARALLEL_ADJACENCY',
      message: `Words "${pair[0]}" and "${pair[1]}" touch orthogonally without intersecting`
    });
  }

  // Check for same-direction intersections
  const sameDirIntersections = checkIntersectionDirections(puzzle, cellById);
  for (const info of sameDirIntersections) {
    errors.push({
      code: 'ERR_QA_SAME_DIRECTION_INTERSECTION',
      message: `Words "${info.idA}" and "${info.idB}" intersect at cell ${info.cellId} with the same direction (${info.direction})`
    });
  }

  return errors;
}

function shortestPathLength(
  cells: PuzzleContent['grid']['cells'],
  startId: string,
  endId: string,
  pathCells: Set<string>
): number | null {
  const cellById = new Map(cells.map(cell => [cell.id, cell]));
  const coordKey = (x: number, y: number) => `${x},${y}`;
  const cellByCoord = new Map<string, typeof cells[number]>();
  for (const cell of cells) {
    cellByCoord.set(coordKey(cell.x, cell.y), cell);
  }

  if (!pathCells.has(startId) || !pathCells.has(endId)) return null;

  const queue: { id: string; dist: number }[] = [{ id: startId, dist: 0 }];
  const visited = new Set<string>([startId]);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.id === endId) return current.dist;
    const cell = cellById.get(current.id);
    if (!cell) continue;

    for (const [dx, dy] of dirs) {
      const neighbor = cellByCoord.get(coordKey(cell.x + dx, cell.y + dy));
      if (!neighbor) continue;
      if (!pathCells.has(neighbor.id)) continue;
      if (visited.has(neighbor.id)) continue;

      visited.add(neighbor.id);
      queue.push({ id: neighbor.id, dist: current.dist + 1 });
    }
  }

  return null;
}

function getProfile(profileName: string): ContentProfile {
  if (profileName !== 'EASY_DAILY_V1') {
    throw new Error(`Unknown content QA profile: ${profileName}`);
  }
  return {
    name: 'EASY_DAILY_V1',
    minPathWords: 4,
    maxPathWords: 6,
    requireTopStart: true,
    requireBottomEnd: true,
    requireWordIntersectionConnectivity: true,
    minIntersections: getMinIntersections,
    minCoverage: getCoverageThreshold,
    minRouteLength: getMinRouteLength,
  };
}

function getIntersectionCount(puzzle: PuzzleContent): number {
  const counts = new Map<string, number>();
  for (const word of puzzle.words.path) {
    const placement = word.placements?.[0] ?? [];
    for (const cellId of placement) {
      counts.set(cellId, (counts.get(cellId) ?? 0) + 1);
    }
  }
  let intersectionCount = 0;
  for (const count of counts.values()) {
    if (count >= 2) intersectionCount += 1;
  }
  return intersectionCount;
}

function buildWordIntersectionGraph(pathPlacements: string[][]): boolean[][] {
  const size = pathPlacements.length;
  const graph: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  for (let i = 0; i < size; i++) {
    graph[i][i] = true;
    const setA = new Set(pathPlacements[i]);
    for (let j = i + 1; j < size; j++) {
      const overlap = pathPlacements[j].some(cellId => setA.has(cellId));
      if (overlap) {
        graph[i][j] = true;
        graph[j][i] = true;
      }
    }
  }
  return graph;
}

function isWordGraphConnected(graph: boolean[][], startIndex: number, endIndex: number): boolean {
  const visited = new Set<number>();
  const queue = [startIndex];
  visited.add(startIndex);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === endIndex) return true;
    for (let i = 0; i < graph.length; i++) {
      if (!graph[current][i]) continue;
      if (visited.has(i)) continue;
      visited.add(i);
      queue.push(i);
    }
  }

  return false;
}

function getArgValue(flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

/**
 * Check for parallel adjacency - words that touch orthogonally without intersecting.
 * Returns array of [wordA, wordB] pairs.
 *
 * Two words have parallel adjacency if:
 * 1. They do NOT share any cells (no intersection), AND
 * 2. A cell from one word is orthogonally adjacent to a cell from the other word
 */
function checkParallelAdjacency(
  puzzle: PuzzleContent,
  cellById: Map<string, PuzzleContent['grid']['cells'][number]>
): [string, string][] {
  const pathWords = puzzle.words.path;
  if (pathWords.length < 2) return [];

  // Build position map for O(1) neighbor lookup
  const posMap = new Map<string, PuzzleContent['grid']['cells'][number]>();
  for (const cell of puzzle.grid.cells) {
    posMap.set(`${cell.x},${cell.y}`, cell);
  }

  const adjacencyPairs = new Set<string>();

  // For each pair of words, check if they have parallel adjacency
  for (let i = 0; i < pathWords.length; i++) {
    for (let j = i + 1; j < pathWords.length; j++) {
      const wordA = pathWords[i];
      const wordB = pathWords[j];
      const placementA = new Set(wordA.placements?.[0] ?? []);
      const placementB = new Set(wordB.placements?.[0] ?? []);

      if (placementA.size === 0 || placementB.size === 0) continue;

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
        const cell = cellById.get(cellId);
        if (!cell) continue;

        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dx, dy] of dirs) {
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

  return Array.from(adjacencyPairs).map(key => key.split('|') as [string, string]);
}

/**
 * Check that intersecting path words have different directions (H vs V).
 * Returns array of objects detailing the conflict.
 */
function checkIntersectionDirections(
  puzzle: PuzzleContent,
  cellById: Map<string, PuzzleContent['grid']['cells'][number]>
): { idA: string; idB: string; cellId: string; direction: string }[] {
  const pathWords = puzzle.words.path;
  if (pathWords.length < 2) return [];

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
    const c1 = cellById.get(placement[0]);
    const c2 = cellById.get(placement[1]);
    if (!c1 || !c2) return 'UNKNOWN';
    return c1.y === c2.y ? 'H' : 'V';
  };

  const conflicts: { idA: string; idB: string; cellId: string; direction: string }[] = [];

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
          conflicts.push({ idA, idB, cellId, direction: dirA });
        }
      }
    }
  }

  return conflicts;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
