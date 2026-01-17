/// <reference types="vite/client" />
import React, { useState, useEffect, useCallback } from 'react';
import type { WaywordsPuzzle, RuntimeState, EngineEvent } from '@circuitraces/engine';
import { init, reduce, selectors } from '@circuitraces/engine';
import { Grid } from './components/Grid';
import { WordsList } from './components/WordsList';
import { HomeScreen } from './components/HomeScreen';
import { TopicBrowser } from './components/TopicBrowser';
import { useDailyPuzzle } from './hooks/useDailyPuzzle';
import { useTopicCatalog } from './hooks/useTopicIndex';
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



export function App() {
  // Parse query params
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const dailyDate = params.get('daily');
  const topicId = params.get('topic');
  const puzzleIdParam = params.get('puzzle');

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
  const [navigatedFromTopic, setNavigatedFromTopic] = useState(false);

  // Daily puzzle loading
  const { todaysEntry } = useDailyPuzzle(dailyDate || undefined);

  // Current puzzle ID for navigation
  const [currentPuzzleId, setCurrentPuzzleId] = useState<string | null>(puzzleIdParam);

  // Topic catalog loading - needed for puzzle view to find next puzzle
  const { catalog: topicCatalog } = useTopicCatalog(
    (view === 'puzzle' || (view === 'daily' && navigatedFromTopic)) ? currentTopic : null
  );

  // Resolve puzzle path from catalog if missing (direct link case)
  useEffect(() => {
    if (view === 'puzzle' && !currentPuzzlePath && topicCatalog && puzzleIdParam) {
      const p = topicCatalog.puzzles.find(p => p.id === puzzleIdParam);
      if (p) {
        setCurrentPuzzlePath(p.puzzlePath);
        setCurrentPuzzleId(puzzleIdParam);
      }
    }
  }, [view, currentPuzzlePath, topicCatalog, puzzleIdParam]);

  // Find next puzzle in topic catalog
  const getNextPuzzle = useCallback(() => {
    if (!topicCatalog || !currentPuzzleId) return null;
    const currentIndex = topicCatalog.puzzles.findIndex(p => p.id === currentPuzzleId);
    if (currentIndex === -1 || currentIndex >= topicCatalog.puzzles.length - 1) return null;
    return topicCatalog.puzzles[currentIndex + 1];
  }, [topicCatalog, currentPuzzleId]);

  const nextPuzzle = getNextPuzzle();

  const [puzzle, setPuzzle] = useState<WaywordsPuzzle | null>(null);
  const [state, setState] = useState<RuntimeState | null>(null);
  const [events, setEvents] = useState<EngineEvent[]>([]);

  // Timer + pause state (UI-only, not engine-driven)
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showWordsList, setShowWordsList] = useState(false);
  const [justFoundCells, setJustFoundCells] = useState<Set<string>>(new Set());



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

    // Haptic feedback and animation on word found
    result.effects.events.forEach(event => {
      if (event.type === 'WORD_FOUND') {
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(10); // 10ms pulse
        }
        // Set just-found cells for animation
        setJustFoundCells(new Set(cellIds));
        // Clear after animation completes
        setTimeout(() => setJustFoundCells(new Set()), 600);
      }
    });

    // Clear events after display
    setTimeout(() => setEvents([]), 2000);
  }, [puzzle, state]);

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
  }, [puzzle?.puzzleId]);

  // Navigation handlers
  const handlePlayDaily = useCallback((topicId: string) => {
    if (!todaysEntry) return;
    const date = todaysEntry.date;
    window.history.pushState({}, '', `?mode=daily&daily=${date}&topic=${topicId}`);
    setCurrentTopic(topicId);
    setNavigatedFromTopic(false);
    setView('daily');
  }, [todaysEntry]);

  const handleSelectTopic = useCallback((topicId: string) => {
    window.history.pushState({}, '', `?topic=${topicId}`);
    setCurrentTopic(topicId);
    setView('topic');
    setNavigatedFromTopic(false); // Reset when entering topic list
  }, []);

  const handleSelectPuzzle = useCallback((puzzlePath: string, puzzleId: string) => {
    window.history.pushState({}, '', `?topic=${currentTopic}&puzzle=${puzzleId}`);
    setCurrentPuzzlePath(puzzlePath);
    setCurrentPuzzleId(puzzleId);
    setView('puzzle');
    setNavigatedFromTopic(true); // Mark as coming from topic library
  }, [currentTopic]);

  // Navigate to next puzzle in topic
  const handleNextPuzzle = useCallback(() => {
    if (!nextPuzzle || !currentTopic) return;
    window.history.pushState({}, '', `?topic=${currentTopic}&puzzle=${nextPuzzle.id}`);
    setCurrentPuzzlePath(nextPuzzle.puzzlePath);
    setCurrentPuzzleId(nextPuzzle.id);
    setPuzzle(null);
    setState(null);
  }, [nextPuzzle, currentTopic]);

  // Navigate to home
  const handleGoHome = useCallback(() => {
    const baseUrl = import.meta.env.BASE_URL;
    window.history.pushState({}, '', baseUrl);
    setView('home');
    setCurrentTopic(null);
    setCurrentPuzzlePath(null);
    setCurrentPuzzleId(null);
    setNavigatedFromTopic(false);
  }, []);

  const handleBack = useCallback(() => {
    const baseUrl = import.meta.env.BASE_URL;
    
    // Only go back to topic IF we explicitly navigated from the topic browser
    if (view === 'puzzle' && navigatedFromTopic && currentTopic) {
      window.history.pushState({}, '', `?topic=${currentTopic}`);
      setView('topic');
      setCurrentPuzzlePath(null);
      setNavigatedFromTopic(false);
      return;
    }

    // Default: back to home
    window.history.pushState({}, '', baseUrl);
    setView('home');
    setCurrentTopic(null);
    setCurrentPuzzlePath(null);
    setNavigatedFromTopic(false);
  }, [view, navigatedFromTopic, currentTopic]);

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

  // Render logic
  return (
    <div className="app">
      {view !== 'home' && (
        <button onClick={handleBack} className="home-icon" aria-label="Back">
          ←
        </button>
      )}

      {view === 'home' && (
        <HomeScreen
          todaysEntry={todaysEntry}
          onPlayDaily={handlePlayDaily}
          onSelectTopic={handleSelectTopic}
        />
      )}

      {view === 'topic' && currentTopic && (
        <TopicBrowser
          topicId={currentTopic}
          onSelectPuzzle={handleSelectPuzzle}
          onBack={handleBack}
        />
      )}

      {(view === 'puzzle' || view === 'daily') && (
        <>
          {!puzzle || !state ? (
            <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
              <h2>Loading puzzle...</h2>
              <p>If this takes too long, check the browser console for errors.</p>
            </div>
          ) : (
            <>
              <header>
                <div className="header-left">
                  <h1>{puzzle.theme}</h1>
                  <div className="puzzle-meta">
                    <span className="grid-size">{puzzle.grid.width}×{puzzle.grid.height}</span>
                  </div>
                </div>
                <div className="controls">
                  <div className="timer hidden" data-testid="timer">{formatTime(elapsedMs)}</div>
                  <button
                    onClick={() => setIsPaused(p => !p)}
                    disabled={state.status === 'COMPLETED'}
                    data-testid={isPaused ? 'btn-resume' : 'btn-pause'}
                  >
                    {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                  </button>
                  <button onClick={() => setShowWordsList(true)} disabled={state.status === 'COMPLETED'} data-testid="btn-words">
                    📝 Words
                  </button>
                  <button onClick={handleHint} disabled={state.status === 'COMPLETED'} data-testid="btn-hint">
                    💡 Hint ({state.hintUsedFromButton})
                  </button>
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
                pathCells={selectors.getPathCells(puzzle, state)}
                additionalCells={selectors.getAdditionalWordCells(puzzle, state)}
                hintCells={selectors.getHintCells(state)}
                justFoundCells={justFoundCells}
                connectedPathOrder={state.status === 'COMPLETED'
                  ? selectors.getConnectedPathOrder(puzzle, state)
                  : undefined}
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

              {events.filter(e => e.type !== 'WORD_FOUND').length > 0 && (
                <div className="feedback">
                  {events.filter(e => e.type !== 'WORD_FOUND').map((e, i) => (
                    <div key={i} className={`event ${e.type}`}>
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
                  <div className="completion-stats">
                    <p>Time: {Math.round((state.completedAt! - state.startedAt) / 1000)}s</p>
                    <p>Hints: {state.hintUsedFromButton} from button, {state.hintRevealedFromBonus} from bonus</p>
                  </div>
                  <div className="completion-actions">
                    {view === 'puzzle' && navigatedFromTopic && nextPuzzle ? (
                      <button className="primary-btn" onClick={handleNextPuzzle}>
                        Next Puzzle →
                      </button>
                    ) : (
                      <button className="primary-btn" onClick={handleGoHome}>
                        Home
                      </button>
                    )}
                    {view === 'puzzle' && navigatedFromTopic && (
                      <button onClick={handleBack}>
                        Back to Topic
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
