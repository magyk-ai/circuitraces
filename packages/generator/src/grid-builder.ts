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
  findAllPathOptions(word: string, startCellId?: string, geometry: 'RAY' | 'SNAKE' = 'SNAKE'): string[][] {
    if (geometry === 'RAY') {
      return this.findAllRayPaths(word, startCellId);
    }

    const candidates = startCellId 
      ? [this.getCellById(startCellId)!] 
      : this.getEmptyCells().sort(() => Math.random() - 0.5);

    const validPaths: string[][] = [];

    for (const startCell of candidates) {
      // We always consume the first char at startCell.
      const startIndex = 1;
      
      // If overlap, check consistency
      if (startCell.value !== '' && startCell.value !== word[0]) {
        continue;
      }

      // Backtracking to find a path
      const paths = this.findAllPathsDFS(startCell, word.slice(startIndex), [startCell.id]);
      validPaths.push(...paths);
      
      if (validPaths.length > 5000) break;
    }
    
    return validPaths.sort(() => Math.random() - 0.5);
  }

  private findAllRayPaths(word: string, startCellId?: string): string[][] {
    const candidates = startCellId 
      ? [this.getCellById(startCellId)!] 
      : this.getEmptyCells().sort(() => Math.random() - 0.5);

    const validPaths: string[][] = [];
    // ORTHO RAYS ONLY (Horizontal/Vertical) to satisfy ORTHO_4 connectivity
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]; 

    for (const start of candidates) {
      // Check start char overlap
      if (start.value !== '' && start.value !== word[0]) continue;

      // Try each direction
      for (const [dx, dy] of dirs) {
        let path: string[] = [start.id];
        let valid = true;
        
        for (let i = 1; i < word.length; i++) {
          const cx = start.x + (i * dx);
          const cy = start.y + (i * dy);
          const cell = this.getCell(cx, cy);
          
          if (!cell) { valid = false; break; } // Out of bounds
          if (cell.value !== '' && cell.value !== word[i]) { valid = false; break; } // Overlap mismatch
          
          path.push(cell.id);
        }

        if (valid) validPaths.push(path);
      }
    }
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
  tryPlaceBonusWord(word: string, pathCellIds: Set<string>, geometry: 'RAY' | 'SNAKE' = 'SNAKE'): { placement: string[], hintCellId: string } | null {
    // Try every possible intersection point
    const indices = Array.from({length: word.length}, (_, i) => i).sort(() => Math.random() - 0.5);

    for (const charIdx of indices) {
      const char = word[charIdx];
      
      // Find cells on grid matching this char (that are part of PATH)
      const targetCells = this.cells
        .filter(c => pathCellIds.has(c.id) && c.value === char)
        .sort(() => Math.random() - 0.5);

      for (const target of targetCells) {
        // If RAY, we must fit the WHOLE word as a Ray passing through target at charIdx.
        // We can just call findAllRayPaths(word, undefined) BUT filter for those passing through target at charIdx?
        // Or specific ray logic for bonus.
        
        if (geometry === 'RAY') {
          // ORTHO RAYS ONLY
          const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
          for (const [dx, dy] of dirs) {
             // Calculate start pos if we pass through 'target' at 'charIdx'
             // start = target - charIdx * dir
             const startX = target.x - (charIdx * dx);
             const startY = target.y - (charIdx * dy);
             
             // Verify full word placement
             let path: string[] = [];
             let valid = true;
             
             for (let i = 0; i < word.length; i++) {
               const cx = startX + (i * dx);
               const cy = startY + (i * dy);
               const cell = this.getCell(cx, cy);
               
               if (!cell) { valid = false; break; }
               // Check overlap:
               // If cell is target, it matches (we checked).
               // If cell is NOT target, it MUST NOT be in pathCellIds (can't double distinct intersection?)
               // User said "Keep intersections rare except for bonus".
               // Bonus MUST intersect path. But typically at one point?
               // If it overlaps multiple, is that bad?
               // Let's allow overlap if chars match.
               
               if (cell.value !== '' && cell.value !== word[i]) { valid = false; break; }
               
               path.push(cell.id);
             }

             if (valid) {
                this.commitPath(word, path);
                return { placement: path, hintCellId: target.id };
             }
          }
        } else {
           // SNAKE Logic (Old)
           const beforeStr = word.slice(0, charIdx).split('').reverse().join(''); // Reverse to walk back
           const afterStr = word.slice(charIdx + 1);

           const afterPath = this.findFreePath(target, afterStr, [target.id], pathCellIds);
           if (!afterPath) continue;

           const visitedSoFar = new Set([...afterPath]); 
           const beforePath = this.findFreePath(target, beforeStr, [target.id], pathCellIds, visitedSoFar);

           if (beforePath) {
             const fullPath = [...beforePath.slice(1).reverse(), target.id, ...afterPath.slice(1)];
             this.commitPath(word, fullPath); 
             return { placement: fullPath, hintCellId: target.id };
           }
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
