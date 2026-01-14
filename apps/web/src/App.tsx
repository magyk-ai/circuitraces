import React, { useState, useEffect, useCallback } from 'react';
import type { WaywordsPuzzle, RuntimeState, EngineEvent } from '@circuitraces/engine';
import { init, reduce, selectors } from '@circuitraces/engine';
import { Grid } from './components/Grid';
import './App.css';

export function App() {
  const [puzzle, setPuzzle] = useState<WaywordsPuzzle | null>(null);
  const [state, setState] = useState<RuntimeState | null>(null);
  const [events, setEvents] = useState<EngineEvent[]>([]);

  useEffect(() => {
    // Load sample puzzle
    fetch('/sample.json')
      .then(res => res.json())
      .then(data => {
        setPuzzle(data);
        setState(init(data, Date.now()));
      });
  }, []);

  const handleSelection = useCallback((cellIds: string[]) => {
    if (!puzzle || !state) return;

    const result = reduce(puzzle, state, { type: 'SELECT', cellIds });
    setState(result.state);
    setEvents(result.effects.events);

    // Clear events after display
    setTimeout(() => setEvents([]), 2000);
  }, [puzzle, state]);

  const handleReset = useCallback(() => {
    if (!puzzle) return;
    setState(init(puzzle, Date.now()));
    setEvents([]);
  }, [puzzle]);

  if (!puzzle || !state) {
    return <div>Loading...</div>;
  }

  const pathCells = selectors.getPathCells(puzzle, state);

  return (
    <div className="app">
      <header>
        <h1>{puzzle.theme}</h1>
        <button onClick={handleReset}>Reset</button>
      </header>

      <Grid
        puzzle={puzzle}
        pathCells={pathCells}
        onSelection={handleSelection}
      />

      {events.length > 0 && (
        <div className="feedback">
          {events.map((e, i) => (
            <div key={i} className={`event ${e.type}`}>
              {e.type === 'WORD_FOUND' && `Found: ${e.wordId}`}
              {e.type === 'INVALID_SELECTION' && 'Invalid selection'}
              {e.type === 'ALREADY_FOUND' && `Already found: ${e.wordId}`}
              {e.type === 'COMPLETED' && '🎉 Completed!'}
            </div>
          ))}
        </div>
      )}

      {state.status === 'COMPLETED' && (
        <div className="completion">
          <h2>Puzzle Complete!</h2>
          <p>Time: {Math.round((state.completedAt! - state.startedAt) / 1000)}s</p>
        </div>
      )}
    </div>
  );
}
