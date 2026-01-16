import type { WaywordsPuzzle, Cell } from '@circuitraces/engine';

export class SelectionAdapter {
  private puzzle: WaywordsPuzzle;
  private cellMap: Map<string, Cell>;
  private startCellId: string | null = null;
  private currentDirection: [number, number] | null = null;
  private lockedDirection: [number, number] | null = null;
  private readonly DEAD_ZONE_THRESHOLD = 0.3; // 30% of cell size in grid units
  private currentPath: string[] = [];
  private isAdjacentMode: boolean = false;

  constructor(puzzle: WaywordsPuzzle) {
    this.puzzle = puzzle;
    // Check config for ADJACENT mode (default to RAY_8DIR for backward compat)
    this.isAdjacentMode = puzzle.config?.selectionModel === 'ADJACENT';
    this.cellMap = new Map(puzzle.grid.cells.map(c => [c.id, c]));
  }

  begin(cellId: string): void {
    this.startCellId = cellId;
    this.currentDirection = null;
    this.lockedDirection = null;
    this.currentPath = [cellId];
  }

  isActive(): boolean {
    return this.startCellId !== null;
  }

  update(cellId: string): string[] {
    if (!this.startCellId) return [];
    
    // RAY_8DIR Logic
    if (!this.isAdjacentMode) {
        if (cellId === this.startCellId) return [cellId];

        const start = this.cellMap.get(this.startCellId);
        const current = this.cellMap.get(cellId);
        if (!start || !current) return [this.startCellId];

        // Calculate direction
        const dx = current.x - start.x;
        const dy = current.y - start.y;
        const distance = Math.sqrt(dx*dx + dy*dy);

        // Dead zone: ignore small movements
        if (distance < this.DEAD_ZONE_THRESHOLD) {
        return [this.startCellId];
        }

        // Snap to 8 directions
        const newDir = this.snapTo8Dir(dx, dy);

        // Direction locking: require significant angle change (45°)
        if (this.lockedDirection) {
        const angleDiff = this.angleBetween(this.lockedDirection, newDir);
        if (angleDiff < Math.PI / 4) { // < 45 degrees
            // Keep locked direction
            return this.getCellsAlongRay(start, this.lockedDirection, current);
        }
        }

        // Lock new direction
        this.lockedDirection = newDir;
        this.currentDirection = newDir;

        // Get cells along ray
        return this.getCellsAlongRay(start, newDir, current);
    }
    
    // ADJACENT Logic
    // If we have no path yet, start one
    if (this.currentPath.length === 0) {
        this.currentPath = [this.startCellId];
    }
    
    const lastId = this.currentPath[this.currentPath.length - 1];
    
    // 1. Hovering over current tail -> no change
    if (cellId === lastId) {
        return [...this.currentPath];
    }

    // 2. Backtracking: Hovering over previous cell -> pop tail
    if (this.currentPath.length > 1 && cellId === this.currentPath[this.currentPath.length - 2]) {
        this.currentPath.pop();
        return [...this.currentPath];
    }
    
    // 3. Advancing: Check if neighbor and not visited
    // (Note: Circuit Races usually doesn't allow self-intersection in a single path selection, 
    // unless "Allow Cycle" feature is on. Engine validates selection ultimately. 
    // UI should probably prevent self-intersection for clarity).
    if (!this.currentPath.includes(cellId)) {
        const last = this.cellMap.get(lastId);
        const curr = this.cellMap.get(cellId);
        
        if (last && curr) {
            const dx = Math.abs(curr.x - last.x);
            const dy = Math.abs(curr.y - last.y);
            // Must be adjacent (ortho or diag)
            if (dx <= 1 && dy <= 1) {
                this.currentPath.push(cellId);
            }
        }
    }
    
    return [...this.currentPath];
  }

  end(cellId: string): string[] {
    const result = this.update(cellId);
    this.startCellId = null;
    this.currentDirection = null;
    this.lockedDirection = null;
    this.currentPath = [];
    return result;
  }

  private snapTo8Dir(dx: number, dy: number): [number, number] {
    if (dx === 0 && dy === 0) return [0, 0];

    const angle = Math.atan2(dy, dx);
    const octant = Math.round((angle / Math.PI) * 4);

    // 8 directions: E, SE, S, SW, W, NW, N, NE
    const dirs: [number, number][] = [
      [1, 0],   // E
      [1, 1],   // SE
      [0, 1],   // S
      [-1, 1],  // SW
      [-1, 0],  // W
      [-1, -1], // NW
      [0, -1],  // N
      [1, -1]   // NE
    ];

    const idx = (octant + 8) % 8;
    return dirs[idx];
  }

  private angleBetween(dir1: [number, number], dir2: [number, number]): number {
    const angle1 = Math.atan2(dir1[1], dir1[0]);
    const angle2 = Math.atan2(dir2[1], dir2[0]);
    return Math.abs(angle1 - angle2);
  }

  private getCellsAlongRay(
    start: Cell,
    dir: [number, number],
    target: Cell
  ): string[] {
    const [dx, dy] = dir;
    if (dx === 0 && dy === 0) return [start.id];

    const result: string[] = [start.id];
    let x = start.x;
    let y = start.y;

    // Project until we reach target or grid boundary
    const maxSteps = Math.max(this.puzzle.grid.width, this.puzzle.grid.height);

    for (let i = 0; i < maxSteps; i++) {
      x += dx;
      y += dy;

      const cell = Array.from(this.cellMap.values()).find(
        c => c.x === x && c.y === y && c.type !== 'VOID'
      );

      if (!cell) break;
      result.push(cell.id);

      if (cell.id === target.id) break;
    }

    return result;
  }
}
