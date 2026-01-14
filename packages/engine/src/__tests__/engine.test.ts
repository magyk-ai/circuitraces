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
      wordId: 'CAR'
    });
  });

  it('should reject invalid selection', () => {
    const state = init(simplePuzzle, 1000);
    const result = reduce(simplePuzzle, state, {
      type: 'SELECT',
      cellIds: ['c0', 'c1', 'c2'] // "CAT" - not in puzzle
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
