import type {
  WaywordsPuzzle,
  RuntimeState
} from './types.js';
import type {
  EngineAction,
  EngineResult,
  EngineEvent
} from './actions.js';
import { PlacementIndex } from './placement-index.js';
import { isConnected, getPathCells } from './connectivity.js';

export function init(puzzle: WaywordsPuzzle, now: number): RuntimeState {
  return {
    status: 'IN_PROGRESS',
    foundPathWords: {},
    foundAdditionalWords: {},
    hintUsedCount: 0,
    hintMarkedCells: {},
    clueMarkedCells: {},
    startedAt: now
  };
}

export function reduce(
  puzzle: WaywordsPuzzle,
  state: RuntimeState,
  action: EngineAction
): EngineResult {
  if (state.status === 'COMPLETED' && action.type !== 'RESET') {
    return { state, effects: { events: [] } };
  }

  switch (action.type) {
    case 'SELECT':
      return handleSelect(puzzle, state, action.cellIds);
    case 'PRESS_HINT':
      return handleHint(puzzle, state);
    case 'TICK':
      return handleTick(puzzle, state, action.now);
    case 'RESET':
      return { state: init(puzzle, Date.now()), effects: { events: [] } };
  }
}

function handleSelect(
  puzzle: WaywordsPuzzle,
  state: RuntimeState,
  cellIds: string[]
): EngineResult {
  const index = new PlacementIndex(puzzle);
  const match = index.lookup(cellIds);

  if (!match) {
    return { state, effects: { events: [{ type: 'INVALID_SELECTION' }] } };
  }

  const { wordId, category } = match;

  // Check if already found
  const alreadyFound = category === 'PATH'
    ? state.foundPathWords[wordId]
    : state.foundAdditionalWords[wordId];

  if (alreadyFound) {
    return { state, effects: { events: [{ type: 'ALREADY_FOUND', wordId }] } };
  }

  // Mark word as found
  const newState: RuntimeState = { ...state };
  if (category === 'PATH') {
    newState.foundPathWords = { ...state.foundPathWords, [wordId]: true };
  } else {
    newState.foundAdditionalWords = { ...state.foundAdditionalWords, [wordId]: true };
  }

  const events: EngineEvent[] = [{ type: 'WORD_FOUND', wordId, category }];

  // If additional word, apply clue
  if (category === 'ADDITIONAL') {
    const word = puzzle.words.additional.find(w => w.wordId === wordId);
    if (word?.clueCellId) {
      newState.clueMarkedCells = { [word.clueCellId]: true };
      newState.lastClueExpiresAt = state.startedAt + puzzle.config.cluePersistMs;
      events.push({ type: 'CLUE_APPLIED', cellId: word.clueCellId });
    }
  }

  // Check win condition (path words only)
  if (category === 'PATH' && isConnected(puzzle, newState)) {
    const completedAt = Date.now();
    newState.status = 'COMPLETED';
    newState.completedAt = completedAt;
    events.push({ type: 'COMPLETED', completedAt });
  }

  return { state: newState, effects: { events } };
}

function handleHint(
  puzzle: WaywordsPuzzle,
  state: RuntimeState
): EngineResult {
  // Find unfound path words
  const unfoundWords = puzzle.words.path.filter(
    word => !state.foundPathWords[word.wordId]
  );

  if (unfoundWords.length === 0) {
    return { state, effects: { events: [] } }; // No hints available
  }

  // Pick first unfound word (deterministic)
  const word = unfoundWords[0];

  // Pick a cell from first placement
  // Prefer cells not already marked
  const placement = word.placements[0];
  const pathCells = getPathCells(puzzle, state);

  let chosenCell: string | null = null;
  for (const cellId of placement) {
    if (!pathCells.has(cellId) && !state.hintMarkedCells[cellId] && !state.clueMarkedCells[cellId]) {
      chosenCell = cellId;
      break;
    }
  }

  // Fallback: any cell from placement
  if (!chosenCell) {
    chosenCell = placement[0];
  }

  // Apply hint
  const newState: RuntimeState = {
    ...state,
    hintMarkedCells: { ...state.hintMarkedCells, [chosenCell]: true },
    hintUsedCount: state.hintUsedCount + 1
  };

  return {
    state: newState,
    effects: { events: [{ type: 'HINT_APPLIED', cellId: chosenCell }] }
  };
}

function handleTick(
  puzzle: WaywordsPuzzle,
  state: RuntimeState,
  now: number
): EngineResult {
  // Check if clue should expire
  if (state.lastClueExpiresAt && now >= state.lastClueExpiresAt) {
    return {
      state: {
        ...state,
        clueMarkedCells: {},
        lastClueExpiresAt: undefined
      },
      effects: { events: [] }
    };
  }

  return { state, effects: { events: [] } };
}

export const selectors = {
  getPathCells,
  isConnected,
  getHintCells: (state: RuntimeState): Set<string> => {
    return new Set(Object.keys(state.hintMarkedCells));
  },
  getClueCells: (state: RuntimeState): Set<string> => {
    return new Set(Object.keys(state.clueMarkedCells));
  }
};
