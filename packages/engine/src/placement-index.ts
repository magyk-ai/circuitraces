import type { WaywordsPuzzle, WordDef } from './types.js';

export interface PlacementMatch {
  wordId: string;
  category: 'PATH' | 'ADDITIONAL';
  placementIndex: number;
}

export class PlacementIndex {
  private map: Map<string, PlacementMatch>;

  constructor(puzzle: WaywordsPuzzle) {
    this.map = new Map();
    this.buildIndex(puzzle);
  }

  private buildIndex(puzzle: WaywordsPuzzle): void {
    // Index path words
    for (const word of puzzle.words.path) {
      this.indexWord(word, 'PATH', puzzle.config.allowReverseSelection);
    }

    // Index additional words
    for (const word of puzzle.words.additional) {
      this.indexWord(word, 'ADDITIONAL', puzzle.config.allowReverseSelection);
    }
  }

  private indexWord(
    word: WordDef,
    category: 'PATH' | 'ADDITIONAL',
    allowReverse: boolean
  ): void {
    word.placements.forEach((placement, idx) => {
      const key = placement.join('|');
      this.map.set(key, { wordId: word.wordId, category, placementIndex: idx });

      if (allowReverse) {
        const reverseKey = [...placement].reverse().join('|');
        this.map.set(reverseKey, { wordId: word.wordId, category, placementIndex: idx });
      }
    });
  }

  lookup(cellIds: string[]): PlacementMatch | undefined {
    const key = cellIds.join('|');
    return this.map.get(key);
  }
}
