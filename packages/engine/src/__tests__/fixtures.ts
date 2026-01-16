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
    allowReverseSelection: true
    // v1.1: cluePersistMs removed - hints now persist indefinitely
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
        hintCellId: 'c4' // v1.1: renamed from clueCellId; points to 'R' in CAR (intersection cell)
      }
    ]
  }
};

// 4x4 grid with DISCONNECTED path words (for testing connectivity rejection)
// Grid layout:
// A B C D
// E F G H
// I J K L
// M N O P
//
// Path words:
// - ABC (top row: c0->c1->c2) - contains START at c0
// - MNO (bottom row: c12->c13->c14) - contains END at c14
// These are NOT orthogonally connected - there's a gap!
// Finding both words should NOT complete the puzzle.
export const disconnectedPuzzle: WaywordsPuzzle = {
  puzzleId: 'test-disconnected',
  theme: 'Disconnected Test',
  config: {
    selectionModel: 'RAY_4DIR',
    connectivityModel: 'ORTHO_4',
    allowReverseSelection: true
  },
  grid: {
    width: 4,
    height: 4,
    cells: [
      { id: 'c0', x: 0, y: 0, type: 'LETTER', value: 'A' },
      { id: 'c1', x: 1, y: 0, type: 'LETTER', value: 'B' },
      { id: 'c2', x: 2, y: 0, type: 'LETTER', value: 'C' },
      { id: 'c3', x: 3, y: 0, type: 'LETTER', value: 'D' },
      { id: 'c4', x: 0, y: 1, type: 'LETTER', value: 'E' },
      { id: 'c5', x: 1, y: 1, type: 'LETTER', value: 'F' },
      { id: 'c6', x: 2, y: 1, type: 'LETTER', value: 'G' },
      { id: 'c7', x: 3, y: 1, type: 'LETTER', value: 'H' },
      { id: 'c8', x: 0, y: 2, type: 'LETTER', value: 'I' },
      { id: 'c9', x: 1, y: 2, type: 'LETTER', value: 'J' },
      { id: 'c10', x: 2, y: 2, type: 'LETTER', value: 'K' },
      { id: 'c11', x: 3, y: 2, type: 'LETTER', value: 'L' },
      { id: 'c12', x: 0, y: 3, type: 'LETTER', value: 'M' },
      { id: 'c13', x: 1, y: 3, type: 'LETTER', value: 'N' },
      { id: 'c14', x: 2, y: 3, type: 'LETTER', value: 'O' },
      { id: 'c15', x: 3, y: 3, type: 'LETTER', value: 'P' }
    ],
    start: { adjacentCellId: 'c0' },
    end: { adjacentCellId: 'c14' }
  },
  words: {
    path: [
      {
        wordId: 'ABC',
        tokens: [{ t: 'L', v: 'A' }, { t: 'L', v: 'B' }, { t: 'L', v: 'C' }],
        size: 3,
        placements: [['c0', 'c1', 'c2']]
      },
      {
        wordId: 'MNO',
        tokens: [{ t: 'L', v: 'M' }, { t: 'L', v: 'N' }, { t: 'L', v: 'O' }],
        size: 3,
        placements: [['c12', 'c13', 'c14']]
      }
    ],
    additional: []
  }
};
