/// <reference types="vite/client" />
import React, { useState, useEffect, useCallback } from 'react';
import type { WaywordsPuzzle, RuntimeState, EngineEvent } from '@circuitraces/engine';
import { init, reduce, selectors } from '@circuitraces/engine';
import { Grid } from './components/Grid';
import { WordsList } from './components/WordsList';
import { HomeScreen } from './components/HomeScreen';
import { TopicBrowser } from './components/TopicBrowser';
import { useDailyPuzzle } from './hooks/useDailyPuzzle';
import './App.css';

function resolveContentPath(path: string): string {
  if (path.startsWith('/')) {
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
    return `${baseUrl}${path}`;
  }
  return path;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

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
  // Parse query params
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const dailyDate = params.get('daily');
  const topicId = params.get('topic');
  const puzzleIdParam = params.get('puzzle');
  const devMode = params.get('dev') === '1';

  // Determine view state
  const [view, setView] = useState<'home' | 'daily' | 'topic' | 'puzzle'>(() => {
    // Only enter daily play mode if we have a topic selected
    if ((mode === 'daily' || dailyDate) && topicId) return 'daily';
    if (topicId && puzzleIdParam) return 'puzzle';
    if (puzzleIdParam) return 'puzzle'; // Direct legacy access
    if (topicId) return 'topic';
    return 'home';
  });

  // Navigation state
  const [currentTopic, setCurrentTopic] = useState<string | null>(topicId);
  const [currentPuzzlePath, setCurrentPuzzlePath] = useState<string | null>(null);

  // Daily puzzle loading
  const { todaysEntry } = useDailyPuzzle(dailyDate || undefined);

  // Legacy puzzle selector state
  const [puzzleIndex, setPuzzleIndex] = useState<PuzzleIndex | null>(null);
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string>(puzzleIdParam || 'sample');
  const [puzzle, setPuzzle] = useState<WaywordsPuzzle | null>(null);
  const [state, setState] = useState<RuntimeState | null>(null);
  const [events, setEvents] = useState<EngineEvent[]>([]);

  // Timer + pause state (UI-only, not engine-driven)
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showWordsList, setShowWordsList] = useState(false);

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
    
    // Prevent Legacy/Dev puzzle from overwriting Daily/Topic puzzle
    if (view === 'daily' || (view === 'puzzle' && currentPuzzlePath)) return;

    const metadata = puzzleIndex.puzzles.find(p => p.id === selectedPuzzleId);
    if (!metadata) {
      console.error(`Puzzle ${selectedPuzzleId} not found in index`);
      return;
    }

    fetch(resolveContentPath(metadata.path) + '?v=' + Date.now())
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

  // Load puzzle from daily or topic when in those views
  useEffect(() => {
    let pathToLoad: string | null = null;

    if (view === 'daily' && todaysEntry && currentTopic) {
      // Find the specific puzzle for the selected topic
      const puzzleMeta = todaysEntry.puzzles[currentTopic];
      if (puzzleMeta) {
        pathToLoad = puzzleMeta.puzzlePath;
      } else {
        console.warn(`No puzzle found for topic ${currentTopic} in daily entry`);
      }
    } else if (view === 'puzzle' && currentPuzzlePath) {
      pathToLoad = currentPuzzlePath;
    }

    if (!pathToLoad) return;

    fetch(resolveContentPath(pathToLoad) + '?v=' + Date.now())
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load puzzle: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        setPuzzle(data);
        setState(init(data, Date.now()));
        setEvents([]);
      })
      .catch(err => {
        console.error('Error loading puzzle:', err);
        alert(`Failed to load puzzle: ${err.message}`);
      });
  }, [view, todaysEntry, currentTopic, currentPuzzlePath]);

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

  // Timer tick (UI-only)
  useEffect(() => {
    if (isPaused || !state || state.status === 'COMPLETED') return;
    const interval = setInterval(() => setElapsedMs(e => e + 100), 100);
    return () => clearInterval(interval);
  }, [isPaused, state?.status]);

  // Auto-pause on tab hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && state?.status !== 'COMPLETED') {
        setIsPaused(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [state?.status]);

  // Reset timer on puzzle switch
  useEffect(() => {
    setElapsedMs(0);
    setIsPaused(false);
  }, [selectedPuzzleId]);

  // Navigation handlers
  const handlePlayDaily = useCallback((topicId: string) => {
    if (!todaysEntry) return;
    const date = todaysEntry.date;
    window.history.pushState({}, '', `?mode=daily&daily=${date}&topic=${topicId}`);
    setCurrentTopic(topicId);
    setView('daily');
  }, [todaysEntry]);

  const handleSelectTopic = useCallback((topicId: string) => {
    window.history.pushState({}, '', `?topic=${topicId}`);
    setCurrentTopic(topicId);
    setView('topic');
  }, []);

  const handleSelectPuzzle = useCallback((puzzlePath: string, puzzleId: string) => {
    window.history.pushState({}, '', `?topic=${currentTopic}&puzzle=${puzzleId}`);
    setCurrentPuzzlePath(puzzlePath);
    setView('puzzle');
  }, [currentTopic]);

  const handleBackToHome = useCallback(() => {
    const baseUrl = import.meta.env.BASE_URL;
    window.history.pushState({}, '', baseUrl);
    setView('home');
    setCurrentTopic(null);
    setCurrentPuzzlePath(null);
  }, []);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      const topicId = params.get('topic');
      const puzzleId = params.get('puzzle');

      if (mode === 'daily' || params.has('daily')) {
        setView('daily');
      } else if (topicId && puzzleId) {
        setCurrentTopic(topicId);
        setView('puzzle');
      } else if (topicId) {
        setCurrentTopic(topicId);
        setView('topic');
      } else {
        setView('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Render home or topic browser if not in puzzle view
  if (view === 'home') {
    return <HomeScreen
      todaysEntry={todaysEntry}
      onPlayDaily={handlePlayDaily}
      onSelectTopic={handleSelectTopic}
    />;
  }

  if (view === 'topic' && currentTopic) {
    return <TopicBrowser
      topicId={currentTopic}
      onSelectPuzzle={handleSelectPuzzle}
      onBack={handleBackToHome}
    />;
  }

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
  const additionalCells = selectors.getAdditionalWordCells(puzzle, state);
  const hintCells = selectors.getHintCells(state);
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
          <div className="timer" data-testid="timer">{formatTime(elapsedMs)}</div>
          <button
            onClick={() => setIsPaused(p => !p)}
            disabled={state.status === 'COMPLETED'}
            className="pause-button"
            data-testid={isPaused ? 'btn-resume' : 'btn-pause'}
          >
            {isPaused ? '▶️' : '⏸️'}
          </button>
          {devMode && (
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
          )}
          <button onClick={handleBackToHome} className="back-button">
            ← Home
          </button>
          <button onClick={() => setShowWordsList(true)} disabled={state.status === 'COMPLETED'} data-testid="btn-words">
            📝 Words
          </button>
          <button onClick={handleHint} disabled={state.status === 'COMPLETED'} data-testid="btn-hint">
            💡 Hint ({state.hintUsedFromButton})
          </button>
          <button onClick={handleReset}>Reset</button>
        </div>
      </header>

      {/* Pause overlay */}
      {isPaused && state.status !== 'COMPLETED' && (
        <div className="pause-overlay" onClick={() => setIsPaused(false)}>
          <div className="pause-content">
            <div className="pause-icon">⏸️</div>
            <div className="pause-text">Paused</div>
            <div className="pause-hint">Tap to resume</div>
          </div>
        </div>
      )}

      <Grid
        puzzle={puzzle}
        pathCells={pathCells}
        additionalCells={additionalCells}
        hintCells={hintCells}
        onSelection={handleSelection}
        isCompleted={state.status === 'COMPLETED'}
      />

      {/* Words List Modal */}
      {showWordsList && (
        <WordsList
          puzzle={puzzle}
          foundPathWords={state.foundPathWords}
          foundAdditionalWords={state.foundAdditionalWords}
          onClose={() => setShowWordsList(false)}
        />
      )}

      {events.length > 0 && (
        <div className="feedback">
          {events.map((e, i) => (
            <div key={i} className={`event ${e.type}`}>
              {e.type === 'WORD_FOUND' && `Found: ${e.wordId} (${e.category})`}
              {e.type === 'INVALID_SELECTION' && 'Invalid selection'}
              {e.type === 'ALREADY_FOUND' && `Already found: ${e.wordId}`}
              {e.type === 'HINT_APPLIED' && `💡 Hint ${e.source === 'BONUS' ? '(from bonus)' : ''} applied!`}
              {e.type === 'COMPLETED' && '🎉 Completed!'}
            </div>
          ))}
        </div>
      )}

      {state.status === 'COMPLETED' && (
        <div className="completion">
          <h2>Puzzle Complete!</h2>
          <p>Time: {Math.round((state.completedAt! - state.startedAt) / 1000)}s</p>
          <p>Hints: {state.hintUsedFromButton} from button, {state.hintRevealedFromBonus} from bonus words</p>
        </div>
      )}
    </div>
  );
}
