import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { auditPuzzle, AuditErrorCode } from '../auditor.js';
import type { WaywordsPuzzle } from '@circuitraces/engine';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testdataDir = resolve(__dirname, '../../testdata');

function loadFixture(name: string): WaywordsPuzzle {
  const path = resolve(testdataDir, name);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function hasErrorCode(result: ReturnType<typeof auditPuzzle>, code: AuditErrorCode): boolean {
  return result.errors.some(e => e.code === code);
}

describe('auditor', () => {
  describe('valid puzzles', () => {
    it('accepts a valid simple puzzle', () => {
      const puzzle = loadFixture('valid_simple.json');
      const result = auditPuzzle(puzzle);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts a valid puzzle with bonus word', () => {
      const puzzle = loadFixture('valid_with_bonus.json');
      const result = auditPuzzle(puzzle);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('ERR_MULTI_PLACEMENT', () => {
    it('rejects word with multiple placements', () => {
      const puzzle = loadFixture('bad_multi_placement.json');
      const result = auditPuzzle(puzzle);
      expect(result.valid).toBe(false);
      expect(hasErrorCode(result, 'ERR_MULTI_PLACEMENT')).toBe(true);
    });
  });

  describe('ERR_UNSOLVABLE', () => {
    it('rejects puzzle where end is unreachable from start', () => {
      const puzzle = loadFixture('bad_unsolvable.json');
      const result = auditPuzzle(puzzle);
      expect(result.valid).toBe(false);
      expect(hasErrorCode(result, 'ERR_UNSOLVABLE')).toBe(true);
      expect(result.connectivity.solvable).toBe(false);
    });
  });

  describe('ERR_START_VOID', () => {
    it('rejects puzzle where start cell is VOID', () => {
      const puzzle = loadFixture('bad_start_void.json');
      const result = auditPuzzle(puzzle);
      expect(result.valid).toBe(false);
      expect(hasErrorCode(result, 'ERR_START_VOID')).toBe(true);
    });
  });

  describe('ERR_START_NOT_IN_PATH', () => {
    it('rejects puzzle where start cell is not in any path word', () => {
      const puzzle = loadFixture('bad_start_not_in_path.json');
      const result = auditPuzzle(puzzle);
      expect(result.valid).toBe(false);
      expect(hasErrorCode(result, 'ERR_START_NOT_IN_PATH')).toBe(true);
    });
  });

  describe('ERR_END_VOID', () => {
    it('rejects puzzle where end cell is VOID', () => {
      const puzzle = loadFixture('bad_end_void.json');
      const result = auditPuzzle(puzzle);
      expect(result.valid).toBe(false);
      expect(hasErrorCode(result, 'ERR_END_VOID')).toBe(true);
    });
  });

  describe('ERR_PLACEMENT_CELL_NOT_FOUND', () => {
    it('rejects puzzle with placement referencing non-existent cell', () => {
      const puzzle = loadFixture('bad_placement_cell_not_found.json');
      const result = auditPuzzle(puzzle);
      expect(result.valid).toBe(false);
      expect(hasErrorCode(result, 'ERR_PLACEMENT_CELL_NOT_FOUND')).toBe(true);
    });
  });

  describe('ERR_DUP_PLACEMENT', () => {
    it('rejects puzzle with duplicate placement keys', () => {
      const puzzle = loadFixture('bad_dup_placement.json');
      const result = auditPuzzle(puzzle);
      expect(result.valid).toBe(false);
      expect(hasErrorCode(result, 'ERR_DUP_PLACEMENT')).toBe(true);
    });
  });

  describe('ERR_CELL_OUT_OF_BOUNDS', () => {
    it('rejects puzzle with cell coordinates outside grid bounds', () => {
      const puzzle = loadFixture('bad_cell_out_of_bounds.json');
      const result = auditPuzzle(puzzle);
      expect(result.valid).toBe(false);
      expect(hasErrorCode(result, 'ERR_CELL_OUT_OF_BOUNDS')).toBe(true);
    });
  });

  describe('ERR_HINT_NOT_FOUND', () => {
    it('rejects puzzle with hintCellId referencing non-existent cell', () => {
      const puzzle = loadFixture('bad_hint_not_found.json');
      const result = auditPuzzle(puzzle);
      expect(result.valid).toBe(false);
      expect(hasErrorCode(result, 'ERR_HINT_NOT_FOUND')).toBe(true);
    });
  });

  describe('ERR_HINT_VOID', () => {
    it('rejects puzzle with hintCellId pointing to VOID cell', () => {
      const puzzle = loadFixture('bad_hint_void.json');
      const result = auditPuzzle(puzzle);
      expect(result.valid).toBe(false);
      expect(hasErrorCode(result, 'ERR_HINT_VOID')).toBe(true);
    });
  });

  describe('ERR_HINT_NOT_IN_BONUS', () => {
    it('rejects puzzle with hintCellId not in bonus word placement', () => {
      const puzzle = loadFixture('bad_hint_not_in_bonus.json');
      const result = auditPuzzle(puzzle);
      expect(result.valid).toBe(false);
      expect(hasErrorCode(result, 'ERR_HINT_NOT_IN_BONUS')).toBe(true);
    });
  });

  describe('ERR_HINT_NOT_IN_PATH', () => {
    it('rejects puzzle with hintCellId not in any path word (intersection rule)', () => {
      const puzzle = loadFixture('bad_hint_not_in_path.json');
      const result = auditPuzzle(puzzle);
      expect(result.valid).toBe(false);
      expect(hasErrorCode(result, 'ERR_HINT_NOT_IN_PATH')).toBe(true);
    });
  });

  describe('connectivity report', () => {
    it('reports path length for solvable puzzle', () => {
      const puzzle = loadFixture('valid_simple.json');
      const result = auditPuzzle(puzzle);
      expect(result.connectivity.solvable).toBe(true);
      expect(result.connectivity.pathLength).toBeGreaterThan(0);
    });

    it('reports unreachable words for unsolvable puzzle', () => {
      const puzzle = loadFixture('bad_unsolvable.json');
      const result = auditPuzzle(puzzle);
      expect(result.connectivity.solvable).toBe(false);
      expect(result.connectivity.unreachablePathWords.length).toBeGreaterThan(0);
    });
  });
});
