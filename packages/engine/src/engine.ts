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
import { isConnected, getPathCells, getConnectedPathOrder } from './connectivity.js';

export function init(puzzle: WaywordsPuzzle, now: number): RuntimeState {
  return {
    status: 'IN_PROGRESS',
    foundPathWords: {},
    foundAdditionalWords: {},
    hintUsedFromButton: 0,
    hintRevealedFromBonus: 0,
    hintMarkedCells: {},
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

  // If additional word, apply hint (v1.1: hints persist and accumulate)
  if (category === 'ADDITIONAL') {
    const word = puzzle.words.additional.find(w => w.wordId === wordId);
    // Support both hintCellId (v1.1) and clueCellId (deprecated) during migration
    const hintCellId = word?.hintCellId ?? word?.clueCellId;
    if (hintCellId) {
      // Only add hint if cell is not already part of a found path word (green overrides)
      const pathCells = getPathCells(puzzle, newState);
      if (!pathCells.has(hintCellId)) {
        // Accumulate hints (don't replace)
        newState.hintMarkedCells = { ...state.hintMarkedCells, [hintCellId]: true };
        newState.hintRevealedFromBonus = state.hintRevealedFromBonus + 1;
        events.push({ type: 'HINT_APPLIED', cellId: hintCellId, source: 'BONUS' });
      }
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
  // Prefer cells not already marked (v1.1: hints accumulate, no clue system)
  const placement = word.placements[0];
  const pathCells = getPathCells(puzzle, state);

  let chosenCell: string | null = null;
  for (const cellId of placement) {
    // Skip cells that are already green (path) or already hinted
    if (!pathCells.has(cellId) && !state.hintMarkedCells[cellId]) {
      chosenCell = cellId;
      break;
    }
  }

  // Fallback: any cell from placement (even if already hinted)
  if (!chosenCell) {
    chosenCell = placement[0];
  }

  // Apply hint (v1.1: hints persist indefinitely and accumulate)
  const newState: RuntimeState = {
    ...state,
    hintMarkedCells: { ...state.hintMarkedCells, [chosenCell]: true },
    hintUsedFromButton: state.hintUsedFromButton + 1
  };

  return {
    state: newState,
    effects: { events: [{ type: 'HINT_APPLIED', cellId: chosenCell, source: 'BUTTON' }] }
  };
}

// v1.1: handleTick removed - timer is now UI-only state

/**
 * Get all cells belonging to found additional words
 */
function getAdditionalWordCells(puzzle: WaywordsPuzzle, state: RuntimeState): Set<string> {
  const cells = new Set<string>();
  for (const word of puzzle.words.additional) {
    if (state.foundAdditionalWords[word.wordId]) {
      for (const placement of word.placements) {
        for (const cellId of placement) {
          cells.add(cellId);
        }
      }
    }
  }
  return cells;
}

export const selectors = {
  getPathCells,
  getAdditionalWordCells,
  isConnected,
  getConnectedPathOrder,
  getHintCells: (state: RuntimeState): Set<string> => {
    return new Set(Object.keys(state.hintMarkedCells));
  }
  // v1.1: getClueCells removed - clue system replaced by persistent hints
};
