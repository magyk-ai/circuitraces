import { Cell } from '@circuitraces/engine';
// Grid interface might not be exported or named differently, checking types.ts...
// If Grid is not exported, we define our own partial or use what is available.
// Engine uses 'GameState' mostly. Let's just use internal representation for Builder.

export class GridBuilder {
  private width: number;
  private height: number;
  private cells: Cell[] = [];
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initializeGrid();
  }

  private initializeGrid() {
    this.cells = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.cells.push({
          id: `r${y}c${x}`,
          x,
          y,
          type: 'LETTER',
          value: '' // Empty initially
        });
      }
    }
  }

  getCell(x: number, y: number): Cell | undefined {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return undefined;
    return this.cells.find(c => c.x === x && c.y === y);
  }

  getCellById(id: string): Cell | undefined {
    return this.cells.find(c => c.id === id);
  }

  getEmptyCells(): Cell[] {
    return this.cells.filter(c => c.value === '');
  }

  // Return ALL valid paths for a word starting at startCellId (or anywhere if null)
  findAllPathOptions(word: string, startCellId?: string): string[][] {
    const candidates = startCellId 
      ? [this.getCellById(startCellId)!] 
      : this.getEmptyCells().sort(() => Math.random() - 0.5);

    const validPaths: string[][] = [];

    for (const startCell of candidates) {
      // We always consume the first char at startCell.
      // So we search for paths for the REST of the word (slice 1).
      const startIndex = 1;
      
      // If overlap, check consistency
      if (startCell.value !== '' && startCell.value !== word[0]) {
        continue;
      }

      // Backtracking to find a path
      const paths = this.findAllPathsDFS(startCell, word.slice(startIndex), [startCell.id]);
      validPaths.push(...paths);
      
      // Limit to 5000 options to prevent explosion
      if (validPaths.length > 5000) break;
    }
    
    // Shuffle options for randomness
    return validPaths.sort(() => Math.random() - 0.5);
  }

  private findAllPathsDFS(currentCell: Cell, remainingWord: string, visited: string[]): string[][] {
    if (remainingWord.length === 0) return [visited];

    const char = remainingWord[0];
    const neighbors = this.getNeighbors(currentCell); 
    
    const results: string[][] = [];

    // Debug log for first word logic if needed
    // console.log(`DFS ${currentCell.id} rem:${remainingWord}`);

    for (const next of neighbors) {
      if (visited.includes(next.id)) continue;
      if (next.value !== '' && next.value !== char) continue;

      const subPaths = this.findAllPathsDFS(next, remainingWord.slice(1), [...visited, next.id]);
      results.push(...subPaths);
      
      if (results.length > 1000) break; // Prune excessive branching
    }
    return results;
  }

  private getNeighbors(cell: Cell): Cell[] {
    // Ortho-4 neighbors shuffled
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    const neighbors: Cell[] = [];
    
    for (const [dx, dy] of dirs) {
      const n = this.getCell(cell.x + dx, cell.y + dy);
      if (n) neighbors.push(n);
    }
    
    return neighbors.sort(() => Math.random() - 0.5);
  }

  private commitPath(word: string, cellIds: string[]) {
    cellIds.forEach((id, idx) => {
      const cell = this.getCellById(id)!;
      cell.value = word[idx];
    });
  }

  // Backtracking support: Clear cells
  removePath(cellIds: string[]) {
    cellIds.forEach(id => {
      const cell = this.getCellById(id)!;
      cell.value = ''; // Reset to empty
    });
  }

  // Place bonus word (must intersect ONE path cell)
  tryPlaceBonusWord(word: string, pathCellIds: Set<string>): { placement: string[], hintCellId: string } | null {
    // Try every possible intersection point
    // Pick a char in word, match with a char on grid
    
    // Indices of word: 0..len
    const indices = Array.from({length: word.length}, (_, i) => i).sort(() => Math.random() - 0.5);

    for (const charIdx of indices) {
      const char = word[charIdx];
      
      // Find cells on grid matching this char (that are part of PATH)
      const targetCells = this.cells
        .filter(c => pathCellIds.has(c.id) && c.value === char)
        .sort(() => Math.random() - 0.5);

      for (const target of targetCells) {
        // Try to verify word fits around this target
        // We need to place:
        // word[0...charIdx-1] BEFORE target
        // word[charIdx+1...end] AFTER target
        
        // This requires a "straight line" usually for bonus? 
        // Or can bonus be snaked too? 
        // "Easy" bonus usually straight or simple L?
        // Let's support snake for flexibility, but prefer straight?
        // Let's use same findPath logic but constrained to NOT use other Path cells (except intersection)
        
        const beforeStr = word.slice(0, charIdx).split('').reverse().join(''); // Reverse to walk back
        const afterStr = word.slice(charIdx + 1);

        // This is complex because we need TWO paths radiating from standard.
        // Simplified: Just use findPath from target? No, target is middle.
        
        // Let's try to fit 'after' first
        const afterPath = this.findFreePath(target, afterStr, [target.id], pathCellIds);
        if (!afterPath) continue;

        // Then fit 'before'
        // Note: visited includes target + after path
        const visitedSoFar = new Set([...afterPath]); 
        const beforePath = this.findFreePath(target, beforeStr, [target.id], pathCellIds, visitedSoFar);

        if (beforePath) {
          // Success!
          // Reconstruct full path: reverse(before) + target + after
          // beforePath includes target as first element.
          const fullPath = [...beforePath.slice(1).reverse(), target.id, ...afterPath.slice(1)];
          
          this.commitPath(word, fullPath); // Commit
          return { placement: fullPath, hintCellId: target.id };
        }
      }
    }
    return null;
  }

  // Find path that specifically AVOIDS existing path cells (except start)
  private findFreePath(current: Cell, remaining: string, visited: string[], blocked: Set<string>, extraBlocked?: Set<string>): string[] | null {
    if (remaining.length === 0) return visited;
    
    const char = remaining[0];
    const neighbors = this.getNeighbors(current);

    for (const next of neighbors) {
      if (visited.includes(next.id)) continue;
      if (blocked.has(next.id)) continue; // Can't cross other path
      if (extraBlocked?.has(next.id)) continue;
      if (next.value !== '' && next.value !== char) continue; // Occupied by something else?

      const res = this.findFreePath(next, remaining.slice(1), [...visited, next.id], blocked, extraBlocked);
      if (res) return res;
    }
    return null;
  }

  // Fill empty cells with random letters
  fillDistractors() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    this.cells.forEach(c => {
      if (c.value === '') {
        c.value = chars[Math.floor(Math.random() * chars.length)];
      }
    });
  }

  exportGrid() {
    return {
      width: this.width,
      height: this.height,
      cells: this.cells.map(c => ({...c})),
      // Start/End handled by caller based on Path placement
    };
  }
}
