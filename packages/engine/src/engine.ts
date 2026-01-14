import type {
  WaywordsPuzzle,
  RuntimeState
} from './types.js';
import type {
  EngineAction,
  EngineResult,
  EngineEffects
} from './actions.js';
import { PlacementIndex } from './placement-index.js';
import { isConnected, getPathCells } from './connectivity.js';

export function init(puzzle: WaywordsPuzzle, now: number): RuntimeState {
  return {
    status: 'IN_PROGRESS',
    foundPathWords: {},
    startedAt: now
  };
}

export function reduce(
  puzzle: WaywordsPuzzle,
  state: RuntimeState,
  action: EngineAction
): EngineResult {
  const effects: EngineEffects = { events: [] };

  if (action.type === 'RESET') {
    return {
      state: init(puzzle, Date.now()),
      effects
    };
  }

  if (action.type === 'SELECT') {
    return handleSelect(puzzle, state, action.cellIds, effects);
  }

  return { state, effects };
}

function handleSelect(
  puzzle: WaywordsPuzzle,
  state: RuntimeState,
  cellIds: string[],
  effects: EngineEffects
): EngineResult {
  if (state.status === 'COMPLETED') {
    return { state, effects };
  }

  const index = new PlacementIndex(puzzle);
  const match = index.lookup(cellIds);

  if (!match) {
    effects.events.push({ type: 'INVALID_SELECTION' });
    return { state, effects };
  }

  if (state.foundPathWords[match.wordId]) {
    effects.events.push({ type: 'ALREADY_FOUND', wordId: match.wordId });
    return { state, effects };
  }

  // Mark word as found
  const newState: RuntimeState = {
    ...state,
    foundPathWords: {
      ...state.foundPathWords,
      [match.wordId]: true
    }
  };

  effects.events.push({ type: 'WORD_FOUND', wordId: match.wordId });

  // Check win condition
  if (isConnected(puzzle, newState)) {
    const completedAt = Date.now();
    newState.status = 'COMPLETED';
    newState.completedAt = completedAt;
    effects.events.push({ type: 'COMPLETED', completedAt });
  }

  return { state: newState, effects };
}

export const selectors = {
  getPathCells,
  isConnected
};
