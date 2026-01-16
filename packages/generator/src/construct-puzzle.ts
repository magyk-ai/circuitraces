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

    // Retry loop
    let attempts = 0;
    while (attempts < 50) {
      attempts++;
      try {
        const puzzle = this.attemptConstruction(topicWords, config);
        
        const outPath = path.join(outputDir, `${config.puzzleId.replace('daily-', '')}.json`);
        
        await fs.writeFile(outPath, JSON.stringify(puzzle, null, 2));
        console.log(`✅ Success (Attempt ${attempts}): ${outPath}`);
        return puzzle;
        
      } catch {
        // Continue retry
        // console.log(`Attempt ${attempts} failed: ${(e as Error).message}`);
      }
    }
    throw new Error(`Failed to generate ${config.puzzleId} after 50 attempts`);
  }

  private attemptConstruction(words: WordList, config: GeneratorConfig) {
    // Grid escalation: try 6x6 first, then 7x7
    const gridSizes: [number, number][] = [[6, 6], [7, 7]];

    for (const [width, height] of gridSizes) {
      try {
        return this.tryConstruction(words, config, width, height);
      } catch {
        // Try next size
      }
    }
    throw new Error("Could not place words even on 7x7 grid");
  }

  private tryConstruction(words: WordList, config: GeneratorConfig, width: number, height: number) {
    const builder = new GridBuilder(width, height);
    const model = config.selectionModel || 'RAY_4DIR';
    const geometry: 'RAY' | 'SNAKE' = model === 'ADJACENT' ? 'SNAKE' : 'RAY';

    // 1. Choose path words (Easy: 4-6 words, forward-only)
    const MIN_PATH_WORDS = 4;
    const MAX_PATH_WORDS = 6;
    const validWords = words.path.filter(w => w.length >= 3 && w.length <= 6);
    if (validWords.length < MIN_PATH_WORDS) throw new Error("Not enough valid path words");

    const shuffled = [...validWords].sort(() => Math.random() - 0.5);
    const maxSelectable = Math.min(MAX_PATH_WORDS, shuffled.length);
    const numWords = MIN_PATH_WORDS + Math.floor(Math.random() * (maxSelectable - MIN_PATH_WORDS + 1));
    const pathCandidates = shuffled.slice(0, numWords);

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
    const placedCellsByChar = new Map<string, string[]>();

    // 3. Place first word anchored at START
    const firstWord = pathCandidates[0];
    const firstOptions = builder.findAllPathOptions(firstWord, startCell.id, geometry);
    if (firstOptions.length === 0) throw new Error(`Cannot place first word: ${firstWord}`);

    const firstPath = firstOptions[Math.floor(Math.random() * firstOptions.length)];
    this.commitWordToGrid(builder, firstWord, firstPath);
    placedPathWords.push(this.createWordObj(firstWord, firstPath));
    firstPath.forEach(id => usedPathCells.add(id));
    this.recordCellChars(builder, firstPath, placedCellsByChar);

    // 4. Place middle words via intersections
    const middleWords = pathCandidates.slice(1, -1);
    for (const word of middleWords) {
      const placement = this.placeWordWithIntersection(builder, word, placedCellsByChar, usedPathCells, geometry);
      if (!placement) throw new Error(`Cannot place word: ${word}`);
      placedPathWords.push(this.createWordObj(word, placement));
      placement.forEach(id => usedPathCells.add(id));
      this.recordCellChars(builder, placement, placedCellsByChar);
    }

    // 5. Place last word ending at END tile
    const lastWord = pathCandidates[pathCandidates.length - 1];
    const endingPlacement = this.placeWordEndingAt(builder, lastWord, endCell, usedPathCells);
    if (!endingPlacement) throw new Error(`Cannot place word: ${lastWord}`);
    placedPathWords.push(this.createWordObj(lastWord, endingPlacement));
    endingPlacement.forEach(id => usedPathCells.add(id));
    this.recordCellChars(builder, endingPlacement, placedCellsByChar);

    // 6. Place Bonus Word (1)
    const bonusCandidates = [...words.bonus].sort(() => Math.random() - 0.5);
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
    geometry: 'RAY' | 'SNAKE'
  ): string[] | null {
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

          const placement = this.tryPlaceRay(builder, word, startX, startY, dx, dy, usedCells, intersectCellId);
          if (placement) {
            this.commitWordToGrid(builder, word, placement);
            return placement;
          }
        }
      }
    }

    // If no intersection works, try placing anywhere
    const options = builder.findAllPathOptions(word, undefined, geometry);
    for (const path of options) {
      // Check no overlap with existing cells (except shared chars)
      let valid = true;
      for (let i = 0; i < path.length; i++) {
        const cell = builder.getCellById(path[i])!;
        if (usedCells.has(path[i]) && cell.value !== word[i]) {
          valid = false;
          break;
        }
      }
      if (valid) {
        this.commitWordToGrid(builder, word, path);
        return path;
      }
    }

    return null;
  }

  private placeWordEndingAt(
    builder: GridBuilder,
    word: string,
    endCell: Cell,
    usedCells: Set<string>
  ): string[] | null {
    const forwardDirs: [number, number][] = [[1, 0], [0, 1]];

    for (const [dx, dy] of forwardDirs) {
      const startX = endCell.x - (word.length - 1) * dx;
      const startY = endCell.y - (word.length - 1) * dy;

      const placement = this.tryPlaceRay(builder, word, startX, startY, dx, dy, usedCells, endCell.id);
      if (placement && placement[placement.length - 1] === endCell.id) {
        this.commitWordToGrid(builder, word, placement);
        return placement;
      }
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
    intersectCellId: string
  ): string[] | null {
    const path: string[] = [];

    for (let i = 0; i < word.length; i++) {
      const cx = startX + (i * dx);
      const cy = startY + (i * dy);
      const cell = builder.getCell(cx, cy);

      if (!cell) return null; // Out of bounds

      // Check character compatibility
      if (cell.value !== '' && cell.value !== word[i]) return null;

      // Check overlap with existing cells (allow at intersection point)
      if (usedCells.has(cell.id) && cell.id !== intersectCellId) {
        // Only allow if character matches (genuine intersection)
        if (cell.value !== word[i]) return null;
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
}
