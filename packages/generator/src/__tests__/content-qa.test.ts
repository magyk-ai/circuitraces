import { describe, it, expect } from 'vitest';
import { evaluatePuzzle } from '../content-qa.js';

describe('Content QA - EASY_DAILY_V1', () => {
  it('flags touch-only connectivity and missing intersections', () => {
    const puzzle: Parameters<typeof evaluatePuzzle>[0] = {
      grid: {
        width: 6,
        height: 6,
        cells: Array.from({ length: 36 }, (_, idx) => {
          const x = idx % 6;
          const y = Math.floor(idx / 6);
          return { id: `c${idx}`, x, y, type: 'LETTER' };
        }),
        start: { adjacentCellId: 'c0' }, // (0,0)
        end: { adjacentCellId: 'c35' }  // (5,5)
      },
      words: {
        path: [
          { wordId: 'ONE', placements: [['c0', 'c1', 'c2']] },
          { wordId: 'TWO', placements: [['c6', 'c7', 'c8']] },
          { wordId: 'THREE', placements: [['c12', 'c13', 'c14']] },
          { wordId: 'FOUR', placements: [['c33', 'c34', 'c35']] }
        ],
        additional: []
      }
    };

    const errors = evaluatePuzzle(puzzle, 'EASY_DAILY_V1');
    const codes = errors.map(error => error.code);

    expect(codes).toContain('ERR_QA_PATH_INTERSECTIONS_TOO_LOW');
    expect(codes).toContain('ERR_QA_TOUCH_ONLY_CONNECTION');
  });
});
