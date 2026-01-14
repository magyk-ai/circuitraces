import React, { useState, useEffect, useCallback } from 'react';
import type { WaywordsPuzzle, RuntimeState, EngineEvent } from '@circuitraces/engine';
import { init, reduce, selectors } from '@circuitraces/engine';
import { Grid } from './components/Grid';
import './App.css';

interface PuzzleMetadata {
  id: string;
  path: string;
  title: string;
  difficulty: string;
  gridSize: string;
  estimatedMinutes: number;
  description: string;
}

interface PuzzleIndex {
  version: number;
  puzzles: PuzzleMetadata[];
}

export function App() {
  const [puzzleIndex, setPuzzleIndex] = useState<PuzzleIndex | null>(null);
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string>('sample');
  const [puzzle, setPuzzle] = useState<WaywordsPuzzle | null>(null);
  const [state, setState] = useState<RuntimeState | null>(null);
  const [events, setEvents] = useState<EngineEvent[]>([]);

  // Load puzzle index on mount
  useEffect(() => {
    fetch('./puzzles/index.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load puzzle index: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        setPuzzleIndex(data);
      })
      .catch(err => {
        console.error('Error loading puzzle index:', err);
        alert(`Failed to load puzzle index: ${err.message}`);
      });
  }, []);

  // Load selected puzzle
  useEffect(() => {
    if (!puzzleIndex) return;

    const metadata = puzzleIndex.puzzles.find(p => p.id === selectedPuzzleId);
    if (!metadata) {
      console.error(`Puzzle ${selectedPuzzleId} not found in index`);
      return;
    }

    fetch(metadata.path)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load puzzle: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        setPuzzle(data);
        setState(init(data, Date.now()));
        setEvents([]); // Clear events when switching puzzles
      })
      .catch(err => {
        console.error('Error loading puzzle:', err);
        alert(`Failed to load puzzle: ${err.message}`);
      });
  }, [puzzleIndex, selectedPuzzleId]);

  const handleSelection = useCallback((cellIds: string[]) => {
    if (!puzzle || !state) return;

    const result = reduce(puzzle, state, { type: 'SELECT', cellIds });
    setState(result.state);
    setEvents(result.effects.events);

    // Haptic feedback on word found
    result.effects.events.forEach(event => {
      if (event.type === 'WORD_FOUND' && 'vibrate' in navigator) {
        navigator.vibrate(10); // 10ms pulse
      }
    });

    // Clear events after display
    setTimeout(() => setEvents([]), 2000);
  }, [puzzle, state]);

  const handleReset = useCallback(() => {
    if (!puzzle) return;
    setState(init(puzzle, Date.now()));
    setEvents([]);
  }, [puzzle]);

  const handleHint = useCallback(() => {
    if (!puzzle || !state) return;
    const result = reduce(puzzle, state, { type: 'PRESS_HINT' });
    setState(result.state);
    setEvents(result.effects.events);

    // Clear events after display
    setTimeout(() => setEvents([]), 2000);
  }, [puzzle, state]);

  // TICK timer for clue expiration
  useEffect(() => {
    if (!puzzle || !state || state.status === 'COMPLETED') return;

    const interval = setInterval(() => {
      const result = reduce(puzzle, state, { type: 'TICK', now: Date.now() });
      if (result.state !== state) {
        setState(result.state);
      }
    }, 100); // Tick every 100ms

    return () => clearInterval(interval);
  }, [puzzle, state]);

  if (!puzzleIndex) {
    return (
      <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
        <h2>Loading puzzle index...</h2>
        <p>If this takes too long, check the browser console for errors.</p>
      </div>
    );
  }

  if (!puzzle || !state) {
    return (
      <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
        <h2>Loading puzzle...</h2>
        <p>If this takes too long, check the browser console for errors.</p>
      </div>
    );
  }

  const pathCells = selectors.getPathCells(puzzle, state);
  const currentPuzzle = puzzleIndex.puzzles.find(p => p.id === selectedPuzzleId);

  return (
    <div className="app">
      <header>
        <div className="header-left">
          <h1>{puzzle.theme}</h1>
          {currentPuzzle && (
            <div className="puzzle-meta">
              <span className={`difficulty ${currentPuzzle.difficulty}`}>{currentPuzzle.difficulty}</span>
              <span className="grid-size">{currentPuzzle.gridSize}</span>
              <span className="time-estimate">~{currentPuzzle.estimatedMinutes}m</span>
            </div>
          )}
        </div>
        <div className="controls">
          <select
            value={selectedPuzzleId}
            onChange={(e) => setSelectedPuzzleId(e.target.value)}
            className="puzzle-selector"
          >
            {puzzleIndex.puzzles.map(p => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button onClick={handleHint} disabled={state.status === 'COMPLETED'}>
            💡 Hint ({state.hintUsedCount})
          </button>
          <button onClick={handleReset}>Reset</button>
        </div>
      </header>

      <Grid
        puzzle={puzzle}
        pathCells={pathCells}
        hintCells={selectors.getHintCells(state)}
        clueCells={selectors.getClueCells(state)}
        onSelection={handleSelection}
      />

      {events.length > 0 && (
        <div className="feedback">
          {events.map((e, i) => (
            <div key={i} className={`event ${e.type}`}>
              {e.type === 'WORD_FOUND' && `Found: ${e.wordId} (${e.category})`}
              {e.type === 'INVALID_SELECTION' && 'Invalid selection'}
              {e.type === 'ALREADY_FOUND' && `Already found: ${e.wordId}`}
              {e.type === 'HINT_APPLIED' && '💡 Hint applied!'}
              {e.type === 'CLUE_APPLIED' && '🔍 Clue revealed!'}
              {e.type === 'COMPLETED' && '🎉 Completed!'}
            </div>
          ))}
        </div>
      )}

      {state.status === 'COMPLETED' && (
        <div className="completion">
          <h2>Puzzle Complete!</h2>
          <p>Time: {Math.round((state.completedAt! - state.startedAt) / 1000)}s</p>
          <p>Hints used: {state.hintUsedCount}</p>
        </div>
      )}
    </div>
  );
}
