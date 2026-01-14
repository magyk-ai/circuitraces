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
}

export interface StartEndMarker {
  adjacentCellId: string;
}

export interface WordDef {
  wordId: string;
  tokens: Token[];
  size: number;
  placements: string[][]; // array of placements; placement is array of cellIds
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
  };
}

export type GameStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface RuntimeState {
  status: GameStatus;
  foundPathWords: Record<string, true>; // wordId -> true
  completedAt?: number;
  startedAt: number;
}
