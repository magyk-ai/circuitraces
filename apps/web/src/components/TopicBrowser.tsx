import { useTopicCatalog } from '../hooks/useTopicIndex';
import type { TopicPuzzleEntry } from '../types/content';
import './TopicBrowser.css';

interface TopicBrowserProps {
  topicId: string;
  onSelectPuzzle: (puzzlePath: string, puzzleId: string) => void;
  onBack: () => void;
}

export function TopicBrowser({ topicId, onSelectPuzzle, onBack }: TopicBrowserProps) {
  const { catalog, loading, error } = useTopicCatalog(topicId);

  if (loading) {
    return <div className="topic-browser loading">Loading puzzles...</div>;
  }

  if (error) {
    return (
      <div className="topic-browser error">
        <p>Error: {error}</p>
        <button onClick={onBack}>← Back to Home</button>
      </div>
    );
  }

  if (!catalog) {
    return null;
  }

  return (
    <div className="topic-browser">
      <header className="topic-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <div>
          <h1>{catalog.title}</h1>
          <p className="topic-description">{catalog.description}</p>
        </div>
      </header>

      <div className="puzzles-list">
        {catalog.puzzles.length === 0 ? (
          <p className="no-puzzles">No puzzles available yet. Check back soon!</p>
        ) : (
          catalog.puzzles.map((puzzle: TopicPuzzleEntry) => (
            <div
              key={puzzle.id}
              className="puzzle-card"
              onClick={() => onSelectPuzzle(puzzle.puzzlePath, puzzle.id)}
            >
              <div className="puzzle-header">
                <h3>{puzzle.title}</h3>
                <span className={`difficulty ${puzzle.difficulty}`}>
                  {puzzle.difficulty}
                </span>
              </div>
              <div className="puzzle-meta">
                <span className="grid-size">{puzzle.grid.width}×{puzzle.grid.height}</span>
                <span className="time-estimate">{puzzle.estimatedMinutes} min</span>
                {puzzle.tags.length > 0 && (
                  <span className="tags">{puzzle.tags.join(', ')}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
