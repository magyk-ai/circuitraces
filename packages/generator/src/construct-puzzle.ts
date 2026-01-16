import fs from 'fs/promises';
import path from 'path';
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
    // Default to RAY_4DIR for easy, forward-only puzzles
    const model = config.selectionModel || 'RAY_4DIR';
    const geometry: 'RAY' | 'SNAKE' = model === 'ADJACENT' ? 'SNAKE' : 'RAY';

    // 1. Pick 3-4 random path words (NO chain requirement)
    const validWords = words.path.filter(w => w.length >= 3 && w.length <= 6);
    if (validWords.length < 3) throw new Error("Not enough valid path words");

    // Shuffle and pick 3-4 words
    const shuffled = [...validWords].sort(() => Math.random() - 0.5);
    const numWords = Math.random() < 0.5 ? 3 : 4;
    const pathCandidates = shuffled.slice(0, Math.min(numWords, shuffled.length));

    // 2. Place words with intersection-based connectivity
    const placedPathWords: any[] = [];
    const usedPathCells = new Set<string>();
    const placedCellsByChar = new Map<string, string[]>(); // char -> cellIds

    // Place first word anywhere (forward direction only)
    const firstWord = pathCandidates[0];
    const firstOptions = builder.findAllPathOptions(firstWord, undefined, geometry);
    if (firstOptions.length === 0) throw new Error(`Cannot place first word: ${firstWord}`);

    const firstPath = firstOptions[0];
    this.commitWordToGrid(builder, firstWord, firstPath);
    placedPathWords.push(this.createWordObj(firstWord, firstPath));
    firstPath.forEach(id => usedPathCells.add(id));
    this.recordCellChars(builder, firstPath, placedCellsByChar);

    // Place subsequent words with intersection at arbitrary index
    for (let i = 1; i < pathCandidates.length; i++) {
      const word = pathCandidates[i];
      const placed = this.placeWordWithIntersection(builder, word, placedCellsByChar, usedPathCells, geometry);

      if (!placed) throw new Error(`Cannot place word: ${word}`);

      placedPathWords.push(this.createWordObj(word, placed));
      placed.forEach(id => usedPathCells.add(id));
      this.recordCellChars(builder, placed, placedCellsByChar);
    }

    // 3. Place Bonus Words (1-2)
    const bonusCandidates = [...words.bonus].sort(() => Math.random() - 0.5);
    const placedBonusWords: any[] = [];

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

    // 4. Verify connectivity (BFS from first word to all others)
    if (!this.verifyConnectivity(builder, usedPathCells)) {
      throw new Error("Path words are not connected");
    }

    // 5. Fill Distractors
    builder.fillDistractors();

    // 6. Build Final Object
    const gridObj = builder.exportGrid();

    const startCellId = placedPathWords[0].placements[0][0];
    const lastWord = placedPathWords[placedPathWords.length - 1];
    const endCellId = lastWord.placements[0][lastWord.size - 1];

    const puzzle = {
      puzzleId: config.puzzleId,
      theme: config.title,
      config: {
        selectionModel: model,
        connectivityModel: "ORTHO_4",
        allowReverseSelection: true  // Players can swipe from either end
      },
      grid: {
        ...gridObj,
        start: { adjacentCellId: startCellId },
        end: { adjacentCellId: endCellId }
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

  private createWordObj(word: string, path: string[]) {
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

}
