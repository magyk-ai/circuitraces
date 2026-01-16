// Token (MVP: letters only)
export type Token = { t: 'L'; v: string }; // uppercase A-Z

export type CellType = 'LETTER' | 'VOID';

export interface Cell {
  id: string;
  x: number;
  y: number;
  type: CellType;
  value?: string; // for LETTER: "A".."Z"
}

export type SelectionModel = 'RAY_8DIR' | 'ADJACENT';
export type ConnectivityModel = 'ORTHO_4';

export interface PuzzleConfig {
  selectionModel: SelectionModel;
  connectivityModel: ConnectivityModel;
  allowReverseSelection: boolean;
  // Note: cluePersistMs removed in v1.1 - hints now persist indefinitely
}

export interface StartEndMarker {
  adjacentCellId: string;
}

export interface WordDef {
  wordId: string;
  tokens: Token[];
  size: number;
  placements: string[][]; // array of placements; placement is array of cellIds
  hintCellId?: string; // only for additional words: intersection cell that reveals hint (v1.1)
  /** @deprecated Use hintCellId instead. Kept for backwards compatibility during migration. */
  clueCellId?: string;
}

export interface WaywordsPuzzle {
  puzzleId: string;
  theme: string;
  config: PuzzleConfig;
  grid: {
    width: number;
    height: number;
    cells: Cell[];
    start: StartEndMarker;
    end: StartEndMarker;
  };
  words: {
    path: WordDef[];
    additional: WordDef[]; // additional words with clues
  };
}

export type GameStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface RuntimeState {
  status: GameStatus;
  foundPathWords: Record<string, true>; // wordId -> true
  foundAdditionalWords: Record<string, true>; // wordId -> true
  hintUsedFromButton: number; // count of hints used from button (v1.1)
  hintRevealedFromBonus: number; // count of hints revealed from bonus words (v1.1)
  hintMarkedCells: Record<string, true>; // cellId -> true (accumulates all hints, persistent)
  completedAt?: number;
  startedAt: number;
}
