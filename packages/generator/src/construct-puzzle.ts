import fs from 'fs/promises';
import path from 'path';
import type { Cell } from '@circuitraces/engine';
import { GridBuilder } from './grid-builder.js';

interface WordList {
  path: string[];
  bonus: string[];
}

interface GeneratorConfig {
  date: string;
  topicId: string;
  topicTitle: string; // "DevOps" etc
  puzzleId: string;   // "daily-2026-01-18-devops"
  title: string;      // "Ship It"
  tags: string[];
  selectionModel?: 'RAY_8DIR' | 'RAY_4DIR' | 'ADJACENT';
}

interface TokenLetter {
  t: 'L';
  v: string;
}

interface WordPlacement {
  wordId: string;
  tokens: TokenLetter[];
  size: number;
  placements: string[][];
  hintCellId?: string;
}

export class PuzzleConstructor {
  private wordlists: Record<string, WordList>;

  constructor(_wordlistsPath: string) {
    this.wordlists = {};
  }
  
  async loadWordlists(wordlistsPath: string) {
      const content = await fs.readFile(wordlistsPath, 'utf-8');
      const data = JSON.parse(content);
      this.wordlists = data.topics;
  }

  async generate(config: GeneratorConfig, outputDir: string) {
    const topicWords = this.wordlists[config.topicId];
    if (!topicWords) throw new Error(`Topic ${config.topicId} not found`);

    console.log(`Generating ${config.puzzleId} (${config.topicId})...`);

    // Retry loop - increased to handle parallel adjacency constraint
    const maxAttempts = 500;
    const escalateAfter = 50;
    let attempts = 0;
    while (attempts < maxAttempts) {
      attempts++;
      try {
        const preferLargerGrid = attempts > escalateAfter;
        const puzzle = this.attemptConstruction(topicWords, config, preferLargerGrid);
        
        const outPath = path.join(outputDir, `${config.puzzleId.replace('daily-', '')}.json`);
        
        await fs.writeFile(outPath, JSON.stringify(puzzle, null, 2));
        console.log(`✅ Success (Attempt ${attempts}): ${outPath}`);
        return puzzle;
        
      } catch {
        // Continue retry
        // console.log(`Attempt ${attempts} failed: ${(e as Error).message}`);
      }
    }
    throw new Error(`Failed to generate ${config.puzzleId} after ${maxAttempts} attempts`);
  }

  private attemptConstruction(words: WordList, config: GeneratorConfig, preferLargerGrid: boolean) {
    // Grid escalation: try 7x7 first, then 8x8; prefer 8x8 after repeated failures.
    const gridSizes: [number, number][] = preferLargerGrid ? [[8, 8], [7, 7]] : [[7, 7], [8, 8]];

    for (const [width, height] of gridSizes) {
      try {
        return this.tryConstruction(words, config, width, height);
      } catch {
        // Try next size
      }
    }
    throw new Error("Could not place words even on 8x8 grid");
  }

  private tryConstruction(words: WordList, config: GeneratorConfig, width: number, height: number) {
    const builder = new GridBuilder(width, height);
    const model = config.selectionModel || 'RAY_4DIR';
    const geometry: 'RAY' | 'SNAKE' = model === 'ADJACENT' ? 'SNAKE' : 'RAY';

    // 1. Choose path words (Easy: 4-6 words, forward-only)
    const MIN_PATH_WORDS = 4;
    const MAX_PATH_WORDS = 6;
    const validWords = words.path.filter(w => w.length >= 3 && w.length <= 7);
    if (validWords.length < MIN_PATH_WORDS) throw new Error("Not enough valid path words");

    const shuffled = [...validWords].sort(() => Math.random() - 0.5);
    const maxSelectable = Math.min(MAX_PATH_WORDS, shuffled.length);
    const numWords = MIN_PATH_WORDS + Math.floor(Math.random() * (maxSelectable - MIN_PATH_WORDS + 1));
    const poolSize = Math.min(shuffled.length, Math.max(numWords * 3, numWords + 4));
    const pathCandidates = shuffled.slice(0, poolSize);

    // 2. Choose START / END markers (START top row, END bottom row)
    const topCells = builder.getCellsInRow(0);
    if (topCells.length === 0) throw new Error("No cells available on top row for START");
    const startCell = topCells[Math.floor(Math.random() * topCells.length)];

    const bottomCells = builder.getCellsInRow(height - 1);
    if (bottomCells.length === 0) throw new Error("No cells available on bottom row for END");
    const farBottom = bottomCells.filter(c => Math.abs(c.x - startCell.x) >= 1);
    const endCandidates = farBottom.length > 0 ? farBottom : bottomCells;
    const endCell = endCandidates[Math.floor(Math.random() * endCandidates.length)];

    const placedPathWords: WordPlacement[] = [];
    const usedPathCells = new Set<string>();
    const cellToDirections = new Map<string, Set<'H' | 'V'>>();
    const placedCellsByChar = new Map<string, string[]>();

    // 3. Place first word anchored at START
    const firstWord = this.pickWordAnchoredAt(builder, pathCandidates, startCell.id, geometry);
    if (!firstWord) throw new Error("Could not anchor a path word at START");

    const firstOptions = builder.findAllPathOptions(firstWord, startCell.id, geometry);
    if (firstOptions.length === 0) throw new Error(`Cannot place first word: ${firstWord}`);

    const firstPath = firstOptions[Math.floor(Math.random() * firstOptions.length)];
    this.commitWordToGrid(builder, firstWord, firstPath);
    placedPathWords.push(this.createWordObj(firstWord, firstPath));
    // Determine direction for first word
    const firstDir: 'H' | 'V' = firstPath.length > 1 && builder.getCellById(firstPath[1])!.x > builder.getCellById(firstPath[0])!.x ? 'H' : 'V';
    firstPath.forEach(id => {
      usedPathCells.add(id);
      if (!cellToDirections.has(id)) cellToDirections.set(id, new Set());
      cellToDirections.get(id)!.add(firstDir);
    });
    this.recordCellChars(builder, firstPath, placedCellsByChar);

    const remainingWords = pathCandidates.filter(w => w !== firstWord);
    const middleTarget = numWords - 2;

    // 4. Place middle words via intersections only
    for (let i = 0; i < middleTarget; i++) {
      const placementResult = this.placeNextIntersectingWord(builder, remainingWords, placedCellsByChar, usedPathCells, cellToDirections);
      if (!placementResult) throw new Error("Cannot place intersecting middle word");
      const { word, placement, direction } = placementResult;
      placedPathWords.push(this.createWordObj(word, placement));
      placement.forEach(id => {
        usedPathCells.add(id);
        if (!cellToDirections.has(id)) cellToDirections.set(id, new Set());
        cellToDirections.get(id)!.add(direction);
      });
      this.recordCellChars(builder, placement, placedCellsByChar);
    }

    // 5. Place last word ending at END tile (must intersect existing path)
    const endingResult = this.placeEndingWord(builder, remainingWords, endCell, usedPathCells, cellToDirections);
    if (!endingResult) throw new Error("Cannot place ending word at END");
    const { word: endWord, placement: endPlacement, direction: endDir } = endingResult;
    placedPathWords.push(this.createWordObj(endWord, endPlacement));
    endPlacement.forEach(id => {
      usedPathCells.add(id);
      if (!cellToDirections.has(id)) cellToDirections.set(id, new Set());
      cellToDirections.get(id)!.add(endDir);
    });
    this.recordCellChars(builder, endPlacement, placedCellsByChar);

    // Ensure intersection density meets Easy Daily requirements
    const intersectionCount = this.getIntersectionCount(placedPathWords);
    if (intersectionCount < numWords - 1) {
      throw new Error(`Path intersections too low (${intersectionCount}/${numWords - 1})`);
    }

    // Reject puzzles with parallel adjacency (non-intersecting words that touch)
    if (this.hasParallelAdjacency(builder, placedPathWords)) {
      throw new Error('Parallel adjacency detected (non-intersecting touching words)');
    }

    // 6. Place Bonus Word (1)
    const pathWordIds = new Set(placedPathWords.map(word => word.wordId));
    const bonusCandidates = words.bonus
      .filter(word => !pathWordIds.has(word))
      .sort(() => Math.random() - 0.5);
    const placedBonusWords: WordPlacement[] = [];
    for (const word of bonusCandidates) {
      if (placedBonusWords.length >= 1) break;
      const res = builder.tryPlaceBonusWord(word, usedPathCells, geometry);
      if (res) {
        placedBonusWords.push({
          wordId: word,
          tokens: word.split('').map(c => ({ t: 'L', v: c })),
          size: word.length,
          placements: [res.placement],
          hintCellId: res.hintCellId
        });
      }
    }
    if (placedBonusWords.length === 0) throw new Error("Could not place bonus word");

    // 7. Verify connectivity & coverage constraints
    if (!this.verifyConnectivity(builder, usedPathCells)) {
      throw new Error("Path words are not connected");
    }

    const coverageThreshold = this.getCoverageThreshold(width, height);
    if (usedPathCells.size < coverageThreshold) {
      throw new Error(`Path coverage too low (${usedPathCells.size}/${coverageThreshold})`);
    }

    const routeLength = this.computeShortestPathLength(builder, startCell.id, endCell.id, usedPathCells);
    if (routeLength === null || routeLength < height - 1) {
      throw new Error(`Route too short (${routeLength ?? 'null'})`);
    }

    // 8. Fill remaining cells
    builder.fillDistractors();

    const gridObj = builder.exportGrid();

    const puzzle = {
      puzzleId: config.puzzleId,
      theme: config.title,
      config: {
        selectionModel: model,
        connectivityModel: "ORTHO_4",
        allowReverseSelection: true
      },
      grid: {
        ...gridObj,
        start: { adjacentCellId: startCell.id },
        end: { adjacentCellId: endCell.id }
      },
      words: {
        path: placedPathWords,
        additional: placedBonusWords
      }
    };

    return puzzle;
  }

  private commitWordToGrid(builder: GridBuilder, word: string, path: string[]) {
    path.forEach((id, i) => {
      const cell = builder.getCellById(id)!;
      if (cell.value === '') cell.value = word[i];
    });
  }

  private createWordObj(word: string, path: string[]): WordPlacement {
    return {
      wordId: word,
      tokens: word.split('').map(c => ({ t: 'L', v: c })),
      size: word.length,
      placements: [path]
    };
  }

  private recordCellChars(builder: GridBuilder, path: string[], map: Map<string, string[]>) {
    for (const cellId of path) {
      const cell = builder.getCellById(cellId)!;
      const char = cell.value || '';
      if (char === '') continue; // Skip empty cells
      if (!map.has(char)) map.set(char, []);
      map.get(char)!.push(cellId);
    }
  }

  /**
   * Place word intersecting with existing placed cells at ANY index k
   * (Not just first letter - supports intersection anywhere in the word)
   */
  private placeWordWithIntersection(
    builder: GridBuilder,
    word: string,
    placedCellsByChar: Map<string, string[]>,
    usedCells: Set<string>,
    cellToDirections: Map<string, Set<'H' | 'V'>>
  ): { placement: string[]; direction: 'H' | 'V' } | null {
    // For each letter in word at index k
    const indices = Array.from({ length: word.length }, (_, i) => i).sort(() => Math.random() - 0.5);

    for (const k of indices) {
      const char = word[k];
      const matchingCells = placedCellsByChar.get(char) || [];

      // Shuffle matching cells
      const shuffledCells = [...matchingCells].sort(() => Math.random() - 0.5);

      for (const intersectCellId of shuffledCells) {
        const intersectCell = builder.getCellById(intersectCellId)!;

        // Try both forward directions (→ and ↓)
        const forwardDirs: [number, number][] = [[1, 0], [0, 1]];
        for (const [dx, dy] of forwardDirs) {
          // Compute start position: start = intersect - k * direction
          const startX = intersectCell.x - (k * dx);
          const startY = intersectCell.y - (k * dy);

          const direction = dx === 1 ? 'H' : 'V';
          const placement = this.tryPlaceRay(builder, word, startX, startY, dx, dy, usedCells, cellToDirections);
          if (placement) {
            this.commitWordToGrid(builder, word, placement);
            return { placement, direction };
          }
        }
      }
    }

    return null;
  }

  private placeWordEndingAt(
    builder: GridBuilder,
    word: string,
    endCell: Cell,
    usedCells: Set<string>,
    cellToDirections: Map<string, Set<'H' | 'V'>>
  ): { placement: string[]; direction: 'H' | 'V' } | null {
    const forwardDirs: [number, number][] = [[1, 0], [0, 1]];

    for (const [dx, dy] of forwardDirs) {
      const startX = endCell.x - (word.length - 1) * dx;
      const startY = endCell.y - (word.length - 1) * dy;

      const direction = dx === 1 ? 'H' : 'V';
      const placement = this.tryPlaceRay(builder, word, startX, startY, dx, dy, usedCells, cellToDirections);
      if (placement && placement[placement.length - 1] === endCell.id) {
        const intersects = placement.some(id => usedCells.has(id));
        if (!intersects) continue;
        this.commitWordToGrid(builder, word, placement);
        return { placement, direction };
      }
    }

    return null;
  }

  private pickWordAnchoredAt(
    builder: GridBuilder,
    candidates: string[],
    startCellId: string,
    geometry: 'RAY' | 'SNAKE'
  ): string | null {
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    for (const word of shuffled) {
      const options = builder.findAllPathOptions(word, startCellId, geometry);
      if (options.length > 0) return word;
    }
    return null;
  }

  private placeNextIntersectingWord(
    builder: GridBuilder,
    remainingWords: string[],
    placedCellsByChar: Map<string, string[]>,
    usedCells: Set<string>,
    cellToDirections: Map<string, Set<'H' | 'V'>>
  ): { word: string; placement: string[]; direction: 'H' | 'V' } | null {
    const shuffled = [...remainingWords].sort(() => Math.random() - 0.5);
    for (const word of shuffled) {
      const result = this.placeWordWithIntersection(builder, word, placedCellsByChar, usedCells, cellToDirections);
      if (!result) continue;
      const { placement, direction } = result;
      const intersects = placement.some(id => usedCells.has(id));
      if (!intersects) continue;

      const index = remainingWords.indexOf(word);
      if (index >= 0) remainingWords.splice(index, 1);
      return { word, placement, direction };
    }
    return null;
  }

  private placeEndingWord(
    builder: GridBuilder,
    remainingWords: string[],
    endCell: Cell,
    usedCells: Set<string>,
    cellToDirections: Map<string, Set<'H' | 'V'>>
  ): { word: string; placement: string[]; direction: 'H' | 'V' } | null {
    const shuffled = [...remainingWords].sort(() => Math.random() - 0.5);
    for (const word of shuffled) {
      const result = this.placeWordEndingAt(builder, word, endCell, usedCells, cellToDirections);
      if (!result) continue;
      const { placement, direction } = result;
      const intersects = placement.some(id => usedCells.has(id));
      if (!intersects) continue;

      const index = remainingWords.indexOf(word);
      if (index >= 0) remainingWords.splice(index, 1);
      return { word, placement, direction };
    }
    return null;
  }

  private tryPlaceRay(
    builder: GridBuilder,
    word: string,
    startX: number,
    startY: number,
    dx: number,
    dy: number,
    usedCells: Set<string>,
    cellToDirections: Map<string, Set<'H' | 'V'>>
  ): string[] | null {
    const direction = dx === 1 ? 'H' : 'V';
    const path: string[] = [];

    for (let i = 0; i < word.length; i++) {
      const cx = startX + (i * dx);
      const cy = startY + (i * dy);
      const cell = builder.getCell(cx, cy);

      if (!cell) return null; // Out of bounds

      // Check character compatibility
      if (cell.value !== '' && cell.value !== word[i]) return null;

      // Check overlap with existing cells (allow if character matches)
      if (usedCells.has(cell.id)) {
        if (cell.value !== word[i]) return null;
        // Direction conflict check: If this cell is an intersection, it must NOT have the same direction
        if (cellToDirections.get(cell.id)?.has(direction)) return null;
      }

      path.push(cell.id);
    }

    return path;
  }

  /**
   * Verify all path word cells are connected via ORTHO_4 adjacency
   */
  private verifyConnectivity(builder: GridBuilder, usedCells: Set<string>): boolean {
    if (usedCells.size === 0) return true;

    const cellList = Array.from(usedCells);
    const visited = new Set<string>();
    const queue = [cellList[0]];
    visited.add(cellList[0]);

    while (queue.length > 0) {
      const cellId = queue.shift()!;
      const cell = builder.getCellById(cellId)!;

      // Check ORTHO_4 neighbors
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [dx, dy] of dirs) {
        const neighbor = builder.getCell(cell.x + dx, cell.y + dy);
        if (neighbor && usedCells.has(neighbor.id) && !visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          queue.push(neighbor.id);
        }
      }
    }

    return visited.size === usedCells.size;
  }

  private getCoverageThreshold(width: number, height: number): number {
    if (width === 6 && height === 6) return 14;
    if (width === 7 && height === 7) return 18;
    if (width === 8 && height === 8) return 22;
    return Math.max(12, Math.floor((width * height) / 4));
  }

  private computeShortestPathLength(
    builder: GridBuilder,
    startId: string,
    endId: string,
    pathCells: Set<string>
  ): number | null {
    const cells = builder.getCells();
    const cellById = new Map(cells.map(c => [c.id, c]));
    const cellByCoord = new Map<string, Cell>();
    cells.forEach(c => cellByCoord.set(`${c.x},${c.y}`, c));

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
        const neighbor = cellByCoord.get(`${cell.x + dx},${cell.y + dy}`);
        if (!neighbor) continue;
        if (!pathCells.has(neighbor.id)) continue;
        if (visited.has(neighbor.id)) continue;

        visited.add(neighbor.id);
        queue.push({ id: neighbor.id, dist: current.dist + 1 });
      }
    }

    return null;
  }

  private getIntersectionCount(pathWords: WordPlacement[]): number {
    const counts = new Map<string, number>();
    for (const word of pathWords) {
      const placement = word.placements?.[0] ?? [];
      for (const cellId of placement) {
        counts.set(cellId, (counts.get(cellId) ?? 0) + 1);
      }
    }
    let intersections = 0;
    for (const count of counts.values()) {
      if (count >= 2) intersections += 1;
    }
    return intersections;
  }

  /**
   * Check for "parallel adjacency" - words that touch orthogonally without intersecting.
   * This creates visual confusion when two highlighted words run parallel/adjacent.
   * Returns true if any such adjacency is found (meaning the puzzle should be rejected).
   *
   * Two words have parallel adjacency if:
   * 1. They do NOT share any cells (no intersection), AND
   * 2. A cell from one word is orthogonally adjacent to a cell from the other word
   */
  private hasParallelAdjacency(builder: GridBuilder, pathWords: WordPlacement[]): boolean {
    if (pathWords.length < 2) return false;

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
        for (const cellId of placementA) {
          const cell = builder.getCellById(cellId);
          if (!cell) continue;

          const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
          for (const [dx, dy] of dirs) {
            const neighbor = builder.getCell(cell.x + dx, cell.y + dy);
            if (neighbor && placementB.has(neighbor.id)) {
              // Found parallel adjacency
              return true;
            }
          }
        }
      }
    }

    return false;
  }
}
