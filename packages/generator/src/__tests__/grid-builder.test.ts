
import { describe, it, expect, beforeEach } from 'vitest';
import { GridBuilder } from '../grid-builder.js';

describe('GridBuilder', () => {
  let builder: GridBuilder;

  beforeEach(() => {
    builder = new GridBuilder(5, 5);
  });

  it('should initialize an empty grid', () => {
    const emptyCells = builder.getEmptyCells();
    expect(emptyCells.length).toBe(25);
    expect(builder.getCell(0, 0)).toBeDefined();
  });

  it('should find path options for a word', () => {
    const options = builder.findAllPathOptions('TEST');
    expect(options.length).toBeGreaterThan(0);
    
    // Check first option
    const path = options[0];
    expect(path.length).toBe(4); // T-E-S-T
  });

  it('should support backtracking (removePath)', () => {
    const options = builder.findAllPathOptions('TEST');
    const path = options[0];
    
    // Manually place
    path.forEach((id, i) => {
      const cell = builder.getCellById(id)!;
      cell.value = 'TEST'[i];
    });

    expect(builder.getEmptyCells().length).toBe(21);

    // Remove
    builder.removePath(path);
    expect(builder.getEmptyCells().length).toBe(25);
    expect(builder.getCellById(path[0])?.value).toBe('');
  });

  it('should correctly handle shared letters (overlap)', () => {
    // Place "ABC"
    const path1Ids = ['r0c0', 'r0c1', 'r0c2'];
    const path1Word = "ABC";
    path1Ids.forEach((id, i) => { builder.getCellById(id)!.value = path1Word[i]; });

    // Try to place "CDE" starting at 'r0c2' (which is 'C')
    // It should find valid paths if adjacent cells are empty
    const options = builder.findAllPathOptions("CDE", 'r0c2');
    
    expect(options.length).toBeGreaterThan(0);
    options.forEach(path => {
      expect(path[0]).toBe('r0c2'); // Must start where requested
      expect(path.length).toBe(3);
    });
  });
});
