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
  selectionModel?: 'RAY_8DIR' | 'ADJACENT';
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
        
      } catch (e) {
        // Continue retry
        // console.log(`Attempt ${attempts} failed: ${(e as Error).message}`);
      }
    }
    throw new Error(`Failed to generate ${config.puzzleId} after 50 attempts`);
  }

  private attemptConstruction(words: WordList, config: GeneratorConfig) {
    const builder = new GridBuilder(5, 5);
    const model = config.selectionModel || 'RAY_8DIR';
    const geometry = model === 'RAY_8DIR' ? 'RAY' : 'SNAKE';
    
    // 1. Pick Path Words (3-4) using Chain Builder
    let chainAttempt = 0;
    let finalPathCandidates: string[] = [];
    let finalTotalLength = 0;
    
    while (chainAttempt < 100) {
      chainAttempt++;
      const pathCandidates: string[] = [];
      const usedWords = new Set<string>();
      let totalLength = 0;
      
      const startOptions = words.path.filter(w => w.length <= 6 && w.length >= 3);
      if (startOptions.length === 0) throw new Error("No valid start words");
      
      let currentWord = startOptions[Math.floor(Math.random() * startOptions.length)];
      pathCandidates.push(currentWord);
      usedWords.add(currentWord);
      totalLength += currentWord.length;
      
      while (pathCandidates.length < 4 && totalLength < 18) {
        const lastChar = currentWord[currentWord.length - 1];
        
        const candidates = words.path.filter(w => 
          !usedWords.has(w) && 
          w[0] === lastChar && 
          w.length <= 6 && w.length >= 3
        );
        
        if (candidates.length === 0) break;
        
        const nextWord = candidates[Math.floor(Math.random() * candidates.length)];
        
        if (totalLength + nextWord.length > 22) { 
           pathCandidates.push(nextWord);
           totalLength += nextWord.length;
           break;
        }
        
        pathCandidates.push(nextWord);
        usedWords.add(nextWord);
        totalLength += nextWord.length;
        currentWord = nextWord;
      }
      
      if (pathCandidates.length >= 3 && totalLength <= 25) {
        finalPathCandidates = pathCandidates;
        finalTotalLength = totalLength;
        break;
      }
    }
    
    if (finalPathCandidates.length < 3) {
       throw new Error(`Could not build valid word chain after 100 attempts`);
    }

    // 2. Recursive Backtracking for Path Placement
    const placedPathWords: any[] = [];
    const usedPathCells = new Set<string>();

    if (!this.recursivePathPlacement(builder, finalPathCandidates, 0, undefined, placedPathWords, usedPathCells, geometry)) {
      throw new Error("Could not place path words (backtracking exhausted)");
    }

    // 3. Place Bonus Words (1-2)
    const bonusCandidates = [...words.bonus].sort(() => Math.random() - 0.5);
    const placedBonusWords: any[] = [];
    
    for (const word of bonusCandidates) {
      if (placedBonusWords.length >= 1) break; // Start with 1 bonus
      
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

    // 4. Fill Distractors
    builder.fillDistractors();

    // 5. Build Final Object
    const gridObj = builder.exportGrid();
    
    const startCellId = placedPathWords[0].placements[0][0];
    const endCellId = placedPathWords[placedPathWords.length-1].placements[0][placedPathWords[placedPathWords.length-1].size - 1];
    
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

  // Recursive function to place words sequence
  private recursivePathPlacement(
    builder: GridBuilder,
    words: string[],
    index: number,
    startCellId: string | undefined, // Last cell of prev word
    results: any[],
    usedCells: Set<string>,
    geometry: 'RAY' | 'SNAKE'
  ): boolean {
    if (index >= words.length) return true; // All placed!

    const word = words[index];
    const options = builder.findAllPathOptions(word, startCellId, geometry);
    
    for (const path of options) {
      // Manual commit to grid cells
      // Check if we overlap correctly (grid builder checks chars, but we must update state)
      path.forEach((id, i) => {
        const cell = builder.getCellById(id)!;
        if (cell.value === '') cell.value = word[i];
      });

      // Recurse
      const nextStart = path[path.length - 1];
      const wordObj = {
        wordId: word,
        tokens: word.split('').map(c => ({ t: 'L', v: c })),
        size: word.length,
        placements: [path]
      };
      
      results.push(wordObj);
      path.forEach(id => usedCells.add(id));

      if (this.recursivePathPlacement(builder, words, index + 1, nextStart, results, usedCells, geometry)) {
        return true;
      }

      // Backtrack
      results.pop();
      path.forEach(id => usedCells.delete(id)); 
      
      // Revert grid cells
      const toClear = startCellId ? path.slice(1) : path;
      builder.removePath(toClear);
    }

    return false;
  }
}
