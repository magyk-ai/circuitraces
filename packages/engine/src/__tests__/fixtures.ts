import type { WaywordsPuzzle } from '../types.js';

// 3x3 grid with 3 path words forming L-shape
// Grid layout:
// C A T
// X R Y
// D O G
//
// Path: CAR (c0->c1->c4 diagonal), ROD (c4->c7->c6 down-left), DOG (c6->c7->c8 right)
// Solution connects c0 (start) to c8 (end)
export const simplePuzzle: WaywordsPuzzle = {
  puzzleId: 'test-simple',
  theme: 'Test',
  config: {
    selectionModel: 'RAY_8DIR',
    connectivityModel: 'ORTHO_4',
    allowReverseSelection: true,
    cluePersistMs: 3000
  },
  grid: {
    width: 3,
    height: 3,
    cells: [
      { id: 'c0', x: 0, y: 0, type: 'LETTER', value: 'C' },
      { id: 'c1', x: 1, y: 0, type: 'LETTER', value: 'A' },
      { id: 'c2', x: 2, y: 0, type: 'LETTER', value: 'T' },
      { id: 'c3', x: 0, y: 1, type: 'LETTER', value: 'X' },
      { id: 'c4', x: 1, y: 1, type: 'LETTER', value: 'R' },
      { id: 'c5', x: 2, y: 1, type: 'LETTER', value: 'Y' },
      { id: 'c6', x: 0, y: 2, type: 'LETTER', value: 'D' },
      { id: 'c7', x: 1, y: 2, type: 'LETTER', value: 'O' },
      { id: 'c8', x: 2, y: 2, type: 'LETTER', value: 'G' }
    ],
    start: { adjacentCellId: 'c0' },
    end: { adjacentCellId: 'c8' }
  },
  words: {
    path: [
      {
        wordId: 'CAR',
        tokens: [{ t: 'L', v: 'C' }, { t: 'L', v: 'A' }, { t: 'L', v: 'R' }],
        size: 3,
        placements: [['c0', 'c1', 'c4']]
      },
      {
        wordId: 'ROD',
        tokens: [{ t: 'L', v: 'R' }, { t: 'L', v: 'O' }, { t: 'L', v: 'D' }],
        size: 3,
        placements: [['c4', 'c7', 'c6']]
      },
      {
        wordId: 'DOG',
        tokens: [{ t: 'L', v: 'D' }, { t: 'L', v: 'O' }, { t: 'L', v: 'G' }],
        size: 3,
        placements: [['c6', 'c7', 'c8']]
      }
    ],
    additional: [
      {
        wordId: 'CAT',
        tokens: [{ t: 'L', v: 'C' }, { t: 'L', v: 'A' }, { t: 'L', v: 'T' }],
        size: 3,
        placements: [['c0', 'c1', 'c2']],
        clueCellId: 'c4' // Clue points to 'R' in CAR
      }
    ]
  }
};
