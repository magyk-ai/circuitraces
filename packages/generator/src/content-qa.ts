import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DAILY_DIR = path.resolve(__dirname, '../../../apps/web/public/daily');
const args = process.argv.slice(2);
const failOnError = args.includes('--failOnError');

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

        const errors = evaluatePuzzle(puzzle);
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
        console.log(`  - [${topic.padEnd(20)}] Path: ${pathWordCount} words (${pathTotalLen} chars) | Bonus: ${bonusWordCount} | ${status}`);
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

function evaluatePuzzle(puzzle: PuzzleContent): QaError[] {
  const errors: QaError[] = [];
  const cellById = new Map(puzzle.grid.cells.map(cell => [cell.id, cell]));
  const pathCells = new Set<string>();
  for (const word of puzzle.words.path) {
    const placement = word.placements?.[0] || [];
    placement.forEach(cellId => pathCells.add(cellId));
  }

  const startCell = cellById.get(puzzle.grid.start.adjacentCellId);
  const endCell = cellById.get(puzzle.grid.end.adjacentCellId);
  if (!startCell) {
    errors.push({ code: 'ERR_QA_START_MISSING', message: `Start cell ${puzzle.grid.start.adjacentCellId} not found` });
  } else if (startCell.y !== 0) {
    errors.push({ code: 'ERR_QA_START_NOT_TOP_ROW', message: `Start tile is at y=${startCell.y}, expected 0` });
  }

  if (!endCell) {
    errors.push({ code: 'ERR_QA_END_MISSING', message: `End cell ${puzzle.grid.end.adjacentCellId} not found` });
  } else if (endCell.y !== puzzle.grid.height - 1) {
    errors.push({ code: 'ERR_QA_END_NOT_BOTTOM_ROW', message: `End tile is at y=${endCell.y}, expected ${puzzle.grid.height - 1}` });
  }

  const pathWordCount = puzzle.words.path.length;
  if (pathWordCount < 4) {
    errors.push({ code: 'ERR_QA_TOO_FEW_PATH_WORDS', message: `Only ${pathWordCount} path words (min 4)` });
  }
  if (pathWordCount > 6) {
    errors.push({ code: 'ERR_QA_TOO_MANY_PATH_WORDS', message: `Too many path words (${pathWordCount} > 6)` });
  }

  const coverageThreshold = getCoverageThreshold(puzzle.grid.width, puzzle.grid.height);
  if (pathCells.size < coverageThreshold) {
    errors.push({
      code: 'ERR_QA_PATH_COVERAGE_TOO_LOW',
      message: `${pathCells.size} unique path cells (< ${coverageThreshold} required)`
    });
  }

  if (startCell && endCell) {
    const routeLength = shortestPathLength(puzzle.grid.cells, startCell.id, endCell.id, pathCells);
    if (routeLength === null || routeLength < puzzle.grid.height - 1) {
      errors.push({
        code: 'ERR_QA_ROUTE_TOO_SHORT',
        message: `Route length ${routeLength ?? 'null'} shorter than ${puzzle.grid.height - 1}`
      });
    }
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

function getCoverageThreshold(width: number, height: number): number {
  if (width === 6 && height === 6) return 14;
  if (width === 7 && height === 7) return 18;
  return Math.max(12, Math.floor((width * height) / 4));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
