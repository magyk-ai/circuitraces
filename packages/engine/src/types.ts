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

export type SelectionModel = 'RAY_8DIR';
export type ConnectivityModel = 'ORTHO_4';

export interface PuzzleConfig {
  selectionModel: SelectionModel;
  connectivityModel: ConnectivityModel;
  allowReverseSelection: boolean;
  cluePersistMs: number; // how long clue highlighting persists (default: 3000ms)
}

export interface StartEndMarker {
  adjacentCellId: string;
}

export interface WordDef {
  wordId: string;
  tokens: Token[];
  size: number;
  placements: string[][]; // array of placements; placement is array of cellIds
  clueCellId?: string; // only for additional words: which cell reveals a clue
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
  hintUsedCount: number; // count of hints used
  hintMarkedCells: Record<string, true>; // cellId -> true (cells marked by hints)
  clueMarkedCells: Record<string, true>; // cellId -> true (0 or 1 cell marked by clue)
  lastClueExpiresAt?: number; // timestamp when current clue expires
  completedAt?: number;
  startedAt: number;
}
