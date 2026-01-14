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

describe('Engine - Hints', () => {
  it('should apply hint to unfound path word', () => {
    const state = init(simplePuzzle, 1000);
    const result = reduce(simplePuzzle, state, { type: 'PRESS_HINT' });

    expect(result.effects.events).toContainEqual({
      type: 'HINT_APPLIED',
      cellId: expect.any(String)
    });
    expect(result.state.hintUsedCount).toBe(1);
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

  it('should accumulate hint count', () => {
    let state = init(simplePuzzle, 1000);

    state = reduce(simplePuzzle, state, { type: 'PRESS_HINT' }).state;
    expect(state.hintUsedCount).toBe(1);

    state = reduce(simplePuzzle, state, { type: 'PRESS_HINT' }).state;
    expect(state.hintUsedCount).toBe(2);
  });

  it('should expose hint cells via selector', () => {
    let state = init(simplePuzzle, 1000);
    state = reduce(simplePuzzle, state, { type: 'PRESS_HINT' }).state;

    const hintCells = selectors.getHintCells(state);
    expect(hintCells.size).toBe(1);
  });
});

describe('Engine - Additional Words & Clues', () => {
  it('should find additional word and apply clue', () => {
    const state = init(simplePuzzle, 1000);
    const result = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c2'] }); // CAT

    expect(result.effects.events).toContainEqual({
      type: 'WORD_FOUND',
      wordId: 'CAT',
      category: 'ADDITIONAL'
    });
    expect(result.effects.events).toContainEqual({
      type: 'CLUE_APPLIED',
      cellId: 'c4'
    });
    expect(result.state.clueMarkedCells).toEqual({ 'c4': true });
    expect(result.state.lastClueExpiresAt).toBe(4000); // 1000 + 3000
  });

  it('should expire clue after cluePersistMs', () => {
    let state = init(simplePuzzle, 1000);
    state = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c2'] }).state; // Find CAT

    // Clue should be active
    expect(state.clueMarkedCells).toEqual({ 'c4': true });
    expect(state.lastClueExpiresAt).toBe(4000);

    // Tick before expiry - no change
    state = reduce(simplePuzzle, state, { type: 'TICK', now: 3500 }).state;
    expect(state.clueMarkedCells).toEqual({ 'c4': true });

    // Tick after expiry - clue clears
    state = reduce(simplePuzzle, state, { type: 'TICK', now: 4000 }).state;
    expect(state.clueMarkedCells).toEqual({});
    expect(state.lastClueExpiresAt).toBeUndefined();
  });

  it('should not affect win condition with additional words', () => {
    const state = init(simplePuzzle, 1000);
    const result = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c2'] }); // CAT

    expect(result.state.status).toBe('IN_PROGRESS'); // Not completed
  });

  it('should expose clue cells via selector', () => {
    let state = init(simplePuzzle, 1000);
    state = reduce(simplePuzzle, state, { type: 'SELECT', cellIds: ['c0', 'c1', 'c2'] }).state;

    const clueCells = selectors.getClueCells(state);
    expect(clueCells.has('c4')).toBe(true);
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
});
