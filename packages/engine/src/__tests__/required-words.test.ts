import { describe, it, expect } from 'vitest';
import { init, reduce, selectors } from '../engine.js';
import { simplePuzzle } from './fixtures.js';

describe('Engine Repro - Required Path Words', () => {
  it('should NOT be completed until ALL path words are found, even if START and END are connected', () => {
    let state = init(simplePuzzle, 1000);

    // Find CAR (c0, c1, c4) - contains START
    state = reduce(simplePuzzle, state, {
      type: 'SELECT',
      cellIds: ['c0', 'c1', 'c4']
    }).state;

    // Find DOG (c6, c7, c8) - contains END
    // c4 and c7 are orthogonally adjacent, so CAR and DOG are now connected.
    const result = reduce(simplePuzzle, state, {
      type: 'SELECT',
      cellIds: ['c6', 'c7', 'c8']
    });
    state = result.state;

    expect(selectors.isConnected(simplePuzzle, state)).toBe(true);

    // CURRENT BEHAVIOR: It is COMPLETED (This is what we want to change)
    // We want it to be IN_PROGRESS because ROD has not been found yet.
    expect(state.status).toBe('IN_PROGRESS');

    // Find ROD (c4, c7, c6)
    const finalResult = reduce(simplePuzzle, state, {
        type: 'SELECT',
        cellIds: ['c4', 'c7', 'c6']
    });
    expect(finalResult.state.status).toBe('COMPLETED');
  });
});
