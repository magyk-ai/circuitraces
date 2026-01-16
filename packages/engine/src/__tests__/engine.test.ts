import { describe, it, expect } from 'vitest';
import { init, reduce, selectors } from '../engine.js';
import { simplePuzzle } from './fixtures.js';

describe('Engine - Selection & Validation', () => {
  it('should initialize with empty state', () => {
    const state = init(simplePuzzle, 1000);
    expect(state.status).toBe('IN_PROGRESS');
    expect(state.foundPathWords).toEqual({});
    expect(state.startedAt).toBe(1000);
  });

  it('should find valid path word', () => {
    const state = init(simplePuzzle, 1000);
    const result = reduce(simplePuzzle, state, {
      type: 'SELECT',
      cellIds: ['c0', 'c1', 'c4']
    });

    expect(result.state.foundPathWords['CAR']).toBe(true);
    expect(result.effects.events).toContainEqual({
      type: 'WORD_FOUND',
      wordId: 'CAR',
      category: 'PATH'
    });
  });

  it('should reject invalid selection', () => {
    const state = init(simplePuzzle, 1000);
    const result = reduce(simplePuzzle, state, {
      type: 'SELECT',
      cellIds: ['c3', 'c4', 'c5'] // "XRY" - not in puzzle
    });

    expect(result.state.foundPathWords).toEqual({});
    expect(result.effects.events).toContainEqual({
      type: 'INVALID_SELECTION'
    });
  });

  it('should handle already found word', () => {
    let state = init(simplePuzzle, 1000);
    const result1 = reduce(simplePuzzle, state, {
      type: 'SELECT',
      cellIds: ['c0', 'c1', 'c4']
    });
    state = result1.state;

    const result2 = reduce(simplePuzzle, state, {
      type: 'SELECT',
      cellIds: ['c0', 'c1', 'c4']
    });

    expect(result2.effects.events).toContainEqual({
      type: 'ALREADY_FOUND',
      wordId: 'CAR'
    });
  });

  it('should accept reverse selection when enabled', () => {
    const state = init(simplePuzzle, 1000);
    const result = reduce(simplePuzzle, state, {
      type: 'SELECT',
      cellIds: ['c4', 'c1', 'c0'] // RAC (reverse of CAR)
    });

    expect(result.state.foundPathWords['CAR']).toBe(true);
  });
});

describe('Engine - Connectivity & Win', () => {
  it('should not be connected initially', () => {
    const state = init(simplePuzzle, 1000);
    expect(selectors.isConnected(simplePuzzle, state)).toBe(false);
  });

  it('should not be connected with partial path', () => {
    let state = init(simplePuzzle, 1000);
    const result = reduce(simplePuzzle, state, {
      type: 'SELECT',
      cellIds: ['c0', 'c1', 'c4']
    });
    state = result.state;

    expect(selectors.isConnected(simplePuzzle, state)).toBe(false);
  });

  it('should be connected when full path found', () => {
    let state = init(simplePuzzle, 1000);

    // Find CAR (c0->c1->c4)
    let result = reduce(simplePuzzle, state, {
      type: 'SELECT',
      cellIds: ['c0', 'c1', 'c4']
    });
    state = result.state;

    // Find ROD (c4->c7->c6)
    result = reduce(simplePuzzle, state, {
      type: 'SELECT',
      cellIds: ['c4', 'c7', 'c6']
    });
    state = result.state;

    // Find DOG (c6->c7->c8)
    result = reduce(simplePuzzle, state, {
      type: 'SELECT',
      cellIds: ['c6', 'c7', 'c8']
    });
    state = result.state;

    expect(selectors.isConnected(simplePuzzle, state)).toBe(true);
    expect(state.status).toBe('COMPLETED');
    expect(result.effects.events).toContainEqual({
      type: 'COMPLETED',
      completedAt: expect.any(Number)
    });
  });

  it('should track path cells correctly', () => {
    let state = init(simplePuzzle, 1000);
    const result = reduce(simplePuzzle, state, {
      type: 'SELECT',
      cellIds: ['c0', 'c1', 'c4']
    });
    state = result.state;

    const pathCells = selectors.getPathCells(simplePuzzle, state);
    expect(pathCells.has('c0')).toBe(true);
    expect(pathCells.has('c1')).toBe(true);
    expect(pathCells.has('c4')).toBe(true);
    expect(pathCells.has('c2')).toBe(false);
  });
});

describe('Engine - Hints (v1.1: persistent, accumulating)', () => {
  it('should apply hint to unfound path word', () => {
    const state = init(simplePuzzle, 1000);
    const result = reduce(simplePuzzle, state, { type: 'PRESS_HINT' });

    expect(result.effects.events).toContainEqual({
      type: 'HINT_APPLIED',
      cellId: expect.any(String),
      source: 'BUTTON'
    });
    expect(result.state.hintUsedFromButton).toBe(1);
    expect(Object.keys(result.state.hintMarkedCells).length).toBe(1);
  });

  it('should not apply hint when all path words found', () => {
    let state = init(simplePuzzle, 1000);

    // Find all path words
    state = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c4'] }).state; // CAR
    state = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c4', 'c7', 'c6'] }).state; // ROD
    state = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c6', 'c7', 'c8'] }).state; // DOG

    const result = reduce(simplePuzzle, state, { type: 'PRESS_HINT' });
    expect(result.effects.events).toEqual([]);
  });

  it('should accumulate hint count from button', () => {
    let state = init(simplePuzzle, 1000);

    state = reduce(simplePuzzle, state, { type: 'PRESS_HINT' }).state;
    expect(state.hintUsedFromButton).toBe(1);

    state = reduce(simplePuzzle, state, { type: 'PRESS_HINT' }).state;
    expect(state.hintUsedFromButton).toBe(2);
  });

  it('should expose hint cells via selector', () => {
    let state = init(simplePuzzle, 1000);
    state = reduce(simplePuzzle, state, { type: 'PRESS_HINT' }).state;

    const hintCells = selectors.getHintCells(state);
    expect(hintCells.size).toBe(1);
  });

  it('should persist hints indefinitely (no expiry)', () => {
    let state = init(simplePuzzle, 1000);
    state = reduce(simplePuzzle, state, { type: 'PRESS_HINT' }).state;

    // Hints should remain in state
    expect(Object.keys(state.hintMarkedCells).length).toBe(1);
    // No TICK action needed - hints persist without expiry
  });
});

describe('Engine - Additional Words & Hints (v1.1: persistent hints from bonus)', () => {
  it('should find additional word and apply hint from bonus', () => {
    const state = init(simplePuzzle, 1000);
    const result = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c2'] }); // CAT

    expect(result.effects.events).toContainEqual({
      type: 'WORD_FOUND',
      wordId: 'CAT',
      category: 'ADDITIONAL'
    });
    expect(result.effects.events).toContainEqual({
      type: 'HINT_APPLIED',
      cellId: 'c4',
      source: 'BONUS'
    });
    expect(result.state.hintMarkedCells).toEqual({ 'c4': true });
    expect(result.state.hintRevealedFromBonus).toBe(1);
  });

  it('should persist hints from bonus words indefinitely', () => {
    let state = init(simplePuzzle, 1000);
    state = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c2'] }).state; // Find CAT

    // v1.1: Hints persist without expiry
    expect(state.hintMarkedCells).toEqual({ 'c4': true });
    // No lastClueExpiresAt - hints don't expire
  });

  it('should not affect win condition with additional words', () => {
    const state = init(simplePuzzle, 1000);
    const result = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c2'] }); // CAT

    expect(result.state.status).toBe('IN_PROGRESS'); // Not completed
  });

  it('should expose additional word cells via selector', () => {
    let state = init(simplePuzzle, 1000);
    state = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c2'] }).state;

    const additionalCells = selectors.getAdditionalWordCells(simplePuzzle, state);
    expect(additionalCells.has('c0')).toBe(true);
    expect(additionalCells.has('c1')).toBe(true);
    expect(additionalCells.has('c2')).toBe(true);
  });

  it('should handle already found additional word', () => {
    let state = init(simplePuzzle, 1000);
    state = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c2'] }).state; // CAT

    const result = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c2'] }); // CAT again
    expect(result.effects.events).toContainEqual({
      type: 'ALREADY_FOUND',
      wordId: 'CAT'
    });
  });

  it('should track hint sources separately', () => {
    let state = init(simplePuzzle, 1000);

    // Hint from bonus word
    state = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c2'] }).state; // CAT
    expect(state.hintUsedFromButton).toBe(0);
    expect(state.hintRevealedFromBonus).toBe(1);

    // Hint from button
    state = reduce(simplePuzzle, state, { type: 'PRESS_HINT' }).state;
    expect(state.hintUsedFromButton).toBe(1);
    expect(state.hintRevealedFromBonus).toBe(1);
  });
});

describe('Engine - Spec-lock Invariants (v1.1)', () => {
  it('INVARIANT: hints persist through unrelated actions', () => {
    let state = init(simplePuzzle, 1000);

    // Add hints from both sources
    state = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c2'] }).state; // CAT (bonus)
    state = reduce(simplePuzzle, state, { type: 'PRESS_HINT' }).state; // Button hint

    const hintsBefore = Object.keys(state.hintMarkedCells).length;
    expect(hintsBefore).toBe(2);

    // Perform unrelated action (find a path word)
    state = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c4'] }).state; // CAR

    // Hints should remain unchanged
    const hintsAfter = Object.keys(state.hintMarkedCells).length;
    expect(hintsAfter).toBe(hintsBefore);
  });

  it('INVARIANT: hintMarkedCells grows monotonically (until RESET)', () => {
    let state = init(simplePuzzle, 1000);

    // Add first hint
    state = reduce(simplePuzzle, state, { type: 'PRESS_HINT' }).state;
    const hints1 = Object.keys(state.hintMarkedCells).length;
    expect(hints1).toBe(1);

    // Add second hint
    state = reduce(simplePuzzle, state, { type: 'PRESS_HINT' }).state;
    const hints2 = Object.keys(state.hintMarkedCells).length;
    expect(hints2).toBeGreaterThanOrEqual(hints1);

    // After RESET, hints should be cleared
    state = reduce(simplePuzzle, state, { type: 'RESET' }).state;
    expect(Object.keys(state.hintMarkedCells).length).toBe(0);
  });

  it('INVARIANT: engine is deterministic (same inputs -> same outputs)', () => {
    const state1 = init(simplePuzzle, 1000);
    const state2 = init(simplePuzzle, 1000);

    // Same action on same state should produce identical results
    const result1 = reduce(simplePuzzle, state1, { type: 'SELECT', cellIds: ['c0', 'c1', 'c4'] });
    const result2 = reduce(simplePuzzle, state2, { type: 'SELECT', cellIds: ['c0', 'c1', 'c4'] });

    expect(result1.state.foundPathWords).toEqual(result2.state.foundPathWords);
    expect(result1.effects.events).toEqual(result2.effects.events);
  });

  it('INVARIANT: getPathCells returns only cells from found path words', () => {
    let state = init(simplePuzzle, 1000);

    // Find CAR (c0, c1, c4)
    state = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c4'] }).state;

    const pathCells = selectors.getPathCells(simplePuzzle, state);

    // Should contain exactly CAR's cells
    expect(pathCells.has('c0')).toBe(true);
    expect(pathCells.has('c1')).toBe(true);
    expect(pathCells.has('c4')).toBe(true);

    // Should NOT contain cells from unfound path words (ROD, DOG)
    expect(pathCells.has('c6')).toBe(false);
    expect(pathCells.has('c7')).toBe(false);
    expect(pathCells.has('c8')).toBe(false);
  });

  it('INVARIANT: getAdditionalWordCells returns only cells from found additional words', () => {
    let state = init(simplePuzzle, 1000);

    // Initially no additional word cells
    let additionalCells = selectors.getAdditionalWordCells(simplePuzzle, state);
    expect(additionalCells.size).toBe(0);

    // Find CAT (additional word)
    state = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c2'] }).state;

    additionalCells = selectors.getAdditionalWordCells(simplePuzzle, state);
    expect(additionalCells.has('c0')).toBe(true);
    expect(additionalCells.has('c1')).toBe(true);
    expect(additionalCells.has('c2')).toBe(true);
  });

  it('INVARIANT: connectivity uses ORTHO_4 neighbors only', () => {
    let state = init(simplePuzzle, 1000);

    // Grid layout:
    // C(c0) A(c1) T(c2)
    // X(c3) R(c4) Y(c5)
    // D(c6) O(c7) G(c8)
    //
    // CAR = c0,c1,c4 (top-left L-shape)
    // ROD = c4,c7,c6 (middle to bottom-left)
    // DOG = c6,c7,c8 (bottom row)
    //
    // Note: c4(R) at (1,1) is orthogonally adjacent to c7(O) at (1,2)
    // So CAR + DOG shares c4-c7 orthogonal adjacency

    // Find just CAR - doesn't reach end (c8)
    state = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c4'] }).state;
    expect(selectors.isConnected(simplePuzzle, state)).toBe(false);

    // Find DOG - now c4 (from CAR) connects to c7 (from DOG) orthogonally
    // But c8 (end) is only in DOG, and CAR doesn't directly connect to DOG
    state = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c6', 'c7', 'c8'] }).state;

    // CAR cells: c0, c1, c4
    // DOG cells: c6, c7, c8
    // c4 (1,1) is orthogonally adjacent to c7 (1,2) - so they connect!
    expect(selectors.isConnected(simplePuzzle, state)).toBe(true);
  });
});
